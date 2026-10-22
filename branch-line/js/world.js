// The track network: trees whose branches and telephone wires make up three lanes,
// generated just ahead of the camera, with springy surfaces that bounce under the squirrel.
import { rand, pick, clamp, lerp } from '../../shared/util.js';
import { LANE_Y, makeCanopy, makeTrunk, makeTuft, randomPal } from './art.js';

const spring = () => ({ d: 0, v: 0, load: 0 });
const FRUITS = [
  { col: ['#a61f16', '#d23a26', '#ffb0a0'], juice: '#c8281e' }, // apple
  { col: ['#a8a030', '#d0c850', '#f4f0a0'], juice: '#cfc24a' }, // pear
  { col: ['#c4520e', '#ec7a1e', '#ffd090'], juice: '#ef7a1a' }, // persimmon
  { col: ['#4a1e5a', '#6e3482', '#c49ad8'], juice: '#7a2e8e' }, // plum
];

export class World {
  constructor() {
    this.segs = [];
    this.trees = [];
    this.poles = [];
    this.ents = [];
    this.cur = this.wires(-260, [1, 2], 4, false);
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
  // Height of the track surface at x, including bounce and the squirrel's weight.
  surface(s, x, t = 0) {
    const base = LANE_Y[s.lane];
    if (s.kind === 'branch') {
      const right = x >= s.tx, sp = right ? s.R : s.L;
      const len = right ? s.x1full - s.tx : s.tx - s.x0;
      const u = clamp(Math.abs(x - s.tx) / Math.max(1, len), 0, 1.2), shape = u ** 1.5;
      return base + shape * (1.5 + sp.d + Math.sin(t * 1.6 + s.seed + (right ? 0 : 2)) * 0.6);
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
  tree(x0, lanes, T, keep = []) {
    const L = rand(50, 105), R = rand(70, 140), tx = x0 + L, x1 = tx + R, seed = rand(100);
    let broken = -1;
    if (lanes.length >= 2 && Math.random() < 0.38) {
      const cands = lanes.filter((l) => !keep.includes(l) && (lanes.includes(l - 1) || lanes.includes(l + 1)));
      if (cands.length) broken = pick(cands);
    }
    const pal = randomPal();
    this.trees.push({ tx, w: (rand(12, 18) | 0), x0, x1, pal, seed, canopy: makeCanopy(Math.round(L + R + 50), 96, pal), trunk: null, tuft: makeTuft(pal) });
    const tr = this.trees[this.trees.length - 1];
    tr.trunk = makeTrunk(tr.w, 240);
    for (const lane of lanes) {
      const brk = lane === broken;
      const s = { kind: 'branch', lane, x0, x1: brk ? tx + rand(14, 32) : x1, x1full: x1, tx, L: spring(), R: spring(), seed, broken: brk, tree: tr, tufts: [] };
      for (let x = s.x0 + 8; x < s.x1 - 6; x += rand(18, 44)) if (Math.abs(x - tx) > 10) s.tufts.push({ x, up: Math.random() < 0.6 });
      this.segs.push(s);
      this.populate(s, T, 'tree', lanes);
    }
    return { x0, x1, lanes, full: lanes.filter((l) => l !== broken) };
  }

  wires(x0, lanes, n, obstacles = true, T) {
    const sp = rand(150, 190), x1 = x0 + n * sp;
    for (let i = 0; i <= n; i++) this.poles.push({ x: x0 + i * sp, lanes });
    for (const lane of lanes) {
      const s = { kind: 'wire', lane, x0, x1, sp, spans: Array.from({ length: n }, spring) };
      this.segs.push(s);
      if (obstacles) this.populate(s, T, 'wire', lanes);
    }
    return { x0, x1, lanes, full: lanes };
  }

  // `clear` keeps the stretch where you land after the previous structure free of obstacles.
  populate(s, T, kind, lanes) {
    const d = T.d;
    for (let x = Math.max(s.x0 + 75, this.clear || -1e9); x < s.x1 - 45; x += rand(85, 150) * lerp(1.25, 0.85, d)) {
      if (Math.random() > lerp(0.32, 0.62, d)) continue;
      const canHang = kind === 'tree' && (s.lane === 0 || lanes.includes(s.lane - 1));
      const opts = kind === 'tree' ? ['sq', 'sq', 'crow', 'nest', 'nest', 'bird', 'bird'] : ['sq', 'sq', 'crow', 'crow', 'bird', 'bird'];
      if (canHang) opts.push('fruit', 'fruit', 'fruit');
      const type = pick(opts);
      const e = { type, lane: s.lane, seg: s, x, y: LANE_Y[s.lane], ph: rand(10), hop: 0, caw: 0, timer: rand(1, 4) };
      if (type === 'fruit') {
        const f = pick(FRUITS);
        e.col = f.col;
        e.juice = f.juice;
        e.top = s.lane === 0 ? 72 : LANE_Y[s.lane - 1] + 3;
        e.y = LANE_Y[s.lane] - 14;
        e.sw = 0;
        e.swv = 0;
      }
      if (type === 'bird') e.y = LANE_Y[s.lane] - 10;
      this.ents.push(e);
      if (type === 'bird') x += 40; // birds drift toward you, give them room
    }
  }

  // ---------- generation ----------
  next(T) {
    const C = this.cur, d = T.d;
    let rel = Math.random();
    rel = rel < 0.3 ? 'overlap' : rel < 0.72 ? 'jump' : 'glide';
    if (rel === 'overlap' && C.lanes.length === 3) rel = 'jump';
    const kind = Math.random() < 0.6 ? 'tree' : 'wires';
    const r = Math.random();
    let lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, r < 0.35 ? 1 : r < 0.82 ? 2 : 3);
    if (kind === 'wires' && lanes.length === 3) lanes.pop();
    const low = Math.max(...C.full);
    if (rel === 'overlap') {
      // a different set of tracks that you have to hop up or drop down to
      // (every lane of C must be able to reach it: one lane up, or anything below)
      lanes = [0, 1, 2].filter((l) => !C.lanes.includes(l));
      if (!lanes.length || !C.full.every((l) => lanes.some((n) => n === l - 1 || n > l))) { rel = 'jump'; lanes = [low]; }
    } else if (!lanes.some((n) => n >= low)) lanes.push(low);
    lanes = [...new Set(lanes)].sort();
    const gap = rel === 'overlap' ? -rand(70, 120) : rel === 'jump' ? rand(24, 54) : rand(110, lerp(170, 205, d));
    const x0 = C.x1 + gap;
    this.clear = C.x1 + 70;
    const keep = rel === 'overlap' ? lanes : [low];
    this.cur = kind === 'tree' ? this.tree(x0, lanes, T, keep) : this.wires(x0, lanes, 1 + ((Math.random() * 3) | 0), true, T);
  }

  generate(camX, T) {
    while (this.cur.x1 < camX + 900) this.next(T);
    const cut = camX - 220;
    this.segs = this.segs.filter((s) => s.x1 > cut);
    this.trees = this.trees.filter((t) => t.x1 + 60 > cut);
    this.poles = this.poles.filter((p) => p.x > cut);
    this.ents = this.ents.filter((e) => !e.gone && e.x > cut);
  }
}
