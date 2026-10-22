// Game state and rules. Rendering lives in render.js; this file never touches the canvas.
import { clamp, lerp, rand, pick, ease, TAU } from './util.js';
import { THEMES } from './themes.js';
import { sfx } from './audio.js';
import { Level } from './level.js';

export const W = 960, H = 540;
export const PX = 250; // party's resting screen x
export const GY = 400; // screen y of the ground the party is on
export const HX = 735; // boss's resting screen x
export const UI_ORDER = ['barb', 'druid', 'wiz', 'cleric', 'pal'];
export const BTN = UI_ORDER.map((id, i) => ({ id, x: W / 2 + (i - 2) * 86, y: H - 46, r: 31 }));

export const G = { mode: 'title', diff: 0.35, best: 0, onOver: null };
let uid = 1;

const BASE_SPEED = 320, JUMP_V = 640, GRAV = 1900;

// Everything the difficulty slider touches, in one place.
export function tune() {
  const d = G.diff;
  return {
    d,
    k: (0.78 + 0.62 * d) * (1 + Math.min(G.stage || 0, 6) * 0.025), // tempo
    pad: lerp(430, 90, d), // breathing room between challenges
    dmg: lerp(0.45, 1.7, d),
    inv: lerp(1.5, 0.7, d), // mercy time after a hit
    palCd: lerp(3.5, 8, d),
    regen: Math.max(0, lerp(4, -6, d)), // health per second at the cozy end
    cozy: d < 0.08, // can't lose
  };
}

export function reset(mode = 'play') {
  G.mode = mode;
  G.t = 0;
  G.stage = 0;
  G.score = 0;
  G.kills = 0;
  G.combo = 0;
  G.health = 100;
  G.theme = pick(THEMES);
  G.seen = [G.theme.id];
  G.parts = [];
  G.balls = [];
  G.boss = null;
  G.shake = 0;
  G.hitstop = 0;
  G.flash = 0;
  G.dark = 0;
  G.scared = false;
  G.speed = BASE_SPEED;
  G.banner = mode === 'play' ? { text: G.theme.name, sub: 'Stage 1', t: 3 } : null;
  G.camX = -PX;
  G.camY = 0;
  G.hints = {};
  G.T = tune();
  G.p = {
    x: 0, y: 0, vy: 0, ox: 0, ovx: 0, ground: true, coyote: 0, jumpBuf: 0, airDash: true, hover: 0,
    peakY: 0, lastGY: 0, inv: 0, blink: 0, swing: null, sq: 0,
    cd: { barb: 0, druid: 0, wiz: 0, cleric: 0, pal: 0 },
    cdMax: { barb: 1, druid: 1, wiz: 1, cleric: 1, pal: 1 },
    act: { barb: 0, druid: 0, wiz: 0, cleric: 0, pal: 0 },
    enh: { barb: 0, druid: 0, wiz: 0, cleric: 0, pal: 0 },
    orb: 0, orbBig: false, bless: 0, punch: null, vine: null,
    hurtT: 0, joyT: 0, effortT: 0, aweT: 0,
  };
  G.level = new Level(G.theme, mode !== 'play');
}

// ---------- effects ----------
function fx(type, x, y, o) {
  G.parts.push({ type, x, y, vx: 0, vy: 0, life: 0, max: 0.6, size: 6, color: '#fff', g: 0, rot: 0, rs: 0, ...o });
}
function burst(x, y, n, color, sp = 260, o) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), s = rand(sp * 0.3, sp);
    fx('dot', x, y, { vx: Math.cos(a) * s + G.speed, vy: Math.sin(a) * s, color, size: rand(3, 7), max: rand(0.3, 0.7), g: 600, ...o });
  }
}
function stars(x, y, n, color = '#ffe066') {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), s = rand(120, 380);
    fx('star', x, y, { vx: Math.cos(a) * s + G.speed, vy: Math.sin(a) * s - 100, color, size: rand(6, 12), max: rand(0.4, 0.8), g: 500, rs: rand(-8, 8) });
  }
}
function text(s, x, y, color = '#fff', size = 28) {
  fx('text', x, y, { text: s, vx: G.speed * 0.9, vy: -80, max: 0.85, color, size, rot: rand(-0.2, 0.2) });
}
const SAY = {
  punch: ['POW!', 'WHAM!', 'BOP!', 'KA-BONK!', 'THWACK!'],
  fire: ['FWOOSH!', 'SIZZLE!', 'TOASTY!', 'ZAP!'],
  vine: ['YOINK!', 'BOING!', 'WHEEE!', 'SEE YA!'],
  orb: ['BONK!', 'BOINK!', 'DENIED!', 'NOPE!'],
};

