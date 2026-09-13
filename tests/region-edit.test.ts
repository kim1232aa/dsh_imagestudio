/**
 * 局部重绘/移除背景的验收硬指标：
 *  - blitRegion 只覆盖框内，框外像素与原图逐位一致
 *  - removeBackground 产出带透明通道，且是本地算法
 *  - provider.edit 走 /images/edits 且带参考图 data URL；未配 editModel 明确报错
 */

import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { crc32 } from 'node:zlib'
import test from 'node:test'

import { createSolid, decodePng } from '../packages/compose/src/png.ts'
import { blitRegion, removeBackground } from '../packages/compose/src/region.ts'
import { OpenAIImageProvider } from '../packages/provider-openai/src/index.ts'

/**
 * 构造一个真实世界形态的 PNG：colortype 2（RGB 无 alpha）+ 每行非零过滤器。
 * 上游/用户上传的 PNG 大多长这样；我们自家 encodePng 只产 RGBA+filter0，
 * 只测自家格式会漏掉真实世界的解码路径（这正是本次修掉的 bug）。
 */
function buildRgbPngFiltered(width: number, height: number, px: (x: number, y: number) => [number, number, number]): Uint8Array {
  const stride = width * 3
  const raw = Buffer.alloc((stride + 1) * height)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(stride)
    for (let x = 0; x < width; x++) {
      const [r, g, b] = px(x, y)
      line[x * 3] = r; line[x * 3 + 1] = g; line[x * 3 + 2] = b
    }
    const filter = y % 5 // 每种过滤器轮一遍
    raw[y * (stride + 1)] = filter
    const out = Buffer.alloc(stride)
    for (let i = 0; i < stride; i++) {
      const a = i >= 3 ? line[i - 3] : 0
      const b2 = prev[i]
      const c = i >= 3 ? prev[i - 3] : 0
      let v = line[i]
      if (filter === 1) v = (v - a) & 0xff
      else if (filter === 2) v = (v - b2) & 0xff
      else if (filter === 3) v = (v - ((a + b2) >> 1)) & 0xff
      else if (filter === 4) {
        const p = a + b2 - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b2), pc = Math.abs(p - c)
        v = (v - (pa <= pb && pa <= pc ? a : pb <= pc ? b2 : c)) & 0xff
      }
      out[i] = v
    }
    out.copy(raw, y * (stride + 1) + 1)
    prev = line
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2 // RGB
  const mk = (type: string, data: Buffer) => {
    const t = Buffer.from(type)
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0)
    return Buffer.concat([len, t, data, crc])
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    mk('IHDR', ihdr),
    mk('IDAT', deflateSync(raw)),
    mk('IEND', Buffer.alloc(0)),
  ])
}

test('decodePng 支持 colortype 2（RGB）+ 全部 5 种行过滤器', () => {
  const px = (x: number, y: number): [number, number, number] => [(x * 37 + y * 11) % 256, (x * 5 + y * 53) % 256, (x + y * 97) % 256]
  const png = buildRgbPngFiltered(9, 10, px)
  const img = decodePng(png)
  assert.equal(img.width, 9)
  assert.equal(img.height, 10)
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const i = (y * 9 + x) * 4
      const [r, g, b] = px(x, y)
      assert.equal(img.data[i], r, `(${x},${y}) R`)
      assert.equal(img.data[i + 1], g, `(${x},${y}) G`)
      assert.equal(img.data[i + 2], b, `(${x},${y}) B`)
      assert.equal(img.data[i + 3], 255, 'RGB 图 alpha 应补 255')
    }
  }
})

test('decodePng 对不支持的位深/交错如实报错', () => {
  const png = Buffer.from(buildRgbPngFiltered(2, 2, () => [1, 2, 3]))
  png[24] = 16 // bit depth 16
  assert.throws(() => decodePng(png), /bit depth/)
  const png2 = Buffer.from(buildRgbPngFiltered(2, 2, () => [1, 2, 3]))
  png2[28] = 1 // interlace
  assert.throws(() => decodePng(png2), /interlaced/)
})

test('blitRegion 框外像素与原图逐位一致', () => {
  const dst = createSolid(8, 8, [10, 20, 30, 255])
  const src = createSolid(8, 8, [200, 100, 50, 255])
  const box = { x: 2, y: 2, w: 3, h: 3 }
  const before = new Uint8Array(dst.data)
  blitRegion(dst, src, box)
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const i = (y * 8 + x) * 4
      const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h
      if (inside) {
        assert.equal(dst.data[i], 200, `框内 (${x},${y}) 应被覆盖`)
      } else {
        assert.equal(dst.data[i], before[i], `框外 (${x},${y}) 必须与原图一致`)
        assert.equal(dst.data[i + 1], before[i + 1])
        assert.equal(dst.data[i + 2], before[i + 2])
        assert.equal(dst.data[i + 3], before[i + 3])
      }
    }
  }
})

