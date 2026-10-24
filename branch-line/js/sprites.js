// Character sprites, painted pixel by pixel every frame. (x, y) is the point between the feet.
// Mammals are built on a little skeleton (hip, mid-back, chest, head, legs, tail) so each pose
// is just a set of joint positions.
import { px, ellipse, poly, thick, mix } from './art.js';

// ---------- the four-legged skeleton renderer (draws facing right) ----------
function limb(c, pts, col, w) {
  for (let i = 0; i + 1 < pts.length; i++) thick(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, col);
  const f = pts[pts.length - 1];
  px(c, f[0], f[1], 2, 1, mix(col, '#000000', 0.35));
}
function rodent(c, x, y, P, C) {
  const T = (p) => [x + p[0], y + p[1]];
  const far = mix(C.limb, '#000000', 0.3);
  if (P.hindFar) limb(c, P.hindFar.map(T), far, 1.6);
  if (P.foreFar) limb(c, P.foreFar.map(T), far, 1.4);
  // tail: fringe, shadow, fur, highlight
  if (P.tail) {
    for (const t of P.tail) if (C.fringe) ellipse(c, x + t[0], y + t[1], t[2] + 0.9, t[2] + 0.7, C.fringe);
    for (const t of P.tail) ellipse(c, x + t[0], y + t[1] + 0.6, t[2], t[2] * 0.85, C.tailDark);
    P.tail.forEach((t, i) => ellipse(c, x + t[0], y + t[1], t[2] - 0.5, (t[2] - 0.5) * 0.8, i >= P.tail.length - 1 && C.tailTip ? C.tailTip : C.tail));
    for (const t of P.tail) px(c, x + t[0] - 1, y + t[1] - Math.round(t[2] * 0.7), 2, 1, C.tailLight);
  }
  // body: belly colour shows along the bottom, back on top, then a lit ridge
  const parts = [[P.hip, P.br[0]], [P.mid, P.br[1]], [P.cho, P.br[2]]];
  for (const [p, r] of parts) ellipse(c, x + p[0], y + p[1], r[0], r[1], C.belly);
  for (const [p, r] of parts) ellipse(c, x + p[0], y + p[1] - 1, r[0], r[1] - 1, C.back);
  if (C.side) for (const [p, r] of parts) ellipse(c, x + p[0], y + p[1] - 0.5, r[0] - 0.5, Math.max(0, r[1] - 2), C.side);
  for (const [p, r] of parts) ellipse(c, x + p[0], y + p[1] - r[1] + 1, r[0] - 1, 0, C.light);
  if (C.stripes) { // chipmunk: dark / pale / dark stripes along the flank
    const a = T(P.hip), b = T(P.cho);
    thick(c, a[0], a[1] - 2, b[0], b[1] - 2, 1, C.stripes[0]);
    thick(c, a[0], a[1] - 1, b[0], b[1] - 1, 1, C.stripes[1]);
    thick(c, a[0], a[1], b[0] - 1, b[1], 1, C.stripes[0]);
  }
  if (P.fold) { const a = T(P.fold[0]), b = T(P.fold[1]); thick(c, a[0], a[1], b[0], b[1], 1, C.edge); } // gliding membrane, folded
  if (P.hind) limb(c, P.hind.map(T), C.limb, 2);
  if (P.fore) limb(c, P.fore.map(T), C.limb, 1.6);
  // head
  const h = T(P.head), r = P.hr;
  ellipse(c, h[0], h[1], r * 1.1, r, C.back);
  ellipse(c, h[0] + r * 0.8, h[1] + 0.5, r * 0.75, r * 0.6, C.back); // muzzle
  ellipse(c, h[0] + 0.5, h[1] + r * 0.55, r * 0.8, r * 0.4, C.belly); // cheek and throat
  ellipse(c, h[0] - 0.5, h[1] - r + 1, r * 0.8, 0, C.light);
  if (C.mask) px(c, h[0] - 1, h[1] - 1, 4, 1, C.mask);
  const ex = h[0] + Math.round(r * 0.35), ey = h[1] - Math.round(r * 0.3);
  if (C.ring) px(c, ex - 1, ey - 1, 4, 4, C.ring);
  px(c, ex, ey, 2, 2, '#0b0806');
  px(c, ex + 1, ey, 1, 1, '#ffffff');
  px(c, h[0] + r * 1.55, h[1] + (P.mouth ? 0 : 0.5), 1, 1, C.nose);
  if (P.mouth) px(c, h[0] + r * 1.2, h[1] + 2, 2, 1, '#2a1410');
  const ea = [h[0] - r * 0.35, h[1] - r - 1];
  px(c, ea[0], ea[1], 2, 2, C.ear);
  if (C.tufts) px(c, ea[0], ea[1] - 2, 1, 2, C.tufts);
}

