import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { studioPage } from '../packages/ui/src/studio-page.ts'
import { assertInsideWorkspace } from '../packages/assets/src/paths.ts'
import { PathEscapeError } from '../packages/core/src/errors.ts'

describe('image-ui workbench', () => {
  it('ships Nova-Studio-parity shell + all dsh capabilities', () => {
    const html = studioPage({ embed: true })
    // Nova 外壳：logo / 亮色令牌 / 暗色开关 / 侧栏控件 / 队列药丸
    assert.match(html, /Nova Studio/)
    assert.match(html, /批量 API 图像生成器/)
    assert.match(html, /--primary:#0284C7/)
    assert.match(html, /data-theme="dark"/)
    assert.match(html, /随机图片/)
    assert.match(html, /退出宽屏/)
    assert.match(html, /并发/)
    assert.match(html, /排队/)
    // Nova 九页（Agent 回对话 + 八个工作台页）
    for (const label of ['Agent', '生图工作台', '视频工作台', '无限画布', 'UI设计模式', '我的素材', '反推提示词', '动图生成', '提示词广场']) {
      assert.match(html, new RegExp(label))
    }
    // 生图工作台输入卡 + 任务流控件对等
    for (const s of ['参考图（可选）', '素材库', '描述你想要生成的图像', '输出分辨率', '图像比例', '并行', '温度', '负面词', '快速提示词', '导入提示词素材', '存为提示词素材', '优化提示词', '清空', '生图任务', '同时显示', '文生图', '图生图', '清空记录']) {
      assert.match(html, new RegExp(s))
    }
    // dsh 能力保留：PLAN_REJECTED 闸门 / skill 工作流 / 灵感回填
    assert.match(html, /仍然出图/)
    assert.match(html, /就这样出图/)
    assert.match(html, /回对话/)
    assert.match(html, /href="\/"/)
    assert.match(html, /想方案/)
    assert.match(html, /data-brief/)
    assert.match(html, /cinema-dna-21x9x3/)
    assert.match(html, /life-force-portrait/)
    assert.match(html, /photography-simulation/)
    assert.match(html, /movie-poster/)
    assert.match(html, /character-casting/)
    // gallery 页签已删除，能力由「我的素材」承接
    assert.doesNotMatch(html, /data-page="gallery"/)
    assert.doesNotMatch(html, /低于 82 分不出图|data-dsh-imagegen-session-tabs/)
  })

  it('sidebar nav is the frozen Nova nine in order', () => {
    const html = studioPage({})
    const nav = html.match(/<nav class="snav"[^>]*>([\s\S]*?)<\/nav>/)
    assert.ok(nav, 'sidebar nav missing')
    const pages = [...nav[1].matchAll(/data-page="([^"]+)"/g)].map((m) => m[1])
    assert.deepEqual(pages, ['gen', 'video', 'canvas', 'uidesign', 'assets', 'reverse', 'gif', 'tpl'])
    const home = nav[1].match(/<a class="snav-item" id="backHome" href="\/"[^>]*>/)
    assert.ok(home, 'backHome agent link missing')
  })

  it('gen workbench has the Nova input card control set', () => {
    const html = studioPage({})
    for (const id of ['refDrop', 'refFile', 'refThumbs', 'refCount', 'refLibBtn', 'brief', 'pbModel', 'pbAuto', 'pbRes', 'pbRatio', 'pbN', 'pbTemp', 'ibQuick', 'ibImport', 'ibSave', 'ibOptimize', 'ibClear', 'go', 'cancelGo', 'hist', 'histSearch', 'histClear', 'histFilters', 'histStats', 'negative']) {
      assert.match(html, new RegExp('id="' + id + '"'), 'missing #' + id)
    }
    for (const id of ['popModel', 'popRes', 'popRatio', 'popN', 'popTemp', 'ratios', 'clarity', 'counts']) {
      assert.match(html, new RegExp('id="' + id + '"'), 'missing #' + id)
    }
    // 上限对齐上游 v3.3.0：参考图 16 张、排队最大 200
    assert.match(html, /0 \/ 16 张/)
    assert.match(html, /最大 <b id="qMax">200<\/b>/)
    // 任务卡为 Nova 横向行布局：左缩略图 / 中引用式提示词 / 右 2×2 图标
    assert.match(html, /\.jobr-btns\{[^}]*grid-template-columns:repeat\(2,32px\)/)
    assert.match(html, /共 '\+items\.length\+' 条 · 完成 /)
  })

  it('defaults cinema-dna to 21:9 but user can change ratio', () => {
    const html = studioPage({})
    assert.match(html, /state\.ratio\s*=\s*'21:9'/)
    assert.match(html, /cinema-dna-21x9x3/)
    assert.match(html, /改得动/)
  })

  it('entry script adds 技能台 and yields 生图 to dsh-imagegen when present', () => {
    const js = readFileSync(new URL('../packages/ui/src/entry.js', import.meta.url), 'utf8')
    assert.match(js, /技能台/)
    assert.match(js, /\/imagestudio/)
    assert.match(js, /data-dsh-imagegen-session-tabs/)
    assert.doesNotMatch(js, /textContent = ["']生图["']/)
  })

  it('image-ui also uses official webserver/index-inject', () => {
    const src = readFileSync(new URL('../packages/ui/src/index.ts', import.meta.url), 'utf8')
    assert.match(src, /webserver\/index-inject/)
    assert.match(src, /script-src/)
    assert.match(src, /\/imagestudio\/entry\.js/)
  })

  it('file API rejects path escape as PathEscapeError (AC-UI-09)', () => {
    assert.throws(() => assertInsideWorkspace('/tmp/ws', '../etc/passwd'), PathEscapeError)
  })
})
