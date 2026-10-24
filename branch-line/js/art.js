// Pixel-art toolkit: everything is drawn at 480x270 with whole-pixel rects, then upscaled with
// nearest-neighbour so edges stay crisp. Light comes from straight above (it's noon).
import { rand, hash, clamp } from '../../shared/util.js';

export const W = 480, H = 270;
export const LANE_Y = [92, 146, 200]; // the three tracks
export const GROUND_Y = 238;
export const SX = 110; // the squirrel's fixed screen x

// While set, every primitive paints in this colour (used for the white hit-flash).
let OVR = null;
export const setOverride = (c) => (OVR = c);

export function px(c, x, y, w, h, col) {
  c.fillStyle = OVR || col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}
export function ellipse(c, cx, cy, rx, ry, col) {
  cx = Math.round(cx); cy = Math.round(cy); rx = Math.max(0, Math.round(rx)); ry = Math.max(0, Math.round(ry));
  c.fillStyle = OVR || col;
  if (ry === 0) { c.fillRect(cx - rx, cy, 2 * rx + 1, 1); return; }
  const rf = ry + 0.5, xf = rx + 0.5;
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.floor(xf * Math.sqrt(Math.max(0, 1 - (dy / rf) ** 2)));
    c.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}
// Scanline polygon fill with hard pixel edges. pts = [[x, y], ...]
export function poly(c, pts, col) {
  c.fillStyle = OVR || col;
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const n = pts.length;
  for (let y = Math.ceil(y0 - 0.5); y <= Math.floor(y1 - 0.5); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]);
      if (xb > xa) c.fillRect(xa, y, xb - xa, 1);
    }
  }
}
// A line of given thickness (a filled quad), or a single-pixel Bresenham line when thin.
export function thick(c, x0, y0, x1, y1, w, col) {
  if (w <= 1.2) {
    c.fillStyle = OVR || col;
    let x = Math.round(x0), y = Math.round(y0);
    const xe = Math.round(x1), ye = Math.round(y1), dx = Math.abs(xe - x), dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1, sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      c.fillRect(x, y, 1, 1);
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return;
  }
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
  poly(c, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], col);
}

// ---------- colour ----------
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = (r, g, b) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
// 4x4 Bayer matrix for dithered shading.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x, y, t) => t > BAYER[(y & 3) * 4 + (x & 3)];
// Pick from a dark->light ramp at brightness b (0..1), dithering between neighbours.
function ramp(cols, b, x, y) {
  const f = clamp(b, 0, 0.999) * (cols.length - 1), i = Math.floor(f);
  return cols[Math.min(cols.length - 1, i + (dither(x, y, f - i) ? 1 : 0))];
}

// Michigan oaks in late October hang on to their leaves in russet and leather browns.
export const OAK_LEAVES = {
  red: ['#2e140c', '#4f2212', '#77341a', '#9e4c24', '#c06c34', '#dc9452'], // northern red oak
  white: ['#28121a', '#451c22', '#66292a', '#8a3c32', '#a95846', '#c67c62'], // white oak: burgundy-brown
  bur: ['#352510', '#563c18', '#7a5622', '#9e7430', '#bf9444', '#dbb468'], // bur oak: tan, leathery
};
export const LEAF_COLS = ['#9e4c24', '#c06c34', '#dc9452', '#8a3c32', '#a95846', '#9e7430', '#bf9444', '#77341a', '#c67c62', '#d8a050'];
const BARK = {
  red: ['#24201d', '#3b3631', '#56504a', '#706a62', '#8b847a'], // dark, furrowed, flat-topped ridges
  white: ['#3e3a36', '#5c5750', '#7d776e', '#9c968b', '#b9b2a6'], // ashy grey plates
  bur: ['#221c17', '#382e26', '#514439', '#6a5c4e', '#857564'], // deep corky furrows
};
export const SKY_LOW = '#a6d0f0';

