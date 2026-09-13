import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { studioPage } from '../packages/ui/src/studio-page.ts'
import { assertInsideWorkspace } from '../packages/assets/src/paths.ts'
import { PathEscapeError } from '../packages/core/src/errors.ts'

describe('image-ui workbench', () => {
  it('ships VisioWork-like pages + FANTASY skills (original markup)', () => {
    const html = studioPage({ embed: true })
    assert.match(html, /Image Studio/)
    assert.match(html, /生图/)
    assert.match(html, /我的素材/)
    assert.match(html, /无限画布/)
    assert.match(html, /电商/)
    assert.match(html, /设置/)
    assert.match(html, /视频/)
    assert.match(html, /动图/)
    assert.match(html, /文生图/)
    assert.match(html, /图生图/)
    assert.match(html, /反推/)
    assert.match(html, /仍然出图/)
    assert.match(html, /就这样出图/)
    assert.match(html, /回对话/)
    assert.match(html, /href="\/"/)
    assert.match(html, /想方案/)
    assert.match(html, /data-brief/)
    assert.match(html, /cinema-dna-21x9x3/)
    assert.match(html, /life-force-portrait/)
    assert.match(html, /photography-simulation/)
    assert.match(html, /movie-poster/)
    assert.match(html, /character-casting/)
    // gallery 页签已删除，能力由「我的素材」承接
    assert.doesNotMatch(html, /data-page="gallery"/)
    assert.doesNotMatch(html, /低于 82 分不出图|data-dsh-imagegen-session-tabs/)
  })

  it('top tabs are the frozen ten in order', () => {
    const html = studioPage({})
    const nav = html.match(/<nav class="tabs"[^>]*>([\s\S]*?)<\/nav>/)
    assert.ok(nav, 'tabs nav missing')
    const pages = [...nav[1].matchAll(/data-page="([^"]+)"/g)].map((m) => m[1])
    assert.deepEqual(pages, ['gen', 'video', 'gif', 'reverse', 'canvas', 'uidesign', 'assets', 'ecom', 'tpl', 'settings'])
  })

  it('gen mode chips are down to 文生图/图生图 only', () => {
    const html = studioPage({})
    const modes = html.match(/<div class="row" id="modes">([\s\S]*?)<\/div>/)
    assert.ok(modes, 'modes row missing')
    const list = [...modes[1].matchAll(/data-mode="([^"]+)"/g)].map((m) => m[1])
    assert.deepEqual(list, ['txt', 'img'])
  })

  it('defaults cinema-dna to 21:9 but user can change ratio', () => {
    const html = studioPage({})
    assert.match(html, /state\.ratio\s*=\s*'21:9'/)
    assert.match(html, /cinema-dna-21x9x3/)
    assert.match(html, /改得动/)
  })

  it('entry script adds 技能台 and yields 生图 to dsh-imagegen when present', () => {
    const js = readFileSync(new URL('../packages/ui/src/entry.js', import.meta.url), 'utf8')
    assert.match(js, /技能台/)
    assert.match(js, /\/imagestudio/)
    assert.match(js, /data-dsh-imagegen-session-tabs/)
    assert.doesNotMatch(js, /textContent = ["']生图["']/)
  })

  it('image-ui also uses official webserver/index-inject', () => {
    const src = readFileSync(new URL('../packages/ui/src/index.ts', import.meta.url), 'utf8')
    assert.match(src, /webserver\/index-inject/)
    assert.match(src, /script-src/)
    assert.match(src, /\/imagestudio\/entry\.js/)
  })

  it('file API rejects path escape as PathEscapeError (AC-UI-09)', () => {
    assert.throws(() => assertInsideWorkspace('/tmp/ws', '../etc/passwd'), PathEscapeError)
  })
})
