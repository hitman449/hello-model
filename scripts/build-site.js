#!/usr/bin/env node
/*
 * Builds the publishable site into _site/:
 *  - copies the app (index.html, css, js, ads.txt)
 *  - generates a real page for every Learn topic, so search engines can read them
 *    (/models/<id>/, /training/<id>/, /clouds/<id>/, /glossary/, /about/, /contact/, /privacy/, 404.html)
 *  - writes sitemap.xml and robots.txt
 *  - adds ?v=<version> to every CSS/JS link, so browsers never mix new pages with old cached files
 *
 * Usage: node scripts/build-site.js [outDir]   (version from SITE_VERSION or GITHUB_SHA, else "dev")
 */
const fs = require("fs");
const path = require("path");
const KB = require("../js/knowledge.js");
const { escapeHtml: esc } = require("../js/engine.js");
const HAND_WRITTEN = require("./pages.js");

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

function codeBlock(label, lang, content) {
  return `<details class="code-block"><summary><span class="code-tag">Code</span>${esc(label)}</summary>
    <div class="code-head"><span>${esc(lang)}</span><button class="btn small copy-code" type="button">Copy</button></div>
    <pre><code>${esc(content)}</code></pre></details>`;
}

// ---------- page bodies ----------
function modelsIndex() {
  return {
    path: "/models/", nav: "models",
    title: "Model library: 10 kinds of AI model and how to build them",
    description: "Classification, forecasting, RAG chatbots, object detection and more: what each kind of model does and three ways to build it.",
    body: `
      <h1 class="page-title">Model library</h1>
      <p class="lead-left">The kinds of models Hello Model can guide you through. Pick one to learn how it works.</p>
      <div class="uc-grid">${Object.entries(USE_CASES).map(([id, uc]) => `
        <a class="uc-card" href="/models/${id}/"><div class="ic" aria-hidden="true">${uc.icon}</div><b>${esc(uc.name)}</b><span>${esc(uc.tagline)}</span></a>`).join("")}
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
        <div class="big-ic" aria-hidden="true">${uc.icon}</div>
        <div><h1 class="page-title">${esc(uc.name)}</h1><p class="lead-left">${esc(uc.tagline)}</p></div>
      </div>
      <div class="row-start"><a class="btn primary" id="buildThis" href="/#/start/${id}">Build a plan for this →</a></div>
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
        <h2>The data you'll need</h2>${list(uc.dataTips)}
        <h2>Labeling</h2><p>${rich(uc.labeling)}</p>
        <h2>Preparing the data</h2>${list(uc.prep)}
        <h2>Start with a baseline</h2><p>${rich(uc.baseline)}</p>
        <h2>Evaluating the model</h2>${list(uc.evaluation)}
        <h2>Monitoring in production</h2>${list(uc.monitoring)}
        <h2>Common pitfalls</h2>${list(uc.pitfalls)}
      </div>
      <h2 class="section-h">Example code</h2>
      <div class="codes">${codeBlock("Quick start", "python", uc.starterCode)}${codeBlock("Train your own model", "python", uc.trainCode)}</div>
      <div class="card next-card"><p>Ready to build one? <a href="/#/start/${id}">Get a personalised plan →</a></p>
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
      <p class="lead-left">The core ideas behind building a model, one short lesson at a time.</p>
      <ol class="lesson-list">${TRAINING_TOPICS.map((t, i) => `
        <li><a class="card lesson-link" href="/training/${t.id}/"><span class="num">${i + 1}</span>
          <span><b>${esc(t.title)}</b><span class="muted">${esc(t.simple)}</span></span></a></li>`).join("")}
      </ol>
      <div class="ad-slot" data-slot="learn"></div>`
  };
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
      <nav class="step-nav" aria-label="Lessons">
        ${prev ? `<a class="btn" href="/training/${prev.id}/">← ${esc(prev.title)}</a>` : "<span></span>"}
        ${next ? `<a class="btn primary" href="/training/${next.id}/">Next: ${esc(next.title)} →</a>` : `<a class="btn primary" href="/#/build">Build your own model →</a>`}
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
    description: "This page doesn't exist.",
    body: `
      <h1 class="page-title">Page not found</h1>
      <p class="lead-left">The page you're looking for doesn't exist or has moved.</p>
      <p class="row-start"><a class="btn primary" href="/#/build">Build your model →</a> <a class="btn" href="/models/">Model library</a></p>`
  };
}

function allPages() {
  return [
    modelsIndex(), ...Object.keys(USE_CASES).map(modelPage),
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
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body class="learn-page">
  <div class="shell">
    ${sidebar}
    <div class="main-col">
      ${shell.mobilebar}
      <main id="app">
        <section class="screen" id="screen-${screen}">${page.body}
        </section>
      </main>
      ${shell.footer}
    </div>
  </div>
  <div class="tooltip hidden" id="tooltip" role="tooltip"></div>
  <script src="/js/knowledge.js"></script>
  <script src="/js/ads.js"></script>
  <script src="/js/shell.js"></script>
  <script src="/js/page.js"></script>
</body>
</html>
`;
}

/** Short list of guide links for the home page, so search engines find the Learn pages from it. */
function homeGuides() {
  return `<nav class="home-guides" aria-label="Guides by model type">
        <h2>Guides by model type</h2>
        <ul>${Object.entries(USE_CASES).map(([id, uc]) => `<li><a href="/models/${id}/">${esc(uc.name)}</a></li>`).join("")}</ul>
      </nav>`;
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
  for (const dir of ["css", "js"]) fs.cpSync(path.join(ROOT, dir), path.join(outDir, dir), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "ads.txt"), path.join(outDir, "ads.txt"));

  const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const shell = { sidebar: region(index, "sidebar"), mobilebar: region(index, "mobilebar"), footer: region(index, "footer") };
  if (!index.includes("<!-- build:home-guides -->")) throw new Error("index.html is missing the build:home-guides marker");
  write(outDir, "/", versionAssets(index.replace("<!-- build:home-guides -->", homeGuides()), version, "index.html"));

  const pages = allPages();
  for (const page of pages) write(outDir, page.path, versionAssets(layout(shell, page), version, page.path));

  const listed = ["/"].concat(pages.filter(p => !p.noindex).map(p => p.path));
  write(outDir, "/sitemap.xml", sitemap(listed, date));
  write(outDir, "/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  return { outDir, pages: listed };
}

module.exports = { build, allPages, SITE };

if (require.main === module) {
  const version = process.env.SITE_VERSION || (process.env.GITHUB_SHA || "").slice(0, 7) || "dev";
  const { outDir, pages } = build({ outDir: process.argv[2] ? path.resolve(process.argv[2]) : undefined, version });
  console.log(`Built ${pages.length} pages into ${path.relative(process.cwd(), outDir) || "."} (assets ?v=${version})`);
}