test('blitRegion 上游分辨率不同时按比例映射框', () => {
  const dst = createSolid(4, 4, [0, 0, 0, 255])
  const src = createSolid(8, 8, [255, 255, 255, 255]) // 上游返回了 2 倍分辨率
  blitRegion(dst, src, { x: 1, y: 1, w: 2, h: 2 })
  assert.equal(dst.data[(1 * 4 + 1) * 4], 255)
  assert.equal(dst.data[0], 0, '框外不变')
})

test('removeBackground 边缘连通背景变透明，主体保留', () => {
  // 6x6：背景红，中心 2x2 蓝
  const img = createSolid(6, 6, [255, 0, 0, 255])
  for (let y = 2; y < 4; y++) {
    for (let x = 2; x < 4; x++) {
      const i = (y * 6 + x) * 4
      img.data[i] = 0; img.data[i + 1] = 0; img.data[i + 2] = 255
    }
  }
  const out = removeBackground(img, 32)
  assert.equal(out.data[3], 0, '角上背景应透明')
  assert.equal(out.data[(2 * 6 + 2) * 4 + 3], 255, '主体必须保留')
  assert.equal(out.width, 6)
})

test('removeBackground 主体内部与背景同色但不连通的像素保留', () => {
  // 背景红，中间一圈蓝围住一个孤立红点
  const img = createSolid(5, 5, [255, 0, 0, 255])
  for (let y = 1; y < 4; y++) {
    for (let x = 1; x < 4; x++) {
      const i = (y * 5 + x) * 4
      img.data[i] = 0; img.data[i + 1] = 0; img.data[i + 2] = 255
    }
  }
  const c = (2 * 5 + 2) * 4
  img.data[c] = 255; img.data[c + 1] = 0; img.data[c + 2] = 0 // 孤立红点
  const out = removeBackground(img, 32)
  assert.equal(out.data[c + 3], 255, '孤立的同色内部像素不能误抠')
})

test('generate 带参考图时走 edit，未配 editModel 明确报错', async () => {
  process.env.TEST_EDIT_KEY = 'k'
  const p = new OpenAIImageProvider({ id: 't', model: 'grok-imagine-image', apiKeyEnv: 'TEST_EDIT_KEY' })
  await assert.rejects(
    () => p.generate({ prompt: 'x', aspectRatio: '1:1', n: 1, refUsage: 'image-to-image', refImages: [{ path: 'a.png', width: 0, height: 0, mime: 'image/png', sha256: '' }] }),
    /editModel/,
  )
  delete process.env.TEST_EDIT_KEY
})

test('edit 打 /images/edits 且 image_url 是 data URL', async () => {
  process.env.TEST_EDIT_KEY = 'k'
  const p = new OpenAIImageProvider({
    id: 't',
    model: 'grok-imagine-image',
    editModel: 'grok-imagine-edit',
    baseUrl: 'https://relay.example/v1',
    apiKeyEnv: 'TEST_EDIT_KEY',
  })
  // 造一张真 PNG 当参考图（frameToDataUrl 从 cwd 读）
  const { encodePng } = await import('../packages/compose/src/png.ts')
  const { writeFileSync, rmSync } = await import('node:fs')
  writeFileSync('test-ref.png', Buffer.from(encodePng(createSolid(2, 2, [1, 2, 3, 255]))))
  const calls = []
  const original = globalThis.fetch
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) })
    return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from(encodePng(createSolid(2, 2, [9, 9, 9, 255]))).toString('base64') }] }), { status: 200 })
  }) as typeof fetch
  try {
    const out = await p.generate({
      prompt: 'make it blue',
      aspectRatio: '1:1',
      n: 1,
      refUsage: 'image-to-image',
      refImages: [{ path: 'test-ref.png', width: 2, height: 2, mime: 'image/png', sha256: '' }],
    })
    assert.equal(calls[0].url, 'https://relay.example/v1/images/edits')
    assert.equal(calls[0].body.model, 'grok-imagine-edit')
    assert.ok(String(calls[0].body.image_url).startsWith('data:image/png;base64,'))
    assert.equal(out.model, 'grok-imagine-edit')
    assert.equal(out.images[0].width, 2)
  } finally {
    globalThis.fetch = original
    rmSync('test-ref.png', { force: true })
    delete process.env.TEST_EDIT_KEY
  }
})
