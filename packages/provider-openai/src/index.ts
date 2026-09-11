import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type { ImageProvider, ImageRequest, ImageResult, ProviderInfo } from '../../core/src/types.ts'
import { pixelsFor } from '../../provider-mock/src/index.ts'
import { assertProviderConfig } from '../../core/src/config.ts'

export interface OpenAIProviderOptions {
  id: string
  model: string
  baseUrl?: string
  apiKeyEnv: string
}

export class OpenAIImageProvider implements ImageProvider {
  readonly id: string
  readonly model: string
  readonly baseUrl: string
  readonly apiKeyEnv: string

  constructor(opts: OpenAIProviderOptions) {
    this.id = opts.id
    this.model = opts.model
    this.baseUrl = (opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')
    this.apiKeyEnv = opts.apiKeyEnv
  }

  info(): ProviderInfo {
    return {
      id: this.id,
      protocol: 'openai-image',
      model: this.model,
      kinds: ['text-to-image', 'image-to-image'],
    }
  }

  private key(): string {
    const value = process.env[this.apiKeyEnv]
    if (!value) throw new Error(`Credential ${this.apiKeyEnv} is empty; treated as missing (no silent fallback)`)
    return value
  }

  async generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult> {
    if (req.refUsage === 'analysis-only' && req.refImages?.length) {
      throw new Error('provider refused refImages because refUsage=analysis-only')
    }
    const key = this.key()
    const xai = this.baseUrl.includes('x.ai')
    const body = xai
      ? {
          model: this.model,
          prompt: req.prompt,
          n: Math.min(req.n, 4),
          response_format: 'b64_json',
        }
      : {
          model: this.model,
          prompt: req.prompt,
          n: req.n,
          size: sizeFor(req.aspectRatio),
        }
    const res = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`OpenAI image API ${res.status}`)
    }
    const payload = (await res.json()) as { data: Array<{ b64_json?: string; url?: string }> }
    const { width, height } = pixelsFor(req.aspectRatio)
    const images = []
    for (let i = 0; i < payload.data.length; i++) {
      const row = payload.data[i]
      let bytes = new Uint8Array()
      if (row.b64_json) bytes = Buffer.from(row.b64_json, 'base64')
      else if (row.url) {
        const img = await fetch(row.url, { signal })
        bytes = new Uint8Array(await img.arrayBuffer())
      }
      images.push({
        path: `remote://${this.id}/${i}`,
        width,
        height,
        mime: 'image/png',
        sha256: 'pending',
        bytes,
      })
    }
    return { images, providerId: this.id, model: this.model }
  }
}

function sizeFor(aspect: string): string {
  if (aspect === '1:1') return '1024x1024'
  if (aspect === '3:4' || aspect === '9:16') return '1024x1536'
  return '1536x1024'
}

export const name = 'image-provider-openai'
export const inject = ['imagegen']

export const Config = Schema.object({
  providers: Schema.array(
    Schema.object({
      id: Schema.string().required(),
      protocol: Schema.string().default('openai-image'),
      model: Schema.string().required(),
      apiKeyEnv: Schema.string().role('secret').required(),
      baseUrl: Schema.string(),
    }),
  ).default([] as never),
})

export function apply(
  ctx: Context,
  config: { providers?: Array<{ id: string; model: string; apiKeyEnv: string; baseUrl?: string; protocol?: string }> } = {},
): void {
  for (const row of config.providers ?? []) {
    const cfg = assertProviderConfig({ ...row, protocol: 'openai-image' })
    const impl = new OpenAIImageProvider(cfg)
    ctx.effect(() => ctx.imagegen.register(impl.id, impl), `image-provider-openai:${impl.id}`)
  }
}
