import { createHash } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { ImageProvider, ImageRequest, ImageResult, ProviderInfo, VideoRequest } from '../../core/src/types.ts'
import { createSolid, encodePng } from '../../compose/src/png.ts'
import { createFilmStill } from './film.ts'
import { renderMockVideo } from './video.ts'

export interface MockProviderOptions {
  id?: string
  model?: string
  latencyMs?: number
  film?: boolean
}

export class MockImageProvider implements ImageProvider {
  readonly id: string
  readonly model: string
  calls = 0
  concurrent = 0
  maxConcurrent = 0
  lastRequest: ImageRequest | undefined
  latencyMs: number
  private readonly film: boolean

  constructor(opts: MockProviderOptions = {}) {
    this.id = opts.id ?? 'mock'
    this.model = opts.model ?? 'mock-fixture'
    this.latencyMs = opts.latencyMs ?? 0
    this.film = opts.film ?? true
  }

  info(): ProviderInfo {
    return { id: this.id, protocol: 'mock', model: this.model, kinds: ['text-to-image', 'image-to-image', 'describe', 'text-to-video', 'image-to-video'] }
  }

  async generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult> {
    this.calls++
    this.lastRequest = req
    this.concurrent++
    this.maxConcurrent = Math.max(this.maxConcurrent, this.concurrent)
    try {
      if (signal?.aborted) throw abortError()
      const wait = req.prompt.includes('__SLOW__') ? Math.max(this.latencyMs, 400) : this.latencyMs
      if (wait) await sleep(wait, signal)
      const { width, height } = sizeFor(req.aspectRatio, req.clarity)
      const images = []
      for (let i = 0; i < req.n; i++) {
        const png = this.film
          ? createFilmStill(width, height, req.prompt + ':' + i + (req.refImages?.[0]?.path ? ':i2i:' + req.refImages[0].path : ''))
          : encodePng(createSolid(width, height, hashColor(req.prompt + ':' + i)))
        images.push({
          path: `memory://${this.id}/${hash(req.prompt)}-${i}.png`,
          width,
          height,
          mime: 'image/png',
          sha256: createHash('sha256').update(png).digest('hex'),
          bytes: png,
        })
      }
      return {
        images,
        providerId: this.id,
        model: this.model,
        usage: { durationMs: this.latencyMs },
      }
    } finally {
      this.concurrent--
    }
  }

  async describe(images: { path: string }[], instruction?: string): Promise<string> {
    return `analysis-only notes (${images.length} refs): ${instruction ?? 'abstract composition / palette / subject class; do not copy'}`
  }

  async generateVideo(req: VideoRequest, signal?: AbortSignal) {
    if (signal?.aborted) {
      const e = new Error('Aborted')
      e.name = 'AbortError'
      throw e
    }
    const clip = await renderMockVideo(req, signal)
    const hash = createHash('sha256').update(clip.bytes).digest('hex').slice(0, 8)
    const path = `memory://${this.id}/video-${hash}.mp4`
    return {
      path,
      url: path,
      width: clip.width,
      height: clip.height,
      durationSec: clip.durationSec,
      mime: 'video/mp4',
      providerId: this.id,
      model: this.model,
      bytes: clip.bytes,
    }
  }
}

const LONG_SIDE: Record<string, number> = {
  '自动': 1024,
  auto: 1024,
  '1K': 1024,
  '2K': 2048,
  '4K': 4096,
}

/** 9 fixed ratios from 02/03. 自动 → 1:1. Long side set by clarity. */
export function sizeFor(aspect: string, clarity?: string): { width: number; height: number } {
  const long = LONG_SIDE[clarity ?? '1K'] ?? 1024
  const ratio = !aspect || aspect === '自动' || aspect === 'auto' ? '1:1' : aspect
  const [a, b] = ratio.split(':').map(Number)
  if (!a || !b) return { width: long, height: long }
  if (a >= b) return { width: long, height: Math.max(1, Math.round(long * (b / a))) }
  return { width: Math.max(1, Math.round(long * (a / b))), height: long }
}

export function pixelsFor(aspect: string): { width: number; height: number } {
  return sizeFor(aspect, '1K')
}

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 8)
}

function hashColor(s: string): [number, number, number, number] {
  const h = createHash('sha256').update(s).digest()
  return [h[0], h[1], h[2], 255]
}

function abortError(): Error {
  const e = new Error('Aborted')
  e.name = 'AbortError'
  return e
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(abortError())
    })
  })
}

export const name = 'image-provider-mock'
export const inject = ['imagegen']

export function apply(ctx: Context): void {
  const impl = new MockImageProvider()
  ctx.effect(() => ctx.imagegen.register(impl.id, impl), 'image-provider-mock')
}
