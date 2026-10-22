// Character sprites, painted pixel by pixel every frame. (x, y) is the point between the feet.
import { px, ellipse, mix } from './art.js';

// Southern flying squirrel: grey-brown back, cream belly, huge dark eyes, flat fluffy tail.
const F = { dark: '#4e4036', mid: '#8b7766', light: '#ab9784', top: '#c2ae98', belly: '#efe3cd', edge: '#3d3129', eye: '#0d0907', nose: '#5a3a33', ear: '#d9a99a' };

function head(c, hx, hy, juice) {
  ellipse(c, hx, hy, 3, 3, F.mid);
  ellipse(c, hx, hy - 1, 2, 2, F.light);
  px(c, hx - 2, hy - 5, 2, 2, F.mid);
  px(c, hx - 1, hy - 4, 1, 1, F.ear);
  ellipse(c, hx + 1, hy + 2, 2, 1, juice ? mix(F.belly, juice, 0.75) : F.belly);
  if (juice) ellipse(c, hx + 1, hy, 3, 2, mix(F.mid, juice, 0.7));
  px(c, hx + 1, hy - 1, 2, 2, F.eye);
  px(c, hx + 2, hy - 1, 1, 1, '#ffffff');
  px(c, hx + 4, hy, 1, 1, F.nose);
}

export function drawSquirrel(c, x, y, pose, ph, juice) {
  x = Math.round(x); y = Math.round(y);
  switch (pose) {
    case 'glide': {
      const b = Math.round(Math.sin(ph * 0.5));
      ellipse(c, x - 15, y - 6 + b, 5, 1, F.mid);
      px(c, x - 19, y - 7 + b, 4, 1, F.light);
      ellipse(c, x, y - 6, 11, 2, F.mid);
      ellipse(c, x, y - 7, 10, 1, F.top);
      px(c, x - 11, y - 4, 22, 1, F.edge);
      px(c, x - 13, y - 5, 3, 1, F.dark); px(c, x + 10, y - 5, 3, 1, F.dark);
      px(c, x - 12, y - 4, 2, 1, F.dark); px(c, x + 10, y - 4, 2, 1, F.dark);
      head(c, x + 10, y - 8, juice);
      break;
    }
    case 'jump': {
      ellipse(c, x - 13, y - 6, 5, 2, F.mid);
      px(c, x - 17, y - 8, 5, 1, F.light);
      px(c, x - 10, y - 4, 4, 1, F.dark);
      px(c, x + 4, y - 3, 4, 1, F.dark);
      ellipse(c, x - 1, y - 6, 7, 3, F.mid);
      ellipse(c, x - 1, y - 7, 6, 1, F.light);
      px(c, x - 7, y - 4, 13, 1, F.edge);
      ellipse(c, x, y - 4, 4, 1, F.belly);
      head(c, x + 7, y - 9, juice);
      break;
    }
    case 'slide': {
      ellipse(c, x - 12, y - 3, 6, 1, F.mid);
      px(c, x - 18, y - 4, 5, 1, F.light);
      px(c, x + 9, y - 1, 3, 1, F.dark);
      px(c, x - 8, y - 1, 3, 1, F.dark);
      ellipse(c, x, y - 3, 8, 2, F.mid);
      ellipse(c, x, y - 4, 7, 1, F.top);
      px(c, x - 7, y - 2, 14, 1, F.edge);
      head(c, x + 9, y - 5, juice);
      break;
    }
    case 'butt': {
      for (let i = 0; i < 3; i++) px(c, x - 22 + i * 2, y - 10 + i * 3, 5, 1, 'rgba(255,255,255,.75)');
      ellipse(c, x - 12, y - 7, 5, 2, F.mid);
      px(c, x - 16, y - 9, 4, 1, F.light);
      px(c, x - 6, y - 2, 2, 2, F.dark); px(c, x + 2, y - 2, 2, 2, F.dark);
      ellipse(c, x - 1, y - 5, 7, 3, F.mid);
      ellipse(c, x - 1, y - 6, 6, 1, F.light);
      px(c, x - 7, y - 3, 12, 1, F.edge);
      head(c, x + 8, y - 6, juice);
      break;
    }
    default: { // run
      const f = Math.floor(ph) & 3, bob = f & 1 ? -1 : 0, lo = [-1, 0, 1, 0][f];
      ellipse(c, x - 12, y - 8 + bob, 5, 3, F.dark);
      ellipse(c, x - 12, y - 9 + bob, 4, 2, F.mid);
      ellipse(c, x - 13, y - 10 + bob, 3, 1, F.light);
      px(c, x - 6 + lo, y - 2, 2, 2, F.dark);
      px(c, x + 3 - lo, y - 2, 2, 2, F.dark);
      ellipse(c, x - 2, y - 5 + bob, 6, 3, F.mid);
      ellipse(c, x - 2, y - 6 + bob, 5, 1, F.light);
      px(c, x - 7, y - 3 + bob, 10, 1, F.edge);
      ellipse(c, x - 1, y - 3 + bob, 4, 1, F.belly);
      head(c, x + 5, y - 8 + bob, juice);
    }
  }
}

// ---------- the locals ----------
const R = { dark: '#6e2a12', mid: '#b2532a', light: '#d9773f', belly: '#f2dcbc' };

