// scenes.js — the story. Pure orchestration over the engine's G primitives.
// Title → Ch.1 → Ch.2 → Ch.3 → Ch.4A → Ch.4B → Epilogue → Recap → Letter.

export async function story(G) {
  await chapter1(G);
  await chapter2(G);
  await chapter3(G);
  await chapter4a(G);
  await chapter4b(G);
  await epilogue(G);
  await G.recap();
  await G.letter();
}

// small helper: a held silence
const beat = (G, ms = 900) => G.wait(ms);

// ---------------------------------------------------------------- CH.1
async function chapter1(G) {
  G.setBlack(true);
  await G.narrate("intro");
  await G.narrate("arrive");
  G.music("village");
  G.scene("village", { palette: "warm", spawn: { x: 160, y: 166 }, bounds: { x: 16, y: 102, w: 288, h: 68 } });
  await G.fadeIn(1100);
  await beat(G, 600);
  await G.titleCard("1", "ch1_title");

  await G.dialogue("ch1_banoi_welcome");

  // explore: optional hotspots + the pond (meeting Thu)
  await G.explore([
    { id: "banyan", x: 250, y: 112, r: 18, once: true, onInteract: () => G.dialogue("ch1_hs_banyan") },
    { id: "dinh", x: 214, y: 150, r: 18, once: true, onInteract: () => G.dialogue("ch1_hs_dinh") },
    { id: "pondinfo", x: 30, y: 150, r: 16, once: true, onInteract: () => G.dialogue("ch1_hs_pond") },
    { id: "meet", x: 92, y: 138, r: 20, terminator: true, color: "#bfe6dd" },
  ], "explore_hint");

  // meeting Thu
  await G.walkPlayerTo(96, 142);
  await G.narrate("song_heard");
  G.sfx("water");
  await G.narrate("cadao");
  G.showThu(72, 134, "thu_normal");
  await beat(G, 500);
  await G.dialogue("ch1_meet_thu");
  const c = await G.choice([
    { labelKey: "choice_frog_no", value: 1 },
    { labelKey: "choice_frog_yes", value: 2 },
  ]);
  await G.dialogue(c === 1 ? "ch1_thu_choice1" : "ch1_thu_choice2");

  // catch a frog together (gameplay)
  await G.frogCatch();
  await G.narrate("frog_play");
  await G.narrate("frog_taught");

  // a quieter exchange — let them bond
  await G.dialogue("ch1_thu_bond");

  // Seed #1 — "Tao no rồi"
  await G.dialogue("ch1_seed_meal");

  // an ordinary dusk moment
  await beat(G, 700);
  await G.dialogue("ch1_evening");

  // 1.4 — first unease
  await G.fadeOut(900);
  G.hideThu();
  G.scene("village", { palette: "warm", spawn: { x: 200, y: 150 }, player: false, bounds: { x: 16, y: 102, w: 288, h: 68 } });
  await G.fadeIn(900);
  await G.dialogue("ch1_banoi_unease");
  await beat(G, 700);
  await G.fadeOut(1100);
}

