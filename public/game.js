// game.js — Paper Boats engine. Exposes G (story primitive API) + boot(storyFn).
import { art, NATIVE_W, NATIVE_H, PAL, paperBoat } from "./art.js";
import { audio } from "./audio.js";
import { UI, NARR, SPEAKER, DIALOGUE, LETTER } from "./strings.js";

const NW = NATIVE_W, NH = NATIVE_H;
const SPEED = 52; // native px / second

// ---------------- global state ----------------
const S = {
  locale: "vi",
  flags: {}, memoriesKept: 0,
  canvas: null, ctx: null, nat: null, nctx: null,
  view: { scale: 4, ox: 0, oy: 0 },
  scene: { bg: "village", palette: "warm", bounds: { x: 14, y: 96, w: 292, h: 78 } },
  player: { x: 160, y: 150, dir: "down", frame: 0, animT: 0, moving: false, visible: false },
  thu: { x: 70, y: 130, visible: false, portrait: "thu_normal", alpha: 0.88, flickerT: 0, bob: 0, fadeTarget: 0.88 },
  fireflies: null,
  cam: { zoom: 1, cx: NW / 2, cy: NH / 2, tz: 1, tcx: NW / 2, tcy: NH / 2 },
  dim: 0, dimT: 0, vignette: 0,
  fade: 1, fadeTarget: 1,
  mode: "boot",            // boot|lang|title|play|narrate|titlecard|dialogue|choice|letter|end
  markers: [],
  input: { held: new Set(), action: false, pointer: null, drag: null, tapAt: null },
  hint: "",
  storyFn: null,
  paused: false,
  acc: 0, last: 0,
};

// ---------------- palette tints (per chapter mood) ----------------
const PALETTES = {
  warm:    { fill: "rgba(255,196,120,0.05)", op: "soft-light", filter: "none" },
  doubt:   { fill: "rgba(70,96,140,0.20)", op: "multiply", filter: "saturate(0.82)" },
  truth:   { fill: "rgba(150,70,110,0.18)", op: "multiply", filter: "saturate(0.95)" },
  night:   { fill: "rgba(40,60,110,0.22)", op: "multiply", filter: "none" },
  none:    { fill: null, op: "source-over", filter: "none" },
};

// ---------------- boot / canvas ----------------
function boot(storyFn) {
  S.storyFn = storyFn;
  S.canvas = document.getElementById("c");
  S.ctx = S.canvas.getContext("2d");
  const off = document.createElement("canvas"); off.width = NW; off.height = NH;
  S.nat = off; S.nctx = off.getContext("2d");
  art.buildPlaceholders();
  resize();
  addEventListener("resize", resize); addEventListener("orientationchange", resize);
  addEventListener("blur", () => { S.paused = true; });
  addEventListener("focus", () => { S.paused = false; S.last = performance.now(); });
  bindInput();
  // try to load real assets (Higgsfield) in background; harmless if absent
  art.loadReal(); audio.loadReal();
  S.last = performance.now();
  requestAnimationFrame(frame);
  enterLanguageSelect();
}

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = innerWidth, h = innerHeight;
  S.canvas.width = w * dpr; S.canvas.height = h * dpr;
  S.canvas.style.width = w + "px"; S.canvas.style.height = h + "px";
  S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S.ctx.imageSmoothingEnabled = false;
  const scale = Math.max(1, Math.min(w / NW, h / NH));
  S.view = { scale, ox: (w - NW * scale) / 2, oy: (h - NH * scale) / 2, w, h };
}

