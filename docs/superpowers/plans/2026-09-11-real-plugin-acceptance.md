# Real DSH plugin acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `dsh-imagestudio` an installable DeepSeek Harness bundle whose six `image_*` tools are visible in official `dsh web`, and prove P-level acceptance against that host — not MiniTools.

**Architecture:** One npm package `dsh-imagestudio` declares `dsh.bundle`. Its `cordis.patch.yml` inserts host-plane rows by export path. `image-tools.apply` registers `defineTool` on `ctx.tools` and a Chinese `systemPrompt` section. Offline `node:test` stays mock-only; a new `tests/real-dsh.test.ts` dumps real config and boots the plugin graph without MiniTools.

**Tech Stack:** `@deepseek-ai/dsh@0.1.5-rc.1`, `cordis@4.0.2`, `dsh-tools@0.1.5-rc.2`, `schemastery@3.18.2`, Node 22 `--experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-09-11-real-plugin-acceptance-design.md` plus `attachments/01-设计文档.md` / `02-设计规范.md` / `03-验收规范.md`.

## Global Constraints

- Preview product IS official `dsh web`, never `src/routes/index.tsx`
- `@deepseek-ai/cordis` is peerDependencies + devDependencies, never dependencies
- Tools ≤ 6, names `image_<verb>`, execute returns JSON, render emits blocks
- `cordis.patch.yml` `name:` values are package specifiers, never absolute `file://` paths
- `packages/host` is test-only; never `provide('tools'|'llm'|'jobs')` inside real dsh
- Secrets: env var names only (`XAI_API_KEY`, `IMAGE_STUDIO_KEY`)
- Offline tests: no API keys
- Do not call the work "accepted" until Layer 2 (real dsh dump-config + schemas) is green

## File map

| File | Responsibility |
|---|---|
| `vendor/dsh-imagestudio/package.json` | `dsh.bundle`, `exports`, files |
| `vendor/dsh-imagestudio/cordis.patch.yml` | Official insert list (package specifiers) |
| `vendor/dsh-imagestudio/packages/tools/src/index.ts` | `defineTool` + `systemPrompt.section` |
| `vendor/dsh-imagestudio/tests/real-dsh.test.ts` | Layer 2 acceptance |
| `vendor/dsh-imagestudio/docs/verified-against.md` | Honest remaining P list |
| `scripts/dev-dsh.mjs` | Preview still `dsh web`; prefer profile bundle, `--patch` only as overlay of the *bundle* patch |
| `.dsh-home/profiles/web/package.json` | `dsh.profile.bundles` includes `dsh-imagestudio` |

---

### Task 1: Official bundle manifest

**Files:**
- Modify: `vendor/dsh-imagestudio/package.json`
- Modify: `vendor/dsh-imagestudio/cordis.patch.yml`

**Interfaces:**
- Produces: package `dsh-imagestudio` with exports `./core` `./compose` `./guard` `./assets` `./skills` `./provider-mock` `./provider-openai` `./tools` `./boot` and `dsh.bundle.patch = ./cordis.patch.yml`

- [ ] **Step 1: Write the failing Layer-2 assertion for dsh.bundle**

Add the start of `tests/real-dsh.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('AC-CP bundle shape', () => {
  it('declares dsh.bundle.patch and package-specifier rows', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    assert.equal(typeof pkg.dsh?.bundle?.patch, 'string')
    const patch = readFileSync(join(root, pkg.dsh.bundle.patch), 'utf8')
    assert.equal(patch.includes('file:///'), false)
    assert.equal(patch.includes('/workspace/'), false)
    for (const id of ['image-core', 'image-tools', 'image-provider-mock', 'image-skills']) {
      assert.ok(patch.includes(`id: ${id}`), id)
    }
  })
})
```

- [ ] **Step 2: Run it to see FAIL**

```bash
cd /workspace/vendor/dsh-imagestudio
node --test --experimental-strip-types tests/real-dsh.test.ts
```

Expected: FAIL `dsh.bundle.patch` undefined (or file URLs present).

- [ ] **Step 3: Implement package.json + cordis.patch.yml**

`package.json` additions (keep existing peerDeps / scripts / workspaces):

