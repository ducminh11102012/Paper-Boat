// art.js — cohesive hand-coded pixel art (placeholders) + optional real-asset override.
// STYLE FORMULA (locked): Cozy 16-bit pixel art, warm Vietnamese golden-hour village,
// the ghost girl pale washed-out blue-green with faint glow, amber lanterns/fireflies,
// soft dark-umber outlines, top-down storybook perspective.
//
// Every drawer paints at the native 320x180 grid (doc spec) and is cached. If a real
// image exists under ./assets/, it is loaded (sprites keyed for transparency) and used
// instead — so swapping in Higgsfield art is a drop-in with no code change.

export const NATIVE_W = 320, NATIVE_H = 180;

export const PAL = {
  skyTop: "#f6c98a", skyMid: "#f3a866", skyLow: "#e98c5a",
  sunHaze: "#ffe6b0",
  grass1: "#7a9a55", grass2: "#6b8a49", grass3: "#5c7a3f",
  dirt1: "#b07a4e", dirt2: "#9c6840", dirtShadow: "#7e5230",
  water1: "#5f86a3", water2: "#4f7491", waterHi: "#9fc3d6",
  bark: "#5a4632", barkDark: "#46351f", leaf1: "#5e7d3e", leaf2: "#4c6a32", leaf3: "#3d5828",
  wood: "#9a6f43", woodDark: "#73502f", thatch: "#c19a5b", thatchDark: "#9c7a42",
  outline: "#3a2a1c",
  lanternR: "#e8604c", lanternY: "#f2c14e", lanternG: "#6fae6a", lantTeal: "#5aa0a8",
  amber: "#ffd27a", fire: "#ffba5a",
  minhShirt: "#eef2f6", minhAccent: "#3b5b9a", minhHair: "#241a12", skin: "#e7b48a",
  thuShirt: "#bcd6d0", thuShirt2: "#a6c6c1", thuFlower: "#7fb0c4", thuHair: "#2a2420", thuSkin: "#cfe0dd",
  banoiAo: "#7a5638", banoiHair: "#dadada", banoiSkin: "#dca680",
  ongtuShirt: "#8a6f4e", ongtuHair: "#cfcfcf", ongtuSkin: "#c79a70",
  night1: "#26344f", night2: "#1b2740", night3: "#141d33",
  duskTop: "#caa0a8", duskMid: "#9a7e8e", duskLow: "#6f6a78",
  paper: "#e9dcb8", paperShade: "#d8c79c", ink: "#3b2c1c",
  stone: "#9a9a90", stoneDark: "#6f6f66",
  red: "#c0392b", redFade: "#a8504a",
};

function mk(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  return { c, x };
}

// deterministic tiny RNG for stable star/firefly/grass scatter
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function vGrad(x, w, h, stops) {
  const g = x.createLinearGradient(0, 0, 0, h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}

// ---- shared scenery primitives ----
function dots(x, color, n, x0, y0, x1, y1, seed, size = 1) {
  const r = rng(seed); x.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const px = (x0 + r() * (x1 - x0)) | 0, py = (y0 + r() * (y1 - y0)) | 0;
    x.fillRect(px, py, size, size);
  }
}

function banyan(x, cx, cy, scale = 1) {
  // trunk
  x.fillStyle = PAL.barkDark; x.fillRect(cx - 9 * scale, cy - 6, 18 * scale, 60);
  x.fillStyle = PAL.bark; x.fillRect(cx - 7 * scale, cy - 6, 11 * scale, 58);
  // hanging roots
  x.fillStyle = PAL.barkDark;
  for (let i = -3; i <= 3; i++) x.fillRect(cx + i * 5 * scale, cy - 4, 2, 26 + (i % 2) * 8);
  // canopy blobs
  const blobs = [[-30, -34, 26], [0, -46, 30], [30, -34, 26], [-16, -20, 22], [18, -20, 22], [0, -22, 24]];
  for (const [dx, dy, r] of blobs) {
    x.fillStyle = PAL.leaf2; ellipse(x, cx + dx * scale, cy + dy, r * scale, r * 0.8);
  }
  for (const [dx, dy, r] of blobs) {
    x.fillStyle = PAL.leaf1; ellipse(x, cx + dx * scale - 3, cy + dy - 3, r * 0.7 * scale, r * 0.55);
  }
  dots(x, PAL.leaf3, 60, cx - 40 * scale, cy - 60, cx + 40 * scale, cy - 6, 7);
}

