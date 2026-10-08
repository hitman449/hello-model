/*
 * Widget: train / validation / test splits. 100 squares stand for the dataset (1% each); sliders set the
 * validation and test shares, and "Data over time" shows why time series are split by date, not at random.
 */
(function (root) {
  const SIZES = [200, 1000, 10000, 100000];

  /** Rows per part for a dataset of `n` rows. */
  function split(n, valPct, testPct) {
    const test = Math.round(n * testPct / 100), val = Math.round(n * valPct / 100);
    return { train: n - val - test, val, test };
  }
  /** Plain-English warnings for a split, if any. */
  function warnings(n, valPct, testPct) {
    const s = split(n, valPct, testPct), out = [];
    if (s.test < 100) out.push(`Only ${s.test} test rows: the final score will jump around a lot. With this little data, use cross-validation instead.`);
    if (100 - valPct - testPct < 60) out.push("Less than 60% is left for training, so the model has less to learn from than it could.");
    if (n >= 100000 && testPct + valPct > 30) out.push("With this much data, 5–10% each for validation and test is plenty. Give the rest to training.");
    return out;
  }

  function mount(el) {
    el.innerHTML = `
      <div class="w-controls">
        <div class="w-field"><label for="spSize">Rows in your dataset</label>
          <select id="spSize">${SIZES.map(n => `<option value="${n}"${n === 1000 ? " selected" : ""}>${n.toLocaleString("en")}</option>`).join("")}</select></div>
        <div class="w-field"><label for="spVal">Validation share</label>
          <input type="range" id="spVal" min="5" max="30" step="5" value="15"><output for="spVal" id="spValOut"></output></div>
        <div class="w-field"><label for="spTest">Test share</label>
          <input type="range" id="spTest" min="5" max="30" step="5" value="15"><output for="spTest" id="spTestOut"></output></div>
      </div>
      <div class="w-controls">
        <label class="w-check"><input type="checkbox" id="spTime"> Data over time (like daily sales)</label>
        <button type="button" class="btn small" id="spShuffle">Shuffle again</button>
      </div>
      <figure class="w-figure"><svg viewBox="0 0 400 148" role="img" aria-labelledby="spSvgTitle"><title id="spSvgTitle"></title><g id="spGrid"></g></svg>
        <p class="w-order hidden" id="spOrder" aria-hidden="true"><span>← oldest</span><span>newest →</span></p>
        <figcaption class="w-legend"><span>Training</span><span class="warm">Validation</span><span class="soft">Test</span></figcaption></figure>
      <div class="w-stats" aria-live="polite">
        <div class="w-stat"><small>Training: the model learns from these</small><b id="spTrain"></b></div>
        <div class="w-stat"><small>Validation: for choosing settings</small><b id="spValN"></b></div>
        <div class="w-stat"><small>Test: opened once, at the very end</small><b id="spTestN"></b></div>
      </div>
      <p class="w-verdict" id="spNote" aria-live="polite"></p>`;
    const $ = s => el.querySelector(s);
    let order = shuffled();
    function shuffled() { const a = [...Array(100).keys()]; for (let i = 99; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function draw() {
      const n = +$("#spSize").value, v = +$("#spVal").value, t = +$("#spTest").value, time = $("#spTime").checked;
      const s = split(n, v, t), fmt = x => x.toLocaleString("en");
      // Square k (in time order) belongs to train, validation or test; at random unless the data is over time.
      const kind = k => { const r = time ? k : order[k]; return r < 100 - v - t ? "train" : r < 100 - t ? "val" : "test"; };
      $("#spGrid").innerHTML = Array.from({ length: 100 }, (_, k) =>
        `<rect class="cell ${kind(k)}" x="${(k % 20) * 20}" y="${Math.floor(k / 20) * 28 + 8}" width="20" height="28" rx="3"/>`).join("");
      $("#spOrder").classList.toggle("hidden", !time);
      $("#spValOut").textContent = `${v}%`; $("#spTestOut").textContent = `${t}%`;
      $("#spTrain").textContent = `${fmt(s.train)} rows (${100 - v - t}%)`;
      $("#spValN").textContent = `${fmt(s.val)} rows`;
      $("#spTestN").textContent = `${fmt(s.test)} rows`;
      $("#spShuffle").disabled = time;
      $("#spSvgTitle").textContent = `${fmt(n)} rows: ${fmt(s.train)} for training, ${fmt(s.val)} for validation, ${fmt(s.test)} for testing, ${time ? "split by date" : "picked at random"}.`;
      const warn = warnings(n, v, t), note = $("#spNote");
      note.classList.toggle("bad", warn.length > 0);
      note.innerHTML = warn.length ? warn.join(" ") : time
        ? "<b>Split by date.</b> Train on the past, test on the most recent period. A random split would let the model peek at the future, and its score would look better than it really is."
        : "<b>A sensible split.</b> Rows are picked at random, so each part looks like the whole dataset. Press “Shuffle again” to see a different random pick.";
    }
    el.querySelectorAll("input, select").forEach(i => i.addEventListener("input", draw));
    $("#spShuffle").addEventListener("click", () => { order = shuffled(); draw(); });
    draw();
  }

  const API = { mount, split, warnings };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else (root.HM_WIDGETS = root.HM_WIDGETS || {}).splits = mount;
})(typeof window !== "undefined" ? window : globalThis);
