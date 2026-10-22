// Draws the whole scene into the 480x270 canvas, back to front.
import { G } from './game.js';
import {
  W, H, LANE_Y, GROUND_Y, SX, PALS, LEAF_COLS, px, ellipse, mix, setOverride,
  makeSky, makeHills, makeCanopy, makeTrunk, makeGround, makeCloud, drawCloud, drawSway, randomPal,
} from './art.js';
import { drawSquirrel, drawCreature, drawAcorn } from './sprites.js';
import { rand, hash, pick } from '../../shared/util.js';

// ---------- things painted once ----------
const SKY = makeSky();
const FAR = makeHills(1.3, '#6e5a30', 70, 0.5);
const NEAR = makeHills(4.1, '#5a4420', 60, 0.22);
const GROUND = makeGround();
const MID_TREES = Array.from({ length: 7 }, (_, i) => {
  const w = 44 + ((i * 13) % 30), h = 58 + ((i * 17) % 34), pal = Object.keys(PALS)[i % 5];
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h + 16;
  const c = cv.getContext('2d');
  c.drawImage(makeTrunk(6, 50, 0.12), Math.round(w / 2 - 3), h - 12);
  c.drawImage(makeCanopy(w, h, pal, 0.3), 0, 0);
  return cv;
});
const CLOUDS = Array.from({ length: 5 }, (_, i) => ({ x: i * 120 + rand(60), y: 24 + rand(40), shape: makeCloud(rand(40, 80)) }));
const scratch = document.createElement('canvas');
scratch.width = scratch.height = 48;
const sc = scratch.getContext('2d');

// falling leaves: background ones are smaller and slower; a few big ones drift past in front
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
  for (let x = a; x <= b; x++) {
    const right = x >= s.tx, len = right ? s.x1full - s.tx : s.tx - s.x0;
    const u = Math.min(1, Math.abs(x - s.tx) / len);
    const y = Math.round(G.world.surface(s, x, t)), th = Math.max(2, Math.round(6 - u * 4));
    const sx = x - camX, tip = s.broken && x > s.x1 - 4;
    px(c, sx, y, 1, th, tip ? '#d8b98a' : '#5a3d27');
    px(c, sx, y, 1, 1, tip ? '#f0d8a8' : '#8c6a46');
    px(c, sx, y + th - 1, 1, 1, '#2e1f14');
  }
  if (s.broken && s.x1 - camX < W) { // splintered end
    const y = Math.round(G.world.surface(s, s.x1, t));
    px(c, s.x1 - camX + 1, y - 1, 2, 1, '#d8b98a'); px(c, s.x1 - camX + 1, y + 2, 2, 1, '#c8a878');
  }
  for (const tf of s.tufts) {
    if (tf.x < camX - 12 || tf.x > camX + W) continue;
    const y = Math.round(G.world.surface(s, tf.x, t));
    c.drawImage(s.tree.tuft, Math.round(tf.x - camX - 5), tf.up ? y - 6 : y + 2);
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
  tile(c, FAR, 0.06, GROUND_Y - 92);
  tile(c, NEAR, 0.15, GROUND_Y - 70);
  // swaying background trees
  const f = 0.35, slot = 64, off = G.camX * f;
  for (let i = Math.floor(off / slot) - 1; i < Math.floor(off / slot) + W / slot + 2; i++) {
    if (hash(i * 3.3) < 0.25) continue;
    const img = MID_TREES[(hash(i * 1.7) * MID_TREES.length) | 0];
    drawSway(c, img, i * slot - off + hash(i) * 30, GROUND_Y + 4 - img.height, t, 1.6, i, 2);
  }
  drawLeaves(c, dt, 0);
  tile(c, GROUND, 1, GROUND_Y);

  const shake = G.shake > 0 ? Math.round(rand(-G.shake, G.shake)) : 0;
  c.save();
  c.translate(0, shake);
  for (const p of W0.poles) if (p.x - G.camX > -20 && p.x - G.camX < W + 20) drawPole(c, p);
  for (const tr of W0.trees) {
    const x = tr.tx - G.camX;
    if (x < -tr.canopy.width || x > W + tr.canopy.width) continue; // canopy is wider than the trunk
    c.drawImage(tr.trunk, Math.round(x - tr.w / 2), 30);
    drawSway(c, tr.canopy, (tr.x0 + tr.x1) / 2 - G.camX - tr.canopy.width / 2, -10, t, 1.3, tr.seed, 3);
  }
  for (const sg of W0.segs) {
    if (sg.x1 < G.camX - 4 || sg.x0 > G.camX + W + 4) continue;
    sg.kind === 'branch' ? drawBranch(c, sg, t) : drawWire(c, sg, t);
  }
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
    } else drawCreature(c, { ...e, x: e.x - G.camX }, t);
  }
  // the squirrel
  const pose = s.hover || s.glide ? 'glide' : !s.ground ? 'jump' : s.slideT > 0 ? 'slide' : s.butt > 0 ? 'butt' : 'run';
  if (s.inv > 0 && Math.floor(t * 14) % 2) setOverride('#ffffff');
  drawSquirrel(c, SX + s.lunge, s.y, pose, s.ph, s.juiceT > 0 ? s.juice : null);
  setOverride(null);
  for (const q of G.parts) px(c, q.x - G.camX, q.y, q.w, q.h || 1, q.col);
  c.restore();
  drawLeaves(c, dt, 1);

  // HUD: three acorns
  if (G.mode !== 'title' && G.mode !== 'title-over') for (let i = 0; i < 3; i++) drawAcorn(c, 8 + i * 12, 7, i < G.acorns);
}
