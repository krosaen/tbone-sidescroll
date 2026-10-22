// Everything that draws. Reads game state, never changes it.
import { G, W, H, PX, GY, BTN } from './game.js';
import { HERO, drawParty, drawIcon } from './heroes.js';
import { drawEnemy, drawBoss } from './creatures.js';
import { INK, FONT, TAU, clamp, hash, fs, circ, ell, rr, poly, star, line } from './util.js';
const PI = Math.PI;

const darkCv = document.createElement('canvas');
darkCv.width = W;
darkCv.height = H;
const dc = darkCv.getContext('2d');

const font = (c, size, weight = 700) => (c.font = `${weight} ${size}px ${FONT}`);
function label(c, s, x, y, size, fill = '#fff', align = 'center', lw = 5) {
  font(c, size);
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.strokeText(s, x, y); }
  c.fillStyle = fill;
  c.fillText(s, x, y);
}

// ---------- background ----------
function motif(c, kind, x, b, s, h) {
  switch (kind) {
    case 'peaks': poly(c, [x - s, b, x, b - s * 1.4, x + s, b]); c.fill(); break;
    case 'dunes': ell(c, x, b, s * 1.7, s * 0.55); c.fill(); break;
    case 'trees':
      c.fillRect(x - s * 0.07, b - s, s * 0.14, s);
      circ(c, x, b - s, s * 0.46); c.fill();
      circ(c, x - s * 0.32, b - s * 0.8, s * 0.3); c.fill();
      circ(c, x + s * 0.32, b - s * 0.82, s * 0.33); c.fill();
      break;
    case 'pines':
      poly(c, [x - s * 0.4, b, x, b - s * 1.5, x + s * 0.4, b]); c.fill();
      poly(c, [x - s * 0.3, b - s * 0.5, x, b - s * 1.7, x + s * 0.3, b - s * 0.5]); c.fill();
      break;
    case 'pillars':
      c.fillRect(x - s * 0.12, 0, s * 0.24, b);
      c.fillRect(x - s * 0.2, 0, s * 0.4, 26 + h * 20);
      c.fillRect(x - s * 0.2, b - s * 0.5, s * 0.4, s * 0.5);
      break;
    case 'columns':
      c.fillRect(x - s * 0.1, b - s * (0.8 + h), s * 0.2, s * 2);
      c.fillRect(x - s * 0.18, b - s * (0.8 + h) - s * 0.1, s * 0.36, s * 0.12);
      break;
    case 'towers': {
      const th = s * (1.1 + h * 0.8);
      c.fillRect(x - s * 0.22, b - th, s * 0.44, th);
      for (let i = 0; i < 3; i++) c.fillRect(x - s * 0.28 + i * s * 0.22, b - th - s * 0.12, s * 0.13, s * 0.14);
      if (h > 0.5) { poly(c, [x - s * 0.3, b - th - s * 0.1, x, b - th - s * 0.7, x + s * 0.3, b - th - s * 0.1]); c.fill(); }
      break;
    }
    case 'bushes':
      circ(c, x, b - s * 0.2, s * 0.4); c.fill();
      circ(c, x - s * 0.4, b - s * 0.1, s * 0.3); c.fill();
      circ(c, x + s * 0.4, b - s * 0.12, s * 0.32); c.fill();
      break;
    case 'mushrooms':
      c.fillRect(x - s * 0.08, b - s * 0.7, s * 0.16, s * 0.7);
      c.beginPath(); c.arc(x, b - s * 0.7, s * 0.42, PI, 0); c.fill();
      break;
    case 'clouds': {
      const y = b - s * (0.6 + h * 1.8);
      ell(c, x, y, s * 0.9, s * 0.26); c.fill();
      circ(c, x - s * 0.3, y - s * 0.12, s * 0.3); c.fill();
      circ(c, x + s * 0.2, y - s * 0.2, s * 0.36); c.fill();
      break;
    }
    case 'stalactites':
      poly(c, [x - s * 0.28, 0, x + s * 0.28, 0, x, s * (0.9 + h)]); c.fill();
      poly(c, [x + s * 0.3, b, x + s * 0.5, b - s * (0.3 + h * 0.5), x + s * 0.7, b]); c.fill();
      break;
    case 'crystals':
      poly(c, [x - s * 0.22, b, x - s * 0.12, b - s, x + s * 0.04, b - s * 1.2, x + s * 0.2, b]); c.fill();
      poly(c, [x + s * 0.1, b, x + s * 0.3, b - s * 0.6, x + s * 0.42, b]); c.fill();
      break;
  }
}
function layer(c, kind, color, f, sp, base, size, seed) {
  const off = G.camX * f, i0 = Math.floor(off / sp) - 1, n = Math.ceil(W / sp) + 3;
  c.fillStyle = color;
  for (let i = i0; i < i0 + n; i++) {
    const h1 = hash(i * 7.3 + seed), h2 = hash(i * 3.1 + seed + 9);
    motif(c, kind, i * sp - off + h1 * sp * 0.5, base, size * (0.6 + h2 * 0.8), h1);
  }
}
const MOTE = {
  dust: ['rgba(255,255,255,.25)', 8, 3], petals: ['rgba(255,182,193,.8)', 40, 5], fireflies: ['rgba(214,255,120,.9)', -6, 3.5],
  feathers: ['rgba(255,255,255,.8)', 22, 5], sparkles: ['rgba(160,250,255,.9)', -10, 3], snow: ['rgba(255,255,255,.9)', 60, 3.5], embers: ['rgba(255,150,40,.9)', -70, 3],
};
function motes(c, th, t) {
  const [col, vy, sz] = MOTE[th.mote] || MOTE.dust;
  c.fillStyle = col;
  for (let i = 0; i < 28; i++) {
    const x = ((((hash(i) * 1400 - G.camX * (0.5 + hash(i + 3) * 0.4) - t * 20) % 1100) + 1100) % 1100) - 60;
    const y = (((hash(i + 40) * GY + t * vy * (0.5 + hash(i + 7))) % GY) + GY) % GY;
    const tw = th.mote === 'fireflies' || th.mote === 'sparkles' ? 0.5 + 0.5 * Math.sin(t * 4 + i) : 1;
    circ(c, x, y + Math.sin(t * 2 + i) * 8, sz * tw * (0.6 + hash(i + 11) * 0.8));
    c.fill();
  }
}

