# 验收结论 · dsh_imagestudio v0.2.1

日期：2026-09-12
环境：本机 `dsh@0.1.5-rc.1` desktop profile + `@dickpy/dsh-imagegen@1.5.12` 并存
口径：`docs/03-验收规范.md` v0.2.1（技能台，不抢「生图」）

## 自动证据

| 命令 | 结果 |
|---|---|
| `npm test` | **118/118 PASS** |
| `node --experimental-strip-types scripts/accept.mjs` | **14/14 PASS** |
| `dsh --profile desktop --dump-config` | 同时有 `id: imagegen` 与 `id: image-studio` |

## P 级勾选

| ID | 结论 | 证据 |
|---|---|---|
| AC-UI-01 | **待你点一次** | dump 已挂 bundle；侧栏「技能台」需重启 DSH Desktop 后目视 |
| AC-UI-02 | 自动过（路由） | `GET /imagestudio` 200，同窗路径 |
| AC-UI-03 | 自动过 | HTML 含「回对话」→ `/` |
| AC-UI-04 | 自动过 | accept + ui-routes |
| AC-UI-05 | 自动过 | 五个 skill id |
| AC-UI-06 | 自动过 | mock ≥1 张 |
| AC-UI-07 | 自动过 | cinema-dna 默认 21:9 |
| AC-UI-08 | 自动过 | veto 仍可出图 |
| AC-UI-09 | 自动过 | compose 不增加 mock.calls |
| AC-UI-10 | 自动过 | assets 索引 |
| AC-UI-11 | 自动过（宿主等价） | uninstall 后 404 |
| AC-UI-12 | 文档过 | dump-config ≠ 入口 |
| AC-UI-13 | 自动过 | 无 generate_image 四件套 |
| AC-UI-14 | 自动过 | 不抢 favicon / `/api/dsh-imagegen` |
| AC-LC-01…05 | 自动过 | dump + boot + dispose |
| AC-TL / AC-EV / AC-SK / AC-AS / AC-SEC | 自动过 | `tests/*.test.ts` |

## 不能签字

- AC-UI-01 侧栏按钮：重启 Desktop 后你点一次
- 真密钥出片未验
- mock 视频无 ffmpeg 不是成片
- 画布/电商/视频不是本期 P

## 你要做的

1. 重启 DSH Desktop
2. 原「生图」还在
3. 下面多「技能台」，点开本窗口 Image Studio
4. 日常出图仍用 `generate_image`
