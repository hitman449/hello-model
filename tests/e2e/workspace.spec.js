// The plan workspace: overview, "Why this?", confidence, editing answers in place, comparing approaches,
// keyboard shortcuts and the Ctrl+K command palette.
const { test, expect, buildPlan } = require("./fixtures");

test("the overview explains its choices and rates its confidence honestly", async ({ page }) => {
  await buildPlan(page, "Forecast daily sales for each of our 40 stores");
  await expect(page.locator("#glanceTitle")).toHaveText("Overview");
  await page.locator(".glance .why-this summary").first().click();
  await expect(page.locator("#whyApproach li").first()).not.toBeEmpty();
  await expect(page.locator("#whyCost")).toContainText("Your budget:");
  await expect(page.locator("#confidence .conf-badge")).toContainText("confidence");
  await page.locator("#confidence summary").click();
  await expect(page.locator("#confidence")).toContainText("doesn’t predict how accurate your model will be");
  await page.locator("#whyApproach [data-open-compare]").click();
  await expect(page.locator("#comparePanel")).toBeVisible();
});

test("compare approaches shows all three, with the recommended one marked", async ({ page }) => {
  await buildPlan(page, "Forecast daily sales for each of our 40 stores");
  await page.click("#compareBtn");
  await expect(page.locator("#compareBtn")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#compareGrid .cmp")).toHaveCount(3);
  await expect(page.locator("#compareGrid .cmp-pick")).toHaveCount(1);
  const tier = (await page.locator("#planEyebrow").textContent()).trim().split(" ")[0];
  await expect(page.locator("#compareGrid .cmp-pick .cmp-tier")).toContainText(tier);
  await page.locator("#comparePanel [data-close]").click();
  await expect(page.locator("#comparePanel")).toBeHidden();
  await expect(page.locator("#compareBtn")).toBeFocused();
});

test("changing an answer in place rebuilds the plan, keeps progress and saves it", async ({ page }) => {
  await page.goto("./#/example");
  await expect(page.locator("#exampleBanner")).toBeVisible();
  await page.locator(".checklist input").first().check();
  await page.click("#answersBtn");
  const before = await page.locator("#sumModel").textContent();
  await page.locator("#ans-data").focus();
  await page.selectOption("#ans-data", "large");
  await expect(page.locator("#toast")).toContainText("Plan updated");
  await expect(page.locator("#toast")).toContainText("Saved to My plans");
  await expect(page.locator("#sumModel")).not.toHaveText(before);
  await expect(page.locator("#exampleBanner")).toBeHidden();
  await expect(page.locator("#ans-data")).toBeFocused();
  await expect(page.locator(".checklist input").first()).toBeChecked();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("hello-model-plans-v1")));
  expect(saved).toHaveLength(1);
  expect(saved[0].answers.data).toBe("large");
  await page.reload();
  await expect(page.locator("#sumModel")).not.toHaveText(before);
});

test("keyboard shortcuts move between steps and open the panels", async ({ page }) => {
  await buildPlan(page, "Forecast daily sales for each of our 40 stores");
  await page.locator("#planTitle").click();
  await page.keyboard.press("j");
  await expect(page.locator("#stepView .eyebrow")).toHaveText("Step 2 of 9");
  await page.keyboard.press("j");
  await page.keyboard.press("k");
  await expect(page.locator("#stepView .eyebrow")).toHaveText("Step 2 of 9");
  await page.locator("#planTitle").click();
  await page.keyboard.press("c");
  await expect(page.locator("#comparePanel")).toBeVisible();
  await page.locator("#planTitle").click();
  await page.keyboard.press("a");
  await expect(page.locator("#answersPanel")).toBeVisible();
  await expect(page.locator("#comparePanel")).toBeHidden();
  // Typing in a field never triggers shortcuts.
  await page.locator("#ans-data").focus();
  await page.keyboard.press("j");
  await expect(page.locator("#stepView .eyebrow")).toHaveText("Step 2 of 9");
  await page.locator("#planTitle").click();
  await page.keyboard.press("?");
  await expect(page.locator("#keysDialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#keysDialog")).toBeHidden();
});

test("Ctrl+K lists commands for the plan and runs them", async ({ page }) => {
  await buildPlan(page, "Forecast daily sales for each of our 40 stores");
  await page.keyboard.press("Control+k");
  await expect(page.locator(".search-item").first()).toContainText("Continue with step 1");
  await page.locator("#searchInput").fill("step 4");
  await expect(page.locator(".search-item").first()).toContainText("Go to step 4");
  await page.keyboard.press("Enter");
  await expect(page.locator(".search-dialog")).toBeHidden();
  await expect(page.locator("#stepView .eyebrow")).toHaveText("Step 4 of 9");
  await page.keyboard.press("Control+k");
  await page.locator("#searchInput").fill("share");
  await page.keyboard.press("Enter");
  await expect(page.locator("#shareDialog")).toBeVisible();
});

test("the command palette works on Learn pages too", async ({ page }) => {
  await page.goto("./glossary/");
  await page.keyboard.press("Control+k");
  await expect(page.locator(".search-item", { hasText: "Start a new plan" })).toBeVisible();
  await page.locator("#searchInput").fill("dark theme");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", /dark|light/);
});
