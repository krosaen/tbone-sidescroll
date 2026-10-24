// Rules and state for Branch Line. Rendering lives in render.js.
import { rand, pick, clamp, lerp } from '../../shared/util.js';
import { LANE_Y, GROUND_Y, SX, W, H, LEAF_COLS } from './art.js';
import { World, WALKERS, PERCHERS, HIT } from './world.js';
import { sfx } from './sfx.js';

export const G = { mode: 'title', diff: 0.3, best: 0, onOver: null, onToast: null };

const BASE_SPEED = 95; // px/s at speed 1
const GRAV = 520;
const JUMP_H = 30; // apex of a normal jump
const LANE_UP_H = 66; // apex of a double-tap launch: clears the track above
const TAP = 0.26; // double-tap window, seconds (human timing, so it doesn't scale)
const GLIDE = 5; // seconds of glide at normal speed
const FADE = 1.5; // the glitter starts fading this long before the glide runs out
const EAGLE_FIRST = 2600, EAGLE_EVERY = 5200; // distance (px) before the eagle shows up
export const HOVER = [W - 96, 66]; // the eagle's hovering corner, in screen pixels

// The speed slider is the difficulty. Gravity scales with speed squared so every jump
// covers the same ground at every speed: faster just means less time to react.
export function tune() {
  const d = G.diff;
  return { d, k: 0.55 + 1.25 * d };
}

export function reset(mode = 'play') {
  G.mode = mode;
  G.t = 0;
  G.acorns = 3;
  G.bonus = 0;
  G.combo = 0;
  G.parts = [];
  G.shake = 0;
  G.sparkle = 0;
  G.eagle = null;
  G.eaglePending = false;
  G.nextEagle = EAGLE_FIRST;
  G.lastChatter = 0;
  G.T = tune();
  G.speed = BASE_SPEED * G.T.k;
  G.world = new World();
  G.s = {
    x: 0, y: LANE_Y[1], vy: 0, lane: 1, ground: null, ignore: -1, coyote: 0,
    slideT: 0, butt: 0, buttCd: 0, lunge: 0, glide: false, glideT: 0, glideUsed: false, laneUpUsed: false,
    spin: 0, spinCd: 0, lastUp: -9, lastDown: -9, upHeld: false, downHeld: false, inv: 0, hover: false, hoverT: 0, ph: 0,
  };
  G.s.ground = G.world.segAt(1, 0);
  G.camX = -SX;
}

export const score = () => Math.floor(Math.max(0, G.s.x) / 16) + G.bonus;
const toast = (m) => G.onToast && G.mode === 'play' && G.onToast(m);

// ---------- effects ----------
function part(x, y, o) {
  G.parts.push({ x, y, vx: 0, vy: 0, g: 300, life: 0, max: 1, col: '#fff', w: 1, h: 1, ...o });
}
function leafPuff(x, y, n) {
  for (let i = 0; i < n; i++) part(x + rand(-6, 6), y + rand(-2, 2), { vx: G.speed * 0.8 + rand(-15, 15), vy: rand(-30, 5), g: 25, max: rand(1.2, 2.2), col: pick(LEAF_COLS), w: 2, flutter: rand(6.28) });
}
function burst(x, y, n, cols, sp = 90) {
  for (let i = 0; i < n; i++) {
    const a = rand(Math.PI * 2), v = rand(sp * 0.3, sp);
    part(x, y, { vx: G.speed + Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 260, max: rand(0.4, 0.9), col: pick(cols), w: Math.random() < 0.3 ? 2 : 1 });
  }
}
const FUR = { gray: ['#7d7a74', '#ece6da'], black: ['#1f1d1c', '#3e3a37'], fox: ['#b0703c', '#d9894a'], red: ['#9a4a24', '#f2ece2'], chip: ['#9a6a42', '#2a1c14'], crow: ['#1b1c22', '#3a4560'], robin: ['#d2602a', '#5a524a'], dove: ['#b8a48c', '#9c9aa4'] };
const BIRD_COLS = { jay: ['#3d6fd6', '#ffffff'], chick: ['#8a8e92', '#111111'], card: ['#c8202a', '#9a1a20'] };
const fluff = (e) => (e.type === 'bird' ? BIRD_COLS[e.kind] : FUR[e.type]);

