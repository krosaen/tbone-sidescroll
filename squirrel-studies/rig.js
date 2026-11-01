// v2: re-posed and re-proportioned from Wikimedia Commons photographs (credited on the page).
// A vector squirrel rig. Every outline is a closed Catmull-Rom spline converted to cubic Béziers,
// so there are no straight lines anywhere; "sharp" points (nose, toes, fur tips, the outside of
// elbows and knees) are where two curves meet with short tangents.
//
// Units: 1 = 100px. y points down. Poses are joint positions; a "version" is a set of proportion
// and curve-style parameters applied on top, so all five versions share the same five poses.

const U = 100;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const left = (t) => [t[1], -t[0]]; // for a rightward tangent this points up
const f = (p) => `${(p[0] * U).toFixed(1)},${(p[1] * U).toFixed(1)}`;
const smooth = (t) => t * t * (3 - 2 * t);

const COL = { body: '#3b3f45', far: '#2a2d32', pupil: '#131518', white: '#f7f4ec' };

// ---------- splines ----------
function cr(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return [0, 1].map((i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u3));
}
// Sample an open spline through the control points; k samples per segment.
function sample(P, k = 6) {
  const n = P.length, E = [sub(mul(P[0], 2), P[1]), ...P, sub(mul(P[n - 1], 2), P[n - 2])], out = [];
  for (let i = 1; i < n; i++) for (let s = 0; s < k; s++) out.push(cr(E[i - 1], E[i], E[i + 1], E[i + 2], s / k));
  out.push(P[n - 1]);
  return out;
}
// Closed smooth path through points [{p, s}] where s (0..0.85) shortens the tangents into a point.
function path(pts) {
  const n = pts.length, P = (i) => pts[(i + n) % n];
  let d = `M${f(P(0).p)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1).p, p1 = P(i).p, p2 = P(i + 1).p, p3 = P(i + 2).p;
    const c1 = add(p1, mul(sub(p2, p0), (1 - (P(i).s || 0)) / 6));
    const c2 = sub(p2, mul(sub(p3, p1), (1 - (P(i + 1).s || 0)) / 6));
    d += `C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  return d + 'Z';
}
const pt = (p, s = 0) => ({ p, s });

// A tapered tube along a spline. widths: per control point, either w or [leftW, rightW].
// Returns outline points plus the sampled spine/edges (used for white overlap lines).
function tube(joints, widths, { k = 6, tip = 'point', cap = true, tufts = null } = {}) {
  const S = sample(joints, k), n = S.length;
  const W = (i) => {
    const j = Math.min(joints.length - 2, Math.floor(i / k)), u = smooth(i / k - j);
    const a = widths[j], b = widths[j + 1], A = Array.isArray(a) ? a : [a, a], B = Array.isArray(b) ? b : [b, b];
    return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u];
  };
  const T = S.map((p, i) => nrm(sub(S[Math.min(n - 1, i + 1)], S[Math.max(0, i - 1)])));
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const w = W(i), nn = left(T[i]);
    let sl = 0, sr = 0;
    // the outside of a bent joint becomes a soft point
    if (i % k === 0 && i > 0 && i < n - 1) {
      const d1 = sub(S[i], S[i - 1]), d2 = sub(S[i + 1], S[i]), cross = d1[0] * d2[1] - d1[1] * d2[0];
      if (Math.abs(cross) > 1e-4) { if (cross > 0) { sl = 0.42; w[0] *= 1.04; } else { sr = 0.42; w[1] *= 1.04; } }
    }
    L.push(pt(add(S[i], mul(nn, w[0])), sl));
    R.push(pt(sub(S[i], mul(nn, w[1])), sr));
  }
  let out;
  if (tufts) out = tuftEnd(S, T, W, L, R, tufts);
  else if (tip === 'point') out = [...L.slice(0, n - 1), pt(add(S[n - 1], mul(T[n - 1], W(n - 1)[0] * 0.6 + 0.02)), 0.8), ...R.slice(0, n - 1).reverse()];
  else out = [...L, pt(add(S[n - 1], mul(T[n - 1], W(n - 1)[0] * 0.9))), ...R.reverse()];
  if (cap) { const w0 = W(0); out.push(pt(add(sub(S[0], mul(T[0], (w0[0] + w0[1]) * 0.45)), mul(left(T[0]), (w0[0] - w0[1]) * 0.5)))); }
  return { pts: out, S, T, L, R, W };
}