// ---------- the flying squirrel ----------
// Southern flying squirrel (Michigan's Lower Peninsula): warm grey-brown, cream belly, huge
// dark eyes, a flat feathery tail about four-fifths of its body length.
const FS = {
  back: '#8a7862', light: '#b4a288', side: null, belly: '#f1e8d6', limb: '#6f5f4e', edge: '#3e3128',
  ear: '#a28c74', nose: '#5a3a33', ring: '#3b2e26', tail: '#7a6a58', tailDark: '#54473a', tailLight: '#a8977f', tailTip: '#4e4236', fringe: null,
};
const BR = [[4, 3.4], [4, 3.2], [3.4, 3]];
// The bound: squirrels on branches run in bounds and half-bounds. Forefeet land, the hind feet
// swing past them and plant ahead, the back arches, then everything stretches out again.
// The tail streams behind and rises into an S as the body gathers, counterbalancing each landing.
const RUN = [
  { // 0: stretched out, airborne
    hip: [-6, -6], mid: [-1.5, -6.5], cho: [3, -6.5], head: [8, -8.5],
    hind: [[-6, -5], [-9, -4], [-13, -3]], hindFar: [[-6, -5], [-8, -3], [-12, -2]],
    fore: [[3, -5], [7, -4], [10, -3]], foreFar: [[3, -5], [6, -3], [9, -2]],
    tail: [[-10, -7, 2], [-13.5, -8, 2.2], [-17, -9, 2.2], [-20.5, -10, 2], [-23.5, -11, 1.6]],
  },
  { // 1: forefeet land, rump still high
    hip: [-5, -8], mid: [-1, -7.5], cho: [2.5, -5.5], head: [7, -7],
    fore: [[2.5, -4], [4, -2], [5, 0]], foreFar: [[2.5, -4], [3, -2], [3.5, 0]],
    hind: [[-5, -7], [-8, -6], [-11, -6]], hindFar: [[-5, -7], [-7.5, -5], [-10, -5]],
    tail: [[-9, -9, 2], [-12, -11, 2.2], [-14.5, -13.5, 2.2], [-16.5, -16, 2], [-17.5, -18.5, 1.6]],
  },
  { // 2: gathered, back arched, hind feet swinging past the fore
    hip: [-2, -8], mid: [0, -9.5], cho: [2.5, -6.5], head: [6.5, -7.5],
    fore: [[2.5, -5], [3, -2], [3, 0]], foreFar: [[2.5, -5], [2, -2], [1.5, 0]],
    hind: [[-2, -7], [1, -3], [5, 0]], hindFar: [[-2, -7], [0, -3], [3, 0]],
    tail: [[-6, -10, 2], [-9, -12.5, 2.2], [-10.5, -16, 2.2], [-10, -19.5, 2], [-8, -22, 1.6]],
  },
  { // 3: hind feet planted ahead, front end lifting
    hip: [-3, -7], mid: [1, -8], cho: [5, -7.5], head: [9.5, -9.5],
    hind: [[-3, -6], [-1, -3], [1, 0]], hindFar: [[-3, -6], [-2, -3], [-0.5, 0]],
    fore: [[5, -6], [8, -6], [11, -5]], foreFar: [[5, -6], [7, -5], [10, -4]],
    tail: [[-7, -9, 2], [-10.5, -11, 2.2], [-14, -12.5, 2.2], [-17.5, -13.5, 2], [-20.5, -14, 1.6]],
  },
  { // 4: push-off, hind legs driving back
    hip: [-5, -6], mid: [0, -7], cho: [5, -7.5], head: [10, -9.5],
    hind: [[-5, -5], [-7, -3], [-9, 0]], hindFar: [[-5, -5], [-6, -2], [-8, 0]],
    fore: [[5, -6], [9, -7], [12, -6]], foreFar: [[5, -6], [8, -6], [11, -5]],
    tail: [[-9, -8, 2], [-12.5, -9, 2.2], [-16, -10, 2.2], [-19.5, -10.5, 2], [-22.5, -11, 1.6]],
  },
  { // 5: airborne again, legs tucking
    hip: [-6, -7], mid: [-1.5, -7.5], cho: [3, -7.5], head: [8, -9.5],
    hind: [[-6, -6], [-9, -5], [-12, -5]], hindFar: [[-6, -6], [-8, -4], [-11, -4]],
    fore: [[3, -6], [6, -5], [9, -5]], foreFar: [[3, -6], [5, -4], [8, -4]],
    tail: [[-10, -8, 2], [-13.5, -9, 2.2], [-17, -10, 2.2], [-20.5, -11, 2], [-23.5, -12, 1.6]],
  },
];
for (const f of RUN) { f.br = BR; f.hr = 3.4; f.fold = [[f.cho[0] - 1, f.cho[1] + 2], [f.hip[0] + 1, f.hip[1] + 2]]; }
export const RUN_FRAMES = RUN.length;