export function drawCreature(c, e, t) {
  const x = Math.round(e.x), y = Math.round(e.y);
  switch (e.type) {
    case 'sq': { // grumpy red squirrel, facing left
      const f = Math.floor(e.ph) & 3, bob = f & 1 ? -1 : 0, lo = [-1, 0, 1, 0][f];
      ellipse(c, x + 9, y - 10 + bob, 3, 5, R.dark);
      ellipse(c, x + 9, y - 11 + bob, 2, 4, R.mid);
      px(c, x + 8, y - 15 + bob, 2, 1, R.light);
      px(c, x + 3 - lo, y - 2, 2, 2, R.dark); px(c, x - 4 + lo, y - 2, 2, 2, R.dark);
      ellipse(c, x + 1, y - 5 + bob, 5, 3, R.mid);
      ellipse(c, x + 1, y - 6 + bob, 4, 1, R.light);
      ellipse(c, x, y - 3 + bob, 3, 1, R.belly);
      ellipse(c, x - 4, y - 8 + bob, 3, 3, R.mid);
      px(c, x - 3, y - 13 + bob, 1, 2, R.dark); px(c, x - 5, y - 12 + bob, 1, 2, R.dark);
      ellipse(c, x - 5, y - 6 + bob, 2, 1, R.belly);
      px(c, x - 6, y - 9 + bob, 2, 1, '#0d0907');
      px(c, x - 7, y - 11 + bob, 2, 1, R.dark); px(c, x - 5, y - 10 + bob, 1, 1, R.dark); // scowl
      px(c, x - 8, y - 7 + bob, 1, 1, '#3a1a10');
      break;
    }
    case 'crow': {
      const hop = e.hop > 0 ? -Math.round(Math.sin((e.hop / 0.35) * Math.PI) * 4) : 0;
      const yy = y + hop, caw = e.caw > 0;
      px(c, x - 2, yy - 4, 1, 4, '#2a2a2a'); px(c, x + 1, yy - 4, 1, 4, '#2a2a2a');
      px(c, x - 3, yy, 2, 1, '#2a2a2a'); px(c, x, yy, 2, 1, '#2a2a2a');
      ellipse(c, x + 8, yy - 8, 4, 1, '#16171d');
      ellipse(c, x + 1, yy - 10, 6, 5, '#1d1f27');
      ellipse(c, x + 1, yy - 12, 4, 2, '#3b4760');
      ellipse(c, x + 3, yy - 9, 4, 2, '#121318');
      ellipse(c, x - 5, yy - 16, 3, 3, '#1d1f27');
      px(c, x - 6, yy - 19, 3, 1, '#3b4760');
      px(c, x - 7, yy - 17, 1, 1, '#d8d0b0');
      px(c, x - 11, yy - 16, 4, 1, '#2f2f33');
      px(c, x - 10, yy - 15 + (caw ? 1 : 0), 3, 1, '#2f2f33');
      break;
    }
    case 'bird': { // blue jay on the wing, facing left
      const up = Math.sin(t * 22 + e.ph) > 0;
      px(c, x + 3, y - 1, 5, 1, '#2e58b8'); px(c, x + 8, y - 1, 1, 1, '#ffffff');
      ellipse(c, x, y, 4, 2, '#3d6fd6');
      ellipse(c, x, y + 1, 3, 1, '#e8eef5');
      ellipse(c, x - 4, y - 1, 2, 2, '#3d6fd6');
      px(c, x - 3, y - 4, 2, 2, '#3d6fd6');
      px(c, x - 4, y + 1, 2, 1, '#1a1a24');
      px(c, x - 5, y - 2, 1, 1, '#000000');
      px(c, x - 8, y - 1, 2, 1, '#2b2b2b');
      if (up) { px(c, x - 1, y - 5, 5, 3, '#2e58b8'); px(c, x, y - 4, 1, 1, '#ffffff'); px(c, x + 2, y - 5, 1, 2, '#1a1a24'); }
      else { px(c, x - 1, y + 1, 5, 3, '#2e58b8'); px(c, x + 2, y + 2, 1, 2, '#1a1a24'); }
      break;
    }
    case 'fruit': {
      const sw = Math.round(Math.sin(e.sw || 0) * 2);
      const fx = x + sw;
      for (let yy = e.top; yy < y - 4; yy++) px(c, x + Math.round(sw * (yy - e.top) / (y - e.top)), yy, 1, 1, '#5a3e2a');
      px(c, x - 1, e.top, 3, 1, '#5a3e2a');
      px(c, fx + 1, y - 6, 2, 1, '#9a8a2a');
      ellipse(c, fx, y, 3, 3, e.col[0]);
      ellipse(c, fx - 1, y - 1, 2, 2, e.col[1]);
      px(c, fx - 1, y - 2, 1, 1, e.col[2]);
      break;
    }
    case 'nest': {
      px(c, x - 3, y - 7, 2, 2, '#9fd3e6'); px(c, x, y - 8, 2, 2, '#b5def0'); px(c, x + 3, y - 7, 2, 2, '#9fd3e6');
      ellipse(c, x, y - 3, 8, 3, '#6e5232');
      ellipse(c, x, y - 5, 6, 1, '#3a2a1a');
      for (let i = -7; i <= 7; i += 2) px(c, x + i, y - 3 + ((i * 7) & 1), 2, 1, '#a07c4e');
      px(c, x - 10, y - 4, 3, 1, '#6e5232'); px(c, x + 8, y - 2, 3, 1, '#a07c4e');
      break;
    }
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
