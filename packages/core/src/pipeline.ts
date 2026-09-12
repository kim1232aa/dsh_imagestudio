import type { Context } from '@deepseek-ai/cordis'
import type { CreativePlan, GuardVerdict, ImageRequest, ImageResult } from './types.ts'
import { ImageEventBus } from './events.ts'
import { ImageGenRegistry } from './registry.ts'
import { ToolArgsError } from './errors.ts'

export interface Pipeline {
  bus: ImageEventBus
  registry: ImageGenRegistry
  plans: Map<string, CreativePlan>
  generateCalls: number
}

export function createPipeline(): Pipeline {
  return { bus: new ImageEventBus(), registry: new ImageGenRegistry(), plans: new Map(), generateCalls: 0 }
}

/** Mutates `req` in place: plan locks, analysis-only strip, character descriptor. */
export function applyBuiltinRequestHooks(req: ImageRequest): ImageRequest {
  if (req.plan) {
    const shot = req.shotId ? req.plan.shots.find((s) => s.id === req.shotId) : req.plan.shots[0]
    // 03 红线：skill 比例/负面词是默认建议，用户传入的优先，不锁死。
    if (shot) {
      if (!req.prompt) req.prompt = shot.prompt
      if (!req.aspectRatio) req.aspectRatio = shot.aspectRatio
      req.negative = mergeNegative(req.negative || shot.negative, req.plan.constraints.negativePatch)
    } else {
      req.negative = mergeNegative(req.negative, req.plan.constraints.negativePatch)
      if (!req.aspectRatio && req.plan.shots[0]) req.aspectRatio = req.plan.shots[0].aspectRatio
    }
    if (!req.refUsage) req.refUsage = req.plan.constraints.referenceImages.usage
  }
  if (req.refUsage === 'analysis-only' && req.refImages?.length) {
    req.refImages = undefined
  }
  if (req.plan?.characters?.length) {
    const d = req.plan.characters[0].descriptor
    if (!req.prompt.includes(d)) req.prompt = `${d}. ${req.prompt}`
  }
  return req
}

export function installBuiltinHooks(p: Pipeline): void {
  p.bus.on('image/before-request', async (req: ImageRequest, next: (r?: ImageRequest) => Promise<ImageRequest>) => {
    const nextReq = { ...req }
    applyBuiltinRequestHooks(nextReq)
    return next(nextReq)
  })
}

export async function runGenerate(
  p: Pipeline,
  req: ImageRequest,
  opts: { providerId?: string; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ blocked: true; reason: string } | { passed: false; score: number; failures: string[] } | ImageResult> {
  const guard = p.bus.bail<ImageRequest, GuardVerdict>('image/guard', req)
  if (guard?.blocked) return { blocked: true, reason: guard.reason }

  // 00 §六 / 02 §一：分数只展示，不拦出图。guard 仅保留宿主级硬拦截。
  const prepared = await p.bus.waterfall('image/before-request', req)
  return dispatchGenerate(p.registry, prepared, opts, () => {
    p.generateCalls++
  }, (a, b) => p.bus.parallel('image/after-result', a as never, b as never))
}

/** Cordis-mounted generate: uses ctx.bail / waterfall / parallel and ctx.imagegen. */
export async function runGenerateOnContext(
  ctx: Context,
  req: ImageRequest,
  opts: { providerId?: string; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ blocked: true; reason: string } | { passed: false; score: number; failures: string[] } | ImageResult> {
  const guard = ctx.bail('image/guard', req) as GuardVerdict | undefined
  if (guard?.blocked) return { blocked: true, reason: guard.reason }

  const prepared = (await ctx.waterfall('image/before-request', req, async () => req)) as ImageRequest
  return dispatchGenerate(ctx.imagegen, prepared, opts, undefined, (a, b) =>
    ctx.parallel('image/after-result', a, b),
  )
}

async function dispatchGenerate(
  registry: ImageGenRegistry,
  prepared: ImageRequest,
  opts: { providerId?: string; signal?: AbortSignal; timeoutMs?: number },
  onStart?: () => void,
  after?: (req: ImageRequest, result: ImageResult) => Promise<void>,
): Promise<{ blocked: true; reason: string } | { passed: false; score: number; failures: string[] } | ImageResult> {
  if (prepared.n < 1 || prepared.n > 4) {
    throw new ToolArgsError('INVALID_ARGS', `n must be 1-4, got ${prepared.n}`)
  }

  const ac = new AbortController()
  const onAbort = () => ac.abort()
  opts.signal?.addEventListener('abort', onAbort)
  let timer: ReturnType<typeof setTimeout> | undefined
  if (opts.timeoutMs) {
    timer = setTimeout(() => ac.abort(), opts.timeoutMs)
  }
  try {
    onStart?.()
    const result = await registry.generate(prepared, { providerId: opts.providerId, signal: ac.signal })
    await after?.(prepared, result)
    return result
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ToolArgsError(opts.signal?.aborted ? 'CANCELLED' : 'TIMEOUT', (err as Error).message)
    }
    throw err
  } finally {
    if (timer) clearTimeout(timer)
    opts.signal?.removeEventListener('abort', onAbort)
  }
}

function mergeNegative(a?: string, patch?: string): string {
  const parts = [a, patch].filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    for (const item of String(p).split(',').map((s) => s.trim()).filter(Boolean)) {
      const key = item.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
  }
  return out.join(', ')
}
