// The core journey: describe -> confirm -> questions -> plan, with saved progress.
const { test, expect, buildPlan } = require("./fixtures");

test("builds a plan with 9 steps", async ({ page }) => {
  await buildPlan(page, "Chatbot that answers employee questions from our HR policy PDFs");
  await expect(page.locator("#planEyebrow")).toContainText("LLM Assistant");
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
