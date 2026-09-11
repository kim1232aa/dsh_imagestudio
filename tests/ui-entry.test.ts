import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { studioPage } from '../packages/ui/src/studio-page.ts'

describe('image-ui workbench', () => {
  it('ships an original Nova+skill page', () => {
    const html = studioPage({ embed: true })
    assert.match(html, /Image Studio/)
    assert.match(html, /cinema-dna-21x9x3/)
    assert.match(html, /life-force-portrait/)
    assert.match(html, /photography-simulation/)
    assert.match(html, /movie-poster/)
    assert.match(html, /character-casting/)
    assert.doesNotMatch(html, /data-dsh-imagegen-session-tabs/)
  })

  it('entry script adds a 生图 control without vendor selectors', () => {
    const js = readFileSync(new URL('../packages/ui/src/entry.js', import.meta.url), 'utf8')
    assert.match(js, /生图/)
    assert.doesNotMatch(js, /data-dsh-imagegen-session-tabs/)
  })
})
