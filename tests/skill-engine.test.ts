import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSkills } from '../packages/skills/src/load.ts'
import { compilePlan, countChangedDimensions, staticCheck } from '../packages/skills/src/compile.ts'
import { createPipeline, installBuiltinHooks, runGenerate } from '../packages/core/src/pipeline.ts'
import { MockImageProvider } from '../packages/provider-mock/src/index.ts'
import { assertInsideWorkspace } from '../packages/assets/src/paths.ts'
import { PathEscapeError } from '../packages/core/src/errors.ts'
import { ImageEventBus } from '../packages/core/src/events.ts'
import { TOOL_NAMES } from '../packages/tools/src/tools.ts'
import { toolDocs } from '../packages/tools/src/index.ts'
import { composeTriptych, overlayTitle, readEmbeddedTitle, encodePng, createSolid } from '../packages/compose/src/index.ts'
import { AssetStore } from '../packages/assets/src/store.ts'
import { assertProviderConfig, redactSecrets } from '../packages/core/src/config.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('AC-TL tool contract', () => {
  it('AC-TL-01 tool count <= 6', () => {
    assert.ok(TOOL_NAMES.length <= 6)
    assert.equal(toolDocs.length, TOOL_NAMES.length)
  })

  it('AC-TL-09 consistent parameter names', () => {
    const blob = JSON.stringify(toolDocs)
    for (const banned of ['negativePrompt', 'batchSize', 'width/height', '"model"']) {
      assert.equal(blob.includes(banned), false, banned)
    }
  })
})

describe('AC-EV events', () => {
  it('AC-EV-01 observer that calls next() keeps the chain', async () => {
    const bus = new ImageEventBus()
    const seen: string[] = []
    bus.on('image/before-request', async (req: { prompt: string }, next: (r?: { prompt: string }) => Promise<{ prompt: string }>) => {
      seen.push('obs')
      return next({ prompt: req.prompt + '|patched' })
    })
    const out = await bus.waterfall('image/before-request', { prompt: 'a' })
    assert.equal(out.prompt, 'a|patched')
    assert.deepEqual(seen, ['obs'])
  })

  it('AC-EV-02 missing next() is a hard failure', async () => {
    const bus = new ImageEventBus()
    bus.on('image/before-request', async () => {
      /* forgot next */
    })
    await assert.rejects(() => bus.waterfall('image/before-request', { prompt: 'a' }), /did not call next/)
  })

  it('AC-EV-04 serial first winner', async () => {
    const bus = new ImageEventBus()
    bus.on('image/score', async () => ({ score: 90, passed: true, failures: [] }))
    bus.on('image/score', async () => ({ score: 10, passed: false, failures: ['second'] }))
    const card = await bus.serial('image/score', {})
    assert.deepEqual(card, { score: 90, passed: true, failures: [] })
  })
})

