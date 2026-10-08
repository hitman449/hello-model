// The self-hosted fonts (fonts/, made by scripts/subset-fonts.py) cover every character the site shows.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const coverage = require("../fonts/coverage.json");
const files = ["index.html", "scripts/guides.js", "scripts/pages.js", "scripts/build-site.js",
  ...fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f),
  ...fs.readdirSync(path.join(root, "js/widgets")).map(f => "js/widgets/" + f)];
const text = files.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("");

// Symbols that come from the system's symbol font on purpose (no web font in the Latin set has them),
// emoji, and combining marks that only appear inside regular expressions.
const SYSTEM = new Set([..."→←↑↓≥≈✓☑☐↺⌘"]);
const allowed = c => SYSTEM.has(c) || c.codePointAt(0) >= 0x1f000 || (c.codePointAt(0) >= 0x300 && c.codePointAt(0) <= 0x36f);

test("every character the site shows is in the interface and reading fonts", () => {
  const used = [...new Set(text)].filter(c => c.codePointAt(0) >= 0x20 && c !== " ");
  for (const font of ["source-sans-3-latin-wght-normal", "newsreader-latin-wght-normal"]) {
    const missing = used.filter(c => !coverage[font].includes(c) && !allowed(c));
    assert.deepEqual(missing, [], `${font} lacks ${missing.join(" ")}: run python3 scripts/subset-fonts.py`);
  }
});

test("the font files the stylesheet loads exist, and stay small", () => {
  const css = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
  const urls = [...css.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map(m => m[1]);
  assert.equal(urls.length, 5);
  for (const f of urls) {
    const size = fs.statSync(path.join(root, "fonts", f)).size;
    assert.ok(size < 45 * 1024, `${f} is ${Math.round(size / 1024)} KB`);
  }
});
