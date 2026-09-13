export * from './paths.ts'
export * from './store.ts'

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { AssetStore } from './store.ts'

export const name = 'image-assets'
export const inject = ['jobs']

export const Config = Schema.object({
  workspaceRoot: Schema.string().default('.'),
  keepLastTasks: Schema.number().default(0),
  outputDir: Schema.string(),
})

export function apply(
  ctx: Context,
  config: { workspaceRoot?: string; keepLastTasks?: number; outputDir?: string } = {},
): void {
  const store = new AssetStore({
    workspaceRoot: config.workspaceRoot ?? '.',
    keepLastTasks: config.keepLastTasks ?? 0,
    outputDir: config.outputDir,
  })
  ctx.provide('imageAssets', store)
}
