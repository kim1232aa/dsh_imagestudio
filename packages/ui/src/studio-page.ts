/** Image Studio workbench. VisioWork-like IA + FANTASY skills. Not VisioWork source. */
import { uiDesignHtml, uiDesignJs } from './ui-design.ts'

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
.grid.masonry{display:block;column-count:4;column-gap:14px}
.grid.masonry .card{break-inside:avoid;margin-bottom:14px}
@media (max-width:1400px){.grid.masonry{column-count:3}}
@media (max-width:900px){.grid.masonry{column-count:2}}
.galtag{display:inline-block;padding:1px 8px;margin:2px 3px 0 0;border:1px solid var(--line);border-radius:999px;font-size:11px;color:var(--ink);cursor:pointer}
.galtag:hover{border-color:var(--accent)}
.galtag .x{margin-left:4px;color:#a33;cursor:pointer}
.galcheck{position:absolute;top:8px;left:8px;width:18px;height:18px;z-index:3;accent-color:var(--accent)}
#gallery .card{position:relative}
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
  <a class="ghost" id="backHome" href="/" style="display:inline-flex;align-items:center;gap:4px;padding:0 12px;height:32px;text-decoration:none;flex:none">← 返回会话</a>
  <b>Image Studio</b>
  <nav class="tabs" id="tabs">
    <button data-page="gen" data-on>普通生图</button>
    <button data-page="gallery">画廊</button>
    <button data-page="canvas">无限画布</button>
    <button data-page="ecom">电商</button>
    <button data-page="tpl">模板库</button>
    <button data-page="uidesign">UI 设计</button>
    <button data-page="settings">设置</button>
  </nav>
  <div class="right">
    <a class="ghost" id="backChat" href="/" style="display:inline-flex;align-items:center;padding:0 12px;height:32px;text-decoration:none">回对话</a>
    <button class="ghost" id="toggleChat">对话</button>
    <span class="note" id="status">准备就绪</span>
  </div>
</header>

<section class="page" data-page="gen" data-on>
  <div class="cols" id="cols">
    <aside>
      <label>历史记录</label>
      <input id="histSearch" placeholder="搜索提示词 / 比例"/>
      <button class="ghost" id="histClear" style="margin:0 0 8px">清空历史（不删文件）</button>
      <div class="hist" id="hist"><p class="note">还没有记录。生成后会出现在这里。</p></div>
      <label>创作 Skill</label>
      <div id="skills"></div>
      <p class="note">把 skill 目录放到插件 skills/ 后会出现。不选就是普通生图。</p>
    </aside>
    <main class="stage">
      <p class="banner" id="channelHint"><b>当前是 mock 预览渠道</b> · 出的是概念板，不是成片。点顶部「设置」填真实模型地址和密钥环境变量名（值放宿主 <code>$DSH_HOME/.credentials.yaml</code>）。</p>
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
  <div class="empty" style="max-width:none;text-align:left">
    <h3>画廊</h3>
    <p id="galEmpty">从结果卡点「加入画廊」。按内容去重，不自动删图。</p>
    <div class="row" style="flex-wrap:wrap;gap:6px;margin:8px 0" id="galToolbar">
      <input id="galSearch" placeholder="搜提示词 / 标题 / 标签" style="flex:1;min-width:160px"/>
      <select id="galMode"><option value="">全部模式</option></select>
      <select id="galModel"><option value="">全部模型</option></select>
      <select id="galRatio"><option value="">全部比例</option></select>
      <select id="galTag"><option value="">全部标签</option></select>
      <select id="galSort"><option value="new">最新在前</option><option value="old">最早在前</option></select>
      <button class="ghost" id="galView">瀑布流</button>
      <button class="ghost" id="galBatch">批量管理</button>
    </div>
    <div class="row" id="galBatchBar" style="display:none;flex-wrap:wrap;gap:6px;margin-bottom:8px;padding:6px;border:1px dashed var(--line)">
      <span class="note" id="galBatchCount">已选 0 张</span>
      <input id="galBatchTag" placeholder="标签名" style="width:110px"/>
      <button class="ghost" id="galBatchAdd">批量打标签</button>
      <input id="galBatchOld" placeholder="旧标签" style="width:90px"/>
      <input id="galBatchNew" placeholder="新标签" style="width:90px"/>
      <button class="ghost" id="galBatchRename">重命名标签</button>
      <button class="ghost" id="galBatchDl">批量下载</button>
    </div>
    <div class="grid" id="gallery"></div>
    <div class="row" style="justify-content:center;margin:10px 0">
      <button class="ghost" id="galMore" style="display:none">加载更多</button>
    </div>
  </div>
</section>

<section class="page" data-page="canvas">
  <div style="display:flex;flex-direction:column;flex:1;min-height:0">
    <div class="row" style="padding:8px 12px;border-bottom:1px solid var(--line)">
      <select id="cvSwitch" title="切换画布"></select>
      <button class="ghost" id="cvNew">新建画布</button>
      <button class="ghost" id="cvRename">重命名</button>
      <button class="ghost" id="cvText">文本</button>
      <button class="ghost" id="cvCfg">配置</button>
      <button class="ghost" id="cvImg">图片</button>
      <button class="ghost" id="cvVid">视频</button>
      <button class="ghost" id="cvSend">发送出图</button>
      <button class="ghost" id="cvFit">适应全部</button>
      <button class="ghost" id="cvDel">删除</button>
      <select id="cvMaskProvider" title="局部重绘渠道（只列支持遮罩编辑的）" style="max-width:150px"></select>
      <span class="note" id="cvHint">开箱已连好文本→配置。滚轮缩放，空格拖动画布，双击/右键建节点，点线可选中删除，Ctrl+Z 撤销，Ctrl+C/V/D 复制粘贴副本，Delete 删除。</span>
    </div>
    <div class="canvas" id="canvas"></div>
    <div id="cvGen" style="display:none;padding:8px 12px;border-top:1px solid var(--line)"></div>
  </div>
</section>

<section class="page" data-page="settings">
  <div class="empty" style="max-width:720px">
    <h3>渠道设置</h3>
    <p class="note">密钥只写环境变量名，不写进浏览器、日志或 plan.json。值放 <code>$DSH_HOME/.credentials.yaml</code>。检测模型由宿主插件配置生效，这里先记下你要用的渠道。</p>
    <p class="banner" id="settingsHint">还没有渠道时，工作台会走内置 mock，仍可直接出图。</p>
    <label>渠道 id</label>
    <input id="chId" placeholder="openai / grok / seedream"/>
    <label>协议</label>
    <select id="chProto">
      <option value="openai-image">OpenAI /images/generations</option>
      <option value="gemini-generate">Gemini / Nano Banana</option>
      <option value="nova-bridge">Nova 桥</option>
      <option value="mock">mock（离线概念板）</option>
    </select>
    <label>模型</label>
    <input id="chModel" placeholder="gpt-image-2"/>
    <label>视频模型（可选，填了该渠道才能出视频）</label>
    <input id="chVideoModel" placeholder="grok-imagine-video"/>
    <label>图生图/编辑模型（可选，填了参考图才真正参与生成）</label>
    <input id="chEditModel" placeholder="grok-imagine-edit"/>
    <label>视觉/反推模型（可选，填了反推与 AI 看图才走真实渠道）</label>
    <input id="chVisionModel" placeholder="grok-4.5"/>
    <label>地址</label>
    <input id="chUrl" placeholder="https://api.openai.com/v1"/>
    <label>密钥环境变量名</label>
    <input id="chEnv" placeholder="IMAGE_STUDIO_KEY"/>
    <div class="row" style="margin-top:12px">
      <button class="primary" id="chSave">保存渠道（本机）</button>
      <button class="ghost" id="chDetect">检测可用模型</button>
    </div>
    <p class="note" id="chDetectOut">检测不会列出纯聊天 / Embedding 模型。未配密钥时会明确说是鉴权问题。</p>
    <ol id="chList" class="note"></ol>
    <label>栏宽（刷新后记住）</label>
    <input id="colWidth" type="range" min="180" max="420" value="260"/>
    <h3 style="margin-top:18px">存储与数据</h3>
    <p class="note" id="storageInfo">存储信息读取中…</p>
    <p class="note">图片和视频存本地 <code>.dsh/image-studio/</code> 目录，文件管理器可直接找到。历史 / 画廊 / 画布 / UI 设计数据分别存在浏览器本地（imagestudio.history / imagestudio.gallery / imagestudio.canvas:* / imagestudio.uidesign）。改存储路径：在宿主插件配置里改 <code>workspaceRoot</code> 后重启，新文件进新目录，旧目录文件原地保留，不会自动删除。</p>
    <div class="row" style="margin-top:8px">
      <button class="ghost" id="bkExport">导出备份（历史 / 画廊 / 画布 / 设置）</button>
      <button class="ghost" id="bkImportBtn">还原备份…</button>
      <input id="bkImport" type="file" accept="application/json,.json" hidden/>
    </div>
    <p class="note" id="bkHint">备份只含浏览器本地数据；图片视频文件本身在存储目录里，直接复制该目录即可一并备份。</p>
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

<section class="page" data-page="tpl">
  <div class="empty" style="max-width:none;text-align:left">
    <h3>模板库</h3>
    <div class="row" style="flex-wrap:wrap;gap:6px;margin:8px 0">
      <select id="tplSource"></select>
      <input id="tplSearch" placeholder="搜标题 / 提示词 / 作者" style="flex:1;min-width:160px"/>
      <button class="ghost" id="tplFavOnly">只看收藏</button>
      <button class="ghost" id="tplCache">缓存图片供离线浏览</button>
    </div>
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px" id="tplCats"></div>
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px;padding:6px;border:1px dashed var(--line)">
      <input id="tplUrl" placeholder="在线清单 URL（JSON），粘贴后点更新" style="flex:1;min-width:220px"/>
      <button class="ghost" id="tplFetch">在线更新</button>
    </div>
    <div class="grid" id="tplGrid"></div>
  </div>
</section>

<div class="lb" id="tplDetail">
  <div class="card" style="max-width:640px;width:92vw;max-height:86vh;overflow:auto;text-align:left">
    <img id="tplDImg" alt="" style="width:100%;display:block;background:#0d0c0a"/>
    <div style="padding:12px 14px">
      <h3 id="tplDTitle" style="margin:0 0 6px"></h3>
      <p class="note" id="tplDMeta"></p>
      <p id="tplDPrompt" style="white-space:pre-wrap;font-size:13px"></p>
      <p class="note" id="tplDNeg" style="white-space:pre-wrap"></p>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <button id="tplDFill">一键回填去生图</button>
        <button class="ghost" id="tplDFav">收藏</button>
        <a class="ghost" id="tplDLink" href="#" target="_blank" rel="noreferrer" style="text-decoration:none;display:inline-flex;align-items:center;padding:0 12px">原链接</a>
        <button class="ghost" id="tplDClose">关闭</button>
      </div>
    </div>
  </div>
</div>

${uiDesignHtml}

<div class="lb" id="lb">
  <div class="stage"><img id="lbImg" alt="" style="display:none"/><video id="lbVid" controls playsinline style="display:none;background:#000;max-width:92vw;max-height:82vh"></video></div>
  <div class="row" style="justify-content:center;gap:6px;margin-top:6px">
    <button class="ghost" id="lbRef">转参考图</button>
    <button class="ghost" id="lbChat">加入对话</button>
    <button class="ghost" id="lbCanvas">加入画布</button>
    <button class="ghost" id="lbGal">加入画廊</button>
  </div>
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
  try { localStorage.setItem('imagestudio.'+key, JSON.stringify(val)); } catch (e) { console.warn('[imagestudio] saveLS failed:', e); }
}
state.gallery = loadLS('gallery', []);
// 旧数据迁移：补 tags / createdAt，让筛选排序对老数据也生效。
// 画廊一直是追加写入，数组顺序就是时间顺序，用它给老数据合成时间戳（最诚实的近似）
state.gallery.forEach((g, i) => { if (g && g.path) { g.tags = g.tags || []; if (!g.createdAt) g.createdAt = i + 1; } });
state.history = loadLS('history', []);
state.channels = loadLS('channels', []);
state.colWidth = loadLS('colWidth', 260);
async function api(path, body, signal){
  let res;
  try {
    res = await fetch('/imagestudio/api'+path, {
      method: body===undefined?'GET':'POST',
      headers: body?{'content-type':'application/json'}:undefined,
      body: body?JSON.stringify(body):undefined,
      signal
    });
  } catch (e) {
    return { error: '网络中断或宿主服务未响应（'+(e && e.message ? e.message : e)+'）。确认 DSH 还在运行，恢复后重试即可。', network: true };
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error:text || ('HTTP '+res.status), status:res.status }; }
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
  if ($('cols') && state.colWidth) $('cols').style.gridTemplateColumns = 'minmax(180px,'+state.colWidth+'px) minmax(0,1fr) '+(state.chat?'minmax(240px,320px)':'0fr');
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
// ---- 画廊 7.1：筛选/搜索/排序/标签/批量/分页 ----
const galUi = { q:'', mode:'', model:'', ratio:'', tag:'', sort:'new', masonry:false, batch:false, sel:{}, limit:100 };
const GAL_MODES = { txt:'文生图', img:'图生图', desc:'反推', gif:'GIF', video:'视频' };
function galModeLabel(m){ return GAL_MODES[m] || m || '未知'; }
function galFiltered(){
  let list = (state.gallery||[]).filter(x => x && x.path);
  if (galUi.mode) list = list.filter(x => (x.mode||'') === galUi.mode);
  if (galUi.model) list = list.filter(x => (x.model||'') === galUi.model);
  if (galUi.ratio) list = list.filter(x => (x.ratio||'') === galUi.ratio);
  if (galUi.tag) list = list.filter(x => (x.tags||[]).indexOf(galUi.tag) >= 0);
  if (galUi.q) {
    const q = galUi.q.toLowerCase();
    list = list.filter(x => (String(x.prompt||'')+' '+String(x.title||'')+' '+(x.tags||[]).join(' ')).toLowerCase().indexOf(q) >= 0);
  }
  list = list.slice().sort((a,b) => galUi.sort==='old' ? (a.createdAt||0)-(b.createdAt||0) : (b.createdAt||0)-(a.createdAt||0));
  return list;
}
function galCounts(key, labelFn){
  const counts = {};
  (state.gallery||[]).forEach(x => {
    if (!x || !x.path) return;
    if (key === 'tags') { (x.tags||[]).forEach(t => { counts[t] = (counts[t]||0)+1; }); return; }
    const v = x[key] || '';
    if (v) counts[v] = (counts[v]||0)+1;
  });
  return Object.keys(counts).sort().map(v => ({ v, n: counts[v], label: labelFn ? labelFn(v) : v }));
}
function galFillSelect(id, allLabel, key, labelFn){
  const selEl = $(id);
  if (!selEl) return;
  const cur = selEl.value;
  const rows = galCounts(key, labelFn);
  selEl.innerHTML = '<option value="">'+allLabel+'</option>'
    + rows.map(r => '<option value="'+escapeHtml(r.v)+'">'+escapeHtml(r.label)+' ('+r.n+')</option>').join('');
  selEl.value = cur;
  if (cur && selEl.value !== cur) { selEl.value=''; galUi[{galMode:'mode',galModel:'model',galRatio:'ratio',galTag:'tag'}[id]] = ''; }
}
function renderGallery(){
  const box = $('gallery');
  if (!box) return;
  galFillSelect('galMode', '全部模式', 'mode', galModeLabel);
  galFillSelect('galModel', '全部模型', 'model');
  galFillSelect('galRatio', '全部比例', 'ratio');
  galFillSelect('galTag', '全部标签', 'tags');
  const list = galFiltered();
  const shown = list.slice(0, galUi.limit);
  box.className = galUi.masonry ? 'grid masonry' : 'grid';
  box.innerHTML = '';
  shown.forEach(img => {
    const d = document.createElement('div');
    d.className = 'card';
    const src = fileSrc(img);
    const isVid = img.mime && String(img.mime).startsWith('video');
    let inner = '';
    if (galUi.batch) inner += '<input type="checkbox" class="galcheck"'+(galUi.sel[img.path]?' checked':'')+'/>';
    inner += (src ? (isVid ? '<video src="'+src+'" muted'+(galUi.batch?'':' controls')+'></video>' : '<img src="'+src+'" alt="">') : '')
      + '<div class="cap">'+(escapeHtml(img.prompt||img.title||prettyName(img)))
      + '<small>'+prettyName(img)+' · '+galModeLabel(img.mode)+' · '+escapeHtml(img.ratio||'自动')+'</small></div>';
    d.innerHTML = inner;
    // 标签条：点击筛选，× 删除，+ 新增
    const tagRow = document.createElement('div');
    tagRow.style.padding = '0 10px 4px';
    (img.tags||[]).forEach(t => {
      const chip = document.createElement('span');
      chip.className = 'galtag';
      chip.innerHTML = escapeHtml(t)+'<span class="x" title="删除标签">×</span>';
      chip.onclick = ev => {
        ev.stopPropagation();
        if ((ev.target).classList.contains('x')) {
          img.tags = (img.tags||[]).filter(x => x !== t);
          saveLS('gallery', state.gallery);
          renderGallery();
        } else {
          galUi.tag = t; galUi.limit = 100; renderGallery();
        }
      };
      tagRow.append(chip);
    });
    const addBtn = document.createElement('span');
    addBtn.className = 'galtag';
    addBtn.textContent = '+';
    addBtn.title = '给这张图加标签';
    addBtn.onclick = ev => {
      ev.stopPropagation();
      const inp = document.createElement('input');
      inp.placeholder = '标签名，回车保存';
      inp.style.cssText = 'width:100px;font-size:11px;padding:1px 6px';
      tagRow.replaceChild(inp, addBtn);
      inp.focus();
      inp.addEventListener('pointerdown', e2 => e2.stopPropagation());
      inp.onkeydown = e2 => {
        if (e2.key !== 'Enter') return;
        const v = inp.value.trim();
        if (v && (img.tags||[]).indexOf(v) < 0) { img.tags = (img.tags||[]).concat([v]); }
        saveLS('gallery', state.gallery);
        renderGallery();
      };
    };
    tagRow.append(addBtn);
    d.append(tagRow);
    if (galUi.batch) {
      const cb = d.querySelector('.galcheck');
      cb.onclick = ev => ev.stopPropagation();
      cb.onchange = () => { if (cb.checked) galUi.sel[img.path] = 1; else delete galUi.sel[img.path]; galBatchCount(); };
      d.style.cursor = 'pointer';
      d.onclick = () => { cb.checked = !cb.checked; cb.onchange(); };
    } else {
      const acts = document.createElement('div');
      acts.className = 'acts';
      acts.append(mkAct('全屏', () => openLb(list, list.indexOf(img))));
      acts.append(mkAct('当参考图', () => { state.lastImages = img.path?[img.path]:[]; state.mode='img'; state.page='gen'; sync(); setStatus('已设为参考图'); }));
      acts.append(mkAct('拿去做视频', () => { state.lastImages = img.path?[img.path]:[]; state.mode='video'; state.page='gen'; sync(); setStatus('已带到视频首帧'); }));
      acts.append(mkAct('加入画布', () => { state.page='canvas'; sync(); window.__cvAddImage && window.__cvAddImage(img.path); }));
      acts.append(mkAct('加入对话', () => { $('chat').value = (($('chat').value||'') + String.fromCharCode(10) + (img.prompt||'')).trim(); state.chat = true; sync(); setStatus('已加入对话'); }));
      d.append(acts);
    }
    box.append(d);
  });
  const more = $('galMore');
  if (more) {
    more.style.display = list.length > galUi.limit ? '' : 'none';
    more.textContent = '加载更多（还剩 ' + (list.length - galUi.limit) + ' 张）';
  }
  const empty = $('galEmpty');
  if (empty) empty.textContent = (state.gallery||[]).length
    ? ('共 ' + (state.gallery||[]).length + ' 张' + (list.length !== (state.gallery||[]).length ? ' · 筛出 ' + list.length + ' 张' : '') + ' · 按内容去重，不自动删图')
    : '从结果卡点「加入画廊」。按内容去重，不自动删图。';
}
function galBatchCount(){
  const n = Object.keys(galUi.sel).length;
  const el = $('galBatchCount');
  if (el) el.textContent = '已选 ' + n + ' 张';
}
function galSelected(){
  return (state.gallery||[]).filter(x => x && x.path && galUi.sel[x.path]);
}
async function imgContentHash(img){
  if (img.hash) return img.hash;
  if (!img.path) return '';
  try {
    const r = await fetch(fileSrc(img));
    if (!r.ok) { console.warn('[imagestudio] hash fetch failed:', r.status, img.path); return ''; }
    const buf = await r.arrayBuffer();
    const d = await crypto.subtle.digest('SHA-256', buf);
    const hex = Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
    img.hash = hex;
    return hex;
  } catch (e) {
    console.warn('[imagestudio] hash compute failed:', e && e.message, img.path);
    return '';
  }
}
async function addGallery(img){
  state.gallery = state.gallery || [];
  const stamped = Object.assign({}, img);
  const h = await imgContentHash(stamped);
  const dup = state.gallery.find(x => x && ((h && x.hash && x.hash === h) || (stamped.path && x.path === stamped.path)));
  if (dup) { setStatus('画廊已有这张（按内容哈希去重）'); return; }
  stamped.createdAt = stamped.createdAt || Date.now();
  stamped.tags = stamped.tags || [];
  stamped.mode = stamped.mode || state.mode || '';
  stamped.ratio = stamped.ratio || state.ratio || '';
  stamped.model = stamped.model || ((state.channels||[])[0]||{}).model || '';
  state.gallery.push(stamped);
  saveLS('gallery', state.gallery);
  renderGallery();
  setStatus('已加入画廊 · '+state.gallery.length+' 张');
}
// 老数据没有 hash 字段，后台分批补齐，之后即可按内容去重
async function galBackfillHashes(){
  const list = (state.gallery||[]).filter(x => x && x.path && !x.hash);
  for (let i = 0; i < list.length; i++) {
    await imgContentHash(list[i]);
    if (i % 5 === 4) saveLS('gallery', state.gallery);
  }
  if (list.length) saveLS('gallery', state.gallery);
}
// 工具栏事件
if ($('galSearch')) {
  $('galSearch').addEventListener('input', ev => { galUi.q = ev.target.value.trim(); galUi.limit = 100; renderGallery(); });
  [['galMode','mode'],['galModel','model'],['galRatio','ratio'],['galTag','tag']].forEach(pair => {
    $(pair[0]).addEventListener('change', ev => { galUi[pair[1]] = ev.target.value; galUi.limit = 100; renderGallery(); });
  });
  $('galSort').addEventListener('change', ev => { galUi.sort = ev.target.value; renderGallery(); });
  $('galView').onclick = () => {
    galUi.masonry = !galUi.masonry;
    $('galView').textContent = galUi.masonry ? '规整网格' : '瀑布流';
    renderGallery();
  };
  $('galMore').onclick = () => { galUi.limit += 100; renderGallery(); };
  $('galBatch').onclick = () => {
    galUi.batch = !galUi.batch;
    galUi.sel = {};
    $('galBatchBar').style.display = galUi.batch ? 'flex' : 'none';
    $('galBatch').style.borderColor = galUi.batch ? 'var(--accent)' : '';
    galBatchCount();
    renderGallery();
  };
  $('galBatchAdd').onclick = () => {
    const v = $('galBatchTag').value.trim();
    if (!v) { setStatus('先填标签名'); return; }
    const sel = galSelected();
    sel.forEach(img => { if ((img.tags||[]).indexOf(v) < 0) img.tags = (img.tags||[]).concat([v]); });
    saveLS('gallery', state.gallery);
    renderGallery();
    setStatus('已给 ' + sel.length + ' 张打上「' + v + '」');
  };
  $('galBatchRename').onclick = () => {
    const o = $('galBatchOld').value.trim(), n2 = $('galBatchNew').value.trim();
    if (!o || !n2) { setStatus('旧标签和新标签都要填'); return; }
    let n = 0;
    (state.gallery||[]).forEach(img => {
      if (!img.tags || img.tags.indexOf(o) < 0) return;
      img.tags = img.tags.map(t => t === o ? n2 : t);
      img.tags = img.tags.filter((t, i) => img.tags.indexOf(t) === i);
      n++;
    });
    if (galUi.tag === o) galUi.tag = n2;
    saveLS('gallery', state.gallery);
    renderGallery();
    setStatus('已把「' + o + '」改名为「' + n2 + '」· 涉及 ' + n + ' 张');
  };
  $('galBatchDl').onclick = () => {
    const sel = galSelected();
    if (!sel.length) { setStatus('先勾选要下载的图'); return; }
    sel.forEach((img, i) => {
      const a = document.createElement('a');
      const name = (img.path||'').split('/').pop() || ('gallery-'+i+'.png');
      a.href = fileSrc(img);
      a.download = name;
      document.body.append(a);
      setTimeout(() => { a.click(); a.remove(); }, i * 300);
    });
    setStatus('开始下载 ' + sel.length + ' 个文件（浏览器可能询问多文件下载权限）');
  };
}
function mkAct(label, fn){
  const b=document.createElement('button'); b.className='ghost'; b.textContent=label; b.onclick=fn; return b;
}
// ---- 模板库 7.7：多来源 / 分类搜索 / 收藏 / 回填 / 在线更新 / 离线缓存 ----
const tplUi = { source:'', cat:'', q:'', favOnly:false };
let tplData = { sources:[], templates:[] };
let tplFavs = loadLS('tplFavs', []);
let tplCur = null;
async function loadTemplates(){
  const r = await api('/templates');
  if (r && r.templates) tplData = r;
  renderTpl();
}
function tplFiltered(){
  let list = tplData.templates || [];
  if (tplUi.source) list = list.filter(t => t.source === tplUi.source);
  if (tplUi.cat) list = list.filter(t => t.category === tplUi.cat);
  if (tplUi.favOnly) list = list.filter(t => tplFavs.indexOf(t.id) >= 0);
  if (tplUi.q) {
    const q = tplUi.q.toLowerCase();
    list = list.filter(t => (String(t.title)+' '+String(t.prompt)+' '+String(t.author||'')+' '+String(t.category||'')).toLowerCase().indexOf(q) >= 0);
  }
  return list;
}
function renderTpl(){
  const grid = $('tplGrid');
  if (!grid) return;
  // 来源切换：各来源独立，带数量
  const srcSel = $('tplSource');
  const curSrc = tplUi.source;
  srcSel.innerHTML = '<option value="">全部来源（'+(tplData.templates||[]).length+'）</option>'
    + (tplData.sources||[]).map(s => '<option value="'+escapeHtml(s.id)+'">'+escapeHtml(s.name)+(s.origin==='remote'?' · 远程':' · 内置')+'（'+(s.count||0)+'）</option>').join('');
  srcSel.value = curSrc;
  // 分类 chips 基于当前来源范围，带数量
  const scoped = (tplData.templates||[]).filter(t => !tplUi.source || t.source === tplUi.source);
  const catCount = {};
  scoped.forEach(t => { const c = t.category||'未分类'; catCount[c] = (catCount[c]||0)+1; });
  const cats = $('tplCats');
  cats.innerHTML = '';
  const allChip = document.createElement('button');
  allChip.className = 'ghost';
  allChip.textContent = '全部（'+scoped.length+'）';
  if (!tplUi.cat) allChip.style.borderColor = 'var(--accent)';
  allChip.onclick = () => { tplUi.cat = ''; renderTpl(); };
  cats.append(allChip);
  Object.keys(catCount).sort().forEach(c => {
    const b = document.createElement('button');
    b.className = 'ghost';
    b.textContent = c + '（' + catCount[c] + '）';
    if (tplUi.cat === c) b.style.borderColor = 'var(--accent)';
    b.onclick = () => { tplUi.cat = c; renderTpl(); };
    cats.append(b);
  });
  // 卡片
  const list = tplFiltered();
  grid.innerHTML = '';
  if (!list.length) grid.innerHTML = '<p class="note">没有匹配的模板'+(tplUi.favOnly?'（收藏为空）':'')+'。</p>';
  list.forEach(t => {
    const d = document.createElement('div');
    d.className = 'card';
    d.style.cursor = 'pointer';
    const fav = tplFavs.indexOf(t.id) >= 0;
    d.innerHTML = (t.preview ? '<img src="'+t.preview+'" alt="" loading="lazy">' : '')
      + '<div class="cap">'+escapeHtml(t.title)
      + '<small>'+escapeHtml(t.category||'')+' · '+escapeHtml(t.author||'未知作者')+(fav?' · ★ 已收藏':'')+'</small></div>';
    d.onclick = () => openTplDetail(t);
    grid.append(d);
  });
}
function openTplDetail(t){
  tplCur = t;
  $('tplDImg').src = t.preview || '';
  $('tplDImg').style.display = t.preview ? 'block' : 'none';
  $('tplDTitle').textContent = t.title;
  const src = (tplData.sources||[]).find(s => s.id === t.source);
  $('tplDMeta').textContent = (t.category||'') + ' · ' + (t.ratio||'自动') + ' · 作者：' + (t.author||'未知') + ' · 来源：' + (src ? src.name : t.source);
  $('tplDPrompt').textContent = t.prompt;
  $('tplDNeg').textContent = t.negative ? ('负面提示词：' + t.negative) : '';
  $('tplDLink').href = t.link || '#';
  $('tplDLink').style.display = t.link ? '' : 'none';
  $('tplDFav').textContent = tplFavs.indexOf(t.id) >= 0 ? '取消收藏' : '收藏';
  $('tplDetail').dataset.on = '1';
}
if ($('tplGrid')) {
  $('tplSource').addEventListener('change', ev => { tplUi.source = ev.target.value; renderTpl(); });
  $('tplSearch').addEventListener('input', ev => { tplUi.q = ev.target.value.trim(); renderTpl(); });
  $('tplFavOnly').onclick = () => {
    tplUi.favOnly = !tplUi.favOnly;
    $('tplFavOnly').style.borderColor = tplUi.favOnly ? 'var(--accent)' : '';
    renderTpl();
  };
  $('tplDFill').onclick = () => {
    const t = tplCur;
    if (!t) return;
    $('brief').value = t.prompt;
    if (t.negative && $('negative')) $('negative').value = t.negative;
    if (t.ratio) state.ratio = t.ratio;
    if (t.mode) state.mode = t.mode;
    $('tplDetail').removeAttribute('data-on');
    state.page = 'gen';
    sync();
    setStatus('已回填模板「' + t.title + '」，直接点生成即可');
  };
  $('tplDFav').onclick = () => {
    const t = tplCur;
    if (!t) return;
    const i = tplFavs.indexOf(t.id);
    if (i >= 0) tplFavs.splice(i, 1); else tplFavs.push(t.id);
    saveLS('tplFavs', tplFavs);
    $('tplDFav').textContent = i >= 0 ? '收藏' : '取消收藏';
    renderTpl();
  };
  $('tplDClose').onclick = () => $('tplDetail').removeAttribute('data-on');
  $('tplDetail').addEventListener('click', ev => { if (ev.target === $('tplDetail')) $('tplDetail').removeAttribute('data-on'); });
  $('tplFetch').onclick = async () => {
    const url = $('tplUrl').value.trim();
    if (!url) { setStatus('先贴在线清单 URL'); return; }
    setStatus('正在拉取在线清单…');
    const r = await api('/templates/fetch', { url });
    if (r && r.error) { setStatus('在线更新失败：' + r.error); return; }
    tplData = r;
    renderTpl();
    setStatus('在线更新完成 · 共 ' + (r.sources||[]).length + ' 个来源 ' + (r.templates||[]).length + ' 个模板');
  };
  $('tplCache').onclick = async () => {
    setStatus('正在缓存预览图…');
    const r = await api('/templates/cache', {});
    if (r && r.error) { setStatus('缓存失败：' + r.error); return; }
    renderTpl();
    loadTemplates();
    setStatus('图片缓存完成 · 新缓存 ' + (r.cached||0) + ' 张' + ((r.failed&&r.failed.length) ? ' · 失败 ' + r.failed.length + ' 张' : ''));
  };
  loadTemplates();
}
function pushHistory(entry){
  state.history = state.history || [];
  state.history.unshift(entry);
  state.history = state.history.slice(0, 500);
  saveLS('history', state.history);
  renderHist();
}
function renderHist(){
  const box = $('hist');
  if (!box) return;
  const q = (($('histSearch')&&$('histSearch').value)||'').trim().toLowerCase();
  const items = (state.history||[]).filter(h => {
    if (!q) return true;
    return (h.prompt||'').toLowerCase().includes(q) || String(h.ratio||'').includes(q) || String(h.skillId||'').includes(q) || String(h.model||'').toLowerCase().includes(q) || String(h.mode||'').includes(q);
  });
  box.innerHTML = items.length ? '' : '<p class="note">'+(q?'没有匹配的历史。':'还没有记录。生成后会出现在这里。')+'</p>';
  items.forEach(h => {
    const row = document.createElement('span');
    row.style.display = 'inline-flex';
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
    row.append(b);
    if (h.path) {
      const g = document.createElement('button');
      g.className = 'ghost';
      g.textContent = '存画廊';
      g.title = '把这条历史的图加入画廊';
      g.onclick = ev => { ev.stopPropagation(); addGallery(h); };
      row.append(g);
    }
    const del = document.createElement('button');
    del.className = 'ghost';
    del.textContent = '×';
    del.title = '删除这条历史（只删记录，不删已生成的文件）';
    del.onclick = ev => {
      ev.stopPropagation();
      const i = state.history.indexOf(h);
      if (i >= 0) state.history.splice(i, 1);
      saveLS('history', state.history);
      renderHist();
      setStatus('已删 1 条历史 · 剩 ' + state.history.length + ' 条');
    };
    row.append(del);
    box.append(row);
  });
  const clr = $('histClear');
  if (clr) clr.style.display = (state.history||[]).length ? '' : 'none';
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
  if (isVid) { $('lbVid').src = src; $('lbVid').play && $('lbVid').play().catch(e => console.warn('[imagestudio] video autoplay blocked:', e && e.message)); $('lbImg').removeAttribute('src'); }
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
      skillId: state.skillId, mode: state.mode, model: img.model || state.lastModel || '', negative: $('negative') && $('negative').value
    });
  });
}
async function loadGalleryFromAssets(){
  try {
    const listed = await api('/assets');
    for (const img of (listed.images || [])) {
      if (!img || !img.path) continue;
      const hash = img.sha256 && img.sha256 !== 'pending' ? img.sha256 : '';
      const dup = (state.gallery||[]).some(x => x && ((hash && x.hash && x.hash === hash) || x.path === img.path));
      if (dup) continue;
      const item = { ...img, prompt: img.title || img.path };
      if (hash) item.hash = hash;
      state.gallery.push(item);
    }
    saveLS('gallery', state.gallery);
  } catch (e) { console.warn('[imagestudio] gallery add failed:', e); }
  renderGallery();
  const empty = $('galEmpty');
  if (empty) empty.style.display = state.gallery.length ? 'none' : 'block';
  galBackfillHashes().catch(e => console.warn('[imagestudio] hash backfill failed:', e && e.message));
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
$('histClear') && ($('histClear').onclick = () => {
  const n = (state.history||[]).length;
  if (!n) { setStatus('历史已经是空的'); return; }
  state.history = [];
  saveLS('history', state.history);
  renderHist();
  setStatus('已清空 ' + n + ' 条历史记录（已生成的图片文件仍在存储目录）');
});
$('lb') && ($('lb').onclick = (ev) => { if (ev.target===$('lb') || ev.target.className==='stage') closeLb(); });
// 大图操作：转参考图 / 加入对话 / 加入画布（对当前 lb 项生效）
$('lbRef') && ($('lbRef').onclick = () => {
  const it = (state.lbList||[])[state.lbIndex];
  if (!it) return;
  state.lastImages = it.path ? [it.path] : [];
  state.mode = 'img'; state.page = 'gen';
  closeLb(); sync(); setStatus('已设为参考图');
});
$('lbChat') && ($('lbChat').onclick = () => {
  const it = (state.lbList||[])[state.lbIndex];
  if (!it) return;
  $('chat').value = (($('chat').value||'') + String.fromCharCode(10) + (it.prompt||it.title||'')).trim();
  state.chat = true;
  closeLb(); sync(); setStatus('已加入对话');
});
$('lbCanvas') && ($('lbCanvas').onclick = () => {
  const it = (state.lbList||[])[state.lbIndex];
  if (!it || !it.path) return;
  state.page = 'canvas';
  closeLb(); sync();
  window.__cvAddImage && window.__cvAddImage(it.path);
});
$('lbGal') && ($('lbGal').onclick = () => {
  const it = (state.lbList||[])[state.lbIndex];
  if (!it) return;
  closeLb();
  addGallery(it);
});
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
  state.lastModel = out.model || out.providerId || '';
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
  } catch (e) { console.warn('[imagestudio] best-effort cancel failed:', e); }
  if (state.jobAbort) state.jobAbort.abort();
});
$('randInsp') && ($('randInsp').onclick = () => {
  const pool = [...document.querySelectorAll('#insp .chip[data-brief]')];
  const pick = pool[Math.floor(Math.random()*pool.length)];
  if (pick) $('brief').value = pick.dataset.brief || '';
});
$('enhance') && ($('enhance').onclick = () => {
  const hasChat = (state.channels||[]).some(c => /chat|enhance|llm/i.test(String(c.id||'')+String(c.model||'')));
  if (!hasChat) {
    setStatus('未配置提示词增强模型。到「设置」填一个聊天模型渠道后再用。');
    return;
  }
  const brief = $('brief').value.trim() || '画只猫';
  $('brief').value = [
    brief,
    'subject and action in one sentence',
    'camera: lens, distance, height',
    'light: one practical source, direction',
    'materials: cloth, skin, surface',
    'do not add banned aesthetic adjectives'
  ].join('. ');
  setStatus('已按本地模板展开提示词（未调用上游）');
});
(function bindSettings(){
  function renderCh(){
    const ol = $('chList');
    if (!ol) return;
    const rows = state.channels || [];
    ol.innerHTML = rows.length
      ? rows.map((c, i) => '<li>'+escapeHtml(c.id)+' · '+escapeHtml(c.protocol)+' · '+escapeHtml(c.model||'')+(c.videoModel?' · 视频 '+escapeHtml(c.videoModel):'')+(c.editModel?' · 编辑 '+escapeHtml(c.editModel):'')+(c.visionModel?' · 视觉 '+escapeHtml(c.visionModel):'')+' · env '+escapeHtml(c.apiKeyEnv||'')+' · <span data-keyslot="'+i+'">密钥状态查询中…</span></li>').join('')
      : '<li>还没有保存的渠道。mock 仍可出图。</li>';
    rows.forEach((c, i) => {
      const slot = ol.querySelector('[data-keyslot="'+i+'"]');
      if (!slot) return;
      api('/key-status', { apiKeyEnv: c.apiKeyEnv || 'IMAGE_STUDIO_KEY' }).then(r => {
        slot.textContent = r.configured ? '密钥已配置' : '密钥未配置';
        slot.style.color = r.configured ? '' : '#c0392b';
      }).catch(() => { slot.textContent = '密钥状态未知'; });
    });
    const hint = $('settingsHint');
    if (hint) hint.textContent = rows.length ? ('已保存 '+rows.length+' 个渠道（仅本机 localStorage，不含密钥值）。') : '还没有渠道时，工作台会走内置 mock，仍可直接出图。';
  }
  $('chSave') && ($('chSave').onclick = async () => {
    const id = ($('chId').value||'').trim();
    if (!id) { setStatus('先填渠道 id'); return; }
    const row = {
      id,
      protocol: $('chProto').value,
      model: ($('chModel').value||'').trim(),
      videoModel: ($('chVideoModel') && $('chVideoModel').value || '').trim(),
      editModel: ($('chEditModel') && $('chEditModel').value || '').trim(),
      visionModel: ($('chVisionModel') && $('chVisionModel').value || '').trim(),
      baseUrl: ($('chUrl').value||'').trim(),
      apiKeyEnv: ($('chEnv').value||'IMAGE_STUDIO_KEY').trim()
    };
    // 真注册：保存调用后端 /channels，注册成真实 provider 并落盘，
    // 不再只是 localStorage 里的摆设。
    try {
      const r = await api('/channels', row);
      if (r && r.error) { setStatus('保存失败：' + r.error); return; }
      state.channels = (state.channels||[]).filter(c => c.id !== id).concat([row]);
      saveLS('channels', state.channels);
      renderCh();
      setStatus('渠道已保存并注册（重启后仍生效）· 密钥值不进页面');
    } catch (e) {
      setStatus('保存失败：' + (e && e.message ? e.message : e));
    }
  });
  $('chDetect') && ($('chDetect').onclick = async () => {
    // 真探测：后端带上游密钥请求 /models，按名字滤掉聊天/向量模型。
    setStatus('正在检测上游模型…');
    try {
      const r = await api('/channels/detect', {
        baseUrl: ($('chUrl').value||'').trim(),
        apiKeyEnv: ($('chEnv').value||'IMAGE_STUDIO_KEY').trim()
      });
      if (r && r.error) { $('chDetectOut').textContent = r.error; setStatus('检测失败'); return; }
      const models = (r && r.models) || [];
      $('chDetectOut').textContent = models.length
        ? ('上游共 ' + (r.total||models.length) + ' 个模型，其中图片/视频可用 ' + models.length + ' 个：' + models.slice(0,20).join('，') + (models.length>20?' …':''))
        : '检测不到图片/视频模型。可检查地址后重试，或手动填模型名。';
      setStatus(models.length ? '已检测 '+models.length+' 个可用模型' : '未检测到可用模型');
    } catch (e) {
      $('chDetectOut').textContent = '检测失败：' + (e && e.message ? e.message : e);
      setStatus('检测失败');
    }
  });
  $('colWidth') && ($('colWidth').oninput = () => {
    state.colWidth = Number($('colWidth').value);
    saveLS('colWidth', state.colWidth);
    sync();
  });
  renderCh();
})();
(function bindStorage(){
  const info = $('storageInfo');
  if (info) {
    api('/storage-info').then(r => {
      info.textContent = '存储目录：' + (r.studioDir || '?') + ' · 自动清理：' + (r.keepLastTasks > 0 ? ('保留最近 ' + r.keepLastTasks + ' 个任务') : '关闭（永不自动删除）');
      return api('/key-status', { apiKeyEnv: 'IMAGE_STUDIO_KEY' }).then(k => {
        info.textContent += ' · 密钥 ' + k.env + '：' + (k.configured ? '已配置' : '未配置');
      }).catch(() => { info.textContent += ' · 密钥状态查询失败'; });
    }).catch(e => {
      info.textContent = '存储信息读取失败：' + (e && e.message ? e.message : e) + '。可刷新重试。';
    });
  }
  const ex = $('bkExport');
  if (ex) ex.onclick = async () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('imagestudio.') === 0) data[k] = localStorage.getItem(k);
    }
    // 浏览器下载在 Electron 里不落盘，备份交给宿主写到存储目录 backups/ 下
    const r = await api('/backup', { data: data });
    if (r && r.ok) setStatus('备份已写入：' + r.path + '（共 ' + Object.keys(data).length + ' 组数据）');
    else setStatus('备份失败：' + (r && r.error ? r.error : '未知错误') + '。可重试，或检查存储目录是否可写。');
  };
  const btn = $('bkImportBtn');
  const file = $('bkImport');
  if (btn && file) {
    btn.onclick = () => file.click();
    file.onchange = async () => {
      const f = (file.files || [])[0];
      if (!f) return;
      try {
        const parsed = JSON.parse(await f.text());
        if (!parsed || parsed.app !== 'imagestudio-backup' || !parsed.data || typeof parsed.data !== 'object') {
          setStatus('这不是 imagestudio 备份文件，未做任何修改。');
          return;
        }
        const keys = Object.keys(parsed.data).filter(k => k.indexOf('imagestudio.') === 0);
        if (!keys.length) { setStatus('备份文件里没有可还原的数据。'); return; }
        const doomed = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf('imagestudio.') === 0) doomed.push(k);
        }
        doomed.forEach(k => localStorage.removeItem(k));
        keys.forEach(k => localStorage.setItem(k, parsed.data[k]));
        setStatus('已还原 ' + keys.length + ' 组数据，正在刷新…');
        location.reload();
      } catch (e) {
        setStatus('还原失败：' + (e && e.message ? e.message : e) + '。请确认选择的是导出的 JSON 备份文件。');
      } finally {
        file.value = '';
      }
    };
  }
})();
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
  // ---- 多画布：列表与当前 id 存 localStorage，项目按 canvas:<id> 分开存 ----
  let cvList = loadLS('canvas:list', null);
  if (!Array.isArray(cvList) || !cvList.length) {
    cvList = [{ id: 'default', name: '默认画布' }];
    saveLS('canvas:list', cvList);
  }
  let currentId = loadLS('canvas:current', 'default');
  if (!cvList.some(c => c.id === currentId)) currentId = cvList[0].id;
  function loadProject(id){
    const p = loadLS('canvas:' + id, null);
    if (p && p.nodes) return p;
    if (id === 'default') {
      const legacy = loadLS('canvas', null);
      if (legacy && legacy.nodes) return legacy;
    }
    return null;
  }
  let project = loadProject(currentId) || (currentId === 'default'
    ? {
        id:'default',
        nodes:[
          {id:'text-1', type:'text', x:40, y:80, text:'一只青瓷茶盏放在账房窗台上，午后侧光'},
          {id:'cfg-1', type:'config', x:320, y:90, ratio:'1:1', n:1}
        ],
        edges:[{id:'e-1', from:'text-1', to:'cfg-1'}]
      }
    : { id: currentId, nodes: [], edges: [] });
  state.canvas = project;
  const sel = new Set();
  let selEdge = '';
  let drag = null, wire = null, pan = null, space = false, ctxMenu = null, marquee = null;
  const view = { x:0, y:0, scale:1 };
  if (project.nodes[0]) sel.add(project.nodes.some(n=>n.id==='cfg-1') ? 'cfg-1' : project.nodes[0].id);

  // ---- 撤销/重做：快照栈，上限 100 步 ----
  const undoStack = [], redoStack = [];
  function snapshot(){ return JSON.stringify({ nodes: project.nodes, edges: project.edges }); }
  function record(){
    undoStack.push(snapshot());
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
  }
  function applySnapshot(s){
    const p = JSON.parse(s);
    project.nodes = p.nodes;
    project.edges = p.edges;
    sel.clear();
    selEdge = '';
    persist(); render();
  }
  function undo(){
    if (!undoStack.length) { setStatus('没有可撤销的操作'); return; }
    redoStack.push(snapshot());
    applySnapshot(undoStack.pop());
    setStatus('已撤销（还剩 ' + undoStack.length + ' 步可撤销）');
  }
  function redo(){
    if (!redoStack.length) { setStatus('没有可重做的操作'); return; }
    undoStack.push(snapshot());
    applySnapshot(redoStack.pop());
    setStatus('已重做');
  }

  function persist(){ saveLS('canvas:' + currentId, project); saveLS('canvas:current', currentId); }
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
      item('文本节点', () => addNode('text', stage._ctxWorld ? stage._ctxWorld.x : 80, stage._ctxWorld ? stage._ctxWorld.y : 180)),
      item('配置节点', () => addNode('config', stage._ctxWorld ? stage._ctxWorld.x : 300, stage._ctxWorld ? stage._ctxWorld.y : 180)),
      item('图片节点', () => addNode('image', stage._ctxWorld ? stage._ctxWorld.x : 80, stage._ctxWorld ? stage._ctxWorld.y : 260)),
      item('视频节点', () => addNode('video', stage._ctxWorld ? stage._ctxWorld.x : 320, stage._ctxWorld ? stage._ctxWorld.y : 260)),
      item('适应全部内容', () => fitAll()),
      item('删除选中', () => delSelected()),
    );
    document.body.append(ctxMenu);
  }
  function worldFromEvent(ev){
    const r = stage.getBoundingClientRect();
    return { x: (ev.clientX - r.left - view.x) / view.scale, y: (ev.clientY - r.top - view.y) / view.scale };
  }
  function addNode(type, x, y){
    record();
    const id = type+'-'+Date.now();
    const n = { id, type, x: x || 80, y: y || 180, text: type==='text'?'':undefined, ratio: type==='config'?'1:1':undefined, n: type==='config'?1:undefined };
    project.nodes.push(n);
    sel.clear(); sel.add(id); selEdge = '';
    persist(); render();
  }
  function delSelected(){
    if (selEdge) {
      record();
      project.edges = project.edges.filter(e=>e.id!==selEdge);
      selEdge = '';
      persist(); render();
      return;
    }
    if (!sel.size) return;
    record();
    project.nodes = project.nodes.filter(n=>!sel.has(n.id));
    project.edges = project.edges.filter(e=>!sel.has(e.from) && !sel.has(e.to));
    sel.clear();
    if (project.nodes[0]) sel.add(project.nodes[0].id);
    persist(); render();
  }
  function applyView(){
    const w = $('cvWorld');
    if (w) w.style.transform = 'translate('+view.x+'px,'+view.y+'px) scale('+view.scale+')';
    renderMini();
  }
  // ---- 左下角小地图：节点色块 + 视口框，点击跳转 ----
  function renderMini(){
    let mini = $('cvMini');
    if (!mini) {
      mini = document.createElement('div');
      mini.id = 'cvMini';
      mini.style.cssText = 'position:absolute;left:8px;bottom:8px;width:140px;height:100px;background:rgba(20,18,14,.85);border:1px solid var(--line);z-index:4;cursor:pointer;overflow:hidden';
      mini.addEventListener('pointerdown', ev => {
        ev.stopPropagation();
        const b = mini._bbox;
        if (!b) return;
        const r = mini.getBoundingClientRect();
        const wx = b.x1 + ((ev.clientX - r.left) / r.width) * (b.x2 - b.x1);
        const wy = b.y1 + ((ev.clientY - r.top) / r.height) * (b.y2 - b.y1);
        const sr = stage.getBoundingClientRect();
        view.x = sr.width/2 - wx*view.scale;
        view.y = sr.height/2 - wy*view.scale;
        applyView();
      });
      stage.append(mini);
    }
    if (!project.nodes.length) { mini.innerHTML=''; mini._bbox=null; return; }
    const xs = project.nodes.map(n=>n.x), ys = project.nodes.map(n=>n.y);
    const x1 = Math.min.apply(null,xs)-40, y1 = Math.min.apply(null,ys)-40;
    const x2 = Math.max.apply(null,xs)+230, y2 = Math.max.apply(null,ys)+150;
    mini._bbox = {x1,y1,x2,y2};
    const sr = stage.getBoundingClientRect();
    const vx1 = -view.x/view.scale, vy1 = -view.y/view.scale;
    const vx2 = vx1 + sr.width/view.scale, vy2 = vy1 + sr.height/view.scale;
    const px = w => ((w - x1) / (x2 - x1) * 140);
    const py = h => ((h - y1) / (y2 - y1) * 100);
    let html = '';
    project.nodes.forEach(n=>{
      const c = n.type==='config' ? '#e2603f' : n.type==='text' ? '#c4b59a' : '#7fb069';
      html += '<div style="position:absolute;left:'+px(n.x)+'px;top:'+py(n.y)+'px;width:'+Math.max(4,px(n.x+170)-px(n.x))+'px;height:'+Math.max(3,py(n.y+100)-py(n.y))+'px;background:'+c+'"></div>';
    });
    html += '<div style="position:absolute;left:'+px(vx1)+'px;top:'+py(vy1)+'px;width:'+Math.max(6,px(vx2)-px(vx1))+'px;height:'+Math.max(4,py(vy2)-py(vy1))+'px;border:1px solid #fff;pointer-events:none"></div>';
    mini.innerHTML = html;
  }
  function fitAll(){
    if (!project.nodes.length) { view.x=0; view.y=0; view.scale=1; applyView(); return; }
    const W = 190, H = 110, M = 60;
    const xs = project.nodes.map(n=>n.x), ys = project.nodes.map(n=>n.y);
    const x1 = Math.min.apply(null, xs) - M, y1 = Math.min.apply(null, ys) - M;
    const x2 = Math.max.apply(null, xs) + W + M, y2 = Math.max.apply(null, ys) + H + M;
    const r = stage.getBoundingClientRect();
    const scale = Math.max(0.05, Math.min(1, Math.min(r.width / (x2-x1), r.height / (y2-y1))));
    view.scale = scale;
    view.x = (r.width - (x2-x1)*scale) / 2 - x1*scale;
    view.y = (r.height - (y2-y1)*scale) / 2 - y1*scale;
    applyView();
    setStatus('已回正到全部内容（' + Math.round(scale*100) + '%）');
  }
  function renderGenPanel(){
    const box = $('cvGen');
    if (!box) return;
    const cfg = sel.size===1 ? project.nodes.find(n=>sel.has(n.id) && n.type==='config') : null;
    if (!cfg) { box.style.display='none'; box.innerHTML=''; return; }
    box.style.display = 'block';
    const ratios = ['自动','1:1','3:4','4:3','9:16','16:9','2:3','3:2','21:9'];
    const clarities = ['自动','1K','2K'];
    const providers = (state.providers||[]);
    box.innerHTML = '<b>生成器</b> · 节点 ' + escapeHtml(cfg.id) +
      ' <label style="display:inline">提示词补充 <input id="cgPrompt" value="'+escapeHtml(cfg.text||'')+'" placeholder="可空，连线文本优先"/></label>' +
      ' <label style="display:inline">比例 <select id="cgRatio">' + ratios.map(r=>'<option'+(cfg.ratio===r?' selected':'')+'>'+r+'</option>').join('') + '</select></label>' +
      ' <label style="display:inline">清晰度 <select id="cgClarity">' + clarities.map(c=>'<option'+(cfg.clarity===c?' selected':'')+'>'+c+'</option>').join('') + '</select></label>' +
      ' <label style="display:inline">张数 <input id="cgN" type="number" min="1" max="4" value="'+(cfg.n||1)+'" style="width:56px"/></label>' +
      ' <label style="display:inline">渠道 <select id="cgProvider"><option value="">默认渠道</option>' + providers.map(p=>'<option value="'+escapeHtml(p.id)+'"'+(cfg.providerId===p.id?' selected':'')+'>'+escapeHtml(p.id)+'</option>').join('') + '</select></label>' +
      ' <button class="primary" id="cgSend">发送出图</button>';
    const commit = () => {
      record();
      cfg.text = ($('cgPrompt').value||'').trim() || undefined;
      cfg.ratio = $('cgRatio').value === '自动' ? undefined : $('cgRatio').value;
      cfg.clarity = $('cgClarity').value === '自动' ? undefined : $('cgClarity').value;
      cfg.n = Math.max(1, Math.min(4, Number($('cgN').value)||1));
      cfg.providerId = $('cgProvider').value || undefined;
      persist(); render();
    };
    ['cgPrompt','cgRatio','cgClarity','cgN','cgProvider'].forEach(id => { const el = $(id); el && el.addEventListener('change', commit); });
    $('cgSend').onclick = () => sendFromConfig(cfg);
  }
  async function sendFromConfig(cfg){
    setStatus('画布出图中…');
    const out = await api('/canvas/generate', { project, configNodeId: cfg.id });
    if (out.error) { setStatus(String(out.error)); return; }
    record();
    project.nodes = out.project.nodes;
    project.edges = out.project.edges;
    persist(); render();
    setStatus('画布出图完成 · 结果在配置节点右侧');
  }
  // ---- 图片节点标注：marks 存相对坐标(0-1)，缩放/移动天然跟随 ----
  const markingNodes = new Set();
  function bindMarksOverlay(n, el){
    const wrap = el.querySelector('.imgwrap');
    const overlay = el.querySelector('.marks');
    if (!wrap || !overlay) return;
    renderMarks(n, el);
    let drafting = null;
    overlay.addEventListener('pointerdown', ev => {
      if (!markingNodes.has(n.id)) return;
      ev.stopPropagation();
      const r = wrap.getBoundingClientRect();
      drafting = { x1: (ev.clientX - r.left) / r.width, y1: (ev.clientY - r.top) / r.height, boxEl: null };
      overlay.setPointerCapture(ev.pointerId);
    });
    overlay.addEventListener('pointermove', ev => {
      if (!drafting) return;
      const r = wrap.getBoundingClientRect();
      const x2 = (ev.clientX - r.left) / r.width, y2 = (ev.clientY - r.top) / r.height;
      const m = normMark(drafting.x1, drafting.y1, x2, y2);
      if (!drafting.boxEl) {
        drafting.boxEl = document.createElement('div');
        drafting.boxEl.style.cssText = 'position:absolute;border:2px dashed #e2603f;background:rgba(226,96,63,.12);pointer-events:none';
        overlay.append(drafting.boxEl);
      }
      placeMarkEl(drafting.boxEl, m);
      drafting.m = m;
    });
    overlay.addEventListener('pointerup', ev => {
      if (!drafting) return;
      ev.stopPropagation();
      const m = drafting.m;
      drafting = null;
      if (m && m.w > 0.02 && m.h > 0.02) {
        record();
        n.marks = n.marks || [];
        n.marks.push(Object.assign({ text: '' }, m));
        persist();
      }
      markingNodes.delete(n.id);
      render();
    });
  }
  function normMark(x1, y1, x2, y2){
    return {
      x: Math.max(0, Math.min(1, Math.min(x1, x2))),
      y: Math.max(0, Math.min(1, Math.min(y1, y2))),
      w: Math.min(1, Math.abs(x2 - x1)),
      h: Math.min(1, Math.abs(y2 - y1)),
    };
  }
  function placeMarkEl(boxEl, m){
    boxEl.style.left = (m.x * 100) + '%';
    boxEl.style.top = (m.y * 100) + '%';
    boxEl.style.width = (m.w * 100) + '%';
    boxEl.style.height = (m.h * 100) + '%';
  }
  function renderMarks(n, el){
    const overlay = el.querySelector('.marks');
    if (!overlay) return;
    overlay.querySelectorAll('.markbox').forEach(x => x.remove());
    el.querySelectorAll('.markcard').forEach(x => x.remove());
    (n.marks || []).forEach((m, i) => {
      const boxEl = document.createElement('div');
      boxEl.className = 'markbox';
      boxEl.style.cssText = 'position:absolute;border:2px dashed #e2603f;background:rgba(226,96,63,.12);pointer-events:none';
      placeMarkEl(boxEl, m);
      overlay.append(boxEl);
      // 提示词卡片挂在节点内、图片下方：跟随节点移动，不需要连线
      const card = document.createElement('div');
      card.className = 'markcard row';
      card.style.marginTop = '2px';
      card.innerHTML = '<span class="note">框' + (i+1) + '</span><input data-mk="'+i+'" placeholder="这个框里要改成什么" value="'+escapeHtml(m.text||'')+'" style="flex:1;min-width:80px"/><button class="ghost" data-mkdel="'+i+'">删</button>';
      card.querySelector('input').addEventListener('change', ev => {
        record();
        m.text = ev.target.value;
        persist();
      });
      card.querySelector('input').addEventListener('pointerdown', ev => ev.stopPropagation());
      card.querySelector('[data-mkdel]').addEventListener('click', ev => {
        ev.stopPropagation();
        record();
        n.marks.splice(i, 1);
        persist(); render();
      });
      el.append(card);
    });
  }
  async function redrawMarks(n, el){
    const marks = (n.marks || []).filter(m => (m.text||'').trim());
    if (!marks.length) { setStatus('先点「标注」拖框，并在卡片里写要改成什么'); return; }
    const img = el.querySelector('.imgwrap img');
    const natW = img && img.naturalWidth, natH = img && img.naturalHeight;
    if (!natW || !natH) { setStatus('图片还没加载完，稍后再试'); return; }
    let path = n.path;
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      setStatus('局部重绘 ' + (i+1) + '/' + marks.length + ' …');
      const out = await api('/edit-region', {
        path,
        box: { x: m.x * natW, y: m.y * natH, w: m.w * natW, h: m.h * natH },
        prompt: m.text,
        providerId: ($('cvMaskProvider') && $('cvMaskProvider').value) || undefined,
      });
      if (out.error) { setStatus('局部重绘失败：' + out.error); return; }
      const ref = out.images && out.images[0];
      if (ref && ref.path) path = ref.path;
    }
    record();
    n.path = path;
    persist(); render();
    setStatus('局部重绘完成 · 框外区域与原图一致');
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
      if (sel.has(n.id)) el.style.borderColor = 'var(--accent)';
      el.style.width = (n.w || 180) + 'px';
      const ins = incoming(n.id).length;
      if (n.type==='text'){
        el.innerHTML = '<b>文本</b><textarea data-field="text" style="min-height:64px;margin-top:6px">'+escapeHtml(n.text||'')+'</textarea>';
      } else if (n.type==='image'){
        const src = n.path ? '/imagestudio/api/file?path='+encodeURIComponent(n.path) : '';
        el.innerHTML = '<b>图片</b>'+(src
          ? '<div class="imgwrap" style="position:relative;margin-top:6px;width:100%"><img src="'+src+'" alt="" draggable="false" style="width:100%;display:block"><div class="marks" style="position:absolute;inset:0"></div></div>'
          : '<div class="note" data-upload style="cursor:pointer">空节点 · 点这里上传，或直接拖图进来</div>');
        if (src) {
          const acts = document.createElement('div');
          acts.className = 'row';
          acts.style.marginTop = '4px';
          acts.innerHTML = '<button class="ghost" data-act="mark">标注</button><button class="ghost" data-act="redraw">重绘框内</button><button class="ghost" data-act="nobg">移除背景</button>';
          el.append(acts);
          const marking = markingNodes.has(n.id);
          const markBtn = acts.querySelector('[data-act="mark"]');
          if (marking) markBtn.style.borderColor = 'var(--accent)';
          markBtn.onclick = ev => {
            ev.stopPropagation();
            if (markingNodes.has(n.id)) markingNodes.delete(n.id); else markingNodes.add(n.id);
            render();
          };
          acts.querySelector('[data-act="redraw"]').onclick = async ev => {
            ev.stopPropagation();
            await redrawMarks(n, el);
          };
          acts.querySelector('[data-act="nobg"]').onclick = async ev => {
            ev.stopPropagation();
            setStatus('本地移除背景中…');
            const out = await api('/remove-bg', { path: n.path });
            if (out.error) { setStatus('移除背景失败：' + out.error); return; }
            const ref = out.images && out.images[0];
            if (ref && ref.path) { record(); n.path = ref.path; persist(); render(); }
            setStatus('已移除背景（本地算法，未消耗上游额度）');
          };
          bindMarksOverlay(n, el);
        }
      } else if (n.type==='video'){
        const src = n.path ? '/imagestudio/api/file?path='+encodeURIComponent(n.path) : '';
        el.innerHTML = '<b>视频</b>'+(src?'<video src="'+src+'" muted style="width:160px;display:block;margin-top:6px"></video>':'<div class="note">视频节点</div>');
      } else {
        el.innerHTML = '<b>生成配置</b><div class="note">入边 '+ins+' · '+(n.ratio||'自动')+' · '+(n.clarity||'自动')+' · '+(n.n||1)+'张</div><div class="note">选中后在下方生成器调参</div>';
      }
      const outp = document.createElement('i');
      outp.className = 'port out';
      const inp = document.createElement('i');
      inp.className = 'port in';
      el.append(inp, outp);
      // 四角等比缩放：选中节点时显示四角手柄，宽度驱动、高度随内容自适应
      if (sel.has(n.id)) {
        ['nw','ne','sw','se'].forEach(corner => {
          const h = document.createElement('i');
          h.style.cssText = 'position:absolute;width:10px;height:10px;background:var(--accent);border:1px solid #fff;z-index:6;'
            + (corner.indexOf('n')>=0 ? 'top:-5px;' : 'bottom:-5px;')
            + (corner.indexOf('w')>=0 ? 'left:-5px;' : 'right:-5px;')
            + 'cursor:' + ((corner==='nw'||corner==='se') ? 'nwse-resize' : 'nesw-resize');
          h.addEventListener('pointerdown', ev => {
            ev.stopPropagation();
            record();
            const startW = el.offsetWidth || 180;
            const startX = ev.clientX;
            const move = mv => {
              const dx = (mv.clientX - startX) / view.scale * (corner.indexOf('w')>=0 ? -1 : 1);
              n.w = Math.max(120, Math.min(720, Math.round(startW + dx)));
              el.style.width = n.w + 'px';
            };
            const up = () => {
              document.removeEventListener('pointermove', move);
              document.removeEventListener('pointerup', up);
              persist(); render();
            };
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
          });
          el.append(h);
        });
      }
      el.addEventListener('pointerdown', ev => {
        if (ev.target.tagName==='TEXTAREA' || ev.target.classList.contains('port')) return;
        if (ev.shiftKey) {
          if (sel.has(n.id)) sel.delete(n.id); else sel.add(n.id);
          selEdge = '';
          render();
          return;
        }
        if (!sel.has(n.id)) { sel.clear(); sel.add(n.id); }
        selEdge = '';
        const starts = {};
        sel.forEach(id => { const m = project.nodes.find(x=>x.id===id); if (m) starts[id] = { x:m.x, y:m.y }; });
        drag = { id: n.id, sx: ev.clientX, sy: ev.clientY, starts, moved: false };
        el.setPointerCapture(ev.pointerId);
        render();
      });
      el.addEventListener('pointermove', ev => {
        if (!drag || !drag.starts[n.id]) return;
        const dx = (ev.clientX - drag.sx) / view.scale, dy = (ev.clientY - drag.sy) / view.scale;
        if (!drag.moved && Math.abs(dx)+Math.abs(dy) < 2) return;
        if (!drag.moved) { drag.moved = true; record(); }
        sel.forEach(id => {
          const m = project.nodes.find(x=>x.id===id);
          const s = drag.starts[id];
          if (!m || !s) return;
          m.x = s.x + dx; m.y = s.y + dy;
          const el2 = world.querySelector('[data-id="'+id+'"]');
          if (el2) { el2.style.left = m.x+'px'; el2.style.top = m.y+'px'; }
        });
        drawWires();
      });
      el.addEventListener('pointerup', () => { if (drag && drag.moved) persist(); drag = null; });
      el.querySelectorAll('[data-field]').forEach(t=>{
        t.addEventListener('input', () => { n[t.dataset.field] = t.value; persist(); });
        t.addEventListener('change', () => { record(); n[t.dataset.field] = t.value; persist(); });
      });
      const up = el.querySelector('[data-upload]');
      if (up) up.addEventListener('click', ev => {
        ev.stopPropagation();
        const picker = document.createElement('input');
        picker.type = 'file'; picker.accept = 'image/*';
        picker.onchange = async () => {
          const f = picker.files && picker.files[0];
          if (!f) return;
          await ingestFiles([f]);
          const path = state.lastImages[state.lastImages.length-1];
          if (path) { record(); n.path = path; persist(); render(); }
        };
        picker.click();
      });
      outp.addEventListener('pointerdown', ev => { ev.stopPropagation(); wire = { from:n.id }; });
      inp.addEventListener('pointerup', ev => {
        ev.stopPropagation();
        if (!wire || wire.from===n.id) return;
        if (!project.edges.some(e=>e.from===wire.from && e.to===n.id)) {
          record();
          project.edges.push({id:'e-'+Date.now(), from:wire.from, to:n.id});
        }
        wire = null; persist(); render();
      });
      world.append(el);
    });
    drawWires();
    renderGenPanel();
  }
  function drawWires(){
    const svg = $('cvWires');
    if (!svg) return;
    svg.innerHTML = project.edges.map(e=>{
      const a = project.nodes.find(n=>n.id===e.from);
      const b = project.nodes.find(n=>n.id===e.to);
      if (!a||!b) return '';
      const x1=a.x+170,y1=a.y+28,x2=b.x,y2=b.y+28;
      const color = selEdge===e.id ? '#e2603f' : '#c4b59a';
      const w = selEdge===e.id ? 3 : 2;
      return '<line data-eid="'+e.id+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+w+'" marker-end="url(#arr'+(selEdge===e.id?'-sel':'')+')" style="pointer-events:stroke;cursor:pointer"/>';
    }).join('');
    svg.insertAdjacentHTML('afterbegin','<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#c4b59a"/></marker><marker id="arr-sel" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#e2603f"/></marker></defs>');
    svg.querySelectorAll('line[data-eid]').forEach(line=>{
      line.addEventListener('pointerdown', ev => {
        ev.stopPropagation();
        selEdge = line.dataset.eid;
        sel.clear();
        drawWires();
        setStatus('已选中连线 · Delete 删除');
      });
    });
  }
  // ---- 多画布切换 ----
  function renderSwitch(){
    const sw = $('cvSwitch');
    if (!sw) return;
    sw.innerHTML = cvList.map(c=>'<option value="'+escapeHtml(c.id)+'"'+(c.id===currentId?' selected':'')+'>'+escapeHtml(c.name)+'</option>').join('');
  }
  function switchTo(id){
    persist();
    currentId = id;
    project = loadProject(id) || { id, nodes: [], edges: [] };
    state.canvas = project;
    sel.clear(); selEdge = '';
    if (project.nodes[0]) sel.add(project.nodes[0].id);
    undoStack.length = 0; redoStack.length = 0;
    view.x = 0; view.y = 0; view.scale = 1;
    persist(); renderSwitch(); render();
  }
  $('cvSwitch') && ($('cvSwitch').onchange = ev => switchTo(ev.target.value));
  // Electron 渲染层不支持 window.prompt，用内联输入条代替
  function askName(placeholder, initial, cb){
    // 延迟到当前点击事件冒泡完再挂，否则 document 的 hideCtx 会立刻把它摘掉
    setTimeout(() => {
      hideCtx();
      ctxMenu = document.createElement('div');
      ctxMenu.className = 'ctx';
      ctxMenu.style.left = '120px';
      ctxMenu.style.top = '44px';
      // 菜单内部的点击/按键不外传，避免被全局监听误关
      ctxMenu.addEventListener('click', ev => ev.stopPropagation());
      ctxMenu.addEventListener('pointerdown', ev => ev.stopPropagation());
      const input = document.createElement('input');
      input.value = initial || '';
      input.placeholder = placeholder;
      input.style.minWidth = '180px';
      const ok = document.createElement('button');
      ok.textContent = '确定';
      const commit = () => { const v = input.value.trim(); hideCtx(); if (v) cb(v); };
      ok.onclick = commit;
      input.onkeydown = ev => { if (ev.key==='Enter') commit(); if (ev.key==='Escape') hideCtx(); ev.stopPropagation(); };
      ctxMenu.append(input, ok);
      document.body.append(ctxMenu);
      input.focus(); input.select();
    }, 0);
  }
  $('cvNew') && ($('cvNew').onclick = () => {
    askName('新画布名称', '画布 ' + (cvList.length+1), name => {
      const id = 'cv-' + Date.now();
      cvList.push({ id, name });
      saveLS('canvas:list', cvList);
      switchTo(id);
      setStatus('已新建画布「' + name + '」');
    });
  });
  $('cvRename') && ($('cvRename').onclick = () => {
    const cur = cvList.find(c=>c.id===currentId);
    if (!cur) return;
    askName('重命名画布', cur.name, name => {
      cur.name = name;
      saveLS('canvas:list', cvList);
      renderSwitch();
      setStatus('已重命名为「' + name + '」');
    });
  });
  $('cvFit') && ($('cvFit').onclick = fitAll);
  $('cvText').onclick = () => addNode('text', 60, 200);
  $('cvCfg').onclick = () => addNode('config', 300, 200);
  $('cvImg') && ($('cvImg').onclick = () => addNode('image', 80, 260));
  $('cvVid') && ($('cvVid').onclick = () => addNode('video', 320, 260));
  $('cvDel') && ($('cvDel').onclick = delSelected);
  $('cvSend').onclick = async () => {
    const cfg = project.nodes.find(n=>sel.has(n.id) && n.type==='config') || project.nodes.find(n=>n.type==='config');
    if (!cfg) { setStatus('先选一个配置节点'); return; }
    await sendFromConfig(cfg);
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
    if (ev.target !== stage && ev.target.id !== 'cvWorld' && ev.target.id !== 'cvWires') return;
    if (space) {
      pan = { x: ev.clientX - view.x, y: ev.clientY - view.y };
      stage.setPointerCapture(ev.pointerId);
      return;
    }
    const origin = worldFromEvent(ev);
    const rect = document.createElement('div');
    rect.style.cssText = 'position:absolute;border:1px dashed var(--accent);background:rgba(226,96,63,.08);pointer-events:none;z-index:5';
    stage.append(rect);
    marquee = { origin, rect };
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener('pointermove', ev => {
    if (pan) {
      view.x = ev.clientX - pan.x;
      view.y = ev.clientY - pan.y;
      applyView();
      return;
    }
    if (marquee) {
      const now = worldFromEvent(ev);
      const x1 = Math.min(marquee.origin.x, now.x), y1 = Math.min(marquee.origin.y, now.y);
      const x2 = Math.max(marquee.origin.x, now.x), y2 = Math.max(marquee.origin.y, now.y);
      marquee.rect.style.left = (x1*view.scale + view.x) + 'px';
      marquee.rect.style.top = (y1*view.scale + view.y) + 'px';
      marquee.rect.style.width = ((x2-x1)*view.scale) + 'px';
      marquee.rect.style.height = ((y2-y1)*view.scale) + 'px';
      marquee.box = { x1, y1, x2, y2 };
    }
  });
  stage.addEventListener('pointerup', ev => {
    pan = null;
    if (marquee) {
      const box = marquee.box;
      marquee.rect.remove();
      if (box && (box.x2-box.x1 > 4 || box.y2-box.y1 > 4)) {
        if (!ev.shiftKey) sel.clear();
        project.nodes.forEach(n=>{
          if (n.x+170 >= box.x1 && n.x <= box.x2 && n.y+100 >= box.y1 && n.y <= box.y2) sel.add(n.id);
        });
        selEdge = '';
        render();
        setStatus('已框选 ' + sel.size + ' 个节点');
      } else if (box) {
        sel.clear(); selEdge = '';
        render();
      }
      marquee = null;
    }
  });
  stage.addEventListener('wheel', ev => {
    ev.preventDefault();
    const next = view.scale * (ev.deltaY>0 ? 0.92 : 1.08);
    view.scale = Math.max(0.05, Math.min(5, next));
    applyView();
  }, { passive:false });
  document.addEventListener('keydown', ev => {
    if (state.page!=='canvas') { if (ev.code==='Space') space = true; return; }
    const tag = ev.target.tagName;
    const typing = tag==='TEXTAREA' || tag==='INPUT';
    if (ev.code==='Space' && !typing) { space = true; ev.preventDefault(); }
    if (typing) return;
    if ((ev.key==='Delete' || ev.key==='Backspace')) {
      ev.preventDefault(); delSelected();
    } else if (ev.ctrlKey && !ev.shiftKey && ev.key.toLowerCase()==='z') {
      ev.preventDefault(); undo();
    } else if ((ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase()==='z') || (ev.ctrlKey && ev.key.toLowerCase()==='y')) {
      ev.preventDefault(); redo();
    } else if (ev.ctrlKey && ev.key.toLowerCase()==='c') {
      if (!sel.size) return;
      const nodes = project.nodes.filter(n=>sel.has(n.id));
      const edges = project.edges.filter(e=>sel.has(e.from) && sel.has(e.to));
      state._cvClipboard = { nodes: nodes.map(n=>Object.assign({}, n)), edges: edges.map(e=>Object.assign({}, e)) };
      setStatus('已复制 ' + nodes.length + ' 个节点');
    } else if (ev.ctrlKey && ev.key.toLowerCase()==='v') {
      const clip = state._cvClipboard;
      if (!clip || !clip.nodes.length) return;
      record();
      const idMap = {};
      clip.nodes.forEach(n=>{
        const nid = n.type + '-' + Date.now() + '-' + Math.floor(Math.random()*1000);
        idMap[n.id] = nid;
        project.nodes.push(Object.assign({}, n, { id: nid, x: n.x+24, y: n.y+24 }));
      });
      clip.edges.forEach(e=>{
        project.edges.push({ id: 'e-'+Date.now()+'-'+Math.floor(Math.random()*1000), from: idMap[e.from], to: idMap[e.to] });
      });
      sel.clear();
      Object.keys(idMap).forEach(k=>sel.add(idMap[k]));
      persist(); render();
      setStatus('已粘贴 ' + clip.nodes.length + ' 个节点');
    } else if (ev.ctrlKey && ev.key.toLowerCase()==='d') {
      if (!sel.size) return;
      ev.preventDefault();
      record();
      const nodes = project.nodes.filter(n=>sel.has(n.id));
      const edges = project.edges.filter(e=>sel.has(e.from) && sel.has(e.to));
      const idMap = {};
      nodes.forEach(n=>{
        const nid = n.type + '-' + Date.now() + '-' + Math.floor(Math.random()*1000);
        idMap[n.id] = nid;
        project.nodes.push(Object.assign({}, n, { id: nid, x: n.x+24, y: n.y+24 }));
      });
      edges.forEach(e=>{
        project.edges.push({ id: 'e-'+Date.now()+'-'+Math.floor(Math.random()*1000), from: idMap[e.from], to: idMap[e.to] });
      });
      sel.clear();
      Object.keys(idMap).forEach(k=>sel.add(idMap[k]));
      persist(); render();
      setStatus('已做副本 ×' + nodes.length);
    }
  });
  document.addEventListener('keyup', ev => { if (ev.code==='Space') space = false; });
  document.addEventListener('click', hideCtx);
  // 剪贴板截图直接贴成图片节点
  document.addEventListener('paste', ev => {
    if (state.page!=='canvas') return;
    const files = Array.from((ev.clipboardData && ev.clipboardData.files) || []).filter(f=>String(f.type||'').startsWith('image/'));
    if (!files.length) return;
    ev.preventDefault();
    files.forEach(f => window.__cvAddFile(f));
    setStatus('正在把剪贴板图片贴进画布…');
  });
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
  renderSwitch();
  render();
})();
(async () => {
  const meta = await api('/meta');
  renderSkills(meta.skills||[]);
  const providers = meta.providers||[];
  state.providers = providers;
  // 局部重绘渠道选择器：不支持遮罩编辑的协议/模型不进列表（验收 7.6）
  const maskSel = $('cvMaskProvider');
  if (maskSel) {
    const capable = providers.filter(p => p.canMaskEdit);
    maskSel.innerHTML = capable.length
      ? capable.map(p => '<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.id)+'</option>').join('')
      : '<option value="">无可用渠道</option>';
    maskSel.title = capable.length
      ? '局部重绘渠道 · 仅显示支持遮罩编辑的 ' + capable.length + ' 个（共 ' + providers.length + ' 个渠道）'
      : '没有任何渠道支持遮罩编辑（openai-image 需配置编辑模型）';
  }
  if (!providers.length) setStatus('还没有渠道。到顶部「设置」填地址和密钥环境变量名。mock 未列出时仍可点「就这样出图」。');
  else setStatus(providers.some(p=>String(p.id).includes('mock')) ? 'mock 已连接 · 可直接出图' : '已连接 '+providers.length+' 个渠道');
  renderHist();
  renderGallery();
  sync();
})();
${uiDesignJs}
</script>
</body>
</html>`
}
