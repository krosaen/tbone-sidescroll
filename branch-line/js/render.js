// Draws the whole scene into the 480x270 canvas, back to front.
import { G } from './game.js';
import {
  W, H, LANE_Y, GROUND_Y, SX, LEAF_COLS, GRASS_LIP, px, ellipse, thick, mix, setOverride,
  makeSky, makeHills, makeOak, makeGround, makeCloud, drawCloud, drawSway,
} from './art.js';
import { drawSquirrel, drawCreature, drawAcorn, drawEagle, eagleFrame } from './sprites.js';
import { rand, hash, pick } from '../../shared/util.js';

// ---------- things painted once ----------
const SKY = makeSky();
const HILLS = makeHills();
const GROUND = makeGround();
const BG_OAKS = Array.from({ length: 7 }, (_, i) => makeOak({ height: 96 + ((i * 23) % 56), species: ['red', 'white', 'bur'][i % 3], scale: 0.42, haze: 0.42, leaves: 0.02, crownY: 150 }));
const CLOUDS = Array.from({ length: 5 }, (_, i) => ({ x: i * 120 + rand(60), y: 24 + rand(40), shape: makeCloud(rand(40, 80)) }));
const scratch = document.createElement('canvas');
scratch.width = scratch.height = 48;
const sc = scratch.getContext('2d');
const BRANCH = { // track-branch bark per oak: [shadow, base, lit, highlight]
  red: ['#24201d', '#3b3631', '#56504a', '#706a62'],
  white: ['#3e3a36', '#5c5750', '#7d776e', '#9c968b'],
  bur: ['#221c17', '#382e26', '#514439', '#6a5c4e'],
};

// falling oak leaves: background ones are smaller and slower; a few big ones drift past in front
const LEAVES = Array.from({ length: 46 }, (_, i) => newLeaf(i < 38 ? 0 : 1, true));
function newLeaf(layer, anywhere) {
  return {
    layer, x: anywhere ? rand(W) : W + rand(60), y: anywhere ? rand(GROUND_Y) : rand(-20, GROUND_Y * 0.6),
    th: rand(6.28), w: rand(1.2, 2.4), amp: rand(4, 12), vy: rand(7, 15) * (layer ? 1.6 : 1),
    col: layer ? pick(LEAF_COLS) : mix(pick(LEAF_COLS), '#a6d0f0', 0.25), big: layer ? 3 : Math.random() < 0.4 ? 2 : 1,
  };
}
function drawLeaves(c, dt, layer) {
  for (let i = 0; i < LEAVES.length; i++) {
    const l = LEAVES[i];
    if (l.layer !== layer) continue;
    l.th += l.w * dt;
    // flutter: side-to-side sway with the odd full loop, always sinking
    l.x += (Math.cos(l.th) * l.amp * 0.9 - G.speed * (layer ? 1.15 : 0.5) - 6) * dt;
    l.y += (l.vy + Math.sin(l.th * 2) * l.amp * 0.8) * dt;
    if (l.y > GROUND_Y + 4 || l.x < -10) { LEAVES[i] = newLeaf(layer, false); continue; }
    const flip = Math.abs(Math.cos(l.th * 1.7));
    px(c, l.x, l.y, Math.max(1, Math.round(l.big * flip)), l.big > 1 ? 2 : 1, flip < 0.35 ? mix(l.col, '#3a1a0a', 0.3) : l.col);
  }
}

function tile(c, img, f, y) {
  const off = Math.round(((G.camX * f) % img.width + img.width) % img.width);
  for (let x = -off; x < W; x += img.width) c.drawImage(img, x, y);
}

