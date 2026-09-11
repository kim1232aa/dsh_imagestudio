import type { Context } from '@deepseek-ai/cordis'
import type { ImageProvider, ImageRequest, ImageResult, ProviderInfo } from '../../core/src/types.ts'

export class GeminiImageProvider implements ImageProvider {
  readonly id: string
  readonly model: string
  readonly apiKeyEnv: string
  readonly baseUrl: string

  constructor(opts: { id: string; model: string; apiKeyEnv: string; baseUrl?: string }) {
    this.id = opts.id
    this.model = opts.model
    this.apiKeyEnv = opts.apiKeyEnv
    this.baseUrl = opts.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
  }

  info(): ProviderInfo {
    return { id: this.id, protocol: 'gemini-generate', model: this.model, kinds: ['text-to-image'] }
  }

  async generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult> {
    const key = process.env[this.apiKeyEnv]
    if (!key) throw new Error(`Credential ${this.apiKeyEnv} is empty; treated as missing`)
    if (req.refUsage === 'analysis-only' && req.refImages?.length) {
      throw new Error('provider refused refImages because refUsage=analysis-only')
    }
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${key}`
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: req.prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    })
    if (!res.ok) throw new Error(`Gemini image API ${res.status}`)
    return {
      images: [],
      providerId: this.id,
      model: this.model,
      notes: ['gemini adapter: parse inlineData from candidates in M3'],
    }
  }
}

export const name = 'image-provider-gemini'
export const inject = ['imagegen']

export function apply(
  ctx: Context,
  config: { providers?: Array<{ id: string; model: string; apiKeyEnv: string; baseUrl?: string }> } = {},
): void {
  for (const row of config.providers ?? []) {
    const impl = new GeminiImageProvider(row)
    ctx.effect(() => ctx.imagegen.register(row.id, impl), `image-provider-gemini:${row.id}`)
  }
}
