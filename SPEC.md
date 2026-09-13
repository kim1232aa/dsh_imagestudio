# SPEC.md — dsh_imagestudio 重写规范（单一事实源）

> 目标：把 nova-image-studio 的能力与 UI 集成进 DeepSeek-Harness (dsh)，成为原生插件。
> 工作仓库：`$HOME/dsh_imagestudio`（共享协调仓，子代理用 git worktree 隔离）。
> 调研依据：`/mnt/agents/output/research/{dsh-host-mechanism,nova-assets,current-state,skills-analysis}.md`
> 验收标准：`verifier/v1/ACCEPTANCE.md`（纳入版本控制）

## 0. 顶层设计（用户裁决，不可违反）

1. **Agent 对话层全部交给 dsh**：插件不自造会话列表/上下文管理/联网检索。聊天内出图通过 dsh 原生机制实现：`ctx.skills.register` 注册 5 个 skill（模型经 `<available_skills>` 目录 + `skill` 工具加载）+ `istudio_*` 工具 + 聊天内图片渲染（toolview/attachments）。
2. **Nova 七大能力全部保留为独立页签**：生图工作台、视频工作台、无限画布、UI 设计模式、我的素材、反推提示词、动图生成。现有电商/模板库/设置页签保留（超集不砍）。
3. **Skill 自动匹配**：用户在 dsh 聊天里描述创作意图（如「电影三联」「徕卡街拍组图」「电影海报」「角色设计」「照片升级」），无需切页面、无需手动选 skill，模型按 skill 指令完成 策划(istudio_skill_plan) → 出图(istudio_generate) 链路，结果图直接显示在对话里。
4. **评分/veto 语义（本次裁决，覆盖旧规范）**：`plan.passed === false`（veto 或 score < threshold）时**默认阻止出图**：
   - `istudio_generate` 带 planId 且 plan 未通过 → 抛 `ToolArgsError('PLAN_REJECTED')`，message 含 score/threshold/failures/veto；新增可选参数 `force: boolean`（默认 false），`force: true` 时放行。
   - HTTP `POST /imagestudio/api/generate` 同语义：plan 未通过且无 `force:true` → **HTTP 422**，body = `{ "error": { "code": "PLAN_REJECTED", "score": number, "threshold": number, "failures": string[], "veto": string|null } }`。
   - 工作台 UI：分数框展示 score/threshold；被 422 拦截时显示失败原因 +「仍然出图」按钮（重发带 `force:true`）。
   - 无 planId 的裸生成（用户直接写 prompt）不受此门限制。
   - 旧测试 `DOC-00-6 score below threshold still calls provider` 改为：带 `force:true` 仍出图；新增测试：不带 force 时抛 PLAN_REJECTED 且 provider 未被调用。

## 1. 仓库结构（沿用现有 monorepo，增删如下）

```
plugin.ts                  # 官方 bundle 入口（已恢复，禁止再删）
cordis.patch.yml           # bundle patch
packages/
  core/                    # 契约/事件/registry/pipeline/jobs/config/errors —— 改：pipeline 加 plan 闸门
  skills/                  # preset 加载/校验/编译 —— 改：preset schema 加 triggers/antiTriggers/chatBody
  tools/                   # 6 个 istudio_* 工具 —— 改：PLAN_REJECTED + force；compose 补齐 crop/gif
  ui/                      # /imagestudio 工作台 —— 大改：七大独立页签 + 素材库后端
  assets/  compose/  guard/  provider-mock/  provider-openai/  host/
  client/                  # 新增：浏览器半侧（dsh.client bundle）
skills/<id>/preset.yaml    # 5 个，全部补 triggers/antiTriggers
skills/<id>/chat.md        # 新增：注册进 dsh SkillRegistry 的聊天指令体（中文，见 §4）
tests/                     # 全部更新通过
verifier/                  # 验收标准与运行记录（纳入 git）
docs/                      # 单一事实源：只留 README 引用的新版架构/验收文档，旧文档移入 docs/legacy/
```

死文件删除：`packages/ui/src/page.ts`、`packages/ui/src/entry.ts`、`sandbox/`；`toolDocs` 与注册参数合并为单一出处。
`packages/provider-gemini`、`packages/provider-nova` 两个空壳：**删除**（README 说明后续再实现），避免误导。

## 2. 模块任务卡

