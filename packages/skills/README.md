# @dsh-imagestudio/dsh-image-skills

加载 `skills/*/preset.yaml` + `SKILL.md`，编译 CreativePlan，静态校验 banned terms / 比例锁 / 评分阈值。

Requires: `llm`

## 配置

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| dir | string | 否 | ./skills | skill 包根目录 |
| enabled | string[] | 否 | 全部合法包 | 启用的 skill id |

Events consumed: `image/score` (serial).
Service: `ctx.imageSkills`
License: MIT
