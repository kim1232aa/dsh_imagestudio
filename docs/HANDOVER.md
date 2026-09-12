# 交接文档 · dsh_imagestudio

> 日期：2026-09-12  
> 仓库：https://github.com/kim1232aa/dsh_imagestudio  
> 版本：v0.2（未签字验收）

## 一句话

这是 DeepSeek Harness 的 **Image Studio 中文插件**：Nova 式独立工作台 + 5 个 FANTASY skill。  
**不是** VisioWork 源码搬运，也不是 Next.js 前端。

## 当前进度（诚实）

已通：

- 本机单测：`node --test --experimental-strip-types tests/*.test.ts`（约 63 项绿）
- 官方 `dsh@0.1.5-rc.1` 可用 `--patch` 挂上本仓库
- 工作台：`/imagestudio` 文生图 / 图生图 / Skill 策划 / 反推 / 三联 / 素材
- 侧栏「生图」：匹配官方按钮文案 `New Session`（不要删空格）
- cinema-dna 锁 21:9；brief 含「游戏CG应拒 / 游戏宣传图 / 过度油腻」时 score=0 不出图
- mock provider 离线出片（胶片色块，不是真摄影）

未过、不能对外说已验收：

- `docs/03-验收规范.md` §0 要求的人工点测表未在官方壳里全部勾完（AC-UI-11 卸载、AC-UI-12 Global 插件列表露出 image-*）
- GitHub `main` 在交接当时仍可能缺 core/host/tools/ui 大文件；clone 前先对这份清单
- Settings → Plugins 的 Session 列表不一定出现 `image-*`（它们在 host / `--patch` 层）

## 目录怎么走

```
plugin.ts                 官方 bundle 入口（dsh plugin add file:<repo>）
cordis.patch.yml          dsh.bundle.patch，insert image-studio
packages/core             契约 / 事件 / registry / pipeline
packages/skills           preset.yaml 编译器（21:9、veto、82 分）
packages/tools            6 个 defineTool：plan/generate/edit/describe/compose/assets
packages/ui               /imagestudio + entry.js 侧栏「生图」
packages/assets           .dsh/image-studio/<session>/<task>/
packages/compose          三联竖拼 8–12px 黑缝
packages/guard            bail
packages/provider-mock    离线胶片静帧
packages/host             单测 / scripts/preview.mjs 用的 MemoryWebServer
skills/*/preset.yaml      五个 skill
examples/dsh-web.patch.yml  开发路径：dsh --profile web --patch <此文件>
```

## 怎么跑

Node `^22.19 || >=24`。

### A. 官方 DSH（验收环境）

```bash
cd /path/to/dsh_imagestudio
node scripts/gen-dsh-patch.mjs          # 把绝对路径写进 examples/dsh-web.patch.yml
# --patch 必须在 web 子命令之前（0.1.5-rc.1）
dsh --profile web --patch ./examples/dsh-web.patch.yml --no-open --port 3081
```

打开终端打印的 `http://127.0.0.1:3081/?token=...`。

- 侧栏 New Session 下方/旁边应有 **生图**
- 或直接打开 `/imagestudio`

本机交接时官方进程约定停在 **3081**，自绘预览在 **3080**。不要互相杀端口。

### B. 自绘预览（不能代替 §0 UI 签字）

```bash
node --experimental-strip-types scripts/preview.mjs
# http://127.0.0.1:3080/           壳
# http://127.0.0.1:3080/imagestudio 工作台
```

### C. 发布路径

```bash
npx @deepseek-ai/dsh web
dsh plugin add file:/absolute/path/to/dsh_imagestudio
dsh --dump-config | grep image
```

`package.json` 里 `dsh.bundle.patch = ./cordis.patch.yml`。

## 关键合同（改代码时别破坏）

- 工具名只能是这 6 个：`image_skill_plan` `image_generate` `image_edit` `image_describe` `image_compose` `image_assets`
- `defineTool` 的 `execute` 返回对象；`output.render` 才变成 `{type:text,text}`
- waterfall `image/before-request` 观察者必须 `next()`
- cinema-dna：`aspectRatio` 锁 21:9；compose 走本地拼图，禁止把「画三格」送进 generate
- 分数 `< 82` 或 veto：不调用 provider
- 密钥只写 `apiKeyEnv` 名，值进 `$DSH_HOME/.credentials.yaml`
- UI 入口是侧栏「生图」+ `/imagestudio`，不是设置页表单

## 已知坑

1. 官方按钮是 `New Session`（有空格）。`entry.js` 用 `/新会话|New session|New Session/i`。
2. 官方壳没有 `#main`。点「生图」走整页 `/imagestudio`，不要假设 iframe 填主区。
3. `dsh web --patch file` 在 0.1.5-rc.1 会把 `--patch` 当成 web 的参数丢掉；要用 `dsh --profile web --patch file`。
4. npm 装 `@deepseek-ai/dsh` 曾报 lock compromised；能用本机已缓存的 `dsh@0.1.5-rc.1` 就别重装。
5. mock 图是程序色块，人工观感不能当摄影质量验收。

## 下一班要做

1. 把本地 `packages/**`、`tests/**`、`docs/01-03` 全部推上 `main`（clone 必须能 `npm test`）
2. 官方壳里再点一遍 AC-UI-06…10
3. AC-UI-11：卸 image-ui / bundle 后「生图」消失
4. AC-UI-12：Settings → Plugins 的 Global/Host 列表露出 image-*
5. 不要搬 Nova / VisioWork 源码

## 联系路径

- 设计：`docs/01-设计文档.md` `docs/02-设计规范.md` `docs/03-验收规范.md`
- 对照实现：`docs/verified-against.md`
- README 安装说明以本文件和 README 为准；冲突时以验收规范 §0 为准
