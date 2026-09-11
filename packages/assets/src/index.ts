export * from './paths.ts'
export * from './store.ts'

export const name = 'image-assets'
export const inject = ['jobs']

export function apply(ctx: { imageAssets?: unknown; config?: { workspaceRoot?: string } }): void {
  // Host wires AssetStore with the active workspace root.
  ctx.imageAssets = ctx.imageAssets
}
