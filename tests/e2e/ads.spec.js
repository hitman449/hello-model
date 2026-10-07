// With the placeholder AdSense ID, nothing ad-related loads or shows.
const { test, expect } = require("./fixtures");

test("ads stay off: no ad requests and no visible ad slots", async ({ page }) => {
  const adRequests = [];
  page.on("request", r => { if (/googlesyndication|doubleclick|adservice/.test(r.url())) adRequests.push(r.url()); });
  for (const route of ["build", "models", "training", "clouds", "glossary"]) {
    await page.goto(`./#/${route}`);
    await expect(page.locator(".screen:not(.hidden)")).toHaveCount(1);
  }
  expect(adRequests).toEqual([]);
  const visibleSlots = await page.evaluate(() => [...document.querySelectorAll(".ad-slot")].filter(s => s.offsetHeight > 0).length);
  expect(visibleSlots).toBe(0);
});