// ---------- props ----------
function drawProp(c, e, t, th) {
  const x = e.x, y = e.y;
  switch (e.type) {
    case 'wall':
      if (e.broken) { ell(c, x - 8, y - 4, 22, 8); fs(c, '#a8743a', 2); break; }
      for (let i = 0; i < 5; i++) {
        const by = y - 35 * (i + 1), bx = x - 28 + (i % 2 ? 3 : -3);
        rr(c, bx, by, 56, 35, 5); fs(c, i % 2 ? '#c58b4a' : '#d69a55');
        line(c, bx + 7, by + 7, bx + 49, by + 28, '#a8743a', 4);
        line(c, bx + 49, by + 7, bx + 7, by + 28, '#a8743a', 4);
      }
      break;
    case 'gate': {
      if (e.broken) {
        for (const bx of [-30, 20]) { rr(c, x + bx, y - e.h - 10, 10, e.h + 10, 3); fs(c, '#565d70'); }
        rr(c, x - 32, y - e.h - 34, 64, 36, 6); fs(c, '#6b7286');
        break;
      }
      const hh = e.h * (1 - (e.lift || 0) * 0.92), topY = y - e.h;
      for (const bx of [-30, 20]) { rr(c, x + bx, topY - 10, 10, e.h + 10, 3); fs(c, '#565d70'); } // stone frame
      c.strokeStyle = INK; c.lineWidth = 9; c.lineCap = 'butt';
      for (const bx of [-14, 0, 14]) { c.beginPath(); c.moveTo(x + bx, topY); c.lineTo(x + bx, topY + hh); c.stroke(); }
      c.strokeStyle = e.flash > 0 ? '#fff' : '#8d99ae'; c.lineWidth = 5;
      for (const bx of [-14, 0, 14]) { c.beginPath(); c.moveTo(x + bx, topY); c.lineTo(x + bx, topY + hh); c.stroke(); }
      for (let yy = topY + 30; yy < topY + hh; yy += 40) line(c, x - 18, yy, x + 18, yy, '#8d99ae', 5);
      rr(c, x - 32, topY - 34, 64, 36, 6); fs(c, '#6b7286');
      circ(c, x, topY - 16, 7); fs(c, e.open ? '#7dffb0' : '#ff5d73', 2);
      break;
    }
    case 'spikes':
      for (let i = 0; i < 4; i++) {
        const sx = x - e.w / 2 + (i * e.w) / 4;
        poly(c, [sx, y, sx + e.w / 8, y - 22 - (i % 2) * 8, sx + e.w / 4, y]); fs(c, '#eef0f6', 2);
      }
      break;
    case 'ring': {
      line(c, x, y - 600, x, y - 18, 'rgba(0,0,0,.35)', 3);
      const pu = 0.5 + 0.5 * Math.sin(t * 6);
      if (!e.used) { circ(c, x, y, 24 + pu * 6); c.fillStyle = `rgba(125,220,90,${0.25 + pu * 0.2})`; c.fill(); }
      circ(c, x, y, 16); c.lineWidth = 9; c.strokeStyle = INK; c.stroke();
      c.lineWidth = 5; c.strokeStyle = e.used ? '#9aa3b5' : '#ffd23f'; c.stroke();
      ell(c, x - 12, y - 18, 8, 4, 0.6); fs(c, '#7ddc5a', 2);
      ell(c, x + 12, y - 18, 8, 4, -0.6); fs(c, '#7ddc5a', 2);
      break;
    }
    case 'switch':
      line(c, x, e.gy, x, y + 18, INK, 9);
      line(c, x, e.gy, x, y + 18, '#8a5a2b', 5);
      c.save(); c.translate(x, y); c.rotate(e.on ? 0.5 : Math.sin(t * 3) * 0.06);
      circ(c, 0, 0, 22); fs(c, e.on ? '#7dffb0' : '#ff5d73');
      circ(c, 0, 0, 14); fs(c, '#fff', 2);
      circ(c, 0, 0, 6); fs(c, e.on ? '#2a9d8f' : '#ff5d73', 2);
      c.restore();
      break;
    case 'brazier':
      line(c, x - 14, y, x, y - 44, INK, 8); line(c, x + 14, y, x, y - 44, INK, 8);
      line(c, x - 14, y, x, y - 44, '#6b7286', 4); line(c, x + 14, y, x, y - 44, '#6b7286', 4);
      c.beginPath(); c.arc(x, y - 52, 22, 0, PI); c.closePath(); fs(c, '#6b7286');
      if (e.lit) {
        for (let i = 0; i < 3; i++) {
          const fh = 30 + Math.sin(t * 13 + i * 2) * 9 - i * 7, fw = 15 - i * 4;
          c.beginPath(); c.moveTo(x - fw, y - 54); c.quadraticCurveTo(x - fw, y - 54 - fh * 0.6, x + Math.sin(t * 9 + i) * 4, y - 54 - fh);
          c.quadraticCurveTo(x + fw, y - 54 - fh * 0.6, x + fw, y - 54); c.closePath();
          c.fillStyle = ['#ff7b00', '#ffb347', '#fff3b0'][i]; c.fill();
        }
      } else { circ(c, x, y - 56, 5 + Math.sin(t * 5) * 1.5); c.fillStyle = '#ff7b00'; c.fill(); }
      break;
    case 'altar': {
      rr(c, x - 36, y - 20, 72, 20, 5); fs(c, '#cfd6e4');
      rr(c, x - 22, y - 46, 44, 28, 5); fs(c, '#e9eef7');
      const by = y - 78 + Math.sin(t * 3) * 5;
      if (!e.used) {
        circ(c, x, by, 26 + Math.sin(t * 5) * 4); c.fillStyle = 'rgba(125,255,176,.3)'; c.fill();
        star(c, x, by, 17, 4, t, 0.45); fs(c, '#7dffb0', 2.5);
        rr(c, x - 3.5, by - 9, 7, 18, 2); c.fillStyle = '#fff'; c.fill();
        rr(c, x - 9, by - 3.5, 18, 7, 2); c.fill();
      } else { star(c, x, y - 60, 10, 4, 0, 0.45); fs(c, '#9aa3b5', 2); }
      break;
    }
    case 'sign':
      line(c, x, y, x, y - 46, INK, 9); line(c, x, y, x, y - 46, '#8a5a2b', 5);
      c.save(); c.translate(x, y - 62); c.rotate(-0.06);
      rr(c, -30, -22, 60, 40, 6); fs(c, '#ffd23f');
      label(c, '!', -10, 0, 30, INK, 'center', 0);
      label(c, '↘', 12, 0, 26, INK, 'center', 0);
      c.restore();
      break;
    case 'proj': {
      const g = c.createRadialGradient(x, y, 2, x, y, 22);
      g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#ff5d9e'); g.addColorStop(1, 'rgba(255,93,158,0)');
      c.fillStyle = g; circ(c, x, y, 22); c.fill();
      for (let i = 1; i < 4; i++) { circ(c, x + i * 12, y + Math.sin(t * 20 + i) * 3, 7 - i * 1.5); c.fillStyle = `rgba(255,93,158,${0.5 - i * 0.12})`; c.fill(); }
      break;
    }
  }
}

