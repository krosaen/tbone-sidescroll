// Rules and state for Branch Line. Rendering lives in render.js.
import { rand, pick, clamp, lerp } from '../../shared/util.js';
import { LANE_Y, GROUND_Y, SX, W, H, LEAF_COLS } from './art.js';
import { World } from './world.js';
import { sfx } from './sfx.js';

export const G = { mode: 'title', diff: 0.3, best: 0, onOver: null };

const BASE_SPEED = 95; // px/s at speed 1
const GRAV = 520;
const JUMP_H = 30; // apex of a normal jump
const LANE_UP_H = 66; // apex of a double-tap launch: clears the track above
const TAP = 0.26; // double-tap window, seconds (human timing, so it doesn't scale)
const GLIDE = 3; // "for the count of three"

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
  G.parts = [];
  G.shake = 0;
  G.T = tune();
  G.speed = BASE_SPEED * G.T.k;
  G.world = new World();
  G.s = {
    x: 0, y: LANE_Y[1], vy: 0, lane: 1, ground: null, ignore: -1, coyote: 0,
    slideT: 0, butt: 0, buttCd: 0, lunge: 0, glide: false, glideT: 0, glideUsed: false, laneUpUsed: false,
    lastUp: -9, lastDown: -9, upHeld: false, inv: 0, hover: false, hoverT: 0, juiceT: 0, juice: null, ph: 0, dripT: 0,
  };
  G.s.ground = G.world.segAt(1, 0);
  G.camX = -SX;
}

export const score = () => Math.floor(Math.max(0, G.s.x) / 16) + G.bonus;

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