const JUMP = {
  ...RUN[0], hip: [-6, -7], mid: [-1.5, -7.5], cho: [3, -8], head: [8.5, -10],
  fore: [[3, -7], [7, -8], [10, -8]], hind: [[-6, -6], [-10, -5], [-14, -5]],
  tail: [[-10, -8, 2], [-14, -8.5, 2.2], [-18, -9, 2.2], [-22, -9.5, 2], [-25.5, -10, 1.6]], // straight back: a rudder
};
const SLIDE = {
  hip: [-6, -3], mid: [-1, -3], cho: [4, -3], head: [9, -4.5], br: [[4, 2.6], [4, 2.4], [3.4, 2.3]], hr: 3.2,
  fore: [[4, -2], [8, -1], [12, -1]], foreFar: [[4, -2], [7, -1], [11, 0]],
  hind: [[-6, -2], [-10, -1], [-14, -1]], hindFar: [[-6, -2], [-9, -1], [-13, 0]],
  tail: [[-10, -4, 1.8], [-14, -4, 1.9], [-18, -4.5, 1.9], [-22, -5, 1.7], [-25, -5.5, 1.4]],
  fold: [[3, -1], [-5, -1]],
};
const BUTT = { ...RUN[4], cho: [6, -6.5], head: [11.5, -6.5], fore: [[6, -5], [9, -4], [11, -2]] };

function glide(c, x, y, ph) {
  const b = Math.round(Math.sin(ph * 0.4));
  for (let i = 0; i < 5; i++) ellipse(c, x - 16 - i * 3, y - 8 + b, 2, 1.3, i === 4 ? FS.tailTip : FS.tail);
  px(c, x - 27, y - 9 + b, 12, 1, FS.tailLight);
  // the membrane, seen a little from above: a wide sail cambered between wrists and ankles
  poly(c, [[x - 13, y - 11], [x + 11, y - 12], [x + 13, y - 7], [x + 8, y - 5], [x - 8, y - 5], [x - 14, y - 7]], FS.back);
  poly(c, [[x - 11, y - 11], [x + 9, y - 12], [x + 10, y - 10], [x - 11, y - 9]], FS.light);
  px(c, x - 8, y - 9, 14, 1, mix(FS.back, FS.light, 0.5)); // spine
  px(c, x - 13, y - 6, 26, 1, FS.edge);
  poly(c, [[x - 9, y - 5], [x + 9, y - 5], [x + 6, y - 3], [x - 6, y - 3]], FS.belly); // cream underside peeks out
  for (const [dx, dy] of [[-16, -8], [-15, -6], [12, -12], [13, -9]]) px(c, x + dx, y + dy, 3, 1, FS.limb); // splayed paws
  rodent(c, x, y, { head: [15, -10], hr: 3.6, br: [[0, 0], [0, 0], [0, 0]], hip: [0, -8], mid: [0, -8], cho: [0, -8] }, FS);
}

// Barrel-rolling swan dive: back, edge, belly, edge, round and round.
function spin(c, x, y, f) {
  const k = f & 3, wide = k === 0 || k === 2, col = k === 2 ? FS.belly : FS.back;
  for (let i = 0; i < 5; i++) ellipse(c, x - 16 - i * 3, y - 7, 1.6, wide ? 1.6 : 0.8, FS.tail);
  if (wide) {
    poly(c, [[x - 13, y - 11], [x + 12, y - 11], [x + 13, y - 3], [x - 13, y - 3]], col);
    px(c, x - 13, y - 11, 26, 1, k === 2 ? '#ffffff' : FS.light);
    px(c, x - 13, y - 4, 26, 1, FS.edge);
    for (const [dx, dy] of [[-14, -11], [12, -11], [-14, -4], [12, -4]]) px(c, x + dx, y + dy, 2, 1, FS.limb);
  } else {
    px(c, x - 13, y - 8, 26, 2, FS.edge);
    px(c, x - 12, y - 8, 24, 1, FS.light);
  }
  ellipse(c, x + 15, y - 7, 3, 3, k === 2 ? FS.belly : FS.back);
  px(c, x + 16, y - 8, 2, 2, '#0b0806');
}

// pose: run | jump | slide | butt | glide | spin
export function drawSquirrel(c, x, y, pose, ph) {
  x = Math.round(x); y = Math.round(y);
  switch (pose) {
    case 'glide': return glide(c, x, y, ph);
    case 'spin': return spin(c, x, y, Math.floor(ph));
    case 'jump': return rodent(c, x, y, JUMP, FS);
    case 'slide': return rodent(c, x, y, SLIDE, FS);
    case 'butt':
      for (let i = 0; i < 3; i++) px(c, x - 24 + i * 2, y - 11 + i * 3, 5, 1, 'rgba(255,255,255,.7)');
      return rodent(c, x, y, BUTT, FS);
    default: return rodent(c, x, y, RUN[((Math.floor(ph) % RUN.length) + RUN.length) % RUN.length], FS);
  }
}

