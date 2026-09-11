# DSH Image Studio 插件 · 设计文档

> 代号：`dsh-image-studio`
> 版本：v0.1（设计稿）
> 目标宿主：DeepSeek Harness（dsh）/ Cordis 插件运行时
> 参考实现：Nova Image Studio（AGPL-3.0）、FANTASY 系列视觉 Skill

---

## 0. 一句话定位

把 Nova Image Studio 的**生图工程能力**（多模型路由、任务队列、产物管理、反推、拼接）移植成 dsh 插件，
再把 FANTASY 系列 Skill 的**创作判断能力**（电影分镜、人像、海报、选角）作为可插拔的"创作策略包"接进来，
让 dsh 里的 agent 不只是"会调生图 API"，而是"先做导演判断，再出图，再自检"。

**这不是把 Nova 的网页搬进 dsh。** Nova 的 Agent 模式、对话、历史、无限画布在 dsh 里本来就有原生对应物（agent loop、session log、Web UI），重复移植是负资产。移植的是 Nova 里 dsh **没有**的部分：图像 provider 抽象、任务/产物生命周期、反推、拼接合成。

---

## 1. 背景与问题

### 1.1 两边各自的短板

| | Nova Image Studio | FANTASY Skill 系列 |
|---|---|---|
| 强 | 多模型配置、任务队列、产物落盘、WebSocket 实时、反推、GIF、成熟 UI | 创作判断极深：构图压力、色彩命题、反 CG、三联剪辑、评分自检 |
| 弱 | 提示词质量完全依赖用户；"提示词广场"是静态列表，没有判断过程 | 只有 `SKILL.md` 文本，没有执行体；出图靠宿主环境碰运气，无法保证比例、负面词、拼接、评分真正落地 |

### 1.2 合起来能解决什么

Skill 里大量规则是**可机器校验的硬约束**，但今天它们只是散文：

- cinema-dna：主海报固定 3:4、三联纵向拼接黑边 8–12px、三张至少变化 4 项、评分低于 82 不生成、一票否决项
- fantasy-life-force：MODE A 必须保留人物身份、质感层只选 1–2 种、明确的禁止项清单
- 全部 skill 共有：参考图只做抽象分析、不得作为图生图底图

把这些从散文变成 `preset.yaml` 里的结构化字段，再由插件在**出图前**强制注入与校验，就是这个插件的核心价值。

### 1.3 非目标（明确不做）

- 不移植 Next.js 前端、PWA、无限画布、切图编辑器（属于 Nova 的产品形态，不是 dsh 插件形态）
- 不自建 Web 服务端口、不自建 SQLite（dsh 有 session、storage、jobs）
- 不重做 Agent 对话（dsh agent loop 就是）

---

## 2. 总体架构

### 2.1 分层

遵循 dsh 的 **Service Definition / Provider / Consumer** 三层拆分，每层独立成包，可单独替换。

```
┌──────────────────────────────────────────────────────────┐
│ Tools 层   dsh-image-tools                                │
│   模型可见的工具：generate / edit / describe / plan /      │
│                  compose / assets                         │
└───────────────┬──────────────────────────────────────────┘
                │ 消费
┌───────────────┴──────────────┬───────────────────────────┐
│ Skill 层                      │ 产物层                     │
│ dsh-image-skills              │ dsh-image-assets          │
│   ctx.imageSkills             │   ctx.imageAssets         │
│   preset 编译 / 自检 / 评分     │   落盘 / 索引 / TTL        │
└───────────────┬──────────────┴───────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────┐
│ 服务定义层  dsh-image-core        ctx.imagegen            │
│   ImageRequest / ImageResult 契约 + 事件总线              │
└───────────────┬──────────────────────────────────────────┘
                │ 实现
┌───────────────┴──────────────────────────────────────────┐
│ Provider 层（可插拔，可并存多个）                           │
│  -provider-openai   -provider-gemini   -provider-nova     │
└──────────────────────────────────────────────────────────┘
```

### 2.2 包清单

