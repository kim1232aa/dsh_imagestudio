export * from './tools.ts'

import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { defineImageTool } from './define.ts'
import type { AssetRef, CreativePlan, ImageRequest } from '../../core/src/types.ts'
import { ToolArgsError } from '../../core/src/errors.ts'
import { runGenerateOnContext } from '../../core/src/pipeline.ts'

export const name = 'image-tools'
export const inject = ['tools', 'imagegen', 'imageSkills', 'imageAssets', 'imageCompose']

export const Config = Schema.object({
  limits: Schema.object({
    concurrency: Schema.number().default(3),
    perTaskTimeoutMs: Schema.number().default(180000),
    maxImagesPerCall: Schema.number().default(4),
  }).default({ concurrency: 3, perTaskTimeoutMs: 180000, maxImagesPerCall: 4 } as never),
}).default({} as never)

const SESSION = 'preview'

function asJson(v: unknown): never {
  return JSON.parse(JSON.stringify(v)) as never
}

export const toolDocs = [
  {
    name: 'image_skill_plan',
    description:
      'Compile a user brief through a named skill into a CreativePlan with reasoning and a self-check score. Does not generate images. Use before image_generate when the user wants cinema-dna, life-force, or another loaded strategy pack.',
    parameters: {
      skillId: { type: 'string', required: true, description: 'Loaded skill id such as cinema-dna-21x9x3' },
      brief: { type: 'string', required: true, description: 'User brief in natural language' },
      wantPoster: { type: 'boolean', description: 'Set true only when the user asked for a title / poster / cover' },
    },
  },
  {
    name: 'image_generate',
    description:
      'Generate images from a text prompt. If a creative plan was produced by image_skill_plan, pass planId and omit prompt — the plan already carries per-shot prompts, aspect ratio and negative constraints.',
    parameters: {
      prompt: { type: 'string', description: 'English prompt. Omit when planId is given.' },
      planId: { type: 'string', description: 'Id returned by image_skill_plan.' },
      aspectRatio: { type: 'string', description: "e.g. '21:9', '3:4'. Ignored when planId is given." },
      n: { type: 'number', description: 'Number of images, 1-4. Default 1.' },
      providerId: { type: 'string', description: 'Override the default image provider.' },
      seed: { type: 'number' },
    },
  },
  {
    name: 'image_edit',
    description:
      'Image-to-image or local edit. Use for life-force MODE A identity-preserving upgrades. Distinct from image_generate (no source image) and image_describe (analysis only).',
    parameters: {
      prompt: { type: 'string', required: true, description: 'English edit instruction' },
      assets: { type: 'array', required: true, description: 'Workspace-relative source image paths' },
    },
  },
  {
    name: 'image_describe',
    description:
      'Reverse-prompt or abstract analysis of reference images. Output is data, never spliced into the system prompt. Does not generate images.',
    parameters: {
      assets: { type: 'array', required: true, description: 'Workspace-relative image paths' },
      instruction: { type: 'string', description: 'What to extract: composition, palette, or subject class — pick one' },
    },
  },
  {
    name: 'image_compose',
    description:
      'External compose: vertical triptych join, aspect crop, exact text overlay, GIF encode. Never ask an image model to draw three panels on one canvas.',
    parameters: {
      mode: { type: 'string', required: true, description: 'triptych | text-overlay | crop | gif' },
      assets: { type: 'array', required: true, description: 'Workspace-relative image paths' },
      gap: { type: 'number', description: 'Gutter in px, clamped to 8-12 for triptych' },
      ratios: { type: 'string', description: 'Height rhythm such as 1:1:1 or 1.2:0.9:0.9' },
      title: { type: 'string', description: 'Exact title string for text-overlay' },
    },
  },
  {
    name: 'image_assets',
    description:
      'List or inspect image-studio artifacts for the current session. Does not generate images.',
    parameters: {
      taskId: { type: 'string', description: 'Optional task id to inspect' },
    },
  },
]

type ToolsCtx = Context & {
  tools: { register(def: unknown): () => void }
}

function registerStudioTool(ctx: ToolsCtx, def: ReturnType<typeof defineImageTool>): void {
  const register = () => ctx.tools.register(def)
  if (typeof ctx.effect === 'function') {
    ctx.effect(register, `tool:${def.name}`)
  } else {
    register()
  }
}

