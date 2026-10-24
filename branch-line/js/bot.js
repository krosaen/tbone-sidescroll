// Autoplay: runs the title-screen demo, and the whole game with ?bot. Presses the same
// buttons a player would: double taps, jump-pause-up glides, steering, spins.
import { G, upPress, upRelease, downPress, downRelease, rightPress } from './game.js';
import { LANE_Y, SX } from './art.js';

let glideAt = 0, secondUpAt = 0, secondDownAt = 0, lastEnd = null, steering = false;

export function bot() {
  if (G.mode !== 'play' && G.mode !== 'title') return;
  const s = G.s, Wd = G.world, x = s.x, E = G.eagle;
  const log = (m) => { if (G.botLog) G.botLog.push(G.t.toFixed(2) + ' ' + m); };
  const tap = () => { upPress(); upRelease(); };
  const steer = (on) => { if (on !== steering) { steering = on; s.downHeld = on; } }; // hold ↓ without re-tapping
  if (s.hover) { steer(false); return; }

  if (secondUpAt && G.t >= secondUpAt) { secondUpAt = 0; tap(); }
  if (secondDownAt && G.t >= secondDownAt) { secondDownAt = 0; downPress(); downRelease(); }
  if (glideAt && G.t >= glideAt && !s.ground) { glideAt = 0; log('glide'); tap(); }

  // ---- the eagle ----
  if (E && E.state !== 'defeated') {
    if (E.state === 'hover') E.botPlan = null;
    const committing = E.state === 'shift' || (E.state === 'attack' && E.t < E.dur * 0.35);
    if (committing && !E.botPlan && s.ground) {
      if (E.hits >= 2) { E.botPlan = 'glide'; log('eagle: take to the air'); tap(); glideAt = G.t + 0.3; } // last stand: meet it gliding
      else if (s.lane === E.lane) {
        if (s.lane > 0 && Wd.segAt(s.lane - 1, x + 40) && Wd.segAt(s.lane - 1, x + 110)) { E.botPlan = 'up'; log('eagle: hop up'); tap(); secondUpAt = G.t + 0.09; }
        else if (s.lane < 2 && Wd.segAt(s.lane + 1, x + 30)) { E.botPlan = 'down'; log('eagle: drop down'); downPress(); downRelease(); secondDownAt = G.t + 0.08; }
      }
    }
    if (E.state === 'recover' && E.hits < 2 && Math.abs(E.y - (s.y - 8)) < 14 && E.x - SX < 40) rightPress();
    if (E.hits >= 2 && s.glide && (E.state === 'attack' || E.state === 'recover') && Math.hypot(E.x - SX, E.y - (s.y - 7)) < 50) rightPress();
  }

  // ---- in the air ----
  if (!s.ground) {
    for (const e of Wd.ents) {
      const dx = e.x - x;
      if (!e.dead && dx > -4 && dx < (s.glide ? 40 : 22) && Math.abs(e.y - s.y) < 22) { rightPress(); break; }
    }
    if (s.glide) {
      // sink onto the next runnable track below; hold level otherwise
      const target = [0, 1, 2].some((l) => LANE_Y[l] > s.y - 4 && Wd.segAt(l, x + 20) && Wd.segAt(l, x + 70));
      steer(target && !(E && E.hits >= 2 && E.state !== 'hover'));
      return;
    }
    steer(false);
    const below = [0, 1, 2].some((l) => LANE_Y[l] > s.y - 2 && Wd.segAt(l, x + 30));
    if (!below && s.vy > 0 && !s.glideUsed) { log('save glide'); tap(); }
    return;
  }
  steer(false);

  // ---- on a branch or wire ----
  for (const e of Wd.ents) {
    if (e.dead || e.lane !== s.lane) continue;
    const dx = e.x - x;
    if (dx > 0 && dx < 22) { rightPress(); break; } // headbutt everything: chains build the triple
  }
  const seg = s.ground, toEnd = seg.x1 - x;
  if (toEnd < 9 && toEnd > 0 && lastEnd !== seg) {
    lastEnd = seg;
    const n = Wd.nextSeg(s.lane, seg.x1), gap = n ? n.x0 - seg.x1 : Infinity;
    const below = [s.lane + 1, s.lane + 2].some((l) => l < 3 && Wd.segAt(l, x + 25));
    if (s.lane > 0 && Wd.segAt(s.lane - 1, x + 30) && (gap > 60 || !n)) { log('lane-up'); tap(); secondUpAt = G.t + 0.09; }
    else if (gap < 58) { log('jump gap' + (gap | 0)); tap(); }
    else if (gap < 400 || !below) { log('glide gap' + (gap | 0)); tap(); glideAt = G.t + 0.32; }
    else log('fall to lower');
  }
}
