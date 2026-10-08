/*
 * Widget: the learning rate. Training rolls downhill on an error curve (here error = w²) in steps whose size
 * is the learning rate: too small crawls, about right settles fast, too big overshoots or flies off.
 */
(function (root) {
  const RATES = [0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9, 1.05];
  const START = -0.9, STEPS = 15;

  /** Positions after each step of gradient descent on error = w² (gradient 2w). */
  function run(rate, steps = STEPS, start = START) {
    const ws = [start];
    for (let i = 0; i < steps; i++) ws.push(ws[i] - rate * 2 * ws[i]);
    return ws;
  }
  /** "slow", "good", "bouncy" or "diverges", and how many steps it took to get close to the bottom. */
  function verdict(rate) {
    const ws = run(rate), close = ws.findIndex(w => Math.abs(w) < 0.05);
    if (Math.abs(ws[STEPS]) > Math.abs(START)) return { kind: "diverges", close };
    if (close === -1) return { kind: "slow", close };
    if (rate > 0.5) return { kind: "bouncy", close };
    return { kind: "good", close };
  }

  const W = 600, H = 260, PAD = 24;
  const sx = w => W / 2 + w * (W / 2 - PAD) / 1.2, sy = e => H - PAD - e * (H - 2 * PAD) / 1.44;

  function mount(el) {
    let curve = "";
    for (let i = 0; i <= 96; i++) { const w = -1.2 + i * 0.025; curve += (i ? " L" : "M") + sx(w).toFixed(1) + " " + sy(w * w).toFixed(1); }
    el.innerHTML = `
      <div class="w-controls">
        <div class="w-field"><label for="gdRate">Learning rate</label>
          <input type="range" id="gdRate" min="0" max="${RATES.length - 1}" step="1" value="2"><output for="gdRate" id="gdOut"></output></div>
        <div class="w-actions"><button type="button" class="btn primary small" id="gdRun">Run ${STEPS} steps</button></div>
      </div>
      <figure class="w-figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="gdSvgTitle"><title id="gdSvgTitle"></title>
        <path class="line soft" d="${curve}"/>
        <text class="tick" x="${sx(0)}" y="${H - 6}" text-anchor="middle">lowest error</text>
        <path class="line" id="gdPath"/><g id="gdDots"></g><text class="label" id="gdOff" y="20"></text>
      </svg>
      <figcaption class="w-legend"><span>Each step of training</span><span class="soft">Error for each setting of the model</span></figcaption></figure>
      <p class="w-verdict" id="gdNote" aria-live="polite">Pick a learning rate, then press “Run ${STEPS} steps”.</p>`;
    const $ = s => el.querySelector(s);
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer = null;
    const rate = () => RATES[+$("#gdRate").value];
    function paint(ws) {
      // Stop drawing where a step leaves the chart (a learning rate that’s far too big).
      const off = ws.findIndex(w => Math.abs(w) > 1.2);
      const shown = off === -1 ? ws : ws.slice(0, off);
      const pts = shown.map(w => [sx(w), sy(w * w)]);
      $("#gdOff").textContent = off === -1 ? "" : ws[off] > 0 ? "off the chart →" : "← off the chart";
      $("#gdOff").setAttribute("x", ws[off] > 0 ? W - PAD : PAD);
      $("#gdOff").setAttribute("text-anchor", ws[off] > 0 ? "end" : "start");
      $("#gdPath").setAttribute("d", pts.length > 1 ? "M" + pts.map(p => p.map(n => n.toFixed(1)).join(" ")).join(" L") : "");
      $("#gdDots").innerHTML = pts.map((p, i) => `<circle class="dot${i === pts.length - 1 ? " warm" : ""}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 8 : 5}"/>`).join("");
    }
    function explain() {
      const r = rate(), v = verdict(r), note = $("#gdNote");
      const text = {
        slow: `<b>Too small.</b> Every step is safe but tiny: after ${STEPS} steps it’s still far from the bottom. Training would take far too long.`,
        good: `<b>About right.</b> It reaches the bottom in ${v.close} steps without overshooting.`,
        bouncy: `<b>On the big side.</b> It overshoots and bounces from side to side, though it still settles, in ${v.close} steps. A bit smaller would be smoother.`,
        diverges: "<b>Too big.</b> Every step overshoots further than the last, so the error grows instead of shrinking. In real training this shows up as a loss that explodes or turns into NaN."
      }[v.kind];
      note.innerHTML = text;
      note.classList.toggle("bad", v.kind === "slow" || v.kind === "diverges");
      $("#gdSvgTitle").textContent = `Learning rate ${r}: ${note.textContent}`;
    }
    function start() {
      clearInterval(timer);
      const ws = run(rate());
      $("#gdNote").textContent = "Running…";
      if (reduce) { paint(ws); explain(); return; }
      let i = 1;
      paint(ws.slice(0, 1));
      timer = setInterval(() => { i++; paint(ws.slice(0, i)); if (i > STEPS) { clearInterval(timer); explain(); } }, 160);
    }
    $("#gdRate").addEventListener("input", () => { $("#gdOut").textContent = rate(); clearInterval(timer); paint([START]); $("#gdNote").textContent = `Press “Run ${STEPS} steps” to try a learning rate of ${rate()}.`; });
    $("#gdRun").addEventListener("click", start);
    const idle = () => { $("#gdSvgTitle").textContent = `An error curve shaped like a valley. Training starts high on the left side. Learning rate: ${rate()}.`; };
    $("#gdRate").addEventListener("input", idle);
    $("#gdOut").textContent = rate();
    paint([START]);
    idle();
  }

  const API = { mount, run, verdict, RATES };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else (root.HM_WIDGETS = root.HM_WIDGETS || {}).gradient = mount;
})(typeof window !== "undefined" ? window : globalThis);
