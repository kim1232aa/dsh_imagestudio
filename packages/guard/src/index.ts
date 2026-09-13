import type { Context } from '@deepseek-ai/cordis'
import type { GuardVerdict, ImageRequest } from '../../core/src/types.ts'

// 验收红线（docs/03-验收标准.md 零章）：没有敏感词过滤、没有关键词黑名单、
// 没有内容审查。本模块因此不内置任何拦截规则，scanRequest 一律放行。
// image/guard 事件仅作为扩展点保留：外部插件如需自定规则可自行监听。

export function scanRequest(_req: ImageRequest, _extra: RegExp[] = []): GuardVerdict | void {
  return undefined
}

export const name = 'image-guard'
export const inject = ['imagegen']

export function apply(ctx: Context): void {
  ctx.on('image/guard', (req: ImageRequest) => scanRequest(req))
}
