// Enemies and bosses. Silly, never scary. All face left, feet at the origin.
import { INK, TAU, fs, circ, ell, rr, poly, star, line, limb, clamp } from './util.js';
import { face } from './heroes.js';
const PI = Math.PI;

function dizzy(c, x, y, t, n = 3, r = 20) {
  for (let i = 0; i < n; i++) {
    const a = t * 5 + (i * TAU) / n;
    star(c, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35, 6, 5, a);
    fs(c, '#ffe066', 1.5);
  }
}
function bang(c, x, y, t) {
  const s = 1 + Math.sin(t * 25) * 0.15;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  rr(c, -4, -24, 8, 17, 3); fs(c, '#ff4d4d', 2);
  circ(c, 0, 0, 4.5); fs(c, '#ff4d4d', 2);
  c.restore();
}

export function drawEnemy(c, e, t, accent, near) {
  c.save();
  if (e.dead) {
    c.translate(e.x, e.y - e.h / 2);
    c.rotate(e.rot || 0);
    c.translate(0, e.h / 2);
  } else c.translate(e.x, e.y);
  const expr = e.dead || e.stun > 0 ? 'ouch' : near ? 'scared' : 'joy';
  const wob = Math.sin(t * 9 + e.x * 0.1);
  switch (e.type) {
    case 'grunt': {
      ell(c, -9, -3, 8, 4.5); fs(c, '#4f8a2a', 2);
      ell(c, 9, -3 - Math.max(0, wob) * 4, 8, 4.5); fs(c, '#4f8a2a', 2);
      limb(c, 14, -22, 28, -46 + wob * 4, '#8a5a2b', 6);
      circ(c, 29, -50 + wob * 4, 8); fs(c, '#8a5a2b', 2);
      poly(c, [-15, -36, -42, -48 + wob * 3, -19, -22]); fs(c, '#8bd450');
      poly(c, [15, -36, 42, -48 - wob * 3, 19, -22]); fs(c, '#8bd450');
      ell(c, 0, -26, 21, 24); fs(c, '#8bd450');
      face(c, -2, -30, 17, expr, t, -1);
      break;
    }
    case 'shield': {
      ell(c, -8, -3, 8, 4.5); fs(c, '#6b7286', 2);
      ell(c, 10, -3 - Math.max(0, wob) * 4, 8, 4.5); fs(c, '#6b7286', 2);
      rr(c, -17, -44, 36, 40, 9); fs(c, '#aab4c4');
      line(c, 6, -66, 10 + wob * 3, -80, '#ff5d73', 7);
      rr(c, -17, -66, 34, 28, 12); fs(c, '#d5dce8');
      rr(c, -14, -56, 22, 10, 4); fs(c, INK, 0);
      const es = expr === 'joy' ? 2.6 : 4;
      c.fillStyle = '#fff';
      circ(c, -9, -51, es); c.fill();
      circ(c, 1, -51, es); c.fill();
      if (!e.dead) {
        circ(c, -24, -26, 23); fs(c, accent);
        circ(c, -24, -26, 14); fs(c, '#f4f1ea', 2);
        circ(c, -24, -26, 5); fs(c, '#ffd23f', 2);
      }
      break;
    }
    case 'bat': {
      const fl = Math.sin(t * 20 + e.x) * 14;
      for (const s of [-1, 1]) {
        poly(c, [s * 12, -22, s * 44, -34 - fl, s * 38, -16 - fl * 0.5, s * 30, -20 - fl * 0.4, s * 24, -8, s * 14, -12]);
        fs(c, '#6f4bb5');
      }
      poly(c, [-13, -30, -17, -44, -4, -34]); fs(c, '#9a6bd6');
      poly(c, [13, -30, 17, -44, 4, -34]); fs(c, '#9a6bd6');
      circ(c, 0, -18, 17); fs(c, '#9a6bd6');
      face(c, -1, -19, 15, expr, t, -1);
      break;
    }
    case 'spitter': {
      const pf = clamp((e.puff || 0) / 0.45, 0, 1);
      ell(c, -16, -4, 12, 6); fs(c, '#c9952a', 2);
      ell(c, 18, -4, 12, 6); fs(c, '#c9952a', 2);
      ell(c, 0, -20, 28, 20 + pf * 5); fs(c, '#f0c040');
      c.fillStyle = 'rgba(180,110,20,.5)';
      circ(c, 12, -26, 5); c.fill();
      circ(c, 18, -14, 3.5); c.fill();
      circ(c, -20, -18, 9 + pf * 13); fs(c, pf > 0 ? '#ff9f6b' : '#f7d97a');
      for (const x of [-12, 7]) {
        circ(c, x, -40, 9.5); fs(c, '#fff', 2);
        circ(c, x - 3, -40, pf > 0 ? 2.5 : 4.5); c.fillStyle = INK; c.fill();
      }
      if (e.dead) { line(c, -18, -10, 4, -10, INK, 3); } else {
        c.beginPath(); c.arc(-8, -18, 14, PI * 0.1, PI * 0.9); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
      }
      break;
    }
    case 'brute': {
      const wind = e.wind > 0, slam = e.slamT > 0;
      ell(c, -16, -5, 13, 7); fs(c, '#4e8a7c', 2);
      ell(c, 18, -5, 13, 7); fs(c, '#4e8a7c', 2);
      // club arm
      c.save();
      c.translate(-26, -72);
      c.rotate(wind ? 1.9 + Math.sin(t * 40) * 0.06 : slam ? -1.1 : 0.5 + wob * 0.08);
      limb(c, 0, 0, -6, -30, '#7fb6a8', 11);
      rr(c, -17, -84, 22, 56, 9); fs(c, '#8a5a2b');
      circ(c, -6, -68, 3); fs(c, '#6b3f1d', 0);
      circ(c, -9, -48, 2.5); fs(c, '#6b3f1d', 0);
      c.restore();
      ell(c, 0, -50, 44, 48); fs(c, '#7fb6a8');
      ell(c, -6, -42, 28, 30); fs(c, '#b9e0d2', 0);
      circ(c, -6, -36, 3); c.fillStyle = INK; c.fill();
      poly(c, [-16, -108, -20, -124, -8, -112]); fs(c, '#f4f1ea', 2);
      poly(c, [4, -110, 8, -126, 14, -108]); fs(c, '#f4f1ea', 2);
      circ(c, -4, -98, 18); fs(c, '#7fb6a8');
      face(c, -6, -98, 17, e.dead || e.stun > 0 ? 'ouch' : wind || slam ? 'effort' : 'joy', t, -1);
      if (wind) bang(c, -4, -140, t);
      if (e.stun > 0 && !e.dead) dizzy(c, -4, -128, t);
      break;
    }
  }
  if (e.flash > 0) {
    c.globalAlpha = Math.min(1, e.flash * 6);
    ell(c, 0, -e.h / 2, e.h * 0.5, e.h * 0.55);
    c.fillStyle = '#fff';
    c.fill();
  }
  c.restore();
}

