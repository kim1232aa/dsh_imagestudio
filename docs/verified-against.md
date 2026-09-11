# verified-against

dsh is a developer preview and will break contracts. Record the commit we last ran AC-LC / AC-TL / AC-EV against.

| Date | dsh / cordis | Notes |
|---|---|---|
| 2026-09-11 | not pinned (offline core + mock) | Domain tests pass without mounting a live harness. Pin a dsh commit here before the first tagged release. |

When a harness upgrade changes `defineTool`, `ctx.jobs`, or event dispatch, add a row and the adapting commit.
