// Every page loads and the main navigation works.
const { test, expect, buildPlan } = require("./fixtures");

test("home page shows the describe form and examples", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#screen-describe")).toBeVisible();
  await expect(page.locator("#requirement")).toBeVisible();
  await expect(page.locator("#exampleChips .chip")).toHaveCount(4);
  await page.locator("#exampleChips .chip").first().click();
  await expect(page.locator("#requirement")).not.toHaveValue("");
  await expect(page.locator(".home-guides[aria-label='Guides by model type'] a")).toHaveCount(10);
  await expect(page.locator(".home-guides[aria-label='Step-by-step guides'] a")).not.toHaveCount(0);
});

test("sidebar link opens My plans", async ({ page }) => {
  await page.goto("./");
  await page.click(".side-nav a[data-route=plans]");
  await expect(page.locator("#screen-plans")).toBeVisible();
  await expect(page.locator(".side-nav a[data-route=plans]")).toHaveClass(/active/);
  await expect(page).toHaveURL(/#\/plans$/);
});

for (const route of ["guides", "models", "training", "clouds", "glossary"]) {
  test(`sidebar link opens the ${route} page`, async ({ page }) => {
    await page.goto("./");
    await page.click(`.side-nav a[data-route=${route}]`);
    await expect(page).toHaveURL(new RegExp(`/${route}/$`));
    await expect(page.locator(`#screen-${route}`)).toBeVisible();
    await expect(page.locator(`.side-nav a[data-route=${route}]`)).toHaveClass(/active/);
  });
}

for (const [label, path] of [["About", "about"], ["Contact", "contact"], ["Privacy policy", "privacy"]]) {
  test(`${label} opens from the footer`, async ({ page }) => {
    await page.goto("./");
    await page.locator(".foot").getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`/${path}/$`));
    await expect(page.locator("h1")).toHaveText(label === "About" ? "About Hello Model" : label);
  });
}

test("old in-app links go to the real pages", async ({ page }) => {
  await page.goto("./#/models/speech");
  await expect(page).toHaveURL(/\/models\/speech\/$/);
  await expect(page.locator("h1")).toHaveText("Speech & Audio");
  await page.goto("./#/clouds");
  await expect(page).toHaveURL(/\/clouds\/$/);
});

test("browser back button returns to the previous page", async ({ page }) => {
  await page.goto("./training/");
  await page.click(".side-nav a[data-route=glossary]");
  await expect(page.locator("#screen-glossary")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#screen-training")).toBeVisible();
});

test("theme button switches between light and dark, and the choice carries across pages", async ({ page }) => {
  await page.goto("./");
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme || "");
  await page.click("#themeBtn");
  const first = await theme();
  await page.click("#themeBtn");
  expect(["light", "dark"]).toContain(first);
  const second = await theme();
  expect(second).not.toBe(first);
  await page.goto("./glossary/");
  expect(await theme()).toBe(second);
});

