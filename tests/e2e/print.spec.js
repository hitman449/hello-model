// "Save as PDF" prints the whole plan, and only the plan.
const { test, expect, buildPlan } = require("./fixtures");

test("print view contains every step and the checklist ticks", async ({ page }) => {
  await buildPlan(page, "Predict which customers will churn next month from our CRM data", 2);
  await page.locator(".checklist input").first().check();
  await page.evaluate(() => { window.print = () => {}; }); // the real dialog can't run headless
  await page.click("#moreMenu summary");
  await page.click("#pdfBtn");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#printView")).toBeVisible();
  await expect(page.locator(".shell")).toBeHidden();
  await expect(page.locator("#printView .pv-step")).toHaveCount(9);
  expect(await page.locator("#printView pre").count()).toBeGreaterThan(0);
  const ticks = await page.locator("#printView").evaluate(el => (el.textContent.match(/☑/g) || []).length);
  expect(ticks).toBe(1);
  await page.emulateMedia({ media: "screen" });
  await expect(page.locator("#printView")).toBeHidden();
});
