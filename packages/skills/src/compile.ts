import { randomUUID } from 'node:crypto'
import type { CreativePlan, ScoreCard, ShotSpec } from '../../core/src/types.ts'
import type { LoadedSkill } from './load.ts'
import type { SkillMode, SkillPreset } from './schema.ts'

export interface CompileOptions {
  wantPoster?: boolean
  mode?: string
  characters?: CreativePlan['characters']
  forceFailScore?: boolean
  forceVeto?: string
  seed?: number
  maxRewrites?: number
}

const BANNED_FALLBACK = [
  'cinematic',
  'beautiful',
  'poetic',
  'emotional',
  'mysterious',
  'dramatic',
  'atmospheric',
  'masterpiece',
  'epic',
]

const TEXTURE_TERMS = ['caustics', 'chromatic aberration', 'swirl bokeh', 'motion blur', 'anamorphic flare', 'halation']

function variationPalette(): Record<string, string[]> {
  return {
    景别: ['wide establishing', 'full figure', 'medium close', 'insert of the ledger'],
    机位高度: ['eye level', 'slightly below the desk', 'high from the beam', 'seated side aisle'],
    人物与环境比例: ['figure small against hall', 'figure equal to desk', 'figure cropped by pillar', 'hands dominate'],
    构图机制: ['occluding pillar', 'desk as barrier', 'door frame trap', 'off-axis glance'],
    信息密度: ['sparse hall', 'desk clutter only', 'crowd edge', 'single prop'],
    焦点层: ['far aisle', 'desk plane', 'near sleeve', 'lamp glass'],
    光线方向: ['lamp at clerk side', 'window leftover daylight', 'floor bounce only', 'door spill'],
    人物状态: ['waiting without sitting', 'hand withheld', 'writing that will not finish', 'turning toward a name not his'],
  }
}

export function selectMode(preset: SkillPreset, brief: string, opts: CompileOptions): [string, SkillMode] {
  const explicitPoster =
    opts.wantPoster === true ||
    opts.mode === 'poster' ||
    /\b(海报|封面|片名|视觉体系|poster|title card)\b/i.test(brief)
  if (explicitPoster && preset.modes.poster) return ['poster', preset.modes.poster]
  if (opts.mode && preset.modes[opts.mode]) return [opts.mode, preset.modes[opts.mode]]
  if (preset.modes.triptych) return ['triptych', preset.modes.triptych]
  if (preset.modes['mode-a'] && /升级|原图|生活照|MODE A|mode a|保留人物/i.test(brief)) {
    return ['mode-a', preset.modes['mode-a']]
  }
  if (preset.modes['mode-b']) return ['mode-b', preset.modes['mode-b']]
  const first = Object.entries(preset.modes)[0]
  return first
}

export function compilePlan(skill: LoadedSkill, brief: string, opts: CompileOptions = {}): CreativePlan {
  const maxRewrites = opts.maxRewrites ?? 2
  let attempt = 0
  let lastFailures: string[] = []
  while (attempt <= maxRewrites) {
    const plan = buildPlan(skill, brief, opts, attempt)
    const check = staticCheck(skill.preset, plan, opts)
    plan.selfCheck = check
    if (check.passed) return plan
    lastFailures = check.failures
    attempt++
  }
  const failed = buildPlan(skill, brief, opts, attempt)
  const check = staticCheck(skill.preset, failed, opts)
  failed.selfCheck = {
    ...check,
    passed: false,
    failures: lastFailures.length ? lastFailures : check.failures,
  }
  return failed
}

function buildPlan(skill: LoadedSkill, brief: string, opts: CompileOptions, salt: number): CreativePlan {
  const [modeName, mode] = selectMode(skill.preset, brief, opts)
  const rng = mulberry32((opts.seed ?? hash(brief) + salt) >>> 0)
  const reasoning = fillReasoning(skill.preset, brief, modeName, rng)
  const shots = Array.from({ length: mode.shots }, (_, i) =>
    buildShot(skill.preset, mode, modeName, brief, i, rng, opts),
  )
  if (opts.characters?.length) {
    for (const shot of shots) {
      const desc = opts.characters[0].descriptor
      if (!shot.prompt.includes(desc)) {
        shot.prompt = injectDescriptor(shot.prompt, desc)
      }
    }
  }
  const compose = mode.compose
    ? {
        mode: (mode.compose.mode as CreativePlan['compose'] extends infer C ? NonNullable<C>['mode'] : never) ?? 'triptych',
        direction: (mode.compose.direction as 'vertical' | 'horizontal') ?? 'vertical',
        gapPx: Array.isArray(mode.compose.gapPx) ? mid(mode.compose.gapPx) : mode.compose.gapPx ?? 10,
        ratios: Array.isArray(mode.compose.ratios) ? mode.compose.ratios[0] : undefined,
        decorations: 'none' as const,
      }
    : undefined

  return {
    id: randomUUID(),
    skillId: skill.preset.id,
    skillVersion: skill.preset.version,
    mode: modeName,
    reasoning,
    shots,
    compose,
    constraints: {
      referenceImages: {
        usage: mode.refUsage ?? skill.preset.constraints.referenceImages.usage,
        maxDimensions: skill.preset.constraints.referenceImages.maxDimensions,
      },
      negativePatch: skill.preset.constraints.negativePatch,
      bannedPromptTerms: skill.preset.constraints.bannedPromptTerms,
      perShotLimits: skill.preset.constraints.perShotLimits as CreativePlan['constraints']['perShotLimits'],
      mustContainInPrompt: mode.mustContainInPrompt,
    },
    selfCheck: { score: 0, passed: false, failures: [] },
    characters: opts.characters,
    brief,
  }
}

