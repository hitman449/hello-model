// The core journey: describe -> confirm -> questions -> plan, with saved progress.
const { test, expect, describe, answerAll, buildPlan } = require("./fixtures");

test("builds a plan with 9 steps", async ({ page }) => {
  await buildPlan(page, "Chatbot that answers employee questions from our HR policy PDFs");
  await expect(page.locator("#planTitle")).toHaveText("Your LLM Assistant / RAG Chatbot plan");
  await expect(page.locator("#stepper li")).toHaveCount(9);
  await expect(page.locator("#stepView h2")).toHaveText("Define the problem & success");
});

test("checklist progress survives a reload and shows in Recents and My plans", async ({ page }) => {
  await buildPlan(page, "Forecast daily sales for each of our 40 stores");
  await page.locator(".checklist input").first().check();
  await expect(page.locator("#overallPct")).toContainText("1/");
  await page.reload();
  await expect(page.locator("#screen-plan")).toBeVisible();
  await expect(page.locator(".checklist input").first()).toBeChecked();
  await expect(page.locator("#recents li")).toHaveCount(1);
  await page.click(".side-nav a[data-route=plans]");
  await expect(page.locator(".plan-card")).toHaveCount(1);
  page.once("dialog", d => d.accept());
  await page.click(".plan-card [data-del]");
  await expect(page.locator(".plan-card")).toHaveCount(0);
  await expect(page.locator("#plansList .empty")).toBeVisible();
});

test("steps navigate, extra details fold out, and code is folded until opened", async ({ page }) => {
  await buildPlan(page, "Predict which customers will churn next month from our CRM data", 2);
  await page.locator("#stepper li").nth(5).click();
  await expect(page.locator("#stepView .eyebrow")).toHaveText("Step 6 of 9");
  const code = page.locator("#stepView .code-block").first();
  await expect(code.locator("pre")).toBeHidden();
  await code.locator("summary").click();
  await expect(code.locator("pre")).toBeVisible();
  await expect(code.locator(".code-head .btn")).toHaveText("Copy");
  const more = page.locator("#stepView details.more");
  await more.locator("summary").click();
  await expect(more).toHaveAttribute("open", "");
  await page.click("#nextStep");
  await expect(page.locator("#stepView .eyebrow")).toHaveText("Step 7 of 9");
  await page.click("#prevStep");
  await expect(page.locator("#stepView .eyebrow")).toHaveText("Step 6 of 9");
});

test("tech stack tab shows architecture, stack and infrastructure", async ({ page }) => {
  await buildPlan(page, "Detect defective parts in photos from our production line");
  await page.click(".tab[data-tab=stack]");
  await expect(page.locator("#arch .arch-node").first()).toBeVisible();
  await expect(page.locator("#stack .stack-row").first()).toBeVisible();
  await page.click("#infraTitle");
  await expect(page.locator("#infra tbody tr").first()).toBeVisible();
});

test("the plan opens with the answer at a glance, and its first steps jump into the guide", async ({ page }) => {
  await buildPlan(page, "Forecast daily sales for each of our 40 stores");
  const glance = page.locator(".glance");
  await expect(glance).toBeInViewport();
  await expect(page.locator("#sumModel")).not.toBeEmpty();
  await expect(page.locator("#sumCost")).toContainText("$");
  await expect(page.locator("#overallPct")).toHaveText("Not started · 9 steps");
  await expect(page.locator("#firstSteps li")).toHaveCount(3);
  await page.locator("#firstSteps [data-step='2']").click();
  await expect(page.locator("#stepView .eyebrow")).toHaveText("Step 3 of 9");
});

test('"Not sure" answers are shown as assumptions, and can be changed', async ({ page }) => {
  await describe(page, "Forecast daily sales for each of our 40 stores");
  await page.click("#confirmUc");
  const plan = page.locator("#screen-plan");
  for (let i = 0; i < 12 && !(await plan.isVisible()); i++) {
    const before = await page.locator("#qCount").textContent();
    const unsure = page.locator("#qCard .q-opt", { hasText: "Not sure" });
    await ((await unsure.count()) ? unsure : page.locator("#qCard .q-opt").first()).click();
    await expect(async () => {
      expect((await plan.isVisible()) || (await page.locator("#qCount").textContent()) !== before).toBe(true);
    }).toPass();
  }
  await expect(page.locator(".assumed")).toContainText("so we assumed");
  await expect(page.locator(".assumed li")).toHaveCount(6);
  await page.click("#changeAssumed");
  await expect(page.locator("#screen-questions")).toBeVisible();
  await expect(page.locator("#qCount")).toContainText("Question 1 of");
});

test("the More menu holds the other plan actions and closes after use", async ({ page }) => {
  await buildPlan(page, "Forecast daily sales for each of our 40 stores");
  const menu = page.locator("#moreMenu");
  await expect(page.locator("#exportMd")).toBeHidden();
  await menu.locator("summary").click();
  await expect(page.locator("#exportMd")).toBeVisible();
  await page.locator(".glance-title").click();           // click elsewhere closes it
  await expect(page.locator("#exportMd")).toBeHidden();
  await menu.locator("summary").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#exportMd")).toBeHidden();
  await menu.locator("summary").click();
  await page.click("#editAnswers");
  await expect(page.locator("#screen-questions")).toBeVisible();
  await expect(menu).not.toHaveAttribute("open", "");
});

const savedPlans = page => page.evaluate(() => JSON.parse(localStorage.getItem("hello-model-plans-v1") || "[]").length);

test("the example plan opens in one click, isn't saved, and leads to building your own", async ({ page }) => {
  await page.goto("./");
  await page.click("#exampleLink");
  await expect(page.locator("#screen-plan")).toBeVisible();
  await expect(page.locator("#exampleBanner")).toBeVisible();
  await expect(page.locator("#planReq")).toContainText("bakery");
  await expect(page.locator(".assumed")).toContainText("so we assumed");
  await page.locator(".checklist input").first().check();
  expect(await savedPlans(page)).toBe(0);
  await expect(page.locator("#recents li")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#exampleBanner")).toBeVisible();
  await page.click("#ownPlanBtn");
  await expect(page.locator("#screen-describe")).toBeVisible();
  await expect(page.locator("#requirement")).toHaveValue("");
});

test("editing the example's answers makes it your own saved plan", async ({ page }) => {
  await page.goto("./#/example");
  await expect(page.locator("#exampleBanner")).toBeVisible();
  await page.click("#moreMenu summary");
  await page.click("#editAnswers");
  await answerAll(page);
  await expect(page.locator("#exampleBanner")).toBeHidden();
  expect(await savedPlans(page)).toBe(1);
});

test("the questions show progress and roughly how long is left", async ({ page }) => {
  await describe(page, "Forecast daily sales for each of our 40 stores");
  await page.click("#confirmUc");
  const steps = page.locator("#qSteps li");
  const total = await steps.count();
  expect(total).toBeGreaterThan(4);
  await expect(page.locator("#qSteps li.current")).toHaveCount(1);
  await expect(page.locator("#qLeft")).toHaveText(/^About \d min left$/);
  await page.locator("#qCard .q-opt").first().click();
  await expect(page.locator("#qCount")).toContainText("Question 2 of");
  await expect(page.locator("#qSteps li.done")).toHaveCount(1);
  for (let i = 2; i < total; i++) {
    await page.locator("#qCard .q-opt").first().click();
    await expect(page.locator("#qCount")).toContainText(`Question ${i + 1} of`);
  }
  await expect(page.locator("#qLeft")).toHaveText("Last one!");
});
