/*
 * Google AdSense integration.
 *
 * Ads stay OFF until you replace the placeholder publisher ID below with your real one
 * (format: ca-pub- followed by 16 digits). While off, no Google script is loaded and
 * no ad boxes are shown. Also replace each slot ID with an ad unit ID from your
 * AdSense dashboard (Ads → By ad unit), and update ads.txt in the repo root.
 */
(function (root) {
  const ADSENSE = {
    client: "ca-pub-XXXXXXXXXXXXXXXX",
    slots: {
      home: "0000000000",   // below the "describe your idea" card
      plan: "0000000000",   // below the step-by-step guide
      learn: "0000000000"   // bottom of the Learn pages
    }
  };

  const isEnabled = () => /^ca-pub-\d{16}$/.test(ADSENSE.client);
  const validSlot = id => /^\d{6,}$/.test(id || "") && !/^0+$/.test(id);

  let scriptAdded = false;
  function loadScript() {
    if (scriptAdded) return;
    scriptAdded = true;
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADSENSE.client);
    document.head.appendChild(s);
  }

  /**
   * Fill every visible, not-yet-filled `.ad-slot` inside `scope`.
   * Slots are filled lazily: AdSense can't size an ad inside a hidden screen.
   */
  function fillIn(scope) {
    if (!isEnabled() || !scope) return;
    scope.querySelectorAll(".ad-slot:not([data-filled])").forEach(box => {
      if (box.closest(".hidden")) return;
      const slot = ADSENSE.slots[box.dataset.slot];
      if (!validSlot(slot)) return;
      loadScript();
      box.dataset.filled = "1";
      box.innerHTML = '<span class="ad-label">Advertisement</span>' +
        '<ins class="adsbygoogle" style="display:block" data-ad-client="' + ADSENSE.client +
        '" data-ad-slot="' + slot + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      (root.adsbygoogle = root.adsbygoogle || []).push({});
    });
  }

  const API = { ADSENSE, isEnabled, validSlot, fillIn };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.HM_ADS = API;
})(typeof window !== "undefined" ? window : globalThis);
