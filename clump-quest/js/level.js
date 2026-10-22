// Procedural level: ground segments, entities and dark zones, generated just ahead of the camera.
// All distances are in pixels at base speed; difficulty changes tempo, not geometry,
// so every jump stays makeable at every setting.
import { rand, pick, lerp } from './util.js';

const DEF = {
  grunt: { enemy: 1, hp: 1, h: 50, hint: ['barb'] },
  shield: { enemy: 1, hp: 1, h: 64, hint: ['barb'] },
  bat: { enemy: 1, hp: 1, h: 36, hint: ['wiz'] },
  spitter: { enemy: 1, hp: 1, h: 46, cd: 0.2, hint: ['wiz'] },
  brute: { enemy: 1, hp: 2, h: 116, hint: ['cleric', 'barb'] },
  wall: { h: 175, hint: ['barb'] },
  gate: { h: 200 },
  spikes: { h: 26, w: 72, hint: ['jump'] },
  ring: { h: 0, hint: ['druid'] },
  switch: { h: 0, hint: ['druid'] },
  brazier: { h: 70, hint: ['wiz'] },
  altar: { h: 80, hint: ['cleric'] },
  sign: { h: 60 },
  mark: { h: 120 },
  bossMark: { h: 0 },
  proj: { h: 0, r: 11 },
};

// Each chunk is one "beat" of the level. L is the Level, T the difficulty tuning.
const CH = {
  gapS(L) { L.add('mark', 40, { hint: ['jump'] }); L.flat(90); L.gap(rand(110, 150)); L.flat(120); },
  grunt(L, T) { const n = 1 + ((Math.random() * (1 + T.d * 2.4)) | 0); for (let i = 0; i < n; i++) L.add('grunt', 200 + i * 85); L.flat(260 + n * 85); },
  shield(L) { L.add('shield', 220); L.flat(360); },
  bats(L, T) { const n = 1 + ((Math.random() * (1 + T.d * 2)) | 0); for (let i = 0; i < n; i++) L.add('bat', 300 + i * 130, { y: L.y - 150 - rand(40), ph: rand(6) }); L.flat(300 + n * 130); },
  spitter(L) { L.add('spitter', 420); L.flat(560); },
  brute(L) { L.add('brute', 320); L.flat(520); },
  wall(L) { L.add('wall', 160); L.flat(330); },
  spikes(L) { L.add('spikes', 140); L.flat(300); },
  dashGap(L) { L.add('mark', 30, { hint: ['jump', 'barb'] }); L.flat(90); L.gap(300); L.flat(140); },
  grapple(L) { L.flat(60); L.add('ring', 270, { y: L.y - 210 }); L.gap(540); L.flat(140); },
  gate(L) { const g = L.add('gate', 520); L.add('switch', 130, { y: L.y - 175, link: g }); L.flat(680); },
  bridge(L) { const sw = L.add('switch', 130, { y: L.y - 175 }); L.flat(470); sw.link = L.gap(430, true); L.flat(140); },
  altar(L) { L.add('altar', 200); L.flat(380); },
  cliff(L) { L.add('sign', 70); L.add('mark', 235, { hint: ['cleric'] }); L.flat(260); L.drop(rand(300, 380)); L.flat(380); },
  dark(L, T) {
    const z = { x0: L.x, x1: 0, lit: 0 };
    L.zones.push(z);
    L.add('brazier', 330, { zone: z });
    L.flat(480);
    const n = 2 + (T.d > 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) { CH[pick(['grunt', 'spikes', 'gapS', 'wall', 'bats'])](L, T); L.flat(T.pad * 0.6 + 60); }
    z.x1 = L.x;
    L.flat(150);
  },
  // evenly spaced beats — the rhythm-game moments
  rhythm(L, T) {
    const sp = lerp(330, 250, T.d);
    const seq = pick([['wall', 'spikes', 'wall'], ['spikes', 'spikes', 'spikes'], ['spikes', 'wall', 'spikes', 'wall'], ['grunt', 'spikes', 'grunt']]);
    seq.forEach((s, i) => L.add(s, 160 + i * sp));
    L.flat(160 + seq.length * sp);
  },
  gapGrunt(L) { CH.gapS(L); L.add('grunt', 130); L.add('grunt', 220); L.flat(360); },
};