function heal(n) {
  const p = G.p;
  G.health = Math.min(100, G.health + n);
  p.joyT = 0.9;
  sfx.heal();
  text('+' + n, p.x + p.ox, p.y - 150, '#7dffb0', 32);
  burst(p.x + p.ox, p.y - 60, 16, '#7dffb0', 220, { g: -200 });
}

function damage(dmg) {
  const p = G.p, T = G.T;
  G.health -= dmg * T.dmg;
  G.combo = 0;
  p.hurtT = 0.7;
  p.joyT = 0;
  G.shake += 14;
  G.hitstop = 0.07;
  sfx.hurt();
  stars(p.x + p.ox, p.y - 70, 6, '#fff');
  if (G.health <= 0) {
    if (T.cozy) G.health = 1;
    else {
      G.health = 0;
      G.mode = 'over';
      G.best = Math.max(G.best, Math.floor(G.score));
      sfx.over();
      if (G.onOver) G.onOver();
    }
  }
}
function hurt(dmg) {
  const p = G.p;
  if (p.inv > 0 || p.swing) return false;
  damage(dmg);
  p.inv = p.blink = G.T.inv;
  return true;
}

// ---------- enemies taking hits ----------
function kill(e, how) {
  e.dead = true;
  e.vx = G.speed + (how === 'vine' ? rand(500, 800) : rand(200, 480));
  e.vy = -rand(450, 720);
  e.rs = rand(-16, 16);
  G.kills++;
  G.combo++;
  G.score += 25 + Math.min(G.combo, 20) * 2;
  G.p.joyT = Math.max(G.p.joyT, 0.45);
  G.shake += 4;
  stars(e.x, e.y - e.h / 2, 5);
  text(pick(SAY[how] || SAY.punch), e.x, e.y - e.h - 16, '#ffe066');
  sfx.pop();
}
function hitEnemy(e, dmg, how) {
  e.hp -= dmg;
  e.flash = 0.15;
  if (e.hp <= 0) return kill(e, how);
  e.x += 60;
  e.stun = Math.max(e.stun || 0, 0.6);
  e.wind = 0;
  text('oof', e.x, e.y - e.h - 10, '#fff', 22);
  sfx.hit();
}
function breakWall(e, clean) {
  e.broken = true;
  G.shake += clean ? 8 : 12;
  sfx.smash();
  for (let i = 0; i < 14; i++) {
    fx('debris', e.x + rand(-20, 20), e.y - rand(e.h), {
      vx: G.speed + rand(100, 520), vy: rand(-500, 100), g: 1500, size: rand(8, 18), max: rand(0.6, 1.1),
      color: e.type === 'gate' ? '#8d99ae' : pick(['#c58b4a', '#a8743a', '#e0a968']), rs: rand(-12, 12),
    });
  }
  if (clean) {
    text(pick(['SMASH!', 'CRUNCH!', 'KRAK!']), e.x, e.y - e.h - 10, '#ffb347', 32);
    G.score += 15;
    G.combo++;
  }
}
const targetY = (e) => (e.type === 'proj' ? e.y : e.type === 'brazier' ? e.y - 62 : e.type === 'boss' ? e.y - 95 : e.h ? e.y - e.h / 2 : e.y);

// ---------- player input ----------
export function press(id) {
  if (G.mode !== 'play') return;
  const p = G.p, T = tune();
  if (id === 'jump') { p.jumpBuf = 0.13; return; }
  if (p.cd[id] > 0 || (p.swing && p.swing.kind === 'bubble')) return;
  if (id === 'pal') {
    p.bless = 1.4;
    p.cd.pal = p.cdMax.pal = T.palCd;
    p.act.pal = 1;
    p.aweT = 0.5;
    sfx.bless();
    burst(p.x + p.ox - 40, p.y - 110, 14, '#ffe27a', 240, { g: -300 });
    return;
  }
  const enh = p.bless > 0;
  if (enh) {
    p.bless = 0;
    p.enh[id] = 1.2;
    p.act.pal = 1;
    G.flash = 0.25;
    sfx.enh();
  }
  p.act[id] = 1;
  p.effortT = 0.3;
  ({ barb: doPunch, druid: doVine, wiz: doFire, cleric: doOrb })[id](enh, T);
}

