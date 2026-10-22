// Autoplay, enabled with ?bot in the URL. Handy as a demo reel and for testing a whole run hands-free.
import { G, press } from './game.js';

let dashUntil = 0;

export function bot() {
  if (G.mode !== 'play') return;
  const p = G.p, L = G.level, px = p.x + p.ox, cd = p.cd;
  if (p.swing) return;
  const go = (id) => { if (cd[id] <= 0) press(id); };

  const seg = L.groundAt(px);
  if (!p.ground && seg && seg.y - p.y > 120 && p.y - p.peakY > 40 && p.orb <= 0) go('cleric');
  if (G.t < dashUntil && !p.ground && p.vy > -120 && p.airDash) { go('barb'); dashUntil = 0; }

  for (const e of L.ents) {
    if (e.dead || e.gone) continue;
    const sx = e.x - px;
    if (sx < -60 || sx > 700) continue;
    switch (e.type) {
      case 'mark':
        if (e.hint[0] === 'jump' && !e.bj && sx < (e.hint[1] ? -32 : -10) && p.ground) {
          e.bj = true;
          press('jump');
          if (e.hint[1]) dashUntil = G.t + 1;
        }
        break;
      case 'spikes': if (!e.bj && sx < 95 && sx > 0 && p.ground) { e.bj = true; press('jump'); } break;
      case 'wall': if (!e.broken && sx < 130) go('barb'); break;
      case 'gate':
        if (!e.open && !e.broken && sx < 150) { if (p.bless > 0) go('barb'); else if (cd.pal <= 0) press('pal'); }
        break;
      case 'grunt':
      case 'shield': if (sx < 125 && sx > -10) go('barb'); break;
      case 'bat':
      case 'spitter': if (sx > 110) go('wiz'); else if (sx > -10) go('barb'); break;
      case 'proj': if (sx > 40) go('wiz'); break;
      case 'brazier': if (!e.lit && sx > 30) go('wiz'); break;
      case 'switch': if (!e.on && sx < 310 && sx > -30) go('druid'); break;
      case 'ring': if (!e.used && sx < 310 && sx > -10) go('druid'); break;
      case 'altar': if (!e.used && sx < 70 && G.health < 99) go('cleric'); break;
      case 'brute':
        if (e.wind > 0 && e.wind < 0.35) go('cleric');
        else if (e.stun > 0 && sx < 125 && sx > -10) go('barb');
        else if (sx > 260) go('wiz');
        break;
    }
  }
  const b = G.boss;
  if (b && b.state !== 'dead' && b.state !== 'enter') {
    if (b.state === 'wind' && b.t > b.dur - 0.3) go('cleric');
    else if (b.state === 'stun') { if (cd.pal <= 0 && p.bless <= 0) press('pal'); go('barb'); }
    else go('wiz');
  }
}
