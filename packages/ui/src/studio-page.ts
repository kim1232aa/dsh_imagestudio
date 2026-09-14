/** Image Studio workbench — Nova Studio v3.3 界面平移版。
 *  外壳/配色/控件与上游 nova-image-studio 对等：亮色默认主题（可切暗色）、
 *  左侧边栏（Agent/生图/视频/画布/UI设计/素材/反推/动图 + 随机图片/主题/宽屏/设置 + 队列药丸）、
 *  生图工作台输入卡 + 任务流。后端路由、dsh 集成、PLAN_REJECTED 闸门全部保留。 */
import { uiDesignHtml, uiDesignJs } from './ui-design.ts'

export function studioPage(opts: { embed?: boolean }): string {
  const embedAttr = opts.embed ? ' data-embed="1"' : ''
  return `<!doctype html>
<html lang="zh-CN"${embedAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Image Studio · Nova Studio</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230284C7'/%3E%3Cpath d='M16 6l-2.2 6.6a2 2 0 0 1-1.2 1.2L6 16l6.6 2.2a2 2 0 0 1 1.2 1.2L16 26l2.2-6.6a2 2 0 0 1 1.2-1.2L26 16l-6.6-2.2a2 2 0 0 1-1.2-1.2z' fill='%23fff'/%3E%3C/svg%3E"/>
<style>
/* ===== Nova Studio 设计令牌（上游 globals.css 平移，亮色默认） ===== */
:root{
  --background:#ffffff;--foreground:#0f172a;--card:#f8fafc;--popover:#ffffff;
  --muted:#f1f5f9;--muted-foreground:#64748b;--placeholder:#94a3b8;
  --primary:#0284C7;--primary-foreground:#ffffff;--accent:#0EA5E9;
  --border:#e2e8f0;--input:#e2e8f0;--ring:#0284C7;--destructive:#dc2626;
  --amber:#b45309;--amber-bg:#fef3c7;--green:#15803d;--green-bg:#dcfce7;--blue-bg:#e0f2fe;
  --radius:0.625rem;
  /* 旧变量别名：画布/切片等子系统沿用，统一映射到 Nova 令牌 */
  --bg:var(--background);--panel:var(--card);--ink:var(--foreground);--line:var(--border);--warn:var(--amber);
}
[data-theme="dark"]{
  --background:#020617;--foreground:#e2e8f0;--card:#0f172a;--popover:#0f172a;
  --muted:#1e293b;--muted-foreground:#94a3b8;--placeholder:#64748b;
  --primary:#38BDF8;--primary-foreground:#082f49;--accent:#38BDF8;
  --border:#1e293b;--input:#1e293b;--ring:#38BDF8;--destructive:#f87171;
  --amber:#fbbf24;--amber-bg:#451a03;--green:#4ade80;--green-bg:#052e16;--blue-bg:#082f49;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0;height:100%;background:var(--background);color:var(--foreground);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
body{display:flex;overflow:hidden}
svg{flex:none}
button{font:inherit}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* ===== 左侧边栏（Nova wideMode 外壳） ===== */
.sbar{width:236px;flex:none;display:flex;flex-direction:column;gap:8px;border-right:1px solid var(--border);background:var(--background);padding:12px;min-height:0}
.slogo{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:12px;cursor:pointer;border:0;background:transparent;text-align:left;color:inherit}
.slogo:hover{background:var(--muted)}
.slogo-ico{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#0ea5e9,#0284c7);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 3px 10px rgba(2,132,199,.35)}
.slogo-ico svg{width:22px;height:22px}
.slogo-txt{display:flex;flex-direction:column;line-height:1.25}
.slogo-txt b{font-size:15px;letter-spacing:.01em}
.slogo-txt small{color:var(--muted-foreground);font-size:11px}
.snav{flex:1;display:flex;flex-direction:column;gap:2px;overflow:auto;min-height:0;padding:4px 0}
.snav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;border:0;background:transparent;color:var(--foreground);font-weight:500;font-size:13px;cursor:pointer;text-align:left;text-decoration:none;width:100%}
.snav-item:hover{background:var(--muted)}
.snav-item[data-on]{background:var(--card);box-shadow:0 1px 3px rgba(15,23,42,.10);color:var(--primary)}
.snav-item svg{width:20px;height:20px}
.snav-item i,.sbtn i,.slogo i{display:flex}
.sbot{display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--border);padding-top:8px}
.sbtn{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--foreground);font-size:12.5px;font-weight:500;cursor:pointer;text-align:left;width:100%}
.sbtn:hover{border-color:var(--primary);color:var(--primary)}
.sbtn:hover{background:var(--muted)}
.sbtn svg{width:18px;height:18px;color:var(--muted-foreground)}
.sbtn:hover svg{color:var(--primary)}
.sbtn .carrot{margin-left:auto;color:var(--muted-foreground)}
.squeue{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--border);padding-top:10px}
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;width:fit-content}
.pill i{font-style:normal;opacity:.75;font-weight:500}
.pill-blue{background:var(--blue-bg);color:var(--primary)}
.pill-amber{background:var(--amber-bg);color:var(--amber)}
.pill-green{background:var(--green-bg);color:var(--green)}
.ddown{position:relative}
.ddown-menu{position:absolute;bottom:calc(100% + 6px);left:0;right:0;background:var(--popover);border:1px solid var(--border);border-radius:10px;box-shadow:0 10px 26px rgba(15,23,42,.16);padding:4px;z-index:70}
.ddown-menu button{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;padding:8px 10px;border-radius:8px;color:var(--foreground);cursor:pointer;font-size:12.5px;text-align:left}
.ddown-menu button:hover{background:var(--muted)}
.ddown-menu svg{width:16px;height:16px;color:var(--muted-foreground)}
/* 窄屏（退出宽屏后）：只留图标栏 */
body[data-narrow] .sbar{width:64px;padding:10px 8px}
body[data-narrow] .slogo-txt,body[data-narrow] .snav-item span:not(.sr),body[data-narrow] .sbtn span,body[data-narrow] .sbtn .carrot,body[data-narrow] .squeue,body[data-narrow] .ddown-menu{display:none}
body[data-narrow] .snav-item,body[data-narrow] .sbtn{justify-content:center;padding:10px}
body[data-narrow] .slogo{justify-content:center;padding:4px}

/* ===== 主区 ===== */
.main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;position:relative;background:var(--background)}
.page{display:none;flex:1;min-height:0;overflow:auto}
.page[data-on]{display:flex}
.toast{position:fixed;right:16px;bottom:16px;z-index:120;background:var(--popover);border:1px solid var(--border);border-radius:10px;box-shadow:0 10px 26px rgba(15,23,42,.16);padding:8px 12px;font-size:12px;color:var(--foreground);max-width:48vw}
.toast:empty{display:none}

/* ===== 生图工作台：左输入卡 + 右任务流 ===== */
.wb{flex:1;display:grid;grid-template-columns:minmax(340px,470px) minmax(0,1fr);gap:16px;padding:16px;align-items:start;min-height:0}
@media (max-width:1080px){.wb{grid-template-columns:1fr}}
.wb-col{display:flex;flex-direction:column;gap:12px;min-width:0}
.wb-feed{display:flex;flex-direction:column;gap:10px;min-width:0}
.icard{background:var(--muted);border:1px solid var(--border);border-radius:14px;box-shadow:0 4px 14px rgba(15,23,42,.06);padding:12px;display:flex;flex-direction:column;gap:10px}
.iref-row{display:flex;gap:12px}
.iref{flex:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:14px 10px;border:2px dashed rgba(2,132,199,.35);background:rgba(2,132,199,.05);border-radius:12px;color:var(--primary);cursor:pointer;text-align:center;font-size:13px;font-weight:600}
.iref small{color:var(--muted-foreground);font-weight:400;font-size:11px}
.iref .refcount{font-size:11px;color:var(--muted-foreground);font-weight:400}
.iref[data-over]{border-color:var(--primary);background:rgba(2,132,199,.12)}
.iref svg{width:22px;height:22px}
.iref-lib{flex:1;min-width:88px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid var(--border);background:var(--card);border-radius:12px;color:var(--foreground);cursor:pointer;font-size:12.5px;font-weight:600;padding:10px 6px}
.iref-lib small{color:var(--muted-foreground);font-weight:400;font-size:11px}
.iref-lib:hover{border-color:var(--primary);color:var(--primary)}
.iref-lib svg{width:20px;height:20px;color:var(--muted-foreground)}
.chipsrow{display:flex;gap:8px;flex-wrap:wrap}
.chipsrow:empty{display:none}
.refchip{position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--card)}
.refchip img{width:100%;height:100%;object-fit:cover;display:block}
.refchip button{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(15,23,42,.72);color:#fff;border:0;cursor:pointer;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0}
.itext{width:100%;min-height:96px;resize:vertical;background:var(--card);border:1px solid var(--input);border-radius:12px;padding:10px 12px;color:var(--foreground);font:inherit}
.itext::placeholder{color:var(--placeholder)}
.itext:focus{outline:2px solid var(--ring);border-color:var(--ring)}
.pbar{display:flex;flex-wrap:wrap;gap:6px}
.pchip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);background:var(--card);color:var(--foreground);border-radius:999px;padding:5px 11px;font-size:12px;cursor:pointer}
.pchip:hover{border-color:var(--primary);color:var(--primary)}
.pchip[data-on]{border-color:var(--primary);color:var(--primary)}
.pchip[data-locked]{opacity:.45;pointer-events:none}
.pchip svg{width:13px;height:13px;color:var(--muted-foreground)}
.pchip b{font-weight:600}
.pop{position:fixed;z-index:96;background:var(--popover);border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 32px rgba(15,23,42,.16);padding:10px;display:none;min-width:190px;max-width:300px}
.pop[data-on]{display:block}
.pop .pop-title{font-size:12px;font-weight:600;color:var(--muted-foreground);margin:0 0 8px}
.pop .row{display:flex;flex-wrap:wrap;gap:6px}
.pop .popt{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;padding:7px 9px;border-radius:8px;color:var(--foreground);cursor:pointer;font-size:12.5px;text-align:left}
.pop .popt:hover{background:var(--muted)}
.pop .popt[data-on]{color:var(--primary);font-weight:600}
.iacts{display:flex;align-items:center;gap:8px;justify-content:flex-end}
.iicons{display:flex;gap:2px;margin-right:auto}
.iicons button{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:9px;color:var(--muted-foreground);cursor:pointer}
.iicons button:hover{background:var(--card);color:var(--primary)}
.iicons svg{width:17px;height:17px}
.btn-outline{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);background:transparent;color:var(--foreground);border-radius:10px;padding:7px 12px;font-size:12px;cursor:pointer}
.btn-outline:hover{border-color:var(--primary);color:var(--primary)}
.btn-outline svg{width:14px;height:14px}
.btn-go{width:38px;height:38px;border-radius:10px;border:0;background:var(--primary);color:var(--primary-foreground);display:flex;align-items:center;justify-content:center;cursor:pointer}
.btn-go:hover{background:var(--accent)}
.btn-go:disabled{opacity:.5}
.btn-go svg{width:18px;height:18px}
.xcard{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.xcard>summary{display:flex;align-items:center;gap:8px;padding:11px 14px;cursor:pointer;font-weight:600;font-size:13px;list-style:none;color:var(--foreground)}
.xcard>summary::-webkit-details-marker{display:none}
.xcard>summary svg{width:16px;height:16px;color:var(--primary)}
.xcard>summary .note{margin-left:auto;font-weight:400}
.xcard>summary:hover{background:var(--muted)}
.xbody{padding:2px 14px 14px;display:flex;flex-direction:column;gap:8px}

/* ===== 任务流（HistoryJobList 平移） ===== */
.feed-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:2px}
.feed-head>b{font-size:14px}
.feed-filters{display:flex;gap:4px}
#histSearch{flex:1;min-width:130px;max-width:240px;margin-left:auto;background:var(--card);border:1px solid var(--input);border-radius:9px;padding:6px 10px;color:var(--foreground);font:inherit;font-size:12px}
.feed{display:flex;flex-direction:column;gap:12px}
.job{position:relative;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px}
.job-x{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:8px;border:0;background:transparent;color:var(--muted-foreground);cursor:pointer;opacity:0;transition:opacity .15s;display:flex;align-items:center;justify-content:center;z-index:2}
.job:hover .job-x{opacity:1}
.job-x:hover{background:var(--muted);color:var(--destructive)}
.job-x svg{width:14px;height:14px}
.job-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
.job-thumbs img,.job-thumbs video{width:100%;max-height:280px;object-fit:contain;background:var(--muted);border-radius:10px;cursor:zoom-in;border:1px solid var(--border);display:block}
.job-prompt{display:flex;align-items:flex-start;gap:6px;font-size:13px}
.job-prompt p{margin:0;flex:1;word-break:break-word}
.job-prompt button{flex:none;border:0;background:transparent;color:var(--muted-foreground);cursor:pointer;border-radius:7px;padding:4px;display:flex}
.job-prompt button:hover{color:var(--primary);background:var(--muted)}
.job-prompt svg{width:14px;height:14px}
.job-meta{display:flex;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--muted-foreground)}
.job-meta span{background:var(--muted);border-radius:6px;padding:2px 8px}
.job-acts{display:flex;flex-wrap:wrap;gap:6px}
/* 生图任务卡：Nova 横向行布局（左缩略图 / 中内容 / 右 2×2 图标） */
.jobr{position:relative;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px;display:flex;gap:14px;align-items:center}
.jobr:hover{border-color:var(--primary)}
.jobr-twrap{position:relative;flex:none;width:96px;height:96px}
.jobr-twrap img{width:96px;height:96px;object-fit:cover;background:var(--muted);border-radius:10px;cursor:zoom-in;border:1px solid var(--border);display:block}
.jobr-twrap img:hover{border-color:var(--primary)}
.jobr-n{position:absolute;right:-6px;bottom:-6px;background:var(--primary);color:var(--primary-foreground);border-radius:999px;font-size:10px;padding:1px 7px;pointer-events:none}
.jobr-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.jobr-prompt{display:flex;align-items:flex-start;gap:6px;font-size:13px}
.jobr-prompt p{margin:0;flex:1;word-break:break-word;font-style:italic;color:var(--foreground);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.jobr-prompt p::before{content:'“'}.jobr-prompt p::after{content:'”'}
.jobr-prompt button{flex:none;border:0;background:transparent;color:var(--muted-foreground);cursor:pointer;border-radius:7px;padding:4px;display:flex}
.jobr-prompt button:hover{color:var(--primary);background:var(--muted)}
.jobr-prompt svg{width:13px;height:13px}
.jobr-line{display:flex;gap:6px;flex-wrap:wrap;font-size:11.5px;color:var(--muted-foreground);align-items:center}
.jobr-line svg{width:12px;height:12px}
.jobr-line b{font-weight:500;color:var(--foreground)}
.jobr-btns{flex:none;display:grid;grid-template-columns:repeat(2,32px);grid-template-rows:repeat(2,32px);gap:6px}
.jobr-btns button{width:32px;height:32px;border:1px solid var(--border);background:var(--card);color:var(--muted-foreground);border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.jobr-btns button:hover{color:var(--primary);border-color:var(--primary)}
.jobr-btns svg{width:15px;height:15px}
.job-rej{border:1px dashed var(--destructive);background:rgba(220,38,38,.05);border-radius:10px;padding:10px;font-size:12.5px}
.job-rej b{color:var(--destructive)}

/* ===== 通用控件 ===== */
label{display:block;color:var(--muted-foreground);font-size:12px;margin:8px 0 4px}
textarea,input,select{background:var(--card);border:1px solid var(--input);border-radius:9px;padding:8px 10px;color:var(--foreground);font:inherit}
textarea:focus,input:focus,select:focus{outline:2px solid var(--ring);border-color:var(--ring)}
textarea{resize:vertical}
.row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.chip{border:1px solid var(--border);background:var(--card);border-radius:999px;padding:5px 12px;font-size:12px;color:var(--foreground);cursor:pointer}
.chip:hover{border-color:var(--primary)}
.chip[data-on]{background:var(--primary);border-color:var(--primary);color:var(--primary-foreground)}
.ghost{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);background:transparent;color:var(--foreground);border-radius:9px;padding:6px 11px;font-size:12px;cursor:pointer;text-decoration:none}
.ghost:hover{border-color:var(--primary);color:var(--primary)}
.ghost svg{width:14px;height:14px}
.primary svg{width:15px;height:15px}
.primary{display:inline-flex;align-items:center;gap:6px;border:0;background:var(--primary);color:var(--primary-foreground);border-radius:10px;padding:8px 14px;font-weight:600;font-size:13px;cursor:pointer}
.primary:hover{background:var(--accent)}
.primary:disabled{opacity:.5}
.note{color:var(--muted-foreground);font-size:12px}
.banner{padding:9px 12px;border:1px solid var(--border);border-left:3px solid var(--primary);border-radius:10px;color:var(--muted-foreground);font-size:12px;background:var(--card);margin:0}
.banner b{color:var(--foreground);font-weight:600}
pre{white-space:pre-wrap;background:var(--muted);border-radius:10px;padding:10px;border:1px solid var(--border);font-size:12px;color:var(--foreground)}
.score{padding:10px;border:1px dashed var(--border);border-radius:10px;background:var(--background);font-size:13px}
.skill{width:100%;text-align:left;background:var(--background);border:1px solid var(--border);border-radius:10px;padding:8px 10px;cursor:pointer;color:var(--foreground)}
.skill:hover{border-color:var(--primary)}
.skill[data-on]{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}
.skill b{font-size:13px}
.skill small{display:block;color:var(--muted-foreground);font-size:11px}
.dropzone{padding:14px;border:1px dashed var(--border);border-radius:10px;color:var(--muted-foreground);font-size:12px;text-align:center;cursor:pointer}
.dropzone[data-over]{border-color:var(--primary);color:var(--primary);background:rgba(2,132,199,.06)}
.progress{color:var(--muted-foreground);font-size:12px;margin:6px 0}
.empty{padding:24px;color:var(--muted-foreground)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.card img,.card video{width:100%;display:block;background:var(--muted);max-height:220px;object-fit:contain}
.card .cap{padding:10px 12px 4px;font-size:13px;color:var(--foreground)}
.card .cap small{display:block;color:var(--muted-foreground);font-size:11px;margin-top:2px}
.acts{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px}
.galcheck{position:absolute;top:8px;left:8px;width:18px;height:18px;z-index:3;accent-color:var(--primary)}
#asGrid .card{position:relative}
.gframe{position:relative;width:96px;flex:none;cursor:pointer}
.gframe img{width:96px;height:96px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block}
.gframe[data-off] img{opacity:.25}
.gframe small{display:block;text-align:center;color:var(--muted-foreground);font-size:11px;margin-top:2px}
.galtag{display:inline-block;padding:1px 8px;margin:2px 3px 0 0;border:1px solid var(--border);border-radius:999px;font-size:11px;color:var(--foreground);cursor:pointer}
.galtag:hover{border-color:var(--primary)}
.galtag .x{margin-left:4px;color:var(--destructive);cursor:pointer}
.ecom-use{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex:none;border:1px solid var(--border);border-radius:999px;padding:6px 12px;color:var(--foreground);background:var(--card);margin:0}
.ecom-use input[type=number]{width:52px;margin:0;padding:4px 6px}
.ecom-use span{white-space:nowrap}
.chcard{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:8px 0}
.chlist{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.chrow{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.chrow b{font-size:13px}
.chrow .chmeta{color:var(--muted-foreground);font-size:12px;flex:1;min-width:0}
.chrow .chmeta code{background:transparent;color:var(--muted-foreground)}
.chkey{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--border)}
.chkey[data-ok="1"]{border-color:var(--green);color:var(--green)}
.chkey[data-ok="0"]{border-color:var(--amber);color:var(--amber)}
.chrow .acts{padding:0;gap:4px}
.cfgrow{display:flex;flex-direction:column;gap:3px}
.cfglabel{font-size:11px;color:var(--muted-foreground);letter-spacing:.02em}
.cfgfull{width:100%}
.cfggrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cfggrid2{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
@media (max-width:640px){.cfggrid2{grid-template-columns:1fr}}

/* ===== 弹窗（Nova Dialog 平移） ===== */
.dlg{position:fixed;inset:0;z-index:110;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;padding:20px}
.dlg[data-on]{display:flex}
.dlg-card{background:var(--popover);border:1px solid var(--border);border-radius:16px;box-shadow:0 24px 60px rgba(15,23,42,.25);width:min(640px,94vw);max-height:86vh;display:flex;flex-direction:column;overflow:hidden}
.dlg-head{display:flex;align-items:center;gap:8px;padding:13px 16px;border-bottom:1px solid var(--border);font-weight:650;font-size:14px}
.dlg-head svg{width:16px;height:16px;color:var(--primary)}
.dlg-head .x{margin-left:auto;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:8px;color:var(--muted-foreground);cursor:pointer}
.dlg-head .x:hover{background:var(--muted);color:var(--foreground)}
.dlg-body{padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:10px}
.dlg-foot{display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}
.qitem{text-align:left;border:1px solid var(--border);background:var(--card);border-radius:10px;padding:10px 12px;cursor:pointer;color:var(--foreground)}
.qitem:hover{border-color:var(--primary)}
.qitem b{display:block;font-size:13px}
.qitem small{color:var(--muted-foreground);display:block;margin-top:3px;white-space:pre-wrap;font-size:11.5px}
.qitem .qacts{display:flex;gap:6px;margin-top:6px}
.pick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.pick-cell{position:relative;border:2px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;background:var(--muted);aspect-ratio:1}
.pick-cell img{width:100%;height:100%;object-fit:cover;display:block}
.pick-cell[data-on]{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary)}
.pick-cell .pchk{position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:50%;background:var(--primary);color:#fff;display:none;align-items:center;justify-content:center;font-size:12px}
.pick-cell[data-on] .pchk{display:flex}
.rand-img{max-width:100%;max-height:62vh;object-fit:contain;border-radius:12px;background:var(--muted)}
/* 设置页即弹窗 */
.page-modal{position:fixed;inset:0;z-index:100;background:rgba(15,23,42,.45);padding:20px;overflow:auto}
.page-modal[data-on]{display:flex}
.modal-card{background:var(--popover);border:1px solid var(--border);border-radius:16px;width:min(780px,96vw);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;margin:auto;box-shadow:0 24px 60px rgba(15,23,42,.25)}
.modal-head{display:flex;align-items:center;gap:8px;padding:13px 16px;border-bottom:1px solid var(--border);font-weight:650;font-size:14px}
.modal-head svg{width:16px;height:16px;color:var(--primary)}
.modal-head .x{margin-left:auto;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:8px;color:var(--muted-foreground);cursor:pointer}
.modal-head .x:hover{background:var(--muted);color:var(--foreground)}
.modal-body{padding:6px 18px 18px;overflow:auto}

/* ===== 无限画布（Nova 浮动工具条平移） ===== */
.cvwrap{position:relative;flex:1;min-height:0;display:flex}
.canvas{position:relative;flex:1;overflow:hidden;background:var(--muted);background-image:radial-gradient(circle,var(--border) 1px,transparent 1px);background-size:26px 26px}
#cvWorld{position:absolute;left:0;top:0;transform-origin:0 0}
.cvpill{position:absolute;z-index:10;display:flex;align-items:center;gap:4px;background:var(--popover);border:1px solid var(--border);border-radius:12px;box-shadow:0 6px 18px rgba(15,23,42,.10);padding:6px}
.cv-top-left{top:12px;left:12px;gap:8px;padding:6px 10px}
.cv-top-left select{border:0;background:transparent;font-weight:600;font-size:13px;color:var(--foreground);padding:2px;max-width:170px}
.cv-top-left select:focus{outline:none}
.cv-top-left .note{font-size:11px}
.cv-top-left svg{width:16px;height:16px;color:var(--muted-foreground)}
.cv-tools{top:50%;left:12px;transform:translateY(-50%);flex-direction:column;padding:5px}
.cv-tools button,.cv-ico{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:9px;color:var(--muted-foreground);cursor:pointer;padding:0}
.cv-tools button:hover,.cv-ico:hover{background:var(--muted);color:var(--primary)}
.cv-tools svg,.cv-ico svg,.cv-zoom svg{width:17px;height:17px}
.cv-top-right{top:12px;right:12px;padding:6px 8px}
.cv-top-right select{border:0;background:transparent;font-size:12px;color:var(--foreground);max-width:180px}
.cv-top-right select:focus{outline:none}
.cv-zoom{bottom:14px;left:50%;transform:translateX(-50%);gap:2px;padding:4px}
.cv-zoom button{height:30px;min-width:34px;padding:0 8px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:8px;color:var(--muted-foreground);cursor:pointer;font-size:12px}
.cv-zoom button:hover{background:var(--muted);color:var(--primary)}
.cv-zoom span{min-width:48px;text-align:center;font-size:12px;color:var(--foreground);font-weight:600}
.cv-help{bottom:14px;right:12px;max-width:360px;padding:8px 10px;font-size:11px;color:var(--muted-foreground);line-height:1.5}
.node{position:absolute;background:var(--popover);border:1px solid var(--border);border-radius:12px;padding:10px;min-width:220px;width:auto;max-width:400px;cursor:grab;box-shadow:0 4px 14px rgba(15,23,42,.10);color:var(--foreground)}
.node b{font-size:12px}
.node .note{white-space:nowrap;margin:4px 0 0;font-size:11px}
.node textarea{width:100%;background:var(--muted);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:inherit;font:inherit;font-size:12px}
.port{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--primary);top:24px;cursor:crosshair}
.port.in{left:-6px}
.port.out{right:-6px}
.cfgbox{margin-top:8px;display:flex;flex-direction:column;gap:8px}
.cfgfield{width:100%;min-height:44px;max-height:96px;resize:vertical;background:var(--muted);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:inherit;font:inherit;font-size:12px}
.cfgselect{width:100%;background:var(--muted);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.cfgselect:hover{border-color:var(--primary)}
.cfgstepper{display:flex;align-items:center;border:1px solid var(--border);border-radius:8px;overflow:hidden;width:fit-content;background:var(--muted)}
.cfgstepper button{border:0;background:transparent;width:26px;height:26px;padding:0;font-size:14px;line-height:1;cursor:pointer;color:var(--foreground)}
.cfgstepper button:hover{color:var(--primary)}
.cfgstepper span{min-width:26px;text-align:center;font-size:12px;padding:0 4px}
.cfgbox .primary{width:100%;justify-content:center;height:32px;font-size:12px;padding:0 10px}
.cfgtabs{display:flex;gap:2px;background:var(--muted);border-radius:8px;padding:2px;margin-top:8px}
.cfgtabs button{flex:1;border:0;background:transparent;border-radius:6px;padding:4px 6px;font-size:11px;color:var(--muted-foreground);cursor:pointer;font-weight:600}
.cfgtabs button[data-on]{background:var(--popover);color:var(--foreground);box-shadow:0 1px 2px rgba(15,23,42,.12)}
.cfgtabs button:disabled{opacity:.45;cursor:default}
.cfgchips{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.cfgicon{margin-left:auto;display:flex;gap:2px}
.cfgicon button{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:7px;color:var(--muted-foreground);cursor:pointer;padding:0}
.cfgicon button:hover{background:var(--muted);color:var(--primary)}
.cfgicon svg{width:14px;height:14px}
.cfgrefs{display:flex;gap:6px;flex-wrap:wrap}
.cfgrefs img{width:44px;height:44px;object-fit:cover;border-radius:7px;border:1px solid var(--border)}
.ctx{position:fixed;z-index:130;background:var(--popover);border:1px solid var(--border);border-radius:10px;padding:4px;min-width:160px;box-shadow:0 10px 28px rgba(15,23,42,.18)}
.ctx button{display:block;width:100%;text-align:left;background:transparent;border:0;color:var(--foreground);padding:7px 10px;cursor:pointer;font:inherit;border-radius:7px;font-size:12.5px}
.ctx button:hover{background:var(--muted)}
.ctx input{background:var(--card);border:1px solid var(--input);border-radius:7px;padding:6px 8px;color:var(--foreground);font:inherit}

/* ===== 大图灯箱 ===== */
.lb{position:fixed;inset:0;background:rgba(2,6,23,.92);display:none;align-items:center;justify-content:center;z-index:140;flex-direction:column;gap:10px}
.lb[data-on]{display:flex}
.lb .stage{max-width:92vw;max-height:82vh;overflow:hidden;display:flex;align-items:center;justify-content:center}
.lb img,.lb video{max-width:92vw;max-height:82vh;transform-origin:center center}
.lb .ghost{color:#e2e8f0;border-color:rgba(226,232,240,.3)}
.lb .note{color:#94a3b8}
</style>
</head>
<body>
<aside class="sbar" id="sbar">
  <button class="slogo" id="logoBtn" title="Nova Studio（连点 5 次：提示词广场入口）">
    <span class="slogo-ico"><i data-ic="infinity"></i></span>
    <span class="slogo-txt"><b>Nova Studio</b><small>批量 API 图像生成器</small></span>
  </button>
  <nav class="snav" id="tabs">
    <a class="snav-item" id="backHome" href="/" title="回对话"><i data-ic="bot"></i><span>Agent</span><span class="sr">回对话</span></a>
    <button class="snav-item" data-page="gen" data-on><i data-ic="sparkles"></i><span>生图工作台</span></button>
    <button class="snav-item" data-page="video"><i data-ic="video"></i><span>视频工作台</span></button>
    <button class="snav-item" data-page="canvas"><i data-ic="frame"></i><span>无限画布</span></button>
    <button class="snav-item" data-page="uidesign"><i data-ic="scissors"></i><span>UI设计模式</span></button>
    <button class="snav-item" data-page="assets"><i data-ic="images"></i><span>我的素材</span></button>
    <button class="snav-item" data-page="reverse"><i data-ic="scan"></i><span>反推提示词</span></button>
    <button class="snav-item" data-page="gif"><i data-ic="film"></i><span>动图生成</span></button>
    <button class="snav-item" data-page="tpl" id="navTpl" hidden><i data-ic="library"></i><span>提示词广场</span></button>
  </nav>
  <div class="sbot">
    <div class="ddown" id="randWrap">
      <button class="sbtn" id="randBtn"><i data-ic="dice"></i><span>随机图片</span><i class="carrot" data-ic="chev-down"></i></button>
      <div class="ddown-menu" id="randMenu" hidden>
        <button data-rand="ba"><i data-ic="user"></i>BA人物</button>
        <button data-rand="bing"><i data-ic="image"></i>Bing壁纸</button>
      </div>
    </div>
    <button class="sbtn" id="themeBtn"><i data-ic="sun"></i><span>亮色</span></button>
    <button class="sbtn" id="wideBtn"><i data-ic="panel-close"></i><span>退出宽屏</span></button>
    <button class="sbtn" id="settingsBtn"><i data-ic="settings"></i><span>设置</span></button>
  </div>
  <div class="squeue">
    <span class="pill pill-blue">并发 <b id="qProc">0</b></span>
    <span class="pill pill-amber">排队 <b id="qQueue">0</b> <i>(最大 <b id="qMax">200</b>)</i></span>
    <span class="pill pill-green">状态 <b id="qState">开启</b></span>
  </div>
</aside>

<div class="main">

<section class="page" data-page="gen" data-on>
  <div class="wb">
    <div class="wb-col">
      <p class="banner" id="channelHint"><b>当前是 mock 预览渠道</b> · 出的是概念板，不是成片。点左侧「设置」填真实模型地址和密钥环境变量名（值放宿主 <code>$DSH_HOME/.credentials.yaml</code>）。</p>
      <div class="icard">
        <div class="iref-row">
          <div class="iref" id="refDrop" title="点击选择 · 拖放 · Ctrl+V 粘贴">
            <i data-ic="cloud-upload"></i>
            参考图（可选）
            <small>点击选择 · 拖放 · Ctrl+V 粘贴</small>
            <span class="refcount" id="refCount">0 / 16 张</span>
          </div>
          <button class="iref-lib" id="refLibBtn" type="button">
            <i data-ic="image-plus"></i>
            素材库
            <small>导入参考图</small>
          </button>
          <input id="refFile" type="file" accept="image/*" multiple hidden/>
        </div>
        <div class="chipsrow" id="refThumbs"></div>
        <textarea class="itext" id="brief" placeholder="描述你想要生成的图像..."></textarea>
        <div class="pbar">
          <button class="pchip" id="pbModel" title="模型选择"><i data-ic="sparkles"></i><b id="pbModelLabel">自动</b></button>
          <button class="pchip" id="pbAuto" data-on title="自动分辨率和比例">✓ 自动</button>
          <button class="pchip" id="pbRes" title="输出分辨率"><i data-ic="maximize"></i><b id="pbResLabel">自动</b></button>
          <button class="pchip" id="pbRatio" title="图像比例"><i data-ic="rect-h"></i><b id="pbRatioLabel">自动</b></button>
          <button class="pchip" id="pbN" title="并行数量"><i data-ic="copy"></i><b id="pbNLabel">x1</b></button>
          <button class="pchip" id="pbTemp" title="温度（0=精确，1=均衡，2=创意）"><i data-ic="thermo"></i><b id="pbTempLabel">1.00</b></button>
        </div>
        <div class="iacts">
          <span class="iicons">
            <button id="ibQuick" title="快速提示词"><i data-ic="zap"></i></button>
            <button id="ibImport" title="导入提示词素材"><i data-ic="file-text"></i></button>
            <button id="ibSave" title="存为提示词素材"><i data-ic="save"></i></button>
            <button id="ibOptimize" title="优化提示词"><i data-ic="wand"></i></button>
          </span>
          <button class="btn-outline" id="ibClear" title="清空提示词和图片"><i data-ic="x"></i>清空</button>
          <button class="btn-go" id="go" title="提交（就这样出图）"><i data-ic="arrow-up"></i><span class="sr">就这样出图</span></button>
          <button class="ghost" id="cancelGo" hidden>取消</button>
        </div>
      </div>

      <details class="xcard" id="skillCard">
        <summary><i data-ic="wand"></i>Skill 工作流<span class="note">选 skill · 想方案 · 评分闸门</span></summary>
        <div class="xbody">
          <div id="skills"></div>
          <p class="note">不选就是普通生图。把 skill 目录放进插件 skills/ 后会出现在这里。</p>
          <div class="row">
            <button class="primary" id="think">想方案</button>
            <button class="ghost" id="rethink">重新想一版</button>
            <button class="ghost" id="enhance">增强提示词</button>
          </div>
          <div class="score" id="scoreBox" hidden></div>
          <label for="negative">负面词（可选，skill 方案会自动填）</label>
          <input id="negative" placeholder="不想要的元素，逗号分隔"/>
          <pre id="log" hidden></pre>
          <p class="note">分数只是参考；方案没过评分时会被默认拦下，确认后可用「仍然出图」放行。电影三联默认建议 21:9 三张，你改得动。</p>
        </div>
      </details>

      <details class="xcard" id="ecomCard">
        <summary><i data-ic="bag"></i>电商套图<span class="note">先出计划，确认后才批量出图</span></summary>
        <div class="xbody">
          <label>商品名</label>
          <input id="sku" placeholder="青瓷茶盏"/>
          <label>用途（可勾选，可改数量）</label>
          <div id="ecomUses" class="row"></div>
          <label>模型</label>
          <select id="ecomProvider"><option value="">默认渠道</option></select>
          <div class="row" style="margin-top:8px">
            <button class="ghost" id="ecomPreview">生成套图预览</button>
            <button class="primary" id="ecomConfirm" hidden>确认生成 <span id="ecomCount"></span></button>
          </div>
          <p class="note" id="ecomHint">预览只出计划，不会请求生图。</p>
          <ol id="ecomPlan" class="note"></ol>
          <div id="ecomOut" class="grid" style="margin-top:6px"></div>
        </div>
      </details>

      <details class="xcard">
        <summary><i data-ic="bulb"></i>灵感示例<span class="note">点一下填进输入框</span></summary>
        <div class="xbody">
          <div class="row" id="insp">
            <button class="chip" data-brief="明代科举舞弊案，夜审、账房、放榜。">夜审三联</button>
            <button class="chip" data-brief="雨后窗边人像，保留脸，只加胶片质感。">窗边人像</button>
            <button class="chip" data-brief="角色卡：青衫书吏，推开账房门。">书吏选角</button>
            <button class="chip" data-brief="做成游戏宣传图，要过度油腻 AI 光效。">游戏CG样例</button>
            <button class="chip" id="randInsp">随机</button>
          </div>
        </div>
      </details>
    </div>

    <div class="wb-feed">
      <div class="feed-head">
        <b>生图任务</b>
        <span class="note" id="histStats">共 0 条</span>
        <span class="feed-filters" id="histFilters">
          <button class="chip" data-hf="all" data-on>同时显示</button>
          <button class="chip" data-hf="txt">文生图</button>
          <button class="chip" data-hf="img">图生图</button>
        </span>
        <input id="histSearch" placeholder="搜索提示词 / 比例"/>
        <button class="ghost" id="histClear" title="清空历史（不删文件）">清空记录</button>
      </div>
      <div class="feed" id="hist"></div>
      <div class="grid" id="out" hidden></div>
    </div>
  </div>
</section>

<section class="page" data-page="video">
  <div class="wb">
    <div class="wb-col">
      <div class="icard">
        <div class="row" id="vdModes">
          <button class="chip" data-vdmode="txt" data-on>文生视频</button>
          <button class="chip" data-vdmode="img">参考图视频</button>
        </div>
        <div>
          <label>渠道（只列支持视频的）</label>
          <select id="vdProvider" style="width:100%"></select>
        </div>
        <div>
          <label>提示词</label>
          <textarea class="itext" id="vdPrompt" placeholder="例：账房烛火摇曳，镜头缓慢推近桌上的卷宗。"></textarea>
        </div>
        <div id="vdRefWrap" hidden>
          <label>参考图（首帧，可选）</label>
          <div class="iref" id="vdRefDrop" style="padding:12px">
            <i data-ic="cloud-upload"></i>
            首帧参考图
            <small>点击选择 · 拖放到这里 · 上限 10MB</small>
          </div>
          <input id="vdRefFile" type="file" accept="image/*" hidden/>
          <div class="chipsrow" id="vdRefThumbs" style="margin-top:8px"></div>
        </div>
        <div>
          <label>比例</label>
          <div class="row" id="vdRatios"></div>
        </div>
        <div>
          <label>时长（秒）</label>
          <div class="row" id="vdDurations"></div>
        </div>
        <div class="iacts">
          <span class="iicons"></span>
          <button class="btn-outline" id="vdClear"><i data-ic="x"></i>清空</button>
          <button class="primary" id="vdGo"><i data-ic="video"></i>提交生成</button>
          <button class="ghost" id="vdCancel" hidden>取消</button>
        </div>
        <p class="progress" id="vdProg"></p>
      </div>
    </div>
    <div class="wb-feed">
      <div class="feed-head">
        <b>视频任务</b>
        <span class="note" id="vdStats">共 0 条</span>
        <button class="ghost" id="vdHistClear" style="margin-left:auto">清空记录</button>
      </div>
      <div class="feed" id="vdOut"></div>
    </div>
  </div>
</section>

<section class="page" data-page="gif">
  <div class="wb">
    <div class="wb-col">
      <div class="icard">
        <p class="note" style="margin:0">两步走：① 先生成一组帧；② 在帧条里逐帧启停、调延时与循环次数，再合成 GIF 下载。</p>
        <div>
          <label>渠道</label>
          <select id="gfProvider" style="width:100%"></select>
        </div>
        <div>
          <label>提示词</label>
          <textarea class="itext" id="gfPrompt" placeholder="例：猫在账房里翻卷宗，动作连贯。"></textarea>
        </div>
        <div>
          <label>参考图（可选）</label>
          <div class="iref" id="gfRefDrop" style="padding:12px">
            <i data-ic="cloud-upload"></i>
            参考图
            <small>点击选择 · 上限 10MB</small>
          </div>
          <input id="gfRefFile" type="file" accept="image/*" hidden/>
          <div class="chipsrow" id="gfRefThumbs" style="margin-top:8px"></div>
        </div>
        <div>
          <label>帧数（2-8）</label>
          <div class="row" id="gfCounts"></div>
        </div>
        <div>
          <label>比例</label>
          <div class="row" id="gfRatios"></div>
        </div>
        <div class="iacts">
          <span class="iicons"></span>
          <button class="primary" id="gfGo"><i data-ic="film"></i>① 生成帧</button>
        </div>
      </div>
      <div class="xcard" id="gfTune" hidden>
        <div class="xbody" style="padding-top:12px">
          <label>帧条预览（点缩略图可启停，停用的帧不参与合成）</label>
          <div class="row" id="gfFrames" style="gap:10px"></div>
          <div class="cfggrid">
            <div class="cfgrow"><span class="cfglabel">帧延时（毫秒，50–500）</span><input id="gfDelay" type="number" min="50" max="500" step="10" value="250"/></div>
            <div class="cfgrow"><span class="cfglabel">循环次数（0 = 无限循环）</span><input id="gfLoop" type="number" min="0" max="100" step="1" value="0"/></div>
          </div>
          <div class="row" style="margin-top:4px">
            <button class="primary" id="gfRecode">② 合成 GIF</button>
          </div>
        </div>
      </div>
    </div>
    <div class="wb-feed">
      <div class="feed-head"><b>动图结果</b></div>
      <div class="feed" id="gfOut"></div>
    </div>
  </div>
</section>

<section class="page" data-page="reverse">
  <div class="wb">
    <div class="wb-col">
      <div class="icard">
        <p class="note" style="margin:0">上传或粘贴一张图，选视觉渠道与模板，反推出可复用的生图提示词。</p>
        <div class="iref" id="rvDrop">
          <i data-ic="cloud-upload"></i>
          上传图片
          <small>点击选择 · 拖放 · Ctrl+V 粘贴 · 上限 10MB</small>
        </div>
        <input id="rvFile" type="file" accept="image/*" hidden/>
        <div class="chipsrow" id="rvThumb"></div>
        <div>
          <label>视觉渠道</label>
          <select id="rvProvider" style="width:100%"></select>
        </div>
        <div>
          <label>反推模板</label>
          <div class="row" id="rvTpls">
            <button class="chip" data-rvtpl="brief" data-on>简洁</button>
            <button class="chip" data-rvtpl="detail">详细</button>
            <button class="chip" data-rvtpl="storyboard">分镜</button>
          </div>
        </div>
        <div class="iacts">
          <span class="iicons"></span>
          <button class="primary" id="rvGo"><i data-ic="scan"></i>开始反推</button>
        </div>
      </div>
    </div>
    <div class="wb-feed">
      <div class="feed-head"><b>反推结果</b></div>
      <div class="icard">
        <textarea class="itext" id="rvOut" placeholder="反推结果会出现在这里" style="min-height:240px"></textarea>
        <div class="iacts">
          <span class="iicons"></span>
          <button class="btn-outline" id="rvCopy"><i data-ic="copy"></i>复制</button>
          <button class="primary" id="rvUse"><i data-ic="arrow-up"></i>用此提示词生图</button>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="page" data-page="assets">
  <div style="flex:1;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto">
    <div class="feed-head"><b>我的素材</b><span class="note">生成产物与上传素材都在本地存储目录</span></div>
    <p class="banner" id="asMigrate" hidden></p>
    <div class="row" style="flex-wrap:wrap;gap:6px">
      <input id="asSearch" placeholder="搜文件名 / 路径" style="flex:1;min-width:160px"/>
      <select id="asType">
        <option value="all">全部</option>
        <option value="generated">生成产物</option>
        <option value="uploaded">上传素材</option>
      </select>
      <button class="ghost" id="asUploadBtn"><i data-ic="cloud-upload"></i>上传素材…</button>
      <input id="asUpload" type="file" accept="image/*,video/*" multiple hidden/>
      <button class="ghost" id="asBatch"><i data-ic="check"></i>多选管理</button>
      <button class="ghost" id="asRefresh"><i data-ic="refresh"></i>刷新</button>
    </div>
    <div class="row" id="asBatchBar" style="display:none;flex-wrap:wrap;gap:6px;padding:8px;border:1px dashed var(--border);border-radius:10px">
      <span class="note" id="asSelCount">已选 0 个</span>
      <button class="ghost" id="asAll">全选本页</button>
      <button class="ghost" id="asZip"><i data-ic="download"></i>打包下载 ZIP</button>
      <button class="ghost" id="asDelete"><i data-ic="trash"></i>删除所选</button>
    </div>
    <div class="grid" id="asGrid"></div>
    <div class="row" style="justify-content:center;margin:4px 0;align-items:center">
      <button class="ghost" id="asPrev">上一页</button>
      <span class="note" id="asPageInfo"></span>
      <button class="ghost" id="asNext">下一页</button>
    </div>
  </div>
</section>

<section class="page" data-page="canvas">
  <div class="cvwrap">
    <div class="canvas" id="canvas"></div>
    <div class="cvpill cv-top-left">
      <i data-ic="layers"></i>
      <select id="cvSwitch" title="切换画布"></select>
      <span class="note" id="cvCount">已保存</span>
      <button class="cv-ico" id="cvNew" title="新建画布"><i data-ic="plus"></i></button>
      <button class="cv-ico" id="cvRename" title="重命名画布"><i data-ic="edit"></i></button>
    </div>
    <div class="cvpill cv-tools">
      <button id="cvText" title="文本节点"><i data-ic="type"></i></button>
      <button id="cvCfg" title="编排节点"><i data-ic="wand"></i></button>
      <button id="cvImg" title="图片节点"><i data-ic="image"></i></button>
      <button id="cvVid" title="视频节点"><i data-ic="video"></i></button>
      <button id="cvUndo" title="撤销 (Ctrl+Z)"><i data-ic="undo"></i></button>
      <button id="cvRedo" title="重做 (Ctrl+Y)"><i data-ic="redo"></i></button>
      <button id="cvDel" title="删除选中"><i data-ic="trash"></i></button>
    </div>
    <div class="cvpill cv-top-right">
      <select id="cvMaskProvider" title="局部重绘渠道（只列支持遮罩编辑的）"></select>
      <button class="primary" id="cvSend" style="height:30px;font-size:12px;padding:0 12px"><i data-ic="send"></i>发送出图</button>
    </div>
    <div class="cvpill cv-zoom">
      <button id="cvZoomOut" title="缩小"><i data-ic="minus"></i></button>
      <span id="cvZoomPct">100%</span>
      <button id="cvZoomIn" title="放大"><i data-ic="plus"></i></button>
      <button id="cvFit" title="适应全部"><i data-ic="maximize"></i></button>
    </div>
    <div class="cvpill cv-help" id="cvHint">开箱已连好文本→编排。滚轮缩放 · 空格拖动画布 · 双击/右键建节点 · 点线可选中删除 · Ctrl+Z 撤销 · Ctrl+C/V/D 复制粘贴副本 · Delete 删除</div>
  </div>
</section>

${uiDesignHtml}

<section class="page" data-page="tpl">
  <div style="flex:1;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto">
    <div class="feed-head"><b>提示词广场</b><span class="note">多来源模板 · 分类搜索 · 收藏 · 一键回填</span></div>
    <div class="row" style="flex-wrap:wrap;gap:6px">
      <select id="tplSource"></select>
      <input id="tplSearch" placeholder="搜标题 / 提示词 / 作者" style="flex:1;min-width:160px"/>
      <button class="ghost" id="tplFavOnly"><i data-ic="star"></i>只看收藏</button>
      <button class="ghost" id="tplCache"><i data-ic="download"></i>缓存图片供离线浏览</button>
    </div>
    <div class="row" style="flex-wrap:wrap;gap:6px" id="tplCats"></div>
    <div class="row" style="flex-wrap:wrap;gap:6px;padding:8px;border:1px dashed var(--border);border-radius:10px">
      <input id="tplUrl" placeholder="在线清单 URL（JSON），粘贴后点更新" style="flex:1;min-width:220px"/>
      <button class="ghost" id="tplFetch">在线更新</button>
    </div>
    <div class="grid" id="tplGrid"></div>
  </div>
</section>

<section class="page page-modal" data-page="settings">
  <div class="modal-card">
    <div class="modal-head"><i data-ic="settings"></i>设置<button class="x" id="settingsClose" title="关闭 (Esc)"><i data-ic="x"></i></button></div>
    <div class="modal-body">
      <h3 style="margin:10px 0 4px;font-size:14px">渠道</h3>
      <p class="note">密钥只写环境变量名，不写进浏览器、日志或 plan.json。值放 <code>$DSH_HOME/.credentials.yaml</code>。协议固定走 OpenAI 兼容 <code>/images/generations</code>（xAI/Grok/大多数中转站都是这套），mock 是内置离线渠道，不用配置也能出概念板。</p>
      <p class="banner" id="settingsHint">还没有渠道时，工作台会走内置 mock，仍可直接出图。</p>
      <div class="chcard" id="chExisting" style="display:none">
        <div class="cfgrow"><span class="cfglabel">正在编辑</span><b id="chEditingId"></b> <button class="ghost" id="chEditCancel" style="margin-left:auto">取消编辑 · 新建渠道</button></div>
      </div>
      <div class="cfgrow"><span class="cfglabel">渠道 id</span><input id="chId" class="cfgfull" placeholder="openai / grok / seedream"/></div>
      <div class="cfggrid2">
        <div class="cfgrow"><span class="cfglabel">生图模型（必填）</span><input id="chModel" class="cfgfull" placeholder="gpt-image-2"/></div>
        <div class="cfgrow"><span class="cfglabel">地址（必填）</span><input id="chUrl" class="cfgfull" placeholder="https://api.openai.com/v1"/></div>
        <div class="cfgrow"><span class="cfglabel">视频模型（可选）</span><input id="chVideoModel" class="cfgfull" placeholder="grok-imagine-video"/></div>
        <div class="cfgrow"><span class="cfglabel">编辑/图生图模型（可选）</span><input id="chEditModel" class="cfgfull" placeholder="grok-imagine-edit"/></div>
        <div class="cfgrow"><span class="cfglabel">视觉/反推模型（可选）</span><input id="chVisionModel" class="cfgfull" placeholder="grok-4.5"/></div>
        <div class="cfgrow"><span class="cfglabel">密钥环境变量名（必填）</span><input id="chEnv" class="cfgfull" placeholder="IMAGE_STUDIO_KEY"/></div>
      </div>
      <div class="row" style="margin-top:12px;gap:8px">
        <button class="primary" id="chSave">保存渠道（本机）</button>
        <button class="ghost" id="chDetect">检测可用模型</button>
      </div>
      <p class="note" id="chDetectOut">检测不会列出纯聊天 / Embedding 模型。未配密钥时会明确说是鉴权问题。</p>
      <div id="chDetectList" class="row" style="flex-wrap:wrap;gap:6px;margin:4px 0 8px"></div>
      <label style="margin-top:8px">已保存的渠道</label>
      <div id="chList" class="chlist"></div>
      <h3 style="margin:18px 0 4px;font-size:14px">界面</h3>
      <label class="row" style="align-items:center;gap:8px;margin:0;cursor:pointer"><input type="checkbox" id="showTplNav" style="width:auto;margin:0"/> 在侧边栏显示「提示词广场」入口（连点 logo 5 次也能开）</label>
      <h3 style="margin:18px 0 4px;font-size:14px">存储与数据</h3>
      <p class="note" id="storageInfo">存储信息读取中…</p>
      <p class="note">图片和视频存本地 <code>.dsh/image-studio/</code> 目录，文件管理器可直接找到，也可在「我的素材」页管理。历史 / 画布 / UI 设计数据分别存在浏览器本地（imagestudio.history / imagestudio.canvas:* / imagestudio.uidesign）。改存储路径：在宿主插件配置里改 <code>workspaceRoot</code> 后重启，新文件进新目录，旧目录文件原地保留，不会自动删除。</p>
      <div class="row" style="margin-top:8px">
        <button class="ghost" id="bkExport"><i data-ic="download"></i>导出备份（历史 / 画布 / 设置）</button>
        <button class="ghost" id="bkImportBtn"><i data-ic="cloud-upload"></i>还原备份…</button>
        <input id="bkImport" type="file" accept="application/json,.json" hidden/>
      </div>
      <p class="note" id="bkHint">备份只含浏览器本地数据；图片视频文件本身在存储目录里，直接复制该目录即可一并备份。</p>
    </div>
  </div>
</section>

</div><!-- /main -->

<div class="dlg" id="tplDetail">
  <div class="dlg-card" style="width:min(640px,94vw)">
    <div class="dlg-head"><i data-ic="library"></i><span id="tplDTitle"></span><button class="x" id="tplDClose"><i data-ic="x"></i></button></div>
    <div class="dlg-body">
      <img id="tplDImg" alt="" style="width:100%;border-radius:12px;background:var(--muted)"/>
      <p class="note" id="tplDMeta" style="margin:0"></p>
      <p id="tplDPrompt" style="white-space:pre-wrap;font-size:13px;margin:0"></p>
      <p class="note" id="tplDNeg" style="white-space:pre-wrap;margin:0"></p>
    </div>
    <div class="dlg-foot">
      <a class="ghost" id="tplDLink" href="#" target="_blank" rel="noreferrer"><i data-ic="external"></i>原链接</a>
      <button class="ghost" id="tplDFav"><i data-ic="star"></i>收藏</button>
      <button class="primary" id="tplDFill"><i data-ic="arrow-up"></i>一键回填去生图</button>
    </div>
  </div>
</div>

<div class="lb" id="lb">
  <div class="stage"><img id="lbImg" alt="" style="display:none"/><video id="lbVid" controls playsinline style="display:none;background:#000;max-width:92vw;max-height:82vh"></video></div>
  <div class="row" style="justify-content:center;gap:6px;margin-top:6px">
    <button class="ghost" id="lbRef">当参考图</button>
    <button class="ghost" id="lbChat">复制提示词</button>
    <button class="ghost" id="lbCanvas">加入画布</button>
    <button class="ghost" id="lbGal">素材库查看</button>
  </div>
  <p class="note" id="lbCap">滚轮缩放 0.5x–3x · ← → 翻页 · Esc 关闭</p>
</div>

<div class="dlg" id="dlgQuick">
  <div class="dlg-card">
    <div class="dlg-head"><i data-ic="zap"></i>快速提示词<button class="x" data-close="dlgQuick"><i data-ic="x"></i></button></div>
    <div class="dlg-body">
      <div class="cfgtabs" id="quickTabs" style="margin-top:0">
        <button data-qt="1" data-on>文生图</button>
        <button data-qt="2">图生图</button>
      </div>
      <div id="quickList" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>
  </div>
</div>

<div class="dlg" id="dlgLib">
  <div class="dlg-card">
    <div class="dlg-head"><i data-ic="file-text"></i>提示词素材<button class="x" data-close="dlgLib"><i data-ic="x"></i></button></div>
    <div class="dlg-body">
      <p class="note" style="margin:0">存在浏览器本地。点「使用」填进生图输入框。</p>
      <div id="libList" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>
  </div>
</div>

<div class="dlg" id="dlgOpt">
  <div class="dlg-card">
    <div class="dlg-head"><i data-ic="wand"></i>优化提示词<button class="x" data-close="dlgOpt"><i data-ic="x"></i></button></div>
    <div class="dlg-body">
      <p class="note" style="margin:0">本地规则优化（补镜头 / 光线 / 质感词）。要 AI 深度改写，回 Agent 对话里说一声。</p>
      <label style="margin:0">原始</label>
      <textarea id="optSrc" readonly style="min-height:70px"></textarea>
      <label style="margin:0">优化后（可继续编辑）</label>
      <textarea id="optOut" style="min-height:110px"></textarea>
    </div>
    <div class="dlg-foot">
      <button class="ghost" data-close="dlgOpt">取消</button>
      <button class="primary" id="optApply">应用到输入框</button>
    </div>
  </div>
</div>

<div class="dlg" id="dlgPick">
  <div class="dlg-card" style="width:min(720px,94vw)">
    <div class="dlg-head"><i data-ic="images"></i>从素材库选择参考图<button class="x" data-close="dlgPick"><i data-ic="x"></i></button></div>
    <div class="dlg-body">
      <div class="pick-grid" id="pickGrid"></div>
    </div>
    <div class="dlg-foot">
      <span class="note" id="pickCount" style="margin-right:auto">已选 0 张</span>
      <button class="ghost" data-close="dlgPick">取消</button>
      <button class="primary" id="pickOk">添加为参考图</button>
    </div>
  </div>
</div>

<div class="dlg" id="dlgConfirm">
  <div class="dlg-card" style="width:min(420px,92vw)">
    <div class="dlg-head"><i data-ic="alert"></i>确认操作</div>
    <div class="dlg-body"><p id="confirmMsg" style="margin:0;font-size:13px"></p></div>
    <div class="dlg-foot">
      <button class="ghost" id="confirmCancel">取消</button>
      <button class="primary" id="confirmOk" style="background:var(--destructive)">确定</button>
    </div>
  </div>
</div>

<div class="dlg" id="randView">
  <div class="dlg-card" style="width:min(720px,94vw)">
    <div class="dlg-head"><i data-ic="dice"></i><span id="randTitle">随机图片</span><button class="x" data-close="randView"><i data-ic="x"></i></button></div>
    <div class="dlg-body" style="align-items:center">
      <img class="rand-img" id="randImg" alt="随机图片"/>
    </div>
    <div class="dlg-foot">
      <button class="ghost" id="randAgain"><i data-ic="refresh"></i>换一张</button>
      <a class="ghost" id="randOpen" href="#" target="_blank" rel="noreferrer"><i data-ic="external"></i>新窗口打开</a>
      <button class="primary" id="randUse"><i data-ic="image-plus"></i>设为参考图</button>
    </div>
  </div>
</div>

<div class="pop" id="popModel"><p class="pop-title">模型</p><div id="popModelList" style="display:flex;flex-direction:column"></div></div>
<div class="pop" id="popRes"><p class="pop-title">输出分辨率</p><div class="row" id="clarity"></div></div>
<div class="pop" id="popRatio"><p class="pop-title">图像比例</p><div class="row" id="ratios"></div></div>
<div class="pop" id="popN"><p class="pop-title">并行数量</p><div class="row" id="counts"></div></div>
<div class="pop" id="popTemp"><p class="pop-title">温度</p><div class="row" id="tempChips"></div><p class="note" style="margin:8px 0 0">0 = 精确 · 1 = 均衡 · 2 = 创意</p></div>

<div class="toast" id="status"></div>

<script>
// ---- lucide 图标（MIT）内联，[data-ic] 自动水合 ----
const ICONS = {
  'infinity':'<path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"/>',
  'rect-h':'<rect width="18" height="12" x="3" y="6" rx="2"/>',
  'thermo':'<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  'sparkles':'<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  'bot':'<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  'video':'<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  'frame':'<line x1="22" x2="2" y1="6" y2="6"/><line x1="22" x2="2" y1="18" y2="18"/><line x1="6" x2="6" y1="2" y2="22"/><line x1="18" x2="18" y1="2" y2="22"/>',
  'scissors':'<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
  'images':'<path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"/><circle cx="12" cy="8" r="2"/><rect width="16" height="16" x="6" y="2" rx="2"/>',
  'scan':'<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  'film':'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
  'library':'<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  'dice':'<rect width="12" height="12" x="2" y="10" rx="2" ry="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/>',
  'user':'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'image':'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  'chev-down':'<path d="m6 9 6 6 6-6"/>',
  'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  'moon':'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'panel-close':'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>',
  'panel-open':'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>',
  'settings':'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'cloud-upload':'<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>',
  'image-plus':'<path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>',
  'cpu':'<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
  'zap':'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  'file-text':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  'save':'<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  'wand':'<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/>',
  'x':'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'arrow-up':'<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  'bag':'<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  'bulb':'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  'copy':'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'download':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  'trash':'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  'plus':'<path d="M5 12h14"/><path d="M12 5v14"/>',
  'minus':'<path d="M5 12h14"/>',
  'search':'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'eye':'<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':'<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  'brush':'<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
  'undo':'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  'redo':'<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>',
  'maximize':'<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
  'type':'<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
  'layers':'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  'check':'<path d="M20 6 9 17l-5-5"/>',
  'alert':'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'refresh':'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  'external':'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'edit':'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  'star':'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'clock':'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'play':'<polygon points="6 3 20 12 6 21 6 3"/>',
  'send':'<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  'folder':'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  'link':'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
};
function ic(name){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[name]||'')+'</svg>'; }
function hydrateIcons(root){ (root||document).querySelectorAll('[data-ic]').forEach(el=>{ el.innerHTML = ic(el.dataset.ic); }); }

const RATIOS = ['自动','1:1','3:4','4:3','9:16','16:9','2:3','3:2','21:9'];
const CLARITY = ['自动','1K','2K','4K'];
const COUNTS = [1,2,3,4];
const TEMPS = [{v:0,l:'精确'},{v:1,l:'均衡'},{v:2,l:'创意'}];
const MAX_REFS = 16;
const SKILL_UI = [
  {id:'cinema-dna-21x9x3', name:'电影三联', hint:'3 张 21:9 + 本地拼接'},
  {id:'cinema-dna-cover', name:'三联封面', hint:'已有三联后再出 3:4 封面', maps:'cinema-dna-21x9x3'},
  {id:'movie-poster', name:'电影海报', hint:'9:16 分层海报'},
  {id:'life-force-portrait', name:'人像', hint:'升级已有照片 / 原创'},
  {id:'photography-simulation', name:'摄影', hint:'任意地点拍照感'},
  {id:'character-casting', name:'角色', hint:'默认同人设一张，勾选才出三视图'}
];
const RAND_SOURCES = {
  ba: { name:'BA人物', url:'https://img.catcdn.cn/ba/' },
  bing: { name:'Bing壁纸', url:'https://bing.img.run/rand_uhd.php' }
};
const QUICK_PROMPTS = [
  {title:'图片去水印', content:'去除画面中的水印和覆盖文字，自然补全被遮挡区域，尽量不改变原图内容', type:2},
  {title:'人物/物品替换', content:'图一为目标场景，图二及以后为需要目标图，保留目标图姿态、背景和光影，将商品参考图自然替换到画面中', type:2},
  {title:'服装/试衣替换', content:'图一为目标场景，图二及以后为需要目标人物图，保留目标图人物身份、姿态和背景，将服装参考图自然穿到人物身上', type:2},
  {title:'智能抠图', content:'移除背景并输出透明底图，主体边缘干净完整，不要出现白边、灰边或锯齿', type:2},
  {title:'传统手艺糖画生成', content:'（写实近景美食摄影，竖版3：4，暖色室内灯光。画面主体是一张刚做好的糖画放在不锈钢金属台面上：糖画为该图片内容，整体线条童趣简洁）由透明琥珀金色糖浆勾勒并局部填充，线条有轻微厚薄变化；糖浆表面光泽强，能看见细小气泡与凝固流纹，高光反射明显。糖画中插着一根木签，木签浅黄。金属台面有真实反光与轻微划痕，能看到糖画的倒影与高光。糖画左下角放着一部黑色手机，手机屏幕亮起，显示同一个图片内容的简介线稿参考图（白底或浅色底，黑色描边，可以带腮红点与简化鬓毛线条），构图明确呈现“对照手机图案制作糖画”。背景上方轻微虚化，可见少量春节元素一角（可选：红色年画/生肖盘边框），但背景不抢主体整体对焦在糖画和手机屏幕，清晰锐利，高分辨率，真实质感，干净构图。', type:2},
  {title:'转二次元风格', content:'**关键画风要求（请严格遵守）：**1.  **绘画技法：** 模仿“现代日系厚涂”（Modern Anime Atsunuri）风格。请使用“不透明水彩”（Gouache）或“柔和数码绘画”（Soft Digital Painting）的质感。2.  **线条处理：** 不要使用黑色、锐利的轮廓线（No hard black outlines）。边缘应当是柔和的，通过色块的自然过渡来表现结构。3.  **光影与质感：** 画面要保持“干净、平滑”（Clean and Smooth），**不要**出现粗糙的画布纹理或厚重的颜料堆积感。皮肤要通透，头发要有柔和的光泽感（Soft highlights）。4.  **整体氛围：** 类似高质量的手游立绘或轻小说封面，色彩鲜艳且饱和。参考图角色的半身像特写。她有着凌乱但蓬松的她有一双非常精致、水润的大眼睛（High detail shiny eyes），神情温柔，面带微笑和淡淡的红晕。背景是简单的纯白背景1：1，最高品质', type:2},
  {title:'Q版角色LINE风格表情包生成', content:'为我生成图中角色的绘制 Q 版的，LINE 风格的半身像表情包，注意头饰要正确彩色手绘风格，使用 4x6 布局，涵盖各种各样的常用聊天语句，或是一些有关的娱乐 meme其他需求：不要原图复制。所有标注为手写简体中文。生成的图片需为 4K 分辨率 16:9', type:2},
  {title:'人物OC拆解二次生图', content:'(你是一名专业的游戏和动漫概念艺术家:1.2)，(擅长制作标准角色设计分解表:1.1)。(严格创建全景角色概念分解图:1.2)，(仅参考用户的参考图像:1.2)。中心是完整的全身站立角色形象:1.2)，周围环绕着(服装细节:1.1)、(材质纹理:1.1)、(核心道具:1.1)以及(表情变化:1.1)。(设计不少于4种不同的面部表情变体:1.2)。视觉规格1. 布局构图- (中心位置:严格的纯正面全身站立角色:1.2)，(从头到脚完整展示,无裁剪:1.2)。(角色不持任何道具:1.2)，(手自然放松:1.1)。- (周围布局:整齐排列的拆解部件、纹理细节和表情变化:1.2)。- (使用简易手绘箭头和引导线:1.1)，(将每个组件连接到角色对应的位置:1.2)。2. 拆解细节- (仅依据参考图像中展示的服装风格和配饰进行拆解:1.2)。- (不要绘制内衬、内衣或隐藏的服装层:1.2)。- (合理补充参考图像中未完整展示的服装缺失部分:1.1)。- (禁止添加任何原始参考中未出现的新服装、配饰和装饰:1.2)。3. 拆解展示(无文字、无标签、无注释、无标题:1.3)，(仅纯视觉绘图展示:1.2)。', type:2},
  {title:'彩铅画风拍立得', content:'请根据参考图中角色生成一张拍立得：拍立得照片质感；日式彩铅素描画风；画面比例2：3；半身像参考图中角色，穿着短袖衬衫和夏季短裤，背向镜头，坐在灰色水泥路上，看着周围的风景；在角色的面前（也就是背景），背景中有缓缓流淌的小溪、在小溪左侧的民居、干燥的山坡、淡蓝色的天空。背景为炎炎夏日，整体光影在夏日炎热的空气中显现出一种苍白色。', type:2},
  {title:'联名图片生成', content:'生成一张 [    ] 联动 [    ]  的活动宣传图。竖屏比例。人物占据画面右侧三分之二的空间，左侧为 [    ] logo和人物名字 [    ] ，下接活动宣传语，以及相关人物介绍。还有小字注明 [    ] 。文艺风格。', type:2},
  {title:'论转教授白板板书', content:'将这个论文转换为中文教授白板图片，帮助我理解信息:', type:1},
  {title:'俄国解构主义海报', content:'生成一张 [    ] 的宣传海报，要求将 [    ]  拟人化成一个动漫女性角色。俄国构成主义风格，平面设计插画，极简主义矢量艺术，复古宣传海报。画面由强烈的几何形状构成，包含大量的锐利三角形、圆形和粗重的对角线切割。色调采用极简的三色限定：高饱和度 [    ] 色、深黑色和米白色（做旧纸张感）。整体具有复古丝网印刷质感，布满细腻的颗粒噪点和磨损纹理。构图充满张力，强调不对称的平衡感和工业力量感，锐利的线条边缘，扁平化视觉，高对比度。', type:1},
  {title:'炫彩矩形风格海报', content:'生成一张 [    ]  的人物海报。故障艺术风格，赛博朋克动漫美学，数字碎片化构图。画面由多个错位的矩形窗口和几何切片叠加而成，呈现出一种数据损坏和图像溢出的视觉感。核心风格包含：像素排序（Pixel Sorting）效果、RGB色彩偏移、横向拉伸的数字噪点以及彩虹色调的电流纹理。背景采用极简主义的米白色，与画面中心高饱和度的湛蓝天空、厚重的积雨云形成强烈视觉对比。整体氛围带有超现实的忧郁感和深邃的数字空间感，构图错落有致，充满现代平面设计感。', type:1},
  {title:'错位矩形风格海报', content:'二次元平面艺术插画，角色为 [    ]  。人物的衣服、动作、表情均可以替换。人物需要尽量使用全身像，且不使用常规的正面全身像而是做出展现人物动态的速写动作。画面采用“窗口重叠 (Window Overlay)”与“数字拼贴”的构图。角色的轮廓由多个错位的矩形框构成，某些方框区域被处理成透明视窗，展示出清朗的蓝天与积雨云纹理，仿佛角色体内蕴含着广阔的天空。画面中装饰有精美的故障艺术 (Glitch Art) 元素，如极简的黑色几何长条、细密的彩色电子扫描线以及错位的色彩偏移纹理。整体视觉呈现出一种现代平面设计的律动感，色彩以克莱因蓝和纯净白为主，背景简洁明快，氛围宁静且富有诗意。', type:1},
  {title:'半调双色雕刻海报', content:'一幅极简主义平面设计海报，采用“半调雕刻线稿”风格（Engraving Halftone Style）。画面由密集的 [线条形状：如“同心圆”或“平行弧线”] 构成，通过线条的粗细变化和疏密程度，巧妙地勾勒出 [    ] 的轮廓与面部阴影，形成强烈的立体感。视觉表现上采用极简双色调方案，背景色为 [例如“深蓝色”] ，线条颜色为 [例如“明黄色”] 。整体构图简洁有力，具有矢量艺术的质感，风格前卫且具有现代主义海报设计感。', type:1},
  {title:'复古平面半调杂志海报', content:'现代复古平面海报设计，Risograph半调网点印刷风格。画面正中心是 [    ] 。主体采用深蓝与米白交织的半调网点纹理表现。背景为带有粗糙颗粒感的米色纸张。主体背后衬托着一个明黄色的几何实心拱门色块。主体周围环绕着极细的抽象交错轨道线条和几个微小的品红色四芒星符号。画面边缘（顶部和底部）带有深蓝色的复古粗体无衬线排版文字，部分文字带有明黄色高光色块底色。右上角包含一个条形码图形元素。整体构图极简，色彩对比强烈，具有波普艺术和复古杂志封面的视觉冲击力。', type:1},
  {title:'欸？这是什么？', content:'想生成一张看上去不是AI生成的照片', type:1},
  {title:'收藏版史诗叙事海报', content:'根据【     】自动生成一张收藏版史诗叙事海报：巨大优雅的人物侧脸剪影作为外轮廓，剪影内部自动生长出最契合该主题的完整世界观、标志性场景、角色关系、象征符号、关键建筑、生物、道具与氛围。整体不是普通拼贴，而是高级的剪影轮廓填充式叙事合成，带有双重曝光式联想，但更偏电影海报与梦幻水彩插画融合风格；柔和空气透视，轻雾化过渡，纸张颗粒，边缘飞白与刷痕，大面积留白，版式克制高级，安静、宏大、神圣、怀旧、诗意、传说感强。风格、色彩、场景、材质全部根据主题自动适配，所有元素必须强绑定主题，一眼识别，不要杂乱，不要硬拼贴，不要模板化背景，不要廉价奇幻素材。画面中需自然加入专属签名，作为海报设计的一部分，位置低调但清晰，可放在左下角、右下角或标题附近，风格需与整体版式统一，像收藏版海报的作者落款或设计签章；签名字体精致、克制、高级，不可过大，不可破坏主体构图，不可显得突兀廉价。4K，9:16', type:1},
  {title:'米白红电路图海报', content:'根据【     】，处于失重倒立或悬浮的动态姿势。画面呈现极简平面化的日系赛博流行插画风格，采用极具视觉冲击力的色彩对比：在大面积温暖的奶油米色留白背景中，漂浮着一个巨大的不规则有机色块作为核心视觉锚点。该色块的颜色与主体主要衣物的颜色完全一致，使主体的服装边缘与背景色块无缝交融，形成强烈的视觉延伸感。在这片纯净的底色块内部，叠加了白色的线性电路节点、几何网状分支图以及等宽字体的代码与二进制符号。主体刻画采用干净的平涂赛璐璐上色与清晰的黑色线稿，剔除复杂的光影体积。整体构图呈对角线动势，具有强烈的Y2K极客文化视觉特征、二维海报平面排版感与凝固的瞬时张力。', type:1},
  {title:'平涂思维爆发海报', content:'根据【     】，置于画面中央偏下，微微仰头，呈现出空灵、内省的神态。主体的顶端（如头部或发丝）与上方的抽象空间产生无缝的物理交融，仿佛意识正在解体并向上升腾，迸发出大量高密度、失重漂浮的视觉碎片。摒弃中心放射状的爆炸构图，采用错综复杂、相互垂直穿插的平面拼贴排版。这些密集堆叠的碎片包含：极细线条勾勒的断裂建筑切片（如错位的阶梯、残缺的墙体与拱门）、如水波般流动的细长华丽丝带曲线、锐利的几何碎块，以及散落的纤细十字四芒星。画面下方及四周留出大面积纯白负空间，形成极端的疏密对比与彻底的二维扁平化透视。整体视觉呈现出清透、细腻的日系独立插画与超现实波普艺术风格，高度依赖极细、脆弱且干净的线稿（Ligne claire）来界定所有轮廓。光影处理为绝对的无渐变赛璐璐平涂（Flat Shading），没有厚涂或3D体积感。色彩科学受到严格限制，以鲜明清冷的冰蓝色与深邃钴蓝为主导，冷暖撞色交织着柔和复古的芥末黄与淡土金。在材质与后期方面，色块边缘保持干净锐利（无破损做旧痕迹），但全局画面统一覆盖着一层浓郁且均匀的复古噪点颗粒，营造出强烈的 Risograph 丝网印刷质感与微距下的画纸肌理，完美定格了极简与繁复并存的梦境瞬间。', type:1},
  {title:'工业档案袋风格海报', content:'根据【     】，置于复古工业风混合媒材拼贴艺术的视觉语境中。画面底层由密集的70年代电子电路图、泛黄做旧的档案纸张与模糊的打字机排版字符交叠构成。主体以带有强烈胶片颗粒感和半色调网点的摄影残片形式呈现，与硬朗的黑色墨水线稿、抽象等高线草图及粗糙的复印件残页形成错位、无序的几何层叠。整体呈现低饱和度的前数字时代档案色调，以复古纸张的米褐为主，局部叠加做旧的丹宁蓝与灰阶色块。构图扁平且信息密度极高，充满不对称的负空间切割。画面充斥着老式复印机的碳粉磨损、纸张纹理与二维扫描噪点，营造出一种孤寂、冷峻且充满怀旧科技感的粗野主义美学氛围。', type:1},
  {title:'概念可视化/知识地图', content:'创建一个解释[    ]的教育信息图。视觉元素：展示关键组成部分：[    ]风格：简洁、扁平化的矢量插图，适合高中科学教科书。使用箭头表示部分需求。标签：用简体中文清晰地标注每个元素。', type:1},
];const MAX_UPLOAD = 10 * 1024 * 1024;
const state = { page:'gen', mode:'txt', skillId:'', ratio:'自动', clarity:'自动', n:1, temp:1, auto:true, providerId:'', durationSec:2, plan:null, lastImages:[], history:[], lbScale:1, lbIndex:0, lbList:[], histFilter:'all', pageBeforeSettings:'gen', providers:[], meta:null };

const $ = (id) => document.getElementById(id);
let statusTimer = null;
function setStatus(t){
  const el = $('status');
  el.textContent = t || '';
  if (statusTimer) clearTimeout(statusTimer);
  if (t) statusTimer = setTimeout(()=>{ el.textContent=''; }, 4000);
}
function loadLS(key, fallback){
  try { const v = JSON.parse(localStorage.getItem('imagestudio.'+key)||''); return v || fallback; } catch { return fallback; }
}
function saveLS(key, val){
  try { localStorage.setItem('imagestudio.'+key, JSON.stringify(val)); } catch (e) { console.warn('[imagestudio] saveLS failed:', e); }
}
// 旧画廊迁移提示：gallery 页签已删除，能力由「我的素材」页承接（生成产物筛选视图）。
state.legacyGalleryCount = (loadLS('gallery', []) || []).length;
state.history = loadLS('history', []);
state.channels = loadLS('channels', []);
state.auto = loadLS('autoLayout', true);
state.temp = loadLS('temp', 1);
state.providerId = loadLS('providerId', '');
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
  let out;
  try { out = JSON.parse(text); } catch { return { error:text || ('HTTP '+res.status), status:res.status, httpStatus:res.status }; }
  if (out && typeof out === 'object' && !Array.isArray(out) && out.httpStatus === undefined) out.httpStatus = res.status;
  return out;
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
      if (s.id === 'cinema-dna-21x9x3') { state.ratio = '21:9'; state.auto = false; }
      if (s.id === 'cinema-dna-cover') { state.ratio = '3:4'; state.auto = false; }
      if (s.id === 'movie-poster') { state.ratio = '9:16'; state.auto = false; }
      sync();
    };
    box.append(b);
  });
}
function renderModelPop(){
  const box = $('popModelList');
  box.innerHTML = '';
  const mk = (id, label) => {
    const b = document.createElement('button');
    b.className = 'popt';
    b.innerHTML = '<span style="flex:1">'+escapeHtml(label)+'</span>'+(state.providerId===id?ic('check'):'');
    if (state.providerId===id) b.dataset.on = '1';
    b.onclick = () => { state.providerId = id; saveLS('providerId', id); sync(); closePops(); };
    box.append(b);
  };
  mk('', '自动（默认渠道）');
  (state.providers||[]).filter(p=>!p.mock).forEach(p=>mk(p.id, p.id + (p.model?' · '+p.model:'')));
}
function sync(){
  if (state.mode!=='txt' && state.mode!=='img') state.mode = 'txt';
  document.querySelectorAll('#tabs [data-page]').forEach(b=>b.toggleAttribute('data-on', b.dataset.page===state.page));
  document.querySelectorAll('.page').forEach(p=>p.toggleAttribute('data-on', p.dataset.page===state.page));
  chips($('ratios'), RATIOS, 'ratio');
  chips($('clarity'), CLARITY, 'clarity');
  chips($('counts'), COUNTS, 'n');
  const tc = $('tempChips');
  tc.innerHTML = '';
  TEMPS.forEach((t) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = t.v+' '+t.l;
    if (state.temp === t.v) b.dataset.on = '1';
    b.onclick = () => { state.temp = t.v; saveLS('temp', t.v); sync(); };
    tc.append(b);
  });
  // Nova GenerationParamsBar 标签
  $('pbRatioLabel').textContent = state.auto ? '自动' : state.ratio;
  $('pbResLabel').textContent = state.auto ? '自动' : state.clarity;
  $('pbNLabel').textContent = 'x'+state.n;
  $('pbTempLabel').textContent = Number(state.temp != null ? state.temp : 1).toFixed(2);
  const cur = (state.providers||[]).find(p=>p.id===state.providerId);
  $('pbModelLabel').textContent = cur ? cur.id + (cur.model && cur.model!==cur.id ? ' · '+cur.model : '') : '自动';
  // ✓自动：锁定输出分辨率与图像比例
  $('pbAuto').toggleAttribute('data-on', !!state.auto);
  $('pbAuto').textContent = state.auto ? '✓ 自动' : '自动';
  $('pbRes').toggleAttribute('data-locked', !!state.auto);
  $('pbRatio').toggleAttribute('data-locked', !!state.auto);
  $('go').disabled = false;
}
function showPlan(plan){
  const box = $('scoreBox');
  if (!plan) { box.hidden = true; return; }
  $('skillCard').open = true;
  const sc = plan.selfCheck || {};
  const shots = (plan.shots||[]).map(s=>s.id+' '+s.aspectRatio+'\\n'+s.prompt).join('\\n\\n');
  const reason = plan.reasoning ? Object.values(plan.reasoning).join('\\n') : '';
  box.hidden = false;
  box.innerHTML = '<b>方案自检 '+((sc.score!=null)?sc.score:'—')+' 分</b>'
    + (sc.passed===false ? '<p>有弱项：直接出图会被默认拦下，到时点「仍然出图」可放行。</p>' : '')
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
function mkAct(label, fn){
  const b=document.createElement('button'); b.className='ghost'; b.innerHTML=label; b.onclick=fn; return b;
}

// ---- 弹窗基座 ----
function openDlg(id){ $(id).setAttribute('data-on','1'); }
function closeDlg(id){ $(id).removeAttribute('data-on'); }
document.querySelectorAll('[data-close]').forEach(b=>{ b.onclick = ()=>closeDlg(b.dataset.close); });
document.querySelectorAll('.dlg').forEach(d=>{
  d.addEventListener('click', (e)=>{ if (e.target===d && d.id!=='dlgConfirm') d.removeAttribute('data-on'); });
});
let confirmResolve = null;
function confirmDlg(msg){
  $('confirmMsg').textContent = msg;
  openDlg('dlgConfirm');
  return new Promise((res)=>{ confirmResolve = res; });
}
$('confirmOk').onclick = ()=>{ closeDlg('dlgConfirm'); if (confirmResolve) confirmResolve(true); confirmResolve = null; };
$('confirmCancel').onclick = ()=>{ closeDlg('dlgConfirm'); if (confirmResolve) confirmResolve(false); confirmResolve = null; };

// ---- 参数气泡（Nova Popover 平移） ----
let openPop = null;
function closePops(){
  document.querySelectorAll('.pop').forEach(p=>p.removeAttribute('data-on'));
  openPop = null;
}
function togglePop(id, anchor){
  const pop = $(id);
  if (openPop === id) { closePops(); return; }
  closePops();
  pop.setAttribute('data-on','1');
  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
  let top = r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  pop.style.left = left+'px';
  pop.style.top = top+'px';
  openPop = id;
}
document.addEventListener('click', (e)=>{
  if (openPop && !e.target.closest('.pop') && !e.target.closest('.pchip')) closePops();
});
$('pbModel').onclick = (e)=>{ renderModelPop(); togglePop('popModel', e.currentTarget); };
$('pbRes').onclick = (e)=>togglePop('popRes', e.currentTarget);
$('pbRatio').onclick = (e)=>togglePop('popRatio', e.currentTarget);
$('pbN').onclick = (e)=>togglePop('popN', e.currentTarget);
$('pbTemp').onclick = (e)=>togglePop('popTemp', e.currentTarget);
$('pbAuto').onclick = ()=>{ state.auto = !state.auto; saveLS('autoLayout', state.auto); sync(); };

// ---- 参考图 chips（Nova AttachmentChips 平移） ----
function renderRefChips(){
  const box = $('refThumbs');
  if (!box) return;
  box.innerHTML = '';
  (state.lastImages||[]).forEach((p, i) => {
    const c = document.createElement('div');
    c.className = 'refchip';
    c.innerHTML = '<img src="'+fileSrc({path:p})+'" alt="参考图 '+(i+1)+'"/>';
    const x = document.createElement('button');
    x.innerHTML = '&times;';
    x.title = '移除这张参考图';
    x.onclick = () => {
      state.lastImages.splice(i, 1);
      if (!state.lastImages.length) state.mode = 'txt';
      sync(); renderRefChips();
    };
    c.append(x);
    box.append(c);
  });
  $('refCount').textContent = (state.lastImages||[]).length+' / '+MAX_REFS+' 张';
}
function thumbInto(box, path){
  if (!box) return;
  const im = document.createElement('img');
  im.src = fileSrc({ path });
  im.style.width = '72px';
  im.style.height = '72px';
  im.style.objectFit = 'cover';
  im.style.borderRadius = '8px';
  box.append(im);
}
// 通用单文件上传（base64 JSON 通路），返回服务端相对路径或 ''
async function uploadOne(f){
  if (f.size > MAX_UPLOAD) { setStatus('超过大小限制 10MB：'+f.name); return ''; }
  const buf = new Uint8Array(await f.arrayBuffer());
  let b64 = '';
  const chunk = 0x8000;
  for (let i=0;i<buf.length;i+=chunk) b64 += String.fromCharCode.apply(null, buf.subarray(i,i+chunk));
  const out = await api('/upload', { filename: f.name, mime: f.type || 'image/png', data: btoa(b64) });
  if (!out.path) { setStatus('上传失败：'+String(out.error||'未知错误')); return ''; }
  return out.path;
}
async function ingestFiles(files){
  for (const f of files) {
    if ((state.lastImages||[]).length >= MAX_REFS) { setStatus('参考图最多 '+MAX_REFS+' 张'); break; }
    if (!String(f.type||'').startsWith('image/')) { setStatus('只接受图片：'+f.name); continue; }
    const path = await uploadOne(f);
    if (path) state.lastImages = (state.lastImages||[]).concat([path]);
  }
  if (state.lastImages && state.lastImages.length) state.mode = 'img';
  sync(); renderRefChips();
  if (files.length) setStatus('已上传参考图 · '+(state.lastImages||[]).length+' / '+MAX_REFS+' 张');
}
$('refDrop').onclick = () => $('refFile').click();
$('refFile').onchange = async () => { await ingestFiles(Array.from($('refFile').files||[])); $('refFile').value=''; };
(function bindDrop(){
  const z = $('refDrop');
  const over = (on) => z.toggleAttribute('data-over', on);
  z.addEventListener('dragover', ev => { ev.preventDefault(); over(true); });
  z.addEventListener('dragleave', () => over(false));
  z.addEventListener('drop', async ev => {
    ev.preventDefault(); over(false);
    await ingestFiles(Array.from(ev.dataTransfer.files||[]));
  });
})();
document.addEventListener('paste', async (ev) => {
  const items = Array.from((ev.clipboardData && ev.clipboardData.items) || []);
  const files = items.map(it => it.kind==='file' ? it.getAsFile() : null).filter(Boolean);
  if (!files.length) return;
  const t = ev.target;
  if (t && (t.tagName==='TEXTAREA' || t.tagName==='INPUT')) return;
  if (state.page==='canvas' && window.__cvAddFile) { files.forEach(f => window.__cvAddFile(f)); return; }
  if (state.page==='reverse' && window.__rvIngest) { ev.preventDefault(); await window.__rvIngest(files); return; }
  ev.preventDefault();
  state.page = 'gen';
  await ingestFiles(files);
});

// ---- 任务流（Nova HistoryJobList / CompletedJobCard 平移） ----
function pushHistory(entry){
  state.history = state.history || [];
  state.history.unshift(entry);
  state.history = state.history.slice(0, 500);
  saveLS('history', state.history);
  renderHist();
}
function histFiltered(ignoreQuery){
  const q = (ignoreQuery ? '' : (($('histSearch')&&$('histSearch').value)||'').trim().toLowerCase());
  return (state.history||[]).filter(h => {
    const mode = h.mode || 'txt';
    if (state.histFilter !== 'all' && mode !== state.histFilter) return false;
    if (!q) return true;
    return (h.prompt||'').toLowerCase().includes(q) || String(h.ratio||'').includes(q) || String(h.skillId||'').includes(q) || String(h.model||'').toLowerCase().includes(q);
  });
}
function refillFrom(h){
  if (h.prompt) $('brief').value = h.prompt;
  if (h.ratio) state.ratio = h.ratio;
  if (h.clarity) state.clarity = h.clarity;
  if (h.n) state.n = h.n;
  if (h.skillId!==undefined) state.skillId = h.skillId;
  state.mode = h.mode || 'txt';
  state.lastImages = (h.refPaths||[]).slice ? (h.refPaths||[]).slice() : (h.path ? [h.path] : []);
  if (h.negative && $('negative')) $('negative').value = h.negative;
  state.page = 'gen';
  sync(); renderRefChips();
  setStatus('已回填参数');
}
async function copyImageToClipboard(src){
  try {
    const blob = await (await fetch(src)).blob();
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setStatus('图片已复制到剪贴板');
      return;
    }
    throw new Error('ClipboardItem unavailable');
  } catch (e) {
    console.warn('[imagestudio] copy image failed:', e);
    setStatus('复制图片失败：浏览器不支持或未授权，可改用下载');
  }
}
function downloadImg(src, name){
  const a = document.createElement('a');
  a.href = src;
  a.download = name || 'image';
  a.click();
}
function jobCard(h){
  const d = document.createElement('div');
  d.className = 'jobr';
  const x = document.createElement('button');
  x.className = 'job-x';
  x.innerHTML = ic('x');
  x.title = '移除这条记录（不删已生成的文件）';
  x.onclick = () => {
    const i = state.history.indexOf(h);
    if (i >= 0) state.history.splice(i, 1);
    saveLS('history', state.history);
    renderHist();
    setStatus('已移除 1 条记录 · 剩 '+state.history.length+' 条');
  };
  d.append(x);
  const imgs = (h.images && h.images.length) ? h.images : (h.path ? [{path:h.path, mime:h.mime}] : []);
  const first = imgs[0];
  const lbList = imgs.map(m => Object.assign({}, m, {prompt:h.prompt}));
  // 左：缩略图
  if (first) {
    const tw = document.createElement('div');
    tw.className = 'jobr-twrap';
    const im = document.createElement('img');
    im.src = fileSrc(first);
    im.title = '看大图';
    im.onclick = () => openLb(lbList, 0);
    tw.append(im);
    if (imgs.length > 1) {
      const n = document.createElement('span');
      n.className = 'jobr-n';
      n.textContent = 'x'+imgs.length;
      tw.append(n);
    }
    d.append(tw);
  }
  // 中：提示词 / 模型·协议 / 温度 / 分辨率·比例
  const mid = document.createElement('div');
  mid.className = 'jobr-mid';
  if (h.prompt) {
    const p = document.createElement('div');
    p.className = 'jobr-prompt';
    const txt = document.createElement('p');
    txt.textContent = h.prompt;
    const cp = document.createElement('button');
    cp.innerHTML = ic('copy');
    cp.title = '复制提示词';
    cp.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(h.prompt); setStatus('提示词已复制'); };
    p.append(txt, cp);
    mid.append(p);
  }
  const ln1 = document.createElement('div');
  ln1.className = 'jobr-line';
  const prov = (state.providers||[]).find(pp => pp.id === (h.providerId || state.providerId));
  const provProto = h.providerProtocol || (prov && prov.protocol) || '';
  const mdl = h.model || (prov && prov.model) || '';
  ln1.innerHTML = '<b>'+escapeHtml(mdl || '自动')+'</b>' + (provProto ? '<span>（'+escapeHtml(provProto)+'）</span>' : '');
  if (h.skillId) ln1.innerHTML += '<span>· '+escapeHtml((SKILL_UI.find(s=>s.id===h.skillId)||{}).name || h.skillId)+'</span>';
  mid.append(ln1);
  const ln2 = document.createElement('div');
  ln2.className = 'jobr-line';
  ln2.innerHTML = '<span title="温度">🌡 '+(h.temp != null ? Number(h.temp).toFixed(2) : '1.00')+'</span>';
  mid.append(ln2);
  const ln3 = document.createElement('div');
  ln3.className = 'jobr-line';
  ln3.innerHTML = '<span>输出分辨率：'+escapeHtml(h.clarity || '自动')+'</span><span>·</span><span>图像比例：'+escapeHtml(h.ratio || '自动')+'</span>'
    + '<span>·</span><span>'+(h.mode==='img' ? '图生图' : '文生图')+'</span>'
    + '<span>·</span><span>'+escapeHtml(new Date(h.ts || Date.now()).toLocaleString())+'</span>';
  mid.append(ln3);
  d.append(mid);
  // 右：2×2 图标（放大 / 下载 / 复制 / 重试），长按卡片右侧还有扩展菜单
  const btns = document.createElement('div');
  btns.className = 'jobr-btns';
  const mkIc = (icon, title, fn) => {
    const b = document.createElement('button');
    b.innerHTML = ic(icon);
    b.title = title;
    b.onclick = fn;
    return b;
  };
  if (first) btns.append(mkIc('maximize', '放大查看', () => openLb(lbList, 0)));
  if (first) btns.append(mkIc('download', imgs.length > 1 ? '下载全部' : '下载图片', () => {
    imgs.forEach(im => downloadImg(fileSrc(im), (im.path||'image').split('/').pop()));
  }));
  if (first) btns.append(mkIc('copy', '复制图片', () => copyImageToClipboard(fileSrc(first))));
  btns.append(mkIc('refresh', '重试', () => { refillFrom(h); doGenerate(false); }));
  d.append(btns);
  // 扩展动作：右键卡片 → 素材库查看 / 当参考图 / 拿去做视频 / 加入画布
  d.oncontextmenu = (e) => {
    e.preventDefault();
    const menu = [];
    menu.push({label: ic('folder')+'素材库查看', fn: () => { state.page='assets'; sync(); asLoad(); }});
    if (first && first.path) {
      menu.push({label: ic('image-plus')+'当参考图', fn: () => { state.lastImages=[first.path]; state.mode='img'; state.page='gen'; sync(); renderRefChips(); setStatus('已设为参考图'); }});
      menu.push({label: ic('video')+'拿去做视频', fn: () => { state.videoRef = first.path; state.page='video'; sync(); window.__vdRender && window.__vdRender(); setStatus('已带到视频首帧'); }});
      menu.push({label: ic('frame')+'加入画布', fn: () => { state.page='canvas'; sync(); window.__cvAddImage && window.__cvAddImage(first.path); }});
    }
    showJobMenu(e.clientX, e.clientY, menu);
  };
  return d;
}
// 任务卡右键扩展菜单（复用 ctx 组件样式）
function showJobMenu(px, py, items){
  let m = $('jobMenu');
  if (!m) {
    m = document.createElement('div');
    m.id = 'jobMenu';
    m.className = 'ctx';
    m.style.position = 'fixed';
    m.style.zIndex = '150';
    document.body.append(m);
    document.addEventListener('click', () => { m.style.display = 'none'; });
  }
  m.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button');
    b.innerHTML = it.label;
    b.onclick = () => { m.style.display = 'none'; it.fn(); };
    m.append(b);
  });
  m.style.left = Math.min(px, window.innerWidth - 180)+'px';
  m.style.top = Math.min(py, window.innerHeight - items.length*36 - 12)+'px';
  m.style.display = 'block';
}
function renderHist(){
  const box = $('hist');
  if (!box) return;
  const items = histFiltered();
  const qs = state.queueStats || {};
  $('histStats').textContent = '共 '+items.length+' 条 · 完成 '+items.length
    +' · 处理中 '+(qs.processing||0)+' · 排队 '+(qs.queued||0);
  box.innerHTML = items.length ? '' : '<div class="empty">'+((state.history||[]).length ? '没有匹配的任务。' : '还没有生图任务。生成后会出现在这里。')+'</div>';
  items.forEach(h => box.append(jobCard(h)));
}
document.querySelectorAll('#histFilters .chip').forEach(b => b.onclick = () => {
  state.histFilter = b.dataset.hf;
  document.querySelectorAll('#histFilters .chip').forEach(x => x.toggleAttribute('data-on', x===b));
  renderHist();
});
$('histSearch').oninput = renderHist;
$('histClear').onclick = async () => {
  const scope = state.histFilter==='all' ? '全部' : (state.histFilter==='txt' ? '文生图' : '图生图');
  const items = histFiltered(true);
  if (!items.length) { setStatus('没有可清空的记录'); return; }
  const ok = await confirmDlg('确定要清空'+scope+'历史记录吗？此操作无法撤销。（已生成的图片文件仍在存储目录）');
  if (!ok) return;
  const ids = new Set(items.map(h => h.id || h.ts));
  state.history = (state.history||[]).filter(h => !ids.has(h.id || h.ts));
  saveLS('history', state.history);
  renderHist();
  setStatus('已清空 '+items.length+' 条记录');
};
// 一次生成 = 一条批次记录
function cards(images, prompt){
  if (!images || !images.length) return;
  pushHistory({
    id: 'j'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    ts: Date.now(),
    prompt,
    images: images.map(i => ({ path:i.path, url:i.url, mime:i.mime, width:i.width, height:i.height })),
    ratio: state.ratio, clarity: state.clarity, n: state.n,
    skillId: state.skillId, mode: state.mode, temp: state.temp,
    providerId: state.providerId || '',
    providerProtocol: ((state.providers||[]).find(p=>p.id===state.providerId)||{}).protocol || '',
    model: images[0].model || state.lastModel || '',
    refPaths: (state.lastImages||[]).slice(),
    negative: $('negative') && $('negative').value
  });
}

// ---- 大图灯箱 ----
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
$('lb').onclick = (ev) => { if (ev.target===$('lb') || ev.target.className==='stage') closeLb(); };
$('lbRef').onclick = () => {
  const it = (state.lbList||[])[state.lbIndex];
  if (!it) return;
  state.lastImages = it.path ? [it.path] : [];
  state.mode = 'img'; state.page = 'gen';
  closeLb(); sync(); renderRefChips(); setStatus('已设为参考图');
};
$('lbChat').onclick = () => {
  const it = (state.lbList||[])[state.lbIndex];
  if (!it) return;
  navigator.clipboard && navigator.clipboard.writeText(it.prompt||'');
  setStatus('提示词已复制');
};
$('lbCanvas').onclick = () => {
  const it = (state.lbList||[])[state.lbIndex];
  if (!it || !it.path) return;
  state.page = 'canvas';
  closeLb(); sync();
  window.__cvAddImage && window.__cvAddImage(it.path);
};
$('lbGal').onclick = () => {
  closeLb();
  state.page = 'assets';
  sync();
  asLoad();
};
document.addEventListener('keydown', (ev) => {
  if (!$('lb').hasAttribute('data-on')) return;
  if (ev.key==='Escape') closeLb();
  if (ev.key==='ArrowLeft') { state.lbIndex = Math.max(0, state.lbIndex-1); paintLb(); }
  if (ev.key==='ArrowRight') { state.lbIndex = Math.min(state.lbList.length-1, state.lbIndex+1); paintLb(); }
});
$('lb').addEventListener('wheel', (ev) => {
  if (!$('lb').hasAttribute('data-on')) return;
  ev.preventDefault();
  const next = state.lbScale + (ev.deltaY>0 ? -0.1 : 0.1);
  state.lbScale = Math.max(0.5, Math.min(3, Math.round(next*10)/10));
  paintLb();
}, { passive:false });

// ---- 页签切换 ----
document.querySelectorAll('#tabs [data-page]').forEach(b => b.onclick = () => {
  state.page = b.dataset.page;
  if (state.page==='gen') consumeReverseDraft();
  sync();
  if (state.page==='assets') asLoad();
  if (state.page==='video' && window.__vdRender) window.__vdRender();
  if (state.page==='canvas' && window.__cvRefreshProviders) window.__cvRefreshProviders();
});
document.querySelectorAll('#insp .chip[data-brief]').forEach(b => b.onclick = () => { $('brief').value = b.dataset.brief||''; });
$('randInsp').onclick = () => {
  const pool = [...document.querySelectorAll('#insp .chip[data-brief]')];
  const pick = pool[Math.floor(Math.random()*pool.length)];
  if (pick) $('brief').value = pick.dataset.brief || '';
};

// ---- Skill 工作流 + 生成主链路 ----
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
// 422 语义（SPEC §0.4/§3）：带 planId 的方案未过评分/veto 时服务端默认拦下，
// 分数框展示 score/threshold/failures/veto + 「仍然出图」（重发同一请求带 force:true）。
function showRejected(err){
  $('skillCard').open = true;
  const box = $('scoreBox');
  box.hidden = false;
  box.innerHTML = '<b>方案被拦 · '+err.score+' 分 / 阈值 '+err.threshold+'</b>'
    + (err.veto ? '<p>否决：'+escapeHtml(err.veto)+'</p>' : '')
    + ((err.failures && err.failures.length) ? '<p>'+err.failures.map(escapeHtml).join('；')+'</p>' : '')
    + '<p class="note">方案没过评分，默认不出图。确认要继续就点下面按钮强制出图。</p>';
  const btn = document.createElement('button');
  btn.className = 'primary';
  btn.id = 'forceGo';
  btn.textContent = '仍然出图';
  btn.onclick = () => { box.hidden = true; doGenerate(true); };
  box.append(btn);
  setStatus('方案评分未过（'+err.score+'/'+err.threshold+'），已拦截。可点「仍然出图」强制生成');
}
async function doGenerate(force){
  const brief = $('brief').value.trim();
  if (!brief && !state.plan) { setStatus('先写提示词或先想方案'); return; }
  const t0 = Date.now();
  const tick = setInterval(() => setStatus('出图中… '+Math.round((Date.now()-t0)/1000)+'s'), 200);
  setStatus('出图中… 0s');
  const ac = new AbortController();
  state.jobAbort = ac;
  $('cancelGo').hidden = false;
  try {
  const skillId = state.skillId==='cinema-dna-cover' ? 'cinema-dna-21x9x3' : state.skillId;
  let planId = state.plan && state.plan.id;
  if (skillId && !planId) {
    const planned = await api('/plan', { skillId, brief, wantPoster: skillId==='movie-poster' });
    state.plan = planned.plan || planned;
    planId = planned.planId || state.plan.id;
    showPlan(state.plan);
  }
  state.mode = (state.lastImages && state.lastImages.length) ? 'img' : 'txt';
  const ratio = state.ratio==='自动' ? (state.plan && state.plan.shots && state.plan.shots[0] && state.plan.shots[0].aspectRatio) || '1:1' : state.ratio;
  const payload = {
    planId,
    prompt: brief,
    aspectRatio: ratio,
    n: state.n,
    skillId,
    negative: $('negative').value.trim() || undefined,
    assets: state.lastImages || [],
    refUsage: (state.lastImages && state.lastImages.length) ? 'image-to-image' : 'analysis-only',
    temperature: state.temp
  };
  if (state.providerId) payload.providerId = state.providerId;
  if (!state.auto && state.clarity && state.clarity!=='自动') payload.clarity = state.clarity;
  if (force) payload.force = true;
  const out = await api('/generate', payload, ac.signal);
  if (out && out.error && typeof out.error === 'object' && out.error.code === 'PLAN_REJECTED') {
    showRejected(out.error);
    return;
  }
  state.lastJobId = out.jobId;
  if (out.status === 'canceled') { setStatus('已取消'); return; }
  if (out.error) { setStatus(typeof out.error === 'string' ? out.error : JSON.stringify(out.error)); return; }
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
    $('cancelGo').hidden = true;
  }
}
$('go').onclick = () => doGenerate(false);
$('cancelGo').onclick = async () => {
  setStatus('正在取消…');
  try {
    const list = await api('/jobs');
    const running = (list.jobs||[]).find(j => j.status==='running');
    if (running) await api('/cancel', { jobId: running.id });
  } catch (e) { console.warn('[imagestudio] best-effort cancel failed:', e); }
  if (state.jobAbort) state.jobAbort.abort();
};
$('enhance').onclick = () => {
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
};
$('ibClear').onclick = () => {
  $('brief').value = '';
  state.lastImages = [];
  state.mode = 'txt';
  if ($('negative')) $('negative').value = '';
  state.plan = null;
  showPlan(null);
  sync(); renderRefChips();
  setStatus('已清空提示词和参考图');
};

// ---- 快速提示词（上游 prompts.json 22 条全量内嵌） ----
let quickTab = 1;
function renderQuick(){
  document.querySelectorAll('#quickTabs button').forEach(b => b.toggleAttribute('data-on', Number(b.dataset.qt)===quickTab));
  const box = $('quickList');
  box.innerHTML = '';
  QUICK_PROMPTS.filter(p => p.type===quickTab).forEach(p => {
    const it = document.createElement('button');
    it.className = 'qitem';
    it.innerHTML = '<b>'+escapeHtml(p.title)+'</b><small>'+escapeHtml(p.content)+'</small>';
    it.onclick = async () => {
      if ($('brief').value.trim()) {
        const ok = await confirmDlg('输入框已有内容，用「'+p.title+'」覆盖吗？');
        if (!ok) return;
      }
      $('brief').value = p.content;
      if (p.type===2) state.mode = 'img';
      closeDlg('dlgQuick'); sync();
      setStatus('已填入快速提示词「'+p.title+'」');
    };
    box.append(it);
  });
}
$('ibQuick').onclick = () => { quickTab = state.mode==='img' ? 2 : 1; renderQuick(); openDlg('dlgQuick'); };
document.querySelectorAll('#quickTabs button').forEach(b => b.onclick = () => { quickTab = Number(b.dataset.qt); renderQuick(); });

// ---- 提示词素材（浏览器本地） ----
function libItems(){ return loadLS('promptAssets', []); }
function renderLib(){
  const box = $('libList');
  const items = libItems();
  box.innerHTML = items.length ? '' : '<p class="note">还没有提示词素材。在输入框写好提示词后点「存为提示词素材」。</p>';
  items.forEach((p, i) => {
    const it = document.createElement('div');
    it.className = 'qitem';
    it.innerHTML = '<b>'+escapeHtml(p.title||('素材 '+(i+1)))+'</b><small>'+escapeHtml(p.content)+'</small>';
    const acts = document.createElement('div');
    acts.className = 'qacts';
    const use = document.createElement('button');
    use.className = 'ghost'; use.textContent = '使用';
    use.onclick = () => { $('brief').value = p.content; closeDlg('dlgLib'); setStatus('已导入提示词素材'); };
    const del = document.createElement('button');
    del.className = 'ghost'; del.textContent = '删除';
    del.onclick = async () => {
      const ok = await confirmDlg('删除这条提示词素材？');
      if (!ok) return;
      const arr = libItems();
      arr.splice(i, 1);
      saveLS('promptAssets', arr);
      renderLib();
    };
    acts.append(use, del);
    it.append(acts);
    box.append(it);
  });
}
$('ibImport').onclick = () => { renderLib(); openDlg('dlgLib'); };
$('ibSave').onclick = () => {
  const content = $('brief').value.trim();
  if (!content) { setStatus('输入框是空的，没什么可存'); return; }
  const arr = libItems();
  arr.unshift({ title: content.slice(0, 24), content, ts: Date.now() });
  saveLS('promptAssets', arr.slice(0, 200));
  setStatus('已存为提示词素材 · 共 '+Math.min(arr.length, 200)+' 条');
};

// ---- 优化提示词（本地规则；AI 深度改写走 Agent 对话） ----
function optimizeLocal(text){
  const t = text.trim();
  if (!t) return '';
  return t + '\\n\\n—— 本地优化补充 ——\\n'
    + '主体与动作：一句话说清谁在做什么\\n'
    + '镜头：景别、机位、焦距\\n'
    + '光线：单一主光源与方向\\n'
    + '材质：布料、皮肤、表面质感\\n'
    + '规避：不要过度油腻的 AI 光效与塑料感';
}
$('ibOptimize').onclick = () => {
  const src = $('brief').value.trim();
  if (!src) { setStatus('先写点提示词再优化'); return; }
  $('optSrc').value = src;
  $('optOut').value = optimizeLocal(src);
  openDlg('dlgOpt');
};
$('optApply').onclick = () => { $('brief').value = $('optOut').value; closeDlg('dlgOpt'); setStatus('已应用优化后的提示词'); };

// ---- 素材选择器（参考图从素材库导入） ----
const pickSel = new Set();
$('refLibBtn').onclick = async () => {
  pickSel.clear();
  $('pickCount').textContent = '已选 0 张';
  const box = $('pickGrid');
  box.innerHTML = '<p class="note">读取素材库…</p>';
  openDlg('dlgPick');
  const out = await api('/assets?limit=60');
  const items = (out.assets || out.items || []).filter(a => !a.mime || String(a.mime).startsWith('image/'));
  box.innerHTML = items.length ? '' : '<p class="note">素材库还没有图片。</p>';
  items.forEach(a => {
    const cell = document.createElement('div');
    cell.className = 'pick-cell';
    cell.innerHTML = '<img src="'+fileSrc(a)+'" alt="" loading="lazy"/><span class="pchk">✓</span>';
    cell.onclick = () => {
      if (pickSel.has(a.path)) { pickSel.delete(a.path); cell.removeAttribute('data-on'); }
      else {
        if (pickSel.size + (state.lastImages||[]).length >= MAX_REFS) { setStatus('参考图最多 '+MAX_REFS+' 张'); return; }
        pickSel.add(a.path); cell.setAttribute('data-on','1');
      }
      $('pickCount').textContent = '已选 '+pickSel.size+' 张';
    };
    box.append(cell);
  });
};
$('pickOk').onclick = () => {
  state.lastImages = (state.lastImages||[]).concat([...pickSel]);
  if (state.lastImages.length) state.mode = 'img';
  closeDlg('dlgPick');
  sync(); renderRefChips();
  setStatus('已从素材库加入 '+pickSel.size+' 张参考图');
};

// ---- 随机图片（侧栏下拉 + 查看器，设为参考图走 /fetch-remote 白名单代理） ----
let randCur = null;
function openRand(key){
  const src = RAND_SOURCES[key];
  if (!src) return;
  randCur = { key, url: src.url };
  $('randTitle').textContent = '随机图片 · '+src.name;
  $('randImg').src = src.url + (src.url.includes('?') ? '&' : '?') + 't=' + Date.now();
  $('randOpen').href = src.url;
  openDlg('randView');
}
$('randBtn').onclick = (e) => { e.stopPropagation(); $('randMenu').hidden = !$('randMenu').hidden; };
document.addEventListener('click', (e) => { if (!$('randMenu').hidden && !e.target.closest('#randWrap')) $('randMenu').hidden = true; });
document.querySelectorAll('#randMenu [data-rand]').forEach(b => b.onclick = () => { $('randMenu').hidden = true; openRand(b.dataset.rand); });
$('randAgain').onclick = () => { if (randCur) openRand(randCur.key); };
$('randUse').onclick = async () => {
  if (!randCur) return;
  setStatus('正在拉取随机图…');
  const out = await api('/fetch-remote', { url: randCur.url });
  if (out.error || !out.path) { setStatus('拉取失败：'+String(out.error||'未知错误')); return; }
  state.lastImages = (state.lastImages||[]).concat([out.path]).slice(0, MAX_REFS);
  state.mode = 'img';
  closeDlg('randView');
  state.page = 'gen';
  sync(); renderRefChips();
  setStatus('已设为参考图');
};

// ---- 外壳控制：主题 / 宽屏 / 提示词广场入口 / 设置弹窗 ----
function applyTheme(){
  const dark = document.documentElement.dataset.theme === 'dark';
  $('themeBtn').querySelector('i').innerHTML = ic(dark ? 'sun' : 'moon');
  $('themeBtn').querySelector('span').textContent = dark ? '亮色' : '暗色';
  $('themeBtn').title = dark ? '切换到亮色模式' : '切换到暗色模式';
}
function setTheme(dark){
  if (dark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  saveLS('theme', dark ? 'dark' : 'light');
  applyTheme();
}
$('themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme !== 'dark');
setTheme(loadLS('theme', 'light') === 'dark');
function applyNarrow(){
  const narrow = document.body.hasAttribute('data-narrow');
  $('wideBtn').querySelector('i').innerHTML = ic(narrow ? 'panel-open' : 'panel-close');
  $('wideBtn').querySelector('span').textContent = narrow ? '进入宽屏' : '退出宽屏';
}
$('wideBtn').onclick = () => {
  document.body.toggleAttribute('data-narrow');
  saveLS('narrow', document.body.hasAttribute('data-narrow'));
  applyNarrow();
};
if (loadLS('narrow', false)) document.body.setAttribute('data-narrow', '1');
applyNarrow();
function applyTplNav(){ $('navTpl').hidden = !loadLS('showTplNav', false); }
$('showTplNav').checked = loadLS('showTplNav', false);
$('showTplNav').onchange = () => { saveLS('showTplNav', $('showTplNav').checked); applyTplNav(); };
applyTplNav();
let logoClicks = 0, logoTimer = null;
$('logoBtn').onclick = () => {
  logoClicks++;
  if (logoTimer) clearTimeout(logoTimer);
  logoTimer = setTimeout(() => { logoClicks = 0; }, 1500);
  if (logoClicks >= 5) {
    logoClicks = 0;
    saveLS('showTplNav', true);
    $('showTplNav').checked = true;
    applyTplNav();
    setStatus('已开启「提示词广场」入口');
  }
};
$('settingsBtn').onclick = () => {
  if (state.page !== 'settings') state.pageBeforeSettings = state.page;
  state.page = 'settings';
  sync();
};
function closeSettings(){ state.page = state.pageBeforeSettings || 'gen'; sync(); }
$('settingsClose').onclick = closeSettings;
document.querySelector('.page-modal').addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('page-modal')) closeSettings();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($('lb').hasAttribute('data-on')) return;
  if (state.page === 'settings') { closeSettings(); return; }
  closePops();
  document.querySelectorAll('.dlg[data-on]').forEach(d => { if (d.id !== 'dlgConfirm') d.removeAttribute('data-on'); });
});

// ---- 队列药丸（/queue 聚合路由，3s 轮询） ----
async function pollQueue(){
  const out = await api('/queue');
  if (out && !out.error) {
    state.queueStats = out;
    $('qProc').textContent = out.processing != null ? out.processing : 0;
    $('qQueue').textContent = out.queued != null ? out.queued : 0;
    $('qMax').textContent = out.maxQueue != null ? out.maxQueue : 200;
    $('qState').textContent = out.accepting === false ? '暂停' : '开启';
    renderHist();
  }
}
pollQueue();
setInterval(pollQueue, 3000);

// ---- 提示词广场（模板库 7.7：多来源 / 分类搜索 / 收藏 / 回填 / 在线更新 / 离线缓存） ----
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
  const srcSel = $('tplSource');
  const curSrc = tplUi.source;
  srcSel.innerHTML = '<option value="">全部来源（'+(tplData.templates||[]).length+'）</option>'
    + (tplData.sources||[]).map(s => '<option value="'+escapeHtml(s.id)+'">'+escapeHtml(s.name)+(s.origin==='remote'?' · 远程':' · 内置')+'（'+(s.count||0)+'）</option>').join('');
  srcSel.value = curSrc;
  const scoped = (tplData.templates||[]).filter(t => !tplUi.source || t.source === tplUi.source);
  const catCount = {};
  scoped.forEach(t => { const c = t.category||'未分类'; catCount[c] = (catCount[c]||0)+1; });
  const cats = $('tplCats');
  cats.innerHTML = '';
  const mkCat = (id, label) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = label;
    if (tplUi.cat === id) b.dataset.on = '1';
    b.onclick = () => { tplUi.cat = id; renderTpl(); };
    cats.append(b);
  };
  mkCat('', '全部（'+scoped.length+'）');
  Object.keys(catCount).sort().forEach(c => mkCat(c, c+'（'+catCount[c]+'）'));
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
function tplFavLabel(){ $('tplDFav').innerHTML = ic('star') + (tplCur && tplFavs.indexOf(tplCur.id) >= 0 ? '取消收藏' : '收藏'); }
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
  tplFavLabel();
  $('tplDetail').dataset.on = '1';
}
$('tplSource').addEventListener('change', ev => { tplUi.source = ev.target.value; renderTpl(); });
$('tplSearch').addEventListener('input', ev => { tplUi.q = ev.target.value.trim(); renderTpl(); });
$('tplFavOnly').onclick = () => {
  tplUi.favOnly = !tplUi.favOnly;
  $('tplFavOnly').toggleAttribute('data-on', tplUi.favOnly);
  renderTpl();
};
$('tplDFill').onclick = () => {
  const t = tplCur;
  if (!t) return;
  $('brief').value = t.prompt;
  if (t.negative && $('negative')) $('negative').value = t.negative;
  if (t.ratio) { state.ratio = t.ratio; state.auto = false; }
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
  tplFavLabel();
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

// ---- 设置：渠道管理（密钥只写环境变量名，真注册到后端） ----
(function bindSettings(){
  function renderCh(){
    const box = $('chList');
    if (!box) return;
    const rows = state.channels || [];
    if (!rows.length) {
      box.innerHTML = '<p class="note">还没有保存的渠道。mock 仍可出图。</p>';
    } else {
      box.innerHTML = rows.map((c, i) => {
        const caps = [
          c.videoModel ? '视频 '+escapeHtml(c.videoModel) : '',
          c.editModel ? '编辑 '+escapeHtml(c.editModel) : '',
          c.visionModel ? '视觉 '+escapeHtml(c.visionModel) : '',
        ].filter(Boolean).join(' · ');
        return '<div class="chrow" data-idx="'+i+'">'
          + '<b>'+escapeHtml(c.id)+'</b>'
          + '<span class="chmeta">生图 <code>'+escapeHtml(c.model||'')+'</code>'+(caps?' · '+caps:'')+' · <code>'+escapeHtml(c.baseUrl||'')+'</code></span>'
          + '<span class="chkey" data-keyslot="'+i+'">密钥状态查询中…</span>'
          + '<div class="row acts">'
          + '<button class="ghost" data-chact="edit" data-idx="'+i+'">编辑</button>'
          + '<button class="ghost" data-chact="del" data-idx="'+i+'">删除</button>'
          + '</div></div>';
      }).join('');
    }
    rows.forEach((c, i) => {
      const slot = box.querySelector('[data-keyslot="'+i+'"]');
      if (!slot) return;
      api('/key-status', { apiKeyEnv: c.apiKeyEnv || 'IMAGE_STUDIO_KEY' }).then(r => {
        slot.textContent = r.configured ? '✓ 密钥已配置' : '✗ 密钥未配置';
        slot.dataset.ok = r.configured ? '1' : '0';
      }).catch(() => { slot.textContent = '密钥状态未知'; });
    });
    box.querySelectorAll('[data-chact="edit"]').forEach(btn => {
      btn.onclick = () => {
        const c = rows[Number(btn.dataset.idx)];
        if (!c) return;
        $('chId').value = c.id;
        $('chModel').value = c.model || '';
        $('chVideoModel').value = c.videoModel || '';
        $('chEditModel').value = c.editModel || '';
        $('chVisionModel').value = c.visionModel || '';
        $('chUrl').value = c.baseUrl || '';
        $('chEnv').value = c.apiKeyEnv || '';
        $('chExisting').style.display = 'block';
        $('chEditingId').textContent = c.id;
        setStatus('正在编辑渠道「'+c.id+'」，改完点「保存渠道」覆盖');
      };
    });
    box.querySelectorAll('[data-chact="del"]').forEach(btn => {
      btn.onclick = async () => {
        const c = rows[Number(btn.dataset.idx)];
        if (!c) return;
        const ok = await confirmDlg('删除渠道「'+c.id+'」？已用它生成过的图片不受影响。');
        if (!ok) return;
        try {
          const r = await api('/channels/delete', { id: c.id });
          if (r && r.error) { setStatus('删除失败：'+r.error); return; }
          state.channels = (state.channels||[]).filter(x => x.id !== c.id);
          saveLS('channels', state.channels);
          state.providers = (r && r.providers) || state.providers;
          renderCh();
          sync();
          window.__cvRefreshProviders && window.__cvRefreshProviders();
          window.__ecomRefreshProviders && window.__ecomRefreshProviders();
          setStatus('已删除渠道「'+c.id+'」');
        } catch (e) {
          setStatus('删除失败：' + (e && e.message ? e.message : e));
        }
      };
    });
    const hint = $('settingsHint');
    if (hint) hint.textContent = rows.length ? ('已保存 '+rows.length+' 个渠道（仅本机 localStorage，不含密钥值）。') : '还没有渠道时，工作台会走内置 mock，仍可直接出图。';
  }
  $('chEditCancel').onclick = () => {
    ['chId','chModel','chVideoModel','chEditModel','chVisionModel','chUrl','chEnv'].forEach(id => { const el = $(id); if (el) el.value = ''; });
    $('chExisting').style.display = 'none';
    setStatus('已切回新建渠道');
  };
  $('chSave').onclick = async () => {
    const id = ($('chId').value||'').trim();
    if (!id) { setStatus('先填渠道 id'); return; }
    const row = {
      id,
      protocol: 'openai-image',
      model: ($('chModel').value||'').trim(),
      videoModel: ($('chVideoModel').value || '').trim(),
      editModel: ($('chEditModel').value || '').trim(),
      visionModel: ($('chVisionModel').value || '').trim(),
      baseUrl: ($('chUrl').value||'').trim(),
      apiKeyEnv: ($('chEnv').value||'IMAGE_STUDIO_KEY').trim()
    };
    // 真注册：保存调用后端 /channels，注册成真实 provider 并落盘。
    // 协议固定 openai-image——后端只认这一种，不再提供假选项误导用户。
    try {
      const r = await api('/channels', row);
      if (r && r.error) { setStatus('保存失败：' + r.error); return; }
      state.channels = (state.channels||[]).filter(c => c.id !== id).concat([row]);
      saveLS('channels', state.channels);
      state.providers = r.providers || state.providers;
      $('chExisting').style.display = 'none';
      renderCh();
      sync();
      window.__cvRefreshProviders && window.__cvRefreshProviders();
      window.__ecomRefreshProviders && window.__ecomRefreshProviders();
      setStatus('渠道已保存并注册（重启后仍生效）· 密钥值不进页面');
    } catch (e) {
      setStatus('保存失败：' + (e && e.message ? e.message : e));
    }
  };
  // 检测结果：每个模型渲染 4 个小按钮（生图/视频/编辑/视觉），点击直接填入对应输入框。
  const CH_TARGETS = [
    { field: 'chModel', label: '生图' },
    { field: 'chVideoModel', label: '视频' },
    { field: 'chEditModel', label: '编辑' },
    { field: 'chVisionModel', label: '视觉' },
  ];
  function renderDetectList(models){
    const box = $('chDetectList');
    if (!box) return;
    box.innerHTML = models.map(m => {
      const buttons = CH_TARGETS.map(t =>
        '<button class="ghost" data-fill="'+t.field+'" data-model="'+escapeHtml(m)+'" style="padding:2px 6px;font-size:11px">'+t.label+'</button>'
      ).join('');
      return '<span style="display:inline-flex;align-items:center;gap:2px;border:1px solid var(--border);border-radius:6px;padding:2px 4px">'
        + '<code style="font-size:12px">'+escapeHtml(m)+'</code>' + buttons + '</span>';
    }).join('');
    box.querySelectorAll('[data-fill]').forEach(btn => {
      btn.onclick = () => {
        const field = btn.dataset.fill;
        const model = btn.dataset.model;
        const input = $(field);
        if (input) { input.value = model; setStatus('已填入'+CH_TARGETS.find(t=>t.field===field).label+'模型：'+model); }
      };
    });
  }
  $('chDetect').onclick = async () => {
    setStatus('正在检测上游模型…');
    renderDetectList([]);
    try {
      const r = await api('/channels/detect', {
        baseUrl: ($('chUrl').value||'').trim(),
        apiKeyEnv: ($('chEnv').value||'IMAGE_STUDIO_KEY').trim()
      });
      if (r && r.error) { $('chDetectOut').textContent = r.error; setStatus('检测失败'); return; }
      const models = (r && r.models) || [];
      $('chDetectOut').textContent = models.length
        ? ('上游共 ' + (r.total||models.length) + ' 个模型，其中图片/视频可用 ' + models.length + ' 个（点下方按钮直接填入对应输入框，不用手抄）：')
        : '检测不到图片/视频模型。可检查地址后重试，或手动填模型名。';
      renderDetectList(models);
      setStatus(models.length ? '已检测 '+models.length+' 个可用模型 · 点按钮直接填入' : '未检测到可用模型');
    } catch (e) {
      $('chDetectOut').textContent = '检测失败：' + (e && e.message ? e.message : e);
      setStatus('检测失败');
    }
  };
  renderCh();
})();

// ---- 存储与备份 ----
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
  $('bkExport').onclick = async () => {
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
  $('bkImportBtn').onclick = () => $('bkImport').click();
  $('bkImport').onchange = async () => {
    const f = ($('bkImport').files || [])[0];
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
      $('bkImport').value = '';
    }
  };
})();

// ---- 电商套图（先出计划，确认后才批量出图） ----
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
  uses.forEach(u => {
    const lab = document.createElement('label');
    lab.className = 'ecom-use';
    lab.innerHTML = '<input type="checkbox" checked data-id="'+u.id+'"/> <span>'+u.name+'</span>'
      +' <input type="number" min="1" max="4" value="'+u.n+'" data-n="'+u.id+'"/>';
    box.append(lab);
  });
  let plan = null;
  window.__ecomRefreshProviders = () => {
    const sel = $('ecomProvider');
    if (!sel) return;
    const providers = state.providers||[];
    const cur = sel.value;
    sel.innerHTML = '<option value="">默认渠道</option>' + providers.map(p =>
      '<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.id)+(p.model?' ('+escapeHtml(p.model)+')':'')+'</option>').join('');
    if (providers.some(p => p.id === cur)) sel.value = cur;
  };
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
    const providerId = $('ecomProvider').value || undefined;
    const out = await api('/ecom/confirm', { plan, providerId });
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

// ---- 无限画布（Nova 浮动工具条 + 编排节点卡 平移） ----
(function bindCanvas(){
  const stage = $('canvas');
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

  function persist(){
    saveLS('canvas:' + currentId, project);
    saveLS('canvas:current', currentId);
    if ($('cvCount')) $('cvCount').textContent = '已保存';
  }
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
      item('编排节点', () => addNode('config', stage._ctxWorld ? stage._ctxWorld.x : 300, stage._ctxWorld ? stage._ctxWorld.y : 180)),
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
    if ($('cvZoomPct')) $('cvZoomPct').textContent = Math.round(view.scale*100)+'%';
    renderMini();
  }
  // ---- 左侧工具条旁小地图：节点色块 + 视口框，点击跳转 ----
  function renderMini(){
    let mini = $('cvMini');
    if (!mini) {
      mini = document.createElement('div');
      mini.id = 'cvMini';
      mini.style.cssText = 'position:absolute;left:64px;bottom:14px;width:150px;height:104px;background:var(--popover);border:1px solid var(--border);border-radius:10px;box-shadow:0 6px 18px rgba(15,23,42,.10);z-index:10;cursor:pointer;overflow:hidden';
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
    const px = w => ((w - x1) / (x2 - x1) * 150);
    const py = h => ((h - y1) / (y2 - y1) * 104);
    let html = '';
    project.nodes.forEach(n=>{
      const c = n.type==='config' ? '#0284C7' : n.type==='text' ? '#94a3b8' : '#0EA5E9';
      html += '<div style="position:absolute;left:'+px(n.x)+'px;top:'+py(n.y)+'px;width:'+Math.max(4,px(n.x+170)-px(n.x))+'px;height:'+Math.max(3,py(n.y+100)-py(n.y))+'px;background:'+c+';border-radius:2px"></div>';
    });
    html += '<div style="position:absolute;left:'+px(vx1)+'px;top:'+py(vy1)+'px;width:'+Math.max(6,px(vx2)-px(vx1))+'px;height:'+Math.max(4,py(vy2)-py(vy1))+'px;border:1px solid var(--primary);pointer-events:none"></div>';
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
  // ---- Nova 编排节点卡：tabs / 手动编排(@ 引用) / 参数 chips / 参考图条 / 生成 ----
  const RATIOS = ['自动','1:1','3:4','4:3','9:16','16:9','2:3','3:2','21:9'];
  const CLARITIES = ['自动','1K','2K'];
  function renderCfgControls(cfg, el){
    const providers = (state.providers||[]);
    const box = document.createElement('div');
    box.className = 'cfgbox';
    const n = cfg.n || 1;
    const providerOpts = '<option value="">默认渠道</option>' + providers.map(p =>
      '<option value="'+escapeHtml(p.id)+'"'+(cfg.providerId===p.id?' selected':'')+'>'
      + escapeHtml(p.id) + (p.model ? ' · '+escapeHtml(p.model) : '')
      + '</option>').join('');
    box.innerHTML =
      '<div class="cfgtabs"><button data-cft="img" data-on>图片</button><button data-cft="vid" disabled title="视频编排暂未开放">视频</button></div>'
      + '<button class="chip" data-cf="orch" style="width:100%;display:flex;justify-content:space-between;border-radius:8px">手动编排（@ 引用）<span>▾</span></button>'
      + '<textarea data-cf="prompt" class="cfgfield" placeholder="提示词补充，可空，连线文本优先">'+escapeHtml(cfg.text||'')+'</textarea>'
      + '<div class="cfgchips">'
      + '<select data-cf="providerId" class="cfgselect" style="flex:1;min-width:0">'+providerOpts+'</select>'
      + '<select data-cf="clarity" class="cfgselect" style="width:66px;flex:none">' + CLARITIES.map(c=>'<option'+(((cfg.clarity||'自动')===c)?' selected':'')+'>'+c+'</option>').join('') + '</select>'
      + '<select data-cf="ratio" class="cfgselect" style="width:76px;flex:none">' + RATIOS.map(r=>'<option'+(((cfg.ratio||'1:1')===r)?' selected':'')+'>'+r+'</option>').join('') + '</select>'
      + '<div class="cfgstepper"><button type="button" data-cf="ndown">−</button><span data-cf="nval">'+n+'</span><button type="button" data-cf="nup">+</button></div>'
      + '<div class="cfgicon"><button type="button" data-cf="eye" title="显示/隐藏参考图缩略">'+ic('eye')+'</button><button type="button" data-cf="mask" title="在参考图上标注重绘区域">'+ic('brush')+'</button></div>'
      + '</div>'
      + '<div class="cfgrefs" data-cf="refs"></div>'
      + '<p class="note" data-cf="refnote" style="margin:0;font-size:11px"></p>'
      + '<button class="primary" data-cf="send">✨ 生成</button>';
    const refsBox = box.querySelector('[data-cf="refs"]');
    const refNote = box.querySelector('[data-cf="refnote"]');
    function renderRefs(){
      const imgs = incoming(cfg.id).filter(x=>x.type==='image' && x.path);
      refsBox.innerHTML = '';
      imgs.forEach(x=>{
        const im = document.createElement('img');
        im.src = '/imagestudio/api/file?path='+encodeURIComponent(x.path);
        im.title = '来自已连接的图片节点';
        refsBox.append(im);
      });
      refNote.innerHTML = '当前模型允许参考图数量：10 · 已连接 <b>'+imgs.length+'</b> 张 · 生成将新建结果节点';
    }
    renderRefs();
    const clampN = (v) => Math.max(1, Math.min(4, v));
    const commit = () => {
      record();
      cfg.text = (box.querySelector('[data-cf="prompt"]').value||'').trim() || undefined;
      cfg.ratio = box.querySelector('[data-cf="ratio"]').value === '自动' ? undefined : box.querySelector('[data-cf="ratio"]').value;
      cfg.clarity = box.querySelector('[data-cf="clarity"]').value === '自动' ? undefined : box.querySelector('[data-cf="clarity"]').value;
      cfg.providerId = box.querySelector('[data-cf="providerId"]').value || undefined;
      persist();
    };
    box.querySelectorAll('select[data-cf]').forEach(f => f.addEventListener('change', commit));
    box.querySelector('[data-cf="prompt"]').addEventListener('change', commit);
    box.querySelectorAll('[data-cf]').forEach(f => f.addEventListener('pointerdown', ev => ev.stopPropagation()));
    // 手动编排（@ 引用）：列出可引用的文本/图片节点，点击即连线
    box.querySelector('[data-cf="orch"]').addEventListener('click', ev => {
      ev.stopPropagation();
      hideCtx();
      const anchor = ev.currentTarget;
      ctxMenu = document.createElement('div');
      ctxMenu.className = 'ctx';
      const r = anchor.getBoundingClientRect();
      ctxMenu.style.left = Math.min(r.left, window.innerWidth-220)+'px';
      ctxMenu.style.top = (r.bottom+4)+'px';
      const cands = project.nodes.filter(x=>x.id!==cfg.id && (x.type==='text' || x.type==='image'));
      if (!cands.length) {
        const b = document.createElement('button');
        b.textContent = '还没有文本/图片节点可引用';
        ctxMenu.append(b);
      }
      cands.forEach(x=>{
        const linked = project.edges.some(e=>e.from===x.id && e.to===cfg.id);
        const label = x.type==='text' ? ('文本：'+String(x.text||'（空）').slice(0,14)) : ('图片节点'+(x.path?'':'（空）'));
        const b = document.createElement('button');
        b.textContent = (linked ? '✓ ' : '@ ') + label;
        b.onclick = () => {
          if (!project.edges.some(e2=>e2.from===x.id && e2.to===cfg.id)) {
            record();
            project.edges.push({id:'e-'+Date.now(), from:x.id, to:cfg.id});
            persist(); render();
          }
          hideCtx();
        };
        ctxMenu.append(b);
      });
      document.body.append(ctxMenu);
    });
    box.querySelector('[data-cf="eye"]').addEventListener('click', ev => {
      ev.stopPropagation();
      const btn = ev.currentTarget;
      const off = refsBox.style.display === 'none';
      refsBox.style.display = off ? '' : 'none';
      btn.innerHTML = ic(off ? 'eye' : 'eye-off');
    });
    box.querySelector('[data-cf="mask"]').addEventListener('click', ev => {
      ev.stopPropagation();
      const target = incoming(cfg.id).find(x=>x.type==='image' && x.path);
      if (!target) { setStatus('先连一张图片节点进来再标注'); return; }
      markingNodes.add(target.id);
      render();
      setStatus('在图片上拖框标注要重绘的区域');
    });
    box.querySelector('[data-cf="ndown"]').addEventListener('click', ev => {
      ev.stopPropagation(); record();
      cfg.n = clampN((cfg.n||1) - 1);
      box.querySelector('[data-cf="nval"]').textContent = cfg.n;
      persist();
    });
    box.querySelector('[data-cf="nup"]').addEventListener('click', ev => {
      ev.stopPropagation(); record();
      cfg.n = clampN((cfg.n||1) + 1);
      box.querySelector('[data-cf="nval"]').textContent = cfg.n;
      persist();
    });
    box.querySelector('[data-cf="send"]').addEventListener('click', ev => { ev.stopPropagation(); commit(); sendFromConfig(cfg); });
    el.append(box);
  }
  async function sendFromConfig(cfg){
    setStatus('画布出图中…');
    const out = await api('/canvas/generate', { project, configNodeId: cfg.id });
    if (out.error) { setStatus(String(out.error)); return; }
    record();
    project.nodes = out.project.nodes;
    project.edges = out.project.edges;
    persist(); render();
    setStatus('画布出图完成 · 结果在编排节点右侧');
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
        drafting.boxEl.style.cssText = 'position:absolute;border:2px dashed #0284C7;background:rgba(2,132,199,.12);pointer-events:none';
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
      boxEl.style.cssText = 'position:absolute;border:2px dashed #0284C7;background:rgba(2,132,199,.12);pointer-events:none';
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
      if (sel.has(n.id)) el.style.borderColor = 'var(--primary)';
      el.style.width = (n.w || (n.type==='config' ? 300 : 200)) + 'px';
      const ins = incoming(n.id).length;
      if (n.type==='text'){
        el.innerHTML = '<b>文本</b><textarea data-field="text" style="min-height:64px;margin-top:6px">'+escapeHtml(n.text||'')+'</textarea>';
      } else if (n.type==='image'){
        const src = n.path ? '/imagestudio/api/file?path='+encodeURIComponent(n.path) : '';
        el.innerHTML = '<b>图片</b>'+(src
          ? '<div class="imgwrap" style="position:relative;margin-top:6px;width:100%"><img src="'+src+'" alt="" draggable="false" style="width:100%;display:block;border-radius:8px"><div class="marks" style="position:absolute;inset:0"></div></div>'
          : '<div class="note" data-upload style="cursor:pointer">空节点 · 点这里上传，或直接拖图进来</div>');
        if (src) {
          const acts = document.createElement('div');
          acts.className = 'row';
          acts.style.marginTop = '4px';
          acts.innerHTML = '<button class="ghost" data-act="mark">标注</button><button class="ghost" data-act="redraw">重绘框内</button><button class="ghost" data-act="nobg">移除背景</button>';
          el.append(acts);
          const marking = markingNodes.has(n.id);
          const markBtn = acts.querySelector('[data-act="mark"]');
          if (marking) markBtn.style.borderColor = 'var(--primary)';
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
        el.innerHTML = '<b>视频</b>'+(src?'<video src="'+src+'" muted style="width:160px;display:block;margin-top:6px;border-radius:8px"></video>':'<div class="note">视频节点</div>');
      } else {
        el.innerHTML = '<b>编排</b><div class="note">'+(ins ? '已连 '+ins+' 路输入' : '还没连线 · 拖出端口或用「手动编排」引用')+'</div>';
        renderCfgControls(n, el);
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
          h.style.cssText = 'position:absolute;width:10px;height:10px;background:var(--primary);border:1px solid #fff;border-radius:3px;z-index:6;'
            + (corner.indexOf('n')>=0 ? 'top:-5px;' : 'bottom:-5px;')
            + (corner.indexOf('w')>=0 ? 'left:-5px;' : 'right:-5px;')
            + 'cursor:' + ((corner==='nw'||corner==='se') ? 'nwse-resize' : 'nesw-resize');
          h.addEventListener('pointerdown', ev => {
            ev.stopPropagation();
            record();
            const startW = el.offsetWidth || 200;
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
          const path = await uploadOne(f);
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
  }
  function drawWires(){
    const svg = $('cvWires');
    if (!svg) return;
    svg.innerHTML = project.edges.map(e=>{
      const a = project.nodes.find(n=>n.id===e.from);
      const b = project.nodes.find(n=>n.id===e.to);
      if (!a||!b) return '';
      const x1=a.x+170,y1=a.y+28,x2=b.x,y2=b.y+28;
      const color = selEdge===e.id ? '#0284C7' : '#94a3b8';
      const w = selEdge===e.id ? 3 : 2;
      return '<line data-eid="'+e.id+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+w+'" marker-end="url(#arr'+(selEdge===e.id?'-sel':'')+')" style="pointer-events:stroke;cursor:pointer"/>';
    }).join('');
    svg.insertAdjacentHTML('afterbegin','<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#94a3b8"/></marker><marker id="arr-sel" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#0284C7"/></marker></defs>');
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
    sw.innerHTML = cvList.map(c=>'<option value="'+escapeHtml(c.id)+'"'+(c.id===currentId?' selected':'')+'>'+escapeHtml(c.name)+'</option>').join('');
    if ($('cvCount')) $('cvCount').textContent = '已保存';
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
  $('cvSwitch').onchange = ev => switchTo(ev.target.value);
  // Electron 渲染层不支持 window.prompt，用内联输入条代替
  function askName(placeholder, initial, cb){
    setTimeout(() => {
      hideCtx();
      ctxMenu = document.createElement('div');
      ctxMenu.className = 'ctx';
      ctxMenu.style.left = '120px';
      ctxMenu.style.top = '44px';
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
  $('cvNew').onclick = () => {
    askName('新画布名称', '画布 ' + (cvList.length+1), name => {
      const id = 'cv-' + Date.now();
      cvList.push({ id, name });
      saveLS('canvas:list', cvList);
      switchTo(id);
      setStatus('已新建画布「' + name + '」');
    });
  };
  $('cvRename').onclick = () => {
    const cur = cvList.find(c=>c.id===currentId);
    if (!cur) return;
    askName('重命名画布', cur.name, name => {
      cur.name = name;
      saveLS('canvas:list', cvList);
      renderSwitch();
      setStatus('已重命名为「' + name + '」');
    });
  };
  $('cvFit').onclick = fitAll;
  $('cvUndo').onclick = undo;
  $('cvRedo').onclick = redo;
  $('cvZoomIn').onclick = () => { view.scale = Math.max(0.05, Math.min(5, view.scale * 1.2)); applyView(); };
  $('cvZoomOut').onclick = () => { view.scale = Math.max(0.05, Math.min(5, view.scale / 1.2)); applyView(); };
  $('cvText').onclick = () => addNode('text', 60, 200);
  $('cvCfg').onclick = () => addNode('config', 320, 200);
  $('cvImg').onclick = () => addNode('image', 80, 260);
  $('cvVid').onclick = () => addNode('video', 320, 260);
  $('cvDel').onclick = delSelected;
  $('cvSend').onclick = async () => {
    const cfg = project.nodes.find(n=>sel.has(n.id) && n.type==='config') || project.nodes.find(n=>n.type==='config');
    if (!cfg) { setStatus('先选一个编排节点'); return; }
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
    rect.style.cssText = 'position:absolute;border:1px dashed var(--primary);background:rgba(2,132,199,.08);pointer-events:none;z-index:5';
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
    const path = await uploadOne(file);
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
  window.__cvRefreshProviders = () => { if (state.page==='canvas') render(); };
})();
// ---- 反推草稿：reverse 页「用此提示词生图」经 localStorage 传递，gen 页消费 ----
function consumeReverseDraft(){
  const d = loadLS('reverseDraft', null);
  if (!d || !d.prompt) return;
  saveLS('reverseDraft', null);
  $('brief').value = d.prompt;
  if (d.negative && $('negative')) $('negative').value = d.negative;
  setStatus('已带入反推提示词');
}

function localChips(el, items, cur, onpick){
  if (!el) return;
  el.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = String(it);
    if (it === cur) b.dataset.on = '1';
    b.onclick = () => { onpick(it); };
    el.append(b);
  });
}
// ---- 视频工作台（左表单 + 右任务流） ----
(function bindVideo(){
  const VD_RATIOS = ['16:9','9:16','1:1'];
  const VD_DURS = [2,4,6];
  const vd = { mode:'txt', ratio:'16:9', durationSec:2 };
  state.vhistory = loadLS('vhistory', []);
  function render(){
    document.querySelectorAll('#vdModes .chip').forEach(b=>b.toggleAttribute('data-on', b.dataset.vdmode===vd.mode));
    $('vdRefWrap').hidden = vd.mode!=='img';
    localChips($('vdRatios'), VD_RATIOS, vd.ratio, v => { vd.ratio = v; render(); });
    localChips($('vdDurations'), VD_DURS, vd.durationSec, v => { vd.durationSec = v; render(); });
    const thumbs = $('vdRefThumbs');
    thumbs.innerHTML = '';
    if (state.videoRef) thumbInto(thumbs, state.videoRef);
  }
  window.__vdRender = render;
  function renderVHist(){
    const box = $('vdOut');
    const list = state.vhistory || [];
    $('vdStats').textContent = '共 '+list.length+' 条';
    box.innerHTML = list.length ? '' : '<div class="empty">还没有视频任务。提交后会出现在这里。</div>';
    list.forEach(v => {
      const d = document.createElement('div');
      d.className = 'job';
      const x = document.createElement('button');
      x.className = 'job-x';
      x.innerHTML = ic('x');
      x.title = '移除这条记录（不删文件）';
      x.onclick = () => {
        const i = state.vhistory.indexOf(v);
        if (i >= 0) state.vhistory.splice(i, 1);
        saveLS('vhistory', state.vhistory);
        renderVHist();
      };
      d.append(x);
      const t = document.createElement('div');
      t.className = 'job-thumbs';
      const vid = document.createElement('video');
      vid.src = fileSrc(v);
      vid.controls = true;
      vid.preload = 'metadata';
      t.append(vid);
      d.append(t);
      if (v.prompt) {
        const p = document.createElement('div');
        p.className = 'job-prompt';
        const txt = document.createElement('p');
        txt.textContent = v.prompt;
        const cp = document.createElement('button');
        cp.innerHTML = ic('copy');
        cp.title = '复制提示词';
        cp.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(v.prompt); setStatus('提示词已复制'); };
        p.append(txt, cp);
        d.append(p);
      }
      const meta = document.createElement('div');
      meta.className = 'job-meta';
      const bits = [(v.durationSec||'?')+'s'];
      if (v.ratio) bits.push(v.ratio);
      if (v.providerId) bits.push(v.providerId);
      bits.push(new Date(v.ts || Date.now()).toLocaleString());
      meta.innerHTML = bits.map(b => '<span>'+escapeHtml(String(b))+'</span>').join('');
      d.append(meta);
      const acts = document.createElement('div');
      acts.className = 'job-acts';
      acts.append(mkAct(ic('download')+'下载', () => { const a=document.createElement('a'); a.href=fileSrc(v); a.download=(v.path||'clip.mp4').split('/').pop(); a.click(); }));
      const tIn = document.createElement('input');
      tIn.type = 'number'; tIn.min = '0'; tIn.step = '0.1'; tIn.value = '0.4'; tIn.title = '抽帧时间点（秒）';
      tIn.style.width = '64px'; tIn.style.padding = '4px 6px'; tIn.style.fontSize = '12px';
      acts.append(tIn);
      acts.append(mkAct(ic('image')+'抽帧', async () => {
        setStatus('抽帧中…');
        const r = await api('/video/frame', { path: v.path, t: Number(tIn.value)||0 });
        if (r.error) { setStatus(String(r.error)); return; }
        state.lastImages = [r.path]; state.mode = 'img'; state.page = 'gen'; sync(); renderRefChips();
        setStatus('已抽帧并带到生图页当参考图');
      }));
      acts.append(mkAct(ic('maximize')+'全屏', () => openLb([{ path: v.path, mime: 'video/mp4', prompt: v.prompt }], 0)));
      acts.append(mkAct(ic('folder')+'素材库查看', () => { state.page='assets'; sync(); asLoad(); }));
      acts.append(mkAct(ic('frame')+'加入画布', () => { state.page='canvas'; sync(); window.__cvAddImage && window.__cvAddImage(v.path); }));
      d.append(acts);
      box.append(d);
    });
  }
  document.querySelectorAll('#vdModes .chip').forEach(b=>b.onclick=()=>{ vd.mode=b.dataset.vdmode; render(); });
  $('vdRefDrop').onclick = () => $('vdRefFile').click();
  $('vdRefFile').onchange = async () => {
    const f = ($('vdRefFile').files||[])[0];
    if (!f) return;
    const path = await uploadOne(f);
    if (path) { state.videoRef = path; render(); setStatus('已设视频首帧参考图'); }
    $('vdRefFile').value = '';
  };
  const z = $('vdRefDrop');
  z.addEventListener('dragover', ev => { ev.preventDefault(); z.toggleAttribute('data-over', true); });
  z.addEventListener('dragleave', () => z.toggleAttribute('data-over', false));
  z.addEventListener('drop', async ev => {
    ev.preventDefault(); z.toggleAttribute('data-over', false);
    const f = Array.from(ev.dataTransfer.files||[]).find(x=>String(x.type||'').startsWith('image/'));
    if (!f) { setStatus('只接受图片作首帧'); return; }
    const path = await uploadOne(f);
    if (path) { state.videoRef = path; render(); setStatus('已设视频首帧参考图'); }
  });
  $('vdGo').onclick = async () => {
    const prompt = $('vdPrompt').value.trim();
    if (!prompt) { setStatus('先写提示词'); return; }
    const t0 = Date.now();
    $('vdCancel').hidden = false;
    $('vdProg').textContent = '已提交，等待生成… 0s';
    const tick = setInterval(async () => {
      let extra = '';
      try {
        const list = await api('/jobs');
        const running = (list.jobs||[]).find(j=>j.kind==='video' && j.status==='running');
        if (running) extra = ' · 任务运行中';
      } catch {}
      $('vdProg').textContent = '出视频中… '+Math.round((Date.now()-t0)/1000)+'s'+extra;
    }, 2500);
    try {
      const out = await api('/video', {
        providerId: $('vdProvider').value || undefined,
        prompt,
        durationSec: vd.durationSec || 2,
        aspectRatio: vd.ratio || '16:9',
        firstFramePath: vd.mode==='img' ? (state.videoRef || undefined) : undefined
      });
      if (out.error) { $('vdProg').textContent = String(out.error); setStatus('视频失败'); return; }
      state.vhistory = state.vhistory || [];
      state.vhistory.unshift({ id:'v'+Date.now().toString(36), ts:Date.now(), prompt, path:out.path, mime:'video/mp4', durationSec:out.durationSec || vd.durationSec, ratio:vd.ratio, providerId:out.providerId || $('vdProvider').value || '' });
      state.vhistory = state.vhistory.slice(0, 200);
      saveLS('vhistory', state.vhistory);
      renderVHist();
      $('vdProg').textContent = '';
      setStatus('视频完成 · '+Math.round((Date.now()-t0)/1000)+'s');
    } catch (e) {
      $('vdProg').textContent = '失败：'+String(e);
    } finally {
      clearInterval(tick);
      $('vdCancel').hidden = true;
    }
  };
  $('vdCancel').onclick = async () => {
    setStatus('正在取消…');
    try {
      const list = await api('/jobs');
      const running = (list.jobs||[]).find(j => j.status==='running');
      if (running) await api('/cancel', { jobId: running.id });
    } catch (e) { console.warn('[imagestudio] best-effort cancel failed:', e); }
  };
  $('vdClear').onclick = () => {
    $('vdPrompt').value = '';
    state.videoRef = '';
    render();
    setStatus('已清空视频表单');
  };
  $('vdHistClear').onclick = async () => {
    const n = (state.vhistory||[]).length;
    if (!n) { setStatus('没有可清空的视频记录'); return; }
    const ok = await confirmDlg('确定要清空全部视频记录吗？此操作无法撤销。（视频文件仍在存储目录）');
    if (!ok) return;
    state.vhistory = [];
    saveLS('vhistory', state.vhistory);
    renderVHist();
    setStatus('已清空 '+n+' 条视频记录');
  };
  render();
  renderVHist();
})();
// ---- 动图生成 GIF（两步流） ----
(function bindGif(){
  const GF_COUNTS = [2,3,4,6,8];
  const GF_RATIOS = ['1:1','16:9','9:16','3:2'];
  const gf = { n:4, ratio:'1:1', ref:'', frames:[] };
  function renderForm(){
    localChips($('gfCounts'), GF_COUNTS, gf.n, v => { gf.n = v; renderForm(); });
    localChips($('gfRatios'), GF_RATIOS, gf.ratio, v => { gf.ratio = v; renderForm(); });
  }
  function renderFrames(){
    const strip = $('gfFrames');
    strip.innerHTML = '';
    gf.frames.forEach((fr, i) => {
      const d = document.createElement('div');
      d.className = 'gframe';
      if (!fr.on) d.setAttribute('data-off', '1');
      d.title = '点击启停此帧';
      d.innerHTML = '<img src="'+fileSrc({ path: fr.path })+'" alt=""/><small>帧 '+(i+1)+(fr.on?'':' · 停')+'</small>';
      d.onclick = () => { fr.on = !fr.on; renderFrames(); };
      strip.append(d);
    });
  }
  function showGif(out, note){
    const box = $('gfOut');
    const empty = box.querySelector('.empty');
    if (empty) empty.remove();
    const d = document.createElement('div');
    d.className = 'job';
    const t = document.createElement('div');
    t.className = 'job-thumbs';
    const src = fileSrc(out);
    const im = document.createElement('img');
    im.src = src;
    im.title = '看大图';
    im.onclick = () => openLb([{ path: out.path, mime: 'image/gif' }], 0);
    t.append(im);
    d.append(t);
    const meta = document.createElement('div');
    meta.className = 'job-meta';
    meta.innerHTML = '<span>GIF</span><span>'+escapeHtml(note||'')+'</span><span>'+new Date().toLocaleString()+'</span>';
    d.append(meta);
    const acts = document.createElement('div');
    acts.className = 'job-acts';
    acts.append(mkAct(ic('download')+'下载 GIF', () => { const a=document.createElement('a'); a.href=src; a.download=(out.path||'shot.gif').split('/').pop(); a.click(); }));
    acts.append(mkAct(ic('maximize')+'全屏', () => openLb([{ path: out.path, mime: 'image/gif' }], 0)));
    acts.append(mkAct(ic('folder')+'素材库查看', () => { state.page='assets'; sync(); asLoad(); }));
    acts.append(mkAct(ic('image-plus')+'当参考图', () => { state.lastImages=[out.path]; state.mode='img'; state.page='gen'; sync(); renderRefChips(); setStatus('已设为参考图'); }));
    acts.append(mkAct(ic('frame')+'加入画布', () => { state.page='canvas'; sync(); window.__cvAddImage && window.__cvAddImage(out.path); }));
    d.append(acts);
    box.prepend(d);
  }
  $('gfRefDrop').onclick = () => $('gfRefFile').click();
  $('gfRefFile').onchange = async () => {
    const f = ($('gfRefFile').files||[])[0];
    if (!f) return;
    const path = await uploadOne(f);
    if (path) { gf.ref = path; const th = $('gfRefThumbs'); th.innerHTML=''; thumbInto(th, path); setStatus('已设 GIF 参考图'); }
    $('gfRefFile').value = '';
  };
  $('gfGo').onclick = async () => {
    const prompt = $('gfPrompt').value.trim();
    if (!prompt) { setStatus('先写提示词'); return; }
    const t0 = Date.now();
    const tick = setInterval(() => setStatus('生成帧中… '+Math.round((Date.now()-t0)/1000)+'s'), 200);
    try {
      const out = await api('/gif', {
        providerId: $('gfProvider').value || undefined,
        prompt,
        n: gf.n,
        aspectRatio: gf.ratio,
        assets: gf.ref ? [gf.ref] : undefined,
        durationSec: 2
      });
      if (out.error) { setStatus(String(out.error)); return; }
      gf.frames = (out.frameList||[]).map(f => ({ path: f.path, on: true }));
      $('gfTune').hidden = gf.frames.length < 1;
      renderFrames();
      showGif(out, '初版 · '+out.frames+' 帧 · 默认延时');
      setStatus('帧已生成 · 调帧条后点「合成 GIF」');
    } finally { clearInterval(tick); }
  };
  $('gfRecode').onclick = async () => {
    const enabled = gf.frames.filter(f => f.on).map(f => f.path);
    if (!enabled.length) { setStatus('至少启用 1 帧'); return; }
    const delayMs = Math.max(50, Math.min(500, Number($('gfDelay').value)||250));
    const loop = Math.max(0, Math.min(100, Number($('gfLoop').value)||0));
    setStatus('合成 GIF 中…');
    const out = await api('/gif/recode', { frames: enabled, delayMs, loop });
    if (out.error) { setStatus(String(out.error)); return; }
    showGif(out, enabled.length+' 帧 · '+delayMs+'ms · 循环 '+(loop||'无限')+' 次');
    setStatus('GIF 已合成，可下载');
  };
  renderForm();
})();
// ---- 反推提示词 ----
const RV_TPLS = {
  brief: '用一句中文概括这张图的主体、动作、场景与氛围，直接输出可用的生图提示词，不要解释。',
  detail: '详细描述这张图：主体、动作、构图、镜头、光线、色彩、材质与风格，输出可直接用于生图的完整中文提示词，不要解释。',
  storyboard: '把这张图当作电影分镜来描述：景别、机位、镜头运动、光线、情绪，输出分镜脚本风格的中文生图提示词。'
};
(function bindReverse(){
  const rv = { path:'', tpl:'brief' };
  function renderTplChips(){
    document.querySelectorAll('#rvTpls .chip').forEach(b=>b.toggleAttribute('data-on', b.dataset.rvtpl===rv.tpl));
  }
  document.querySelectorAll('#rvTpls .chip').forEach(b=>b.onclick=()=>{ rv.tpl=b.dataset.rvtpl; renderTplChips(); });
  async function rvIngest(files){
    const f = Array.from(files||[]).find(x=>String(x.type||'').startsWith('image/'));
    if (!f) { setStatus('只接受图片'); return; }
    const path = await uploadOne(f);
    if (path) {
      rv.path = path;
      const th = $('rvThumb'); th.innerHTML = '';
      thumbInto(th, path);
      setStatus('图片已就绪，点「开始反推」');
    }
  }
  window.__rvIngest = rvIngest;
  $('rvDrop').onclick = () => $('rvFile').click();
  $('rvFile').onchange = () => rvIngest(Array.from($('rvFile').files||[]));
  const z = $('rvDrop');
  z.addEventListener('dragover', ev => { ev.preventDefault(); z.toggleAttribute('data-over', true); });
  z.addEventListener('dragleave', () => z.toggleAttribute('data-over', false));
  z.addEventListener('drop', ev => { ev.preventDefault(); z.toggleAttribute('data-over', false); rvIngest(Array.from(ev.dataTransfer.files||[])); });
  $('rvGo').onclick = async () => {
    if (!rv.path) { setStatus('先上传或粘贴一张图'); return; }
    setStatus('反推中…');
    const out = await api('/describe', {
      assets: [rv.path],
      providerId: $('rvProvider').value || undefined,
      instruction: RV_TPLS[rv.tpl] || RV_TPLS.brief
    });
    if (out.error) { setStatus(String(out.error)); return; }
    $('rvOut').value = out.text || '';
    setStatus('反推完成');
  };
  $('rvCopy').onclick = () => {
    if (navigator.clipboard) navigator.clipboard.writeText($('rvOut').value || '');
    setStatus('已复制');
  };
  $('rvUse').onclick = () => {
    const prompt = ($('rvOut').value || '').trim();
    if (!prompt) { setStatus('还没有反推结果'); return; }
    saveLS('reverseDraft', { prompt });
    state.page = 'gen';
    consumeReverseDraft();
    sync();
  };
  renderTplChips();
})();
// ---- 我的素材（服务端数据） ----
const asUi = { q:'', type:'all', offset:0, limit:24, batch:false, sel:{}, total:0, list:[] };
async function asLoad(){
  const grid = $('asGrid');
  if (!grid) return;
  const params = '?q='+encodeURIComponent(asUi.q)+'&type='+asUi.type+'&offset='+asUi.offset+'&limit='+asUi.limit;
  const r = await api('/assets'+params);
  if (r.error) { setStatus(String(r.error)); return; }
  asUi.list = r.images || [];
  asUi.total = r.total || 0;
  asUi.sel = {};
  renderAssets();
}
function asSelCount(){
  $('asSelCount').textContent = '已选 '+Object.keys(asUi.sel).length+' 个';
}
function renderAssets(){
  const grid = $('asGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!asUi.list.length) grid.innerHTML = '<p class="note">没有素材。生成或上传后会出现在这里。</p>';
  asUi.list.forEach(img => {
    const d = document.createElement('div');
    d.className = 'card';
    const src = fileSrc(img);
    const isVid = img.mime && String(img.mime).startsWith('video');
    let inner = '';
    if (asUi.batch) inner += '<input type="checkbox" class="galcheck"'+(asUi.sel[img.path]?' checked':'')+'/>';
    inner += (isVid ? '<video src="'+src+'" muted'+(asUi.batch?'':' controls')+'></video>' : '<img src="'+src+'" alt="" loading="lazy"/>')
      + '<div class="cap">'+escapeHtml(img.title||img.path)
      + '<small>'+(img.kind==='uploaded'?'上传素材':'生成产物')+' · '+escapeHtml(img.mime||'')+' · '+Math.round((img.size||0)/1024)+' KB</small></div>';
    d.innerHTML = inner;
    if (asUi.batch) {
      const cb = d.querySelector('.galcheck');
      cb.onclick = ev => ev.stopPropagation();
      cb.onchange = () => { if (cb.checked) asUi.sel[img.path] = 1; else delete asUi.sel[img.path]; asSelCount(); };
      d.style.cursor = 'pointer';
      d.onclick = () => { cb.checked = !cb.checked; cb.onchange(); };
    } else {
      const acts = document.createElement('div');
      acts.className = 'acts';
      acts.append(mkAct('全屏', () => openLb(asUi.list, asUi.list.indexOf(img))));
      acts.append(mkAct('下载', () => { const a=document.createElement('a'); a.href=src; a.download=(img.path||'file').split('/').pop(); a.click(); }));
      acts.append(mkAct('重命名', async () => {
        const name = (window.prompt('新文件名', img.title || '') || '').trim();
        if (!name) return;
        const r = await api('/assets/rename', { path: img.path, name });
        if (r.error) { setStatus(String(r.error)); return; }
        setStatus('已重命名为 '+r.name);
        asLoad();
      }));
      acts.append(mkAct('删除', async () => {
        const ok = await confirmDlg('确定删除「'+(img.title||img.path)+'」？文件会从磁盘删掉。');
        if (!ok) return;
        const r = await api('/assets/delete', { paths: [img.path] });
        if (r.error) { setStatus(String(r.error)); return; }
        setStatus('已删除 1 个素材');
        asLoad();
      }));
      acts.append(mkAct('当参考图', () => { state.lastImages = [img.path]; state.mode='img'; state.page='gen'; sync(); renderRefChips(); setStatus('已设为参考图'); }));
      d.append(acts);
    }
    grid.append(d);
  });
  $('asPageInfo').textContent = '共 '+asUi.total+' 个 · 第 '+(Math.floor(asUi.offset/asUi.limit)+1)+' / '+Math.max(1, Math.ceil(asUi.total/asUi.limit))+' 页';
  $('asPrev').disabled = asUi.offset <= 0;
  $('asNext').disabled = asUi.offset + asUi.limit >= asUi.total;
  asSelCount();
}
(function bindAssets(){
  // 旧画廊一次性迁移提示
  const mig = $('asMigrate');
  if (mig && state.legacyGalleryCount && !loadLS('galleryMigrated', 0)) {
    mig.hidden = false;
    mig.innerHTML = '<b>检测到旧画廊数据 '+state.legacyGalleryCount+' 条</b>（浏览器本地）。画廊页签已并入素材库：生成产物在「生成产物」筛选里，旧画廊记录只是元数据，图片文件都在素材库。 ';
    const clear = document.createElement('button');
    clear.className = 'ghost';
    clear.textContent = '清除旧画廊数据';
    clear.onclick = () => {
      try { localStorage.removeItem('imagestudio.gallery'); } catch {}
      saveLS('galleryMigrated', 1);
      mig.hidden = true;
      setStatus('已清除旧画廊本地数据（图片文件不受影响）');
    };
    const keep = document.createElement('button');
    keep.className = 'ghost';
    keep.textContent = '保留，不再提示';
    keep.onclick = () => { saveLS('galleryMigrated', 1); mig.hidden = true; };
    mig.append(clear, keep);
  }
  $('asSearch').addEventListener('input', ev => { asUi.q = ev.target.value.trim(); asUi.offset = 0; asLoad(); });
  $('asType').addEventListener('change', ev => { asUi.type = ev.target.value; asUi.offset = 0; asLoad(); });
  $('asRefresh').onclick = () => asLoad();
  $('asPrev').onclick = () => { asUi.offset = Math.max(0, asUi.offset - asUi.limit); asLoad(); };
  $('asNext').onclick = () => { if (asUi.offset + asUi.limit < asUi.total) { asUi.offset += asUi.limit; asLoad(); } };
  $('asBatch').onclick = () => {
    asUi.batch = !asUi.batch;
    asUi.sel = {};
    $('asBatchBar').style.display = asUi.batch ? 'flex' : 'none';
    $('asBatch').toggleAttribute('data-on', asUi.batch);
    renderAssets();
  };
  $('asAll').onclick = () => {
    asUi.list.forEach(img => { asUi.sel[img.path] = 1; });
    renderAssets();
  };
  $('asZip').onclick = () => {
    const paths = Object.keys(asUi.sel);
    if (!paths.length) { setStatus('先勾选要打包的素材'); return; }
    const a = document.createElement('a');
    a.href = '/imagestudio/api/assets/zip?paths=' + paths.map(encodeURIComponent).join(',');
    a.download = 'imagestudio-assets.zip';
    document.body.append(a);
    a.click();
    a.remove();
    setStatus('开始打包下载 '+paths.length+' 个素材');
  };
  $('asDelete').onclick = async () => {
    const paths = Object.keys(asUi.sel);
    if (!paths.length) { setStatus('先勾选要删除的素材'); return; }
    const ok = await confirmDlg('确定删除所选 '+paths.length+' 个素材？文件会从磁盘删掉。');
    if (!ok) return;
    const r = await api('/assets/delete', { paths });
    if (r.error) { setStatus(String(r.error)); return; }
    setStatus('已删除 '+r.deleted+' 个'+(r.missing && r.missing.length ? ' · '+r.missing.length+' 个已不存在' : ''));
    asLoad();
  };
  $('asUploadBtn').onclick = () => $('asUpload').click();
  $('asUpload').onchange = async () => {
    const files = Array.from($('asUpload').files || []);
    for (const f of files) {
      if (f.size > MAX_UPLOAD) { setStatus('超过大小限制 10MB：'+f.name); continue; }
      const fd = new FormData();
      fd.append('file', f, f.name || 'upload.png');
      setStatus('上传中：'+f.name);
      try {
        const res = await fetch('/imagestudio/api/assets/upload', { method: 'POST', body: fd });
        const out = await res.json();
        if (out.error) setStatus('上传失败：'+out.error);
        else setStatus('已上传 '+out.name);
      } catch (e) {
        setStatus('上传失败：'+String(e));
      }
    }
    $('asUpload').value = '';
    asUi.type = 'all';
    $('asType').value = 'all';
    asLoad();
  };
})();
// ---- 启动：水合图标 → 拉元数据 → 渠道下拉 → 首次渲染 ----
hydrateIcons();
(async () => {
  const meta = await api('/meta');
  state.meta = meta;
  renderSkills(meta.skills||[]);
  const providers = meta.providers||[];
  state.providers = providers;
  window.__cvRefreshProviders && window.__cvRefreshProviders();
  window.__ecomRefreshProviders && window.__ecomRefreshProviders();
  // 局部重绘渠道选择器：不支持遮罩编辑的协议/模型不进列表（验收 7.6）
  const maskSel = $('cvMaskProvider');
  const capable = providers.filter(p => p.canMaskEdit);
  maskSel.innerHTML = capable.length
    ? capable.map(p => '<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.id)+(p.model?'（'+escapeHtml(p.model)+'）':'')+'</option>').join('')
    : '<option value="">无可用渠道</option>';
  maskSel.title = capable.length
    ? '局部重绘渠道 · 仅显示支持遮罩编辑的 ' + capable.length + ' 个（共 ' + providers.length + ' 个渠道）'
    : '没有任何渠道支持遮罩编辑（openai-image 需配置编辑模型）';
  // 已有真实渠道时收起 mock 提示横幅
  if (providers.some(p => !String(p.id).includes('mock'))) $('channelHint').hidden = true;
  if (!providers.length) setStatus('还没有渠道。到左侧「设置」填地址和密钥环境变量名。mock 未列出时仍可点提交出图。');
  else setStatus(providers.some(p=>String(p.id).includes('mock')) ? 'mock 已连接 · 可直接出图' : '已连接 '+providers.length+' 个渠道');
  // 各页渠道下拉：按能力过滤（视频 / 反推 / 生图）
  function fillCapable(id, pred, autoLabel){
    const sel = $(id);
    if (!sel) return;
    const rows = providers.filter(pred);
    sel.innerHTML = '<option value="">'+autoLabel+'</option>'
      + rows.map(p => '<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.id)+'（'+escapeHtml(p.model||'')+'）</option>').join('');
  }
  const hasKind = (p, re) => (p.kinds||[]).some(k => re.test(k));
  fillCapable('vdProvider', p => hasKind(p, /video/), '自动（找支持视频的）');
  fillCapable('rvProvider', p => hasKind(p, /describe/), '自动（找支持反推的）');
  fillCapable('gfProvider', p => hasKind(p, /image/), '自动（默认渠道）');
  consumeReverseDraft();
  renderHist();
  renderRefChips();
  sync();
})();
${uiDesignJs}
</script>
</body>
</html>`
}
