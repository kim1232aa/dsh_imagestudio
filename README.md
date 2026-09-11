# dsh_imagestudio

DeepSeek Harness（dsh / Cordis）插件：**先做导演判断，再出图，再自检。**

代号 `dsh-image-studio` · 版本 v0.1  
把 [Nova Image Studio](https://github.com/tianjiangqiji/nova-image-studio) 的生图工程能力（多模型路由、任务产物、反推、拼接）做成 dsh 插件，再把 FANTASY 系列 Skill 的创作判断收成可强制执行的 `preset.yaml`。

这不是把 Nova 的网页搬进 dsh。不移植无限画布、PWA、Agent 对话。移植的是 dsh 没有的部分：图像 provider 抽象、任务/产物生命周期、反推、拼接合成、Skill 硬约束。

## 一句话架构

```
tools  →  skills + assets + compose
              ↓
         image-core (契约 / 事件 / 注册表)
              ↓
     openai | gemini | nova-bridge | mock
```

模型可见工具只有 6 个：`image_skill_plan` / `image_generate` / `image_edit` / `image_describe` / `image_compose` / `image_assets`。

## 当前里程碑

| 阶段 | 状态 |
|---|---|
| M0 骨架：契约 + mock provider + 落盘 | 已落地，离线单测覆盖 |
| M1 Skill 引擎：cinema-dna / life-force 硬约束 | 已落地（AC-SK-10–20） |
| M2 合成：三联拼接 + 精确标题 | 已落地（PNG 自研编解码） |
| M3 多 provider + edit/describe | 适配器骨架，真实 API 需凭据 |
| M4 跨 skill CharacterSheet | descriptor 注入已通，选角流程预留 |
| M5 UI / guard 完备 / 发布 | 进行中 |

## 仓库布局

```
packages/core            契约、事件总线、注册表、出图流水线
packages/provider-*      openai / gemini / nova-bridge / mock
packages/skills          preset.yaml 加载、编译、静态校验、评分
packages/assets          工作区落盘、路径沙箱、index 重建
packages/compose         三联拼接、文字叠加
packages/tools           六个模型可见工具
packages/guard           请求扫描
skills/                  五个策略包（机器可读 preset + 上游署名）
docs/                    设计文档 / 规范 / 验收 / 验证基线
tests/                   离线 CI（不需要真实 API Key）
```

## 运行测试

需要 Node `^22.19 || >=24`。本仓库测试走 Node 内置 test runner + type stripping，无需先 `pnpm install`：

```bash
node --test --experimental-strip-types tests/*.test.ts
```

## 接到 dsh

`Requires:` `tools`、`imagegen`（由 core + 至少一个 provider 提供）、可选 `llm`（Skill 编译走 LLM 时）。

最小 `cordis.yml` 见 [`examples/cordis.yml`](examples/cordis.yml)。密钥只写环境变量名，值放 `$DSH_HOME/.credentials.yaml`。

```yaml
- id: image-core
  name: ./packages/core/src/index.ts
- id: image-provider-mock
  name: ./packages/provider-mock/src/index.ts
- id: image-tools
  name: ./packages/tools/src/index.ts
```

真实 OpenAI 兼容网关：

```yaml
- id: image-provider-openai
  name: ./packages/provider-openai/src/index.ts
  config:
    providers:
      - id: img2
        protocol: openai-image
        model: gpt-image-2
        baseUrl: https://api.openai.com/v1
        apiKeyEnv: IMAGE_STUDIO_KEY
```

## Skill 包

| id | 上游 | 状态 |
|---|---|---|
| `cinema-dna-21x9x3` | [cinema-dna-21x9x3](https://github.com/dacnay816y62-hub/cinema-dna-21x9x3) | 硬约束已提取 |
| `life-force-portrait` | [fantasy-life-force-portrait-photography](https://github.com/dacnay816y62-hub/fantasy-life-force-portrait-photography) | 硬约束已提取 |
| `photography-simulation` | [fantasy-photography-simulation-github](https://github.com/dacnay816y62-hub/fantasy-photography-simulation-github) | 最小 preset |
| `movie-poster` | [fantasy-movie-poster-skill](https://github.com/dacnay816y62-hub/fantasy-movie-poster-skill) | `supersededBy` cinema-dna poster |
| `character-casting` | [character-casting-studio-skill](https://github.com/dacnay816y62-hub/character-casting-studio-skill) | CharacterSheet 接口 |

安装上游原文（可选，给人读 / LLM 编译用）：

```bash
git clone https://github.com/dacnay816y62-hub/cinema-dna-21x9x3.git skills/cinema-dna-21x9x3-upstream
```

## 许可证

本仓库代码走 **接口级移植**，许可证为 MIT。没有 vendoring Nova 源码。Nova 本身是 AGPL-3.0；若你改为拷贝 Nova 实现而不是走桥接协议，必须改用 AGPL 并更新 `LICENSE`。第三方声明见 `THIRD_PARTY_NOTICES.md`。

## 文档

- [设计文档](docs/design.md)
- [设计规范](docs/spec.md)
- [验收规范](docs/acceptance.md)
- [验证过的 dsh 版本](docs/verified-against.md)
- [贡献指南（含水瀑 next() 纪律）](CONTRIBUTING.md)
