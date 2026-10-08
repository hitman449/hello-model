// Share links recreate a plan in a different browser profile.
const { test, expect, prepare, buildPlan } = require("./fixtures");

const REQUIREMENT = "Forecast daily sales for each store — prévision des ventes 📈";

async function sharedLink(page, withProgress = true) {
  await buildPlan(page, REQUIREMENT);
  const boxes = page.locator(".checklist input");
  await boxes.nth(0).check();
  await boxes.nth(2).check();
  await page.click("#shareBtn");
  await expect(page.locator("#shareDialog")).toBeVisible();
  if (!withProgress) await page.uncheck("#shareProgress");
  const url = await page.inputValue("#shareUrl");
  expect(url).toMatch(/#\/share\/[A-Za-z0-9_-]+$/);
  return url;
}

async function freshPage(browser, opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = await prepare(page);
  return { ctx, page, errors };
}

const savedPlans = page => page.evaluate(() => JSON.parse(localStorage.getItem("hello-model-plans-v1") || "[]").length);

test("a share link opens the same plan, with progress, in a fresh browser", async ({ page, browser, baseURL }) => {
  const url = await sharedLink(page);
  const { ctx, page: other, errors } = await freshPage(browser, { baseURL, viewport: { width: 390, height: 844 } });
  await other.goto(url);
  await expect(other.locator("#screen-plan")).toBeVisible();
  await expect(other.locator("#planReq")).toHaveText(`“${REQUIREMENT}”`);
  await expect(other.locator("#overallPct")).toContainText("2/");
  await expect(other.locator("#toast")).toHaveText("Shared plan opened and saved to My plans.");
  await expect(other).toHaveURL(/#\/build$/);
  expect(await savedPlans(other)).toBe(1);

  await other.reload();
  await expect(other.locator("#screen-plan")).toBeVisible();
  await other.goto(url);
  await expect(other.locator("#toast")).toHaveText("Opened your saved copy of this shared plan.");
  expect(await savedPlans(other)).toBe(1);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("a link without progress starts at zero", async ({ page, browser, baseURL }) => {
  const url = await sharedLink(page, false);
  const { ctx, page: other, errors } = await freshPage(browser, { baseURL });
  await other.goto(url);
  await expect(other.locator("#overallPct")).toHaveText("Not started · 9 steps");
  expect(errors).toEqual([]);
  await ctx.close();
});

test("a broken share link shows a message instead of failing", async ({ page }) => {
  await page.goto("./#/share/this-is-not-a-real-token");
  await expect(page.locator("#toast")).toHaveText("This share link is broken or incomplete.");
  await expect(page).toHaveURL(/#\/build$/);
  await expect(page.locator("#screen-describe")).toBeVisible();
});
