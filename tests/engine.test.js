// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const KB = require("../js/knowledge.js");
const E = require("../js/engine.js");

const cases = [
  ["Chatbot that answers employee questions from our HR policy PDFs", "llm-rag"],
  ["Predict which customers will churn next month from our CRM data", "tabular-classification"],
  ["Detect defective parts in photos from our production line", "image-classification"],
  ["Forecast daily sales for each of our 40 stores", "forecasting"],
  ["Route incoming support tickets to the right team", "text-classification"],
  ["Recommend products to shoppers based on purchase history", "recommendation"],
  ["Count people walking into the shop from our CCTV video", "object-detection"],
  ["Find unusual readings from factory sensors before machines fail", "anomaly-detection"],
  ["Transcribe customer calls and summarise them", "speech"],
  ["Estimate how much a used car is worth", "regression"]
];

for (const [text, expected] of cases) {
  test(`classifies: ${text}`, () => {
    assert.equal(E.classify(text)[0].id, expected);
  });
}

test("unknown text has zero score", () => {
  assert.equal(E.classify("hello there")[0].score, 0);
});

test("every use case × every answer combination builds a valid plan", () => {
  const qs = KB.QUESTIONS;
  const pick = (q, i) => q.options[i % q.options.length].value;
  for (const id of Object.keys(KB.USE_CASES)) {
    for (let i = 0; i < 24; i++) {
      const answers = Object.fromEntries(qs.map((q, k) => [q.id, pick(q, i + k * 7)]));
      const plan = E.buildPlan(id, answers, "test requirement");
      assert.equal(plan.steps.length, 9);
      assert.ok(["starter", "standard", "advanced"].includes(plan.tier));
      assert.ok(plan.serving && !plan.serving.includes("undefined"));
      for (const s of plan.steps) {
        assert.ok(s.checklist.length > 0);
        for (const sec of s.sections) for (const it of sec.items) assert.ok(!String(it).includes("undefined"), `${id}/${s.id}: ${it}`);
      }
      const md = E.toMarkdown(plan);
      assert.ok(md.startsWith("# ML Plan"));
      assert.ok(!md.includes("{{"));
    }
  }
});

test("tier selection", () => {
  assert.equal(E.chooseTier("tabular-classification", { data: "none", labels: "no", skill: "expert" }), "starter");
  assert.equal(E.chooseTier("tabular-classification", { data: "large", labels: "yes", skill: "expert", budget: "high" }), "advanced");
  assert.equal(E.chooseTier("text-classification", { data: "medium", labels: "yes", skill: "intermediate" }), "standard");
  // Labels are implicit for forecasting, so "no" labels must not force starter.
  assert.equal(E.chooseTier("forecasting", { data: "medium", labels: "no", skill: "intermediate" }), "standard");
});

test("user requirement is HTML-escaped in the plan", () => {
  const plan = E.buildPlan("llm-rag", {}, "<img src=x onerror=alert(1)>");
  const item = plan.steps[0].sections[0].items[0];
  assert.ok(!item.includes("<img"));
  assert.ok(item.includes("&lt;img"));
});

test("glossary covers every {{term}} used in the knowledge base", () => {
  const src = JSON.stringify([KB.USE_CASES, KB.TRAINING_TOPICS]);
  const terms = [...src.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]);
  for (const t of terms) assert.ok(KB.GLOSSARY[t], `missing glossary term: ${t}`);
});

test("every cloud service on the comparison page has advantages", () => {
  for (const cloud of Object.keys(KB.INFRA)) {
    for (const [key] of KB.INFRA_COMPONENTS) {
      assert.ok(KB.INFRA[cloud][key], `${cloud}.${key} has no service`);
      const adv = (KB.INFRA_ADVANTAGES[cloud] || {})[key];
      assert.ok(Array.isArray(adv) && adv.length >= 2, `${cloud}.${key} needs at least 2 advantages`);
    }
  }
});

