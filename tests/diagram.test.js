// The architecture diagram (js/diagram.js) and the plan's time estimates.
const test = require("node:test");
const assert = require("node:assert/strict");
const KB = require("../js/knowledge.js");
const E = require("../js/engine.js");
const D = require("../js/diagram.js");

const ANSWERS = { data: "medium", skill: "intermediate", latency: "relaxed", cloud: "aws", budget: "medium", privacy: "no" };
const plans = Object.keys(KB.USE_CASES).flatMap(id => ["batch", "realtime", "edge"].map(deploy => E.buildPlan(id, { ...ANSWERS, deploy }, "")));
// Boxes in the same row must not share any horizontal space; rows themselves never overlap (fixed height).
const overlap = (a, b) => Math.abs(a.y - b.y) < 1 && a.x < b.x + b.w && b.x < a.x + a.w;

test("every plan's diagram fits its width without overlapping boxes, at phone and desktop sizes", () => {
  for (const plan of plans) {
    for (const width of [300, 520, 640, 900]) {
      const L = D.layout(plan.architecture, width);
      assert.equal(L.placed.length, plan.architecture.length);
      for (const p of L.placed) assert.ok(p.x >= 0 && p.x + p.w <= width + 0.5, `${plan.useCaseId} @${width}: ${p.n.label} sticks out`);
      for (let i = 0; i < L.placed.length; i++) for (let j = i + 1; j < L.placed.length; j++) {
        assert.ok(!overlap(L.placed[i], L.placed[j]), `${plan.useCaseId} @${width}: ${L.placed[i].n.label} overlaps ${L.placed[j].n.label}`);
      }
      for (const e of L.edges) for (const [x, y] of e.pts) assert.ok(x >= 0 && x <= width && y >= 0 && y <= L.height, `${plan.useCaseId} @${width}: edge out of bounds`);
      assert.equal(L.edges.filter(e => e.feedback).length, 1, "one feedback loop");
    }
  }
});

test("the diagram names every box, and describes itself for screen readers", () => {
  for (const plan of plans) {
    const svg = D.render(plan.architecture, 800);
    for (const n of plan.architecture) assert.ok(svg.includes(`>${E.escapeHtml(n.label)}</text>`), n.label);
    assert.match(svg, /role="img" aria-labelledby="d-title d-desc"/);
    assert.match(svg, /<desc id="d-desc">[^<]*Monitoring[^<]*tells you when to go back to/);
  }
});

test("long descriptions wrap onto at most three lines", () => {
  assert.deepEqual(D.wrap("short", 200), ["short"]);
  const lines = D.wrap("Cron or Prefect/Airflow job running a Python script every night at two in the morning", 120);
  assert.equal(lines.length, 3);
  assert.ok(lines[2].endsWith("…"));
  for (const l of lines) assert.ok(l.length <= Math.floor(120 / 6.8), l);
});

test("every step has a time estimate, and beginners get more time", () => {
  const total = skill => E.buildPlan("tabular-classification", { ...ANSWERS, deploy: "realtime", skill }, "").steps.reduce((n, s) => n + s.hours, 0);
  for (const plan of plans) for (const s of plan.steps) assert.ok(Number.isInteger(s.hours) && s.hours >= 1, `${s.id}: ${s.hours}`);
  assert.ok(total("beginner") > total("intermediate") && total("intermediate") > total("expert"));
  assert.equal(E.formatHours(1), "about 1 hour");
  assert.equal(E.formatHours(5), "about 5 hours");
  assert.equal(E.formatHours(23), "about 4 days");
  assert.match(E.toMarkdown(plans[0]), /\*\*Estimated time:\*\* about \d+ (hours|days) of focused work/);
});
