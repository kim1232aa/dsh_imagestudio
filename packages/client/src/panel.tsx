/**
 * Main panel for Image Studio: the full server-side workbench embedded as an
 * iframe, registered into the keyed `main` slot under key 'imagestudio'. The
 * iframe keeps every workbench capability (tabs, assets, canvas, settings)
 * without re-implementing any of it in the shell.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SlotsLike } from './slots-face.ts'

/** Workbench route served by the host half (packages/ui). */
export const STUDIO_HREF = '/imagestudio'

/** Full-bleed iframe panel; the slot owner sizes the container. */
export function StudioPanel() {
  return (
    <div
      data-istudio-panel=""
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0b0d12',
      }}
    >
      <iframe
        src={STUDIO_HREF}
        title="Image Studio"
        style={{ flex: 1, border: 0, width: '100%', minHeight: 0 }}
      />
    </div>
  )
}

/**
 * Register the keyed main panel. Must run inside ctx.slots.inject('main', …)
 * so the registration shares the injection scope's lifetime.
 */
export function registerMainPanel(ctx: ClientContext): void {
  const slots = (ctx as unknown as { slots: SlotsLike }).slots
  slots.inject('main', function* () {
    yield slots.register({ name: 'main', key: 'imagestudio' }, StudioPanel)
  })
}
