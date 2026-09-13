(() => {
  // 互斥：dsh client bundle（packages/client）生效时会在 documentElement 上
  // 设 data-istudio-client-active='1'，本 snippet 直接退出，不再插侧栏按钮。
  if (document.documentElement.dataset.istudioClientActive) return;

  const BTN_ATTR = "data-imagestudio-entry";
  const OVERLAY_ID = "imagestudio-overlay";
  const LABEL = "技能台";
  const HREF = "/imagestudio";

  function clientBundleActive() {
    return Boolean(document.documentElement.dataset.istudioClientActive);
  }

  function imagegenTabs() {
    return document.querySelector("[data-dsh-imagegen-session-tabs]");
  }

  function findNewSessionButton() {
    const nodes = [...document.querySelectorAll("button, a, [role='button']")];
    return nodes.find((b) => {
      if (b.closest("[data-dsh-imagegen-session-tabs]")) return false;
      if (b.hasAttribute(BTN_ATTR)) return false;
      return /新会话|New\s*Session/i.test((b.textContent || "").replace(/\s+/g, " ").trim());
    });
  }

  function onEsc(ev) {
    if (ev.key === "Escape") closeOverlay();
  }

  function closeOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
    document.removeEventListener("keydown", onEsc, true);
  }

  function openOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    const wrap = document.createElement("div");
    wrap.id = OVERLAY_ID;
    wrap.style.cssText = [
      "position:fixed", "inset:0", "z-index:99999",
      "background:#0b0d12", "display:flex", "flex-direction:column",
    ].join(";");
    const bar = document.createElement("div");
    bar.style.cssText = [
      "flex:0 0 44px", "display:flex", "align-items:center", "gap:12px",
      "padding:0 14px", "border-bottom:1px solid rgba(255,255,255,.08)",
      "background:#10131a", "color:#e8c547", "font:13px/1.4 system-ui,sans-serif",
    ].join(";");
    const back = document.createElement("button");
    back.type = "button";
    back.textContent = "← 返回会话";
    back.style.cssText = [
      "padding:6px 14px", "border-radius:8px",
      "border:1px solid rgba(201,162,39,.45)", "background:rgba(201,162,39,.12)",
      "color:#e8c547", "cursor:pointer", "font-size:13px",
    ].join(";");
    back.addEventListener("click", closeOverlay);
    const hint = document.createElement("span");
    hint.textContent = "技能台 · Image Studio（Esc 或左上角返回，原会话保持不动）";
    hint.style.opacity = ".7";
    const frame = document.createElement("iframe");
    frame.src = HREF;
    frame.style.cssText = "flex:1;border:0;width:100%;background:#0b0d12";
    // Same-origin: reroute the studio page's own 「← 返回会话」 to close the
    // overlay instead of navigating the iframe to the shell URL.
    frame.addEventListener("load", () => {
      try {
        const doc = frame.contentDocument;
        const home = doc && doc.getElementById("backHome");
        if (home) {
          home.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            closeOverlay();
          });
        }
      } catch (e) { console.warn("[imagestudio] iframe backHome rewiring skipped:", e); }
    });
    bar.appendChild(back);
    bar.appendChild(hint);
    wrap.appendChild(bar);
    wrap.appendChild(frame);
    document.body.appendChild(wrap);
    document.addEventListener("keydown", onEsc, true);
  }

  function makeControl() {
    const studio = document.createElement("a");
    studio.href = HREF;
    studio.setAttribute(BTN_ATTR, "1");
    studio.textContent = LABEL;
    studio.title = "打开 Image Studio 技能工作台（浮层打开，不顶掉会话界面）";
    studio.style.cssText = [
      "display:block",
      "width:100%",
      "margin:8px 0 0",
      "height:36px",
      "line-height:36px",
      "text-align:center",
      "text-decoration:none",
      "border-radius:8px",
      "border:1px solid rgba(201,162,39,.45)",
      "background:rgba(201,162,39,.12)",
      "color:#e8c547",
      "cursor:pointer",
      "box-sizing:border-box",
    ].join(";");
    studio.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openOverlay();
    });
    return studio;
  }

  function ensureButton() {
    // client bundle 后加载完成时（slot 注册晚于本脚本），自我拆除。
    if (clientBundleActive()) {
      obs.disconnect();
      clearInterval(timer);
      const stale = document.querySelector("[" + BTN_ATTR + "]");
      if (stale) stale.remove();
      closeOverlay();
      return;
    }
    if (document.querySelector("[" + BTN_ATTR + "]")) return;
    const studio = makeControl();
    const tabs = imagegenTabs();
    if (tabs && tabs.parentElement) {
      if (tabs.nextSibling) tabs.parentElement.insertBefore(studio, tabs.nextSibling);
      else tabs.parentElement.appendChild(studio);
      return;
    }
    const origin = findNewSessionButton();
    if (!origin || !origin.parentElement) return;
    if (origin.nextSibling) origin.parentElement.insertBefore(studio, origin.nextSibling);
    else origin.parentElement.appendChild(studio);
  }

  const obs = new MutationObserver(() => ensureButton());
  obs.observe(document.documentElement, { childList: true, subtree: true });
  const timer = setInterval(ensureButton, 1500);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureButton);
  else ensureButton();
})();
