// Headless end-to-end smoke test. Mocks DOM/Canvas/Audio + a virtual clock,
// then auto-drives the whole story (keyboard-equivalent input) to the end,
// asserting: no exceptions, all 4 memories collectible, reaches the letter + end.

// ---- virtual scheduler ----
let vnow = 0, timers = [], tid = 1, rafQ = [], rid = 1;
globalThis.setTimeout = (cb, ms = 0) => { const id = tid++; timers.push({ id, t: vnow + (ms || 0), cb }); return id; };
globalThis.clearTimeout = (id) => { timers = timers.filter((x) => x.id !== id); };
globalThis.requestAnimationFrame = (cb) => { rafQ.push(cb); return rid++; };
globalThis.cancelAnimationFrame = () => {};
globalThis.performance = { now: () => vnow };
function step(dt) {
  vnow += dt;
  let guard = 0;
  while (true) {
    const due = timers.filter((x) => x.t <= vnow).sort((a, b) => a.t - b.t);
    if (!due.length) break;
    timers = timers.filter((x) => x.t > vnow);
    for (const d of due) d.cb();
    if (++guard > 2000) break;
  }
  const q = rafQ; rafQ = [];
  for (const cb of q) cb(vnow);
}

// ---- DOM / Canvas / media mocks ----
function makeCtx() {
  const store = { fillStyle: "#000", strokeStyle: "#000", font: "10px", globalAlpha: 1, lineWidth: 1, imageSmoothingEnabled: false, globalCompositeOperation: "source-over", filter: "none", textAlign: "left", textBaseline: "alphabetic" };
  const grad = () => ({ addColorStop() {} });
  const special = {
    measureText: (t) => ({ width: (t ? String(t).length : 0) * 6 }),
    createLinearGradient: grad, createRadialGradient: grad,
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, (w | 0) * (h | 0)) * 4), width: w | 0, height: h | 0 }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, (w | 0) * (h | 0)) * 4), width: w | 0, height: h | 0 }),
  };
  return new Proxy(store, { get(t, p) { if (p in special) return special[p]; if (p in t) return t[p]; return () => {}; }, set(t, p, v) { t[p] = v; return true; } });
}
function makeCanvas(w = 300, h = 150) { const ctx = makeCtx(); return { width: w, height: h, style: {}, getContext: () => ctx, addEventListener() {}, removeEventListener() {} }; }

globalThis.innerWidth = 960; globalThis.innerHeight = 540; globalThis.devicePixelRatio = 1;
const canvasC = makeCanvas(innerWidth, innerHeight);
const stub = () => ({ style: { display: "none" }, remove() {}, set textContent(v) {}, addEventListener() {} });
globalThis.document = {
  createElement: (tag) => (tag === "canvas" ? makeCanvas() : stub()),
  getElementById: (id) => (id === "c" ? canvasC : stub()),
};
const listeners = {};
globalThis.addEventListener = (t, cb) => { (listeners[t] = listeners[t] || []).push(cb); };
globalThis.removeEventListener = () => {};
globalThis.window = globalThis;
Object.defineProperty(globalThis, "navigator", { value: { getGamepads: () => [] }, configurable: true });
globalThis.location = { search: "", href: "", reload() { globalThis.__reloaded = true; } };
class Img { set src(v) { this._s = v; setTimeout(() => { this.onerror && this.onerror(); }, 0); } }
globalThis.Image = Img;
class Aud { constructor() { this._l = {}; } addEventListener(t, cb) { (this._l[t] = this._l[t] || []).push(cb); } set src(v) { setTimeout(() => { (this._l.error || []).forEach((f) => f()); }, 0); } play() { return Promise.resolve(); } pause() {} }
globalThis.Audio = Aud;
globalThis.AudioContext = class { constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; } createGain() { return param(); } createOscillator() { return osc(); } createDelay() { return param(); } resume() { return Promise.resolve(); } };
function param() { const g = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {}, connect() {} }; g.gain = g; g.delayTime = g; return g; }
function osc() { return { type: "sine", frequency: param(), connect() {}, start() {}, stop() {} }; }

// ---- run ----
const { boot, G } = await import("../public/game.js");
const { story } = await import("../public/scenes.js");

process.on("unhandledRejection", (e) => { console.error("UNHANDLED REJECTION:", e && e.stack ? e.stack : e); });
boot(story);
const S = G.S;
const chapters = new Set();
let error = null, frames = 0;
const MAX = 24000;
let lastMode = "";
const trace = [];

while (frames < MAX) {
  try {
    // input policy
    if (S.dlg || S.mode === "narrate" || S.mode === "titlecard" || S.choiceUI || S.mode === "letter" || S.mode === "recap" || S.mode === "title" || S.mode === "lang") {
      S.input.action = true;
    } else if (S.fireflies) {
      const fly = S.fireflies.list.find((f) => !f.caught); if (fly) S.input.tapAt = { x: fly.x, y: fly.y };
    } else if (S.minigame) {
      const m = S.minigame; const t = m.ordered ? m.targets[m.got] : m.targets.find((tt) => !tt.hit);
      if (t) S.input.tapAt = { x: t.x, y: t.y };
    } else if (S._exploreActive && S.markers && S.markers.length) {
      const m = S.markers.find((mm) => !mm.term) || S.markers[0]; S.input.tapAt = { x: m.x, y: m.y };
    } else {
      S.input.action = true; // walks/cines: harmless
    }
    if (S.mode === "titlecard" && S.titlecard) chapters.add(S.titlecard.title);
    step(16);
  } catch (e) { error = e; break; }
  frames++;
  if (S.mode !== lastMode) { lastMode = S.mode; trace.push(`@${frames} mode=${S.mode} bg=${S.scene.bg} expl=${!!S._exploreActive} dlg=${!!S.dlg} chap=${S.titlecard ? S.titlecard.title : "-"}`); }
  if (frames % 1500 === 0) trace.push(`@${frames} TICK mode=${S.mode} bg=${S.scene.bg} expl=${!!S._exploreActive} dlg=${!!S.dlg} fade=${S.fade.toFixed(2)} mem=${S.memoriesKept}`);
  if (S.mode === "end") break;
  // yield so awaited story continuations (microtasks) run
  await new Promise((r) => queueMicrotask(r));
}
console.log("--- trace ---"); console.log(trace.slice(0, 60).join("\n"));

// ---- report ----
console.log(`frames simulated : ${frames}`);
console.log(`final mode       : ${S.mode}`);
console.log(`chapters seen    : ${[...chapters].join(" | ")}`);
console.log(`memories kept    : ${S.memoriesKept} / 6  (${Object.keys(S.flags).filter((k) => k.startsWith("mem_")).join(", ")})`);
console.log(`letter PS uses   : ${S.flags.mem_boat ? "boat variant" : "default"}`);

let fails = 0;
const need = (c, m) => { if (!c) { console.error("  ✗ " + m); fails++; } else console.log("  ✓ " + m); };
need(!error, "no runtime exceptions" + (error ? `: ${error.stack || error}` : ""));
need(S.mode === "end" || S.mode === "letter", "reached the letter / ending");
need(S.memoriesKept === 6, "all 6 memories collectible in one playthrough");
need(chapters.size >= 4, "all chapter title cards shown");
console.log(fails ? `\nSMOKE TEST FAILED (${fails})` : "\nSMOKE TEST PASSED");
process.exit(fails ? 1 : 0);
