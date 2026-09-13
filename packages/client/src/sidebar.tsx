/**
 * Sidebar entry for Image Studio: an icon registered into the
 * `sidebar.panellist` list slot. The list id matches the `main` keyed panel
 * key, so the shell's panel row selects the studio panel on click
 * (ctx.layout.selectPanel(id) inside ui-sidebar).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { tt } from './locales.ts'
import type { SlotsLike } from './slots-face.ts'

/** Owner share supplied by the sidebar panel row (see ui-sidebar contract). */
export interface SidebarPanelIconOwnerProps {
  /** Requested square edge in pixels. */
  size: number
  /** Whether this panel is selected in the main column. */
  active: boolean
}

/** Picture-frame glyph, sized by the owner and tinted by the row. */
export function StudioIcon(props: SidebarPanelIconOwnerProps) {
  const size = props.size ?? 16
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-active={props.active ? '' : undefined}
    >
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <circle cx="5.6" cy="5.8" r="1" />
      <path d="M2.5 12.5l3.6-3.4 2.4 2.2 3-3 2 2.4" />
    </svg>
  )
}

/**
 * Register the 「生图」 row. Returns the slot disposer; the caller wraps this
 * in ctx.effect so fiber teardown unregisters the row.
 */
export function registerSidebarEntry(ctx: ClientContext): () => void {
  const slots = (ctx as unknown as { slots: SlotsLike }).slots
  return slots.register(
    {
      name: 'sidebar.panellist',
      id: 'imagestudio',
      order: 100,
      label: () => tt(ctx, '生图', 'Image Studio'),
    },
    StudioIcon,
  )
}