// ---------- Michigan squirrels and chipmunks ----------
export const MAMMALS = {
  gray: { // eastern grey squirrel
    s: 1.2, back: '#7d7a74', light: '#aaa59c', side: '#8c7c68', belly: '#ece6da', limb: '#6a655e', ear: '#8c8780', nose: '#3a3432',
    tail: '#77736c', tailDark: '#55524d', tailLight: '#b8b3aa', fringe: '#d9d4cb', bushy: true,
  },
  black: { // the black phase of the grey squirrel, common in Michigan towns
    s: 1.2, back: '#1f1d1c', light: '#3e3a37', side: null, belly: '#2c2826', limb: '#1a1817', ear: '#2a2624', nose: '#0e0c0b',
    tail: '#211f1d', tailDark: '#121110', tailLight: '#4a4542', fringe: '#5a5450', bushy: true,
  },
  fox: { // eastern fox squirrel: grizzled brown, orange underparts, the biggest
    s: 1.35, back: '#7c6448', light: '#a2845e', side: '#b0703c', belly: '#d9894a', limb: '#8a5a32', ear: '#c07a44', nose: '#2e2018',
    tail: '#9a5e36', tailDark: '#6e4024', tailLight: '#c08050', fringe: '#e0a060', bushy: true,
  },
  red: { // American red squirrel: small, rusty, white belly and eye-ring, a champion chatterer
    s: 0.95, back: '#9a4a24', light: '#c4693a', side: null, belly: '#f2ece2', limb: '#7e3a1c', ear: '#b05a2c', nose: '#3a1a10',
    tail: '#9a4a24', tailDark: '#5e2a14', tailLight: '#c86a3a', fringe: '#d6a070', ring: '#f2ece2', tufts: '#6e3218', bushy: true,
  },
  chip: { // eastern chipmunk: stripes, rusty rump, short upright tail
    s: 0.82, back: '#9a6a42', light: '#b98656', side: '#b0582c', belly: '#f0e6d4', limb: '#7e5434', ear: '#a0724a', nose: '#2a1c14',
    tail: '#7e5434', tailDark: '#4a3020', tailLight: '#a8805a', fringe: null, stripes: ['#2a1c14', '#efe4cf'], mask: '#2a1c14',
  },
};

function mammalPose(sp, pose, f) {
  const s = sp.s;
  const S = (p) => [p[0] * s, p[1] * s];
  const ST = (t) => [t[0] * s, t[1] * s, t[2] * s];
  let P;
  if (pose === 'sit' || pose === 'chatter') {
    const flick = pose === 'chatter' && f & 1 ? -1.5 : 0;
    P = {
      hip: [-3, -4], mid: [-2, -7.5], cho: [-1, -10.5], head: [1, -14 + (pose === 'chatter' && f & 1 ? -0.5 : 0)],
      br: [[3.6, 3.6], [3.2, 3.4], [3, 3]], hr: 3.2,
      hind: [[-3, -3], [-1, -1], [1, 0]], fore: [[0, -9], [2, -8], [3, -9]],
      tail: sp.bushy
        ? [[-6, -4, 2.4], [-8, -8 + flick, 2.8], [-8, -12 + flick, 3], [-6.5, -16 + flick, 3], [-4, -19 + flick, 2.4]]
        : [[-5, -4, 1.4], [-7, -7 + flick, 1.4], [-8.5, -10 + flick, 1.4], [-9.5, -13 + flick, 1.3]],
      mouth: pose === 'chatter' && f & 1,
    };
  } else { // walking, four frames, diagonal pairs moving together
    const a = [2, 0, -2, 0][f & 3], lift = [0, 1, 0, 1][f & 3];
    P = {
      hip: [-5, -6], mid: [-1, -6.5], cho: [3, -6.5], head: [7.5, pose === 'peek' ? -10 : -8.5],
      br: [[4, 3.4], [3.8, 3.2], [3.3, 3]], hr: 3.2,
      fore: [[3, -5], [4 + a, -2], [4 + a, -lift]], foreFar: [[3, -5], [3 - a, -2], [3 - a, lift - 1]],
      hind: [[-5, -5], [-6 - a, -2], [-6 - a, -1 + lift]], hindFar: [[-5, -5], [-5 + a, -2], [-5 + a, -lift]],
      tail: sp.bushy
        ? [[-9, -7, 2.4], [-12, -10, 2.8], [-13, -14, 3], [-11.5, -18, 3], [-8.5, -20.5, 2.4]] // carried in an S over the back
        : [[-8, -7, 1.4], [-10.5, -9.5, 1.4], [-12.5, -12, 1.4], [-14, -14.5, 1.3]],
    };
  }
  P.hip = S(P.hip); P.mid = S(P.mid); P.cho = S(P.cho); P.head = S(P.head); P.hr *= s;
  P.br = P.br.map((r) => [r[0] * s, r[1] * s]);
  for (const k of ['fore', 'foreFar', 'hind', 'hindFar']) if (P[k]) P[k] = P[k].map(S);
  P.tail = P.tail.map(ST);
  return P;
}

