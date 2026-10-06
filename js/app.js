/* Hello Model — UI controller. */
(function () {
  const { USE_CASES, QUESTIONS, GLOSSARY } = window.HM_KB;
  const E = window.HM_ENGINE;
  const $ = sel => document.querySelector(sel);
  const STORE_KEY = "hello-model-state-v1";

  let state = { requirement: "", useCaseId: null, ranked: [], answers: {}, qIndex: 0, stepIndex: 0, checks: {}, screen: "describe" };
  let plan = null;

  // ---------- persistence (best effort) ----------
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* storage unavailable */ }
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (s && typeof s === "object") state = Object.assign(state, s);
    } catch (_) { /* ignore */ }
  }
  function pref(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (_) { return null; }
  }

  // ---------- helpers ----------
  const esc = E.escapeHtml;
  /** Turn {{term}} markers into glossary tooltips. Input is trusted HTML from the knowledge base. */
  function rich(html) {
    return String(html).replace(/\{\{([^}]+)\}\}/g, (_, term) =>
      GLOSSARY[term] ? `<span class="term" tabindex="0" data-term="${esc(term)}">${esc(term)}</span>` : esc(term));
  }
  function el(tag, attrs, html) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function show(screen) {
    state.screen = screen;
    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
    $("#screen-" + screen).classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    save();
  }

  // ---------- screen 1: describe ----------
  function ucCard(id, onClick) {
    const uc = USE_CASES[id];
    const b = el("button", { class: "uc-card", type: "button" },
      `<div class="ic" aria-hidden="true">${uc.icon}</div><b>${esc(uc.name)}</b><span>${esc(uc.tagline)}</span>`);
    b.addEventListener("click", () => onClick(id));
    return b;
  }

  function initDescribe() {
    const chips = $("#exampleChips");
    const examples = [
      "Chatbot that answers employee questions from our HR policy PDFs",
      "Predict which customers will churn next month from our CRM data",
      "Detect defective parts in photos from our production line",
      "Forecast daily sales for each of our 40 stores",
      "Route incoming support tickets to the right team",
      "Recommend products to shoppers based on purchase history"
    ];
    examples.forEach(ex => {
      const c = el("button", { class: "chip", type: "button" }, esc(ex));
      c.addEventListener("click", () => { $("#requirement").value = ex; $("#requirement").focus(); });
      chips.appendChild(c);
    });
    const grid = $("#ucGrid");
    Object.keys(USE_CASES).forEach(id => grid.appendChild(ucCard(id, pickUseCase)));

    $("#describeForm").addEventListener("submit", e => {
      e.preventDefault();
      const text = $("#requirement").value.trim();
      if (text.length < 8) {
        $("#requirement").focus();
        $("#requirement").setAttribute("placeholder", "Please describe your use case in a sentence or two…");
        return;
      }
      state.requirement = text;
      state.ranked = E.classify(text);
      state.useCaseId = state.ranked[0].score > 0 ? state.ranked[0].id : null;
      renderDetect();
      show("detect");
    });
  }

  // ---------- screen 2: detect ----------
  function renderDetect() {
    const main = $("#detectMain");
    const top = state.ranked[0];
    if (!state.useCaseId) {
      main.innerHTML = `<div class="big-ic" aria-hidden="true">🤔</div><div>
        <div class="no-match"><b>We couldn't confidently match your description.</b><br>
        Try adding words about your data (images, text, numbers over time, documents…) or pick the closest model type below.</div></div>`;
    } else {
      const uc = USE_CASES[state.useCaseId];
      const pct = Math.round(top.confidence * 100);
      main.innerHTML = `<div class="big-ic" aria-hidden="true">${uc.icon}</div>
        <div>
          <span class="conf">${pct}% match</span>
          <h3 style="margin-top:.4em">${esc(uc.name)}</h3>
          <p>${esc(uc.tagline)}</p>
          <p class="matched">Because you mentioned: ${top.matched.map(m => `<code>${esc(m)}</code>`).join(" ")}</p>
          <p class="matched">Similar projects: ${uc.examples.map(esc).join(" · ")}</p>
          <div class="row-end" style="justify-content:flex-start"><button class="btn primary" id="confirmUc">Yes, continue →</button></div>
        </div>`;
      $("#confirmUc").addEventListener("click", () => pickUseCase(state.useCaseId));
    }
    const alt = $("#altGrid");
    alt.innerHTML = "";
    const order = state.ranked.map(r => r.id).filter(id => id !== state.useCaseId);
    order.forEach(id => alt.appendChild(ucCard(id, pickUseCase)));
  }

  function pickUseCase(id) {
    state.useCaseId = id;
    state.qIndex = 0;
    state.stepIndex = 0;
    state.checks = {};
    if (!state.requirement) state.requirement = "";
    renderQuestion();
    show("questions");
  }

  // ---------- screen 3: questions ----------
  function visibleQuestions() {
    // Labels are irrelevant for use cases where they come for free.
    return QUESTIONS.filter(q => !(q.id === "labels" && E.IMPLICIT_LABELS.has(state.useCaseId)));
  }

  function renderQuestion() {
    const qs = visibleQuestions();
    const q = qs[state.qIndex];
    $("#qBar").style.width = (state.qIndex / qs.length * 100) + "%";
    $("#qCount").textContent = `Question ${state.qIndex + 1} of ${qs.length} · ${USE_CASES[state.useCaseId].name}`;
    const card = $("#qCard");
    card.innerHTML = `<h2>${esc(q.title)}</h2><p class="muted">${esc(q.help)}</p><div class="q-options" role="radiogroup" aria-label="${esc(q.title)}"></div>`;
    const wrap = card.querySelector(".q-options");
    q.options.forEach((o, i) => {
      const selected = state.answers[q.id] === o.value;
      const b = el("button", { class: "q-opt" + (selected ? " selected" : ""), type: "button", role: "radio", "aria-checked": String(selected) },
        `<b><kbd>${i + 1}</kbd>${esc(o.label)}</b><span>${esc(o.hint)}</span>`);
      b.addEventListener("click", () => answer(q.id, o.value));
      wrap.appendChild(b);
    });
    const first = wrap.querySelector(".selected") || wrap.firstChild;
    first && first.focus({ preventScroll: true });
  }

  function answer(qid, value) {
    state.answers[qid] = value;
    const qs = visibleQuestions();
    renderQuestion();
    setTimeout(() => {
      if (state.qIndex < qs.length - 1) {
        state.qIndex++;
        renderQuestion();
        save();
      } else {
        $("#qBar").style.width = "100%";
        buildAndShowPlan();
      }
    }, 180);
  }

  // ---------- screen 4: plan ----------
  function buildAndShowPlan() {
    plan = E.buildPlan(state.useCaseId, state.answers, state.requirement);
    renderPlan();
    show("plan");
  }

  function renderPlan() {
    const uc = plan.useCase;
    $("#planEyebrow").textContent = `${uc.icon} ${uc.name} · ${plan.tier} approach · ${plan.infraName}`;
    $("#planTitle").textContent = "Your personalised model-building guide";
    $("#planReq").textContent = plan.requirement ? `“${plan.requirement}”` : uc.tagline;

    // Stack tab
    $("#warnings").innerHTML = plan.warnings.map(w => `<div class="warn">⚠️ ${esc(w)}</div>`).join("");
    $("#sumModel").innerHTML = rich(plan.model.name);
    $("#sumWhy").innerHTML = rich(plan.model.why);
    $("#sumCost").textContent = plan.cost;
    $("#sumGpu").textContent = plan.gpu ? "Yes — for training and/or serving (see infrastructure below)." : "No — CPUs (or a hosted API) are enough.";
    $("#arch").innerHTML = plan.architecture.map((n, i) => {
      const isMon = n.label === "Monitoring";
      const node = `<div class="arch-node${isMon ? " mon" : ""}"><b>${esc(n.label)}</b><small>${esc(n.detail)}</small></div>`;
      if (i === 0) return node;
      return `<span class="arch-arrow" aria-hidden="true">${isMon ? "⟲" : "→"}</span>` + node;
    }).join("");
    $("#stack").innerHTML = Object.entries(plan.stack).map(([k, v]) =>
      `<div class="stack-row"><b>${esc(k)}</b><div class="pills">${v.map(x => `<span class="pill">${esc(x)}</span>`).join("")}</div></div>`).join("");
    $("#infraTitle").textContent = `Infrastructure on ${plan.infraName}`;
    $("#infra").innerHTML = `<thead><tr><th>Component</th><th>Recommended service</th></tr></thead><tbody>` +
      plan.infraRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("") + "</tbody>";

    renderStepper();
    renderStep();
  }

  function stepDone(i) {
    const s = plan.steps[i];
    return s.checklist.every((_, j) => state.checks[`${s.id}:${j}`]);
  }

  function updateProgress() {
    const total = plan.steps.reduce((n, s) => n + s.checklist.length, 0);
    const done = plan.steps.reduce((n, s) => n + s.checklist.filter((_, j) => state.checks[`${s.id}:${j}`]).length, 0);
    const pct = Math.round(done / total * 100);
    $("#overallPct").textContent = `${pct}% · ${done}/${total} tasks`;
    $("#overallBar").style.width = pct + "%";
  }

  function renderStepper() {
    const ol = $("#stepper");
    ol.innerHTML = "";
    plan.steps.forEach((s, i) => {
      const li = el("li", { class: (i === state.stepIndex ? "active " : "") + (stepDone(i) ? "done" : "") });
      const b = el("button", { type: "button", "aria-current": i === state.stepIndex ? "step" : "false" },
        `<span class="dot">${stepDone(i) ? "✓" : i + 1}</span><span class="t">${esc(s.title)}</span>`);
      b.addEventListener("click", () => goStep(i));
      li.appendChild(b);
      ol.appendChild(li);
    });
    updateProgress();
  }

  function goStep(i) {
    state.stepIndex = Math.max(0, Math.min(plan.steps.length - 1, i));
    renderStepper();
    renderStep();
    save();
    const view = $("#stepView");
    if (view.getBoundingClientRect().top < 60) view.scrollIntoView({ behavior: "smooth", block: "start" });
    view.focus({ preventScroll: true });
  }

  function renderStep() {
    const i = state.stepIndex;
    const s = plan.steps[i];
    const view = $("#stepView");
    let html = `<p class="eyebrow">Step ${i + 1} of ${plan.steps.length}</p><h2>${esc(s.title)}</h2>
      <div class="simple"><b>In plain words:</b> ${esc(s.simple)}</div>
      <p class="why"><b>Why it matters:</b> ${rich(s.why)}</p>`;
    s.sections.forEach(sec => {
      html += `<h4>${esc(sec.heading)}</h4><ul>${sec.items.map(it => `<li>${rich(it)}</li>`).join("")}</ul>`;
    });
    html += `<div class="codes"></div>`;
    html += `<div class="checklist"><h4 style="margin-top:0">✅ Checklist</h4>${s.checklist.map((c, j) =>
      `<label><input type="checkbox" data-key="${esc(s.id)}:${j}"${state.checks[`${s.id}:${j}`] ? " checked" : ""}><span>${esc(c)}</span></label>`).join("")}</div>`;
    html += `<div class="tip">💡 ${rich(s.tip)}</div>`;
    html += `<div class="step-nav"><button class="btn" id="prevStep"${i === 0 ? " disabled" : ""}>← Previous</button>
      ${i < plan.steps.length - 1 ? `<button class="btn primary" id="nextStep">Next: ${esc(plan.steps[i + 1].title)} →</button>`
        : `<button class="btn primary" id="finish">🎉 Finish</button>`}</div>`;
    view.innerHTML = html;

    const codes = view.querySelector(".codes");
    (s.code || []).forEach(c => {
      const block = el("div", { class: "code-block" });
      const head = el("div", { class: "code-head" });
      head.appendChild(el("span", {}, esc(c.label)));
      const copy = el("button", { class: "btn", type: "button" }, "Copy");
      copy.addEventListener("click", () => copyText(c.content, copy));
      head.appendChild(copy);
      const pre = el("pre");
      const code = el("code");
      code.textContent = c.content;
      pre.appendChild(code);
      block.appendChild(head);
      block.appendChild(pre);
      codes.appendChild(block);
    });

    view.querySelectorAll(".checklist input").forEach(cb => cb.addEventListener("change", () => {
      state.checks[cb.dataset.key] = cb.checked;
      save();
      renderStepper();
    }));
    const prev = $("#prevStep"), next = $("#nextStep"), fin = $("#finish");
    prev && prev.addEventListener("click", () => goStep(i - 1));
    next && next.addEventListener("click", () => goStep(i + 1));
    fin && fin.addEventListener("click", () => {
      fin.textContent = "🎉 You have a complete plan — export it to share with your team!";
      fin.disabled = true;
    });
  }

  function copyText(text, btn) {
    const done = () => { btn.textContent = "Copied ✓"; setTimeout(() => (btn.textContent = "Copy"), 1500); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = el("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (_) { /* ignore */ }
    ta.remove();
  }

  function exportMarkdown() {
    const md = E.toMarkdown(plan);
    const blob = new Blob([md], { type: "text/markdown" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `ml-plan-${plan.useCaseId}.md` });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  // ---------- tooltips ----------
  function initTooltips() {
    const tip = $("#tooltip");
    const showTip = t => {
      const term = t.dataset.term;
      tip.textContent = GLOSSARY[term];
      tip.classList.remove("hidden");
      const r = t.getBoundingClientRect();
      const w = Math.min(300, window.innerWidth - 32);
      tip.style.maxWidth = w + "px";
      const left = Math.max(16, Math.min(r.left, window.innerWidth - w - 16));
      tip.style.left = left + "px";
      const below = r.bottom + 8;
      tip.style.top = below + "px";
      const th = tip.getBoundingClientRect().height;
      if (below + th > window.innerHeight - 8) tip.style.top = (r.top - th - 8) + "px";
    };
    const hide = () => tip.classList.add("hidden");
    document.addEventListener("mouseover", e => { const t = e.target.closest(".term"); t ? showTip(t) : hide(); });
    document.addEventListener("focusin", e => { const t = e.target.closest(".term"); t ? showTip(t) : hide(); });
    document.addEventListener("click", e => { const t = e.target.closest(".term"); t ? showTip(t) : null; });
    window.addEventListener("scroll", hide, { passive: true });
  }

  // ---------- global controls ----------
  function initControls() {
    const eli5 = $("#eli5");
    const eliPref = pref("hm-eli5");
    eli5.checked = eliPref === null ? true : eliPref === "1";
    document.body.classList.toggle("eli5", eli5.checked);
    eli5.addEventListener("change", () => { document.body.classList.toggle("eli5", eli5.checked); pref("hm-eli5", eli5.checked ? "1" : "0"); });

    const theme = pref("hm-theme");
    if (theme) document.documentElement.dataset.theme = theme;
    $("#themeBtn").addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      pref("hm-theme", next);
    });

    $("#brand").addEventListener("click", e => { e.preventDefault(); show("describe"); });
    document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => show(b.dataset.go)));
    $("#qBack").addEventListener("click", () => {
      if (state.qIndex > 0) { state.qIndex--; renderQuestion(); save(); }
      else if (state.ranked.length) { renderDetect(); show("detect"); }
      else show("describe");
    });
    $("#editAnswers").addEventListener("click", () => { state.qIndex = 0; renderQuestion(); show("questions"); });
    $("#exportMd").addEventListener("click", exportMarkdown);
    $("#restart").addEventListener("click", () => {
      state = { requirement: "", useCaseId: null, ranked: [], answers: {}, qIndex: 0, stepIndex: 0, checks: {}, screen: "describe" };
      $("#requirement").value = "";
      show("describe");
    });
    document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("hidden", p.id !== "tab-" + t.dataset.tab));
    }));

    // Number keys pick answers on the question screen.
    document.addEventListener("keydown", e => {
      if (state.screen !== "questions" || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      const q = visibleQuestions()[state.qIndex];
      if (q && n >= 1 && n <= q.options.length) answer(q.id, q.options[n - 1].value);
    });
  }

  // ---------- boot ----------
  function restore() {
    $("#requirement").value = state.requirement || "";
    const qs = state.useCaseId && USE_CASES[state.useCaseId] ? visibleQuestions() : [];
    if (state.screen === "plan" && state.useCaseId && USE_CASES[state.useCaseId]) {
      buildAndShowPlan();
    } else if (state.screen === "questions" && qs.length) {
      state.qIndex = Math.min(state.qIndex, qs.length - 1);
      renderQuestion();
      show("questions");
    } else if (state.screen === "detect" && state.ranked.length) {
      renderDetect();
      show("detect");
    } else {
      show("describe");
    }
  }

  load();
  initDescribe();
  initControls();
  initTooltips();
  restore();
})();
