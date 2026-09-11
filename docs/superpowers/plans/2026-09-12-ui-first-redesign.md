# Plan: v0.2 UI-first Image Studio

Date: 2026-09-12

## Goal

Treat the independent workbench as the product. Agent tools stay as the second path.

## Files

- `docs/01-设计文档.md` `docs/02-设计规范.md` `docs/03-验收规范.md` — rewritten
- `packages/ui` — official slot or tapIndex + `/imagestudio`
- `plugin.ts` — must mount `image-ui`

## Tasks

1. Keep current host plugins and 6 tools.
2. Finish sidebar 「生图」 via `sidebar.panellist`/`main` if available, else tapIndex + `/imagestudio`.
3. Workbench calls the same compile/generate/compose functions as tools.
4. Add AC-UI automated checks: page 200, skill list, 21:9 lock, score veto skips generate, path sandbox.
5. Do not implement infinite canvas or ecommerce.
