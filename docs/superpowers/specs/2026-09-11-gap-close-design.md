# Gap-close design: make dsh-image-studio a real dsh plugin

> Date: 2026-09-11
> Status: executing (design docs 01/02/03 already approved; this spec only records *how* we close the remaining P-level gaps)
> Binding authority: `docs/design.md` + `docs/spec.md` + `docs/acceptance.md`

## Problem

The tree is a working **in-process studio** (36 tests, MiniTools host, deterministic compiler). It is **not** yet a loadable dsh plugin against 设计规范 §1 and 验收规范 P-level.

## Approach (chosen)

**Dual-mode v0.1.** Offline CI keeps MiniTools + mock provider + deterministic compile (acceptance §0: no API keys). Production-shaped modules use the real contracts so a real dsh host can load them:

1. Each package is `@dsh-imagestudio/dsh-image-<name>` with `name` / `inject` / Schemastery `Config` / `apply`.
2. Tools are defined with `@deepseek-ai/dsh-tools` `defineTool` including `output.schema` + `output.render`. MiniTools still hosts them in tests (does not inject `systemPrompt`).
3. Provider `register()` is wrapped in `ctx.effect()` so dispose/HMR drop the registry entry.
4. Hard constraints stay machine-enforced. Soft judgment stays in `reasoning`. Compiler remains deterministic with an optional `ctx.llm` hook (empty stub in CI).
5. SKILL.md is the upstream original, uncut, where the repo publishes one.

## Non-goals this pass

- Real Gemini/Nova upstream parse (adapters stay honest stubs with Config).
- Human AC-HQ sampling.
- AC-PF-04/05 soak (documented remaining).
- Replacing MiniTools with full `ToolRuntime` (needs `systemPrompt` from dsh).
- Publishing to npm.

## Contract reminders (copied from spec)

- Waterfall observers **must** `return next()`.
- Execute returns JSON; render emits content blocks.
- Guard veto and score-fail are domain values, not throws.
- `apiKeyEnv` only; `.role('secret')`.
- `AssetRef.path` is workspace-relative; `..` is a hard error.