function mk(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

export function makeSky() {
  const cv = mk(W, GROUND_Y), c = cv.getContext('2d');
  const stops = ['#2a66cc', '#3374d4', '#3f82da', '#4c90df', '#5b9ee3', '#6cabe7', '#7eb8ea', '#90c3ec', '#a6d0f0'].map(rgb);
  const img = c.createImageData(W, GROUND_Y);
  for (let y = 0; y < GROUND_Y; y++) {
    const f = (y / GROUND_Y) * (stops.length - 1), i = Math.floor(f), fr = f - i;
    for (let x = 0; x < W; x++) {
      const col = stops[Math.min(stops.length - 1, i + (dither(x, y, fr) ? 1 : 0))];
      const o = (y * W + x) * 4;
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

// One layer of rolling grassy hills, shaded as rounded forms and pushed back with haze.
export function makeHills() {
  const w = 960, h = 96, cv = mk(w, h), c = cv.getContext('2d');
  const TAU = Math.PI * 2;
  const humps = [
    { base: 36, amp: [10, 6, 3], f: [2, 5, 9], ph: 0.7, haze: 0.55 },
    { base: 52, amp: [12, 5, 2], f: [3, 4, 11], ph: 2.9, haze: 0.42 },
  ];
  const tones = ['#4e6a2c', '#62803a', '#7a9846', '#93ae55', '#adc46a', '#c6d888'];
  for (const hp of humps) {
    const ridge = (x) => hp.base - hp.amp.reduce((s, a, i) => s + a * Math.sin((x / w) * TAU * hp.f[i] + hp.ph * (i + 1)), 0);
    const cols = tones.map((t) => mix(t, SKY_LOW, hp.haze));
    for (let x = 0; x < w; x++) {
      const top = Math.round(ridge(x)), slope = (ridge(x + 2) - ridge(x - 2)) / 4;
      for (let y = top; y < h; y++) {
        // lit from above and a little from the left: rises catch light, far sides and hollows fall away
        const depth = (y - top) / (h - top + 1);
        const b = 0.78 - slope * 0.9 - depth * 0.55 + (hash(x * 0.13 + y * 7.1) - 0.5) * 0.08;
        px(c, x, y, 1, 1, ramp(cols, b, x, y));
      }
      if (hash(x * 3.7 + hp.ph) > 0.7) px(c, x, top - 1, 1, 1, cols[3]); // grass tufts on the skyline
    }
  }
  return cv;
}

// Lawn: textured grass with blades standing proud of the top edge, and fallen oak leaves.
// The tile starts 5px above GROUND_Y so the blade tips can overlap whatever stands behind.
export const GRASS_LIP = 5;
export function makeGround() {
  const h = H - GROUND_Y + GRASS_LIP, cv = mk(W, h), c = cv.getContext('2d');
  const tones = ['#3e5418', '#55701f', '#6c8a2c', '#82a03a', '#9cb94e', '#b7cf6a'];
  for (let x = 0; x < W; x++) {
    for (let y = GRASS_LIP; y < h; y++) {
      const b = 0.62 - (y - GRASS_LIP) / h * 0.4 + (hash(x * 1.31 + y * 17.7) - 0.5) * 0.5;
      px(c, x, y, 1, 1, ramp(tones, b, x, y));
    }
  }
  // blades: little vertical strokes, lighter at the tip, some leaning
  for (let i = 0; i < W * 3; i++) {
    const x = rand(W) | 0, y = GRASS_LIP + (Math.random() ** 1.6) * (h - GRASS_LIP) | 0;
    const len = 2 + ((Math.random() * (y < GRASS_LIP + 3 ? 5 : 3)) | 0), lean = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
    for (let k = 0; k < len; k++) px(c, x + (k > len / 2 ? lean : 0), y - k, 1, 1, tones[Math.min(5, 1 + Math.round((k / len) * 4))]);
  }
  // fallen oak leaves with a dark underside pixel
  for (let i = 0; i < 260; i++) {
    const x = rand(W) | 0, y = GRASS_LIP + 2 + ((Math.random() ** 0.8) * (h - GRASS_LIP - 3)) | 0;
    const col = LEAF_COLS[(Math.random() * LEAF_COLS.length) | 0];
    px(c, x, y, 3, 1, col);
    px(c, x + 1, y - 1, 1, 1, mix(col, '#ffffff', 0.15));
    px(c, x, y + 1, 2, 1, mix(col, '#1a1008', 0.45));
  }
  return cv;
}

// A small clump of leaves that never let go: lit from above so it reads as a solid little form.
export function makeLeafCluster(species, size = 1) {
  const pal = OAK_LEAVES[species];
  const w = Math.round(10 + size * 6), h = Math.round(7 + size * 4), cv = mk(w, h), c = cv.getContext('2d');
  const leaves = [];
  for (let i = 0; i < 8 + size * 9; i++) {
    const y = rand(2, h - 2);
    leaves.push({ x: rand(2.5, w - 2.5) * (0.7 + 0.3 * (1 - y / h)) + w * 0.15 * (y / h), y, rx: rand(1, 2.2), ry: rand(0.6, 1.4) });
  }
  leaves.sort((a, b) => b.y - a.y); // lowest first; upper leaves overlap them
  for (const l of leaves) {
    const up = 1 - l.y / h; // how much sky this leaf faces
    ellipse(c, l.x, l.y + 1, l.rx, l.ry, pal[0]);
    ellipse(c, l.x, l.y, l.rx, l.ry, pal[1 + Math.round(up * 3)]);
    if (up > 0.35) px(c, l.x - 1, l.y - Math.round(l.ry), 2, 1, pal[Math.min(5, 3 + Math.round(up * 2))]);
    px(c, l.x + Math.round(l.rx), l.y, 1, 1, pal[0]); // a lobe notch
  }
  px(c, w / 2 - 1, 0, 1, 2, '#3b3631'); // twig it hangs from
  return cv;
}

// A bare Michigan oak: stout furrowed trunk, elbowed limbs that zig-zag upward, fine twigs,
// and the odd clump of leaves still hanging on. Drawn with its root flare at the canvas bottom.
export function makeOak({ height, species = 'red', scale = 1, haze = 0, leaves = 0, crownY = 80 }) {
  const w = Math.round(320 * scale), h = Math.round(height), cv = mk(w, h + 2), c = cv.getContext('2d');
  const bark = BARK[species].map((b) => (haze ? mix(b, SKY_LOW, haze) : b));
  const cx = w / 2, tw = Math.max(5, Math.round(26 * scale));
  const crownBase = h - (GROUND_Y - crownY) * scale; // where the trunk splits into limbs
  const limbs = [];

  const seg = (x0, y0, x1, y1, th) => {
    thick(c, x0, y0, x1, y1, th, bark[1]);
    if (th >= 2.5) {
      thick(c, x0, y0 - th * 0.22, x1, y1 - th * 0.22, th * 0.5, bark[2]); // top-lit upper side
      thick(c, x0, y0 - th * 0.38, x1, y1 - th * 0.38, 1, bark[3]);
      thick(c, x0, y0 + th * 0.4, x1, y1 + th * 0.4, 1, bark[0]); // shadowed underside
    } else if (th >= 1.6) thick(c, x0, y0 - 0.5, x1, y1 - 0.5, 1, bark[2]);
  };
  // Oak limbs are "elbowed": each run changes direction abruptly a few times.
  const grow = (x, y, ang, len, th, depth) => {
    const parts = 2 + ((Math.random() * 2) | 0);
    for (let i = 0; i < parts; i++) {
      ang += rand(-0.6, 0.6);
      ang = clamp(ang, -Math.PI + 0.3, -0.3); // keep reaching upward
      const l = len / parts, nx = x + Math.cos(ang) * l, ny = y + Math.sin(ang) * l;
      seg(x, y, nx, ny, th);
      x = nx; y = ny;
      th *= 0.86;
      if (depth > 0 && Math.random() < 0.5) grow(x, y, ang + rand(-1, 1), len * 0.45, th * 0.6, depth - 1);
    }
    if (depth <= 0 || th < 1) {
      for (let k = 0; k < 5; k++) { // twig spray
        const a = ang + rand(-1.1, 1.1), l = rand(3, 10) * scale;
        thick(c, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 1, bark[2]);
      }
      if (Math.random() < leaves) limbs.push([x, y]);
      return;
    }
    const kids = 2 + ((Math.random() * 2) | 0);
    for (let k = 0; k < kids; k++) grow(x, y, ang + rand(-0.75, 0.75), len * rand(0.55, 0.75), th * 0.62, depth - 1);
  };

  // crown first, so the trunk sits on top where the limbs leave it
  const nLimbs = 3 + ((Math.random() * 2) | 0);
  for (let i = 0; i < nLimbs; i++) {
    const a = -Math.PI / 2 + (i / (nLimbs - 1) - 0.5) * rand(1.8, 2.4);
    grow(cx + rand(-tw * 0.3, tw * 0.3), crownBase + rand(0, 10 * scale), a, rand(80, 115) * scale, tw * 0.5, 4);
  }
  // a couple of upward limbs leaving the trunk lower down (never horizontal, so they don't read as tracks)
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    grow(cx + side * tw * 0.3, crownBase + rand(20, 50) * scale, -Math.PI / 2 + side * rand(0.5, 0.8), rand(40, 60) * scale, tw * 0.3, 2);
  }

  // trunk: tapering, with a root flare, shaded as a cylinder, bark textured per species
  for (let y = Math.floor(crownBase - 6); y <= h + 1; y++) {
    const u = (y - crownBase) / (h - crownBase);
    const half = (tw * (0.55 + 0.45 * clamp(u, 0, 1)) + (u > 0.9 ? (u - 0.9) * 10 * tw * 0.6 : 0)) / 2;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const r = (x - cx) / Math.max(1, half); // -1..1 across the trunk
      let b = 0.75 - r * r * 0.55 - r * 0.08; // round, a touch brighter on the left
      const ridgeX = Math.floor((x - cx + 40) / (species === 'white' ? 4 : 3));
      if (species === 'white') { // blocky, flaking plates
        if (hash(ridgeX * 3.1 + Math.floor(y / 6) * 1.7) > 0.72 && (y % 6 === 0 || (x & 3) === 0)) b -= 0.4;
      } else if (((x - cx + 40) % 3 === 0) || hash(ridgeX * 5.3 + Math.floor(y / 9)) > 0.8) b -= 0.38; // vertical furrows
      if (hash(x * 9.7 + y * 3.3) > 0.93) b += 0.18;
      px(c, x, y, 1, 1, ramp(bark, b, x, y));
    }
  }
  // the odd clump of marcescent leaves high in the crown
  for (const [x, y] of limbs) {
    const cl = makeLeafCluster(species, scale < 0.7 ? 0 : 0.6);
    c.globalAlpha = haze ? 1 - haze * 0.6 : 1;
    c.drawImage(cl, Math.round(x - cl.width / 2), Math.round(y - 1));
    c.globalAlpha = 1;
  }
  return cv;
}

// Draw a sprite whose upper rows sway a little in the wind (the trunk base stays put).
export function drawSway(c, img, x, y, t, amp, seed, step = 3, until = img.height) {
  const h = img.height, w = img.width;
  for (let sy = 0; sy < h; sy += step) {
    const k = Math.max(0, 1 - sy / until);
    const off = sy < until ? Math.round(Math.sin(t * 1.1 + seed + sy * 0.05) * amp * k + Math.sin(t * 2.3 + seed * 2) * 0.4 * k) : 0;
    c.drawImage(img, 0, sy, w, Math.min(step, h - sy), Math.round(x) + off, Math.round(y) + sy, w, Math.min(step, h - sy));
  }
}

// Cumulus cloud: puffs that slowly breathe so the shape keeps subtly changing.
export function makeCloud(w) {
  const puffs = [];
  const n = 5 + ((w / 14) | 0);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    puffs.push({ dx: (u - 0.5) * w + rand(-4, 4), dy: -Math.sin(u * Math.PI) * rand(6, 13), r: rand(7, 13) * (0.6 + Math.sin(u * Math.PI) * 0.6), ph: rand(6.28), sp: rand(0.08, 0.2) });
  }
  return puffs;
}
export function drawCloud(c, cl, x, y, t) {
  const r = (p) => p.r + Math.sin(t * p.sp + p.ph) * 1.6;
  for (const p of cl) ellipse(c, x + p.dx, y + p.dy + 2, r(p), r(p) * 0.7, '#b9cbe0');
  for (const p of cl) ellipse(c, x + p.dx, y + p.dy, r(p) - 1, (r(p) - 1) * 0.7, '#e9f1f9');
  for (const p of cl) if (p.dy < -4) ellipse(c, x + p.dx - 1, y + p.dy - 2, (r(p) - 2) * 0.6, (r(p) - 2) * 0.4, '#ffffff');
}
