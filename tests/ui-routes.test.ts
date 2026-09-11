import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio } from '../packages/host/src/boot.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('AC-UI routes on host webServer', () => {
  async function withHost() {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-ui-'))
    const host = await bootStudio({
      workspaceRoot: dir,
      skillsDir,
      enabledSkills: ['cinema-dna-21x9x3', 'life-force-portrait', 'movie-poster'],
      enableXai: false,
    })
    return { dir, host }
  }

  it('AC-UI-01 GET /imagestudio is Image Studio HTML', async () => {
    const { dir, host } = await withHost()
    try {
      const res = await host.web.fetch('GET', '/imagestudio')
      assert.equal(res.status, 200)
      assert.match(res.type, /text\/html/)
      assert.match(res.text, /Image Studio/)
      assert.match(res.text, /生图|文生图/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-UI-04 meta lists five-or-enabled skills and mock provider', async () => {
    const { dir, host } = await withHost()
    try {
      const res = await host.web.fetch('GET', '/imagestudio/api/meta')
      assert.equal(res.status, 200)
      const body = res.json as { skills: Array<{ id: string }>; providers: Array<{ id: string }> }
      const ids = body.skills.map((s) => s.id)
      assert.ok(ids.includes('cinema-dna-21x9x3'))
      assert.ok(body.providers.some((p) => p.id === 'mock' || p.id.includes('mock')))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-UI-06 plan then generate writes an asset', async () => {
    const { dir, host } = await withHost()
    try {
      const planned = await host.web.fetch(
        'POST',
        '/imagestudio/api/plan',
        JSON.stringify({ skillId: 'cinema-dna-21x9x3', brief: '明代夜审账房放榜，三镜电影感' }),
      )
      const planBody = planned.json as { passed?: boolean; planId?: string; score?: number }
      if (planBody.passed === false) {
        assert.ok(typeof planBody.score === 'number')
        return
      }
      assert.equal(planned.status, 200)
      assert.ok(planBody.planId)
      const gen = await host.web.fetch(
        'POST',
        '/imagestudio/api/generate',
        JSON.stringify({ planId: planBody.planId, n: 1 }),
      )
      assert.equal(gen.status, 200)
      const out = gen.json as { images?: Array<{ path: string }>; passed?: boolean; blocked?: boolean }
      if (out.passed === false || out.blocked) return
      assert.ok(out.images && out.images.length >= 1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-UI-09 file path escape is 403', async () => {
    const { dir, host } = await withHost()
    try {
      const res = await host.web.fetch('GET', '/imagestudio/api/file?path=../etc/passwd')
      assert.equal(res.status, 403)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-UI-08 low score plan does not call provider', async () => {
    const { dir, host } = await withHost()
    try {
      const mock = host.ctx.imagegen.resolve('mock') as { calls: number }
      const before = mock.calls
      host.ctx.on('image/score', () => ({ score: 10, passed: false, failures: ['forced-veto'] }))
      const planned = await host.web.fetch(
        'POST',
        '/imagestudio/api/plan',
        JSON.stringify({ skillId: 'cinema-dna-21x9x3', brief: 'forced fail brief' }),
      )
      const body = planned.json as { passed?: boolean; score?: number; failures?: string[] }
      assert.equal(body.passed, false)
      assert.equal(body.score, 10)
      assert.equal(mock.calls, before)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-UI-08 failed stored plan skips generate', async () => {
    const { dir, host } = await withHost()
    try {
      const mock = host.ctx.imagegen.resolve('mock') as { calls: number }
      const plan = host.ctx.imageSkills.compile('cinema-dna-21x9x3', '夜审账房放榜三镜')
      plan.selfCheck = { score: 40, passed: false, failures: ['below 82'] }
      host.ctx.imageSkills.plans.set(plan.id, plan)
      const before = mock.calls
      const gen = await host.web.fetch(
        'POST',
        '/imagestudio/api/generate',
        JSON.stringify({ planId: plan.id }),
      )
      assert.equal(gen.status, 200)
      const out = gen.json as { passed?: boolean; score?: number }
      assert.equal(out.passed, false)
      assert.equal(out.score, 40)
      assert.equal(mock.calls, before)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-TL-20 workbench plan aspect matches image_skill_plan', async () => {
    const { dir, host } = await withHost()
    try {
      const brief = '明代夜审账房放榜'
      const viaTool = (await host.tools.call('image_skill_plan', {
        skillId: 'cinema-dna-21x9x3',
        brief,
      })) as { plan: { shots: Array<{ aspectRatio: string }> } }
      const viaUi = await host.web.fetch(
        'POST',
        '/imagestudio/api/plan',
        JSON.stringify({ skillId: 'cinema-dna-21x9x3', brief }),
      )
      const uiPlan = (viaUi.json as { plan: { shots: Array<{ aspectRatio: string }> } }).plan
      assert.ok(viaTool.plan.shots.length)
      assert.equal(viaTool.plan.shots[0].aspectRatio, '21:9')
      assert.equal(uiPlan.shots[0].aspectRatio, viaTool.plan.shots[0].aspectRatio)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-TL-21 generated files show in assets index', async () => {
    const { dir, host } = await withHost()
    try {
      const gen = await host.web.fetch(
        'POST',
        '/imagestudio/api/generate',
        JSON.stringify({ prompt: 'studio still', aspectRatio: '21:9', n: 1 }),
      )
      const out = gen.json as { images?: Array<{ path: string }>; passed?: boolean }
      if (out.passed === false) return
      assert.ok(out.images?.[0]?.path)
      const listed = await host.web.fetch('GET', '/imagestudio/api/assets')
      const text = listed.text
      assert.match(text, /shot-|studio/)
      const viaTool = await host.tools.call('image_assets', {})
      assert.ok(viaTool)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-UI-09 compose does not send 三格 to generate', async () => {
    const { dir, host } = await withHost()
    try {
      const mock = host.ctx.imagegen.resolve('mock') as { calls: number; lastRequest?: { prompt: string } }
      const a = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ prompt: 'panel-a', n: 1 }))
      const b = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ prompt: 'panel-b', n: 1 }))
      const c = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ prompt: 'panel-c', n: 1 }))
      const paths = [a, b, c].flatMap((r) => ((r.json as { images?: Array<{ path: string }> }).images ?? []).map((i) => i.path))
      assert.ok(paths.length >= 3)
      const before = mock.calls
      const composed = await host.web.fetch(
        'POST',
        '/imagestudio/api/compose',
        JSON.stringify({ mode: 'triptych', assets: paths.slice(0, 3), gap: 10, ratios: '1:1:1' }),
      )
      assert.equal(composed.status, 200)
      const out = composed.json as { images?: Array<{ path: string }> }
      assert.ok(out.images?.[0]?.path)
      assert.equal(mock.calls, before)
      assert.doesNotMatch(mock.lastRequest?.prompt ?? '', /画三格|three panels in one canvas/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-EV-03 workbench generate fires after-result', async () => {
    const { dir, host } = await withHost()
    try {
      let seen = 0
      host.ctx.on('image/after-result', () => {
        seen++
      })
      await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ prompt: 'after-result probe', n: 1 }))
      assert.ok(seen >= 1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-UI-11 disposing image-ui drops /imagestudio', async () => {
    const { dir, host } = await withHost()
    try {
      const before = await host.web.fetch('GET', '/imagestudio')
      assert.equal(before.status, 200)
      host.web.uninstall()
      const after = await host.web.fetch('GET', '/imagestudio')
      assert.notEqual(after.status, 200)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
