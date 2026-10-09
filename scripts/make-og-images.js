/*
 * Link-preview images (Open Graph): what shows up when someone shares a Hello Model link.
 * Renders an HTML template with the site's own fonts and colors to 1200×630 PNGs:
 *   img/og/default.png          the home page and every page without its own image
 *   img/og/guide-<id>.png       one per guide, with the guide's title
 * Run after adding or renaming a guide:  node scripts/make-og-images.js
 * (needs Playwright's Chromium; set CHROMIUM_PATH if it isn't found on its own)
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const GUIDES = require("./guides.js");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "img", "og");
// Fonts are inlined: a page made with setContent can't load file:// URLs.
const font = file => `url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, "fonts", file)).toString("base64")})`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const MARK = `<svg width="56" height="56" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="6" fill="#0a6a62"/>
  <path d="M6 17l4.5-4.5 3 2.5L18 8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#fff"><circle cx="6" cy="17" r="2"/><circle cx="10.5" cy="12.5" r="2"/><circle cx="13.5" cy="15" r="2"/><circle cx="18" cy="8" r="2.4"/></g></svg>`;
const CHECK = `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#0a6a62" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function page({ eyebrow, title, sub, side }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: "Source Sans 3"; src: ${font("source-sans-3-latin-wght-normal.woff2")}; font-weight: 200 900; }
    @font-face { font-family: "Newsreader"; src: ${font("newsreader-latin-wght-normal.woff2")}; font-weight: 200 800; }
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; overflow: hidden; background: #f5f7f7; color: #121a1b; font-family: "Source Sans 3", sans-serif;
      display: grid; grid-template-columns: 1fr 380px; gap: 56px; padding: 64px 72px; position: relative; }
    body::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 10px; background: #0a6a62; }
    .left { display: flex; flex-direction: column; }
    .brand { display: flex; align-items: center; gap: 16px; font-family: "Newsreader", serif; font-weight: 600; font-size: 38px; letter-spacing: -.01em; }
    .eyebrow { margin-top: 48px; font-size: 24px; font-weight: 600; color: #0a6a62; text-transform: uppercase; letter-spacing: .08em; }
    h1 { margin-top: 12px; font-family: "Newsreader", serif; font-weight: 600; font-size: ${title.length > 48 ? 56 : 64}px; line-height: 1.1; letter-spacing: -.015em; }
    .sub { margin-top: 20px; font-size: 27px; line-height: 1.35; color: #4a5759; }
    .foot { margin-top: auto; display: flex; gap: 12px; align-items: center; font-size: 22px; color: #4a5759; }
    .foot b { color: #121a1b; font-weight: 600; }
    .card { align-self: center; background: #fcfdfd; border: 1px solid #d7dfe0; border-radius: 20px; padding: 32px; box-shadow: 0 12px 40px rgba(18, 26, 27, .08); }
    .label { font-size: 17px; font-weight: 600; color: #5b696b; text-transform: uppercase; letter-spacing: .06em; }
    .value { margin: 6px 0 22px; font-size: 24px; font-weight: 600; line-height: 1.3; }
    ol { list-style: none; padding: 0; display: grid; gap: 12px; }
    li { display: flex; gap: 12px; align-items: center; font-size: 21px; white-space: nowrap; overflow: hidden; }
    li span:last-child { overflow: hidden; text-overflow: ellipsis; }
    .dot { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex: none; background: #e0efed; color: #0a6a62; font-weight: 700; font-size: 16px; }
    .done .dot { background: #e0efed; }
    .bar { margin-top: 22px; height: 10px; border-radius: 999px; background: #e3e9ea; overflow: hidden; }
    .bar div { width: 34%; height: 100%; background: #0a6a62; border-radius: 999px; }
  </style></head><body>
    <div class="left">
      <div class="brand">${MARK}Hello Model</div>
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h1>${esc(title)}</h1>
      <p class="sub">${esc(sub)}</p>
      <p class="foot"><b>sayhellomodel.com</b> · Free · Your plans stay in your browser</p>
    </div>
    <div class="card">
      <p class="label">${esc(side.label)}</p>
      <p class="value">${esc(side.value)}</p>
      <ol>${side.steps.map((s, i) => `<li class="${i < side.done ? "done" : ""}"><span class="dot">${i < side.done ? CHECK : i + 1}</span><span>${esc(s)}</span></li>`).join("")}</ol>
      <div class="bar"><div></div></div>
    </div>
  </body></html>`;
}

const IMAGES = [
  { file: "default.png", eyebrow: "Machine learning planner", title: "Plan your machine learning project in three minutes",
    sub: "Describe your idea. Get the right model, tools, cloud setup and a cost estimate, step by step.",
    side: { label: "Recommended approach", value: "Gradient-boosted trees (LightGBM)", done: 2,
      steps: ["Define the problem", "Set up your workspace", "Collect and label data", "Build a baseline", "Deploy and monitor"] } },
  ...GUIDES.map(g => ({ g, steps: g.blocks.filter(b => b[0] === "h2" && /^Step \d+:/.test(b[1])).map(b => b[1].replace(/^Step \d+:\s*/, "")) })).map(({ g, steps }) => ({
    file: `guide-${g.id}.png`, eyebrow: "Step-by-step guide", title: g.title.replace(/^How to /, "").replace(/^./, c => c.toUpperCase()),
    sub: `${steps.length} steps from the first decision to production, with code you can copy.`,
    side: { label: "Built with", value: g.tools, done: 1,
      steps: steps.slice(0, 5) }
  }))
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const img of IMAGES) {
    await tab.setContent(page(img), { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: path.join(OUT, img.file), type: "png" });
    console.log("wrote img/og/" + img.file);
  }
  await browser.close();
})();
