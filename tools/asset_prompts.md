# Higgsfield asset prompts — Paper Boats

**Model:** `nano_banana_2` · resolution `1k` · backgrounds `16:9`, portraits/sprites `1:1`.
Each prompt is `<kind template> + <description> + <STYLE FORMULA> + <kind suffix>`, per the
stylization contract. The STYLE FORMULA is inserted **byte-identical** every time.

## STYLE FORMULA (locked)
> Cozy 16-bit pixel art with fine dithering and a warm limited palette, soft pixel shading; rounded gentle shapes with soft dark-umber outlines and chunky readable pixel clusters; environment in golden-hour ambers, dusty rose and rice-paddy greens with deep teal shadows, the living boy in bright white-and-indigo that pops, the ghost girl in pale washed-out blue-green with a faint translucent glow, lanterns and fireflies marked with warm amber light; tender nostalgic Vietnamese countryside at golden hour, quietly melancholic; high contrast between characters and backgrounds, clean readable silhouettes, consistent top-down storybook perspective across all assets.

Suffixes:
- background: `, no characters, no UI elements, slightly muted detail so foreground game elements stay readable, soft depth layering`
- sprite/portrait: `, on a solid uniform bright <KEY> background, no shadows cast on the background, no ground plane, nothing cropped at the edges`

## Backgrounds (16:9) — `game background of <desc>, wide establishing view,` + FORMULA + bg suffix
- **title** → a single small white paper boat drifting on a calm moonlit village pond, ancient banyan on the bank, distant thatched houses
- **village** → a Vietnamese village seen top-down: red-dirt path, a lotus pond, thatched houses, a banyan at the edge, golden afternoon
- **river** → a wide muddy river at dusk seen top-down, faded lotus and dry reeds on the near bank, overcast melancholy light
- **banyan** → a huge ancient banyan tree with hanging roots, red cloth wish-strips on a branch, a small spirit shrine with an incense bowl, an old grave stone half-hidden in grass, top-down
- **festival** → a village temple courtyard at night strung with colorful paper lanterns, warm stone ground, top-down
- **letter** → an old folded child's letter on a dark table, smudged ink, warm lamplight (used as the letter backdrop)
- **home** → the inside of a wooden village house, plank walls, a bookshelf with an old notebook, warm window light, top-down

## Portraits (1:1, KEY=#FF00FF; use #00FF00 for Thu) — `game sprite of <desc>, single character, full body visible, centered,` (use "front-facing bust portrait" framing) + FORMULA + sprite suffix
- **minh** → front-facing bust portrait of a shy 11-year-old Vietnamese boy, short black hair, plain white/indigo shirt
- **thu_normal** (#00FF00) → front-facing bust portrait of a 10-year-old girl, faded pale-blue floral shirt, single braid, gentle faint smile, slightly translucent ghostly
- **thu_sad** (#00FF00) → same girl, sorrowful, looking down
- **thu_smile** (#00FF00) → same girl, a radiant tearful TRUE smile, eyes nearly closed with joy
- **banoi_normal** → front-facing bust portrait of a ~70-year-old Vietnamese grandmother, brown áo bà ba, grey hair in a bun, kind weathered face
- **banoi_crying** → same grandmother, weeping, tears on her cheeks
- **ongtu_normal** → front-facing bust portrait of a gaunt ~75-year-old Vietnamese man, worn brown shirt, hollow tired eyes, holding a bamboo cane

## Sprites (1:1) — `game sprite of <desc>, single character, full body visible, centered,` + FORMULA + sprite suffix
- **minh** (KEY=#FF00FF) → a top-down view of an 11-year-old boy in a white shirt, seen from directly above, standing
- **thu** (KEY=#00FF00) → a top-down view of a 10-year-old ghost girl in a faded floral shirt with a braid, seen from directly above, faint translucent glow

## Music (generate_audio · `sonilo_music`)
- **village** → warm gentle acoustic guitar and bamboo flute, peaceful Vietnamese village afternoon, soft and nostalgic, loopable
- **summer** → soft piano with cricket ambience, warm summer evening nostalgia, loopable
- **doubt** → sparse piano and strings in harmonic minor, quietly unsettling, loopable
- **farewell** → đàn bầu monochord and đàn tranh zither, sorrowful yet peaceful, a tender goodbye, loopable
- **cadao** → a single mournful đàn bầu monochord, a nostalgic Vietnamese folk lullaby feel, loopable
