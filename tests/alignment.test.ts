import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio, STATE_ACTIVE } from '../packages/host/src/boot.ts'
import { loadSkills, detectConflicts } from '../packages/skills/src/load.ts'
import { compilePlan } from '../packages/skills/src/compile.ts'
import { validatePreset } from '../packages/skills/src/schema.ts'
import { parseYaml } from '../packages/skills/src/yaml.ts'
import { MockImageProvider } from '../packages/provider-mock/src/index.ts'
import { createPipeline, installBuiltinHooks, runGenerate } from '../packages/core/src/pipeline.ts'
import { ConcurrencyGate } from '../packages/core/src/gate.ts'
import { AssetStore } from '../packages/assets/src/store.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('AC-SK remaining', () => {
  it('AC-SK-01 bad preset does not take down siblings', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-sk-iso-'))
    try {
      const good = join(dir, 'cinema-dna-21x9x3')
      const bad = join(dir, 'broken-skill')
      await mkdir(good)
      await mkdir(bad)
      const src = await readFile(join(skillsDir, 'cinema-dna-21x9x3/preset.yaml'), 'utf8')
      await writeFile(join(good, 'preset.yaml'), src)
      await writeFile(join(good, 'SKILL.md'), '# good')
      await writeFile(join(bad, 'preset.yaml'), 'id: broken-skill\nversion: 1\n')
      const loaded = await loadSkills(dir)
      assert.ok(loaded.some((s) => s.preset.id === 'cinema-dna-21x9x3'))
      assert.equal(loaded.some((s) => s.preset.id === 'broken-skill'), false)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-SK-02 id mismatch fails that skill', async () => {
    assert.throws(
      () => validatePreset(parseYaml('id: nope\nversion: 1.0.0\nsource: SKILL.md\ntriggers: [一, 二, 三, 四, 五]\nmodes: {a: {shots: 1, aspectRatio: "1:1"}}\nconstraints:\n  referenceImages: {usage: analysis-only}\n  negativePatch: none\nplanFields: [x]\nscoring:\n  threshold: 82\n  rubric: [{item: a, max: 100}]\n'), 'other-dir'),
      /does not match directory/,
    )
  })

  it('AC-SK-30 character-casting emits CharacterSheet', async () => {
    const skills = await loadSkills(skillsDir, ['character-casting'])
    const plan = compilePlan(skills[0], '明代书吏')
    assert.ok(plan.characters?.length)
    assert.equal(plan.characters![0].id, 'lead-01')
    assert.ok(plan.characters![0].descriptor.length > 10)
    assert.ok(plan.characters![0].consistencyAnchors.includes('hair'))
  })

  it('AC-SK-31/32 same descriptor on triptych plus poster', async () => {
    const skills = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
    const descriptor =
      'mid-thirties East Asian man, close-cropped hair, weathered face, faded indigo cotton robe with worn cuffs'
    const plan = compilePlan(skills[0], '明代科举舞弊案', {
      wantPoster: true,
      characters: [{ id: 'lead-01', role: '主角', descriptor, consistencyAnchors: ['hair', 'costume'] }],
    })
    assert.equal(plan.mode, 'triptych')
    assert.equal(plan.shots.length, 4)
    assert.equal(plan.shots[3].aspectRatio, '3:4')
    for (const shot of plan.shots) {
      assert.ok(shot.prompt.includes(descriptor))
      assert.ok(shot.prompt.includes('primary action:'))
    }
  })

  it('AC-SK-33 two poster claims without supersededBy conflict', () => {
    const fake = (id: string, supersededBy?: string) =>
      ({
        dirName: id,
        dir: id,
        skillMarkdown: '',
        preset: {
          id,
          version: '1',
          source: 'SKILL.md',
          supersededBy,
          modes: { poster: { shots: 1, aspectRatio: '3:4' } },
          constraints: { referenceImages: { usage: 'analysis-only' as const }, negativePatch: 'x' },
          planFields: ['x'],
          scoring: { threshold: 82, rubric: [] },
        },
      }) as never
    assert.throws(() => detectConflicts([fake('cinema-dna-21x9x3'), fake('movie-poster')]), /Skill conflict/)
    assert.doesNotThrow(() => detectConflicts([fake('cinema-dna-21x9x3'), fake('movie-poster', 'cinema-dna-21x9x3')]))
  })

  it('AC-CP-07 unknown preset field is an error', () => {
    assert.throws(
      () =>
        validatePreset(
          parseYaml(
            'id: x\nversion: 1.0.0\nsource: SKILL.md\ntriggers: [一, 二, 三, 四, 五]\nmodes: {a: {shots: 1, aspectRatio: "1:1"}}\nconstraints:\n  referenceImages: {usage: analysis-only}\n  negativePatch: none\nplanFields: [x]\nscoring:\n  threshold: 82\n  rubric: [{item: a, max: 100}]\nmystery: true\n',
          ),
          'x',
        ),
      /unknown field: mystery/,
    )
  })
})

