import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio } from '../packages/host/src/boot.ts'
import { applyLineEdits, numberLines, parseFileSections, parseLineEdits } from '../packages/ui/src/webclone.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

const THREE_FILES = `===FILE: index.html===
<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><h1>Hi</h1><script src="script.js"></script></body></html>
===FILE: style.css===
body { margin: 0; }
h1 { color: #333; }
===FILE: script.js===
// no interaction
`

describe('webclone file sections & line edits', () => {
  it('parseFileSections extracts the three files, rejects incomplete output', () => {
    const files = parseFileSections('前言\n' + THREE_FILES + '\n后记')
    assert.ok(files)
    assert.match(files.html, /<h1>Hi<\/h1>/)
    assert.match(files.css, /margin: 0/)
    assert.match(files.js, /no interaction/)
    assert.equal(parseFileSections('只有两个 ===FILE: index.html===\nx\n===FILE: style.css===\ny'), null)
  })

  it('parseLineEdits + applyLineEdits replace closed ranges, later blocks first', () => {
    const content = 'a\nb\nc\nd\ne'
    const edits = parseLineEdits('@@ 2-3\nB\nC\n@@ 5-5\nE')
    assert.equal(edits.length, 2)
    const out = applyLineEdits(content, edits)
    assert.equal(out.content, 'a\nB\nC\nd\nE')
    assert.ok(out.changed > 0)
  })

  it('applyLineEdits rejects whole-file rewrites disguised as edits', () => {
    const content = Array.from({ length: 20 }, (_, i) => 'line' + i).join('\n')
    assert.throws(() => applyLineEdits(content, [{ start: 1, end: 20, lines: ['x'] }]), /整篇重写/)
  })

  it('numberLines prefixes line numbers', () => {
    assert.equal(numberLines('x\ny'), '1: x\n2: y')
  })
})

describe('webclone routes', () => {
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

  async function withHost(script: string[]) {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-img-webclone-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enabledSkills: [] })
    const provider = visionProvider(script)
    host.ctx.imagegen.register('test-vision', provider as never)
    host.ctx.imagegen.defaultId = 'test-vision'
    // 需要一张存在的设计稿
    await mkdir(join(dir, '.dsh/image-studio/studio/t1'), { recursive: true })
    await writeFile(join(dir, '.dsh/image-studio/studio/t1/draft.png'), 'fake')
    return { dir, host, provider }
  }

  it('start writes three files + serves them; edit applies line edits only', async () => {
    const { dir, host } = await withHost([
      THREE_FILES,
      '@@ 2-2\nbody { margin: 0; background: #000; }',
    ])
    try {
      const start = await host.web.fetch('POST', '/imagestudio/api/webclone/start', JSON.stringify({ path: '.dsh/image-studio/studio/t1/draft.png' }))
      assert.equal(start.status, 200)
      const started = JSON.parse(start.text)
      assert.ok(started.id)
      assert.match(started.files.html, /<h1>/)
      // 静态预览可访问
      const preview = await host.web.fetch('GET', `/imagestudio/web/${started.id}/index.html`)
      assert.equal(preview.status, 200)
      assert.match(preview.text, /<h1>Hi<\/h1>/)
      const css = await host.web.fetch('GET', `/imagestudio/web/${started.id}/style.css`)
      assert.match(css.text, /margin: 0/)
      // 非法路径被拒（.. 被 URL 规范化后落到 404；白名单外路径 403）
      const esc = await host.web.fetch('GET', `/imagestudio/web/${started.id}/../../plugin.ts`)
      assert.ok([403, 404].includes(esc.status), '路径穿越不得返回文件内容')
      const notListed = await host.web.fetch('GET', `/imagestudio/web/${started.id}/assets/sub/dir.png`)
      assert.equal(notListed.status, 403)
      // 按行编辑 style.css 第 2 行
      const edit = await host.web.fetch('POST', '/imagestudio/api/webclone/edit', JSON.stringify({ id: started.id, file: 'style.css', instruction: '背景改黑' }))
      assert.equal(edit.status, 200)
      const edited = JSON.parse(edit.text)
      assert.match(edited.content, /background: #000/)
      assert.equal(edited.changedLines, 1)
      // 编辑结果落到静态服务
      const css2 = await host.web.fetch('GET', `/imagestudio/web/${started.id}/style.css`)
      assert.match(css2.text, /background: #000/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('edit refuses when model outputs a whole file instead of line edits', async () => {
    const { dir, host, provider } = await withHost([THREE_FILES, THREE_FILES, THREE_FILES])
    try {
      const start = await host.web.fetch('POST', '/imagestudio/api/webclone/start', JSON.stringify({ path: '.dsh/image-studio/studio/t1/draft.png' }))
      const { id } = JSON.parse(start.text)
      const edit = await host.web.fetch('POST', '/imagestudio/api/webclone/edit', JSON.stringify({ id, file: 'index.html', instruction: '改标题' }))
      assert.equal(edit.status, 502)
      assert.match(JSON.parse(edit.text).error, /重试/)
      assert.equal(provider.calls(), 3, 'start 1 次 + edit 2 次（重试一次后放弃）')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
