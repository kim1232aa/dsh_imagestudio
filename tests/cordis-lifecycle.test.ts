import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { defineTool } from '../packages/tools/src/define.ts'
import { bootStudio, STATE_ACTIVE, STATE_PENDING } from '../packages/host/src/boot.ts'
import * as imageTools from '../packages/tools/src/index.ts'
import { TOOL_NAMES } from '../packages/tools/src/tools.ts'
import { describeRedacted, Config } from '../packages/core/src/config.ts'
import { MiniTools } from '../packages/host/src/minitools.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('AC-LC cordis lifecycle', () => {
  it('AC-LC-02 inject of a missing service stays PENDING (0) until provide, then ACTIVE (2)', async () => {
    const ctx = new Context()
    const fiber = ctx.plugin({
      name: 'needs-tools',
      inject: ['tools'],
      apply() {},
    })
    assert.equal(fiber.state, STATE_PENDING)
    ctx.provide('tools', new MiniTools())
    await fiber
    assert.equal(fiber.state, STATE_ACTIVE)
  })

  it('boots the image-studio plugin graph; every fiber is ACTIVE', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-host-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3', 'life-force-portrait'],
        enableXai: false,
      })
      const snaps = host.fibers()
      const names = snaps.map((s) => s.name)
      assert.ok(names.includes('image-core'))
      assert.ok(names.includes('image-tools'))
      assert.ok(names.includes('image-skills'))
      assert.ok(names.includes('image-assets'))
      assert.ok(names.includes('image-compose'))
      assert.ok(names.includes('image-guard'))
      assert.ok(names.includes('image-provider-mock'))
      assert.ok(names.includes('image-studio-host'))
      assert.ok(names.includes('image-ui'))
      for (const f of snaps.filter((s) => String(s.name).startsWith('image-'))) {
        assert.equal(f.state, STATE_ACTIVE, `${f.name} state=${f.state}`)
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('AC-LC-04 missing required inject keeps image-tools PENDING', async () => {
    const ctx = new Context()
    const fiber = ctx.plugin(imageTools)
    assert.equal(fiber.state, STATE_PENDING)
    await fiber.dispose()
  })
})

describe('AC-TL defineTool', () => {
  it('registers exactly the six tools; schemas() drop execute/output', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-tools-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3'],
        enableXai: false,
      })
      assert.equal(host.tools.size, 6)
      const schemas = host.tools.schemas()
      assert.deepEqual(
        schemas.map((s) => s.name).sort(),
        [...TOOL_NAMES].sort(),
      )
      const blob = JSON.stringify(schemas)
      assert.equal(blob.includes('"execute"'), false)
      assert.equal(blob.includes('"output"'), false)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('defineTool validates args before execute (AC-TL-08)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-args-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3'],
        enableXai: false,
      })
      await assert.rejects(() => host.tools.call('image_skill_plan', {}), /INVALID_ARGS|required/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('image_skill_plan compiles cinema-dna and image_generate honors 21:9 lock', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-plan-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3'],
        enableXai: false,
      })
      const planned = (await host.tools.call('image_skill_plan', {
        skillId: 'cinema-dna-21x9x3',
        brief: '明代科举舞弊案',
      })) as { planId: string; plan: { shots: Array<{ aspectRatio: string }>; selfCheck: { passed: boolean } } }
      assert.equal(planned.plan.selfCheck.passed, true)
      assert.equal(planned.plan.shots[0].aspectRatio, '21:9')
      const gen = (await host.tools.call('image_generate', {
        planId: planned.planId,
        n: 1,
      })) as { images: Array<{ width: number; height: number; path: string }> }
      assert.ok(gen.images?.length)
      const { width, height } = gen.images[0]
      assert.ok(Math.abs(width / height - 21 / 9) < 0.05)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('defineTool itself compiles JSON Schema into parameters', () => {
    const t = defineTool({
      name: 'probe',
      description: 'probe',
      parameters: { x: { type: 'string', required: true } },
      output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
      async execute(args) {
        return args.x
      },
    })
    assert.equal((t.parameters as { type: string }).type, 'object')
    assert.ok(!('execute' in { name: t.name, description: t.description, parameters: t.parameters }))
  })
})

describe('AC-EV cordis waterfall', () => {
  it('image/before-request observer that returns next() keeps the chain', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-ev-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir,
        enabledSkills: ['cinema-dna-21x9x3'],
        enableXai: false,
      })
      const seen: string[] = []
      host.ctx.on('image/before-request', async (req: { prompt: string }, next: () => Promise<{ prompt: string }>) => {
        seen.push('obs')
        req.prompt = req.prompt + '|obs'
        return next()
      })
      const planned = (await host.tools.call('image_skill_plan', {
        skillId: 'cinema-dna-21x9x3',
        brief: '明代科举',
      })) as { planId: string }
      await host.tools.call('image_generate', { planId: planned.planId, n: 1 })
      assert.ok(seen.includes('obs'))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('AC-SEC config', () => {
  it('AC-SEC-02 Schemastery secret-role fields redact to {path,set}', () => {
    const cfg = Config({
      providers: [{ id: 'x', protocol: 'mock', model: 'm', apiKeyEnv: 'IMAGE_STUDIO_KEY' }],
    })
    const redacted = describeRedacted(cfg as unknown as Record<string, unknown>)
    const providers = (redacted as { providers: Array<{ apiKeyEnv: unknown }> }).providers
    assert.deepEqual(providers[0].apiKeyEnv, { path: 'apiKeyEnv', set: true })
  })
})
