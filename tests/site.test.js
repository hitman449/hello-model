// The generated Learn pages: every page is complete, findable and has no broken internal links.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build, SITE } = require("../scripts/build-site.js");
const KB = require("../js/knowledge.js");
const GUIDES = require("../scripts/guides.js");

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "hm-site-"));
const { pages } = build({ outDir, version: "abc1234", date: "2026-10-07" });
test.after(() => fs.rmSync(outDir, { recursive: true, force: true }));

const fileFor = p => path.join(outDir, p.endsWith("/") ? p + "index.html" : p);
const read = p => fs.readFileSync(fileFor(p), "utf8");
const htmlFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? htmlFiles(path.join(dir, d.name)) : d.name.endsWith(".html") ? [path.join(dir, d.name)] : []);
const one = (html, re) => { const m = html.match(re); return m && m[1]; };

test("a page exists for every model type, lesson and cloud", () => {
  for (const id of Object.keys(KB.USE_CASES)) assert.ok(pages.includes(`/models/${id}/`), id);
  for (const t of KB.TRAINING_TOPICS) assert.ok(pages.includes(`/training/${t.id}/`), t.id);
  for (const id of Object.keys(KB.INFRA)) assert.ok(pages.includes(`/clouds/${id}/`), id);
  for (const g of GUIDES) assert.ok(pages.includes(`/guides/${g.id}/`), g.id);
  for (const p of ["/", "/guides/", "/models/", "/training/", "/clouds/", "/glossary/", "/about/", "/contact/", "/privacy/"]) assert.ok(pages.includes(p), p);
  for (const p of pages) assert.ok(fs.existsSync(fileFor(p)), p);
  assert.ok(fs.existsSync(fileFor("/404.html")));
});

test("every page has its own title, description, canonical URL and one h1", () => {
  const titles = new Set(), descriptions = new Set();
  for (const p of pages) {
    const html = read(p);
    const title = one(html, /<title>([^<]+)<\/title>/);
    const desc = one(html, /<meta name="description" content="([^"]+)">/);
    assert.ok(title && desc, `${p}: title and description`);
    assert.ok(desc.length <= 170, `${p}: description is ${desc.length} chars`);
    assert.ok(!titles.has(title), `${p}: duplicate title "${title}"`);
    assert.ok(!descriptions.has(desc), `${p}: duplicate description`);
    titles.add(title); descriptions.add(desc);
    assert.equal(one(html, /<link rel="canonical" href="([^"]+)">/), SITE + p, `${p}: canonical`);
    assert.equal(one(html, /<meta property="og:url" content="([^"]+)">/), SITE + p, `${p}: og:url`);
    if (p === "/") {
      // The app is several screens in one page; each screen has its own h1, and only one is visible at a time.
      const screens = html.split(/<section class="screen/).slice(1);
      for (const sc of screens) assert.ok((sc.match(/<h1[\s>]/g) || []).length <= 1, `${p}: one h1 per screen`);
      assert.match(screens[0], /^[^>]*id="screen-describe"[\s\S]*<h1[\s>]/, "the home screen has an h1");
    } else {
      assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${p}: exactly one h1`);
    }
  }
  assert.match(read("/404.html"), /<meta name="robots" content="noindex">/);
});

test("glossary markers are all turned into tooltips", () => {
  for (const file of htmlFiles(outDir)) assert.ok(!/\{\{|\}\}/.test(fs.readFileSync(file, "utf8")), path.relative(outDir, file));
  assert.match(read("/models/tabular-classification/"), /<span class="term" tabindex="0" data-term="F1 score">F1 score<\/span>/);
});

test("every internal link points at a page that exists", () => {
  for (const file of htmlFiles(outDir)) {
    const html = fs.readFileSync(file, "utf8");
    for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
      if (href === "/") continue;
      const target = path.join(outDir, href.endsWith("/") ? href + "index.html" : href);
      assert.ok(fs.existsSync(target), `${path.relative(outDir, file)} links to missing ${href}`);
    }
  }
});

test("the shared sidebar marks the current section", () => {
  assert.match(read("/models/speech/"), /data-route="models" class="active" aria-current="page"/);
  assert.match(read("/training/"), /data-route="training" class="active" aria-current="page"/);
  assert.ok(!/class="active" aria-current/.test(read("/about/")));
});

test("the home page links to every model guide", () => {
  const home = read("/");
  for (const id of Object.keys(KB.USE_CASES)) assert.ok(home.includes(`href="/models/${id}/"`), id);
  assert.ok(!home.includes("build:home-guides"));
});

test("sitemap lists every indexable page and robots.txt points to it", () => {
  const xml = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(locs, pages.map(p => SITE + p));
  assert.ok(!locs.some(l => l.includes("404")));
  assert.match(xml, /<lastmod>2026-10-07<\/lastmod>/);
  assert.match(fs.readFileSync(path.join(outDir, "robots.txt"), "utf8"), /Sitemap: https:\/\/sayhellomodel\.com\/sitemap\.xml/);
});

test("every CSS and JS link carries the version, and the files exist", () => {
  for (const file of htmlFiles(outDir)) {
    const html = fs.readFileSync(file, "utf8");
    const assets = [...html.matchAll(/(?:href|src)="(\/(?:css|js)\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(assets.length >= 2, path.relative(outDir, file));
    for (const a of assets) {
      assert.match(a, /\?v=abc1234$/, `${path.relative(outDir, file)}: ${a}`);
      assert.ok(fs.existsSync(path.join(outDir, a.split("?")[0])), a);
    }
  }
  assert.ok(fs.existsSync(path.join(outDir, "ads.txt")));
});

test("guides are complete and linked from their model page and the home page", () => {
  const ids = new Set();
  for (const g of GUIDES) {
    assert.ok(!ids.has(g.id), `duplicate guide id ${g.id}`); ids.add(g.id);
    assert.ok(KB.USE_CASES[g.model], `${g.id}: unknown model ${g.model}`);
    const html = read(`/guides/${g.id}/`);
    // Long-form: the guide's own prose, not counting code or the page around it.
    const body = html.match(/<article class="guide-body prose">([\s\S]*?)<\/article>/)[1];
    const words = body.replace(/<pre>[\s\S]*?<\/pre>|<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 600, `${g.id}: only ${words} words of prose`);
    assert.ok(html.includes(`href="/#/start/${g.model}"`), `${g.id}: links to a personalised plan`);
    // Every step in the table of contents points at a heading on the page.
    for (const [, anchor] of html.matchAll(/<li><a href="#([^"]+)">/g)) assert.ok(html.includes(`id="${anchor}"`), `${g.id}: #${anchor}`);
    assert.ok(read(`/models/${g.model}/`).includes(`href="/guides/${g.id}/"`), `${g.model} page links to ${g.id}`);
    assert.ok(read("/").includes(`href="/guides/${g.id}/"`), `home links to ${g.id}`);
  }
});
