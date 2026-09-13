/**
 * UI 设计模式（7.6）：上传设计稿 → AI 提议切片（确认框勾选后才入库）→
 * 切片编辑器（缩放/平移/拖框/多选/8 向缩放/单角圆角/吸附/右键菜单/
 * 50+ 步撤销重做）→ 三种视图（原图带框 / 抠图结果 / 只看切片）。
 *
 * 以字符串形式注入 studio-page 的主 <script>，与其共享作用域
 * （$、api、fileSrc、setStatus、escapeHtml、saveLS/loadLS 均来自主页面）。
 * 注意：身处 TS 模板字符串，本文件内的 JS 不能出现反引号、`${` 和
 * 正则反斜杠（会被模板吞掉）。
 */

export const uiDesignHtml = `
<section class="page" data-page="uidesign">
  <div style="display:flex;flex-direction:column;flex:1;min-height:0">
    <div class="row" style="padding:8px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap;gap:6px">
      <input type="file" id="udFile" accept="image/*" style="display:none"/>
      <button class="ghost" id="udUpload">上传设计稿</button>
      <button class="ghost" id="udAi">AI 提议切片</button>
      <button class="ghost" data-udview="orig" id="udViewOrig">原图带框</button>
      <button class="ghost" data-udview="cut" id="udViewCut">抠图结果</button>
      <button class="ghost" data-udview="grid" id="udViewGrid">只看切片</button>
      <button class="ghost" id="udUndo">撤销</button>
      <button class="ghost" id="udRedo">重做</button>
      <button class="ghost" id="udExport">导出切片包</button>
      <button class="ghost" id="udExportFull">完整设计包</button>
      <button class="ghost" id="udImport">导入切片包</button>
      <button class="ghost" id="udWeb">网页复刻</button>
      <input type="file" id="udZipFile" accept=".zip,application/zip" style="display:none"/>
      <span class="note" id="udInfo">滚轮缩放 · 左键拖空白建框 · 空格+拖动平移 · 右键框出菜单</span>
    </div>
    <div id="udStage" style="flex:1;position:relative;overflow:hidden;background:#121110;min-height:300px">
      <div id="udWorld" style="position:absolute;left:0;top:0;transform-origin:0 0"></div>
      <div class="note" id="udEmpty" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">先上传一张设计稿（App 截图 / 网页设计图）</div>
    </div>
  </div>
</section>
<div class="lb" id="udConfirm">
  <div class="card" style="max-width:520px;width:92vw;max-height:80vh;overflow:auto;text-align:left;padding:14px">
    <h3 style="margin:0 0 6px">AI 提议的切片</h3>
    <p class="note">勾选确认后才存入工作区，不勾不会存。</p>
    <div id="udConfirmList"></div>
    <div class="row" style="gap:6px;margin-top:10px">
      <button id="udConfirmOk">存入选中的切片</button>
      <button class="ghost" id="udConfirmNo">取消</button>
    </div>
  </div>
</div>
<div class="lb" id="udFill">
  <div class="card" style="max-width:760px;width:94vw;max-height:86vh;overflow:auto;text-align:left;padding:14px">
    <h3 style="margin:0 0 6px">背景填充 · 两版对比</h3>
    <p class="note">左：本地合成（算法抠透明 + 纯色底，不耗上游）；右：AI 原图（编辑模型按提示词重填）。各选各的。</p>
    <div class="row" style="gap:8px;margin-bottom:10px;align-items:center">
      <span class="note">底色</span>
      <input type="color" id="udFillColor" value="#ffffff" style="width:48px;height:30px;padding:0;border:1px solid var(--line);background:none"/>
      <input id="udFillPrompt" placeholder="AI 版背景提示词（如：浅色木纹桌面）" style="flex:1;min-width:200px"/>
      <button id="udFillGo">生成两版</button>
      <button class="ghost" id="udFillClose">关闭</button>
    </div>
    <div class="row" id="udFillResult" style="gap:12px;align-items:flex-start"></div>
  </div>
</div>
<div class="lb" id="udWebPanel">
  <div class="card" style="max-width:1180px;width:96vw;height:88vh;text-align:left;padding:14px;display:flex;flex-direction:column">
    <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:nowrap">
      <h3 style="margin:0">网页复刻</h3>
      <span class="note" id="udWebUsage"></span>
      <button class="ghost" id="udWebClose">关闭</button>
    </div>
    <div class="row" id="udWebStartRow" style="gap:6px;margin:8px 0">
      <input id="udWebBrief" placeholder="页面要求（可选，如：深色主题、响应式）" style="flex:1"/>
      <button id="udWebGen">生成网页（三文件）</button>
    </div>
    <div id="udWebMain" class="row" style="display:none;flex:1;min-height:0;gap:10px;flex-wrap:nowrap">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column">
        <div class="row" style="gap:4px;flex-wrap:nowrap">
          <button class="ghost" data-wfile="index.html">index.html</button>
          <button class="ghost" data-wfile="style.css">style.css</button>
          <button class="ghost" data-wfile="script.js">script.js</button>
          <span class="note" id="udWebChanged"></span>
        </div>
        <textarea id="udWebCode" readonly style="flex:1;font:12px/1.5 ui-monospace,monospace;min-height:200px;margin-top:6px"></textarea>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:nowrap">
          <input id="udWebEditIn" placeholder="按行修改指令（如：把标题颜色改成橙红）——只改局部，不整篇重写" style="flex:1"/>
          <button id="udWebEditGo">按行修改</button>
        </div>
      </div>
      <iframe id="udWebFrame" title="preview" style="flex:1;min-width:0;border:1px solid var(--line);border-radius:10px;background:#fff"></iframe>
    </div>
  </div>
</div>
<div id="udCtx" style="position:fixed;display:none;z-index:90;background:#1e1c18;border:1px solid var(--line);border-radius:10px;padding:4px;min-width:140px"></div>
<div id="udRadius" style="position:fixed;display:none;z-index:91;background:#1e1c18;border:1px solid var(--line);border-radius:10px;padding:10px">
  <div class="note" style="margin-bottom:6px">四角圆角（% 短边）</div>
  <div class="row" style="gap:4px">
    <input data-udr="tl" type="number" min="0" max="50" style="width:56px" title="左上"/>
    <input data-udr="tr" type="number" min="0" max="50" style="width:56px" title="右上"/>
    <input data-udr="br" type="number" min="0" max="50" style="width:56px" title="右下"/>
    <input data-udr="bl" type="number" min="0" max="50" style="width:56px" title="左下"/>
  </div>
</div>
`

