# DSH Image Studio 插件 · 验收规范

> 验收原则：**能自动断言的一律自动化**，只有"画面好不好看"这类判断才留人工。
> 每条用例给出 ID，便于在 PR 里引用（如 `closes AC-SK-04`）。
> 判定：P = 必须通过才能发布；S = 建议通过，可带已知问题发布。

---

## 0. 验收环境

| 项 | 要求 |
|---|---|
| Node | 22.19+ 或 24+ |
| 包管理 | pnpm 11.7.0 |
| dsh | 锁定到某个具体 commit，记录在 `docs/verified-against.md` |
| provider | 至少两个：一个真实 API，一个 mock（本地 fixture，用于离线 CI） |
| skill | 至少 `cinema-dna-21x9x3` 与 `life-force-portrait` 两个包完整 |
| 工作区 | 干净的临时目录，每个用例前重置 |

CI 必须能在**无真实 API Key** 的情况下跑完全部自动化用例（走 mock provider），真实 API 用例自行 skip 并在报告中标注。

---

## 1. 插件生命周期验收（AC-LC）

| ID | 用例 | 判定 |
|---|---|---|
| AC-LC-01 | 全量插件按 `cordis.yml` 加载，所有 fiber 进入 `ACTIVE` | P |
| AC-LC-02 | 只加载 `image-tools` 而不加载任何 provider → `image-tools` 停在 `PENDING`，日志明确说明缺哪个服务，**不报错崩溃** | P |
| AC-LC-03 | 运行中卸载唯一 provider → `image-tools` 自动卸载；重新加载 provider → 自动恢复 | P |
| AC-LC-04 | 修改 `cordis.yml` 里 provider 的 `model` → 触发 HMR，旧实例卸载、新实例加载，**工具注册表里没有重复的 `image_generate`** | P |
| AC-LC-05 | dispose 插件后：`ctx.tools` 中相关工具全部注销；无残留定时器、无未关闭的 HTTP agent（用 `why-is-node-running` 或等价手段验证） | P |
| AC-LC-06 | 非法配置（缺 `apiKeyEnv`）→ 加载失败，错误信息指出具体字段路径，**不静默取默认值** | P |
| AC-LC-07 | 模块顶层无副作用：`import` 包但不 `apply`，不产生任何网络连接、文件写入、定时器 | P |

---

## 2. 工具契约验收（AC-TL）

| ID | 用例 | 判定 |
|---|---|---|
| AC-TL-01 | 全部工具数量 ≤ 6 | P |
| AC-TL-02 | 每个工具的 `ToolSchema` 投影到系统提示词后，只含 `name` / `description` / `parameters`；`output`、`execute`、内部字段**不出现在模型请求里** | P |
| AC-TL-03 | `image_generate` 传 `n: "three"`（类型错）→ 注册表返回 `INVALID_ARGS`，模型可见错误位置，**插件不崩溃** | P |
| AC-TL-04 | `image_generate` 传 `n: 99`（超出 schema 表达不了的业务上限）→ `execute` 内手动校验，抛 `ToolArgsError` | P |
| AC-TL-05 | `execute` 返回值**不是**内容块数组；内容块只由 `output.render` 产出 | P |
| AC-TL-06 | provider 返回 401 → 抛异常 → 工具结果标 `isError`，错误信息**不含** Authorization 头或密钥 | P |
| AC-TL-07 | guard 否决 → 返回规范值 `{ blocked: true, reason }`，**不是异常**；模型能据此改写提示词重试 | P |
| AC-TL-08 | 评分未达阈值 → 返回 `{ passed: false, score, failures[] }`，**不是异常** | P |
| AC-TL-09 | 跨工具参数命名一致（`prompt` / `negative` / `aspectRatio` / `n` / `assets` / `planId` / `providerId`），无别名 | P |
| AC-TL-10 | 生图进行中触发 `exec.signal` → 在途上游请求被中止，半成品文件被清理，工具返回取消结果而非超时 | P |
| AC-TL-11 | 超过 `perTaskTimeoutMs` → 抛超时异常，产物目录不残留半写入文件 | P |

---

## 3. 事件与扩展点验收（AC-EV）

