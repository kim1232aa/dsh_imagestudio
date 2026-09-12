import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio } from '../packages/host/src/boot.ts'
import { JobStore } from '../packages/core/src/jobs.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('T1 JobStore (DOC03 jobs)', () => {
  it('creates a running job and lists elapsedMs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-jobs-'))
    try {
      const store = new JobStore(dir)
      const job = store.create({ kind: 'image', prompt: 'tea cup' })
      assert.equal(job.status, 'running')
      const listed = store.list()
      assert.ok(listed.some((j) => j.id === job.id))
      assert.ok(typeof listed[0].elapsedMs === 'number')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('cancel marks canceled and abort signal fires', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-jobs-'))
    try {
      const store = new JobStore(dir)
      const job = store.create({ kind: 'image', prompt: 'slow' })
      const aborted = store.cancel(job.id)
      assert.equal(aborted.status, 'canceled')
      assert.equal(job.controller.signal.aborted, true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('failRunningOnBoot converts leftover running jobs to failed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-jobs-'))
    try {
      const a = new JobStore(dir)
      a.create({ kind: 'image', prompt: 'ghost' })
      const b = new JobStore(dir)
      b.failRunningOnBoot()
      assert.ok(b.list().every((j) => j.status !== 'running'))
      assert.ok(b.list().some((j) => j.status === 'failed'))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('POST /imagestudio/api/cancel stops an in-flight mock generate', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-jobs-ui-'))
    const host = await bootStudio({
      workspaceRoot: dir,
      skillsDir,
      enabledSkills: ['cinema-dna-21x9x3'],
      enableXai: false,
    })
    try {
      const mock = host.ctx.imagegen.resolve('mock') as { latencyMs?: number }
      if ('latencyMs' in mock) mock.latencyMs = 400
      const pending = host.web.fetch(
        'POST',
        '/imagestudio/api/generate',
        JSON.stringify({ prompt: '__SLOW__ cancel-me', aspectRatio: '1:1', n: 1 }),
      )
      let body: { jobs?: Array<{ id: string; status: string }> } = {}
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 20))
        const jobs = await host.web.fetch('GET', '/imagestudio/api/jobs')
        body = jobs.json as { jobs?: Array<{ id: string; status: string }> }
        if (body.jobs && body.jobs.length >= 1) break
      }
      assert.ok(body.jobs && body.jobs.length >= 1)
      const running = body.jobs.find((j) => j.status === 'running') ?? body.jobs[0]
      const canceled = await host.web.fetch(
        'POST',
        '/imagestudio/api/cancel',
        JSON.stringify({ jobId: running.id }),
      )
      assert.equal(canceled.status, 200)
      await pending.catch(() => undefined)
      const after = await host.web.fetch('GET', '/imagestudio/api/jobs')
      const row = (after.json as { jobs: Array<{ id: string; status: string }> }).jobs.find((j) => j.id === running.id)
      assert.ok(row)
      assert.notEqual(row.status, 'running')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