// The tail's end breaks into small pointed S-curves: fur texture built from the same curves.
function tuftEnd(S, T, W, L, R, o) {
  const n = S.length, start = Math.floor(n * o.from), out = [];
  const side = (E, sign) => {
    const res = [];
    for (let i = 0; i < n - 1; i++) {
      if (i < start) { res.push(E[i]); continue; }
      const t = (i - start) / (n - 1 - start), w = W(i)[sign > 0 ? 0 : 1];
      res.push(E[i]);
      if ((i - start) % (o.every * 2) === 1) { // a tuft: flicked outward and swept back along the tail
        const amp = o.amp * (sign > 0 ? o.outer : o.inner) * (1 + (o.jitter ? (Math.sin(i * 12.9898) * 0.5) : 0)) * (0.7 + t * 0.6);
        const back = mul(T[i], -o.sweep * (w * 0.5 + len(sub(S[i], S[i - 1])) * 1.6)); // lie back along the flow like layered flames
        res.push(pt(add(add(S[i], mul(left(T[i]), sign * w * (1 + amp))), back), 0.5));
      }
    }
    return res;
  };
  const tipW = W(n - 1)[0], end = S[n - 1], tt = T[n - 1];
  const tips = [-0.42, 0, 0.42].map((a) => pt(add(end, mul(rot(tt, a * o.fan), tipW * (1.0 + o.amp * 1.4))), 0.62));
  const valleys = [-0.22, 0.22].map((a) => pt(add(end, mul(rot(tt, a), tipW * 0.55))));
  out.push(...side(L, 1), tips[0], valleys[0], tips[1], valleys[1], tips[2], ...side(R, -1).reverse());
  return out;
}

// A graceful white line: a curve that swells in the middle and tapers to points at both ends.
function taper(P, w) {
  const S = P.length > 3 ? P : sample(P, 6), n = S.length;
  const T = S.map((p, i) => nrm(sub(S[Math.min(n - 1, i + 1)], S[Math.max(0, i - 1)])));
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), ww = w * Math.pow(Math.sin(Math.PI * t), 0.75);
    L.push(pt(add(S[i], mul(left(T[i]), ww)), i === 0 || i === n - 1 ? 0.85 : 0));
    R.push(pt(sub(S[i], mul(left(T[i]), ww))));
  }
  return path([...L, ...R.slice(1, n - 1).reverse()]);
}

// ---------- head, eyes, ears ----------
// Profile facing right: round skull, forehead sloping down through a dip (the "stop") into a
// tapering snout, a nose that is almost a point.
const HEAD = [[-0.92, -0.05], [-0.66, -0.72], [-0.05, -0.96], [0.42, -0.75], [0.6, -0.52], [0.9, -0.38], [1.2, -0.14], [1.16, 0.04], [0.88, 0.24], [0.42, 0.52], [-0.18, 0.63], [-0.7, 0.42]];
const NOSE = 6;

// Eye shapes in eye-local space (radius 1, facing right): start point, then cubic segments.
// The white is the only thing that carries the expression; the pupil is big and clipped inside it.
const EYES = {
  joy: { d: [[-1, 0.2], [[-0.92, -1.1], [0.92, -1.1], [1, 0.2]], [[0.55, -0.32], [-0.55, -0.32], [-1, 0.2]]], pupil: [0.08, -0.42], pr: 0.66 }, // a crescent pushed up by the cheeks
  fear: { d: [[-1.15, 0], [[-1.15, -0.85], [-0.6, -1.25], [0.05, -1.22]], [[0.75, -1.2], [1.18, -0.6], [1.15, 0.05]], [[1.12, 0.8], [0.55, 1.2], [0, 1.18]], [[-0.62, 1.18], [-1.15, 0.7], [-1.15, 0]]], pupil: [0.12, 0.02], pr: 0.56 }, // wide open: white all round
  squint: { d: [[-1.08, 0.08], [[-0.45, -0.36], [0.5, -0.44], [1.08, -0.04]], [[0.5, 0.28], [-0.45, 0.32], [-1.08, 0.08]]], pupil: [0.3, -0.02], pr: 0.62 }, // narrowed lens, watching
  baffled: { d: [[-0.95, 0.35], [[-1.1, -0.95], [0.45, -1.45], [0.98, -0.32]], [[1.12, 0.55], [-0.55, 0.95], [-0.95, 0.35]]], pupil: [-0.32, -0.3], pr: 0.6 }, // lopsided, looking back
  run: { d: [[-1.05, 0.02], [[-1.0, -0.78], [-0.45, -1.1], [0.1, -1.08]], [[0.7, -1.05], [1.06, -0.55], [1.05, 0.06]], [[1.02, 0.68], [0.5, 1.0], [0, 0.98]], [[-0.55, 0.98], [-1.04, 0.6], [-1.05, 0.02]]], pupil: [0.26, -0.04], pr: 0.74 }, // bright, focused ahead
  fearless: { d: [[-1, -0.3], [[-0.45, -0.62], [0.42, -0.34], [1.02, 0.12]], [[0.62, 0.78], [-0.72, 0.78], [-1, -0.3]]], pupil: [0.34, 0.12], pr: 0.64 }, // lid slanting down to the nose
};
const EXPR = {
  joy: { eye: 'joy', ear: -100, far: -78, tilt: -8 },
  fear: { eye: 'fear', ear: -168, far: -152, tilt: 4 },
  sneak: { eye: 'squint', ear: -70, far: -55, tilt: 0 },
  baffled: { eye: 'baffled', ear: -118, far: -58, tilt: 16 },
  fearless: { eye: 'fearless', ear: -158, far: -146, tilt: 0 },
  run: { eye: 'run', ear: -128, far: -112, tilt: 0 },
};

