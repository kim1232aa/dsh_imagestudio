import type { ImageProvider, ImageRequest, ImageResult, ProviderInfo, TaskKind } from './types.ts'

export class ImageGenRegistry {
  private providers = new Map<string, ImageProvider>()
  defaultId?: string

  register(id: string, impl: ImageProvider): () => void {
    this.providers.set(id, impl)
    if (!this.defaultId) this.defaultId = id
    return () => {
      this.providers.delete(id)
      if (this.defaultId === id) this.defaultId = this.providers.keys().next().value
    }
  }

  list(): ProviderInfo[] {
    return [...this.providers.values()].map((p) => p.info())
  }

  resolve(id?: string, _task?: TaskKind): ImageProvider {
    const key = id ?? this.defaultId
    if (!key) throw new Error('No image provider registered')
    const impl = this.providers.get(key)
    if (!impl) throw new Error(`Unknown image provider: ${key}`)
    return impl
  }

  async generate(req: ImageRequest, opts?: { providerId?: string; signal?: AbortSignal }): Promise<ImageResult> {
    return this.resolve(opts?.providerId).generate(req, opts?.signal)
  }

  async describe(images: Parameters<NonNullable<ImageProvider['describe']>>[0], instruction?: string): Promise<string> {
    const provider = this.resolve()
    if (!provider.describe) throw new Error('Active provider does not implement describe()')
    return provider.describe(images, instruction)
  }

  get size(): number {
    return this.providers.size
  }
}