| ID | 用例 | 判定 |
|---|---|---|
| AC-EV-01 | 注册一个只打日志且**正确调用 `next()`** 的 `image/before-request` 监听器 → 负面补丁与比例锁定仍然生效 | P |
| AC-EV-02 | 注册一个**忘记调用 `next()`** 的监听器 → 单测能检出并给出明确失败信息（作为回归护栏，防止真实代码写错） | P |
| AC-EV-03 | `image/guard` 返回否决 → 请求同步短路，**上游 API 一次都没被调用**（mock provider 计数为 0） | P |
| AC-EV-04 | `image/score` 有两个监听器 → 第一个有效返回值胜出，第二个不执行 | P |
| AC-EV-05 | `image/after-result` 某个监听器抛异常 → 不影响主流程返回，异常被记录 | P |
| AC-EV-06 | 事件类型通过声明合并可用：消费方 `import type {}` 后 `ctx.on` 有完整类型提示，typecheck 通过 | P |

---

## 4. Skill 引擎验收（AC-SK）

### 4.1 加载与编译

| ID | 用例 | 判定 |
|---|---|---|
| AC-SK-01 | 扫描 `skills/` 目录，加载全部合法 skill；`preset.yaml` 缺必填字段 → 该 skill 加载失败并给出字段路径，**其余 skill 不受影响** | P |
| AC-SK-02 | `preset.yaml` 的 `id` 与目录名不一致 → 加载失败 | P |
| AC-SK-03 | `image_skill_plan` 产出的 `CreativePlan` 填满了 preset 的全部 `planFields`，缺一项即判失败 | P |
| AC-SK-04 | 生成的 prompt 命中 `bannedPromptTerms`（如含 `cinematic`）→ 编译阶段打回重写，最终产出不含这些词 | P |
| AC-SK-05 | 自动重写次数上限为 2；连续 3 次不过 → 返回 `failures[]` 交还用户，**不无限重试** | P |
| AC-SK-06 | 同一 brief 连跑 5 次，`reasoning.视线流量` 与主要构图机制**不完全重复**（受控随机生效） | S |

### 4.2 硬约束强制执行

这组是本插件存在的理由，**全部 P，一条不过不发布**。

| ID | 用例 | 判定 |
|---|---|---|
| AC-SK-10 | cinema-dna triptych 模式 → 每个 shot 的 `aspectRatio` 恒为 `21:9`，用户在调用里传 `16:9` **也不能覆盖** | P |
| AC-SK-11 | 最终 `ImageRequest.negative` 包含 preset 的 `negativePatch` 全文（逐项比对，不是子串近似） | P |
| AC-SK-12 | `refUsage: 'analysis-only'` 时传入参考图 → `image/before-request` 剥离；**mock provider 收到的请求里 `refImages` 为空** | P |
| AC-SK-13 | poster 模式 → `aspectRatio` 恒为 `3:4`，且 prompt 中包含字面量 `3:4 vertical poster composition` | P |
| AC-SK-14 | poster 模式**不会**在用户只说"生成三联"时被自动触发（`trigger: explicit` 生效） | P |
| AC-SK-15 | 单个 shot 的信息密度不超过 `perShotLimits`（场景信息 ≤3、主要动作 =1、次要线索 =1、主光源 =1、构图机制 =1）——用结构化字段计数，不靠正则猜 | P |
| AC-SK-16 | 三联的 `variationRules.minChangedDimensions` 校验：三张之间变化维度 <4 → 编译打回 | P |
| AC-SK-17 | 评分 <82 → 不调用 provider（mock 计数为 0），返回 `passed: false` | P |
| AC-SK-18 | 命中任一 `vetoes` → 一票否决，无论总分多少 | P |
| AC-SK-19 | life-force MODE A → `refUsage` 为 `image-to-image`，且 plan 的 reasoning 中记录了"保留人物身份"的判断 | P |
| AC-SK-20 | life-force 的质感层在最终 prompt 中出现的效果种类 ≤2（不是每张都堆满焦散 + 色散 + 旋焦 + 运动模糊） | P |

### 4.3 跨 Skill 协同

| ID | 用例 | 判定 |
|---|---|---|
| AC-SK-30 | `character-casting` 产出的 `CharacterSheet` 出现在 `CreativePlan.characters[]`，结构符合规范 §4.4 | P |
| AC-SK-31 | 引用同一 `CharacterSheet` 的三联 + 海报，四条 prompt 的人物段 `descriptor` **字面一致** | P |
| AC-SK-32 | 注入 `descriptor` 后，各 shot 原有的动作与情境描述**未被覆盖**（diff 校验） | P |
| AC-SK-33 | 两个 skill 对同一请求都声称适用 → 加载期报冲突错误，要求用 `supersededBy` 或合并 mode 解决 | P |

---

## 5. 安全验收（AC-SEC）