function ellipse(x, cx, cy, rx, ry) {
  x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill();
}

function house(x, hx, hy, w = 40, flip = false) {
  // body
  x.fillStyle = PAL.woodDark; x.fillRect(hx, hy, w, 20);
  x.fillStyle = PAL.wood; x.fillRect(hx + 1, hy + 1, w - 2, 18);
  // thatched roof
  x.fillStyle = PAL.thatchDark;
  x.beginPath(); x.moveTo(hx - 4, hy); x.lineTo(hx + w / 2, hy - 14); x.lineTo(hx + w + 4, hy); x.closePath(); x.fill();
  x.fillStyle = PAL.thatch;
  x.beginPath(); x.moveTo(hx - 2, hy - 1); x.lineTo(hx + w / 2, hy - 12); x.lineTo(hx + w + 2, hy - 1); x.closePath(); x.fill();
  // door + window
  x.fillStyle = PAL.barkDark; x.fillRect(hx + (flip ? w - 12 : 6), hy + 8, 7, 12);
  x.fillStyle = PAL.amber; x.fillRect(hx + (flip ? 8 : w - 14), hy + 5, 6, 6);
}

function lantern(x, lx, ly, col, glow = true) {
  if (glow) { x.fillStyle = "rgba(255,210,122,0.25)"; ellipse(x, lx + 2, ly + 4, 9, 9); }
  x.fillStyle = PAL.outline; x.fillRect(lx + 1, ly - 4, 2, 4);
  x.fillStyle = col; ellipse(x, lx + 2, ly + 4, 5, 6);
  x.fillStyle = "#fff5d6"; x.fillRect(lx + 1, ly + 1, 2, 4);
  x.fillStyle = PAL.outline; x.fillRect(lx, ly + 10, 4, 2);
}

