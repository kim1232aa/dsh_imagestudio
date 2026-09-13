# dsh_imagestudio

DeepSeek Harness（dsh / Cordis）插件：**先做导演判断，再出图，再自检。**

代号 `dsh-image-studio` · 版本 v0.2.0  
把 [Nova Image Studio](https://github.com/tianjiangqiji/nova-image-studio) 的生图工程能力（多模型路由、任务产物、反推、拼接）做成 dsh 插件，再把 FANTASY 系列 Skill 的创作判断收成可强制执行的 `preset.yaml`。

独立入口在官方 DSH 壳里：侧栏「技能台」（`/imagestudio`）。若本机已装 `@dickpy/dsh-imagegen`，它继续占「生图 / AI 生图」和 `generate_image`；本插件不抢那颗按钮、不注册那四个工具名。工作台是自写的 Nova 式文生图/图生图/策划/反推/三联，加上 5 个 FANTASY skill。画廊 / 画布 / 电商 / 视频是工作台页签（mock 通路），不是 VisioWork 或 Nova 源码，也不是独立 PWA。

**交接：[`docs/HANDOVER.md`](docs/HANDOVER.md)**（怎么跑官方 dsh、验收缺口、已知坑）。运行手册：[`docs/HANDOFF.md`](docs/HANDOFF.md)。

## 接到官方 DeepSeek Harness

仓库是可安装的 **dsh bundle**（`package.json` → `dsh.bundle.patch` → `cordis.patch.yml`）。

官方文档：https://github.com/deepseek-ai/deepseek-harness

### 方式 A：`dsh plugin add`（发布路径）

```bash
npx @deepseek-ai/dsh web
dsh plugin add file:/absolute/path/to/dsh_imagestudio
dsh --dump-config | grep -A2 image-studio
dsh web
```

Settings → Plugins 应出现 `image-studio`（ACTIVE）。这**不能**代替侧栏「技能台」入口（AC-UI-12）。Agent 可见 6 个工具：
`istudio_skill_plan` / `istudio_generate` / `istudio_edit` / `istudio_describe` / `istudio_compose` / `istudio_assets`。  
**禁止**再注册 `image_generate`：官方 Desktop 的 tools 表里已有同名条目，重复注册会让整棵插件树失败并进入恢复模式。日常文生图若已装 dsh-imagegen，继续用 `generate_image`。

`Requires:` 宿主已提供 `tools`、`llm`、`jobs`（web profile 自带）。本 bundle 再提供
`imagegen` / `imageSkills` / `imageAssets` / `imageCompose` 和 mock provider。

### 方式 B：`--patch`（开发路径，与官方第一插件教程相同）

`name` 必须是**绝对路径**：

```bash
node scripts/gen-dsh-patch.mjs
# --patch 写在 web 子命令之前，否则 0.1.5-rc.1 报 unknown option
dsh --profile web --patch ./examples/dsh-web.patch.yml --no-open --port 3081
```

打开 http://127.0.0.1:3080 → Settings → Plugins。应看到含 `image-ui` 的 ACTIVE fiber：
`image-core` `image-compose` `image-guard` `image-assets` `image-skills` `image-provider-mock` `image-tools` `image-ui`。

### 不要用的方式

- 不要把本仓库当成 Next.js / TanStack 前端 `npm run dev`。那不是 dsh。
- 不要只 insert `image-tools` 而不挂 core / skills / assets / compose —— `inject` 会让它停在 PENDING，工具不会出现，但这不是崩溃。
- 密钥只写环境变量名（`apiKeyEnv: IMAGE_STUDIO_KEY`），值放 `$DSH_HOME/.credentials.yaml`。


## 独立入口（技能台）

安装并重启 `dsh web` / Desktop 后：

1. 侧栏出现 **技能台**（有 dsh-imagegen 时插在它的「生图」双 Tab 下面，不替换）
2. 点「技能台」打开 Image Studio（`/imagestudio`，同一窗口）
3. 日常文生图 / 图生图继续用 dsh-imagegen 的「生图」和 `generate_image`

工作台模式：文生图 / 图生图 / Skill 策划 / 反推 / 三联合成 / 产物。  
Skill：`cinema-dna-21x9x3` `life-force-portrait` `photography-simulation` `movie-poster` `character-casting`。

「插件配置」页不会自动出表单——那是官方 settings card 槽，不是入口。

## 一句话架构

```
tools  →  skills + assets + compose
              ↓
         image-core (契约 / 事件 / 注册表)
              ↓
     openai | gemini | nova-bridge | mock
```

每个包导出 `name` / `inject` / `apply`（`Config` 为 Schemastery Schema）。

## 运行测试

需要 Node `^22.19 || >=24`。先装开发依赖（CI 走 `npm ci`，registry 为 npmjs；不要用仓库里曾经出现过的内网源）：

```bash
npm ci
node --test --experimental-strip-types tests/*.test.ts
```

离线 CI 走 mock provider，不需要 API Key。视频 / GIF 优先调用本机 `ffmpeg`；没有 ffmpeg 时走内置封装，单测仍然能绿。

离线 host（仅单测）在 `packages/host`：stubs → core → compose → guard → assets → skills → mock → tools。

## Skill 包

| id | 上游 | 状态 |
|---|---|---|
| cinema-dna-21x9x3 | FANTASY cinema-dna | 建议 21:9 三联、本地 8–12px 黑缝；分数只展示，不拦出图 |
| life-force-portrait | FANTASY life-force | MODE A 保留身份，质感层 ≤ 2 |
| photography-simulation | FANTASY photo sim | 相机/胶片作约束 |
| movie-poster | FANTASY poster | `supersededBy: cinema-dna-21x9x3` |
| character-casting | FANTASY casting | CharacterSheet 注入动作句 |

### 六个 skill 入口分别何时用

工作台页面上是六个入口，其中「三联封面」映射到 cinema-dna-21x9x3（先出三联再出封面）：

| 入口 | 何时用 |
|---|---|
| 电影三联 | 想要 3 张 21:9 横图 + 一张纵向拼接长图（电影感三连帧） |
| 三联封面 | 已有三联，需要补一张 3:4 封面图 |
| 电影海报 | 要 9:16 竖版分层海报（底图层/字体层/合成图/合成记录四件） |
| 人像 | 升级已有照片（保身份）或原创人像 |
| 摄影 | 要"在某地实拍"的摄影感画面（相机/胶片约束） |
| 角色 | 做角色设定图；默认只出一张，勾选才出三视图 |

skill 安装：把 preset 目录放进仓库 `skills/` 下并在插件配置 `enabledSkills` 里启用；未装时入口会提示安装方法，不会空白。

## 渠道配置

设置页填：渠道 id、协议、模型、地址、密钥环境变量名（**只填变量名，密钥值放环境变量，永不进页面/日志/文件**）。

| 协议 | 地址示例 | 说明 |
|---|---|---|
| openai-image | `https://api.openai.com/v1` 或任意 OpenAI 兼容中转 | `/images/generations` 出图；填了 editModel 才可图生图/局部重绘 |
| mock | 不需要地址 | 离线概念板，未配渠道也能出图 |
| gemini-generate | `https://generativelanguage.googleapis.com` | Gemini 图像 |
| nova-bridge | 本机 Nova 桥地址 | 复用 Nova 会话 |

视频渠道：与图片同一渠道表单，多填一个「视频模型」（如 `grok-imagine-video`）。视频走异步两步协议（提交 → 轮询 → 下载），无需另外装插件。反推/AI 看图：填「视觉模型」（如 `grok-4.5`）。

## 数据存储位置

- 图片 / 视频 / 上传 / 备份：`<workspaceRoot>/.dsh/image-studio/`，文件管理器可直接打开；设置页显示当前绝对路径
- 历史 / 画廊 / 画布 / UI 设计：浏览器本地 localStorage（`imagestudio.history` / `imagestudio.gallery` / `imagestudio.canvas:*` / `imagestudio.uidesign`）
- 渠道清单：`<workspaceRoot>/.dsh/image-studio/channels.json`（只含环境变量名，不含密钥值）
- 备份/还原：设置页「导出备份」写入 `.dsh/image-studio/backups/`，「还原备份」选回该 JSON
- **永不自动删除**：`keepLastTasks` 默认 0，任何文件不会被自动清理

## 常见问题

- **模型检测不到**：先确认地址以 http(s):// 开头、密钥环境变量已设置（设置页会显示"已配置/未配置"）；检测只列图像/视频模型，纯聊天与 Embedding 模型会被过滤；检测不到可手动填模型名保存
- **生成一直转圈**：状态栏有实时秒数。超过 3 分钟可点「取消」（真的中止上游请求），然后重试或换渠道；转圈期间切换页签不会中断任务
- **视频等待过久**：视频是异步任务，1–3 分钟正常；状态栏持续显示已等待秒数；超过预期可取消，半成品不会留垃圾文件
- **中文字出错**：海报/叠字由图像模型生成字体层，不给本地字体渲染；中文出错时在海报流程点「只重出字体层」重试，或在提示词里把要写的字用引号括起来

## License

MIT. Interface-level adapters only — Nova AGPL source is not vendored. See `THIRD_PARTY_NOTICES.md`.