```json
{
  "name": "dsh-imagestudio",
  "exports": {
    ".": "./packages/core/src/index.ts",
    "./core": "./packages/core/src/index.ts",
    "./compose": "./packages/compose/src/index.ts",
    "./guard": "./packages/guard/src/index.ts",
    "./assets": "./packages/assets/src/index.ts",
    "./skills": "./packages/skills/src/index.ts",
    "./provider-mock": "./packages/provider-mock/src/index.ts",
    "./provider-openai": "./packages/provider-openai/src/index.ts",
    "./tools": "./packages/tools/src/index.ts"
  },
  "files": ["packages", "skills", "cordis.patch.yml", "README.md", "LICENSE"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

Replace `cordis.patch.yml` with:

```yaml
- insert:
    - id: image-core
      name: dsh-imagestudio/core
    - id: image-compose
      name: dsh-imagestudio/compose
    - id: image-guard
      name: dsh-imagestudio/guard
    - id: image-assets
      name: dsh-imagestudio/assets
      config:
        keepLastTasks: 50
        outputDir: .dsh/image-studio
    - id: image-skills
      name: dsh-imagestudio/skills
      config:
        dir: skills
        enabled:
          - cinema-dna-21x9x3
          - life-force-portrait
          - photography-simulation
          - movie-poster
          - character-casting
    - id: image-provider-mock
      name: dsh-imagestudio/provider-mock
      config:
        id: mock
        model: mock-fixture
        latencyMs: 40
    - id: image-provider-openai
      name: dsh-imagestudio/provider-openai
      config:
        providers:
          - id: xai-imagine
            protocol: openai-image
            model: grok-imagine-image
            baseUrl: https://api.x.ai/v1
            apiKeyEnv: XAI_API_KEY
    - id: image-tools
      name: dsh-imagestudio/tools
      config:
        limits:
          concurrency: 3
          perTaskTimeoutMs: 180000
          maxImagesPerCall: 4
```

Skills `dir` must resolve relative to the package root after install. In `packages/skills` `apply`, if `config.dir` is not absolute, join with `fileURLToPath(new URL('../../..', import.meta.url))` (package root).

Sandbox preview overlay `examples/dsh-web.patch.yml` may still set **absolute** `dir` / `workspaceRoot` because this workspace is not an npm install. That overlay is a *config override by id*, restating every key (规范 §6 patch 覆盖). It must not re-insert `file://` module names.

- [ ] **Step 4: Re-run test — PASS**

```bash
node --test --experimental-strip-types tests/real-dsh.test.ts
```

Expected: PASS the bundle-shape test.

---

### Task 2: Prompt section so the agent is told about the six tools

**Files:**
- Modify: `vendor/dsh-imagestudio/packages/tools/src/index.ts`
- Test: `vendor/dsh-imagestudio/tests/real-dsh.test.ts`

**Interfaces:**
- Consumes: `ctx.tools.register`, optional `ctx.systemPrompt`
- Produces: six tools + section `image-studio`

- [ ] **Step 1: Failing test — apply registers a prompt section when systemPrompt exists**

```ts
it('AC-TL-02 projected schemas are name/description/parameters only', async () => {
  // see Task 3 host-less boot; assert JSON.stringify(schemas) has no execute/output
})
```

- [ ] **Step 2: In `apply`, after tool register, contribute a section**

```ts
const sp = ctx.get('systemPrompt', false) as
  | { section: (s: { name: string; content: string; order?: number }) => void }
  | undefined
if (sp?.section) {
  sp.section({
    name: 'image-studio',
    order: 3500,
    content: [
      '对用户使用中文。图像能力由 dsh-image-studio 提供，共六个工具：',
      'image_skill_plan（先编译 CreativePlan，默认 cinema-dna-21x9x3）',
      'image_generate（传 planId；不要自己拼生图管线）',
      'image_compose（三联纵向拼接 8–12px 黑边，或精确中文叠字）',
      'image_edit（life-force MODE A 保身份）',
      'image_describe（参考图只分析，默认不得当 i2i 底图）',
      'image_assets（列出 .dsh/image-studio 产物）',
      '硬约束由插件强制：21:9 三联 / 海报 3:4，评分 <82 或一票否决不调用 provider。',
      '默认 provider 是 mock。只有用户点名真实模型时才传 providerId=xai-imagine。',
      '禁止用 bash/node 手写生图脚本。',
    ].join('\n'),
  })
}
```

Use the real `dsh-system-prompt` API if the stub field names differ (`text` vs `content`) — read `node_modules/@deepseek-ai/dsh-system-prompt/lib/types/index.d.ts` and match it. Wrap in `ctx.effect` if the API returns a disposer.

- [ ] **Step 3: Run existing MiniTools tests — still PASS** (section is optional via `ctx.get(..., false)`).

---

### Task 3: Layer 2 — dump-config + schemas on real loader

