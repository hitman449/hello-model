#!/usr/bin/env node
/*
 * Builds the publishable site into _site/:
 *  - copies the app (index.html, css, js, ads.txt)
 *  - generates a real page for every Learn topic, so search engines can read them
 *    (/guides/<id>/, /models/<id>/, /training/<id>/, /clouds/<id>/, /glossary/, /about/, /contact/, /privacy/, 404.html)
 *  - writes sitemap.xml, robots.txt and search-index.json (for the search box)
 *  - adds ?v=<version> to every CSS/JS link, so browsers never mix new pages with old cached files
 *
 * Usage: node scripts/build-site.js [outDir]   (version from SITE_VERSION or GITHUB_SHA, else "dev")
 */
const fs = require("fs");
const path = require("path");
const KB = require("../js/knowledge.js");
const { escapeHtml: esc, buildPlan, inSentence } = require("../js/engine.js");
const { svg: icon } = require("../js/icons.js");
const HAND_WRITTEN = require("./pages.js");
const GUIDES = require("./guides.js");

const SITE = "https://sayhellomodel.com";
const ROOT = path.join(__dirname, "..");
const { USE_CASES, TRAINING_TOPICS, INFRA, INFRA_COMPONENTS, INFRA_ADVANTAGES, GLOSSARY } = KB;

const TIERS = [["starter", "Starter", "No or little data, or new to ML"], ["standard", "Standard", "Some labeled data and Python experience"], ["advanced", "Advanced", "Lots of data and an experienced team"]];
const shortCloud = id => INFRA[id].name.replace(" / self-hosted", "");

/** Turn {{term}} markers into glossary tooltips (same markup as the app). Input is trusted HTML from the knowledge base. */
const rich = html => String(html).replace(/\{\{([^}]+)\}\}/g, (_, term) =>
  GLOSSARY[term] ? `<span class="term" tabindex="0" data-term="${esc(term)}">${esc(term)}</span>` : esc(term));
