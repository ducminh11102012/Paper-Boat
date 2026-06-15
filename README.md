# Paper Boats — web build

A faithful HTML5/Canvas adaptation of the *Paper Boats* master doc (v2.0): a bilingual
(Tiếng Việt / English) narrative walking-sim about Minh and the ghost-girl Thu. This build
covers the **Minimum Shippable** emotional slice:

> Title → Language Select → Ch.1 → Ch.2 → Ch.3 → Ch.4A → Ch.4B → **Epilogue (10 years later)**
> → Memory recap → The Letter

## What's implemented

- **Full bilingual story & dialogue** (expanded well beyond the doc), portraits, slow
  unhurried typewriter text with per-character text-blip SFX (Thu has a faint shimmer tail).
- **Interactive moments** (more to *do*, not just read): catch a frog, fold the paper boat
  crease-by-crease, skip stones on the pond, watch the moon, light incense at the Ghost
  Festival, catch fireflies, and **release the lantern** as Thu fades.
- **Hệ Thống Ký Ức (Memory system)** — 6 keepable moments (`mem_fireflies`, `mem_boat`,
  `mem_grave`, `mem_song`, `mem_moon`, `mem_stone`). They drive the **final letter** (P/S
  line + a "thank you" line) and the **Epilogue** (the crooked paper boat; a jar with a
  firefly if you kept that night). A pre-letter **recap** shows what you kept. No bad ending.
- **Epilogue — "Ten years later"**: adult Minh walks the old places, recontextualized.
- **Thu's transparency rule** — alpha 0.88 + micro-flicker + soft glow; staged farewell fade.
- **Cinematic camera** on the `[CINE]` beats (Old Tu, Grandma crying, Thu's goodbye).
- **Per-chapter palette** (warm golden hour → doubt → truth → festival night → cool autumn).
- **Input**: keyboard (physical key codes), mouse, touch (drag to walk, tap to interact),
  and gamepad — every menu/choice is keyboard- and gamepad-navigable.
- **Procedural Vietnamese-folk music** (đàn-bầu-flavored) + SFX via WebAudio.

## Run it locally

ES modules need HTTP (not `file://`):

```bash
cd public
python3 -m http.server 8099
# open http://localhost:8099/   (?dev=1 shows the FPS overlay)
```

## Deploy to GitHub Pages

A workflow at `.github/workflows/pages.yml` publishes `public/` to GitHub Pages on every
push to `main` (and via *Run workflow*). No build step — the static files ship as-is.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
After it runs, the game is live at:

```
https://ducminh11102012.github.io/Paper-Boat/
```

All asset/module paths are relative (`./game.js`, `./assets/…`), so it works under the
`/Paper-Boat/` subpath without changes. `public/.nojekyll` disables Jekyll processing.

## Project layout

```
public/
  index.html      game page (canvas + module bootstrap)
  logic.js        platform stub (solo client-side game)
  strings.js      all VI/EN text + dialogue + the letter  (zero UI literals in code)
  art.js          cohesive hand-coded pixel art + real-asset override loader
  audio.js        WebAudio blips / SFX / procedural music + real-track override
  game.js         engine: loop, input, scenes, dialogue, camera, minigame, UI
  scenes.js       the story script (orchestration over engine primitives)
  assets/         Higgsfield-generated art/audio drop here (overrides placeholders)
design/assets.csv the asset manifest
tools/            check.mjs (data consistency) · playthrough.mjs (headless smoke test)
```

## Tests

```bash
node tools/check.mjs        # key parity (VI/EN), memory wiring, letter integrity
node tools/playthrough.mjs  # headless end-to-end: drives the whole story to the ending
```

## Swapping in Higgsfield art (drop-in, no code change)

Placeholders are hand-coded pixel art. To use generated assets, drop files here — the loader
picks them up automatically (sprites are keyed to transparency at load):

```
assets/bg/{title,village,river,banyan,festival,letter,home}.png   (320×180-ish, any size)
assets/portraits/{minh,thu_normal,thu_sad,thu_smile,banoi_normal,banoi_crying,ongtu_normal}.png
assets/sprites/{minh,thu}.png      # top-down; minh on #FF00FF, thu on #00FF00 key color
assets/audio/{village,summer,doubt,farewell,cadao}.mp3
```

Exact generation prompts (with the locked STYLE FORMULA embedded) are in
`tools/asset_prompts.md`.

## Deploy (Higgsfield apps engine)

`tools/package.sh` builds `dist/paper-boats.zip` with `logic.js` + `index.html` + `assets/`
at the archive root (the layout the engine expects). Upload + `deploy_game` to publish.
