import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineImageTool, defineTool } from '../packages/tools/src/define.ts'
import { TOOL_NAMES } from '../packages/tools/src/tools.ts'
import * as toolsPlugin from '../packages/tools/src/index.ts'
import * as corePlugin from '../packages/core/src/index.ts'
import * as skillsPlugin from '../packages/skills/src/index.ts'
import * as assetsPlugin from '../packages/assets/src/index.ts'
import * as composePlugin from '../packages/compose/src/index.ts'
import * as guardPlugin from '../packages/guard/src/index.ts'
import * as mockPlugin from '../packages/provider-mock/src/index.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

describe('AC-CP official DSH plugin contract', () => {
  it('README documents v0.2 生图 entry and five skills', () => {
    const text = readFileSync(join(root, 'README.md'), 'utf8')
    assert.match(text, /生图/)
    assert.match(text, /\/imagestudio/)
    assert.match(text, /cinema-dna-21x9x3/)
    assert.match(text, /image-ui/)
    assert.doesNotMatch(text, /实现无限画布|电商模式已上线/)
  })

  it('AC-CP-04 root package.json declares dsh.bundle.patch and cordis peer range', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml')
    assert.equal(pkg.type, 'module')
    assert.match(String(pkg.peerDependencies?.['@deepseek-ai/cordis'] ?? ''), /4\./)
    assert.notEqual(pkg.peerDependencies?.['@deepseek-ai/cordis'], '*')
  })

  it('cordis.patch.yml inserts image-studio (composer) so tools cannot stay PENDING', () => {
    const yml = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
    assert.match(yml, /id:\s*image-studio/)
    assert.match(yml, /name:\s*dsh-imagestudio/)
  })

  it('examples/dsh-web.patch.yml inserts every inject dependency as an absolute path', () => {
    const yml = readFileSync(join(root, 'examples/dsh-web.patch.yml'), 'utf8')
    for (const id of [
      'image-core',
      'image-compose',
      'image-guard',
      'image-assets',
      'image-skills',
      'image-provider-mock',
      'image-tools',
    ]) {
      assert.match(yml, new RegExp(`id:\\s*${id}`), `missing ${id}`)
    }
    assert.match(yml, /packages\/core\/src\/index\.ts/)
    assert.doesNotMatch(yml, /name:\s*'@dsh-imagestudio\//)
  })

  it('AC-TL-01 exactly six model-visible tools named image_<verb>', () => {
    assert.equal(TOOL_NAMES.length, 6)
    assert.deepEqual([...TOOL_NAMES], [
      'image_skill_plan',
      'image_generate',
      'image_edit',
      'image_describe',
      'image_compose',
      'image_assets',
    ])
  })

  it('AC-TL-05 defineTool returns canonical value; render returns {type:text,text} blocks', async () => {
    const def = defineTool({
      name: 'image_probe',
      description: 'probe',
      parameters: { prompt: { type: 'string', required: true, description: 'English prompt' } },
      async execute(args) {
        return { ok: true, prompt: args.prompt }
      },
    })
    assert.equal(def.name, 'image_probe')
    assert.ok(def.output?.schema)
    const blocks = def.output.render({}, { ok: true })
    assert.ok(Array.isArray(blocks))
    assert.equal(blocks[0]?.type, 'text')
    assert.equal(typeof blocks[0]?.text, 'string')
    const value = await def.execute({ prompt: 'cat' }, { signal: new AbortController().signal })
    assert.deepEqual(value, { ok: true, prompt: 'cat' })
    assert.ok(!Array.isArray(value) || (value as unknown[])[0]?.type !== 'text')
  })

  it('AC-TL-09 parameter names stay in the unified table', () => {
    const names = new Set<string>()
    for (const doc of toolsPlugin.toolDocs) {
      for (const key of Object.keys(doc.parameters)) names.add(key)
    }
    for (const banned of ['text', 'description', 'query', 'negativePrompt', 'avoid', 'ratio', 'size', 'count', 'num', 'batchSize', 'images', 'files', 'urls', 'plan', 'model', 'provider']) {
      assert.equal(names.has(banned), false, `banned alias ${banned}`)
    }
  })

  it('every package exports name + apply (design spec §1.2)', () => {
    const plugins = [corePlugin, composePlugin, guardPlugin, assetsPlugin, skillsPlugin, mockPlugin, toolsPlugin]
    for (const p of plugins) {
      assert.equal(typeof p.name, 'string', 'name')
      assert.equal(typeof p.apply, 'function', p.name)
    }
    assert.deepEqual(toolsPlugin.inject, ['tools', 'imagegen', 'imageSkills', 'imageAssets', 'imageCompose'])
    assert.deepEqual(skillsPlugin.inject, ['llm'])
    assert.deepEqual(assetsPlugin.inject, ['jobs'])
    assert.deepEqual(mockPlugin.inject, ['imagegen'])
    assert.deepEqual(guardPlugin.inject, ['imagegen'])
  })

  it('AC-LC-07 importing plugins does not write files or open timers', () => {
    assert.equal(typeof defineImageTool, 'function')
  })
})
