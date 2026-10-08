// The voice rules in VOICE.md that a machine can check: on every string in the app, every generated page,
// and every plan the engine can produce.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const KB = require("../js/knowledge.js");

const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
// Visible text in index.html, and the string literals in the app's scripts.
const html = read("index.html").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "");
const htmlText = [...html.matchAll(/>([^<>]+)</g)].map(m => m[1]).concat([...html.matchAll(/(?:placeholder|aria-label|title|content)="([^"]+)"/g)].map(m => m[1]));
const literals = src => [...src.replace(/^\s*\/\/.*$|\/\*[\s\S]*?\*\//gm, "").matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map(m => m[1] ?? m[2]);
const strings = [
  ...htmlText.map(t => ["index.html", t]),
  ...["js/app.js", "js/shell.js", "js/page.js"].flatMap(f => literals(read(f)).map(t => [f, t])),
  ...KB.QUESTIONS.flatMap(q => [q.title, q.help, ...q.options.flatMap(o => [o.label, o.hint])].map(t => ["questions", t]))
];

const BRITISH = /\b(personalis\w*|organis\w*|optimis\w*|recognis\w*|summaris\w*|analys(e|ed|ing)\b|colour\w*|behaviour\w*|favour\w*|labelled|labelling|cancelled|travelled|centre|licence|catalogue|initialis\w*|normalis\w*|visualis\w*|minimis\w*|maximis\w*|specialis(e|ed|es|ing)\b)\b/i;
const BANNED = /\b(use case|well done|awesome|super easy|just click|oops)\b/i;

test("app strings use American spelling and the agreed terms", () => {
  for (const [file, s] of strings) {
    assert.ok(!BRITISH.test(s), `${file}: British spelling in “${s.trim().slice(0, 80)}”`);
    assert.ok(!BANNED.test(s), `${file}: avoid “${s.match(BANNED)?.[0]}” in “${s.trim().slice(0, 80)}”`);
  }
});

test("app strings have no exclamation marks and no emoji", () => {
  for (const [file, s] of strings) {
    assert.ok(!/[A-Za-z)]![\s"'`<]|[A-Za-z)]!$/.test(s), `${file}: exclamation mark in “${s.trim().slice(0, 80)}”`);
    // Exceptions: the 🧠 logo until the new logo lands, and the ☑ / ☐ checkboxes in the printed plan.
    assert.ok(!/\p{Extended_Pictographic}/u.test(s.replace(/[🧠☑☐]/gu, "")), `${file}: emoji in “${s.trim().slice(0, 80)}”`);
  }
});

// ---------- Generated pages and plans ----------
const os = require("os");
const E = require("../js/engine.js");
const { build } = require("../scripts/build-site.js");

function visibleText(htmlSource) {
  return htmlSource
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/g, " ")
    .replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ");
}
const htmlFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? htmlFiles(path.join(dir, d.name)) : d.name.endsWith(".html") ? [path.join(dir, d.name)] : []);

test("every generated page follows the voice rules", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "hm-voice-"));
  try {
    build({ outDir, version: "test", date: "2026-10-08" });
    for (const file of htmlFiles(outDir)) {
      const text = visibleText(fs.readFileSync(file, "utf8"));
      const page = path.relative(outDir, file);
      const near = m => text.slice(Math.max(0, m.index - 40), m.index + 40);
      let m;
      if ((m = BRITISH.exec(text))) assert.fail(`${page}: British spelling near “${near(m)}”`);
      if ((m = BANNED.exec(text))) assert.fail(`${page}: avoid “${m[0]}” near “${near(m)}”`);
      if ((m = /[A-Za-z)]!(?=\s)/.exec(text))) assert.fail(`${page}: exclamation mark near “${near(m)}”`);
      if ((m = /[A-Za-z]'[A-Za-z]/.exec(text))) assert.fail(`${page}: straight apostrophe near “${near(m)}” (use ’)`);
      if ((m = /\p{Extended_Pictographic}/u.exec(text.replace(/[🧠☑☐]/gu, "")))) assert.fail(`${page}: emoji near “${near(m)}”`);
    }
  } finally { fs.rmSync(outDir, { recursive: true, force: true }); }
});

test("every plan the engine can produce follows the voice rules", () => {
  const answerSets = [];
  for (const deploy of ["api", "batch", "edge"]) for (const skill of ["beginner", "expert"]) for (const privacy of ["no", "yes"]) for (const labels of ["yes", "no"]) {
    answerSets.push({ data: "small", labels, skill, deploy, latency: "interactive", cloud: "aws", budget: "low", privacy });
  }
  for (const id of Object.keys(KB.USE_CASES)) {
    for (const a of answerSets) {
      const plan = E.buildPlan(id, a, "");
      const texts = [plan.model.name, plan.model.why, plan.cost, ...plan.warnings, ...plan.steps.flatMap(s =>
        [s.title, s.simple, s.why, s.tip, ...s.checklist, ...s.sections.flatMap(x => [x.heading, ...x.items])])];
      for (const t of texts.map(x => String(x).replace(/<code>[\s\S]*?<\/code>/g, ""))) {
        assert.ok(!BRITISH.test(t), `${id}: British spelling in “${t.slice(0, 80)}”`);
        assert.ok(!BANNED.test(t), `${id}: banned phrase in “${t.slice(0, 80)}”`);
        assert.ok(!/[A-Za-z)]!(\s|$)/.test(t), `${id}: exclamation mark in “${t.slice(0, 80)}”`);
        assert.ok(!/\p{Extended_Pictographic}/u.test(t), `${id}: emoji in “${t.slice(0, 80)}”`);
      }
      for (const s of plan.steps) assert.ok(!s.title.includes("&"), `${id}: use “and” in step titles: ${s.title}`);
    }
  }
  assert.ok(Object.values(KB.USE_CASES).every(u => /^[A-Z][a-z]|^LLM /.test(u.name) && u.name.split(" ").slice(1).every(w => w === w.toLowerCase() || /^[A-Z]{2,}|^\(RAG/.test(w))),
    "model type names are in sentence case");
});
