# Real DSH environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put official DeepSeek Harness (`dsh web`) on the live preview and load dsh-image-studio as host-plane Cordis plugins.

**Architecture:** Reverse-proxy `0.0.0.0:8080` → loopback `dsh web :3080` with cookie/Host rewrite. `--patch` inserts image-* plugins from `/workspace/vendor/dsh-imagestudio`. MiniTools is test-only.

**Tech Stack:** `@deepseek-ai/dsh@0.1.5-rc.1`, `dsh-web-app`, `dsh-tools@0.1.5-rc.2`, `cordis@4.0.2`, Node 22 strip-types.

**Spec:** `docs/superpowers/specs/2026-09-11-real-dsh-environment-design.md`

## Global Constraints

- Preview product IS `dsh web`, not a custom studio UI
- CLI cannot `--host 0.0.0.0`; proxy binds that
- `@deepseek-ai/cordis` peerDep only
- Tools ≤ 6, `image_<verb>`, execute returns JSON, render emits blocks
- `output.schema.type` must be a supported JSON Schema type (never `json`)
- Never provide `tools` / `llm` / `jobs` from our host package inside real dsh
- Offline tests stay green without API keys

---

### Task 1: Valid tool schema + load-safe jobs/llm

- [x] Change `output.schema` from `{type:'json'}` to object schema
- [x] `persistGenerate` already no-ops when `jobs.enqueue` is missing
- [x] `loadBytes` must `assertInsideWorkspace`

### Task 2: Host-plane patch

- [x] `examples/dsh-web.patch.yml` with absolute `name:` paths
- [x] Insert core/compose/guard/assets/skills/mock/openai/tools
- [x] Persona prefix names the six tools in Chinese

### Task 3: Preview = dsh web

- [x] `scripts/dev-dsh.mjs` spawn + reverse proxy + grok script inject
- [x] `npm run dev` and `startup.sh` use it
- [x] `/__dsh-ready` health

### Task 4: Verify

- [ ] `dsh web` prints token URL
- [ ] Preview document contains DeepSeek Harness
- [ ] Plugin fibers ACTIVE / tools listed
