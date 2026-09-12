import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { VideoRequest } from '../../core/src/types.ts'
import { decodePng, encodePng, type RgbaImage } from '../../compose/src/png.ts'
import { createFilmStill } from './film.ts'

export function videoSize(aspect: string): { width: number; height: number } {
  const ratio = !aspect || aspect === '自动' || aspect === 'auto' ? '16:9' : aspect
  const [a, b] = ratio.split(':').map(Number)
  const long = 640
  if (!a || !b) return { width: 640, height: 360 }
  if (a >= b) return { width: long, height: Math.max(16, Math.round(long * (b / a) / 2) * 2) }
  return { width: Math.max(16, Math.round(long * (a / b) / 2) * 2), height: long }
}

/**
 * Mock clip: one studio plate from createFilmStill (title already burned in),
 * then 3 PNG frames with a sweeping key light, looped with ffmpeg -framerate
 * to durationSec. No drawtext / font dependency.
 */
export async function renderMockVideo(req: VideoRequest, signal?: AbortSignal): Promise<{
  bytes: Uint8Array
  width: number
  height: number
  durationSec: number
}> {
  const n = Number(req.durationSec)
  const durationSec = Math.max(1, Math.min(8, Number.isFinite(n) ? Math.round(n) : 2))
  const { width, height } = videoSize(req.aspectRatio)
  const dir = await mkdtemp(join(tmpdir(), 'dsh-vid-'))
  const out = join(dir, 'clip.mp4')
  const frameCount = 3
  try {
    throwIfAborted(signal)
    const plate = decodePng(createFilmStill(width, height, req.prompt || 'PREVIEW'))
    for (let i = 0; i < frameCount; i++) {
      throwIfAborted(signal)
      const t = i / (frameCount - 1)
      await writeFile(join(dir, `frame-${i}.png`), sweepLight(plate, t))
    }
    const rate = (frameCount / durationSec).toFixed(4)
    await ffmpeg([
      '-y',
      '-stream_loop', '-1',
      '-framerate', rate,
      '-start_number', '0',
      '-i', join(dir, 'frame-%d.png'),
      '-t', String(durationSec),
      '-an',
      '-vf', 'fps=12,format=yuv420p',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      out,
    ], signal)
    const bytes = await readFile(out)
    return { bytes, width, height, durationSec }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function sweepLight(src: RgbaImage, t: number): Uint8Array {
  const { width, height, data } = src
  const out = new Uint8Array(data)
  const cx = width * (0.2 + 0.6 * t)
  const cy = height * (0.3 + 0.1 * Math.sin(t * Math.PI))
  const rx = width * 0.34
  const ry = height * 0.26
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / rx
      const dy = (y - cy) / ry
      const glow = Math.exp(-(dx * dx + dy * dy))
      const i = (y * width + x) * 4
      out[i] = clamp(out[i] + 96 * glow)
      out[i + 1] = clamp(out[i + 1] + 68 * glow)
      out[i + 2] = clamp(out[i + 2] + 24 * glow)
    }
  }
  return encodePng({ width, height, data: out })
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  throw Object.assign(new Error('Aborted'), { name: 'AbortError' })
}

function ffmpeg(args: string[], signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args])
    const errChunks: Buffer[] = []
    child.stderr?.on('data', (c: Buffer) => errChunks.push(c))
    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      if (err) reject(err)
      else resolve()
    }
    const onAbort = () => {
      child.kill('SIGKILL')
      finish(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
    }
    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    child.on('error', (err) => finish(err))
    child.on('exit', (code) => {
      if (code === 0) finish()
      else {
        const msg = Buffer.concat(errChunks).toString('utf8').trim()
        finish(new Error(`ffmpeg exited ${code}${msg ? `: ${msg}` : ''}`))
      }
    })
  })
}
