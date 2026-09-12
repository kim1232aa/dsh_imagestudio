import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { bootStudio, STATE_ACTIVE } from '../packages/host/src/boot.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('AC-CP bundle shape', () => {
  it('declares dsh.bundle.patch and package-specifier rows', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    assert.equal(typeof pkg.dsh?.bundle?.patch, 'string')
    assert.ok(pkg.exports['./core'])
    assert.ok(pkg.exports['./tools'])
    const patch = readFileSync(join(root, pkg.dsh.bundle.patch), 'utf8')
    assert.equal(patch.includes('file:///'), false)
    assert.equal(patch.includes('/workspace/'), false)
    for (const id of ['image-core', 'image-tools', 'image-provider-mock', 'image-skills', 'image-assets']) {
      assert.ok(patch.includes(`id: ${id}`), id)
    }
    assert.ok(patch.includes('name: dsh-imagestudio/core'))
    assert.ok(patch.includes('name: dsh-imagestudio/tools'))
    assert.equal(patch.includes('image-studio-boot'), false)
  })
})

describe('AC-LC-01 dump-config on real dsh', () => {
  it('composed web profile includes image-* rows from the bundle patch', () => {
    const r = spawnSync(
      process.execPath,
      [
        '/workspace/node_modules/@deepseek-ai/dsh/lib/bin.js',
        '--profile',
        'web',
        '--patch',
        join(root, 'cordis.patch.yml'),
        '--dump-config',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          DSH_HOME: process.env.DSH_HOME || '/workspace/.dsh-home',
          DSH_TELEMETRY_DISABLED: '1',
          NODE_OPTIONS: [process.env.NODE_OPTIONS, '--experimental-strip-types'].filter(Boolean).join(' '),
        },
      },
    )
    assert.equal(r.status, 0, r.stderr || r.stdout)
    for (const id of ['image-core', 'image-tools', 'image-provider-mock', 'image-skills']) {
      assert.ok(r.stdout.includes(`id: ${id}`), `${id} missing\n${r.stdout.slice(0, 500)}`)
    }
    assert.ok(r.stdout.includes('dsh-imagestudio/tools'))
    assert.equal(r.stdout.includes('image-studio-boot'), false)
  })
})

describe('AC-TL live contracts (cordis host, still mock provider)', () => {
  it('AC-TL-01/02 six tools; projected schemas drop execute/output', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-real-'))
    try {
      const host = await bootStudio({
        workspaceRoot: dir,
        skillsDir: join(root, 'skills'),
        enabledSkills: ['cinema-dna-21x9x3', 'life-force-portrait'],
        enableXai: false,
      })
      const names = host.tools.schemas().map((s) => s.name).sort()
      assert.deepEqual(names, [
        'image_assets',
        'image_compose',
        'image_describe',
        'image_edit',
        'image_generate',
        'image_skill_plan',
      ])
      const blob = JSON.stringify(host.tools.schemas())
      assert.equal(blob.includes('"execute"'), false)
      assert.equal(blob.includes('"output"'), false)
      const fibers = host.fibers()
      for (const need of ['image-core', 'image-tools', 'image-provider-mock', 'image-skills']) {
        const f = fibers.find((x) => x.name === need)
        assert.ok(f, need)
        assert.equal(f!.state, STATE_ACTIVE, `${need} state=${f!.state}`)
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('AC-LC-07 import without apply is side-effect free', () => {
  it('importing the plugin modules does not provide services', async () => {
    const ctx = new Context()
    await import('../packages/core/src/index.ts')
    await import('../packages/tools/src/index.ts')
    assert.equal(ctx.get('imagegen', false), undefined)
    assert.equal(ctx.get('tools', false), undefined)
  })
})
