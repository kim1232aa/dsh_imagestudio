/** Image Studio workbench. VisioWork-like IA + FANTASY skills. Not VisioWork source. */
export function studioPage(opts: { embed?: boolean }): string {
  const embedAttr = opts.embed ? ' data-embed="1"' : ''
  return `<!doctype html>
<html lang="zh-CN"${embedAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Image Studio</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2312110e'/%3E%3Crect x='6' y='10' width='20' height='12' rx='2' fill='%23e8e4d4'/%3E%3C/svg%3E"/>
<style>
:root{--bg:#12110e;--panel:#1b1a16;--ink:#efece3;--muted:#9a9486;--line:rgba(255,255,255,.08);--accent:#e8e4d4;--warn:#c45c26}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:14px/1.45 ui-sans-serif,system-ui,sans-serif}
body{display:flex;flex-direction:column}
header.top{display:flex;align-items:center;gap:12px;padding:8px 14px;border-bottom:1px solid var(--line);flex-shrink:0}
header.top b{letter-spacing:.04em}
.tabs{display:flex;gap:4px}
.tabs button{background:transparent;border:0;color:var(--muted);padding:8px 12px;cursor:pointer;border-bottom:2px solid transparent}
.tabs button[data-on]{color:var(--ink);border-bottom-color:var(--accent)}
.page{display:none;flex:1;min-height:0}
.page[data-on]{display:flex}
.cols{flex:1;display:grid;grid-template-columns:minmax(200px,260px) minmax(0,1fr) 0fr;min-height:0}
.cols.chat-open{grid-template-columns:minmax(200px,260px) minmax(0,1fr) minmax(240px,320px)}
aside,section.chat{border-color:var(--line);background:var(--panel);overflow:auto;padding:12px}
aside{border-right:1px solid var(--line)}
section.chat{border-left:1px solid var(--line);display:none}
.cols.chat-open section.chat{display:block}
main.stage{padding:16px;overflow:auto;min-width:0}
label{display:block;color:var(--muted);font-size:12px;margin:10px 0 4px}
textarea,input,select{width:100%;background:#11100d;border:1px solid var(--line);border-radius:10px;padding:8px 10px;color:inherit;font:inherit}
textarea{min-height:110px;resize:vertical}
.row{display:flex;gap:6px;flex-wrap:wrap}
.chip,button.ghost{background:transparent;border:1px solid var(--line);border-radius:999px;padding:4px 10px;color:inherit;cursor:pointer;font:inherit}
.chip[data-on]{background:var(--accent);color:#16140f;border-color:var(--accent)}
button.primary{height:38px;border:0;border-radius:10px;background:var(--accent);color:#16140f;font-weight:650;cursor:pointer;padding:0 14px}
button.primary:disabled{opacity:.5}
.skill{text-align:left;width:100%;background:#14130f;border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer;color:inherit}
.skill[data-on]{border-color:var(--accent)}
.skill small{display:block;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-top:16px}
.card{background:#181712;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.card img,.card video{width:100%;display:block;background:#0a0908;max-height:220px;object-fit:contain}
.card .cap{padding:10px 12px 4px;color:var(--ink);font-size:13px}
.card .cap small{display:block;color:var(--muted);font-size:11px;margin-top:2px}
.ecom-use{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex:none;border:1px solid var(--line);border-radius:999px;padding:6px 12px;color:inherit}
.ecom-use input[type=number]{width:48px;margin:0}
.banner{margin:0 0 12px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:12px}
.banner b{color:var(--ink);font-weight:600}
.note{color:var(--muted);font-size:12px}
pre{white-space:pre-wrap;background:#0e0d0b;border-radius:10px;padding:10px;border:1px solid var(--line);font-size:12px}
.hist{display:flex;flex-direction:column;gap:8px}
.hist button{text-align:left;background:#14130f;border:1px solid var(--line);border-radius:8px;padding:8px;color:inherit;cursor:pointer}
.canvas{position:relative;flex:1;background:#0d0c0a;overflow:hidden}
.node{position:absolute;background:#1b1a16;border:1px solid var(--line);border-radius:10px;padding:10px;min-width:220px;width:auto;max-width:280px;cursor:grab}
.node .note{white-space:nowrap;margin:4px 0 0}
.empty{padding:24px;color:var(--muted)}
.empty{padding:24px;color:var(--muted)}
.score{margin-top:10px;padding:10px;border:1px dashed var(--line);border-radius:10px}
.acts{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px}
.acts button{font-size:12px}
.progress{margin:10px 0;color:var(--muted)}
.port{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--accent);top:24px}
.port.in{left:-6px}
.port.out{right:-6px}
header .right{margin-left:auto;display:flex;gap:8px;align-items:center}
.lb{position:fixed;inset:0;background:rgba(8,8,9,.92);display:none;align-items:center;justify-content:center;z-index:80;flex-direction:column;gap:10px}
.lb[data-on]{display:flex}
.lb .stage{max-width:92vw;max-height:82vh;overflow:hidden;display:flex;align-items:center;justify-content:center}
.lb img,.lb video{max-width:92vw;max-height:82vh;transform-origin:center center}
.dropzone{margin-top:8px;padding:14px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:12px;text-align:center}
.dropzone[data-over]{border-color:var(--accent);color:var(--ink);background:rgba(232,228,212,.06)}
.ctx{position:fixed;z-index:40;background:#1b1a16;border:1px solid var(--line);border-radius:8px;padding:4px;min-width:148px;box-shadow:0 8px 28px rgba(0,0,0,.45)}
.ctx button{display:block;width:100%;text-align:left;background:transparent;border:0;color:inherit;padding:7px 10px;cursor:pointer;font:inherit}
.ctx button:hover{background:rgba(255,255,255,.06)}
#histSearch{margin:0 0 8px}
.ecom-use span{white-space:nowrap}
#cvWorld{position:absolute;left:0;top:0;transform-origin:0 0}
</style>
</head>
<body>
<header class="top">
  <b>Image Studio</b>
  <nav class="tabs" id="tabs">
    <button data-page="gen" data-on>普通生图</button>
    <button data-page="gallery">画廊</button>
    <button data-page="canvas">无限画布</button>
    <button data-page="ecom">电商</button>
  </nav>
  <div class="right">
    <button class="ghost" id="toggleChat">对话</button>
    <span class="note" id="status">准备就绪</span>
  </div>
</header>

<section class="page" data-page="gen" data-on>
  <div class="cols" id="cols">
    <aside>
      <label>历史记录</label>
      <input id="histSearch" placeholder="搜索提示词 / 比例"/>
      <div class="hist" id="hist"><p class="note">还没有记录。生成后会出现在这里。</p></div>
      <label>创作 Skill</label>
      <div id="skills"></div>
      <p class="note">把 skill 目录放到插件 skills/ 后会出现。不选就是普通生图。</p>
    </aside>
    <main class="stage">
      <p class="banner" id="channelHint"><b>当前是 mock 预览渠道</b> · 出的是概念板，不是成片。到插件设置填真实模型地址和密钥后才会出照片。</p>
      <div class="row" id="modes">
        <button class="chip" data-mode="txt" data-on>文生图</button>
        <button class="chip" data-mode="img">图生图</button>
        <button class="chip" data-mode="describe">反推</button>
        <button class="chip" data-mode="gif">GIF</button>
        <button class="chip" data-mode="video">视频</button>
      </div>
      <label>想法 / 提示词</label>
      <textarea id="brief" placeholder="例：明代科举舞弊案，夜审、账房、放榜。"></textarea>
      <div id="refWrap" hidden>
        <label>参考图（图生图，可多选）</label>
        <input id="refFile" type="file" accept="image/*" multiple/>
        <div class="dropzone" id="refDrop">拖到这里，或 Ctrl+V 粘贴截图。上限 10MB。</div>
        <div class="row" id="refThumbs"></div>
      </div>
      <label>比例（【必须】九档固定顺序）</label>
      <div class="row" id="ratios"></div>
      <label>清晰度</label>
      <div class="row" id="clarity"></div>
      <div id="vidOpts" hidden>
        <label>时长（秒）</label>
        <div class="row" id="durations"></div>
      </div>
      <label>张数</label>
      <div class="row" id="counts"></div>
      <label>负面词（skill 自动带上，可删）</label>
      <input id="negative" placeholder="没有自动负面词。想加就写，用逗号分隔。"/>
      <div class="row" style="margin-top:12px;gap:8px">
        <button class="primary" id="think">想方案</button>
        <button class="primary" id="go">就这样出图</button>
        <button class="ghost" id="cancelGo" hidden>取消</button>
        <button class="ghost" id="rethink">重新想一版</button>
        <button class="ghost" id="enhance">增强提示词</button>
      </div>
      <div class="score" id="scoreBox" hidden></div>
      <p class="note">分数只是参考，出图按钮不会因为分数被关掉。电影三联默认建议 21:9 三张，你改得动。</p>
      <div class="row" id="insp" style="margin-top:10px">
        <button class="chip" data-brief="明代科举舞弊案，夜审、账房、放榜。">夜审三联</button>
        <button class="chip" data-brief="雨后窗边人像，保留脸，只加胶片质感。">窗边人像</button>
        <button class="chip" data-brief="角色卡：青衫书吏，推开账房门。">书吏选角</button>
        <button class="chip" data-brief="做成游戏宣传图，要过度油腻 AI 光效。">游戏CG样例</button>
        <button class="chip" id="randInsp">随机</button>
      </div>
      <div class="grid" id="out"></div>
      <pre id="log" hidden></pre>
    </main>
    <section class="chat">
      <p class="note">对话默认收起。Agent 生图走宿主 tools，不在浏览器里拿密钥。</p>
      <textarea id="chat" placeholder="画一只在账房里翻卷宗的猫"></textarea>
    </section>
  </div>
</section>

<section class="page" data-page="gallery">
  <div class="empty">
    <h3>画廊</h3>
    <p id="galEmpty">从结果卡点「加入画廊」。按内容去重，不自动删图。</p>
    <div class="grid" id="gallery"></div>
  </div>
</section>

<section class="page" data-page="canvas">
  <div style="display:flex;flex-direction:column;flex:1;min-height:0">
    <div class="row" style="padding:8px 12px;border-bottom:1px solid var(--line)">
      <button class="ghost" id="cvText">文本</button>
      <button class="ghost" id="cvCfg">配置</button>
      <button class="ghost" id="cvImg">图片</button>
      <button class="ghost" id="cvVid">视频</button>
      <button class="ghost" id="cvSend">发送出图</button>
      <button class="ghost" id="cvDel">删除</button>
      <span class="note" id="cvHint">开箱已连好文本→配置。滚轮缩放，空格拖动画布，右键菜单，Delete 删除。</span>
    </div>
    <div class="canvas" id="canvas"></div>
  </div>
</section>

<section class="page" data-page="ecom">
  <div class="empty" style="max-width:720px">
    <h3>电商套图</h3>
    <p>先出计划，确认后才批量出图。普通生图不弹这个确认。</p>
    <label>商品名</label>
    <input id="sku" placeholder="青瓷茶盏"/>
    <label>用途（可勾选，可改数量）</label>
    <div id="ecomUses" class="row"></div>
    <div class="row" style="margin-top:12px">
      <button class="ghost" id="ecomPreview">生成套图预览</button>
      <button id="ecomConfirm" hidden>确认生成 <span id="ecomCount"></span></button>
    </div>
    <p class="note" id="ecomHint">预览只出计划，不会请求生图。</p>
    <ol id="ecomPlan" class="note"></ol>
    <div id="ecomOut" class="grid" style="margin-top:12px"></div>
  </div>
</section>

<div class="lb" id="lb">
  <div class="stage"><img id="lbImg" alt="" style="display:none"/><video id="lbVid" controls playsinline style="display:none;background:#000;max-width:92vw;max-height:82vh"></video></div>
  <p class="note" id="lbCap">滚轮缩放 0.5x–3x · ← → 翻页 · Esc 关闭</p>
</div>

<script>
const RATIOS = ['自动','1:1','3:4','4:3','9:16','16:9','2:3','3:2','21:9'];
const CLARITY = ['自动','1K','2K','4K'];
const COUNTS = [1,2,3,4];
const SKILL_UI = [
  {id:'cinema-dna-21x9x3', name:'电影三联', hint:'3 张 21:9 + 本地拼接'},
  {id:'cinema-dna-cover', name:'三联封面', hint:'已有三联后再出 3:4 封面', maps:'cinema-dna-21x9x3'},
  {id:'movie-poster', name:'电影海报', hint:'9:16 分层海报'},
  {id:'life-force-portrait', name:'人像', hint:'升级已有照片 / 原创'},
  {id:'photography-simulation', name:'摄影', hint:'任意地点拍照感'},
  {id:'character-casting', name:'角色', hint:'默认同人设一张，勾选才出三视图'}
];
const DURATIONS = [2,4,6];
const MAX_UPLOAD = 10 * 1024 * 1024;
const state = { page:'gen', mode:'txt', skillId:'', ratio:'自动', clarity:'自动', n:1, durationSec:2, plan:null, lastImages:[], gallery:[], history:[], chat:false, lbScale:1, lbIndex:0, lbList:[] };

const $ = (id) => document.getElementById(id);
function setStatus(t){ $('status').textContent = t; }
function loadLS(key, fallback){
  try { const v = JSON.parse(localStorage.getItem('imagestudio.'+key)||''); return v || fallback; } catch { return fallback; }
}
function saveLS(key, val){
  try { localStorage.setItem('imagestudio.'+key, JSON.stringify(val)); } catch {}
}
state.gallery = loadLS('gallery', []);
state.history = loadLS('history', []);
async function api(path, body, signal){
  const res = await fetch('/imagestudio/api'+path, {
    method: body===undefined?'GET':'POST',
    headers: body?{'content-type':'application/json'}:undefined,
    body: body?JSON.stringify(body):undefined,
    signal
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error:text, status:res.status }; }
}
function chips(el, items, key, fmt){
  el.innerHTML = '';
  items.forEach((item) => {
    const b = document.createElement('button');
    b.className = 'chip';
    const val = fmt?fmt(item):item;
    b.textContent = val;
    b.dataset.val = String(item);
    if (state[key] === item) b.dataset.on = '1';
    b.onclick = () => { state[key] = item; sync(); };
    el.append(b);
  });
}
function renderSkills(list){
  const box = $('skills');
  box.innerHTML = '';
  const none = document.createElement('button');
  none.className = 'skill';
  none.innerHTML = '<b>不使用 Skill</b><small>普通生图</small>';
  if (!state.skillId) none.dataset.on = '1';
  none.onclick = () => { state.skillId=''; sync(); };
  box.append(none);
  const have = new Set((list||[]).map(s=>s.id));
  SKILL_UI.forEach((s) => {
    const real = s.maps || s.id;
    if (s.id !== 'cinema-dna-cover' && !have.has(real) && !have.has(s.id)) return;
    const b = document.createElement('button');
    b.className = 'skill';
    b.innerHTML = '<b>'+s.name+'</b><small>'+s.hint+'</small>';
    if (state.skillId === s.id) b.dataset.on = '1';
    b.onclick = () => {
      state.skillId = s.id;
      if (s.id === 'cinema-dna-21x9x3') state.ratio = '21:9';
      if (s.id === 'cinema-dna-cover') state.ratio = '3:4';
      if (s.id === 'movie-poster') state.ratio = '9:16';
      sync();
    };
    box.append(b);
  });
}
function sync(){
  document.querySelectorAll('#tabs button').forEach(b=>b.toggleAttribute('data-on', b.dataset.page===state.page));
  document.querySelectorAll('.page').forEach(p=>p.toggleAttribute('data-on', p.dataset.page===state.page));
  document.querySelectorAll('#modes .chip').forEach(b=>b.toggleAttribute('data-on', b.dataset.mode===state.mode));
  chips($('ratios'), RATIOS, 'ratio');
  chips($('clarity'), CLARITY, 'clarity');
  chips($('counts'), COUNTS, 'n');
  if ($('durations')) chips($('durations'), DURATIONS, 'durationSec');
  $('cols').classList.toggle('chat-open', state.chat);
  $('go').disabled = false;
  if ($('refWrap')) $('refWrap').hidden = state.mode!=='img';
  if ($('vidOpts')) {
    $('vidOpts').hidden = state.mode!=='video';
    $('vidOpts').style.display = state.mode==='video' ? 'block' : 'none';
  }
}
function showPlan(plan){
  const box = $('scoreBox');
  if (!plan) { box.hidden = true; return; }
  const sc = plan.selfCheck || {};
  const shots = (plan.shots||[]).map(s=>s.id+' '+s.aspectRatio+'\\n'+s.prompt).join('\\n\\n');
  const reason = plan.reasoning ? Object.values(plan.reasoning).join('\\n') : '';
  box.hidden = false;
  box.innerHTML = '<b>方案自检 '+((sc.score!=null)?sc.score:'—')+' 分</b>'
    + (sc.passed===false ? '<p>有弱项，但「就这样出图」仍然可用。</p>' : '')
    + (sc.failures&&sc.failures.length ? '<p>'+sc.failures.join('；')+'</p>' : '')
    + '<pre>'+reason+'\\n\\n'+shots+'</pre>';
  $('log').hidden = false;
  const neg = (plan.shots&&plan.shots[0]&&plan.shots[0].negative) || (plan.constraints&&plan.constraints.negativePatch) || '';
  if (neg && $('negative') && !$('negative').value) $('negative').value = neg;
  $('log').textContent = JSON.stringify(plan, null, 2);
}
function fileSrc(img){
  return img.path ? '/imagestudio/api/file?path='+encodeURIComponent(img.path) : (img.url||'');
}
function prettyName(img){
  if (img && img.mime && String(img.mime).startsWith('video')) return '视频';
  if (img && img.title) return img.title;
  return '概念板';
}
function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function renderGallery(){
  const box = $('gallery');
  if (!box) return;
  box.innerHTML = '';
  (state.gallery||[]).forEach(img=>{
    if (!img || !img.path) return;
    const d = document.createElement('div');
    d.className = 'card';
    const src = fileSrc(img);
    const isVid = img.mime && String(img.mime).startsWith('video');
    d.innerHTML = (src ? (isVid ? '<video src="'+src+'" muted></video>' : '<img src="'+src+'" alt="">') : '')
      + '<div class="cap">'+(escapeHtml(img.prompt||img.title||prettyName(img)))+'<small>'+prettyName(img)+'</small></div>';
    const acts = document.createElement('div');
    acts.className = 'acts';
    acts.append(mkAct('当参考图', () => { state.lastImages = img.path?[img.path]:[]; state.mode='img'; state.page='gen'; sync(); setStatus('已设为参考图'); }));
    acts.append(mkAct('拿去做视频', () => { state.lastImages = img.path?[img.path]:[]; state.mode='video'; state.page='gen'; sync(); setStatus('已带到视频首帧'); }));
    acts.append(mkAct('加入画布', () => { state.page='canvas'; sync(); window.__cvAddImage && window.__cvAddImage(img.path); }));
    d.append(acts);
    box.append(d);
  });
}
function addGallery(img){
  state.gallery = state.gallery || [];
  if (img.path && state.gallery.some(x=>x.path===img.path)) { setStatus('画廊已有这张（按路径去重）'); return; }
  state.gallery.push(img);
  saveLS('gallery', state.gallery);
  renderGallery();
  setStatus('已加入画廊 · '+state.gallery.length+' 张');
}
function mkAct(label, fn){
  const b=document.createElement('button'); b.className='ghost'; b.textContent=label; b.onclick=fn; return b;
}
function pushHistory(entry){
  state.history = state.history || [];
  state.history.unshift(entry);
  state.history = state.history.slice(0, 80);
  saveLS('history', state.history);
  renderHist();
}
function renderHist(){
  const box = $('hist');
  if (!box) return;
  const q = (($('histSearch')&&$('histSearch').value)||'').trim().toLowerCase();
  const items = (state.history||[]).filter(h => {
    if (!q) return true;
    return (h.prompt||'').toLowerCase().includes(q) || String(h.ratio||'').includes(q) || String(h.skillId||'').includes(q);
  });
  box.innerHTML = items.length ? '' : '<p class="note">'+(q?'没有匹配的历史。':'还没有记录。生成后会出现在这里。')+'</p>';
  items.forEach(h => {
    const b = document.createElement('button');
    b.textContent = (h.prompt||prettyName(h)).slice(0,18) + (h.ratio? ' · '+h.ratio : '');
    b.onclick = () => {
      if (h.prompt) $('brief').value = h.prompt;
      if (h.ratio) state.ratio = h.ratio;
      if (h.clarity) state.clarity = h.clarity;
      if (h.n) state.n = h.n;
      if (h.skillId!==undefined) state.skillId = h.skillId;
      if (h.mode) state.mode = h.mode;
      if (h.path) state.lastImages = [h.path];
      if (h.negative && $('negative')) $('negative').value = h.negative;
      state.page = 'gen';
      sync();
      setStatus('已回填参数');
    };
    box.append(b);
  });
}
function openLb(list, idx){
  state.lbList = list || [];
  state.lbIndex = idx || 0;
  state.lbScale = 1;
  paintLb();
  $('lb').dataset.on = '1';
}
function paintLb(){
  const item = (state.lbList||[])[state.lbIndex];
  if (!item) return;
  const src = fileSrc(item);
  const isVid = item.mime && String(item.mime).startsWith('video');
  $('lbImg').style.display = isVid ? 'none' : 'block';
  $('lbVid').style.display = isVid ? 'block' : 'none';
  if (isVid) { $('lbVid').src = src; $('lbVid').play && $('lbVid').play().catch(()=>{}); $('lbImg').removeAttribute('src'); }
  else { $('lbImg').src = src; $('lbVid').removeAttribute('src'); }
  const el = isVid ? $('lbVid') : $('lbImg');
  el.style.transform = 'scale('+state.lbScale+')';
  $('lbCap').textContent = (state.lbIndex+1)+'/'+state.lbList.length+' · '+state.lbScale.toFixed(1)+'x · 滚轮缩放 · ← → · Esc';
}
function closeLb(){ $('lb').removeAttribute('data-on'); }
function cards(images, prompt){
  const box = $('out');
  (images||[]).forEach(img=>{
    const d = document.createElement('div');
    d.className = 'card';
    const src = fileSrc(img);
    const isVid = img.mime && String(img.mime).startsWith('video');
    const isGif = img.mime === 'image/gif' || (img.path||'').endsWith('.gif');
    d.innerHTML = (src ? (isVid ? '<video src="'+src+'" controls style="width:100%;display:block;background:#000"></video>' : '<img src="'+src+'" alt="">') : '')
      + '<div class="cap">'+(escapeHtml((prompt||'').slice(0,48))||'预览')+'<small>'+(isVid?('mock 视频 · '+(img.width||'')+'×'+(img.height||'')):isGif?'GIF':'mock 概念板')+'</small></div>';
    const acts = document.createElement('div');
    acts.className = 'acts';
    acts.append(mkAct('全屏', () => openLb(images, images.indexOf(img))));
    acts.append(mkAct('下载', () => { const a=document.createElement('a'); a.href=src; a.download=(img.path||'shot').split('/').pop(); a.click(); }));
    acts.append(mkAct('加入画廊', () => addGallery({ ...img, prompt })));
    acts.append(mkAct('当参考图', () => { state.lastImages = img.path?[img.path]:[]; state.mode='img'; sync(); setStatus('已设为参考图'); }));
    acts.append(mkAct('拿去做视频', () => { state.lastImages = img.path?[img.path]:[]; state.mode='video'; sync(); setStatus('已带到视频首帧'); }));
    acts.append(mkAct('加入对话', () => { $('chat').value = (($('chat').value||'') + String.fromCharCode(10) + (prompt||'')).trim(); state.chat = true; sync(); setStatus('已加入对话'); }));
    acts.append(mkAct('复制提示词', () => { navigator.clipboard && navigator.clipboard.writeText(prompt||$('brief').value); setStatus('提示词已复制'); }));
    acts.append(mkAct('重新生成', () => { $('go').click(); }));
    if (isVid) acts.append(mkAct('抽一帧', async () => {
      setStatus('抽帧中…');
      const out = await api('/video/frame', { path: img.path, t: 0.4 });
      if (out.error) { setStatus(String(out.error)); return; }
      cards([out], prompt+' · 抽帧');
      setStatus('已抽一帧，可当参考图');
    }));
    d.append(acts);
    box.prepend(d);
    pushHistory({
      prompt, path: img.path, mime: img.mime, ratio: state.ratio, clarity: state.clarity, n: state.n,
      skillId: state.skillId, mode: state.mode, negative: $('negative') && $('negative').value
    });
  });
}
async function loadGalleryFromAssets(){
  renderGallery();
  const empty = $('galEmpty');
  if (empty) empty.style.display = state.gallery.length ? 'none' : 'block';
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{
  state.page=b.dataset.page;
  sync();
  if (state.page==='gallery') loadGalleryFromAssets();
});
document.querySelectorAll('#modes .chip').forEach(b=>b.onclick=()=>{ state.mode=b.dataset.mode; sync(); });
$('refFile') && ($('refFile').onchange = async () => {
  await ingestFiles(Array.from($('refFile').files||[]));
});
async function ingestFiles(files){
  const thumbs = $('refThumbs');
  for (const f of files) {
    if (f.size > MAX_UPLOAD) { setStatus('超过大小限制 10MB：'+f.name); continue; }
    if (!String(f.type||'').startsWith('image/')) { setStatus('只接受图片：'+f.name); continue; }
    const buf = new Uint8Array(await f.arrayBuffer());
    let b64 = '';
    const chunk = 0x8000;
    for (let i=0;i<buf.length;i+=chunk) b64 += String.fromCharCode.apply(null, buf.subarray(i,i+chunk));
    const out = await api('/upload', { filename: f.name, mime: f.type || 'image/png', data: btoa(b64) });
    if (out.path) {
      state.lastImages = (state.lastImages||[]).concat([out.path]);
      if (thumbs) {
        const im = document.createElement('img');
        im.src = fileSrc(out);
        im.style.width = '72px';
        im.style.height = '72px';
        im.style.objectFit = 'cover';
        im.style.borderRadius = '8px';
        thumbs.append(im);
      }
    }
  }
  if (files.length) setStatus('已上传参考图 · '+state.lastImages.length+' 张');
}
(function bindDrop(){
  const z = $('refDrop');
  if (!z) return;
  const over = (on) => z.toggleAttribute('data-over', on);
  z.addEventListener('dragover', ev => { ev.preventDefault(); over(true); });
  z.addEventListener('dragleave', () => over(false));
  z.addEventListener('drop', async ev => {
    ev.preventDefault(); over(false);
    state.mode = 'img'; sync();
    await ingestFiles(Array.from(ev.dataTransfer.files||[]));
  });
})();
document.addEventListener('paste', async (ev) => {
  const items = Array.from((ev.clipboardData && ev.clipboardData.items) || []);
  const files = items.map(it => it.kind==='file' ? it.getAsFile() : null).filter(Boolean);
  if (!files.length) return;
  if (state.page==='canvas' && window.__cvAddFile) {
    files.forEach(f => window.__cvAddFile(f));
    return;
  }
  state.mode = 'img'; state.page='gen'; sync();
  await ingestFiles(files);
});
$('histSearch') && ($('histSearch').oninput = renderHist);
$('lb') && ($('lb').onclick = (ev) => { if (ev.target===$('lb') || ev.target.className==='stage') closeLb(); });
document.addEventListener('keydown', (ev) => {
  if (!$('lb').hasAttribute('data-on')) return;
  if (ev.key==='Escape') closeLb();
  if (ev.key==='ArrowLeft') { state.lbIndex = Math.max(0, state.lbIndex-1); paintLb(); }
  if (ev.key==='ArrowRight') { state.lbIndex = Math.min(state.lbList.length-1, state.lbIndex+1); paintLb(); }
});
$('lb') && $('lb').addEventListener('wheel', (ev) => {
  if (!$('lb').hasAttribute('data-on')) return;
  ev.preventDefault();
  const next = state.lbScale + (ev.deltaY>0 ? -0.1 : 0.1);
  state.lbScale = Math.max(0.5, Math.min(3, Math.round(next*10)/10));
  paintLb();
}, { passive:false });
document.querySelectorAll('#insp .chip').forEach(b=>b.onclick=()=>{ $('brief').value=b.dataset.brief||''; });
$('toggleChat').onclick=()=>{ state.chat=!state.chat; sync(); };
async function think(){
  const brief = $('brief').value.trim();
  if (!brief) { setStatus('先写一句想法'); return; }
  setStatus('正在想方案…');
  const skillId = state.skillId==='cinema-dna-cover' ? 'cinema-dna-21x9x3' : (state.skillId||'cinema-dna-21x9x3');
  const out = await api('/plan', { skillId, brief, wantPoster: state.skillId==='movie-poster' || state.skillId==='cinema-dna-cover' });
  state.plan = out.plan || out;
  showPlan(state.plan);
  setStatus('方案已出 · '+(out.score!=null?out.score+' 分':'可出图'));
}
$('think').onclick = think;
$('rethink').onclick = think;
$('go').onclick = async () => {
  const brief = $('brief').value.trim();
  if (state.mode==='describe') {
    if (!state.lastImages.length) { setStatus('先有一张图再反推'); return; }
    setStatus('反推中…');
    const out = await api('/describe', { assets: state.lastImages.slice(-1) });
    $('brief').value = out.text || out.prompt || JSON.stringify(out);
    setStatus('反推完成');
    return;
  }
  if (state.mode==='gif') {
    if (!brief) { setStatus('先写提示词'); return; }
    const t0g = Date.now();
    const tickg = setInterval(() => setStatus('GIF 编码中… '+Math.round((Date.now()-t0g)/1000)+'s'), 200);
    try {
      const ratio = state.ratio==='自动' ? '1:1' : state.ratio;
      const out = await api('/gif', { prompt: brief, n: Math.max(2, state.n), aspectRatio: ratio, durationSec: 2 });
      if (out.error) { setStatus(String(out.error)); return; }
      cards([out], brief);
      setStatus('完成 · '+Math.round((Date.now()-t0g)/1000)+'s');
    } catch (e) {
      setStatus('失败：'+String(e));
    } finally { clearInterval(tickg); }
    return;
  }
  if (state.mode==='video') {
    if (!brief) { setStatus('先写提示词'); return; }
    const t0v = Date.now();
    const tickv = setInterval(() => setStatus('出视频中… '+Math.round((Date.now()-t0v)/1000)+'s'), 200);
    setStatus('出视频中… 0s');
    if ($('cancelGo')) $('cancelGo').hidden = false;
    try {
      const out = await api('/video', {
        prompt: brief,
        durationSec: state.durationSec || 2,
        aspectRatio: state.ratio==='自动' ? '16:9' : state.ratio,
        firstFramePath: state.lastImages[0]
      });
      if (out.error) { setStatus(String(out.error)); return; }
      cards([{ path: out.path, mime:'video/mp4', width: out.width, height: out.height, title:'视频' }], brief);
      setStatus('完成 · '+Math.round((Date.now()-t0v)/1000)+'s');
    } catch (e) {
      setStatus('失败：'+String(e));
    } finally {
      clearInterval(tickv);
      if ($('cancelGo')) $('cancelGo').hidden = true;
    }
    return;
  }
  if (!brief && !state.plan) { setStatus('先写提示词或先想方案'); return; }
  const t0 = Date.now();
  const tick = setInterval(() => setStatus('出图中… '+Math.round((Date.now()-t0)/1000)+'s'), 200);
  setStatus('出图中… 0s');
  const ac = new AbortController();
  state.jobAbort = ac;
  if ($('cancelGo')) { $('cancelGo').hidden = false; }
  try {
  const skillId = state.skillId==='cinema-dna-cover' ? 'cinema-dna-21x9x3' : state.skillId;
  let planId = state.plan && state.plan.id;
  if (skillId && !planId) {
    const planned = await api('/plan', { skillId, brief, wantPoster: skillId==='movie-poster' });
    state.plan = planned.plan || planned;
    planId = planned.planId || state.plan.id;
    showPlan(state.plan);
  }
  const ratio = state.ratio==='自动' ? (state.plan && state.plan.shots && state.plan.shots[0] && state.plan.shots[0].aspectRatio) || '1:1' : state.ratio;
  const out = await api('/generate', {
    planId,
    prompt: brief,
    aspectRatio: ratio,
    n: state.n,
    skillId,
    negative: $('negative').value.trim() || undefined,
    assets: state.lastImages || [],
    refUsage: (state.lastImages && state.lastImages.length) ? 'image-to-image' : 'analysis-only'
  }, ac.signal);
  state.lastJobId = out.jobId;
  if (out.status === 'canceled') { setStatus('已取消'); return; }
  if (out.error) { setStatus(String(out.error)); return; }
  cards(out.images||[], brief);
  if (skillId==='cinema-dna-21x9x3' && (out.images||[]).length>=2) {
    const composed = await api('/compose', { mode:'triptych', assets:(out.images||[]).map(i=>i.path).slice(0,3), gap:10, ratios:'1:1:1' });
    cards(composed.images||[], brief);
  }
  setStatus('完成 · '+Math.round((Date.now()-t0)/1000)+'s');
  } catch (e) {
    if (e && e.name === 'AbortError') setStatus('已取消');
    else setStatus('失败：'+String(e));
  } finally {
    clearInterval(tick);
    state.jobAbort = null;
    if ($('cancelGo')) $('cancelGo').hidden = true;
  }
};
$('cancelGo') && ($('cancelGo').onclick = async () => {
  setStatus('正在取消…');
  try {
    const list = await api('/jobs');
    const running = (list.jobs||[]).find(j => j.status==='running');
    if (running) await api('/cancel', { jobId: running.id });
  } catch {}
  if (state.jobAbort) state.jobAbort.abort();
});
$('randInsp') && ($('randInsp').onclick = () => {
  const pool = [...document.querySelectorAll('#insp .chip[data-brief]')];
  const pick = pool[Math.floor(Math.random()*pool.length)];
  if (pick) $('brief').value = pick.dataset.brief || '';
});
$('enhance') && ($('enhance').onclick = () => {
  setStatus('未配置提示词增强模型。到设置里给「提示词增强」指定一个聊天模型后再用。');
});
(function bindEcom(){
  const uses = [
    {id:'hero', name:'主图白底', n:1},
    {id:'detail', name:'细节特写', n:1},
    {id:'scene', name:'场景氛围', n:1},
    {id:'scale', name:'尺寸对比', n:1},
    {id:'poster', name:'卖点海报', n:1},
    {id:'pack', name:'包装展示', n:1}
  ];
  const box = $('ecomUses');
  if (!box) return;
  uses.forEach(u => {
    const lab = document.createElement('label');
    lab.className = 'ecom-use';
    lab.innerHTML = '<input type="checkbox" checked data-id="'+u.id+'"/> <span>'+u.name+'</span>'
      +' <input type="number" min="1" max="4" value="'+u.n+'" data-n="'+u.id+'"/>';
    box.append(lab);
  });
  let plan = null;
  function picked(){
    return uses.map(u => {
      const on = box.querySelector('input[type=checkbox][data-id="'+u.id+'"]');
      const n = box.querySelector('input[data-n="'+u.id+'"]');
      return { id: u.id, n: on && on.checked ? Number(n && n.value || 1) : 0 };
    }).filter(u => u.n > 0);
  }
  $('ecomPreview').onclick = async () => {
    const sku = $('sku').value.trim() || '商品';
    const out = await api('/ecom/preview', { sku, uses: picked() });
    plan = out;
    const ol = $('ecomPlan');
    ol.innerHTML = (out.shots||[]).map(s => '<li>'+escapeHtml(s.title)+' · '+s.aspectRatio+' · '+escapeHtml(s.prompt)+'</li>').join('');
    $('ecomCount').textContent = '（'+out.count+' 张）';
    $('ecomConfirm').hidden = false;
    $('ecomHint').textContent = '将生成 '+out.count+' 张。确认后才出图。';
    setStatus('套图计划已出，未生图');
  };
  $('ecomConfirm').onclick = async () => {
    if (!plan) { setStatus('先预览计划'); return; }
    setStatus('套图生成中…');
    const out = await api('/ecom/confirm', { plan });
    if (out.error) { setStatus(String(out.error)); return; }
    const dest = $('ecomOut');
    dest.innerHTML = '';
    (out.images||[]).forEach((img, i) => {
      const d = document.createElement('div');
      d.className = 'card';
      if (i===0) d.style.gridColumn = '1 / -1';
      const src = '/imagestudio/api/file?path='+encodeURIComponent(img.path||'');
      d.innerHTML = '<img src="'+src+'" alt=""/><div class="cap">'+(escapeHtml(img.title||img.role||''))+'</div>';
      dest.append(d);
    });
    setStatus('套图完成 · '+((out.images||[]).length)+' 张');
  };
})();
(function bindCanvas(){
  const stage = $('canvas');
  if (!stage) return;
  const saved = loadLS('canvas', null);
  const project = saved && saved.nodes ? saved : {
    id:'default',
    nodes:[
      {id:'text-1', type:'text', x:40, y:80, text:'一只青瓷茶盏放在账房窗台上，午后侧光'},
      {id:'cfg-1', type:'config', x:320, y:90, ratio:'1:1', n:1}
    ],
    edges:[{id:'e-1', from:'text-1', to:'cfg-1'}]
  };
  state.canvas = project;
  let drag = null, wire = null, selected = 'cfg-1', pan = null, space = false, ctxMenu = null;
  const view = { x:0, y:0, scale:1 };
  function persist(){ saveLS('canvas', project); }
  function incoming(id){ return project.edges.filter(e=>e.to===id).map(e=>project.nodes.find(n=>n.id===e.from)).filter(Boolean); }
  function hideCtx(){ if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }
  function showCtx(x, y){
    hideCtx();
    ctxMenu = document.createElement('div');
    ctxMenu.className = 'ctx';
    ctxMenu.style.left = x+'px';
    ctxMenu.style.top = y+'px';
    const item = (label, fn) => { const b=document.createElement('button'); b.textContent=label; b.onclick=()=>{ fn(); hideCtx(); }; return b; };
    ctxMenu.append(
      item('文本节点', () => addNode('text', x, y)),
      item('配置节点', () => addNode('config', x, y)),
      item('图片节点', () => addNode('image', x, y)),
      item('视频节点', () => addNode('video', x, y)),
      item('删除选中', () => delSelected()),
    );
    document.body.append(ctxMenu);
  }
  function worldFromEvent(ev){
    const r = stage.getBoundingClientRect();
    return { x: (ev.clientX - r.left - view.x) / view.scale, y: (ev.clientY - r.top - view.y) / view.scale };
  }
  function addNode(type, x, y){
    const id = type+'-'+Date.now();
    const n = { id, type, x: x || 80, y: y || 180, text: type==='text'?'':'', ratio: type==='config'?'1:1':undefined, n: type==='config'?1:undefined };
    project.nodes.push(n);
    selected = id;
    persist(); render();
  }
  function delSelected(){
    if (!selected) return;
    project.nodes = project.nodes.filter(n=>n.id!==selected);
    project.edges = project.edges.filter(e=>e.from!==selected && e.to!==selected);
    selected = (project.nodes[0]&&project.nodes[0].id) || '';
    persist(); render();
  }
  function applyView(){
    const w = $('cvWorld');
    if (w) w.style.transform = 'translate('+view.x+'px,'+view.y+'px) scale('+view.scale+')';
  }
  function render(){
    hideCtx();
    stage.innerHTML = '';
    const world = document.createElement('div');
    world.id = 'cvWorld';
    world.innerHTML = '<svg id="cvWires" style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none" width="4000" height="3000"></svg>';
    stage.append(world);
    applyView();
    project.nodes.forEach(n=>{
      const el = document.createElement('div');
      el.className = 'node';
      el.dataset.id = n.id;
      el.style.left = n.x+'px';
      el.style.top = n.y+'px';
      if (n.id===selected) el.style.borderColor = 'var(--accent)';
      const ins = incoming(n.id).length;
      if (n.type==='text'){
        el.innerHTML = '<b>文本</b><textarea data-field="text" style="min-height:64px;margin-top:6px">'+escapeHtml(n.text||'')+'</textarea>';
      } else if (n.type==='image'){
        const src = n.path ? '/imagestudio/api/file?path='+encodeURIComponent(n.path) : '';
        el.innerHTML = '<b>图片</b>'+(src?'<img src="'+src+'" alt="" style="width:160px;display:block;margin-top:6px">':'<div class="note">空节点 · 点上传或拖入</div>');
      } else if (n.type==='video'){
        const src = n.path ? '/imagestudio/api/file?path='+encodeURIComponent(n.path) : '';
        el.innerHTML = '<b>视频</b>'+(src?'<video src="'+src+'" muted style="width:160px;display:block;margin-top:6px"></video>':'<div class="note">视频节点</div>');
      } else {
        el.innerHTML = '<b>生成配置</b><div class="note">入边 '+ins+'</div><div class="note">点发送出图</div>';
      }
      const outp = document.createElement('i');
      outp.className = 'port out';
      const inp = document.createElement('i');
      inp.className = 'port in';
      el.append(inp, outp);
      el.addEventListener('pointerdown', ev => {
        if (ev.target.tagName==='TEXTAREA' || ev.target.classList.contains('port')) return;
        selected = n.id;
        drag = { n, x: ev.clientX / view.scale - n.x, y: ev.clientY / view.scale - n.y };
        el.setPointerCapture(ev.pointerId);
        render();
      });
      el.addEventListener('pointermove', ev => {
        if (!drag || drag.n !== n) return;
        n.x = ev.clientX / view.scale - drag.x; n.y = ev.clientY / view.scale - drag.y;
        el.style.left = n.x+'px'; el.style.top = n.y+'px';
        drawWires();
      });
      el.addEventListener('pointerup', () => { drag = null; persist(); });
      el.querySelectorAll('[data-field]').forEach(t=>{
        t.addEventListener('input', () => { n[t.dataset.field] = t.value; persist(); });
      });
      outp.addEventListener('pointerdown', ev => { ev.stopPropagation(); wire = { from:n.id }; });
      inp.addEventListener('pointerup', ev => {
        ev.stopPropagation();
        if (!wire || wire.from===n.id) return;
        if (!project.edges.some(e=>e.from===wire.from && e.to===n.id))
          project.edges.push({id:'e-'+Date.now(), from:wire.from, to:n.id});
        wire = null; persist(); render();
      });
      world.append(el);
    });
    drawWires();
  }
  function drawWires(){
    const svg = $('cvWires');
    if (!svg) return;
    svg.innerHTML = project.edges.map(e=>{
      const a = project.nodes.find(n=>n.id===e.from);
      const b = project.nodes.find(n=>n.id===e.to);
      if (!a||!b) return '';
      const x1=a.x+170,y1=a.y+28,x2=b.x,y2=b.y+28;
      return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#c4b59a" stroke-width="2" marker-end="url(#arr)"/>';
    }).join('');
    svg.insertAdjacentHTML('afterbegin','<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#c4b59a"/></marker></defs>');
  }
  $('cvText').onclick = () => addNode('text', 60, 200);
  $('cvCfg').onclick = () => addNode('config', 300, 200);
  $('cvImg') && ($('cvImg').onclick = () => addNode('image', 80, 260));
  $('cvVid') && ($('cvVid').onclick = () => addNode('video', 320, 260));
  $('cvDel') && ($('cvDel').onclick = delSelected);
  $('cvSend').onclick = async () => {
    const cfg = project.nodes.find(n=>n.id===selected && n.type==='config') || project.nodes.find(n=>n.type==='config');
    if (!cfg) { setStatus('先选一个配置节点'); return; }
    setStatus('画布出图中…');
    const out = await api('/canvas/generate', { project, configNodeId: cfg.id });
    if (out.error) { setStatus(String(out.error)); return; }
    project.nodes = out.project.nodes;
    project.edges = out.project.edges;
    persist(); render();
    setStatus('画布出图完成 · 结果在配置节点右侧');
  };
  stage.addEventListener('dblclick', ev => {
    if (ev.target !== stage && ev.target.id !== 'cvWorld' && ev.target.id !== 'cvWires') return;
    const w = worldFromEvent(ev);
    addNode('text', w.x, w.y);
  });
  stage.addEventListener('contextmenu', ev => {
    ev.preventDefault();
    const w = worldFromEvent(ev);
    showCtx(ev.clientX, ev.clientY);
    stage._ctxWorld = w;
  });
  stage.addEventListener('pointerdown', ev => {
    if (!space && ev.target !== stage && ev.target.id !== 'cvWorld' && ev.target.id !== 'cvWires') return;
    pan = { x: ev.clientX - view.x, y: ev.clientY - view.y };
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener('pointermove', ev => {
    if (!pan) return;
    view.x = ev.clientX - pan.x;
    view.y = ev.clientY - pan.y;
    applyView();
  });
  stage.addEventListener('pointerup', () => { pan = null; });
  stage.addEventListener('wheel', ev => {
    ev.preventDefault();
    const next = view.scale * (ev.deltaY>0 ? 0.92 : 1.08);
    view.scale = Math.max(0.05, Math.min(5, next));
    applyView();
  }, { passive:false });
  document.addEventListener('keydown', ev => {
    if (ev.code==='Space') { space = true; }
    if ((ev.key==='Delete' || ev.key==='Backspace') && state.page==='canvas' && ev.target.tagName!=='TEXTAREA' && ev.target.tagName!=='INPUT') {
      ev.preventDefault(); delSelected();
    }
  });
  document.addEventListener('keyup', ev => { if (ev.code==='Space') space = false; });
  document.addEventListener('click', hideCtx);
  window.__cvAddImage = (path) => { addNode('image', 80, 280); project.nodes[project.nodes.length-1].path = path; persist(); render(); };
  window.__cvAddFile = async (file) => {
    await ingestFiles([file]);
    const path = state.lastImages[state.lastImages.length-1];
    if (path) window.__cvAddImage(path);
  };
  stage.addEventListener('dragover', ev => ev.preventDefault());
  stage.addEventListener('drop', async ev => {
    ev.preventDefault();
    const files = Array.from(ev.dataTransfer.files||[]);
    for (const f of files) await window.__cvAddFile(f);
  });
  render();
})();
(async () => {
  const meta = await api('/meta');
  renderSkills(meta.skills||[]);
  const providers = meta.providers||[];
  if (!providers.length) setStatus('还没有渠道。到插件设置填地址和密钥，保存后再「检测可用模型」。');
  else setStatus(providers.some(p=>String(p.id).includes('mock')) ? 'mock 已连接 · 可直接出图' : '已连接 '+providers.length+' 个渠道');
  renderHist();
  renderGallery();
  sync();
})();
</script>
</body>
</html>`
}
