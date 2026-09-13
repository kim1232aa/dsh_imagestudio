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
      assert.equal(planned.status, 200)
      assert.ok(planBody.planId, 'plan must persist even when selfCheck.passed is false')
      const gen = await host.web.fetch(
        'POST',
        '/imagestudio/api/generate',
        JSON.stringify({ planId: planBody.planId, n: 1 }),
      )
      assert.equal(gen.status, 200)
      const out = gen.json as { images?: Array<{ path: string }>; passed?: boolean; blocked?: boolean }
      assert.notEqual(out.blocked, true)
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

  it('plan endpoint does not generate images (score may be low)', async () => {
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
      const body = planned.json as { passed?: boolean; score?: number; planId?: string }
      assert.equal(body.passed, false)
      assert.equal(body.score, 10)
      assert.ok(body.planId, 'low score must still persist planId so 就这样出图 works')
      assert.equal(mock.calls, before)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('SPEC-0.4 rejected plan without force is HTTP 422 PLAN_REJECTED (provider not called)', async () => {
    const { dir, host } = await withHost()
    try {
      const mock = host.ctx.imagegen.resolve('mock') as { calls: number }
      const plan = host.ctx.imageSkills.compile('cinema-dna-21x9x3', '夜审账房放榜三镜')
      plan.selfCheck = { score: 40, passed: false, failures: ['below 82'], veto: '测试 veto' }
      host.ctx.imageSkills.plans.set(plan.id, plan)
      const before = mock.calls
      const gen = await host.web.fetch(
        'POST',
        '/imagestudio/api/generate',
        JSON.stringify({ planId: plan.id }),
      )
      assert.equal(gen.status, 422, JSON.stringify(gen.json))
      const out = gen.json as { error?: { code?: string; score?: number; threshold?: number; failures?: string[]; veto?: string | null } }
      assert.equal(out.error?.code, 'PLAN_REJECTED')
      assert.equal(out.error?.score, 40)
      assert.equal(out.error?.threshold, 82)
      assert.deepEqual(out.error?.failures, ['below 82'])
      assert.equal(out.error?.veto, '测试 veto')
      assert.equal(mock.calls, before, 'provider must not be called')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('DOC-00-6 low score plan with force:true still generates (SPEC §0.4)', async () => {
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
        JSON.stringify({ planId: plan.id, force: true }),
      )
      assert.equal(gen.status, 200)
      const out = gen.json as { images?: unknown[]; error?: string }
      assert.ok(Array.isArray(out.images) && out.images.length >= 1, JSON.stringify(out))
      assert.ok(mock.calls > before)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('PLAN_REJECTED 422 carries veto and workbench shows 仍然出图', async () => {
    const { dir, host } = await withHost()
    try {
      const plan = host.ctx.imageSkills.compile('cinema-dna-21x9x3', 'veto probe')
      plan.selfCheck = { score: 55, passed: false, failures: ['f1'], veto: '三镜同机位' }
      host.ctx.imageSkills.plans.set(plan.id, plan)
      const res = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ planId: plan.id }))
      assert.equal(res.status, 422)
      const err = (res.json as { error: { veto: string | null } }).error
      assert.equal(err.veto, '三镜同机位')
      // UI 侧：422 交互（分数框 + 仍然出图按钮 + force 重发）在页面脚本里
      const page = await host.web.fetch('GET', '/imagestudio')
      assert.match(page.text, /仍然出图/)
      assert.match(page.text, /PLAN_REJECTED/)
      assert.match(page.text, /force\s*=\s*true|payload\.force/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-TL-20 workbench plan aspect matches istudio_skill_plan', async () => {
    const { dir, host } = await withHost()
    try {
      const brief = '明代夜审账房放榜'
      const viaTool = (await host.tools.call('istudio_skill_plan', {
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
      assert.ok(out.images?.[0]?.path)
      const listed = await host.web.fetch('GET', '/imagestudio/api/assets')
      const text = listed.text
      assert.match(text, /shot-|studio/)
      const viaTool = await host.tools.call('istudio_assets', {})
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

  it('DOC02 pages: top tabs 生图/视频/动图/反推/无限画布/UI设计/我的素材/电商/模板库/设置', async () => {
    const { dir, host } = await withHost()
    try {
      const res = await host.web.fetch('GET', '/imagestudio')
      assert.equal(res.status, 200)
      for (const label of ['生图', '视频', '动图', '反推', '无限画布', 'UI 设计', '我的素材', '电商', '模板库', '设置']) {
        assert.match(res.text, new RegExp(label))
      }
      for (const page of ['gen', 'video', 'gif', 'reverse', 'canvas', 'uidesign', 'assets', 'ecom', 'tpl', 'settings']) {
        assert.match(res.text, new RegExp(`data-page="${page}"`))
      }
      assert.doesNotMatch(res.text, /data-page="gallery"/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('DOC02 ratios are the fixed 9 in order', async () => {
    const { dir, host } = await withHost()
    try {
      const res = await host.web.fetch('GET', '/imagestudio')
      const order = ['自动', '1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '3:2', '21:9']
      const m = res.text.match(/RATIOS\s*=\s*\[([^\]]+)\]/)
      assert.ok(m, 'RATIOS constant missing')
      const listed = [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1])
      assert.deepEqual(listed, order)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('DOC02 score never disables 就这样出图', async () => {
    const { dir, host } = await withHost()
    try {
      const res = await host.web.fetch('GET', '/imagestudio')
      assert.match(res.text, /就这样出图/)
      assert.doesNotMatch(res.text, /低于 82 分不出图/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('DOC03 redline: generate without any skill', async () => {
    const { dir, host } = await withHost()
    try {
      const mock = host.ctx.imagegen.resolve('mock') as { calls: number }
      const before = mock.calls
      const gen = await host.web.fetch(
        'POST',
        '/imagestudio/api/generate',
        JSON.stringify({ prompt: '一只青瓷茶盏放在账房桌上', aspectRatio: '1:1', n: 1 }),
      )
      assert.equal(gen.status, 200)
      const out = gen.json as { images?: unknown[]; blocked?: boolean; error?: string }
      assert.notEqual(out.blocked, true)
      assert.ok(Array.isArray(out.images) && out.images.length >= 1, JSON.stringify(out))
      assert.ok(mock.calls > before)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('DOC03 upload over 10MB is 413', async () => {
    const { dir, host } = await withHost()
    try {
      const data = Buffer.alloc(10 * 1024 * 1024 + 8, 7).toString('base64')
      const res = await host.web.fetch(
        'POST',
        '/imagestudio/api/upload',
        JSON.stringify({ filename: 'too-big.png', mime: 'image/png', data }),
      )
      assert.equal(res.status, 413)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('DOC03 redline page: no 我不能生成, negatives editable, button not score-gated', async () => {
    const { dir, host } = await withHost()
    try {
      const res = await host.web.fetch('GET', '/imagestudio')
      assert.doesNotMatch(res.text, /这个我不能生成/)
      assert.doesNotMatch(res.text, /低于 82/)
      assert.match(res.text, /就这样出图/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('assets: generated listing + search + type filter + pagination', async () => {
    const { dir, host } = await withHost()
    try {
      await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ prompt: 'asset listing probe', aspectRatio: '1:1', n: 2 }))
      const all = await host.web.fetch('GET', '/imagestudio/api/assets')
      assert.equal(all.status, 200)
      const body = all.json as { images: Array<{ path: string; kind: string; sha256: string }>; total: number; offset: number; limit: number }
      assert.ok(body.total >= 2)
      assert.ok(body.images.every((i) => i.kind === 'generated'))
      assert.ok(body.images[0].sha256, 'page slice carries sha256')
      const genOnly = await host.web.fetch('GET', '/imagestudio/api/assets?type=generated')
      assert.ok((genOnly.json as { total: number }).total >= 2)
      const upOnly = await host.web.fetch('GET', '/imagestudio/api/assets?type=uploaded')
      assert.equal((upOnly.json as { total: number }).total, 0)
      const q = await host.web.fetch('GET', '/imagestudio/api/assets?q=shot-1')
      assert.ok((q.json as { total: number }).total >= 1)
      const paged = await host.web.fetch('GET', '/imagestudio/api/assets?offset=1&limit=1')
      const pb = paged.json as { images: unknown[]; total: number; offset: number; limit: number }
      assert.equal(pb.images.length, 1)
      assert.equal(pb.offset, 1)
      assert.ok(pb.total >= 2)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('assets upload/rename/delete round-trip, all guarded by workspace assert', async () => {
    const { dir, host } = await withHost()
    try {
      // 上传（base64 JSON 与 multipart 同通路）
      const png = Buffer.from('89504e470d0a1a0a' + '00'.repeat(64), 'hex').toString('base64')
      const up = await host.web.fetch(
        'POST',
        '/imagestudio/api/assets/upload',
        JSON.stringify({ filename: '我的素材.png', mime: 'image/png', data: png }),
      )
      assert.equal(up.status, 200, up.text)
      const upBody = up.json as { ok: boolean; path: string }
      assert.ok(upBody.ok)
      assert.match(upBody.path, /^\.dsh\/image-studio\/uploads\//)
      // 上传后进入 uploaded 筛选
      const ups = await host.web.fetch('GET', '/imagestudio/api/assets?type=uploaded')
      assert.equal((ups.json as { total: number }).total, 1)
      // 重命名
      const ren = await host.web.fetch(
        'POST',
        '/imagestudio/api/assets/rename',
        JSON.stringify({ path: upBody.path, name: '改名后.png' }),
      )
      assert.equal(ren.status, 200, ren.text)
      const renBody = ren.json as { ok: boolean; path: string }
      assert.match(renBody.path, /改名后\.png$/)
      // 越界路径一律 403
      const esc = await host.web.fetch(
        'POST',
        '/imagestudio/api/assets/rename',
        JSON.stringify({ path: '../outside.png', name: 'x.png' }),
      )
      assert.equal(esc.status, 403)
      const escDel = await host.web.fetch(
        'POST',
        '/imagestudio/api/assets/delete',
        JSON.stringify({ paths: ['../outside.png'] }),
      )
      assert.equal(escDel.status, 403)
      // 删除
      const del = await host.web.fetch(
        'POST',
        '/imagestudio/api/assets/delete',
        JSON.stringify({ paths: [renBody.path, renBody.path] }),
      )
      const delBody = del.json as { deleted: number; missing: string[] }
      assert.equal(delBody.deleted, 1)
      assert.equal(delBody.missing.length, 1)
      const after = await host.web.fetch('GET', '/imagestudio/api/assets?type=uploaded')
      assert.equal((after.json as { total: number }).total, 0)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('assets upload over 10MB is 413', async () => {
    const { dir, host } = await withHost()
    try {
      const data = Buffer.alloc(10 * 1024 * 1024 + 8, 7).toString('base64')
      const res = await host.web.fetch(
        'POST',
        '/imagestudio/api/assets/upload',
        JSON.stringify({ filename: 'too-big.png', mime: 'image/png', data }),
      )
      assert.equal(res.status, 413)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('assets zip download: attachment header + PK payload + path guard', async () => {
    const { dir, host } = await withHost()
    try {
      const gen = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ prompt: 'zip probe', n: 1 }))
      const path = (gen.json as { images: Array<{ path: string }> }).images[0].path
      const res = await host.web.fetch('GET', '/imagestudio/api/assets/zip?paths=' + encodeURIComponent(path))
      assert.equal(res.status, 200)
      assert.match(res.type, /application\/zip/)
      assert.match(res.headers['content-disposition'] ?? '', /attachment/)
      assert.match(res.headers['content-disposition'] ?? '', /imagestudio-assets\.zip/)
      assert.ok(res.text.startsWith('PK'), 'zip payload must start with PK')
      const bad = await host.web.fetch('GET', '/imagestudio/api/assets/zip?paths=' + encodeURIComponent('../etc/passwd'))
      assert.equal(bad.status, 403)
      const empty = await host.web.fetch('GET', '/imagestudio/api/assets/zip')
      assert.equal(empty.status, 400)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('gif two-step: /api/gif returns frameList, /api/gif/recode re-encodes subset with delay/loop', async () => {
    const { dir, host } = await withHost()
    try {
      const gen = await host.web.fetch(
        'POST',
        '/imagestudio/api/gif',
        JSON.stringify({ prompt: 'gif frames probe', n: 3, aspectRatio: '1:1', durationSec: 1 }),
      )
      assert.equal(gen.status, 200, gen.text)
      const body = gen.json as { frames: number; frameList: Array<{ path: string }> }
      assert.ok(body.frames >= 2)
      assert.ok(Array.isArray(body.frameList) && body.frameList.length === body.frames)
      const recode = await host.web.fetch(
        'POST',
        '/imagestudio/api/gif/recode',
        JSON.stringify({ frames: body.frameList.slice(0, 2).map((f) => f.path), delayMs: 100, loop: 2 }),
      )
      assert.equal(recode.status, 200, recode.text)
      const out = recode.json as { path: string; mime: string; frames: number; delayMs: number; loop: number }
      assert.equal(out.mime, 'image/gif')
      assert.equal(out.frames, 2)
      assert.equal(out.delayMs, 100)
      assert.equal(out.loop, 2)
      const file = await host.web.fetch('GET', '/imagestudio/api/file?path=' + encodeURIComponent(out.path))
      assert.match(file.type, /image\/gif/)
      const esc = await host.web.fetch('POST', '/imagestudio/api/gif/recode', JSON.stringify({ frames: ['../etc/passwd'] }))
      assert.equal(esc.status, 403)
      const none = await host.web.fetch('POST', '/imagestudio/api/gif/recode', JSON.stringify({ frames: [] }))
      assert.equal(none.status, 400)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('describe accepts providerId for the reverse tab channel picker', async () => {
    const { dir, host } = await withHost()
    try {
      const up = await host.web.fetch(
        'POST',
        '/imagestudio/api/upload',
        JSON.stringify({ filename: 'rev.png', mime: 'image/png', data: Buffer.from('89504e47' + '00'.repeat(32), 'hex').toString('base64') }),
      )
      const path = (up.json as { path: string }).path
      const res = await host.web.fetch(
        'POST',
        '/imagestudio/api/describe',
        JSON.stringify({ assets: [path], providerId: 'mock', instruction: '简洁描述' }),
      )
      assert.equal(res.status, 200, res.text)
      assert.ok((res.json as { text: string }).text)
      const bad = await host.web.fetch(
        'POST',
        '/imagestudio/api/describe',
        JSON.stringify({ assets: [path], providerId: 'no-such-channel' }),
      )
      assert.equal(bad.status, 400)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