describe('AC-SK skill engine', () => {
  it('AC-SK-01/02 loads legal skills and rejects id mismatch', async () => {
    const skills = await loadSkills(skillsDir)
    const ids = skills.map((s) => s.preset.id).sort()
    assert.ok(ids.includes('cinema-dna-21x9x3'))
    assert.ok(ids.includes('life-force-portrait'))
  })

  it('AC-SK-03 planFields filled', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '明代科举舞弊案')
    for (const field of skills[0].preset.planFields) {
      assert.ok(plan.reasoning[field], field)
    }
    assert.equal(plan.selfCheck.passed, true)
  })

  it('AC-SK-04 banned terms stripped', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], 'a cinematic beautiful mysterious scene')
    for (const shot of plan.shots) {
      assert.equal(/\b(cinematic|beautiful|mysterious)\b/i.test(shot.prompt), false)
    }
  })

  it('AC-SK-05 rewrite cap is 2', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], 'brief', { forceFailScore: true, maxRewrites: 2 })
    assert.equal(plan.selfCheck.passed, false)
    assert.ok(plan.selfCheck.failures.length)
  })

  it('AC-SK-10 aspect lock 21:9 ignores user 16:9', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '生成三联 16:9')
    assert.equal(plan.mode, 'triptych')
    for (const shot of plan.shots) assert.equal(shot.aspectRatio, '21:9')
  })

  it('AC-SK-11 negativePatch injected verbatim', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '明代科举')
    const patch = skills[0].preset.constraints.negativePatch
    for (const item of patch.split(',').map((s) => s.trim()).filter(Boolean)) {
      assert.ok(plan.shots[0].negative.includes(item), item)
    }
  })

  it('AC-SK-12 analysis-only strips refImages before provider', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '明代科举')
    const p = createPipeline()
    installBuiltinHooks(p)
    const mock = new MockImageProvider()
    p.registry.register('mock', mock)
    await runGenerate(p, {
      prompt: 'x',
      aspectRatio: '16:9',
      n: 1,
      refUsage: 'analysis-only',
      refImages: [{ path: 'ref.png', width: 1, height: 1, mime: 'image/png', sha256: '0' }],
      plan,
    })
    assert.equal(mock.lastRequest?.refImages?.length ?? 0, 0)
    assert.equal(mock.lastRequest?.aspectRatio, '21:9')
  })

  it('AC-SK-13 poster 3:4 and required phrase', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '请做片名海报', { wantPoster: true })
    assert.equal(plan.mode, 'poster')
    assert.equal(plan.shots[0].aspectRatio, '3:4')
    assert.ok(plan.shots[0].prompt.includes('3:4 vertical poster composition'))
  })

  it('AC-SK-14 poster not auto-triggered by 三联', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '生成三联')
    assert.equal(plan.mode, 'triptych')
  })

  it('AC-SK-15 perShotLimits', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '明代科举')
    for (const shot of plan.shots) {
      assert.ok((shot.sceneFacts?.length ?? 0) <= 3)
      assert.ok(shot.primaryAction)
      assert.equal(shot.lightSources?.length, 1)
      assert.equal(shot.compositionMechanisms?.length, 1)
    }
  })

  it('AC-SK-16 variation >= 4', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '明代科举')
    const changed = countChangedDimensions(plan.shots, skills[0].preset.variationRules!.dimensions)
    assert.ok(changed >= 4, `changed=${changed}`)
  })

  it('AC-SK-17 score below threshold does not call provider', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '明代科举', { forceFailScore: true })
    const p = createPipeline()
    installBuiltinHooks(p)
    const mock = new MockImageProvider()
    p.registry.register('mock', mock)
    const out = await runGenerate(p, {
      prompt: plan.shots[0].prompt,
      aspectRatio: plan.shots[0].aspectRatio,
      n: 1,
      refUsage: 'analysis-only',
      plan,
    })
    assert.equal(mock.calls, 0)
    assert.equal('passed' in out && out.passed, false)
  })

  it('AC-SK-18 veto overrides score', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '明代科举', { forceVeto: '明显 CG / 游戏宣传图' })
    assert.equal(plan.selfCheck.passed, false)
    assert.ok(plan.selfCheck.veto)
  })

  it('brief that asks for 游戏宣传图 fails before generate', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const plan = compilePlan(skills[0], '做成游戏宣传图，要过度油腻 AI 光效。')
    assert.equal(plan.selfCheck.passed, false)
    assert.ok((plan.selfCheck.score ?? 0) < 82)
  })

  it('AC-SK-19 life-force MODE A keeps identity', async () => {
    const skills = await loadSkills(skillsDir, ['life-force-portrait'])
    const plan = compilePlan(skills[0], 'MODE A 升级这张生活照，保留人物身份')
    assert.equal(plan.mode, 'mode-a')
    assert.equal(plan.constraints.referenceImages.usage, 'image-to-image')
    assert.match(plan.reasoning['保留人物身份'], /保留人物身份/)
  })

  it('AC-SK-20 texture layers <= 2', async () => {
    const skills = await loadSkills(skillsDir, ['life-force-portrait'])
    const plan = compilePlan(skills[0], '夏日儿童逆光')
    const terms = ['caustics', 'chromatic aberration', 'swirl bokeh', 'motion blur']
    for (const shot of plan.shots) {
      const n = terms.filter((t) => shot.prompt.toLowerCase().includes(t)).length
      assert.ok(n <= 2, shot.prompt)
    }
  })

  it('AC-SK-31/32 character descriptor injected without wiping action', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const descriptor =
      'mid-thirties East Asian man, close-cropped hair, weathered face, faded indigo cotton robe with worn cuffs'
    const plan = compilePlan(skills[0], '明代科举', {
      characters: [{ id: 'lead-01', role: '主角', descriptor, consistencyAnchors: ['hair', 'costume'] }],
    })
    for (const shot of plan.shots) {
      assert.ok(shot.prompt.includes(descriptor))
      assert.ok(shot.prompt.includes('primary action:'))
    }
  })
})

describe('AC-SEC / AC-AS / config', () => {
  it('AC-SEC-06 path escape', () => {
    assert.throws(() => assertInsideWorkspace('/tmp/ws', '../../etc/passwd'), PathEscapeError)
  })

  it('AC-SEC-02 redactSecrets strips key fields', () => {
    const out = redactSecrets({ apiKey: 'sk-live-not-real', model: 'image-2' })
    assert.deepEqual(out.apiKey, { path: 'apiKey', set: true })
    assert.equal(out.model, 'image-2')
  })

  it('AC-LC-06 missing apiKeyEnv fails loudly', () => {
    assert.throws(() => assertProviderConfig({ id: 'x', protocol: 'mock', model: 'm' }), /apiKeyEnv/)
  })

  it('AC-AS-08/09 triptych join', () => {
    const mk = (h: number) => encodePng(createSolid(210, h, [40, 40, 40, 255]))
    const out = composeTriptych([mk(90), mk(90), mk(90)], { gapPx: 10, ratios: '1.2:0.9:0.9' })
    assert.equal(out.gapPx, 10)
    const sum = out.heights.reduce((a, b) => a + b, 0)
    const r0 = out.heights[0] / sum
    const expect = 1.2 / (1.2 + 0.9 + 0.9)
    assert.ok(Math.abs(r0 - expect) < 0.01)
  })

  it('AC-AS-10 text overlay preserves exact title', () => {
    const png = encodePng(createSolid(320, 120, [10, 10, 10, 255]))
    const stamped = overlayTitle(png, '科举舞弊')
    assert.equal(readEmbeddedTitle(stamped.png), '科举舞弊')
  })

  it('AC-AS-03 index rebuild', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-'))
    try {
      const store = new AssetStore({ workspaceRoot: dir, keepLastTasks: 3 })
      await store.writePlan('s', 't1', {
        id: 't1',
        skillId: 'x',
        skillVersion: '0',
        mode: 'm',
        reasoning: {},
        shots: [],
        constraints: { referenceImages: { usage: 'analysis-only' }, negativePatch: '' },
        selfCheck: { score: 90, passed: true, failures: [] },
        brief: 'b',
      })
      await store.rebuildIndex()
      const { unlink } = await import('node:fs/promises')
      await unlink(join(dir, '.dsh/image-studio/index.json'))
      const index = await store.readIndex()
      assert.ok(index.s.includes('t1'))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
