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
export type TaskKind =
  | 'text-to-image'
  | 'image-to-image'
  | 'describe'
  | 'compose'
  | 'text-to-video'
  | 'image-to-video'

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
  /**
   * dsh llm 服务给出的顾问评审（image/score 钩子的真实监听者写入）。
   * 只读参考 —— 绝不影响 score/passed/failures/veto 的确定性判定。
   */
  llmReview?: { score: number; issues: string[] }
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
  /** 方案起草来源：'llm' = dsh 模型看 brief 起草（已过 staticCheck）；'rules' = 规则引擎兜底。 */
  draftedBy?: 'llm' | 'rules'
}

export type ClarityTier = '自动' | '1K' | '2K' | '4K' | 'auto'

export interface ImageRequest {
  prompt: string
  negative?: string
  aspectRatio: AspectRatio
  clarity?: ClarityTier
  n: number
  refImages?: AssetRef[]
  refUsage: RefUsage
  seed?: number
  plan?: CreativePlan
  shotId?: string
  /**
   * SPEC §0.4：plan.selfCheck.passed === false 时默认拦出图（PLAN_REJECTED）；
   * force=true 显式放行。无 plan 的裸生成不受此门限制。
   */
  force?: boolean
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
  /** 是否支持遮罩/局部编辑（配置了编辑模型或协议原生支持）。 */
  canMaskEdit?: boolean
}

export interface VideoRequest {
  prompt: string
  durationSec: number
  aspectRatio: AspectRatio
  firstFramePath?: string
  lastFramePath?: string
}

export interface VideoResult {
  jobId?: string
  path: string
  url: string
  width: number
  height: number
  durationSec: number
  mime: string
  providerId: string
  model: string
}

export interface ImageProvider {
  info(): ProviderInfo
  generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult>
  describe?(images: AssetRef[], instruction?: string, signal?: AbortSignal): Promise<string>
  edit?(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult>
  generateVideo?(req: VideoRequest, signal?: AbortSignal): Promise<Omit<VideoResult, 'jobId'>>
}

export type GuardVerdict = { blocked: true; reason: string }
