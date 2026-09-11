export * from './types.ts'
export * from './events.ts'
export * from './registry.ts'
export * from './config.ts'
export * from './errors.ts'
export * from './pipeline.ts'

import { ImageGenRegistry } from './registry.ts'

export const name = 'image-core'
export const inject: string[] = []

export function apply(ctx: { imagegen?: ImageGenRegistry; [k: string]: unknown }): void {
  ctx.imagegen = new ImageGenRegistry()
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    'image/plan'(brief: string, skillId: string, next: () => Promise<unknown>): Promise<unknown>
    'image/guard'(req: unknown): unknown
    'image/before-request'(req: unknown, next: () => Promise<unknown>): Promise<unknown>
    'image/after-result'(req: unknown, result: unknown): void
    'image/score'(plan: unknown): unknown
    'image/progress'(taskId: string, phase: string, pct: number): void
  }
  interface Context {
    imagegen: import('./registry.ts').ImageGenRegistry
  }
}
