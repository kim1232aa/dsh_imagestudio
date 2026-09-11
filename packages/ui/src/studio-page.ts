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
:root{--bg:#12110e;--panel:#1b1a16;--ink:#efece3;--muted:#9a9486;--line:rgba(255,255,255,.08);--accent:#e8e4d4;--warn:#c45c26;--ok:#8aa36b;}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:14px/1.45 ui-sans-serif,system-ui,sans-serif}
body{display:flex;flex-direction:column;min-width:0}
header{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line);flex-wrap:nowrap;min-width:0;overflow:auto}
header b{letter-spacing:.04em;white-space:nowrap}
.modes{display:flex;gap:6px;flex-wrap:wrap;min-width:0}
.modes button,.chip,button.primary,select,textarea,input{font:inherit;color:inherit}
.modes button,.chip{background:transparent;border:1px solid var(--line);border-radius:999px;padding:4px 10px;cursor:pointer}
.modes button[data-on],.chip[data-on]{background:var(--accent);color:#16140f;border-color:var(--accent)}
.wrap{flex:1;display:grid;grid-template-columns:minmax(240px,320px) minmax(0,1fr);min-height:0;min-width:0}
aside{border-right:1px solid var(--line);padding:14px;overflow:auto;background:var(--panel);min-width:0}
main.stage{padding:16px;overflow:auto;min-width:0}
label{display:block;color:var(--muted);font-size:12px;margin:10px 0 4px}
textarea{width:100%;min-height:120px;background:#11100d;border:1px solid var(--line);border-radius:10px;padding:10px;resize:vertical}
.row{display:flex;gap:8px;flex-wrap:wrap}
button.primary{width:100%;margin-top:14px;height:40px;border:0;border-radius:10px;background:var(--accent);color:#16140f;font-weight:650;cursor:pointer}
button.primary:disabled{opacity:.5}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.card{background:#181712;border:1px solid var(--line);border-radius:12px;overflow:hidden;min-height:120px}
.card img{width:100%;display:block;background:#000;aspect-ratio:21/9;object-fit:cover}
.card .cap{padding:8px 10px;color:var(--muted);font-size:12px}
.note{color:var(--muted);font-size:12px}
pre{white-space:pre-wrap;background:#0e0d0b;border-radius:10px;padding:10px;border:1px solid var(--line);font-size:12px}
.skills{display:flex;flex-direction:column;gap:6px}
.skill{text-align:left;background:#14130f;border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer}
.skill[data-on]{border-color:var(--accent)}
.skill small{display:block;color:var(--muted)}
.fail{display:none;margin:0 0 12px;padding:10px 12px;border:1px solid var(--warn);border-radius:10px;color:#f0c2a4;background:#2a1810}
.fail[data-on]{display:block}
details.plan{margin-top:14px;color:var(--muted);font-size:12px}
details.plan pre{margin:8px 0 0}
html[data-embed="1"] header{padding:8px 12px}
html[data-embed="1"] .wrap{grid-template-columns:minmax(200px,280px) minmax(0,1fr)}
a.back{color:inherit;margin-left:auto;white-space:nowrap}
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
  <span class="note" id="status">连接中…</span>
  <a class="back" href="/">对话</a>
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
  <label>灵感</label>
  <div class="row" id="insp">
    <button class="chip" data-brief="明代科举舞弊案，夜审、账房、放榜。">夜审三联</button>
    <button class="chip" data-brief="雨后窗边人像，保留脸，只加胶片质感。">窗边人像</button>
    <button class="chip" data-brief="角色卡：青衫书吏，推开账房门。">书吏选角</button>
    <button class="chip" data-brief="做成游戏宣传图，要过度油腻 AI 光效。">游戏CG应拒</button>
  </div>
</aside>
<main class="stage">
  <div class="fail" id="fail"></div>
  <div class="grid" id="grid"></div>
  <details class="plan" id="planbox" hidden><summary>策划摘要（默认折叠）</summary><pre id="log"></pre></details>
</main>
</div>
<script>
const state = { mode:'txt', skillId:'cinema-dna-21x9x3', ratio:'21:9', lockRatio:true, n:1, providerId:'', plan:null, lastImages:[] };
const SKILL_COPY = {
  'cinema-dna-21x9x3': '21:9 电影三联，8–12px 黑缝，导演判断先于出图',
  'life-force-portrait': 'MODE A 保身份的人像质感升级',
  'photography-simulation': '相机/胶片约束的摄影模拟',
  'movie-poster': '3:4 海报；仅当用户要海报/封面/片名',
  'character-casting': '角色卡注入动作句'
};
const GO = { txt:'开始生成', img:'图生图', skill:'开始策划', describe:'反推这张', compose:'拼三联', assets:'刷新素材' };
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
function showFail(msg){
  const el=$('fail');
  if(!msg){ el.removeAttribute('data-on'); el.textContent=''; return }
  el.setAttribute('data-on','1'); el.textContent=msg;
}
function showLog(v){
  const box=$('planbox'); const el=$('log');
  if(!v){ box.hidden=true; el.textContent=''; return }
  box.hidden=false;
  el.textContent = typeof v==='string'?v:JSON.stringify(v,null,2);
}
function addCard(src, cap){
  const card=document.createElement('div'); card.className='card';
  const img=document.createElement('img'); img.src=src; img.alt=cap;
  const p=document.createElement('div'); p.className='cap'; p.textContent=cap;
  card.append(img,p); $('grid').prepend(card);
}
function syncChips(){
  document.querySelectorAll('#ratios .chip').forEach(b=>b.toggleAttribute('data-on', b.dataset.ratio===state.ratio));
  document.querySelectorAll('#counts .chip').forEach(b=>b.toggleAttribute('data-on', Number(b.dataset.n)===state.n));
  document.querySelectorAll('#modes button').forEach(b=>b.toggleAttribute('data-on', b.dataset.mode===state.mode));
  document.querySelectorAll('.skill').forEach(b=>b.toggleAttribute('data-on', b.dataset.skill===state.skillId));
  $('go').textContent = GO[state.mode] || '开始生成';
}
function renderSkills(list){
  $('skills').innerHTML='';
  (list||[]).forEach(s=>{
    const b=document.createElement('button');
    b.className='skill'; b.dataset.skill=s.id;
    b.innerHTML='<b>'+s.id+'</b><small>'+(SKILL_COPY[s.id]||s.title||'')+'</small>';
    b.onclick=()=>{
      state.skillId=s.id;
      state.lockRatio = s.id==='cinema-dna-21x9x3';
      if(state.lockRatio) state.ratio='21:9';
      if(s.id==='life-force-portrait' || s.id==='movie-poster' || s.id==='character-casting') state.ratio='3:4';
      if(s.id==='photography-simulation') state.ratio='3:2';
      syncChips();
    };
    $('skills').append(b);
  });
  syncChips();
}
async function boot(){
  try{
    const meta=await api('/meta');
    renderSkills(meta.skills||[]);
    const sel=$('provider');
    (meta.providers||[]).forEach(p=>{
      const o=document.createElement('option'); o.value=p.id; o.textContent=p.id+' · '+(p.model||p.protocol||'');
      sel.append(o);
    });
    state.providerId=sel.value;
    setStatus('mock 已连接 · 五个 skill');
  }catch(e){ setStatus('未连上宿主'); showLog(String(e)); }
}
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{ state.mode=b.dataset.mode; syncChips(); });
document.querySelectorAll('#ratios .chip').forEach(b=>b.onclick=()=>{
  if(state.lockRatio && state.skillId==='cinema-dna-21x9x3'){ state.ratio='21:9'; syncChips(); return }
  state.ratio=b.dataset.ratio; syncChips();
});
document.querySelectorAll('#counts .chip').forEach(b=>b.onclick=()=>{state.n=Number(b.dataset.n);syncChips()});
document.querySelectorAll('#insp .chip').forEach(b=>b.onclick=()=>{ $('brief').value=b.dataset.brief||''; });
$('provider').onchange=e=>state.providerId=e.target.value;
$('go').onclick=async()=>{
  const brief=$('brief').value.trim();
  showFail('');
  if((state.mode==='txt' || state.mode==='skill' || state.mode==='img') && !brief){
    showFail('先写 brief'); setStatus('先写 brief'); return;
  }
  $('go').disabled=true; setStatus('处理中…');
  try{
    if(state.mode==='skill'){
      const planned = await api('/plan', { skillId: state.skillId, brief, wantPoster: state.skillId==='movie-poster' });
      showLog({ score:planned.score, passed:planned.passed, failures:planned.failures, shots:planned.plan?.shots?.map(s=>({id:s.id,ratio:s.aspectRatio})) });
      if(planned.passed===false){ showFail('未过检 '+planned.score+' · '+(planned.failures||[]).join('；')); setStatus('未过检 '+planned.score); return }
      state.plan=planned.plan;
      setStatus('策划完成 · '+planned.score);
    } else if(state.mode==='txt'){
      const planned = await api('/plan', { skillId: state.skillId, brief, wantPoster: state.skillId==='movie-poster' });
      showLog({ score:planned.score, passed:planned.passed, failures:planned.failures, planId:planned.planId });
      if(planned.passed===false){ showFail('未过检 '+planned.score+' · '+(planned.failures||[]).join('；')); setStatus('未过检 '+planned.score); return }
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
        (out.images||[]).forEach((img)=>{
          if(img.path) state.lastImages.push(img.path);
          addCard('/imagestudio/api/file?path='+encodeURIComponent(img.path), (shot?.id||'shot')+' · '+(out.providerId||''));
        });
        if(out.blocked) showFail('拦截：'+out.reason);
        if(out.passed===false) showFail('分数不足 '+out.score+'，不出图');
      }
      if(state.skillId==='cinema-dna-21x9x3' && planned.plan?.shots?.length>=3){
        setStatus('可在「三联」里把三镜拼起来');
      } else setStatus('完成');
    } else if(state.mode==='assets'){
      const data=await api('/assets');
      showLog({ sessions:Object.keys(data.index||{}), count:(data.images||[]).length });
      (data.images||[]).forEach(img=>{
        addCard('/imagestudio/api/file?path='+encodeURIComponent(img.path), (img.task||'').slice(0,8));
      });
      setStatus('素材 '+(data.images||[]).length+' 张');
    } else if(state.mode==='compose'){
      const assets=state.lastImages.slice(-3);
      if(assets.length<2){ showFail('先出至少两张再三联'); setStatus('先出图'); return }
      const out=await api('/compose',{ mode:'triptych', assets, gap:10, ratios:'1:1:1' });
      (out.images||[]).forEach(img=>addCard('/imagestudio/api/file?path='+encodeURIComponent(img.path),'triptych'));
      setStatus('三联完成');
    } else if(state.mode==='describe'){
      if(!state.lastImages.length){ showFail('先出图再反推'); setStatus('先出图'); return }
      const out=await api('/describe',{ assets:state.lastImages.slice(-1) });
      showLog(out.text||out); setStatus('反推完成');
    } else if(state.mode==='img'){
      if(!state.lastImages.length){ showFail('先有一张底图再图生图'); setStatus('先出图'); return }
      const out=await api('/edit',{ prompt:brief, assets:state.lastImages.slice(-1), aspectRatio:state.ratio, n:1, providerId:state.providerId });
      (out.images||[]).forEach(img=>{
        if(img.path) state.lastImages.push(img.path);
        addCard('/imagestudio/api/file?path='+encodeURIComponent(img.path),'edit');
      });
      setStatus('图生图完成');
    } else {
      showFail('未知模式');
    }
  }catch(e){ setStatus('失败'); showFail(String(e)); }
  finally{ $('go').disabled=false }
};
boot();
</script>
</body></html>`
}
