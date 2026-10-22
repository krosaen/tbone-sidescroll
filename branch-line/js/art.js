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

// ---------- colour ----------
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = (r, g, b) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

// Autumn foliage palettes, dark -> light.
export const PALS = {
  maple: ['#6e1a10', '#a12e1a', '#d24e28', '#f2803e'],
  orange: ['#7e360e', '#bb5714', '#e58a2a', '#ffbc55'],
  gold: ['#7c5e10', '#b98f1a', '#e3c037', '#fbe983'],
  turning: ['#3b561c', '#5c7d25', '#93a83a', '#cdd05c'],
  oak: ['#46181b', '#6c2427', '#963f2c', '#c46c3e'],
};
const PAL_KEYS = Object.keys(PALS);
export const LEAF_COLS = ['#d24e28', '#f2803e', '#e58a2a', '#ffbc55', '#e3c037', '#fbe983', '#a12e1a', '#963f2c', '#c46c3e', '#93a83a'];
export const SKY_TOP = '#2c6bd0', SKY_LOW = '#a6d0f0';

function mk(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

// 4x4 Bayer matrix for dithered gradients.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export function makeSky() {
  const cv = mk(W, GROUND_Y), c = cv.getContext('2d');
  const stops = ['#2a66cc', '#3374d4', '#3f82da', '#4c90df', '#5b9ee3', '#6cabe7', '#7eb8ea', '#90c3ec', '#a6d0f0'];
  const img = c.createImageData(W, GROUND_Y);
  const cols = stops.map(rgb);
  for (let y = 0; y < GROUND_Y; y++) {
    const f = (y / GROUND_Y) * (stops.length - 1), i = Math.floor(f), fr = f - i;
    for (let x = 0; x < W; x++) {
      const col = cols[Math.min(stops.length - 1, i + (fr > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0))];
      const o = (y * W + x) * 4;
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

// Rolling hills covered in distant autumn forest. `haze` pulls colours toward the sky.
export function makeHills(seed, base, height, haze) {
  const w = 960, h = height + 30, cv = mk(w, h), c = cv.getContext('2d');
  const ridge = (x) => {
    const u = (x / w) * Math.PI * 2;
    return 22 + Math.sin(u * 2 + seed) * 9 + Math.sin(u * 5 + seed * 3) * 5 + Math.sin(u * 11 + seed) * 2;
  };
  const tint = (col) => mix(col, SKY_LOW, haze);
  for (let x = 0; x < w; x++) {
    const top = Math.round(ridge(x));
    for (let y = top; y < h; y += 2) px(c, x, y, 1, 2, tint(mix(base, '#1c1408', (y - top) / h * 0.5)));
  }
  // treetops along the ridge and a dense speckle of leaf colours below it
  for (let i = 0; i < w / 3; i++) {
    const x = (i * 3 + hash(i + seed) * 3) | 0, r = 2 + ((hash(i * 7 + seed) * 3) | 0);
    const col = LEAF_COLS[(hash(i * 13 + seed) * LEAF_COLS.length) | 0];
    ellipse(c, x, ridge(x) + 1, r, r - 1, tint(mix(col, '#000000', 0.25)));
    ellipse(c, x, ridge(x), r - 1, r - 2, tint(col));
  }
  for (let i = 0; i < w * 9; i++) {
    const x = (rand(w)) | 0, y = ridge(x) + 2 + rand(h);
    const col = LEAF_COLS[(Math.random() * LEAF_COLS.length) | 0];
    px(c, x, y, 2, 2, tint(mix(col, '#1a1408', 0.15 + (y / h) * 0.45)));
  }
  return cv;
}

// A dense, top-lit canopy of autumn leaves.
export function makeCanopy(w, h, palKey, haze = 0) {
  const cv = mk(w, h), c = cv.getContext('2d');
  const pal = PALS[palKey], alt = PALS[PAL_KEYS[(PAL_KEYS.indexOf(palKey) + 1 + ((Math.random() * 3) | 0)) % PAL_KEYS.length]];
  const t = (col) => (haze ? mix(col, SKY_LOW, haze) : col);
  const blobs = [];
  const nb = 2 + Math.floor(w / 55);
  for (let i = 0; i < nb; i++) {
    blobs.push({ x: w * (0.14 + (0.72 * i) / Math.max(1, nb - 1)) + rand(-6, 6), y: h * rand(0.5, 0.62), r: Math.min(w * 0.3, h * 0.48) * rand(0.75, 1) });
  }
  blobs.push({ x: w * rand(0.35, 0.65), y: h * 0.35, r: h * 0.38 });
  const inside = (x, y) => blobs.some((b) => (x - b.x) ** 2 + (y - b.y) ** 2 < b.r * b.r);
  const cl = [];
  for (let i = 0; i < (w * h) / 12; i++) {
    const x = rand(w), y = rand(h);
    if (inside(x, y)) cl.push({ x, y, r: 2 + ((Math.random() * 3.5) | 0), p: Math.random() < 0.16 ? alt : pal });
  }
  cl.sort((a, b) => a.y - b.y);
  for (const k of cl) {
    const sh = k.y / h; // lower = more shade
    ellipse(c, k.x, k.y + 1, k.r, k.r * 0.8, t(mix(k.p[0], '#140a08', sh * 0.35)));
    ellipse(c, k.x, k.y, k.r - 1, (k.r - 1) * 0.8, t(sh > 0.62 ? k.p[1] : k.p[2]));
    if (sh < 0.75) ellipse(c, k.x - 1, k.y - 1, (k.r - 1) * 0.5, (k.r - 1) * 0.35, t(sh > 0.4 ? k.p[2] : k.p[3]));
  }
  // individual crisp leaves
  for (let i = 0; i < (w * h) / 6; i++) {
    const x = rand(w), y = rand(h);
    if (!inside(x, y)) continue;
    const p = Math.random() < 0.2 ? alt : pal;
    px(c, x, y, Math.random() < 0.5 ? 2 : 1, 1, t(p[y / h < 0.45 ? 3 : y / h < 0.7 ? 2 : 1]));
  }
  // a few leaves poking off the silhouette
  for (let i = 0; i < w / 2; i++) {
    const b = blobs[(Math.random() * blobs.length) | 0], a = rand(Math.PI * 2);
    px(c, b.x + Math.cos(a) * (b.r + 1), b.y + Math.sin(a) * (b.r + 1), 1, 1, t(pal[2]));
  }
  return cv;
}

export const randomPal = () => PAL_KEYS[(Math.random() * PAL_KEYS.length) | 0];

export function makeTrunk(w, h, haze = 0) {
  const cv = mk(w, h), c = cv.getContext('2d');
  const dark = '#33231a', mid = '#5a3f2b', light = '#80603f';
  const t = (col) => (haze ? mix(col, SKY_LOW, haze) : col);
  for (let x = 0; x < w; x++) {
    const u = Math.abs((x + 0.5) / w * 2 - 1);
    const col = u > 0.75 ? dark : u > 0.35 ? mid : mix(mid, light, 0.6);
    px(c, x, 0, 1, h, t(col));
  }
  for (let i = 0; i < (w * h) / 40; i++) {
    const x = rand(1, w - 1) | 0, y = rand(h) | 0;
    px(c, x, y, 1, 3 + ((Math.random() * 7) | 0), t(Math.random() < 0.7 ? dark : light));
  }
  return cv;
}

export function makeGround() {
  const h = H - GROUND_Y, cv = mk(W, h), c = cv.getContext('2d');
  for (let x = 0; x < W; x++) {
    const n = hash(x * 0.37);
    px(c, x, 0, 1, h, mix('#6c8a2c', '#55701f', n * 0.6));
    px(c, x, 0, 1, 1, mix('#93ad44', '#7f9a36', n));
    if (hash(x * 1.7) > 0.6) px(c, x, -1 + 1, 1, 2 + ((hash(x * 3.1) * 3) | 0), '#88a43c');
  }
  for (let y = 3; y < h; y += 4) for (let x = 0; x < W; x += 3) if (hash(x * 9.1 + y) > 0.5) px(c, x, y + ((hash(x + y) * 3) | 0), 1, 1, '#4c6519');
  // fallen leaves
  for (let i = 0; i < 520; i++) {
    const x = rand(W) | 0, y = 2 + ((Math.random() ** 0.7) * (h - 3)) | 0;
    const col = LEAF_COLS[(Math.random() * LEAF_COLS.length) | 0];
    px(c, x, y, 2, 1, mix(col, '#3a2a10', y / h * 0.35));
    if (Math.random() < 0.4) px(c, x + 1, y - 1, 1, 1, col);
  }
  return cv;
}

// Small leaf tufts that sprout along branches.
export function makeTuft(palKey) {
  const cv = mk(11, 8), c = cv.getContext('2d'), p = PALS[palKey];
  px(c, 2, 5, 6, 1, '#5a3d27'); // twig
  for (let i = 0; i < 7; i++) {
    const x = rand(1, 10) | 0, y = rand(1, 6) | 0;
    px(c, x, y, Math.random() < 0.5 ? 2 : 1, 1, p[1 + ((Math.random() * 3) | 0)]);
  }
  px(c, 6, 2, 1, 1, p[3]);
  return cv;
}

// Draw a sprite in horizontal slices that sway more toward the top (wind in the canopy).
export function drawSway(c, img, x, y, t, amp, seed, step = 3) {
  const h = img.height, w = img.width;
  for (let sy = 0; sy < h; sy += step) {
    const off = Math.round(Math.sin(t * 1.1 + seed + sy * 0.06) * amp * (1 - sy / h) + Math.sin(t * 2.3 + seed * 2) * 0.4);
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