| 包名 | 职责 | inject | 提供服务 |
|---|---|---|---|
| `dsh-image-core` | 契约 + 事件声明，零实现 | — | `imagegen`（注册表） |
| `dsh-image-provider-openai` | OpenAI 图片协议适配 | `imagegen` | — |
| `dsh-image-provider-gemini` | Google generateContent 适配 | `imagegen` | — |
| `dsh-image-provider-nova` | 桥接已有 Nova 后端 `/api/nova/*` | `imagegen` | — |
| `dsh-image-assets` | 产物落盘、索引、缩略图、清理 | `jobs` | `imageAssets` |
| `dsh-image-skills` | Skill 包加载、preset 编译、自检评分 | `llm` | `imageSkills` |
| `dsh-image-compose` | 三联拼接、比例裁切、文字叠加、GIF | — | `imageCompose` |
| `dsh-image-tools` | 注册全部模型可见工具 | `tools`, `imagegen`, `imageSkills`, `imageAssets`, `imageCompose` | — |
| `dsh-image-guard` | 敏感词/策略拦截 | `imagegen` | — |
| `dsh-image-ui`（可选） | 工具结果卡片渲染 | `tools` | — |

> 拆这么细的理由：Cordis 的 `inject` 既是时序约束也是**部署约束**。用户只想接自己的私有网关时，可以只装 core + 自己的 provider + tools，不装 skills；只想用 skill 编提示词、图交给别处生成时，可以只装 skills。

### 2.3 Nova → DSH 能力映射

这张表是移植工作的主索引。

| Nova 能力 | DSH 里的落点 | 说明 |
|---|---|---|
| 多图片模型 / 文本模型配置，模型级 Key+BaseURL | `cordis.yml` 的 provider 配置数组 + `settings.yaml` namespace | 配置从 localStorage 迁到 dsh 配置树 |
| API Key 明文存浏览器 | **CredentialRef**（只存环境变量名）+ `.credentials.yaml` + `redactSecrets` | 安全等级实质提升，见 §6 |
| `server.js` 任务队列 / 并发 50 | `ctx.jobs` 后台任务 + `dsh-image-assets` | 不自建 HTTP 服务 |
| SQLite `nova-tasks.sqlite` | dsh session log（可审计）+ 工作区 `index.json` | append-only 事件流本来就是 dsh 的强项 |
| WebSocket 实时推送 | `ctx.jobs` 进度 + `exec.agent` 异步通知 | 用户在 dsh 会话流里看到进度 |
| 任务 TTL 12h + 5 分钟清理 | `imageAssets` 的 TTL 策略（可配置，默认保留） | dsh 是本地工作区，默认策略改为"保留最近 N 次" |
| 产物 HTTP 路由 `/api/nova/images/:id/:i` | 工作区文件路径 + `present_files` 式引用 | 无需 HTTP |
| 文生图 `TextToImageForm` | `image_generate` tool | |
| 图生图 `ImageToImageForm` | `image_edit` tool | |
| 反推提示词 `ReversePromptForm` | `image_describe` tool（走 `ctx.llm` vision） | |
| GIF 生成 `GifGenerationWorkspace` | `image_compose` 的 `gif` 模式 | P2 |
| Agent 模式 `AgentChatWorkspace` | **dsh 原生 agent loop** | 不移植 |
| 提示词广场 `prompts.json` | Skill 包 + preset 库 | 升级为"有判断过程的策略包" |
| 无限画布、切图编辑器、PWA | 不移植 | 属产品形态 |

---

## 3. 核心契约

### 3.1 服务定义（`ctx.imagegen`）

```ts
// dsh-image-core/src/types.ts
export interface ImageRequest {
  /** 最终送给模型的正向提示词（英文优先，见规范 §3） */
  prompt: string
  /** 负面约束，由 skill preset 与用户输入合并 */
  negative?: string
  /** 画幅。统一用比例字符串，provider 自行换算像素 */
  aspectRatio: AspectRatio        // '21:9' | '3:4' | '16:9' | '1:1' | '9:16' | '2.39:1' | ...
  /** 出图张数 */
  n: number
  /** 参考图。注意：是否允许进入生成取决于 refUsage */
  refImages?: AssetRef[]
  /** 参考图用途。'analysis-only' 时 provider 必须拒绝把它送进生成 */
  refUsage: 'analysis-only' | 'image-to-image'
  seed?: number
  /** 由 skill 编译产生的结构化创作方案，provider 只读，用于日志与自检 */
  plan?: CreativePlan
  /** provider 私有参数透传（如 OpenAI 的 quality / style / background） */
  providerOptions?: Record<string, JsonValue>
}

export interface ImageResult {
  images: AssetRef[]              // 落盘后的产物引用
  providerId: string
  model: string
  usage?: { durationMs: number; upstreamCost?: number }
  /** 领域层面的"不理想但成功"信息，不抛异常 */
  notes?: string[]
}

export interface AssetRef {
  /** 工作区相对路径，如 .dsh/image-studio/<session>/<task>/shot-1.png */
  path: string
  width: number
  height: number
  mime: string
  sha256: string
}
```

