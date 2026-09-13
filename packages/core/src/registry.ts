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

  /**
   * Capability-aware resolution. The default provider wins when it can do the
   * job; otherwise the first registered provider that can. Only an explicit
   * `id` pins the choice — and then an incapable channel errors in words that
   * say what is missing, not a bare "fetch failed".
   *
   * Why: with a real image-only channel configured as default, video and
   * describe used to hard-fail even though mock (or another channel) could
   * serve them — 验收 4.2/7.3 要求功能可用，渠道差异对用户收敛。
   */
  resolveCapable(id: string | undefined, need: 'generate' | 'describe' | 'video'): ImageProvider {
    const capable = (p: ImageProvider): boolean =>
      need === 'describe'
        ? typeof p.describe === 'function'
        : need === 'video'
          ? typeof (p as { generateVideo?: unknown }).generateVideo === 'function'
          : typeof p.generate === 'function'
    const label = need === 'video' ? '视频生成' : need === 'describe' ? '反推' : '生图'
    if (id) {
      const impl = this.providers.get(id)
      if (!impl) throw new Error(`Unknown image provider: ${id}`)
      if (!capable(impl)) throw new Error(`渠道 ${id} 不支持${label}；请在设置里改选支持的渠道`)
      return impl
    }
    if (this.defaultId) {
      const d = this.providers.get(this.defaultId)
      if (d && capable(d)) return d
    }
    for (const p of this.providers.values()) if (capable(p)) return p
    throw new Error(`没有任何已配置渠道支持${label}，请到设置里添加`)
  }

  async generate(req: ImageRequest, opts?: { providerId?: string; signal?: AbortSignal }): Promise<ImageResult> {
    return this.resolve(opts?.providerId).generate(req, opts?.signal)
  }

  lastDescribeUsage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }

  async describe(images: Parameters<NonNullable<ImageProvider['describe']>>[0], instruction?: string): Promise<string> {
    const provider = this.resolveCapable(undefined, 'describe')
    const text = await provider.describe!(images, instruction)
    this.lastDescribeUsage = (provider as { lastUsage?: ImageGenRegistry['lastDescribeUsage'] }).lastUsage
    return text
  }

  get size(): number {
    return this.providers.size
  }
}
