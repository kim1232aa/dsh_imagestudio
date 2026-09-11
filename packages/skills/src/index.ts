export * from './yaml.ts'
export * from './schema.ts'
export * from './load.ts'
export * from './compile.ts'

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { loadSkills } from './load.ts'
import { compilePlan } from './compile.ts'
import { ToolArgsError } from '../../core/src/errors.ts'
import type { CreativePlan } from '../../core/src/types.ts'

export const name = 'image-skills'
export const inject = ['llm']

export const Config = Schema.object({
  dir: Schema.string().default('./skills'),
  enabled: Schema.array(Schema.string()),
})

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
}