// ---------- BACKGROUND PAINTERS (native 320x180) ----------
const bgPainters = {
  title(x) {
    vGrad(x, NATIVE_W, NATIVE_H, [[0, "#2a2f4a"], [0.5, "#3b3a5a"], [1, "#534a5e"]]);
    // moon
    x.fillStyle = "#f3eccf"; ellipse(x, 250, 40, 16, 16);
    x.fillStyle = "#3b3a5a"; ellipse(x, 256, 36, 13, 13);
    dots(x, "#dfe6ff", 80, 0, 0, 320, 110, 3);
    // distant houses silhouette
    x.fillStyle = "#2c2740"; x.fillRect(0, 120, 320, 60);
    house(x, 20, 104, 34); house(x, 250, 108, 30, true);
    banyan(x, 150, 120, 1);
    // pond
    vGrad2(x, 0, 140, 320, 40, [[0, "#3a4f6a"], [1, "#2b3c54"]]);
    // reflection + paper boat
    x.fillStyle = "rgba(243,236,207,0.25)"; x.fillRect(244, 150, 8, 24);
    paperBoat(x, 150, 158, 1.4);
    rippleBand(x, 150, 150, 18);
  },
  village(x) {
    vGrad(x, NATIVE_W, NATIVE_H, [[0, PAL.skyTop], [0.45, PAL.skyMid], [1, PAL.skyLow]]);
    x.fillStyle = PAL.sunHaze; ellipse(x, 270, 34, 22, 22);
    // far treeline
    x.fillStyle = PAL.leaf3; x.fillRect(0, 56, 320, 14);
    dots(x, PAL.leaf2, 120, 0, 48, 320, 70, 11);
    // grass field
    vGrad2(x, 0, 66, 320, 114, [[0, PAL.grass1], [1, PAL.grass3]]);
    dots(x, PAL.grass2, 240, 0, 70, 320, 178, 21);
    // dirt path (top-down winding)
    x.fillStyle = PAL.dirtShadow;
    x.beginPath(); x.moveTo(120, 70); x.bezierCurveTo(150, 110, 90, 140, 150, 180); x.lineTo(196, 180); x.bezierCurveTo(150, 140, 200, 110, 168, 70); x.closePath(); x.fill();
    x.fillStyle = PAL.dirt1;
    x.beginPath(); x.moveTo(128, 70); x.bezierCurveTo(154, 110, 100, 140, 158, 180); x.lineTo(188, 180); x.bezierCurveTo(146, 140, 192, 110, 160, 70); x.closePath(); x.fill();
    // pond (left)
    x.fillStyle = PAL.water2; ellipse(x, 60, 132, 48, 30);
    x.fillStyle = PAL.water1; ellipse(x, 58, 130, 44, 26);
    dots(x, PAL.waterHi, 30, 24, 116, 96, 146, 5);
    // lotus pads
    x.fillStyle = PAL.leaf1; for (const [px, py] of [[40, 128], [72, 138], [56, 120], [82, 126]]) ellipse(x, px, py, 5, 3);
    // houses (right + top)
    house(x, 210, 96, 40); house(x, 264, 110, 36, true); house(x, 18, 88, 30);
    // banyan top-right edge
    banyan(x, 256, 70, 0.7);
    // fence posts along path
    x.fillStyle = PAL.woodDark; for (let i = 0; i < 5; i++) x.fillRect(196 + i * 6, 120 - i * 8, 2, 8);
  },
  river(x) {
    vGrad(x, NATIVE_W, NATIVE_H, [[0, PAL.duskTop], [0.5, PAL.duskMid], [1, PAL.duskLow]]);
    x.fillStyle = "rgba(255,210,150,0.35)"; ellipse(x, 90, 40, 18, 18);
    // far bank
    x.fillStyle = PAL.grass3; x.fillRect(0, 58, 320, 22);
    dots(x, PAL.leaf3, 80, 0, 52, 320, 78, 13);
    // wide river flowing across (top-down)
    vGrad2(x, 0, 78, 320, 102, [[0, "#5a7388"], [0.5, "#46606f"], [1, "#3a505d"]]);
    for (let i = 0; i < 7; i++) { x.fillStyle = "rgba(159,195,214,0.18)"; x.fillRect(0, 92 + i * 12, 320, 2); }
    dots(x, PAL.waterHi, 40, 0, 84, 320, 176, 9);
    // muddy near bank
    x.fillStyle = PAL.dirtShadow; x.fillRect(0, 162, 320, 18);
    x.fillStyle = PAL.dirt2; x.fillRect(0, 166, 320, 14);
    dots(x, PAL.dirt1, 60, 0, 164, 320, 178, 17);
    // withered reeds
    x.strokeStyle = PAL.thatchDark; x.lineWidth = 1;
    for (let i = 0; i < 14; i++) { const rx = 12 + i * 22; x.beginPath(); x.moveTo(rx, 168); x.lineTo(rx + (i % 2 ? 3 : -3), 150); x.stroke(); }
  },
  banyan(x) {
    vGrad(x, NATIVE_W, NATIVE_H, [[0, PAL.skyTop], [0.5, PAL.skyMid], [1, PAL.skyLow]]);
    x.fillStyle = PAL.sunHaze; ellipse(x, 40, 36, 18, 18);
    vGrad2(x, 0, 70, 320, 110, [[0, PAL.grass2], [1, PAL.grass3]]);
    dots(x, PAL.grass1, 200, 0, 74, 320, 178, 23);
    // the great banyan, centered
    banyan(x, 158, 96, 1.5);
    // red cloth strips on a low branch
    for (let i = 0; i < 7; i++) {
      const rx = 116 + i * 14, ry = 60 + (i % 3) * 4;
      x.fillStyle = i % 2 ? PAL.red : PAL.redFade; x.fillRect(rx, ry, 3, 12);
    }
    // small shrine + incense bowl at the base
    x.fillStyle = PAL.stoneDark; x.fillRect(132, 150, 22, 16);
    x.fillStyle = PAL.stone; x.fillRect(134, 152, 18, 12);
    x.fillStyle = PAL.barkDark; x.fillRect(138, 146, 10, 6);
    x.fillStyle = PAL.amber; x.fillRect(141, 144, 1, 3); x.fillRect(144, 143, 1, 4);
    // grave stone off to the right, slightly hidden by grass
    x.fillStyle = PAL.stoneDark; x.fillRect(238, 138, 18, 24);
    x.fillStyle = PAL.stone; x.fillRect(240, 140, 14, 22);
    x.fillStyle = PAL.stoneDark; x.fillRect(243, 146, 8, 1); x.fillRect(243, 150, 8, 1); x.fillRect(243, 154, 6, 1);
    dots(x, PAL.grass2, 40, 234, 158, 262, 172, 31);
  },
  festival(x) {
    vGrad(x, NATIVE_W, NATIVE_H, [[0, PAL.night3], [0.5, PAL.night2], [1, PAL.night1]]);
    dots(x, "#cfd8ff", 60, 0, 0, 320, 80, 41);
    // temple/dinh silhouette back
    x.fillStyle = "#1a1322"; x.fillRect(40, 56, 240, 40);
    x.fillStyle = "#241a2e";
    x.beginPath(); x.moveTo(30, 60); x.lineTo(160, 34); x.lineTo(290, 60); x.closePath(); x.fill();
    for (let i = 0; i < 6; i++) { x.fillStyle = "#140e1c"; x.fillRect(60 + i * 36, 60, 6, 34); }
    // warm courtyard stone
    vGrad2(x, 0, 96, 320, 84, [[0, "#5a4636"], [1, "#3e3024"]]);
    for (let i = 0; i < 8; i++) { x.strokeStyle = "rgba(0,0,0,0.18)"; x.beginPath(); x.moveTo(0, 110 + i * 9); x.lineTo(320, 110 + i * 9); x.stroke(); }
    // strings of lanterns across the top
    const cols = [PAL.lanternR, PAL.lanternY, PAL.lanternG, PAL.lantTeal];
    x.strokeStyle = "#2a1f14"; x.beginPath(); x.moveTo(0, 40); x.quadraticCurveTo(160, 54, 320, 40); x.stroke();
    for (let i = 0; i < 11; i++) lantern(x, 16 + i * 28, 44 + Math.round(Math.sin(i) * 2), cols[i % 4]);
    // glow pools on the ground
    for (let i = 0; i < 5; i++) { x.fillStyle = "rgba(255,200,120,0.10)"; ellipse(x, 50 + i * 56, 150, 30, 12); }
  },
  letter(x) {
    vGrad(x, NATIVE_W, NATIVE_H, [[0, "#241a14"], [1, "#15100c"]]);
    x.fillStyle = "rgba(255,200,120,0.10)"; ellipse(x, 160, 90, 150, 90);
    // paper sheet
    x.fillStyle = PAL.paperShade; x.fillRect(54, 22, 214, 138);
    x.fillStyle = PAL.paper; x.fillRect(56, 24, 210, 134);
    // fold line + faint ruling
    x.fillStyle = PAL.paperShade; x.fillRect(56, 90, 210, 1);
    for (let i = 0; i < 14; i++) { x.fillStyle = "rgba(59,44,28,0.07)"; x.fillRect(64, 34 + i * 9, 194, 1); }
    // smudges
    dots(x, "rgba(59,44,28,0.10)", 22, 60, 28, 262, 154, 61, 2);
  },
  home(x) {
    vGrad(x, NATIVE_W, NATIVE_H, [[0, "#6a5236"], [1, "#4a3a26"]]);
    // wood plank wall
    for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? PAL.wood : PAL.woodDark; x.fillRect(0, i * 18, 320, 18); }
    // floor
    x.fillStyle = "#7e5b38"; x.fillRect(0, 120, 320, 60);
    dots(x, "#6b4d2f", 120, 0, 122, 320, 178, 27);
    // bookshelf with notebook
    x.fillStyle = PAL.barkDark; x.fillRect(196, 40, 70, 80);
    for (let r = 0; r < 3; r++) { x.fillStyle = PAL.bark; x.fillRect(200, 46 + r * 24, 62, 20);
      for (let b = 0; b < 6; b++) { x.fillStyle = ["#8a4b3a", "#3a5b6a", "#6a6a4a", "#7a5a3a"][(r + b) % 4]; x.fillRect(202 + b * 10, 48 + r * 24, 8, 16); } }
    x.fillStyle = "#caa84a"; x.fillRect(232, 50, 12, 14); // the highlighted notebook
    // warm window light left
    x.fillStyle = "#5a4226"; x.fillRect(30, 30, 50, 50);
    x.fillStyle = "rgba(255,220,150,0.5)"; x.fillRect(34, 34, 42, 42);
    x.fillStyle = "#5a4226"; x.fillRect(54, 34, 2, 42); x.fillRect(34, 54, 42, 2);
  },
};

