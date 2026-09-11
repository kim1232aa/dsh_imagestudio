export type * from './types.ts'
export * from './events.ts'
export * from './registry.ts'
export {
  defaultConfig,
  assertProviderConfig,
  redactSecrets,
  describeRedacted,
} from './config.ts'
export type { ProviderConfig, StudioConfig } from './config.ts'
export * from './errors.ts'
export * from './pipeline.ts'

import type { Context } from '@deepseek-ai/cordis'
import { ImageGenRegistry } from './registry.ts'
import { applyBuiltinRequestHooks } from './pipeline.ts'
import type { ImageRequest } from './types.ts'

export const name = 'image-core'
export const inject: string[] = []

export function apply(ctx: Context): void {
  ctx.provide('imagegen', new ImageGenRegistry())
  ctx.on('image/before-request', async (req: ImageRequest, next: () => Promise<ImageRequest>) => {
    applyBuiltinRequestHooks(req)
    return next()
  })
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
    imageSkills: import('./skills-iface.ts').ImageSkillsService & {
      plans: Map<string, import('./types.ts').CreativePlan>
    }
    imageAssets: import('../../assets/src/store.ts').AssetStore
    imageCompose: {
      triptych: typeof import('../../compose/src/triptych.ts').composeTriptych
      overlayTitle: typeof import('../../compose/src/triptych.ts').overlayTitle
      readEmbeddedTitle: typeof import('../../compose/src/triptych.ts').readEmbeddedTitle
    }
    tools: { register(def: unknown): () => void }
  }
}