`ctx.imagegen` 是**注册表**而非单实现，支持多 provider 并存：

```ts
interface ImageGenService {
  register(id: string, impl: ImageProvider): void   // effect，dispose 自动注销
  list(): ProviderInfo[]
  resolve(id?: string, task?: TaskKind): ImageProvider   // 按默认模型路由
  generate(req: ImageRequest, opts?: { providerId?: string }): Promise<ImageResult>
  describe(images: AssetRef[], instruction?: string): Promise<string>
}
```

### 3.2 创作方案（`CreativePlan`）

Skill 编译的产物。**这是整个插件的中枢数据结构**——它让"导演判断"变成可传递、可校验、可复现的对象。

```ts
export interface CreativePlan {
  skillId: string                 // 'cinema-dna-21x9x3' | 'life-force-portrait' | ...
  skillVersion: string
  /** 人可读的判断过程，写进 session log，供用户审阅 */
  reasoning: {
    /** cinema-dna：不可解决的状态 / 观众位置 / 视线流量 / 色彩命题 / 成像基底 / 三联节奏 */
    /** life-force：人物 → 事件 → 镜头 → 光色 → 质感 */
    [field: string]: string
  }
  /** 要生成的每一张图 */
  shots: Array<{
    id: string                    // 'shot-1'
    role: string                  // '镜头功能' / 'MODE B 样片 1'
    prompt: string                // 英文最终提示词
    negative: string
    aspectRatio: AspectRatio
  }>
  /** 生成后的合成动作 */
  compose?: ComposeSpec
  /** 该 skill 的硬约束，出图前由 core 强制校验 */
  constraints: PresetConstraints
  /** 自检结果 */
  selfCheck: { score: number; passed: boolean; failures: string[] }
}
```

### 3.3 事件总线

在 `dsh-image-core` 用声明合并注册，其余插件按 §2.2 的 Cordis 分发模式接入。

| 事件 | 模式 | 签名 | 用途 |
|---|---|---|---|
| `image/plan` | waterfall | `(brief, skillId, next)` | Skill 编译创作方案；不调 `next()` 即接管 |
| `image/guard` | bail | `(req)` → `GuardVerdict \| void` | 敏感词、黑名单、策略否决。**同步短路** |
| `image/before-request` | waterfall | `(req, next)` | 注入负面词、锁比例、剥离禁用参考图 |
| `image/after-result` | parallel | `(req, result)` | 落盘、索引、缩略图、通知 |
| `image/score` | serial | `(plan)` → `ScoreCard \| void` | 自检评分，第一个返回值胜出 |
| `image/progress` | emit | `(taskId, phase, pct)` | 进度广播 |

> **waterfall 纪律**（写进 CONTRIBUTING）：只做观察的监听器**必须**调用 `next()`。`image/before-request` 上忘记调 `next()` 会静默吞掉负面词注入和比例锁定——这是本插件最容易踩的坑，代码评审必查。

---

## 4. 模型可见的工具

注册到 `ctx.tools`，用 `defineTool` 定义。设计原则：**工具数量克制，语义正交**。生图场景下工具一多，模型就会乱调。

### 4.1 工具清单

| 工具 | 作用 | 是否出图 |
|---|---|---|
| `image_skill_plan` | 用指定 skill 把用户 brief 编成 `CreativePlan`，含判断过程与自检分 | 否 |
| `image_generate` | 文生图。可直接给 prompt，也可给 `planId` 执行方案 | 是 |
| `image_edit` | 图生图 / 局部编辑。保留原人物身份（MODE A 场景） | 是 |
| `image_describe` | 反推提示词 / 参考图抽象分析 | 否 |
| `image_compose` | 三联拼接、比例裁切、文字叠加、GIF 编码 | 产出合成图 |
| `image_assets` | 列出 / 查看本次会话产物 | 否 |

