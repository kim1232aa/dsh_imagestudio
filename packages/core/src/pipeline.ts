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

export function installBuiltinHooks(p: Pipeline): void {
  p.bus.on('image/before-request', async (req: ImageRequest, next: (r?: ImageRequest) => Promise<ImageRequest>) => {
    let nextReq = { ...req }
    if (req.plan) {
      const shot = req.shotId ? req.plan.shots.find((s) => s.id === req.shotId) : req.plan.shots[0]
      if (shot) {
        nextReq.prompt = shot.prompt
        nextReq.aspectRatio = shot.aspectRatio
        nextReq.negative = mergeNegative(shot.negative, req.plan.constraints.negativePatch)
      } else {
        nextReq.negative = mergeNegative(req.negative, req.plan.constraints.negativePatch)
        if (req.plan.shots[0]) nextReq.aspectRatio = req.plan.shots[0].aspectRatio
      }
      nextReq.refUsage = req.plan.constraints.referenceImages.usage
    }
    if (nextReq.refUsage === 'analysis-only' && nextReq.refImages?.length) {
      nextReq = { ...nextReq, refImages: undefined }
    }
    if (nextReq.plan?.characters?.length) {
      const d = nextReq.plan.characters[0].descriptor
      if (!nextReq.prompt.includes(d)) nextReq.prompt = `${d}. ${nextReq.prompt}`
    }
    return next(nextReq)
  })
}

export async function runGenerate(
  p: Pipeline,
  req: ImageRequest,
  opts: { providerId?: string; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<
  | { blocked: true; reason: string }
  | { passed: false; score: number; failures: string[] }
  | ImageResult
> {
  const guard = p.bus.bail<ImageRequest, GuardVerdict>('image/guard', req)
  if (guard?.blocked) return { blocked: true, reason: guard.reason }

  if (req.plan && !req.plan.selfCheck.passed) {
    return { passed: false, score: req.plan.selfCheck.score, failures: req.plan.selfCheck.failures }
  }

  const prepared = await p.bus.waterfall('image/before-request', req)

  if (prepared.n < 1 || prepared.n > 4) {
    throw new ToolArgsError('INVALID_ARGS', `n must be 1-4, got ${prepared.n}`)
  }

  const ac = new AbortController()
  const onAbort = () => ac.abort()
  opts.signal?.addEventListener('abort', onAbort)
  let timer: NodeJS.Timeout | undefined
  if (opts.timeoutMs) {
    timer = setTimeout(() => ac.abort(), opts.timeoutMs)
  }
  try {
    p.generateCalls++
    const result = await p.registry.generate(prepared, { providerId: opts.providerId, signal: ac.signal })
    await p.bus.parallel('image/after-result', prepared as never, result as never)
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
