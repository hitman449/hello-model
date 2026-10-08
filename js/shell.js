/*
 * Hello Model: the parts shared by the app (index.html) and the Learn pages.
 * Sidebar (collapse, mobile drawer, Recents), light/dark theme and glossary tooltips.
 */
(function (root) {
  const PLANS_KEY = "hello-model-plans-v1";
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kb = () => root.HM_KB || { USE_CASES: {}, GLOSSARY: {} };
  // The build adds ?v=<commit> to this script’s URL; reuse it so the search index is never stale.
  const VERSION = (document.currentScript && new URL(document.currentScript.src, location.href).searchParams.get("v")) || "";

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
  function openNav() { document.body.classList.add("nav-open"); $("#menuBtn").setAttribute("aria-expanded", "true"); }
  function closeNav() { document.body.classList.remove("nav-open"); const b = $("#menuBtn"); if (b) b.setAttribute("aria-expanded", "false"); }

  let openHandler = null;
  /** List the latest plans under "Recents". Links work on every page; the app opens them in place. */
  function renderRecents() {
    const ul = $("#recents");
    if (!ul) return;
    const list = loadPlans().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
    $("#recentsWrap").classList.toggle("hidden", !list.length);
    ul.innerHTML = list.map(p => `<li><a href="/#/open/${esc(p.id)}" data-id="${esc(p.id)}" title="${esc(planTitle(p))}">
      ${root.HM_ICONS ? root.HM_ICONS.svg(kb().USE_CASES[p.useCaseId].icon, 18) : ""}<span class="label-text">${esc(planTitle(p))}</span></a></li>`).join("");
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
      document.querySelectorAll("[aria-describedby='tooltip']").forEach(x => x.removeAttribute("aria-describedby"));
      t.setAttribute("aria-describedby", "tooltip");
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

  // ---------- site search (Ctrl+K / Cmd+K, "/" or the Search buttons) ----------
  let searchIndex = null;
  const loadIndex = () => searchIndex || (searchIndex = fetch("/search-index.json" + (VERSION ? "?v=" + VERSION : ""))
    .then(r => (r.ok ? r.json() : [])).catch(() => []));
  let dialog = null, active = 0, results = [];

  function buildSearch() {
    dialog = document.createElement("dialog");
    dialog.className = "search-dialog";
    dialog.setAttribute("aria-label", "Search the site");
    dialog.innerHTML = `<div class="search-box">
        <svg class="i" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" id="searchInput" placeholder="Search guides, model types, lessons, terms…" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="searchResults" aria-autocomplete="list">
        <kbd>Esc</kbd>
      </div>
      <div class="search-hint" id="searchHint"></div>
      <ul class="search-results" id="searchResults" role="listbox" aria-label="Results"></ul>`;
    document.body.appendChild(dialog);
    const input = dialog.querySelector("#searchInput");
    input.addEventListener("input", () => { active = 0; renderResults(input.value); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (results.length) { active = (active + (e.key === "ArrowDown" ? 1 : results.length - 1)) % results.length; paintActive(); }
      } else if (e.key === "Enter" && results[active]) {
        e.preventDefault();
        go(results[active].u);
      } else if (e.key === "Escape") {
        e.preventDefault(); // a search field’s first Escape would only clear the text
        dialog.close();
      }
    });
    dialog.addEventListener("click", e => {
      if (e.target === dialog) dialog.close();          // click on the backdrop
      const a = e.target.closest("a[data-u]");
      if (a) { e.preventDefault(); go(a.dataset.u); }
    });
  }

  function go(url) {
    dialog.close();
    location.href = url;
  }

  const SUGGESTIONS = ["forecasting", "spam filter", "chatbot", "overfitting", "precision", "AWS"];
  async function renderResults(query) {
    const ul = dialog.querySelector("#searchResults");
    const hint = dialog.querySelector("#searchHint");
    const entries = await loadIndex();
    if (dialog.querySelector("#searchInput").value !== query) return; // a newer keystroke already rendered
    results = query.trim() ? root.HM_SEARCH.rank(entries, query) : [];
    if (!query.trim()) {
      ul.innerHTML = "";
      hint.innerHTML = `Try: ${SUGGESTIONS.map(s => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join(" ")}`;
      hint.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => {
        const input = dialog.querySelector("#searchInput");
        input.value = b.dataset.q; input.focus(); renderResults(input.value);
      }));
      return;
    }
    ul.innerHTML = results.map((r, i) => `<li role="none"><a href="${esc(r.u)}" data-u="${esc(r.u)}" role="option" id="sr-${i}" class="search-item">
        <span class="search-kind">${esc(r.k)}</span><b>${esc(r.t)}</b><span class="muted">${esc(r.d)}</span></a></li>`).join("");
    hint.innerHTML = results.length ? "" : `No results for “${esc(query)}”. Try a simpler word, or <a href="/#/build">describe your idea</a> instead.`;
    paintActive();
  }

  function paintActive() {
    const input = dialog.querySelector("#searchInput");
    dialog.querySelectorAll(".search-item").forEach((a, i) => {
      a.classList.toggle("active", i === active);
      a.setAttribute("aria-selected", i === active);
      if (i === active) a.scrollIntoView({ block: "nearest" });
    });
    if (results.length) input.setAttribute("aria-activedescendant", "sr-" + active); else input.removeAttribute("aria-activedescendant");
  }

  function openSearch() {
    if (!dialog) buildSearch();
    closeNav();
    if (!dialog.open) dialog.showModal();
    const input = dialog.querySelector("#searchInput");
    input.select();
    renderResults(input.value);
  }

  function initSearch() {
    document.querySelectorAll("[data-search]").forEach(b => b.addEventListener("click", openSearch));
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || "");
    document.querySelectorAll(".search-kbd").forEach(k => { k.textContent = mac ? "⌘K" : "Ctrl K"; });
    document.addEventListener("keydown", e => {
      const typing = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
      else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openSearch(); }
    });
  }

  /**
   * Wire up the sidebar, theme and tooltips.
   * `onNewPlan` / `onOpenPlan` are given by the app; elsewhere those actions open the app.
   */
  function init({ onNewPlan, onOpenPlan } = {}) {
    // Restore the saved sidebar state without animating it on page load.
    document.body.classList.add("booting");
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("booting")));
    const setCollapsed = on => {
      document.body.classList.toggle("sidebar-collapsed", on);
      const b = $("#collapseBtn");
      b.setAttribute("aria-expanded", String(!on));
      b.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar");
      b.title = b.getAttribute("aria-label");
    };
    setCollapsed(pref("hm-sidebar") === "collapsed");
    $("#collapseBtn").addEventListener("click", () => {
      const now = !document.body.classList.contains("sidebar-collapsed");
      setCollapsed(now);
      pref("hm-sidebar", now ? "collapsed" : "open");
    });
    $("#menuBtn").addEventListener("click", openNav);
    $("#scrim").addEventListener("click", closeNav);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeNav(); });
    document.querySelectorAll(".side-nav a").forEach(a => a.addEventListener("click", closeNav));
    $("#newPlanBtn").addEventListener("click", onNewPlan || (() => { location.href = "/#/new"; }));
    // Skip link: move focus to the content without changing the URL (in the app, the URL hash is the route).
    const skip = $(".skip-link");
    if (skip) skip.addEventListener("click", e => { e.preventDefault(); $("#app").focus(); });
    openHandler = onOpenPlan || null;
    initTheme();
    initTooltips();
    initSearch();
    renderRecents();
  }

  root.HM_SHELL = { pref, loadPlans, storePlans, planTitle, renderRecents, openNav, closeNav, openSearch, init };
})(window);
