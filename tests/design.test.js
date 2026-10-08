// The design system (DESIGN.md): type sizes come from the scale, spacing sits on the 4px grid, and every icon exists.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const KB = require("../js/knowledge.js");
const { ICONS, svg } = require("../js/icons.js");

const css = fs.readFileSync(path.join(__dirname, "../css/styles.css"), "utf8");
// Print styles use points on purpose; leave them out.
const screenCss = css.split("@media print")[0];
const lines = screenCss.split("\n");

test("every font size uses a type-scale token", () => {
  for (const [i, line] of lines.entries()) {
    for (const [, value] of line.matchAll(/font-size:\s*([^;}]+)/g)) {
      const ok = /^var\(--fs-[a-z0-9]+\)$/.test(value.trim()) || /^(inherit|[.\d]+em)$/.test(value.trim()) ||
        /^body \{ font-size: 16px; \}$/.test(line.trim()); // phones: 16px keeps iOS from zooming into inputs
      assert.ok(ok, `styles.css:${i + 1}: font-size ${value.trim()} is not a --fs-* token`);
    }
  }
});

test("spacing sits on the 4px grid", () => {
  const props = /(?:^|[\s;{])(padding|margin|gap|row-gap|column-gap|inset)(?:-[a-z]+)?:\s*([^;}]+)/g;
  for (const [i, line] of lines.entries()) {
    for (const [, prop, value] of line.matchAll(props)) {
      for (const [, px] of value.matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
        const n = Math.abs(Number(px));
        assert.ok(n < 4 || n % 4 === 0, `styles.css:${i + 1}: ${prop} ${px}px is off the 4px grid`);
      }
    }
  }
});

test("every model type has a line icon", () => {
  for (const [id, uc] of Object.entries(KB.USE_CASES)) {
    assert.ok(ICONS[uc.icon], `${id}: no icon called "${uc.icon}"`);
    assert.match(svg(uc.icon), /^<svg class="i" [^>]*aria-hidden="true">/);
  }
  assert.equal(svg("no-such-icon"), "");
});
