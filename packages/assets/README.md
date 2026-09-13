# @dsh-imagestudio/dsh-image-assets

产物落盘、路径沙箱、index.json 重建。根目录 `<workspace>/.dsh/image-studio/`。

Requires: `jobs`

## 配置

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| workspaceRoot | string | 否 | . | 工作区根 |
| keepLastTasks | number | 否 | 0 | 保留最近 N 个任务，0 = 永不自动删除 |
| outputDir | string | 否 | .dsh/image-studio | 相对工作区 |

Service: `ctx.imageAssets`
License: MIT