function hurt() {
  const s = G.s;
  if (s.inv > 0) return false;
  G.acorns--;
  G.combo = 0;
  s.inv = 1; // flash for a second
  G.shake = 3;
  sfx.hit();
  if (G.acorns <= 0) gameOver();
  return true;
}
function gameOver() {
  G.acorns = 0;
  G.best = Math.max(G.best, score());
  G.mode = G.mode === 'title' ? 'title-over' : 'over';
  sfx.over();
  if (G.mode === 'over' && G.onOver) G.onOver();
}

// ---------- controls ----------
const live = () => G.mode === 'play' || G.mode === 'title';

function startGlide() {
  const s = G.s;
  s.glide = true;
  s.glideT = 0;
  s.glideUsed = true;
  s.vy = 0;
  sfx.glide();
}
export function upPress() {
  const s = G.s;
  if (!live() || s.hover) return;
  s.upHeld = true;
  if (s.glide) return; // while gliding, holding up climbs gently
  if (s.ground || s.coyote > 0) { jump(); s.lastUp = G.t; return; }
  if (G.t - s.lastUp < TAP && !s.laneUpUsed) { laneUp(); s.lastUp = -9; return; }
  if (!s.glideUsed) startGlide(); // jump, pause, up again: spread the membrane
  s.lastUp = G.t;
}
export function upRelease() { G.s.upHeld = false; }
export function downPress() {
  const s = G.s;
  if (!live() || s.hover) return;
  s.downHeld = true;
  const double = G.t - s.lastDown < TAP;
  s.lastDown = G.t;
  if (s.glide) return; // while gliding, holding down sinks gently
  if (s.ground) {
    if (double && s.lane < 2) dropThrough();
    else { s.slideT = 0.55; s.butt = 0; sfx.slide(); }
  } else {
    s.vy = Math.max(s.vy, 70 * G.T.k);
    if (double) { // double tap in the air: pass through the next track down
      const below = LANE_Y.findIndex((y) => y > s.y + 1);
      if (below >= 0 && below < 2) s.ignore = below;
    }
  }
}
export function downRelease() { G.s.downHeld = false; }
export function rightPress() {
  const s = G.s;
  if (!live() || s.hover) return;
  if (s.glide) { // swan dive and spin
    if (s.spinCd > 0) return;
    s.spin = 0.6;
    s.spinCd = 0.75;
    sfx.spin();
    return;
  }
  if (s.buttCd > 0) return;
  s.butt = 0.3;
  s.buttCd = 0.42;
  s.slideT = 0;
  sfx.butt();
}

function leave(kickV) {
  const s = G.s;
  if (s.ground) {
    G.world.kick(s.ground, s.x, kickV);
    if (s.ground.kind === 'branch' && Math.random() < 0.5) leafPuff(s.x, s.y, 1);
  }
  s.ground = null;
  s.coyote = 0;
  s.glideUsed = false;
  s.laneUpUsed = false;
  s.slideT = 0;
}
function jump() {
  const s = G.s, g = GRAV * G.T.k ** 2;
  leave(18);
  s.vy = -Math.sqrt(2 * g * JUMP_H);
  sfx.jump();
}
function laneUp() {
  const s = G.s, g = GRAV * G.T.k ** 2;
  if (s.lane === 0) return; // nothing above the top track
  s.laneUpUsed = true;
  s.glide = false;
  s.vy = -Math.sqrt(2 * g * LANE_UP_H);
  s.ignore = -1;
  sfx.launch();
}
function dropThrough() {
  const s = G.s;
  s.ignore = s.lane;
  leave(-22);
  s.vy = 40 * G.T.k;
  sfx.drop();
}

