# dsh_imagestudio 交接文档

> 仓库：https://github.com/kim1232aa/dsh_imagestudio  
> 本地工作区：`/home/workdir/artifacts/dsh_imagestudio`  
> 文档版本：v0.2 设计 / 验收（`docs/01-设计文档.md` `docs/02-设计规范.md` `docs/03-验收规范.md`）  
> 交接时点：2026-09-12  
> **验收状态：未签字。** 官方 `dsh web` 曾经在本机 3081 打通，P 级 UI 整表未闭环；GitHub `main` 仍缺大量源码。

---

## 1. 这是什么

DeepSeek Harness（dsh / Cordis）中文生图插件。独立入口在官方壳侧栏「新会话 / New Session」旁的「生图」，打开 `/imagestudio` 工作台。

能力：

- 5 个 skill：`cinema-dna-21x9x3`、`life-force-portrait`、`photography-simulation`、`movie-poster`、`character-casting`
- 6 个工具：`image_skill_plan` `image_generate` `image_edit` `image_describe` `image_compose` `image_assets`
- 先 `image_skill_plan`（导演判断 + 评分 ≥82），再出图；veto 不出图
- cinema-dna 锁 21:9；三联走 compose，不把「画三格」塞进 generate
- mock provider 离线出图

不是 Next.js 前端，不是 VisioWork / Nova 源码搬运。只移植 Nova 的工程接口（多模型、任务产物、反推、拼接）+ FANTASY skill 的 `preset.yaml` 硬约束。

官方插件规范：https://github.com/deepseek-ai/deepseek-harness  
`dsh plugin add` / `dsh web --patch` 文档：`apps/cli/reference/README.zh.md`

---

## 2. 怎么跑

### A. 官方 DSH（验收环境，docs/03 §0）

```bash
cd /home/workdir/artifacts/dsh_imagestudio
node scripts/gen-dsh-patch.mjs          # 生成绝对路径 patch
# 注意：--patch 跟在 web 别名后会被 web app 吃掉。稳妥写法：
npx @deepseek-ai/dsh --profile web --patch ./examples/dsh-web.patch.yml --no-open --port 3081
```

打开返回的 `http://127.0.0.1:3081/?token=...`。

预期：

- 标题 DeepSeek Harness
- 侧栏 New Session 旁出现「生图」
- 点「生图」进 `/imagestudio`（整页跳转；官方壳没有 `#main` 可填 iframe）
- Settings → Plugins 能打开（host 层 `image-*` 不一定出现在 Session plugins 28 项里）

本机 npm 包：`@deepseek-ai/dsh@0.1.5-rc.1`。安装曾因 lock 损坏失败，后来装上过。

### B. 自绘预览（开发点测，不能代替 §0 UI 签字）

```bash
cd /home/workdir/artifacts/dsh_imagestudio
PORT=3080 node --experimental-strip-types scripts/preview.mjs
```

- 壳：http://127.0.0.1:3080/
- 工作台：http://127.0.0.1:3080/imagestudio

### C. 测试

```bash
npm test    # node --test --experimental-strip-types tests/*.test.ts
```

最近一次本机：**63/63 绿**（含 AC-UI-08「游戏CG应拒」veto、官方 New Session 文案匹配）。

---

## 3. 入口怎么插进官方壳

`packages/ui/src/index.ts`

- `web.register({ path:'/imagestudio', handler })` 提供工作台 + `/imagestudio/api/*`
- `web.register({ path:'/imagestudio/entry.js' })` 提供注入脚本
- 官方合同：`ctx.webServer.tapIndex` 或 `webserver/index-inject`（`script-src=/imagestudio/entry.js`）
- `packages/ui/src/entry.js`：在「新会话」**或** `New Session` 旁插「生图」按钮  
  坑：官方按钮文案是 `New Session`，如果把空格删光再匹配会失败。

官方 SPA 没有 `#main`。点「生图」应 `location.assign('/imagestudio')`，不要再 iframe 叠一层。

---

## 4. 验收对照（交接时）

| ID | 结论 |
|---|---|
| §0 官方 `dsh web` | 本机打通过（3081），进程可能已停，需重拉 |
| AC-UI-01 生图在 New Session 旁 | 官方壳修文案后过 |
| AC-UI-02 点生图进工作台 | 过（整页跳 `/imagestudio`） |
| AC-UI-03 回对话不丢会话 | 半过（工作台有「对话」链；官方会话是否保留未证） |
| AC-UI-04 `/imagestudio` 200 | 过 |
| AC-UI-05 五个 skill id | 过 |
| AC-UI-06 文生图 mock ≥1 张 | 工作台逻辑过 |
| AC-UI-07 cinema-dna 锁 21:9 | 过 |
| AC-UI-08 score<82 / veto 不出图 | 过（芯片「游戏CG应拒」→ score 0） |
| AC-UI-09 三联走 compose | 过 |
| AC-UI-10 session 不串 | 单测有，官方壳未证 |
| AC-UI-11 卸载后入口消失 | **未证** |
| AC-UI-12 插件列表 ≠ 入口证明 | Settings→Plugins 在；搜不到 `image-*` |
| AC-LC / AC-TL / AC-EV / AC-SK | 单测覆盖，本地绿 |
| GitHub `main` 可 clone 复现 | **未过** |

