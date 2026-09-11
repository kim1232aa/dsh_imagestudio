# @dsh-imagestudio/dsh-image-tools

模型可见的 6 个工具：`image_skill_plan` / `image_generate` / `image_edit` / `image_describe` / `image_compose` / `image_assets`。

Requires: `tools`, `imagegen`, `imageSkills`, `imageAssets`, `imageCompose`

## 配置

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| limits.concurrency | number | 否 | 3 | 三联并发上限 |
| limits.perTaskTimeoutMs | number | 否 | 180000 | 单任务超时 |
| limits.maxImagesPerCall | number | 否 | 4 | n 上限；超出抛 ToolArgsError |

## cordis.yml

```yaml
- id: image-tools
  name: ./packages/tools/src/index.ts
  config:
    limits: { concurrency: 3, perTaskTimeoutMs: 180000, maxImagesPerCall: 4 }
```

Tools: image_skill_plan, image_generate, image_edit, image_describe, image_compose, image_assets.
License: MIT
