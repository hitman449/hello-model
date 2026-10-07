// Share-link encoding. Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/engine.js");

const sample = {
  useCaseId: "llm-rag",
  answers: { data: "small", skill: "beginner", deploy: "api", latency: "interactive", cloud: "gcp", budget: "medium", privacy: "yes" },
  requirement: "Chatbot über unsere HR-Richtlinien 📄 — answers in Hindi too: नमस्ते",
  checks: { "define:0": true, "define:2": true, "deploy:1": true }
};

test("round-trips answers, unicode requirement and progress", () => {
  const back = E.decodeShare(E.encodeShare(sample));
  assert.equal(back.useCaseId, sample.useCaseId);
  assert.deepEqual(back.answers, sample.answers);
  assert.equal(back.requirement, sample.requirement);
  assert.deepEqual(back.checks, sample.checks);
});

test("progress can be left out", () => {
  const back = E.decodeShare(E.encodeShare(sample, false));
  assert.deepEqual(back.checks, {});
  assert.deepEqual(back.answers, sample.answers);
});

test("token is URL-safe and reasonably short", () => {
  const t = E.encodeShare(sample);
  assert.match(t, /^[A-Za-z0-9_-]+$/);
  assert.ok(t.length < 400, `length ${t.length}`);
});

test("every use case and answer combination round-trips", () => {
  const KB = require("../js/knowledge.js");
  for (const id of Object.keys(KB.USE_CASES)) {
    for (let i = 0; i < 4; i++) {
      const answers = Object.fromEntries(KB.QUESTIONS.map(q => [q.id, q.options[i % q.options.length].value]));
      const back = E.decodeShare(E.encodeShare({ useCaseId: id, answers, requirement: "x", checks: {} }));
      assert.deepEqual(back.answers, answers);
    }
  }
});

test("broken or tampered tokens are rejected", () => {
  const enc = obj => Buffer.from(JSON.stringify(obj)).toString("base64url");
  for (const bad of [
    "", "not-base64!!", "abc", enc({}), enc({ v: 2, u: "llm-rag", a: "--------", r: "" }),
    enc({ v: 1, u: "nope", a: "--------", r: "" }),
    enc({ v: 1, u: "__proto__", a: "--------", r: "" }),
    enc({ v: 1, u: "llm-rag", a: "9-------", r: "" }),
    enc({ v: 1, u: "llm-rag", a: "--", r: "" }),
    enc({ v: 1, u: "llm-rag", a: "--------", r: 5 }),
    enc({ v: 1, u: "llm-rag", a: "--------", r: "x".repeat(2001) }),
    enc({ v: 1, u: "llm-rag", a: "--------", r: "", c: "zz" })
  ]) assert.equal(E.decodeShare(bad), null, bad);
});

test("decoded requirement is plain text; HTML in it is escaped when the plan renders", () => {
  const t = E.encodeShare({ useCaseId: "llm-rag", answers: {}, requirement: "<img src=x onerror=alert(1)>" });
  const d = E.decodeShare(t);
  const plan = E.buildPlan(d.useCaseId, d.answers, d.requirement);
  assert.ok(!plan.steps[0].sections[0].items[0].includes("<img"));
});