// ---------- Michigan birds ----------
function crow(c, x, y, e, t) {
  const peck = e.pose === 'peck', caw = e.pose === 'caw', step = e.pose === 'walk' ? Math.floor(e.ph) & 1 : 0;
  const B = '#1b1c22', S = '#3a4560', D = '#101116';
  px(c, x - 2 + step, y - 5, 1, 5, '#2a2a2a'); px(c, x + 1 - step, y - 5, 1, 5, '#2a2a2a');
  px(c, x - 3 + step, y, 3, 1, '#2a2a2a'); px(c, x, y, 3, 1, '#2a2a2a');
  poly(c, [[x - 6, y - 12], [x - 15, y - 9], [x - 15, y - 7], [x - 5, y - 8]], D); // tail
  ellipse(c, x, y - 10, 7, 5, B);
  ellipse(c, x - 1, y - 12, 5, 2, S);
  ellipse(c, x - 2, y - 9, 5, 2, D);
  const hx = x + (peck ? 7 : 5), hy = y - (peck ? 9 : 16);
  ellipse(c, hx, hy, 3, 3, B);
  px(c, hx - 1, hy - 3, 3, 1, S);
  px(c, hx + 1, hy - 1, 1, 1, '#0a0a0a'); px(c, hx + 1, hy - 2, 1, 1, '#c8c0a0');
  poly(c, [[hx + 2, hy - 1], [hx + 7, hy], [hx + 2, hy + 1]], '#2f2f33');
  if (caw) poly(c, [[hx + 2, hy + 1], [hx + 6, hy + 3], [hx + 2, hy + 2]], '#2f2f33');
}
function robin(c, x, y, e) { // American robin, Michigan's state bird
  const peck = e.pose === 'peck', step = e.pose === 'walk' ? Math.floor(e.ph) & 1 : 0;
  px(c, x - 1 + step, y - 4, 1, 4, '#8a6a4a'); px(c, x + 1 - step, y - 4, 1, 4, '#8a6a4a');
  poly(c, [[x - 4, y - 9], [x - 11, y - 7], [x - 11, y - 6], [x - 3, y - 6]], '#2e2a28');
  ellipse(c, x, y - 7, 5, 3.5, '#5a524a');
  ellipse(c, x + 1, y - 6, 4, 2.5, '#d2602a');
  ellipse(c, x + 1, y - 5, 3, 1.5, '#a8481e');
  px(c, x - 3, y - 4, 3, 1, '#f0eee8');
  const hx = x + (peck ? 6 : 4), hy = y - (peck ? 6 : 11);
  ellipse(c, hx, hy, 2.5, 2.5, '#2e2a28');
  px(c, hx, hy - 1, 1, 1, '#000000'); px(c, hx - 1, hy - 2, 1, 1, '#f0eee8'); px(c, hx - 1, hy, 1, 1, '#f0eee8');
  px(c, hx + 2, hy, 3, 1, '#e2b030');
}
function dove(c, x, y, e) { // mourning dove
  const peck = e.pose === 'peck', step = e.pose === 'walk' ? Math.floor(e.ph) & 1 : 0;
  px(c, x - 1 + step, y - 3, 1, 3, '#c07a7a'); px(c, x + 1 - step, y - 3, 1, 3, '#c07a7a');
  poly(c, [[x - 4, y - 7], [x - 15, y - 6], [x - 15, y - 5], [x - 4, y - 5]], '#8a7a66');
  px(c, x - 15, y - 6, 2, 1, '#f0ece4');
  ellipse(c, x, y - 6, 5.5, 3.2, '#b8a48c');
  ellipse(c, x + 1, y - 5, 3.5, 2, '#c8a090');
  ellipse(c, x - 2, y - 7, 3.5, 1.5, '#9c9aa4');
  px(c, x - 3, y - 7, 1, 1, '#1a1a1a'); px(c, x, y - 8, 1, 1, '#1a1a1a');
  const hx = x + (peck ? 6 : 5), hy = y - (peck ? 5 : 10);
  ellipse(c, hx, hy, 2, 2, '#ae9e8e');
  px(c, hx, hy - 1, 1, 1, '#000000'); px(c, hx + 2, hy, 2, 1, '#3a3a3a');
}
// flying birds face right here; they fly toward the squirrel so they're drawn flipped
function flyer(c, x, y, e, t) {
  const up = Math.sin(t * 22 + e.ph) > 0;
  if (e.kind === 'jay') { // blue jay
    px(c, x - 8, y - 1, 5, 1, '#2e58b8'); px(c, x - 9, y - 1, 1, 1, '#ffffff');
    ellipse(c, x, y, 4, 2, '#3d6fd6'); ellipse(c, x, y + 1, 3, 1, '#e8eef5');
    ellipse(c, x + 4, y - 1, 2, 2, '#3d6fd6'); px(c, x + 2, y - 4, 2, 2, '#3d6fd6');
    px(c, x + 3, y + 1, 2, 1, '#1a1a24'); px(c, x + 5, y - 2, 1, 1, '#000000'); px(c, x + 6, y - 1, 2, 1, '#2b2b2b');
    if (up) { px(c, x - 3, y - 5, 5, 3, '#2e58b8'); px(c, x, y - 4, 1, 1, '#ffffff'); px(c, x - 2, y - 5, 1, 2, '#1a1a24'); }
    else { px(c, x - 3, y + 1, 5, 3, '#2e58b8'); px(c, x - 2, y + 2, 1, 2, '#1a1a24'); }
  } else if (e.kind === 'chick') { // black-capped chickadee
    px(c, x - 6, y - 1, 3, 1, '#6e7276');
    ellipse(c, x, y, 3, 2, '#8a8e92'); ellipse(c, x, y + 1, 2, 1, '#d8c09a');
    ellipse(c, x + 3, y - 1, 2, 2, '#f2f0ea'); px(c, x + 2, y - 3, 4, 1, '#111111'); px(c, x + 3, y, 2, 1, '#111111');
    px(c, x + 4, y - 2, 1, 1, '#000000'); px(c, x + 5, y - 1, 1, 1, '#333333');
    if (up) px(c, x - 2, y - 4, 4, 2, '#7a7e82'); else px(c, x - 2, y + 1, 4, 2, '#7a7e82');
  } else { // northern cardinal
    px(c, x - 8, y - 1, 5, 1, '#9a1a20');
    ellipse(c, x, y, 4, 2, '#c8202a'); ellipse(c, x, y + 1, 3, 1, '#d8343c');
    ellipse(c, x + 4, y - 1, 2, 2, '#c8202a'); px(c, x + 2, y - 4, 2, 2, '#c8202a'); px(c, x + 3, y - 5, 1, 1, '#c8202a');
    px(c, x + 4, y - 1, 2, 2, '#1a1010'); px(c, x + 6, y - 1, 2, 1, '#e06a2a');
    if (up) px(c, x - 3, y - 5, 5, 3, '#a81c24'); else px(c, x - 3, y + 1, 5, 3, '#a81c24');
  }
}

