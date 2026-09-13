/**
 * Browser-half entry for dsh-imagestudio — runs inside the dsh web GUI as a
 * closure-factory client module (window.__ModuleLoader__.load).
 *
 * Registers three surfaces:
 *  1. a 「生图」 sidebar row (sidebar.panellist) plus the keyed `main` panel
 *     that embeds the full /imagestudio workbench in an iframe;
 *  2. toolviews for istudio_generate / istudio_edit / istudio_compose in the
 *     keyed `tool.call.toolview` slot;
 *  3. a documentElement flag (data-istudio-client-active) that tells the
 *     legacy /imagestudio/entry.js snippet to stand down (mutual exclusion).
 *
 * Failure policy (pattern copied from dsh-imagegen): every DOM/slot operation
 * lives inside ctx.effect, failures are console.warn'ed, never thrown — the
 * web shell fails the whole boot when a plugin apply throws. Disposing the
 * fiber unregisters every surface and removes the active flag.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { registerMainPanel } from './panel.tsx'
import { registerSidebarEntry } from './sidebar.tsx'
import { registerImageStudioToolviews } from './toolview.tsx'

/** Plugin name for diagnostics. */
export const name = 'dsh-imagestudio-client'

/**
 * Required services (fiber inject waiting): slots for every surface, locale
 * for sidebar label language, connection to mirror dsh-imagegen's client
 * contract (and to future-proof loopback-aware surfaces).
 */
export const inject = ['slots', 'locale', 'connection']

/** documentElement dataset key marking the client bundle as active. */
const ACTIVE_FLAG = 'istudioClientActive'

/** LocalStorage kill switch: set to '1' to keep the legacy entry.js path. */
const DISABLE_KEY = 'istudio:client-disabled'

function isDisabled(): boolean {
  try {
    return typeof window !== 'undefined'
      && window.localStorage?.getItem(DISABLE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Mount the sidebar row, main panel, and toolviews.
 * @param ctx - client root context (services: slots, locale, connection).
 */
export function apply(ctx: ClientContext): void {
  if (isDisabled()) {
    console.warn('[imagestudio-client] disabled via localStorage flag; legacy entry.js stays in charge')
    return
  }

  // Surface 1+2: sidebar entry row and the keyed main panel iframe. The flag
  // is set only after both registrations succeed, so a failed mount leaves
  // the legacy entry.js fallback untouched.
  ctx.effect(() => {
    try {
      registerMainPanel(ctx)
      const disposeSidebar = registerSidebarEntry(ctx)
      if (typeof document !== 'undefined') {
        document.documentElement.dataset[ACTIVE_FLAG] = '1'
      }
      return () => {
        disposeSidebar()
        if (typeof document !== 'undefined') {
          delete document.documentElement.dataset[ACTIVE_FLAG]
        }
      }
    } catch (error) {
      console.warn('[imagestudio-client] surface mount failed (legacy entry.js fallback stays active):', error)
      return () => {}
    }
  }, 'imagestudio-client: sidebar + main panel')

  // Surface 3: istudio_* toolviews.
  ctx.effect(() => {
    try {
      registerImageStudioToolviews(ctx)
    } catch (error) {
      console.warn('[imagestudio-client] toolview registration failed:', error)
    }
    return () => {}
  }, 'imagestudio-client: toolviews')
}