### M1 基础修复 + pipeline 闸门（coder-foundation）
- 确认 plugin.ts / pnpm-workspace.yaml 在库内（HEAD 已有）。
- `packages/core/src/pipeline.ts`：`runGenerateOnContext` 在 guard 之后、provider 之前插入 plan 闸门——若 `request.planId` 对应 plan `passed===false` 且 `request.force !== true`，抛出带 `code='PLAN_REJECTED'` 的 ToolArgsError（含 score/threshold/failures/veto）。`ImageRequest` 增加 `force?: boolean`。
- `packages/tools`：`istudio_generate` parameters 增加 `force: { type:'boolean', required:false, description:'强制出图：跳过 plan 评分/veto 拦截' }`；错误透传。`istudio_compose` 补齐 `crop`（用 compose/region.ts 的 crop）与 `gif`（用 compose/gif.ts）两个 mode，或把文档收窄为实际支持集——**选择补齐**。
- `istudio_edit`：refImages 的 width/height/sha256 用 png.ts 解码真实值，不再填 0。
- 清理：删死文件、合并 toolDocs 重复定义、删 provider-gemini/provider-nova、docs 归档（`docs/legacy/`）、新增 `docs/ARCHITECTURE.md`（单一事实源）+ 更新 README。
- 测试：`npm test` 全绿（Node 22：PATH 前缀 `/tmp/node-v22.19.0-linux-x64/bin`）。更新 DOC-00-6，新增 PLAN_REJECTED 测试。

### M2 skill 聊天自动匹配（coder-skills）
- `packages/skills/src/schema.ts`：`SkillPreset` 增加可选字段 `triggers: string[]`、`antiTriggers?: string[]`（中文短语数组）。
- 5 个 `skills/*/preset.yaml` 补 triggers/antiTriggers（取自 research/skills-analysis.md §4）。
- 新增 `skills/*/chat.md`：每个 skill 的聊天指令体（≤6KB 中文），结构：
  1. 何时使用（触发场景与反触发边界，含与兄弟 skill 的区分）
  2. 创作工作流：先 `istudio_skill_plan`（brief 写法要求：题材/氛围/主体/禁忌写清楚）→ 检查 score/veto → 通过则 `istudio_generate`（planId）
  3. 该 skill 的硬约束摘要（画幅、张数、负面清单精华、veto 条件）
  4. 被 PLAN_REJECTED 时的处理：向用户解释原因并询问是否修改 brief 或强制出图
  5. 内容从对应上游 skill 仓库（/mnt/agents/output/work/ 下 5 个仓库的 SKILL.md）浓缩，保留其创作判断精华
- `packages/skills/src/index.ts`：apply 时若 `ctx.skills` 可用（`ctx.get('skills')` 探测，不可硬 inject），对每个启用的 skill 调 `ctx.skills.register({ name: <id>, description: <取自 preset title + triggers 前3个>, content: <chat.md 内容>, invocation: { modelInvocable: true, userInvocable: true } })`；注册进 effect 生命周期。
- systemPrompt section（plugin.ts 内）更新：说明聊天匹配流程与「veto/低分被拦 → 解释并询问」红线。
- 测试：skill 注册单测（mock SkillRegistry 验证 5 个 skill 注册、content 非空、invocation 双开）；triggers 加载校验测试。

### M3 工作台七大页签（coder-ui）
`packages/ui/src/studio-page.ts` 顶栏页签重构为：
`生图 gen | 视频 video | 动图 gif | 反推 reverse | 无限画布 canvas | UI设计 uidesign | 我的素材 assets | 电商 ecom | 模板库 tpl | 设置 settings`

- **gen 生图**：保留现有能力；模式 chip 精简为 文生图/图生图（反推/GIF/视频移出为独立页签）；接 M1 的 422 语义：分数框 + 「仍然出图」按钮。
- **video 视频工作台**（新独立页签）：复用现有 `/api/video` 通路——渠道选择（resolveCapable video）、文生视频/参考图视频、比例/时长、提交→轮询进度→播放器+下载+抽帧（`/api/video/frame`）。
- **gif 动图生成**（新独立页签）：两步流——① 生成 N 帧（走 `/api/gif` 现有链路）② 帧条预览 + 帧延时(50-500ms)/循环次数/逐帧启停 → 浏览器端或服务端编码 GIF → 下载。
- **reverse 反推提示词**（新独立页签）：上传/拖拽图 → 选视觉渠道 → 流式或一次性反推（`/api/describe` 现有）→ 多模板（简洁/详细/分镜）→ 「用此提示词生图」按钮跳转 gen 页并回填 prompt（localStorage 传递）。
- **assets 我的素材**（新独立页签，服务端数据）：列表=工作区全部产物（复用 `/api/assets` 扩展）+ 用户上传素材。新端点：
  - `GET /imagestudio/api/assets` 扩展：支持 `?q=` 搜索、`?type=generated|uploaded|all`、分页 `offset/limit`
  - `POST /imagestudio/api/assets/upload`（multipart，≤10MB，落 `.dsh/image-studio/uploads/`）
  - `POST /imagestudio/api/assets/rename` `{path,name}`
  - `POST /imagestudio/api/assets/delete` `{paths[]}`
  - `GET /imagestudio/api/assets/zip?paths=...`（用 compose/zip.ts 打包下载）
  - 全部过 `assertInsideWorkspace`。UI：网格 + 搜索 + 多选 + 重命名/删除/打包下载/上传。