const JSON_OUTPUT = {
  schema: { type: 'object' as const, additionalProperties: true },
  render: (_args: unknown, value: unknown) => [
    { type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) },
  ],
}

export function apply(ctx: Context, config: { limits?: { maxImagesPerCall?: number; perTaskTimeoutMs?: number } } = {}) {
  const t = ctx as ToolsCtx
  const maxN = config.limits?.maxImagesPerCall ?? 4
  const timeoutMs = config.limits?.perTaskTimeoutMs ?? 180000

  registerStudioTool(
    t,
    defineImageTool({
      output: JSON_OUTPUT,
      name: 'image_skill_plan',
      description: toolDocs[0].description,
      parameters: {
        skillId: { type: 'string', required: true, description: 'Loaded skill id such as cinema-dna-21x9x3' },
        brief: { type: 'string', required: true, description: 'User brief in natural language' },
        wantPoster: { type: 'boolean', description: 'Set true only when the user asked for a title / poster / cover' },
      },
      timeoutMs,
      async execute(args) {
        const plan = ctx.imageSkills.compile(args.skillId, args.brief, { wantPoster: args.wantPoster })
        const score = await ctx.serial('image/score', plan)
        if (score) plan.selfCheck = score as CreativePlan['selfCheck']
        if (!plan.selfCheck.passed) {
          return asJson({
            passed: false,
            score: plan.selfCheck.score,
            failures: plan.selfCheck.failures,
            veto: plan.selfCheck.veto ?? null,
            plan,
          })
        }
        ctx.imageSkills.plans.set(plan.id, plan)
        await ctx.imageAssets.writePlan(SESSION, plan.id, plan)
        return asJson({ planId: plan.id, plan, passed: true, score: plan.selfCheck.score })
      },
    }),
  )

  registerStudioTool(
    t,
    defineImageTool({
      output: JSON_OUTPUT,
      name: 'image_generate',
      description: toolDocs[1].description,
      parameters: {
        prompt: { type: 'string', description: 'English prompt. Omit when planId is given.' },
        planId: { type: 'string', description: 'Id returned by image_skill_plan.' },
        shotId: { type: 'string', description: 'Shot id from the plan. Defaults to the first shot.' },
        aspectRatio: { type: 'string', description: "e.g. '21:9', '3:4'. Ignored when planId is given." },
        n: { type: 'number', description: 'Number of images, 1-4. Default 1.' },
        providerId: { type: 'string', description: 'Override the default image provider.' },
        seed: { type: 'number' },
      },
      timeoutMs,
      async execute(args, exec) {
        const n = args.n ?? 1
        if (n < 1 || n > maxN) throw new ToolArgsError('INVALID_ARGS', `n must be 1-${maxN}`)
        const plan = args.planId ? ctx.imageSkills.plans.get(args.planId) : undefined
        if (args.planId && !plan) throw new ToolArgsError('INVALID_ARGS', `unknown planId ${args.planId}`)
        const shot = plan && args.shotId ? plan.shots.find((s) => s.id === args.shotId) : plan?.shots[0]
        const req: ImageRequest = {
          prompt: shot?.prompt ?? args.prompt ?? '',
          negative: shot?.negative,
          aspectRatio: shot?.aspectRatio ?? args.aspectRatio ?? '1:1',
          n,
          refUsage: plan?.constraints.referenceImages.usage ?? 'analysis-only',
          seed: args.seed,
          plan,
          shotId: args.shotId,
        }
        if (!req.prompt) throw new ToolArgsError('INVALID_ARGS', 'prompt or planId required')
        return asJson(await persistGenerate(ctx, req, { providerId: args.providerId, signal: exec.signal, timeoutMs }))
      },
    }),
  )

  registerStudioTool(
    t,
    defineImageTool({
      output: JSON_OUTPUT,
      name: 'image_edit',
      description: toolDocs[2].description,
      parameters: {
        prompt: { type: 'string', required: true, description: 'English edit instruction' },
        assets: { type: 'array', items: { type: 'string' }, required: true, description: 'Workspace-relative source image paths' },
        n: { type: 'number' },
        providerId: { type: 'string' },
      },
      timeoutMs,
      async execute(args, exec) {
        const req: ImageRequest = {
          prompt: args.prompt,
          aspectRatio: '3:4',
          n: args.n ?? 1,
          refImages: (args.assets as string[]).map((path) => ({ path, width: 0, height: 0, mime: 'image/png', sha256: '' })),
          refUsage: 'image-to-image',
        }
        return asJson(await persistGenerate(ctx, req, { providerId: args.providerId, signal: exec.signal, timeoutMs }))
      },
    }),
  )

  registerStudioTool(
    t,
    defineImageTool({
      output: JSON_OUTPUT,
      name: 'image_describe',
      description: toolDocs[3].description,
      parameters: {
        assets: { type: 'array', items: { type: 'string' }, required: true, description: 'Workspace-relative source image paths' },
        instruction: { type: 'string', description: 'What to extract: composition, palette, or subject class — pick one' },
      },
      timeoutMs,
      async execute(args) {
        const refs = (args.assets as string[]).map((path) => ({ path, width: 0, height: 0, mime: 'image/png', sha256: '' }))
        const text = await ctx.imagegen.describe(refs, args.instruction)
        return asJson({ text })
      },
    }),
  )

  registerStudioTool(
    t,
    defineImageTool({
      output: JSON_OUTPUT,
      name: 'image_compose',
      description: toolDocs[4].description,
      parameters: {
        mode: { type: 'string', required: true, description: 'triptych | text-overlay | crop | gif' },
        assets: { type: 'array', items: { type: 'string' }, required: true, description: 'Workspace-relative image paths' },
        gap: { type: 'number', description: 'Gutter in px, clamped to 8-12 for triptych' },
        ratios: { type: 'string', description: 'Height rhythm such as 1:1:1 or 1.2:0.9:0.9' },
        title: { type: 'string', description: 'Exact title string for text-overlay' },
      },
      timeoutMs,
      async execute(args) {
        const taskId = randomUUID()
        const assetPaths = args.assets as string[]
        if (args.mode === 'triptych') {
          const buffers = await Promise.all(assetPaths.map((p) => loadBytes(ctx, p)))
          const result = ctx.imageCompose.triptych(buffers, { gapPx: args.gap, ratios: args.ratios })
          const ref = await ctx.imageAssets.writeImage(SESSION, taskId, 'triptych.png', result.png, {
            width: result.width,
            height: result.height,
          })
          return asJson({ path: ref.path, width: result.width, height: result.height, gapPx: result.gapPx })
        }
        const buf = await loadBytes(ctx, assetPaths[0])
        const stamped = ctx.imageCompose.overlayTitle(buf, args.title ?? '')
        const ref = await ctx.imageAssets.writeImage(SESSION, taskId, 'poster.png', stamped.png, {
          width: stamped.width,
          height: stamped.height,
        })
        return asJson({ path: ref.path, title: ctx.imageCompose.readEmbeddedTitle(stamped.png) })
      },
    }),
  )

  registerStudioTool(
    t,
    defineImageTool({
      output: JSON_OUTPUT,
      name: 'image_assets',
      description: toolDocs[5].description,
      parameters: {
        taskId: { type: 'string', description: 'Optional task id to inspect' },
      },
      async execute() {
        return asJson({ index: await ctx.imageAssets.readIndex() })
      },
    }),
  )
}

async function persistGenerate(
  ctx: Context,
  req: ImageRequest,
  opts: { providerId?: string; signal?: AbortSignal; timeoutMs?: number },
) {
  const out = await runGenerateOnContext(ctx, req, opts)
  if ('blocked' in out || 'passed' in out) return out
  const taskId = randomUUID()
  const images: AssetRef[] = []
  for (let i = 0; i < out.images.length; i++) {
    const img = out.images[i] as AssetRef & { bytes?: Uint8Array }
    const bytes = img.bytes ?? new Uint8Array()
    const name = req.shotId ? `${req.shotId}.png` : `shot-${i + 1}.png`
    if (bytes.length) {
      images.push(await ctx.imageAssets.writeImage(SESSION, taskId, name, bytes, img))
    } else {
      images.push(img)
    }
  }
  await ctx.imageAssets.writeRequest(SESSION, taskId, req)
  return { taskId, images, notes: out.notes ?? [], providerId: out.providerId, model: out.model }
}

async function loadBytes(ctx: Context, rel: string): Promise<Uint8Array> {
  const abs = join(ctx.imageAssets.root, rel)
  return readFile(abs)
}