function buildShot(
  preset: SkillPreset,
  mode: SkillMode,
  modeName: string,
  brief: string,
  index: number,
  rng: () => number,
  opts: CompileOptions,
): ShotSpec {
  const dims = preset.variationRules?.dimensions ?? [
    '景别',
    '机位高度',
    '人物与环境比例',
    '构图机制',
    '信息密度',
    '焦点层',
    '光线方向',
    '人物状态',
  ]
  const palette = variationPalette()
  const variation: Record<string, string> = {}
  for (const d of dims) {
    const options = palette[d] ?? ['A', 'B', 'C', 'D']
    variation[d] = options[(index + Math.floor(rng() * 3)) % options.length]
  }
  const aspectRatio = mode.aspectRatio
  const must = mode.mustContainInPrompt ?? []
  const actionBank = [
    'counts unmarked papers against a ledger that will not close',
    'holds a sealed envelope just short of the receiving hand',
    'waits at a doorway while the clerk keeps writing',
    'turns a worn stamp toward the only unshaded desk',
  ]
  const factsBank = [
    'damp examination hall with peeling vermilion pillars',
    'rain-dark slate floor and unlit side aisle',
    'stacked bamboo slip cases along the far wall',
    'one oil lamp on the clerk desk, wick almost gone',
  ]
  const primaryAction = actionBank[index % actionBank.length]
  const sceneFacts = [factsBank[index % factsBank.length], factsBank[(index + 1) % factsBank.length]]
  const textures = pickTextures(preset, rng)
  const identity =
    modeName === 'mode-a' || /MODE A|保留人物身份/i.test(brief)
      ? 'keep the same person identity, face structure, age, costume and original event from the source photograph'
      : ''

  const parts = [
    `standalone live-action film still, ${aspectRatio} ${aspectRatio === '3:4' ? 'vertical poster composition' : 'horizontal'}, no collage, no grid`,
    identity,
    ...must,
    `location derived from brief: ${stripBanned(sanitize(brief), preset.constraints.bannedPromptTerms).slice(0, 140)}`,
    `primary action: ${primaryAction}`,
    `camera: ${variation['机位高度']}, ${variation['景别']}, ${variation['构图机制']}`,
    `light: ${variation['光线方向']} from a single practical source`,
    `subject-to-space: ${variation['人物与环境比例']}; focus on ${variation['焦点层']}`,
    `subject state: ${variation['人物状态']}`,
    textures.length ? `optical texture limited to: ${textures.join(', ')}` : '',
    'real skin texture, cloth weight, limited grain, no plastic sheen',
  ].filter(Boolean)

  return {
    id: `shot-${index + 1}`,
    role: modeName === 'poster' ? 'poster-base' : `shot ${index + 1}`,
    prompt: parts.join('. ') + '.',
    negative: preset.constraints.negativePatch,
    aspectRatio,
    sceneFacts,
    primaryAction,
    secondaryClue: 'a half-open register no one is allowed to read',
    lightSources: [String(variation['光线方向'])],
    compositionMechanisms: [String(variation['构图机制'])],
    variation,
  }
}

