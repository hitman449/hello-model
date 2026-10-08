// Detection quality benchmarks. Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const KB = require("../js/knowledge.js");
const E = require("../js/engine.js");

function score(file) {
  const set = require(`./fixtures/${file}`);
  // correct: confident and right. offered: right, or the right type is among the choices we ask about.
  // asked: too weak to guess, so the user gets the "what will your model work with?" question.
  let correct = 0, offered = 0, asked = 0;
  for (const { text, expect } of set) {
    const r = E.classify(text);
    if (r[0].score < E.MIN_SCORE) { asked++; continue; }
    if (r[0].id === expect) correct++;
    if (r[0].id === expect || E.ambiguousTop(r).includes(expect)) offered++;
  }
  return { n: set.length, correct, offered, asked, wrong: set.length - offered - asked };
}

// Floors sit at the measured level, so any regression fails the build.
// requirements-dev.json was used for tuning; holdout2 and everyday were written before the changes they
// measure and never tuned against.
test("dev set: correct model type for at least 95%", () => {
  const s = score("requirements-dev.json");
  assert.ok(s.correct / s.n >= 0.95, JSON.stringify(s));
});

test("everyday wording: at least 75% right, at most 15% confidently wrong", () => {
  // Plain, non-technical descriptions (bakeries, gyms, car parks). Before the everyday vocabulary: 27 right, 9 wrong.
  const s = score("requirements-everyday.json");
  assert.ok(s.correct / s.n >= 0.75, JSON.stringify(s));
  assert.ok(s.wrong / s.n <= 0.15, JSON.stringify(s));
});

test("fresh holdout: at most 25% confidently wrong; the rest right or asked", () => {
  const s = score("requirements-holdout2.json");
  assert.ok(s.correct / s.n >= 0.6, JSON.stringify(s));
  assert.ok(s.wrong / s.n <= 0.25, JSON.stringify(s));
});

test("word forms match their base keyword", () => {
  assert.deepEqual(E.tokenize("Forecasting forecasts"), ["forecast", "forecast"]);
  assert.deepEqual(E.tokenize("chest X-rays"), ["chest", "x", "ray"]);
  assert.equal(E.classify("We need forecasting of sales")[0].id, "forecasting");
});

test("plurals and -ing forms agree, and common words never match a keyword", () => {
  assert.equal(E.stem("recordings"), E.stem("recording"));
  assert.deepEqual(E.tokenize("theme themes them"), ["theme", "theme", "them"]);
  const r = E.classify("We get 500 emails a day and want to sort them into billing, technical and sales");
  assert.ok(!r[0].matched.includes("theme"), r[0].matched.join());
});

test("a word matching two keywords with the same base form counts once", () => {
  const r = E.classify("Group customer feedback into categories like price, quality and delivery");
  const reg = r.find(x => x.id === "regression");
  assert.ok(!(reg.matched.includes("price") && reg.matched.includes("pricing")), reg.matched.join());
  assert.equal(r[0].id, "text-classification");
});

test("negative phrases: 'hate speech' is text, not audio", () => {
  assert.equal(E.classify("Detect hate speech in forum posts")[0].id, "text-classification");
  assert.equal(E.classify("Convert speech in recorded calls to text")[0].id, "speech");
});

test("ambiguousTop asks only when the top scores are close", () => {
  assert.deepEqual(E.ambiguousTop(E.classify("nothing relevant here")), []);
  assert.ok(E.classify("I have a hunch our numbers will go up")[0].score < E.MIN_SCORE);
  assert.deepEqual(E.ambiguousTop(E.classify("Forecast daily sales for each store next month")), []);
  const close = E.ambiguousTop([{ id: "a", score: 10 }, { id: "b", score: 8 }, { id: "c", score: 2 }]);
  assert.deepEqual(close, ["a", "b"]);
});

test("every model type has a plain-English question, and data types point at real model types", () => {
  for (const [id, uc] of Object.entries(KB.USE_CASES)) assert.ok(uc.question && uc.question.length > 20, id);
  const covered = new Set();
  for (const dt of KB.DATA_TYPES) {
    assert.ok(dt.ids.length >= 1, dt.label);
    for (const id of dt.ids) { assert.ok(KB.USE_CASES[id], `${dt.label} -> ${id}`); covered.add(id); }
  }
  for (const id of Object.keys(KB.USE_CASES)) assert.ok(covered.has(id), `no data type leads to ${id}`);
});
