#!/usr/bin/env node
// gen_assets.mjs — generate Paper Boats character art with the AutoSprite REST API
// and drop it straight into public/assets/ (the same paths art.js auto-loads).
//
//   AUTO_SPRITE_AUTH=vspk_... node tools/gen_assets.mjs            # base images only
//   AUTO_SPRITE_AUTH=vspk_... node tools/gen_assets.mjs --sprites  # + walk spritesheets
//
// AutoSprite is sprite/character focused, so it owns the *characters* here
// (portraits + top-down sprites). Backgrounds and music stay on the Higgsfield
// pipeline documented in tools/asset_prompts.md. Files are written only when the
// API succeeds; missing files just keep art.js's hand-coded placeholders.
//
// Auth: the API key is read from the AUTO_SPRITE_AUTH env var and sent as the
// `x-api-key` header. The key is never written to disk or committed.
//
// Flags:
//   --sprites            also generate + download transparent walk spritesheets (extra credits)
//   --only=minh,thu      limit to specific character ids
//   --quality=turbo|pro  image tier (default turbo = 1 credit; pro = 5 credits)
//   --out=DIR            output root (default public/assets)
//   --force              overwrite assets that already exist (default: skip)
//   --dry-run            print the plan and exit without calling the API
//
// No dependencies — needs Node 18+ (global fetch).

import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.AUTO_SPRITE_BASE || "https://www.autosprite.io/api/v1").replace(/\/+$/, "");
const KEY = process.env.AUTO_SPRITE_AUTH;

// ---- the locked STYLE FORMULA (byte-identical to tools/asset_prompts.md) ----
const STYLE =
  "Cozy 16-bit pixel art with fine dithering and a warm limited palette, soft pixel shading; " +
  "rounded gentle shapes with soft dark-umber outlines and chunky readable pixel clusters; " +
  "pale washed-out blue-green ghost girl with a faint translucent glow where applicable, " +
  "the living boy in bright white-and-indigo; tender nostalgic Vietnamese countryside at " +
  "golden hour, quietly melancholic; clean readable silhouette, single character, centered.";

// ---- character manifest -> game asset slots art.js loads ----
// portrait -> public/assets/portraits/<slot>.png   sprite -> public/assets/sprites/<slot>.png
const CHARACTERS = [
  {
    id: "minh",
    name: "Paper Boats — Minh",
    desc: "a shy 11-year-old Vietnamese boy, short black hair, plain white shirt with indigo trim",
    portrait: "minh",
    sprite: "minh",
  },
  {
    id: "thu",
    name: "Paper Boats — Thu",
    desc: "a 10-year-old ghost girl, faded pale-blue floral shirt, a single braid, gentle faint smile, slightly translucent",
    portrait: "thu_normal",
    sprite: "thu",
  },
  {
    id: "banoi",
    name: "Paper Boats — Ba Noi",
    desc: "a ~70-year-old Vietnamese grandmother, brown ao ba ba, grey hair in a bun, kind weathered face",
    portrait: "banoi_normal",
  },
  {
    id: "ongtu",
    name: "Paper Boats — Ong Tu",
    desc: "a gaunt ~75-year-old Vietnamese man, worn brown shirt, hollow tired eyes, holding a bamboo cane",
    portrait: "ongtu_normal",
  },
];

// ------------------------------- CLI flags -------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const opts = {
  sprites: flag("sprites"),
  force: flag("force"),
  dryRun: flag("dry-run"),
  quality: opt("quality", "turbo"),
  out: resolve(ROOT, opt("out", "public/assets")),
  only: (opt("only", "") || "").split(",").map((s) => s.trim()).filter(Boolean),
};

