// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const ADS = require("../js/ads.js");

test("ads stay off with the placeholder publisher ID", () => {
  assert.equal(ADS.isEnabled(), false);
});

test("ads switch on with a well-formed publisher ID", () => {
  const original = ADS.ADSENSE.client;
  try {
    ADS.ADSENSE.client = "ca-pub-1234567890123456";
    assert.equal(ADS.isEnabled(), true);
    ADS.ADSENSE.client = "ca-pub-123";
    assert.equal(ADS.isEnabled(), false);
  } finally {
    ADS.ADSENSE.client = original;
  }
});

test("placeholder slot IDs are rejected, real ones accepted", () => {
  assert.equal(ADS.validSlot("0000000000"), false);
  assert.equal(ADS.validSlot(""), false);
  assert.equal(ADS.validSlot("12ab"), false);
  assert.equal(ADS.validSlot("1234567890"), true);
});