function vGrad2(x, ox, oy, w, h, stops) {
  const g = x.createLinearGradient(0, oy, 0, oy + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  x.fillStyle = g; x.fillRect(ox, oy, w, h);
}

export function paperBoat(x, cx, cy, s = 1) {
  x.save(); x.translate(cx, cy); x.scale(s, s);
  x.fillStyle = PAL.outline;
  x.beginPath(); x.moveTo(-10, 0); x.lineTo(10, 0); x.lineTo(6, 4); x.lineTo(-6, 4); x.closePath(); x.fill();
  x.fillStyle = "#f3ecdf";
  x.beginPath(); x.moveTo(-9, 0); x.lineTo(0, -7); x.lineTo(9, 0); x.closePath(); x.fill();
  x.fillStyle = "#d8cfbe"; x.beginPath(); x.moveTo(0, -7); x.lineTo(0, 0); x.lineTo(9, 0); x.closePath(); x.fill();
  x.restore();
}

function rippleBand(x, cx, cy, w) {
  x.strokeStyle = "rgba(159,195,214,0.4)"; x.lineWidth = 1;
  x.beginPath(); x.ellipse(cx, cy, w, 3, 0, 0, Math.PI * 2); x.stroke();
}

// ---------- PORTRAIT PAINTERS (64x64) ----------
function facebase(x, bg) {
  vGrad(x, 64, 64, [[0, bg[0]], [1, bg[1]]]);
  x.strokeStyle = "#efe6c8"; x.lineWidth = 2; x.strokeRect(1, 1, 62, 62);
}
function head(x, skin, hair, opts = {}) {
  const cx = 32, cy = 34;
  // hair back
  x.fillStyle = hair; ellipse(x, cx, cy - 4, 17, 16);
  // face
  x.fillStyle = skin; ellipse(x, cx, cy, 13, 14);
  // hair top
  x.fillStyle = hair;
  x.beginPath(); x.ellipse(cx, cy - 8, 14, 10, 0, Math.PI, 0); x.fill();
  if (opts.braid) { x.fillStyle = hair; x.fillRect(cx + 11, cy - 2, 4, 18); x.fillRect(cx - 15, cy - 2, 4, 14); }
  if (opts.bun) { x.fillStyle = hair; ellipse(x, cx, cy - 16, 6, 5); }
  if (opts.cane) {/* drawn by caller */}
  // eyes
  const ey = cy + (opts.down ? 3 : 1);
  x.fillStyle = "#2a2018";
  if (opts.cry) {
    x.fillRect(cx - 7, ey, 4, 1); x.fillRect(cx + 4, ey, 4, 1);
    x.fillStyle = "#bfe0ee"; x.fillRect(cx - 6, ey + 2, 2, 6); x.fillRect(cx + 5, ey + 2, 2, 5);
  } else if (opts.closeHappy) {
    x.fillStyle = "#2a2018"; x.fillRect(cx - 7, ey, 5, 1); x.fillRect(cx + 3, ey, 5, 1);
    x.fillRect(cx - 8, ey - 1, 1, 1); x.fillRect(cx + 8, ey - 1, 1, 1);
  } else {
    x.fillRect(cx - 6, ey, 2, 3); x.fillRect(cx + 5, ey, 2, 3);
  }
  // mouth
  x.fillStyle = "#9c5a4a";
  if (opts.smile) { x.fillRect(cx - 4, cy + 8, 8, 1); x.fillRect(cx - 5, cy + 7, 1, 1); x.fillRect(cx + 4, cy + 7, 1, 1); }
  else if (opts.frown) { x.fillRect(cx - 3, cy + 9, 6, 1); x.fillRect(cx - 4, cy + 10, 1, 1); x.fillRect(cx + 3, cy + 10, 1, 1); }
  else x.fillRect(cx - 3, cy + 8, 6, 1);
}
function bust(x, shirt, accent) {
  x.fillStyle = shirt; x.beginPath(); x.moveTo(10, 64); x.quadraticCurveTo(32, 46, 54, 64); x.closePath(); x.fill();
  if (accent) { x.fillStyle = accent; x.fillRect(30, 50, 4, 14); }
}
const portraitPainters = {
  minh(x) { facebase(x, ["#2b3550", "#1d2740"]); bust(x, PAL.minhShirt, PAL.minhAccent); head(x, PAL.skin, PAL.minhHair, {}); },
  thu_normal(x) { facebase(x, ["#23423f", "#16302e"]); thuGlow(x); bust(x, PAL.thuShirt, null); thuFlowers(x); head(x, PAL.thuSkin, PAL.thuHair, { braid: true, smile: true }); },
  thu_sad(x) { facebase(x, ["#22343f", "#16252e"]); thuGlow(x); bust(x, PAL.thuShirt, null); thuFlowers(x); head(x, PAL.thuSkin, PAL.thuHair, { braid: true, down: true, frown: true }); },
  thu_smile(x) { facebase(x, ["#2e4a45", "#1c3633"]); thuGlow(x, 0.5); bust(x, PAL.thuShirt, null); thuFlowers(x); head(x, PAL.thuSkin, PAL.thuHair, { braid: true, closeHappy: true, smile: true });
    x.fillStyle = "#cfeaf2"; x.fillRect(24, 38, 1, 4); x.fillRect(40, 38, 1, 4); /* a tear of joy */ },
  banoi_normal(x) { facebase(x, ["#3a2e22", "#271e15"]); bust(x, PAL.banoiAo, null); head(x, PAL.banoiSkin, PAL.banoiHair, { bun: true });
    x.fillStyle = "#9a9a9a"; x.fillRect(22, 30, 20, 1); x.fillRect(20, 40, 6, 1); x.fillRect(38, 40, 6, 1); /* wrinkles */ },
  banoi_crying(x) { facebase(x, ["#352a20", "#221a12"]); bust(x, PAL.banoiAo, null); head(x, PAL.banoiSkin, PAL.banoiHair, { bun: true, cry: true });
    x.fillStyle = "#9a9a9a"; x.fillRect(22, 30, 20, 1); },
  ongtu_normal(x) { facebase(x, ["#2c2c22", "#1b1b14"]); bust(x, PAL.ongtuShirt, null); head(x, PAL.ongtuSkin, PAL.ongtuHair, {});
    x.fillStyle = "#2a2018"; x.fillRect(24, 36, 4, 1); x.fillRect(36, 36, 4, 1); /* hollow eyes */
    x.fillStyle = "#7a5a3a"; x.fillRect(50, 30, 2, 30); x.fillStyle = "#5a4226"; x.fillRect(50, 30, 1, 30); /* cane */ },
};
function thuGlow(x, a = 0.35) { x.fillStyle = `rgba(150,220,210,${a})`; ellipse(x, 32, 32, 22, 24); }
function thuFlowers(x) { x.fillStyle = PAL.thuFlower; for (const [px, py] of [[18, 56], [44, 54], [30, 60]]) { x.fillRect(px, py, 2, 2); x.fillRect(px + 1, py + 1, 1, 1); } }

// ---------- SPRITE PAINTERS (top-down little character, 16x20) ----------
function spriteChar(x, conf, frame) {
  // body seen from above-ish: hair crown, shoulders, two feet
  const cx = 8;
  // shadow
  x.fillStyle = "rgba(0,0,0,0.22)"; ellipse(x, cx, 19, 6, 2);
  // legs (walk shuffle)
  const off = frame === 1 ? 1 : (frame === 2 ? -1 : 0);
  x.fillStyle = conf.legs;
  x.fillRect(cx - 4, 14 + off, 3, 5); x.fillRect(cx + 1, 14 - off, 3, 5);
  // body / shirt
  x.fillStyle = conf.shirt; x.fillRect(cx - 5, 7, 10, 8);
  x.fillStyle = conf.shirtSh; x.fillRect(cx - 5, 12, 10, 3);
  if (conf.flower) { x.fillStyle = conf.flowerCol; x.fillRect(cx - 3, 9, 1, 1); x.fillRect(cx + 2, 11, 1, 1); }
  // arms
  x.fillStyle = conf.skin; x.fillRect(cx - 6, 8, 2, 5); x.fillRect(cx + 4, 8, 2, 5);
  // head/hair crown (top-down)
  x.fillStyle = conf.hair; ellipse(x, cx, 5, 5, 5);
  x.fillStyle = conf.skin; ellipse(x, cx, 6, 3, 3);
  if (conf.braid) { x.fillStyle = conf.hair; x.fillRect(cx - 1, 8, 2, 6); }
  // accent
  if (conf.accent) { x.fillStyle = conf.accent; x.fillRect(cx - 1, 8, 2, 5); }
}
const SPR = {
  minh: { shirt: PAL.minhShirt, shirtSh: "#cdd6e0", legs: "#3a4658", skin: PAL.skin, hair: PAL.minhHair, accent: PAL.minhAccent },
  thu: { shirt: PAL.thuShirt, shirtSh: PAL.thuShirt2, legs: "#7a8a86", skin: PAL.thuSkin, hair: PAL.thuHair, braid: true, flower: true, flowerCol: PAL.thuFlower },
};

// ---------- ASSET MANAGER ----------
class Art {
  constructor() {
    this.bg = {};       // name -> canvas
    this.portrait = {}; // key -> canvas
    this.sprite = {};   // key -> {frames:[canvas...]}
    this.realBg = {};
    this.realPortrait = {};
  }

  // paint all placeholders synchronously
  buildPlaceholders() {
    for (const name in bgPainters) {
      const { c, x } = mk(NATIVE_W, NATIVE_H); bgPainters[name](x); this.bg[name] = c;
    }
    for (const key in portraitPainters) {
      const { c, x } = mk(64, 64); portraitPainters[key](x); this.portrait[key] = c;
    }
    for (const key in SPR) {
      const frames = [];
      for (let f = 0; f < 3; f++) { const { c, x } = mk(16, 20); spriteChar(x, SPR[key], f); frames.push(c); }
      this.sprite[key] = { frames };
    }
  }

  // attempt to load a real asset; returns image or null (never throws)
  _tryImg(src) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  }

  // key out a near-key-color background to transparent, return canvas
  _keyOut(img, keyHex) {
    const { c, x } = mk(img.naturalWidth, img.naturalHeight);
    x.drawImage(img, 0, 0);
    const kr = parseInt(keyHex.slice(1, 3), 16), kg = parseInt(keyHex.slice(3, 5), 16), kb = parseInt(keyHex.slice(5, 7), 16);
    const d = x.getImageData(0, 0, c.width, c.height); const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (Math.abs(p[i] - kr) < 70 && Math.abs(p[i + 1] - kg) < 70 && Math.abs(p[i + 2] - kb) < 70) p[i + 3] = 0;
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  // Override placeholders with real Higgsfield assets when present in ./assets/.
  // Safe to call once at boot; missing files just keep the placeholder.
  async loadReal() {
    const bgNames = { title: "title", village: "village", river: "river", banyan: "banyan", festival: "festival", letter: "letter", home: "home" };
    const jobs = [];
    for (const [name, file] of Object.entries(bgNames)) {
      jobs.push(this._tryImg(`./assets/bg/${file}.png`).then((im) => { if (im) this.bg[name] = im; }));
    }
    for (const key of Object.keys(portraitPainters)) {
      jobs.push(this._tryImg(`./assets/portraits/${key}.png`).then((im) => { if (im) this.portrait[key] = im; }));
    }
    for (const key of Object.keys(SPR)) {
      jobs.push(this._tryImg(`./assets/sprites/${key}.png`).then((im) => {
        if (im) { const keyed = this._keyOut(im, key === "thu" ? "#00FF00" : "#FF00FF"); this.sprite[key] = { frames: [keyed, keyed, keyed], still: true }; }
      }));
    }
    await Promise.all(jobs);
  }
}

export const art = new Art();