export const uiDesignJs = `
// ---- UI 设计模式 7.6：切片编辑器 ----
const ud = { path:'', natW:0, natH:0, baseW:800, slices:[], view:'orig', zoom:1, panX:20, panY:20, sel:[], undo:[], redo:[], space:false };
let udDrag = null;
let udFillSliceId = null;
try { Object.assign(ud, loadLS('uidesign', {})); } catch (e) { console.warn('[uidesign] load failed:', e); }
ud.sel = []; ud.undo = []; ud.redo = [];
function udSave(){ const s = { path:ud.path, natW:ud.natW, natH:ud.natH, baseW:ud.baseW, slices:ud.slices, view:ud.view, zoom:ud.zoom, panX:ud.panX, panY:ud.panY }; saveLS('uidesign', s); }
function udSnap(){ ud.undo.push(JSON.stringify(ud.slices)); if (ud.undo.length > 100) ud.undo.shift(); ud.redo = []; }
// 拖动类操作专用：动作开始时先记下 before，结束时确有变化才入栈，
// 避免「点了没动」也污染撤销栈。
function udPushSnap(json){ ud.undo.push(json); if (ud.undo.length > 100) ud.undo.shift(); ud.redo = []; }
function udUndoFn(){ if (!ud.undo.length) { setStatus('没有可撤销的'); return; } ud.redo.push(JSON.stringify(ud.slices)); ud.slices = JSON.parse(ud.undo.pop()); ud.sel = []; udSave(); udRender(); setStatus('已撤销 · 还可撤 ' + ud.undo.length + ' 步'); }
function udRedoFn(){ if (!ud.redo.length) { setStatus('没有可重做的'); return; } ud.undo.push(JSON.stringify(ud.slices)); ud.slices = JSON.parse(ud.redo.pop()); ud.sel = []; udSave(); udRender(); setStatus('已重做'); }
function udImgW(){ return ud.baseW; }
function udImgH(){ return ud.natW ? ud.baseW * ud.natH / ud.natW : ud.baseW * 0.6; }
function udFind(id){ return ud.slices.find(s => s.id === id); }
function udRadiusCss(s){ const r = s.radius || { tl:0, tr:0, br:0, bl:0 }; const m = Math.min(s.w, s.h) * 100; return (r.tl * m) + 'px ' + (r.tr * m) + 'px ' + (r.br * m) + 'px ' + (r.bl * m) + 'px'; }
function udBoxDiv(s){
  const d = document.createElement('div');
  d.className = 'udbox';
  d.dataset.id = s.id;
  const selected = ud.sel.indexOf(s.id) >= 0;
  d.style.cssText = 'position:absolute;left:' + (s.x * udImgW()) + 'px;top:' + (s.y * udImgH()) + 'px;width:' + (s.w * udImgW()) + 'px;height:' + (s.h * udImgH()) + 'px;'
    + 'border:2px ' + (selected ? 'solid var(--accent)' : 'dashed rgba(226,96,63,.75)') + ';background:rgba(226,96,63,' + (selected ? '.14' : '.06') + ');'
    + 'border-radius:' + udRadiusCss(s) + ';cursor:move;z-index:' + (selected ? 5 : 3);
  const lab = document.createElement('span');
  lab.className = 'note';
  lab.style.cssText = 'position:absolute;left:0;top:-20px;font-size:11px;white-space:nowrap;color:var(--accent);pointer-events:none';
  lab.textContent = s.label || s.id;
  d.append(lab);
  if (selected) {
    const dirs = ['nw','n','ne','e','se','s','sw','w'];
    dirs.forEach(dir => {
      const h = document.createElement('i');
      h.dataset.udh = dir;
      h.style.cssText = 'position:absolute;width:9px;height:9px;background:var(--accent);border:1px solid #fff;z-index:6;'
        + (dir.indexOf('n') >= 0 ? 'top:-6px;' : dir.indexOf('s') >= 0 ? 'bottom:-6px;' : 'top:calc(50% - 4px);')
        + (dir.indexOf('w') >= 0 ? 'left:-6px;' : dir.indexOf('e') >= 0 ? 'right:-6px;' : 'left:calc(50% - 4px);')
        + 'cursor:' + ((dir === 'nw' || dir === 'se') ? 'nwse-resize' : (dir === 'ne' || dir === 'sw') ? 'nesw-resize' : (dir === 'n' || dir === 's') ? 'ns-resize' : 'ew-resize');
      d.append(h);
    });
  }
  return d;
}
function udRender(){
  const world = document.querySelector('#udWorld');
  if (!world) return;
  world.innerHTML = '';
  document.querySelector('#udEmpty').style.display = ud.path ? 'none' : 'flex';
  if (ud.path) {
    if (ud.view !== 'grid') {
      if (ud.view === 'orig') {
        const im = document.createElement('img');
        im.src = fileSrc({ path: ud.path });
        im.style.cssText = 'display:block;width:' + udImgW() + 'px;pointer-events:none';
        im.draggable = false;
        world.append(im);
      } else {
        const bg = document.createElement('div');
        bg.style.cssText = 'width:' + udImgW() + 'px;height:' + udImgH() + 'px;background:repeating-conic-gradient(#26241f 0% 25%, #1a1815 0% 50%) 0 0 / 24px 24px';
        world.append(bg);
      }
      ud.slices.forEach(s => {
        if (ud.view === 'orig') {
          world.append(udBoxDiv(s));
        } else {
          const c = document.createElement('div');
          c.className = 'udbox';
          c.dataset.id = s.id;
          c.style.cssText = 'position:absolute;left:' + (s.x * udImgW()) + 'px;top:' + (s.y * udImgH()) + 'px;width:' + (s.w * udImgW()) + 'px;height:' + (s.h * udImgH()) + 'px;'
            + 'border-radius:' + udRadiusCss(s) + ';border:2px solid rgba(226,96,63,.5);cursor:move;z-index:3';
          const vpath = s.variants && s.lastVariant ? s.variants[s.lastVariant] : null;
          if (vpath) {
            // 抠图/重绘结果视图：优先展示处理产物（含透明通道/SVG）
            const vi = document.createElement('img');
            vi.src = fileSrc({ path: vpath });
            vi.style.cssText = 'width:100%;height:100%;object-fit:fill;pointer-events:none';
            vi.draggable = false;
            c.append(vi);
          } else {
            c.style.backgroundImage = 'url(' + fileSrc({ path: ud.path }) + ')';
            c.style.backgroundSize = udImgW() + 'px ' + udImgH() + 'px';
            c.style.backgroundPosition = (-s.x * udImgW()) + 'px ' + (-s.y * udImgH()) + 'px';
          }
          world.append(c);
        }
      });
    } else {
      const grid = document.createElement('div');
      grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;padding:4px;max-width:' + (udImgW() + 20) + 'px';
      ud.slices.forEach(s => {
        const card = document.createElement('div');
        card.className = 'udbox';
        card.dataset.id = s.id;
        const cw = Math.max(60, s.w * udImgW() / 2), ch = Math.max(40, s.h * udImgH() / 2);
        card.style.cssText = 'width:' + cw + 'px;height:' + ch + 'px;background-image:url(' + fileSrc({ path: ud.path }) + ');'
          + 'background-size:' + udImgW() / 2 + 'px ' + udImgH() / 2 + 'px;background-position:' + (-s.x * udImgW() / 2) + 'px ' + (-s.y * udImgH() / 2) + 'px;'
          + 'border-radius:' + udRadiusCss(s) + ';border:1px solid var(--line);position:relative;cursor:move';
        const lab = document.createElement('span');
        lab.className = 'note';
        lab.style.cssText = 'position:absolute;left:2px;bottom:2px;font-size:11px;background:rgba(0,0,0,.6);padding:0 4px;border-radius:4px';
        lab.textContent = s.label || s.id;
        card.append(lab);
        grid.append(card);
      });
      world.append(grid);
    }
  }
  udApplyView();
}
function udApplyView(){
  const world = document.querySelector('#udWorld');
  if (world) world.style.transform = 'translate(' + ud.panX + 'px,' + ud.panY + 'px) scale(' + ud.zoom + ')';
  ['Orig','Cut','Grid'].forEach(v => {
    const b = document.querySelector('#udView' + v);
    if (b) b.style.borderColor = (ud.view === v.toLowerCase()) ? 'var(--accent)' : '';
  });
  const info = document.querySelector('#udInfo');
  if (info) info.textContent = '缩放 ' + Math.round(ud.zoom * 100) + '% · 切片 ' + ud.slices.length + ' 个 · 撤销栈 ' + ud.undo.length + ' 步';
}
// ---- 素材处理：算法类可批量；AI 类全局串行（连点多次进队列）----
let udAiQueue = [];
let udAiRunning = false;
function udProcess(mode, ids) {
  if (!ud.path) { setStatus('先上传设计稿'); return; }
  if (!ids.length) { setStatus('先选中至少一个切片'); return; }
  if (mode.indexOf('ai-') === 0) {
    udAiQueue.push({ mode, ids: ids.slice() });
    setStatus('AI 处理已排队 · 队列 ' + udAiQueue.length + ' 个 · AI 类一次只跑一个');
    udAiNext();
    return;
  }
  const beforeBatch = JSON.stringify(ud.slices);
  (async () => {
    let doneCount = 0, failCount = 0, lastFail = '';
    for (const id of ids) {
      const s = udFind(id);
      if (!s) continue;
      setStatus('算法处理中 ' + (doneCount + failCount + 1) + '/' + ids.length + '…');
      const out = await api('/ui-process', { path: ud.path, mode, slice: s });
      if (out.error) { failCount++; lastFail = out.error; setStatus('处理失败：' + out.error); continue; }
      s.variants = s.variants || {};
      s.variants[mode] = out.path;
      s.lastVariant = mode;
      doneCount++;
    }
    if (doneCount) udPushSnap(beforeBatch);
    udSave(); udRender();
    if (failCount) setStatus('算法处理结束：成功 ' + doneCount + ' · 失败 ' + failCount + ' · 最后原因：' + lastFail);
    else setStatus('算法处理完成 ' + doneCount + '/' + ids.length + ' · 整批可一键撤销');
  })();
}
function udAiNext() {
  if (udAiRunning) return;
  const job = udAiQueue.shift();
  if (!job) return;
  udAiRunning = true;
  const before = JSON.stringify(ud.slices);
  (async () => {
    let okCount = 0, failCount = 0, lastFail = '';
    try {
      for (let i = 0; i < job.ids.length; i++) {
        const s = udFind(job.ids[i]);
        if (!s) continue;
        setStatus('AI 处理中（' + job.mode + '）' + (i + 1) + '/' + job.ids.length + ' · 队列剩 ' + udAiQueue.length);
        const out = await api('/ui-process', { path: ud.path, mode: job.mode, slice: s });
        if (out.error) { failCount++; lastFail = out.error; setStatus('AI 处理失败：' + out.error); continue; }
        s.variants = s.variants || {};
        s.variants[job.mode] = out.path;
        s.lastVariant = job.mode;
        okCount++;
        if (out.note) setStatus(out.note);
      }
      if (okCount) udPushSnap(before);
      udSave(); udRender();
      if (failCount) setStatus('AI 处理结束：成功 ' + okCount + ' · 失败 ' + failCount + ' · 最后原因：' + lastFail);
      else setStatus('AI 处理完成 ' + okCount + '/' + job.ids.length + ' · 可撤销');
    } finally {
      udAiRunning = false;
      udAiNext();
    }
  })();
}

// 吸附：把 v 吸附到目标线集合（阈值 th，世界坐标）
function udSnapVal(v, targets, th){
  let best = null, bd = th;
  targets.forEach(t => { const d = Math.abs(v - t); if (d < bd) { bd = d; best = t; } });
  return best === null ? v : best;
}
function udEdgeTargets(exceptId){
  const xs = [0, 1], ys = [0, 1];
  ud.slices.forEach(s => { if (s.id === exceptId) return; xs.push(s.x, s.x + s.w); ys.push(s.y, s.y + s.h); });
  return { xs, ys };
}
function udStagePoint(ev){
  const r = document.querySelector('#udStage').getBoundingClientRect();
  return { x: (ev.clientX - r.left - ud.panX) / ud.zoom, y: (ev.clientY - r.top - ud.panY) / ud.zoom };
}
function udHideCtx(){ const m = document.querySelector('#udCtx'); if (m) m.style.display = 'none'; const r2 = document.querySelector('#udRadius'); if (r2) r2.style.display = 'none'; }
function udBind(){
  const stage = document.querySelector('#udStage');
  if (!stage || stage.dataset.udBound) return;
  stage.dataset.udBound = '1';
  document.querySelector('#udUpload').onclick = () => document.querySelector('#udFile').click();
  document.querySelector('#udFile').addEventListener('change', async ev => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    if (!String(f.type).startsWith('image/')) { setStatus('只接受图片：' + f.name); return; }
    const buf = new Uint8Array(await f.arrayBuffer());
    let b64 = '';
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) b64 += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
    const out = await api('/upload', { filename: f.name, mime: f.type || 'image/png', data: btoa(b64) });
    if (!out.path) { setStatus('上传失败：' + (out.error || '未知原因')); return; }
    ud.path = out.path;
    ud.natW = out.width || 0; ud.natH = out.height || 0;
    ud.slices = []; ud.undo = []; ud.redo = []; ud.sel = [];
    ud.zoom = 1; ud.panX = 20; ud.panY = 20;
    const stageR = stage.getBoundingClientRect();
    ud.baseW = Math.max(320, Math.round(stageR.width - 80));
    udSave(); udRender();
    setStatus('设计稿已上传 · ' + (ud.natW || '?') + 'x' + (ud.natH || '?') + ' · 可拖框或用 AI 提议切片');
  });
  document.querySelector('#udAi').onclick = async () => {
    if (!ud.path) { setStatus('先上传设计稿'); return; }
    setStatus('AI 正在看图提议切片…');
    const out = await api('/ui-slices', { path: ud.path });
    if (out.error) { setStatus('AI 提议失败：' + out.error); return; }
    if (!out.slices || !out.slices.length) { setStatus('AI 没看出可切的区域，换张图或手动拖框'); return; }
    // 确认框：勾选后才存，不自动存
    const list = document.querySelector('#udConfirmList');
    list.innerHTML = '';
    out.slices.forEach((s, i) => {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer';
      row.innerHTML = '<input type="checkbox" checked data-udci="' + i + '"/><span>' + escapeHtml(s.label || ('切片 ' + (i + 1))) + ' <span class="note">' + Math.round(s.w * 100) + '% × ' + Math.round(s.h * 100) + '%</span></span>';
      list.append(row);
    });
    document.querySelector('#udConfirm').dataset.on = '1';
    document.querySelector('#udConfirmOk').onclick = () => {
      udSnap();
      const boxes = document.querySelectorAll('#udConfirmList input:checked');
      boxes.forEach(cb => {
        const s = out.slices[Number(cb.dataset.udci)];
        ud.slices.push({ id: 'slice-' + Date.now() + '-' + Math.floor(Math.random() * 1000), x: s.x, y: s.y, w: s.w, h: s.h, label: s.label || '', radius: { tl: 0, tr: 0, br: 0, bl: 0 } });
      });
      document.querySelector('#udConfirm').removeAttribute('data-on');
      udSave(); udRender();
      setStatus('已存入 ' + boxes.length + ' 个切片（没勾的没存）');
    };
    document.querySelector('#udConfirmNo').onclick = () => document.querySelector('#udConfirm').removeAttribute('data-on');
    setStatus('AI 提议了 ' + out.slices.length + ' 个切片，等你勾选确认');
  };
  ['Orig','Cut','Grid'].forEach(v => {
    document.querySelector('#udView' + v).onclick = () => { ud.view = v.toLowerCase(); udSave(); udRender(); };
  });
  document.querySelector('#udUndo').onclick = udUndoFn;
  document.querySelector('#udRedo').onclick = udRedoFn;
  document.querySelector('#udExport').onclick = async () => {
    if (!ud.path || !ud.slices.length) { setStatus('先上传设计稿并建切片'); return; }
    setStatus('正在打包切片…');
    const out = await api('/ui-export', { path: ud.path, slices: ud.slices });
    if (out.error) { setStatus('导出失败：' + out.error); return; }
    const a = document.createElement('a');
    a.href = fileSrc({ path: out.path });
    a.download = 'ui-slices.zip';
    a.click();
    setStatus('切片包已导出 · ' + out.slices + ' 个切片 · ' + Math.round(out.bytes / 1024) + 'KB');
  };
  document.querySelector('#udExportFull').onclick = async () => {
    if (!ud.path || !ud.slices.length) { setStatus('先上传设计稿并建切片'); return; }
    setStatus('正在打完整设计包（切片 + 素材产物 + 网页项目）…');
    const out = await api('/ui-export', { path: ud.path, slices: ud.slices, kind: 'full', webId: udWebPrj.id || undefined });
    if (out.error) { setStatus('导出失败：' + out.error); return; }
    const a = document.createElement('a');
    a.href = fileSrc({ path: out.path });
    a.download = 'ui-design-full.zip';
    a.click();
    setStatus('完整设计包已导出 · ' + out.slices + ' 个切片 · ' + Math.round(out.bytes / 1024) + 'KB · 含素材产物' + (udWebPrj.id ? '与网页项目' : ''));
  };
  document.querySelector('#udImport').onclick = () => document.querySelector('#udZipFile').click();
  document.querySelector('#udZipFile').addEventListener('change', async ev => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const buf = new Uint8Array(await f.arrayBuffer());
    let b64 = '';
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) b64 += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
    const up = await api('/upload', { filename: f.name, mime: 'application/zip', data: btoa(b64) });
    if (!up.path) { setStatus('上传失败：' + (up.error || '未知原因')); return; }
    const out = await api('/ui-import', { path: up.path });
    if (out.error) { setStatus('还原失败：' + out.error); return; }
    udSnap();
    ud.path = out.path;
    ud.natW = out.width || 0;
    ud.natH = out.height || 0;
    ud.slices = out.slices || [];
    ud.sel = [];
    udSave(); udRender();
    setStatus('切片包已还原 · ' + ud.slices.length + ' 个切片 · 可撤销');
  });
  stage.addEventListener('wheel', ev => {
    if (!ud.path) return;
    ev.preventDefault();
    const r = stage.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    const next = Math.max(0.1, Math.min(8, ud.zoom * (ev.deltaY > 0 ? 0.9 : 1.1)));
    ud.panX = mx - (mx - ud.panX) * (next / ud.zoom);
    ud.panY = my - (my - ud.panY) * (next / ud.zoom);
    ud.zoom = next;
    udApplyView();
  }, { passive: false });
  stage.addEventListener('pointerdown', ev => {
    udHideCtx();
    if (!ud.path) return;
    const boxEl = ev.target.closest ? ev.target.closest('.udbox') : null;
    const handle = ev.target.dataset ? ev.target.dataset.udh : null;
    const pt = udStagePoint(ev);
    if (handle && boxEl) {
      const s = udFind(boxEl.dataset.id);
      if (!s) return;
      udDrag = { kind: 'resize', dir: handle, id: s.id, start: pt, orig: { x: s.x, y: s.y, w: s.w, h: s.h }, before: JSON.stringify(ud.slices) };
      ev.stopPropagation();
      return;
    }
    if (boxEl) {
      const id = boxEl.dataset.id;
      if (ev.shiftKey) {
        const i = ud.sel.indexOf(id);
        if (i >= 0) ud.sel.splice(i, 1); else ud.sel.push(id);
        udRender();
      } else if (ud.sel.indexOf(id) < 0) {
        ud.sel = [id];
        udRender();
      }
      const starts = {};
      ud.sel.forEach(sid => { const m = udFind(sid); if (m) starts[sid] = { x: m.x, y: m.y }; });
      udDrag = { kind: 'move', id, start: pt, starts, moved: false, before: JSON.stringify(ud.slices) };
      return;
    }
    if (ev.button === 2 || ud.space) {
      udDrag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, panX: ud.panX, panY: ud.panY };
      return;
    }
    if (ev.button === 0 && ud.view === 'orig') {
      udDrag = { kind: 'draft', start: pt, el: null };
    }
  });
  stage.addEventListener('pointermove', ev => {
    if (!udDrag) return;
    if (udDrag.kind === 'pan') {
      ud.panX = udDrag.panX + (ev.clientX - udDrag.sx);
      ud.panY = udDrag.panY + (ev.clientY - udDrag.sy);
      udApplyView();
      return;
    }
    const pt = udStagePoint(ev);
    if (udDrag.kind === 'draft') {
      if (!udDrag.el) {
        udDrag.el = document.createElement('div');
        udDrag.el.style.cssText = 'position:absolute;border:2px dashed var(--accent);background:rgba(226,96,63,.10);z-index:8;pointer-events:none';
        document.querySelector('#udWorld').append(udDrag.el);
      }
      const x = Math.min(udDrag.start.x, pt.x) / udImgW(), y = Math.min(udDrag.start.y, pt.y) / udImgH();
      const w = Math.abs(pt.x - udDrag.start.x) / udImgW(), h = Math.abs(pt.y - udDrag.start.y) / udImgH();
      udDrag.el.style.left = (x * udImgW()) + 'px';
      udDrag.el.style.top = (y * udImgH()) + 'px';
      udDrag.el.style.width = (w * udImgW()) + 'px';
      udDrag.el.style.height = (h * udImgH()) + 'px';
      udDrag.box = { x, y, w, h };
      return;
    }
    if (udDrag.kind === 'move') {
      const dx = (pt.x - udDrag.start.x) / udImgW(), dy = (pt.y - udDrag.start.y) / udImgH();
      if (!udDrag.moved && Math.abs(dx) * udImgW() + Math.abs(dy) * udImgH() < 2) return;
      udDrag.moved = true;
      const main = udFind(udDrag.id);
      if (main) {
        // 主框左/上/右/下四边吸附
        const t = udEdgeTargets(udDrag.id);
        const o = udDrag.starts[udDrag.id];
        const th = 5 / ud.zoom / udImgW();
        const nxL = udSnapVal(o.x + dx, t.xs, th);
        const nxR = udSnapVal(o.x + dx + main.w, t.xs, th);
        const ddx = (nxL !== o.x + dx) ? nxL - o.x : (nxR !== o.x + dx + main.w) ? nxR - main.w - o.x : dx;
        const nyT = udSnapVal(o.y + dy, t.ys, 5 / ud.zoom / udImgH());
        const nyB = udSnapVal(o.y + dy + main.h, t.ys, 5 / ud.zoom / udImgH());
        const ddy = (nyT !== o.y + dy) ? nyT - o.y : (nyB !== o.y + dy + main.h) ? nyB - main.h - o.y : dy;
        ud.sel.forEach(sid => {
          const m = udFind(sid), st = udDrag.starts[sid];
          if (!m || !st) return;
          m.x = Math.max(0, Math.min(1 - m.w, st.x + ddx));
          m.y = Math.max(0, Math.min(1 - m.h, st.y + ddy));
        });
      }
      udRender();
      return;
    }
    if (udDrag.kind === 'resize') {
      const s = udFind(udDrag.id);
      if (!s) return;
      const o = udDrag.orig;
      const dx = (pt.x - udDrag.start.x) / udImgW(), dy = (pt.y - udDrag.start.y) / udImgH();
      const dir = udDrag.dir;
      const t = udEdgeTargets(s.id);
      const thX = 5 / ud.zoom / udImgW(), thY = 5 / ud.zoom / udImgH();
      let x = o.x, y = o.y, w = o.w, h = o.h;
      if (dir.indexOf('e') >= 0) { const v = udSnapVal(o.x + o.w + dx, t.xs, thX); w = v - o.x; }
      if (dir.indexOf('s') >= 0) { const v = udSnapVal(o.y + o.h + dy, t.ys, thY); h = v - o.y; }
      if (dir.indexOf('w') >= 0) { const v = udSnapVal(o.x + dx, t.xs, thX); x = v; w = o.x + o.w - v; }
      if (dir.indexOf('n') >= 0) { const v = udSnapVal(o.y + dy, t.ys, thY); y = v; h = o.y + o.h - v; }
      if (w > 0.01 && h > 0.01) {
        s.x = Math.max(0, x); s.y = Math.max(0, y);
        s.w = Math.min(1 - s.x, w); s.h = Math.min(1 - s.y, h);
      }
      udRender();
      return;
    }
  });
  stage.addEventListener('pointerup', ev => {
    if (!udDrag) return;
    const d2 = udDrag;
    udDrag = null;
    if (d2.kind === 'draft') {
      if (d2.el) d2.el.remove();
      if (d2.box && d2.box.w * udImgW() > 4 && d2.box.h * udImgH() > 4) {
        udSnap();
        ud.slices.push({ id: 'slice-' + Date.now(), x: d2.box.x, y: d2.box.y, w: d2.box.w, h: d2.box.h, label: '切片 ' + (ud.slices.length + 1), radius: { tl: 0, tr: 0, br: 0, bl: 0 } });
        udSave();
        setStatus('已建切片 · 共 ' + ud.slices.length + ' 个');
      }
      udRender();
      return;
    }
    if (d2.kind === 'move') {
      if (d2.moved && d2.before !== JSON.stringify(ud.slices)) { udPushSnap(d2.before); setStatus('已移动 · 可撤销'); }
      udSave(); udRender();
      return;
    }
    if (d2.kind === 'resize') {
      if (d2.before !== JSON.stringify(ud.slices)) { udPushSnap(d2.before); setStatus('已调整 · 可撤销'); }
      udSave(); udRender();
      return;
    }
  });
  stage.addEventListener('contextmenu', ev => {
    const boxEl = ev.target.closest ? ev.target.closest('.udbox') : null;
    if (!boxEl) return;
    ev.preventDefault();
    const id = boxEl.dataset.id;
    if (ud.sel.indexOf(id) < 0) { ud.sel = [id]; udRender(); }
    const menu = document.querySelector('#udCtx');
    menu.innerHTML = '';
    const mk = (label, fn) => {
      const b = document.createElement('button');
      b.className = 'ghost';
      b.style.cssText = 'display:block;width:100%;text-align:left';
      b.textContent = label;
      b.onclick = () => { udHideCtx(); fn(); };
      menu.append(b);
    };
    mk('重命名', () => {
      const s = udFind(id);
      // Electron 渲染层不支持 window.prompt，用内联输入条代替
      menu.innerHTML = '';
      const inp = document.createElement('input');
      inp.value = s.label || '';
      inp.style.width = '170px';
      menu.append(inp);
      const ok = document.createElement('button');
      ok.className = 'ghost';
      ok.textContent = '确定';
      ok.style.cssText = 'display:block;width:100%;margin-top:4px';
      const commit = () => { if (inp.value !== (s.label || '')) { udSnap(); s.label = inp.value; udSave(); udRender(); } udHideCtx(); };
      ok.onclick = commit;
      inp.onkeydown = e2 => { if (e2.key === 'Enter') commit(); e2.stopPropagation(); };
      menu.append(ok);
      menu.style.display = 'block';
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
    });
    mk('复制', () => {
      udSnap();
      ud.sel.forEach(sid => {
        const s = udFind(sid);
        if (s) ud.slices.push({ id: 'slice-' + Date.now() + '-' + Math.floor(Math.random() * 1000), x: Math.min(0.95, s.x + 0.02), y: Math.min(0.95, s.y + 0.02), w: s.w, h: s.h, label: (s.label || '') + ' 副本', radius: Object.assign({}, s.radius) });
      });
      udSave(); udRender();
    });
    mk('圆角…', () => {
      const s = udFind(id);
      const rp = document.querySelector('#udRadius');
      rp.style.display = 'block';
      rp.style.left = ev.clientX + 'px';
      rp.style.top = ev.clientY + 'px';
      rp.querySelectorAll('input').forEach(inp => {
        const k = inp.dataset.udr;
        inp.value = Math.round(((s.radius || {})[k] || 0) * 100);
        inp.onchange = () => {
          udSnap();
          s.radius = s.radius || { tl: 0, tr: 0, br: 0, bl: 0 };
          s.radius[k] = Math.max(0, Math.min(50, Number(inp.value) || 0)) / 100;
          udSave(); udRender();
        };
      });
    });
    mk('删除', () => {
      udSnap();
      ud.slices = ud.slices.filter(s => ud.sel.indexOf(s.id) < 0);
      ud.sel = [];
      udSave(); udRender();
      setStatus('已删除 · 可撤销');
    });
    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--line);margin:4px 2px';
    menu.append(sep);
    mk('算法抠透明' + (ud.sel.length > 1 ? '（批量 ' + ud.sel.length + '）' : ''), () => udProcess('algo-alpha', ud.sel.slice()));
    mk('算法转 SVG' + (ud.sel.length > 1 ? '（批量 ' + ud.sel.length + '）' : ''), () => udProcess('algo-svg', ud.sel.slice()));
    mk('AI 抠透明', () => udProcess('ai-alpha', ud.sel.slice()));
    mk('AI 重绘 SVG', () => udProcess('ai-svg', ud.sel.slice()));
    mk('背景填充…', () => {
      udFillSliceId = id;
      document.querySelector('#udFillResult').innerHTML = '';
      document.querySelector('#udFill').dataset.on = '1';
    });
    menu.style.display = 'block';
    menu.style.left = ev.clientX + 'px';
    menu.style.top = ev.clientY + 'px';
  });
  document.addEventListener('keydown', ev => {
    if (state.page !== 'uidesign') return;
    if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName || '')) return;
    if (ev.key === ' ') { ud.space = true; ev.preventDefault(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) { ev.preventDefault(); udUndoFn(); }
    if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) { ev.preventDefault(); udRedoFn(); }
    if (ev.key === 'Delete' && ud.sel.length) {
      udSnap();
      ud.slices = ud.slices.filter(s => ud.sel.indexOf(s.id) < 0);
      ud.sel = [];
      udSave(); udRender();
    }
  });
  document.addEventListener('keyup', ev => { if (ev.key === ' ') ud.space = false; });
  // 背景填充：一次生成两版（本地合成 / AI 原图），各自「采用」入库
  // ---- 网页复刻：三文件 + 只读 assets + 按行编辑 + iframe 预览 + 用量 ----
  const udWebPrj = { id: '', files: null, file: 'index.html', tokens: 0 };
  function udWebUsageShow(){
    const el = document.querySelector('#udWebUsage');
    if (!el) return;
    const total = udWebPrj.tokens;
    const limit = 120000;
    el.textContent = total ? ('上下文用量 ' + total.toLocaleString() + ' tokens' + (total > limit * 0.8 ? ' · 接近上限，建议新开项目' : '')) : '';
    el.style.color = total > limit * 0.8 ? 'var(--warn)' : '';
  }
  function udWebShowFile(){
    if (!udWebPrj.files) return;
    document.querySelector('#udWebCode').value = udWebPrj.files[udWebPrj.file] || '';
    document.querySelectorAll('[data-wfile]').forEach(b => {
      b.style.borderColor = b.dataset.wfile === udWebPrj.file ? 'var(--accent)' : '';
    });
  }
  document.querySelector('#udWeb').onclick = () => {
    if (!ud.path) { setStatus('先上传设计稿'); return; }
    document.querySelector('#udWebPanel').dataset.on = '1';
  };
  document.querySelector('#udWebClose').onclick = () => document.querySelector('#udWebPanel').removeAttribute('data-on');
  document.querySelectorAll('[data-wfile]').forEach(b => {
    b.onclick = () => { udWebPrj.file = b.dataset.wfile; udWebShowFile(); };
  });
  document.querySelector('#udWebGen').onclick = async () => {
    const assets = [];
    ud.slices.forEach(s => { Object.values(s.variants || {}).forEach(p => assets.push(p)); });
    document.querySelector('#udWebGen').disabled = true;
    setStatus('网页复刻生成中 · 视觉模型在读设计稿写三文件…');
    try {
      const out = await api('/webclone/start', { path: ud.path, assets, brief: document.querySelector('#udWebBrief').value });
      if (out.error) { setStatus('网页复刻失败：' + out.error); return; }
      udWebPrj.id = out.id;
      udWebPrj.files = { 'index.html': out.files.html, 'style.css': out.files.css, 'script.js': out.files.js };
      if (out.usage && out.usage.total_tokens) udWebPrj.tokens += out.usage.total_tokens;
      document.querySelector('#udWebMain').style.display = 'flex';
      document.querySelector('#udWebFrame').src = out.previewUrl;
      udWebShowFile(); udWebUsageShow();
      setStatus('网页已生成 · ' + out.id + ' · assets ' + (out.assets || []).length + ' 个只读素材 · 右侧实时预览');
    } finally {
      document.querySelector('#udWebGen').disabled = false;
    }
  };
  document.querySelector('#udWebEditGo').onclick = async () => {
    const instruction = document.querySelector('#udWebEditIn').value.trim();
    if (!instruction || !udWebPrj.id) { setStatus('先生成网页，再输入修改指令'); return; }
    document.querySelector('#udWebEditGo').disabled = true;
    setStatus('按行修改中 · 模型只准改局部行…');
    try {
      const out = await api('/webclone/edit', { id: udWebPrj.id, file: udWebPrj.file, instruction });
      if (out.error) { setStatus('按行修改失败：' + out.error); return; }
      udWebPrj.files[udWebPrj.file] = out.content;
      if (out.usage && out.usage.total_tokens) udWebPrj.tokens += out.usage.total_tokens;
      document.querySelector('#udWebChanged').textContent = '本次改 ' + out.changedLines + ' 行';
      udWebShowFile(); udWebUsageShow();
      document.querySelector('#udWebFrame').src = '/imagestudio/web/' + udWebPrj.id + '/index.html?t=' + Date.now();
      setStatus('已按行修改 ' + udWebPrj.file + ' · 改了 ' + out.changedLines + ' 行 · 预览已刷新');
    } finally {
      document.querySelector('#udWebEditGo').disabled = false;
    }
  };
  document.querySelector('#udFillClose').onclick = () => document.querySelector('#udFill').removeAttribute('data-on');  document.querySelector('#udFillGo').onclick = async () => {
    const s = udFind(udFillSliceId);
    if (!s) { setStatus('先右键一个切片再点背景填充'); return; }
    const box = document.querySelector('#udFillResult');
    box.innerHTML = '';
    setStatus('背景填充生成中 · 本地版即时出，AI 版要等上游…');
    const out = await api('/ui-fill-bg', {
      path: ud.path,
      slice: s,
      color: document.querySelector('#udFillColor').value,
      prompt: document.querySelector('#udFillPrompt').value,
    });
    if (out.error) { setStatus('背景填充失败：' + out.error); return; }
    const mkVer = (title, ref, errText) => {
      const col = document.createElement('div');
      col.style.cssText = 'flex:1;min-width:220px;text-align:center';
      const h = document.createElement('p');
      h.className = 'note';
      h.textContent = title;
      h.style.margin = '0 0 4px';
      col.append(h);
      if (ref) {
        const im = document.createElement('img');
        im.src = fileSrc({ path: ref.path });
        im.style.cssText = 'width:100%;display:block;background:repeating-conic-gradient(#26241f 0% 25%, #1a1815 0% 50%) 0 0 / 16px 16px';
        col.append(im);
        const btn = document.createElement('button');
        btn.textContent = '采用这版';
        btn.style.marginTop = '6px';
        btn.onclick = () => {
          udSnap();
          s.variants = s.variants || {};
          s.variants['fill'] = ref.path;
          s.lastVariant = 'fill';
          udSave(); udRender();
          document.querySelector('#udFill').removeAttribute('data-on');
          setStatus('已采用' + title + '版 · 可撤销');
        };
        col.append(btn);
      } else {
        const p = document.createElement('p');
        p.className = 'note';
        p.textContent = errText || '未产出';
        col.append(p);
      }
      box.append(col);
    };
    mkVer('本地合成', out.local, '');
    mkVer('AI 原图', out.ai, out.aiError ? ('AI 版失败：' + out.aiError) : 'AI 版未产出');
    setStatus(out.ai ? '两版已出，选你喜欢的' : '本地版已出 · AI 版失败：' + (out.aiError || '未知'));
  };
  udRender();
}
udBind();
`