// --------------------------- tiny helpers -------------------------------
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Walk a JSON value and return the first defined field matching any of `names`.
function deepFind(obj, names) {
  const want = new Set(names);
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    for (const [k, v] of Object.entries(cur)) {
      if (want.has(k) && v != null && typeof v !== "object") return v;
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return undefined;
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

// fetch with exponential backoff on network errors / 429 / 5xx
async function apiFetch(path, { method = "GET", body } = {}, tries = 4) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  let wait = 2000, lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        method,
        headers: { "x-api-key": KEY, ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} on ${method} ${path}: ${await res.text().catch(() => "")}`);
      } else if (!res.ok) {
        throw new Error(`HTTP ${res.status} on ${method} ${path}: ${await res.text().catch(() => "")}`);
      } else {
        return res.json();
      }
    } catch (e) {
      lastErr = e;
    }
    if (i < tries - 1) { await sleep(wait); wait *= 2; }
  }
  throw lastErr;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return buf.length;
}

// ---------------------------- API steps ----------------------------------
async function createCharacter(c) {
  const prompt = `${c.desc}. ${STYLE}`.slice(0, 600);
  const json = await apiFetch("/characters", {
    method: "POST",
    body: { name: c.name, prompt, quality: opts.quality },
  });
  const id = deepFind(json, ["id", "characterId"]);
  if (!id) throw new Error(`no character id in response: ${JSON.stringify(json).slice(0, 300)}`);
  let img = deepFind(json, ["baseImageUrl", "characterImage", "imageUrl", "thumbnailUrl"]);
  if (!img) {
    // signed URLs may only appear on a follow-up fetch
    const detail = await apiFetch(`/characters/${id}`);
    img = deepFind(detail, ["baseImageUrl", "characterImage", "imageUrl", "thumbnailUrl"]);
  }
  if (!img) throw new Error(`no base image url for character ${id}`);
  return { id, img };
}

async function generateWalkSheet(characterId) {
  const job = await apiFetch(`/characters/${characterId}/spritesheets`, {
    method: "POST",
    body: {
      animations: [{ kind: "walk" }],
      spritesheet: { frameCount: 8, frameSize: 128 },
      removeBg: "default",
    },
  });
  const jobId = deepFind(job, ["jobId", "id"]);
  if (!jobId) throw new Error(`no job id: ${JSON.stringify(job).slice(0, 300)}`);

  // poll — jobs take 30-120s; AutoSprite rate-limits faster than ~30s polling
  for (let i = 0; i < 40; i++) {
    await sleep(8000);
    const st = await apiFetch(`/jobs/${jobId}`);
    const status = String(deepFind(st, ["status"]) || "").toLowerCase();
    if (status === "succeeded" || status === "completed" || status === "done") {
      const sheetId = deepFind(st, ["spritesheetId", "spritesheetIds"]);
      let url = deepFind(st, ["sheetUrl", "atlasUrl", "url", "downloadUrl"]);
      if (!url && sheetId) {
        const sheet = await apiFetch(`/spritesheets/${Array.isArray(sheetId) ? sheetId[0] : sheetId}`);
        url = deepFind(sheet, ["sheetUrl", "atlasUrl", "url", "downloadUrl"]);
      }
      if (!url) throw new Error(`job ${jobId} done but no sheet url`);
      return url;
    }
    if (status === "failed" || status === "error") {
      throw new Error(`job ${jobId} failed: ${JSON.stringify(st).slice(0, 300)}`);
    }
  }
  throw new Error(`job ${jobId} timed out`);
}

// ------------------------------- main -------------------------------------
async function main() {
  if (!KEY && !opts.dryRun) {
    console.error(
      "✗ AUTO_SPRITE_AUTH is not set.\n" +
      "  Create a key at https://www.autosprite.io/apikey, then:\n" +
      "    export AUTO_SPRITE_AUTH=vspk_...\n" +
      "    node tools/gen_assets.mjs"
    );
    process.exit(1);
  }

  const todo = CHARACTERS.filter((c) => !opts.only.length || opts.only.includes(c.id));
  if (!todo.length) { console.error(`✗ nothing matches --only=${opts.only.join(",")}`); process.exit(1); }

  const tier = opts.quality === "pro" ? 5 : 1;
  log(`AutoSprite asset generation → ${opts.out}`);
  log(`  characters: ${todo.map((c) => c.id).join(", ")}`);
  log(`  quality: ${opts.quality} (${tier} credit/character)` + (opts.sprites ? " · +walk spritesheets (5 credits each)" : ""));
  if (opts.dryRun) {
    for (const c of todo) {
      log(`  • ${c.id}: portrait→${c.portrait}.png` + (c.sprite ? ` sprite→${c.sprite}.png` : "") + (opts.sprites && c.sprite ? " (+walk sheet)" : ""));
    }
    log("dry run — no API calls made.");
    return;
  }

  let made = 0, skipped = 0, failed = 0;
  for (const c of todo) {
    const portraitPath = resolve(opts.out, "portraits", `${c.portrait}.png`);
    const spritePath = c.sprite ? resolve(opts.out, "sprites", `${c.sprite}.png`) : null;
    const needPortrait = opts.force || !(await exists(portraitPath));
    const needSprite = c.sprite && (opts.force || !(await exists(spritePath)));
    if (!needPortrait && !needSprite) { log(`  ↷ ${c.id}: already present, skipping (use --force)`); skipped++; continue; }

    try {
      log(`  … ${c.id}: creating character`);
      const { id, img } = await createCharacter(c);

      if (needPortrait) {
        const n = await download(img, portraitPath);
        log(`  ✓ ${c.id}: portraits/${c.portrait}.png (${n} bytes)`);
        made++;
      }

      if (needSprite) {
        if (opts.sprites) {
          log(`  … ${c.id}: generating walk spritesheet (polls ~30-120s)`);
          const sheetUrl = await generateWalkSheet(id);
          const n = await download(sheetUrl, spritePath);
          log(`  ✓ ${c.id}: sprites/${c.sprite}.png — transparent walk sheet (${n} bytes)`);
        } else {
          // base image keys out via art.js (white bg / chroma) when no --sprites
          const n = await download(img, spritePath);
          log(`  ✓ ${c.id}: sprites/${c.sprite}.png — base image (${n} bytes; pass --sprites for animation)`);
        }
        made++;
      }
    } catch (e) {
      console.error(`  ✗ ${c.id}: ${e.message}`);
      failed++;
    }
  }

  log(`\nDone: ${made} written, ${skipped} skipped, ${failed} failed.`);
  if (made) log("Reload the game — art.js picks up ./assets/ automatically.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
