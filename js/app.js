/* Hello Model — UI controller. */
(function () {
  const { DATA_TYPES, USE_CASES, QUESTIONS, GLOSSARY } = window.HM_KB;
  const E = window.HM_ENGINE;
  const SHELL = window.HM_SHELL;
  const { loadPlans, planTitle, closeNav } = SHELL;
  const $ = sel => document.querySelector(sel);
  const STORE_KEY = "hello-model-state-v1";
  const BUILD_SCREENS = ["describe", "detect", "questions", "plan"];

  const freshState = () => ({ requirement: "", useCaseId: null, ranked: [], answers: {}, qIndex: 0, stepIndex: 0, checks: {}, screen: "describe", planId: null });
  let state = freshState();
  let plan = null;
  let route = "build";

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

  // ---------- saved plans ----------
  function storePlans(list) {
    SHELL.storePlans(list);
    renderRecents();
  }
  /** Create or update the saved record for the plan currently on screen. */
  function savePlanRecord() {
    if (!state.useCaseId) return;
    const list = loadPlans();
    if (!state.planId) state.planId = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const record = {
      id: state.planId, useCaseId: state.useCaseId, requirement: state.requirement,
      answers: state.answers, checks: state.checks, updatedAt: Date.now()
    };
    const i = list.findIndex(p => p.id === state.planId);
    if (i >= 0) list[i] = Object.assign(list[i], record); else list.unshift(Object.assign({ createdAt: Date.now() }, record));
    storePlans(list);
  }
  function planProgress(p) {
    const steps = E.buildPlan(p.useCaseId, p.answers, p.requirement).steps;
    const total = steps.reduce((n, s) => n + s.checklist.length, 0);
    const done = steps.reduce((n, s) => n + s.checklist.filter((_, j) => (p.checks || {})[`${s.id}:${j}`]).length, 0);
    return Math.round(done / total * 100);
  }
  function openPlan(id) {
    const p = loadPlans().find(x => x.id === id);
    if (!p) return;
    state = Object.assign(freshState(), {
      planId: p.id, useCaseId: p.useCaseId, requirement: p.requirement || "",
      answers: p.answers || {}, checks: p.checks || {}, screen: "plan"
    });
    $("#requirement").value = state.requirement;
    buildAndShowPlan();
  }
  function deletePlan(id) {
    storePlans(loadPlans().filter(p => p.id !== id));
    if (state.planId === id) state.planId = null;
    save();
    if (route === "plans") renderPlansView();
  }
  function newPlan() {
    state = freshState();
    $("#requirement").value = "";
    show("describe");
    renderRecents();
    $("#requirement").focus({ preventScroll: true });
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

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
    $("#screen-" + id).classList.remove("hidden");
    window.scrollTo({ top: 0 });
    closeNav();
    if (window.HM_ADS) window.HM_ADS.fillIn($("#screen-" + id));
  }

  /** Show one of the "Build your model" screens. */
  function show(screen) {
    state.screen = screen;
    if (route !== "build") {
      route = "build";
      if (location.hash !== "#/build") history.pushState(null, "", "#/build");
    }
    showScreen(screen);
    setActiveNav();
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
      "Forecast daily sales for each of our 40 stores"
    ];
    examples.forEach(ex => {
      const c = el("button", { class: "chip", type: "button" }, esc(ex));
      c.addEventListener("click", () => { $("#requirement").value = ex; $("#requirement").focus(); });
      chips.appendChild(c);
    });

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
      state.useCaseId = state.ranked[0].score >= E.MIN_SCORE ? state.ranked[0].id : null;
      renderDetect();
      show("detect");
    });
  }

  // ---------- screen 2: detect ----------
  /** A big choice button: icon, plain-English description, model name underneath. */
  function choiceButton(id) {
    const uc = USE_CASES[id];
    const b = el("button", { class: "choice", type: "button" },
      `<span class="choice-ic" aria-hidden="true">${uc.icon}</span><span><b>${esc(uc.question)}</b><small>${esc(uc.name)}</small></span>`);
    b.addEventListener("click", () => pickUseCase(id));
    return b;
  }

  /** "Which is closer?" — used when the description fits several model types about equally. */
  function renderChoice(main, ids, title, intro) {
    $("#detectTitle").textContent = title;
    main.classList.add("asking");
    main.innerHTML = `<div class="ask"><p class="ask-intro">${esc(intro)}</p><div class="choices"></div></div>`;
    ids.forEach(id => main.querySelector(".choices").appendChild(choiceButton(id)));
  }

  /** Nothing matched: ask what kind of data the model will work with. */
  function renderDataQuestion(main) {
    $("#detectTitle").textContent = "Let's narrow it down";
    main.classList.add("asking");
    main.innerHTML = `<div class="ask"><p class="ask-intro">We couldn't tell from your description. What will your model work with?</p><div class="choices"></div></div>`;
    const box = main.querySelector(".choices");
    DATA_TYPES.forEach(dt => {
      const b = el("button", { class: "choice", type: "button" }, `<span><b>${esc(dt.label)}</b><small>${esc(dt.hint)}</small></span>`);
      b.addEventListener("click", () => {
        if (dt.ids.length === 1) pickUseCase(dt.ids[0]);
        else renderChoice(main, dt.ids, "One more question", `${dt.label}: which is closer to what you want?`);
      });
      box.appendChild(b);
    });
  }

  function renderDetect() {
    const main = $("#detectMain");
    main.classList.remove("asking");
    $("#detectTitle").textContent = "Here's what we think you're building";
    $("#altTitle").textContent = "Not quite right? Pick another:";
    const top = state.ranked[0];
    const close = E.ambiguousTop(state.ranked);
    if (!state.useCaseId) {
      renderDataQuestion(main);
      $("#altTitle").textContent = "Or pick a model type directly:";
    } else if (close.length) {
      renderChoice(main, close, "Which is closer to what you want?",
        "Your description fits more than one kind of model. Pick the one that matches your goal:");
      $("#altTitle").textContent = "None of these? Pick another:";
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
    const shown = close.length ? close : [state.useCaseId];
    const order = state.ranked.map(r => r.id).filter(id => !shown.includes(id));
    order.forEach(id => alt.appendChild(ucCard(id, pickUseCase)));
  }

  function pickUseCase(id) {
    state.planId = null;
    state.answers = {};
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
    savePlanRecord();
    renderPlan();
    show("plan");
  }

  function renderPlan() {
    const uc = plan.useCase;
    $("#planEyebrow").textContent = `${uc.icon} ${uc.name} · ${plan.tier} approach · ${plan.infraName}`;
    $("#planTitle").textContent = "Your personalised model-building guide";
    $("#planReq").textContent = plan.requirement ? `“${plan.requirement}”` : uc.tagline;

    // Stack tab
    $("#warnings").innerHTML = plan.warnings.map(w => `<div class="warn">${esc(w)}</div>`).join("");
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
    $("#infraTitle").textContent = `All infrastructure on ${plan.infraName} (${plan.infraRows.length} services)`;
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
    // Show the key section up front; fold the rest so a step isn't overwhelming.
    const section = sec => `<h4>${esc(sec.heading)}</h4><ul>${sec.items.map(it => `<li>${rich(it)}</li>`).join("")}</ul>`;
    const [first, ...rest] = s.sections;
    if (first) html += section(first);
    if (rest.length) {
      html += `<details class="more"><summary>Show more details <span class="count">${rest.length}</span></summary>${rest.map(section).join("")}</details>`;
    }
    html += `<div class="codes"></div>`;
    html += `<div class="checklist"><h4>Checklist</h4>${s.checklist.map((c, j) =>
      `<label><input type="checkbox" data-key="${esc(s.id)}:${j}"${state.checks[`${s.id}:${j}`] ? " checked" : ""}><span>${esc(c)}</span></label>`).join("")}</div>`;
    html += `<div class="tip"><b>Tip</b> ${rich(s.tip)}</div>`;
    html += `<div class="step-nav"><button class="btn" id="prevStep"${i === 0 ? " disabled" : ""}>← Previous</button>
      ${i < plan.steps.length - 1 ? `<button class="btn primary" id="nextStep">Next: ${esc(plan.steps[i + 1].title)} →</button>`
        : `<button class="btn primary" id="finish">Finish</button>`}</div>`;
    view.innerHTML = html;

    const codes = view.querySelector(".codes");
    // Code is folded by default; open it when you're ready to type.
    (s.code || []).forEach(c => {
      const block = el("details", { class: "code-block" });
      block.appendChild(el("summary", {}, `<span class="code-tag">Code</span>${esc(c.label)}`));
      const head = el("div", { class: "code-head" });
      head.appendChild(el("span", {}, esc(c.lang)));
      const copy = el("button", { class: "btn small", type: "button" }, "Copy");
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
      savePlanRecord();
      renderStepper();
    }));
    const prev = $("#prevStep"), next = $("#nextStep"), fin = $("#finish");
    prev && prev.addEventListener("click", () => goStep(i - 1));
    next && next.addEventListener("click", () => goStep(i + 1));
    fin && fin.addEventListener("click", () => {
      fin.textContent = "Done. Export the plan to share it with your team.";
      fin.disabled = true;
    });
  }

  function copyText(text, btn, label = "Copy") {
    const done = () => { btn.textContent = "Copied ✓"; setTimeout(() => (btn.textContent = label), 1500); };
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

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
  }

  // ---------- sharing ----------
  function shareUrl(includeProgress) {
    const token = E.encodeShare(state, includeProgress);
    return location.href.split("#")[0] + "#/share/" + token;
  }
  function updateShareUrl() { $("#shareUrl").value = shareUrl($("#shareProgress").checked); }
  function openShareDialog() {
    updateShareUrl();
    $("#nativeShare").classList.toggle("hidden", !navigator.share);
    const d = $("#shareDialog");
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
    $("#shareUrl").select();
  }

  /** Open a plan from a "#/share/<token>" link and save it to My plans. */
  function importShared(token) {
    const data = E.decodeShare(token);
    route = "build";
    history.replaceState(null, "", "#/build");
    if (!data) {
      showScreen(BUILD_SCREENS.includes(state.screen) ? state.screen : "describe");
      setActiveNav();
      toast("This share link is broken or incomplete.");
      return;
    }
    // Opening the same link twice reuses the saved copy instead of creating duplicates.
    const same = loadPlans().find(p => p.useCaseId === data.useCaseId && (p.requirement || "") === data.requirement &&
      JSON.stringify(p.answers || {}) === JSON.stringify(data.answers));
    if (same) { openPlan(same.id); toast("Opened your saved copy of this shared plan."); return; }
    state = Object.assign(freshState(), data, { screen: "plan" });
    $("#requirement").value = state.requirement;
    buildAndShowPlan();
    toast("Shared plan opened and saved to My plans.");
  }

  // ---------- printable version / Save as PDF ----------
  function renderPrintView() {
    const uc = plan.useCase;
    const box = (on) => (on ? "☑" : "☐");
    let h = `<header class="pv-head"><p class="pv-brand">🧠 Hello Model · ML plan</p>
      <h1>${esc(uc.name)}</h1>${plan.requirement ? `<p class="pv-req">“${esc(plan.requirement)}”</p>` : ""}
      <p><b>Approach:</b> ${rich(plan.model.name)} (${esc(plan.tier)}) · <b>Cloud:</b> ${esc(plan.infraName)}</p>
      <p><b>Estimated cost:</b> ${esc(plan.cost)}</p></header>`;
    if (plan.warnings.length) h += `<section><h2>Heads-up</h2><ul>${plan.warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul></section>`;
    h += `<section><h2>Architecture</h2><p>${plan.architecture.map(n => `<b>${esc(n.label)}</b> (${esc(n.detail)})`).join(" → ")}</p></section>`;
    h += `<section><h2>Tech stack</h2><table>${Object.entries(plan.stack).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v.map(esc).join(", ")}</td></tr>`).join("")}</table></section>`;
    h += `<section><h2>Infrastructure</h2><table>${plan.infraRows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table></section>`;
    plan.steps.forEach((s, i) => {
      h += `<section class="pv-step"><h2>Step ${i + 1}: ${esc(s.title)}</h2>
        <p class="pv-simple">${esc(s.simple)}</p><p><b>Why it matters:</b> ${rich(s.why)}</p>
        ${s.sections.map(sec => `<h3>${esc(sec.heading)}</h3><ul>${sec.items.map(it => `<li>${rich(it)}</li>`).join("")}</ul>`).join("")}
        ${(s.code || []).map(c => `<h3>${esc(c.label)}</h3><pre>${esc(c.content)}</pre>`).join("")}
        <h3>Checklist</h3><ul class="pv-checks">${s.checklist.map((c, j) => `<li>${box(state.checks[`${s.id}:${j}`])} ${esc(c)}</li>`).join("")}</ul>
        <p class="pv-tip"><b>Tip:</b> ${rich(s.tip)}</p></section>`;
    });
    h += `<footer class="pv-foot">Made with Hello Model · ${esc(new Date().toLocaleDateString())}</footer>`;
    $("#printView").innerHTML = h;
  }
  function printPlan() {
    renderPrintView();
    window.print();
  }

  function exportMarkdown() {
    const md = E.toMarkdown(plan);
    const blob = new Blob([md], { type: "text/markdown" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `ml-plan-${plan.useCaseId}.md` });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  // ---------- global controls ----------
  function initControls() {

    document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => show(b.dataset.go)));
    $("#qBack").addEventListener("click", () => {
      if (state.qIndex > 0) { state.qIndex--; renderQuestion(); save(); }
      else if (state.ranked.length) { renderDetect(); show("detect"); }
      else show("describe");
    });
    $("#editAnswers").addEventListener("click", () => { state.qIndex = 0; renderQuestion(); show("questions"); });
    $("#exportMd").addEventListener("click", exportMarkdown);
    $("#shareBtn").addEventListener("click", openShareDialog);
    $("#pdfBtn").addEventListener("click", printPlan);
    $("#shareProgress").addEventListener("change", updateShareUrl);
    $("#copyShare").addEventListener("click", () => copyText($("#shareUrl").value, $("#copyShare"), "Copy link"));
    $("#nativeShare").addEventListener("click", () => {
      navigator.share({ title: "My ML plan — Hello Model", url: $("#shareUrl").value }).catch(() => { /* dismissed */ });
    });
    $("#restart").addEventListener("click", newPlan);
    document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("hidden", p.id !== "tab-" + t.dataset.tab));
      if (window.HM_ADS) window.HM_ADS.fillIn($("#tab-" + t.dataset.tab));
    }));

    // Number keys pick answers on the question screen.
    document.addEventListener("keydown", e => {
      if (route !== "build" || state.screen !== "questions" || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      const q = visibleQuestions()[state.qIndex];
      if (q && n >= 1 && n <= q.options.length) answer(q.id, q.options[n - 1].value);
    });
  }

  // ---------- app shell: sidebar + routing ----------
  function setActiveNav() {
    const top = route.split("/")[0];
    document.querySelectorAll(".side-nav a").forEach(a => {
      const on = a.dataset.route === top;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.querySelectorAll("#recents a").forEach(a =>
      a.classList.toggle("active", route === "build" && state.screen === "plan" && a.dataset.id === state.planId));
  }

  function renderRecents() {
    SHELL.renderRecents();
    setActiveNav();
  }

  // The Learn pages used to live at these app routes; old links go to the real pages now.
  const MOVED = { models: "/models/", training: "/training/", clouds: "/clouds/", glossary: "/glossary/", privacy: "/privacy/" };

  /** Leave the current route for the plan builder, without a history entry for the old route. */
  function enterBuild() {
    route = "build";
    history.replaceState(null, "", "#/build");
  }

  function handleRoute() {
    const r = (location.hash || "#/build").replace(/^#\/?/, "") || "build";
    route = r;
    const [name, arg] = r.split("/");
    if (MOVED[name]) { location.replace(MOVED[name] + (name === "models" && USE_CASES[arg] ? arg + "/" : "")); return; }
    if (name === "plans") { renderPlansView(); showScreen("plans"); }
    else if (name === "share") { importShared(arg); return; }
    else if (name === "new") { enterBuild(); newPlan(); }
    else if (name === "open" && loadPlans().some(p => p.id === arg)) { enterBuild(); openPlan(arg); }
    else if (name === "start" && USE_CASES[arg]) { enterBuild(); state = freshState(); $("#requirement").value = ""; pickUseCase(arg); }
    else {
      if (name !== "build") enterBuild();
      route = "build";
      showScreen(BUILD_SCREENS.includes(state.screen) ? state.screen : "describe");
    }
    setActiveNav();
  }

  // ---------- views: my plans ----------
  function renderPlansView() {
    const list = loadPlans().sort((a, b) => b.updatedAt - a.updatedAt);
    const box = $("#plansList");
    if (!list.length) {
      box.innerHTML = `<div class="card empty"><p>No plans yet.</p><button class="btn primary" id="emptyNew">Create your first plan →</button></div>`;
      $("#emptyNew").addEventListener("click", newPlan);
      return;
    }
    box.innerHTML = list.map(p => {
      const uc = USE_CASES[p.useCaseId];
      const pct = planProgress(p);
      return `<div class="card plan-card">
        <div class="plan-card-ic" aria-hidden="true">${uc.icon}</div>
        <div class="plan-card-body">
          <b>${esc(planTitle(p))}</b>
          <span class="muted">${esc(uc.name)} · updated ${new Date(p.updatedAt).toLocaleDateString()}</span>
          <div class="mini-progress" aria-label="${pct}% complete"><div style="width:${pct}%"></div></div>
        </div>
        <div class="plan-card-actions">
          <button class="btn small primary" data-open="${esc(p.id)}">Open</button>
          <button class="link" data-del="${esc(p.id)}">Delete</button>
        </div>
      </div>`;
    }).join("");
    box.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => openPlan(b.dataset.open)));
    box.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      if (confirm("Delete this plan? This can't be undone.")) deletePlan(b.dataset.del);
    }));
  }

  // ---------- boot ----------
  function restoreBuild() {
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
  SHELL.init({ onNewPlan: newPlan, onOpenPlan: openPlan });
  restoreBuild();
  handleRoute();
  window.addEventListener("hashchange", handleRoute);
})();
