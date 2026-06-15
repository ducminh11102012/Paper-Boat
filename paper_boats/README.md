# Paper Boats — web build

A faithful HTML5/Canvas adaptation of the *Paper Boats* master doc (v2.0): a bilingual
(Tiếng Việt / English) narrative walking-sim about Minh and the ghost-girl Thu. This build
covers the **Minimum Shippable** emotional slice:

> Title → Language Select → Ch.1 → Ch.2 → Ch.3 → Ch.4A → Ch.4B → The Letter

## What's implemented

- **Full bilingual story & dialogue** (every line from the doc), portraits, typewriter text
  with per-character text-blip SFX (Undertale-style; Thu has a faint shimmer tail).
- **Hệ Thống Ký Ức (Memory system)** — `mem_fireflies`, `mem_boat`, `mem_grave`, `mem_song`.
  The count changes the **final letter** (P/S line + a "thank you for remembering" line).
  No bad ending — only *fuller* or *sparser*.
- **Thu's transparency rule** — alpha 0.88 + micro-flicker + soft glow; staged farewell fade
  0.88 → 0.6 → 0.3 → 0 at the festival.
- **Cinematic camera** on the three `[CINE]` beats (Old Tu at the river, Grandma crying,
  Thu's goodbye): zoom-in + world dim + vignette.
- **Per-chapter palette** (warm golden hour → doubt → truth → festival night).
- **Fireflies minigame**, free-roam **hotspot exploration** with optional/missable beats.
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
