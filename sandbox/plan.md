# Plan: v0.2 acceptance close-out

## Objective

Make `dsh_imagestudio` accept against `docs/01-设计文档.md` / `02-设计规范.md` / `03-验收规范.md`:
independent Image Studio workbench inside official DSH (生图 ⇄ 对话), five FANTASY skills,
six `image_*` tools on the same pipeline. Prove P-level AC items with `node --test`.

## End state

- `GET /imagestudio` returns the Nova+skill workbench.
- Sidebar hook (`entry.js`) inserts 「生图」 beside 「新会话」 and can return to 「对话」.
- Plan / generate / compose / file sandbox share `runGenerateOnContext` + events with tools.
- score < 82 or veto does not call the provider.
- `node --test --experimental-strip-types tests/*.test.ts` is green.
- No VisioWork / Nova frontend source, no infinite canvas, no ecommerce.

## Non-goals

- Live browser proof against a running `dsh web` (manual AC-UI-01/02 on a real port).
- GitHub force-push (no HTTPS credentials in this host).
- Copying VisioWork or Nova UI source.

## Environment

Node 22.19+ / 24, ESM TypeScript via `--experimental-strip-types`, pnpm declared, tests via node:test.

## Components

- `c-entry` official chrome hook
- `c-workbench` `/imagestudio` page + APIs
- `c-pipeline` core / skills / tools / assets / compose
- `c-accept` automated AC-UI / AC-TL / AC-EV tests

## Order

T1 entry + dispose → T2 workbench API locks → T3 README/docs wording → T4 full suite gate