// ---------------------------------------------------------------- CH.2
async function chapter2(G) {
  await G.titleCard("2", "ch2_title");

  // 2.1 fireflies (late night) [MEM]
  G.music("summer");
  G.scene("village", { palette: "night", spawn: { x: 150, y: 160 }, dim: 0.3, bounds: { x: 16, y: 100, w: 288, h: 70 } });
  G.showThu(96, 132, "thu_normal");
  await G.fadeIn(1000);
  await G.dialogue("ch2_fireflies_intro");
  const keptFire = await G.fireflies();
  if (keptFire) G.keepMemory("mem_fireflies");
  await G.dialogue("ch2_fireflies_after");

  // moon-watching [MEM]
  await G.dialogue("ch2_moon");
  await G.watchMoon();
  await beat(G, 800);
  await G.narrate("moon_quiet");
  G.keepMemory("mem_moon");

  // 2.2 paper boats (lie) [MEM]
  await G.fadeOut(800);
  G.music("village");
  G.scene("village", { palette: "warm", spawn: { x: 150, y: 150 }, bounds: { x: 16, y: 102, w: 288, h: 68 } });
  G.showThu(96, 138, "thu_normal");
  await G.fadeIn(800);
  await G.dialogue("ch2_boat_intro");
  G.sfx("paper");
  await G.narrate("boat_fold");
  const teach = await G.choice([
    { labelKey: "choice_boat_teach", value: true },
    { labelKey: "choice_boat_skip", value: false },
  ]);
  if (teach) {
    await G.dialogue("ch2_boat_fold_pre");
    await G.foldBoat();
    await G.narrate("boat_taught");
    await G.dialogue("ch2_boat_taught");
    G.keepMemory("mem_boat");
    G.addProp("boat", 70, 132, { s: 1.1 });
    await G.narrate("boat_float");
  }

  // skipping stones [MEM]
  await G.dialogue("ch2_stone_intro");
  await G.skipStones();
  await G.narrate("stone_done");
  await G.dialogue("ch2_stone_after");
  G.keepMemory("mem_stone");

  // 2.3 jealousy
  await G.dialogue("ch2_jealous");
  await G.narrate("jealous_after");
  await G.dialogue("ch2_jealous_after");

  // the stork song [MEM]
  const sing = await G.choice([
    { labelKey: "choice_sing_yes", value: true },
    { labelKey: "choice_sing_no", value: false },
  ]);
  await G.dialogue("ch2_song");
  if (sing) { await G.narrate("cadao"); await G.dialogue("ch2_song_after"); G.keepMemory("mem_song"); }

  // 2.4 wish at the banyan
  await G.fadeOut(800);
  G.scene("banyan", { palette: "warm", spawn: { x: 150, y: 150 }, bounds: { x: 16, y: 120, w: 288, h: 50 } });
  G.showThu(120, 140, "thu_normal");
  await G.fadeIn(800);
  await G.dialogue("ch2_wish");

  // 2.5 Ghost Festival seed (light the incense)
  await G.fadeOut(900);
  G.scene("banyan", { palette: "night", spawn: { x: 160, y: 150 }, dim: 0.4, bounds: { x: 16, y: 120, w: 288, h: 50 } });
  G.hideThu();
  await G.fadeIn(900);
  await G.narrate("ram_thang_bay");
  await G.dialogue("ch2_incense");
  await G.lightIncense();
  await G.narrate("incense_done");
  await G.dialogue("ch2_ram");
  G.music("silence");
  await G.narrate("ram_empty");
  await beat(G, 1600);
  G.music("village");

  // 2.6 the silence (flaw #3)
  await G.fadeOut(800);
  G.scene("village", { palette: "warm", spawn: { x: 150, y: 150 }, bounds: { x: 16, y: 102, w: 288, h: 68 } });
  G.showThu(96, 138, "thu_normal");
  await G.fadeIn(800);
  await G.dialogue("ch2_cold");
  await beat(G, 700);
  G.hideThu();
  await G.narrate("cold_after");
  await G.fadeOut(1100);
}

// ---------------------------------------------------------------- CH.3
async function chapter3(G) {
  await G.titleCard("3", "ch3_title");
  G.music("doubt");

  // the village turns strange
  G.scene("village", { palette: "doubt", spawn: { x: 150, y: 150 }, bounds: { x: 16, y: 102, w: 288, h: 68 } });
  G.hideThu();
  await G.fadeIn(1000);
  await G.dialogue("ch3_unease");
  await G.dialogue("ch3_bap");

  // 3.1 the grave — optional, easy to miss [MEM]
  await G.fadeOut(800);
  G.scene("banyan", { palette: "doubt", spawn: { x: 150, y: 150 }, bounds: { x: 16, y: 120, w: 288, h: 50 } });
  await G.fadeIn(900);
  await G.explore([
    {
      id: "grave", x: 248, y: 150, r: 16, once: true, color: "#9aa0a8",
      onInteract: async () => { await G.narrate("grave_found"); await G.dialogue("ch3_grave"); G.keepMemory("mem_grave"); },
    },
    { id: "leave", x: 150, y: 166, r: 18, terminator: true, color: "#cdb88a" },
  ], "explore_hint");

  // 3.2 grandmother's notebook
  await G.fadeOut(800);
  G.scene("home", { palette: "doubt", spawn: { x: 120, y: 150 }, bounds: { x: 16, y: 124, w: 288, h: 46 } });
  await G.fadeIn(800);
  await G.explore([{ id: "shelf", x: 232, y: 130, r: 18, terminator: true, color: "#caa84a" }]);
  await G.narrate("notebook");
  await G.dialogue("ch3_notebook");

  // 3.3 Old Tu at the river [CINE]
  await G.fadeOut(900);
  G.music("doubt");
  G.scene("river", { palette: "doubt", spawn: { x: 160, y: 168 }, bounds: { x: 16, y: 158, w: 288, h: 14 } });
  await G.fadeIn(900);
  await G.explore([{ id: "tu", x: 160, y: 162, r: 24, terminator: true, color: "#cdb88a" }]);
  await G.dialogue("ch3_ongtu");
  await G.cineEnter(160, 120, 1.9, 0.5);
  await beat(G, 3000); // the long silence
  await G.dialogue("ch3_ongtu_cine");
  await G.cineExit();
  G.music("silence");
  await G.fadeOut(1600);
  await G.narrate("river_black");
}