test('"Not sure" answers use the question\'s default and are listed as assumptions', () => {
  const plan = E.buildPlan("forecasting", { cloud: "unsure", budget: "unsure", skill: "beginner" }, "");
  const cloudQ = KB.QUESTIONS.find(q => q.id === "cloud");
  assert.equal(plan.answers.cloud, cloudQ.assume);
  assert.equal(plan.infraName, KB.INFRA[cloudQ.assume].name);
  assert.deepEqual(plan.assumed.map(x => x.id), ["cloud", "budget"]);
  assert.ok(plan.assumed.every(x => x.label && x.label !== "Not sure"));
  assert.match(E.toMarkdown(plan), /## Assumptions/);
  assert.deepEqual(E.buildPlan("forecasting", { cloud: "aws" }, "").assumed, []);
  // Every question offering "Not sure" says what it assumes, and the assumption is a real option.
  for (const q of KB.QUESTIONS.filter(q => q.options.some(o => o.value === "unsure"))) {
    assert.ok(q.options.some(o => o.value === q.assume && o.value !== "unsure"), q.id);
  }
});

test('"Not sure" survives a share link', () => {
  const token = E.encodeShare({ useCaseId: "speech", answers: { data: "unsure", privacy: "unsure" }, requirement: "" });
  assert.deepEqual(E.decodeShare(token).answers, { data: "unsure", privacy: "unsure" });
});

test("cost estimate matches how the model runs", () => {
  const cost = deploy => E.buildPlan("tabular-classification", { deploy, budget: "medium", data: "medium", skill: "intermediate" }, "").cost;
  assert.match(cost("api"), /always-on/);
  assert.doesNotMatch(cost("batch"), /always-on/);
  assert.match(cost("batch"), /nothing runs between jobs/);
  assert.match(cost("edge"), /on the devices/);
});

test("every word a question promises to explain has a plain-English definition", () => {
  for (const q of KB.QUESTIONS) {
    for (const t of q.terms || []) {
      assert.ok(KB.GLOSSARY[t], `${q.id}: no glossary entry for "${t}"`);
      const text = [q.title, q.help, ...q.options.flatMap(o => [o.label, o.hint])].join(" ").toLowerCase();
      const stem = t.toLowerCase().replace(/(ing|ed|s)$/, "").split(" ")[0];
      assert.ok(text.includes(stem.slice(0, 4)), `${q.id}: "${t}" isn't used in the question`);
    }
  }
});

test("everyday tech words get a tooltip once per step, never inside code, links or hand-marked words", () => {
  const span = t => `<span class="term" tabindex="0" data-term="${t}">`;
  const seen = new Set();
  const a = E.explainTerms("Train on a GPU. More GPUs help.", seen);
  assert.equal(a.split(span("GPU")).length - 1, 1, "first mention only");
  assert.ok(!E.explainTerms("Rent a GPU", seen).includes("<span"), "already explained earlier in the step");
  assert.equal(E.explainTerms("<code>API_URL</code> <a href='/x'>API docs</a> {{GPU}} and a GPU"),
    "<code>API_URL</code> <a href='/x'>API docs</a> {{GPU}} and a GPU");
  assert.match(E.explainTerms("<b>Docker</b> then managed services"), /<b><span class="term"[^>]*data-term="Docker">Docker<\/span><\/b> then <span[^>]*data-term="managed service">managed services<\/span>/);
  assert.ok(!E.explainTerms("edge cases and batch size").includes("<span"), "ordinary words are left alone");
  for (const t of Object.keys(E.AUTO_TERMS)) assert.ok(KB.GLOSSARY[t], `no glossary entry for ${t}`);
});

test("every generated plan's text survives term marking unchanged apart from the tooltips", () => {
  for (const id of Object.keys(KB.USE_CASES)) {
    const plan = E.buildPlan(id, { data: "small", skill: "beginner", deploy: "realtime", latency: "fast", cloud: "aws", budget: "low", privacy: "no" }, "");
    for (const s of plan.steps) {
      const seen = new Set();
      for (const text of [s.why, s.tip, ...s.sections.flatMap(x => x.items)]) {
        const out = E.explainTerms(text, seen);
        assert.equal(out.replace(/<span class="term" tabindex="0" data-term="[^"]+">([^<]*)<\/span>/g, "$1"), String(text));
      }
    }
  }
});
