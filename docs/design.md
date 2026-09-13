# DSH Image Studio 插件 · 设计文档

代号 `dsh-image-studio` · 文档版本 v0.2 · 2026-09-12

> v0.2 纠正 v0.1 的形态假设。v0.1 把本插件写成「只给 Agent 六个 tool，产物落在对话流」。正确形态是：**在官方 DeepSeek Harness 壳里提供与「对话」并列的独立生图工作台**，同时保留六个 tool 给 Agent。参考 VisioWork 的挂法，不搬它的源码；工作台内容是 Nova 式文生图/图生图/反推/素材 + 五个 FANTASY skill。

## 0. 一句话定位

把 Nova Image Studio 的工作台能力，和 FANTASY skill 的创作判断，做成一个 **挂在官方 dsh web 里的中文生图应用**：侧栏「生图」打开工作室，右上角「对话」回到 Agent。后端任务、产物、会话全部走 dsh 原生 `jobs` / 工作区文件 / session log，不自建第二套服务器。

## 1. 背景与问题

### 1.1 文档曾经错在哪

v0.1 §1.3 写「不移植 Next.js 前端，入口是 agent loop」。对照 VisioWork 在真实 dsh 里的形态，这是错的：

- VisioWork 在官方侧栏「新会话」旁加了 **生图**
- 点开后主区是完整工作台（文生图/图生图、尺寸、模型、历史、灵感），不是对话里的 tool card
- 右上角「对话」切回 Agent
- 设置 → 插件只配 Key，**不是入口**

用户要的是这种应用形态，不是「只会调 tool 的插件」。

### 1.2 两边各自的短板

| | Nova Image Studio | FANTASY Skill 系列 | VisioWork（dsh-imagegen） |
|---|---|---|---|
| 强 | 文生图/图生图/反推/素材的工作台信息架构 | 构图、色彩、反 CG、三联、评分自检 | 已经证明如何把生图页挂进官方 dsh 壳 |
| 弱 | 提示词质量靠用户；AGPL，不能整包搬进本仓库 | 只有 `SKILL.md`，没有执行体与工作台 | 没有 cinema-dna / life-force 这套硬约束 |

### 1.3 合起来做什么

1. **独立页面**：官方 dsh chrome 内的 Image Studio 工作台（与对话并列）。
2. **Skill 执行体**：`preset.yaml` 编译 `CreativePlan`，低于阈值不出图。
3. **Agent 旁路**：同一套引擎注册 6 个 `image_*` tool，对话里也能出图。
4. **原生后端**：`ctx.jobs` 排队，session log 审计，产物写 `<workspace>/.dsh/image-studio/`。

### 1.4 非目标（v0.1 仍成立的部分）

- 不整包移植 Nova 的 Next.js / PWA / 无限画布 / 切图编辑器（AGPL + 非本产品）。
- 不整包移植 VisioWork 源码（Apache-2.0，只参考挂法）。
- 不自建端口、不自建 SQLite、不自建 WebSocket 网关。
- v0.1 不做电商套图、不做无限画布节点图。这两项若要做，单开里程碑，不混进 cinema-dna 验收。
- 不把 skill 原文整篇塞进系统提示词。

### 1.5 形态对照

| | v0.1 文档（作废） | v0.2（现行） |
|---|---|---|
| 用户入口 | 新会话里说话 | 侧栏 **生图** + `/imagestudio` |
| 主界面 | 无 | Nova 式工作台（文生图/图生图/策划/反推/三联/素材） |
| Agent | 唯一路径 | 并列路径：右上角「对话」 |
| `dsh-image-ui` | 可选卡片 | **必选**，独立页面的宿主+客户端 |
| 任务 | 只在 tool execute 里跑 | UI 与 tool 都进 `ctx.jobs` |
| 产物展示 | 对话流 JSON | 工作台网格 + 历史轨 + 工作区文件 |

## 2. 总体架构

### 2.1 分层

```
┌─────────────────────────────────────────────────────────┐
│ 官方 dsh web 壳（侧栏 / 设置 / 对话）                      │
│   ┌──────────┐   ┌───────────────────────────────────┐  │
│   │ 新会话    │   │ 对话（原生 agent loop + 6 tools）   │  │
│   │ 生图  ←——┼──→│ Image Studio 工作台（本插件 UI）    │  │
│   └──────────┘   └───────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP /imagestudio/api/*
                             │ 与 tool execute 共用引擎
         skills + assets + compose + guard
                             │
                      image-core
                             │
              openai | gemini | nova-bridge | mock
                             │
              ctx.jobs · session log · workspace files
```

