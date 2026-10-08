// Accessibility: automated WCAG 2.1 AA checks (axe) on every page and app screen, plus keyboard and screen-reader behaviour.
const { test, expect, buildPlan } = require("./fixtures");
const { default: AxeBuilder } = require("@axe-core/playwright");

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];
async function expectNoViolations(page, label) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map(v => `${v.id} (${v.impact}): ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(summary, label).toEqual([]);
}

const PAGES = ["learning-path/", "guides/", "guides/pdf-chatbot/", "models/", "models/speech/", "training/", "training/metrics/",
  "clouds/", "clouds/azure/", "glossary/", "about/", "contact/", "privacy/", "404.html"];

for (const scheme of ["light", "dark"]) {
  test(`Learn pages pass WCAG AA checks (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const url of PAGES) {
      await page.goto("./" + url);
      await expectNoViolations(page, `${scheme} /${url}`);
    }
  });

  test(`app screens pass WCAG AA checks (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("./");
    await expectNoViolations(page, "home");
    await page.fill("#requirement", "Forecast daily sales for each of our 40 stores");
    await page.click("#describeForm button[type=submit]");
    await expectNoViolations(page, "detect");
    await page.click("#confirmUc");
    await expectNoViolations(page, "question");
    await page.goto("./#/example");
    await expect(page.locator("#screen-plan")).toBeVisible();
    await expectNoViolations(page, "plan");
    await page.click(".tab[data-tab=stack]");
    await expectNoViolations(page, "plan: tech stack");
    await page.click(".tab[data-tab=guide]");
    await page.click("#moreMenu summary");
    await expectNoViolations(page, "plan: More menu");
    await page.keyboard.press("Escape");
    await page.click("#shareBtn");
    await expectNoViolations(page, "share dialog");
    await page.keyboard.press("Escape");
    await page.goto("./#/new");
    await page.fill("#requirement", "I want to use AI");
    await page.click("#describeForm button[type=submit]");
    await expectNoViolations(page, "narrow it down");
    await page.goto("./#/plans");
    await expectNoViolations(page, "my plans");
    await page.keyboard.press("Control+k");
    await page.keyboard.type("churn");
    await expect(page.locator(".search-item").first()).toBeVisible();
    await expectNoViolations(page, "search");
  });
}

test("collapsed sidebar keeps its links named for screen readers", async ({ page }) => {
  await page.goto("./glossary/");
  await page.click("#collapseBtn");
  await expect(page.locator("#collapseBtn")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#collapseBtn")).toHaveAttribute("aria-label", "Expand sidebar");
  await expect(page.getByRole("link", { name: "Training basics" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search the site" }).first()).toBeVisible();
  await expectNoViolations(page, "collapsed sidebar");
});

test("the first Tab offers a skip link that jumps past the sidebar", async ({ page }) => {
  for (const url of ["./", "./models/"]) {
    await page.goto(url);
    await page.keyboard.press("Tab");
    const skip = page.locator(".skip-link");
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    const before = page.url();
    await page.keyboard.press("Enter");
    await expect(page.locator("#app")).toBeFocused();
    expect(page.url()).toBe(before); // in the app, the URL hash is the route
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("#app"))).toBe(true);
  }
});

test("plan tabs announce the selected tab and work with arrow keys", async ({ page }) => {
  await buildPlan(page, "Forecast daily sales for each of our 40 stores");
  const guide = page.locator("#tabbtn-guide"), stack = page.locator("#tabbtn-stack");
  await expect(guide).toHaveAttribute("aria-selected", "true");
  await guide.focus();
  await page.keyboard.press("ArrowRight");
  await expect(stack).toBeFocused();
  await expect(stack).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#tab-stack")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(guide).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#tab-guide")).toBeVisible();
});

test("glossary terms are described to screen readers when focused", async ({ page }) => {
  await page.goto("./models/tabular-classification/");
  const term = page.locator(".term[data-term='F1 score']").first();
  await term.focus();
  await expect(term).toHaveAttribute("aria-describedby", "tooltip");
  await expect(page.locator("#tooltip")).toContainText("precision and recall");
});

test("the phone menu button says whether the menu is open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  const btn = page.locator("#menuBtn");
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await btn.click();
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(btn).toHaveAttribute("aria-expanded", "false");
});

for (const scheme of ["light", "dark"]) {
  test(`interactive lesson examples pass WCAG AA checks (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const lesson of ["splits", "fit", "hyperparams", "metrics"]) {
      await page.goto(`./training/${lesson}/`);
      await page.locator(".widget").scrollIntoViewIfNeeded();
      await expect(page.locator(".widget .w-verdict")).toBeVisible();
      await expectNoViolations(page, `${scheme} ${lesson} widget`);
    }
  });
}

for (const scheme of ["light", "dark"]) {
  test(`returning-visitor home and My plans pass WCAG AA checks (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.addInitScript(() => {
      if (localStorage.getItem("hello-model-plans-v1")) return;
      localStorage.setItem("hello-model-plans-v1", JSON.stringify([{ id: "p1", useCaseId: "forecasting", requirement: "Forecast daily sales",
        answers: { data: "medium", labels: "yes", skill: "intermediate", deploy: "batch", latency: "relaxed", cloud: "aws", budget: "low", privacy: "no" },
        checks: { "define:0": true }, updatedAt: Date.now(), createdAt: Date.now() }]));
    });
    await page.goto("./");
    await expect(page.locator("#continueSlot .continue")).toBeVisible();
    await expectNoViolations(page, `${scheme} home with a saved plan`);
    await page.goto("./#/plans");
    await expect(page.locator("#plansTools")).toBeVisible();
    await expectNoViolations(page, `${scheme} My plans`);
  });
}

for (const scheme of ["light", "dark"]) {
  test(`plan workspace panels and the command palette pass WCAG AA checks (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("./#/example");
    await expect(page.locator("#screen-plan")).toBeVisible();
    for (const s of await page.locator(".glance .why-this summary").all()) await s.click();
    await expectNoViolations(page, `${scheme} overview with Why this? open`);
    await page.click("#answersBtn");
    await expectNoViolations(page, `${scheme} answers panel`);
    await page.click("#compareBtn");
    await expectNoViolations(page, `${scheme} compare panel`);
    await page.keyboard.press("Control+k");
    await expect(page.locator(".search-item.is-action").first()).toBeVisible();
    await expectNoViolations(page, `${scheme} command palette`);
    await page.keyboard.press("Escape");
    await page.click("#moreMenu summary");
    await page.click("#keysBtn");
    await expectNoViolations(page, `${scheme} keyboard shortcuts`);
  });
}

test("on phones the closed menu drawer can't be tabbed into, and focus moves in and out with it", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("./guides/");
  await expect(page.locator("#sidebar")).toBeHidden();          // visibility: hidden while closed
  await page.click("#menuBtn");
  await expect(page.locator("#sidebar")).toBeVisible();
  await expect(page.locator("#newPlanBtn")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#menuBtn")).toBeFocused();
  await expect(page.locator("#menuBtn")).toHaveAttribute("aria-expanded", "false");
});