test("model library card leads to a detail page and into the questions", async ({ page }) => {
  await page.goto("./models/");
  await expect(page.locator(".uc-grid .uc-card")).toHaveCount(10);
  await page.locator(".uc-card", { hasText: "Image Classification" }).click();
  await expect(page).toHaveURL(/\/models\/image-classification\/$/);
  await expect(page.locator(".tier")).toHaveCount(3);
  await expect(page.locator(".code-block pre").first()).toBeHidden();
  await page.locator(".code-block summary").first().click();
  await expect(page.locator(".code-block pre").first()).toBeVisible();
  await page.click("#buildThis");
  await expect(page.locator("#qCount")).toContainText("Image Classification");
  await expect(page).toHaveURL(/#\/build$/);
});

test("glossary terms show their definition on hover on the Learn pages", async ({ page }) => {
  await page.goto("./models/tabular-classification/");
  await page.locator(".term[data-term='F1 score']").first().hover();
  await expect(page.locator("#tooltip")).toContainText("precision and recall");
});

test("a guide opens from the guides list, with working step links and code", async ({ page }) => {
  await page.goto("./guides/");
  await page.locator(".guide-card", { hasText: "spam filter" }).click();
  await expect(page).toHaveURL(/\/guides\/spam-filter\/$/);
  await expect(page.locator(".guide-body .code-block pre").first()).toBeVisible();
  await page.locator(".toc a").nth(4).click();
  await expect(page).toHaveURL(/#step-5-train-a-real-model$/);
  await page.getByRole("link", { name: "Get a personalised plan →" }).click();
  await expect(page.locator("#qCount")).toContainText("Text Classification");
});

test("training lessons link to each other in order", async ({ page }) => {
  await page.goto("./training/");
  await expect(page.locator(".lesson-link")).toHaveCount(8);
  await page.locator(".lesson-link").first().click();
  await expect(page.locator(".eyebrow")).toHaveText("Lesson 1 of 8");
  await page.getByRole("link", { name: /^Next:/ }).click();
  await expect(page.locator(".eyebrow")).toHaveText("Lesson 2 of 8");
});

test("glossary search filters terms", async ({ page }) => {
  await page.goto("./glossary/");
  const all = await page.locator(".g-item:visible").count();
  await page.fill("#glossarySearch", "drift");
  await expect(page.locator(".g-item:visible")).not.toHaveCount(all);
  await expect(page.locator(".g-item:visible").first()).toContainText(/drift/i);
  await page.fill("#glossarySearch", "zzzz");
  await expect(page.locator("#glossaryEmpty")).toBeVisible();
});

test("New plan and Recents on a Learn page open the app", async ({ page }) => {
  await buildPlan(page, "Forecast daily sales for each of our 40 stores");
  await page.goto("./glossary/");
  await expect(page.locator("#recents li")).toHaveCount(1);
  await page.locator("#recents a").first().click();
  await expect(page.locator("#screen-plan")).toBeVisible();
  await expect(page.locator("#planTitle")).toContainText("Forecasting");
  await expect(page).toHaveURL(/#\/build$/);
  await page.goto("./glossary/");
  await page.click("#newPlanBtn");
  await expect(page.locator("#screen-describe")).toBeVisible();
  await expect(page.locator("#requirement")).toHaveValue("");
});

test("unknown pages show a friendly 404", async ({ page }) => {
  await page.goto("./404.html");
  await expect(page.locator("h1")).toHaveText("Page not found");
});

test("site search: Ctrl+K opens it, results follow typing, Enter opens the top result", async ({ page }) => {
  await page.goto("./");
  await page.keyboard.press("Control+k");
  const input = page.locator("#searchInput");
  await expect(input).toBeFocused();
  await expect(page.locator(".search-hint .chip")).not.toHaveCount(0);
  await input.fill("churn");
  await expect(page.locator(".search-item").first()).toContainText("customer churn");
  await expect(page.locator(".search-item").first()).toHaveClass(/active/);
  await input.press("ArrowDown");
  await expect(page.locator(".search-item").nth(1)).toHaveClass(/active/);
  await input.press("ArrowUp");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/guides\/customer-churn\/$/);
});

test("site search works on Learn pages, jumps to glossary terms, and closes with Escape", async ({ page }) => {
  await page.goto("./models/");
  await page.keyboard.press("/");
  await page.locator("#searchInput").fill("zzqx");
  await expect(page.locator(".search-hint")).toContainText("No results");
  await page.keyboard.press("Escape");
  await expect(page.locator(".search-dialog")).toBeHidden();
  await page.click("#searchBtn");
  await page.locator("#searchInput").fill("precision");
  await page.locator(".search-item", { hasText: "Glossary" }).first().click();
  await expect(page).toHaveURL(/\/glossary\/#term-precision$/);
  await expect(page.locator("#term-precision")).toBeInViewport();
});

test("site search opens from the phone header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./guides/");
  await page.click("#mobileSearchBtn");
  await page.locator("#searchInput").fill("overfit");
  await expect(page.locator(".search-item").first()).toContainText("Overfitting");
});

test("typing numbers in search doesn't answer the question behind it", async ({ page }) => {
  await page.goto("./");
  await page.fill("#requirement", "Forecast daily sales for each of our 40 stores");
  await page.click("#describeForm button[type=submit]");
  await page.click("#confirmUc");
  await expect(page.locator("#qCount")).toContainText("Question 1");
  await page.keyboard.press("Control+k");
  await page.keyboard.type("2");
  await page.keyboard.press("Escape");
  await expect(page.locator("#qCount")).toContainText("Question 1");
});

test("home page previews the example plan and links to it", async ({ page }) => {
  await page.goto("./");
  const preview = page.locator(".preview-card");
  await expect(preview).toContainText("Your Time-Series Forecasting plan");
  await expect(preview.locator(".first-steps li")).toHaveCount(3);
  await preview.getByRole("link", { name: "See the full example plan →" }).click();
  await expect(page.locator("#exampleBanner")).toBeVisible();
});

test("the home page says what kind of model a description sounds like, while typing", async ({ page }) => {
  await page.goto("./");
  const hint = page.locator("#liveHint");
  await page.fill("#requirement", "Sort customer emails by topic");
  await expect(hint).toHaveText("Sounds like Text Classification");
  await page.fill("#requirement", "I want to");
  await expect(hint).toHaveText(""); // too short to tell yet
  await page.fill("#requirement", "I want to use AI for my shop");
  await expect(hint).toContainText("say what data you have");
  await page.locator("#exampleChips .chip", { hasText: "Forecast" }).click();
  await expect(hint).toHaveText("Sounds like Time-Series Forecasting");
});

test("on a phone, the describe box and its button fit on the first screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("./");
  await expect(page.locator("#requirement")).toBeInViewport({ ratio: 1 });
  await expect(page.locator("#describeForm button[type=submit]")).toBeInViewport({ ratio: 1 });
});
