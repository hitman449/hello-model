// Every page loads and the main navigation works.
const { test, expect } = require("./fixtures");

test("home page shows the describe form and examples", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#screen-describe")).toBeVisible();
  await expect(page.locator("#requirement")).toBeVisible();
  await expect(page.locator("#exampleChips .chip")).toHaveCount(4);
  await page.locator("#exampleChips .chip").first().click();
  await expect(page.locator("#requirement")).not.toHaveValue("");
});

for (const [route, screen] of [["plans", "plans"], ["models", "models"], ["training", "training"], ["clouds", "clouds"], ["glossary", "glossary"]]) {
  test(`sidebar link opens ${route}`, async ({ page }) => {
    await page.goto("./");
    await page.click(`.side-nav a[data-route=${route}]`);
    await expect(page.locator(`#screen-${screen}`)).toBeVisible();
    await expect(page.locator(`.side-nav a[data-route=${route}]`)).toHaveClass(/active/);
    await expect(page).toHaveURL(new RegExp(`#/${route}$`));
  });
}

test("privacy policy opens from the footer", async ({ page }) => {
  await page.goto("./");
  await page.click(".foot a[href='#/privacy']");
  await expect(page.locator("#screen-privacy")).toBeVisible();
});

test("browser back button returns to the previous page", async ({ page }) => {
  await page.goto("./#/training");
  await page.click(".side-nav a[data-route=glossary]");
  await expect(page.locator("#screen-glossary")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#screen-training")).toBeVisible();
});

test("theme button switches between light and dark", async ({ page }) => {
  await page.goto("./");
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme || "");
  await page.click("#themeBtn");
  const first = await theme();
  await page.click("#themeBtn");
  expect(["light", "dark"]).toContain(first);
  expect(await theme()).not.toBe(first);
});

test("model library card leads to a detail page and into the questions", async ({ page }) => {
  await page.goto("./#/models");
  await expect(page.locator("#libraryGrid .uc-card")).toHaveCount(10);
  await page.locator("#libraryGrid .uc-card", { hasText: "Image Classification" }).click();
  await expect(page).toHaveURL(/#\/models\/image-classification$/);
  await expect(page.locator("#modelDetail .tier")).toHaveCount(3);
  await page.click("#buildThis");
  await expect(page.locator("#qCount")).toContainText("Image Classification");
});

test("glossary search filters terms", async ({ page }) => {
  await page.goto("./#/glossary");
  const all = await page.locator(".g-item").count();
  await page.fill("#glossarySearch", "drift");
  await expect(page.locator(".g-item")).not.toHaveCount(all);
  await expect(page.locator(".g-item").first()).toContainText(/drift/i);
});