// ---------- world pieces ----------
function drawBranch(c, s, t) {
  const camX = Math.round(G.camX), a = Math.max(Math.ceil(s.x0), camX), b = Math.min(Math.floor(s.x1), camX + W);
  const col = BRANCH[s.tree.species];
  for (let x = a; x <= b; x++) {
    const right = x >= s.tx, len = right ? s.x1full - s.tx : s.tx - s.x0;
    const u = Math.min(1, Math.abs(x - s.tx) / len);
    let bump = 0;
    for (const k of s.knots) if (Math.abs(k.x - x) < 4) bump = k.d * (1 - Math.abs(k.x - x) / 4);
    const y = Math.round(G.world.surface(s, x, t)), th = Math.max(2, Math.round(8 - u * 5.5 + bump));
    const sx = x - camX, tip = s.broken && x > s.x1 - 4;
    px(c, sx, y, 1, th, tip ? '#c9a878' : col[1]);
    px(c, sx, y, 1, 1, tip ? '#e8d0a0' : col[3]);
    if (th > 3) px(c, sx, y + 1, 1, 1, col[2]);
    px(c, sx, y + th - 1, 1, 1, col[0]);
    if (th > 4 && hash(x * 1.7) > 0.8) px(c, sx, y + 2, 1, 1, col[0]); // bark texture
  }
  if (s.broken && s.x1 - camX < W) { // splintered end
    const y = Math.round(G.world.surface(s, s.x1, t));
    px(c, s.x1 - camX + 1, y - 1, 2, 1, '#d8b98a'); px(c, s.x1 - camX + 1, y + 2, 2, 1, '#c8a878');
  }
  for (const tw of s.twigs) {
    if (tw.x < camX - 12 || tw.x > camX + W + 12) continue;
    const y = G.world.surface(s, tw.x, t), x = tw.x - camX;
    const ex = x + Math.cos(tw.a) * tw.l, ey = y + Math.sin(tw.a) * tw.l;
    thick(c, x, y, ex, ey, tw.l > 9 ? 1.5 : 1, col[2]);
    if (tw.fork) thick(c, ex, ey, ex + Math.cos(tw.a + 0.7) * 5, ey + Math.sin(tw.a + 0.7) * 5, 1, col[2]);
  }
  // clumps of leaves that haven't let go yet: the quiet sign of a runnable branch
  for (const lf of s.leaves) {
    if (lf.x < camX - 20 || lf.x > camX + W + 20) continue;
    const y = Math.round(G.world.surface(s, lf.x, t)), img = lf.img;
    c.drawImage(img, Math.round(lf.x - camX - img.width / 2), lf.below ? y + 2 : y - img.height + 3);
  }
}
function drawWire(c, s, t) {
  const camX = Math.round(G.camX), a = Math.max(Math.ceil(s.x0), camX), b = Math.min(Math.floor(s.x1), camX + W);
  for (let x = a; x <= b; x++) px(c, x - camX, Math.round(G.world.surface(s, x, t)), 1, 1, '#24201c');
}
function drawPole(c, p) {
  const x = Math.round(p.x - G.camX), top = LANE_Y[Math.min(...p.lanes)] - 14;
  px(c, x - 2, top, 5, GROUND_Y - top + 2, '#6d5a46');
  px(c, x - 2, top, 1, GROUND_Y - top + 2, '#8c7660');
  px(c, x + 2, top, 1, GROUND_Y - top + 2, '#4b3d30');
  for (let y = top + 20; y < GROUND_Y; y += 23) px(c, x - 1, y, 2, 1, '#55463a');
  for (const l of p.lanes) {
    const y = LANE_Y[l];
    px(c, x - 11, y + 2, 23, 3, '#5e4c3a');
    px(c, x - 11, y + 2, 23, 1, '#7d6850');
    px(c, x - 8, y, 2, 2, '#8fc4ae'); px(c, x + 7, y, 2, 2, '#8fc4ae');
    px(c, x - 8, y, 1, 1, '#d4f0e4');
  }
}
const FIRE = ['#fff4b0', '#ffd848', '#ff9a22', '#f0561a', '#b8300c'];
function drawPart(c, q) {
  const x = q.x - G.camX, u = q.life / q.max;
  switch (q.kind) {
    case 'spark': { // gold glitter that twinkles
      if (u > 0.85 && (q.life * 30) % 2 < 1) return;
      const big = Math.floor(q.life * 14 + q.x * 0.3) % 4 === 0;
      if (big) { px(c, x - 1, q.y, 3, 1, q.col); px(c, x, q.y - 1, 1, 3, q.col); px(c, x, q.y, 1, 1, '#ffffff'); }
      else px(c, x, q.y, 1, 1, q.col);
      return;
    }
    case 'fire': {
      const col = FIRE[Math.min(4, Math.floor(u * 5))], sz = u < 0.25 ? 3 : u < 0.6 ? 2 : 1;
      px(c, x - (sz >> 1), q.y - (sz >> 1), sz + (u < 0.3 ? 2 : 0), sz, col); // flames stretch backward as they leave
      return;
    }
    case 'streak': px(c, x, q.y, q.w, 1, u < 0.5 ? '#ffffff' : '#ffd848'); return;
    default: px(c, x, q.y, q.w, q.h || 1, q.col);
  }
}

