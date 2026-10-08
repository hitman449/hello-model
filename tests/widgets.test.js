// The interactive lesson widgets' logic (js/widgets/*.js): each one teaches what its text says it does.
const test = require("node:test");
const assert = require("node:assert/strict");
const fit = require("../js/widgets/fit.js");
const splits = require("../js/widgets/splits.js");
const threshold = require("../js/widgets/threshold.js");
const gradient = require("../js/widgets/gradient.js");

test("overfitting: simple models underfit, middling ones fit, very complex ones overfit", () => {
  const errs = fit.errorsByDegree(fit.makePoints());
  const kinds = errs.map(e => fit.verdict(errs, e.degree));
  assert.equal(kinds[0], "under");
  assert.ok(kinds.includes("good"));
  assert.equal(kinds[11], "over");
  // The order never goes backwards: under… then good… then over.
  assert.deepEqual(kinds, [...kinds].sort((a, b) => ["under", "good", "over"].indexOf(a) - ["under", "good", "over"].indexOf(b)));
  assert.ok(errs[11].train < errs[2].train, "more complexity always fits the training data better");
  assert.ok(errs[11].test > errs[2].test, "…but does worse on new data");
});

test("splits: rows add up, and the warnings match the advice in the lesson", () => {
  assert.deepEqual(splits.split(1000, 15, 15), { train: 700, val: 150, test: 150 });
  const s = splits.split(10000, 10, 20);
  assert.equal(s.train + s.val + s.test, 10000);
  assert.deepEqual(splits.warnings(1000, 15, 15), []);
  assert.match(splits.warnings(200, 15, 15).join(" "), /cross-validation/);
  assert.match(splits.warnings(1000, 30, 30).join(" "), /Less than 60%/);
  assert.match(splits.warnings(100000, 20, 20).join(" "), /5–10%/);
});

test("threshold: a stricter filter blocks more real email, a looser one lets more spam through", () => {
  const strict = threshold.score(0.3), loose = threshold.score(0.85);
  assert.ok(strict.fp > loose.fp && strict.recall > loose.recall && strict.precision < loose.precision);
  for (let t = 0.05; t <= 0.95; t += 0.05) {
    const r = threshold.score(t);
    assert.equal(r.tp + r.fp + r.fn + r.tn, threshold.EMAILS.length);
  }
  // There is a sensible middle: few real emails blocked and most spam caught.
  assert.ok([0.6, 0.65, 0.7].every(t => { const r = threshold.score(t); return r.fp <= 2 && r.recall >= 0.7; }));
});

test("learning rate: too small is slow, middling converges, too big diverges", () => {
  const kinds = gradient.RATES.map(r => gradient.verdict(r).kind);
  assert.equal(kinds[0], "slow");
  assert.ok(kinds.includes("good") && kinds.includes("bouncy"));
  assert.equal(kinds[kinds.length - 1], "diverges");
  assert.ok(Math.abs(gradient.run(0.2).at(-1)) < 0.01);
});