function land(seg, lane, y) {
  const s = G.s;
  const hard = s.vy / (GRAV * G.T.k * 0.25);
  G.world.kick(seg, s.x, 10 + hard * 14);
  s.ground = seg;
  s.lane = lane;
  s.y = y;
  s.vy = 0;
  s.glide = false; // the glitter fades on its own
  s.spin = 0;
  s.ignore = -1;
  if (seg.kind === 'wire') sfx.twang(); else { sfx.land(); if (Math.random() < 0.6) leafPuff(s.x, y + 2, 1 + ((Math.random() * 2) | 0)); }
}
function miss() {
  const s = G.s;
  s.inv = 0;
  hurt();
  s.inv = 1.6;
  s.hover = true;
  s.hoverT = 0;
  s.vy = 0;
  s.glide = false;
  s.spin = 0;
  s.ground = null;
  s.slideT = 0;
}

// ---------- creatures getting what they deserve ----------
function knock(e, quiet) { // launched off screen
  e.dead = true;
  e.vx = G.speed + rand(150, 220);
  e.vy = -rand(60, 110);
  e.spin = rand(10, 16);
  G.bonus += 25;
  burst(e.x, e.y - 6, 8, fluff(e));
  if (!quiet) sfx.thump();
}
function tackle(e) { // slide: sent spinning straight up
  e.dead = true;
  e.vx = G.speed + rand(10, 40);
  e.vy = -rand(230, 290);
  e.spin = rand(18, 26);
  G.bonus += 25;
  burst(e.x, e.y - 4, 6, ['#ffffff', '#e0d0b0']);
  sfx.tackle();
}
// Headbutts (and spin attacks) chain: the third in a row becomes a living cannonball
// that flies flat across the screen and clears its branch.
function bonk(e) {
  G.combo++;
  sfx.kick(G.combo);
  if (G.combo >= 3) {
    G.combo = 0;
    e.dead = true;
    e.rocket = true;
    e.vx = G.speed + 470;
    e.vy = 0;
    e.spin = 30;
    G.bonus += 60;
    G.shake = 4;
    burst(e.x, e.y - 6, 14, ['#ffffff', '#ffe28a', ...fluff(e)], 140);
    toast('Triple headbutt!');
  } else knock(e, true);
}

// ---------- creature life ----------
function partnerOf(e) {
  for (const o of G.world.ents) {
    if (o !== e && !o.dead && o.seg === e.seg && WALKERS.has(o.type) && Math.abs(o.x - e.x) < 32 && o.pose !== 'chatter') return o;
  }
  return null;
}
function think(e, onScreen) {
  const Wd = G.world;
  e.st -= e.dt;
  if (WALKERS.has(e.type)) {
    if (e.st <= 0) {
      const mate = Math.random() < (e.type === 'red' ? 0.7 : 0.45) ? partnerOf(e) : null;
      if (mate) { // face each other and chatter
        for (const [a, b] of [[e, mate], [mate, e]]) { a.pose = 'chatter'; a.st = rand(1.4, 2.2); a.dir = b.x > a.x ? 1 : -1; }
        if (onScreen && G.t - G.lastChatter > 1.2) { G.lastChatter = G.t; sfx.chatter(); }
      } else {
        const r = Math.random();
        if (r < 0.45) { e.pose = 'walk'; e.st = rand(1.2, 3); }
        else if (r < 0.7) { e.pose = 'peek'; e.st = rand(0.6, 1.4); e.dir *= -1; } // look around
        else { e.pose = 'sit'; e.st = rand(0.8, 2.2); }
      }
    }
    if (e.pose === 'walk') {
      e.x += e.dir * 7 * e.dt;
      if (Math.abs(e.x - e.home) > 14) { e.dir = e.x > e.home ? -1 : 1; }
      e.x = clamp(e.x, e.seg.x0 + 6, e.seg.x1 - 6);
      e.ph += e.dt * 7;
    } else if (e.pose === 'chatter') e.ph += e.dt * 9;
    e.y = Wd.surface(e.seg, e.x, G.t);
  } else if (PERCHERS.has(e.type)) {
    if (e.st <= 0) {
      const r = Math.random();
      if (e.type === 'crow' && r < 0.25) { e.pose = 'caw'; e.st = 0.5; if (onScreen && e.x - G.camX > SX) sfx.caw(); }
      else if (r < 0.5) { e.pose = 'peck'; e.st = rand(0.3, 0.7); }
      else if (r < 0.7) { e.pose = 'stand'; e.st = rand(0.6, 1.5); e.dir *= -1; }
      else { e.pose = 'walk'; e.st = rand(0.6, 1.4); }
    }
    if (e.pose === 'walk') { e.x = clamp(e.x + e.dir * 5 * e.dt, e.seg.x0 + 6, e.seg.x1 - 6); e.ph += e.dt * 6; if (Math.abs(e.x - e.home) > 10) e.dir = e.x > e.home ? -1 : 1; }
    e.y = Wd.surface(e.seg, e.x, G.t);
  } else if (e.type === 'bird') {
    if (onScreen) e.x -= (e.air ? 18 : 42) * e.dt;
    const base = e.air ? (e.baseY ??= e.y) : LANE_Y[e.lane] - 10;
    e.y = base + Math.sin(G.t * 3 + e.ph) * (e.air ? 3 : 1.5);
    if (onScreen && !e.chirped && e.x - G.camX < W - 40) { e.chirped = true; sfx.chirp(); }
  }
}

