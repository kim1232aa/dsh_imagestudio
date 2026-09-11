import type { ImageProvider, ImageRequest, ImageResult, ProviderInfo } from '../../core/src/types.ts'

export class GeminiImageProvider implements ImageProvider {
  constructor(
    private readonly opts: { id: string; model: string; apiKeyEnv: string; baseUrl?: string },
  ) {}

  info(): ProviderInfo {
    return { id: this.opts.id, protocol: 'gemini-generate', model: this.opts.model, kinds: ['text-to-image'] }
  }

  async generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult> {
    const key = process.env[this.opts.apiKeyEnv]
    if (!key) throw new Error(`Credential ${this.opts.apiKeyEnv} is empty; treated as missing`)
    if (req.refUsage === 'analysis-only' && req.refImages?.length) {
      throw new Error('provider refused refImages because refUsage=analysis-only')
    }
    const url =
      (this.opts.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta') +
      `/models/${this.opts.model}:generateContent?key=${key}`
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
      providerId: this.opts.id,
      model: this.opts.model,
      notes: ['gemini adapter: parse inlineData from candidates in M3'],
    }
  }
}

export const name = 'image-provider-gemini'
export const inject = ['imagegen']
