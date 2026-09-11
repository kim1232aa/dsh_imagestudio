---
name: cinema-dna-21x9x3
description: 将人物、空间或一句故事转译为真人实景电影感的 21:9 三联镜头；仅在用户明确要求时追加 3:4 海报。参考图只做抽象分析。
---

# CINEMA DNA · dsh wrapper

人读规则以上游仓库为准，本目录的 `preset.yaml` 是插件强制执行的机器可读约束。

- 上游：https://github.com/dacnay816y62-hub/cinema-dna-21x9x3
- 硬约束：三联锁定 21:9；海报锁定 3:4 且 prompt 含 `3:4 vertical poster composition`；参考图 `analysis-only`；评分低于 82 不出图；一票否决 5 项；三张至少变化 4 个维度。
- 不要让图像模型在同一画布里画三联。拼版走 `image_compose`。
- 海报文字两段式：底图交给模型，标题交给 `image_compose` text-overlay。
