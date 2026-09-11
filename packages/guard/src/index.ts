import type { Context } from '@deepseek-ai/cordis'
import type { GuardVerdict, ImageRequest } from '../../core/src/types.ts'

const DEFAULT_BLOCK = [/\b(child\s*porn|csam)\b/i, /\bmake a bomb\b/i]

export function scanRequest(req: ImageRequest, extra: RegExp[] = []): GuardVerdict | void {
  const text = `${req.prompt}\n${req.negative ?? ''}`
  for (const re of [...DEFAULT_BLOCK, ...extra]) {
    if (re.test(text)) return { blocked: true, reason: `guard matched ${re}` }
  }
}

export const name = 'image-guard'
export const inject = ['imagegen']

export function apply(ctx: Context): void {
  ctx.on('image/guard', (req: ImageRequest) => scanRequest(req))
}
