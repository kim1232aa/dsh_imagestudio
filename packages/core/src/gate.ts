/** Simple concurrency gate used by generate/compose (AC-AS-04). */
export class ConcurrencyGate {
  private running = 0
  private readonly waiters: Array<() => void> = []
  private readonly limit: number

  constructor(limit: number) {
    this.limit = limit
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.limit < 1) return fn()
    while (this.running >= this.limit) {
      await new Promise<void>((resolve) => this.waiters.push(resolve))
    }
    this.running++
    try {
      return await fn()
    } finally {
      this.running--
      this.waiters.shift()?.()
    }
  }
}