let uid = 0;
const ID = 'e' + Math.random().toString(36).slice(2, 7) + '-'; // unique per copy of the rig, so v1 and v2 clip-paths never collide
function headParts(c, r, ang, dir, expr, V) {
  const X = (p) => add(c, mul(rot([p[0] * dir, p[1]], ang * dir), r)); // head-local -> world
  const snout = (p) => (p[0] > 0.4 ? [0.4 + (p[0] - 0.4) * V.snout, p[1]] : p);
  const outline = path(HEAD.map((p, i) => pt(X(snout(p)), i === NOSE ? 0.72 : i === 4 ? 0.25 : 0)));
  const E = EXPR[expr];
  const ear = (base, deg, L, wide) => {
    const a = (deg * Math.PI) / 180, A = (p) => X(add(base, rot([p[0] * L, p[1] * L * wide], a)));
    return path([pt(A([0, -0.32])), pt(A([0.55, -0.42])), pt(A([1, 0]), 0.82), pt(A([0.55, 0.36])), pt(A([0, 0.3]))]);
  };
  const earLine = (base, deg, L) => { const a = (deg * Math.PI) / 180, A = (p) => X(add(base, rot([p[0] * L, p[1] * L], a))); return taper([A([0.2, 0.05]), A([0.5, 0.06]), A([0.82, 0])], V.line * 0.8); };
  // eye
  const ed = EYES[E.eye], R = V.eye, eo = [0.3, -0.33];
  const EX = (p) => X(add(eo, [p[0] * R, p[1] * R]));
  let d = `M${f(EX(ed.d[0]))}`;
  for (const seg of ed.d.slice(1)) d += `C${f(EX(seg[0]))} ${f(EX(seg[1]))} ${f(EX(seg[2]))}`;
  d += 'Z';
  const id = `${ID}${uid++}`, pc = EX(ed.pupil), hl = EX([ed.pupil[0] + 0.24, ed.pupil[1] - 0.26]);
  const eye = `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${COL.white}"/>`
    + `<circle cx="${(pc[0] * U).toFixed(1)}" cy="${(pc[1] * U).toFixed(1)}" r="${(ed.pr * R * r * U).toFixed(1)}" fill="${COL.pupil}" clip-path="url(#${id})"/>`
    + `<circle cx="${(hl[0] * U).toFixed(1)}" cy="${(hl[1] * U).toFixed(1)}" r="${(0.13 * R * r * U).toFixed(1)}" fill="${COL.white}" clip-path="url(#${id})"/>`;
  const lines = [
    taper([X([0.42, 0.5]), X([-0.15, 0.6]), X([-0.68, 0.36]), X([-0.86, -0.12])], V.line), // where the head turns off the neck
    taper([X([0.25, 0.05]), X([0.5, 0.3]), X([0.92, 0.3])], V.line * 0.7), // cheek
    earLine([-0.3, -0.72], E.ear, V.earL),
  ];
  return {
    outline, eye, lines,
    nearEar: ear([-0.3, -0.72], E.ear, V.earL, 0.95),
    farEar: ear([-0.02, -0.8], E.far, V.earL * 0.92, 0.9),
  };
}

