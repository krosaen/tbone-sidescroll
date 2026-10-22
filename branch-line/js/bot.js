// Autoplay: runs the title-screen demo, and the whole game with ?bot. Presses the same
// buttons a player would, including double taps and jump-pause-hold glides.
import { G, upPress, upRelease, downPress, rightPress } from './game.js';
import { LANE_Y } from './art.js';

let glideAt = 0, holdUntil = 0, secondUpAt = 0, lastEnd = null;

export function bot() {
  if (G.mode !== 'play' && G.mode !== 'title') return;
  const s = G.s, Wd = G.world, x = s.x;
  if (s.hover) return;
  const tap = () => { upPress(); upRelease(); };
  const log = (m) => { if (G.botLog) G.botLog.push(G.t.toFixed(2) + ' ' + m); };

  if (secondUpAt && G.t >= secondUpAt) { secondUpAt = 0; log('2nd-up'); tap(); }
  if (glideAt && G.t >= glideAt && !s.ground) { glideAt = 0; log('glide'); upPress(); holdUntil = G.t + 4; }
  if (holdUntil) {
    // stop gliding once there's track underneath to drop onto
    const under = [0, 1, 2].some((l) => LANE_Y[l] > s.y && Wd.segAt(l, x + 12) && Wd.segAt(l, x + 40));
    if (s.ground || G.t > holdUntil || under) { upRelease(); holdUntil = 0; }
  }
  if (!s.ground) {
    // mid-air: bonk anything we're about to come down on, and glide if there's nothing below
    for (const e of Wd.ents) {
      const dx = e.x - x;
      if (!e.dead && (e.type === 'sq' || e.type === 'crow' || e.type === 'bird') && dx > -4 && dx < 22 && Math.abs(e.y - s.y) < 22) { rightPress(); break; }
    }
    const below = [0, 1, 2].some((l) => LANE_Y[l] > s.y - 2 && Wd.segAt(l, x + 30));
    if (!below && s.vy > 0 && !s.glideUsed && !holdUntil) { log('save glide'); upPress(); holdUntil = G.t + 4; }
    return;
  }

  for (const e of Wd.ents) {
    if (e.dead || e.lane !== s.lane) continue;
    const dx = e.x - x;
    if (dx < 0 || dx > 40) continue;
    // one action per frame: a second ↓ in the same breath would be a double tap
    if ((e.type === 'fruit' || e.type === 'bird') && dx < 24) { if (s.slideT <= 0 && G.t - s.lastDown > 0.3) downPress(); break; }
    if ((e.type === 'sq' || e.type === 'crow') && dx < 22) { rightPress(); break; }
    if (e.type === 'nest' && dx < 24) { log('nest'); tap(); break; }
  }
  if (!s.ground) return;

  const seg = s.ground, toEnd = seg.x1 - x;
  if (toEnd < 9 && toEnd > 0 && lastEnd !== seg) {
    lastEnd = seg;
    const n = Wd.nextSeg(s.lane, seg.x1), gap = n ? n.x0 - seg.x1 : Infinity;
    const below = [s.lane + 1, s.lane + 2].some((l) => l < 3 && Wd.segAt(l, x + 25));
    if (s.lane > 0 && Wd.segAt(s.lane - 1, x + 30) && (gap > 60 || !n)) { log('lane-up gap' + (gap | 0)); tap(); secondUpAt = G.t + 0.09; }
    else if (gap < 58) { log('jump gap' + (gap | 0)); tap(); }
    else if (gap < 240) { log('glide gap' + (gap | 0)); tap(); glideAt = G.t + 0.34; }
    else if (!below) { log('hail mary gap' + (gap | 0)); tap(); glideAt = G.t + 0.34; }
    else log('fall to lower');
    // otherwise just run off the end and fall onto the track below
  }
}
