export * from './png.ts'
export * from './triptych.ts'
export * from './gif.ts'
export * from './zip.ts'
export * from './svg.ts'

import type { Context } from '@deepseek-ai/cordis'
import { composeTriptych, overlayTitle, readEmbeddedTitle } from './triptych.ts'

export const name = 'image-compose'
export const inject: string[] = []

export function apply(ctx: Context): void {
  ctx.provide('imageCompose', {
    triptych: composeTriptych,
    overlayTitle,
    readEmbeddedTitle,
  })
}