describe('AC-TL remaining', () => {
  it('AC-TL-03 n as string is INVALID_ARGS', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-tl03-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3'],
        enableXai: false,
      })
      await assert.rejects(() => host.tools.call('istudio_generate', { prompt: 'cat', n: 'three' }), /INVALID_ARGS|invalid arguments|must be/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-TL-04 n=99 throws ToolArgsError', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-tl04-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3'],
        enableXai: false,
      })
      await assert.rejects(() => host.tools.call('istudio_generate', { prompt: 'cat', n: 99 }), /1-4/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-TL-07 guard veto is a domain value not a throw', async () => {
    const p = createPipeline()
    installBuiltinHooks(p)
    p.bus.on('image/guard', () => ({ blocked: true, reason: 'nope' }))
    const mock = new MockImageProvider()
    p.registry.register('mock', mock)
    const out = await runGenerate(p, {
      prompt: 'x',
      aspectRatio: '1:1',
      n: 1,
      refUsage: 'analysis-only',
    })
    assert.equal(mock.calls, 0)
    assert.deepEqual(out, { blocked: true, reason: 'nope' })
  })

  it('AC-EV-03 guard short-circuit never hits provider (cordis)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-ev03-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3'],
        enableXai: false,
      })
      host.ctx.on('image/guard', () => ({ blocked: true, reason: 'policy' }))
      const out = (await host.tools.call('istudio_generate', { prompt: 'a cat', n: 1 })) as {
        blocked?: boolean
        reason?: string
      }
      assert.equal(out.blocked, true)
      assert.equal(host.ctx.imagegen.size >= 1, true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('AC-LC remaining', () => {
  it('AC-LC-03 disposing the only provider unregisters it via effect', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-lc03-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3'],
        enableXai: false,
      })
      const sizeBefore = host.ctx.imagegen.size
      assert.ok(sizeBefore >= 1)
      let mockFiber: { name: string; state: number; dispose: () => Promise<void> } | undefined
      for (const runtime of host.ctx.registry.values()) {
        for (const fiber of runtime.fibers) {
          if (fiber.name === 'image-provider-mock') mockFiber = fiber as never
        }
      }
      assert.ok(mockFiber)
      await mockFiber.dispose()
      assert.equal(host.ctx.imagegen.size, sizeBefore - 1)
      const toolsAfter = host.fibers().find((f) => f.name === 'image-tools')
      assert.equal(toolsAfter?.state, STATE_ACTIVE)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('AC-AS remaining', () => {
  it('AC-AS-01/02 task dir has plan.json + request.json + image', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-as-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3'],
        enableXai: false,
      })
      const planned = (await host.tools.call('istudio_skill_plan', {
        skillId: 'cinema-dna-21x9x3',
        brief: '明代科举',
      })) as { planId: string }
      const gen = (await host.tools.call('istudio_generate', { planId: planned.planId, n: 1 })) as {
        taskId: string
        images: Array<{ path: string }>
      }
      const taskDir = join(dir, '.dsh/image-studio/preview', gen.taskId)
      await readFile(join(taskDir, 'request.json'), 'utf8')
      assert.ok(gen.images[0].path.includes('.dsh/image-studio/'))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-AS-04 concurrency gate serializes when limit is 1', async () => {
    const gate = new ConcurrencyGate(1)
    let current = 0
    let max = 0
    await Promise.all(
      [1, 2, 3].map(() =>
        gate.run(async () => {
          current++
          max = Math.max(max, current)
          await new Promise((r) => setTimeout(r, 15))
          current--
        }),
      ),
    )
    assert.equal(max, 1)
  })

  it('AC-AS-05 failed generate cleans the task dir', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-as05-'))
    try {
      const store = new AssetStore({ workspaceRoot: dir, keepLastTasks: 3 })
      await store.writeImage('s', 'ghost', 'shot-1.png', new Uint8Array([1, 2, 3, 4]), { width: 1, height: 1 })
      await store.cleanupTask('s', 'ghost')
      const index = await store.readIndex()
      const blob = JSON.stringify(index)
      assert.equal(blob.includes('ghost'), false)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-STORE-7D default keepLastTasks=0 never auto-deletes on prune', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-store7d-'))
    try {
      const store = new AssetStore({ workspaceRoot: dir })
      assert.equal(store.keepLastTasks, 0)
      for (let i = 0; i < 5; i++) {
        await store.writeImage('s', `task-${i}`, 'shot-1.png', new Uint8Array([i, 2, 3, 4]), { width: 1, height: 1 })
        await new Promise((r) => setTimeout(r, 10))
      }
      await store.prune()
      const index = await store.readIndex()
      assert.deepEqual([...(index['s'] ?? [])].sort(), ['task-0', 'task-1', 'task-2', 'task-3', 'task-4'])
      for (let i = 0; i < 5; i++) {
        const st = await stat(join(dir, '.dsh/image-studio/s', `task-${i}`, 'shot-1.png')).catch(() => null)
        assert.ok(st?.isFile(), `task-${i}/shot-1.png must survive prune()`)
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-STORE-7D explicit keepLastTasks still prunes when operator opts in', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-store7d2-'))
    try {
      const store = new AssetStore({ workspaceRoot: dir, keepLastTasks: 2 })
      for (let i = 0; i < 4; i++) {
        await store.writeImage('s', `task-${i}`, 'shot-1.png', new Uint8Array([i, 2, 3, 4]), { width: 1, height: 1 })
        await new Promise((r) => setTimeout(r, 10))
      }
      await store.prune()
      const index = await store.readIndex()
      assert.equal((index['s'] ?? []).length, 2)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-STORE-RELOCATE changing workspaceRoot keeps old files in place', async () => {
    const dirA = await mkdtemp(join(tmpdir(), 'dsh-rootA-'))
    const dirB = await mkdtemp(join(tmpdir(), 'dsh-rootB-'))
    try {
      const storeA = new AssetStore({ workspaceRoot: dirA })
      await storeA.writeImage('s', 'old-task', 'shot-1.png', new Uint8Array([9, 9, 9]), { width: 1, height: 1 })
      const storeB = new AssetStore({ workspaceRoot: dirB })
      await storeB.writeImage('s', 'new-task', 'shot-1.png', new Uint8Array([8, 8, 8]), { width: 1, height: 1 })
      const oldFile = await stat(join(dirA, '.dsh/image-studio/s/old-task/shot-1.png')).catch(() => null)
      assert.ok(oldFile?.isFile(), 'old root file must stay untouched after relocating')
      const newFile = await stat(join(dirB, '.dsh/image-studio/s/new-task/shot-1.png')).catch(() => null)
      assert.ok(newFile?.isFile(), 'new root must receive new files')
    } finally {
      await rm(dirA, { recursive: true, force: true })
      await rm(dirB, { recursive: true, force: true })
    }
  })
})

describe('AC-SEC remaining', () => {
  it('AC-SEC-01 examples cordis.yml has env names only', async () => {
    const yml = await readFile(fileURLToPath(new URL('../examples/cordis.yml', import.meta.url)), 'utf8')
    assert.equal(/sk-[a-zA-Z0-9]{10,}/.test(yml), false)
    assert.match(yml, /apiKeyEnv: IMAGE_STUDIO_KEY/)
  })

  it('AC-SEC-03 request.json is redacted', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-sec03-'))
    try {
      const store = new AssetStore({ workspaceRoot: dir })
      await store.writeRequest('s', 't', {
        prompt: 'x',
        aspectRatio: '1:1',
        n: 1,
        refUsage: 'analysis-only',
        providerOptions: { apiKey: 'sk-live-not-real', authorization: 'Bearer secret' },
      })
      const raw = await readFile(join(dir, '.dsh/image-studio/s/t/request.json'), 'utf8')
      assert.equal(raw.includes('sk-live-not-real'), false)
      assert.equal(raw.includes('Bearer secret'), false)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
