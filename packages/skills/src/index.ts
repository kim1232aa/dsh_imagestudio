export * from './yaml.ts'
export * from './schema.ts'
export * from './load.ts'
export * from './compile.ts'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { loadSkills, type LoadedSkill } from './load.ts'
import { compilePlan } from './compile.ts'
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
    compile(
      skillId: string,
      brief: string,
      opts?: { wantPoster?: boolean; mode?: string; characters?: CreativePlan['characters'] },
    ) {
      const skill = loaded.find((s) => s.preset.id === skillId)
      if (!skill) throw new ToolArgsError('INVALID_ARGS', `unknown skillId ${skillId}`)
      return compilePlan(skill, brief, opts)
    },
    plans,
  })

  // Optional integration: dsh hosts provide ctx.skills (SkillRegistry); other
  // hosts (tests, standalone studio) may not — the plugin must still work.
  const chatSkills = probeChatSkillRegistry(ctx)
  if (chatSkills) {
    await registerChatSkills(ctx, chatSkills, loaded)
  }
}