// ---------- the five poses ----------
// spine: rump, hip, mid-back, shoulder, neck. Legs: hind = hip, knee (bends forward), hock
// (bends back), toe; fore = shoulder, elbow (bends back), wrist (bends forward), paw.
export const POSES = [
  { key: 'jump', title: 'Huge jump', mood: 'utmost joy', expr: 'joy',
    ref: 'Gray squirrel mid-leap over a fence (body nearly level, forelegs reaching together, hind feet trailing soles-up); red squirrel diving off a branch (full stretch).',
    spine: [[-0.42, 0.08], [0, 0], [0.52, -0.12], [1.0, -0.2], [1.28, -0.3]],
    head: { c: [1.52, -0.42], ang: -12, dir: 1 },
    foreN: [[1.0, -0.15], [1.08, 0.02], [1.4, 0.08], [1.62, 0.05]], foreF: [[0.96, -0.17], [1.02, 0.02], [1.32, 0.12], [1.54, 0.11]],
    hindN: [[0.02, 0.04], [-0.08, 0.24], [-0.46, 0.28], [-0.84, 0.19]], hindF: [[-0.02, 0.02], [-0.14, 0.2], [-0.5, 0.2], [-0.88, 0.09]],
    tail: [[-0.46, 0.05], [-0.95, 0.02], [-1.4, -0.08], [-1.75, -0.3], [-1.92, -0.62], [-1.82, -0.92]], shadow: 1.05 }, // carries the body's line, then sweeps up
  { key: 'scamper', title: 'Frantic scamper', mood: 'fear', expr: 'fear', frazzle: true,
    ref: 'Black squirrel running a fence rail (strong hunch of the lower back, head low); red squirrel bounding (hind feet gathered forward under the belly).',
    spine: [[-0.32, 0.06], [0, -0.12], [0.38, -0.3], [0.74, -0.16], [0.96, -0.04]],
    head: { c: [1.18, 0.02], ang: 14, dir: 1 },
    foreN: [[0.74, -0.08], [0.64, 0.16], [0.8, 0.36], [0.94, 0.44]], foreF: [[0.7, -0.1], [0.56, 0.14], [0.6, 0.38], [0.7, 0.44]],
    hindN: [[0.03, -0.06], [0.36, 0.1], [0.2, 0.34], [0.62, 0.44]], hindF: [[-0.02, -0.08], [0.28, 0.06], [0.06, 0.28], [0.46, 0.36]],
    tail: [[-0.36, 0.04], [-0.78, 0.0], [-1.12, -0.18], [-1.3, -0.52], [-1.18, -0.85], [-1.32, -1.1]], ground: 0.44 },
  { key: 'sneak', title: 'Sneaking', mood: 'squinty, watchful', expr: 'sneak',
    ref: 'Gray squirrel creeping head-first along a fence top; black squirrel crouched before a jump (compressed, shoulders high, head low and forward).',
    spine: [[-0.4, -0.02], [0, -0.06], [0.5, 0.0], [0.98, 0.04], [1.26, 0.1]],
    head: { c: [1.52, 0.16], ang: 10, dir: 1 },
    foreN: [[0.98, 0.1], [0.86, 0.26], [1.06, 0.2], [1.2, 0.28]], foreF: [[0.94, 0.08], [0.8, 0.28], [0.94, 0.42], [1.08, 0.45]],
    hindN: [[0.0, -0.02], [0.24, 0.18], [-0.14, 0.34], [0.16, 0.45]], hindF: [[-0.04, -0.04], [0.16, 0.16], [-0.22, 0.32], [0.06, 0.43]],
    tail: [[-0.44, -0.04], [-0.82, -0.2], [-1.0, -0.52], [-0.86, -0.82], [-0.56, -0.92], [-0.3, -0.82]], ground: 0.45 }, // arched over the back, tip curling forward
  { key: 'turn', title: 'Skidding turnaround', mood: 'baffled', expr: 'baffled',
    ref: 'No turnaround photo on Commons; built from a red squirrel stepping down rocks (front end dropping, back arched, tail held up in an S) and the crouch above, with a cat-like head tilt.',
    spine: [[-0.2, 0.04], [0, -0.02], [0.34, -0.3], [0.2, -0.6], [-0.1, -0.72]],
    head: { c: [-0.38, -0.74], ang: 18, dir: -1 },
    foreN: [[0.16, -0.52], [0.3, -0.24], [0.02, 0.1], [-0.28, 0.44]], foreF: [[0.22, -0.56], [0.42, -0.36], [0.34, -0.06], [0.12, 0.12]],
    hindN: [[0.03, 0.02], [0.38, 0.2], [0.28, 0.42], [0.7, 0.48]], hindF: [[-0.02, -0.02], [0.3, 0.14], [0.14, 0.38], [0.52, 0.45]],
    tail: [[-0.24, 0.0], [-0.5, -0.4], [-0.3, -0.98], [0.25, -1.28], [0.82, -1.15], [1.05, -0.78]], ground: 0.48 }, // the momentum of the run, still swinging
  { key: 'charge', title: 'Head-down charge', mood: 'fearless', expr: 'fearless',
    ref: 'Gray squirrel bounding across a Central Park lawn (low, long and level, forelegs reaching, tail streaming straight back).',
    spine: [[-0.42, -0.1], [0, -0.14], [0.55, -0.1], [1.04, 0.0], [1.3, 0.1]],
    head: { c: [1.56, 0.24], ang: 40, dir: 1 },
    foreN: [[1.04, 0.06], [0.96, 0.28], [1.32, 0.38], [1.58, 0.45]], foreF: [[1.0, 0.04], [0.86, 0.28], [1.02, 0.44], [1.2, 0.48]],
    hindN: [[0.02, -0.08], [-0.14, 0.16], [-0.52, 0.3], [-0.84, 0.46]], hindF: [[-0.02, -0.1], [0.2, 0.1], [-0.02, 0.34], [0.32, 0.46]],
    tail: [[-0.46, -0.1], [-0.98, -0.14], [-1.5, -0.12], [-1.9, -0.26], [-2.12, -0.5]], ground: 0.48 },
];