### 4.2 `image_generate` 定义（示意）

```ts
ctx.tools.register(defineTool({
  name: 'image_generate',
  description: [
    'Generate images from a text prompt. If a creative plan was produced by',
    'image_skill_plan, pass planId and omit prompt — the plan already carries',
    'per-shot prompts, aspect ratio and negative constraints.',
  ].join(' '),
  parameters: {
    prompt:       { type: 'string', description: 'English prompt. Omit when planId is given.' },
    planId:       { type: 'string', description: 'Id returned by image_skill_plan.' },
    aspectRatio:  { type: 'string', description: "e.g. '21:9', '3:4'. Ignored when planId is given." },
    n:            { type: 'number', description: 'Number of images, 1-4. Default 1.' },
    providerId:   { type: 'string', description: 'Override the default image provider.' },
    seed:         { type: 'number' },
  },
  output: {
    schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        images: { type: 'array', items: { type: 'object' } },
        notes:  { type: 'array', items: { type: 'string' } },
      },
    },
    render: (_args, v) => [
      { type: 'text', text: `生成 ${v.images.length} 张，已保存到 ${dirOf(v.images)}` },
      ...v.images.map(img => ({ type: 'image', path: img.path })),
    ],
  },
  async execute(args, exec) {
    // 1. 组装 ImageRequest（planId 优先）
    // 2. ctx.bail('image/guard', req) —— 被否决直接返回领域错误值，不抛异常
    // 3. ctx.waterfall('image/before-request', req, next)
    // 4. ctx.jobs 提交后台任务，exec.signal 接取消
    // 5. ctx.parallel('image/after-result', req, result)
    // 6. 返回规范 JSON（绝不返回内容块——那是 render 的职责）
  },
}))
```

### 4.3 典型调用链

**场景：用户说"用电影 skill 给我做一组明代科举舞弊案的三联镜头，再出个海报"**

```
image_skill_plan(skillId='cinema-dna-21x9x3', brief='明代科举舞弊…', wantPoster=true)
  → 内部走 ctx.llm 做构图分析 → 生成 3 条候选视线流量 → 选一条
  → 产出 CreativePlan：3 个 shot（21:9）+ 1 个 poster shot（3:4）
  → 跑 image/score，得 87 分 → passed
  → 返回 planId + 判断过程（用户可在会话流里看到"色彩命题：褪色朱红在潮湿青灰中持续存在"）

image_generate(planId=...)
  → before-request 注入 preset 的负面补丁与 21:9 锁定
  → 并发出 3 张
  → 落盘 .dsh/image-studio/<session>/<task>/shot-{1,2,3}.png

image_compose(mode='triptych', assets=[shot-1,2,3], gap=10, ratio='1:1:1')
  → 纵向拼接，黑边 10px，无文字无边框
  → triptych.png

image_generate(planId=..., shotId='poster-base')   # 3:4 无文字底图
image_compose(mode='text-overlay', asset='poster-base.png', title='…', layout=…)
  → 两段式：底图交给模型，准确文字交给排版
```

这条链体现了三个设计决定：

1. **计划与执行分离**：`plan` 可被用户审阅、修改、复用，出图失败不用重新做判断。
2. **文字不交给图像模型**：cinema-dna §13.5.5 明确要求两段式。`image_compose` 的 `text-overlay` 用 Pillow/sharp 精确排版。
3. **拼接不交给图像模型**：cinema-dna §13 明确要求"不让图像模型在同一画布里同时画三张"。

---

## 5. Skill 包机制

### 5.1 为什么要包装

原始 skill 是给"会读文档的 agent"用的散文。放进插件后需要两样东西：

- **人读的部分**（`SKILL.md`）：仍然原样保留，注入系统提示词或交给 `image_skill_plan` 的编译 LLM 做判断。这是价值所在，不能压缩成关键词。
- **机器读的部分**（`preset.yaml`）：把散文里的硬约束抽成结构化字段，让插件能**强制执行和校验**，而不是祈祷模型记住了。

### 5.2 目录结构

