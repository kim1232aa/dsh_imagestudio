# DSH Image Studio 插件 · 设计规范

> 本文是**可执行的约束**，不是建议。每条规范都对应验收文档里的一个检查项。
> 违反规范的 PR 一律不合并，不接受"先合了后面再改"。

---

## 1. 工程规范

### 1.1 包与模块

| 项 | 规范 |
|---|---|
| 包名 | `@<scope>/dsh-image-<name>`，与 dsh 官方 `@deepseek-ai/dsh-*` 对齐但用自己的 scope |
| 模块格式 | ESM only，`"type": "module"` |
| Cordis 依赖 | `@deepseek-ai/cordis` 必须是 `peerDependencies` + `devDependencies`，**不得**是 `dependencies` |
| 跨包引用 | 用包名；包内相对引用带 `.ts` 后缀 |
| 导出 | 每个插件包导出 `name` / `inject` / `Config` / `apply`；不导出内部实现 |
| 构建产物 | `lib/*.js` + `.d.ts`，通过 `publint` 与 NodeNext 类型校验 |

### 1.2 插件骨架

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'image-tools'                 // 包级唯一
export const inject = ['tools', 'imagegen', 'imageSkills']

export interface Config { /* … */ }
export const Config: Schema<Config> = Schema.object({ /* … */ })

export function apply(ctx: Context, config: Config) {
  // 只做注册。注册即 effect，dispose 自动清理。
}
```

**禁止事项：**

- 禁止导出普通对象作为 `Config`（不满足 Standard Schema 接口，加载会失败）
- 禁止在 `apply` 外部做副作用（模块顶层不得建连接、开定时器、读文件）
- 禁止手动 `removeListener` / `clearInterval`；未托管资源必须包进 `ctx.effect()` 并返回 disposer
- 禁止用 `import` 具体 provider 实现来"直接调用"；一律经 `ctx.<key>` 查找服务
- 禁止硬编码可调参数。**检验标准：能否在 `cordis.yml` 改值而不改代码？** 不能就是 bug

### 1.3 依赖声明

- 必需依赖写 `inject` 数组；可选依赖不写 `inject`，用 `ctx.get('key')` 探测
- `inject` 同时是部署约束：README 必须列出 `Requires:` 行，说明部署需一并加载哪些 provider

---

## 2. 事件规范

### 2.1 命名

`image/<action>`，小写连字符。禁止 `imageStudio/xxx`、`IMAGE/XXX`、无命名空间的裸事件名。

### 2.2 分发模式与使用纪律

| 事件 | 模式 | 铁律 |
|---|---|---|
| `image/plan` | waterfall | 只观察的监听器**必须** `return next()` |
| `image/before-request` | waterfall | 同上。忘记 `next()` 会静默吞掉负面词注入与比例锁定 |
| `image/guard` | bail | 同步；返回非 null/false/undefined 即否决并短路 |
| `image/score` | serial | 第一个有效返回值胜出 |
| `image/after-result` | parallel | 监听器不得抛异常影响主流程，自行 try/catch |
| `image/progress` | emit | 纯广播，不得在监听器里做重活 |

**waterfall 自查清单（代码评审必过）：**

```ts
// ✅ 观察型：委托下游
ctx.on('image/before-request', async (req, next) => {
  logger.debug(req.prompt)
  return next()                       // 必须
})

// ✅ 决策型：有权短路
ctx.on('image/before-request', async (req, next) => {
  if (req.refUsage === 'analysis-only' && req.refImages?.length) {
    req = { ...req, refImages: undefined }   // 剥离后仍然委托
  }
  return next()
})

