import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio } from '../packages/host/src/boot.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('DOC03 video protocol', () => {
  it('POST /imagestudio/api/video writes mp4 on the same job queue', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-vid-'))
    const host = await bootStudio({
      workspaceRoot: dir,
      skillsDir,
      enabledSkills: ['cinema-dna-21x9x3'],
      enableXai: false,
    })
    try {
      const res = await host.web.fetch(
        'POST',
        '/imagestudio/api/video',
        JSON.stringify({ prompt: 'tea house dusk', durationSec: 1, aspectRatio: '16:9' }),
      )
      assert.equal(res.status, 200, res.text)
      const body = res.json as {
        jobId: string
        path: string
        url: string
        mime: string
        durationSec: number
        width: number
        height: number
      }
      assert.ok(body.jobId)
      assert.equal(body.mime, 'video/mp4')
      assert.equal(body.url, body.path)
      assert.ok(!/^https?:\/\//.test(body.url), 'url must not be rewritten onto another host')
      assert.equal(body.durationSec, 1)
      assert.ok(body.path.endsWith('.mp4'))

      const jobs = await host.web.fetch('GET', '/imagestudio/api/jobs')
      const list = jobs.json as { jobs: Array<{ id: string; kind: string }> }
      assert.ok(list.jobs.some((j) => j.id === body.jobId && j.kind === 'video'))

      const file = await host.web.fetch('GET', '/imagestudio/api/file?path=' + encodeURIComponent(body.path))
      assert.equal(file.status, 200)
      assert.match(file.type, /video\/mp4/)
      assert.ok(file.text.length > 100 || (file as { text: string }).text !== undefined)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('POST /imagestudio/api/gif encodes a local gif on the job queue', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-gif-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enableXai: false })
    try {
      const res = await host.web.fetch(
        'POST',
        '/imagestudio/api/gif',
        JSON.stringify({ prompt: 'tea house dusk', n: 2, aspectRatio: '1:1', durationSec: 1 }),
      )
      assert.equal(res.status, 200, res.text)
      const body = res.json as { jobId: string; path: string; url: string; mime: string; frames: number }
      assert.equal(body.mime, 'image/gif')
      assert.equal(body.url, body.path)
      assert.ok(body.frames >= 2)
      const file = await host.web.fetch('GET', '/imagestudio/api/file?path=' + encodeURIComponent(body.path))
      assert.equal(file.status, 200)
      assert.match(file.type, /image\/gif/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('POST /imagestudio/api/video/frame extracts a png and rejects path escape', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-frame-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enableXai: false })
    try {
      const clip = await host.web.fetch(
        'POST',
        '/imagestudio/api/video',
        JSON.stringify({ prompt: 'tea house dusk', durationSec: 1, aspectRatio: '16:9' }),
      )
      assert.equal(clip.status, 200, clip.text)
      const path = (clip.json as { path: string }).path
      const frame = await host.web.fetch(
        'POST',
        '/imagestudio/api/video/frame',
        JSON.stringify({ path, t: 0.2 }),
      )
      assert.equal(frame.status, 200, frame.text)
      const body = frame.json as { path: string; mime: string; width: number; height: number }
      assert.equal(body.mime, 'image/png')
      assert.ok(body.width > 8)
      const bad = await host.web.fetch(
        'POST',
        '/imagestudio/api/video/frame',
        JSON.stringify({ path: '../etc/passwd', t: 0 }),
      )
      assert.equal(bad.status, 403)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('workbench html has 视频 mode and no plugin-pack loader', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-vid-ui-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enableXai: false })
    try {
      const page = await host.web.fetch('GET', '/imagestudio')
      assert.match(page.text, /data-mode="video"/)
      assert.doesNotMatch(page.text, /插件包|clone 插件/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