// ---------- the golden eagle ----------
function eagleHit() {
  const E = G.eagle;
  E.hits++;
  E.flash = 0.3;
  G.shake = 5;
  G.bonus += 100;
  sfx.kick(3);
  sfx.eagleHurt();
  for (let i = 0; i < 16; i++) part(G.camX + E.x + rand(-14, 14), E.y + rand(-8, 8), { vx: G.speed + rand(-60, 80), vy: rand(-80, 20), g: 40, max: rand(1, 2), col: pick(['#3e2a1a', '#573b24', '#c9963e', '#24180f']), w: 2, flutter: rand(6.28) });
  if (E.hits >= 3) {
    E.state = 'defeated'; E.t = 0; E.vy = -60;
    G.world.mode = 'normal';
    G.nextEagle = G.s.x + EAGLE_EVERY;
    G.bonus += 300;
    toast('Golden eagle vanquished!');
    sfx.victory();
    return;
  }
  if (E.hits === 2) { G.world.mode = 'sparse'; toast('The oaks thin out. Glide, and spin to finish it!'); }
  E.state = 'stagger'; E.t = 0;
}
function eagleTargetY() {
  const s = G.s, E = G.eagle;
  if (E.hits >= 2) return s.y; // last stand: it comes for you wherever you are
  let lane = s.lane;
  if (!s.ground) lane = LANE_Y.reduce((b, y, i) => (Math.abs(y - s.y) < Math.abs(LANE_Y[b] - s.y) ? i : b), 0);
  E.lane = lane;
  return LANE_Y[lane];
}
function updateEagle(dt) {
  const E = G.eagle, s = G.s, k = G.T.k;
  E.t += dt;
  E.flash = Math.max(0, E.flash - dt);
  const anim = (fps, n) => Math.floor(E.t * fps) % n;
  const squirrel = [SX + s.lunge, s.y - 7];
  const near = (r) => Math.hypot(E.x - squirrel[0], E.y - squirrel[1]) < r;
  // a spin attack lands whenever it connects in the last stand
  if (E.hits >= 2 && s.spin > 0 && near(26) && E.state !== 'defeated' && E.state !== 'stagger' && E.state !== 'enter') return eagleHit();
  switch (E.state) {
    case 'enter':
      E.x -= 45 * dt;
      E.frame = ['hover', anim(10, 8)];
      E.y = HOVER[1];
      if (E.x <= HOVER[0]) { E.x = HOVER[0]; E.state = 'hover'; E.t = 0; }
      break;
    case 'hover': // two seconds of wind-hovering, then it commits
      E.frame = ['hover', anim(10, 8)];
      E.y = HOVER[1] + Math.sin(E.t * 6) * 1.5;
      if (E.t > 2) { E.state = 'shift'; E.t = 0; E.ty = eagleTargetY(); }
      break;
    case 'shift': { // weight shifts forward, eyes locked on
      const dur = 0.8 / Math.sqrt(k);
      E.frame = ['shift', Math.min(7, Math.floor((E.t / dur) * 8))];
      if (E.hits >= 2) E.ty = eagleTargetY();
      E.x = HOVER[0] + Math.sin((E.t / dur) * Math.PI) * 6;
      if (E.t >= dur) { E.state = 'attack'; E.t = 0; E.x0 = E.x; E.y0 = E.y; E.dur = 0.6 / Math.sqrt(k); sfx.swoop(); }
      break;
    }
    case 'attack': {
      const u = Math.min(1, E.t / E.dur), e2 = u ** 1.6;
      // the body ends up just ahead of and above the target so the thrown-forward feet arrive on it
      E.x = lerp(E.x0, SX + 22, e2);
      E.y = lerp(E.y0, E.ty - 14, e2);
      E.frame = ['attack', u < 0.55 ? Math.floor(E.t * 14) % 2 : u < 0.8 ? 2 : 3];
      if (u >= 1) {
        if (Math.abs(s.y - E.ty) < 15 && !s.hover) {
          if (s.inv <= 0) { hurt(); sfx.grab(); }
          E.state = 'grab';
        } else {
          E.state = 'recover';
          const up = E.hits < 2 && E.lane > 0 ? LANE_Y[E.lane - 1] : E.ty - 40;
          E.ry = up - 9; // head height of anyone who hopped up a track
        }
        E.t = 0;
      }
      break;
    }
    case 'grab': // talons clench on nothing but air (and an acorn)
      E.frame = ['grab', Math.min(2, Math.floor(E.t * 7))];
      if (E.t > 0.45) { E.state = 'return'; E.t = 0; }
      break;
    case 'recover': // pulls up through the track above: a moment to headbutt it
      E.frame = ['hover', anim(12, 8)];
      E.x = SX + 30;
      E.y = lerp(E.y, E.ry, Math.min(1, dt * 12));
      if (E.hits < 2 && s.butt > 0.06 && Math.abs(E.x - (SX + s.lunge + 12)) < 24 && Math.abs(E.y - (s.y - 8)) < 14) return eagleHit();
      if (E.hits >= 2 && s.butt > 0.06 && near(26) && !E.shrugged) { E.shrugged = true; toast('Only a gliding spin can finish it!'); }
      if (E.t > 0.9) { E.state = 'return'; E.t = 0; E.x0 = E.x; E.y0 = E.y; }
      break;
    case 'stagger':
      E.frame = ['tumble', E.t * 6];
      E.x += 40 * dt; E.y -= 20 * dt;
      if (E.t > 0.5) { E.state = 'return'; E.t = 0; E.x0 = E.x; E.y0 = E.y; }
      break;
    case 'return': {
      const u = Math.min(1, E.t / 1.1), e2 = u * u * (3 - 2 * u);
      E.x = lerp(E.x0 ?? E.x, HOVER[0], e2);
      E.y = lerp(E.y0 ?? E.y, HOVER[1], e2);
      E.frame = ['hover', anim(10, 8)];
      if (u >= 1) { E.state = 'hover'; E.t = 0; E.shrugged = false; }
      break;
    }
    case 'defeated':
      E.frame = ['tumble', E.t * 5];
      E.x += 50 * dt; E.vy += 220 * dt; E.y += E.vy * dt;
      if (E.y > H + 60) G.eagle = null;
      break;
  }
}