function hurt() {
  const s = G.s;
  if (s.inv > 0) return false;
  G.acorns--;
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

export function upPress() {
  const s = G.s;
  if (!live() || s.hover) return;
  s.upHeld = true;
  if (s.ground || s.coyote > 0) { jump(); s.lastUp = G.t; return; }
  if (G.t - s.lastUp < TAP && !s.laneUpUsed) { laneUp(); s.lastUp = -9; return; }
  if (!s.glideUsed) { // jump, pause, then hold: spread the membrane and float
    s.glide = true;
    s.glideT = 0;
    s.glideUsed = true;
    sfx.glide();
  }
  s.lastUp = G.t;
}
export function upRelease() {
  G.s.upHeld = false;
}
export function downPress() {
  const s = G.s;
  if (!live() || s.hover) return;
  if (s.ground) {
    if (G.t - s.lastDown < TAP && s.lane < 2) dropThrough();
    else { s.slideT = 0.55; s.butt = 0; sfx.slide(); }
  } else {
    s.glide = false;
    s.vy = Math.max(s.vy, 70 * G.T.k);
    if (G.t - s.lastDown < TAP) { // double tap in the air: pass through the next track down
      const below = LANE_Y.findIndex((y) => y > s.y + 1);
      if (below >= 0 && below < 2) s.ignore = below;
    }
  }
  s.lastDown = G.t;
}
export function rightPress() {
  const s = G.s;
  if (!live() || s.hover || s.buttCd > 0) return;
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
  s.glide = false;
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
  s.ground = null;
  s.slideT = 0;
}

// ---------- creatures getting what they deserve ----------
function knock(e) { // headbutt: launched off screen
  e.dead = true;
  e.vx = G.speed + rand(150, 220);
  e.vy = -rand(60, 110);
  e.spin = rand(10, 16);
  G.bonus += 25;
  burst(e.x, e.y - 6, 8, e.type === 'sq' ? ['#b2532a', '#d9773f'] : e.type === 'crow' ? ['#1d1f27', '#3b4760'] : ['#3d6fd6', '#ffffff']);
  sfx.bonk();
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
function splat(e) {
  const s = G.s;
  e.dead = true;
  e.gone = true;
  burst(e.x, e.y, 18, [e.juice, e.col[0], e.col[1]], 120);
  for (let i = 0; i < 6; i++) part(e.x, e.y, { vx: G.speed + rand(-30, 110), vy: rand(-140, -30), g: 420, max: rand(0.6, 1.1), col: pick(['#f4e9c8', e.col[1], '#e8d8a0']), w: 2, h: 2 });
  s.juiceT = 2.4;
  s.juice = e.juice;
  G.bonus += 10;
  sfx.splat();
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
  s.juiceT = Math.max(0, s.juiceT - dt);
  G.shake = Math.max(0, G.shake - dt * 10);
  s.lunge = s.butt > 0 ? Math.round(7 * Math.sin(Math.PI * (1 - s.butt / 0.3))) : 0;

  s.x += speed * dt;
  G.camX = s.x - SX;
  s.ph += dt * speed * 0.11;

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
      if (!s.upHeld || s.glideT > GLIDE / k) s.glide = false;
      else s.vy = 0;
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
        if (prevY <= sy + 1 && s.y >= sy) { land(seg, l, sy); break; }
      }
    }
    if (!s.ground && s.y > GROUND_Y - 6) miss();
  }

  // juice drips off the squirrel's face
  if (s.juiceT > 0 && (s.dripT -= dt) <= 0) {
    s.dripT = rand(0.12, 0.3);
    part(s.x + 6 + s.lunge, s.y - 6, { vx: speed, vy: 10, g: 300, max: 0.6, col: s.juice });
  }

  // creatures and things
  const pxx = s.x + s.lunge;
  const top = s.y - (s.slideT > 0 && s.ground ? 5 : 12);
  for (const e of Wd.ents) {
    if (e.dead) {
      e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 520 * dt; e.rot = (e.rot || 0) + e.spin * dt;
      if (e.y > H + 40 || e.x > G.camX + W + 60) e.gone = true;
      continue;
    }
    const onScreen = e.x - G.camX < W + 10;
    switch (e.type) {
      case 'sq': // paces back and forth, blocking the way (and leaving landing spots clear)
        if (e.home == null) e.home = e.x;
        if (onScreen) { e.x = e.home + Math.sin(G.t * 1.4 + e.ph) * 10; e.ph += dt * 6; }
        e.y = Wd.surface(e.seg, e.x, G.t);
        break;
      case 'crow':
        e.timer -= dt;
        if (e.timer <= 0) { e.timer = rand(1.2, 3); if (Math.random() < 0.5) e.hop = 0.35; else { e.caw = 0.3; if (onScreen && e.x - G.camX > SX) sfx.caw(); } }
        e.hop = Math.max(0, e.hop - dt); e.caw = Math.max(0, e.caw - dt);
        e.y = Wd.surface(e.seg, e.x, G.t);
        break;
      case 'nest':
        e.y = Wd.surface(e.seg, e.x, G.t);
        break;
      case 'bird':
        if (onScreen) e.x -= 42 * dt;
        e.y = LANE_Y[e.lane] - 10 + Math.sin(G.t * 3 + e.ph) * 1.5;
        if (onScreen && !e.chirped && e.x - G.camX < W - 40) { e.chirped = true; sfx.chirp(); }
        break;
      case 'fruit':
        e.swv += (-30 * e.sw - 1.5 * e.swv) * dt + Math.sin(G.t * 1.3 + e.ph) * 0.4 * dt;
        e.sw += e.swv * dt;
        break;
    }
    const dx = e.x - pxx;
    if (Math.abs(dx) > 26) continue;
    const creature = e.type === 'sq' || e.type === 'crow' || e.type === 'bird';
    const [hw, h0, h1] = e.type === 'sq' ? [6, 11, 0] : e.type === 'crow' ? [7, 20, 0] : e.type === 'nest' ? [8, 8, 0] : e.type === 'bird' ? [6, 4, -3] : [3, 4, -4];
    const ey0 = e.y - h0, ey1 = e.y - h1;
    // headbutt: the head's forward zone during the lunge
    if (s.butt > 0.06 && (creature || e.type === 'fruit') && dx > -4 && dx < 20 && ey1 > s.y - 15 && ey0 < s.y - 2) {
      e.type === 'fruit' ? splat(e) : knock(e);
      continue;
    }
    // slide tackle: anything living in your lane that you slide into
    if (creature && s.slideT > 0 && s.ground && Math.abs(dx) < 11 && ey1 > s.y - 16) { tackle(e); continue; }
    if (!e.spent && Math.abs(dx) < hw + 8 && ey1 > top && ey0 < s.y) {
      if (hurt()) {
        e.spent = true;
        if (e.type === 'fruit') e.swv += 6;
      }
    }
  }

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