沿用 FANTASY 系列既有布局，只新增一个 `preset.yaml`：

```
skills/
├─ cinema-dna-21x9x3/
│  ├─ SKILL.md            # 原文，不改
│  ├─ preset.yaml         # 新增：机器可读约束
│  ├─ agents/
│  └─ references/
├─ life-force-portrait/
├─ photography-simulation/
├─ movie-poster/          # 接口预留
└─ character-casting/     # 接口预留
```

### 5.3 `preset.yaml` 规范（以 cinema-dna 为例）

```yaml
id: cinema-dna-21x9x3
version: 1.2.2
title: CINEMA DNA 21:9 × 3
source: SKILL.md                 # 人读部分入口

modes:
  triptych:                      # 默认模式
    shots: 3
    aspectRatio: '21:9'
    compose:
      mode: triptych
      direction: vertical
      gapPx: [8, 12]
      ratios: ['1:1:1', '1.2:0.9:0.9', '0.9:1.2:0.9', '0.9:0.9:1.2']
      decorations: none          # 无文字、无序号、无水印、无边框
  poster:                        # 显式触发才启用
    trigger: explicit            # 用户必须点名"片名/海报/封面/视觉体系"
    shots: 1
    aspectRatio: '3:4'
    mustContainInPrompt: ['3:4 vertical poster composition']
    textStrategy: two-stage      # 底图 + 后期排版

constraints:
  referenceImages:
    usage: analysis-only         # 硬约束：参考图不得进入生成
    maxDimensions: 1             # 每次只能抽取构图/配色/题材中的一项
  negativePatch: >
    no CGI concept art, no game key art, no glossy AI rendering, no HDR,
    no plastic skin, no excessive particles, no fantasy poster composition,
    no teal-orange grading, no artificial rim light, no commercial beauty
    lighting, no television-drama blocking
  bannedPromptTerms:             # 空泛词，编译时应被替换为可见事实
    [cinematic, beautiful, poetic, emotional, mysterious, dramatic,
     atmospheric, masterpiece, epic]
  perShotLimits:
    sceneFacts: [2, 3]
    primaryAction: 1
    secondaryClue: 1
    lightSources: 1
    compositionMechanisms: 1

planFields:                      # image_skill_plan 必须填满的判断字段
  - 不可解决的状态
  - 观众位置
  - 主要构图压力
  - 视线流量
  - 色彩命题
  - 成像基底
  - 三联节奏

scoring:
  threshold: 82                  # 低于不生成
  rubric:
    - { item: 构图有明确空间压力与观看立场, max: 25 }
    - { item: 色彩命题清晰、物理来源可信,   max: 20 }
    - { item: 真人实景与摄影机质感,        max: 20 }
    - { item: 剧情有缺口、非电视剧化,      max: 20 }
    - { item: 三联剪辑变化与整体统一,      max: 10 }
    - { item: 原创隔离与参考安全,          max: 5  }
  posterBonus:
    - { item: 片名准确、短、有冲突钩子,    max: 5 }
    - { item: 主视觉从分镜提炼而非拼贴,    max: 5 }
    - { item: 文字层级和留白可执行,        max: 5 }
    - { item: 可扩展为完整封面体系,        max: 5 }
  vetoes:                        # 一票否决
    - 明显 CG / 游戏宣传图
    - 过度油腻 AI 光效
    - 普通电视剧式内容
    - 直接复刻参考图
    - 三张同机位、同动作、同构图

variationRules:                  # 结构化的可校验规则
  minChangedDimensions: 4        # 三张至少变化 4 项
  dimensions: [景别, 机位高度, 人物与环境比例, 构图机制,
               信息密度, 焦点层, 光线方向, 人物状态]
```

### 5.4 五个 Skill 的接入状态与要点