// ---------------- input ----------------
const BIND = { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right", ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
const ACTION_KEYS = new Set(["Space", "Enter", "NumpadEnter", "KeyZ", "KeyE"]);

function bindInput() {
  addEventListener("keydown", (e) => {
    audio.init(); audio.resume();
    if (BIND[e.code]) { S.input.held.add(BIND[e.code]); e.preventDefault(); }
    if (e.code === "ArrowUp" || e.code === "KeyW") S.input.navUp = true;
    if (e.code === "ArrowDown" || e.code === "KeyS") S.input.navDown = true;
    if (ACTION_KEYS.has(e.code)) { S.input.action = true; e.preventDefault(); }
    _wake();
  });
  addEventListener("keyup", (e) => { if (BIND[e.code]) S.input.held.delete(BIND[e.code]); });
  const cv = () => S.canvas;
  cv().addEventListener("mousedown", (e) => { audio.init(); audio.resume(); onPress(e.clientX, e.clientY); });
  cv().addEventListener("mousemove", (e) => { if (S.input.drag) S.input.drag.cur = scr2nat(e.clientX, e.clientY); });
  addEventListener("mouseup", () => onRelease());
  cv().addEventListener("touchstart", (e) => { audio.init(); audio.resume(); const t = e.changedTouches[0]; onPress(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  cv().addEventListener("touchmove", (e) => { const t = e.changedTouches[0]; if (S.input.drag) S.input.drag.cur = scr2nat(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
  cv().addEventListener("touchend", (e) => { onRelease(); e.preventDefault(); }, { passive: false });
}
function _wake() { if (S.paused) { S.paused = false; S.last = performance.now(); } }
function scr2nat(sx, sy) { return { x: (sx - S.view.ox) / S.view.scale, y: (sy - S.view.oy) / S.view.scale }; }
function onPress(sx, sy) {
  const p = scr2nat(sx, sy);
  S.input.drag = { start: p, cur: p, startT: performance.now(), startScreen: { x: sx, y: sy } };
  S.input.tapAt = p;
  S.input.action = true; // a press also acts as "advance" for dialogue/title
}
function onRelease() {
  const d = S.input.drag;
  if (d) { const dt = performance.now() - d.startT; const moved = Math.hypot(d.cur.x - d.start.x, d.cur.y - d.start.y); if (dt < 350 && moved < 6) S.input.tapAt = d.cur; }
  S.input.drag = null;
}
function consumeAction() { const a = S.input.action; S.input.action = false; return a; }
function consumeTap() { const t = S.input.tapAt; S.input.tapAt = null; return t; }
function consumeNav() { let n = 0; if (S.input.navUp) n = -1; else if (S.input.navDown) n = 1; S.input.navUp = false; S.input.navDown = false; return n; }

// movement vector from held keys + drag
function moveVec() {
  let vx = 0, vy = 0;
  if (S.input.held.has("left")) vx -= 1; if (S.input.held.has("right")) vx += 1;
  if (S.input.held.has("up")) vy -= 1; if (S.input.held.has("down")) vy += 1;
  const d = S.input.drag;
  if (d) { const dx = d.cur.x - d.start.x, dy = d.cur.y - d.start.y; const m = Math.hypot(dx, dy); if (m > 4) { vx += dx / m; vy += dy / m; } }
  const m = Math.hypot(vx, vy); if (m > 1) { vx /= m; vy /= m; }
  return { vx, vy };
}

// ---------------- main loop ----------------
const STEP = 1000 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  if (S.paused) { S.last = now; return; }
  let elapsed = now - S.last; S.last = now;
  if (elapsed > 250) elapsed = STEP; // recover from tab stalls
  S.acc += elapsed;
  while (S.acc >= STEP) { update(STEP / 1000); S.acc -= STEP; }
  render();
}

let _padPrev = {};
function pollGamepad() {
  const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
  for (const gp of pads) {
    if (!gp) continue;
    const ax = gp.axes || [], b = gp.buttons || [];
    const press = (i) => b[i] && b[i].pressed;
    // dpad + left stick → movement
    S.input.held.delete("up"); S.input.held.delete("down"); S.input.held.delete("left"); S.input.held.delete("right");
    if (press(12) || ax[1] < -0.4) S.input.held.add("up");
    if (press(13) || ax[1] > 0.4) S.input.held.add("down");
    if (press(14) || ax[0] < -0.4) S.input.held.add("left");
    if (press(15) || ax[0] > 0.4) S.input.held.add("right");
    // A / Start → action (edge); up/down (edge) → menu nav
    const edge = (i) => { const p = press(i); const was = _padPrev[i]; _padPrev[i] = p; return p && !was; };
    if (edge(0) || edge(9)) S.input.action = true;
    if (edge(12)) S.input.navUp = true;
    if (edge(13)) S.input.navDown = true;
    break;
  }
}

function update(dt) {
  pollGamepad();
  // camera easing
  const c = S.cam, k = 1 - Math.pow(0.001, dt);
  c.zoom += (c.tz - c.zoom) * k; c.cx += (c.tcx - c.cx) * k; c.cy += (c.tcy - c.cy) * k;
  S.dim += (S.dimT - S.dim) * k;
  S.fade += (S.fadeTarget - S.fade) * (1 - Math.pow(0.0005, dt));
  // Thu flicker + bob + fade
  const t = S.thu;
  t.bob += dt;
  if (t.visible) {
    t.flickerT -= dt;
    if (t.flickerT <= 0) { t.flickerT = 3 + Math.random() * 1; }
    t.alpha += (t.fadeTarget - t.alpha) * (1 - Math.pow(0.02, dt));
  }
  // player movement only when allowed (explore/walk active)
  if (S._moveEnabled && S.player.visible) {
    const { vx, vy } = moveVec();
    const p = S.player;
    p.moving = (vx || vy) ? true : false;
    if (p.moving) {
      p.x = clamp(p.x + vx * SPEED * dt, S.scene.bounds.x, S.scene.bounds.x + S.scene.bounds.w);
      p.y = clamp(p.y + vy * SPEED * dt, S.scene.bounds.y, S.scene.bounds.y + S.scene.bounds.h);
      if (Math.abs(vx) > Math.abs(vy)) p.dir = vx > 0 ? "right" : "left"; else p.dir = vy > 0 ? "down" : "up";
      p.animT += dt; if (p.animT > 0.16) { p.animT = 0; p.frame = (p.frame + 1) % 3; if (p.frame === 0 || p.frame === 2) audio.sfx("step"); }
    } else { p.frame = 0; }
  }
  // dialogue typewriter
  if (S.dlg) tickDialogue(dt);
  // fireflies minigame
  if (S.fireflies) tickFireflies(dt);
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---------------- rendering ----------------
function render() {
  const ctx = S.ctx, V = S.view;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, V.w, V.h);
  if (S.mode === "lang") { drawLanguage(); drawFade(); return; }
  if (S.mode === "title") { composeWorld(); blitWorld(); drawTitle(); drawFade(); return; }
  if (S.mode === "letter") { drawLetter(); drawFade(); return; }
  if (S.mode === "end") { drawEnd(); drawFade(); return; }

  composeWorld();
  blitWorld();
  // world dim (cinematic / night)
  if (S.dim > 0.001) { ctx.fillStyle = `rgba(0,0,0,${S.dim})`; ctx.fillRect(0, 0, V.w, V.h); }
  drawVignette();
  // overlays
  if (S.mode === "narrate") drawNarrate();
  if (S.mode === "titlecard") drawTitleCard();
  if (S.dlg) drawDialogue();
  if (S.choiceUI) drawChoice();
  if (S.fireflies) drawFirefliesUI();
  if (S.hint) drawHint();
  drawFade();
}

function composeWorld() {
  const x = S.nctx;
  const pal = PALETTES[S.scene.palette] || PALETTES.warm;
  x.save();
  x.filter = pal.filter || "none";
  const bg = art.bg[S.scene.bg];
  if (bg) x.drawImage(bg, 0, 0, NW, NH); else { x.fillStyle = "#222"; x.fillRect(0, 0, NW, NH); }
  x.filter = "none";
  // fireflies behind/around
  if (S.fireflies) drawFirefliesWorld(x);
  // entities sorted by y
  const ents = [];
  if (S.thu.visible) ents.push({ y: S.thu.y, kind: "thu" });
  if (S.player.visible) ents.push({ y: S.player.y, kind: "player" });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.kind === "thu" ? drawThu(x) : drawPlayer(x);
  // markers
  for (const m of S.markers) drawMarker(x, m);
  // palette tint over everything
  if (pal.fill) { x.globalCompositeOperation = pal.op; x.fillStyle = pal.fill; x.fillRect(0, 0, NW, NH); x.globalCompositeOperation = "source-over"; }
  x.restore();
}

function blitWorld() {
  const ctx = S.ctx, V = S.view, c = S.cam;
  const sc = V.scale * c.zoom;
  const dw = NW * sc, dh = NH * sc;
  // place world so the camera center maps to the screen center
  const drawX = (V.w / 2) - c.cx * sc;
  const drawY = (V.h / 2) - c.cy * sc;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.nat, drawX, drawY, dw, dh);
}

function drawPlayer(x) {
  const p = S.player; const fr = art.sprite.minh.frames[art.sprite.minh.still ? 0 : p.frame];
  const w = fr.width, h = fr.height;
  x.save();
  if (p.dir === "left") { x.translate(p.x + w / 2, 0); x.scale(-1, 1); x.drawImage(fr, 0, p.y - h + 2); }
  else x.drawImage(fr, Math.round(p.x - w / 2), Math.round(p.y - h + 2));
  x.restore();
}
function drawThu(x) {
  const t = S.thu; const fr = art.sprite.thu.frames[0];
  const w = fr.width, h = fr.height;
  const bob = Math.sin(t.bob * 2) * 0.6;
  let a = t.alpha;
  if (t.flickerT < 0.06 && t.fadeTarget > 0.3) a = Math.max(0.5, t.alpha - 0.18); // micro flicker
  // glow
  x.save(); x.globalCompositeOperation = "lighter";
  x.globalAlpha = a * 0.5; x.fillStyle = "rgba(150,220,210,0.5)";
  x.beginPath(); x.ellipse(t.x, t.y - h / 2, w * 0.8, h * 0.7, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  x.save(); x.globalAlpha = a;
  x.drawImage(fr, Math.round(t.x - w / 2), Math.round(t.y - h + 2 + bob));
  x.restore();
}
function drawMarker(x, m) {
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
  x.save();
  x.globalAlpha = 0.5 + 0.5 * pulse;
  x.fillStyle = m.color || PAL.amber;
  // small diamond
  const cx = m.x, cy = m.y - 16 - pulse * 2;
  x.beginPath(); x.moveTo(cx, cy - 3); x.lineTo(cx + 3, cy); x.lineTo(cx, cy + 3); x.lineTo(cx - 3, cy); x.closePath(); x.fill();
  x.restore();
}

// ---------------- screen-space UI ----------------
function uiFont(px) { return `${px}px "Be Vietnam Pro", "Segoe UI", system-ui, Arial, sans-serif`; }
function drawFade() { if (S.fade > 0.001) { S.ctx.fillStyle = `rgba(0,0,0,${clamp(S.fade, 0, 1)})`; S.ctx.fillRect(0, 0, S.view.w, S.view.h); } }
function drawVignette() {
  if (S.vignette < 0.01) return;
  const V = S.view, ctx = S.ctx;
  const g = ctx.createRadialGradient(V.w / 2, V.h / 2, Math.min(V.w, V.h) * 0.25, V.w / 2, V.h / 2, Math.max(V.w, V.h) * 0.7);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${S.vignette})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, V.w, V.h);
}

function drawDialogue() {
  const ctx = S.ctx, V = S.view;
  const d = S.dlg;
  const bh = Math.min(170, V.h * 0.30);
  const pad = Math.max(12, V.w * 0.04);
  const bx = pad, by = V.h - bh - pad * 0.6, bw = V.w - pad * 2, bh2 = bh;
  // panel
  ctx.fillStyle = "rgba(20,16,12,0.90)"; roundRect(ctx, bx, by, bw, bh2, 10); ctx.fill();
  ctx.strokeStyle = "rgba(239,230,200,0.55)"; ctx.lineWidth = 2; roundRect(ctx, bx, by, bw, bh2, 10); ctx.stroke();
  let tx = bx + 20;
  // portrait
  const line = d.lines[d.i];
  if (line.p && art.portrait[line.p]) {
    const ps = Math.min(bh2 - 24, 132);
    const por = art.portrait[line.p];
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(por, bx + 14, by + (bh2 - ps) / 2, ps, ps);
    ctx.strokeStyle = "rgba(239,230,200,0.5)"; ctx.lineWidth = 2; ctx.strokeRect(bx + 14, by + (bh2 - ps) / 2, ps, ps);
    tx = bx + 14 + ps + 22;
  }
  // speaker
  const name = SPEAKER[S.locale][line.sp] || "";
  let ty = by + 30;
  if (name) { ctx.fillStyle = line.sp === "thu" ? "#bfe6dd" : "#f2d79a"; ctx.font = "600 " + uiFont(Math.max(16, V.h * 0.028)); ctx.fillText(name, tx, ty); ty += 12; }
  // text (typewriter, word-wrapped)
  ctx.fillStyle = "#f3eede"; ctx.font = uiFont(Math.max(15, V.h * 0.026));
  const shown = line.t.slice(0, Math.floor(d.shown));
  wrapText(ctx, shown, tx, ty + 16, bx + bw - tx - 18, Math.max(20, V.h * 0.034));
  // advance arrow
  if (d.shown >= line.t.length) {
    const blink = (Math.sin(performance.now() / 250) > 0);
    if (blink) { ctx.fillStyle = "#f2d79a"; ctx.font = uiFont(18); ctx.fillText("▾", bx + bw - 28, by + bh2 - 14); }
  }
}
function startDialogue(key, done) {
  const lines = (DIALOGUE[S.locale][key] || []).map((l) => ({ ...l }));
  if (!lines.length) { done && done(); return; }
  S.dlg = { lines, i: 0, shown: 0, done, blipT: 0 };
  // sync Thu portrait expression to the line if Thu is speaking
  syncThuPortrait();
  S.mode = (S.mode === "play" || S.mode === "narrate" || S.mode === "titlecard") ? S.mode : S.mode;
}
function syncThuPortrait() {
  if (!S.dlg) return; const l = S.dlg.lines[S.dlg.i];
  if (l && l.sp === "thu" && l.p) S.thu.portrait = l.p;
}
function tickDialogue(dt) {
  const d = S.dlg; const line = d.lines[d.i];
  if (d.shown < line.t.length) {
    d.shown += dt * 42; // chars/sec
    d.blipT -= dt;
    if (d.blipT <= 0 && line.sp) { audio.blip(line.sp); d.blipT = 0.055; }
    if (d.shown > line.t.length) d.shown = line.t.length;
  }
  if (consumeAction()) {
    if (d.shown < line.t.length) { d.shown = line.t.length; }
    else { advanceDialogue(); }
  }
  consumeTap(); // taps already counted as action
}
function advanceDialogue() {
  const d = S.dlg; d.i++;
  if (d.i >= d.lines.length) { const cb = d.done; S.dlg = null; cb && cb(); }
  else { d.shown = 0; d.blipT = 0; syncThuPortrait(); }
}

function drawChoice() {
  const ctx = S.ctx, V = S.view; const c = S.choiceUI;
  const bw = Math.min(V.w * 0.7, 520), bx = (V.w - bw) / 2;
  const bhh = Math.max(40, V.h * 0.075), gap = 14;
  const total = c.opts.length * (bhh + gap);
  let by = V.h * 0.5 - total / 2;
  c._rects = [];
  for (let i = 0; i < c.opts.length; i++) {
    const r = { x: bx, y: by, w: bw, h: bhh };
    const hov = c.hover === i;
    ctx.fillStyle = hov ? "rgba(60,48,32,0.96)" : "rgba(24,20,16,0.92)";
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.strokeStyle = hov ? "#f2d79a" : "rgba(239,230,200,0.5)"; ctx.lineWidth = 2; roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.stroke();
    ctx.fillStyle = "#f3eede"; ctx.font = uiFont(Math.max(15, V.h * 0.026)); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(c.opts[i].label, r.x + r.w / 2, r.y + r.h / 2);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    c._rects.push(r); by += bhh + gap;
  }
}

function drawHint() {
  const ctx = S.ctx, V = S.view;
  ctx.fillStyle = "rgba(0,0,0,0.5)"; const tw = ctx.measureText ? 0 : 0;
  ctx.font = uiFont(Math.max(13, V.h * 0.022)); ctx.textAlign = "center";
  const m = ctx.measureText(S.hint).width;
  ctx.fillStyle = "rgba(0,0,0,0.45)"; roundRect(ctx, V.w / 2 - m / 2 - 14, V.h * 0.06 - 16, m + 28, 28, 8); ctx.fill();
  ctx.fillStyle = "rgba(243,238,222,0.9)"; ctx.fillText(S.hint, V.w / 2, V.h * 0.06 + 3);
  ctx.textAlign = "left";
}

// ---------------- language / title / narrate / titlecard / letter / end ----------------
function enterLanguageSelect() {
  S.mode = "lang"; S.fade = 0; S.fadeTarget = 0;
}
function drawLanguage() {
  const ctx = S.ctx, V = S.view;
  const g = ctx.createLinearGradient(0, 0, 0, V.h); g.addColorStop(0, "#2a2f4a"); g.addColorStop(1, "#534a5e");
  ctx.fillStyle = g; ctx.fillRect(0, 0, V.w, V.h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f3ecdf"; ctx.font = "700 " + uiFont(Math.max(34, V.h * 0.07)); ctx.fillText("Paper Boats", V.w / 2, V.h * 0.3);
  ctx.fillStyle = "rgba(243,236,223,0.7)"; ctx.font = uiFont(Math.max(16, V.h * 0.03)); ctx.fillText("Chọn ngôn ngữ · Choose your language", V.w / 2, V.h * 0.4);
  const bw = Math.min(260, V.w * 0.7), bh = Math.max(44, V.h * 0.08), gap = 18;
  S._langRects = [];
  const labels = [["vi", "Tiếng Việt"], ["en", "English"]];
  let by = V.h * 0.5;
  for (const [loc, lab] of labels) {
    const r = { x: V.w / 2 - bw / 2, y: by, w: bw, h: bh, loc };
    const hov = S._langHover === loc;
    ctx.fillStyle = hov ? "rgba(80,64,44,0.95)" : "rgba(30,26,20,0.85)"; roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = hov ? "#f2d79a" : "rgba(239,230,200,0.55)"; ctx.lineWidth = 2; roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.stroke();
    ctx.fillStyle = "#f3eede"; ctx.font = "600 " + uiFont(Math.max(18, V.h * 0.034)); ctx.textBaseline = "middle"; ctx.fillText(lab, V.w / 2, r.y + r.h / 2); ctx.textBaseline = "alphabetic";
    S._langRects.push(r); by += bh + gap;
  }
  ctx.textAlign = "left";
  // keyboard / gamepad navigation
  if (S._langIdx === undefined) S._langIdx = 0;
  const nav = consumeNav(); if (nav) S._langIdx = (S._langIdx + nav + 2) % 2;
  S._langHover = ["vi", "en"][S._langIdx];
  if (consumeAction()) { S.locale = S._langHover; enterTitle(); return; }
  // pointer handling
  handleMenuPointer(S._langRects, (r) => { S.locale = r.loc; enterTitle(); }, (loc) => { S._langHover = loc; if (loc) S._langIdx = loc === "vi" ? 0 : 1; });
}

let _titleT = 0;
function enterTitle() { S.mode = "title"; S.scene = { bg: "title", palette: "none", bounds: S.scene.bounds }; S.player.visible = false; S.thu.visible = false; S.cam = { zoom: 1, cx: NW / 2, cy: NH / 2, tz: 1, tcx: NW / 2, tcy: NH / 2 }; S.fade = 1; S.fadeTarget = 0; audio.music("village"); }
function drawTitle() {
  const ctx = S.ctx, V = S.view; _titleT += 0.016;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, V.h * 0.18, V.w, V.h * 0.2);
  ctx.fillStyle = "#f3ecdf"; ctx.font = "700 " + uiFont(Math.max(40, V.h * 0.09));
  ctx.fillText("Paper Boats", V.w / 2, V.h * 0.30);
  if (Math.sin(_titleT * 2) > -0.3) { ctx.fillStyle = "rgba(243,236,223,0.85)"; ctx.font = uiFont(Math.max(15, V.h * 0.028)); ctx.fillText(UI[S.locale].press_start, V.w / 2, V.h * 0.75); }
  ctx.textAlign = "left";
  if (consumeAction() || consumeTap()) { consumeAction(); consumeTap(); startStory(); }
}

let _storyStarted = false;
function startStory() {
  if (_storyStarted) return; _storyStarted = true;
  S.fadeTarget = 1;
  setTimeout(() => { S.mode = "play"; S.storyFn(G).then(() => { /* story end handled inside */ }); }, 700);
}

// narrate: black screen, narrator line(s)
function drawNarrate() {
  const ctx = S.ctx, V = S.view; ctx.fillStyle = "rgba(0,0,0,0.92)"; ctx.fillRect(0, 0, V.w, V.h);
  const n = S.narr;
  ctx.fillStyle = "#e9e2d2"; ctx.font = uiFont(Math.max(17, V.h * 0.032)); ctx.textAlign = "center";
  const shown = n.text.slice(0, Math.floor(n.shown));
  wrapTextCentered(ctx, shown, V.w / 2, V.h * 0.42, V.w * 0.7, Math.max(26, V.h * 0.045));
  if (n.shown >= n.text.length && (Math.sin(performance.now() / 300) > 0)) { ctx.fillStyle = "rgba(233,226,210,0.6)"; ctx.font = uiFont(13); ctx.fillText(UI[S.locale].press_continue, V.w / 2, V.h * 0.85); }
  ctx.textAlign = "left";
  // tick
  if (n.shown < n.text.length) { n.shown += 0.016 * 40; if (Math.floor(n.shown) % 2 === 0) audio.blip("narr"); }
  if (consumeAction()) { if (n.shown < n.text.length) n.shown = n.text.length; else { const cb = n.done; S.narr = null; S.mode = "play"; cb && cb(); } }
  consumeTap();
}

function drawTitleCard() {
  const ctx = S.ctx, V = S.view; ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, V.w, V.h);
  const tc = S.titlecard; ctx.textAlign = "center";
  ctx.fillStyle = "rgba(242,215,154,0.8)"; ctx.font = uiFont(Math.max(14, V.h * 0.026));
  ctx.fillText(UI[S.locale].chapter_label + " " + tc.num, V.w / 2, V.h * 0.42);
  ctx.fillStyle = "#f3ecdf"; ctx.font = "700 " + uiFont(Math.max(28, V.h * 0.06));
  ctx.fillText(tc.title, V.w / 2, V.h * 0.52);
  ctx.textAlign = "left";
}

function drawLetter() {
  const ctx = S.ctx, V = S.view;
  const bg = art.bg.letter; const sc = Math.max(V.w / NW, V.h / NH); const dw = NW * sc, dh = NH * sc;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(bg, (V.w - dw) / 2, (V.h - dh) / 2, dw, dh);
  const L = LETTER[S.locale];
  const body = L.body.slice();
  body.push("");
  body.push(S.flags.mem_boat ? L.ps_boat : L.ps_default);
  if (S.memoriesKept >= 3) { body.push(""); body.push(L.thanks); }
  ctx.fillStyle = PAL.ink; ctx.textAlign = "center";
  const fs = Math.max(13, Math.min(20, V.h * 0.026));
  ctx.font = uiFont(fs);
  const lineH = fs * 1.5;
  const total = body.length * lineH;
  let y = Math.max(V.h * 0.1, V.h / 2 - total / 2) + S.letterScroll;
  for (const ln of body) {
    if (y > -lineH && y < V.h + lineH) { ctx.font = ln.startsWith("—") ? "italic " + uiFont(fs) : uiFont(fs); ctx.fillText(ln, V.w / 2, y); }
    y += lineH;
  }
  // scroll if long
  if (total > V.h * 0.84) { S.letterScroll -= 0.45; if (y < V.h * 0.2) S.letterScroll = 0; }
  ctx.textAlign = "left";
  // continue hint
  if (Math.sin(performance.now() / 350) > 0) { ctx.fillStyle = "rgba(40,30,20,0.6)"; ctx.font = uiFont(13); ctx.textAlign = "center"; ctx.fillText(UI[S.locale].press_continue, V.w / 2, V.h - 18); ctx.textAlign = "left"; }
  if (consumeAction() || consumeTap()) { consumeAction(); consumeTap(); S.mode = "end"; S.endT = 0; }
}

function drawEnd() {
  const ctx = S.ctx, V = S.view; ctx.fillStyle = "#0d0a08"; ctx.fillRect(0, 0, V.w, V.h);
  S.endT = (S.endT || 0) + 0.016;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f3ecdf"; ctx.font = "700 " + uiFont(Math.max(30, V.h * 0.06)); ctx.fillText(UI[S.locale].credits, V.w / 2, V.h * 0.32);
  ctx.fillStyle = "rgba(243,236,223,0.65)"; ctx.font = "italic " + uiFont(Math.max(14, V.h * 0.026));
  wrapTextCentered(ctx, NARR[S.locale].credits_line, V.w / 2, V.h * 0.44, V.w * 0.7, Math.max(22, V.h * 0.04));
  ctx.fillStyle = "rgba(242,215,154,0.85)"; ctx.font = uiFont(Math.max(13, V.h * 0.024));
  ctx.fillText(UI[S.locale].memories_kept + ": " + S.memoriesKept + " / 4", V.w / 2, V.h * 0.62);
  // paper boat drift
  const nat = S.nat, nx = S.nctx; nx.clearRect(0, 0, NW, NH);
  paperBoat(nx, (S.endT * 14) % (NW + 40) - 20, 0, 1.6);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(nat, 0, 0, NW, NH, 0, V.h * 0.7, V.w, V.h * 0.18);
  // restart button
  const bw = Math.min(220, V.w * 0.6), bh = Math.max(40, V.h * 0.07);
  const r = { x: V.w / 2 - bw / 2, y: V.h * 0.82, w: bw, h: bh };
  ctx.fillStyle = S._endHover ? "rgba(80,64,44,0.95)" : "rgba(30,26,20,0.85)"; roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
  ctx.strokeStyle = S._endHover ? "#f2d79a" : "rgba(239,230,200,0.5)"; ctx.lineWidth = 2; roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.stroke();
  ctx.fillStyle = "#f3eede"; ctx.font = "600 " + uiFont(Math.max(16, V.h * 0.03)); ctx.textBaseline = "middle"; ctx.fillText(UI[S.locale].restart, V.w / 2, r.y + r.h / 2); ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  consumeNav();
  if (consumeAction()) { location.reload(); return; }
  handleMenuPointer([r], () => location.reload(), (h) => S._endHover = h);
}

// menu pointer helper
function handleMenuPointer(rects, onClick, onHover) {
  const tap = S.input.tapAt; const drag = S.input.drag;
  const px = drag ? drag.cur : (tap || null);
  // hover via last mouse — approximate using tapAt only; for desktop hover use mousemove pointer
  if (S._mouse) { let h = null; for (const r of rects) if (inRect(S._mouse, r)) h = r.loc !== undefined ? r.loc : true; onHover && onHover(h); }
  if (tap) { for (const r of rects) if (inRect(tap, r)) { S.input.tapAt = null; S.input.action = false; onClick(r); return; } }
}
function inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

// track mouse for hover in screen space
addEventListener("mousemove", (e) => { S._mouse = { x: e.clientX, y: e.clientY }; });

// ---------------- text utils ----------------
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(" "); let line = "", yy = y;
  for (const w of words) { const test = line ? line + " " + w : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = test; }
  if (line) ctx.fillText(line, x, yy);
}
function wrapTextCentered(ctx, text, cx, y, maxW, lh) {
  const paras = text.split("\n"); let yy = y;
  for (const para of paras) {
    const words = para.split(" "); let line = "";
    for (const w of words) { const test = line ? line + " " + w : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, cx, yy); line = w; yy += lh; } else line = test; }
    if (line) ctx.fillText(line, cx, yy); yy += lh;
  }
}