- **gallery 画廊**：并入 assets 页（作为 generated 筛选视图），原 localStorage 画廊保留只读迁移提示——**简化：gallery 页签删除，能力由 assets 页承接**。
- canvas / uidesign / ecom / tpl / settings 保持现状（可小修样式一致性）。
- 约束：仍是手写字符串模板单页（不重写框架），新增页签复用现有 CSS 变量与组件类名风格；全部中文文案。

### M4 浏览器 client bundle（coder-client）
新建 `packages/client/`（宿主约定：本包 host 行活动时由 client-modules 扫描 `dsh.client`）：
- 参考实现范本：`/mnt/agents/output/work/dsh-imagegen/`（src/client/* + tsdown.config.ts + package.json 的 dsh.client 声明），**逐文件对照抄模式，不抄功能**。
- `package.json`：`exports["./client"]` + `dsh.client { platform:'web', inject: [...], external: [...] }`；tsdown 构建（devDependency），`npm run build:client`。
- 功能三项：
  1. **侧栏入口**：`ctx.slots.register({ name:'sidebar.panellist', id:'imagestudio', order, label:'生图' }, IconComponent)` + `ctx.slots.inject('main', ...)` 注册 key='imagestudio' 的面板组件——面板内容是 `<iframe src="/imagestudio">` 全尺寸嵌入（保留服务端工作台全部能力）。所有 DOM/slot 操作 `ctx.effect` 包裹，失败 console.warn 不 throw。保留旧 entry.js 注入作为 client bundle 不可用时的兜底（两条路互斥：client bundle 生效时 entry.js 检测 `[data-istudio-client-active]` 后退出）。
  2. **toolview**：`tool.call.toolview` keyed 槽，key 分别为 `istudio_generate`、`istudio_compose`、`istudio_edit`——解析工具结果 JSON 里的 images[].path，渲染图片网格（src=`/imagestudio/api/file?path=<encodeURIComponent>`）+ 参数摘要 + 错误态（PLAN_REJECTED 显示分数与 failures）。组件用 React（宿主提供 external）。
  3. **会话桥接**：toolview 内「在画布中打开」按钮 dispatch CustomEvent `istudio:open-canvas`（工作台 canvas 页监听，可选实现）。
- 构建验证：`npm run build:client` 产物 `lib/client.js` 存在且为 closure-factory 形态。
- 若 slot 契约在本机 dsh 0.1.5-rc.1 验证失败，降级方案：client bundle 只做 toolview，侧栏仍走 entry.js——必须在 docs 记录实际验证结果。

## 3. 接口契约（跨模块冻结）

```ts
// ImageRequest 增量
interface ImageRequest { /* ... */ force?: boolean }

// PLAN_REJECTED（工具层）
throw new ToolArgsError('PLAN_REJECTED: score ${score}/${threshold}; failures: ${failures.join("; ")}${veto ? `; veto: ${veto}` : ""}')

// HTTP 422 body
{ "error": { "code": "PLAN_REJECTED", "score": 0, "threshold": 82, "failures": ["..."], "veto": "..." | null } }

// preset.yaml 增量
triggers: ["电影三联", "21:9", ...]        # 必填，5-12 个中文短语
antiTriggers: ["电影海报", ...]            # 可选

// dsh skill 注册
ctx.skills.register({ name: 'cinema-dna-21x9x3', description: '...', content: '<chat.md 内容>', invocation: { modelInvocable: true, userInvocable: true } })
```

## 4. 验证（Stage 4，主代理执行）

- V1 `npm test` 全绿（Node 22）
- V2 `npm run build:client` 产物存在
- V3 真实 dsh：`npm i -g @deepseek-ai/dsh@0.1.5-rc.1`（或 npx），`node scripts/gen-dsh-patch.mjs`，`dsh --profile web --patch ./examples/dsh-web.patch.yml --no-open --port 3081`：
  - `curl /imagestudio` → 200
  - `--dump-config` 含 image-studio
  - index.html 含 entry.js 注入或 client bundle 注册记录
- 结果记录进 `verifier/runs/`

## 5. 交付

- commit 到 main（conventional commits，可分多个 commit）
- push 到 github.com/kim1232aa/dsh_imagestudio（经 MCP push_files 分批，文本文件）
- 最终回复附变更摘要与验证记录
