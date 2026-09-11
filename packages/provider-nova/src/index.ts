import type { ImageProvider, ImageRequest, ImageResult, ProviderInfo } from '../../core/src/types.ts'

/**
 * Bridge to an existing Nova Image Studio backend (`/api/nova/*`).
 * Interface-level adapter — does not vendor Nova source.
 */
export class NovaBridgeProvider implements ImageProvider {
  constructor(private readonly opts: { id: string; model: string; baseUrl: string; apiKeyEnv: string }) {}

  info(): ProviderInfo {
    return { id: this.opts.id, protocol: 'nova-bridge', model: this.opts.model, kinds: ['text-to-image', 'image-to-image', 'describe'] }
  }

  async generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult> {
    const key = process.env[this.opts.apiKeyEnv]
    if (!key) throw new Error(`Credential ${this.opts.apiKeyEnv} is empty; treated as missing`)
    const res = await fetch(`${this.opts.baseUrl.replace(/\/$/, '')}/api/nova/generate`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key-env': this.opts.apiKeyEnv },
      body: JSON.stringify({
        prompt: req.prompt,
        negative: req.negative,
        aspectRatio: req.aspectRatio,
        n: req.n,
        seed: req.seed,
        model: this.opts.model,
      }),
    })
    if (!res.ok) throw new Error(`Nova bridge ${res.status}`)
    return {
      images: [],
      providerId: this.opts.id,
      model: this.opts.model,
      notes: ['nova-bridge: persist returned files via imageAssets in host apply()'],
    }
  }
}

export const name = 'image-provider-nova'
export const inject = ['imagegen']
