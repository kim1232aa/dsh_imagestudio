export interface ProviderConfig {
  id: string
  protocol: 'openai-image' | 'gemini-generate' | 'nova-bridge' | 'mock'
  model: string
  baseUrl?: string
  apiKeyEnv: string
  maxRefImages?: number
  maxResolution?: string
  providerOptions?: Record<string, unknown>
}

export interface StudioConfig {
  providers: ProviderConfig[]
  defaults: {
    textToImage?: string
    imageToImage?: string
    describe?: string
    poster?: string
  }
  skills: { dir: string; enabled: string[] }
  output: { dir: string; keepLastTasks: number; ttlHours?: number }
  limits: { concurrency: number; perTaskTimeoutMs: number; maxImagesPerCall: number }
  guard: { blacklistPath?: string; failClosed: boolean }
}

export const defaultConfig = (): StudioConfig => ({
  providers: [],
  defaults: {},
  skills: { dir: './skills', enabled: ['cinema-dna-21x9x3', 'life-force-portrait'] },
  output: { dir: '.dsh/image-studio', keepLastTasks: 50 },
  limits: { concurrency: 3, perTaskTimeoutMs: 180_000, maxImagesPerCall: 4 },
  guard: { failClosed: true },
})

export function assertProviderConfig(row: Partial<ProviderConfig>, path = 'providers[]'): ProviderConfig {
  const missing: string[] = []
  if (!row.id) missing.push(`${path}.id`)
  if (!row.protocol) missing.push(`${path}.protocol`)
  if (!row.model) missing.push(`${path}.model`)
  if (!row.apiKeyEnv) missing.push(`${path}.apiKeyEnv`)
  if (missing.length) {
    throw new Error(`Illegal config: missing required field(s): ${missing.join(', ')}`)
  }
  return row as ProviderConfig
}

export function redactSecrets<T extends Record<string, unknown>>(obj: T): T {
  const clone = structuredClone(obj)
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    const rec = node as Record<string, unknown>
    for (const [k, v] of Object.entries(rec)) {
      if (/key|secret|authorization|token|credential/i.test(k) && typeof v === 'string') {
        rec[k] = v ? { path: k, set: true } : { path: k, set: false }
      } else {
        walk(v)
      }
    }
  }
  walk(clone)
  return clone
}