// ---------- the five versions ----------
export const VERSIONS = [
  { key: 'deco', name: 'Deco Streamline', note: 'Long sweeping arcs like a 1930s hood ornament; the tail ends in a scroll (volute) with crisp, evenly spaced flame tips.',
    bodyLen: 0.95, thick: 0.88, head: 0.33, eye: 0.36, snout: 1.18, legLen: 1.02, legW: 0.92, tailLen: 1.1, tailW: 0.27, arch: 1.0, line: 0.022, earL: 0.95,
    tuft: { from: 0.72, every: 2, amp: 0.26, sweep: 0.5, outer: 1, inner: 0.6, fan: 0.7 }, volute: 4 },
  { key: 'sea', name: 'Sea Creature', note: 'An eel-slim body and a tail that flares like a fin, its fur tips swept back like fin rays.',
    bodyLen: 1.12, thick: 0.72, head: 0.31, eye: 0.4, snout: 1.0, legLen: 0.88, legW: 0.75, tailLen: 1.2, tailW: 0.22, arch: 1.2, line: 0.018, earL: 0.55,
    tuft: { from: 0.62, every: 2, amp: 0.38, sweep: 1.4, outer: 1, inner: 0.85, fan: 1.15 }, fin: true },
  { key: 'serpent', name: 'Serpentine', note: 'The whole spine moves in S-waves, and the tail carries the wave on, the way a snake travels.',
    bodyLen: 1.02, thick: 0.85, head: 0.32, eye: 0.34, snout: 1.12, legLen: 0.95, legW: 0.9, tailLen: 1.35, tailW: 0.25, arch: 1.6, line: 0.02, earL: 0.68,
    tuft: { from: 0.66, every: 1, amp: 0.16, sweep: 0.6, outer: 1, inner: 1, fan: 0.8 }, wave: 0.24 },
  { key: 'ferret', name: 'Ferret Eccentric', note: 'A long, low torso on short legs with a small head and big eyes; a plush tail with small rounded tips.',
    bodyLen: 1.38, thick: 1.05, head: 0.29, eye: 0.42, snout: 0.84, legLen: 0.64, legW: 1.1, tailLen: 0.88, tailW: 0.32, arch: 1.25, line: 0.024, earL: 0.52,
    tuft: { from: 0.62, every: 2, amp: 0.22, sweep: 0.3, outer: 1, inner: 1, fan: 0.9 } },
  { key: 'cat', name: 'Cat Kinetic', note: 'Long legs and a big, kitten-like head; the most stretch, the deepest back arch, a lashing tail with hooked tips.',
    bodyLen: 1.0, thick: 0.86, head: 0.4, eye: 0.44, snout: 0.82, legLen: 1.32, legW: 0.88, tailLen: 1.3, tailW: 0.21, arch: 1.5, line: 0.021, earL: 0.98,
    tuft: { from: 0.68, every: 2, amp: 0.45, sweep: 0.9, outer: 1.5, inner: 0.4, fan: 1.1 }, hook: true },
];

const BODY_TOP = [0.2, 0.25, 0.18, 0.22, 0.14], BODY_BOT = [0.18, 0.22, 0.16, 0.27, 0.16];
const HIND_W = [0.33, 0.13, 0.07, 0.06], FORE_W = [0.13, 0.075, 0.05, 0.045];

function tailProfile(V, n) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const w = V.fin ? 0.3 + 0.35 * Math.sin(t * 1.4) + 1.3 * smooth(Math.max(0, (t - 0.55) / 0.45))
      : t < 0.6 ? 0.25 + 0.75 * smooth(t / 0.6) : t < 0.85 ? 1 - (t - 0.6) * 0.2 : 0.95 - ((t - 0.85) / 0.15) * 0.35;
    return w * V.tailW * (t > 0.92 ? 1 - (t - 0.92) * 4 : 1);
  });
}

