# DSH Image Studio Compatibility Landing

Date: 2026-09-12
Goal: make `dsh_imagestudio` a loadable official DeepSeek Harness plugin bundle that matches the three design documents and the published plugin contract.

## Files

- `package.json` — `dsh.bundle.patch`, peerDeps on `@deepseek-ai/cordis@^4`
- `cordis.patch.yml` — one insert row `id: image-studio` / `name: dsh-imagestudio`
- `index.ts` — composer, `inject: ['tools']`, mounts core/compose/guard/assets/skills/mock/tools, optional `systemPrompt.section`
- `packages/*/package.json` — `@dsh-imagestudio/dsh-image-*`
- `packages/tools/src/define.ts` — official shape: `output.schema` + `render → [{type:'text', text}]`
- `packages/tools/src/index.ts` — six tools, `ctx.effect` register, execute returns JSON
- `examples/dsh-web.patch.yml` + `scripts/gen-dsh-patch.mjs` — absolute-path `--patch` overlay
- `tests/dsh-contract.test.ts` — bundle + defineTool + poster lock

## Official load paths

1. `dsh plugin add /abs/path/to/dsh_imagestudio` then `dsh web`
2. `node scripts/gen-dsh-patch.mjs && dsh web --patch ./examples/dsh-web.patch.yml`

## Remaining P-level AC not fully gated in this landing

- AC-TL-06/10/11 live provider 401 / cancel / timeout
- AC-CP-02 publint + emitted `lib/*.js`
- AC-HQ human scoring
- AC-LC-04 HMR inside a running official `dsh web`