| Skill | 模式 | 核心硬约束 | 状态 |
|---|---|---|---|
| `cinema-dna-21x9x3` | triptych / poster | 21:9×3 纵向拼接、海报固定 3:4、评分线 82、参考图 analysis-only、一票否决 5 项 | 规则已完整提取 |
| `fantasy-life-force-portrait-photography` | MODE A 升级 / MODE B 原创 | MODE A 必须保留人物身份与原事件；质感层只选 1–2 种；禁止项清单（油亮皮肤、欧美模特脸、影楼感、AI 娃娃脸…）；四层判断顺序 | 规则已完整提取 |
| `fantasy-photography-simulation-github` | 场景摄影模拟 | 「任意地点 + 保持摄影风味」，需补齐 preset | 需通读 SKILL.md |
| `fantasy-movie-poster-skill` | 电影海报 | 与 cinema-dna 的 poster 模式需**明确分工**，避免重复能力 | **接口预留，待补** |
| `character-casting-studio-skill` | 选角 / 角色一致性 | 角色档案跨镜头复用，输出 `CharacterSheet` 供其他 skill 引用 | **接口预留，待补** |

> **跨 skill 协同是本插件的增量价值**：`character-casting` 产出的 `CharacterSheet`（人物外形、年龄、服装、气质的结构化描述）可以被 `cinema-dna` 的三联和 `movie-poster` 的海报共同引用，解决"三张图里的人不是同一个人"这个 AI 生图的老问题。设计上把它做成 `CreativePlan.characters[]`，由 `image/before-request` 注入每个 shot 的 prompt。

### 5.5 编译流程（`image_skill_plan` 内部）

```
brief（用户自然语言）
  ↓ 载入 preset.yaml + SKILL.md
  ↓ ctx.llm 内部分析（受控随机，按 SKILL 要求生成 ≥3 套候选流量）
  ↓ 选一套 → 填满 planFields
  ↓ 生成每个 shot 的英文 prompt
  ↓ 静态校验：bannedPromptTerms / perShotLimits / mustContainInPrompt / aspectRatio
  ↓ ctx.serial('image/score', plan) → ScoreCard
  ↓ score < threshold 或命中 veto → 重写（最多 2 轮），仍不过则返回 failures 交给用户
  ↓ 产出 CreativePlan（持久化到工作区，返回 planId）
```

自动重写上限设为 2 轮：无限重试会烧 token 且往往收敛不了，交回用户判断更诚实。

---

## 6. 配置与密钥

### 6.1 配置声明

遵循 dsh 的"无硬编码可调参数"硬约定——凡不同部署可能取不同值的，一律配置字段。

```ts
export interface Config {
  providers: Array<{
    id: string
    protocol: 'openai-image' | 'gemini-generate' | 'nova-bridge'
    model: string
    baseUrl?: string
    apiKeyEnv: string            // CredentialRef：只写环境变量名
    maxRefImages: number
    maxResolution: string
    providerOptions?: Record<string, unknown>
  }>
  defaults: {
    textToImage: string
    imageToImage: string
    describe: string             // 文本/vision 模型 id
    poster: string
  }
  skills: { dir: string; enabled: string[] }
  output: { dir: string; keepLastTasks: number; ttlHours?: number }
  limits: { concurrency: number; perTaskTimeoutMs: number; maxImagesPerCall: number }
  guard: { blacklistPath?: string; failClosed: boolean }
}

export const Config: Schema<Config> = Schema.object({
  providers: Schema.array(Schema.object({
    id: Schema.string().required(),
    protocol: Schema.union(['openai-image', 'gemini-generate', 'nova-bridge']).required(),
    model: Schema.string().required(),
    baseUrl: Schema.string(),
    apiKeyEnv: Schema.string().role('secret').required(),
    maxRefImages: Schema.number().default(4),
    maxResolution: Schema.string().default('2048x2048'),
  })).default([]),
  // …
})
```

### 6.2 `cordis.yml` 部署示例

```yaml
- insert:
    - id: image-core
      name: '@you/dsh-image-core'

    - id: image-provider-openai
      name: '@you/dsh-image-provider-openai'
      config:
        providers:
          - id: img2
            protocol: openai-image
            model: image-2
            baseUrl: !!js process.env.IMG_BASE_URL ?? 'https://api.openai.com/v1'
            apiKeyEnv: IMAGE_STUDIO_KEY      # 只写变量名，值在 .credentials.yaml

    - id: image-skills
      name: '@you/dsh-image-skills'
      config:
        dir: !!js process.env.DSH_SKILLS_DIR ?? './skills'
        enabled: [cinema-dna-21x9x3, life-force-portrait]

    - id: image-tools
      name: '@you/dsh-image-tools'
      config:
        limits: { concurrency: 3, perTaskTimeoutMs: 180000, maxImagesPerCall: 4 }
```

