import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildEcomPlan } from '../packages/ui/src/ecom-plan.ts'
import { bootStudio } from '../packages/host/src/boot.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('DOC03 ecom pack', () => {
  it('preview plan lists six uses and does not generate images', () => {
    const plan = buildEcomPlan({ sku: '青瓷茶盏' })
    assert.equal(plan.count, 6)
    assert.equal(plan.shots.filter((s) => s.role === 'hero').length, 1)
    assert.ok(plan.shots.every((s) => s.prompt.includes('青瓷茶盏')))
  })

  it('POST /ecom/preview returns plan only', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-ecom-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enableXai: false })
    try {
      const res = await host.web.fetch(
        'POST',
        '/imagestudio/api/ecom/preview',
        JSON.stringify({ sku: '茶盏', uses: [{ id: 'hero', n: 1 }, { id: 'detail', n: 2 }] }),
      )
      assert.equal(res.status, 200, res.text)
      const body = res.json as { count: number; shots: unknown[]; generated?: unknown }
      assert.equal(body.count, 3)
      assert.equal(body.generated, false)
      assert.ok(Array.isArray(body.shots) && body.shots.length === 3)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('POST /ecom/confirm generates after plan, hero first', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-ecom-c-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enableXai: false })
    try {
      const plan = buildEcomPlan({ sku: '茶盏', uses: [{ id: 'hero', n: 1 }, { id: 'scene', n: 1 }] })
      const res = await host.web.fetch('POST', '/imagestudio/api/ecom/confirm', JSON.stringify({ plan }))
      assert.equal(res.status, 200, res.text)
      const body = res.json as { images: Array<{ path?: string; role?: string }> }
      assert.ok(body.images.length >= 2)
      assert.equal(body.images[0].role, 'hero')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