export function render(c, dt) {
  const t = G.t, W0 = G.world, s = G.s;
  c.imageSmoothingEnabled = false;
  c.drawImage(SKY, 0, 0);
  // noon sun, high and just off the top of the frame
  ellipse(c, 360, -6, 46, 30, 'rgba(255,255,240,.10)');
  ellipse(c, 360, -6, 30, 20, 'rgba(255,255,240,.16)');
  for (const cl of CLOUDS) {
    cl.x -= (2.5 + G.speed * 0.03) * dt;
    if (cl.x < -70) { cl.x = W + 70; cl.y = 20 + rand(45); cl.shape = makeCloud(rand(40, 80)); }
    drawCloud(c, cl.shape, cl.x, cl.y, t);
  }
  tile(c, HILLS, 0.1, GROUND_Y - 92);
  // bare background oaks, rooted on the ground line, swaying a touch at the top
  const f = 0.35, slot = 70, off = G.camX * f;
  for (let i = Math.floor(off / slot) - 2; i < Math.floor(off / slot) + W / slot + 3; i++) {
    if (hash(i * 3.3) < 0.3) continue;
    const img = BG_OAKS[(hash(i * 1.7) * BG_OAKS.length) | 0];
    drawSway(c, img, i * slot - off + hash(i) * 30 - img.width / 2, GROUND_Y + 2 - img.height, t, 0.8, i, 3, img.height * 0.6);
  }
  drawLeaves(c, dt, 0);
  tile(c, GROUND, 1, GROUND_Y - GRASS_LIP);

  const shake = G.shake > 0 ? Math.round(rand(-G.shake, G.shake)) : 0;
  c.save();
  c.translate(0, shake);
  for (const p of W0.poles) if (p.x - G.camX > -20 && p.x - G.camX < W + 20) drawPole(c, p);
  for (const tr of W0.trees) {
    const x = tr.tx - G.camX;
    if (x < -tr.img.width / 2 || x > W + tr.img.width / 2) continue;
    drawSway(c, tr.img, x - tr.img.width / 2, GROUND_Y - tr.img.height + 2, t, 1, tr.seed, 3, 90);
  }
  for (const sg of W0.segs) {
    if (sg.x1 < G.camX - 4 || sg.x0 > G.camX + W + 4) continue;
    sg.kind === 'branch' ? drawBranch(c, sg, t) : drawWire(c, sg, t);
  }
  // grass blades in front of trunks and poles
  for (let x = -Math.round(((G.camX % W) + W) % W); x < W; x += W) c.drawImage(GROUND, 0, 0, W, GRASS_LIP + 2, x, GROUND_Y - GRASS_LIP, W, GRASS_LIP + 2);

  for (const e of W0.ents) {
    if (e.x - G.camX < -30 || e.x - G.camX > W + 30) continue;
    if (e.dead) {
      sc.clearRect(0, 0, 48, 48);
      drawCreature(sc, { ...e, x: 24, y: 34 }, t);
      c.save();
      c.translate(Math.round(e.x - G.camX), Math.round(e.y - 10));
      c.rotate(Math.round((e.rot || 0) * 4) / 4);
      c.drawImage(scratch, -24, -24);
      c.restore();
      if (e.rocket) for (let i = 0; i < 4; i++) px(c, e.x - G.camX - 30 - i * 6, e.y - 14 + i * 4, 12, 1, 'rgba(255,255,255,.8)');
    } else drawCreature(c, { ...e, x: e.x - G.camX }, t);
  }
  // the squirrel
  const pose = s.hover ? 'glide' : s.spin > 0 ? 'spin' : s.glide ? 'glide' : !s.ground ? 'jump' : s.slideT > 0 ? 'slide' : s.butt > 0 ? 'butt' : 'run';
  if (s.inv > 0 && Math.floor(t * 14) % 2) setOverride('#ffffff');
  drawSquirrel(c, SX + s.lunge, s.y, pose, pose === 'spin' ? t * 24 : s.ph);
  setOverride(null);
  for (const q of G.parts) drawPart(c, q);
  // the golden eagle
  const E = G.eagle;
  if (E) {
    const [st, i] = E.frame;
    drawEagle(c, Math.round(E.x), Math.round(E.y), eagleFrame(st, i), -1, E.flash > 0 && Math.floor(t * 20) % 2 === 0);
  }
  c.restore();
  drawLeaves(c, dt, 1);

  // HUD: three acorns, the headbutt chain, and the eagle's remaining strength
  if (G.mode !== 'title' && G.mode !== 'title-over') {
    for (let i = 0; i < 3; i++) drawAcorn(c, 8 + i * 12, 7, i < G.acorns);
    for (let i = 0; i < G.combo; i++) { px(c, 10 + i * 6, 22, 3, 3, '#ffd848'); px(c, 11 + i * 6, 21, 1, 5, '#ffd848'); }
    if (E && E.state !== 'defeated') {
      for (let i = 0; i < 3; i++) {
        const x = W / 2 - 14 + i * 10, on = i < 3 - E.hits;
        thick(c, x, 30, x + 4, 22, 3, on ? '#c9963e' : 'rgba(40,30,20,.45)');
        if (on) thick(c, x + 1, 29, x + 4, 23, 1, '#e3b85e');
      }
    }
  }
}
