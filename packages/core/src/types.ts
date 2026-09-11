export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type AspectRatio =
  | '21:9'
  | '2.39:1'
  | '16:9'
  | '3:4'
  | '1:1'
  | '9:16'
  | '4:3'
  | (string & {})

export type RefUsage = 'analysis-only' | 'image-to-image'
export type TaskKind = 'text-to-image' | 'image-to-image' | 'describe' | 'compose'

export interface AssetRef {
  path: string
  width: number
  height: number
  mime: string
  sha256: string
}

export interface ShotSpec {
  id: string
  role: string
  prompt: string
  negative: string
  aspectRatio: AspectRatio
  sceneFacts?: string[]
  primaryAction?: string
  secondaryClue?: string
  lightSources?: string[]
  compositionMechanisms?: string[]
  variation?: Record<string, string>
}

export interface ComposeSpec {
  mode: 'triptych' | 'grid' | 'text-overlay' | 'gif' | 'crop'
  direction?: 'vertical' | 'horizontal'
  gapPx?: number
  ratios?: string
  decorations?: 'none' | string
  title?: string
  layout?: string
}

export interface CharacterSheet {
  id: string
  role: string
  descriptor: string
  consistencyAnchors: string[]
  seed?: number
}

export interface ScoreCard {
  score: number
  passed: boolean
  failures: string[]
  veto?: string
  breakdown?: Array<{ item: string; score: number; max: number }>
}

export interface PresetConstraints {
  referenceImages: {
    usage: RefUsage
    maxDimensions?: number
  }
  negativePatch: string
  bannedPromptTerms?: string[]
  perShotLimits?: {
    sceneFacts?: [number, number] | number[]
    primaryAction?: number
    secondaryClue?: number
    lightSources?: number
    compositionMechanisms?: number
  }
  mustContainInPrompt?: string[]
}

export interface CreativePlan {
  id: string
  skillId: string
  skillVersion: string
  mode: string
  reasoning: Record<string, string>
  shots: ShotSpec[]
  compose?: ComposeSpec
  constraints: PresetConstraints
  selfCheck: ScoreCard
  characters?: CharacterSheet[]
  brief: string
}

export interface ImageRequest {
  prompt: string
  negative?: string
  aspectRatio: AspectRatio
  n: number
  refImages?: AssetRef[]
  refUsage: RefUsage
  seed?: number
  plan?: CreativePlan
  shotId?: string
  providerOptions?: Record<string, JsonValue>
}

export interface ImageResult {
  images: AssetRef[]
  providerId: string
  model: string
  usage?: { durationMs: number; upstreamCost?: number }
  notes?: string[]
}

export interface ProviderInfo {
  id: string
  protocol: string
  model: string
  kinds: TaskKind[]
}

export interface ImageProvider {
  info(): ProviderInfo
  generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult>
  describe?(images: AssetRef[], instruction?: string, signal?: AbortSignal): Promise<string>
  edit?(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult>
}

export type GuardVerdict = { blocked: true; reason: string }

export interface ToolArgsError extends Error {
  code: 'INVALID_ARGS' | 'TIMEOUT' | 'CANCELLED' | 'PROVIDER' | 'PATH'
}