### 6.3 密钥处理（相对 Nova 的实质改进）

Nova 把 API Key 存浏览器 localStorage；dsh 版本必须走 CredentialRef：

- `cordis.yml` / `settings.yaml` 里**只出现环境变量名**，永不出现密钥本体
- 值由凭据提供方持有（`$DSH_HOME/.credentials.yaml`），每次请求解析一次 → 轮换密钥无需重启
- 所有对外接口（配置页、describe API）必须传 `redactSecrets: true`，把 `role('secret')` 字段从返回值剥离，只枚举 `{path, set}` 槽位
- 空存储值在任何地方视为"不存在"，不做静默降级

---

## 7. 任务、产物与取消

### 7.1 任务模型

生图是慢操作（10s–120s），必须走 `ctx.jobs` 后台任务，不阻塞 agent loop。

```
image_generate.execute()
  → ctx.jobs.submit({ kind: 'image-generate', req })
  → 立即返回 taskId + 已就绪的部分结果？   ← 不。见下
```

**决定：`image_generate` 同步等待完成再返回。** 理由：工具结果要回喂给模型作为上下文，返回一个"待定的 taskId"会让模型在没有图的情况下继续推理，产生幻觉描述。但内部仍用 jobs 执行，以便：

- `exec.signal` 触发时协作式取消（中止上游请求、清理半成品）
- `image/progress` 事件让用户在会话流里看到进度
- 超时由 `perTaskTimeoutMs` 控制，超时抛异常 → 注册表标记 `isError`

批量（n>1 或三联）在 jobs 内并发，受 `limits.concurrency` 约束。

### 7.2 产物布局

```
<workspace>/.dsh/image-studio/
├─ index.json                       # 任务索引（可重建，非权威）
└─ <sessionId>/
   └─ <taskId>/
      ├─ plan.json                  # CreativePlan 快照
      ├─ request.json               # 脱敏后的最终 ImageRequest
      ├─ shot-1.png
      ├─ shot-2.png
      ├─ shot-3.png
      ├─ triptych.png
      └─ thumbs/
```

- 权威记录是 **dsh session log**（append-only，可 resume/fork/replay），`index.json` 只是加速查询的派生物，损坏可重建
- 默认**不删**产物（本地工作区不是服务器）。`keepLastTasks` 提供上限，`ttlHours` 默认关闭
- 路径写入前必须做工作区边界校验，拒绝 `..` 穿越（见验收 §5）

---

## 8. 安全与合规

### 8.1 运行时安全

| 风险 | 处理 |
|---|---|
| 提示词注入（参考图/用户文本里夹带指令） | `image_describe` 的输出视为**数据**而非指令，禁止直接拼进系统提示词；`image/guard` 做一次扫描 |
| SSRF（provider baseUrl 指向内网） | baseUrl 白名单 / 内网地址拒绝，复用 dsh 的 WebFetch SSRF 防护策略 |
| 路径穿越 | 所有 `AssetRef.path` 必须在工作区内，规范化后校验前缀 |
| 密钥泄漏进日志 | `request.json` 落盘前脱敏；错误信息不回显 Authorization 头 |


## 9. 里程碑

| 阶段 | 范围 | 出口 |
|---|---|---|
| M0 骨架 | core 契约 + 一个 provider + `image_generate` + 落盘 | 在 dsh 里说"画一只猫"能出图并落到工作区 |
| M1 Skill 引擎 | skills 加载、preset 编译、`image_skill_plan`、评分自检 | cinema-dna 三联全流程跑通，评分 <82 能正确拒绝 |
| M2 合成 | `image_compose` 三联拼接 + 比例裁切 + 文字叠加 | 海报两段式产出准确中文标题 |
| M3 多 provider + 编辑 | gemini / nova-bridge、`image_edit`、`image_describe` | MODE A 保身份升级跑通 |
| M4 跨 skill 协同 | `CharacterSheet`、movie-poster、casting 接入 | 同一角色在三联 + 海报中一致 |
| M5 打磨 | UI 卡片、guard 完备、文档、发布 | 挂 `dsh-plugin` topic 发布 |

---

