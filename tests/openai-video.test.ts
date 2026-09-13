/**
 * openai provider 的真实视频生成路径：异步轮询协议 + mp4 尺寸嗅探。
 * 全部用桩 fetch，不打真实上游。
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { OpenAIImageProvider, sniffMp4 } from '../packages/provider-openai/src/index.ts'

/** 合成一个带 tkhd box 的最小 mp4 字节序列（ftyp 头 + tkhd 尾部宽高）。 */
function fakeMp4(width: number, height: number): Uint8Array {
  const ftyp = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])
  const payload = 84 // tkhd version-0 payload 长度（末尾 8 字节是宽高定点数）
  const tkhd = new Uint8Array(8 + payload)
  const dv = new DataView(tkhd.buffer)
  dv.setUint32(0, 8 + payload)
  tkhd[4] = 0x74; tkhd[5] = 0x6b; tkhd[6] = 0x68; tkhd[7] = 0x64 // 'tkhd'
  dv.setUint32(8 + payload - 8, Math.round(width * 65536))
  dv.setUint32(8 + payload - 4, Math.round(height * 65536))
  const out = new Uint8Array(ftyp.length + tkhd.length)
  out.set(ftyp, 0)
  out.set(tkhd, ftyp.length)
  return out
}

test('sniffMp4 从 tkhd box 读出真实宽高', () => {
  assert.deepEqual(sniffMp4(fakeMp4(1280, 720)), { width: 1280, height: 720 })
  assert.equal(sniffMp4(new Uint8Array([1, 2, 3])), null)
  assert.equal(sniffMp4(new Uint8Array(0)), null)
})

test('未配置 videoModel 的渠道明确拒绝视频，而不是假装能出', async () => {
  const p = new OpenAIImageProvider({ id: 't', model: 'gpt-image-2', apiKeyEnv: 'TEST_NOPE_KEY' })
  assert.equal(typeof p.generateVideo, 'function')
  assert.ok(!p.info().kinds.includes('text-to-video'))
  await assert.rejects(
    () => p.generateVideo!({ prompt: 'x', durationSec: 2, aspectRatio: '16:9' }),
    /未配置视频模型/,
  )
})

test('generateVideo 走完 异步轮询→下载→真实尺寸 全链路', async () => {
  process.env.TEST_VIDEO_KEY = 'test-key'
  const p = new OpenAIImageProvider({
    id: 'relay',
    model: 'grok-imagine-image',
    videoModel: 'grok-imagine-video',
    baseUrl: 'https://relay.example/v1',
    apiKeyEnv: 'TEST_VIDEO_KEY',
  })
  assert.ok(p.info().kinds.includes('text-to-video'))
  assert.ok(p.info().kinds.includes('image-to-video'))

  const calls: Array<{ url: string; method: string; body?: unknown }> = []
  const mp4 = fakeMp4(1280, 720)
  const original = globalThis.fetch
  globalThis.fetch = (async (input: unknown, init?: { method?: string; body?: string }) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body ? JSON.parse(init.body) : undefined })
    if (url.endsWith('/videos/generations')) {
      return new Response(JSON.stringify({ request_id: 'req-1' }), { status: 200 })
    }
    if (url.endsWith('/videos/req-1')) {
      return new Response(
        JSON.stringify({ status: 'done', video: { url: '/v1/videos/req-1/content', duration: 2 } }),
        { status: 200 },
      )
    }
    if (url === 'https://relay.example/v1/videos/req-1/content') {
      return new Response(mp4, { status: 200, headers: { 'content-type': 'video/mp4' } })
    }
    throw new Error(`unexpected fetch ${url}`)
  }) as typeof fetch

  try {
    const out = await p.generateVideo!({ prompt: 'a cube rotating', durationSec: 2, aspectRatio: '16:9' })
    assert.equal(out.mime, 'video/mp4')
    assert.equal(out.width, 1280)
    assert.equal(out.height, 720)
    assert.equal(out.durationSec, 2)
    assert.equal(out.providerId, 'relay')
    assert.equal(out.model, 'grok-imagine-video')
    assert.deepEqual([...out.bytes], [...mp4])
    // 请求体必须带 duration 与 aspect_ratio，且 duration 被夹在 1..15
    const create = calls.find((c) => c.url.endsWith('/videos/generations'))
    assert.equal(create?.method, 'POST')
    assert.deepEqual(create?.body, {
      model: 'grok-imagine-video',
      prompt: 'a cube rotating',
      duration: 2,
      aspect_ratio: '16:9',
    })
  } finally {
    globalThis.fetch = original
    delete process.env.TEST_VIDEO_KEY
  }
})

test('generateVideo 在上游报 failed 时抛出带原因的错误', async () => {
  process.env.TEST_VIDEO_KEY = 'test-key'
  const p = new OpenAIImageProvider({
    id: 'relay',
    model: 'grok-imagine-image',
    videoModel: 'grok-imagine-video',
    baseUrl: 'https://relay.example/v1',
    apiKeyEnv: 'TEST_VIDEO_KEY',
  })
  const original = globalThis.fetch
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input)
    if (url.endsWith('/videos/generations')) {
      return new Response(JSON.stringify({ request_id: 'req-2' }), { status: 200 })
    }
    return new Response(JSON.stringify({ status: 'failed', error: 'moderation blocked' }), { status: 200 })
  }) as typeof fetch
  try {
    await assert.rejects(
      () => p.generateVideo!({ prompt: 'x', durationSec: 2, aspectRatio: '16:9' }),
      /moderation blocked/,
    )
  } finally {
    globalThis.fetch = original
    delete process.env.TEST_VIDEO_KEY
  }
})
