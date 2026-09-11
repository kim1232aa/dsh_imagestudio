import type { ImageProvider, ImageRequest, ImageResult, ProviderInfo } from '../../core/src/types.ts'
import { pixelsFor } from '../../provider-mock/src/index.ts'

export interface OpenAIProviderOptions {
  id: string
  model: string
  baseUrl?: string
  apiKeyEnv: string
}

export class OpenAIImageProvider implements ImageProvider {
  constructor(private readonly opts: OpenAIProviderOptions) {}

  info(): ProviderInfo {
    return {
      id: this.opts.id,
      protocol: 'openai-image',
      model: this.opts.model,
      kinds: ['text-to-image', 'image-to-image'],
    }
  }

  private key(): string {
    const value = process.env[this.opts.apiKeyEnv]
    if (!value) throw new Error(`Credential ${this.opts.apiKeyEnv} is empty; treated as missing (no silent fallback)`)
    return value
  }

  async generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult> {
    if (req.refUsage === 'analysis-only' && req.refImages?.length) {
      throw new Error('provider refused refImages because refUsage=analysis-only')
    }
    const key = this.key()
    const size = sizeFor(req.aspectRatio)
    const base = (this.opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')
    const res = await fetch(`${base}/images/generations`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.opts.model,
        prompt: req.prompt,
        n: req.n,
        size,
      }),
    })
    if (!res.ok) {
      const err = new Error(`OpenAI image API ${res.status}`)
      throw err
    }
    const body = (await res.json()) as { data: Array<{ b64_json?: string; url?: string }> }
    const { width, height } = pixelsFor(req.aspectRatio)
    return {
      images: body.data.map((_, i) => ({
        path: `remote://${this.opts.id}/${i}`,
        width,
        height,
        mime: 'image/png',
        sha256: 'pending',
      })),
      providerId: this.opts.id,
      model: this.opts.model,
    }
  }
}

function sizeFor(aspect: string): string {
  if (aspect === '1:1') return '1024x1024'
  if (aspect === '3:4' || aspect === '9:16') return '1024x1536'
  return '1536x1024'
}

export const name = 'image-provider-openai'
export const inject = ['imagegen']