export function update(dt) {
  const s = G.s, Wd = G.world;
  const T = (G.T = tune()), k = T.k, g = GRAV * k * k;
  const speed = (G.speed = BASE_SPEED * k);
  G.t += dt;

  s.inv = Math.max(0, s.inv - dt);
  s.slideT = Math.max(0, s.slideT - dt);
  s.butt = Math.max(0, s.butt - dt);
  s.buttCd = Math.max(0, s.buttCd - dt);
  s.spinCd = Math.max(0, s.spinCd - dt);
  G.shake = Math.max(0, G.shake - dt * 10);
  s.lunge = s.butt > 0 ? Math.round(7 * Math.sin(Math.PI * (1 - s.butt / 0.3))) : 0;

  s.x += speed * dt;
  G.camX = s.x - SX;
  // squirrels bound at about 4-7 strides a second, quicker as they speed up
  s.ph += dt * (3.2 + speed * 0.02) * 6;

  Wd.setLoad(s.ground, s.x);
  Wd.update(dt);

  // movement
  if (s.hover) { // missed a jump: drift at mid height until there's a track to drop onto
    s.hoverT += dt;
    s.y += (LANE_Y[1] - 16 - s.y) * Math.min(1, dt * 4);
    if (s.hoverT > 0.5) {
      for (const l of [1, 0, 2]) {
        if (Wd.segAt(l, s.x) && Wd.segAt(l, s.x + 30)) {
          s.hover = false;
          s.y = Math.min(s.y, LANE_Y[l] - 14);
          s.vy = 0;
          s.ignore = -1;
          break;
        }
      }
    }
  } else if (s.ground) {
    const seg = Wd.segAt(s.lane, s.x);
    if (!seg) { s.ground = null; s.coyote = 0.08; s.vy = 0; s.glideUsed = false; s.laneUpUsed = false; }
    else { s.ground = seg; s.y = Wd.surface(seg, s.x, G.t); }
  }
  if (!s.ground && !s.hover) {
    if (s.glide) {
      s.glideT += dt;
      s.spin = Math.max(0, s.spin - dt);
      if (s.glideT > GLIDE / k) { s.glide = false; s.spin = 0; }
      // steer: up climbs gently, down descends, neither holds the height
      else s.vy = s.upHeld && !s.downHeld ? (s.y > 44 ? -28 * k : 0) : s.downHeld && !s.upHeld ? 60 * k : 0;
    }
    if (!s.glide) s.vy = Math.min(s.vy + (s.vy < 0 ? g : g * 0.62) * dt, 260 * k); // floatier on the way down
    const prevY = s.y;
    s.y += s.vy * dt;
    s.coyote -= dt;
    if (s.ignore >= 0 && s.y > LANE_Y[s.ignore] + 8) s.ignore = -1;
    if (s.vy >= 0) {
      for (let l = 0; l < 3; l++) {
        if (l === s.ignore) continue;
        const seg = Wd.segAt(l, s.x);
        if (!seg) continue;
        const sy = Wd.surface(seg, s.x, G.t);
        // land on crossing the track, or touch down if a glide skims within a few pixels of it
        if ((prevY <= sy + 1 && s.y >= sy) || (s.glide && sy - s.y >= 0 && sy - s.y <= 3)) { land(seg, l, sy); break; }
      }
    }
    if (!s.ground && s.y > GROUND_Y - 6) miss();
  }

  // gold glitter while gliding: full strength, fading over the last 1.5s, gone soon after landing
  if (s.glide) {
    const left = GLIDE / k - s.glideT, fade = FADE / k;
    G.sparkle = left > fade ? 1 : Math.max(0, left / fade);
  } else G.sparkle = Math.max(0, G.sparkle - dt * 2.5);
  const sx = s.x + s.lunge;
  if (s.spin > 0) { // fiery anime trail
    for (let i = 0; i < 9; i++) {
      part(sx - rand(0, 18), s.y - 7 + rand(-7, 7), { kind: 'fire', vx: speed * rand(0.3, 0.6), vy: rand(-35, 35), g: -40, max: rand(0.22, 0.45) });
    }
    if (Math.random() < 0.5) part(sx - 20, s.y - 7 + rand(-9, 9), { kind: 'streak', vx: speed * 0.3, vy: 0, g: 0, max: 0.18, w: (rand(8, 18)) | 0 });
  } else if (G.sparkle > 0 && Math.random() < G.sparkle * 0.9) {
    for (let i = 0; i < 2; i++) {
      part(sx + rand(-16, 14), s.y - 7 + rand(-8, 6), { kind: 'spark', vx: speed * rand(0.85, 0.98), vy: rand(-4, 10), g: 6, max: rand(0.5, 0.9), col: pick(['#fff8d8', '#ffe9a0', '#f5cf62', '#d8a63a']) });
    }
  }

  // creatures
  const pxx = sx;
  const top = s.y - (s.slideT > 0 && s.ground ? 5 : 12);
  for (const e of Wd.ents) {
    if (e.dead) {
      e.x += e.vx * dt; e.y += e.vy * dt; e.rot = (e.rot || 0) + e.spin * dt;
      if (e.rocket) { // bowling down the branch
        for (const o of Wd.ents) {
          if (o.dead || o === e) continue;
          const oh = HIT[o.type] || [6, 8, 0];
          if (Math.abs(o.x - e.x) < 12 && Math.abs(o.y - oh[1] / 2 - (e.y - 6)) < 14) { knock(o); sfx.thump(); }
        }
        if (e.x > G.camX + W + 60) e.gone = true;
      } else {
        e.vy += 520 * dt;
        if (e.y > H + 40 || e.x > G.camX + W + 60) e.gone = true;
      }
      continue;
    }
    const onScreen = e.x - G.camX < W + 10 && e.x - G.camX > -20;
    e.dt = dt;
    if (e.x - G.camX < W + 60) think(e, onScreen);
    const dx = e.x - pxx;
    if (Math.abs(dx) > 30) continue;
    const [hw, h0, h1] = HIT[e.type];
    const ey0 = e.y - h0, ey1 = e.y - h1;
    // spin attack: a whirling zone around the gliding squirrel
    if (s.spin > 0 && dx > -10 && dx < 22 && ey1 > s.y - 18 && ey0 < s.y + 3) { bonk(e); continue; }
    // headbutt: the head's forward zone during the lunge
    if (s.butt > 0.06 && dx > -4 && dx < 20 && ey1 > s.y - 15 && ey0 < s.y - 2) { bonk(e); continue; }
    // slide tackle: anything in your lane that you slide into
    if (s.slideT > 0 && s.ground && Math.abs(dx) < 11 && ey1 > s.y - 16 && !e.air) { tackle(e); continue; }
    if (!e.spent && Math.abs(dx) < hw + 8 && ey1 > top && ey0 < s.y) { if (hurt()) e.spent = true; }
  }

  // the eagle: appears once the branches have cleared of everyone else
  if (G.mode === 'play') {
    if (!G.eagle && !G.eaglePending && s.x > G.nextEagle) { G.eaglePending = true; Wd.mode = 'calm'; }
    if (G.eaglePending && !Wd.ents.some((e) => !e.dead && e.x > G.camX - 30)) {
      G.eaglePending = false;
      G.eagle = { state: 'enter', t: 0, x: W + 80, y: HOVER[1], hits: 0, flash: 0, frame: ['hover', 0], lane: 1 };
      sfx.eagleCall();
      toast('A golden eagle!');
    }
  }
  if (G.eagle) updateEagle(dt);

  // particles
  for (const q of G.parts) {
    q.life += dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy = Math.min(q.vy + q.g * dt, q.flutter != null ? 18 : 400);
    if (q.flutter != null) { q.flutter += dt * 4; q.x += Math.sin(q.flutter) * 12 * dt; }
  }
  G.parts = G.parts.filter((q) => q.life < q.max);

  Wd.generate(G.camX, T);
}
