/**
 * Official DSH bundle entry.
 *
 * `dsh plugin add ./` + cordis.patch.yml name: dsh-imagestudio resolves here.
 * `dsh web --patch examples/dsh-web.patch.yml` can also point at this file.
 *
 * Host already provides `tools`, `llm`, `jobs`. This composer mounts the
 * image-studio graph in inject order so image-tools reaches ACTIVE.
 */
import { fileURLToPath } from 'node:url'
import { dirname, isAbsolute, join } from 'node:path'
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
// systemPrompt is optional: apply() guards the access and only registers the
// section when the host provides the service.
export const inject = { tools: { required: true }, systemPrompt: { required: false } }

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
  keepLastTasks: Schema.number().default(0),
  openai: Schema.object({
    enabled: Schema.boolean().default(false),
    id: Schema.string().default('openai'),
    model: Schema.string().default('gpt-image-2'),
    videoModel: Schema.string(),
    editModel: Schema.string(),
    visionModel: Schema.string(),
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
    videoModel?: string
    editModel?: string
    visionModel?: string
    baseUrl?: string
    apiKeyEnv?: string
  }
}

const PLUGIN_ROOT = dirname(fileURLToPath(import.meta.url))

export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const workspaceRoot = config.workspaceRoot ?? process.cwd()
  const skillsDir = config.skillsDir
    ? isAbsolute(config.skillsDir)
      ? config.skillsDir
      : join(PLUGIN_ROOT, config.skillsDir)
    : join(PLUGIN_ROOT, 'skills')
  const enabled = config.enabledSkills ?? [
    'cinema-dna-21x9x3',
    'life-force-portrait',
    'photography-simulation',
    'movie-poster',
    'character-casting',
  ]

  await ctx.plugin(core)
  await ctx.plugin(compose)
  await ctx.plugin(guard) // 直通扩展点，无任何拦截规则（验收红线：无内容审查）
  await ctx.plugin(assets, {
    workspaceRoot,
    keepLastTasks: config.keepLastTasks ?? 0,
  })
  await ctx.plugin(skills, { dir: skillsDir, enabled })

  // Real channels register BEFORE mock: the registry's default provider is
  // whichever registers first, and a configured real channel must win over
  // the mock fallback — otherwise every generate silently returns mock art.
  if (config.openai?.enabled) {
    await ctx.plugin(openai, {
      providers: [
        {
          id: config.openai.id ?? 'openai',
          protocol: 'openai-image',
          model: config.openai.model ?? 'gpt-image-2',
          ...(config.openai.videoModel ? { videoModel: config.openai.videoModel } : {}),
          ...(config.openai.editModel ? { editModel: config.openai.editModel } : {}),
          ...(config.openai.visionModel ? { visionModel: config.openai.visionModel } : {}),
          baseUrl: config.openai.baseUrl,
          apiKeyEnv: config.openai.apiKeyEnv ?? 'IMAGE_STUDIO_KEY',
        },
      ],
    })
  }

  await ctx.plugin(mock)

  await ctx.plugin(tools)
  await ctx.plugin(ui)

  const section = (ctx as Context & {
    systemPrompt?: { section: (opts: { name: string; order: number; text: string }) => unknown }
  }).systemPrompt
  if (section && typeof section.section === 'function') {
    ctx.effect(
      () =>
        section.section({
          name: 'image-studio',
          order: 150,
          text: [
            'Image Studio (技能台) is installed alongside any existing dsh-imagegen plugin.',
            'Do not steal dsh-imagegen: it owns the sidebar 「生图 / AI 生图」 panel and the tools generate_image / edit_image / get_image_generation_task / cancel_image_generation_task.',
            'This plugin never registers generate_image, edit_image, or image_generate (the last name collides with the host registry and would crash the whole plugin tree). Use dsh-imagegen for ordinary text-to-image.',
            'Use Image Studio tools only for FANTASY skill workflows or when the user opens /imagestudio or asks for 技能台 / cinema-dna / 三联:',
            '- istudio_skill_plan: compile a cinema-dna / life-force brief into a CreativePlan (no images).',
            '- istudio_generate: text-to-image; pass planId from istudio_skill_plan when available.',
            '- istudio_edit: identity-preserving image-to-image (life-force MODE A).',
            '- istudio_describe: reverse-prompt / abstract analysis only.',
            '- istudio_compose: vertical triptych join or exact text overlay. Never ask the image model to draw three panels.',
            '- istudio_assets: list artifacts under .dsh/image-studio/.',
            'Hard constraints: cinema-dna locks 21:9; poster mode is 3:4 and only when the user asks for 海报/封面/片名; self-check score is advisory only; never refuse to generate because of score or style words like CG.',
          ].join('\n'),
        }),
      'image-studio:systemPrompt',
    )
  }
}

export default { name, inject, Config, apply }
