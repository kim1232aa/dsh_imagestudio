(() => {
  const BTN_ATTR = "data-imagestudio-entry";
  const OVERLAY_ATTR = "data-imagestudio-overlay";
  function findNewSessionButton() {
    const buttons = [...document.querySelectorAll("button")];
    return buttons.find((b) => /新会话|New session|New Session/i.test(b.textContent || ""));
  }
  function ensureButton() {
    if (document.querySelector("[" + BTN_ATTR + "]")) return;
    const origin = findNewSessionButton();
    if (!origin || !origin.parentElement) return;
    const wrap = document.createElement("div");
    wrap.setAttribute(BTN_ATTR, "1");
    wrap.style.display = "flex";
    wrap.style.gap = "6px";
    wrap.style.width = "100%";
    const cloneStyle = window.getComputedStyle(origin);
    const make = (label, primary) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.flex = "1";
      b.style.height = cloneStyle.height;
      b.style.borderRadius = cloneStyle.borderRadius || "8px";
      b.style.border = "1px solid rgba(255,255,255,.08)";
      b.style.background = primary ? "rgba(201,162,39,.18)" : cloneStyle.backgroundColor;
      b.style.color = primary ? "#e8c547" : cloneStyle.color;
      b.style.cursor = "pointer";
      b.style.font = cloneStyle.font;
      return b;
    };
    const chat = make("新会话", false);
    const studio = make("生图", true);
    chat.title = "回到对话";
    studio.title = "打开 Image Studio（Nova + Skills）";
    chat.addEventListener("click", () => {
      closeOverlay();
      origin.click();
    });
    studio.addEventListener("click", () => openOverlay());
    wrap.append(chat, studio);
    origin.style.display = "none";
    origin.parentElement.insertBefore(wrap, origin);
  }
  function openOverlay() {
    if (document.querySelector("[" + OVERLAY_ATTR + "]")) return;
    const frame = document.createElement("iframe");
    frame.setAttribute(OVERLAY_ATTR, "1");
    frame.src = "/imagestudio?embed=1";
    frame.style.cssText = "position:fixed;inset:0 0 0 var(--dsh-sidebar-width,260px);border:0;z-index:40;background:#101014;width:auto;height:100%;";
    document.documentElement.setAttribute("data-imagestudio-open", "1");
    document.body.append(frame);
  }
  function closeOverlay() {
    document.querySelectorAll("[" + OVERLAY_ATTR + "]").forEach((n) => n.remove());
    document.documentElement.removeAttribute("data-imagestudio-open");
  }
  const obs = new MutationObserver(() => ensureButton());
  obs.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureButton);
  else ensureButton();
})();
