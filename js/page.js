/* Hello Model: behaviour for the Learn pages (everything outside the app on index.html). */
(function () {
  const $ = sel => document.querySelector(sel);
  window.HM_SHELL.init();

  // Copy buttons on code blocks.
  document.querySelectorAll(".copy-code").forEach(btn => btn.addEventListener("click", () => {
    const code = btn.closest(".code-block").querySelector("code").textContent;
    const done = ok => { btn.textContent = ok ? "Copied" : "Copy failed"; setTimeout(() => { btn.textContent = "Copy"; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => done(true), () => done(false));
    else done(false);
  }));

  // Glossary search.
  const search = $("#glossarySearch");
  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      document.querySelectorAll(".g-item").forEach(item => {
        const on = !q || item.textContent.toLowerCase().includes(q);
        item.classList.toggle("hidden", !on);
        if (on) shown++;
      });
      $("#glossaryEmpty").classList.toggle("hidden", shown > 0);
    });
  }

  // Interactive widgets: each one’s script loads only when it’s about to scroll into view.
  // The build adds ?v=<commit> to this script’s URL; reuse it so widgets are never stale.
  const VERSION = (document.currentScript && new URL(document.currentScript.src, location.href).searchParams.get("v")) || "";
  const loadWidget = box => {
    const name = box.dataset.widget;
    const start = () => window.HM_WIDGETS && window.HM_WIDGETS[name] && window.HM_WIDGETS[name](box.querySelector(".widget-body"));
    if (window.HM_WIDGETS && window.HM_WIDGETS[name]) return start();
    const s = document.createElement("script");
    s.src = `/js/widgets/${name}.js` + (VERSION ? "?v=" + VERSION : "");
    s.onload = start;
    s.onerror = () => { box.querySelector(".widget-body").innerHTML = "<p class='muted'>This example couldn’t load. Try reloading the page.</p>"; };
    document.head.appendChild(s);
  };
  const widgets = document.querySelectorAll(".widget[data-widget]");
  if (widgets.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { io.unobserve(e.target); loadWidget(e.target); }
    }), { rootMargin: "300px 0px" });
    widgets.forEach(w => io.observe(w));
  } else widgets.forEach(loadWidget);

  // Remember which lessons and guides were opened, for the learning path (kept in this browser only).
  if (/^\/(training|guides)\/[^/]+\/$/.test(location.pathname)) {
    try {
      const seen = new Set(JSON.parse(localStorage.getItem("hm-visited") || "[]"));
      seen.add(location.pathname);
      localStorage.setItem("hm-visited", JSON.stringify([...seen]));
    } catch (_) { /* storage unavailable */ }
  }

  // Learning path page: tick off what’s been opened, and point to the next thing.
  if ($("#pathProgress")) {
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem("hm-visited") || "[]"); } catch (_) { /* storage unavailable */ }
    const links = [...document.querySelectorAll(".path a[data-path]")];
    const done = links.filter(a => seen.includes(a.dataset.path));
    links.forEach(a => {
      const on = seen.includes(a.dataset.path);
      a.parentElement.classList.toggle("visited", on);
      a.querySelector(".path-state").textContent = on ? "(visited)" : "";
    });
    $("#pathBar").innerHTML = links.map(a => `<li class="${seen.includes(a.dataset.path) ? "done" : ""}"></li>`).join("");
    const next = links.find(a => !seen.includes(a.dataset.path));
    if (done.length) {
      $("#pathCount").textContent = `${done.length} of ${links.length} visited`;
      const btn = $("#pathNext");
      if (next) { btn.href = next.dataset.path; btn.textContent = `Continue: ${next.querySelector("b").textContent} →`; }
      else { btn.href = "/#/build"; btn.textContent = "You’ve visited everything. Create a plan"; }
    }
  }

  if (window.HM_ADS) window.HM_ADS.fillIn(document);
})();
