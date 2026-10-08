// Color contrast (WCAG 2.1 AA), checked on the design tokens in css/styles.css, in both themes.
// Text needs 4.5:1. Input edges, focus rings, icons and chart marks need 3:1.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "../css/styles.css"), "utf8");
const block = selector => {
  const start = css.indexOf(selector + " {");
  assert.ok(start >= 0, `missing ${selector} block`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]));
};
const light = block(":root");
const dark = { ...light, ...block(':root[data-theme="dark"]') };
const darkMedia = block(':root:not([data-theme="light"])');

const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const TEXT = [["text", "bg"], ["text", "surface"], ["text-2", "surface"], ["muted", "bg"], ["muted", "surface"], ["muted", "surface-2"], ["muted", "side-bg"],
  ["accent", "bg"], ["accent", "surface"], ["accent", "accent-soft"], ["on-accent", "accent"], ["text", "accent-soft"], ["text", "warn-bg"],
  ["ok", "surface"], ["ok", "ok-bg"], ["warn", "warn-bg"], ["danger", "danger-bg"], ["info", "info-bg"], ["code-text", "code-bg"]];
const UI = [["control", "surface"], ["control", "bg"], ["focus", "surface"], ["focus", "bg"],
  ...["c1", "c2", "c3", "c4"].flatMap(c => [[c, "surface"], [c, "bg"]])];

for (const [name, theme] of [["light", light], ["dark", dark]]) {
  test(`${name} theme: text and interface colors meet WCAG AA contrast`, () => {
    for (const [pairs, min] of [[TEXT, 4.5], [UI, 3]]) {
      for (const [fg, bg] of pairs) {
        assert.ok(theme["--" + fg] && theme["--" + bg], `${name}: token --${fg} or --${bg} is missing`);
        const r = ratio(theme["--" + fg], theme["--" + bg]);
        assert.ok(r >= min, `${name}: --${fg} on --${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
      }
    }
  });
}

test("the dark theme is the same whether chosen by the system or by the toggle", () => {
  assert.deepEqual(darkMedia, block(':root[data-theme="dark"]'));
});