function doPunch(enh, T) {
  const p = G.p;
  p.punch = { t: 0, enh, id: ++uid, dur: 0.22 };
  p.ovx = enh ? 1500 : 900;
  p.cd.barb = p.cdMax.barb = 0.45;
  if (!p.ground && !p.swing && p.airDash) { // air dash: hang in the air and surge forward
    p.airDash = false;
    p.hover = (enh ? 0.5 : 0.3) / T.k;
    p.vy = 0;
    burst(p.x + p.ox - 30, p.y - 50, 8, '#fff', 160, { g: 0 });
  }
  sfx.punch();
}

function doVine(enh) {
  const p = G.p, L = G.level, px = p.x + p.ox, R = enh ? 620 : 340;
  p.cd.druid = p.cdMax.druid = 0.5;
  sfx.whip();
  const inR = (e) => e.x - px > -40 && e.x - px < R;
  const setVine = (tgt, dur = 0.32) => {
    p.vine = { t: 0, dur, tgt, tx: tgt ? tgt.x : px + R * 0.75, ty: tgt ? targetY(tgt) : p.y - 80, enh };
  };
  // grapple point: swing the whole party across
  if (!p.swing) {
    const ring = L.ents.find((e) => e.type === 'ring' && !e.used && inR(e) && e.x - px > -20);
    const seg = ring && L.nextSeg(ring.x);
    if (seg) {
      ring.used = true;
      const x1 = seg.x0 + 80;
      p.x = px; p.ox = 0; p.ovx = 0; p.hover = 0;
      p.swing = { kind: 'vine', ring, x0: px, y0: p.y, x1, y1: seg.y - 30, t: 0, dur: (x1 - px) / (G.speed * 1.2), arc: 40 };
      p.joyT = p.swing.dur;
      G.score += 20;
      G.combo++;
      setVine(ring, p.swing.dur);
      return;
    }
  }
  const hits = [];
  for (const e of L.ents) {
    if (e.dead || e.gone || !inR(e) || e.x - G.camX > W + 20) continue;
    if ((e.type === 'switch' && !e.on) || e.enemy) hits.push(e);
  }
  const rank = (e) => (e.type === 'switch' ? -1e5 : 0) + e.x;
  hits.sort((a, b) => rank(a) - rank(b));
  const use = enh ? hits : hits.slice(0, 1);
  for (const e of use) {
    if (e.type === 'switch') {
      e.on = true;
      if (e.link) e.link.type === 'gate' ? (e.link.open = true) : (e.link.on = true);
      sfx.click();
      stars(e.x, e.y, 6, '#7dffb0');
      text('CLICK!', e.x, e.y - 40, '#7dffb0');
      G.score += 15;
      G.combo++;
    } else if (e.type === 'brute' && !enh) { // too big to fling: shove it back and daze it
      e.x += 230;
      e.stun = 1.3;
      e.wind = 0;
      e.spent = false;
      e.flash = 0.15;
      text('SHOVE!', e.x, e.y - e.h - 10, '#7ddc5a');
    } else kill(e, 'vine');
  }
  let tgt = use[0] || null;
  const b = G.boss;
  if (b && b.state !== 'dead' && b.state !== 'enter' && b.x - 85 - px < R) {
    damageBoss(enh ? 3 : 1);
    if (b.state === 'wind') { setBoss('idle'); text('INTERRUPTED!', b.x - 60, b.y - 240, '#7ddc5a', 30); }
    if (!tgt) tgt = { type: 'boss', x: b.x - 40, y: b.y };
  }
  setVine(tgt);
}