export function drawCreature(c, e, t) {
  const x = Math.round(e.x), y = Math.round(e.y), dir = e.dir || -1;
  c.save();
  c.translate(x, 0);
  c.scale(dir, 1);
  const sp = MAMMALS[e.type];
  if (sp) rodent(c, 0, y, mammalPose(sp, e.pose || 'walk', Math.floor(e.ph || 0)), sp);
  else if (e.type === 'crow') crow(c, 0, y, e, t);
  else if (e.type === 'robin') robin(c, 0, y, e, t);
  else if (e.type === 'dove') dove(c, 0, y, e, t);
  else if (e.type === 'bird') flyer(c, 0, y, e, t);
  c.restore();
  if (e.pose === 'chatter' && Math.floor(e.ph) & 1 && !e.dead) { // little chatter marks
    const hx = x + dir * 6 * (sp ? sp.s : 1), hy = y - 16 * (sp ? sp.s : 1);
    px(c, hx + dir * 3, hy - 2, 1, 2, '#ffffff'); px(c, hx + dir * 5, hy - 1, 1, 2, '#ffffff');
  }
}

export function drawAcorn(c, x, y, full) {
  if (!full) {
    ellipse(c, x + 4, y + 7, 3, 4, 'rgba(40,30,20,.45)');
    ellipse(c, x + 4, y + 3, 4, 2, 'rgba(40,30,20,.45)');
    return;
  }
  ellipse(c, x + 4, y + 7, 3, 4, '#a8682a');
  ellipse(c, x + 3, y + 6, 2, 3, '#cf8a3e');
  px(c, x + 2, y + 5, 1, 2, '#f0c080');
  px(c, x + 4, y + 11, 1, 1, '#6e4018');
  ellipse(c, x + 4, y + 3, 4, 2, '#6e4a26');
  for (let i = 0; i < 4; i++) px(c, x + 1 + i * 2, y + 2 + (i & 1), 1, 1, '#4a3018');
  px(c, x + 4, y, 1, 2, '#4a3018');
}

// ---------- the golden eagle ----------
// Built from a handful of pose parameters so each animation frame is a set of numbers:
//   pitch (rad, + = nose up), wing (rad: 0 points straight back, + up, - down; past -PI/2 sweeps
//   forward), fold (0 spread .. 1 tucked), legs (0 tucked, .5 hanging, 1 thrust forward),
//   talon (0 clenched .. 1 open), fan (tail spread 0..1), tailDown (rad).
const E = {
  dark: '#24180f', brown: '#3e2a1a', mid: '#573b24', light: '#734e30', covert: '#8a6236',
  gold: '#c9963e', goldLight: '#e3b85e', beak: '#3c3a3a', beakTip: '#1a1818', cere: '#e6c040', foot: '#e8c23a', talon: '#141010', band: '#6a5848',
};
export const EAGLE = E;

