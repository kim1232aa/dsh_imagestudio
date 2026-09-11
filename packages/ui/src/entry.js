(() => {
  const BTN_ATTR = "data-imagestudio-entry";
  const FRAME_ATTR = "data-imagestudio-frame";

  function findNewSessionButton() {
    const nodes = [...document.querySelectorAll("button, a, [role='button']")];
    return nodes.find((b) => /新会话|New\s*Session/i.test((b.textContent || "").replace(/\s+/g, " ").trim()));
  }

  function ensureButton() {
    if (document.querySelector("[" + BTN_ATTR + "]")) return;
    const origin = findNewSessionButton();
    if (!origin || !origin.parentElement) return;
    const studio = document.createElement("button");
    studio.type = "button";
    studio.setAttribute(BTN_ATTR, "1");
    studio.textContent = "生图";
    studio.title = "打开 Image Studio（Nova + Skills）";
    const cs = window.getComputedStyle(origin);
    studio.style.cssText = [
      "display:block",
      "width:100%",
      "margin:0 0 8px",
      "height:" + (cs.height || "36px"),
      "border-radius:" + (cs.borderRadius || "8px"),
      "border:1px solid rgba(201,162,39,.45)",
      "background:rgba(201,162,39,.16)",
      "color:#e8c547",
      "cursor:pointer",
      "font:" + cs.font,
    ].join(";");
    studio.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openStudio();
    });
    if (origin.nextSibling) origin.parentElement.insertBefore(studio, origin.nextSibling);
    else origin.parentElement.appendChild(studio);
  }

  function openStudio() {
    const main = document.getElementById("main") || document.querySelector("main");
    if (main) {
      let frame = document.querySelector("[" + FRAME_ATTR + "]");
      if (!frame) {
        frame = document.createElement("iframe");
        frame.setAttribute(FRAME_ATTR, "1");
        frame.setAttribute("title", "Image Studio");
        frame.src = "/imagestudio?embed=1";
        frame.style.cssText = "width:100%;height:100%;border:0;background:#12110e;display:block";
        main.innerHTML = "";
        main.appendChild(frame);
      }
      document.documentElement.setAttribute("data-imagestudio-open", "1");
      return;
    }
    window.location.assign("/imagestudio");
  }

  const obs = new MutationObserver(() => ensureButton());
  obs.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureButton);
  else ensureButton();
  setInterval(ensureButton, 1500);
})();