// ---------------------------------------------------------------- CH.4A
async function chapter4a(G) {
  await G.titleCard("4", "ch4a_title");

  // 4A.1 Bà Nội tells (but not all) [CINE]
  G.scene("home", { palette: "truth", spawn: { x: 150, y: 150 }, player: false, bounds: { x: 16, y: 124, w: 288, h: 46 } });
  await G.fadeIn(1000);
  await G.cineEnter(150, 110, 1.5, 0.35);
  await G.dialogue("ch4a_banoi"); // portrait switches to crying mid-monologue
  await beat(G, 800);
  await G.cineExit();

  // 4A.2 confront Thu
  await G.fadeOut(900);
  G.scene("banyan", { palette: "truth", spawn: { x: 150, y: 150 }, bounds: { x: 16, y: 120, w: 288, h: 50 } });
  G.showThu(120, 140, "thu_sad");
  await G.fadeIn(900);
  await G.dialogue("ch4a_confront");
  await beat(G, 700);
  await G.fadeOut(1000);
}

// ---------------------------------------------------------------- CH.4B
async function chapter4b(G) {
  await G.titleCard("4", "ch4b_title");

  // 4B.1 the thing Thu never had
  G.scene("banyan", { palette: "truth", spawn: { x: 150, y: 150 }, bounds: { x: 16, y: 120, w: 288, h: 50 } });
  G.showThu(120, 140, "thu_sad");
  await G.fadeIn(900);
  await G.dialogue("ch4b_outside");

  // 4B.2 preparation — ask Grandma
  await G.fadeOut(800);
  G.scene("home", { palette: "truth", spawn: { x: 150, y: 150 }, player: false, bounds: { x: 16, y: 124, w: 288, h: 46 } });
  await G.fadeIn(800);
  await G.dialogue("ch4b_ask_banoi");
  await G.fadeOut(1000);

  // 4B.3 the festival night [CINE]
  G.music("farewell");
  G.scene("festival", { palette: "night", spawn: { x: 160, y: 168 }, dim: 0.28, bounds: { x: 16, y: 120, w: 288, h: 50 } });
  G.sfx("lantern");
  await G.fadeIn(1300);
  await G.narrate("festival_far");
  G.showThu(160, 150, "thu_sad");
  await G.dialogue("ch4b_gate");
  await G.walkPlayerTo(150, 150);
  G.moveThu(150, 148);
  await G.dialogue("ch4b_elders");

  // release a lantern together (interactive climax)
  await G.dialogue("ch4b_lantern");
  await G.releaseLantern();
  G.sfx("lantern");
  await beat(G, 600);

  // the goodbye
  await G.cineEnter(155, 140, 2.0, 0.5);
  G.showThu(155, 148, "thu_smile");
  await G.dialogue("ch4b_farewell");
  G.sfx("lantern");
  await G.narrate("thu_fade");
  await G.thuFade(7500);
  await G.cineExit();
  await G.fadeOut(2600);
  await G.narrate("to_letter");
  await G.fadeOut(1200);
}

// ---------------------------------------------------------------- EPILOGUE
async function epilogue(G) {
  await G.narrate("ten_years_later");
  G.music("cadao");
  await G.narrate("ep_arrive");
  G.scene("epilogue", { palette: "epilogue", spawn: { x: 160, y: 166 }, sprite: "minh_adult", bounds: { x: 16, y: 104, w: 288, h: 66 } });
  await G.fadeIn(1300);

  await G.explore([
    { id: "pond", x: 60, y: 140, r: 18, once: true, onInteract: () => G.narrate("ep_pond") },
    { id: "dinh", x: 224, y: 120, r: 18, once: true, onInteract: () => G.narrate("ep_dinh") },
    { id: "banyan", x: 250, y: 110, r: 22, terminator: true, color: "#cdb88a" },
  ], "explore_hint");

  await G.walkPlayerTo(232, 120);
  await G.narrate("ep_banyan");

  // the conditional objects under the banyan
  G.addProp("boat", 244, 150, { s: 1.0 });
  await G.narrate("ep_boat");
  if (G.getFlag("mem_fireflies")) {
    G.addProp("jar", 258, 150, { glow: true });
    await G.narrate("ep_jar");
  }
  await beat(G, 700);
  await G.narrate("ep_song");
  await beat(G, 700);
  await G.narrate("ep_close");
  await G.fadeOut(1800);
}