### 2.2 包清单

| 包名 | 职责 | inject | 提供 |
|---|---|---|---|
| `dsh-image-core` | 契约、事件、注册表 | — | `imagegen` |
| `dsh-image-provider-*` | 协议适配 | `imagegen` | — |
| `dsh-image-assets` | 产物落盘、索引、清理 | `jobs` | `imageAssets` |
| `dsh-image-skills` | preset 加载与编译 | `llm` | `imageSkills` |
| `dsh-image-compose` | 三联 / 裁切 / 叠字 / GIF | — | `imageCompose` |
| `dsh-image-guard` | 直通扩展点（无内置拦截规则，验收红线） | `imagegen` | — |
| `dsh-image-tools` | 六个模型可见工具 | `tools` + 上述服务 | — |
| `dsh-image-ui` | **独立工作台 + 侧栏入口** | `webServer`（可选注入）+ 上述服务 | `/imagestudio` |

`dsh-image-ui` 不再是可选卡片包。没有它，插件在 dsh 里「找不到入口」。

### 2.3 独立页面如何挂上（参考 VisioWork 的做法，自写实现）

VisioWork（`@dickpy/dsh-imagegen`）证明的挂法，本仓库用原创代码复现，禁止复制其源码、CSS module、选择器前缀：

1. **宿主半包**  
   - `ctx.webServer.register({ kind:'prefix', path:'/imagestudio' })`  
   - 页面：`GET /imagestudio`  
   - JSON：`/imagestudio/api/{meta,plan,generate,edit,describe,compose,assets,file}`  
   - 入口脚本：`GET /imagestudio/entry.js`  
   - 能 `tapIndex` 时把 script 打进官方 index。

2. **客户端半包**  
   - `package.json` 声明 `dsh.client.platform = web`，导出 `./client`  
   - `apply()` 加载 `/imagestudio/entry.js`  
   - 脚本在官方侧栏「新会话」旁插入 **生图**，点开后用 iframe/overlay 覆盖主区，不拆掉 dsh 壳  
   - 再点「新会话」或工作台「对话」关掉 overlay。

3. **官方槽位补充（能挂就挂，挂不上走 DOM 入口）**  
   - `settings.plugin.item`：插件配置卡（Key、默认 skill、默认比例）  
   - `tool.call.toolview`：对话里的出图结果卡  
   这两项不代替「生图」入口。

官方 slots 文档写明第三方 **不能**在 SPA 里新增顶层路由。所以独立页是「同一 origin 的 `/imagestudio` + 壳内 overlay」，不是改 dsh 源码。

### 2.4 Nova → 工作台映射

| Nova 表面 | 本工作台 | 引擎 |
|---|---|---|
| TextToImageForm | 文生图 | `image_generate` / `/api/generate` |
| ImageToImageForm | 图生图 | `image_edit` / `/api/edit` |
| ReversePromptForm | 反推 | `image_describe` / `/api/describe` |
| 我的素材 | 素材 / 历史轨 | `image_assets` + `ctx.jobs` + `index.json` |
| AgentChatWorkspace | 右上角「对话」 | dsh 原生 loop |
| 提示词广场 | Skill 选择器 + 案例卡 | `preset.yaml` |
| 无限画布 / PWA | 不做 | — |

### 2.5 后端任务与产物（只用 dsh 原生能力）

| 关切 | 落点 | 禁止 |
|---|---|---|
| 排队 / 取消 / 超时 | `ctx.jobs` + `exec.signal` | 自建 queue / setInterval 轮询 |
| 进度 | `image/progress` + jobs 进度 | 自建 WebSocket |
| 审计 | dsh session log（tool 路径）+ `plan.json`/`request.json` | 自建 SQLite |
| 文件 | `<workspace>/.dsh/image-studio/<session>/<task>/` | 工作区外路径 |
| 跨设备 | 工作区文件；不另做账号云同步 | 浏览器 localStorage 当权威存储 |

UI 点「开始生成」与 Agent 调 `image_generate` **必须进入同一套 persist 函数**，否则历史轨会分裂。

## 3. 核心契约

（服务、`CreativePlan`、事件总线与 v0.1 §3 相同，不重复改语义。）

事件：

| 事件 | 模式 | 用途 |
|---|---|---|
| `image/plan` | waterfall | 编译方案 |
| `image/guard` | bail | 否决扩展点；默认监听器一律放行（无内容审查红线） |
| `image/before-request` | waterfall | 锁比例、注入负面、剥参考图 |
| `image/after-result` | parallel | 落盘、索引 |
| `image/score` | serial | 自检 |
| `image/progress` | emit | UI 与 tool 共用进度 |