// ================= FIREFLIES MINIGAME =================
function startFireflies(done) {
  const list = [];
  for (let i = 0; i < 9; i++) list.push({ x: 20 + Math.random() * 280, y: 60 + Math.random() * 90, ph: Math.random() * 6.28, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 8, caught: false });
  S.fireflies = { list, caught: 0, need: 5, done };
  S.hint = "";
}
function tickFireflies(dt) {
  const f = S.fireflies;
  for (const fly of f.list) { if (fly.caught) continue; fly.ph += dt * 3; fly.x += fly.vx * dt; fly.y += fly.vy * dt; if (fly.x < 14 || fly.x > 306) fly.vx *= -1; if (fly.y < 56 || fly.y > 150) fly.vy *= -1; }
  const tap = consumeTap();
  if (tap) {
    for (const fly of f.list) { if (!fly.caught && Math.hypot(fly.x - tap.x, fly.y - tap.y) < 12) { fly.caught = true; f.caught++; audio.sfx("firefly"); break; } }
  }
  consumeAction();
  if (f.caught >= f.need) { const cb = f.done; const kept = f.caught >= f.need; S.fireflies = null; S.hint = ""; cb && cb(kept); }
}
function drawFirefliesWorld(x) {
  const f = S.fireflies;
  for (const fly of f.list) {
    if (fly.caught) continue;
    const a = 0.5 + 0.5 * Math.sin(fly.ph);
    x.save(); x.globalCompositeOperation = "lighter";
    x.globalAlpha = a; x.fillStyle = "rgba(255,230,140,0.9)"; x.beginPath(); x.arc(fly.x, fly.y, 3, 0, 6.28); x.fill();
    x.globalAlpha = a * 0.4; x.beginPath(); x.arc(fly.x, fly.y, 7, 0, 6.28); x.fill();
    x.restore();
  }
}
function drawFirefliesUI() {
  const ctx = S.ctx, V = S.view; const f = S.fireflies;
  ctx.textAlign = "center"; ctx.fillStyle = "rgba(0,0,0,0.4)"; roundRect(ctx, V.w / 2 - 90, V.h * 0.08 - 18, 180, 30, 8); ctx.fill();
  ctx.fillStyle = "#ffe68c"; ctx.font = uiFont(Math.max(15, V.h * 0.028));
  ctx.fillText(UI[S.locale].fireflies_goal + f.caught + " / " + f.need, V.w / 2, V.h * 0.08 + 3);
  ctx.textAlign = "left";
  // jar bottom-right
  const jx = V.w - 70, jy = V.h - 90;
  ctx.fillStyle = "rgba(180,210,230,0.25)"; roundRect(ctx, jx, jy, 44, 60, 8); ctx.fill();
  ctx.strokeStyle = "rgba(220,240,255,0.5)"; ctx.lineWidth = 2; roundRect(ctx, jx, jy, 44, 60, 8); ctx.stroke();
  for (let i = 0; i < f.caught; i++) { ctx.fillStyle = "rgba(255,230,140,0.9)"; ctx.beginPath(); ctx.arc(jx + 10 + (i % 3) * 12, jy + 50 - Math.floor(i / 3) * 12, 3, 0, 6.28); ctx.fill(); }
}

