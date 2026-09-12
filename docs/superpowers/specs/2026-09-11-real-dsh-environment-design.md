# Real DSH environment for Image Studio

> Date: 2026-09-11
> Status: executing (user: 预览必须是完整 DSH，禁止精简/手戳版)
> Binding: `attachments/01-设计文档.md` §0 / §1.3, `02-设计规范.md`, `03-验收规范.md`
> Upstream: https://github.com/deepseek-ai/deepseek-harness (`npx @deepseek-ai/dsh web`)

## Problem

Current preview is a TanStack film-lab that calls MiniTools. That **violates 01 §1.3** (do not rebuild agent chat / web UI). The user cannot see DeepSeek Harness: no sidebar, no session, no plugin inventory, no agent loop.

## Goal

The live preview **is** official `dsh web` (DeepSeek Harness GUI). Image Studio loads as Cordis plugins on the **host plane** via `--patch`. The model sees ≤6 `image_*` tools. Offline CI keeps mock + node:test.

## Approaches considered

| | A. Reverse-proxy real `dsh web` | B. iframe DSH inside film-lab | C. Keep MiniTools UI |
|---|---|---|---|
| User sees real Harness | yes | yes, framed | no |
| Matches 01 §1.3 | yes | partial | **violates** |
| Grok preview `:8080` / `0.0.0.0` | proxy (CLI rejects `--host 0.0.0.0`) | vite + iframe | current |
| Token cookie / Origin fence | proxy holds cookie, rewrites Host to loopback | fragile | n/a |

**Chosen: A.**

## Architecture

```
Grok preview  →  0.0.0.0:8080  (scripts/dev-dsh.mjs reverse proxy)
                     │  strips Origin / sec-fetch-site
                     │  Host: 127.0.0.1:3080
                     │  Cookie: launch token (captured from dsh stdout)
                     ▼
              dsh web 127.0.0.1:3080 --no-open --patch examples/dsh-web.patch.yml
                     │
                     ├ host plane: image-core, compose, guard, assets, skills,
                     │             provider-mock, provider-openai (xAI if key),
                     │             image-tools
                     └ agent plane: shipped `standard` preset (tools registry
                                    is host-wide, so image_* appear in every session)
```

Vercel `npm run build` remains a plugin landing (Harness cannot run on serverless). Live preview is the product.

## Non-goals this pass

- npm publish / publint / lib/*.js rewrite of every import to package names (tracked, not blocking the GUI)
- Human AC-HQ sampling
- Replacing the deterministic skill compiler with live LLM directors (optional `ctx.llm` later)
- Gemini/Nova real upstream

## Load contract

- Plugins: `name` / `inject` / Schemastery `Config` / `apply`
- Tools: `@deepseek-ai/dsh-tools` `defineTool` with valid `output.schema` (`object`, not `json`) + `output.render`
- No MiniTools / no `bootStudio` on the preview path
- `host` package is test-only; never `provide('tools'|'llm'|'jobs')` inside real dsh
- Secrets: env names only (`XAI_API_KEY`, `IMAGE_STUDIO_KEY`)
- Absolute file URLs in the patch (loader resolves `--patch` relatives against the patch file)

## Acceptance for this pass

1. Preview HTML title / brand is **DeepSeek Harness**
2. Sidebar, chat input, settings, plugin inventory render
3. Host fibers for `image-core` / `image-tools` / `image-provider-mock` are ACTIVE
4. Model-visible tools include the six `image_*` names
5. A session can call `image_skill_plan` then `image_generate` (mock) without leaving the Harness
