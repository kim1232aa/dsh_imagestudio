import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio } from '../packages/host/src/boot.ts'
import { quantizeToSvg } from '../packages/compose/src/svg.ts'
import { createSolid, encodePng } from '../packages/compose/src/png.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('quantizeToSvg', () => {
  it('groups quantized colors into rect runs', () => {
    const img = createSolid(6, 4, [255, 0, 0, 255])
    for (let x = 3; x < 6; x++) {
      for (let y = 0; y < 4; y++) {
        const i = (y * 6 + x) * 4
        img.data[i] = 0; img.data[i + 2] = 255
      }
    }
    const svg = quantizeToSvg(img, 4)
    assert.match(svg, /^<svg/)
    assert.match(svg, /<\/svg>$/)
    assert.equal((svg.match(/<g fill=/g) || []).length, 2, '两种颜色两组')
    assert.match(svg, /#ff0000/)
    assert.match(svg, /#0000ff/)
    assert.match(svg, /<rect x="0" y="0" width="3" height="1"\/>/)
  })

  it('rejects fully transparent slices', () => {
    const img = createSolid(4, 4, [0, 0, 0, 0])
    assert.throws(() => quantizeToSvg(img), /全透明/)
  })
})

describe('ui-process route (algo modes run locally)', () => {
  it('algo-alpha produces a PNG with transparent pixels; algo-svg produces valid SVG', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-uiproc-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enabledSkills: [] })
    try {
      // 造一张 16x16：左边红块，右边白底
      const img = createSolid(16, 16, [255, 255, 255, 255])
      for (let y = 2; y < 14; y++) {
        for (let x = 2; x < 8; x++) {
          const i = (y * 16 + x) * 4
          img.data[i] = 255; img.data[i + 1] = 0; img.data[i + 2] = 0
        }
      }
      const srcRel = '.dsh/image-studio/studio/proc-test/src.png'
      const srcAbs = join(dir, srcRel)
      await writeFile(srcAbs, encodePng(img), { recursive: true } as never).catch(async () => {
        const { mkdir } = await import('node:fs/promises')
        await mkdir(join(dir, '.dsh/image-studio/studio/proc-test'), { recursive: true })
        await writeFile(srcAbs, encodePng(img))
      })
      const slice = { x: 0, y: 0, w: 1, h: 1 }
      const alpha = await host.web.fetch('POST', '/imagestudio/api/ui-process', JSON.stringify({ path: srcRel, mode: 'algo-alpha', slice }))
      assert.equal(alpha.status, 200)
      const alphaBody = JSON.parse(alpha.text)
      assert.ok(alphaBody.path.endsWith('algo-alpha.png'))
      const svg = await host.web.fetch('POST', '/imagestudio/api/ui-process', JSON.stringify({ path: srcRel, mode: 'algo-svg', slice }))
      assert.equal(svg.status, 200)
      const svgBody = JSON.parse(svg.text)
      assert.ok(svgBody.path.endsWith('algo.svg'))
      assert.ok(svgBody.colors >= 1)
      const { readFile } = await import('node:fs/promises')
      const svgText = await readFile(join(dir, svgBody.path), 'utf8')
      assert.match(svgText, /<svg/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('meta flags canMaskEdit: openai without editModel stays out, mock stays in', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-mask-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enabledSkills: [] })
    try {
      const { OpenAIImageProvider } = await import('../packages/provider-openai/src/index.ts')
      host.ctx.imagegen.register('noedit-openai', new OpenAIImageProvider({ id: 'noedit-openai', model: 'x', apiKeyEnv: 'IMAGE_STUDIO_KEY' }) as never)
      const res = await host.web.fetch('GET', '/imagestudio/api/meta')
      const providers = JSON.parse(res.text).providers as Array<{ id: string; canMaskEdit?: boolean }>
      const noedit = providers.find((p) => p.id === 'noedit-openai')
      const mock = providers.find((p) => p.id === 'mock')
      assert.equal(noedit?.canMaskEdit, false, '没配编辑模型的 openai 渠道不支持遮罩编辑')
      assert.equal(mock?.canMaskEdit, true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('rejects unknown mode and path escape', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-uiproc2-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enabledSkills: [] })
    try {
      const bad = await host.web.fetch('POST', '/imagestudio/api/ui-process', JSON.stringify({ path: 'x.png', mode: 'magic', slice: { x: 0, y: 0, w: 1, h: 1 } }))
      assert.equal(bad.status, 400)
      const esc = await host.web.fetch('POST', '/imagestudio/api/ui-process', JSON.stringify({ path: '../x.png', mode: 'algo-alpha', slice: { x: 0, y: 0, w: 1, h: 1 } }))
      assert.equal(esc.status, 403)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
