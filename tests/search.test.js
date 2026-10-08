// Site search: ranking and the index the build generates.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const S = require("../js/search.js");
const { build } = require("../scripts/build-site.js");

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "hm-search-"));
build({ outDir, version: "test" });
test.after(() => fs.rmSync(outDir, { recursive: true, force: true }));
const index = JSON.parse(fs.readFileSync(path.join(outDir, "search-index.json"), "utf8"));
const top = q => (S.rank(index, q)[0] || {}).u;

test("common searches land on the right page first", () => {
  assert.equal(top("churn"), "/guides/customer-churn/");
  assert.equal(top("forecasting"), "/models/forecasting/");
  assert.equal(top("forec"), "/models/forecasting/");          // partial words work
  assert.equal(top("overfitting"), "/training/fit/");
  assert.equal(top("spam filter"), "/guides/spam-filter/");
  assert.equal(top("S3"), "/clouds/aws/");                      // service names find their cloud
  assert.equal(top("precision"), "/glossary/#term-precision");
  assert.equal(top("example plan"), "/#/example");
  assert.equal(top("Forécasting"), "/models/forecasting/");     // accents and case don't matter
});

test("every query word must match, and nonsense finds nothing", () => {
  assert.deepEqual(S.rank(index, "zzqx"), []);
  assert.deepEqual(S.rank(index, "   "), []);
  assert.ok(S.rank(index, "spam qqqq").length === 0);
  assert.ok(S.rank(index, "a").length <= 8);
});

test("the index covers every page and glossary term, and every link resolves", () => {
  const urls = new Set(index.map(e => e.u));
  const sitemap = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf8");
  for (const [, loc] of sitemap.matchAll(/<loc>https:\/\/sayhellomodel\.com([^<]*)<\/loc>/g)) {
    if (loc !== "/") assert.ok(urls.has(loc), `search index is missing ${loc}`);
  }
  const glossary = fs.readFileSync(path.join(outDir, "glossary/index.html"), "utf8");
  for (const e of index) {
    assert.ok(e.t && e.k && e.d, JSON.stringify(e));
    if (e.u.startsWith("/#/")) continue;
    const [page, anchor] = e.u.split("#");
    assert.ok(fs.existsSync(path.join(outDir, page, "index.html")), e.u);
    if (anchor) assert.ok(glossary.includes(`id="${anchor}"`), e.u);
  }
  assert.ok(fs.statSync(path.join(outDir, "search-index.json")).size < 60000, "index stays small");
});
