/** Inlined presets so the studio boots when the skills directory is not shipped (Vercel). */

export const BUNDLED_YAML: Record<string, string> = {
  'cinema-dna-21x9x3': `id: cinema-dna-21x9x3
version: 1.2.2
title: CINEMA DNA 21:9 × 3
source: SKILL.md
modes:
  triptych:
    shots: 3
    aspectRatio: '21:9'
    compose:
      mode: triptych
      direction: vertical
      gapPx: [8, 12]
      ratios: ['1:1:1', '1.2:0.9:0.9', '0.9:1.2:0.9', '0.9:0.9:1.2']
      decorations: none
  poster:
    trigger: explicit
    shots: 1
    aspectRatio: '3:4'
    mustContainInPrompt:
      - 3:4 vertical poster composition
    textStrategy: two-stage
constraints:
  referenceImages:
    usage: analysis-only
    maxDimensions: 1
  negativePatch: no CGI concept art, no game key art, no glossy AI rendering, no HDR, no plastic skin, no excessive particles, no fantasy poster composition, no teal-orange grading, no artificial rim light, no commercial beauty lighting, no television-drama blocking
  bannedPromptTerms:
    - cinematic
    - beautiful
    - poetic
    - emotional
    - mysterious
    - dramatic
    - atmospheric
    - masterpiece
    - epic
  perShotLimits:
    sceneFacts: [2, 3]
    primaryAction: 1
    secondaryClue: 1
    lightSources: 1
    compositionMechanisms: 1
planFields:
  - 不可解决的状态
  - 观众位置
  - 主要构图压力
  - 视线流量
  - 色彩命题
  - 成像基底
  - 三联节奏
scoring:
  threshold: 82
  rubric:
    - { item: 构图有明确空间压力与观看立场, max: 25 }
    - { item: 色彩命题清晰、物理来源可信, max: 20 }
    - { item: 真人实景与摄影机质感, max: 20 }
    - { item: 剧情有缺口、非电视剧化, max: 20 }
    - { item: 三联剪辑变化与整体统一, max: 10 }
    - { item: 原创隔离与参考安全, max: 5 }
  vetoes:
    - 明显 CG / 游戏宣传图
    - 过度油腻 AI 光效
    - 普通电视剧式内容
    - 直接复刻参考图
    - 三张同机位、同动作、同构图
variationRules:
  minChangedDimensions: 4
  dimensions:
    - 景别
    - 机位高度
    - 人物与环境比例
    - 构图机制
    - 信息密度
    - 焦点层
    - 光线方向
    - 人物状态
`,
  'life-force-portrait': `id: life-force-portrait
version: 1.0.0
title: Fantasy life-force portrait
source: SKILL.md
modes:
  mode-a:
    shots: 1
    aspectRatio: '3:4'
    refUsage: image-to-image
  mode-b:
    shots: 1
    aspectRatio: '3:4'
    refUsage: analysis-only
constraints:
  referenceImages:
    usage: analysis-only
    maxDimensions: 1
  negativePatch: no oily skin, no western advertising model face, no studio-glamour posing, no AI doll face, no porcelain skin, no heavy forehead-nose-cheek glare, no cheap idol-drama lighting
  bannedPromptTerms: [cinematic, beautiful, masterpiece, epic, dramatic]
  textureLayers: [caustics, chromatic aberration, swirl bokeh, motion blur]
  maxTextureLayers: 2
  perShotLimits:
    sceneFacts: [2, 3]
    primaryAction: 1
    secondaryClue: 1
    lightSources: 1
    compositionMechanisms: 1
planFields:
  - 人物
  - 事件
  - 镜头
  - 光色
  - 质感
  - 保留人物身份
scoring:
  threshold: 82
  rubric:
    - { item: 人物在做事而非摆拍, max: 25 }
    - { item: 身份与事件保留, max: 25 }
    - { item: 光色有现场来源, max: 25 }
    - { item: 质感层不超过两种, max: 25 }
  vetoes:
    - 换脸或陌生模特
    - 默认欧美广告脸
    - 油亮皮肤
    - 影楼写真
    - AI 娃娃脸
`,
  'photography-simulation': `id: photography-simulation
version: 1.0.0
title: Photography simulation
source: SKILL.md
modes:
  still:
    shots: 1
    aspectRatio: '3:2'
constraints:
  referenceImages:
    usage: analysis-only
    maxDimensions: 1
  negativePatch: no plastic skin, no HDR, no AI doll face, no fake bokeh soup
  bannedPromptTerms: [cinematic, beautiful, masterpiece, epic, atmospheric]
  perShotLimits:
    sceneFacts: [2, 3]
    primaryAction: 1
    lightSources: 1
    compositionMechanisms: 1
planFields:
  - 镜头
  - 光色
  - 成像基底
  - 事件
scoring:
  threshold: 82
  rubric:
    - { item: 相机与胶片约束可执行, max: 40 }
    - { item: 光有现场来源, max: 30 }
    - { item: 人物在做事, max: 30 }
  vetoes:
    - 明显 CG / 游戏宣传图
`,
  'movie-poster': `id: movie-poster
version: 0.9.0
title: Movie poster (superseded)
source: SKILL.md
supersededBy: cinema-dna-21x9x3
modes:
  poster:
    trigger: explicit
    shots: 1
    aspectRatio: '3:4'
    mustContainInPrompt:
      - 3:4 vertical poster composition
    textStrategy: two-stage
constraints:
  referenceImages:
    usage: analysis-only
    maxDimensions: 1
  negativePatch: no CGI concept art, no game key art, no glossy AI rendering
  bannedPromptTerms: [cinematic, beautiful, masterpiece, epic]
  perShotLimits:
    sceneFacts: [2, 3]
    primaryAction: 1
    lightSources: 1
    compositionMechanisms: 1
planFields:
  - 不可解决的状态
  - 色彩命题
  - 成像基底
scoring:
  threshold: 82
  rubric:
    - { item: 海报构图与片名策略, max: 50 }
    - { item: 真人实景, max: 50 }
  vetoes:
    - 明显 CG / 游戏宣传图
`,
  'character-casting': `id: character-casting
version: 1.0.0
title: Character casting
source: SKILL.md
modes:
  sheet:
    shots: 1
    aspectRatio: '3:4'
constraints:
  referenceImages:
    usage: analysis-only
    maxDimensions: 1
  negativePatch: no face swap, no generic stock model, no beauty-lighting mask
  bannedPromptTerms: [beautiful, masterpiece, cinematic]
  perShotLimits:
    sceneFacts: [2, 3]
    primaryAction: 1
    lightSources: 1
    compositionMechanisms: 1
planFields:
  - 人物
  - 事件
  - 镜头
scoring:
  threshold: 82
  rubric:
    - { item: 描述可复用且不覆盖动作, max: 50 }
    - { item: 身份锚点保留, max: 50 }
  vetoes:
    - 换脸或陌生模特
`,
}
