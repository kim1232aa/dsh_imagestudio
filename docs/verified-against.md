# verified-against

dsh is a developer preview and will break contracts. Record the commit we last ran AC-LC / AC-TL / AC-EV against.

| Date | dsh / cordis | Notes |
|---|---|---|
| 2026-09-11 | `@deepseek-ai/cordis@4.0.2`, `@deepseek-ai/dsh-tools@0.1.5-rc.2`, `@deepseek-ai/dsh@0.1.5-rc.1`, `schemastery@3.18.2` | Host boots a real `Context`: stubs (`tools`/`llm`/`jobs`) → core → compose → guard → assets → skills → mock → tools. MiniTools stands in for full `ToolRuntime` (which injects `systemPrompt`). 36/36 offline tests green. |
| 2026-09-12 | `@deepseek-ai/cordis@4.0.2`, `@deepseek-ai/schemastery@3.18.2` | Official bundle landing: `dsh.bundle.patch`, composer `index.ts`/`plugin.ts` with `inject:['tools']` + `systemPrompt.section`, defineTool `output.schema` + `{type:'text',text}` render, complete `--patch` overlay, CJK poster trigger, `ratios` not banned `ratio`. Offline suite **44/44** green. Live `dsh web` AC-LC-01 not re-run this turn. |

When a harness upgrade changes `defineTool`, `ctx.jobs`, or event dispatch, add a row and the adapting commit.
