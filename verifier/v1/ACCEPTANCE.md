# dsh_imagestudio 重写验收标准 v1

## A. 工程健康
- A1 `npm install && npm test` 全绿（离线 mock）
- A2 `npm run build`（如有）无错误；TypeScript 编译通过
- A3 插件可被官方 dsh `--patch` 加载（plugin.ts + cordis.patch.yml 有效）

## B. 页面完整性（Nova 核心资产一个不砍）
- B1 生图工作台（文生图/图生图/多模型）
- B2 视频工作台
- B3 无限画布
- B4 UI 设计模式（网页复刻）
- B5 我的素材
- B6 反推提示词
- B7 动图生成（GIF）

## C. dsh 原生集成
- C1 侧栏「生图」入口在 New Session 旁
- C2 对话/会话/联网检索复用 dsh 宿主，插件不自造会话系统
- C3 工具通过 defineTool 注册，可在 dsh 对话中被调用

## D. Skill 自动匹配出图
- D1 5 个 skill（cinema-dna-21x9x3 / life-force-portrait / photography-simulation / movie-poster / character-casting）内置
- D2 聊天内容匹配 skill 时无需切页面即可带出该 skill 的创作判断（策划→评分→出图链路）
- D3 cinema-dna 锁 21:9；低分/veto 不出图；三联走 compose
