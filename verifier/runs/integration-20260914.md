# 集成验证 2026-09-14

- 合并顺序：feat/foundation → feat/skills-chat（解 plugin.ts 冲突）→ feat/workbench-tabs（解 ui/index.ts + ui-routes.test.ts 冲突）→ feat/client-bundle（lock 重新生成）
- `npm test`：187 tests / 187 pass / 0 fail（exit 0）
- `npm run build:client`：lib/client.js 16.26kB，closure-factory 形态（window.__ModuleLoader__.load）✔
- `npm run accept`：15/15 PASS，含 AC-UI-08-gate（422 PLAN_REJECTED）与 AC-UI-08-gen（force:true 放行）

## 真实官方壳验证（dsh 0.1.5-rc.1，本机 3081-3088）

- `--dump-config`：8 个 image-* 插件行全部合成进 web profile ✔
- `/imagestudio` → 200，10 个 data-page 页签齐全（gen/video/gif/reverse/canvas/uidesign/assets/ecom/tpl/settings）✔
- `/imagestudio/api/meta` 返回 5 个 skill ✔；`/api/assets` 分页结构 ✔
- 官方壳 index：`imagestudio/entry.js` 注入 ✔；`__DSH_BOOT__` 存在 ✔
- 浏览器实测（截图存 /mnt/agents/output/verifier-shots/）：壳启动无插件失败；侧栏「技能台」在「新会话」旁 ✔（AC-UI-01 签字）；点开浮层进工作台 ✔；mock 渠道端到端出图 ✔；我的素材页展示产物与操作 ✔
- client bundle：修 id 为包名后进入官方启动图 combo（@dsh-imagestudio/dsh-image-ui/client.js）✔；slot 面板注册在真实壳未生效（静默降级），侧栏由 entry.js 兜底提供——已记录为已知限制
