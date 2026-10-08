/*
 * Hello Model icon set: simple 24×24 line icons in the same style as the sidebar
 * (no fill, 1.8 stroke, round caps). They inherit the text colour, so they work in both themes.
 * Usage: HM_ICONS.svg("chat")  →  "<svg …>…</svg>"   (decorative; aria-hidden)
 */
(function (root) {
  const ICONS = {
    // Model types (USE_CASES[id].icon)
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
    trend: '<path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/>',
    forecast: '<path d="M3 3v18h18"/><path d="M7 15l3-4 3 2 2-3"/><path d="M17 8l3-4" stroke-dasharray="2 2.5"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z"/>',
    pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    // Interface
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>'
  };

  function svg(name, size = 24) {
    const body = ICONS[name];
    if (!body) return "";
    return `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  const API = { ICONS, svg };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.HM_ICONS = API;
})(typeof window !== "undefined" ? window : globalThis);
