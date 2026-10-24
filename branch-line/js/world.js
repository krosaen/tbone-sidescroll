// The track network: oak branches and telephone wires on three lanes, generated just ahead of
// the camera, with springy surfaces that bounce under the squirrel.
import { rand, pick, clamp, lerp } from '../../shared/util.js';
import { LANE_Y, makeOak, makeLeafCluster } from './art.js';

const spring = () => ({ d: 0, v: 0, load: 0 });
const SPECIES = ['red', 'white', 'bur'];

// Pre-painted clumps of hanging-on leaves: the quiet marker for branches you can run on.
const CLUSTERS = {};
const cluster = (sp) => {
  if (!CLUSTERS[sp]) CLUSTERS[sp] = Array.from({ length: 10 }, (_, i) => makeLeafCluster(sp, i % 3 === 0 ? 1 : 0.4));
  return pick(CLUSTERS[sp]);
};

// Michigan locals and where they like to be.
const ON_BRANCH = { gray: 3, black: 1.2, fox: 1.6, red: 2.6, chip: 1.6, crow: 1, robin: 1.6, dove: 1, bird: 1.6 };
const ON_WIRE = { gray: 1.4, black: 0.6, fox: 0.5, red: 1, chip: 0.3, crow: 2.2, robin: 1, dove: 2.6, bird: 1.4 };
export const WALKERS = new Set(['gray', 'black', 'fox', 'red', 'chip']);
export const PERCHERS = new Set(['crow', 'robin', 'dove']);
const FLYERS = ['jay', 'chick', 'card'];
// body hitbox: [half width, height above the feet, height of the bottom above the feet]
export const HIT = { gray: [7, 11, 0], black: [7, 11, 0], fox: [8, 12, 0], red: [6, 9, 0], chip: [5, 7, 0], crow: [7, 17, 0], robin: [5, 12, 0], dove: [6, 10, 0], bird: [6, 4, -3] };

function weighted(w) {
  let tot = 0;
  for (const k in w) tot += w[k];
  let r = Math.random() * tot;
  for (const k in w) if ((r -= w[k]) <= 0) return k;
  return Object.keys(w)[0];
}

export class World {
  constructor() {
    this.segs = [];
    this.trees = [];
    this.poles = [];
    this.ents = [];
    this.mode = 'normal'; // normal | calm (before the eagle) | sparse (eagle's last stand)
    this.cur = this.wires(-260, [1, 2], 4, null);
  }

  // ---------- queries ----------
  segAt(lane, x) {
    for (const s of this.segs) if (s.lane === lane && x >= s.x0 && x <= s.x1) return s;
    return null;
  }
  nextSeg(lane, x) {
    let best = null;
    for (const s of this.segs) if (s.lane === lane && s.x0 > x && (!best || s.x0 < best.x0)) best = s;
    return best;
  }
  // Height of the track surface at x, including the branch's crooks, bounce and the squirrel's weight.
  surface(s, x, t = 0) {
    const base = LANE_Y[s.lane];
    if (s.kind === 'branch') {
      const right = x >= s.tx, sp = right ? s.R : s.L;
      const len = right ? s.x1full - s.tx : s.tx - s.x0;
      const u = clamp(Math.abs(x - s.tx) / Math.max(1, len), 0, 1.2), shape = u ** 1.5;
      // oak limbs rise a little off the trunk, wander, then droop toward the tip
      const crook = u * (2.6 * Math.sin((x - s.tx) * 0.04 + s.c1) + 1.2 * Math.sin((x - s.tx) * 0.11 + s.c2)) - s.lift * Math.sin(Math.min(1, u) * Math.PI * 0.8) + u * u * 3;
      return base + crook + shape * (1.5 + sp.d + Math.sin(t * 1.6 + s.seed + (right ? 0 : 2)) * 0.6);
    }
    const i = clamp(Math.floor((x - s.x0) / s.sp), 0, s.spans.length - 1);
    const p0 = s.x0 + i * s.sp, u = clamp((x - p0) / s.sp, 0, 1), sp = s.spans[i];
    let y = base + Math.sin(Math.PI * u) * (3 + sp.d);
    if (sp.load && sp.lx != null) { // a taut wire pulled into a V under a point load
      const ul = clamp((sp.lx - p0) / s.sp, 0.02, 0.98), peak = sp.load * 4 * ul * (1 - ul);
      y += u < ul ? (peak * u) / ul : (peak * (1 - u)) / (1 - ul);
    }
    return y;
  }
  springAt(s, x) {
    if (s.kind === 'branch') return x >= s.tx ? s.R : s.L;
    return s.spans[clamp(Math.floor((x - s.x0) / s.sp), 0, s.spans.length - 1)];
  }
  kick(s, x, v) {
    if (s) this.springAt(s, x).v += v;
  }
  // The squirrel's weight: dips the branch side / wire span it stands on.
  setLoad(s, x) {
    for (const g of this.segs) {
      if (g.kind === 'branch') { g.L.load = 0; g.R.load = 0; } else for (const sp of g.spans) { sp.load = 0; sp.lx = null; }
    }
    if (!s) return;
    const sp = this.springAt(s, x);
    if (s.kind === 'branch') sp.load = 1.6 * clamp(Math.abs(x - s.tx) / 60, 0, 1);
    else { sp.load = 3; sp.lx = x; }
  }
  update(dt) {
    // damped springs: they settle under the load and wiggle after every kick
    const step = (sp, k, c, rest) => { sp.v += (-k * (sp.d - rest) - c * sp.v) * dt; sp.d += sp.v * dt; };
    for (const s of this.segs) {
      if (s.kind === 'branch') { step(s.L, 70, 3.2, s.L.load); step(s.R, 70, 3.2, s.R.load); }
      else for (const sp of s.spans) step(sp, 110, 2.6, 0);
    }
  }