**Files:**
- Modify: `tests/real-dsh.test.ts`
- Modify: `scripts/dev-dsh.mjs` (PATCH may point at bundle `cordis.patch.yml` plus a tiny workspace overlay for absolute skills dir)
- Modify: `.dsh-home/profiles/web/package.json` to depend on the local bundle if `dsh plugin add` succeeds

- [ ] **Step 1: dump-config assertion**

```ts
import { spawnSync } from 'node:child_process'

it('AC-LC-01 dump-config includes image-* rows from the bundle', () => {
  const r = spawnSync(
    process.execPath,
    [
      '/workspace/node_modules/@deepseek-ai/dsh/lib/bin.js',
      '--profile', 'web',
      '--patch', join(root, 'cordis.patch.yml'),
      '--dump-config',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        DSH_HOME: process.env.DSH_HOME || '/workspace/.dsh-home',
        DSH_TELEMETRY_DISABLED: '1',
        NODE_OPTIONS: '--experimental-strip-types',
      },
    },
  )
  assert.equal(r.status, 0, r.stderr)
  for (const id of ['image-core', 'image-tools', 'image-provider-mock']) {
    assert.ok(r.stdout.includes(`id: ${id}`), id)
  }
  assert.equal(r.stdout.includes('image-studio-boot'), false)
})
```

If dump-config cannot resolve `dsh-imagestudio/core` until the profile depends on the package, first run:

```bash
cd /workspace
export DSH_HOME=/workspace/.dsh-home
node node_modules/@deepseek-ai/dsh/lib/bin.js plugin --profile web add /workspace/vendor/dsh-imagestudio
```

Expected: profile `package.json` `dsh.profile.bundles` contains `dsh-imagestudio`. If pnpm in the profile rejects workspace TypeScript exports, keep `--patch` but change `examples/dsh-web.patch.yml` `name:` to the same export specifiers, and add `NODE_PATH` / package `exports` so the web profile can resolve `dsh-imagestudio`. Do **not** invent MiniTools.

- [ ] **Step 2: schemas() on a Context that uses real dsh-tools ToolRuntime, not MiniTools**

If a full `dsh web` boot inside node:test is too heavy, construct the **same plugin modules** on a Context that `provide`s the real `@deepseek-ai/dsh-tools` service (import the plugin as `dsh-tools` does in production), then `ctx.plugin` core/compose/guard/assets/skills/mock/tools. Assert:

- fibers named `image-core` / `image-tools` / `image-provider-mock` state === 2
- `ctx.tools.schemas().map(s => s.name)` includes the six names
- `JSON.stringify(ctx.tools.schemas())` has no `"execute"` / `"output"`
- `image_generate` `{ n: 'three' }` → INVALID_ARGS
- `image_skill_plan` + `image_generate` with mock writes `shot-1.png` under the temp workspace

This is still "real contracts" (dsh-tools + cordis), not MiniTools. A separate optional live check: HTTP GET running preview `/` title contains `DeepSeek Harness`.

- [ ] **Step 3: Point preview `--patch` at the bundle patch**

`scripts/dev-dsh.mjs`: `PATCH` = bundle `cordis.patch.yml` plus, if skills dir must be absolute in this sandbox, a second overlay that **overrides config by id only**. Restart via `startup.sh`.

- [ ] **Step 4: Visual QA**

```bash
node /workspace/scripts/browser-smoke.mjs http://127.0.0.1:8080/ /workspace/screenshots/app-builder-preview.png
```

Desktop screenshot must show DeepSeek Harness (sidebar + "Into the Unknown" / chat), **not** "Director first, then generate". Copy is the live preview. Then open Settings → Plugins and screenshot `image-core` / `image-tools` ACTIVE.

---

### Task 4: Honest verified-against + remaining P list

**Files:**
- Modify: `docs/verified-against.md`

Record:

- dsh `@deepseek-ai/dsh@0.1.5-rc.1` / cordis `4.0.2` / dsh-tools `0.1.5-rc.2`
- Layer 1: list AC IDs the MiniTools tests actually assert
- Layer 2: AC-LC-01 dump-config, AC-TL-02 schemas, bundle shape
- Still open P: AC-LC-05 why-is-node-running, AC-TL-06 401, AC-TL-10/11 cancel+timeout, AC-SEC-04/05, AC-AS-07, AC-CP-02 publint, AC-PF-04/05, AC-HQ
- Explicit sentence: **not release-ready until remaining P are green**

---

## Self-review

- 01 §1.3: Task 3 preview QA forbids the film-lab surface.
- 02 §1.1 / publish doc: Task 1 `dsh.bundle`.
- 02 §3 tools: Task 2/3 defineTool + schemas projection.
- 03 Layer 2: Task 3.
- No MiniTools on the preview path.
