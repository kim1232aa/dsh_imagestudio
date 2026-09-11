import type { CreativePlan, GuardVerdict, ImageRequest, ImageResult, ScoreCard } from './types.ts'

export type EventMode = 'waterfall' | 'bail' | 'serial' | 'parallel' | 'emit'

/**
 * Lightweight bus used by unit tests and by plugin apply() when a host
 * Context is not present. Production wiring should prefer ctx.waterfall /
 * ctx.bail / ctx.parallel / ctx.serial / ctx.emit once mounted in dsh.
 */
export class ImageEventBus {
  private listeners = new Map<string, Function[]>()

  on(event: string, fn: Function): () => void {
    const list = this.listeners.get(event) ?? []
    list.push(fn)
    this.listeners.set(event, list)
    return () => {
      const next = (this.listeners.get(event) ?? []).filter((x) => x !== fn)
      this.listeners.set(event, next)
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0
  }

  async waterfall<T>(event: string, value: T): Promise<T> {
    const chain = this.listeners.get(event) ?? []
    let current = value
    let index = 0
    const run = async (): Promise<T> => {
      const fn = chain[index++]
      if (!fn) return current
      let delegated = false
      const next = async (patched?: T): Promise<T> => {
        delegated = true
        if (patched !== undefined) current = patched
        return run()
      }
      const result = await fn(current, next)
      if (!delegated) {
        throw new Error(
          `[waterfall:${event}] listener did not call next(). ` +
            'Observer listeners MUST return next() or the chain is silently dropped (AC-EV-02).',
        )
      }
      return result === undefined ? current : result
    }
    return run()
  }

  bail<T, R>(event: string, value: T): R | void {
    for (const fn of this.listeners.get(event) ?? []) {
      const verdict = fn(value)
      if (verdict != null && verdict !== false) return verdict as R
    }
  }

  async serial<T, R>(event: string, value: T): Promise<R | void> {
    for (const fn of this.listeners.get(event) ?? []) {
      const out = await fn(value)
      if (out != null) return out as R
    }
  }

  async parallel<T>(event: string, ...args: T[]): Promise<void> {
    const tasks = (this.listeners.get(event) ?? []).map(async (fn) => {
      try {
        await fn(...args)
      } catch (err) {
        console.error(`[parallel:${event}] listener failed`, err)
      }
    })
    await Promise.all(tasks)
  }

  emit(event: string, ...args: unknown[]): void {
    for (const fn of this.listeners.get(event) ?? []) {
      try {
        fn(...args)
      } catch (err) {
        console.error(`[emit:${event}] listener failed`, err)
      }
    }
  }
}

export const defaultBus = new ImageEventBus()

export type ImagePlanHandler = (
  brief: string,
  skillId: string,
  next: () => Promise<CreativePlan>,
) => Promise<CreativePlan>

export type BeforeRequestHandler = (
  req: ImageRequest,
  next: (req?: ImageRequest) => Promise<ImageRequest>,
) => Promise<ImageRequest>

export type GuardHandler = (req: ImageRequest) => GuardVerdict | void
export type AfterResultHandler = (req: ImageRequest, result: ImageResult) => void | Promise<void>
export type ScoreHandler = (plan: CreativePlan) => ScoreCard | void | Promise<ScoreCard | void>
export type ProgressHandler = (taskId: string, phase: string, pct: number) => void
