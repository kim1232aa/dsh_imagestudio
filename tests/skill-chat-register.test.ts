import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import * as imageSkills from '../packages/skills/src/index.ts'
import { loadSkills, loadBundled } from '../packages/skills/src/load.ts'
import { validatePreset } from '../packages/skills/src/schema.ts'
import { parseYaml } from '../packages/skills/src/yaml.ts'
import { createLlmStub } from '../packages/host/src/stubs.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

interface RegisteredSkill {
  name: string
  description: string
  content: string
  invocation?: { modelInvocable?: boolean; userInvocable?: boolean }
}

function createMockSkillRegistry() {
  const registered: RegisteredSkill[] = []
  const disposers: Array<() => void> = []
  let disposed = 0
  return {
    registered,
    get disposed() {
      return disposed
    },
    register(skill: RegisteredSkill) {
      registered.push(skill)
      const dispose = () => {
        disposed++
      }
      disposers.push(dispose)
      return dispose
    },
  }
}

const ALL_FIVE = [
  'cinema-dna-21x9x3',
  'life-force-portrait',
  'photography-simulation',
  'movie-poster',
  'character-casting',
]

describe('M2 chat skill registration', () => {
  it('registers all five skills into a provided SkillRegistry with invocation both on', async () => {
    const ctx = new Context()
    const registry = createMockSkillRegistry()
    ctx.provide('llm', createLlmStub())
    ctx.provide('skills', registry)
    const fiber = ctx.plugin(imageSkills, { dir: skillsDir })
    await fiber

    const names = registry.registered.map((s) => s.name).sort()
    assert.deepEqual(names, [...ALL_FIVE].sort())
    for (const skill of registry.registered) {
      assert.ok(skill.description.length > 0, `${skill.name} description`)
      assert.match(skill.description, /触发：/)
      assert.ok(skill.content.length > 500, `${skill.name} content non-trivial`)
      assert.deepEqual(skill.invocation, { modelInvocable: true, userInvocable: true })
    }
    await fiber.dispose()
    assert.equal(registry.disposed, 5, 'effect cleanup disposes every registration')
  })

  it('each registered content carries its hard-constraint keywords', async () => {
    const ctx = new Context()
    const registry = createMockSkillRegistry()
    ctx.provide('llm', createLlmStub())
    ctx.provide('skills', registry)
    await ctx.plugin(imageSkills, { dir: skillsDir })

    const byName = new Map(registry.registered.map((s) => [s.name, s.content]))
    assert.match(byName.get('cinema-dna-21x9x3')!, /21:9/)
    assert.match(byName.get('cinema-dna-21x9x3')!, /82/)
    assert.match(byName.get('life-force-portrait')!, /3:4/)
    assert.match(byName.get('life-force-portrait')!, /MODE A/)
    assert.match(byName.get('photography-simulation')!, /哈苏/)
    assert.match(byName.get('photography-simulation')!, /徕卡/)
    assert.match(byName.get('photography-simulation')!, /理光/)
    assert.match(byName.get('movie-poster')!, /9:16/)
    assert.match(byName.get('movie-poster')!, /梵想美学/)
    assert.match(byName.get('movie-poster')!, /80/)
    assert.match(byName.get('character-casting')!, /NO WAX SKIN/)
    // 标准链路与工具纪律
    for (const content of byName.values()) {
      assert.match(content, /istudio_skill_plan/)
      assert.match(content, /istudio_generate/)
      assert.match(content, /PLAN_REJECTED/)
      assert.match(content, /不要自己编造工具/)
    }
  })

  it('works without a SkillRegistry (optional dependency, no hard inject)', async () => {
    const ctx = new Context()
    ctx.provide('llm', createLlmStub())
    await ctx.plugin(imageSkills, { dir: skillsDir, enabled: ['cinema-dna-21x9x3'] })
    const service = (ctx as unknown as { imageSkills: { list: () => unknown[] } }).imageSkills
    assert.equal(service.list().length, 1)
  })

  it('skips skills whose chat.md is missing (warn, no crash)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-skill-nochat-'))
    try {
      const src = await loadSkills(skillsDir, ['cinema-dna-21x9x3'])
      const { writeFile: wf } = await import('node:fs/promises')
      const target = join(dir, 'lonely-skill')
      await mkdir(target, { recursive: true })
      const preset = { ...src[0].preset, id: 'lonely-skill' }
      // 手写一份合法 preset（带 triggers），但故意不放 chat.md
      const yaml = [
        'id: lonely-skill',
        'version: 1.0.0',
        `source: SKILL.md`,
        'triggers:',
        ...preset.triggers.map((t: string) => `  - '${t}'`),
        'modes:',
        '  still:',
        '    shots: 1',
        "    aspectRatio: '3:4'",
        'constraints:',
        '  referenceImages:',
        '    usage: analysis-only',
        '  negativePatch: no plastic skin',
        'planFields:',
        '  - 人物',
        'scoring:',
        '  threshold: 82',
        '  rubric:',
        '    - { item: 光色有现场来源, max: 100 }',
      ].join('\n')
      await wf(join(target, 'preset.yaml'), yaml)
      const ctx = new Context()
      const registry = createMockSkillRegistry()
      ctx.provide('llm', createLlmStub())
      ctx.provide('skills', registry)
      await ctx.plugin(imageSkills, { dir })
      assert.equal(registry.registered.length, 0, 'missing chat.md => skipped')
      const service = (ctx as unknown as { imageSkills: { list: () => unknown[] } }).imageSkills
      assert.equal(service.list().length, 1, 'skill still usable for plan/generate')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('M2 triggers validation', () => {
  const base = {
    id: 'demo',
    version: '1.0.0',
    source: 'SKILL.md',
    modes: { still: { shots: 1, aspectRatio: '3:4' } },
    constraints: { referenceImages: { usage: 'analysis-only' }, negativePatch: 'no x' },
    planFields: ['人物'],
    scoring: { threshold: 82, rubric: [{ item: 'x', max: 100 }] },
    triggers: ['一', '二', '三', '四', '五'],
  }

  it('missing triggers is a validation error', () => {
    const { triggers, ...rest } = base
    assert.throws(() => validatePreset(rest, 'demo'), /triggers/)
  })

  it('fewer than 5 or more than 12 triggers rejected', () => {
    assert.throws(() => validatePreset({ ...base, triggers: ['一', '二'] }, 'demo'), /5-12/)
    assert.throws(
      () => validatePreset({ ...base, triggers: Array.from({ length: 13 }, (_, i) => `t${i}`) }, 'demo'),
      /5-12/,
    )
  })

  it('non-string or blank triggers rejected; antiTriggers optional but validated', () => {
    assert.throws(() => validatePreset({ ...base, triggers: ['a', 'b', 'c', 'd', 1] }, 'demo'), /non-empty strings/)
    assert.throws(() => validatePreset({ ...base, antiTriggers: [] }, 'demo'), /antiTriggers/)
    assert.throws(() => validatePreset({ ...base, antiTriggers: ['ok', 2] }, 'demo'), /non-empty strings/)
    const ok = validatePreset({ ...base, antiTriggers: ['海报'] }, 'demo')
    assert.deepEqual(ok.antiTriggers, ['海报'])
  })

  it('all on-disk presets and bundled fallbacks carry 5-12 triggers', async () => {
    const loaded = await loadSkills(skillsDir)
    assert.equal(loaded.length, 5)
    for (const skill of loaded) {
      assert.ok(skill.preset.triggers.length >= 5 && skill.preset.triggers.length <= 12, skill.preset.id)
      for (const t of skill.preset.triggers) assert.match(t, /[一-鿿]/)
    }
    const bundled = loadBundled()
    assert.equal(bundled.length, 5)
    for (const skill of bundled) {
      assert.ok(skill.preset.triggers.length >= 5, skill.preset.id)
    }
  })

  it('unknown fields still rejected (schema stays closed)', () => {
    assert.throws(() => validatePreset({ ...base, rogue: 1 }, 'demo'), /unknown field/)
  })
})