export function eagleFrame(state, i) {
  if (state === 'hover') { // wind-hovering: body pitched up, tail fanned and pressed down, deep strokes
    const ph = (i / 8) * Math.PI * 2;
    return {
      pitch: 0.6 + Math.sin(ph) * 0.06, wing: Math.cos(ph) * 1.75 + (Math.sin(ph) > 0 ? -0.35 : 0.25),
      fold: Math.sin(ph) < 0 ? 0.45 * -Math.sin(ph) : 0.05, legs: 0.45 + Math.sin(ph) * 0.05, talon: 0.35, fan: 1, tailDown: 0.55, bob: -Math.sin(ph) * 2,
    };
  }
  if (state === 'shift') { // weight forward: head down and locked on, wings half-closed, legs tucked
    const u = i / 7, ease = u * u * (3 - 2 * u);
    return {
      pitch: 0.6 - ease * 0.85, wing: 1.2 - ease * 0.6, fold: 0.1 + ease * 0.65, legs: 0.45 - ease * 0.4, talon: 0.3 - ease * 0.3,
      fan: 1 - ease * 0.75, tailDown: 0.55 - ease * 0.5, bob: ease * 4, gaze: ease,
    };
  }
  if (state === 'attack') { // low fast glide, then wings open, tail fans, feet thrown forward
    return [
      { pitch: -0.28, wing: 0.55, fold: 0.85, legs: 0, talon: 0, fan: 0.15, tailDown: 0, gaze: 1, streak: 1 },
      { pitch: -0.24, wing: 0.5, fold: 0.9, legs: 0.05, talon: 0, fan: 0.15, tailDown: 0, gaze: 1, streak: 1 },
      { pitch: 0.05, wing: 1.1, fold: 0.45, legs: 0.75, talon: 0.6, fan: 0.6, tailDown: 0.2, gaze: 1 },
      { pitch: 0.35, wing: 1.55, fold: 0.1, legs: 1, talon: 1, fan: 1, tailDown: 0.45, gaze: 1 },
    ][i];
  }
  if (state === 'grab') return { pitch: 0.35, wing: 1.4 - i * 0.3, fold: 0.15, legs: 1, talon: Math.max(0, 1 - i * 0.5), fan: 1, tailDown: 0.45, gaze: 1 };
  if (state === 'tumble') return { pitch: i, wing: 1.6 + Math.sin(i * 3) * 0.8, fold: 0.3, legs: 0.6, talon: 0.2, fan: 0.6, tailDown: 0.3 };
  return eagleFrame('hover', i);
}

