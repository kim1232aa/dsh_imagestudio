import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio } from '../packages/host/src/boot.ts'
import { createSolid, decodeImage, decodePng, encodePng } from '../packages/compose/src/index.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('M1 tool-level gates and compose modes', () => {
  async function withHost() {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-m1-'))
    const host = await bootStudio({
      workspaceRoot: dir,
      skillsDir,
      enabledSkills: ['cinema-dna-21x9x3'],
      enableXai: false,
    })
    return { dir, host }
  }

  async function putImage(host: Awaited<ReturnType<typeof bootStudio>>, rel: string, w: number, h: number) {
    const abs = join(host.ctx.imageAssets.root, rel)
    await mkdir(join(abs, '..'), { recursive: true })
    await writeFile(abs, encodePng(createSolid(w, h, [30, 60, 90, 255])))
    return rel
  }

  it('istudio_generate without force: PLAN_REJECTED and provider not called', async () => {
    const { dir, host } = await withHost()
    try {
      const mock = host.ctx.imagegen.resolve('mock') as { calls: number }
      const plan = host.ctx.imageSkills.compile('cinema-dna-21x9x3', '明代夜审账房')
      plan.selfCheck = { score: 40, passed: false, failures: ['below 82'], veto: '测试 veto' }
      host.ctx.imageSkills.plans.set(plan.id, plan)
      const before = mock.calls
      const err = await host.tools
        .call('istudio_generate', { planId: plan.id })
        .then(() => null, (e: unknown) => e as Error & { code?: string })
      assert.ok(err, 'must throw')
      assert.match(err.message, /^PLAN_REJECTED: score 40\/82; failures: below 82; veto: 测试 veto$/)
      assert.equal(mock.calls, before, 'provider must not be called')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('istudio_generate force:true releases the gate', async () => {
    const { dir, host } = await withHost()
    try {
      const mock = host.ctx.imagegen.resolve('mock') as { calls: number }
      const plan = host.ctx.imageSkills.compile('cinema-dna-21x9x3', '明代夜审账房')
      plan.selfCheck = { score: 40, passed: false, failures: ['below 82'] }
      host.ctx.imageSkills.plans.set(plan.id, plan)
      const before = mock.calls
      const out = (await host.tools.call('istudio_generate', { planId: plan.id, force: true })) as {
        images?: unknown[]
      }
      assert.ok(out.images?.length)
      assert.ok(mock.calls > before)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('istudio_compose crop cuts the requested box', async () => {
    const { dir, host } = await withHost()
    try {
      const rel = await putImage(host, 'src/base.png', 100, 80)
      const out = (await host.tools.call('istudio_compose', {
        mode: 'crop',
        assets: [rel],
        x: 10,
        y: 20,
        w: 40,
        h: 30,
      })) as { path: string; width: number; height: number }
      assert.equal(out.width, 40)
      assert.equal(out.height, 30)
      const decoded = decodePng(await import('node:fs/promises').then((fs) => fs.readFile(join(host.ctx.imageAssets.root, out.path))))
      assert.equal(decoded.width, 40)
      assert.equal(decoded.height, 30)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('istudio_compose crop requires numeric x/y/w/h', async () => {
    const { dir, host } = await withHost()
    try {
      const rel = await putImage(host, 'src/base.png', 100, 80)
      await assert.rejects(() => host.tools.call('istudio_compose', { mode: 'crop', assets: [rel], x: 0, y: 0, w: 10 }), /crop mode requires numeric h/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('istudio_compose gif encodes all frames', async () => {
    const { dir, host } = await withHost()
    try {
      const a = await putImage(host, 'src/f1.png', 32, 24)
      const b = await putImage(host, 'src/f2.png', 32, 24)
      const out = (await host.tools.call('istudio_compose', {
        mode: 'gif',
        assets: [a, b],
        delayMs: 100,
      })) as { path: string; width: number; height: number; frames: number; delayMs: number }
      assert.equal(out.frames, 2)
      assert.equal(out.width, 32)
      assert.equal(out.height, 24)
      const bytes = await import('node:fs/promises').then((fs) => fs.readFile(join(host.ctx.imageAssets.root, out.path)))
      assert.equal(bytes.subarray(0, 6).toString('ascii'), 'GIF89a')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('istudio_edit fills real width/height/sha256 from the source image', async () => {
    const { dir, host } = await withHost()
    try {
      const rel = await putImage(host, 'src/ref.png', 64, 48)
      const mock = host.ctx.imagegen.resolve('mock') as {
        lastRequest?: { refImages?: Array<{ width: number; height: number; sha256: string; mime: string }> }
      }
      await host.tools.call('istudio_edit', { prompt: 'keep identity, upgrade light', assets: [rel] })
      const ref = mock.lastRequest?.refImages?.[0]
      assert.ok(ref, 'refImages must reach the provider')
      assert.equal(ref.width, 64)
      assert.equal(ref.height, 48)
      assert.match(ref.sha256, /^[0-9a-f]{64}$/)
      assert.equal(ref.mime, 'image/png')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('istudio_edit rejects an undecodable asset path', async () => {
    const { dir, host } = await withHost()
    try {
      await assert.rejects(
        () => host.tools.call('istudio_edit', { prompt: 'x', assets: ['src/missing.png'] }),
        /ENOENT|cannot decode image/,
      )
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