  // ---------- building blocks ----------
  // `keep` lanes are the ones the previous structure relies on, so they're never the broken one.
  tree(x0, lanes, T, keep = [], short = false) {
    const L = short ? rand(35, 55) : rand(55, 110), R = short ? rand(55, 85) : rand(80, 145);
    const tx = x0 + L, x1 = tx + R, seed = rand(100), species = pick(SPECIES);
    let broken = -1;
    if (!short && lanes.length >= 2 && Math.random() < 0.38) {
      const cands = lanes.filter((l) => !keep.includes(l) && (lanes.includes(l - 1) || lanes.includes(l + 1)));
      if (cands.length) broken = pick(cands);
    }
    const tr = { tx, x0, x1, seed, species, img: makeOak({ height: 238, species, leaves: 0.05, crownY: 78 }) };
    this.trees.push(tr);
    for (const lane of lanes) {
      const brk = lane === broken;
      const s = {
        kind: 'branch', lane, x0, x1: brk ? tx + rand(14, 32) : x1, x1full: x1, tx, L: spring(), R: spring(), seed, broken: brk, tree: tr,
        c1: rand(6.28), c2: rand(6.28), lift: rand(1, 5), leaves: [], twigs: [], knots: [],
      };
      // leaves still hanging on along the branch, a bit denser toward the tips
      for (let x = s.x0 + 10 + rand(20); x < s.x1 - 4; x += rand(24, 62)) if (Math.abs(x - tx) > 14) s.leaves.push({ x, img: cluster(species), below: Math.random() < 0.7 });
      for (let x = s.x0 + 8; x < s.x1 - 8; x += rand(14, 30)) s.knots.push({ x, d: rand(-1, 1.6) }); // knobbly thickness
      for (let x = s.x0 + 6; x < s.x1 - 6; x += rand(10, 26)) if (Math.abs(x - tx) > 10) s.twigs.push({ x, a: rand(-2.5, -0.6), l: rand(4, 13), fork: Math.random() < 0.3 });
      this.segs.push(s);
      if (T) this.populate(s, T, 'tree');
    }
    return { x0, x1, lanes, full: lanes.filter((l) => l !== broken) };
  }

  wires(x0, lanes, n, T, sp = rand(150, 190)) {
    const x1 = x0 + n * sp;
    for (let i = 0; i <= n; i++) this.poles.push({ x: x0 + i * sp, lanes });
    for (const lane of lanes) {
      const s = { kind: 'wire', lane, x0, x1, sp, spans: Array.from({ length: n }, spring) };
      this.segs.push(s);
      if (T) this.populate(s, T, 'wire');
    }
    return { x0, x1, lanes, full: lanes };
  }

