/*
 * Widget: overfitting and underfitting. A curve of adjustable complexity (a polynomial) is fitted to noisy
 * training points; its error on those points and on unseen points shows under-, good and over-fitting.
 */
(function (root) {
  // Same points for everyone: a seeded random generator.
  function rng(seed) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const truth = x => 0.9 * Math.sin(3 * x) + 0.2 * x;
  function makePoints() {
    const r = rng(7), gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
    const pts = n => Array.from({ length: n }, (_, i) => { const x = -1 + 2 * (i + 0.2 + 0.6 * r()) / n; return { x, y: truth(x) + 0.2 * gauss() }; });
    return { train: pts(12), test: pts(40) };
  }

  /** Least-squares polynomial of the given degree (tiny ridge term keeps high degrees stable). */
  function fit(points, degree) {
    const n = degree + 1, A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    for (const { x, y } of points) {
      const p = Array.from({ length: n }, (_, i) => x ** i);
      for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i][j] += p[i] * p[j]; A[i][n] += p[i] * y; }
    }
    for (let i = 0; i < n; i++) A[i][i] += 1e-7;
    for (let c = 0; c < n; c++) { // Gaussian elimination with partial pivoting
      let best = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[best][c])) best = r;
      [A[c], A[best]] = [A[best], A[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
    }
    const coef = A.map((row, i) => row[n] / row[i]);
    return x => coef.reduce((s, c, i) => s + c * x ** i, 0);
  }
  const rmse = (f, pts) => Math.sqrt(pts.reduce((s, p) => s + (f(p.x) - p.y) ** 2, 0) / pts.length);

  function errorsByDegree(data, max = 12) {
    return Array.from({ length: max }, (_, i) => { const f = fit(data.train, i + 1); return { degree: i + 1, train: rmse(f, data.train), test: rmse(f, data.test) }; });
  }
  /** "under", "good" or "over", judged against the best possible error on new data. */
  function verdict(errs, degree) {
    const best = errs.reduce((a, b) => (b.test < a.test ? b : a));
    const e = errs[degree - 1];
    if (degree < best.degree && e.test > best.test * 1.25) return "under";
    if (degree > best.degree && e.test > best.test * 1.25) return "over";
    return "good";
  }

  const W = 600, H = 300, PAD = 28;
  const sx = x => PAD + (x + 1) / 2 * (W - 2 * PAD), sy = y => H / 2 - y * (H / 2 - PAD) / 1.6;
  const clampY = y => Math.max(-4, Math.min(4, y)); // far off-chart values are cut by the clip path

  function mount(el) {
    const data = makePoints(), errs = errorsByDegree(data);
    el.innerHTML = `
      <div class="w-controls">
        <div class="w-field"><label for="fitDeg">Model complexity</label>
          <input type="range" id="fitDeg" min="1" max="12" step="1" value="1">
          <output for="fitDeg" id="fitDegOut" aria-hidden="true"></output></div>
      </div>
      <figure class="w-figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="fitSvgTitle"><title id="fitSvgTitle"></title>
        <line class="axis" x1="${PAD}" x2="${W - PAD}" y1="${H / 2}" y2="${H / 2}"/>
        <path class="line soft" d="${path(truth)}"/>
        <clipPath id="fitClip"><rect x="0" y="4" width="${W}" height="${H - 8}"/></clipPath>
        <path class="line" id="fitCurve" clip-path="url(#fitClip)"/>
        ${data.train.map(p => `<circle class="dot" cx="${sx(p.x)}" cy="${sy(p.y)}" r="5"/>`).join("")}
        ${data.test.map(p => `<circle class="dot hollow" cx="${sx(p.x)}" cy="${sy(p.y)}" r="5"/>`).join("")}
      </svg>
      <figcaption class="w-legend"><span>Training data</span><span class="hollow">New data (never trained on)</span><span class="soft">The real pattern</span></figcaption></figure>
      <div class="w-stats">
        <div class="w-stat"><small>Error on training data</small><b id="fitTrain"></b></div>
        <div class="w-stat"><small>Error on new data</small><b id="fitTest"></b></div>
      </div>
      <p class="w-verdict" id="fitVerdict" aria-live="polite"></p>`;
    const input = el.querySelector("#fitDeg");
    const words = { under: "Underfitting", good: "A good fit", over: "Overfitting" };
    const say = {
      under: "The model is too simple to follow the pattern, so it’s wrong on training data and new data alike. Add complexity.",
      good: "The curve follows the real pattern without chasing the noise, so it does about as well on new data as it can.",
      over: "The model bends to pass near every training dot, noise included. Its training error keeps falling, but it gets worse on new data. That’s overfitting."
    };
    function draw() {
      const d = +input.value, f = fit(data.train, d), e = errs[d - 1], v = verdict(errs, d);
      el.querySelector("#fitCurve").setAttribute("d", path(x => clampY(f(x))));
      el.querySelector("#fitDegOut").textContent = `Level ${d} of 12 · ${d === 1 ? "a straight line" : d <= 3 ? "a gentle curve" : d <= 6 ? "a flexible curve" : "a very wiggly curve"}`;
      el.querySelector("#fitDeg").setAttribute("aria-valuetext", el.querySelector("#fitDegOut").textContent);
      el.querySelector("#fitTrain").textContent = e.train.toFixed(2);
      el.querySelector("#fitTest").textContent = e.test.toFixed(2);
      const out = el.querySelector("#fitVerdict");
      out.innerHTML = `<b>${words[v]}.</b> ${say[v]}`;
      out.classList.toggle("bad", v !== "good");
      el.querySelector("#fitSvgTitle").textContent = `Complexity level ${d}: training error ${e.train.toFixed(2)}, error on new data ${e.test.toFixed(2)}. ${words[v]}.`;
    }
    input.addEventListener("input", draw);
    draw();
  }
  function path(f) {
    let d = "";
    for (let i = 0; i <= 120; i++) { const x = -1 + i / 60; d += (i ? " L" : "M") + sx(x).toFixed(1) + " " + sy(f(x)).toFixed(1); }
    return d;
  }

  const API = { mount, fit, rmse, makePoints, errorsByDegree, verdict };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else (root.HM_WIDGETS = root.HM_WIDGETS || {}).fit = mount;
})(typeof window !== "undefined" ? window : globalThis);
