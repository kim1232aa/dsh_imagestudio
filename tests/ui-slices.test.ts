import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio } from '../packages/host/src/boot.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

/** 剧本式 vision provider：第 n 次调用返回 script[min(n, len-1)]。 */
function visionProvider(script: string[]) {
  let calls = 0
  return {
    info: () => ({ id: 'test-vision', protocol: 'mock', model: 'vision-test', kinds: ['describe'] }),
    async generate() { throw new Error('not implemented') },
    async describe() {
      const out = script[Math.min(calls, script.length - 1)]
      calls++
      return out
    },
    calls: () => calls,
  }
}

describe('UI slices proposal route (/imagestudio/api/ui-slices)', () => {
  async function withHost(script: string[]) {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-uislice-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enabledSkills: [] })
    const provider = visionProvider(script)
    host.ctx.imagegen.register('test-vision', provider as never)
    host.ctx.imagegen.defaultId = 'test-vision'
    return { dir, host, provider }
  }

  it('parses strict JSON and clamps out-of-range coordinates', async () => {
    const { dir, host, provider } = await withHost([
      '```json\n[{"x":-0.2,"y":0.1,"w":1.5,"h":0.4,"label":"头图"},{"x":0.5,"y":0.6,"w":0.2,"h":0.2,"label":"按钮"},{"x":"bad","y":0,"w":0.1,"h":0.1}]\n```',
    ])
    try {
      const res = await host.web.fetch('POST', '/imagestudio/api/ui-slices', JSON.stringify({ path: 'draft.png' }))
      assert.equal(res.status, 200)
      const body = JSON.parse(res.text)
      assert.equal(body.attempts, 1)
      assert.equal(body.slices.length, 2)
      const hero = body.slices[0]
      assert.equal(hero.x, 0)
      assert.ok(hero.w <= 1 - hero.x, 'w clamped into canvas')
      assert.equal(hero.label, '头图')
      assert.equal(provider.calls(), 1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('retries once automatically when the first output is not JSON', async () => {
    const { dir, host, provider } = await withHost([
      '我看不太清这张图，要不你换一张试试？',
      '[{"x":0.1,"y":0.1,"w":0.3,"h":0.3,"label":"图标"}]',
    ])
    try {
      const res = await host.web.fetch('POST', '/imagestudio/api/ui-slices', JSON.stringify({ path: 'draft.png' }))
      assert.equal(res.status, 200)
      const body = JSON.parse(res.text)
      assert.equal(body.attempts, 2, '第二次尝试才成功')
      assert.equal(body.slices.length, 1)
      assert.equal(provider.calls(), 2)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('fails with cause after one retry when output stays garbage', async () => {
    const { dir, host, provider } = await withHost(['看不懂', '还是看不懂'])
    try {
      const res = await host.web.fetch('POST', '/imagestudio/api/ui-slices', JSON.stringify({ path: 'draft.png' }))
      assert.equal(res.status, 502)
      const body = JSON.parse(res.text)
      assert.match(body.error, /重试/)
      assert.match(body.error, /JSON 数组/)
      assert.equal(provider.calls(), 2, '恰好重试一次，不多不少')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('rejects path escape', async () => {
    const { dir, host } = await withHost(['[]'])
    try {
      const res = await host.web.fetch('POST', '/imagestudio/api/ui-slices', JSON.stringify({ path: '../outside.png' }))
      assert.equal(res.status, 403)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
