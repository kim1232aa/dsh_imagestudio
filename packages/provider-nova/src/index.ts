import type { Context } from '@deepseek-ai/cordis'
import type { ImageProvider, ImageRequest, ImageResult, ProviderInfo } from '../../core/src/types.ts'

/**
 * Bridge to an existing Nova Image Studio backend (`/api/nova/*`).
 * Interface-level adapter — does not vendor Nova source.
 */
export class NovaBridgeProvider implements ImageProvider {
  readonly id: string
  readonly model: string
  readonly baseUrl: string
  readonly apiKeyEnv: string

  constructor(opts: { id: string; model: string; baseUrl: string; apiKeyEnv: string }) {
    this.id = opts.id
    this.model = opts.model
    this.baseUrl = opts.baseUrl
    this.apiKeyEnv = opts.apiKeyEnv
  }

  info(): ProviderInfo {
    return { id: this.id, protocol: 'nova-bridge', model: this.model, kinds: ['text-to-image', 'image-to-image', 'describe'] }
  }

  async generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult> {
    const key = process.env[this.apiKeyEnv]
    if (!key) throw new Error(`Credential ${this.apiKeyEnv} is empty; treated as missing`)
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/nova/generate`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key-env': this.apiKeyEnv },
      body: JSON.stringify({
        prompt: req.prompt,
        negative: req.negative,
        aspectRatio: req.aspectRatio,
        n: req.n,
        seed: req.seed,
        model: this.model,
      }),
    })
    if (!res.ok) throw new Error(`Nova bridge ${res.status}`)
    return {
      images: [],
      providerId: this.id,
      model: this.model,
      notes: ['nova-bridge: persist returned files via imageAssets in host apply()'],
    }
  }
}

export const name = 'image-provider-nova'
export const inject = ['imagegen']

export function apply(
  ctx: Context,
  config: { providers?: Array<{ id: string; model: string; baseUrl: string; apiKeyEnv: string }> } = {},
): void {
  for (const row of config.providers ?? []) {
    const impl = new NovaBridgeProvider(row)
    ctx.effect(() => ctx.imagegen.register(row.id, impl), `image-provider-nova:${row.id}`)
  }
}