function drawGround(c, th) {
  for (const s of G.level.segs) {
    const x0 = Math.max(s.x0, G.camX - 60), x1 = Math.min(s.x1, G.camX + W + 60);
    if (x1 <= x0) continue;
    if (s.bridge) {
      for (const px of [s.x0 - 8, s.x1 + 8]) { line(c, px, s.y + 4, px, s.y - 30, INK, 10); line(c, px, s.y + 4, px, s.y - 30, '#8a5a2b', 6); }
      if (!s.on) {
        c.setLineDash([10, 12]); line(c, s.x0, s.y + 6, s.x1, s.y + 6, 'rgba(255,255,255,.35)', 3); c.setLineDash([]);
        continue;
      }
      c.fillStyle = '#a8743a'; c.fillRect(x0, s.y, x1 - x0, 14);
      c.strokeStyle = INK; c.lineWidth = 2.5; c.strokeRect(s.x0, s.y, s.x1 - s.x0, 14);
      for (let x = s.x0 + 28; x < s.x1; x += 28) line(c, x, s.y, x, s.y + 14, INK, 2);
      c.beginPath(); c.moveTo(s.x0 - 8, s.y - 28); c.quadraticCurveTo((s.x0 + s.x1) / 2, s.y + 4, s.x1 + 8, s.y - 28);
      c.strokeStyle = '#e0c9a0'; c.lineWidth = 3; c.stroke();
      continue;
    }
    c.fillStyle = th.dirt;
    c.fillRect(x0, s.y, x1 - x0, 900);
    c.fillStyle = 'rgba(0,0,0,.14)';
    for (let i = Math.floor(x0 / 110); i * 110 < x1; i++) {
      const x = i * 110 + hash(i) * 60;
      if (x < s.x0 + 20 || x > s.x1 - 20) continue;
      ell(c, x, s.y + 60 + hash(i + 5) * 150, 16, 8); c.fill();
      ell(c, x + 40, s.y + 220 + hash(i + 9) * 120, 22, 9); c.fill();
    }
    c.fillStyle = th.ground;
    c.fillRect(x0, s.y, x1 - x0, 18);
    for (let i = Math.floor(x0 / 34); i * 34 < x1; i++) {
      const x = i * 34;
      if (x < s.x0 + 12 || x > s.x1 - 12) continue;
      circ(c, x, s.y + 17, 8 + hash(i) * 7); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.22)';
    c.fillRect(x0, s.y, x1 - x0, 4);
    // shaded cliff faces
    c.fillStyle = 'rgba(0,0,0,.22)';
    if (s.x0 > x0 - 1) c.fillRect(s.x0, s.y + 18, 10, 900);
    if (s.x1 < x1 + 1) c.fillRect(s.x1 - 10, s.y + 18, 10, 900);
  }
}

