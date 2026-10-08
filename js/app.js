/* Hello Model — UI controller. */
(function () {
  const { DATA_TYPES, EXAMPLE_PLAN, STACK_WHY, USE_CASES, QUESTIONS, GLOSSARY } = window.HM_KB;
  const E = window.HM_ENGINE;
  const SHELL = window.HM_SHELL;
  const { loadPlans, planTitle, closeNav } = SHELL;
  const $ = sel => document.querySelector(sel);
  const STORE_KEY = "hello-model-state-v1";
  const BUILD_SCREENS = ["describe", "detect", "questions", "plan"];

  const freshState = () => ({ requirement: "", useCaseId: null, ranked: [], answers: {}, qIndex: 0, stepIndex: 0, checks: {}, screen: "describe", planId: null, example: false });

  // The example plan isn’t saved to My plans unless they edit its answers and make it their own.
  const EXAMPLE = EXAMPLE_PLAN;
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
    if (!state.useCaseId || state.example) return;
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
  /** How far along a saved plan is: tasks and whole steps done. */
  function planStats(p) {
    const steps = E.buildPlan(p.useCaseId, p.answers, p.requirement).steps;
    const ticked = s => s.checklist.filter((_, j) => (p.checks || {})[`${s.id}:${j}`]).length;
    const total = steps.reduce((n, s) => n + s.checklist.length, 0);
    const done = steps.reduce((n, s) => n + ticked(s), 0);
    return { pct: Math.round(done / total * 100), steps: steps.length, stepsDone: steps.filter(s => ticked(s) === s.checklist.length).length };
  }

  /** "Updated today", "yesterday", "3 days ago", or a date. */
  function whenUpdated(ts) {
    const day = 864e5, start = new Date(); start.setHours(0, 0, 0, 0);
    const days = Math.floor((start - new Date(ts).setHours(0, 0, 0, 0)) / day);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    return "on " + new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: new Date(ts).getFullYear() === start.getFullYear() ? undefined : "numeric" });
  }
  const stepsLine = st => st.stepsDone ? `${st.stepsDone} of ${st.steps} steps complete` : st.pct ? `${st.pct}% of tasks done` : "Not started";
  function openPlan(id) {
    const p = loadPlans().find(x => x.id === id);
    if (!p) return;
    state = Object.assign(freshState(), {
      planId: p.id, useCaseId: p.useCaseId, requirement: p.requirement || "",
      answers: p.answers || {}, checks: p.checks || {}, screen: "plan"
    });
    setRequirement(state.requirement);
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
    setRequirement("");
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
    delete document.documentElement.dataset.boot; // the app has taken over from the first-paint guess
    const screen = $("#screen-" + id), changed = screen.classList.contains("hidden");
    document.querySelectorAll(".screen").forEach(s => { s.classList.add("hidden"); s.classList.remove("entering"); });
    screen.classList.remove("hidden");
    // Animate only real screen changes after the first paint, never the page that's already showing.
    if (changed && document.documentElement.classList.contains("ready")) {
      screen.classList.add("entering");
      // Tell keyboard and screen-reader users the screen changed: focus its answer options or its heading.
      const target = id === "questions" ? screen.querySelector(".q-opt.selected, .q-opt") : screen.querySelector("h1");
      if (target) {
        if (target.tagName === "H1") target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    }
    window.scrollTo({ top: 0 });
    closeNav();
    if (window.HM_ADS) window.HM_ADS.fillIn($("#screen-" + id));
    if (id === "describe") renderContinue();
  }

  /** Home, for returning visitors: pick up the most recent plan in one click. */
  function renderContinue() {
    const slot = $("#continueSlot");
    const list = loadPlans().sort((a, b) => b.updatedAt - a.updatedAt);
    if (!list.length) { slot.innerHTML = ""; return; }
    const p = list[0], uc = USE_CASES[p.useCaseId], st = planStats(p);
    slot.innerHTML = `<section class="continue card" aria-label="Continue where you left off">
        <div class="continue-ic" aria-hidden="true">${HM_ICONS.svg(uc.icon, 24)}</div>
        <div class="continue-body">
          <p class="eyebrow">Continue where you left off</p>
          <p class="continue-title">${esc(planTitle(p))}</p>
          <p class="continue-meta">${esc(uc.name)} · ${esc(stepsLine(st))} · Updated ${esc(whenUpdated(p.updatedAt))}</p>
          <div class="mini-progress" aria-hidden="true"><div style="width:${st.pct}%"></div></div>
        </div>
        <div class="continue-actions">
          <button type="button" class="btn primary" id="continueBtn">Open plan</button>
          ${list.length > 1 ? `<a class="link" href="#/plans">All plans (${list.length})</a>` : ""}
        </div>
      </section>`;
    $("#continueBtn").addEventListener("click", () => openPlan(p.id));
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
      `<div class="ic" aria-hidden="true">${HM_ICONS.svg(uc.icon, 26)}</div><b>${esc(uc.name)}</b><span>${esc(uc.tagline)}</span>`);
    b.addEventListener("click", () => onClick(id));
    return b;
  }

  function initDescribe() {
    // The example chips are in index.html so they are there at first paint (no layout shift).
    document.querySelectorAll("#exampleChips .chip").forEach(c => {
      c.addEventListener("click", () => { setRequirement(c.textContent); $("#requirement").focus(); });
    });
    let timer = null;
    $("#requirement").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(liveHint, 300); });

    $("#describeForm").addEventListener("submit", e => {
      e.preventDefault();
      const text = $("#requirement").value.trim();
      if (text.length < 8) {
        $("#requirement").focus();
        $("#requirement").setAttribute("placeholder", "Describe your idea in a sentence or two.");
        return;
      }
      state.requirement = text;
      state.ranked = E.classify(text);
      state.useCaseId = state.ranked[0].score >= E.MIN_SCORE ? state.ranked[0].id : null;
      renderDetect();
      show("detect");
    });
  }

  function setRequirement(text) { $("#requirement").value = text; liveHint(); }

  /** While they type: what kind of model this sounds like, so they know they’re on the right track. */
  function liveHint() {
    const text = $("#requirement").value.trim();
    const hint = $("#liveHint");
    if (text.split(/\s+/).length < 4) { hint.innerHTML = ""; return; }
    const ranked = E.classify(text);
    const close = E.ambiguousTop(ranked);
    if (ranked[0].score < E.MIN_SCORE) {
      hint.innerHTML = "Add what data you have, such as photos, sales records or emails, to get a clearer match.";
    } else if (close.length) {
      hint.innerHTML = `Could be ${close.slice(0, 2).map(id => `<b>${esc(USE_CASES[id].name)}</b>`).join(" or ")}. You’ll choose next.`;
    } else {
      const uc = USE_CASES[ranked[0].id];
      hint.innerHTML = `${HM_ICONS.svg(uc.icon, 18)}<span>Likely model type: <b>${esc(uc.name)}</b></span>`;
    }
  }

  // ---------- screen 2: detect ----------
  /** A big choice button: icon, plain-English description, model name underneath. */
  function choiceButton(id) {
    const uc = USE_CASES[id];
    const b = el("button", { class: "choice", type: "button" },
      `<span class="choice-ic" aria-hidden="true">${HM_ICONS.svg(uc.icon)}</span><span><b>${esc(uc.question)}</b><small>${esc(uc.name)}</small></span>`);
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
    $("#detectTitle").textContent = "What will your model work with?";
    main.classList.add("asking");
    main.innerHTML = `<div class="ask"><p class="ask-intro">Your description didn’t point to one model type. Choose the kind of data you have.</p><div class="choices"></div></div>`;
    const box = main.querySelector(".choices");
    DATA_TYPES.forEach(dt => {
      const b = el("button", { class: "choice", type: "button" }, `<span><b>${esc(dt.label)}</b><small>${esc(dt.hint)}</small></span>`);
      b.addEventListener("click", () => {
        if (dt.ids.length === 1) pickUseCase(dt.ids[0]);
        else renderChoice(main, dt.ids, "One more question", `${dt.label}: which is closest to your goal?`);
      });
      box.appendChild(b);
    });
  }

  function renderDetect() {
    const main = $("#detectMain");
    main.classList.remove("asking");
    $("#detectTitle").textContent = "Recommended model type";
    $("#altTitle").textContent = "Or choose a different model type";
    const top = state.ranked[0];
    const close = E.ambiguousTop(state.ranked);
    if (!state.useCaseId) {
      renderDataQuestion(main);
      $("#altTitle").textContent = "Or choose a model type";
    } else if (close.length) {
      renderChoice(main, close, "Which is closer to what you want?",
        "Your description fits more than one model type. Choose the one closest to your goal.");
      $("#altTitle").textContent = "None of these? Choose another model type";
    } else {
      const uc = USE_CASES[state.useCaseId];
      // Say how sure we are in words; a percentage suggests more precision than keyword matching has.
      const strength = top.confidence >= 0.8 ? "Strong match" : top.confidence >= 0.5 ? "Likely match" : "Possible match";
      main.innerHTML = `<div class="big-ic" aria-hidden="true">${HM_ICONS.svg(uc.icon, 32)}</div>
        <div>
          <span class="conf">${strength}</span>
          <h2 class="uc-name">${esc(uc.name)}</h2>
          <p>${esc(uc.tagline)}</p>
          <p class="matched">Based on: ${top.matched.map(m => `<code>${esc(m)}</code>`).join(" ")}</p>
          <p class="matched">Similar projects: ${uc.examples.map(esc).join(" · ")}</p>
          <div class="row-end" style="justify-content:flex-start"><button class="btn primary" id="confirmUc">Use this model type</button></div>
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

  const SECONDS_PER_QUESTION = 15;

  /** One segment per question: answered ones filled, the current one highlighted. */
  function paintProgress(total, current) {
    const ol = $("#qSteps");
    if (ol.children.length !== total) ol.innerHTML = "<li></li>".repeat(total);
    [...ol.children].forEach((li, i) => { li.className = i < current ? "done" : i === current ? "current" : ""; });
  }

  function renderQuestion() {
    const qs = visibleQuestions();
    const q = qs[state.qIndex];
    paintProgress(qs.length, state.qIndex);
    $("#qCount").textContent = `Question ${state.qIndex + 1} of ${qs.length} · ${USE_CASES[state.useCaseId].name}`;
    const left = qs.length - state.qIndex;
    $("#qLeft").textContent = left === 1 ? "Last question" : (m => `About ${m} ${m === 1 ? "minute" : "minutes"} left`)(Math.max(1, Math.round(left * SECONDS_PER_QUESTION / 60)));
    const card = $("#qCard");
    card.innerHTML = `<h1 class="screen-title q-title">${esc(q.title)}</h1><p class="muted">${esc(q.help)}</p><div class="q-options" role="radiogroup" aria-label="${esc(q.title)}"></div>`;
    const wrap = card.querySelector(".q-options");
    q.options.forEach((o, i) => {
      const selected = state.answers[q.id] === o.value;
      const b = el("button", { class: "q-opt" + (selected ? " selected" : ""), type: "button", role: "radio", "aria-checked": String(selected) },
        `<b><kbd>${i + 1}</kbd>${esc(o.label)}</b><span>${esc(o.hint)}</span>`);
      b.addEventListener("click", () => answer(q.id, o.value));
      wrap.appendChild(b);
    });
    // Jargon in the answers is explained here, not in tooltips: a button can’t hold another focusable element.
    if (q.terms && q.terms.length) {
      const words = el("details", { class: "q-words" });
      words.innerHTML = `<summary>What do these words mean?</summary><dl>${q.terms.map(t =>
        `<div><dt>${esc(t[0].toUpperCase() + t.slice(1))}</dt><dd>${esc(GLOSSARY[t])}</dd></div>`).join("")}</dl>`;
      card.appendChild(words);
    }
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
        window.scrollTo({ top: 0 }); // each question starts at the top, with Back and the progress bar in view
        save();
      } else {
        paintProgress(qs.length, qs.length);
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

  function showExample() {
    state = Object.assign(freshState(), EXAMPLE, { answers: { ...EXAMPLE.answers }, example: true, screen: "plan" });
    setRequirement("");
    buildAndShowPlan();
  }

  function renderPlan(keepAnswers) {
    const uc = plan.useCase;
    $("#exampleBanner").classList.toggle("hidden", !state.example);
    $("#planEyebrow").innerHTML = `${HM_ICONS.svg(uc.icon, 16)} ${esc(plan.tier[0].toUpperCase() + plan.tier.slice(1))} approach · ${esc(plan.infraName)}`;
    $("#planTitle").textContent = `Your ${E.inSentence(uc.name)} plan`;
    $("#planReq").textContent = plan.requirement ? `“${plan.requirement}”` : uc.tagline;

    // At a glance: the answer first, details below.
    $("#sumModel").innerHTML = rich(plan.model.name);
    $("#sumWhy").innerHTML = rich(E.explainTerms(plan.model.why));
    $("#sumCost").textContent = plan.cost;
    $("#sumGpu").textContent = plan.gpu ? "Yes, for training, serving or both. See Tech stack and infrastructure." : "No. CPUs (or a hosted API) are enough.";
    const why = E.explainPlan(plan), list = items => items.map(x => `<li>${esc(x)}</li>`).join("");
    $("#whyApproach").innerHTML = list(why.approach) +
      `<li><button type="button" class="link" data-open-compare>Compare the three approaches</button> to see what would change it.</li>`;
    $("#whyApproach [data-open-compare]").addEventListener("click", () => openPanel("compare"));
    $("#whyCost").innerHTML = list(why.cost);
    $("#whyGpu").innerHTML = list(why.gpu);
    renderConfidence();
    renderCompare();
    if (!keepAnswers) renderAnswers();
    $("#firstSteps").innerHTML = plan.steps.slice(0, 3).map((s, i) =>
      `<li><button type="button" class="link step-link" data-step="${i}"><b>${esc(s.title)}</b></button><span class="muted">${esc(s.simple)}</span></li>`).join("");
    $("#firstSteps").querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => {
      showTab("guide");
      goStep(+b.dataset.step);
      $("#stepView").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    $("#assumed").innerHTML = plan.assumed.length ? `<div class="assumed"><b>You answered “Not sure” to ${plan.assumed.length === 1 ? "1 question" : plan.assumed.length + " questions"}, so we assumed:</b>
      <ul>${plan.assumed.map(x => `<li>${esc(x.question)} <b>${esc(x.label)}</b></li>`).join("")}</ul>
      <button type="button" class="link" id="changeAssumed">Change these answers</button></div>` : "";
    if (plan.assumed.length) $("#changeAssumed").addEventListener("click", () => openPanel("answers", plan.assumed[0].id));
    $("#warnings").innerHTML = plan.warnings.map(w => `<div class="warn">${esc(w)}</div>`).join("");
    drawArchitecture();
    $("#stack").innerHTML = Object.entries(plan.stack).map(([k, v]) =>
      `<div class="stack-row"><div><b>${esc(k)}</b>${STACK_WHY[k] ? `<small>${esc(STACK_WHY[k])}</small>` : ""}</div>
        <div class="pills">${v.map(x => `<span class="pill">${esc(x)}</span>`).join("")}</div></div>`).join("");
    $("#infraTitle").textContent = `All infrastructure on ${plan.infraName} (${plan.infraRows.length} services)`;
    $("#infra").innerHTML = `<thead><tr><th>Component</th><th>Recommended service</th></tr></thead><tbody>` +
      plan.infraRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("") + "</tbody>";

    renderStepper();
    renderStep();
  }

  /** The architecture diagram is drawn for the width it has, and redrawn when that changes. */
  let archWidth = 0;
  function drawArchitecture() {
    const box = $("#arch");
    const width = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) * 2;
    if (!plan || width <= 0) return; // hidden tab: drawn when it’s shown
    archWidth = width;
    const lanes = plan.useCaseId === "llm-rag" ? ["Prepare your documents", "Answer questions"] : ["Build the model", "Put it to work"];
    box.innerHTML = HM_DIAGRAM.render(plan.architecture, width, { lanes }) +
      `<p class="diagram-note">The dashed line is the feedback loop: monitoring tells you when to retrain.</p>`;
  }
  if (window.ResizeObserver) {
    new ResizeObserver(() => { if (Math.abs($("#arch").clientWidth - archWidth) > 40 || !archWidth) drawArchitecture(); }).observe(document.querySelector("#arch"));
  }

  /** How sure the plan is that it fits, and why: never a promise about the model’s accuracy. */
  function renderConfidence() {
    const c = E.confidence(plan);
    const box = $("#confidence");
    box.className = "confidence conf-" + c.level;
    box.innerHTML = `<p><span class="conf-badge">${HM_ICONS.svg(c.level === "high" ? "check" : "info", 14)} ${esc(c.label)} confidence</span> ${esc(c.summary)}</p>
      <details class="why-this"><summary>What this means</summary><ul>${c.reasons.map(r => `<li>${esc(r)}</li>`).join("")}
        <li>This rates how well the plan fits what you told us. It doesn’t predict how accurate your model will be: the baseline in step 5 and the evaluation in step 7 tell you that.</li></ul>
        ${c.reasons.length ? `<button type="button" class="link" data-open-answers>Review your answers</button>` : ""}</details>`;
    const b = box.querySelector("[data-open-answers]");
    if (b) b.addEventListener("click", () => openPanel("answers", plan.assumed[0] && plan.assumed[0].id));
  }

  /** The three approaches for the same answers, side by side. */
  function renderCompare() {
    const tierName = t => t[0].toUpperCase() + t.slice(1);
    $("#compareGrid").innerHTML = E.compareApproaches(plan).map(x => `<article class="cmp${x.recommended ? " cmp-pick" : ""}">
        <p class="cmp-tier">${esc(tierName(x.tier))}${x.recommended ? ` <span class="cmp-badge">Recommended for you</span>` : ""}</p>
        <h3>${rich(x.name)}</h3>
        <p>${rich(E.explainTerms(x.why))}</p>
        <dl>
          <div><dt>Best when</dt><dd>${esc(x.fits)}</dd></div>
          <div><dt>GPU</dt><dd>${x.gpu ? "Needed" : "Not needed"}</dd></div>
          <div><dt>Running cost</dt><dd>${esc(x.cost)}</dd></div>
          <div><dt>Main tools</dt><dd>${x.libs.map(esc).join(", ")}</dd></div>
        </dl></article>`).join("");
  }

  /** Every answer as a menu: changing one rebuilds the plan in place. */
  function renderAnswers() {
    $("#answersGrid").innerHTML = visibleQuestions().map(q => {
      const cur = state.answers[q.id] || plan.answers[q.id];
      return `<div class="ans-row"><label for="ans-${q.id}">${esc(q.title)}</label>
        <select id="ans-${q.id}" data-q="${q.id}">${q.options.map(o => `<option value="${esc(o.value)}"${o.value === cur ? " selected" : ""}>${esc(o.label)}</option>`).join("")}</select>
        <small class="muted ans-note" id="ans-note-${q.id}"></small></div>`;
    }).join("");
    $("#answersGrid").querySelectorAll("select").forEach(sel => {
      sel.setAttribute("aria-describedby", "ans-note-" + sel.dataset.q);
      sel.addEventListener("change", () => changeAnswer(sel.dataset.q, sel.value));
    });
    paintAnswerNotes();
  }
  function paintAnswerNotes() {
    visibleQuestions().forEach(q => {
      const a = plan.assumed.find(x => x.id === q.id);
      const note = $("#ans-note-" + q.id);
      if (note) note.textContent = a ? `Assumed: ${a.label}` : "";
    });
  }

  function changeAnswer(qid, value) {
    const before = plan, wasExample = state.example;
    state.answers[qid] = value;
    state.example = false; // changing the example’s answers makes it the visitor’s own plan
    plan = E.buildPlan(state.useCaseId, state.answers, state.requirement);
    save();
    savePlanRecord();
    renderPlan(true);
    paintAnswerNotes();
    const changes = [];
    if (before.model.name !== plan.model.name) changes.push(`the recommended approach is now ${plan.tier}`);
    if (before.cost !== plan.cost) changes.push(`the cost is now ${plan.cost.split(" — ")[0].replace(/^≈ /, "")}`);
    if (before.gpu !== plan.gpu) changes.push(plan.gpu ? "it now needs a GPU" : "it no longer needs a GPU");
    if (before.infraName !== plan.infraName) changes.push(`it now uses ${plan.infraName}`);
    const what = changes.length ? `Plan updated: ${changes.join(", ")}.` : "Plan updated. The approach, cost and GPU stay the same.";
    toast(wasExample ? `${what} Saved to My plans.` : what);
  }

  /** The answers and compare panels open under the overview; one at a time. */
  function openPanel(name, focusQ) {
    ["answers", "compare"].forEach(n => {
      const on = n === name;
      $(`#${n}Panel`).classList.toggle("hidden", !on);
      $(`#${n}Btn`).setAttribute("aria-expanded", String(on));
    });
    const panel = $(`#${name}Panel`);
    panel.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    // Focus the answer asked for, or else the panel's heading, so screen readers start at the top of it.
    const target = name === "answers" && focusQ && $("#ans-" + focusQ);
    const heading = panel.querySelector("h2");
    heading.setAttribute("tabindex", "-1");
    (target || heading).focus({ preventScroll: true });
  }
  function closePanel(name) {
    $(`#${name}Panel`).classList.add("hidden");
    $(`#${name}Btn`).setAttribute("aria-expanded", "false");
    $(`#${name}Btn`).focus();
  }
  const togglePanel = name => ($(`#${name}Panel`).classList.contains("hidden") ? openPanel(name) : closePanel(name));

  function showTab(name) {
    document.querySelectorAll(".tab").forEach(x => {
      const on = x.dataset.tab === name;
      x.classList.toggle("active", on);
      x.setAttribute("aria-selected", on);
      x.tabIndex = on ? 0 : -1; // arrow keys move between tabs; Tab moves into the panel
    });
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("hidden", p.id !== "tab-" + name));
    if (name === "stack") drawArchitecture();
    if (window.HM_ADS) window.HM_ADS.fillIn($("#tab-" + name));
  }

  function editAnswers() {
    state.example = false; // changing the example’s answers makes it the visitor’s own plan
    state.qIndex = 0;
    renderQuestion();
    show("questions");
  }

  function stepDone(i) {
    const s = plan.steps[i];
    return s.checklist.every((_, j) => state.checks[`${s.id}:${j}`]);
  }

  const stepsDoneCount = () => plan.steps.filter((_, i) => stepDone(i)).length;

  function updateProgress() {
    const total = plan.steps.reduce((n, s) => n + s.checklist.length, 0);
    const done = plan.steps.reduce((n, s) => n + s.checklist.filter((_, j) => state.checks[`${s.id}:${j}`]).length, 0);
    const steps = stepsDoneCount(), n = plan.steps.length;
    // "0/30 tasks" is daunting on a brand-new plan; show the steps until something is ticked.
    $("#overallPct").textContent = done ? `${steps} of ${n} steps complete · ${done} of ${total} tasks` : `Not started · ${n} steps`;
    const ol = $("#overallSteps");
    if (ol.children.length !== n) ol.innerHTML = "<li></li>".repeat(n);
    [...ol.children].forEach((li, i) => { li.className = stepDone(i) ? "done" : i === state.stepIndex ? "current" : ""; });
    const left = plan.steps.reduce((h, s, i) => h + (stepDone(i) ? 0 : s.hours), 0);
    $("#overallTime").innerHTML = steps === n
      ? `${HM_ICONS.svg("check", 16)} All ${n} steps complete.`
      : `${HM_ICONS.svg("clock", 16)} About ${esc(E.formatHours(left).replace(/^about /, ""))} of focused work${done ? " left" : ""} <span class="muted">(estimate)</span>`;
  }

  function renderStepper() {
    const ol = $("#stepper");
    ol.innerHTML = "";
    plan.steps.forEach((s, i) => {
      const li = el("li", { class: (i === state.stepIndex ? "active " : "") + (stepDone(i) ? "done" : "") });
      const b = el("button", { type: "button", "aria-current": i === state.stepIndex ? "step" : "false" },
        `<span class="dot">${stepDone(i) ? HM_ICONS.svg("check", 14) : i + 1}</span><span class="t">${esc(s.title)}<small>${stepDone(i) ? "Done" : esc(E.formatHours(s.hours))}</small></span>`);
      b.addEventListener("click", () => { toggleSteps(false); goStep(i); });
      li.appendChild(b);
      ol.appendChild(li);
    });
    const cur = plan.steps[state.stepIndex];
    $("#stepBarText").innerHTML = `<b>Step ${state.stepIndex + 1} of ${plan.steps.length}</b> ${esc(cur.title)}`;
    updateProgress();
  }

  /** Phones: the step bar opens and closes the list of all steps. */
  let stepsOpenedAt = 0;
  function toggleSteps(open) {
    const list = $("#stepper");
    if (open) {
      stepsOpenedAt = window.scrollY;
      // Drop the list down right under the bar, wherever the bar is on screen.
      const bar = $("#stepsToggle").getBoundingClientRect();
      list.style.top = bar.bottom + 4 + "px";
      list.style.maxHeight = Math.max(200, window.innerHeight - bar.bottom - 16) + "px";
    }
    $("#guide").classList.toggle("steps-open", open);
    $("#stepsToggle").setAttribute("aria-expanded", String(open));
  }

  function goStep(i) {
    state.stepIndex = Math.max(0, Math.min(plan.steps.length - 1, i));
    renderStepper();
    renderStep();
    const v = $("#stepView");
    v.classList.remove("entering");
    void v.offsetWidth; // restart the animation
    v.classList.add("entering");
    save();
    const view = $("#stepView");
    if (view.getBoundingClientRect().top < 60) view.scrollIntoView({ behavior: "smooth", block: "start" });
    view.focus({ preventScroll: true });
  }

  function renderStep() {
    const i = state.stepIndex;
    const s = plan.steps[i];
    const view = $("#stepView");
    // Everyday tech words get a tooltip the first time they appear in this step.
    const seen = new Set(), explained = text => rich(E.explainTerms(text, seen));
    view.classList.toggle("is-done", stepDone(i));
    let html = `<div class="step-meta"><p class="eyebrow">Step ${i + 1} of ${plan.steps.length}</p>
      <span class="time-chip">${HM_ICONS.svg("clock", 14)} ${esc(E.formatHours(s.hours))}</span>
      <span class="done-chip">${HM_ICONS.svg("check", 14)} Done</span></div><h2 id="stepTitle">${esc(s.title)}</h2>
      <div class="simple"><b>In plain words:</b> ${esc(s.simple)}</div>
      <p class="why"><b>Why it matters:</b> ${explained(s.why)}</p>`;
    // Show the key section up front; fold the rest so a step isn’t overwhelming.
    const section = sec => `<h3>${esc(sec.heading)}</h3><ul>${sec.items.map(it => `<li>${explained(it)}</li>`).join("")}</ul>`;
    const [first, ...rest] = s.sections;
    if (first) html += section(first);
    if (rest.length) {
      html += `<details class="more"><summary>Show more details <span class="count">${rest.length}</span></summary>${rest.map(section).join("")}</details>`;
    }
    html += `<div class="codes"></div>`;
    html += `<div class="checklist"><h3>Checklist <span class="muted check-count"></span></h3>${s.checklist.map((c, j) =>
      `<label><input type="checkbox" data-key="${esc(s.id)}:${j}"${state.checks[`${s.id}:${j}`] ? " checked" : ""}><span>${esc(c)}</span></label>`).join("")}</div>`;
    html += `<div class="tip"><b>Tip</b> ${explained(s.tip)}</div>`;
    html += `<div class="step-nav"><button class="btn" id="prevStep"${i === 0 ? " disabled" : ""}>← Previous</button>
      ${i < plan.steps.length - 1 ? `<button class="btn primary" id="nextStep">Next: ${esc(plan.steps[i + 1].title)} →</button>`
        : `<button class="btn primary" id="finish">Share this plan</button>`}</div>`;
    view.innerHTML = html;

    const codes = view.querySelector(".codes");
    // Code is folded by default; open it when you’re ready to type.
    (s.code || []).forEach(c => {
      const block = el("details", { class: "code-block" });
      block.appendChild(el("summary", {}, `<span class="code-tag">Code</span>${esc(c.label)}`));
      const head = el("div", { class: "code-head" });
      head.appendChild(el("span", {}, esc(c.lang)));
      const copy = el("button", { class: "btn small", type: "button" }, "Copy");
      copy.addEventListener("click", () => copyText(c.content, copy));
      head.appendChild(copy);
      const pre = el("pre", { tabindex: "0", "aria-label": c.label });
      const code = el("code");
      code.textContent = c.content;
      pre.appendChild(code);
      block.appendChild(head);
      block.appendChild(pre);
      codes.appendChild(block);
    });

    const countTicks = () => {
      const n = s.checklist.filter((_, j) => state.checks[`${s.id}:${j}`]).length;
      view.querySelector(".check-count").textContent = `${n} of ${s.checklist.length}`;
    };
    countTicks();
    view.querySelectorAll(".checklist input").forEach(cb => cb.addEventListener("change", () => {
      const wasDone = stepDone(i), before = stepsDoneCount();
      state.checks[cb.dataset.key] = cb.checked;
      save();
      savePlanRecord();
      renderStepper();
      countTicks();
      view.classList.toggle("is-done", stepDone(i));
      if (!wasDone && stepDone(i)) celebrate(i, before, stepsDoneCount());
    }));
    const prev = $("#prevStep"), next = $("#nextStep"), fin = $("#finish");
    prev && prev.addEventListener("click", () => goStep(i - 1));
    next && next.addEventListener("click", () => goStep(i + 1));
    fin && fin.addEventListener("click", openShareDialog);
  }

  /** Ticking off a step’s last task: say so, and mark milestones. */
  function celebrate(i, before, after) {
    const li = $("#stepper").children[i];
    if (li) li.classList.add("just-done");
    const n = plan.steps.length, half = Math.ceil(n / 2);
    if (after === n) toast(`All ${n} steps complete.`);
    else if (before < half && after >= half) toast(`Step ${i + 1} complete. You’re halfway through the plan.`);
    else toast(`Step ${i + 1} complete. ${n - after} remaining.`);
  }

  function copyText(text, btn, label = "Copy") {
    const done = () => { btn.textContent = "Copied"; setTimeout(() => (btn.textContent = label), 1500); };
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
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { /* blocked */ }
    ta.remove();
    if (ok) { done(); return; }
    // The browser blocked copying. In the share dialog, select the link so one keypress copies it.
    const inDialog = $("#shareDialog").open;
    if (inDialog) { $("#shareUrl").select(); $("#copyShare").textContent = "Press Ctrl+C to copy"; }
    else toast("Couldn’t copy automatically. Select the text and press Ctrl+C (or ⌘C) to copy it.");
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    // Long messages stay up longer: about 1 second per 15 characters, at least 3.5 seconds.
    toastTimer = setTimeout(() => t.classList.remove("show"), Math.max(3500, msg.length * 66));
  }

  // ---------- sharing ----------
  function shareUrl(includeProgress) {
    const token = E.encodeShare(state, includeProgress);
    return location.href.split("#")[0] + "#/share/" + token;
  }
  function updateShareUrl() { $("#shareUrl").value = shareUrl($("#shareProgress").checked); }
  function openShareDialog() {
    updateShareUrl();
    $("#copyShare").textContent = "Copy link";
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
      toast("This share link is incomplete. Ask the sender to copy it again.");
      return;
    }
    // Opening the same link twice reuses the saved copy instead of creating duplicates.
    const same = loadPlans().find(p => p.useCaseId === data.useCaseId && (p.requirement || "") === data.requirement &&
      JSON.stringify(p.answers || {}) === JSON.stringify(data.answers));
    if (same) { openPlan(same.id); toast("Opened your saved copy of this shared plan."); return; }
    state = Object.assign(freshState(), data, { screen: "plan" });
    setRequirement(state.requirement);
    buildAndShowPlan();
    toast("Shared plan opened and saved to My plans.");
  }

  // ---------- printable version / Save as PDF ----------
  function renderPrintView() {
    const uc = plan.useCase;
    const box = (on) => (on ? "☑" : "☐");
    let h = `<header class="pv-head"><p class="pv-brand">Hello Model · Machine learning plan</p>
      <h1>${esc(uc.name)}</h1>${plan.requirement ? `<p class="pv-req">“${esc(plan.requirement)}”</p>` : ""}
      <p><b>Approach:</b> ${rich(plan.model.name)} (${esc(plan.tier)}) · <b>Cloud:</b> ${esc(plan.infraName)}</p>
      <p><b>Estimated cost:</b> ${esc(plan.cost)}</p></header>`;
    const why = E.explainPlan(plan), conf = E.confidence(plan);
    h += `<section><h2>Why this plan</h2><p><b>Confidence:</b> ${esc(conf.label)}. ${esc(conf.summary)}</p>
      <ul>${why.approach.concat(why.gpu, why.cost, conf.reasons).map(r => `<li>${esc(r)}</li>`).join("")}</ul></section>`;
    if (plan.assumed.length) h += `<section><h2>Assumptions (you answered “Not sure”)</h2><ul>${plan.assumed.map(x => `<li>${esc(x.question)} <b>${esc(x.label)}</b></li>`).join("")}</ul></section>`;
    if (plan.warnings.length) h += `<section><h2>Watch out for</h2><ul>${plan.warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul></section>`;
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
    $("#editAnswers").addEventListener("click", editAnswers);
    $("#answersBtn").addEventListener("click", () => togglePanel("answers"));
    $("#compareBtn").addEventListener("click", () => togglePanel("compare"));
    document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closePanel(b.dataset.close)));
    $("#keysBtn").addEventListener("click", openKeys);
    $("#exportMd").addEventListener("click", exportMarkdown);
    $("#shareBtn").addEventListener("click", openShareDialog);
    // My plans: search and sort (the sort is remembered in this browser)
    const savedSort = SHELL.pref("hm-plans-sort");
    if (savedSort && SORTS[savedSort]) $("#plansSort").value = savedSort;
    $("#plansSearch").addEventListener("input", e => { plansQuery = e.target.value; renderPlansView(); });
    $("#plansSort").addEventListener("change", e => { SHELL.pref("hm-plans-sort", e.target.value); renderPlansView(); });
    $("#stepsToggle").addEventListener("click", () => toggleSteps(!$("#guide").classList.contains("steps-open")));
    // Scrolling the page away closes the list (a nudge of a few pixels doesn’t).
    window.addEventListener("scroll", () => {
      if ($("#guide").classList.contains("steps-open") && Math.abs(window.scrollY - stepsOpenedAt) > 40) toggleSteps(false);
    }, { passive: true });
    document.addEventListener("click", e => {
      if ($("#guide").classList.contains("steps-open") && !e.target.closest("#stepper, #stepsToggle")) toggleSteps(false);
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && $("#guide").classList.contains("steps-open")) { toggleSteps(false); $("#stepsToggle").focus(); }
    });
    $("#pdfBtn").addEventListener("click", printPlan);
    $("#shareProgress").addEventListener("change", updateShareUrl);
    $("#copyShare").addEventListener("click", () => copyText($("#shareUrl").value, $("#copyShare"), "Copy link"));
    $("#nativeShare").addEventListener("click", () => {
      navigator.share({ title: "My machine learning plan · Hello Model", url: $("#shareUrl").value }).catch(() => { /* dismissed */ });
    });
    $("#restart").addEventListener("click", newPlan);
    $("#ownPlanBtn").addEventListener("click", newPlan);
    document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));
    $(".tabs").addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const tabs = [...document.querySelectorAll(".tab")];
      const next = tabs[(tabs.indexOf(document.activeElement) + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      showTab(next.dataset.tab);
      next.focus();
    });

    // "More" menu on the plan: close it after choosing an item, on Escape, or on a click elsewhere.
    const menu = $("#moreMenu");
    menu.querySelectorAll(".menu-list button").forEach(b => b.addEventListener("click", () => menu.removeAttribute("open")));
    document.addEventListener("click", e => { if (menu.open && !menu.contains(e.target)) menu.removeAttribute("open"); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && menu.open) { menu.removeAttribute("open"); menu.querySelector("summary").focus(); }
    });

    // Plan shortcuts (single keys, not while typing). "?" lists them everywhere in the app.
    document.addEventListener("keydown", e => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (e.target.closest && e.target.closest("input:not([type=checkbox]), textarea, select, [contenteditable], dialog")) return;
      if (e.key === "?") { e.preventDefault(); openKeys(); return; }
      if (route !== "build" || state.screen !== "plan" || !plan) return;
      const act = { j: () => stepKey(1), k: () => stepKey(-1), a: () => togglePanel("answers"), c: () => togglePanel("compare"), s: openShareDialog }[e.key];
      if (act) { e.preventDefault(); act(); }
    });

    // Number keys pick answers on the question screen.
    document.addEventListener("keydown", e => {
      if (route !== "build" || state.screen !== "questions" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest && e.target.closest("input, textarea, dialog")) return; // e.g. typing in the search box
      const n = parseInt(e.key, 10);
      const q = visibleQuestions()[state.qIndex];
      if (q && n >= 1 && n <= q.options.length) answer(q.id, q.options[n - 1].value);
    });
  }

  function stepKey(delta) {
    showTab("guide");
    goStep(state.stepIndex + delta);
  }
  function openKeys() {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || "");
    document.querySelectorAll(".mod-key").forEach(k => { k.textContent = mac ? "⌘" : "Ctrl"; });
    const d = $("#keysDialog");
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
  }

  /** Commands for the Ctrl+K palette, depending on what’s on screen. */
  function paletteActions() {
    const acts = [];
    const onPlan = route === "build" && state.screen === "plan" && plan;
    if (onPlan) {
      const next = plan.steps.findIndex((_, i) => !stepDone(i));
      if (next >= 0) acts.push({ t: `Continue with step ${next + 1}: ${plan.steps[next].title}`, d: "Jump to the next step that isn’t done", x: "next continue resume", run: () => { showTab("guide"); goStep(next); } });
      acts.push(
        { t: "Edit answers", d: "Edit any answer and the plan updates in place", x: "edit answers questions", keys: "A", run: () => openPanel("answers") },
        { t: "Compare approaches", d: "Starter, standard and advanced side by side", x: "compare approaches tiers options", keys: "C", run: () => openPanel("compare") },
        { t: "Share this plan", d: "Copy a link to this plan", x: "share link copy url", keys: "S", run: openShareDialog },
        { t: "Save as PDF", d: "Print or save the whole plan", x: "pdf print export", run: printPlan },
        { t: "Download Markdown", d: "The plan as a .md file", x: "markdown export download md", run: exportMarkdown },
        { t: "Show tech stack and infrastructure", d: "Architecture, tools and cloud services", x: "stack infrastructure architecture cloud diagram", run: () => { showTab("stack"); $("#tabbtn-stack").focus(); } }
      );
      plan.steps.forEach((s, i) => acts.push({ t: `Go to step ${i + 1}: ${s.title}`, d: stepDone(i) ? "Done" : s.simple, x: "step", run: () => { showTab("guide"); goStep(i); } }));
    }
    acts.push({ t: "Keyboard shortcuts", d: "Every shortcut on one screen", x: "keys keyboard help hotkeys", keys: "?", run: openKeys });
    return acts;
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
    else if (name === "open") {
      history.replaceState(null, "", "#/plans");
      route = "plans";
      renderPlansView(); showScreen("plans"); setActiveNav();
      toast("That plan isn’t saved in this browser. Plans stay in the browser they were made in. To move one, use Share.");
      return;
    }
    else if (name === "example") { enterBuild(); showExample(); }
    else if (name === "start" && USE_CASES[arg]) { enterBuild(); state = freshState(); setRequirement(""); pickUseCase(arg); }
    else {
      if (name !== "build") enterBuild();
      route = "build";
      showScreen(BUILD_SCREENS.includes(state.screen) ? state.screen : "describe");
    }
    setActiveNav();
  }

  // ---------- views: my plans ----------
  const SORTS = {
    updated: { label: "Last updated", by: (a, b) => b.updatedAt - a.updatedAt },
    created: { label: "Date created", by: (a, b) => (b.createdAt || b.updatedAt) - (a.createdAt || a.updatedAt) },
    progress: { label: "Progress", by: (a, b) => b.st.pct - a.st.pct },
    name: { label: "Name", by: (a, b) => planTitle(a).localeCompare(planTitle(b)) }
  };
  let plansQuery = "";

  function renderPlansView() {
    const all = loadPlans();
    const box = $("#plansList");
    const tools = $("#plansTools");
    if (!all.length) {
      tools.classList.add("hidden");
      box.innerHTML = `<div class="card empty"><div class="empty-ic" aria-hidden="true">${HM_ICONS.svg("folder", 28)}</div>
        <h2>No plans yet</h2><p class="muted">Plans you create are saved here, in this browser, with your checklist progress. Nothing is sent to a server.</p>
        <div class="empty-actions"><button class="btn primary" id="emptyNew">Create a plan</button><a class="btn" href="#/example">See an example plan</a></div></div>`;
      $("#emptyNew").addEventListener("click", newPlan);
      return;
    }
    tools.classList.remove("hidden");
    const sort = SORTS[$("#plansSort").value] ? $("#plansSort").value : "updated";
    const q = plansQuery.trim().toLowerCase();
    const list = all.map(p => Object.assign({}, p, { st: planStats(p) }))
      .filter(p => !q || (planTitle(p) + " " + USE_CASES[p.useCaseId].name).toLowerCase().includes(q))
      .sort(SORTS[sort].by);
    $("#plansCount").textContent = q ? `${list.length} of ${all.length} plans` : `${all.length} ${all.length === 1 ? "plan" : "plans"}, saved in this browser`;
    if (!list.length) {
      box.innerHTML = `<div class="plans-none"><p class="muted">No plans match “${esc(plansQuery.trim())}”. Search looks at plan descriptions and model types.</p>
        <button type="button" class="btn small" id="clearPlansSearch">Clear search</button></div>`;
      $("#clearPlansSearch").addEventListener("click", () => { plansQuery = ""; $("#plansSearch").value = ""; renderPlansView(); $("#plansSearch").focus(); });
      return;
    }
    box.innerHTML = list.map(p => {
      const uc = USE_CASES[p.useCaseId];
      return `<div class="card plan-card">
        <div class="plan-card-ic" aria-hidden="true">${HM_ICONS.svg(uc.icon, 24)}</div>
        <div class="plan-card-body">
          <button type="button" class="plan-card-title" data-open="${esc(p.id)}">${esc(planTitle(p))}</button>
          <span class="muted">${esc(uc.name)} · Updated ${esc(whenUpdated(p.updatedAt))}</span>
          <div class="plan-card-progress"><div class="mini-progress" aria-hidden="true"><div style="width:${p.st.pct}%"></div></div><span>${esc(stepsLine(p.st))}</span></div>
        </div>
        <div class="plan-card-actions">
          <button class="btn small" data-open="${esc(p.id)}" aria-label="Open ${esc(planTitle(p))}">Open</button>
          <button class="link" data-del="${esc(p.id)}" aria-label="Delete ${esc(planTitle(p))}">Delete</button>
        </div>
      </div>`;
    }).join("");
    box.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => openPlan(b.dataset.open)));
    box.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      if (confirm("Delete this plan? This can’t be undone.")) deletePlan(b.dataset.del);
    }));
  }

  // ---------- boot ----------
  function restoreBuild() {
    setRequirement(state.example ? "" : state.requirement || "");
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
  // Some browsers (or privacy settings) block storage: say so once, instead of losing plans silently.
  if (!SHELL.storageWorks()) $("#storageNotice").classList.remove("hidden");
  initDescribe();
  initControls();
  SHELL.setActions(paletteActions);
  SHELL.init({ onNewPlan: newPlan, onOpenPlan: openPlan });
  restoreBuild();
  handleRoute();
  // Screen changes animate from now on; the first paint doesn’t, so it isn’t delayed.
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add("ready")));
  window.addEventListener("hashchange", handleRoute);
})();
