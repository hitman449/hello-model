// No sideways scrolling anywhere, and the sidebar behaves on every screen size.
const { test, expect, horizontalOverflow } = require("./fixtures");

const ROUTES = ["build", "plans", "models", "models/image-classification", "training", "clouds", "glossary", "privacy"];
const SIZES = [[1366, 860, "desktop"], [1024, 768, "small laptop"], [390, 844, "phone"]];

for (const [w, h, label] of SIZES) {
  test(`no horizontal scrolling on any page (${label}, ${w}px)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    for (const route of ROUTES) {
      await page.goto(`./#/${route}`);
      await expect(page.locator(".screen:not(.hidden)")).toHaveCount(1);
      expect(await horizontalOverflow(page), `#/${route}`).toBeLessThanOrEqual(0);
    }
  });

  test(`cloud comparison table fits without scrolling (${label}, ${w}px)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("./#/clouds");
    for (const pick of ["all", "aws"]) {
      await page.click(`[data-cloud=${pick}]`);
      const wrap = page.locator("#screen-clouds .table-wrap");
      expect(await wrap.evaluate(el => el.scrollWidth - el.clientWidth), pick).toBeLessThanOrEqual(0);
    }
    expect(await page.locator("#cloudSeg").evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("mobile drawer opens from the menu and closes after navigating", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.click("#menuBtn");
  await expect(page.locator("body")).toHaveClass(/nav-open/);
  await page.click(".side-nav a[data-route=training]");
  await expect(page.locator("body")).not.toHaveClass(/nav-open/);
  await expect(page.locator("#screen-training")).toBeVisible();
});

test("collapsed sidebar is remembered after a reload", async ({ page }) => {
  await page.goto("./");
  await page.click("#collapseBtn");
  await expect(page.locator("body")).toHaveClass(/sidebar-collapsed/);
  await page.reload();
  await expect(page.locator("body")).toHaveClass(/sidebar-collapsed/);
  expect((await page.locator("#sidebar").boundingBox()).width).toBeLessThan(100);
});
