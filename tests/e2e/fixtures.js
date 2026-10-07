// Shared setup for browser tests.
const base = require("@playwright/test");
const { expect } = base;

/** Keep tests offline and deterministic, and record any page or console errors. */
async function prepare(page) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route(/fonts\.gstatic\.com/, r => r.fulfill({ status: 204, body: "" }));
  return errors;
}

/** `page` fails the test if the site logged any error. */
const test = base.test.extend({
  page: async ({ page }, use) => {
    const errors = await prepare(page);
    await use(page);
    expect(errors, "the page logged errors").toEqual([]);
  }
});

/** Type a description on the home screen and submit it. */
async function describe(page, text) {
  await page.goto("./#/build");
  await page.fill("#requirement", text);
  await page.click("#describeForm button[type=submit]");
}

/** Answer every question (option `pick`, or the last one if fewer) until the plan appears. */
async function answerAll(page, pick = 1) {
  const plan = page.locator("#screen-plan");
  await expect(page.locator("#screen-questions")).toBeVisible();
  for (let i = 0; i < 12 && !(await plan.isVisible()); i++) {
    const before = await page.locator("#qCount").textContent();
    const opts = page.locator("#qCard .q-opt");
    await opts.nth(Math.min(pick, (await opts.count()) - 1)).click();
    await expect(async () => {
      const moved = (await plan.isVisible()) || (await page.locator("#qCount").textContent()) !== before;
      expect(moved).toBe(true);
    }).toPass();
  }
  await expect(plan).toBeVisible();
}

/** Describe, confirm the detected model type, and answer all questions. */
async function buildPlan(page, text, pick = 1) {
  await describe(page, text);
  await page.click("#confirmUc");
  await answerAll(page, pick);
}

/** Pixels the page can scroll sideways (0 = none). */
const horizontalOverflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

module.exports = { test, expect, prepare, describe, answerAll, buildPlan, horizontalOverflow };