// ❌ 静默吞掉下游
ctx.on('image/before-request', async (req, next) => {
  logger.debug(req.prompt)            // 没有 return next()
})
```

### 2.3 类型声明

事件必须通过声明合并注册类型，消费方用 `import type {} from '@you/dsh-image-core'` 引入：

```ts
declare module '@deepseek-ai/cordis' {
  interface Events {
    'image/before-request'(req: ImageRequest, next: () => Promise<ImageRequest>): Promise<ImageRequest>
    'image/guard'(req: ImageRequest): GuardVerdict | void
  }
}
```

声明只给类型、不生成运行时接线——发事件的插件必须自己 `emit`。

---

## 3. 工具（Tool）规范

### 3.1 契约

| 项 | 规范 |
|---|---|
| 命名 | `image_<verb>`，snake_case，全局唯一 |
| 数量 | 本插件**最多 6 个**工具。新增必须论证为何不能合并为已有工具的参数 |
| description | 写清"做什么 + 何时用 + 与相邻工具的区别"。禁止只写一句话名词解释 |
| parameters | 只用 `required: true` 标必填；每个参数必须有 `description` |
| output.schema | 必须声明。根可以是对象/数组/标量/null |
| output.render | 负责把规范值转成模型可见内容 |
| execute 返回 | **只返回规范 JSON 值**。禁止返回内容块（`[{type:'text'}]`）——那是 render 的职责 |
| 错误语义 | 基础设施故障 → 抛异常（注册表标 `isError`）；"不理想但成功"的领域结果 → 写进规范值，由 render 解释 |
| 取消 | 长任务必须监听 `exec.signal`，信号触发时停止在途工作并清理半成品 |
| 通知 | 进度用 `exec.agent` 异步通知，不要靠返回值携带进度 |

### 3.2 错误分类表

| 情况 | 处理 | 模型看到 |
|---|---|---|
| 参数不合法（模型生成错） | 注册表自动校验 → `ToolArgsError(INVALID_ARGS)` | 错在哪，可重新生成参数 |
| schema 表达不了的约束（如 n 必须 1–4） | `execute` 内手动检查 → 抛 `ToolArgsError` | 同上 |
| provider 401/网络断 | 抛异常 | `isError`，附脱敏原因 |
| guard 否决 | **返回规范值** `{ blocked: true, reason }` | 被拒原因，可改写提示词重试 |
| 评分未达 82 | **返回规范值** `{ passed: false, score, failures[] }` | 具体哪几项不过，可重写 |
| 超时 | 抛异常 | `isError` |

分类原则：**模型能靠自己修的 → 领域返回值；模型修不了的 → 异常。**

### 3.3 参数命名统一表

跨工具必须一致，避免模型混淆：

| 概念 | 统一参数名 | 禁用别名 |
|---|---|---|
| 提示词 | `prompt` | `text`, `description`, `query` |
| 负面词 | `negative` | `negativePrompt`, `avoid` |
| 画幅比例 | `aspectRatio`（字符串 `'21:9'`） | `ratio`, `size`, `width/height` |
| 张数 | `n` | `count`, `num`, `batchSize` |
| 产物引用 | `assets` / `asset`（工作区相对路径） | `images`, `files`, `urls` |
| 方案 id | `planId` | `plan`, `id` |
| provider | `providerId` | `model`, `provider` |

---

## 4. Skill 包规范

### 4.1 目录

```
<skill-id>/
├─ SKILL.md        必需  人读判断规则，原文保留，不裁剪
├─ preset.yaml     必需  机器可读约束
├─ README.md       可选  出处、作者署名、安装说明
├─ references/     可选  扩展规则
└─ agents/         可选  宿主特定配置
```

`<skill-id>` 必须是 kebab-case，与 `preset.yaml` 的 `id` 字段一致。

### 4.2 `preset.yaml` 必填字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 与目录名一致 |
| `version` | string | 语义化版本，跟随上游 SKILL 版本 |
| `source` | string | 人读部分入口，默认 `SKILL.md` |
| `modes` | map | 至少一个模式；每个模式含 `shots` / `aspectRatio` |
| `constraints.referenceImages.usage` | enum | `analysis-only` \| `image-to-image`。**默认 analysis-only** |
| `constraints.negativePatch` | string | 负面补丁，出图前强制注入 |
| `planFields` | string[] | 编译时必须填满的判断字段 |
| `scoring.threshold` | number | 低于此分不生成 |
| `scoring.rubric` | array | 逐项分值，总分 100 |

选填但强烈建议：`constraints.bannedPromptTerms`、`constraints.perShotLimits`、`scoring.vetoes`、`variationRules`。

### 4.3 硬约束 vs 软约束的划线

这是 skill 包装的核心判断，划错会导致"规范写了但没生效"。

**硬约束（插件强制执行，LLM 无权绕过）：**

- 画幅比例、张数、拼接参数（间隔像素、方向、比例节奏、无装饰）
- 负面补丁注入
- 参考图用途（`analysis-only` 时必须在 `image/before-request` 里剥离）
- 空泛词黑名单（编译时检出即打回重写）
- 评分阈值与一票否决
- 三联变化维度数量（可通过结构化比对校验）

**软约束（交给 LLM 判断，只记录不阻断）：**

- 视线流量是否"只属于这个题材"
- 色彩命题是否"改变观众对事件的判断"
- 剧情是否"有缺口、非电视剧化"
- 构图是否"由关系压力产生"

规范：**凡能写成断言的，一律做硬约束。** 软约束必须在 `CreativePlan.reasoning` 里留下可审阅的文字，让用户能自己判断。

### 4.4 跨 Skill 协同

- 共享数据结构走 `CreativePlan` 的顶层字段，不走 skill 私有字段
- `CharacterSheet`（角色档案）由 `character-casting` 产出，结构固定：

```yaml
characters:
  - id: lead-01
    role: 主角
    descriptor: >            # 注入每个 shot prompt 的稳定描述，英文
      mid-thirties East Asian man, close-cropped hair, weathered face,
      faded indigo cotton robe with worn cuffs
    consistencyAnchors: [hair, facial structure, costume]
    seed: 771203             # 可选，provider 支持时复用
