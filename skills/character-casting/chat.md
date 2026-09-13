# Character Casting Studio —— 聊天创作指令

设计「被创造出来的人」：真人质感的角色图、选角（casting）图、模特卡、人物设定图。核心信念：**character accuracy > beauty，realism > perfection**——角色可信比漂亮重要。

## 一、何时使用

命中场景：「设计一个 40 岁东北出租车司机角色」、原创人物设定（如「短发女律师，清冷气质」）、电影选角图/一组不同角色、模特 casting 卡、给小说主角做人物设定图。

多视图模式（三视图/白底角色图/character turnaround）**只在用户明确说**「做三视图、白底角色图、角色拆解」等词时触发，默认只出单张人物图（肖像或全身）。

与兄弟 skill 的边界：

- 「把真人照片变好看 / 升级」→ life-force-portrait（MODE A）。
- 「画动漫/游戏角色」→ 本 skill 禁止 anime/game concept art，先向用户说明真人质感定位，用户坚持则婉拒或转普通生图。
- 「电影海报上的人物成品海报」→ movie-poster（可先由本 skill 出人物，再串联海报）。

## 二、创作工作流

只使用宿主已注册的工具，不要自己编造工具：

1. 身份矩阵先行：写下角色的年龄、地域、职业、面部结构、发型、皮肤质感、服装、体态、记忆点（2-3 个），作为不可动摇的身份锚点。
2. 调 `istudio_skill_plan`，`skillId: "character-casting"`；brief 写清：身份矩阵要点、场景/事件、镜头分工、禁忌。
3. 检查 plan 的 `selfCheck`（score/veto/passed），通过才生成。
4. 调 `istudio_generate` 传 `planId`。批量多角色时，相邻角色至少改 5 个维度，提示词写明 "not sisters, not twins"，杜绝孪生脸。
5. 三视图模式：以已批准的单人图为 source of truth，白底、无文字标签；聊天场景素材不足时明确标注为 exploratory draft（探索稿），不冒充生产级输出。

## 三、硬约束摘要

- 默认单张人物图（3:4），肖像或全身；不自动出三视图。
- 选角镜头分工：全身 50-70mm f/4-5.6，面部特写 85-105mm f/1.8-2.4。
- **NO WAX SKIN 硬规则**：禁止蜡像/塑料/油光/瓷娃娃皮肤；负面块必须包含 no waxy skin, no oily forehead, no glossy cheeks, no shiny nose bridge, no porcelain skin, no beauty-filter effect, no over-retouching, no mannequin face。禁用 glowing/dewy/luminous/glass skin 等词；禁止环境色（黄/橙/琥珀）污染面部肤色，白平衡保持中性。
- 原创隔离：参考距离 Level 2——替换 ≥3 个面部字段 + ≥1 个身份锚点 + 新增 2-3 个记忆点；禁止名人脸（no celebrity likeness）。
- Source Material Gate：生产级输出需 ≥3 类互补素材（脸/服装姿态/世界材质光）；聊天场景缺素材时降级为 exploratory draft 并告知用户。
- 质量门约 20 条 checklist：原创性、批次非孪生、皮肤半哑光、无文字面板等；换脸或陌生模特直接否决。

## 四、被 PLAN_REJECTED 拦截时

1. 不要重试相同请求，不要擅自 force。
2. 向用户解释失败项（如「身份锚点不足」「蜡像皮肤风险」）与得分。
3. 询问用户：补全身份矩阵/换参考策略后重新 plan，还是明确接受风险用 `force: true` 强制出图。
