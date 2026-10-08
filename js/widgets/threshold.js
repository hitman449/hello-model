/*
 * Widget: precision and recall. 30 emails sit on a line by the model's spam score; everything at or above
 * the threshold is blocked. Moving the threshold trades blocked real email against missed spam.
 */
(function (root) {
  // [score, is it really spam?]. Fixed, so the numbers in the text are the same for everyone.
  const EMAILS = [
    [0.03, 0], [0.06, 0], [0.09, 0], [0.12, 0], [0.15, 0], [0.18, 0], [0.22, 0], [0.26, 1], [0.27, 0], [0.31, 0],
    [0.35, 0], [0.40, 0], [0.44, 1], [0.46, 0], [0.49, 0], [0.57, 1], [0.58, 0], [0.66, 1], [0.70, 1], [0.71, 0],
    [0.74, 1], [0.77, 1], [0.80, 1], [0.83, 1], [0.86, 1], [0.88, 0], [0.90, 1], [0.93, 1], [0.96, 1], [0.98, 1]
  ];
  function score(threshold) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const [s, spam] of EMAILS) {
      const blocked = s >= threshold;
      if (blocked && spam) tp++; else if (blocked) fp++; else if (spam) fn++; else tn++;
    }
    return { tp, fp, fn, tn, precision: tp + fp ? tp / (tp + fp) : 1, recall: tp / (tp + fn) };
  }

  const H = 150, PAD = 20;
  function mount(el) {
    // Narrow screens get a narrower drawing, so its text stays readable instead of shrinking.
    const W = el.clientWidth < 520 ? 360 : 600, sx = s => PAD + s * (W - 2 * PAD);
    el.innerHTML = `
      <div class="w-controls">
        <div class="w-field"><label for="thVal">Block emails with a spam score of at least</label>
          <input type="range" id="thVal" min="0.05" max="0.95" step="0.05" value="0.5"><output for="thVal" id="thOut"></output></div>
      </div>
      <figure class="w-figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="thSvgTitle"><title id="thSvgTitle"></title>
        <rect class="zone" id="thZone" y="8" height="${H - 40}"/>
        <text class="label" x="${PAD}" y="34">Spam</text><text class="label" x="${PAD}" y="94">Real email</text>
        ${EMAILS.map(([s, spam]) => `<circle class="dot${spam ? "" : " hollow"}" cx="${sx(s)}" cy="${spam ? 52 : 112}" r="6"/>`).join("")}
        <line class="axis" id="thLine" y1="4" y2="${H - 28}" stroke-width="2"/>
        <line class="axis" x1="${PAD}" x2="${W - PAD}" y1="${H - 24}" y2="${H - 24}"/>
        <text class="tick" x="${PAD}" y="${H - 6}">0 · real</text><text class="tick" x="${W - PAD}" y="${H - 6}" text-anchor="end">1 · spam</text>
      </svg>
      <figcaption class="w-legend"><span>Really spam</span><span class="hollow">Really a real email</span><span class="zone">Shaded: blocked</span></figcaption></figure>
      <div class="w-stats" aria-live="polite">
        <div class="w-stat"><small>Spam caught</small><b id="thTp"></b></div>
        <div class="w-stat"><small>Real emails wrongly blocked</small><b id="thFp"></b></div>
        <div class="w-stat"><small>Spam that got through</small><b id="thFn"></b></div>
        <div class="w-stat"><small>Precision: blocked emails that really were spam</small><b id="thP"></b></div>
        <div class="w-stat"><small>Recall: share of all spam that got blocked</small><b id="thR"></b></div>
      </div>
      <p class="w-verdict" id="thNote" aria-live="polite"></p>`;
    const $ = s => el.querySelector(s), pct = x => Math.round(x * 100) + "%";
    function draw() {
      const t = +$("#thVal").value, r = score(t), x = sx(t);
      $("#thOut").textContent = t.toFixed(2);
      $("#thZone").setAttribute("x", x); $("#thZone").setAttribute("width", W - PAD - x);
      $("#thLine").setAttribute("x1", x); $("#thLine").setAttribute("x2", x);
      $("#thTp").textContent = `${r.tp} of ${r.tp + r.fn}`;
      $("#thFp").textContent = r.fp; $("#thFn").textContent = r.fn;
      $("#thP").textContent = pct(r.precision); $("#thR").textContent = pct(r.recall);
      $("#thSvgTitle").textContent = `Threshold ${t.toFixed(2)}: ${r.tp} spam caught, ${r.fn} missed, ${r.fp} real emails blocked.`;
      const note = $("#thNote");
      note.classList.toggle("bad", r.fp > 2 || r.recall < 0.7);
      note.innerHTML = r.fp > 2 ? `<b>Too strict.</b> ${r.fp} real emails are blocked. People miss important messages, which is usually worse than seeing some spam. Raise the threshold.`
        : r.recall < 0.7 ? `<b>Too lenient.</b> Almost no real email is blocked, but ${r.fn} spam emails get through. Lower the threshold.`
        : `<b>A reasonable balance.</b> ${r.fp ? `${r.fp} real email${r.fp > 1 ? "s are" : " is"} blocked` : "No real email is blocked"} and ${pct(r.recall)} of spam is caught. No threshold gets both perfect. Choose one based on which mistake costs you more.`;
    }
    $("#thVal").addEventListener("input", draw);
    draw();
  }

  const API = { mount, score, EMAILS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else (root.HM_WIDGETS = root.HM_WIDGETS || {}).threshold = mount;
})(typeof window !== "undefined" ? window : globalThis);