// ---------- assemble one figure ----------
export function squirrel(P, V) {
  // body: scale out from the hip, then deepen the arch (or dip) of the back
  const sp = P.spine.map((p) => mul(p, V.bodyLen));
  const chord = nrm(sub(sp[4], sp[0])), perp = left(chord);
  const dev = (p) => (p[0] - sp[0][0]) * perp[0] + (p[1] - sp[0][1]) * perp[1];
  const archD = [0, 0.4, 1, 0.5, 0].map((k, i) => mul(perp, (V.arch - 1) * dev(sp[i]) * k));
  const spine = sp.map((p, i) => add(p, archD[i]));
  const limb = (J, root, widths, idx) => {
    const r = add(mul(J[0], V.bodyLen), archD[idx]);
    return tube(J.map((p) => add(r, mul(sub(p, J[0]), V.legLen))), widths.map((w) => w * V.legW), { k: 5 });
  };
  const hindN = limb(P.hindN, 0, HIND_W, 1), hindF = limb(P.hindF, 0, HIND_W.map((w) => w * 0.92), 1);
  const foreN = limb(P.foreN, 0, FORE_W, 3), foreF = limb(P.foreF, 0, FORE_W.map((w) => w * 0.92), 3);
  const body = tube(spine, BODY_TOP.map((t, i) => [t * V.thick, BODY_BOT[i] * V.thick]), { k: 5, tip: 'round' });

  // tail: scaled from its root, optionally rolled into a volute or rippled into a wave
  const tb = add(mul(P.tail[0], V.bodyLen), archD[0]);
  let tc = P.tail.map((p) => add(tb, mul(sub(p, P.tail[0]), V.tailLen)));
  if (V.volute) {
    const n = tc.length, a = sub(tc[n - 2], tc[n - 3]), b = sub(tc[n - 1], tc[n - 2]);
    const turn = Math.sign(a[0] * b[1] - a[1] * b[0]) || 1;
    let d = mul(nrm(b), len(b) * 0.7), p = tc[n - 1];
    for (let i = 0; i < V.volute; i++) { d = mul(rot(d, turn * 0.95), 0.72); p = add(p, d); tc.push(p); }
  }
  if (V.hook) { // the last stretch of the tail flicks back on itself
    const n = tc.length, d = sub(tc[n - 1], tc[n - 2]), turn = -Math.sign((tc[n - 2][0] - tc[n - 3][0]) * d[1] - (tc[n - 2][1] - tc[n - 3][1]) * d[0]) || 1;
    tc.push(add(tc[n - 1], mul(rot(d, turn * 1.3), 0.45)));
  }
  let ts = sample(tc, 9);
  if (V.wave) {
    const T = ts.map((p, i) => nrm(sub(ts[Math.min(ts.length - 1, i + 1)], ts[Math.max(0, i - 1)])));
    ts = ts.map((p, i) => { const t = i / (ts.length - 1); return add(p, mul(left(T[i]), V.wave * Math.sin(t * Math.PI * 3) * t)); });
  }
  const prof = tailProfile(V, ts.length);
  const tuft = { ...V.tuft, jitter: !!P.frazzle, amp: V.tuft.amp * (P.frazzle ? 1.5 : 1), every: P.frazzle ? 1 : V.tuft.every };
  const tail = tube(ts, prof, { k: 1, tufts: tuft });

  // head rides on the neck
  const hc = add(spine[4], mul(nrm(sub(P.head.c, P.spine[4])), V.head * 0.62));
  const E = EXPR[P.expr];
  const H = headParts(hc, V.head, ((P.head.ang + E.tilt) * Math.PI) / 180, P.head.dir, P.expr, V);

  // white overlap lines: the edge of each near limb where it crosses the body, the tail root,
  // and the fur grooves at the tail tip
  const center = spine[2];
  const overlap = (tb2, frac) => {
    const m = Math.max(3, Math.floor(tb2.S.length * frac));
    const d = (E2) => E2.slice(0, m).reduce((s, q) => s + len(sub(q.p, center)), 0);
    const E2 = d(tb2.L) < d(tb2.R) ? tb2.L : tb2.R;
    return taper(E2.slice(1, m).map((q, i) => mix(q.p, tb2.S[i + 1], 0.22)), V.line);
  };
  const furLines = [-0.34, 0.1].map((o) => {
    const a = Math.floor(ts.length * 0.7), b = ts.length - 3;
    const T = ts.map((p, i) => nrm(sub(ts[Math.min(ts.length - 1, i + 1)], ts[Math.max(0, i - 1)])));
    const pts = [];
    for (let i = a; i <= b; i++) pts.push(add(ts[i], mul(left(T[i]), prof[i] * o)));
    return taper(pts, V.line * 0.7);
  });
  const rootLine = (() => {
    const i = Math.min(ts.length - 2, 3), T = nrm(sub(ts[i + 1], ts[i - 1])), nn = left(T), w = prof[i] * 0.85;
    return taper([add(ts[i], mul(nn, w)), add(add(ts[i], mul(T, -0.06)), mul(nn, 0.0)), sub(ts[i], mul(nn, w))], V.line * 0.85);
  })();
  const whites = [overlap(hindN, 0.55), overlap(foreN, 0.5), rootLine, ...furLines, ...H.lines];

  const fill = (d, c) => `<path d="${d}" fill="${c}"/>`;
  const svg = [
    fill(path(tail.pts), COL.body),
    fill(path(hindF.pts), COL.far), fill(path(foreF.pts), COL.far), fill(H.farEar, COL.far),
    fill(path(body.pts), COL.body),
    fill(path(hindN.pts), COL.body), fill(path(foreN.pts), COL.body),
    fill(H.outline, COL.body), fill(H.nearEar, COL.body),
    ...whites.map((d) => fill(d, COL.white)),
    H.eye,
  ].join('');

  // bounds (for framing) and the ground under the feet
  const all = [...tail.pts, ...body.pts, ...hindN.pts, ...foreN.pts, ...hindF.pts, ...foreF.pts].map((q) => q.p);
  all.push(add(hc, [-V.head, -V.head * 1.6]), add(hc, [V.head * 1.4 * P.head.dir, V.head]));
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const feet = [hindN, hindF, foreN, foreF].map((l) => l.S[l.S.length - 1][1]);
  return { svg, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], groundY: P.ground != null ? Math.max(...feet) + 0.02 : null, shadow: P.shadow };
}

