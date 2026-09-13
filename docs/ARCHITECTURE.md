# dsh_imagestudio 架构（单一事实源）

> 本文档取代 docs/ 下的多代旧设计/验收文档（01/02/03 系列、design.md、spec.md、HANDOFF.md、HANDOVER.md 等，内容为历史口径）。语义裁决以 SPEC.md（重写规范）§0.4 为准。
> 重写验收标准见 `verifier/v1/ACCEPTANCE.md`，验收运行记录见 `verifier/runs/`。

dsh_imagestudio 是 DeepSeek Harness（dsh / Cordis）插件：把 Nova Image Studio 的生图工程能力
（多模型路由、任务产物、反推、拼接）做成 dsh 原生插件，并把 FANTASY 系列 Skill 的创作判断
收成可强制执行的 `preset.yaml`。Agent 对话层全部交给 dsh：插件不自造会话/上下文管理。

## 1. 仓库结构

```
plugin.ts                  # 官方 bundle 入口（组合器，禁止删除）
cordis.patch.yml           # bundle patch：insert {id: image-studio, name: dsh-imagestudio}
index.ts                   # export * from './plugin.ts'
packages/
  core/                    # 契约层：types / events / registry / pipeline / jobs / config / errors
  skills/                  # preset.yaml 加载/校验/编译成 CreativePlan（确定性模板，无 LLM）
  tools/                   # 6 个 istudio_* 工具（defineImageTool：官方 defineTool 优先，shim 兜底）
  ui/                      # /imagestudio 工作台（手写字符串模板单页）+ ~25 个 HTTP 路由 + entry.js 侧栏注入
  assets/                  # 产物落盘 .dsh/image-studio/<session>/<task>/ + assertInsideWorkspace
  compose/                 # 本地图像合成：png 编解码 / triptych / region(crop/blit/抠背景) / gif / svg / zip
  guard/                   # 内容守卫：一律放行（验收红线：无审查），仅作扩展点
  provider-mock/           # 离线 mock provider（程序化胶片静帧 / mock mp4）
  provider-openai/         # 真实渠道：OpenAI 兼容 + xAI/grok 方言（generate/edit/describe/video）
  host/                    # 离线宿主（仅单测/预览）：MiniTools / llm·jobs stub / MemoryWebServer
skills/<id>/preset.yaml    # 5 个内置 skill
tests/                     # node --test --experimental-strip-types（需 Node ≥22.19）
scripts/accept.mjs         # P 级 HTTP 验收（MemoryWebServer）
scripts/gen-dsh-patch.mjs  # 生成本机绝对路径版 examples/dsh-web.patch.yml
verifier/                  # 验收标准与运行记录（纳入 git）
docs/                      # 旧文档保留原位（历史口径，以本文档与 SPEC 为准）
```

已删除：`packages/ui/src/page.ts`、`packages/ui/src/entry.ts`（死文件）、`sandbox/`（loop 残留）、
`packages/provider-gemini/`、`packages/provider-nova/`（空壳占位，避免误导；后续需要时再实现，
README 渠道表只列实际可用的协议）。

## 2. 装配与数据流

`plugin.ts`（name=`image-studio`，inject: tools 必填 / systemPrompt 可选）按依赖顺序挂载：

```
ctx.plugin(core → compose → guard → assets → skills → openai? → mock → tools → ui)
```

真实渠道（openai 配置启用时）先于 mock 注册——registry 的默认 provider 是先注册者，
配了真实渠道必须赢过 mock 兜底。

生成主链路（agent 工具与工作台 HTTP 共用）：

```
istudio_generate / POST /imagestudio/api/generate
  → runGenerateOnContext(ctx, req)
    → ctx.bail('image/guard')            # guard 直通，仅宿主级硬拦截扩展点
    → plan 闸门（见 §4）                  # guard 之后、provider 之前
    → ctx.waterfall('image/before-request')  # plan 锁定/负面词合并/analysis-only 剥参考图/角色注入
    → registry.resolve(providerId?).generate → provider
    → ctx.parallel('image/after-result')
  → AssetStore 落盘 + index.json
```

工具层把 `planId` 解析成 plan 对象（`ctx.imageSkills.plans`）挂在 `ImageRequest.plan` 上；
pipeline 只认 plan 对象，不自己查 planId。UI 的 `/api/plan` 与 `/api/generate` 走同一
`plans` Map 与同一 `persist()` 通路。

## 3. 工具清单（6 个，单一出处在 packages/tools/src/index.ts 的 toolDocs）

| 工具 | 用途 | 关键参数 |
|---|---|---|
| `istudio_skill_plan` | brief 经 skill 编译为 CreativePlan（不出图） | skillId*, brief*, wantPoster |
| `istudio_generate` | 文生图；带 planId 走 plan | prompt/planId, shotId, aspectRatio, n(1-4), providerId, seed, **force** |
| `istudio_edit` | 图生图（refImages 真实 width/height/sha256 由 png.ts 解码） | prompt*, assets*, n, providerId |
| `istudio_describe` | 反推/抽象分析（纯数据，不进 systemPrompt） | assets*, instruction |
| `istudio_compose` | 本地合成：triptych / text-overlay / crop / gif | mode*, assets*, gap, ratios, title, x/y/w/h, delayMs |
| `istudio_assets` | 列产物 index | taskId |

红线：永不注册 `generate_image` / `edit_image` / `image_generate`（与宿主及 dsh-imagegen 撞名，
会拖垮整棵插件树）。compose 不消耗生图渠道——三联/裁剪/GIF 全部本地完成。

## 4. PLAN_REJECTED 语义（SPEC §0.4，覆盖旧规范）

`plan.selfCheck.passed === false`（veto 或 score < threshold）时**默认阻止出图**：

- pipeline：`runGenerateOnContext` / `runGenerate` 在 guard 之后、provider 之前抛
  `ToolArgsError`，code 与 message 均以 `PLAN_REJECTED` 开头，message 形如
  `PLAN_REJECTED: score 40/82; failures: <原因>; veto: <原因>`，
  结构化细节挂在 `err.details = { score, threshold, failures, veto }`。
  threshold 取该 plan 所属 skill 的 `preset.scoring.threshold`（5 个内置 skill 均为 82），兜底 82。
- 工具层：`istudio_generate` 新增可选参数 `force`（默认 false），`force: true` 放行；
  PLAN_REJECTED 原样透传给调用方。
- HTTP：`POST /imagestudio/api/generate` 同语义——无 `force:true` → **HTTP 422**，body：
  `{ "error": { "code": "PLAN_REJECTED", "score, threshold, failures, veto" } }`。
- 无 planId 的裸生成（用户直接写 prompt）不受此门限制。
- 工作台 UI 的「仍然出图」按钮 = 重发带 `force:true` 的请求（M3 页签重构承接）。

## 5. 怎么跑

```bash
# 测试（需 Node ^22.19 || >=24）
npm ci   # 或 npm install
node --test --experimental-strip-types tests/*.test.ts   # 即 npm test

# P 级 HTTP 验收（MemoryWebServer，离线）
npm run accept

# 接到真实 dsh
node scripts/gen-dsh-patch.mjs   # 生成绝对路径 patch
dsh --profile web --patch ./examples/dsh-web.patch.yml --no-open --port 3081
```

产物落 `<workspaceRoot>/.dsh/image-studio/`，`keepLastTasks` 默认 0（永不自动删除）。
密钥只写环境变量名（`apiKeyEnv`），值放 `$DSH_HOME/.credentials.yaml` 或环境变量。