function drawOrb(c, x, y, r, k, t, big) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${0.1 * k})`);
  g.addColorStop(0.75, `rgba(125,249,255,${0.22 * k})`);
  g.addColorStop(1, `rgba(${big ? '255,226,122' : '125,249,255'},${0.75 * k})`);
  c.fillStyle = g;
  circ(c, x, y, r); c.fill();
  c.lineWidth = 3; c.strokeStyle = `rgba(255,255,255,${0.9 * k})`; c.stroke();
  c.lineWidth = 2; c.strokeStyle = `rgba(255,255,255,${0.5 * k})`;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x, y, r * (0.55 + i * 0.14), t * 3 + i * 2, t * 3 + i * 2 + 1.1); c.stroke(); }
  ell(c, x - r * 0.4, y - r * 0.5, r * 0.22, r * 0.1, -0.6); c.fillStyle = `rgba(255,255,255,${0.7 * k})`; c.fill();
  for (let i = 0; i < 6; i++) {
    const a = t * 2 + (i * TAU) / 6;
    star(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 5, 4, a); c.fillStyle = `rgba(255,244,170,${k})`; c.fill();
  }
}

function drawVine(c, p, px, t) {
  const v = p.vine, tg = v.tgt;
  const ox = px + 14, oy = p.y - 138;
  const live = tg && (tg.type === 'ring' || tg.type === 'switch');
  const tx = live ? tg.x : v.tx, ty = live ? tg.y : v.ty;
  const u = clamp(v.t / 0.09, 0, 1), fade = p.swing ? 1 : clamp((v.dur - v.t) / 0.12, 0, 1);
  const ex = ox + (tx - ox) * u, ey = oy + (ty - oy) * u;
  const wig = p.swing ? 0 : Math.sin(v.t * 40) * 26 * (1 - v.t / v.dur);
  const mx = (ox + ex) / 2, my = (oy + ey) / 2 + wig + (p.swing ? 0 : 30);
  c.globalAlpha = fade;
  for (const [col, w] of [[INK, v.enh ? 13 : 9], [v.enh ? '#d6ff7a' : '#4caf50', v.enh ? 9 : 5]]) {
    c.beginPath(); c.moveTo(ox, oy); c.quadraticCurveTo(mx, my, ex, ey);
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke();
  }
  for (let i = 1; i < 6; i++) {
    const k = i / 6, a = 1 - k;
    const lx = a * a * ox + 2 * a * k * mx + k * k * ex, ly = a * a * oy + 2 * a * k * my + k * k * ey;
    ell(c, lx, ly - 6 * (i % 2 ? 1 : -1), 8, 4, i + t * 2); fs(c, '#7ddc5a', 1.5);
  }
  if (u >= 1 && !p.swing) { star(c, ex, ey, 22 * fade + 6, 7, t * 8, 0.5); fs(c, '#d6ff7a', 2); }
  c.globalAlpha = 1;
}

function drawParticle(c, q) {
  const u = q.life / q.max;
  c.globalAlpha = clamp(1.4 - u * 1.4, 0, 1);
  switch (q.type) {
    case 'dot': circ(c, q.x, q.y, q.size * (1 - u * 0.6)); c.fillStyle = q.color; c.fill(); break;
    case 'star': star(c, q.x, q.y, q.size, 5, q.rot); fs(c, q.color, 1.5); break;
    case 'debris': c.save(); c.translate(q.x, q.y); c.rotate(q.rot); rr(c, -q.size / 2, -q.size / 2, q.size, q.size, 3); fs(c, q.color, 2); c.restore(); break;
    case 'text': {
      const s = 1 + Math.max(0, 0.18 - q.life) * 4;
      c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.scale(s, s);
      label(c, q.text, 0, 0, q.size, q.color);
      c.restore();
      break;
    }
  }
  c.globalAlpha = 1;
}

// ---------- HUD ----------
function drawHud(c, t) {
  const p = G.p;
  // health
  rr(c, 18, 16, 236, 26, 13); fs(c, 'rgba(20,14,30,.6)', 3);
  const hp = clamp(G.health / 100, 0, 1);
  if (hp > 0.02) {
    rr(c, 21, 19, Math.max(20, 230 * hp), 20, 10);
    c.fillStyle = hp < 0.25 ? (Math.sin(t * 14) > 0 ? '#ff5d73' : '#ffb3bf') : hp < 0.5 ? '#ffb347' : '#7dffb0';
    c.fill();
  }
  label(c, '♥', 36, 30, 16, '#fff', 'center', 3);
  label(c, G.theme.name + '  ·  stage ' + (G.stage + 1), 22, 56, 14, 'rgba(255,255,255,.9)', 'left', 3);
  label(c, Math.floor(G.score).toLocaleString(), W / 2, 30, 28);
  if (G.combo >= 3) label(c, G.combo + ' in a row!', W / 2, 58, 16, '#ffe066', 'center', 4);

  // boss bar
  const b = G.boss;
  if (b && b.state !== 'enter') {
    const bw = 380, bx = W / 2 - bw / 2, by = 82;
    rr(c, bx, by, bw, 18, 9); fs(c, 'rgba(20,14,30,.6)', 3);
    const k = clamp(b.hp / b.max, 0, 1);
    if (k > 0.02) { rr(c, bx + 3, by + 3, Math.max(12, (bw - 6) * k), 12, 6); c.fillStyle = G.theme.accent; c.fill(); }
    label(c, b.name, W / 2, by - 4 + 28, 15, '#fff', 'center', 4);
  }

  // action buttons (also the touch controls)
  for (const bt of BTN) {
    const h = HERO[bt.id], cd = p.cd[bt.id], ready = cd <= 0, a = p.act[bt.id];
    const blessed = bt.id === 'pal' ? p.bless > 0 : p.bless > 0 && ready;
    c.save();
    c.translate(bt.x, bt.y);
    const s = 1 + a * 0.18;
    c.scale(s, s);
    if (blessed) { circ(c, 0, 0, bt.r + 7 + Math.sin(t * 12) * 3); c.fillStyle = 'rgba(255,226,122,.75)'; c.fill(); }
    circ(c, 0, 0, bt.r); fs(c, h.color, 3.5);
    circ(c, 0, -3, bt.r - 6); c.fillStyle = 'rgba(255,255,255,.16)'; c.fill();
    drawIcon(c, bt.id, 0, -3, 1.15);
    if (!ready) {
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, bt.r - 1, -PI / 2, -PI / 2 + TAU * clamp(cd / p.cdMax[bt.id], 0, 1)); c.closePath();
      c.fillStyle = 'rgba(20,14,30,.62)'; c.fill();
    }
    rr(c, bt.r - 22, bt.r - 20, 22, 20, 7); fs(c, '#fff', 2.5);
    label(c, h.key, bt.r - 11, bt.r - 9, 14, INK, 'center', 0);
    c.restore();
    label(c, h.name, bt.x, bt.y - bt.r - 11, 11, 'rgba(255,255,255,.85)', 'center', 3);
  }

  // banner
  const bn = G.banner;
  if (bn) {
    const a = clamp(bn.t / 0.4, 0, 1) * clamp((3 - bn.t) / 0.3 + 0.2, 0, 1);
    c.globalAlpha = a;
    label(c, bn.sub.toUpperCase(), W / 2, 150, 18, '#ffe066', 'center', 5);
    label(c, bn.text, W / 2, 190, 46, '#fff', 'center', 8);
    c.globalAlpha = 1;
  }
}

function drawHints(c, t) {
  const px = G.p.x + G.p.ox;
  for (const e of G.level.ents) {
    if (!e.hint || e.dead || e.broken || e.used || e.on || e.lit || e.spent) continue;
    const sx = e.x - px;
    if (sx < 30 || sx > 640) continue;
    if ((G.hints[e.type + e.hint] || 0) >= 3 && G.diff >= 0.3) continue;
    const n = e.hint.length, y = e.y - e.h - 44 + Math.sin(t * 6) * 4;
    e.hint.forEach((id, i) => {
      const x = e.x + (i - (n - 1) / 2) * 44;
      if (id === 'jump') {
        rr(c, x - 26, y - 14, 52, 28, 9); fs(c, '#fff', 3);
        label(c, 'JUMP', x, y + 1, 14, INK, 'center', 0);
      } else {
        circ(c, x, y, 17); fs(c, HERO[id].color, 3);
        label(c, HERO[id].key, x, y + 1, 18, '#fff', 'center', 3.5);
      }
    });
    if (n > 1) label(c, '›', e.x, y, 20, '#fff', 'center', 4);
  }
}

export function render(c) {
  const th = G.theme, p = G.p, L = G.level, t = G.t;
  const px = p.x + p.ox;

  // sky + parallax
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, th.sky[0]);
  sky.addColorStop(1, th.sky[1]);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  circ(c, 760, 110, 54); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill();
  circ(c, 760, 110, 38); c.fillStyle = 'rgba(255,255,255,.3)'; c.fill();
  layer(c, th.far_m, th.far, 0.12, 240, GY + 40, 160, 1);
  layer(c, th.mid_m, th.mid, 0.35, 180, GY + 40, 100, 2);
  motes(c, th, t);
  const ab = c.createLinearGradient(0, GY, 0, H);
  ab.addColorStop(0, 'rgba(0,0,0,0)');
  ab.addColorStop(1, 'rgba(0,0,0,.5)');
  c.fillStyle = ab;
  c.fillRect(0, GY, W, H - GY);

  // world
  const shx = (Math.random() - 0.5) * G.shake, shy = (Math.random() - 0.5) * G.shake;
  const wx = -G.camX + shx, wy = GY - G.camY + shy;
  c.save();
  c.translate(wx, wy);
  drawGround(c, th);
  for (const e of L.ents) {
    if (e.x < G.camX - 160 || e.x > G.camX + W + 160) continue;
    if (e.enemy) drawEnemy(c, e, t, th.accent, e.x - px < 230);
    else drawProp(c, e, t, th);
  }
  if (G.boss) drawBoss(c, G.boss, t, th);

  // party
  const seg = L.groundAt(px);
  if (seg && p.y <= seg.y + 2) {
    const hgt = seg.y - p.y;
    ell(c, px, seg.y + 3, Math.max(20, 62 - hgt * 0.15), Math.max(4, 11 - hgt * 0.03));
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.fill();
  }
  const expr = p.hurtT > 0 || G.mode === 'over' ? 'ouch' : p.joyT > 0 ? 'joy' : p.aweT > 0 || p.bless > 0 ? 'awe' : p.effortT > 0 ? 'effort' : G.scared ? 'scared' : 'run';
  const S = {
    t, runF: 14 * G.T.k, expr, air: !p.ground, act: p.act, enh: p.enh, bless: Math.max(0, p.bless), sq: p.sq,
    lean: p.swing ? 0.25 * Math.cos((PI * p.swing.t) / p.swing.dur) : clamp(p.ovx / 4000, 0, 0.3) + (!p.ground ? clamp(p.vy / 6000, -0.08, 0.12) : 0),
  };
  if (p.vine) drawVine(c, p, px, t);
  if (p.blink > 0 && Math.floor(t * 18) % 2) c.globalAlpha = 0.45;
  drawParty(c, px, p.y, S);
  c.globalAlpha = 1;
  if (p.orb > 0) drawOrb(c, px, p.y - 58, p.orbBig ? 132 : 92, clamp(p.orb / 0.15, 0, 1), t, p.orbBig);
  else if (p.swing && p.swing.kind === 'bubble') drawOrb(c, px, p.y - 58, 92, 0.8, t, false);

  // fireballs
  for (const b of G.balls) {
    const g = c.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r * 1.7);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.3, b.enh ? '#ffe27a' : '#ffb347');
    g.addColorStop(0.6, b.enh ? 'rgba(255,160,40,.8)' : 'rgba(255,90,0,.7)');
    g.addColorStop(1, 'rgba(255,90,0,0)');
    c.fillStyle = g;
    circ(c, b.x, b.y, b.r * 1.7); c.fill();
  }
  for (const q of G.parts) drawParticle(c, q);
  c.restore();

  // darkness, with holes punched out for every light source
  if (G.dark > 0.01) {
    dc.globalCompositeOperation = 'source-over';
    dc.clearRect(0, 0, W, H);
    dc.fillStyle = `rgba(6,4,16,${G.dark * 0.95})`;
    dc.fillRect(0, 0, W, H);
    dc.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => {
      const sx = x + wx, sy = y + wy;
      const g = dc.createRadialGradient(sx, sy, r * 0.25, sx, sy, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g;
      dc.beginPath(); dc.arc(sx, sy, r, 0, TAU); dc.fill();
    };
    hole(px, p.y - 60, p.orb > 0 || p.bless > 0 ? 230 : 165);
    for (const b of G.balls) hole(b.x, b.y, b.enh ? 280 : 170);
    for (const e of L.ents) {
      if (e.type === 'brazier') hole(e.x, e.y - 60, e.lit ? 420 : 80);
      else if (e.type === 'proj') hole(e.x, e.y, 60);
      else if (e.type === 'altar' && !e.used) hole(e.x, e.y - 70, 70);
      else if (e.type === 'ring' && !e.used) hole(e.x, e.y, 50);
    }
    c.drawImage(darkCv, 0, 0);
    // googly eyes in the dark
    c.save();
    c.translate(wx, wy);
    c.globalAlpha = G.dark;
    for (const e of L.ents) {
      if (!e.enemy || e.dead || e.x - px < 150 || e.x > G.camX + W) continue;
      const ey = e.y - e.h * 0.62, bl = Math.sin(t * 2 + e.x) > 0.93 ? 0.15 : 1;
      for (const dx of [-12, 2]) { ell(c, e.x + dx, ey, 5, 6 * bl); c.fillStyle = '#fff'; c.fill(); circ(c, e.x + dx - 1.5, ey, 2 * bl); c.fillStyle = INK; c.fill(); }
    }
    c.restore();
  }

  if (G.mode !== 'title') {
    c.save();
    c.translate(wx, wy);
    drawHints(c, t);
    c.restore();
    drawHud(c, t);
  }
  if (p.bless > 0) { // golden vignette while the blessing is waiting for a hero
    const g = c.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 560);
    g.addColorStop(0, 'rgba(255,226,122,0)');
    g.addColorStop(1, `rgba(255,226,122,${0.3 * clamp(p.bless * 3, 0, 1)})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  if (G.health < 25 && G.mode === 'play') {
    const g = c.createRadialGradient(W / 2, H / 2, 280, W / 2, H / 2, 580);
    g.addColorStop(0, 'rgba(255,60,90,0)');
    g.addColorStop(1, `rgba(255,60,90,${0.22 + 0.1 * Math.sin(t * 8)})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  if (G.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(1, G.flash)})`; c.fillRect(0, 0, W, H); }
}
