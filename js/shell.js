/*
 * Hello Model: the parts shared by the app (index.html) and the Learn pages.
 * Sidebar (collapse, mobile drawer, Recents), light/dark theme and glossary tooltips.
 */
(function (root) {
  const PLANS_KEY = "hello-model-plans-v1";
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kb = () => root.HM_KB || { USE_CASES: {}, GLOSSARY: {} };

  // ---------- storage (best effort) ----------
  function pref(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (_) { return null; }
  }
  /** Saved plans whose model type still exists. */
  function loadPlans() {
    try {
      const list = JSON.parse(localStorage.getItem(PLANS_KEY) || "[]");
      return Array.isArray(list) ? list.filter(p => p && kb().USE_CASES[p.useCaseId]) : [];
    } catch (_) { return []; }
  }
  function storePlans(list) {
    try { localStorage.setItem(PLANS_KEY, JSON.stringify(list)); } catch (_) { /* storage unavailable */ }
  }
  function planTitle(p) {
    const t = (p.requirement || "").trim();
    return t ? (t.length > 60 ? t.slice(0, 57) + "…" : t) : kb().USE_CASES[p.useCaseId].name;
  }

  // ---------- sidebar ----------
  function openNav() { document.body.classList.add("nav-open"); }
  function closeNav() { document.body.classList.remove("nav-open"); }

  let openHandler = null;
  /** List the latest plans under "Recents". Links work on every page; the app opens them in place. */
  function renderRecents() {
    const ul = $("#recents");
    if (!ul) return;
    const list = loadPlans().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
    $("#recentsWrap").classList.toggle("hidden", !list.length);
    ul.innerHTML = list.map(p => `<li><a href="/#/open/${esc(p.id)}" data-id="${esc(p.id)}" title="${esc(planTitle(p))}">
      <span aria-hidden="true">${kb().USE_CASES[p.useCaseId].icon}</span><span class="label-text">${esc(planTitle(p))}</span></a></li>`).join("");
    if (openHandler) ul.querySelectorAll("a").forEach(a => a.addEventListener("click", e => { e.preventDefault(); openHandler(a.dataset.id); }));
  }

  function initTheme() {
    const theme = pref("hm-theme");
    if (theme) document.documentElement.dataset.theme = theme;
    $("#themeBtn").addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      pref("hm-theme", next);
    });
  }

  // ---------- glossary tooltips for {{term}} markers ----------
  function initTooltips() {
    const tip = $("#tooltip");
    if (!tip) return;
    const showTip = t => {
      tip.textContent = kb().GLOSSARY[t.dataset.term] || "";
      tip.classList.remove("hidden");
      const r = t.getBoundingClientRect();
      const w = Math.min(300, window.innerWidth - 32);
      tip.style.maxWidth = w + "px";
      tip.style.left = Math.max(16, Math.min(r.left, window.innerWidth - w - 16)) + "px";
      const below = r.bottom + 8;
      tip.style.top = below + "px";
      const th = tip.getBoundingClientRect().height;
      if (below + th > window.innerHeight - 8) tip.style.top = (r.top - th - 8) + "px";
    };
    const hide = () => tip.classList.add("hidden");
    document.addEventListener("mouseover", e => { const t = e.target.closest(".term"); t ? showTip(t) : hide(); });
    document.addEventListener("focusin", e => { const t = e.target.closest(".term"); t ? showTip(t) : hide(); });
    document.addEventListener("click", e => { const t = e.target.closest(".term"); if (t) showTip(t); });
    window.addEventListener("scroll", hide, { passive: true });
  }

  /**
   * Wire up the sidebar, theme and tooltips.
   * `onNewPlan` / `onOpenPlan` are given by the app; elsewhere those actions open the app.
   */
  function init({ onNewPlan, onOpenPlan } = {}) {
    // Restore the saved sidebar state without animating it on page load.
    document.body.classList.add("booting");
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("booting")));
    document.body.classList.toggle("sidebar-collapsed", pref("hm-sidebar") === "collapsed");
    $("#collapseBtn").addEventListener("click", () => {
      const now = !document.body.classList.contains("sidebar-collapsed");
      document.body.classList.toggle("sidebar-collapsed", now);
      pref("hm-sidebar", now ? "collapsed" : "open");
    });
    $("#menuBtn").addEventListener("click", openNav);
    $("#scrim").addEventListener("click", closeNav);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeNav(); });
    document.querySelectorAll(".side-nav a").forEach(a => a.addEventListener("click", closeNav));
    $("#newPlanBtn").addEventListener("click", onNewPlan || (() => { location.href = "/#/new"; }));
    openHandler = onOpenPlan || null;
    initTheme();
    initTooltips();
    renderRecents();
  }

  root.HM_SHELL = { pref, loadPlans, storePlans, planTitle, renderRecents, openNav, closeNav, init };
})(window);
