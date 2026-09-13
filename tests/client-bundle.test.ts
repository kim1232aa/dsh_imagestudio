import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const ROOT = join(import.meta.dirname, '..')
const ENTRY_JS = join(ROOT, 'packages/ui/src/entry.js')
const BUNDLE = join(ROOT, 'packages/client/lib/client.js')
const CLIENT_SRC = join(ROOT, 'packages/client/src/index.ts')
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  exports: Record<string, string>
  dsh: { client: { platform: string; inject: string[]; external?: string[]; immediately?: boolean } }
  scripts: Record<string, string>
}

describe('M4 client bundle', () => {
  it('entry.js exits when the client bundle is active (mutual exclusion)', () => {
    const js = readFileSync(ENTRY_JS, 'utf8')
    // Early exit at the top of the IIFE.
    assert.match(js, /document\.documentElement\.dataset\.istudioClientActive/)
    // Late-activation self-teardown inside ensureButton (observer + interval).
    assert.match(js, /clientBundleActive\(\)/)
    assert.match(js, /obs\.disconnect\(\)/)
    assert.match(js, /clearInterval\(timer\)/)
  })

  it('client source sets the active flag and registers all slot surfaces', () => {
    const src = readFileSync(CLIENT_SRC, 'utf8')
    assert.match(src, /istudioClientActive/)
    assert.match(src, /export const inject = \['slots', 'locale', 'connection'\]/)
    const sidebar = readFileSync(join(ROOT, 'packages/client/src/sidebar.tsx'), 'utf8')
    assert.match(sidebar, /name: 'sidebar\.panellist'/)
    assert.match(sidebar, /id: 'imagestudio'/)
    const panel = readFileSync(join(ROOT, 'packages/client/src/panel.tsx'), 'utf8')
    assert.match(panel, /name: 'main', key: 'imagestudio'/)
    assert.match(panel, /\/imagestudio/)
    const toolview = readFileSync(join(ROOT, 'packages/client/src/toolview.tsx'), 'utf8')
    for (const key of ['istudio_generate', 'istudio_edit', 'istudio_compose']) {
      assert.ok(toolview.includes(`'${key}'`), `toolview covers ${key}`)
    }
    assert.match(toolview, /tool\.call\.toolview/)
    assert.match(toolview, /PLAN_REJECTED/)
    assert.match(toolview, /\/imagestudio\/api\/file\?path=/)
    assert.match(toolview, /istudio:open-canvas/)
  })

  it('root manifest declares dsh.client per parseDshClient and points ./client at the bundle', () => {
    assert.equal(PKG.exports['./client'], './packages/client/lib/client.js')
    const decl = PKG.dsh.client
    assert.equal(typeof decl.platform, 'string')
    assert.equal(decl.platform, 'web')
    assert.ok(Array.isArray(decl.inject) && decl.inject.every(item => typeof item === 'string'))
    assert.ok(decl.inject.includes('@deepseek-ai/dsh-client-ui-sidebar'))
    assert.ok(decl.inject.includes('@deepseek-ai/dsh-client-ui-tool'))
    if (decl.external !== undefined) {
      assert.ok(Array.isArray(decl.external) && decl.external.every(item => typeof item === 'string'))
    }
    if (decl.immediately !== undefined) assert.equal(typeof decl.immediately, 'boolean')
    assert.ok(PKG.scripts['build:client'], 'build:client script exists')
  })

  it('built bundle exists and has the closure-factory shape', () => {
    if (!existsSync(BUNDLE)) {
      // Bundle is a build artifact; skip with a diagnostic when not built yet.
      console.warn('packages/client/lib/client.js missing — run npm run build:client')
      return
    }
    const bundle = readFileSync(BUNDLE, 'utf8')
    assert.match(bundle, /window\.__ModuleLoader__\.load\(\{/)
    assert.match(bundle, /id:\s*"@dsh-imagestudio\/dsh-image-ui"/)
    assert.match(bundle, /factory:\s*\(require\)\s*=>\s*\{/)
    // Platform modules stay external (resolved through the injected require).
    assert.match(bundle, /require\("react\/jsx-runtime"\)/)
    assert.match(bundle, /exports\.apply = apply/)
  })

  it('bundle apply() registers sidebar row, main panel, and three toolviews (mock ctx)', () => {
    if (!existsSync(BUNDLE)) {
      console.warn('packages/client/lib/client.js missing — run npm run build:client')
      return
    }
    interface LoadCall { id: string; factory: (require: unknown) => Record<string, unknown> }
    const loaded: LoadCall[] = []
    const g = globalThis as Record<string, unknown>
    const previousWindow = g.window
    g.window = { __ModuleLoader__: { load(call: LoadCall) { loaded.push(call) } } }
    try {
      const require = createRequire(join(ROOT, 'package.json'))
      require(BUNDLE)
      assert.equal(loaded.length, 1)
      assert.equal(loaded[0].id, '@dsh-imagestudio/dsh-image-ui')
      const plugin = loaded[0].factory((specifier: string) => require(specifier)) as {
        name: string
        inject: string[]
        apply: (ctx: unknown) => void
      }
      assert.deepEqual(plugin.inject, ['slots', 'locale', 'connection'])

      const registrations: Array<Record<string, unknown>> = []
      const injected: string[] = []
      const slots = {
        register(options: Record<string, unknown>, _component: unknown) {
          registrations.push(options)
          return () => {}
        },
        inject(name: string, body: () => unknown) {
          injected.push(name)
          const produced = body()
          // Drain generator bodies (registrations live in the yields).
          if (produced !== null && typeof produced === 'object' && Symbol.iterator in produced) {
            for (const _ of produced as Iterable<unknown>) { /* drain */ }
          }
        },
      }
      const effects: string[] = []
      const ctx = {
        slots,
        get: () => undefined,
        effect(fn: () => unknown, label?: string) {
          effects.push(label ?? '')
          fn()
        },
      }
      plugin.apply(ctx)

      assert.deepEqual(injected.sort(), ['main', 'tool.call.toolview'])
      const panellist = registrations.find(r => r.name === 'sidebar.panellist')
      assert.ok(panellist, 'sidebar.panellist registered')
      assert.equal(panellist.id, 'imagestudio')
      assert.equal(typeof panellist.order, 'number')
      assert.equal(typeof panellist.label, 'function')
      const main = registrations.find(r => r.name === 'main')
      assert.ok(main, 'main panel registered')
      assert.equal(main.key, 'imagestudio')
      const toolKeys = registrations
        .filter(r => r.name === 'tool.call.toolview')
        .map(r => r.key)
        .sort()
      assert.deepEqual(toolKeys, ['istudio_compose', 'istudio_edit', 'istudio_generate'])
      assert.ok(effects.length >= 2, 'surfaces wrapped in ctx.effect')
    } finally {
      if (previousWindow === undefined) delete g.window
      else g.window = previousWindow
    }
  })
})
