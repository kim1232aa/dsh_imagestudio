/**
 * Standalone tsdown build for the dsh-imagestudio browser half.
 *
 * Replicates the dsh client-bundle contract (DeepSeek-Harness
 * packages/client/tsdown.client.ts preset), pattern copied from
 * /mnt/agents/output/work/dsh-imagegen/tsdown.config.ts: a single CJS browser
 * bundle that registers itself via
 * `window.__ModuleLoader__.load({ id, factory })`, resolving platform modules
 * through the injected require and inlining everything else. This package has
 * no node half (the host half is the repo-root plugin.ts), no CSS modules and
 * no runtime @deepseek-ai/* imports, so the dsh-imagegen CSS-plugin and
 * dual-entry machinery are intentionally omitted.
 */
import type { UserConfig } from 'tsdown'

/** Plugin id (root package name) stamped into the __ModuleLoader__ handoff. */
const ID = '@dsh-imagestudio/dsh-image-ui'

/**
 * Module specifiers the web shell shares into the frozen module table
 * (mirror of @deepseek-ai/dsh-client-web PLATFORM_MODULES). Everything else
 * is inlined. Type-only @deepseek-ai/* imports are erased at compile time
 * and never reach the runtime require.
 */
const CLIENT_EXTERNALS: readonly string[] = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-store',
]

/** Browser half: the __ModuleLoader__ registration bundle. */
const clientConfig: UserConfig = {
  name: `${ID}/client`,
  entry: { client: 'src/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  deps: {
    // Platform modules resolve from the injected require (loader module
    // table); everything else is inlined by the bundle.
    neverBundle: [...CLIENT_EXTERNALS],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [clientConfig]
