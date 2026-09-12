# dsh_imagestudio

DeepSeek Harness（dsh / Cordis）插件：**先做导演判断，再出图，再自检。**

代号 `dsh-image-studio` · 版本 v0.2  
把 [Nova Image Studio](https://github.com/tianjiangqiji/nova-image-studio) 的生图工程能力（多模型路由、任务产物、反推、拼接）做成 dsh 插件，再把 FANTASY 系列 Skill 的创作判断收成可强制执行的 `preset.yaml`。

独立入口在官方 DSH 壳里：侧栏「新会话 / New Session」旁的「生图」。工作台是自写的 Nova 式文生图/图生图/策划/反推/三联，加上 5 个 FANTASY skill，不是搬 VisioWork 或 Nova 源码，也不做无限画布/PWA。

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

Settings → Plugins 应出现 `image-studio`（ACTIVE）。Agent 可见 6 个工具：
`image_skill_plan` / `image_generate` / `image_edit` / `image_describe` / `image_compose` / `image_assets`。

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


## 独立入口（生图工作台）

安装并重启 `dsh web` 后：

1. 官方侧栏「新会话」旁边会出现 **生图**
2. 点「生图」打开 Image Studio 工作台（同一 DSH 窗口，不是外站）
3. 也可直接打开 `http://127.0.0.1:3080/imagestudio`

工作台模式：文生图 / 图生图 / Skill 策划 / 反推 / 三联合成 / 产物。  
Skill：`cinema-dna-21x9x3` `life-force-portrait` `photography-simulation` `movie-poster` `character-casting`。

「插件配置」页不会自动出表单——那是官方 settings card 槽，不是入口。入口是侧栏「生图」。

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

需要 Node `^22.19 || >=24`。离线 CI 走 mock provider，不需要 API Key：

```bash
node --test --experimental-strip-types tests/*.test.ts
```

离线 host（仅单测）在 `packages/host`：stubs → core → compose → guard → assets → skills → mock → tools。

## Skill 包

| id | 上游 | 状态 |
|---|---|---|
| cinema-dna-21x9x3 | FANTASY cinema-dna | 建议 21:9 三联、本地 8–12px 黑缝；分数只展示，不拦出图 |
| life-force-portrait | FANTASY life-force | MODE A 保留身份，质感层 ≤ 2 |
| photography-simulation | FANTASY photo sim | 相机/胶片作约束 |
| movie-poster | FANTASY poster | `supersededBy: cinema-dna-21x9x3` |
| character-casting | FANTASY casting | CharacterSheet 注入动作句 |

## License

MIT. Interface-level adapters only — Nova AGPL source is not vendored. See `THIRD_PARTY_NOTICES.md`.
