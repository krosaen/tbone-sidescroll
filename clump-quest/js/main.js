// Bootstrap: canvas sizing, input, menus and the frame loop.
import { G, W, H, BTN, reset, update, press } from './game.js';
import { render } from './render.js';
import { initAudio, setMuted, isMuted } from './audio.js';
import { bot } from './bot.js';
import { store } from '../../shared/util.js';

const $ = (id) => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d'), wrap = $('wrap');
const useBot = new URLSearchParams(location.search).has('bot');
let scale = 1;


function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const cw = Math.floor(W * s), ch = Math.floor(H * s);
  wrap.style.width = cw + 'px';
  wrap.style.height = ch + 'px';
  wrap.style.fontSize = 16 * s + 'px'; // menus are sized in em so they scale with the canvas
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(cw * dpr);
  cv.height = Math.round(ch * dpr);
  scale = cv.width / W;
}
window.addEventListener('resize', resize);
resize();

// ---------- difficulty slider ----------
const DIFF_NAMES = ['Cozy', 'Breezy', 'Spirited', 'Spicy', 'Hard', 'Extremely hard'];
const diffEl = $('diff');
function setDiff(v) {
  G.diff = v / 100;
  $('diffName').textContent = DIFF_NAMES[Math.min(5, Math.floor(v / 17))] + (v < 8 ? ' (can’t lose)' : '');
  store.set('clump.diff', v);
}
diffEl.value = store.get('clump.diff', 35);
setDiff(+diffEl.value);
diffEl.addEventListener('input', () => setDiff(+diffEl.value));
diffEl.addEventListener('change', () => diffEl.blur());
G.best = store.get('clump.best', 0);

// ---------- menus ----------
function show(id) {
  for (const p of ['title', 'pause', 'over']) $(p).classList.toggle('hidden', p !== id);
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); // keep Space for jumping
}
function start() {
  initAudio();
  reset('play');
  show(null);
}
function togglePause() {
  if (G.mode === 'play') { G.mode = 'paused'; show('pause'); }
  else if (G.mode === 'paused') { G.mode = 'play'; show(null); }
}
function toggleMute() {
  setMuted(!isMuted());
  $('btnMute').classList.toggle('off', isMuted());
}
G.onOver = () => {
  store.set('clump.best', G.best);
  $('stats').innerHTML = `Score <b>${Math.floor(G.score).toLocaleString()}</b> · Stage <b>${G.stage + 1}</b> · Foes bonked <b>${G.kills}</b><br>Best <b>${G.best.toLocaleString()}</b>`;
  setTimeout(() => show('over'), 700);
};
$('btnStart').onclick = start;
$('btnRetry').onclick = start;
$('btnRestart').onclick = start;
$('btnResume').onclick = togglePause;
$('btnPause').onclick = togglePause;
$('btnMute').onclick = toggleMute;

// ---------- input ----------
const KEYS = {
  Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
  KeyA: 'barb', KeyS: 'druid', KeyD: 'wiz', KeyF: 'cleric',
  KeyG: 'pal', ShiftLeft: 'pal', ShiftRight: 'pal',
};
window.addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey) return;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.code === 'KeyP' || e.code === 'Escape') return togglePause();
  if (e.code === 'KeyM') return toggleMute();
  if (G.mode === 'title' || G.mode === 'over') {
    if (e.code === 'Space' || e.code === 'Enter') { if (!$('over').classList.contains('hidden') || G.mode === 'title') start(); }
    return;
  }
  if (G.mode === 'paused' && (e.code === 'Space' || e.code === 'Enter')) return togglePause();
  const id = KEYS[e.code];
  if (id) { initAudio(); press(id); }
});
// touch / mouse: tap a hero button, or anywhere else to jump
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (G.mode !== 'play') return;
  initAudio();
  const r = cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  for (const b of BTN) if (Math.hypot(x - b.x, y - b.y) < b.r + 11) return press(b.id);
  press('jump');
});
// portrait phones get a "turn your phone" card (see style.css); don't let the run continue underneath it
const portrait = window.matchMedia('(orientation: portrait) and (max-width: 700px)');
portrait.addEventListener('change', () => { if (portrait.matches && G.mode === 'play') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') togglePause(); });

// ---------- loop ----------
reset('title');
show('title');
if (useBot) start();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (G.mode === 'play' || G.mode === 'title') {
    if (useBot) bot();
    update(dt);
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  render(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// For poking at things in the console. sim(n) fast-forwards n seconds with the bot playing.
window.__clump = {
  G, press, start, update,
  sim(secs) { for (let i = 0; i < secs * 60 && G.mode === 'play'; i++) { bot(); update(1 / 60); } },
};