| ID | 用例 | 判定 |
|---|---|---|
| AC-SEC-01 | `cordis.yml` / `settings.yaml` 中**只出现环境变量名**，全仓库 grep 不到密钥本体 | P |
| AC-SEC-02 | `describe({ redactSecrets: true })` 返回值中，`role('secret')` 字段被剥离，只剩 `{path, set}` 槽位 | P |
| AC-SEC-03 | 落盘的 `request.json` 不含 Authorization、密钥、凭据段 | P |
| AC-SEC-04 | 任意日志级别（含 `debug`）下，密钥、完整请求头、上传图 base64 均不出现在输出中 | P |
| AC-SEC-05 | 轮换环境变量值后**无需重启**，下一次请求即用新值；空值视为不存在，不静默降级到旧值 | P |
| AC-SEC-06 | `AssetRef.path` 传入 `../../etc/passwd` → 规范化后越界，抛异常，**不读写任何工作区外文件** | P |
---

## 6. 产物与任务验收（AC-AS）

| ID | 用例 | 判定 |
|---|---|---|
| AC-AS-01 | 产物落到 `<workspace>/.dsh/image-studio/<sessionId>/<taskId>/`，文件名符合规范 §7 | P |
| AC-AS-02 | 每个任务目录含 `plan.json` + `request.json`（脱敏）+ 产物图 | P |
| AC-AS-03 | 删除 `index.json` 后重启 → 能从目录结构重建索引，功能不受影响 | P |
| AC-AS-04 | 三联并发生成受 `limits.concurrency` 约束（设为 1 时 mock provider 的并发调用数恒为 1） | P |
| AC-AS-05 | 任务失败 → 半成品文件被清理，不留幽灵目录 | P |
| AC-AS-06 | `keepLastTasks: 3` → 第 4 个任务完成后，最旧的任务目录被清理 | S |
| AC-AS-07 | 进程异常退出后重启 → 不存在"永远处理中"的任务状态 | P |
| AC-AS-08 | `image_compose` 三联拼接：纵向、黑色间隔在 8–12px 内、无文字、无序号、无水印、无边框装饰 | P |
| AC-AS-09 | `image_compose` 比例节奏 `1.2:0.9:0.9` → 三段实际高度比误差 <1% | P |
| AC-AS-10 | `text-overlay` 输出的中文标题**字形完全正确**（与输入字符串逐字比对，不依赖图像模型生成文字） | P |

---

## 7. 兼容与回归验收（AC-CP）

dsh 每次升级后必跑这一组。

| ID | 用例 | 判定 |
|---|---|---|
| AC-CP-01 | `pnpm run typecheck` 通过 | P |
| AC-CP-02 | `publint` 通过：入口点与构建产物 `lib/*.js` 一致 | P |
| AC-CP-03 | NodeNext 类型消费者能正确 import 全部公开类型 | P |
| AC-CP-04 | `@deepseek-ai/cordis` 在 `peerDependencies` 中且版本范围明确（非 `*`） | P |
| AC-CP-05 | 在锁定的 dsh 版本上，AC-LC / AC-TL / AC-EV 全绿 | P |
| AC-CP-06 | 升级 dsh 后若契约变更 → 在 `docs/verified-against.md` 记录变更点与适配 commit | P |
| AC-CP-07 | `preset.yaml` schema 升级后，旧版 preset 加载给出明确错误，**不静默忽略未知字段** | P |

---

## 8. 人工质量验收（AC-HQ）

自动化管不到的部分。**每个 release 抽样 10 组题材，2 人独立评分，取均值。**

### 8.1 抽样题材池（覆盖 skill 的题材专项规则）

现代制度空间 / 东方古代 / 未来科幻 / 历史神话 / 宗教科幻 / 武侠科幻 / 运动 / 儿童 / 老人 / 家庭日常。

### 8.2 cinema-dna 三联评分表

直接采用 SKILL.md §15 的 rubric，满分 100：

| 项 | 分值 | 评分要点 |
|---|---|---|
| 构图有明确空间压力与观看立场 | 25 | 能否一句话说清视线流量？摄影机为什么在那？ |
| 色彩命题清晰、物理来源可信 | 20 | 颜色来自服装/墙体/天气/灯具，而非统一后期？是否又变成蓝灰阴冷？ |
| 真人实景与摄影机质感 | 20 | 有无无来源的发光、烟雾？皮肤材质有重量吗？ |
| 剧情有缺口、非电视剧化 | 20 | 人物在"做什么"而非"处于什么情绪"？打乱顺序会失效吗？ |
| 三联剪辑变化与整体统一 | 10 | 是否只是同一构图换角度？ |
| 原创隔离与参考安全 | 5 | 能一眼联想到某张具体静帧吗？ |

