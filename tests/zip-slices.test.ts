import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readZip, writeZip } from '../packages/compose/src/zip.ts'
import { cropRegion } from '../packages/compose/src/region.ts'
import { createSolid, decodePng, encodePng } from '../packages/compose/src/png.ts'

describe('zip writer/reader round-trip', () => {
  it('writeZip -> readZip preserves names and bytes', () => {
    const a = new TextEncoder().encode('{"hello":"世界"}')
    const b = new Uint8Array([0, 1, 2, 3, 255, 254])
    const zip = writeZip([
      { name: 'manifest.json', data: a },
      { name: 'slice-01.png', data: b },
    ])
    const back = readZip(zip)
    assert.equal(back.length, 2)
    assert.equal(back[0].name, 'manifest.json')
    assert.deepEqual([...back[0].data], [...a])
    assert.equal(back[1].name, 'slice-01.png')
    assert.deepEqual([...back[1].data], [...b])
  })

  it('readZip inflates deflate entries (foreign zip)', async () => {
    const { deflateRawSync } = await import('node:zlib')
    const payload = new TextEncoder().encode('deflated-content')
    const deflated = new Uint8Array(deflateRawSync(Buffer.from(payload)))
    // 手工拼一个 method=8 的最小 zip
    const { crc32 } = await import('../packages/compose/src/zip.ts')
    const crc = crc32(payload)
    const name = new TextEncoder().encode('a.txt')
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(8, 8, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, deflated.length, true)
    lv.setUint32(22, payload.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)
    const cen = new Uint8Array(46 + name.length)
    const cv = new DataView(cen.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(10, 8, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, deflated.length, true)
    cv.setUint32(24, payload.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, 0, true)
    cen.set(name, 46)
    const eocd = new Uint8Array(22)
    const ev = new DataView(eocd.buffer)
    ev.setUint32(0, 0x06054b50, true)
    ev.setUint16(8, 1, true)
    ev.setUint16(10, 1, true)
    ev.setUint32(12, cen.length, true)
    ev.setUint32(16, local.length + deflated.length, true)
    const zip = new Uint8Array(local.length + deflated.length + cen.length + 22)
    zip.set(local, 0)
    zip.set(deflated, local.length)
    zip.set(cen, local.length + deflated.length)
    zip.set(eocd, local.length + deflated.length + cen.length)
    const back = readZip(zip)
    assert.equal(back.length, 1)
    assert.equal(new TextDecoder().decode(back[0].data), 'deflated-content')
  })

  it('readZip rejects non-zip bytes with a clear error', () => {
    assert.throws(() => readZip(new Uint8Array([1, 2, 3, 4])), /ZIP/)
  })
})

describe('cropRegion', () => {
  it('crops an exact sub-rectangle pixel for pixel', () => {
    const img = createSolid(8, 8, [0, 0, 0, 255])
    // 左上 4x4 红，右下 4x4 蓝
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const i = (y * 8 + x) * 4
        const red = x < 4 && y < 4
        img.data[i] = red ? 255 : 0
        img.data[i + 2] = red ? 0 : 255
      }
    }
    const crop = cropRegion(img, { x: 4, y: 4, w: 4, h: 4 })
    assert.equal(crop.width, 4)
    assert.equal(crop.height, 4)
    assert.equal(crop.data[0], 0)
    assert.equal(crop.data[2], 255)
    // PNG 往返后仍一致
    const decoded = decodePng(encodePng(crop))
    assert.deepEqual([...decoded.data], [...crop.data])
  })

  it('clamps out-of-range boxes instead of crashing', () => {
    const img = createSolid(4, 4)
    const crop = cropRegion(img, { x: 2, y: 2, w: 100, h: 100 })
    assert.equal(crop.width, 2)
    assert.equal(crop.height, 2)
  })
})
