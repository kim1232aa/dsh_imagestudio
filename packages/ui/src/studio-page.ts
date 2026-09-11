/** Original Image Studio workbench page. Nova-like IA + FANTASY skills. Not VisioWork source. */
export function studioPage(opts: { embed?: boolean }): string {
  const embedAttr = opts.embed ? ' data-embed="1"' : ''
  return `<!doctype html>
<html lang="zh-CN"${embedAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Image Studio</title>
<style>
:root{--bg:#12110e;--panel:#1b1a16;--ink:#efece3;--muted:#9a9486;--line:rgba(255,255,255,.08);--accent:#e8e4d4;--warn:#c45c26;}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:14px/1.45 ui-sans-serif,system-ui,sans-serif}
body{display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--line)}
header b{letter-spacing:.04em}
.modes{display:flex;gap:6px;margin-left:8px;flex-wrap:wrap}
.modes button,.chip,button.primary,select,textarea,input{font:inherit;color:inherit}
.modes button,.chip{background:transparent;border:1px solid var(--line);border-radius:999px;padding:4px 10px;cursor:pointer}
.modes button[data-on],.chip[data-on]{background:var(--accent);color:#16140f;border-color:var(--accent)}
.wrap{flex:1;display:grid;grid-template-columns:320px 1fr;min-height:0}
aside{border-right:1px solid var(--line);padding:14px;overflow:auto;background:var(--panel)}
main.stage{padding:16px;overflow:auto}
label{display:block;color:var(--muted);font-size:12px;margin:10px 0 4px}
textarea{width:100%;min-height:120px;background:#11100d;border:1px solid var(--line);border-radius:10px;padding:10px;resize:vertical}
.row{display:flex;gap:8px;flex-wrap:wrap}
.chip{margin:0}
button.primary{width:100%;margin-top:14px;height:40px;border:0;border-radius:10px;background:var(--accent);color:#16140f;font-weight:650;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.card{background:#181712;border:1px solid var(--line);border-radius:12px;overflow:hidden;min-height:120px}
.card img{width:100%;display:block;background:#000}
.card .cap{padding:8px 10px;color:var(--muted);font-size:12px}
.note{color:var(--muted);font-size:12px}
pre{white-space:pre-wrap;background:#0e0d0b;border-radius:10px;padding:10px;border:1px solid var(--line);font-size:12px}
.skills{display:flex;flex-direction:column;gap:6px}
.skill{text-align:left;background:#14130f;border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer}
.skill[data-on]{border-color:var(--accent)}
.skill small{display:block;color:var(--muted)}
</style>
</head>
<body>
<header>
  <b>IMAGE STUDIO</b>
  <nav class="modes" id="modes">
    <button data-mode="txt" data-on>文生图</button>
    <button data-mode="img">图生图</button>
    <button data-mode="skill">Skill 策划</button>
    <button data-mode="describe">反推</button>
    <button data-mode="compose">三联</button>
    <button data-mode="assets">素材</button>
  </nav>
  <span class="note" id="status" style="margin-left:auto">连接中…</span>
</header>
<div class="wrap">
<aside>
  <div class="skills" id="skills"></div>
  <label>画面说明 / Brief</label>
  <textarea id="brief" placeholder="例：明代科举舞弊案，夜审、账房、放榜。cinema-dna 会锁 21:9 并拆成三联。"></textarea>
  <label>比例</label>
  <div class="row" id="ratios">
    <button class="chip" data-ratio="1:1">1:1</button>
    <button class="chip" data-ratio="3:4">3:4</button>
    <button class="chip" data-ratio="16:9">16:9</button>
    <button class="chip" data-ratio="21:9" data-on>21:9</button>
  </div>
  <label>张数</label>
  <div class="row" id="counts">
    <button class="chip" data-n="1" data-on>1</button>
    <button class="chip" data-n="2">2</button>
    <button class="chip" data-n="3">3</button>
    <button class="chip" data-n="4">4</button>
  </div>
  <label>模型</label>
  <select id="provider" style="width:100%;height:34px;background:#11100d;border:1px solid var(--line);border-radius:8px"></select>
  <button class="primary" id="go">开始生成</button>
  <p class="note" id="hint">Skill 会先 image_skill_plan，再按镜头出图。cinema-dna 低于 82 分不出图。</p>
</aside>
<main class="stage">
  <div class="grid" id="grid"></div>
  <pre id="log" hidden></pre>
</main>
</div>
<script>
const state = { mode:'txt', skillId:'cinema-dna-21x9x3', ratio:'21:9', n:1, providerId:'', plan:null };
const SKILL_COPY = {
  'cinema-dna-21x9x3': '21:9 电影三联，8–12px 黑缝，导演判断先于出图',
  'life-force-portrait': 'MODE A 保身份的人像质感升级',
  'photography-simulation': '相机/胶片约束的摄影模拟',
  'movie-poster': '3:4 海报；仅当用户要海报/封面/片名',
  'character-casting': '角色卡注入动作句'
};
function $(id){return document.getElementById(id)}
async function api(path, body){
  const res = await fetch('/imagestudio/api'+path, {
    method: body ? 'POST' : 'GET',
    headers: body ? {'content-type':'application/json'} : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
function setStatus(t){ $('status').textContent = t }
function showLog(v){ const el=$('log'); el.hidden=!v; el.textContent = typeof v==='string'?v:JSON.stringify(v,null,2) }
function renderSkills(list){
  const box=$('skills'); box.innerHTML='';
  (list.length?list:Object.keys(SKILL_COPY).map(id=>({preset:{id}}))).forEach(s=>{
    const id=s.preset?.id||s.id;
    const b=document.createElement('button');
    b.className='skill';
    if(id===state.skillId) b.setAttribute('data-on','');
    b.innerHTML='<b>'+id+'</b><small>'+(SKILL_COPY[id]||'')+'</small>';
    b.onclick=()=>{
      state.skillId=id;
      if(id==='cinema-dna-21x9x3') state.ratio='21:9';
      if(id==='movie-poster' || id==='life-force-portrait') state.ratio='3:4';
      syncChips(); renderSkills(list);
    };
    box.appendChild(b);
  });
}
function syncChips(){
  document.querySelectorAll('#ratios .chip').forEach(b=>b.toggleAttribute('data-on', b.dataset.ratio===state.ratio));
  document.querySelectorAll('#counts .chip').forEach(b=>b.toggleAttribute('data-on', Number(b.dataset.n)===state.n));
}
function addCard(src, cap){
  const c=document.createElement('article');
  c.className='card';
  c.innerHTML=(src?'<img alt="" src="'+src+'"/>':'')+'<div class="cap">'+(cap||'')+'</div>';
  $('grid').prepend(c);
}
async function boot(){
  try{
    const meta = await api('/meta');
    renderSkills(meta.skills||[]);
    const sel=$('provider'); sel.innerHTML='';
    (meta.providers||[]).forEach(p=>{
      const o=document.createElement('option');
      o.value=p.id; o.textContent=p.id+' · '+(p.model||p.protocol);
      sel.appendChild(o);
    });
    if(meta.providers?.[0]) state.providerId=meta.providers[0].id;
    setStatus('已连接 · '+(meta.providers||[]).map(p=>p.id).join('/') );
  }catch(e){ setStatus('未连上 API'); showLog(String(e)) }
}
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{
  state.mode=b.dataset.mode;
  document.querySelectorAll('#modes button').forEach(x=>x.toggleAttribute('data-on', x===b));
});
document.querySelectorAll('#ratios .chip').forEach(b=>b.onclick=()=>{state.ratio=b.dataset.ratio;syncChips()});
document.querySelectorAll('#counts .chip').forEach(b=>b.onclick=()=>{state.n=Number(b.dataset.n);syncChips()});
$('provider').onchange=e=>state.providerId=e.target.value;
$('go').onclick=async()=>{
  const brief=$('brief').value.trim();
  if(!brief){ showLog('先写 brief'); return }
  $('go').disabled=true; setStatus('生成中…');
  try{
    if(state.mode==='skill' || state.mode==='txt'){
      const planned = await api('/plan', { skillId: state.skillId, brief, wantPoster: state.skillId==='movie-poster' });
      showLog(planned);
      if(planned.passed===false){ setStatus('未过检 '+planned.score); return }
      state.plan=planned.plan;
      const shots = planned.plan?.shots?.length ? planned.plan.shots : [null];
      for (const shot of shots){
        const out = await api('/generate', {
          planId: planned.planId,
          shotId: shot?.id,
          prompt: shot?undefined:brief,
          aspectRatio: state.ratio,
          n: shot?1:state.n,
          providerId: state.providerId
        });
        (out.images||[]).forEach((img,i)=>addCard('/imagestudio/api/file?path='+encodeURIComponent(img.path), (shot?.id||'shot')+' · '+(out.providerId||'')));
        if(out.blocked) setStatus('拦截：'+out.reason);
        if(out.passed===false) setStatus('分数不足 '+out.score);
      }
      if(state.skillId==='cinema-dna-21x9x3' && planned.plan?.shots?.length>=3){
        setStatus('可在「三联」里把三镜拼起来');
      } else setStatus('完成');
    } else if(state.mode==='assets'){
      const data=await api('/assets'); showLog(data);
      setStatus('素材索引');
    } else {
      showLog('当前模式请先在文生图/Skill 策划里出图，再切三联或反推。');
    }
  }catch(e){ setStatus('失败'); showLog(String(e)) }
  finally{ $('go').disabled=false }
};
boot();
</script>
</body></html>`
}