// One framed drawing. Same scale in every cell so the versions compare honestly.
export function figureSVG(P, V, { w = 5.0, h = 3.3, center = null, ground = null, scroll = null } = {}) {
  const F = squirrel(P, V);
  const [x0, y0, x1, y1] = F.box;
  const cx = center ? center[0] : (x0 + x1) / 2, cy = center ? center[1] : (y0 + y1) / 2;
  const s = center ? 1 : Math.min(1, (w - 0.3) / (x1 - x0), (h - 0.3) / (y1 - y0));
  const vb = [(cx - w / 2 / s) * U, (cy - h / 2 / s) * U, (w / s) * U, (h / s) * U].map((v) => v.toFixed(1)).join(' ');
  let base = '';
  if (scroll != null) { // a flat track with dashes sliding past, for the running loops
    const gy = ground ?? F.groundY ?? 0.45, a = cx - w / 2, b = cx + w / 2;
    base = `<path d="M${f([a, gy + 0.03])}C${f([a + (b - a) * 0.33, gy + 0.03])} ${f([a + (b - a) * 0.66, gy + 0.03])} ${f([b, gy + 0.03])}" fill="none" stroke="#c9c2b4" stroke-width="4" stroke-linecap="round" stroke-dasharray="34 26" stroke-dashoffset="${(scroll * U).toFixed(1)}"/>`;
  } else if (F.groundY != null) {
    const gy = F.groundY, a = cx - w / 2 / s, b = cx + w / 2 / s;
    base = `<path d="M${f([a, gy + 0.05])}C${f([a + (b - a) * 0.3, gy - 0.02])} ${f([a + (b - a) * 0.7, gy + 0.03])} ${f([b, gy + 0.01])}" fill="none" stroke="#c9c2b4" stroke-width="3" stroke-linecap="round"/>`;
  } else if (F.shadow) {
    base = `<ellipse cx="${(cx * U).toFixed(1)}" cy="${(F.shadow * U).toFixed(1)}" rx="${(0.8 * U).toFixed(1)}" ry="${(0.07 * U).toFixed(1)}" fill="#000" opacity=".08"/>`;
  }
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${V.name}: ${P.title}, ${P.mood}">${base}${F.svg}</svg>`;
}

