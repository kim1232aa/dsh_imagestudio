/**
 * 真实接入 dsh `llm` 服务（inject = ['llm']）的三条链路：
 *   1. compilePlanWithLlm —— 让真模型看 brief 起草方案，再套规则骨架 + staticCheck 硬校验
 *   2. reviewPlanWithLlm  —— image/score 钩子的真实评审（顾问性质，不改闸门判定）
 *   3. enhancePromptWithLlm —— 「增强提示词」按钮真调一次模型改写
 *
 * 边界（验收红线）：
 *   - 每条链路恰好一次 LLM 调用，不重试、不循环，没有收费黑洞；
 *   - 没配模型 / 调用失败 / 返回不可解析 → 一律优雅回退规则引擎，绝不报错崩溃；
 *   - 模型产出必须过硬性规则（比例锁定、违禁词、必含短语、维度上限），
 *     过不了 staticCheck 就整份回退到规则方案，约束不丢。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { CreativePlan, ShotSpec } from '../../core/src/types.ts'
import { compilePlan, staticCheck, type CompileOptions } from './compile.ts'
import type { LoadedSkill } from './load.ts'

/** dsh llm 服务的结构子集：真实实现按 provider/model 路由，可能流式；这里只要一次性文本。 */
export interface LlmLike {
  chat?: (input: unknown) => Promise<unknown>
  complete?: (input: unknown) => Promise<unknown>
  generate?: (input: unknown) => Promise<unknown>
}

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

const LLM_TIMEOUT_MS = 45_000

export function llmFrom(ctx: Context): LlmLike | undefined {
  const llm = (ctx as Context & { llm?: LlmLike }).llm
  if (llm && (typeof llm.chat === 'function' || typeof llm.complete === 'function' || typeof llm.generate === 'function')) {
    return llm
  }
  return undefined
}

function normalizeText(out: unknown): string {
  if (typeof out === 'string') return out.trim()
  if (!out || typeof out !== 'object') return ''
  const o = out as Record<string, unknown>
  for (const key of ['text', 'content', 'answer', 'output']) {
    if (typeof o[key] === 'string' && (o[key] as string).trim()) return (o[key] as string).trim()
  }
  const msg = o.message as Record<string, unknown> | undefined
  if (msg && typeof msg.content === 'string' && msg.content.trim()) return msg.content.trim()
  const choices = o.choices as Array<Record<string, unknown>> | undefined
  const first = choices?.[0]
  if (first) {
    const m = first.message as Record<string, unknown> | undefined
    if (m && typeof m.content === 'string' && m.content.trim()) return m.content.trim()
    if (typeof first.text === 'string' && first.text.trim()) return first.text.trim()
  }
  return ''
}

/**
 * 调一次 llm 拿文本。依次尝试 dsh 可能的调用形态，任一形态抛出/为空就换下一种；
 * 全部失败返回 ''（调用方回退规则路径）。单次调用、带超时，不重试。
 */
export async function chatText(llm: LlmLike, messages: ChatMessage[], timeoutMs = LLM_TIMEOUT_MS): Promise<string> {
  const joined = messages.map((m) => `${m.role === 'system' ? '系统' : '用户'}：${m.content}`).join('\n\n')
  const attempts: Array<() => Promise<unknown>> = []
  if (typeof llm.chat === 'function') {
    attempts.push(() => llm.chat!({ messages }))
    attempts.push(() => llm.chat!(messages))
    attempts.push(() => llm.chat!({ prompt: joined }))
  }
  if (typeof llm.complete === 'function') attempts.push(() => llm.complete!({ prompt: joined }))
  if (typeof llm.generate === 'function') attempts.push(() => llm.generate!(joined))
  for (const call of attempts) {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const out = await Promise.race([
        call(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('llm timeout')), timeoutMs)
        }),
      ])
      const text = normalizeText(out)
      if (text) return text
    } catch {
      // 换下一种形态；全失败则回退
    } finally {
      // 不 clear 的话活跃 timer 会拖住进程事件循环（测试套件因此被拖慢 10 倍）
      if (timer) clearTimeout(timer)
    }
  }
  return ''
}

/** 从模型输出里提取第一个平衡括号 JSON 对象；容忍代码围栏与前导废话。 */
export function extractJson(text: string): Record<string, unknown> | undefined {
  const cleaned = text.replace(/```(?:json)?/gi, '```')
  const start = cleaned.indexOf('{')
  if (start < 0) return undefined
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        try {
          const parsed = JSON.parse(cleaned.slice(start, i + 1)) as unknown
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
          return undefined
        } catch {
          return undefined
        }
      }
    }
  }
  return undefined
}

function asStringArray(v: unknown, cap: number, itemMax = 120): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim().slice(0, itemMax))
  return out.length ? out.slice(0, Math.max(1, cap)) : undefined
}

