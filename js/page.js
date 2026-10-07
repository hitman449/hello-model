/* Hello Model: behaviour for the Learn pages (everything outside the app on index.html). */
(function () {
  const $ = sel => document.querySelector(sel);
  window.HM_SHELL.init();

  // Copy buttons on code blocks.
  document.querySelectorAll(".copy-code").forEach(btn => btn.addEventListener("click", () => {
    const code = btn.closest(".code-block").querySelector("code").textContent;
    const done = ok => { btn.textContent = ok ? "Copied ✓" : "Copy failed"; setTimeout(() => { btn.textContent = "Copy"; }, 1600); };
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

  if (window.HM_ADS) window.HM_ADS.fillIn(document);
})();
