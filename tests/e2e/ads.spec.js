// With the placeholder AdSense ID, nothing ad-related loads or shows.
const { test, expect } = require("./fixtures");

test("ads stay off: no ad requests and no visible ad slots", async ({ page }) => {
  const adRequests = [];
  page.on("request", r => { if (/googlesyndication|doubleclick|adservice/.test(r.url())) adRequests.push(r.url()); });
  for (const url of ["#/build", "guides/", "guides/customer-churn/", "models/", "models/speech/", "training/workflow/", "clouds/", "glossary/"]) {
    await page.goto("./" + url);
    await expect(page.locator(".screen:not(.hidden)")).toHaveCount(1);
    const visibleSlots = await page.evaluate(() => [...document.querySelectorAll(".ad-slot")].filter(s => s.offsetHeight > 0).length);
    expect(visibleSlots, url).toBe(0);
  }
  expect(adRequests).toEqual([]);
});