// First stage walks through every mechanic once, in a sensible teaching order.
const INTRO = ['gapS', 'grunt', 'wall', 'gate', 'bats', 'spikes', 'spitter', 'grapple', 'altar', 'cliff', 'brute', 'dark', 'dashGap'];

function weights(T, theme, stage, health) {
  return {
    grunt: 3, shield: 1.4, bats: 2, spitter: 1.8, brute: stage > 0 || T.d > 0.3 ? 1.3 : 0.5,
    wall: 2.4, spikes: 1.8, gapS: 1.8, dashGap: 1.4, grapple: 1.5, gate: 1.3, bridge: 1.1,
    altar: health < 50 ? 2.2 : 0.5, cliff: theme.cliff, dark: theme.dark * 1.1,
    rhythm: 0.6 + T.d * 1.6, gapGrunt: T.d * 1.5,
  };
}

export class Level {
  constructor(theme, idle) {
    this.open = { x0: -3000, x1: Infinity, y: 0, on: true };
    this.segs = [this.open];
    this.ents = [];
    this.zones = [];
    this.x = 900;
    this.y = 0;
    this.idle = idle;
    this.prev = '';
    this.script = idle ? [] : [...INTRO];
    this.startStage(theme, 0);
  }
  startStage(theme, stage) {
    this.theme = theme;
    this.stage = stage;
    this.mode = 'run';
    this.left = stage === 0 ? INTRO.length : 12 + Math.min(stage, 5);
  }
  flat(n) { this.x += n; }
  gap(w, bridge = false) {
    this.open.x1 = this.x;
    let b = null;
    if (bridge) { b = { x0: this.x, x1: this.x + w, y: this.y, on: false, bridge: true }; this.segs.push(b); }
    this.x += w;
    this.open = { x0: this.x, x1: Infinity, y: this.y, on: true };
    this.segs.push(this.open);
    return b;
  }
  drop(h) {
    this.open.x1 = this.x;
    this.y += h;
    this.open = { x0: this.x, x1: Infinity, y: this.y, on: true };
    this.segs.push(this.open);
  }
  spawn(type, x, y, props = {}) {
    const e = { type, x, y, gy: y, ...DEF[type], ...props };
    e.fy = e.y;
    this.ents.push(e);
    return e;
  }
  add(type, dx, props) { return this.spawn(type, this.x + dx, this.y, props); }

  groundAt(x) {
    for (const s of this.segs) if (s.on && x >= s.x0 && x < s.x1) return s;
    return null;
  }
  nextSeg(x) {
    for (const s of this.segs) if (s.on && s.x0 > x) return s;
    return null;
  }

  pickChunk(T, health) {
    if (this.script.length) return this.script.shift();
    const w = weights(T, this.theme, this.stage, health);
    let tot = 0;
    for (const k in w) if (k !== this.prev) tot += w[k];
    let r = Math.random() * tot;
    for (const k in w) {
      if (k === this.prev) continue;
      r -= w[k];
      if (r <= 0) return k;
    }
    return 'grunt';
  }

  generate(camX, T, health) {
    while (this.x < camX + 1800) {
      if (this.idle || this.mode === 'boss') { this.flat(500); continue; }
      if (this.left <= 0) {
        this.add('bossMark', 350);
        this.flat(900);
        this.mode = 'boss';
        continue;
      }
      const k = this.pickChunk(T, health);
      this.prev = k;
      this.flat(T.pad + rand(0, 100));
      CH[k](this, T);
      this.left--;
    }
    this.ents = this.ents.filter((e) => !e.gone && e.x > camX - 400);
    this.segs = this.segs.filter((s) => s.x1 > camX - 600);
    this.zones = this.zones.filter((z) => !z.x1 || z.x1 > camX - 600);
  }
}