function cap(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

function buildDraftMessages(skill: LoadedSkill, brief: string, skeleton: CreativePlan): ChatMessage[] {
  const preset = skill.preset
  // 模式/镜头数/画幅直接取规则骨架 —— 与最终锁定值同源，不重复编译
  const mode = preset.modes[skeleton.mode]
  const must = mode?.mustContainInPrompt ?? []
  const banned = preset.constraints.bannedPromptTerms ?? []
  const dims = preset.variationRules?.dimensions ?? []
  const shotCount = skeleton.shots.length
  const system = [
    '你是电影级 AI 图像分镜师。读懂用户的创意 brief，为指定 skill 起草一份拍摄方案。',
    '只输出一个 JSON 对象：不要 markdown 围栏，不要任何解释性文字。',
    'JSON 结构：{"reasoning": {"<方案字段>": "中文分析，每字段一到三句"}, "shots": [{"prompt": "英文图像提示词，80-200 词，具体写主体/动作/机位/光线/材质", "primaryAction": "英文一句话动作", "sceneFacts": ["英文场景事实", "……"], "secondaryClue": "英文一条次要线索", "lightSources": ["英文光源"], "compositionMechanisms": ["英文构图机制"], "variation": {"<维度>": "英文取值"}}]}',
    `硬性要求：恰好 ${shotCount} 个 shot；每个 prompt 必须原样包含这些短语：${must.length ? must.join(' | ') : '（无）'}；`,
    `禁止出现这些词：${banned.length ? banned.join(', ') : '（无）'}；`,
    '每个 shot 是一张独立电影剧照，不要拼贴、不要多格；光线只许单一现实光源。',
  ].join('\n')
  const user = [
    `skill：${preset.id}（${preset.title ?? preset.id}），模式：${skeleton.mode}，画幅锁定 ${mode?.aspectRatio ?? '1:1'}`,
    `方案字段（reasoning 必须逐一覆盖）：${preset.planFields.join('、')}`,
    dims.length ? `镜头间变化维度（variation 的键）：${dims.join('、')}` : '',
    `用户 brief：${brief}`,
  ].filter(Boolean).join('\n')
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

function mergeLlmShot(base: ShotSpec, raw: unknown, banned: string[], must: string[], maxTextures: number): ShotSpec {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  let prompt = typeof r.prompt === 'string' ? r.prompt.replace(/\s+/g, ' ').trim() : ''
  if (prompt) {
    for (const term of banned) {
      prompt = prompt.replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'ig'), '').replace(/\s{2,}/g, ' ')
    }
    prompt = cap(prompt, 1500)
    // 必含短语缺失就补进去 —— 硬性约束不由模型决定
    const missing = must.filter((t) => !prompt.includes(t))
    if (missing.length) prompt = `${prompt}. ${missing.join('. ')}`
    if (countTextureTerms(prompt) > maxTextures) prompt = '' // 超纹理上限 → 回退规则句
  }
  const variationRaw = r.variation && typeof r.variation === 'object' && !Array.isArray(r.variation)
    ? Object.fromEntries(
        Object.entries(r.variation as Record<string, unknown>)
          .filter(([, v]) => typeof v === 'string' && !!v)
          .map(([k, v]) => [k, String(v).slice(0, 120)]),
      )
    : undefined
  return {
    ...base,
    prompt: prompt || base.prompt,
    primaryAction: typeof r.primaryAction === 'string' && r.primaryAction.trim() ? cap(r.primaryAction.trim(), 200) : base.primaryAction,
    sceneFacts: asStringArray(r.sceneFacts, 4, 160) ?? base.sceneFacts,
    secondaryClue: typeof r.secondaryClue === 'string' && r.secondaryClue.trim() ? cap(r.secondaryClue.trim(), 200) : base.secondaryClue,
    lightSources: asStringArray(r.lightSources, 2) ?? base.lightSources,
    compositionMechanisms: asStringArray(r.compositionMechanisms, 2) ?? base.compositionMechanisms,
    variation: variationRaw ? { ...base.variation, ...variationRaw } : base.variation,
  }
}

const TEXTURE_POOL = ['caustics', 'chromatic aberration', 'swirl bokeh', 'motion blur', 'anamorphic flare', 'halation']
function countTextureTerms(prompt: string): number {
  return TEXTURE_POOL.filter((t) => prompt.toLowerCase().includes(t)).length
}

/**
 * LLM 起草 + 规则骨架合并 + staticCheck 硬校验。
 * 返回的 plan.draftedBy 标记真实来源；任何一步不达标都回退到纯规则方案。
 * forceVeto / forceFailScore / seed 是测试专用确定性路径，直接走规则引擎（一次 LLM 都不调）。
 */
