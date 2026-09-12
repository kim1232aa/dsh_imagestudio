import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decodePng } from '../packages/compose/src/index.ts'
import { MockImageProvider, sizeFor } from '../packages/provider-mock/src/index.ts'

const RATIOS = ['自动', '1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '3:2', '21:9'] as const

describe('T2 mock raster sizes', () => {
  it('DOC03-3.1 nine ratios within 1 percent', () => {
    for (const ratio of RATIOS) {
      const { width, height } = sizeFor(ratio, '1K')
      const expected = ratio === '自动' ? 1 : Number(ratio.split(':')[0]) / Number(ratio.split(':')[1])
      const got = width / height
      assert.ok(Math.abs(got - expected) / expected <= 0.01, `${ratio} ${width}x${height} ratio ${got}`)
    }
  })

  it('DOC03-3.1 1K/2K/4K areas strictly increase at 1:1', () => {
    const a = sizeFor('1:1', '1K')
    const b = sizeFor('1:1', '2K')
    const c = sizeFor('1:1', '4K')
    assert.ok(a.width * a.height < b.width * b.height)
    assert.ok(b.width * b.height < c.width * c.height)
  })

  it('mock generate encodes those pixels', async () => {
    const mock = new MockImageProvider({ film: false, latencyMs: 0 })
    const out = await mock.generate({
      prompt: 'size check',
      aspectRatio: '21:9',
      clarity: '1K',
      n: 1,
      refUsage: 'analysis-only',
    })
    assert.equal(out.images[0].width, 1024)
    assert.equal(out.images[0].height, 439)
    const png = decodePng(out.images[0].bytes as Uint8Array)
    assert.equal(png.width, 1024)
    assert.equal(png.height, 439)
  })
})
