// The five heroes: definitions, the shared face, and how each one is drawn.
// Every hero is drawn with its feet at the origin, facing right.
import { INK, TAU, fs, circ, ell, rr, poly, star, line, limb } from './util.js';
const PI = Math.PI;

// One face for everybody (heroes, enemies, bosses) so emotions read the same everywhere.
// expr: run | effort | ouch | scared | joy | awe
export function face(c, cx, cy, r, expr, t, dir = 1) {
  c.save();
  c.translate(cx, cy);
  c.scale(dir, 1);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const x1 = -r * 0.2, x2 = r * 0.52, ey = -r * 0.12, er = r * 0.3, mx = r * 0.2, my = r * 0.5;
  const eye = (x, rx, ry, pr, px = 0, py = 0) => {
    ell(c, x, ey, rx, ry);
    fs(c, '#fff', 2);
    circ(c, x + px, ey + py, pr);
    c.fillStyle = INK;
    c.fill();
  };
  const brow = (x, a, up = 0) => line(c, x - er, ey - er * 1.55 - up - a * er, x + er, ey - er * 1.55 - up + a * er, INK, 3.2);
  switch (expr) {
    case 'effort':
      eye(x1, er * 0.9, er * 0.5, er * 0.3, er * 0.2);
      eye(x2, er * 0.9, er * 0.5, er * 0.3, er * 0.2);
      brow(x1, 0.55, -er * 0.5);
      brow(x2, -0.55, -er * 0.5);
      rr(c, mx - r * 0.42, my - r * 0.14, r * 0.84, r * 0.32, 4);
      fs(c, '#fff', 2);
      for (let i = 1; i < 4; i++) line(c, mx - r * 0.42 + i * r * 0.21, my - r * 0.14, mx - r * 0.42 + i * r * 0.21, my + r * 0.18, INK, 1.5);
      break;
    case 'ouch':
      c.strokeStyle = INK;
      c.lineWidth = 3.2;
      c.beginPath(); c.moveTo(x1 - er * 0.7, ey - er * 0.7); c.lineTo(x1 + er * 0.5, ey); c.lineTo(x1 - er * 0.7, ey + er * 0.7); c.stroke();
      c.beginPath(); c.moveTo(x2 + er * 0.7, ey - er * 0.7); c.lineTo(x2 - er * 0.5, ey); c.lineTo(x2 + er * 0.7, ey + er * 0.7); c.stroke();
      ell(c, mx, my + r * 0.06, r * 0.26, r * 0.34);
      fs(c, '#6d1b2e', 2);
      ell(c, mx, my + r * 0.24, r * 0.15, r * 0.1);
      c.fillStyle = '#ff8fa3';
      c.fill();
      break;
    case 'scared': {
      const j = Math.sin(t * 40) * er * 0.12;
      eye(x1, er, er * 1.35, er * 0.2, j, -j);
      eye(x2, er, er * 1.35, er * 0.2, j, j);
      brow(x1, -0.5, er * 0.5);
      brow(x2, 0.5, er * 0.5);
      c.beginPath();
      for (let i = 0; i <= 6; i++) {
        const x = mx - r * 0.4 + (i * r * 0.8) / 6, y = my + (i % 2 ? -1 : 1) * r * 0.09 + Math.sin(t * 30 + i);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.stroke();
      break;
    }
    case 'joy':
      c.strokeStyle = INK;
      c.lineWidth = 3.4;
      for (const x of [x1, x2]) { c.beginPath(); c.arc(x, ey + er * 0.35, er * 0.8, PI * 1.12, PI * 1.88); c.stroke(); }
      c.beginPath(); c.arc(mx, my - r * 0.16, r * 0.5, 0, PI); c.closePath();
      fs(c, '#7a1f33', 2);
      ell(c, mx, my + r * 0.2, r * 0.22, r * 0.1);
      c.fillStyle = '#ff8fa3';
      c.fill();
      c.fillStyle = 'rgba(255,90,120,.35)';
      ell(c, x1 - er * 0.9, ey + er * 1.5, er * 0.7, er * 0.4); c.fill();
      ell(c, x2 + er * 0.6, ey + er * 1.5, er * 0.7, er * 0.4); c.fill();
      break;
    case 'awe':
      for (const x of [x1, x2]) {
        eye(x, er * 1.15, er * 1.3, er * 0.8);
        c.fillStyle = '#fff';
        circ(c, x - er * 0.3, ey - er * 0.4, er * 0.3); c.fill();
        circ(c, x + er * 0.3, ey + er * 0.3, er * 0.15); c.fill();
      }
      brow(x1, -0.2, er * 0.7);
      brow(x2, 0.2, er * 0.7);
      ell(c, mx, my, r * 0.13, r * 0.16);
      fs(c, '#6d1b2e', 2);
      break;
    default:
      eye(x1, er * 0.85, er, er * 0.42, er * 0.3);
      eye(x2, er * 0.85, er, er * 0.42, er * 0.3);
      brow(x1, 0.4);
      brow(x2, -0.4);
      c.beginPath(); c.arc(mx, my - r * 0.22, r * 0.46, PI * 0.12, PI * 0.88); c.closePath();
      fs(c, '#fff', 2);
  }
  c.restore();
}

// ---- per-hero bodies. Origin = hip centre, y negative is up. `a` = action pop (1 -> 0).

function barbarian(c, h, S, a) {
  circ(c, -30, -34, 12); fs(c, h.skin);
  rr(c, -32, -58, 64, 58, 20); fs(c, h.skin);
  line(c, -26, -50, 26, -16, '#6b3f1d', 7);
  poly(c, [-33, -22, 33, -22, 33, -2, 22, 6, 11, -2, 0, 6, -11, -2, -22, 6, -33, -2]); fs(c, '#8a5a2b');
  const hx = 6, hy = -74;
  poly(c, [hx - 24, hy + 4, hx - 31, hy - 14, hx - 19, hy - 12, hx - 21, hy - 33, hx - 7, hy - 22, hx, hy - 39, hx + 8, hy - 22, hx + 21, hy - 31, hx + 16, hy - 10, hx + 24, hy]);
  fs(c, '#e2571e');
  circ(c, hx, hy, 22); fs(c, h.skin);
  poly(c, [hx - 21, hy + 5, hx + 25, hy + 5, hx + 21, hy + 24, hx + 11, hy + 20, hx + 4, hy + 35, hx - 4, hy + 20, hx - 14, hy + 25]);
  fs(c, '#e2571e');
  face(c, hx, hy - 4, 22, S.expr, S.t);
  // the punching arm: fist balloons and rockets forward
  const fx = 38 + a * 58, fy = -36, fr = 15 + a * 14;
  if (a > 0.25) {
    c.globalAlpha = a;
    for (let i = 0; i < 4; i++) line(c, fx - 40 - i * 14, fy - 24 + i * 15, fx - 90 - i * 10, fy - 24 + i * 15, '#fff', 4);
    star(c, fx + fr, fy, 34 * a + 10, 8, S.t * 9, 0.5); fs(c, '#ffe066', 2);
    c.globalAlpha = 1;
  }
  limb(c, 24, -42, fx - 6, fy, h.skin, 13);
  circ(c, fx, fy, fr); fs(c, h.skin);
  line(c, fx + fr * 0.2, fy - fr * 0.6, fx + fr * 0.2, fy + fr * 0.6, INK, 2);
  line(c, fx + fr * 0.55, fy - fr * 0.45, fx + fr * 0.55, fy + fr * 0.45, INK, 2);
}

function druid(c, h, S, a) {
  const sway = Math.sin(S.t * 3) * 2;
  // staff
  line(c, 22, 20, 26, -112, INK, 9);
  line(c, 22, 20, 26, -112, '#8a5a2b', 5);
  c.beginPath(); c.arc(21, -114, 8, -PI * 0.2, PI * 1.3); c.strokeStyle = '#8a5a2b'; c.lineWidth = 5; c.stroke();
  ell(c, 30, -124, 8, 4, -0.6 + a); fs(c, '#7ddc5a', 2);
  // long hair down the back
  rr(c, -18, -104, 12, 44, 6); fs(c, '#2d6a34');
  // robe
  c.beginPath(); c.moveTo(-13, -78); c.lineTo(13, -78); c.quadraticCurveTo(18, -30, 22, 0); c.lineTo(-22, 0); c.quadraticCurveTo(-18, -30, -13, -78); c.closePath();
  fs(c, '#3f9d4b');
  line(c, -17, -34, 17, -34, '#d9b23a', 4);
  ell(c, 0, -34, 5, 5); fs(c, '#ffe27a', 2);
  const hx = 2, hy = -92;
  // antlers
  for (const s of [-1, 1]) {
    line(c, hx + s * 8, hy - 12, hx + s * 17 + sway, hy - 38, '#7a5230', 4.5);
    line(c, hx + s * 13 + sway * 0.5, hy - 26, hx + s * 25 + sway, hy - 30, '#7a5230', 4);
  }
  circ(c, hx, hy, 17); fs(c, h.skin);
  ell(c, hx - 3, hy - 13, 17, 8); fs(c, '#2d6a34');
  ell(c, hx + 10, hy - 17, 7, 3.5, 0.5); fs(c, '#7ddc5a', 2);
  ell(c, hx - 10, hy - 18, 7, 3.5, -0.5); fs(c, '#7ddc5a', 2);
  face(c, hx, hy + 1, 16, S.expr, S.t);
  limb(c, 8, -62, 22, -54 - a * 18, '#3f9d4b', 7);
  circ(c, 23, -54 - a * 18, 5.5); fs(c, h.skin, 2);
}

function wizard(c, h, S, a) {
  // staff + glowing orb
  line(c, 26, 8, 28, -54 - a * 12, INK, 8);
  line(c, 26, 8, 28, -54 - a * 12, '#8a5a2b', 4);
  circ(c, 28, -60 - a * 12, 8 + a * 5); fs(c, a > 0.1 ? '#fff3b0' : '#ff9f43');
  // robe
  rr(c, -24, -38, 48, 40, 15); fs(c, '#6b4de6');
  c.fillStyle = '#ffe27a';
  for (const [x, y] of [[-14, -22], [12, -12], [-4, -8], [14, -28]]) { star(c, x, y, 3.5, 4, 0.3); c.fill(); }
  const hx = 3, hy = -50;
  circ(c, hx, hy, 18); fs(c, h.skin);
  poly(c, [hx - 16, hy + 4, hx + 20, hy + 4, hx + 14, hy + 26, hx + 4, hy + 46, hx - 8, hy + 26]); fs(c, '#f4f1ea');
  face(c, hx, hy, 17, S.expr, S.t);
  // enormous floppy hat
  const wob = Math.sin(S.t * S.runF) * 3;
  ell(c, hx, hy - 13, 28, 7.5); fs(c, '#4a34b0');
  c.beginPath(); c.moveTo(hx - 19, hy - 15); c.quadraticCurveTo(hx - 4, hy - 48, hx - 24 + wob, hy - 76);
  c.quadraticCurveTo(hx + 8, hy - 54, hx + 19, hy - 15); c.closePath();
  fs(c, '#6b4de6');
  line(c, hx - 17, hy - 19, hx + 17, hy - 19, '#ffe27a', 4);
  star(c, hx - 2, hy - 38, 7, 5, wob * 0.1); fs(c, '#ffe27a', 2);
}

function cleric(c, h, S, a) {
  rr(c, -27, -50, 54, 52, 22); fs(c, '#fbf7ef');
  c.fillStyle = '#2ec4b6'; c.fillRect(-7, -48, 14, 48);
  rr(c, -27, -50, 54, 52, 22); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
  star(c, 0, -24, 8, 8, S.t, 0.6); fs(c, '#ffd23f', 2);
  const hx = 2, hy = -62;
  circ(c, hx - 8, hy - 22, 10); fs(c, '#3a2a3a');
  circ(c, hx - 2, hy - 3, 20.5); fs(c, '#3a2a3a');
  circ(c, hx + 2, hy + 1, 18); fs(c, h.skin);
  c.beginPath(); c.arc(hx + 2, hy + 1, 18, PI * 1.15, PI * 1.9); c.strokeStyle = '#ffd23f'; c.lineWidth = 4; c.stroke();
  c.fillStyle = 'rgba(255,90,120,.3)';
  ell(c, hx - 6, hy + 8, 5, 3); c.fill();
  ell(c, hx + 15, hy + 8, 4, 3); c.fill();
  face(c, hx + 2, hy + 1, 17, S.expr, S.t);
  // arms fling up when the orb goes out
  for (const s of [-1, 1]) {
    const hx2 = s * (26 + a * 8), hy2 = -30 - a * 44;
    limb(c, s * 20, -38, hx2, hy2, '#fbf7ef', 8);
    circ(c, hx2, hy2, 6); fs(c, h.skin, 2);
  }
}

function paladin(c, h, S, a) {
  const wob = Math.sin(S.t * S.runF * 0.5) * 4;
  poly(c, [-20, -66, -40 - wob, -8, -12, -4]); fs(c, '#3b6fd4');
  // sword goes up when the blessing is called
  if (a > 0.02) {
    const tipx = -30, tipy = -84 - a * 60;
    line(c, -24, -52, tipx, tipy, INK, 9);
    line(c, -24, -52, tipx, tipy, '#f4f7ff', 5);
    line(c, -33, -60, -15, -64, '#ffd23f', 5);
    star(c, tipx, tipy, 14 * a + 4, 4, S.t * 6, 0.3); fs(c, '#fff8c9', 1.5);
  }
  rr(c, -25, -72, 50, 74, 12); fs(c, '#cfd6e4');
  line(c, 0, -68, 0, -2, '#ffd23f', 3);
  line(c, -24, -18, 24, -18, '#ffd23f', 5);
  circ(c, -22, -64, 11); fs(c, '#e9eef7');
  circ(c, 22, -64, 11); fs(c, '#e9eef7');
  const hx = 3, hy = -86;
  circ(c, hx, hy, 18); fs(c, h.skin);
  face(c, hx, hy + 1, 17, S.expr, S.t);
  // helmet + plume
  c.beginPath(); c.moveTo(hx - 8, hy - 20); c.quadraticCurveTo(hx - 12, hy - 54, hx - 38, hy - 34 + wob); c.quadraticCurveTo(hx - 18, hy - 34, hx + 2, hy - 19); c.closePath();
  fs(c, '#f5c542');
  c.beginPath(); c.arc(hx, hy - 2, 19.5, PI, TAU); c.closePath(); fs(c, '#cfd6e4');
  rr(c, hx - 21, hy - 4, 8, 17, 3); fs(c, '#cfd6e4');
  line(c, hx - 19, hy - 3, hx + 19, hy - 3, '#ffd23f', 3.5);
  // shield
  c.beginPath(); c.moveTo(8, -58); c.lineTo(40, -58); c.lineTo(40, -36); c.quadraticCurveTo(38, -14, 24, -6); c.quadraticCurveTo(10, -14, 8, -36); c.closePath();
  fs(c, '#3b6fd4');
  star(c, 24, -36, 9, 8, 0, 0.55); fs(c, '#ffd23f', 2);
}

// Draw order is back-to-front, so this order *is* their placement in the crowd.
export const HEROES = [
  { id: 'pal', name: 'Paladin', key: 'G', color: '#f5c542', skin: '#c58c5c', dx: -50, w: 50, bh: 72, leg: 22, legc: '#9aa3b5', boot: '#6b7286', phase: 1.3, draw: paladin },
  { id: 'druid', name: 'Druid', key: 'S', color: '#4caf50', skin: '#9a6238', dx: -12, w: 34, bh: 78, leg: 26, legc: '#2f7a3a', boot: '#6b4a2b', phase: 2.6, draw: druid },
  { id: 'barb', name: 'Barbarian', key: 'A', color: '#e4572e', skin: '#f0b48a', dx: 18, w: 64, bh: 58, leg: 16, legc: '#f0b48a', boot: '#6b3f1d', phase: 0, draw: barbarian },
  { id: 'cleric', name: 'Cleric', key: 'F', color: '#2ec4b6', skin: '#e3b27e', dx: -34, w: 54, bh: 50, leg: 12, legc: '#fbf7ef', boot: '#2a9d8f', phase: 4.1, draw: cleric },
  { id: 'wiz', name: 'Wizard', key: 'D', color: '#8468ff', skin: '#4a2d1b', dx: 56, w: 46, bh: 38, leg: 8, legc: '#4a34b0', boot: '#33247e', phase: 5.2, draw: wizard },
];
export const HERO = Object.fromEntries(HEROES.map((h) => [h.id, h]));

function halo(c, x, y, r, k, t) {
  const g = c.createRadialGradient(x, y, 4, x, y, r);
  g.addColorStop(0, `rgba(255,244,170,${0.85 * k})`);
  g.addColorStop(0.5, `rgba(255,214,90,${0.4 * k})`);
  g.addColorStop(1, 'rgba(255,214,90,0)');
  c.fillStyle = g;
  circ(c, x, y, r);
  c.fill();
  c.save();
  c.translate(x, y);
  c.rotate(t * 1.5);
  c.fillStyle = `rgba(255,250,200,${0.35 * k})`;
  for (let i = 0; i < 8; i++) {
    c.rotate(TAU / 8);
    poly(c, [0, 0, r * 1.5, -7, r * 1.5, 7]);
    c.fill();
  }
  c.restore();
}

function drawHero(c, h, S) {
  const a = S.act[h.id] || 0, ph = S.t * S.runF + h.phase;
  c.save();
  c.translate(h.dx + a * 12, -a * 5);
  const glow = Math.max(S.enh[h.id] || 0, h.id === 'pal' ? S.bless : 0);
  if (glow > 0) halo(c, 0, -h.leg - h.bh * 0.6, 74, Math.min(1, glow * 2), S.t);
  const sc = 1 + a * 0.1;
  c.scale(sc, sc);
  const bob = S.air ? 0 : Math.sin(ph * 2) * 2.5;
  for (const s of [-1, 1]) {
    const p2 = ph + (s > 0 ? 0 : PI);
    const sw = S.air ? s * 0.7 : Math.sin(p2), lift = S.air ? 5 : Math.max(0, Math.cos(p2)) * 6;
    const fx = s * h.w * 0.14 + sw * h.leg * 0.45, fy = -lift;
    limb(c, s * h.w * 0.16, -h.leg + bob, fx, fy - 4, h.legc, 6);
    ell(c, fx + 4, fy - 4, 8, 5);
    fs(c, h.boot, 2);
  }
  c.translate(0, -h.leg + bob);
  h.draw(c, h, S, a);
  c.restore();
}

// S: { t, runF, expr, air, act:{id:0..1}, enh:{id:secs}, bless, lean, sq }
export function drawParty(c, x, y, S) {
  c.save();
  c.translate(x, y);
  c.rotate(S.lean);
  c.scale(1 + S.sq * 0.6, 1 - S.sq * 0.6);
  for (const h of HEROES) drawHero(c, h, S);
  c.restore();
}

// Simple white glyphs for the action buttons.
export function drawIcon(c, id, x, y, s) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = '#fff';
  c.strokeStyle = '#fff';
  c.lineWidth = 2.5;
  c.lineCap = 'round';
  switch (id) {
    case 'barb':
      rr(c, -9, -8, 19, 16, 5); c.fill();
      rr(c, -12, -1, 8, 9, 3); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5;
      for (const lx of [-3, 2, 7]) { c.beginPath(); c.moveTo(lx, -8); c.lineTo(lx, -1); c.stroke(); }
      break;
    case 'druid':
      ell(c, 0, 0, 12, 6, -0.7); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-8, 7); c.lineTo(8, -7); c.stroke();
      break;
    case 'wiz':
      c.beginPath(); c.moveTo(0, -13); c.quadraticCurveTo(12, 0, 6, 9); c.quadraticCurveTo(0, 14, -6, 9); c.quadraticCurveTo(-12, 0, 0, -13); c.fill();
      break;
    case 'cleric':
      circ(c, 0, 0, 10); c.stroke();
      c.beginPath(); c.moveTo(0, -5); c.lineTo(0, 5); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke();
      break;
    default:
      star(c, 0, 0, 13, 4, 0, 0.35); c.fill();
  }
  c.restore();
}