// ================= STORY PRIMITIVE API (G) =================
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = {
  S,
  t(key) { return UI[S.locale][key] ?? key; },
  setLocale(l) { S.locale = l; },
  flag(k, v = true) { S.flags[k] = v; },
  getFlag(k) { return !!S.flags[k]; },
  keepMemory(id) { if (!S.flags[id]) { S.flags[id] = true; S.memoriesKept++; } },
  memories() { return S.memoriesKept; },

  async wait(ms) { await wait(ms); },

  music(name) { audio.music(name); },
  sfx(name) { audio.sfx(name); },

  async fadeOut(ms = 900) { S.fadeTarget = 1; await wait(ms); },
  async fadeIn(ms = 900) { S.fadeTarget = 0; await wait(ms); },
  setBlack(on) { S.fade = on ? 1 : 0; S.fadeTarget = on ? 1 : 0; },

  scene(bg, opts = {}) {
    S.scene = { bg, palette: opts.palette || "warm", bounds: opts.bounds || { x: 16, y: 100, w: 288, h: 72 } };
    if (opts.spawn) { S.player.x = opts.spawn.x; S.player.y = opts.spawn.y; }
    S.player.visible = opts.player !== false;
    S.markers = [];
    S.cam = { zoom: 1, cx: NW / 2, cy: NH / 2, tz: 1, tcx: NW / 2, tcy: NH / 2 };
    S.dimT = opts.dim || 0;
  },
  palette(p) { S.scene.palette = p; },
  showThu(x, y, portrait = "thu_normal") { S.thu.x = x; S.thu.y = y; S.thu.portrait = portrait; S.thu.visible = true; S.thu.alpha = 0.88; S.thu.fadeTarget = 0.88; },
  hideThu() { S.thu.visible = false; },
  moveThu(x, y) { S.thu.x = x; S.thu.y = y; },
  player(on) { S.player.visible = on; },

  async titleCard(num, titleKey) {
    S.titlecard = { num, title: UI[S.locale][titleKey] }; S.mode = "titlecard";
    S.fadeTarget = 0; await wait(2600); S.mode = "play";
  },

  async narrate(textKeyOrText, raw = false) {
    const text = raw ? textKeyOrText : (NARR[S.locale][textKeyOrText] ?? textKeyOrText);
    S.mode = "narrate"; S.narr = { text, shown: 0, done: null };
    await new Promise((res) => { S.narr.done = res; });
  },

  async dialogue(key) { S._moveEnabled = false; await new Promise((res) => startDialogue(key, res)); },

  async choice(opts) {
    // opts: [{label, value}]
    S.choiceUI = { opts: opts.map((o) => ({ label: UI[S.locale][o.labelKey] ?? o.label, value: o.value })), hover: 0 };
    return await new Promise((res) => {
      const finish = (i) => { S.input.tapAt = null; S.input.action = false; const v = S.choiceUI.opts[i].value; S.choiceUI = null; res(v); };
      const tick = () => {
        const c = S.choiceUI; if (!c) return;
        // keyboard / gamepad navigation
        const nav = consumeNav(); if (nav) c.hover = (c.hover + nav + c.opts.length) % c.opts.length;
        // pointer hover
        if (S._mouse && c._rects) c._rects.forEach((r, i) => { if (inRect({ x: S._mouse.x, y: S._mouse.y }, r)) c.hover = i; });
        // confirm via action key
        if (consumeAction()) { finish(c.hover); return; }
        // confirm via tap on a rect
        const tap = S.input.tapAt;
        if (tap && c._rects) { for (let i = 0; i < c._rects.length; i++) if (inRect(tap, c._rects[i])) { finish(i); return; } S.input.tapAt = null; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  },

  // free exploration: zones=[{id,x,y,r,marker,onInteract:async,terminator?}]
  async explore(zones, hintKey) {
    S._moveEnabled = true; S.player.visible = true;
    S.markers = zones.filter((z) => z.marker !== false).map((z) => ({ x: z.x, y: z.y, color: z.color, term: !!z.terminator, id: z.id }));
    S.hint = hintKey ? UI[S.locale][hintKey] : "";
    return await new Promise((res) => {
      const done = new Set();
      const loop = async () => {
        if (!S._exploreActive) return;
        // interaction: action or tap near a zone, or player walks into terminator
        const act = consumeAction(); const tap = consumeTap();
        let triggered = null;
        for (const z of zones) {
          const near = Math.hypot(S.player.x - z.x, S.player.y - z.y) < (z.r || 16);
          const tapped = tap && Math.hypot(tap.x - z.x, tap.y - z.y) < (z.r || 18);
          if (z.terminator && (near || tapped)) { triggered = z; break; }
          if ((act && near) || tapped) { triggered = z; break; }
        }
        if (triggered) {
          if (triggered.terminator) { S._exploreActive = false; S._moveEnabled = false; S.markers = []; S.hint = ""; if (triggered.onInteract) await triggered.onInteract(); res(triggered.id); return; }
          if (!(triggered.once && done.has(triggered.id))) { done.add(triggered.id); S._moveEnabled = false; if (triggered.onInteract) await triggered.onInteract(); S._moveEnabled = true; if (triggered.once) S.markers = S.markers.filter((m) => !(m.x === triggered.x && m.y === triggered.y)); }
        }
        requestAnimationFrame(loop);
      };
      S._exploreActive = true; requestAnimationFrame(loop);
    });
  },

  // walk player to a point automatically (no control), e.g. scripted approach
  async walkPlayerTo(x, y, speed = SPEED) {
    S._moveEnabled = false; S.player.visible = true; S.player.moving = true;
    return await new Promise((res) => {
      const step = () => {
        const p = S.player; const dx = x - p.x, dy = y - p.y; const d = Math.hypot(dx, dy);
        if (d < 1.5) { p.moving = false; p.frame = 0; res(); return; }
        const vx = dx / d, vy = dy / d;
        p.x += vx * speed * 0.016; p.y += vy * speed * 0.016;
        if (Math.abs(vx) > Math.abs(vy)) p.dir = vx > 0 ? "right" : "left"; else p.dir = vy > 0 ? "down" : "up";
        p.animT += 0.016; if (p.animT > 0.16) { p.animT = 0; p.frame = (p.frame + 1) % 3; }
        requestAnimationFrame(step);
      };
      step();
    });
  },

  async cineEnter(x, y, zoom = 1.9, dim = 0.45) {
    S.cam.tz = zoom; S.cam.tcx = x; S.cam.tcy = y; S.dimT = dim; S.vignette = 0.55; await wait(1500);
  },
  async cineExit() { S.cam.tz = 1; S.cam.tcx = NW / 2; S.cam.tcy = NH / 2; S.dimT = S.scene.palette === "night" ? 0 : 0; S.vignette = 0; await wait(1200); },

  async fireflies() { return await new Promise((res) => startFireflies(res)); },

  // Thu farewell fade 0.88 -> 0 across ms
  async thuFade(ms = 8000) {
    S.thu.fadeTarget = 0;
    const start = performance.now();
    // staged per doc: 0.88->0.6->0.3->0
    const stages = [0.6, 0.3, 0.0];
    for (const s of stages) { S.thu.fadeTarget = s; await wait(ms / 3); }
    S.thu.visible = false;
  },

  async letter() {
    S.letterScroll = 0; S.mode = "letter"; S.fade = 1; S.fadeTarget = 0;
    audio.music("cadao");
    await new Promise(() => {}); // terminal: letter -> end -> restart handles itself
  },
};

export { boot, G };
