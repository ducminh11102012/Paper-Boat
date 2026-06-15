// audio.js — WebAudio synthesis: text-blips, procedural folk music, SFX.
// Real generated tracks (./assets/audio/<name>.mp3) override the synth ones when present.

const PENT = [0, 2, 4, 7, 9]; // major pentatonic — Vietnamese folk flavor
function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
function deg(root, i) { const oct = Math.floor(i / 5); return root + 12 * oct + PENT[((i % 5) + 5) % 5]; }

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.vol = 0.8;
    this.curTrack = null;
    this.scheduler = null;
    this.realMusic = {}; // name -> HTMLAudioElement
    this.realEl = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.0; this.musicGain.connect(this.master);
    // gentle delay for "air"
    this.delay = this.ctx.createDelay(); this.delay.delayTime.value = 0.18;
    this.fb = this.ctx.createGain(); this.fb.gain.value = 0.22;
    this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.master);
  }
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; for (const k in this.realMusic) this.realMusic[k].volume = v * 0.7; }

  _voice(freq, t, dur, type = "sine", gain = 0.25, toDelay = true) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); if (toDelay) g.connect(this.delay);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ---- text blips ----
  blip(speaker) {
    if (!this.ctx) return;
    const base = { minh: 70, thu: 77, banoi: 58, ongtu: 53, narr: 64 }[speaker] ?? 66;
    const t = this.ctx.now ? this.ctx.now() : this.ctx.currentTime;
    const f = midi(base + (Math.random() * 2 - 1));
    this._voice(f, t, 0.07, speaker === "banoi" || speaker === "ongtu" ? "triangle" : "square", 0.12, speaker === "thu");
    if (speaker === "thu") this._voice(f * 1.005, t + 0.015, 0.12, "sine", 0.05, true); // faint shimmer tail
  }

  // ---- SFX ----
  sfx(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (name === "firefly") { this._voice(midi(88), t, 0.18, "sine", 0.18); this._voice(midi(93), t + 0.05, 0.2, "sine", 0.12); }
    else if (name === "water") { const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(midi(72), t); o.frequency.exponentialRampToValueAtTime(midi(60), t + 0.3); const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.4); }
    else if (name === "paper") { for (let i = 0; i < 6; i++) this._voice(midi(80 + Math.random() * 10), t + i * 0.02, 0.03, "square", 0.05, false); }
    else if (name === "lantern") { const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(midi(64), t); o.frequency.linearRampToValueAtTime(midi(79), t + 0.6); const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); o.connect(g); g.connect(this.master); g.connect(this.delay); o.start(t); o.stop(t + 0.8); }
    else if (name === "step") { this._voice(midi(45 + Math.random() * 3), t, 0.05, "triangle", 0.05, false); }
  }

  // ---- procedural music ----
  // track defs: root midi, melody degrees, tempo (sec/beat), voice type, accent (bass)
  _trackDef(name) {
    if (name === "village") return { root: 60, mel: [4, 5, 6, 5, 4, 2, 1, 2, 4, 6, 7, 6, 4, 5, 4, 2], beat: 0.42, type: "triangle", bass: true, gain: 0.22 };
    if (name === "summer") return { root: 57, mel: [2, 4, 5, 4, 2, 1, 0, 1, 2, 4, 2, 1], beat: 0.5, type: "sine", bass: true, gain: 0.18 };
    if (name === "doubt") return { root: 55, mel: [0, 1, 0, -1, 0, 2, 1, 0, -2, -1, 0], beat: 0.6, type: "sine", bass: false, gain: 0.16, minor: true };
    if (name === "farewell") return { root: 53, mel: [4, 6, 5, 4, 2, 4, 1, 0, 1, 2, 4, 2, 1, 0], beat: 0.66, type: "sine", bass: true, gain: 0.2, bau: true };
    if (name === "cadao") return { root: 53, mel: [4, 5, 4, 2, 1, 0, 1, 2, 4, 2, 1, 0, -1, 0], beat: 0.72, type: "sine", bass: false, gain: 0.2, bau: true };
    return null;
  }

  music(name, { fade = 1.5 } = {}) {
    if (this.curTrack === name) return;
    this.curTrack = name;
    // stop any real element
    if (this.realEl) { this.realEl.pause(); this.realEl = null; }
    this._stopScheduler();
    if (!this.ctx) return;
    if (name === "silence" || !name) { this.musicGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4); return; }

    // real track override
    if (this.realMusic[name]) {
      const el = this.realMusic[name]; el.loop = true; el.volume = this.vol * 0.7; el.currentTime = 0; el.play().catch(() => {}); this.realEl = el; return;
    }

    const def = this._trackDef(name); if (!def) return;
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(def.gain, this.ctx.currentTime + fade);

    let i = 0;
    let next = this.ctx.currentTime + 0.1;
    const step = () => {
      if (this.curTrack !== name) return;
      const lookahead = this.ctx.currentTime + 0.6;
      while (next < lookahead) {
        const dgi = def.mel[i % def.mel.length];
        const semis = def.minor ? this._minorDeg(dgi) : (PENT[((dgi % 5) + 5) % 5] + 12 * Math.floor(dgi / 5));
        const f = midi(def.root + semis);
        this._mvoice(f, next, def.beat * 0.95, def.type, def.bau ? 0.018 : 0.012);
        if (def.bass && i % 2 === 0) this._mvoice(midi(def.root - 12), next, def.beat * 1.6, "sine", 0.01);
        next += def.beat; i++;
      }
      this.scheduler = setTimeout(step, 120);
    };
    step();
  }
  _minorDeg(i) { const sc = [0, 2, 3, 5, 7, 8, 10]; const oct = Math.floor(i / 7); return 12 * oct + sc[((i % 7) + 7) % 7]; }
  _mvoice(freq, t, dur, type, peak) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak / Math.max(this.musicGain.gain.value, 0.05), t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.musicGain); g.connect(this.delay);
    o.start(t); o.stop(t + dur + 0.05);
  }
  _stopScheduler() { if (this.scheduler) { clearTimeout(this.scheduler); this.scheduler = null; } }
  stopMusic() { this.music("silence"); }

  async loadReal() {
    const names = ["village", "summer", "doubt", "farewell", "cadao"];
    await Promise.all(names.map((n) => new Promise((res) => {
      const el = new Audio();
      el.addEventListener("canplaythrough", () => { this.realMusic[n] = el; res(); }, { once: true });
      el.addEventListener("error", () => res(), { once: true });
      el.src = `./assets/audio/${n}.mp3`;
    })));
  }
}

export const audio = new AudioManager();
