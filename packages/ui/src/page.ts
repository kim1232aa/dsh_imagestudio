/** Original Image Studio workbench HTML. Not derived from Nova or VisioWork source. */
export function studioPage(opts: { embed?: boolean } = {}): string {
  const embed = Boolean(opts.embed)
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Image Studio · DeepSeek Harness</title>
<style>
:root{--bg:#111214;--panel:#1a1b1e;--line:#2a2c31;--text:#e8e6e1;--dim:#9a958c;--accent:#c4a574;--ok:#7d9a6e}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font:14px/1.45 ui-sans-serif,system-ui,sans-serif}
.app{display:grid;grid-template-columns:280px 360px 1fr;height:100%}
.rail,.form,.stage{border-right:1px solid var(--line);min-height:100%;overflow:auto}
.stage{border-right:0}
.rail,.form{background:var(--panel);padding:16px}
h1{font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin:0 0 16px}
.tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.tabs button,.chip{background:#111214;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:6px 10px;cursor:pointer}
.tabs button.on,.chip.on{border-color:var(--accent);color:var(--accent)}
label{display:block;color:var(--dim);font-size:12px;margin:10px 0 4px}
textarea,select,input[type=text]{width:100%;background:#111214;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:10px}
textarea{min-height:120px;resize:vertical}
.row{display:flex;flex-wrap:wrap;gap:6px}
.go{width:100%;margin-top:16px;padding:12px;border:0;border-radius:10px;background:var(--text);color:#111;font-weight:600;cursor:pointer}
.go:disabled{opacity:.5}
.hist{display:flex;flex-direction:column;gap:8px}
.hist a{display:flex;gap:8px;color:var(--text);text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:6px}
.hist img{width:48px;height:48px;object-fit:cover;border-radius:4px;background:#000}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:20px}
.grid figure{margin:0;background:#16171a;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.grid img{width:100%;display:block;background:#000}
.grid figcaption{padding:8px 10px;color:var(--dim);font-size:12px}
.bar{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid var(--line)}
.note{color:var(--dim);font-size:12px;margin-top:8px}
.plan{white-space:pre-wrap;font-size:12px;background:#111214;border:1px solid var(--line);border-radius:8px;padding:10px;max-height:220px;overflow:auto}
</style>
</head>
<body>
<div class="app">
  <aside class="rail">
    <h1>Image Studio</h1>
    <div class="note">DeepSeek Harness 插件工作台 · Nova 交互 + FANTASY skills</div>
    <label>历史</label>
    <div class="hist" id="hist"></div>
  </aside>
  <section class="form">
    <div class="tabs" id="modes">
      <button data-m="t2i" class="on">文生图</button>
      <button data-m="i2i">图生图</button>
      <button data-m="skill">Skill 策划</button>
      <button data-m="desc">反推</button>
      <button data-m="compose">三联</button>
    </div>
    <label>Skill</label>
    <select id="skill"></select>
    <label>简报 / 提示词</label>
    <textarea id="brief" placeholder="例如：明代科举舞弊案，先出三联镜头"></textarea>
    <label>画幅</label>
    <div class="row" id="ratios">
      ${['21:9','16:9','3:4','1:1','9:16','4:3'].map((r,i)=>`<button class="chip${i===0?' on':''}" data-r="${r}">${r}</button>`).join('')}
    </div>
    <label>张数</label>
    <div class="row" id="counts">
      ${[1,2,3,4].map((n)=>`<button class="chip${n===1?' on':''}" data-n="${n}">${n} 张</button>`).join('')}
    </div>
    <label class="i2i-only" style="display:none">参考图路径（工作区内）</label>
    <input class="i2i-only" id="ref" type="text" style="display:none" placeholder=".dsh/image-studio/.../shot.png"/>
    <button class="go" id="go">开始生成</button>
    <div class="note" id="status">就绪 · mock provider 可离线出图</div>
    <div class="plan" id="plan" hidden></div>
  </section>
  <main>
    <div class="bar">
      <strong id="title">灵感 / 结果</strong>
      ${embed ? '<span style="color:var(--dim)">embed</span>' : '<a href="/" style="color:var(--accent)">返回对话</a>'}
    </div>
    <div class="grid" id="grid"></div>
  </main>
</div>
<script>
const $ = (id) => document.getElementById(id);
let mode = 't2i', ratio = '21:9', count = 1, lastPlan = null;
const SKILL_HINT = {
  'cinema-dna-21x9x3': '21:9 三联。点开始会先策划再逐镜出图，最后竖向拼接。',
  'life-force-portrait': '生活照升级。图生图时走 identity-preserving。',
  'photography-simulation': '摄影模拟：机位、镜头、现场光。',
  'movie-poster': '仅在用户要海报/封面时用 3:4。',
  'character-casting': '角色选角与一致性描述。'
};
function api(path, body){
  return fetch('/imagestudio/api'+path, {
    method: body ? 'POST' : 'GET',
    headers: body ? {'content-type':'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined
  }).then(r => r.json());
}
function fileUrl(p){ return '/imagestudio/api/file?path='+encodeURIComponent(p); }
$('modes').onclick = (e) => {
  const b = e.target.closest('button'); if(!b) return;
  mode = b.dataset.m;
  [...$('modes').children].forEach(x => x.classList.toggle('on', x===b));
  document.querySelectorAll('.i2i-only').forEach(el => el.style.display = (mode==='i2i'||mode==='desc'||mode==='compose') ? '' : 'none');
};
$('ratios').onclick = (e) => {
  const b = e.target.closest('button'); if(!b) return;
  ratio = b.dataset.r;
  [...$('ratios').children].forEach(x => x.classList.toggle('on', x===b));
};
$('counts').onclick = (e) => {
  const b = e.target.closest('button'); if(!b) return;
  count = Number(b.dataset.n);
  [...$('counts').children].forEach(x => x.classList.toggle('on', x===b));
};
function showImages(items){
  $('grid').innerHTML = (items||[]).map(it =>
    '<figure><img src="'+fileUrl(it.path)+'" alt=""/><figcaption>'+
    (it.label||it.path)+'</figcaption></figure>').join('') || '<div class="note" style="padding:20px">还没有结果</div>';
}
async function refresh(){
  const data = await api('/meta');
  $('skill').innerHTML = (data.skills||[]).map(s =>
    '<option value="'+s.id+'">'+s.id+' · v'+s.version+'</option>').join('');
  const hist = await api('/assets');
  const items = [];
  const index = hist.index || {};
  for (const session of Object.keys(index)) {
    for (const task of index[session] || []) {
      items.push({ path: '.dsh/image-studio/'+session+'/'+task, label: session+'/'+task });
    }
  }
  $('hist').innerHTML = items.slice(0,20).map(h =>
    '<a href="'+fileUrl(h.path)+'" target="_blank"><span>'+(h.label||h.path)+'</span></a>'
  ).join('') || '<div class="note">暂无历史</div>';
}
$('skill').onchange = () => { $('status').textContent = SKILL_HINT[$('skill').value] || '就绪'; };
$('go').onclick = async () => {
  const brief = $('brief').value.trim();
  if(!brief && mode!=='compose' && mode!=='desc'){ $('status').textContent='请先写简报'; return; }
  $('go').disabled = true; $('status').textContent = '进行中…';
  try {
    const skillId = $('skill').value;
    if(mode==='skill' || mode==='t2i' && skillId){
      const planned = await api('/plan', { skillId, brief, wantPoster: /海报|封面|片名/.test(brief) });
      lastPlan = planned.plan || null;
      $('plan').hidden = false;
      $('plan').textContent = JSON.stringify({passed:planned.passed, score:planned.score, shots:(planned.plan&&planned.plan.shots||[]).map(s=>s.id+' '+s.aspectRatio)}, null, 2);
      if(planned.passed === false){ $('status').textContent = '未过门禁 '+planned.score; return; }
      if(mode==='skill'){ $('status').textContent = '策划完成 '+planned.planId; await refresh(); return; }
      const gen = await api('/generate', { planId: planned.planId, n: count });
      const imgs = (gen.images||[]).map((p,i)=>({path:p.path||p, label:'shot '+(i+1)}));
      if(skillId==='cinema-dna-21x9x3' && imgs.length>=2){
        const composed = await api('/compose', { mode:'triptych', assets: imgs.map(i=>i.path) });
        if(composed.path) imgs.push({path:composed.path, label:'三联'});
      }
      showImages(imgs); $('status').textContent = '完成';
    } else if(mode==='i2i'){
      const out = await api('/edit', { prompt: brief, assets: [$('ref').value].filter(Boolean), aspectRatio: ratio });
      showImages((out.images||[]).map(p=>({path:p.path||p,label:'edit'})));
      $('status').textContent = '完成';
    } else if(mode==='desc'){
      const out = await api('/describe', { assets: [$('ref').value].filter(Boolean), instruction: brief||'composition' });
      $('plan').hidden=false; $('plan').textContent = out.text || JSON.stringify(out,null,2);
      $('status').textContent = '反推完成';
    } else if(mode==='compose'){
      const out = await api('/compose', { mode:'triptych', assets: $('ref').value.split(',').map(s=>s.trim()).filter(Boolean) });
      showImages(out.path ? [{path:out.path,label:'三联'}] : []);
      $('status').textContent = '拼接完成';
    } else {
      const out = await api('/generate', { prompt: brief, aspectRatio: ratio, n: count });
      showImages((out.images||[]).map((p,i)=>({path:p.path||p,label:'gen '+(i+1)})));
      $('status').textContent = '完成';
    }
    await refresh();
  } catch(err){
    $('status').textContent = String(err.message||err);
  } finally {
    $('go').disabled = false;
  }
};
refresh();
</script>
</body>
</html>`;
}