export async function compilePlanWithLlm(
  ctx: Context,
  skill: LoadedSkill,
  brief: string,
  opts: CompileOptions = {},
): Promise<CreativePlan> {
  const skeleton = compilePlan(skill, brief, opts)
  skeleton.draftedBy = 'rules'
  if (opts.forceVeto || opts.forceFailScore || opts.seed != null) return skeleton
  // 确定性失败路径一次模型都不调：brief 自带 veto（如「游戏CG应拒」）、
  // 规则引擎重写完仍未过 —— 闸门契约原样返回，绝不让模型把 veto 洗没。
  if (skeleton.selfCheck.veto || skeleton.selfCheck.passed === false) return skeleton
  const llm = llmFrom(ctx)
  if (!llm) return skeleton
  let text = ''
  try {
    text = await chatText(llm, buildDraftMessages(skill, brief, skeleton))
  } catch {
    return skeleton
  }
  const parsed = text ? extractJson(text) : undefined
  if (!parsed) return skeleton

  const preset = skill.preset
  const mode = preset.modes[skeleton.mode]
  const must = mode?.mustContainInPrompt ?? []
  const banned = preset.constraints.bannedPromptTerms ?? []
  const maxTextures = preset.constraints.maxTextureLayers ?? 99
  const rawShots = Array.isArray(parsed.shots) ? parsed.shots : []
  let llmPrompts = 0
  const merged: CreativePlan = {
    ...skeleton,
    shots: skeleton.shots.map((s, i) => {
      const m = mergeLlmShot(s, rawShots[i], banned, must, maxTextures)
      if (m.prompt !== s.prompt) llmPrompts++
      return m
    }),
    reasoning: { ...skeleton.reasoning },
    draftedBy: 'llm',
  }
  // 模型零贡献（如 {"shots": []} 或全部 prompt 为空/超限被回退）→ 不算模型起草
  if (llmPrompts === 0) return skeleton
  const reasoningRaw = parsed.reasoning && typeof parsed.reasoning === 'object' && !Array.isArray(parsed.reasoning)
    ? (parsed.reasoning as Record<string, unknown>)
    : {}
  for (const field of preset.planFields) {
    const v = reasoningRaw[field]
    if (typeof v === 'string' && v.trim()) merged.reasoning[field] = cap(v.trim(), 500)
  }
  // 硬校验：模型起草的方案必须过同一套规则闸门，不过就整份回退
  const check = staticCheck(preset, merged, opts)
  merged.selfCheck = check
  if (!check.passed) return skeleton
  return merged
}

/**
 * image/score 钩子的真实评审：让模型按 rubric 挑毛病。
 * 顾问性质 —— 只往 selfCheck.llmReview 里写 {score, issues}，绝不动 score/passed/failures/veto，
 * 冻结契约（SPEC §0.4）的判定仍然确定。
 */
export async function reviewPlanWithLlm(ctx: Context, plan: CreativePlan): Promise<void> {
  const llm = llmFrom(ctx)
  if (!llm || !plan || !Array.isArray(plan.shots)) return
  const preset = (ctx as Context & { imageSkills?: { get?: (id: string) => LoadedSkill | undefined } }).imageSkills?.get?.(plan.skillId)?.preset
  const rubric = preset?.scoring?.rubric?.map((r) => `${r.item}（满分 ${r.max}）`).join('；') || '方案与 brief 的贴合度'
  const threshold = preset?.scoring?.threshold ?? 85
  const summary = plan.shots.map((s, i) => `shot-${i + 1}: ${String(s.prompt).slice(0, 300)}`).join('\n')
  const text = await chatText(llm, [
    {
      role: 'system',
      content: '你是严格的图像方案评审。只输出 JSON：{"score": 0到100的整数, "issues": ["具体毛病，中文，每条一句"]}。没有毛病就给空数组。不要输出别的。',
    },
    {
      role: 'user',
      content: `评分维度：${rubric}。通过线 ${threshold} 分。\nbrief：${plan.brief ?? ''}\n${summary}`,
    },
  ])
  const parsed = text ? extractJson(text) : undefined
  if (!parsed) return
  const score = Number(parsed.score)
  if (!Number.isFinite(score)) return
  const issues = asStringArray(parsed.issues, 8, 200) ?? []
  plan.selfCheck = {
    ...plan.selfCheck,
    llmReview: { score: Math.max(0, Math.min(100, Math.round(score))), issues },
  }
}

/** 「增强提示词」真调模型改写；不可用/失败返回 ''，由调用方回退本地模板。 */
export async function enhancePromptWithLlm(ctx: Context, prompt: string): Promise<string> {
  const llm = llmFrom(ctx)
  const text = prompt.trim()
  if (!llm || !text) return ''
  const out = await chatText(llm, [
    {
      role: 'system',
      content:
        '你是 AI 图像提示词专家。把用户的简短想法扩写成一段高质量英文图像提示词：主体与动作一句话说清；写明景别/机位/焦距；单一主光源与方向；布料/皮肤/表面的材质感；避免空洞的美学形容词（cinematic、masterpiece、beautiful 等）。只输出提示词本身，不要解释，不要 markdown。',
    },
    { role: 'user', content: text },
  ])
  if (!out) return ''
  // 防御：模型偶尔带回围栏或引号，剥掉
  return out.replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').replace(/^["']|["']$/g, '').trim()
}
