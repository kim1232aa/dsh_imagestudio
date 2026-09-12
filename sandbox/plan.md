# Plan: 03 核心可验收切片（plan-loop）

对照：`docs/00-参考来源与项目定位.md`、`docs/01-需求文档.md`、`docs/02-设计规范.md`、`docs/03-验收标准.md`。
旧 `docs/03-验收规范.md`（AC-UI-08 低分不出图）作废，不得写回。

## Objective

把 `dsh_imagestudio` 做成 **03 第零章红线 + 三个核心功能的最小可验收切片**：普通生图任务可取消且像素按比例/清晰度落地；视频协议内置并与图片共用队列；无限画布能连线出图。用 `scripts/preview.mjs` 自启预览 + 截图脚本可重复演示。不做 UI 切图、提示词广场、两周真用。

## End state（可观察）

1. 不选 skill 写提示词能出图；低分「就这样出图」无 disabled、无弹窗。
2. 生成中状态显示已用秒数；点取消后该次 `fetch` abort，mock/registry 不再写新文件。
3. 9 档比例 mock 出图像素比误差 ≤1%；清晰度 1K/2K/4K 像素尺寸可区分。
4. 历史条目回填提示词/比例/清晰度/张数；刷新后仍在（`.dsh-preview` 落盘）。
5. 结果卡「加入画廊」后切画廊看得到；同一 sha256 不加第二份。
6. 文生视频走内置协议（不是插件包），任务进同一队列；上游 URL 原样出现在结果里，不改写域名。
7. 画布：文本节点连到配置节点 = 提示词；点发送出图，结果落在右侧并连线；至少 3 轮串接不出错。
8. 电商：「生成套图预览」只出计划、网络无 generate；确认后才批量。
9. `npm test` 绿；`node --experimental-strip-types scripts/preview.mjs` 起 3080，`GET /imagestudio` 200。

## Non-goals

- UI 设计模式 / GIF 本地编码完整产品 / Agent 联网搜索 / 模板广场
- 真实 OpenAI/Grok/Gemini/Seedream/Qwen 渠道联调（标「未验证」）
- 官方 `dsh web` 全量宿主替换 preview 壳（保留 preview 可演示）
- 把 skill 打分重新做成出图关卡
- 搬 VisioWork / Nova 源码
- 03 第十三章两周真实使用

## Environment

- language: TypeScript ESM
- runtime: Node.js 24.15（也支持 22.19+）
- package_manager: pnpm（声明）/ 本机实测 `npm test`
- test_command: `npm test` = `node --test --experimental-strip-types tests/*.test.ts`
- os: Linux
- preview: `PORT=3080 node --experimental-strip-types scripts/preview.mjs`
- 数据默认：`.dsh-preview/` 与 `~/.dsh/image-studio/` 风格路径，由 `packages/assets` 写入

## Components

| id | name | 说明 |
|---|---|---|
| c-jobs | 任务队列 | 进度秒数、取消 abort、落盘、无幽灵「处理中」 |
| c-raster | 出图像素 | mock 按比例/清晰度出真实宽高 |
| c-history | 历史回填 | 缩略图+参数回填+持久化 |
| c-gallery | 画廊 | 入库、内容哈希去重、页内展示 |
| c-video | 视频平级 | 内置协议、同队列、URL 不改写、页内可播 mock |
| c-canvas | 无限画布 | 文本/图片/配置节点 + 连线 + 出图落点 |
| c-ecom | 电商预览 | 先计划后确认 |
| c-accept | 预览验收 | 单测 + preview 截图脚本 |

## Task table（order）

| id | title | serves | depends_on | est LOC |
|---|---|---|---|---|
| T1 | 任务队列：进度/取消/落盘 | c-jobs | — | 280 |
| T2 | mock 按 9 档比例与 4 档清晰度出像素 | c-raster | — | 160 |
| T3 | 历史持久化与全参数回填 | c-history | T1 | 180 |
| T4 | 画廊持久化与 sha256 去重 | c-gallery | T1 | 200 |
| T5 | 内置视频协议 + 同队列 mock | c-video | T1 | 320 |
| T6 | 画布节点连线出图 | c-canvas | T1, T2 | 380 |
| T7 | 电商套图：先计划后确认 | c-ecom | T1 | 220 |
| T8 | 验收网：单测 + preview 截图 | c-accept | T1–T7 | 200 |

## How to execute

下游执行循环按 `sandbox/tasks.json` 的 `order` 逐个做。每任务先补 `tests/` 断言再改实现。不要回头把 `selfCheck.passed===false` 接回 generate 短路。

## Risks / open questions

- preview 壳 vs 官方 dsh web：本切片以 `scripts/preview.mjs` + MemoryWebServer 为可演示宿主；官方 chrome 注入已有 `entry.js`，不在本切片重做。
- 视频无真实上游：用 mock 返回 `https://example.invalid/mock.mp4` 证明「URL 不改写」。
- 画布 100 节点 30fps：本切片做到 ≥12 节点流畅；100 节点性能列为 open question，不阻塞 T6 功能验收。


## Revision notes

- T1 includes `packages/host/src/boot.ts` `failRunningOnBoot()`.
- T3 mock video is an in-process BMFF stub, not ffmpeg / checked-in mp4.
- T4 canvas logic stays in `packages/ui/src/canvas.ts`.
