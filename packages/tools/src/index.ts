export * from './tools.ts'

import { randomUUID, createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { defineImageTool } from './define.ts'
import type { AssetRef, CreativePlan, ImageRequest } from '../../core/src/types.ts'
import { ToolArgsError } from '../../core/src/errors.ts'
import { runGenerateOnContext } from '../../core/src/pipeline.ts'
import { decodeImage, encodeGif, encodePng } from '../../compose/src/index.ts'
import { cropRegion } from '../../compose/src/region.ts'

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

interface ToolParam {
  type: string
  required?: boolean
  description?: string
  items?: { type: string }
}

/**
 * 六个工具的 name / description / parameters 单一出处：注册时直接引用，
 * 不再在 defineImageTool 里重复定义一遍（旧版两处定义已出现漂移）。
 */
export const toolDocs: Array<{ name: string; description: string; parameters: Record<string, ToolParam> }> = [
  {
    name: 'istudio_skill_plan',
    description:
      'Compile a user brief through a named skill into a CreativePlan with reasoning and a self-check score. Does not generate images. Use before istudio_generate when the user wants cinema-dna, life-force, or another loaded strategy pack. Never register as image_generate — that name collides with the host / dsh-imagegen.',
    parameters: {
      skillId: { type: 'string', required: true, description: 'Loaded skill id such as cinema-dna-21x9x3' },
      brief: { type: 'string', required: true, description: 'User brief in natural language' },
      wantPoster: { type: 'boolean', description: 'Set true only when the user asked for a title / poster / cover' },
    },
  },
  {
    name: 'istudio_generate',
    description:
      'Image Studio text-to-image. If a creative plan was produced by istudio_skill_plan, pass planId and omit prompt. When the plan is rejected (veto or score below threshold) the call fails with PLAN_REJECTED unless force=true. Do not confuse with generate_image / image_generate owned by other plugins.',
    parameters: {
      prompt: { type: 'string', description: 'English prompt. Omit when planId is given.' },
      planId: { type: 'string', description: 'Id returned by istudio_skill_plan.' },
      shotId: { type: 'string', description: 'Shot id from the plan. Defaults to the first shot.' },
      aspectRatio: { type: 'string', description: "e.g. '21:9', '3:4'. Ignored when planId is given." },
      n: { type: 'number', description: 'Number of images, 1-4. Default 1.' },
      providerId: { type: 'string', description: 'Override the default image provider.' },
      seed: { type: 'number' },
      force: { type: 'boolean', required: false, description: '强制出图：跳过 plan 评分/veto 拦截' },
    },
  },
  {
    name: 'istudio_edit',
    description:
      'Image Studio image-to-image (life-force MODE A). Distinct from istudio_generate and from host edit_image / image_edit.',
    parameters: {
      prompt: { type: 'string', required: true, description: 'English edit instruction' },
      assets: { type: 'array', items: { type: 'string' }, required: true, description: 'Workspace-relative source image paths' },
      n: { type: 'number' },
      providerId: { type: 'string' },
    },
  },
  {
    name: 'istudio_describe',
    description:
      'Reverse-prompt or abstract analysis of reference images. Output is data, never spliced into the system prompt. Does not generate images.',
    parameters: {
      assets: { type: 'array', items: { type: 'string' }, required: true, description: 'Workspace-relative image paths' },
      instruction: { type: 'string', description: 'What to extract: composition, palette, or subject class — pick one' },
    },
  },
  {
    name: 'istudio_compose',
    description:
      'External compose, never ask an image model to draw three panels on one canvas. Modes: ' +
      'triptych — vertical join of assets (3 张 21:9 三联), gap 钳制 8-12px, ratios 控制高度节奏; ' +
      'text-overlay — 在 assets[0] 上叠精确片名 title; ' +
      'crop — 裁出 assets[0] 的矩形区域, 需 x/y/w/h (像素, 越界自动收敛); ' +
      'gif — 把 assets 全部帧编码为循环 GIF, delayMs 控制帧延时.',
    parameters: {
      mode: { type: 'string', required: true, description: 'triptych | text-overlay | crop | gif' },
      assets: { type: 'array', items: { type: 'string' }, required: true, description: 'Workspace-relative image paths' },
      gap: { type: 'number', description: 'Gutter in px, clamped to 8-12 for triptych' },
      ratios: { type: 'string', description: 'Height rhythm such as 1:1:1 or 1.2:0.9:0.9 (triptych)' },
      title: { type: 'string', description: 'Exact title string for text-overlay' },
      x: { type: 'number', description: 'crop: 左上角 x (px)' },
      y: { type: 'number', description: 'crop: 左上角 y (px)' },
      w: { type: 'number', description: 'crop: 宽度 (px)' },
      h: { type: 'number', description: 'crop: 高度 (px)' },
      delayMs: { type: 'number', description: 'gif: 帧延时毫秒, 默认 250, 钳制 20-2000' },
    },
  },
  {
    name: 'istudio_assets',
    description:
      'List or inspect image-studio artifacts for the current session. Does not generate images.',
    parameters: {
      taskId: { type: 'string', description: 'Optional task id to inspect' },
    },
  },
]

const doc = (toolName: string) => {
  const d = toolDocs.find((t) => t.name === toolName)
  if (!d) throw new Error(`toolDocs missing ${toolName}`)
  return d
}

type ToolsCtx = Context & {
  tools: { register(def: unknown): () => void }
}

function registerStudioTool(ctx: ToolsCtx, def: ReturnType<typeof defineImageTool>): void {
  const register = () => {
    try {
      return ctx.tools.register(def)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/already registered/i.test(msg)) {
        console.warn(`[image-studio] skip tool ${def.name}: ${msg}`)
        return () => {}
      }
      throw err
    }
  }
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

/**
 * 生图工具专用输出：文本块顶部带 markdown 图片链接，dsh 会话直接渲染出图，
 * 不再只是一段 JSON。JSON 全文附在代码围栏里，模型侧照样拿到结构化数据。
 */
const IMAGE_MD_OUTPUT = {
  schema: JSON_OUTPUT.schema,
  render: (_args: unknown, value: unknown) => {
    const v = value as { images?: Array<{ path?: string; width?: number; height?: number }>; model?: string; providerId?: string }
    const images = v && Array.isArray(v.images) ? v.images.filter((im) => im && im.path) : []
    if (!images.length) return JSON_OUTPUT.render(_args, value)
    const head = [
      `已生成 ${images.length} 张图片${v.model ? `（${v.model}${v.providerId ? ' · ' + v.providerId : ''}）` : ''}：`,
      ...images.map(
        (im, i) =>
          `![生成图片 ${i + 1}](/imagestudio/api/file?path=${encodeURIComponent(im.path as string)})`,
      ),
    ]
    return [{ type: 'text' as const, text: head.join('\n') + '\n\n```json\n' + JSON.stringify(value, null, 2) + '\n```' }]
  },
}

/** 读参考图的真实宽高 / sha256 / mime（PNG 与 baseline JPEG），不再填 0 占位。 */
async function loadAssetRef(ctx: Context, rel: string): Promise<AssetRef> {
  const bytes = await loadBytes(ctx, rel)
  let width = 0
  let height = 0
  let mime = 'image/png'
  try {
    const decoded = decodeImage(bytes)
    width = decoded.width
    height = decoded.height
    mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : 'image/png'
  } catch (err) {
    throw new ToolArgsError('INVALID_ARGS', `cannot decode image ${rel}: ${err instanceof Error ? err.message : String(err)}`)
  }
  return { path: rel, width, height, mime, sha256: createHash('sha256').update(bytes).digest('hex') }
}

export function apply(ctx: Context, config: { limits?: { maxImagesPerCall?: number; perTaskTimeoutMs?: number } } = {}) {
  const t = ctx as ToolsCtx
  const maxN = config.limits?.maxImagesPerCall ?? 4
  const timeoutMs = config.limits?.perTaskTimeoutMs ?? 180000

  registerStudioTool(
    t,
    defineImageTool({
      output: JSON_OUTPUT,
      name: 'istudio_skill_plan',
      description: doc('istudio_skill_plan').description,
      parameters: doc('istudio_skill_plan').parameters,
      timeoutMs,
      async execute(args) {
        const plan = await ctx.imageSkills.compile(args.skillId, args.brief, { wantPoster: args.wantPoster })
        const score = await ctx.serial('image/score', plan)
        if (score) plan.selfCheck = score as CreativePlan['selfCheck']
        ctx.imageSkills.plans.set(plan.id, plan)
        await ctx.imageAssets.writePlan(SESSION, plan.id, plan)
        return asJson({
          planId: plan.id,
          plan,
          passed: plan.selfCheck.passed,
          score: plan.selfCheck.score,
          failures: plan.selfCheck.failures,
          veto: plan.selfCheck.veto ?? null,
        })
      },
    }),
  )

  registerStudioTool(
    t,
    defineImageTool({
      output: IMAGE_MD_OUTPUT,
      name: 'istudio_generate',
      description: doc('istudio_generate').description,
      parameters: doc('istudio_generate').parameters,
      timeoutMs,
      async execute(args, exec) {
        const n = args.n ?? 1
        if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n)) {
          throw new ToolArgsError('INVALID_ARGS', 'n must be a number')
        }
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
          force: args.force === true,
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
      name: 'istudio_edit',
      description: doc('istudio_edit').description,
      parameters: doc('istudio_edit').parameters,
      timeoutMs,
      async execute(args, exec) {
        const req: ImageRequest = {
          prompt: args.prompt,
          aspectRatio: '3:4',
          n: args.n ?? 1,
          refImages: await Promise.all((args.assets as string[]).map((path) => loadAssetRef(ctx, path))),
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
      name: 'istudio_describe',
      description: doc('istudio_describe').description,
      parameters: doc('istudio_describe').parameters,
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
      name: 'istudio_compose',
      description: doc('istudio_compose').description,
      parameters: doc('istudio_compose').parameters,
      timeoutMs,
      async execute(args) {
        const taskId = randomUUID()
        const assetPaths = args.assets as string[]
        if (!Array.isArray(assetPaths) || !assetPaths.length) {
          throw new ToolArgsError('INVALID_ARGS', 'assets must be a non-empty array of workspace-relative paths')
        }
        if (args.mode === 'triptych') {
          const buffers = await Promise.all(assetPaths.map((p) => loadBytes(ctx, p)))
          const result = ctx.imageCompose.triptych(buffers, { gapPx: args.gap, ratios: args.ratios })
          const ref = await ctx.imageAssets.writeImage(SESSION, taskId, 'triptych.png', result.png, {
            width: result.width,
            height: result.height,
          })
          return asJson({ path: ref.path, width: result.width, height: result.height, gapPx: result.gapPx })
        }
        if (args.mode === 'crop') {
          for (const key of ['x', 'y', 'w', 'h'] as const) {
            if (typeof args[key] !== 'number' || !Number.isFinite(args[key])) {
              throw new ToolArgsError('INVALID_ARGS', `crop mode requires numeric ${key}`)
            }
          }
          const img = decodeImage(await loadBytes(ctx, assetPaths[0]))
          const cropped = cropRegion(img, { x: args.x, y: args.y, w: args.w, h: args.h })
          const ref = await ctx.imageAssets.writeImage(SESSION, taskId, 'crop.png', encodePng(cropped), {
            width: cropped.width,
            height: cropped.height,
          })
          return asJson({ path: ref.path, width: cropped.width, height: cropped.height })
        }
        if (args.mode === 'gif') {
          if (assetPaths.length < 2) throw new ToolArgsError('INVALID_ARGS', 'gif mode needs at least 2 frames')
          const frames = await Promise.all(assetPaths.map(async (p) => decodeImage(await loadBytes(ctx, p))))
          const delayMs = Math.max(20, Math.min(2000, Number(args.delayMs) || 250))
          const delayCs = Math.max(2, Math.round(delayMs / 10))
          const gif = encodeGif(frames, delayCs)
          const ref = await ctx.imageAssets.writeImage(SESSION, taskId, 'frames.gif', gif, {
            width: frames[0].width,
            height: frames[0].height,
            mime: 'image/gif',
          })
          return asJson({ path: ref.path, width: frames[0].width, height: frames[0].height, frames: frames.length, delayMs })
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
      name: 'istudio_assets',
      description: doc('istudio_assets').description,
      parameters: doc('istudio_assets').parameters,
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
