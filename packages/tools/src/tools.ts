import { randomUUID } from 'node:crypto'
import type { AssetRef, CreativePlan, ImageRequest } from '../../core/src/types.ts'
import { ToolArgsError } from '../../core/src/errors.ts'
import { createPipeline, installBuiltinHooks, runGenerate, type Pipeline } from '../../core/src/pipeline.ts'
import { compilePlan, loadSkills, type LoadedSkill } from '../../skills/src/index.ts'
import { AssetStore } from '../../assets/src/store.ts'
import { composeTriptych, overlayTitle, readEmbeddedTitle, encodePng, decodePng } from '../../compose/src/index.ts'
import { scanRequest } from '../../guard/src/index.ts'

export const TOOL_NAMES = [
  'image_skill_plan',
  'image_generate',
  'image_edit',
  'image_describe',
  'image_compose',
  'image_assets',
] as const

export interface Studio {
  pipeline: Pipeline
  skills: LoadedSkill[]
  store: AssetStore
  sessionId: string
}

export async function createStudio(opts: {
  workspaceRoot: string
  skillsDir: string
  enabled?: string[]
}): Promise<Studio> {
  const pipeline = createPipeline()
  installBuiltinHooks(pipeline)
  pipeline.bus.on('image/guard', (req: ImageRequest) => scanRequest(req))
  const skills = await loadSkills(opts.skillsDir, opts.enabled)
  const store = new AssetStore({ workspaceRoot: opts.workspaceRoot })
  return { pipeline, skills, store, sessionId: 'local' }
}

export async function imageSkillPlan(
  studio: Studio,
  args: { skillId: string; brief: string; wantPoster?: boolean; mode?: string; characters?: CreativePlan['characters'] },
): Promise<{ planId: string; plan: CreativePlan } | { passed: false; score: number; failures: string[] }> {
  const skill = studio.skills.find((s) => s.preset.id === args.skillId)
  if (!skill) throw new ToolArgsError('INVALID_ARGS', `unknown skillId ${args.skillId}`)
  const plan = compilePlan(skill, args.brief, {
    wantPoster: args.wantPoster,
    mode: args.mode,
    characters: args.characters,
  })
  const score = await studio.pipeline.bus.serial<CreativePlan, CreativePlan['selfCheck']>('image/score', plan)
  if (score) plan.selfCheck = score
  if (!plan.selfCheck.passed) {
    return { passed: false, score: plan.selfCheck.score, failures: plan.selfCheck.failures }
  }
  studio.pipeline.plans.set(plan.id, plan)
  await studio.store.writePlan(studio.sessionId, plan.id, plan)
  return { planId: plan.id, plan }
}

export async function imageGenerate(
  studio: Studio,
  args: {
    prompt?: string
    planId?: string
    shotId?: string
    aspectRatio?: string
    n?: number
    providerId?: string
    seed?: number
    refImages?: AssetRef[]
    refUsage?: ImageRequest['refUsage']
  },
  exec?: { signal?: AbortSignal },
): Promise<unknown> {
  if (args.n !== undefined && (typeof args.n !== 'number' || Number.isNaN(args.n))) {
    throw new ToolArgsError('INVALID_ARGS', 'n must be a number')
  }
  if ((args.n ?? 1) > 4) throw new ToolArgsError('INVALID_ARGS', 'n must be 1-4')
  const plan = args.planId ? studio.pipeline.plans.get(args.planId) : undefined
  if (args.planId && !plan) throw new ToolArgsError('INVALID_ARGS', `unknown planId ${args.planId}`)
  const shot = plan && args.shotId ? plan.shots.find((s) => s.id === args.shotId) : plan?.shots[0]
  const req: ImageRequest = {
    prompt: shot?.prompt ?? args.prompt ?? '',
    negative: shot?.negative,
    aspectRatio: shot?.aspectRatio ?? args.aspectRatio ?? '1:1',
    n: args.n ?? 1,
    refImages: args.refImages,
    refUsage: plan?.constraints.referenceImages.usage ?? args.refUsage ?? 'analysis-only',
    seed: args.seed,
    plan,
    shotId: args.shotId,
  }
  if (!req.prompt) throw new ToolArgsError('INVALID_ARGS', 'prompt or planId required')
  const taskId = randomUUID()
  const out = await runGenerate(studio.pipeline, req, { providerId: args.providerId, signal: exec?.signal })
  if ('blocked' in out || 'passed' in out) return out
  const images: AssetRef[] = []
  for (let i = 0; i < out.images.length; i++) {
    const img = out.images[i] as AssetRef & { bytes?: Uint8Array }
    const bytes = img.bytes ?? new Uint8Array()
    const name = shot?.id ? `${shot.id}.png` : `shot-${i + 1}.png`
    if (bytes.length) {
      images.push(await studio.store.writeImage(studio.sessionId, taskId, name, bytes, img))
    } else {
      images.push({ ...img, path: img.path })
    }
  }
  await studio.store.writeRequest(studio.sessionId, taskId, req)
  return { taskId, images, notes: out.notes ?? [] }
}

export async function imageEdit(
  studio: Studio,
  args: { prompt: string; assets: string[]; n?: number },
  exec?: { signal?: AbortSignal },
): Promise<unknown> {
  return imageGenerate(
    studio,
    {
      prompt: args.prompt,
      n: args.n ?? 1,
      refImages: args.assets.map((path) => ({ path, width: 0, height: 0, mime: 'image/png', sha256: '' })),
      refUsage: 'image-to-image',
    },
    exec,
  )
}

export async function imageDescribe(studio: Studio, args: { assets: string[]; instruction?: string }): Promise<{ text: string }> {
  const refs = args.assets.map((path) => ({ path, width: 0, height: 0, mime: 'image/png', sha256: '' }))
  const text = await studio.pipeline.registry.describe(refs, args.instruction)
  return { text }
}

export async function imageCompose(
  studio: Studio,
  args: { mode: 'triptych' | 'text-overlay'; assets: string[]; gap?: number; ratio?: string; title?: string },
): Promise<{ path: string; title?: string }> {
  const taskId = randomUUID()
  if (args.mode === 'triptych') {
    const buffers = await Promise.all(args.assets.map((p) => loadBytes(studio, p)))
    const result = composeTriptych(buffers, { gapPx: args.gap, ratios: args.ratio })
    const ref = await studio.store.writeImage(studio.sessionId, taskId, 'triptych.png', result.png, {
      width: result.width,
      height: result.height,
    })
    return { path: ref.path }
  }
  const [first] = args.assets
  const buf = await loadBytes(studio, first)
  const stamped = overlayTitle(buf, args.title ?? '')
  const ref = await studio.store.writeImage(studio.sessionId, taskId, 'poster.png', stamped.png, {
    width: stamped.width,
    height: stamped.height,
  })
  return { path: ref.path, title: readEmbeddedTitle(stamped.png) }
}

export async function imageAssets(studio: Studio): Promise<{ index: Record<string, string[]> }> {
  return { index: await studio.store.readIndex() }
}

async function loadBytes(studio: Studio, rel: string): Promise<Uint8Array> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const abs = join(studio.store.root, rel)
  return readFile(abs)
}

export { encodePng, decodePng }
