import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { VideoRequest } from '../../core/src/types.ts'

export function videoSize(aspect: string): { width: number; height: number } {
  const ratio = !aspect || aspect === '自动' || aspect === 'auto' ? '16:9' : aspect
  const [a, b] = ratio.split(':').map(Number)
  const long = 640
  if (!a || !b) return { width: 640, height: 360 }
  if (a >= b) return { width: long, height: Math.max(16, Math.round(long * (b / a) / 2) * 2) }
  return { width: Math.max(16, Math.round(long * (a / b) / 2) * 2), height: long }
}

export async function renderMockVideo(req: VideoRequest, signal?: AbortSignal): Promise<{
  bytes: Uint8Array
  width: number
  height: number
  durationSec: number
}> {
  const durationSec = Math.max(1, Math.min(8, Math.round(req.durationSec || 2)))
  const { width, height } = videoSize(req.aspectRatio)
  const dir = await mkdtemp(join(tmpdir(), 'dsh-vid-'))
  const out = join(dir, 'clip.mp4')
  const color = promptColor(req.prompt)
  try {
    await ffmpeg([
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=0x${color}:s=${width}x${height}:d=${durationSec}`,
      '-f', 'lavfi',
      '-i', `sine=frequency=440:duration=${durationSec}`,
      '-pix_fmt', 'yuv420p',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-shortest',
      '-movflags', '+faststart',
      out,
    ], signal)
    const bytes = await readFile(out)
    return { bytes, width, height, durationSec }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function promptColor(prompt: string): string {
  let n = 0
  for (const ch of prompt) n = (n + ch.charCodeAt(0) * 13) % 0xffffff
  return n.toString(16).padStart(6, '0')
}

function ffmpeg(args: string[], signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args])
    const onAbort = () => {
      child.kill('SIGKILL')
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
    }
    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    child.on('error', reject)
    child.on('exit', (code) => {
      signal?.removeEventListener('abort', onAbort)
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}`))
    })
  })
}