```

- 引用 `CharacterSheet` 的 skill 在 `image/before-request` 里把 `descriptor` 注入 prompt 的人物段，**不覆盖**该 shot 的动作与情境描述
- 能力重叠的 skill（如 cinema-dna 的 poster 模式与独立的 movie-poster skill）必须在 preset 里声明 `supersededBy` 或合并为同一 skill 的不同 mode，禁止两个 skill 对同一请求都声称适用

---

## 5. 提示词规范

继承 cinema-dna §11 与 life-force 的四层判断，落成工程约束。

### 5.1 语言

- 判断过程、方案说明、与用户交互：**中文**
- 最终图像提示词：**英文**（便于直接复制到任何模型）
- 用户显式指定语言时从用户

### 5.2 单条 prompt 结构（固定顺序）

1. 画幅与成像基底
2. 具体时间、空间、人物
3. 主要动作与未完成状态
4. 摄影机位置、焦段、景别、构图机制
5. 实际光源
6. 色彩命题
7. 真实材质与光学限制
8. 精简负面约束

### 5.3 禁止

- 空泛词堆叠：`cinematic / beautiful / poetic / emotional / mysterious / dramatic / atmospheric / masterpiece / epic`。编译时检出即打回，必须替换为可见事实
- 在 prompt 里直接点名导演、具体电影、真实明星、商业品牌、现成 IP
- 把负面补丁重复写进正向 prompt
- 单条 prompt 超过 `perShotLimits` 规定的信息密度（场景信息 2–3 条、主要动作 1 个、次要线索 1 个、主光源 1 个、主要构图机制 1 个）

### 5.4 参考图

- 默认 `analysis-only`：参考图只进 `image_describe` 做抽象分析，**不得**作为 provider 的图生图底图或风格图
- 每次最多抽取一个维度（构图 / 配色 / 题材），其余必须原创
- 用户显式要求图生图（MODE A 照片升级）时，`refUsage` 才可为 `image-to-image`，且必须在 plan 的 reasoning 里记录"保留人物身份"的判断

---

## 6. 配置规范

| 项 | 规范 |
|---|---|
| 声明方式 | 同名 `Config` 接口 + Schemastery schema，默认值**写在 schema 里** |
| 必填 | `Schema.string().required()`，缺失即加载失败，不做静默降级 |
| 密钥 | 只存 `apiKeyEnv`（CredentialRef，环境变量名），标 `.role('secret')` |
| 对外接口 | 一律传 `describe({ redactSecrets: true })`，密钥字段只返回 `{path, set}` 槽位 |
| 环境差异 | 用 `!!js` 插值引用环境变量或已注入服务，不维护多份配置文件 |
| 热替换 | 改 `config` 触发 HMR：卸载旧实例、加载新实例。所有注册必须是 effect，保证无残留 |
| patch 覆盖 | 按 `id` **整行替换**（非深度合并）。文档必须提醒：覆盖时要重述该行需要的每个键 |

---

## 7. 产物与文件规范

| 项 | 规范 |
|---|---|
| 根目录 | `<workspace>/.dsh/image-studio/`，可配置 |
| 路径形态 | `AssetRef.path` 一律**工作区相对路径**，正斜杠，不含 `..` |
| 边界校验 | 写入/读取前规范化并校验前缀在工作区内，越界抛异常 |
| 命名 | `shot-<n>.png` / `triptych.png` / `poster-base.png` / `poster.png`，小写 kebab |
| 权威记录 | dsh session log。`index.json` 是派生物，损坏可重建，不得作为唯一来源 |
| 保留策略 | 默认不删；`keepLastTasks` 提供上限；`ttlHours` 默认关闭 |
| 脱敏 | `request.json` 落盘前移除 Authorization、密钥、完整 baseUrl 中的凭据段 |

---

## 8. 日志与可观测

- 用 dsh 的 session log 记录：`CreativePlan`（含 reasoning）、最终 `ImageRequest`（脱敏）、评分卡、provider 与耗时
- 用户必须能在 Trajectory 视图里看到"为什么是这个构图、这个色彩"——这是本插件相对裸调 API 的主要可解释性收益
- `logger` 分级：`debug` 记 prompt 全文，`info` 记任务开始/完成，`warn` 记降级，`error` 记失败
- **任何日志都不得输出密钥、完整请求头、用户上传图片的 base64**

---

## 9. 文档规范

每个包的 README 必须包含：

1. 一句话职责
2. `Requires:` 行（`inject` 的服务键，即部署必须一并加载的 provider）
3. 完整配置字段表（字段 / 类型 / 必填 / 默认 / 说明）
4. `cordis.yml` 最小可用示例
5. 该包注册的事件或工具清单
6. 许可证与第三方致谢

仓库根需有：`README.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md`、`CONTRIBUTING.md`（含 waterfall 纪律）、GitHub topic `dsh-plugin`。

---

## 10. 版本与兼容

- dsh 处于 developer preview，**明确会有破坏性变更**。`package.json` 里对 `@deepseek-ai/cordis` 声明**明确的 peer 版本范围**，不用 `*`
- 每次 dsh 版本升级：跑一遍验收文档的"兼容回归"清单（验收 §7）
- 本插件自身版本语义化：contract（`ImageRequest` / `CreativePlan` / 事件签名）变更 → major
- `preset.yaml` 的 schema 变更须提供迁移说明；旧 preset 加载失败必须给出明确错误，不静默忽略字段
