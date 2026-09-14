export * from './yaml.ts'
export * from './schema.ts'
export * from './load.ts'
export * from './compile.ts'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { loadSkills, type LoadedSkill } from './load.ts'
import { compilePlanWithLlm, reviewPlanWithLlm, enhancePromptWithLlm } from './llm.ts'
import { ToolArgsError } from '../../core/src/errors.ts'
import type { CreativePlan } from '../../core/src/types.ts'

export const name = 'image-skills'
export const inject = ['llm']

export const Config = Schema.object({
  dir: Schema.string().default('./skills'),
  enabled: Schema.array(Schema.string()),
})

/** Structural subset of dsh `SkillRegistry` — optional host service, never injected. */
export interface ChatSkillRegistration {
  name: string
  description: string
  content: string
  invocation?: { modelInvocable?: boolean; userInvocable?: boolean }
}

export interface ChatSkillRegistry {
  register(skill: ChatSkillRegistration): unknown
}

/** Probe the optional dsh SkillRegistry without declaring a hard inject dependency. */
export function probeChatSkillRegistry(ctx: Context): ChatSkillRegistry | undefined {
  const get = (ctx as Context & { get?: (name: string, strict?: boolean) => unknown }).get
  const registry = typeof get === 'function' ? get.call(ctx, 'skills', false) : undefined
  if (
    registry &&
    typeof (registry as ChatSkillRegistry).register === 'function'
  ) {
    return registry as ChatSkillRegistry
  }
  return undefined
}

/**
 * Register each enabled skill's chat.md into the dsh SkillRegistry so the chat
 * model can auto-match creative intents (model path via <available_skills> +
 * the `skill` loader tool; user path via the /skill-name gesture).
 * Registration is wrapped in ctx.effect so disposal unwinds it.
 */
export async function registerChatSkills(
  ctx: Context,
  registry: ChatSkillRegistry,
  loaded: LoadedSkill[],
): Promise<string[]> {
  const registered: string[] = []
  for (const skill of loaded) {
    const content = await readFile(join(skill.dir, 'chat.md'), 'utf8').catch(() => undefined)
    if (!content?.trim()) {
      console.warn(`[image-skills] skill "${skill.dirName}" has no chat.md in ${skill.dir}; skipped chat registration`)
      continue
    }
    const { preset } = skill
    const description = `${preset.title ?? preset.id}——触发：${preset.triggers.slice(0, 3).join('、')}等`
    ctx.effect(
      () => {
        const dispose = registry.register({
          name: preset.id,
          description,
          content,
          invocation: { modelInvocable: true, userInvocable: true },
        })
        return typeof dispose === 'function' ? (dispose as () => void) : () => {}
      },
      `image-skills:register:${preset.id}`,
    )
    registered.push(preset.id)
  }
  return registered
}

export async function apply(
  ctx: Context,
  config: { dir?: string; enabled?: string[] } = {},
): Promise<void> {
  const loaded = await loadSkills(config.dir ?? './skills', config.enabled)
  const plans = new Map<string, CreativePlan>()
  ctx.provide('imageSkills', {
    list: () => loaded,
    get: (id: string) => loaded.find((s) => s.preset.id === id),
    async compile(
      skillId: string,
      brief: string,
      opts?: { wantPoster?: boolean; mode?: string; characters?: CreativePlan['characters'] },
    ) {
      const skill = loaded.find((s) => s.preset.id === skillId)
      if (!skill) throw new ToolArgsError('INVALID_ARGS', `unknown skillId ${skillId}`)
      // inject = ['llm'] 是真接线：有模型就模型起草（仍过 staticCheck），没有就规则兜底
      return compilePlanWithLlm(ctx, skill, brief, opts)
    },
    enhance: (prompt: string) => enhancePromptWithLlm(ctx, prompt),
    plans,
  })

  // image/score 钩子的真实监听者：让 dsh 模型按 rubric 评审方案。
  // 只写 selfCheck.llmReview（顾问），return undefined 不 bail —— 闸门判定仍由
  // staticCheck 决定，宿主若注册了更强的评分器仍可接管（serial 先到先得）。
  ctx.on('image/score', async (plan: CreativePlan) => {
    try {
      await reviewPlanWithLlm(ctx, plan)
    } catch (err) {
      console.warn('[image-skills] llm review skipped:', err instanceof Error ? err.message : err)
    }
    return undefined
  })

  // Optional integration: dsh hosts provide ctx.skills (SkillRegistry); other
  // hosts (tests, standalone studio) may not — the plugin must still work.
  const chatSkills = probeChatSkillRegistry(ctx)
  if (chatSkills) {
    await registerChatSkills(ctx, chatSkills, loaded)
  }
}