function pickTextures(preset: SkillPreset, rng: () => number): string[] {
  const max = preset.constraints.maxTextureLayers ?? 2
  const pool = preset.constraints.textureLayers ?? TEXTURE_TERMS
  const n = Math.min(max, 1 + Math.floor(rng() * max))
  const copy = [...pool]
  const out: string[] = []
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

function fillReasoning(preset: SkillPreset, brief: string, mode: string, rng: () => number): Record<string, string> {
  const flows = [
    '视线从门槛积水进入，被未盖章的名册挡住，落到空缺的座位，再被侧廊的黑暗带走',
    '视线从窗格漏光进入，被考生袖口截住，落到主考压住的纸条，再沿屋梁裂缝离开',
    '视线从灯芯烟进入，被木栅栏放慢，落到对坐两人之间的空白桌面，再由门外脚步声带走',
  ]
  const flow = flows[Math.floor(rng() * flows.length)]
  const table: Record<string, string> = {
    不可解决的状态: `名额已经写定，但现场出现了更需要这个名额的人。题材：${sanitize(brief).slice(0, 80)}`,
    观众位置: '坐在侧廊不被允许进入的位置，比考生知道得更少，比主考知道得更偏',
    主要构图压力: '桌案横贯画面下三分之一，人物被制度家具压在边缘',
    视线流量: flow,
    色彩命题: '褪色朱红来自漆柱，潮湿青灰来自石板返潮，灯火一角暖黄正在熄灭',
    成像基底: '35mm 低反差胶片，柔和高光滚降，局部光学不均',
    三联节奏: '远到制度空间 → 中到对峙桌案 → 近到未完成的盖章动作',
    人物: '东亚成年人，风蚀面容，旧靛蓝布袍，袖口磨白',
    事件: '一次无法当场纠正的登记错误正在被继续执行',
    镜头: '机位贴着不允许越过的木栅，焦段固定，不给对方面孔完整特权',
    光色: '唯一油灯在权威一侧，受试者只得到地面反射',
    质感: '最多两种光学效果，服务于潮湿石板与灯焰，不堆滤镜',
    保留人物身份: mode === 'mode-a' ? 'MODE A：保留人物身份、表情、动作、服装与原事件，只重组光与层次' : '',
  }
  const out: Record<string, string> = {}
  for (const field of preset.planFields) {
    out[field] = table[field] ?? `${field}: derived from brief (${sanitize(brief).slice(0, 60)})`
  }
  return out
}

export function staticCheck(preset: SkillPreset, plan: CreativePlan, opts: CompileOptions = {}): ScoreCard {
  const failures: string[] = []
  for (const field of preset.planFields) {
    if (!plan.reasoning[field] || !String(plan.reasoning[field]).trim()) {
      failures.push(`missing planField: ${field}`)
    }
  }
  const banned = preset.constraints.bannedPromptTerms ?? BANNED_FALLBACK
  for (const shot of plan.shots) {
    const lower = shot.prompt.toLowerCase()
    for (const term of banned) {
      if (new RegExp(`\\b${escapeReg(term)}\\b`, 'i').test(shot.prompt)) {
        failures.push(`bannedPromptTerm "${term}" in ${shot.id}`)
      }
    }
    const mode = preset.modes[plan.mode]
    if (mode && shot.aspectRatio !== mode.aspectRatio) {
      failures.push(`${shot.id} aspectRatio ${shot.aspectRatio} != locked ${mode.aspectRatio}`)
    }
    for (const token of mode?.mustContainInPrompt ?? []) {
      if (!shot.prompt.includes(token)) failures.push(`${shot.id} missing required phrase: ${token}`)
    }
    const limits = preset.constraints.perShotLimits
    if (limits?.sceneFacts && shot.sceneFacts) {
      const max = Array.isArray(limits.sceneFacts) ? Math.max(...limits.sceneFacts) : Number(limits.sceneFacts)
      if (shot.sceneFacts.length > max) failures.push(`${shot.id} sceneFacts > ${max}`)
    }
    if (limits?.primaryAction === 1 && shot.primaryAction?.includes(' and ') && / and .* and /.test(shot.primaryAction)) {
      failures.push(`${shot.id} more than one primary action`)
    }
    const textures = countTextures(shot.prompt)
    if ((preset.constraints.maxTextureLayers ?? 99) < textures) {
      failures.push(`${shot.id} texture layers ${textures} exceed max`)
    }
  }
  if (preset.variationRules && plan.shots.length >= 3) {
    const changed = countChangedDimensions(plan.shots, preset.variationRules.dimensions)
    if (changed < preset.variationRules.minChangedDimensions) {
      failures.push(`variationRules: only ${changed} dimensions changed, need ${preset.variationRules.minChangedDimensions}`)
    }
  }
  if (opts.forceVeto) failures.push(`veto:${opts.forceVeto}`)
  if (opts.forceFailScore) failures.push('forced-low-score')

  let score = 88
  if (opts.forceFailScore) score = 70
  if (failures.some((f) => f.startsWith('veto:'))) score = 0
  const vetoHit = [...(preset.scoring.vetoes ?? [])].find((v) =>
    failures.some((f) => f.includes(v) || f.startsWith('veto:')),
  )
  if (opts.forceVeto) {
    return { score: 0, passed: false, failures: [`veto:${opts.forceVeto}`], veto: opts.forceVeto }
  }
  const passed = score >= preset.scoring.threshold && failures.length === 0 && !vetoHit
  return { score, passed, failures }
}

export function countChangedDimensions(shots: ShotSpec[], dimensions: string[]): number {
  let changed = 0
  for (const dim of dimensions) {
    const values = new Set(shots.map((s) => s.variation?.[dim] ?? ''))
    if (values.size > 1) changed++
  }
  return changed
}

function countTextures(prompt: string): number {
  return TEXTURE_TERMS.filter((t) => prompt.toLowerCase().includes(t)).length
}

function injectDescriptor(prompt: string, descriptor: string): string {
  const marker = 'location derived from brief:'
  if (prompt.includes(marker)) return prompt.replace(marker, `${descriptor}. ${marker}`)
  return `${descriptor}. ${prompt}`
}

function sanitize(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function stripBanned(s: string, terms?: string[]): string {
  let out = s
  for (const term of terms ?? BANNED_FALLBACK) {
    out = out.replace(new RegExp(`\\b${escapeReg(term)}\\b`, 'ig'), '')
  }
  return out.replace(/\s+/g, ' ').trim()
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mid(n: number[]): number {
  return Math.round((Math.min(...n) + Math.max(...n)) / 2)
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export { TEXTURE_TERMS }