**发布线：抽样均分 ≥82，且无任何一组命中一票否决。**

一票否决项：明显 CG / 游戏宣传图、过度油腻 AI 光效、普通电视剧式内容、直接复刻参考图、三张同机位同动作同构图。

### 8.3 life-force 人像评分要点

| 检查 | 判定 |
|---|---|
| MODE A：人物身份、表情、动作、服装、主要场景关系是否保留 | P |
| MODE A：是否变成了"换脸"或"陌生模特" | 一票否决 |
| MODE B：是否默认生成了外国人/欧美广告模特脸 | 一票否决 |
| MODE B：面部是否油亮反光（额头、鼻梁、脸颊、下巴大片高光） | 一票否决 |
| MODE B：是否变成影楼写真、网红写真、廉价广告摆拍 | 一票否决 |
| 是否出现 AI 娃娃脸、完美白瓷脸、统一大眼小脸模板 | 一票否决 |
| 人物是否"在做一件事"而非摆姿势 | 计分 |
| 质感效果是否 ≤2 种且有场景理由 | 计分（已有 AC-SK-20 做硬校验，此处复核） |

### 8.4 海报评分要点

| 检查 | 判定 |
|---|---|
| 主海报是否 3:4 | 已由 AC-SK-13 硬校验 |
| 片名是否来自剧情冲突而非题材标签 | 计分 |
| 主视觉是否只有一个中心 | 计分 |
| 是否只是三张分镜的缩略图拼贴 | 一票否决 |
| 是否像游戏 key art / 流媒体缩略图 / 廉价短剧封面 | 一票否决 |
| 文字层级是否清晰、是否预留后期校正空间 | 计分 |
| 视觉体系是否给出可扩展比例（3:4 / 16:9 / 1:1 / 9:16） | 计分 |

---

## 9. 性能验收（AC-PF）

| ID | 指标 | 目标 | 判定 |
|---|---|---|---|
| AC-PF-01 | `image_skill_plan` 端到端耗时（含 LLM 分析与自检） | P95 < 25s | S |
| AC-PF-02 | 插件加载增加的 dsh 启动耗时 | < 300ms | S |
| AC-PF-03 | 单次三联出图的额外开销（除去上游 API 时间） | < 2s | S |
| AC-PF-04 | 内存：连续 50 次生图后堆增长 | < 100MB，无单调泄漏 | P |
| AC-PF-05 | 100 次 HMR 配置热替换后，监听器与工具注册数量回到基线 | 完全相等 | P |

AC-PF-04/05 用 mock provider 跑，排除网络噪声。

---

## 10. 发布前检查清单

发布 PR 必须逐条勾选：

- [ ] AC-LC / AC-TL / AC-EV / AC-SK / AC-SEC / AC-AS / AC-CP 全部 P 级用例通过
- [ ] AC-HQ 抽样 10 组，均分 ≥82，无一票否决
- [ ] AC-PF-04 / AC-PF-05 通过
- [ ] 每个包的 README 含职责、`Requires:`、完整配置表、`cordis.yml` 示例、事件/工具清单
- [ ] `LICENSE` 已按设计文档 §8.2 的结论确定（AGPL 路径 vs 接口级移植路径，**二选一，不混**）
- [ ] `THIRD_PARTY_NOTICES.md` 完整
- [ ] Skill 包的出处与作者署名已注明；若走引用安装，安装命令已在文档给出
- [ ] `CONTRIBUTING.md` 含 waterfall `next()` 纪律
- [ ] GitHub 仓库已挂 `dsh-plugin` topic
- [ ] `docs/verified-against.md` 记录了验证过的 dsh commit
- [ ] 已知问题列表（S 级未过项）写入 release notes

---

## 附：用例 ID 速查

| 前缀 | 域 | 条数 |
|---|---|---|
| AC-LC | 生命周期 | 7 |
| AC-TL | 工具契约 | 11 |
| AC-EV | 事件扩展点 | 6 |
| AC-SK | Skill 引擎 | 20 |
| AC-SEC | 安全 | 11 |
| AC-AS | 产物与任务 | 10 |
| AC-CP | 兼容回归 | 7 |
| AC-HQ | 人工质量 | 抽样 |
| AC-PF | 性能 | 5 |
