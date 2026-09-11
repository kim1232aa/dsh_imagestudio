import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { studioPage } from '../packages/ui/src/studio-page.ts'
import { assertInsideWorkspace } from '../packages/assets/src/paths.ts'
import { PathEscapeError } from '../packages/core/src/errors.ts'

describe('image-ui workbench', () => {
  it('ships an original Nova+skill page', () => {
    const html = studioPage({ embed: true })
    assert.match(html, /Image Studio/)
    assert.match(html, /文生图/)
    assert.match(html, /图生图/)
    assert.match(html, /Skill 策划/)
    assert.match(html, /反推/)
    assert.match(html, /三联/)
    assert.match(html, /开始生成/)
    assert.match(html, /灵感/)
    assert.match(html, /data-brief/)
    assert.match(html, />对话</)
    assert.match(html, /cinema-dna-21x9x3/)
    assert.match(html, /life-force-portrait/)
    assert.match(html, /photography-simulation/)
    assert.match(html, /movie-poster/)
    assert.match(html, /character-casting/)
    assert.doesNotMatch(html, /无限画布|电商模式|VisioWork|data-dsh-imagegen-session-tabs/)
  })

  it('locks cinema-dna to 21:9 in the page script', () => {
    const html = studioPage({})
    assert.match(html, /lockRatio:true/)
    assert.match(html, /state.ratio='21:9'/)
    assert.match(html, /cinema-dna-21x9x3/)
  })

  it('entry script adds a 生图 control without vendor selectors', () => {
    const js = readFileSync(new URL('../packages/ui/src/entry.js', import.meta.url), 'utf8')
    assert.match(js, /生图/)
    assert.match(js, /\/imagestudio/)
    assert.doesNotMatch(js, /data-dsh-imagegen-session-tabs/)
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