## 4. 两条入口，一套引擎

### 4.1 工作台（主入口）

用户打开「生图」后看到：

```
顶栏：IMAGE STUDIO | 文生图 | 图生图 | Skill 策划 | 反推 | 三联 | 素材 | 对话
左栏：Skill 卡、brief、比例、张数、模型、开始生成
右栏：灵感/结果网格；策划模式下展示 CreativePlan
左下历史：本工作区任务缩略图（文生图/图生图/三联）
```

### 4.2 Skill 在 UI 里怎么体现（v0.1 未定，此处拍板）

用户当时回答「不确定」。本文件定为：

1. **Skill 是工作台的一等公民，不是隐藏在 prompt 里的标签。**  
   五个卡常驻左栏：`cinema-dna-21x9x3`、`life-force-portrait`、`photography-simulation`、`movie-poster`、`character-casting`。
2. **选 skill = 锁硬约束。**  
   - cinema-dna → 比例锁 21:9，生成后提供「拼三联」  
   - movie-poster → 比例锁 3:4；仅当 brief 含海报/封面/片名或用户显式打开海报开关  
   - life-force → 默认进图生图，顶栏提示「MODE A 保身份」  
   - photography-simulation → 相机/胶片字段出现在策划面板  
   - character-casting → 先出 CharacterSheet，再允许其它 skill 引用
3. **开始生成的第一段永远是 plan。**  
   UI 调 `/api/plan`（内部即 `image_skill_plan`）。  
   - `passed: false`：右栏展示 `score` / `failures` / `veto`，**不出图**  
   - `passed: true`：按 shot 调 `/api/generate`，进度走 jobs
4. **策划模式只出方案，不出图。** 给导演改 brief 用。
5. **对话路径不另做一套判断。** Agent 仍先 `image_skill_plan` 再 `image_generate`。

### 4.3 六个工具（Agent 路径，数量上限仍是 6）

| 工具 | 作用 | 出图 |
|---|---|---|
| `image_skill_plan` | brief → CreativePlan | 否 |
| `image_generate` | 文生图 / 执行 plan | 是 |
| `image_edit` | 图生图，MODE A | 是 |
| `image_describe` | 反推，输出当数据 | 否 |
| `image_compose` | 三联/叠字/裁切/GIF | 合成 |
| `image_assets` | 列产物 | 否 |

典型链不变：plan → generate × N → compose。

## 5. Skill 包机制

目录、`preset.yaml`、五个 skill 的硬约束与 v0.1 §5 相同。

工作台必须能从 `imageSkills.list()` 画出选择器；`preset.yaml` 是 UI 与 tool 的唯一规则源，禁止在前端再写一套阈值。

## 6. 配置与密钥

配置声明仍用 Schemastery。新增 UI 相关字段：

- `defaultSkill`（默认 `cinema-dna-21x9x3`）
- `openai.enabled` / `apiKeyEnv`（secret）
- `keepLastTasks`

密钥只存环境变量名。插件配置卡（若挂上 `settings.plugin.item`）只编辑这些字段。

## 7. 任务、产物与取消

- 任务 id = jobs 任务 id 或 UUID；目录 `.dsh/image-studio/<session>/<task>/`
- 每任务：`plan.json` + `request.json`（脱敏）+ `shot-*.png` / `triptych.png`
- UI 历史与 `image_assets` 读同一 `index.json`（派生物，可重建）
- 取消：jobs cancel → `exec.signal` → 清理半成品

## 8. 安全

与 v0.1 §8 相同。额外：`/imagestudio/api/file` 必须 `assertInsideWorkspace`，禁止 `..`。

## 9. 里程碑

| 阶段 | 范围 | 出口 |
|---|---|---|
| M0 | core + mock + generate + 落盘 | 离线能出 fixture 图 |
| M1 | skill 引擎 + cinema-dna | 低于 82 分拒绝 |
| M2 | compose 三联 / 叠字 | 竖拼缝 8–12px |
| M3 | 多 provider + edit + describe | MODE A |
| M4 | **独立工作台**：侧栏生图、/imagestudio、plan 面板、历史轨 | 刷新 dsh 能看见「生图」并出图 |
| M5 | settings card、tool card、guard、发布 | 挂 dsh-plugin topic |

M4 是形态验收的门槛。没有「生图」按钮，M4 不算过。

## 10. 许可

MIT。Nova AGPL 源码不进仓库。VisioWork Apache-2.0 源码不进仓库。只做界面级移植与挂法参考。见 `THIRD_PARTY_NOTICES.md`。