function doFire(enh) {
  const p = G.p, L = G.level, px = p.x + p.ox;
  p.cd.wiz = p.cdMax.wiz = 0.4;
  sfx.fire();
  // auto-aim at the nearest thing worth burning
  let tgt = null, best = 1e9;
  for (const e of L.ents) {
    if (e.dead || e.gone) continue;
    const sx = e.x - px;
    if (sx < 20 || e.x - G.camX > W + 10 || sx >= best) continue;
    if (e.enemy || e.type === 'proj' || (e.type === 'brazier' && !e.lit)) { tgt = e; best = sx; }
  }
  const b = G.boss;
  if (!tgt && b && b.state !== 'dead') tgt = b;
  const sp = 900 + G.speed;
  G.balls.push({ x: px + 80, y: enh ? p.y - 62 : p.y - 64, vx: sp, vy: 0, sp, enh, r: enh ? 70 : 14, life: 0, target: enh ? null : tgt });
}

function doOrb(enh) {
  const p = G.p;
  p.orb = p.orbMax = enh ? 2.4 : 0.75;
  p.orbBig = enh;
  p.cd.cleric = p.cdMax.cleric = enh ? 2.8 : 1.15;
  sfx.orb();
  if (enh) heal(8);
}

// ---------- boss ----------
function setBoss(s) {
  const b = G.boss;
  b.state = s;
  b.t = 0;
  b.did = false;
}
function startBoss() {
  const T = G.T;
  const hp = Math.round(lerp(16, 34, T.d)) + G.stage * 3;
  G.boss = { type: 'boss', hp, max: hp, state: 'enter', t: 0, ox: 420, hit: 0, shots: 0, n: 0, gapT: 0.5, dur: 1, did: false, last: '', x: G.camX + HX + 420, y: G.p.lastGY, name: G.theme.boss };
  G.banner = { text: G.theme.boss, sub: 'A wild boss appears', t: 2.6 };
  sfx.boss();
}
function damageBoss(n) {
  const b = G.boss;
  if (!b || b.state === 'dead' || b.state === 'enter') return;
  b.hp -= n;
  b.hit = 0.2;
  G.score += 10 * n;
  stars(b.x - 40, b.y - 110, 4);
  sfx.hit();
  if (b.hp <= 0) {
    b.hp = 0;
    setBoss('dead');
    G.score += 500;
    G.p.joyT = 2.4;
    G.shake += 20;
    text('VICTORY!', b.x - 80, b.y - 260, '#ffe066', 44);
    sfx.win();
    for (const e of G.level.ents) if (e.type === 'proj') e.gone = true;
  }
}
function nextStage() {
  G.boss = null;
  G.stage++;
  let pool = THEMES.filter((t) => !G.seen.includes(t.id));
  if (!pool.length) { G.seen = [G.theme.id]; pool = THEMES.filter((t) => t.id !== G.theme.id); }
  G.theme = pick(pool);
  G.seen.push(G.theme.id);
  G.flash = 1;
  G.banner = { text: G.theme.name, sub: 'Stage ' + (G.stage + 1), t: 3 };
  G.level.startStage(G.theme, G.stage);
  heal(25);
}
function updateBoss(dt, T) {
  const b = G.boss, p = G.p, L = G.level;
  b.t += dt;
  b.hit = Math.max(0, b.hit - dt);
  const gy = p.lastGY, near = -(HX - PX - 155);
  switch (b.state) {
    case 'enter':
      b.ox = 420 * (1 - ease(clamp(b.t / 1.4, 0, 1)));
      if (b.t > 1.9) setBoss('idle');
      break;
    case 'idle':
      b.ox *= Math.exp(-6 * dt);
      if (b.t > lerp(1.7, 0.6, T.d)) {
        const next = pick(['spit', 'spit', 'slam', 'slam', 'summon'].filter((s) => s !== b.last));
        b.last = next;
        if (next === 'spit') { setBoss('spit'); b.shots = 0; b.n = 1 + Math.round(rand(0, 1) + T.d * 3); b.gapT = lerp(0.65, 0.36, T.d); }
        else if (next === 'slam') { setBoss('wind'); b.dur = lerp(1.05, 0.55, T.d); }
        else setBoss('summon');
      }
      break;
    case 'spit':
      if (b.shots < b.n && b.t > 0.6 + b.shots * b.gapT) {
        b.shots++;
        L.spawn('proj', b.x - 90, gy - 48, { vx: -lerp(110, 250, T.d) });
        sfx.spit();
      }
      if (b.shots >= b.n && b.t > 0.6 + b.n * b.gapT + 0.3) setBoss('idle');
      break;
    case 'wind':
      if (b.t > b.dur) setBoss('lunge');
      break;
    case 'lunge':
      b.ox = near * ease(clamp(b.t / 0.28, 0, 1));
      if (b.t >= 0.28) {
        G.shake += 12;
        sfx.thud();
        if (p.orb > 0) {
          setBoss('stun');
          b.dur = lerp(3.2, 1.8, T.d);
          text('BONK!', p.x + 110, p.y - 150, '#7df9ff', 40);
          sfx.block();
          p.joyT = 0.7;
        } else {
          hurt(22);
          setBoss('back');
        }
      }
      break;
    case 'stun':
      b.ox = near;
      if (b.t > b.dur) setBoss('back');
      break;
    case 'back':
      b.ox = near * (1 - ease(clamp(b.t / 0.6, 0, 1)));
      if (b.t > 0.6) setBoss('idle');
      break;
    case 'summon':
      if (b.t > 0.5 && !b.did) {
        b.did = true;
        const x = G.camX + W + 90;
        if (Math.random() < 0.5) L.spawn('wall', x, gy);
        else { L.spawn('grunt', x, gy); L.spawn('grunt', x + 90, gy); }
        if (G.health < 45) L.spawn('altar', x + 330, gy);
      }
      if (b.t > 1.1) setBoss('idle');
      break;
    case 'dead':
      if (Math.random() < dt * 14) {
        burst(b.x + rand(-80, 80), b.y - rand(20, 180), 6, pick(['#ffe066', '#ff5d73', '#7df9ff', '#7dffb0']), 320);
      }
      if (b.t > 2.4) nextStage();
      break;
  }
  if (G.boss) { b.x = G.camX + HX + b.ox; b.y = gy; }
}

