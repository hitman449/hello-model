/*
 * Hello Model: site search ranking. Pure function, used by the search box (js/shell.js) and tests.
 * Entries come from /search-index.json, built by scripts/build-site.js:
 *   { t: title, u: url, k: kind ("Guide", "Model type"…), d: description, x: extra words to match }
 */
(function (root) {
  const words = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(Boolean);

  /**
   * Every query word must start a word in the entry (so "forec" finds "Forecasting").
   * Matches in the title count most; a title that starts with the query wins.
   */
  function rank(entries, query, limit = 8) {
    const q = words(query);
    if (!q.length) return [];
    const phrase = q.join(" ");
    const scored = [];
    for (const e of entries) {
      const title = words(e.t), body = words(`${e.d} ${e.x || ""} ${e.k}`);
      let score = 0;
      for (const w of q) {
        if (title.some(t => t === w)) score += 12;
        else if (title.some(t => t.startsWith(w))) score += 9;
        else if (body.some(t => t.startsWith(w))) score += 2;
        else { score = 0; break; }
      }
      if (!score) continue;
      const t = title.join(" ");
      if (t === phrase) score += 40;
      else if (t.startsWith(phrase)) score += 20;
      scored.push({ e, score });
    }
    scored.sort((a, b) => b.score - a.score || a.e.t.length - b.e.t.length);
    return scored.slice(0, limit).map(s => s.e);
  }

  const API = { rank, words };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.HM_SEARCH = API;
})(typeof window !== "undefined" ? window : globalThis);
