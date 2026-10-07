// How the site reacts to clear, ambiguous and vague descriptions.
const { test, expect, describe } = require("./fixtures");

test("a clear description goes straight to confirmation", async ({ page }) => {
  await describe(page, "Forecast daily sales for each of our 40 stores");
  await expect(page.locator("#detectTitle")).toHaveText("Here's what we think you're building");
  await expect(page.locator("#detectMain")).toContainText("Time-Series Forecasting");
  await expect(page.locator("#confirmUc")).toBeVisible();
});

test("a close call asks which model type is closer", async ({ page }) => {
  await describe(page, "Let staff query our HR handbook in plain English");
  await expect(page.locator("#detectTitle")).toHaveText("Which is closer to what you want?");
  const choices = page.locator("#detectMain .choice");
  expect(await choices.count()).toBeGreaterThanOrEqual(2);
  await choices.filter({ hasText: "chatbot" }).click();
  await expect(page.locator("#qCount")).toContainText("LLM Assistant");
});

test("a vague description asks about the data, then the goal", async ({ page }) => {
  await describe(page, "I have a hunch our numbers will go up");
  await expect(page.locator("#detectTitle")).toHaveText("Let's narrow it down");
  await expect(page.locator("#detectMain .choice")).toHaveCount(8);
  await page.locator("#detectMain .choice", { hasText: "Images or photos" }).click();
  await expect(page.locator("#detectTitle")).toHaveText("One more question");
  await page.locator("#detectMain .choice", { hasText: "Find where things are" }).click();
  await expect(page.locator("#qCount")).toContainText("Object Detection");
});

test("a data type with a single model type skips the goal question", async ({ page }) => {
  await describe(page, "something something unclear");
  await page.locator("#detectMain .choice", { hasText: "Audio or voice" }).click();
  await expect(page.locator("#qCount")).toContainText("Speech & Audio");
});
