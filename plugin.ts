/**
 * Official DSH bundle entry.
 *
 * `dsh plugin add ./` + cordis.patch.yml name: dsh-imagestudio resolves here.
 * `dsh web --patch examples/dsh-web.patch.yml` can also point at this file.
 *
 * Host already provides `tools`, `llm`, `jobs`. This composer mounts the
 * image-studio graph in inject order so image-tools reaches ACTIVE.
 */
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import * as core from './packages/core/src/index.ts'
import * as compose from './packages/compose/src/index.ts'
import * as guard from './packages/guard/src/index.ts'
import * as assets from './packages/assets/src/index.ts'
import * as skills from './packages/skills/src/index.ts'
import * as mock from './packages/provider-mock/src/index.ts'
import * as openai from './packages/provider-openai/src/index.ts'
import * as tools from './packages/tools/src/index.ts'
import * as ui from './packages/ui/src/index.ts'

export const name = 'image-studio'
export const inject = ['tools']

export const Config = Schema.object({
  workspaceRoot: Schema.string().default('.'),
  skillsDir: Schema.string().default('./skills'),
  enabledSkills: Schema.array(Schema.string()).default([
    'cinema-dna-21x9x3',
    'life-force-portrait',
    'photography-simulation',
    'movie-poster',
    'character-casting',
  ] as never),
  keepLastTasks: Schema.number().default(50),
  openai: Schema.object({
    enabled: Schema.boolean().default(false),
    id: Schema.string().default('openai'),
    model: Schema.string().default('gpt-image-2'),
    baseUrl: Schema.string(),
    apiKeyEnv: Schema.string().role('secret').default('IMAGE_STUDIO_KEY'),
  }).default({ enabled: false } as never),
})

export type Config = {
  workspaceRoot?: string
  skillsDir?: string
  enabledSkills?: string[]
  keepLastTasks?: number
  openai?: {
    enabled?: boolean
    id?: string
    model?: string
    baseUrl?: string
    apiKeyEnv?: string
  }
}

export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const workspaceRoot = config.workspaceRoot ?? process.cwd()
  const skillsDir = config.skillsDir ?? './skills'
  const enabled = config.enabledSkills ?? [
    'cinema-dna-21x9x3',
    'life-force-portrait',
    'photography-simulation',
    'movie-poster',
    'character-casting',
  ]

  await ctx.plugin(core)
  await ctx.plugin(compose)
  await ctx.plugin(guard)
  await ctx.plugin(assets, {
    workspaceRoot,
    keepLastTasks: config.keepLastTasks ?? 50,
  })
  await ctx.plugin(skills, { dir: skillsDir, enabled })
  await ctx.plugin(mock)

  if (config.openai?.enabled) {
    await ctx.plugin(openai, {
      providers: [
        {
          id: config.openai.id ?? 'openai',
          protocol: 'openai-image',
          model: config.openai.model ?? 'gpt-image-2',
          baseUrl: config.openai.baseUrl,
          apiKeyEnv: config.openai.apiKeyEnv ?? 'IMAGE_STUDIO_KEY',
        },
      ],
    })
  }

  await ctx.plugin(tools)
  await ctx.plugin(ui)

  const section = (ctx as Context & {
    systemPrompt?: { section: (opts: { name: string; content: string }) => unknown }
  }).systemPrompt
  if (section && typeof section.section === 'function') {
    ctx.effect(
      () =>
        section.section({
          name: 'image-studio',
          content: [
            'Image Studio tools are available:',
            '- image_skill_plan: compile a cinema-dna / life-force brief into a CreativePlan (no images).',
            '- image_generate: text-to-image; pass planId from image_skill_plan when available.',
            '- image_edit: identity-preserving image-to-image (life-force MODE A).',
            '- image_describe: reverse-prompt / abstract analysis only.',
            '- image_compose: vertical triptych join or exact text overlay. Never ask the image model to draw three panels.',
            '- image_assets: list artifacts under .dsh/image-studio/.',
            'Hard constraints: cinema-dna locks 21:9; poster mode is 3:4 and only when the user asks for 海报/封面/片名; score < 82 does not generate.',
          ].join('\n'),
        }),
      'image-studio:systemPrompt',
    )
  }
}

export default { name, inject, Config, apply }