// ---------- party movement ----------
function land(seg) {
  const p = G.p, fall = seg.y - p.peakY;
  p.y = seg.y;
  p.vy = 0;
  p.ground = true;
  p.airDash = true;
  p.hover = 0;
  p.lastGY = seg.y;
  p.sq = 0.3;
  sfx.land();
  if (fall > 230) {
    G.shake += 8;
    if (p.orb > 0) {
      text('floof', p.x + p.ox, p.y - 150, '#7df9ff', 30);
      p.joyT = 0.7;
      G.score += 20;
      G.combo++;
    } else if (hurt(18)) text('SPLAT!', p.x + p.ox, p.y - 150, '#ff8fa3', 34);
  }
}
// fell in a hole: take the hit, then float back up in a bubble of shame
function rescue(seg) {
  const p = G.p, L = G.level;
  const t = seg || L.nextSeg(p.x + p.ox);
  if (!t) return;
  damage(15);
  text('WHOOPS!', p.x + p.ox, p.y - 160, '#ff8fa3', 32);
  const x0 = p.x + p.ox, x1 = Math.max(x0 + 120, t.x0 + 70);
  p.x = x0; p.ox = 0; p.ovx = 0; p.vy = 0; p.hover = 0;
  const dur = clamp((x1 - x0) / (G.speed * 1.1), 0.45, 1.6);
  p.swing = { kind: 'bubble', x0, y0: p.y, x1, y1: t.y - 40, t: 0, dur, arc: -60 };
  p.inv = p.blink = dur + 1;
  p.lastGY = t.y;
}