export function drawEagle(c, x, y, P, dir = -1, flash = false) {
  const a = -P.pitch, ca = Math.cos(a), sa = Math.sin(a);
  const by = y + (P.bob || 0);
  const T = (p) => [x + dir * (p[0] * ca - p[1] * sa), by + p[0] * sa + p[1] * ca];
  const TP = (pts) => pts.map(T);
  const col = (k) => (flash ? '#ffffff' : E[k]);
  const dirv = (th) => [-Math.cos(th), -Math.sin(th)];

  const wing = (ox, oy, shade) => {
    const S = [2 + ox, -5 + oy], th = P.wing, f = P.fold;
    // mid-stroke the wing points at the viewer, so it foreshortens into a broad short shape
    const proj = 0.42 + 0.58 * Math.abs(Math.sin(th));
    const L1 = 17 * (1 - 0.4 * f) * proj, L2 = 23 * (1 - 0.65 * f) * proj;
    const bend = (th >= 0 ? -1 : 1) * f * 1.1;
    const d1 = dirv(th), d2 = dirv(th + bend);
    const Wr = [S[0] + d1[0] * L1, S[1] + d1[1] * L1], Tp = [Wr[0] + d2[0] * L2, Wr[1] + d2[1] * L2];
    const tv = [-0.95, 0.3]; // trailing edge always toward the tail
    const cb = 13, cm = 15 * (1 - 0.3 * f) * (1.25 - proj * 0.25), ct = 6;
    const add = (p, k) => [p[0] + tv[0] * k, p[1] + tv[1] * k];
    const tone = (k) => (shade ? mix(col(k), '#000000', 0.3) : col(k));
    poly(c, TP([S, Wr, Tp, add(Tp, ct), add(Wr, cm), add(S, cb)]), tone('dark'));
    for (let k = 0; k < 5; k++) { // primaries spread like fingers
      const base = [Tp[0] + tv[0] * ct * (k / 4) * 1.6, Tp[1] + tv[1] * ct * (k / 4) * 1.6];
      const fd = dirv(th + bend + (k - 1.5) * 0.14 * (1 - f));
      const len = 7 * (1 - 0.55 * f);
      const tip = [base[0] + fd[0] * len, base[1] + fd[1] * len];
      const q = TP([base, tip]);
      thick(c, q[0][0], q[0][1], q[1][0], q[1][1], 1.6, tone('dark'));
    }
    poly(c, TP([S, Wr, add(Wr, cm * 0.45), add(S, cb * 0.5)]), tone('mid'));
    const le = TP([S, Wr]);
    thick(c, le[0][0], le[0][1], le[1][0], le[1][1], 1.5, tone('covert'));
    const sec = TP([add(S, cb), add(Wr, cm)]); // trailing edge of the secondaries
    thick(c, sec[0][0], sec[0][1], sec[1][0], sec[1][1], 1, tone('brown'));
  };
  const leg = (ox, oy, shade) => {
    const L = P.legs, Hp = [1 + ox, 5 + oy];
    const tuck = [-6, 7], hang = [2, 18], fwd = [16, 15];
    const F = L < 0.5 ? [tuck[0] + (hang[0] - tuck[0]) * L * 2, tuck[1] + (hang[1] - tuck[1]) * L * 2]
      : [hang[0] + (fwd[0] - hang[0]) * (L - 0.5) * 2, hang[1] + (fwd[1] - hang[1]) * (L - 0.5) * 2];
    const Fo = [F[0] + ox, F[1] + oy];
    const q = TP([Hp, Fo]), tone = (k) => (shade ? mix(col(k), '#000000', 0.3) : col(k));
    thick(c, q[0][0], q[0][1], q[1][0], q[1][1], 5, tone('brown')); // golden eagles are feathered to the toes
    thick(c, q[0][0], q[0][1] - 1, q[1][0], q[1][1] - 1, 2, tone('mid'));
    if (L < 0.15) return;
    const ang = Math.atan2(Fo[1] - Hp[1], Fo[0] - Hp[0]), open = P.talon;
    const toes = open > 0.3 ? [-0.7, 0, 0.7].map((d) => ang + d * open) : [ang - 0.3, ang + 0.2];
    for (const t of toes) {
      const len = 3 + open * 3, e2 = [Fo[0] + Math.cos(t) * len, Fo[1] + Math.sin(t) * len];
      const z = TP([Fo, e2]);
      thick(c, z[0][0], z[0][1], z[1][0], z[1][1], 1.4, tone('foot'));
      px(c, z[1][0], z[1][1], 1, 2, tone('talon'));
    }
    const back = ang + Math.PI * 0.85, hb = [Fo[0] + Math.cos(back) * (2 + open * 2), Fo[1] + Math.sin(back) * (2 + open * 2)];
    const z = TP([Fo, hb]);
    thick(c, z[0][0], z[0][1], z[1][0], z[1][1], 1.4, tone('foot'));
    px(c, z[1][0], z[1][1], 1, 1, tone('talon'));
  };

  // far wing and leg sit behind the body
  wing(-3, -2, true);
  leg(-2, -1, true);
  // tail: fanned and pressed down when hovering, closed in the dive
  const tl = 17, hw = 2.5 + 6 * P.fan, td = P.tailDown;
  const tip = [-14 - Math.cos(td) * tl, Math.sin(td) * tl], perp = [Math.sin(td), Math.cos(td)];
  poly(c, TP([[-12, -2.5], [-12, 2.5], [tip[0] + perp[0] * hw, tip[1] + perp[1] * hw], [tip[0] - perp[0] * hw, tip[1] - perp[1] * hw]]), col('brown'));
  for (const k of [0.45, 0.75]) {
    const m = [-12 + (tip[0] + 12) * k, tip[1] * k], w2 = 2.5 + (hw - 2.5) * k;
    const z = TP([[m[0] + perp[0] * w2, m[1] + perp[1] * w2], [m[0] - perp[0] * w2, m[1] - perp[1] * w2]]);
    thick(c, z[0][0], z[0][1], z[1][0], z[1][1], 1, col('band'));
  }
  // body
  const oval = (cx, cy, rx, ry) => Array.from({ length: 18 }, (_, k) => [cx + Math.cos((k / 18) * Math.PI * 2) * rx, cy + Math.sin((k / 18) * Math.PI * 2) * ry]);
  poly(c, TP(oval(0, 0.5, 16, 7.5)), col('dark'));
  poly(c, TP(oval(0, -0.5, 15, 6.5)), col('brown'));
  poly(c, TP(oval(-1, -3.5, 10, 2.2)), col('mid'));
  leg(0, 0, false);
  wing(0, 0, false);
  // head: steadied against the body's pitch, so the eyes stay locked on the target
  const N = [11, -4], hp = (P.gaze || 0) * 0.5;
  const hr = (p) => { const dx = p[0] - N[0], dy = p[1] - N[1], c2 = Math.cos(hp * P.pitch), s2 = Math.sin(hp * P.pitch); return [N[0] + dx * c2 - dy * s2, N[1] + dx * s2 + dy * c2]; };
  const HP = (pts) => TP(pts.map(hr));
  poly(c, HP(oval(15, -6, 5.5, 5)), col('brown'));
  poly(c, HP([[8, -6], [11, -11.5], [16, -11.5], [15, -7], [10, -3]]), col('gold')); // golden nape
  poly(c, HP([[11, -10.5], [14, -11.5], [13, -9]]), col('goldLight'));
  poly(c, HP([[19, -8.5], [24.5, -7.5], [26, -4.5], [24.5, -3], [24, -5], [20, -4.5]]), col('beak'));
  poly(c, HP([[24.5, -5.5], [26, -4.5], [24.5, -3]]), col('beakTip'));
  const cr = HP([[19, -8]])[0];
  px(c, cr[0] - (dir < 0 ? 1 : 0), cr[1], 2, 2, col('cere'));
  const ey = HP([[17, -8]])[0], br2 = HP([[15.5, -9.5], [19.5, -9.5]]);
  thick(c, br2[0][0], br2[0][1], br2[1][0], br2[1][1], 1, col('dark')); // heavy brow
  px(c, ey[0] - (dir < 0 ? 1 : 0), ey[1], 2, 1, flash ? '#ffffff' : '#120a04');
  px(c, ey[0], ey[1], 1, 1, flash ? '#ffffff' : '#8a5a1a');
}