const list = items => `<ul>${items.map(x => `<li>${rich(x)}</li>`).join("")}</ul>`;
const termId = t => "term-" + t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Glossary terms, one per spelling regardless of case, sorted A–Z. */
function glossaryTerms() {
  const seen = new Set();
  return Object.keys(GLOSSARY)
    .filter(t => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function codeBlock(label, lang, content, open = false) {
  return `<details class="code-block"${open ? " open" : ""}><summary><span class="code-tag">Code</span>${esc(label)}</summary>
    <div class="code-head"><span>${esc(lang)}</span><button class="btn small copy-code" type="button">Copy</button></div>
    <pre tabindex="0" aria-label="${esc(label)}"><code>${esc(content)}</code></pre></details>`;
}

// ---------- page bodies ----------
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const guideFor = modelId => GUIDES.find(g => g.model === modelId);
/** Reading time at ~200 words a minute, counting prose only (not code). */
function readingMinutes(g) {
  const text = g.blocks.filter(b => b[0] !== "code").flatMap(b => b.slice(1)).flat().join(" ").replace(/<[^>]+>|\{\{|\}\}/g, " ");
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}

function renderBlock([type, ...args]) {
  switch (type) {
    case "p": return `<p>${rich(args[0])}</p>`;
    case "h2": return `<h2 id="${slug(args[0])}">${esc(args[0])}</h2>`;
    case "ul": return list(args[0]);
    case "ol": return `<ol>${args[0].map(x => `<li>${rich(x)}</li>`).join("")}</ol>`;
    case "code": return codeBlock(args[0], args[1], args[2], true);
    case "tip": return `<div class="tip"><b>Tip</b> ${rich(args[0])}</div>`;
    case "note": return `<div class="simple">${rich(args[0])}</div>`;
    default: throw new Error(`Unknown guide block type: ${type}`);
  }
}

function guidesIndex() {
  return {
    path: "/guides/", nav: "guides",
    title: "Step-by-step machine learning guides",
    description: "Complete, hands-on walkthroughs for real ML projects: a spam filter, customer churn prediction and a chatbot over your PDFs, with code.",
    body: `
      <h1 class="page-title">Guides</h1>
      <p class="lead-left">Real projects, start to finish. Each guide walks through one model from the first decision to running it in production, with code you can copy.</p>
      <div class="guide-list">${GUIDES.map(g => `
        <a class="card guide-card" href="/guides/${g.id}/">
          <span class="ic" aria-hidden="true">${icon(USE_CASES[g.model].icon, 28)}</span>
          <span><b>${esc(g.title)}</b><span class="muted">${esc(g.lead)}</span>
          <span class="guide-meta">${esc(USE_CASES[g.model].name)} · ${readingMinutes(g)} min read</span></span>
        </a>`).join("")}
      </div>
      <div class="ad-slot" data-slot="learn"></div>`
  };
}

function guidePage(g) {
  const uc = USE_CASES[g.model];
  const others = GUIDES.filter(x => x !== g);
  const headings = g.blocks.filter(b => b[0] === "h2").map(b => b[1]);
  return {
    path: `/guides/${g.id}/`, nav: "guides",
    title: g.title,
    description: g.description,
    body: `
      <a class="link back" href="/guides/">← Guides</a>
      <p class="eyebrow">${esc(uc.name)} · ${readingMinutes(g)} min read</p>
      <h1 class="page-title">${esc(g.title)}</h1>
      <p class="lead-left">${esc(g.lead)}</p>
      <div class="card guide-summary">
        <div><h2>What you’ll build</h2>${list(g.build)}</div>
        <div><h2>Tools</h2><p>${esc(g.tools)}</p>
          <h2>Steps</h2><ol class="toc">${headings.map(h => `<li><a href="#${slug(h)}">${esc(h.replace(/^Step \d+: /, ""))}</a></li>`).join("")}</ol></div>
      </div>
      <article class="guide-body prose">${g.blocks.map(renderBlock).join("\n")}</article>
      <div class="card next-card"><p>Want this tailored to your data, team and budget? <a href="/#/start/${g.model}">Create a plan for your project</a></p>
        <p class="muted">More on <a href="/models/${g.model}/">${esc(uc.name)}</a>${others.length ? ` · Next guide: <a href="/guides/${others[0].id}/">${esc(others[0].title)}</a>` : ""}</p></div>
      <div class="ad-slot" data-slot="learn"></div>`
  };
}

function modelsIndex() {
  return {
    path: "/models/", nav: "models",
    title: "Model library: 10 kinds of AI model and how to build them",
    description: "Classification, forecasting, RAG chatbots, object detection and more: what each kind of model does and three ways to build it.",
    body: `
      <h1 class="page-title">Model library</h1>
      <p class="lead-left">The kinds of models Hello Model can guide you through. Pick one to learn how it works.</p>
      <div class="uc-grid">${Object.entries(USE_CASES).map(([id, uc]) => `
        <a class="uc-card" href="/models/${id}/"><div class="ic" aria-hidden="true">${icon(uc.icon, 26)}</div><b>${esc(uc.name)}</b><span>${esc(uc.tagline)}</span></a>`).join("")}
      </div>
      <div class="ad-slot" data-slot="learn"></div>`
  };
}

function modelPage(id) {
  const uc = USE_CASES[id];
  const ids = Object.keys(USE_CASES);
  const next = USE_CASES[ids[(ids.indexOf(id) + 1) % ids.length]];
  return {
    path: `/models/${id}/`, nav: "models",
    title: `How to build a ${uc.name.toLowerCase()} model`,
    description: `${uc.tagline} Models, data, metrics, code and common pitfalls, explained step by step.`,
    body: `
      <a class="link back" href="/models/">← Model library</a>
      <div class="model-hero">
        <div class="big-ic" aria-hidden="true">${icon(uc.icon, 32)}</div>
        <div><h1 class="page-title">${esc(uc.name)}</h1><p class="lead-left">${esc(uc.tagline)}</p></div>
      </div>
      <div class="row-start"><a class="btn primary" id="buildThis" href="/#/start/${id}">Create a plan for this model type</a></div>
      <h2 class="section-h">Typical projects</h2>
      <div class="chips static">${uc.examples.map(x => `<span class="chip">${esc(x)}</span>`).join("")}</div>
      <h2 class="section-h">Three ways to build it</h2>
      <div class="tier-grid">${TIERS.map(([k, label, who]) => `
        <div class="card tier">
          <p class="eyebrow">${label}</p>
          <b>${rich(uc.models[k].name)}</b>
          <p class="muted">${rich(uc.models[k].why)}</p>
          <p class="who">Best for: ${esc(who)}</p>
          <p class="libs">${uc.models[k].libs.map(esc).join(" · ")}</p>
        </div>`).join("")}</div>
      <div class="card prose model-facts">
        <h2>How success is measured</h2><p>${rich(uc.metric)}</p>
        <h2>The data you’ll need</h2>${list(uc.dataTips)}
        <h2>Labeling</h2><p>${rich(uc.labeling)}</p>
        <h2>Preparing the data</h2>${list(uc.prep)}
        <h2>Start with a baseline</h2><p>${rich(uc.baseline)}</p>
        <h2>Evaluating the model</h2>${list(uc.evaluation)}
        <h2>Monitoring in production</h2>${list(uc.monitoring)}
        <h2>Common pitfalls</h2>${list(uc.pitfalls)}
      </div>
      <h2 class="section-h">Example code</h2>
      <div class="codes">${codeBlock("Quick start", "python", uc.starterCode)}${codeBlock("Train your own model", "python", uc.trainCode)}</div>
      ${guideFor(id) ? `<div class="card next-card guide-link"><p>Full walkthrough: <a href="/guides/${guideFor(id).id}/">${esc(guideFor(id).title)}</a></p></div>` : ""}
      <div class="card next-card"><p>Ready to build one? <a href="/#/start/${id}">Create a plan for your project</a></p>
        <p class="muted">Or read about <a href="/models/${ids[(ids.indexOf(id) + 1) % ids.length]}/">${esc(next.name)}</a> next.</p></div>
      <div class="ad-slot" data-slot="learn"></div>`
  };
}

function trainingIndex() {
  return {
    path: "/training/", nav: "training",
    title: "Training basics: machine learning in short lessons",
    description: "The core ideas behind building a model: the ML workflow, data splits, overfitting, hyperparameters, GPUs and picking the right metric.",
    body: `
      <h1 class="page-title">Training basics</h1>
      <p class="lead-left">The core ideas behind building a model, one short lesson at a time. New to all this? The <a href="/learning-path/">learning path</a> puts these lessons and the guides in order.</p>
      <ol class="lesson-list">${TRAINING_TOPICS.map((t, i) => `
        <li><a class="card lesson-link" href="/training/${t.id}/"><span class="num">${i + 1}</span>
          <span><b>${esc(t.title)}</b>${WIDGETS[t.id] ? ` <span class="badge">Interactive</span>` : ""}<span class="muted">${esc(t.simple)}</span></span></a></li>`).join("")}
      </ol>
      <div class="ad-slot" data-slot="learn"></div>`
  };
}

// Interactive widgets in lessons (js/widgets/<name>.js, loaded by page.js when scrolled near).
const WIDGETS = {
  splits: { name: "splits", title: "Try it: split a dataset", intro: "Move the sliders to see how many rows each part gets. Then tick “Data over time” to see why forecasts split by date instead of at random." },
  fit: { name: "fit", title: "Try it: find the right amount of complexity", intro: "Each dot is a measurement. Filled dots train the model; hollow dots are new data it has never seen. Make the model more complex and watch both errors." },
  hyperparams: { name: "gradient", title: "Try it: pick a learning rate", intro: "Training walks downhill towards the lowest error. The learning rate is the size of each step. Pick one and run 15 steps." },
  metrics: { name: "threshold", title: "Try it: tune a spam filter", intro: "Each dot is an email, placed by the model’s spam score. Everything to the right of the threshold gets blocked. Move it and watch precision and recall trade off." }
};
function widget(w) {
  return `<section class="widget card" data-widget="${w.name}" aria-labelledby="widget-${w.name}">
        <h2 id="widget-${w.name}">${esc(w.title)}</h2>
        <p class="muted">${esc(w.intro)}</p>
        <div class="widget-body"><p class="widget-loading muted">Loading the interactive example…</p></div>
      </section>`;
}

function lessonPage(i) {
  const t = TRAINING_TOPICS[i];
  const prev = TRAINING_TOPICS[i - 1], next = TRAINING_TOPICS[i + 1];
  return {
    path: `/training/${t.id}/`, nav: "training",
    title: t.title,
    description: t.simple,
    body: `
      <a class="link back" href="/training/">← Training basics</a>
      <p class="eyebrow">Lesson ${i + 1} of ${TRAINING_TOPICS.length}</p>
      <h1 class="page-title">${esc(t.title)}</h1>
      <div class="card topic-body lesson">
        <div class="simple"><b>In plain words:</b> ${esc(t.simple)}</div>
        ${list(t.items)}
        <div class="tip"><b>Tip</b> ${rich(t.tip)}</div>
      </div>
      ${WIDGETS[t.id] ? widget(WIDGETS[t.id]) : ""}
      <nav class="step-nav" aria-label="Lessons">
        ${prev ? `<a class="btn" href="/training/${prev.id}/">← ${esc(prev.title)}</a>` : "<span></span>"}
        ${next ? `<a class="btn primary" href="/training/${next.id}/">Next: ${esc(next.title)} →</a>` : `<a class="btn primary" href="/#/build">Create a plan</a>`}
      </nav>
      <div class="ad-slot" data-slot="learn"></div>`
  };
}

function cloudPage(pick) {
  const ids = Object.keys(INFRA);
  const advList = (c, k) => `<ul class="adv-list">${(INFRA_ADVANTAGES[c][k] || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const seg = [["all", "Compare all", "/clouds/"]].concat(ids.map(id => [id, shortCloud(id), `/clouds/${id}/`]))
    .map(([id, label, href]) => `<a class="seg-btn${id === pick ? " active" : ""}" data-cloud="${id}" href="${href}"${id === pick ? ' aria-current="page"' : ""}>${esc(label)}</a>`).join("");
  let table;
  if (pick === "all") {
    // Comparing everything: keep cells short, advantages fold out on demand.
    table = `<table class="infra wide" id="cloudTable"><thead><tr><th>Component</th>${ids.map(c => `<th>${esc(INFRA[c].name)}</th>`).join("")}</tr></thead><tbody>` +
      INFRA_COMPONENTS.map(([k, label]) => `<tr><td>${esc(label)}</td>${ids.map(c => `<td data-label="${esc(INFRA[c].name)}">${esc(INFRA[c][k])}
        <details class="adv"><summary>Advantages</summary>${advList(c, k)}</details></td>`).join("")}</tr>`).join("") + "</tbody></table>";
  } else {
    // One cloud: show why each service helps, right next to it.
    const name = INFRA[pick].name;
    table = `<table class="infra single" id="cloudTable"><thead><tr><th>Component</th><th>${esc(name)} service</th><th>Why it helps your model</th></tr></thead><tbody>` +
      INFRA_COMPONENTS.map(([k, label]) => `<tr><td>${esc(label)}</td><td class="svc" data-label="${esc(name)} service">${esc(INFRA[pick][k])}</td><td data-label="Why it helps your model">${advList(pick, k)}</td></tr>`).join("") + "</tbody></table>";
  }
  const all = pick === "all";
  return {
    path: all ? "/clouds/" : `/clouds/${pick}/`, nav: "clouds", screen: "clouds",
    title: all ? "Cloud comparison for machine learning: AWS vs Google Cloud vs Azure vs open source"
      : `${INFRA[pick].name} for machine learning: which service to use for each part`,
    description: all ? "Which service to use for storage, notebooks, GPU training, serving, pipelines, vector search and monitoring on each cloud, and why it helps."
      : `The ${shortCloud(pick)} services for each part of an ML system, from data storage and GPU training to serving and monitoring, and why each one helps.`,
    body: `
      <h1 class="page-title">${all ? "Cloud comparison" : esc(INFRA[pick].name) + " for machine learning"}</h1>
      <p class="lead-left">${all ? "Which service to use for each part of an ML system, on each cloud, and why it helps your model. Pick a cloud to see its advantages side by side, or open “Advantages” under any service."
        : `The service to use for each part of an ML system on ${esc(INFRA[pick].name)}, and why it helps your model.`}</p>
      <nav class="seg" id="cloudSeg" aria-label="Choose a cloud">${seg}</nav>
      <div class="card table-card"><div class="table-wrap">${table}</div></div>
      <div class="ad-slot" data-slot="learn"></div>`
  };
}

/** The learning path: lessons and guides in a sensible order, with what you’ve opened ticked off. */
const PATH = [
  { title: "Get the big picture", items: ["workflow", "approach"] },
  { title: "Train a model well", items: ["splits", "fit", "hyperparams", "metrics"] },
  { title: "Run it for real", items: ["compute", "mlops"] },
  { title: "Follow a real project", guides: true },
  { title: "Build your own", build: true }
];
function learningPathPage() {
  const lesson = id => { const t = TRAINING_TOPICS.find(x => x.id === id); return { href: `/training/${id}/`, title: t.title, note: WIDGETS[id] ? "Lesson · interactive" : "Lesson" }; };
  const stages = PATH.map((st, i) => {
    const items = st.build ? [{ href: "/#/build", title: "Describe your own idea and get a personalized plan", note: "About 3 minutes", build: true }]
      : st.guides ? GUIDES.map(g => ({ href: `/guides/${g.id}/`, title: g.title, note: `Guide · ${readingMinutes(g)} min read` }))
      : st.items.map(lesson);
    return `<li class="path-stage">
          <h2><span class="num">${i + 1}</span>${esc(st.title)}</h2>
          <ul class="path-items">${items.map(it => `<li><a href="${it.href}"${it.build ? "" : ` data-path="${it.href}"`}>
            <span class="path-tick" aria-hidden="true">${icon("check", 16)}</span>
            <span><b>${esc(it.title)}</b><small>${esc(it.note)}</small></span>
            <span class="visually-hidden path-state"></span></a></li>`).join("")}</ul>
        </li>`;
  }).join("");
  return {
    path: "/learning-path/", nav: "learning-path",
    title: "Learning path",
    description: "A step-by-step route through machine learning: the big picture, training a model well, running it for real, then real projects and your own model.",
    body: `
      <h1 class="page-title">Learning path</h1>
      <p class="lead-left">New to machine learning? Go through these in order. Each one is short, and the ones marked interactive let you try the idea yourself.</p>
      <div class="card path-progress" id="pathProgress">
        <p><b id="pathCount">Start here</b> <span class="muted" id="pathNote">Your progress is saved in this browser only.</span></p>
        <ol class="q-steps" id="pathBar" aria-hidden="true"></ol>
        <a class="btn primary" id="pathNext" href="/training/workflow/">Start with lesson 1</a>
      </div>
      <ol class="path">${stages}</ol>`
  };
}

function glossaryPage() {
  return {
    path: "/glossary/", nav: "glossary",
    title: "Machine learning glossary in plain English",
    description: "Plain-English definitions of machine learning terms: precision, recall, overfitting, embeddings, RAG, data drift, fine-tuning and more.",
    body: `
      <h1 class="page-title">Glossary</h1>
      <p class="lead-left">Plain-English definitions of the terms used across the site.</p>
      <input type="search" id="glossarySearch" class="search" placeholder="Search terms…" aria-label="Search the glossary">
      <dl id="glossaryList" class="glossary">${glossaryTerms().map(t =>
        `<div class="g-item" id="${termId(t)}"><dt>${esc(t[0].toUpperCase() + t.slice(1))}</dt><dd>${esc(GLOSSARY[t])}</dd></div>`).join("")}</dl>
      <p class="muted hidden" id="glossaryEmpty">No terms match your search.</p>
      <div class="ad-slot" data-slot="learn"></div>`
  };
}

function notFoundPage() {
  return {
    path: "/404.html", nav: null, screen: "notfound", noindex: true,
    title: "Page not found",
    description: "This page doesn’t exist.",
    body: `
      <div class="card empty not-found">
        <div class="empty-ic" aria-hidden="true">${icon("alert", 28)}</div>
        <h1 class="page-title">Page not found</h1>
        <p class="muted">The page you’re looking for doesn’t exist or has moved. Search for it, or start from one of these.</p>
        <div class="empty-actions"><button type="button" class="btn primary" data-search>Search the site</button>
          <a class="btn" href="/#/build">Create a plan</a> <a class="btn" href="/guides/">Browse guides</a></div>
      </div>`
  };
}

function allPages() {
  return [
    guidesIndex(), ...GUIDES.map(guidePage),
    modelsIndex(), ...Object.keys(USE_CASES).map(modelPage),
    learningPathPage(),
    trainingIndex(), ...TRAINING_TOPICS.map((_, i) => lessonPage(i)),
    cloudPage("all"), ...Object.keys(INFRA).map(cloudPage),
    glossaryPage(),
    ...HAND_WRITTEN.map(p => Object.assign({ nav: null }, p)),
    notFoundPage()
  ];
}

// ---------- layout ----------
function region(html, name) {
  const m = html.match(new RegExp(`<!-- shell:${name}[^>]*-->([\\s\\S]*?)<!-- /shell:${name} -->`));
  if (!m) throw new Error(`index.html is missing the shell:${name} markers`);
  return m[1].trim();
}

function layout(shell, page) {
  const url = SITE + (page.path === "/404.html" ? "/" : page.path);
  const fullTitle = `${page.title} · Hello Model`;
  // Mark the current section in the shared sidebar.
  const sidebar = page.nav ? shell.sidebar.replace(`data-route="${page.nav}"`, `data-route="${page.nav}" class="active" aria-current="page"`) : shell.sidebar;
  const screen = page.screen || page.path.split("/")[1];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(page.description)}">
  ${page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Hello Model">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='1' y='1' width='22' height='22' rx='6' fill='%230a6a62'/%3E%3Cpath d='M6 17l4.5-4.5 3 2.5L18 8' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cg fill='%23fff'%3E%3Ccircle cx='6' cy='17' r='2'/%3E%3Ccircle cx='10.5' cy='12.5' r='2'/%3E%3Ccircle cx='13.5' cy='15' r='2'/%3E%3Ccircle cx='18' cy='8' r='2.4'/%3E%3C/g%3E%3C/svg%3E">
  <link rel="preload" href="/fonts/source-sans-3-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <meta name="theme-color" content="#f5f7f7" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0e1213" media="(prefers-color-scheme: dark)">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body class="learn-page">
  <a class="skip-link" href="#app">Skip to content</a>
  <div class="shell">
    ${sidebar}
    <div class="main-col">
      ${shell.mobilebar}
      <main id="app" tabindex="-1">
        <section class="screen" id="screen-${screen}">${page.body}
        </section>
      </main>
      ${shell.footer}
    </div>
  </div>
  <div class="tooltip hidden" id="tooltip" role="tooltip"></div>
  <script defer src="/js/kb-lite.js"></script>
  <script defer src="/js/ads.js"></script>
  <script defer src="/js/icons.js"></script>
  <script defer src="/js/search.js"></script>
  <script defer src="/js/shell.js"></script>
  <script defer src="/js/page.js"></script>
</body>
</html>
`;
}

/** Short list of guide links for the home page, so search engines find the Learn pages from it. */
function homeGuides() {
  return `<nav class="home-guides" aria-label="Step-by-step guides">
        <h2>Step-by-step guides</h2>
        <ul>${GUIDES.map(g => `<li><a href="/guides/${g.id}/">${esc(g.title.replace(/^How to /, "").replace(/^./, c => c.toUpperCase()))}</a></li>`).join("")}</ul>
      </nav>
      <nav class="home-guides" aria-label="Guides by model type">
        <h2>Guides by model type</h2>
        <ul>${Object.entries(USE_CASES).map(([id, uc]) => `<li><a href="/models/${id}/">${esc(uc.name)}</a></li>`).join("")}</ul>
      </nav>`;
}

/** "What you’ll get": the top of the example plan, so visitors see the result before they type anything. */
function homePreview() {
  const { useCaseId, answers, requirement } = KB.EXAMPLE_PLAN;
  const plan = buildPlan(useCaseId, answers, requirement);
  const shown = 3;
  return `<section class="preview" aria-labelledby="previewTitle">
        <h2 id="previewTitle">What you’ll get</h2>
        <p class="muted">A real example: a small bakery that wants to know how much bread to bake each morning.</p>
        <div class="card preview-card">
          <p class="eyebrow">${icon(plan.useCase.icon, 16)} Your ${esc(inSentence(plan.useCase.name))} plan</p>
          <div class="glance-grid">
            <div>
              <p class="g-label">Recommended approach</p>
              <p class="g-value">${rich(plan.model.name)}</p>
            </div>
            <div>
              <p class="g-label">Estimated cost</p>
              <p>${esc(plan.cost.split(" — ")[0])}</p>
              <p class="g-label">GPU needed</p>
              <p>${plan.gpu ? "Yes" : "No"}</p>
            </div>
          </div>
          <p class="g-label">Your ${plan.steps.length} steps</p>
          <ol class="first-steps">${plan.steps.slice(0, shown).map(st => `<li>${esc(st.title)}</li>`).join("")}</ol>
          <p class="muted preview-more">…and ${plan.steps.length - shown} more. Each step explains what to do and why, with a checklist. The plan also includes starter code, a tech stack and an architecture diagram.</p>
          <a class="btn" href="/#/example">View the full example plan</a>
        </div>
      </section>`;
}

/** Everything the search box can find: every indexable page, each glossary term, and the app’s main screens. */
function searchIndex(pages) {
  const strip = html => String(html).replace(/<[^>]+>|\{\{|\}\}/g, "");
  const kinds = { guides: "Guide", models: "Model type", training: "Lesson", clouds: "Cloud", glossary: "Glossary" };
  const extra = {};
  for (const [id, uc] of Object.entries(USE_CASES)) extra[`/models/${id}/`] = uc.examples.concat(Object.keys(uc.keywords)).join(" ");
  for (const g of GUIDES) extra[`/guides/${g.id}/`] = USE_CASES[g.model].name;
  for (const t of TRAINING_TOPICS) extra[`/training/${t.id}/`] = t.items.map(strip).join(" ");
  for (const id of Object.keys(INFRA)) extra[`/clouds/${id}/`] = INFRA_COMPONENTS.map(([k]) => INFRA[id][k]).join(" ");
  const entries = [
    { t: "Build your model", u: "/#/build", k: "App", d: "Describe your idea and get a step-by-step plan." },
    { t: "See an example plan", u: "/#/example", k: "App", d: "A finished plan for a small bakery, to see what you’ll get." },
    { t: "My plans", u: "/#/plans", k: "App", d: "Plans saved in this browser, with your progress." }
  ];
  for (const p of pages) {
    if (p.noindex) continue;
    const section = p.path.split("/")[1];
    // Index pages and detail pages: use the visible heading, not the longer SEO title.
    const h1 = (p.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
    const kind = p.path === `/${section}/` && kinds[section] ? "Section" : kinds[section] || "Page";
    entries.push({ t: strip(h1 || p.title), u: p.path, k: kind, d: p.description, x: extra[p.path] || "" });
  }
  for (const t of glossaryTerms()) entries.push({ t: t[0].toUpperCase() + t.slice(1), u: `/glossary/#${termId(t)}`, k: "Glossary", d: GLOSSARY[t] });
  return entries;
}

function sitemap(paths, date) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(p => `  <url><loc>${SITE}${p}</loc><lastmod>${date}</lastmod></url>`).join("\n")}
</urlset>
`;
}

/** Add ?v=<version> to local CSS/JS links; fail if any link is left unversioned. */
function versionAssets(html, version, file) {
  const out = html.replace(/(href|src)="(\/?(?:css|js)\/[^"?]+\.(?:css|js))"/g, `$1="$2?v=${version}"`);
  const left = out.match(/(href|src)="\/?(css|js)\/[^"?]+"/);
  if (left) throw new Error(`${file}: asset link not versioned: ${left[0]}`);
  return out;
}

function write(outDir, rel, content) {
  const file = path.join(outDir, rel.endsWith("/") ? rel + "index.html" : rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function build({ outDir = path.join(ROOT, "_site"), version = "dev", date = new Date().toISOString().slice(0, 10) } = {}) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const dir of ["css", "js", "fonts"]) fs.cpSync(path.join(ROOT, dir), path.join(outDir, dir), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "ads.txt"), path.join(outDir, "ads.txt"));

  const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const shell = { sidebar: region(index, "sidebar"), mobilebar: region(index, "mobilebar"), footer: region(index, "footer") };
  for (const marker of ["home-guides", "home-preview"]) {
    if (!index.includes(`<!-- build:${marker} -->`)) throw new Error(`index.html is missing the build:${marker} marker`);
  }
  const home = index.replace("<!-- build:home-guides -->", homeGuides()).replace("<!-- build:home-preview -->", homePreview());
  write(outDir, "/", versionAssets(home, version, "index.html"));

  const pages = allPages();
  for (const page of pages) write(outDir, page.path, versionAssets(layout(shell, page), version, page.path));

  const listed = ["/"].concat(pages.filter(p => !p.noindex).map(p => p.path));
  write(outDir, "/search-index.json", JSON.stringify(searchIndex(pages)));
  const lite = { USE_CASES: Object.fromEntries(Object.entries(USE_CASES).map(([id, uc]) => [id, { name: uc.name, icon: uc.icon }])), GLOSSARY };
  write(outDir, "/js/kb-lite.js", `/* Generated by scripts/build-site.js: the parts of js/knowledge.js the Learn pages need. */\nwindow.HM_KB = ${JSON.stringify(lite)};\n`);
  write(outDir, "/sitemap.xml", sitemap(listed, date));
  write(outDir, "/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  return { outDir, pages: listed };
}

module.exports = { build, allPages, searchIndex, SITE };

if (require.main === module) {
  const version = process.env.SITE_VERSION || (process.env.GITHUB_SHA || "").slice(0, 7) || "dev";
  const { outDir, pages } = build({ outDir: process.argv[2] ? path.resolve(process.argv[2]) : undefined, version });
  console.log(`Built ${pages.length} pages into ${path.relative(process.cwd(), outDir) || "."} (assets ?v=${version})`);
}
