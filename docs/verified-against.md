# 文档版本

- v0.1 设计稿假设「只提供模型可见工具」。该假设已被否决。
- v0.2（2026-09-12）形态修正：独立工作台为 P0。见 `01-设计文档.md` / `02-设计规范.md` / `03-验收规范.md`。
- 挂法参考 VisioWork，内容为 Nova IA + 五个 FANTASY skill；不搬源码。
- 后端任务/产物走 dsh jobs / session / 工作区文件。


# verified-against

dsh is a developer preview and will break contracts. Record the commit we last ran AC-LC / AC-TL / AC-EV against.

| Date | dsh / cordis | Notes |
|---|---|---|
| 2026-09-11 | `@deepseek-ai/cordis@4.0.2`, `@deepseek-ai/dsh-tools@0.1.5-rc.2`, `@deepseek-ai/dsh@0.1.5-rc.1`, `schemastery@3.18.2` | Host boots a real `Context`: stubs (`tools`/`llm`/`jobs`) → core → compose → guard → assets → skills → mock → tools. MiniTools stands in for full `ToolRuntime` (which injects `systemPrompt`). 36/36 offline tests green. |
| 2026-09-12 | `@deepseek-ai/cordis@4.0.2`, `@deepseek-ai/schemastery@3.18.2` | Official bundle landing: `dsh.bundle.patch`, composer `index.ts`/`plugin.ts` with `inject:['tools']` + `systemPrompt.section`, defineTool `output.schema` + `{type:'text',text}` render, complete `--patch` overlay, CJK poster trigger, `ratios` not banned `ratio`. Offline suite **44/44** green. Live `dsh web` AC-LC-01 not re-run this turn. |

When a harness upgrade changes `defineTool`, `ctx.jobs`, or event dispatch, add a row and the adapting commit.
