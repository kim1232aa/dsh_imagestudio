export interface SkillPreset {
  id: string
  version: string
  title?: string
  source: string
  supersededBy?: string
  modes: Record<string, SkillMode>
  constraints: {
    referenceImages: { usage: 'analysis-only' | 'image-to-image'; maxDimensions?: number }
    negativePatch: string
    bannedPromptTerms?: string[]
    perShotLimits?: Record<string, number | number[]>
    textureLayers?: string[]
    maxTextureLayers?: number
  }
  planFields: string[]
  scoring: {
    threshold: number
    rubric: Array<{ item: string; max: number }>
    posterBonus?: Array<{ item: string; max: number }>
    vetoes?: string[]
  }
  variationRules?: {
    minChangedDimensions: number
    dimensions: string[]
  }
}

export interface SkillMode {
  shots: number
  aspectRatio: string
  trigger?: 'explicit' | 'default'
  compose?: {
    mode: string
    direction?: string
    gapPx?: number | number[]
    ratios?: string[]
    decorations?: string
  }
  mustContainInPrompt?: string[]
  textStrategy?: string
  refUsage?: 'analysis-only' | 'image-to-image'
}

const REQUIRED = ['id', 'version', 'source', 'modes', 'planFields'] as const

export function validatePreset(raw: unknown, dirName: string): SkillPreset {
  if (!raw || typeof raw !== 'object') throw new Error('preset.yaml is empty')
  const p = raw as Record<string, unknown>
  for (const key of REQUIRED) {
    if (p[key] == null) throw new Error(`preset.yaml missing required field: ${key}`)
  }
  if (typeof p.id !== 'string' || p.id !== dirName) {
    throw new Error(`preset.yaml id "${String(p.id)}" does not match directory name "${dirName}"`)
  }
  if (!p.modes || typeof p.modes !== 'object' || !Object.keys(p.modes as object).length) {
    throw new Error('preset.yaml missing required field: modes')
  }
  const constraints = p.constraints as SkillPreset['constraints'] | undefined
  if (!constraints?.referenceImages?.usage) {
    throw new Error('preset.yaml missing required field: constraints.referenceImages.usage')
  }
  if (typeof constraints.negativePatch !== 'string') {
    throw new Error('preset.yaml missing required field: constraints.negativePatch')
  }
  if (!Array.isArray(p.planFields) || p.planFields.length === 0) {
    throw new Error('preset.yaml missing required field: planFields')
  }
  const scoring = p.scoring as SkillPreset['scoring'] | undefined
  if (typeof scoring?.threshold !== 'number') {
    throw new Error('preset.yaml missing required field: scoring.threshold')
  }
  if (!Array.isArray(scoring.rubric)) {
    throw new Error('preset.yaml missing required field: scoring.rubric')
  }
  return p as unknown as SkillPreset
}