禁止对外说「已验收通过」。

---

## 5. GitHub `main` 缺口（必须先补）

远程目前大约只有：根 README / plugin.ts / cordis.patch.yml / skills/*/preset.yaml / `packages/core` 的部分文件 / `packages/host` 的 stubs / `packages/tools/src/define.ts` / `packages/ui/src/client.js`。

本地已跟踪 116 个文件。clone 远程**跑不起来**。缺的关键路径：

```
packages/core/src/{types,events,config,pipeline,registry}.ts
packages/host/src/{boot,memory-web,minitools}.ts
packages/tools/src/{index,tools}.ts
packages/ui/src/{index,studio-page,entry.js,entry.ts,page.ts}
packages/skills/src/{index,compile,load,schema,yaml,bundled}.ts
packages/assets  packages/compose  packages/guard
packages/provider-mock  packages/provider-*
tests/*  docs/*  examples/*  scripts/gen-dsh-patch.mjs
```

本地 `git push origin main` 会因无 GitHub 用户名失败，必须走已连接的 GitHub 工具 `github___push_files`。

本地 dirty（交接时未提交）：

- `examples/dsh-web.patch.yml`（已含 `image-ui`）
- `packages/ui/src/index.ts`（index-inject）
- `scripts/gen-dsh-patch.mjs`
- `tests/dsh-contract.test.ts` `tests/ui-entry.test.ts`

本地已提交、远程没有的 commit 示例：`90bd1d6`（New Session 匹配）、`37e91d6`（游戏CG veto）。

---

## 6. 包地图

| 包 | 职责 |
|---|---|
| `packages/core` | 类型、流水线、事件总线、provider 注册、密钥红线 |
| `packages/skills` | 读 `skills/*/preset.yaml`，compile CreativePlan，veto/评分 |
| `packages/tools` | `defineTool` 注册 6 工具 |
| `packages/assets` | `.dsh/image-studio/<session>/<task>/` 沙箱 |
| `packages/compose` | 21:9 三联 PNG 拼接 |
| `packages/guard` | 出图前 bail |
| `packages/provider-mock` | 离线胶片色块 |
| `packages/provider-*` | gemini / openai / nova（需密钥，默认不启） |
| `packages/ui` | `/imagestudio` 工作台 + 侧栏注入 |
| `packages/host` | 无官方 dsh 时的 MemoryWebServer / MiniTools，给测试和 preview.mjs |
| `plugin.ts` + `index.ts` | bundle 入口，`dsh.bundle.patch` → `cordis.patch.yml` |

产物目录：`.dsh/image-studio/<session>/<task>/`（preview 用 `.dsh-preview/`）。

---

## 7. 已知坑

1. **官方验收环境 ≠ 自绘 3080。** `docs/03` §0 写明禁止用自绘预览代替 UI 项。
2. **`dsh web --patch` 参数位置。** 跟在 `web` 后面可能被 web app 吃掉；用 `dsh --profile web --patch <yml>`。
3. **按钮文案。** 官方是 `New Session`，中文壳是「新会话」。`entry.js` 两种都要认。
4. **veto。** 只输入「游戏CG应拒」也曾 88 分通过。`packages/skills/src/compile.ts` 的 `detectBriefVeto` 必须覆盖芯片标签和「游戏宣传图 / 过度油腻 AI 光效」。
5. **image-* 不在 Session plugins 列表。** 它们走 host `--patch` 层。AC-UI-12 不能拿 28 个 session 插件当证明。
6. **不要搬 VisioWork / Nova 前端源码。**
7. **密钥。** plan.json 不得含 api key；`/imagestudio/api/file` 必须拦 `../`。
8. **并发 push。** 多 agent 同时 `github___push_files` 会被锁。一次一个 path 集合。

---

## 8. 下一步（按优先级）

1. 把第 5 节缺口全部推进 `main`，确认空目录 clone + `npm test` 能绿。
2. 重拉官方 `dsh --profile web --patch ./examples/dsh-web.patch.yml --port 3081`，在真壳里点完 AC-UI-06/07/08/09。
3. 做 AC-UI-11：卸 `image-ui` 后「生图」消失、`/imagestudio` 不再由本插件提供。
4. 让 Global / host 插件列表能看见 `image-*`（或在文档里写清它们属于 patch 层，并改验收措辞）。
5. 未做本期：无限画布、电商模式、真模型出片（mock 仅验收通路）。

---

## 9. 联系与约定

- 远程：`kim1232aa/dsh_imagestudio` `main`
- 包名：`dsh-imagestudio`（`package.json`）
- 设计/规范/验收三份原文在 `docs/01` `02` `03`，英文镜像 `docs/design.md` `spec.md` `acceptance.md`
- 改 skill 只改 `skills/<id>/preset.yaml`，不要在 compile 里写死单个剧本
