// Data-consistency test: keys referenced by the story exist in both locales,
// and VI/EN dialogue arrays are parallel (same length, speaker, portrait).
import { readFileSync } from "node:fs";
import { UI, NARR, DIALOGUE, LETTER, SPEAKER } from "../public/strings.js";

let fails = 0;
const fail = (m) => { console.error("  ✗ " + m); fails++; };
const ok = (m) => console.log("  ✓ " + m);

// 1. UI parity
for (const k of Object.keys(UI.vi)) if (!(k in UI.en)) fail(`UI missing en key: ${k}`);
for (const k of Object.keys(UI.en)) if (!(k in UI.vi)) fail(`UI missing vi key: ${k}`);
for (const k of Object.keys(NARR.vi)) if (!(k in NARR.en)) fail(`NARR missing en key: ${k}`);
if (!fails) ok("UI/NARR locale parity");

// 2. DIALOGUE parity
const dkeys = new Set([...Object.keys(DIALOGUE.vi), ...Object.keys(DIALOGUE.en)]);
for (const k of dkeys) {
  const a = DIALOGUE.vi[k], b = DIALOGUE.en[k];
  if (!a) { fail(`DIALOGUE.vi missing ${k}`); continue; }
  if (!b) { fail(`DIALOGUE.en missing ${k}`); continue; }
  if (a.length !== b.length) fail(`DIALOGUE ${k} length mismatch vi=${a.length} en=${b.length}`);
  a.forEach((ln, i) => {
    if (!b[i]) return;
    if (ln.sp !== b[i].sp) fail(`DIALOGUE ${k}[${i}] speaker mismatch`);
    if (ln.p !== b[i].p) fail(`DIALOGUE ${k}[${i}] portrait mismatch`);
    if (!ln.t || !b[i].t) fail(`DIALOGUE ${k}[${i}] empty text`);
    if (ln.sp && !SPEAKER.vi[ln.sp]) {} // narr has empty name; only assert id known
    if (!["narr","minh","thu","banoi","ongtu"].includes(ln.sp)) fail(`DIALOGUE ${k}[${i}] unknown speaker ${ln.sp}`);
  });
}
if (!fails) ok(`DIALOGUE parity (${dkeys.size} keys)`);

// 3. Referenced keys in scenes.js + game.js exist
const scenes = readFileSync(new URL("../public/scenes.js", import.meta.url), "utf8");
const game = readFileSync(new URL("../public/game.js", import.meta.url), "utf8");

const grab = (src, re) => { const out = new Set(); let m; while ((m = re.exec(src))) out.add(m[1]); return [...out]; };

// G.dialogue("key")
for (const k of grab(scenes, /\.dialogue\(\s*["'`]([^"'`]+)["'`]/g))
  if (!DIALOGUE.vi[k]) fail(`scenes.js uses unknown dialogue key: ${k}`);
// G.narrate("key") — may be NARR key OR raw text (raw flagged with second arg). Check only bare single-arg simple identifiers.
for (const k of grab(scenes, /\.narrate\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/g))
  if (!NARR.vi[k]) fail(`scenes.js uses unknown narrate key: ${k}`);
// titleCard second arg, UI keys
for (const k of grab(scenes, /titleCard\(\s*["'][^"']*["']\s*,\s*["']([^"']+)["']/g))
  if (!UI.vi[k]) fail(`scenes.js uses unknown UI title key: ${k}`);
// labelKey: "x"
for (const k of grab(scenes, /labelKey:\s*["']([^"']+)["']/g))
  if (!UI.vi[k]) fail(`scenes.js uses unknown labelKey: ${k}`);
// UI keys used in game.js via UI[S.locale].xxx
for (const k of grab(game, /UI\[S\.locale\]\.([a-zA-Z0-9_]+)/g))
  if (!UI.vi[k]) fail(`game.js uses unknown UI key: ${k}`);
if (!fails) ok("all referenced keys resolve in both locales");

// 4. Memory ids
const mems = grab(scenes, /keepMemory\(\s*["']([^"']+)["']/g);
const expected = ["mem_fireflies", "mem_boat", "mem_grave", "mem_song"];
for (const e of expected) if (!mems.includes(e)) fail(`memory beat not wired: ${e}`);
if (!fails) ok(`memory beats wired: ${mems.join(", ")}`);

// 5. Letter integrity
for (const loc of ["vi", "en"]) {
  if (!LETTER[loc].body.length) fail(`LETTER.${loc} empty`);
  if (!LETTER[loc].ps_default || !LETTER[loc].ps_boat || !LETTER[loc].thanks) fail(`LETTER.${loc} missing variant lines`);
}
if (!fails) ok("letter + memory-variant lines present");

console.log(fails ? `\nFAILED: ${fails} issue(s)` : "\nALL CHECKS PASSED");
process.exit(fails ? 1 : 0);
