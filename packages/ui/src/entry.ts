/** Original sidebar entry script. Observes DSH chrome and adds 生图 next to 新会话. */
export const entryJs = `(() => {
  if (window.__dshImageStudioEntry) return;
  window.__dshImageStudioEntry = true;

  const LABEL = '生图';
  const HREF = '/imagestudio';

  function looksLikeNewSession(el) {
    if (!el || el.dataset && el.dataset.imagestudio) return false;
    const t = (el.textContent || '').replace(/\\s+/g, '');
    return t.includes('新会话') || t.includes('NewSession') || t.includes('New session');
  }

  function makeBtn() {
    const a = document.createElement('a');
    a.href = HREF;
    a.textContent = LABEL;
    a.dataset.imagestudio = 'entry';
    a.setAttribute('aria-label', '打开 Image Studio');
    const probe = document.querySelector('button, a');
    const cs = probe ? getComputedStyle(probe) : null;
    a.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'margin-left:8px',
      'padding:6px 12px',
      'border-radius:8px',
      'border:1px solid rgba(196,165,116,.45)',
      'color:#c4a574',
      'text-decoration:none',
      'font:inherit',
      'white-space:nowrap',
      'background:transparent',
      'cursor:pointer',
    ].join(';');
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      window.location.assign(HREF);
    });
    return a;
  }

  function place() {
    if (document.querySelector('[data-imagestudio="entry"]')) return true;
    const nodes = document.querySelectorAll('button, a, [role="button"]');
    for (const el of nodes) {
      if (!looksLikeNewSession(el)) continue;
      const parent = el.parentElement;
      if (!parent) continue;
      const btn = makeBtn();
      if (el.nextSibling) parent.insertBefore(btn, el.nextSibling);
      else parent.appendChild(btn);
      return true;
    }
    return false;
  }

  place();
  const obs = new MutationObserver(() => place());
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
`;
