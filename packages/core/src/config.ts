import Schema from '@deepseek-ai/schemastery'

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

const providerRow = Schema.object({
  id: Schema.string().required(),
  protocol: Schema.union([
    Schema.const('openai-image'),
    Schema.const('gemini-generate'),
    Schema.const('nova-bridge'),
    Schema.const('mock'),
  ]).required(),
  model: Schema.string().required(),
  apiKeyEnv: Schema.string().role('secret').required(),
  baseUrl: Schema.string(),
  maxRefImages: Schema.number(),
  maxResolution: Schema.string(),
  providerOptions: Schema.dict(Schema.any()),
})

/** Standard Schema used by tests and by a full dsh profile. Not re-exported as the core plugin Config. */
export const Config = Schema.object({
  providers: Schema.array(providerRow).default([] as never),
  defaults: Schema.object({
    textToImage: Schema.string(),
    imageToImage: Schema.string(),
    describe: Schema.string(),
    poster: Schema.string(),
  }).default({} as never),
  skills: Schema.object({
    dir: Schema.string().default('./skills'),
    enabled: Schema.array(Schema.string()).default(['cinema-dna-21x9x3', 'life-force-portrait'] as never),
  }).default({ dir: './skills', enabled: ['cinema-dna-21x9x3', 'life-force-portrait'] } as never),
  output: Schema.object({
    dir: Schema.string().default('.dsh/image-studio'),
    keepLastTasks: Schema.number().default(50),
    ttlHours: Schema.number(),
  }).default({ dir: '.dsh/image-studio', keepLastTasks: 50 } as never),
  limits: Schema.object({
    concurrency: Schema.number().default(3),
    perTaskTimeoutMs: Schema.number().default(180_000),
    maxImagesPerCall: Schema.number().default(4),
  }).default({ concurrency: 3, perTaskTimeoutMs: 180_000, maxImagesPerCall: 4 } as never),
  guard: Schema.object({
    blacklistPath: Schema.string(),
    failClosed: Schema.boolean().default(true),
  }).default({ failClosed: true } as never),
})

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

/** Schemastery secret-role fields (and any *key* string) become `{ path, set }`. */
export function describeRedacted(obj: Record<string, unknown>): Record<string, unknown> {
  return redactSecrets(obj)
}
