# DSH Image Studio alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close P-level gaps so the repo is a Cordis-shaped dsh plugin (packaging, defineTool, effect registration, remaining AC tests) without breaking offline CI or the preview host.

**Architecture:** Dual-mode v0.1. MiniTools + mock for CI; real `defineTool` / `ctx.effect` / Schemastery Config so a real dsh loader can mount the same modules. Skill compiler stays deterministic with original SKILL.md on disk.

**Tech Stack:** Node 22.19+/24, `@deepseek-ai/cordis@^4.0.2`, `@deepseek-ai/dsh-tools@0.1.5-rc.2`, `@deepseek-ai/schemastery@3.18.2`, ESM + type-stripping.

**Spec:** `docs/superpowers/specs/2026-09-11-gap-close-design.md` plus `docs/design.md` / `docs/spec.md` / `docs/acceptance.md`.

## Global Constraints

- Package names: `@dsh-imagestudio/dsh-image-<name>`
- `@deepseek-ai/cordis` is peerDependencies + devDependencies, never dependencies
- ESM only, `"type": "module"`
- Tools ≤ 6, names `image_<verb>`
- `output.schema` + `output.render` required; execute returns JSON only
- Waterfall observers return `next()`
- Secrets: env var names only
- Offline tests: `node --test --experimental-strip-types tests/*.test.ts` — 0 fail, no API keys
- Preview continues to boot via `packages/host`

---

### Task 1: Per-package packaging

**Files:** Create `packages/*/package.json` and `packages/*/README.md`. Modify root `package.json`, `tsconfig.json`, `examples/cordis.yml`.

- [x] **Step 1:** Add workspace package.json with peer+dev cordis
- [x] **Step 2:** README `Requires:` per plugin
- [x] **Step 3:** `allowImportingTsExtensions` so typecheck can see `.ts` imports

### Task 2: Real defineTool + lifecycle effects

**Files:** `packages/tools/src/define.ts`, `packages/tools/src/index.ts`, providers `apply()`, `packages/core/src/index.ts`, `packages/host/src/minitools.ts`

- [x] **Step 1:** `defineTool` from `@deepseek-ai/dsh-tools` with `output.schema`/`render`
- [x] **Step 2:** `ctx.effect(() => ctx.imagegen.register(...))`
- [x] **Step 3:** Tests AC-TL-03/04/05/07, AC-LC-03/05, AC-EV-03/05

### Task 3: Skill engine remaining P items

**Files:** `packages/skills/src/compile.ts`, `load.ts`, `schema.ts`, skill `SKILL.md` originals

- [x] **Step 1:** Original SKILL.md
- [x] **Step 2:** CharacterSheet producer, poster extra shot, MODE B field, rubric score, trigger field
- [x] **Step 3:** Tests AC-SK-01/02/18/30/31/33

### Task 4: Assets / security / jobs wiring

**Files:** `packages/core/src/pipeline.ts`, `packages/assets/src/store.ts`, `packages/host/src/stubs.ts`

- [x] **Step 1:** concurrency gate, cleanup on fail, jobs.enqueue
- [x] **Step 2:** Tests AC-AS-01/02/04/05, AC-SEC-01/03

### Task 5: Verify

- [ ] Run `node --test --experimental-strip-types tests/*.test.ts`
- [ ] Run `tsc --noEmit`
- [ ] Preview host still boots
