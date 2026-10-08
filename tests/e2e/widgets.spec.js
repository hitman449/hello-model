// The interactive lesson examples and the learning path.
const { test, expect } = require("./fixtures");

test("lesson examples load only when scrolled near, then respond to their controls", async ({ page }) => {
  const loaded = [];
  page.on("request", r => { if (r.url().includes("/js/widgets/")) loaded.push(r.url()); });
  await page.setViewportSize({ width: 375, height: 600 }); // the example starts well below the fold
  await page.goto("./training/fit/");
  await expect(page.locator(".widget .widget-loading")).toBeAttached();
  expect(loaded).toEqual([]); // nothing loaded while the example is far below the fold

  await page.locator(".widget").scrollIntoViewIfNeeded();
  await expect(page.locator("#fitVerdict")).toContainText("Underfitting");
  expect(loaded.length).toBe(1);
  await page.locator("#fitDeg").fill("5");
  await expect(page.locator("#fitVerdict")).toContainText("A good fit");
  await page.locator("#fitDeg").fill("12");
  await expect(page.locator("#fitVerdict")).toContainText("Overfitting");
});

test("the split, threshold and learning-rate examples explain what they show", async ({ page }) => {
  await page.goto("./training/splits/");
  await page.locator(".widget").scrollIntoViewIfNeeded();
  await expect(page.locator("#spTrain")).toHaveText("700 rows (70%)");
  await page.selectOption("#spSize", "200");
  await expect(page.locator("#spNote")).toContainText("cross-validation");
  await page.selectOption("#spSize", "1000");
  await page.check("#spTime");
  await expect(page.locator("#spNote")).toContainText("Split by date");
  await expect(page.locator("#spShuffle")).toBeDisabled();

  await page.goto("./training/metrics/");
  await page.locator(".widget").scrollIntoViewIfNeeded();
  await page.locator("#thVal").fill("0.2");
  await expect(page.locator("#thNote")).toContainText("Too strict");
  await page.locator("#thVal").fill("0.9");
  await expect(page.locator("#thNote")).toContainText("Too lenient");
  await page.locator("#thVal").fill("0.65");
  await expect(page.locator("#thNote")).toContainText("A reasonable balance");

  await page.emulateMedia({ reducedMotion: "reduce" }); // no animation: the result shows at once
  await page.goto("./training/hyperparams/");
  await page.locator(".widget").scrollIntoViewIfNeeded();
  await page.locator("#gdRate").fill("0");
  await page.click("#gdRun");
  await expect(page.locator("#gdNote")).toContainText("Too small");
  await page.locator("#gdRate").fill("3");
  await page.click("#gdRun");
  await expect(page.locator("#gdNote")).toContainText("About right");
  await page.locator("#gdRate").fill("8");
  await page.click("#gdRun");
  await expect(page.locator("#gdNote")).toContainText("Too big");
  await expect(page.locator("#gdOff")).toHaveText(/off the chart/);
});

test("the learning path ticks off lessons you've opened and points to the next one", async ({ page }) => {
  await page.goto("./learning-path/");
  await expect(page.locator("#pathCount")).toHaveText("Start here");
  await expect(page.locator(".path li.visited")).toHaveCount(0);
  await page.goto("./training/workflow/");
  await page.goto("./training/approach/");
  await page.goto("./learning-path/");
  await expect(page.locator("#pathCount")).toHaveText("2 of 11 visited");
  await expect(page.locator(".path li.visited")).toHaveCount(2);
  await expect(page.locator("#pathNext")).toHaveText("Continue: Train, validation and test splits →");
  await page.click("#pathNext");
  await expect(page).toHaveURL(/\/training\/splits\/$/);
});