  spawn(type, s, x, extra = {}) {
    const e = {
      type, lane: s ? s.lane : -1, seg: s, x, home: x, y: s ? LANE_Y[s.lane] : 0, dir: Math.random() < 0.5 ? -1 : 1,
      pose: WALKERS.has(type) ? 'walk' : 'stand', st: rand(0.5, 2.5), ph: rand(10), ...extra,
    };
    if (type === 'bird') { e.kind = e.kind || pick(FLYERS); e.dir = -1; e.pose = 'fly'; if (s) e.y = LANE_Y[s.lane] - 10; }
    this.ents.push(e);
    return e;
  }

  // `clear` keeps the stretch where you land after the previous structure free of creatures.
  populate(s, T, kind) {
    if (this.mode !== 'normal') return;
    const d = T.d;
    for (let x = Math.max(s.x0 + 70, this.clear || -1e9); x < s.x1 - 40; x += rand(55, 105) * lerp(1.2, 0.85, d)) {
      if (Math.random() > lerp(0.45, 0.78, d)) continue;
      const type = weighted(kind === 'tree' ? ON_BRANCH : ON_WIRE);
      this.spawn(type, s, x);
      // pairs that stop to chatter with each other
      if (WALKERS.has(type) && Math.random() < 0.35 && x + 24 < s.x1 - 30) { this.spawn(pick(['gray', 'red', 'chip', 'fox']), s, x + rand(18, 26)); x += 26; }
      if (type === 'bird') x += 40; // they fly toward you, give them room
    }
  }

  // ---------- generation ----------
  next(T) {
    const C = this.cur, d = T.d, mode = this.mode;
    let rel = Math.random();
    rel = rel < 0.28 ? 'overlap' : rel < 0.66 ? 'jump' : 'glide';
    if (mode === 'calm') rel = Math.random() < 0.7 ? 'jump' : 'overlap'; // keep adjacent tracks around for dodging
    if (mode === 'sparse') rel = 'glide';
    if (rel === 'overlap' && C.lanes.length === 3) rel = 'jump';
    const kind = Math.random() < 0.62 ? 'tree' : 'wires';
    const r = Math.random();
    let lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, r < 0.3 ? 1 : r < 0.8 ? 2 : 3);
    if (mode === 'calm') lanes = pick([[0, 1], [1, 2], [0, 1, 2], [0, 1, 2]]);
    if (mode === 'sparse') lanes = [pick([0, 1, 2])];
    if (kind === 'wires' && lanes.length === 3) lanes.pop();
    const low = Math.max(...C.full);
    if (rel === 'overlap') {
      // a different set of tracks that you have to hop up or drop down to
      // (every lane of C must be able to reach it: one lane up, or anything below)
      lanes = [0, 1, 2].filter((l) => !C.lanes.includes(l));
      if (!lanes.length || !C.full.every((l) => lanes.some((n) => n === l - 1 || n > l))) { rel = 'jump'; lanes = [low]; }
    } else if (!lanes.some((n) => n >= low)) lanes.push(low);
    lanes = [...new Set(lanes)].sort();
    const gap = rel === 'overlap' ? -rand(70, 120) : rel === 'jump' ? rand(24, 54) : rand(150, lerp(260, 320, d));
    const x0 = C.x1 + gap;
    this.clear = C.x1 + 70;
    // birds crossing the big gaps, at the height you'll be gliding
    if (rel === 'glide' && mode === 'normal') {
      const n = Math.random() < 0.3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const l = pick(C.full);
        this.spawn('bird', null, C.x1 + gap * rand(0.35, 0.8) + 120, { air: true, y: LANE_Y[l] - rand(6, 26), lane: -1 });
      }
    }
    const keep = rel === 'overlap' ? lanes : [low];
    const short = mode === 'sparse';
    this.cur = kind === 'tree' || short
      ? this.tree(x0, lanes, T, keep, short)
      : this.wires(x0, lanes, mode === 'calm' ? 3 : 1 + ((Math.random() * 3) | 0), T);
  }

  generate(camX, T) {
    while (this.cur.x1 < camX + 900) this.next(T);
    const cut = camX - 220;
    this.segs = this.segs.filter((s) => s.x1 > cut);
    this.trees = this.trees.filter((t) => t.tx + 170 > cut);
    this.poles = this.poles.filter((p) => p.x > cut);
    this.ents = this.ents.filter((e) => !e.gone && e.x > cut);
  }
}