// ---------- run cycle ----------
// Eight key poses of one gallop stride, studied frame by frame from slow-motion footage of a gray
// squirrel running flat out. The head stays level the whole way; the tail is carried low and long.
const K = (title, spine, head, hindN, hindF, foreN, foreF, tail) => ({ title, spine, head: { c: head[0], ang: head[1], dir: 1 }, hindN, hindF, foreN, foreF, tail });
export const RUN = [
  K('push-off', [[-0.36, 0.0], [0, -0.08], [0.5, -0.14], [0.95, -0.12], [1.2, -0.18]], [[1.42, -0.28], 0],
    [[0, -0.04], [-0.02, 0.2], [-0.2, 0.34], [-0.36, 0.45]], [[-0.03, -0.06], [0.05, 0.18], [-0.12, 0.32], [-0.26, 0.44]],
    [[0.95, -0.06], [0.9, 0.12], [1.02, 0.26], [1.12, 0.3]], [[0.92, -0.08], [0.86, 0.1], [0.96, 0.24], [1.06, 0.27]],
    [[-0.4, -0.02], [-0.8, 0.04], [-1.2, 0.08], [-1.55, 0.06], [-1.8, 0.0]]),
  K('extension', [[-0.42, 0.02], [0, -0.06], [0.55, -0.1], [1.08, -0.06], [1.34, -0.1]], [[1.58, -0.18], 4],
    [[0, -0.02], [-0.2, 0.16], [-0.52, 0.3], [-0.74, 0.43]], [[-0.03, -0.04], [-0.22, 0.12], [-0.54, 0.24], [-0.78, 0.34]],
    [[1.08, 0.0], [1.12, 0.16], [1.36, 0.3], [1.5, 0.36]], [[1.04, -0.02], [1.06, 0.14], [1.28, 0.28], [1.42, 0.32]],
    [[-0.46, 0.0], [-0.9, 0.06], [-1.32, 0.1], [-1.7, 0.1], [-1.98, 0.05]]),
  K('full stretch', [[-0.44, -0.06], [0, -0.1], [0.56, -0.08], [1.1, -0.02], [1.36, -0.06]], [[1.6, -0.12], 6],
    [[0, -0.06], [-0.22, 0.08], [-0.5, 0.2], [-0.72, 0.3]], [[-0.03, -0.08], [-0.24, 0.04], [-0.52, 0.14], [-0.76, 0.22]],
    [[1.1, 0.04], [1.18, 0.2], [1.42, 0.36], [1.58, 0.44]], [[1.06, 0.02], [1.12, 0.18], [1.34, 0.34], [1.5, 0.42]],
    [[-0.48, -0.06], [-0.9, 0.02], [-1.3, 0.1], [-1.66, 0.16], [-1.92, 0.18]]),
  K('front landing', [[-0.38, -0.22], [0, -0.24], [0.5, -0.18], [0.96, -0.04], [1.2, 0.02]], [[1.44, -0.02], 10],
    [[0, -0.2], [0.12, -0.02], [-0.08, 0.12], [0.08, 0.24]], [[-0.03, -0.22], [0.06, -0.04], [-0.14, 0.08], [0.0, 0.2]],
    [[0.96, 0.02], [0.98, 0.18], [1.12, 0.36], [1.24, 0.45]], [[0.92, 0.0], [0.9, 0.18], [1.0, 0.36], [1.1, 0.45]],
    [[-0.42, -0.22], [-0.82, -0.12], [-1.2, 0.0], [-1.56, 0.1], [-1.84, 0.16]]),
  K('gather', [[-0.3, -0.12], [0, -0.28], [0.38, -0.36], [0.74, -0.18], [0.96, -0.06]], [[1.18, -0.04], 12],
    [[0.02, -0.22], [0.3, -0.06], [0.14, 0.14], [0.36, 0.24]], [[-0.02, -0.24], [0.24, -0.08], [0.06, 0.1], [0.26, 0.2]],
    [[0.74, -0.1], [0.7, 0.1], [0.8, 0.3], [0.86, 0.45]], [[0.7, -0.12], [0.64, 0.1], [0.7, 0.3], [0.74, 0.45]],
    [[-0.34, -0.12], [-0.74, -0.04], [-1.12, 0.06], [-1.5, 0.12], [-1.8, 0.12]]),
  K('hind feet passing', [[-0.26, -0.02], [0, -0.2], [0.36, -0.32], [0.72, -0.24], [0.96, -0.18]], [[1.18, -0.2], 6],
    [[0.02, -0.14], [0.36, 0.0], [0.26, 0.22], [0.6, 0.4]], [[-0.02, -0.16], [0.3, -0.02], [0.18, 0.2], [0.5, 0.36]],
    [[0.72, -0.16], [0.66, 0.04], [0.76, 0.24], [0.82, 0.36]], [[0.68, -0.18], [0.6, 0.04], [0.66, 0.26], [0.7, 0.42]],
    [[-0.3, -0.02], [-0.7, 0.02], [-1.1, 0.06], [-1.5, 0.08], [-1.8, 0.04]]),
  K('hind landing', [[-0.24, 0.06], [0, -0.12], [0.34, -0.26], [0.68, -0.24], [0.92, -0.24]], [[1.14, -0.3], 0],
    [[0.02, -0.06], [0.32, 0.1], [0.24, 0.3], [0.6, 0.45]], [[-0.02, -0.08], [0.26, 0.08], [0.16, 0.28], [0.5, 0.44]],
    [[0.68, -0.16], [0.64, 0.02], [0.78, 0.14], [0.9, 0.16]], [[0.64, -0.18], [0.6, 0.0], [0.72, 0.12], [0.84, 0.14]],
    [[-0.28, 0.06], [-0.68, 0.08], [-1.08, 0.1], [-1.46, 0.1], [-1.76, 0.04]]),
  K('push', [[-0.3, 0.04], [0, -0.1], [0.44, -0.2], [0.84, -0.18], [1.08, -0.22]], [[1.3, -0.3], 0],
    [[0, -0.04], [0.18, 0.14], [0.0, 0.32], [0.2, 0.45]], [[-0.03, -0.06], [0.14, 0.12], [-0.06, 0.3], [0.12, 0.44]],
    [[0.84, -0.1], [0.8, 0.08], [0.94, 0.22], [1.06, 0.26]], [[0.8, -0.12], [0.76, 0.06], [0.88, 0.2], [1.0, 0.24]],
    [[-0.34, 0.02], [-0.74, 0.06], [-1.14, 0.08], [-1.52, 0.08], [-1.82, 0.02]]),
];
// Smoothly interpolated pose at phase u (0..1 around the stride), Catmull-Rom between keys.
export function runPose(u, expr = 'run') {
  const n = RUN.length, f = (((u % 1) + 1) % 1) * n, i = Math.floor(f), t = f - i;
  const A = RUN[(i + n - 1) % n], B = RUN[i], C = RUN[(i + 1) % n], D = RUN[(i + 2) % n];
  const m = (a, b, c, d) => (Array.isArray(a) ? a.map((_, j) => m(a[j], b[j], c[j], d[j])) : cr([0, a], [0, b], [0, c], [0, d], t)[1]);
  const keys = ['spine', 'hindN', 'hindF', 'foreN', 'foreF', 'tail'], P = { key: 'run', title: 'Run cycle', mood: 'running', expr, ground: 0.45 };
  for (const k of keys) P[k] = m(A[k], B[k], C[k], D[k]);
  P.head = { c: m(A.head.c, B.head.c, C.head.c, D.head.c), ang: m(A.head.ang, B.head.ang, C.head.ang, D.head.ang), dir: 1 };
  return P;
}
export const runKey = (i, expr = 'run') => ({ ...RUN[i], key: 'run' + i, mood: 'running', expr, ground: 0.45, head: { ...RUN[i].head } });