export function drawBoss(c, b, t, theme) {
  c.save();
  c.translate(b.x, b.y);
  let expr = 'joy', sc = 1, rot = 0, puff = 0, armUp = 0;
  switch (b.state) {
    case 'spit': puff = b.t < 0.6 ? b.t / 0.6 : 0.4; expr = 'awe'; break;
    case 'wind': expr = 'effort'; armUp = 1; sc = 1 + Math.min(b.t, 0.4) * 0.3; c.translate(Math.sin(t * 50) * 3, 0); break;
    case 'lunge': expr = 'effort'; armUp = 1; rot = -0.25; break;
    case 'stun': expr = 'ouch'; rot = Math.sin(t * 4) * 0.12; break;
    case 'summon': expr = 'awe'; armUp = 1; break;
    case 'dead': expr = 'ouch'; sc = Math.max(0.01, 1 - b.t / 2.2); rot = b.t * 6; break;
  }
  if (b.hit > 0 && b.state !== 'dead') expr = 'ouch';
  const bob = Math.sin(t * 3) * 6;
  c.translate(0, -95);
  c.rotate(rot);
  c.scale(sc, sc);
  c.translate(0, 95 + bob - 14);
  // feet
  ell(c, -40, 8, 26, 12); fs(c, theme.mid);
  ell(c, 40, 8, 26, 12); fs(c, theme.mid);
  // arms
  for (const s of [-1, 1]) {
    const ay = armUp ? -170 : -70 + Math.sin(t * 4 + s) * 8;
    limb(c, s * 80, -100, s * 118, ay, theme.accent, 18);
    circ(c, s * 118, ay, 16); fs(c, theme.accent);
  }
  // body
  ell(c, 0, -92, 96, 94); fs(c, theme.accent, 3.5);
  ell(c, -12, -70, 62, 58); fs(c, 'rgba(255,255,255,.28)', 0);
  // crown
  poly(c, [-46, -172, -54, -214, -28, -192, -8, -224, 12, -192, 38, -214, 30, -172]); fs(c, '#ffd23f', 3);
  circ(c, -8, -200, 6); fs(c, '#ff5d73', 2);
  if (puff > 0) {
    circ(c, -70, -78, 16 + puff * 22); fs(c, '#ff9f9f', 3);
  }
  face(c, -20, -108, 58, expr, t, -1);
  if (b.state === 'wind') bang(c, 0, -250, t);
  if (b.state === 'stun') dizzy(c, -10, -235, t, 5, 60);
  if (b.hit > 0) {
    c.globalAlpha = Math.min(0.8, b.hit * 5);
    ell(c, 0, -92, 96, 94);
    c.fillStyle = '#fff';
    c.fill();
  }
  c.restore();
}
