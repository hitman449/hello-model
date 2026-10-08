/*
 * Hello Model architecture diagram: a hand-drawn SVG, laid out for the space it has.
 * The plan's architecture is a list of boxes. The first ones build the model, the next ones use it,
 * and the last one (Monitoring) feeds back into training:
 *
 *   wide:   [Data] → [Storage] → [Train] → [Registry]          narrow:   BUILD THE MODEL
 *                                  ↑ retrain    ↓                       [Data] ↓ [Storage] ↓ …
 *           [Monitoring] ← [Your app] ← [Model API]                     PUT IT TO WORK  …  ↺ back to Train
 *
 * Usage: HM_DIAGRAM.render(nodes, width, { lanes: ["Build the model", "Put it to work"] })  →  "<svg …>"
 */
(function (root) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NARROW = 600;      // below this width, stack the boxes in one column
  let NODE_H = 72;         // set per layout: tall enough for the longest description (up to 3 lines)
  const CHAR_W = 6.8;      // average width of a 12px character, for wrapping the detail line

  /** Split text into at most three lines that fit `width` pixels; the last line ends in "…" if it's cut. */
  function wrap(text, width) {
    const max = Math.max(8, Math.floor(width / CHAR_W));
    const lines = [""];
    for (const word of String(text).split(/\s+/)) {
      const cur = lines[lines.length - 1];
      if (!cur || (cur + " " + word).length <= max) lines[lines.length - 1] = cur ? cur + " " + word : word;
      else if (lines.length < 3) lines.push(word);
      else { lines[2] = (lines[2] + " " + word).slice(0, max - 1) + "…"; break; }
    }
    return lines.map(l => (l.length > max ? l.slice(0, max - 1) + "…" : l));
  }

  /** Split the boxes into the "build" lane, the "use" lane and the monitoring box. */
  function lanes(nodes) {
    const n = nodes.length;
    return { build: nodes.slice(0, n - 3), run: nodes.slice(n - 3, n - 1), mon: nodes[n - 1] };
  }

  function box(n, x, y, w, extra = "") {
    const lines = wrap(n.detail, w - 28);
    return `<g class="d-node${extra}"><rect x="${x}" y="${y}" width="${w}" height="${NODE_H}" rx="12"/>
      <text class="d-label" x="${x + 14}" y="${y + 26}">${esc(n.label)}</text>
      ${lines.map((l, i) => `<text class="d-detail" x="${x + 14}" y="${y + 46 + i * 16}">${esc(l)}</text>`).join("")}</g>`;
  }
  const line = (pts, cls = "") => `<path class="d-edge${cls}" d="M${pts.map(p => p.join(" ")).join(" L")}" marker-end="url(#d-arrow)"/>`;

  /** Laid-out boxes and edges for the given width. Exposed for tests. */
  function layout(nodes, width) {
    const { build, run, mon } = lanes(nodes);
    const placed = [], edges = [];
    const fit = w => { NODE_H = 40 + 16 * Math.max(1, ...nodes.map(n => wrap(n.detail, w - 28).length)); };
    if (width >= NARROW) {
      const cols = Math.max(build.length, run.length + 1), G = 40;
      const w = (width - (cols - 1) * G) / cols;
      fit(w);
      const x = c => c * (w + G);
      const y1 = 28, y2 = y1 + NODE_H + 72;
      build.forEach((n, c) => placed.push({ n, x: x(c), y: y1, w }));
      run.forEach((n, k) => placed.push({ n, x: x(cols - 1 - k), y: y2, w }));
      const monCol = cols - 1 - run.length;
      placed.push({ n: mon, x: x(monCol), y: y2, w, mon: true });
      const mid = (p) => p.x + w / 2, cy = y => y + NODE_H / 2;
      for (let c = 0; c < build.length - 1; c++) edges.push({ pts: [[x(c) + w, cy(y1)], [x(c + 1) - 4, cy(y1)]] });
      // last "build" box down to the first "use" box
      const from = placed[build.length - 1], to = placed[build.length], gapY = y1 + NODE_H + 36;
      edges.push({ pts: mid(from) === mid(to) ? [[mid(from), y1 + NODE_H], [mid(to), y2 - 4]]
        : [[mid(from), y1 + NODE_H], [mid(from), gapY], [mid(to), gapY], [mid(to), y2 - 4]] });
      // the "use" lane runs right to left, ending at monitoring
      const row2 = placed.slice(build.length);
      for (let k = 0; k < row2.length - 1; k++) edges.push({ pts: [[row2[k].x, cy(y2)], [row2[k + 1].x + w + 4, cy(y2)]] });
      // feedback: monitoring back up to training
      const target = placed[Math.max(0, build.length - 2)], m = placed[placed.length - 1];
      edges.push({ feedback: true, pts: [[mid(m), y2], [mid(m), gapY], [mid(target), gapY], [mid(target), y1 + NODE_H + 4]],
        label: { x: (mid(m) + mid(target)) / 2, y: gapY - 8 } });
      return { width, height: y2 + NODE_H + 30, placed, edges, laneLabels: [{ x: 0, y: 16 }, { x: 0, y: y2 + NODE_H + 24 }] };
    }
    // Narrow: one column, with room on the right for the feedback loop.
    const w = width - 36, gap = 32, laneGap = 44;
    fit(w);
    let y = 0;
    const laneLabels = [];
    const add = (n, opts = {}) => { placed.push(Object.assign({ n, x: 0, y, w }, opts)); y += NODE_H + gap; };
    laneLabels.push({ x: 0, y: 16 }); y = 28;
    build.forEach(n => add(n));
    y += laneGap - gap; laneLabels.push({ x: 40, y: y - 12 }); y += 4; // beside the arrow, not across it
    run.forEach(n => add(n));
    add(mon, { mon: true });
    const height = y - gap + 4;
    for (let i = 0; i < placed.length - 1; i++) {
      const a = placed[i], b = placed[i + 1], cx = 28;
      edges.push({ pts: [[cx, a.y + NODE_H], [cx, b.y - 4]] });
    }
    const target = placed[Math.max(0, build.length - 2)], m = placed[placed.length - 1], rx = width - 10;
    edges.push({ feedback: true, pts: [[w, m.y + NODE_H / 2], [rx, m.y + NODE_H / 2], [rx, target.y + NODE_H / 2], [w + 4, target.y + NODE_H / 2]] });
    return { width, height, placed, edges, laneLabels };
  }

  function render(nodes, width, opts = {}) {
    if (!nodes || nodes.length < 4) return "";
    const names = opts.lanes || ["Build the model", "Put it to work"];
    const L = layout(nodes, Math.max(280, Math.round(width)));
    const { build, run, mon } = lanes(nodes);
    const target = build[Math.max(0, build.length - 2)];
    const desc = `${names[0]}: ${build.map(n => `${n.label} (${n.detail})`).join(", then ")}. ` +
      `${names[1]}: ${run.map(n => `${n.label} (${n.detail})`).join(", then ")}. ` +
      `${mon.label} (${mon.detail}) tells you when to go back to ${target.label}.`;
    const body = L.placed.map(p => box(p.n, p.x, p.y, p.w, p.mon ? " mon" : "")).join("") +
      L.edges.map(e => line(e.pts, e.feedback ? " feedback" : "")).join("") +
      L.edges.filter(e => e.label).map(e => `<text class="d-note" x="${e.label.x}" y="${e.label.y}" text-anchor="middle">retrain</text>`).join("") +
      L.laneLabels.map((l, i) => `<text class="d-lane" x="${l.x}" y="${l.y}">${esc(names[i])}</text>`).join("");
    return `<svg class="diagram" viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}" role="img" aria-labelledby="d-title d-desc">
      <title id="d-title">Architecture diagram</title><desc id="d-desc">${esc(desc)}</desc>
      <defs><marker id="d-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path class="d-arrow" d="M0 0L10 5L0 10z"/></marker></defs>${body}</svg>`;
  }

  const API = { render, layout, lanes, wrap, NARROW };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.HM_DIAGRAM = API;
})(typeof window !== "undefined" ? window : globalThis);
