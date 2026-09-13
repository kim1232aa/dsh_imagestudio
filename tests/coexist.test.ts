import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOOL_NAMES } from '../packages/tools/src/tools.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

describe('coexist with @dickpy/dsh-imagegen', () => {
  it('never registers generate_image / edit_image / task tools', () => {
    const banned = [
      'generate_image',
      'edit_image',
      'image_generate',
      'image_edit',
      'get_image_generation_task',
      'cancel_image_generation_task',
    ]
    for (const name of banned) {
      assert.equal(TOOL_NAMES.includes(name as never), false, name)
    }
    for (const name of TOOL_NAMES) {
      assert.match(name, /^istudio_/)
    }
  })

  it('does not steal /favicon.ico or /api/dsh-imagegen', () => {
    const src = readFileSync(join(root, 'packages/ui/src/index.ts'), 'utf8')
    assert.doesNotMatch(src, /path:\s*'\/favicon\.ico'/)
    assert.doesNotMatch(src, /\/api\/dsh-imagegen/)
    assert.match(src, /\/imagestudio/)
  })

  it('system prompt tells the agent to keep dsh-imagegen as the default studio', () => {
    const src = readFileSync(join(root, 'plugin.ts'), 'utf8')
    assert.match(src, /generate_image/)
    assert.match(src, /dsh-imagegen/)
    assert.match(src, /技能台/)
  })
})
