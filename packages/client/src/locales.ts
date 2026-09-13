/**
 * Tiny bilingual copy table for the client half. The workbench itself is
 * all-Chinese (repo convention); only shell-facing labels (sidebar row,
 * toolview chrome) follow the host interface language when the locale
 * service is reachable.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'

/** Minimal structural face of the host locale service we rely on. */
export interface LocaleLike {
  getLocale(): { active: string }
}

/** Pick zh/en copy by the host's active locale; zh on any failure. */
export function tt(ctx: ClientContext, zh: string, en: string): string {
  try {
    const locale = ctx.get('locale') as LocaleLike | undefined
    return locale?.getLocale().active === 'en' ? en : zh
  } catch {
    return zh
  }
}
