import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type JobKind = 'image' | 'video'
export type JobStatus = 'queued' | 'running' | 'done' | 'canceled' | 'failed'

export interface JobInit {
  kind: JobKind
  prompt?: string
}

export interface JobRecord {
  id: string
  kind: JobKind
  prompt?: string
  status: JobStatus
  startedAt: number
  endedAt?: number
  error?: string
}

export interface Job extends JobRecord {
  controller: AbortController
  get elapsedMs(): number
}

export class JobStore {
  private readonly file: string
  private readonly jobs = new Map<string, Job>()

  constructor(dir: string) {
    this.file = join(dir, 'jobs.json')
    this.load()
  }

  create(init: JobInit): Job {
    const rec: JobRecord = {
      id: randomUUID(),
      kind: init.kind,
      prompt: init.prompt,
      status: 'running',
      startedAt: Date.now(),
    }
    const job = this.wrap(rec)
    this.jobs.set(job.id, job)
    this.save()
    return job
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id)
  }

  list(): Array<JobRecord & { elapsedMs: number }> {
    return [...this.jobs.values()].map((j) => ({
      id: j.id,
      kind: j.kind,
      prompt: j.prompt,
      status: j.status,
      startedAt: j.startedAt,
      endedAt: j.endedAt,
      error: j.error,
      elapsedMs: j.elapsedMs,
    }))
  }

  cancel(id: string): Job {
    const job = this.jobs.get(id)
    if (!job) throw new Error(`unknown job ${id}`)
    if (job.status === 'running' || job.status === 'queued') {
      job.status = 'canceled'
      job.endedAt = Date.now()
      if (!job.controller.signal.aborted) job.controller.abort()
      this.save()
    }
    return job
  }

  finish(id: string, status: 'done' | 'failed', error?: string): Job | undefined {
    const job = this.jobs.get(id)
    if (!job) return
    if (job.status === 'canceled') return job
    job.status = status
    job.endedAt = Date.now()
    job.error = error
    this.save()
    return job
  }

  failRunningOnBoot(): void {
    for (const job of this.jobs.values()) {
      if (job.status === 'running' || job.status === 'queued') {
        job.status = 'failed'
        job.endedAt = Date.now()
        job.error = 'process restarted'
        if (!job.controller.signal.aborted) job.controller.abort()
      }
    }
    this.save()
  }

  private wrap(rec: JobRecord): Job {
    const controller = new AbortController()
    const job: Job = {
      ...rec,
      controller,
      get elapsedMs() {
        return (this.endedAt ?? Date.now()) - this.startedAt
      },
    }
    return job
  }

  private load(): void {
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as JobRecord[]
      for (const rec of raw) this.jobs.set(rec.id, this.wrap(rec))
    } catch {
      /* first boot */
    }
  }

  private save(): void {
    mkdirSync(dirname(this.file), { recursive: true })
    const rows: JobRecord[] = [...this.jobs.values()].map((j) => ({
      id: j.id,
      kind: j.kind,
      prompt: j.prompt,
      status: j.status,
      startedAt: j.startedAt,
      endedAt: j.endedAt,
      error: j.error,
    }))
    writeFileSync(this.file, JSON.stringify(rows))
  }
}