export function update(dt) {
  const p = G.p, T = (G.T = tune()), L = G.level;
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  G.t += dt;
  const speed = (G.speed = BASE_SPEED * T.k);

  // timers
  for (const id of UI_ORDER) {
    p.cd[id] = Math.max(0, p.cd[id] - dt);
    p.act[id] = Math.max(0, p.act[id] - dt * 3.5);
    p.enh[id] = Math.max(0, p.enh[id] - dt);
  }
  if (p.bless > 0) {
    p.bless -= dt;
    if (p.bless <= 0) p.cd.pal = Math.min(p.cd.pal, p.cdMax.pal * 0.4); // unused blessing recharges faster
  }
  p.orb = Math.max(0, p.orb - dt);
  p.inv = Math.max(0, p.inv - dt);
  p.blink = Math.max(0, p.blink - dt);
  p.hurtT -= dt; p.joyT -= dt; p.effortT -= dt; p.aweT -= dt;
  p.sq *= Math.exp(-10 * dt);
  G.shake *= Math.exp(-8 * dt);
  G.flash = Math.max(0, G.flash - dt * 1.5);
  if (G.banner && (G.banner.t -= dt) <= 0) G.banner = null;
  if (G.mode === 'play') {
    if (T.regen > 0 && G.health < 100) G.health = Math.min(100, G.health + T.regen * dt);
    G.score += speed * dt * 0.02;
  }
  if (p.punch && (p.punch.t += dt) > p.punch.dur) p.punch = null;
  if (p.vine && (p.vine.t += dt) > p.vine.dur) p.vine = null;

  // movement
  const prevY = p.y;
  if (p.swing) {
    const s = p.swing;
    s.t += dt;
    const u = Math.min(1, s.t / s.dur);
    p.x = lerp(s.x0, s.x1, u);
    p.y = lerp(s.y0, s.y1, u) + s.arc * Math.sin(Math.PI * u);
    if (u >= 1) {
      p.swing = null;
      p.vy = -260 * T.k;
      p.ground = false;
      p.airDash = true;
      p.peakY = p.y;
      p.inv = Math.max(p.inv, 0.25);
    }
  } else {
    p.x += speed * dt;
    p.ox += p.ovx * dt;
    p.ovx *= Math.exp(-9 * dt);
    p.ox -= Math.min(p.ox * 1.2, speed * 0.5) * dt;
    p.jumpBuf -= dt;
    p.coyote -= dt;
    if (p.jumpBuf > 0 && (p.ground || p.coyote > 0)) {
      p.vy = -JUMP_V * T.k;
      p.ground = false;
      p.coyote = 0;
      p.jumpBuf = 0;
      p.peakY = p.y;
      p.sq = -0.25;
      sfx.jump();
      burst(p.x + p.ox, p.y, 5, 'rgba(255,255,255,.7)', 120, { g: 0, max: 0.3 });
    }
    if (!p.ground) {
      if (p.hover > 0) { p.hover -= dt; p.vy = 0; } else p.vy += GRAV * T.k * T.k * dt;
      // the orb turns a long fall into a gentle float
      if (p.orb > 0 && p.y - p.peakY > 110) { p.vy = Math.min(p.vy, 230 * T.k); p.orb = Math.max(p.orb, 0.2); }
      p.y += p.vy * dt;
      p.peakY = Math.min(p.peakY, p.y);
    }
    const seg = L.groundAt(p.x + p.ox);
    if (p.ground) {
      if (!seg || seg.y > p.y + 1) { p.ground = false; p.coyote = 0.1; p.vy = 0; p.peakY = p.y; }
      else { p.y = seg.y; p.lastGY = seg.y; }
    } else if (seg) {
      if (p.vy >= 0 && p.y >= seg.y) prevY <= seg.y + 16 ? land(seg) : rescue(seg);
    } else if (p.y > p.lastGY + 230) rescue(null);
  }
  const px = p.x + p.ox, top = p.y - 92;

  // camera
  G.camX = p.x - PX;
  const cs = L.groundAt(px);
  const camT = p.swing ? p.swing.y1 + (p.swing.kind === 'vine' ? 30 : 40) : cs ? cs.y : p.lastGY;
  G.camY += (camT - G.camY) * (1 - Math.exp(-5 * dt));

  // dark zones
  let dark = 0;
  for (const z of L.zones) {
    if (z.lit > 0 && z.lit < 1) z.lit = Math.min(1, z.lit + dt * 1.5);
    dark = Math.max(dark, clamp((px - z.x0) / 260, 0, 1) * clamp((z.x1 - px) / 200, 0, 1) * (1 - z.lit));
  }
  G.dark = dark;

  // punch reach this frame
  const punch = p.punch;
  const pr = punch && punch.t < 0.16 ? (punch.enh ? 340 : 155) : 0;
  const boss = G.boss;
  if (boss) {
    updateBoss(dt, T);
    if (G.boss && pr && !punch.boss && boss.state !== 'dead' && boss.state !== 'enter' && boss.x - 85 - px < pr) {
      punch.boss = true;
      damageBoss(punch.enh ? 10 : 5); // the real damage comes from block-then-punch
      text(pick(SAY.punch), boss.x - 70, boss.y - 200, '#ffe066', 36);
      G.shake += 8;
    }
  }

  // entities
  const contact = (e, sx) => {
    if (e.spent || e.stun > 0) return;
    if (Math.abs(sx) < 40 && e.y > top && e.y - e.h < p.y) {
      if (p.orb > 0) { kill(e, 'orb'); sfx.block(); }
      else if (hurt(12)) e.spent = true;
    }
  };
  for (const e of L.ents) {
    const sx = e.x - px;
    if (e.dead) {
      e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 1600 * dt; e.rot = (e.rot || 0) + e.rs * dt;
      if (e.y > G.camY + 500 || e.x > G.camX + W + 400) e.gone = true;
      continue;
    }
    if (sx > 760) continue; // not on screen yet
    if (sx < -60 && e.hint && !e.hc) { e.hc = true; const k = e.type + e.hint; G.hints[k] = (G.hints[k] || 0) + 1; }
    if (e.flash > 0) e.flash -= dt;
    if (e.enemy && pr && e.pid !== punch.id && sx > -20 && sx < pr && e.y > top - 60 && e.y - e.h < p.y + 20) {
      e.pid = punch.id;
      hitEnemy(e, punch.enh ? 9 : 1, 'punch');
      if (e.dead) continue;
    }
    switch (e.type) {
      case 'grunt':
      case 'shield':
        if (e.stun > 0) e.stun -= dt; else e.x -= 28 * dt;
        contact(e, sx);
        break;
      case 'bat':
        e.ph += dt * 6;
        e.y += ((sx < 430 ? e.gy - 58 : e.fy) - e.y) * (1 - Math.exp(-3 * dt)) + Math.sin(e.ph) * 0.6;
        e.x -= 60 * dt;
        contact(e, sx);
        break;
      case 'spitter':
        e.cd -= dt;
        if (e.puff > 0) {
          if ((e.puff -= dt) <= 0) {
            L.spawn('proj', e.x - 24, e.y - 48, { vx: -210 });
            sfx.spit();
            e.cd = lerp(2.6, 1.3, T.d);
          }
        } else if (e.cd <= 0 && sx < 660 && sx > 240) e.puff = 0.45;
        contact(e, sx);
        break;
      case 'proj':
        e.x += e.vx * dt;
        if (Math.abs(sx) < 30 && e.y > top + 4 && e.y < p.y - 4) {
          if (p.orb > 0 && p.orbBig) { e.gone = true; burst(e.x, e.y, 8, '#7df9ff'); sfx.block(); }
          else if (hurt(10)) e.gone = true;
        }
        if (sx < -400) e.gone = true;
        break;
      case 'brute':
        if (e.slamT > 0) e.slamT -= dt;
        if (e.stun > 0) { e.stun -= dt; break; }
        if (e.wind > 0) {
          if ((e.wind -= dt) <= 0) {
            e.slamT = 0.3;
            e.spent = true;
            G.shake += 7;
            sfx.thud();
            if (sx < 200 && sx > -60 && p.y > e.y - 90) {
              if (p.orb > 0) {
                e.stun = 3;
                text('BLOCKED!', e.x - 30, e.y - e.h - 20, '#7df9ff', 32);
                sfx.block();
                p.joyT = 0.6;
                G.score += 20;
                G.combo++;
              } else hurt(22);
            }
          }
        } else if (!e.spent) {
          if (sx < 185) e.wind = lerp(0.8, 0.42, T.d); else e.x -= 18 * dt;
        }
        break;
      case 'wall':
      case 'gate':
        if (e.open) e.lift = Math.min(1, (e.lift || 0) + dt * 4);
        if (e.broken || e.open) break;
        if (pr && sx > -20 && sx < pr + 10 && e.pid !== punch.id && p.y > e.y - e.h - 20) {
          e.pid = punch.id;
          if (e.type === 'wall' || punch.enh) breakWall(e, true);
          else { text('CLANG!', e.x, e.y - e.h - 10, '#cfd6e4'); sfx.clang(); e.flash = 0.15; }
        } else if (sx < 34 && sx > -30 && p.y > e.y - e.h && !p.swing) {
          hurt(14);
          breakWall(e, false);
        }
        break;
      case 'spikes':
        if (!e.spent && Math.abs(sx) < e.w / 2 + 14 && p.y > e.y - 16 && hurt(12)) e.spent = true;
        break;
      case 'altar':
        if (!e.used && p.orb > 0 && Math.abs(sx) < 120) { e.used = true; heal(35); G.score += 20; }
        break;
      case 'bossMark':
        if (sx < 0 && !e.used) { e.used = true; startBoss(); }
        break;
    }
  }

  // fireballs
  for (const b of G.balls) {
    b.life += dt;
    const tg = b.target;
    if (tg && !tg.dead && !tg.gone && tg.x - px > -40 && (tg.type !== 'boss' || G.boss === tg)) {
      const dx = tg.x - b.x, dy = targetY(tg) - b.y, m = Math.hypot(dx, dy) || 1;
      b.vx = (dx / m) * b.sp;
      b.vy = (dy / m) * b.sp;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    fx('dot', b.x - rand(10), b.y + rand(-b.r, b.r) * 0.6, { vx: G.speed * 0.6, vy: rand(-40, 40), color: pick(b.enh ? ['#fff8c9', '#ffd23f', '#ff9f43'] : ['#ffb347', '#ff7b00', '#ffe066']), size: rand(4, 9) * (b.enh ? 1.8 : 1), max: rand(0.2, 0.45) });
    for (const e of L.ents) {
      if (e.dead || e.gone) continue;
      const d = Math.hypot(e.x - b.x, targetY(e) - b.y);
      if (e.type === 'proj') {
        if (d < b.r + 18) { e.gone = true; burst(e.x, e.y, 10, '#ff8fa3'); text('ZAP!', e.x, e.y - 20, '#ffb347', 24); sfx.pop(); G.score += 10; G.combo++; if (!b.enh) b.gone = true; }
      } else if (e.enemy) {
        if (d < b.r + e.h * 0.45) {
          if (e.type === 'shield' && !b.enh) { b.gone = true; text('TING!', e.x - 20, e.y - e.h - 10, '#cfd6e4'); sfx.clang(); burst(b.x, b.y, 8, '#ffb347'); }
          else { hitEnemy(e, b.enh ? 9 : 1, 'fire'); if (!b.enh) b.gone = true; }
        }
      } else if (e.type === 'brazier' && !e.lit && d < b.r + 34) {
        e.lit = true;
        if (e.zone) e.zone.lit = 0.01;
        sfx.light();
        burst(e.x, e.y - 70, 18, '#ffb347', 300);
        text('LET THERE BE LIGHT', e.x + 80, e.y - 150, '#ffe066', 26);
        G.p.joyT = 0.7;
        G.score += 20;
        G.combo++;
        if (!b.enh) b.gone = true;
      }
      if (b.gone) break;
    }
    const bs = G.boss;
    if (!b.gone && bs && bs.state !== 'dead' && bs.state !== 'enter' && Math.hypot(bs.x - b.x, bs.y - 95 - b.y) < b.r + 80) {
      damageBoss(b.enh ? 3 : 1);
      burst(b.x, b.y, 10, '#ffb347');
      b.gone = true;
    }
    if (b.life > 1.6 || b.x > G.camX + W + 100) b.gone = true;
  }
  G.balls = G.balls.filter((b) => !b.gone);

  // particles
  for (const q of G.parts) {
    q.life += dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += q.g * dt;
    q.rot += q.rs * dt;
  }
  G.parts = G.parts.filter((q) => q.life < q.max);
  if (G.parts.length > 450) G.parts.splice(0, G.parts.length - 450);

  // one shared mood for the whole clump
  G.scared = (!p.ground && !p.swing && (p.y - p.peakY > 70 || !cs)) || dark > 0.5 ||
    (G.boss && (G.boss.state === 'wind' || G.boss.state === 'enter')) || G.health < 25;

  L.generate(G.camX, T, G.health);
}
