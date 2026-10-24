// Bootstrap: canvas scaling, keyboard + touch input, menus and the frame loop.
import { G, reset, update, score, upPress, upRelease, downPress, downRelease, rightPress } from './game.js';
import { render } from './render.js';
import { W, H } from './art.js';
import { initAudio, setMuted, isMuted } from './sfx.js';
import { bot } from './bot.js';
import { store } from '../../shared/util.js';

const $ = (id) => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d'), wrap = $('wrap');
const useBot = new URLSearchParams(location.search).has('bot');

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  wrap.style.width = Math.floor(W * s) + 'px';
  wrap.style.height = Math.floor(H * s) + 'px';
  wrap.style.fontSize = (s * 8) + 'px'; // UI is sized in em so it scales with the pixels
}
window.addEventListener('resize', resize);
resize();

// ---------- speed slider ----------
const NAMES = ['Lazy Sunday', 'Easy stroll', 'Brisk', 'Zippy', 'Frantic', 'Absolutely nuts'];
const diffEl = $('diff');
function setDiff(v) {
  G.diff = v / 100;
  $('diffName').textContent = NAMES[Math.min(5, Math.floor(v / 17))];
  store.set('branch.diff', v);
}
diffEl.value = store.get('branch.diff', 30);
setDiff(+diffEl.value);
diffEl.addEventListener('input', () => setDiff(+diffEl.value));
diffEl.addEventListener('change', () => diffEl.blur());
G.best = store.get('branch.best', 0);

// ---------- menus ----------
function show(id) {
  for (const p of ['title', 'pause', 'over']) $(p).classList.toggle('hidden', p !== id);
  $('score').classList.toggle('hidden', id === 'title');
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
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
  store.set('branch.best', G.best);
  $('stats').innerHTML = `You made it <b>${score().toLocaleString()} m</b><br>Best <b>${G.best.toLocaleString()} m</b>`;
  setTimeout(() => show('over'), 800);
};
let toastTimer = 0;
G.onToast = (msg) => {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
};
$('btnStart').onclick = start;
$('btnRetry').onclick = start;
$('btnRestart').onclick = start;
$('btnResume').onclick = togglePause;
$('btnPause').onclick = togglePause;
$('btnMute').onclick = toggleMute;

// ---------- input ----------
const UP = ['ArrowUp', 'KeyW'], DOWN = ['ArrowDown', 'KeyS'], RIGHT = ['ArrowRight', 'KeyD'];
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyP' || e.code === 'Escape') return togglePause();
  if (e.code === 'KeyM') return toggleMute();
  const go = e.code === 'Space' || e.code === 'Enter';
  if (G.mode === 'title' || G.mode === 'title-over') { if (go) start(); return; }
  if (G.mode === 'over') { if (go && !$('over').classList.contains('hidden')) start(); return; }
  if (G.mode === 'paused' && (e.code === 'Space' || e.code === 'Enter')) return togglePause();
  initAudio();
  if (UP.includes(e.code)) upPress();
  else if (DOWN.includes(e.code)) downPress();
  else if (RIGHT.includes(e.code)) rightPress();
});
window.addEventListener('keyup', (e) => {
  if (UP.includes(e.code)) upRelease();
  if (DOWN.includes(e.code)) downRelease();
});

// touch buttons: press/hold just like the arrow keys
for (const [id, down, up] of [['tUp', upPress, upRelease], ['tDown', downPress, downRelease], ['tRight', rightPress]]) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); if (G.mode === 'play') down(); });
  if (up) for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => up());
}

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
  if (G.mode === 'title-over') reset('title'); // the demo squirrel ran out of acorns: start the demo over
  if (G.mode === 'play' || G.mode === 'title') {
    if (useBot || G.mode === 'title') bot();
    update(dt);
    $('score').textContent = score().toLocaleString() + ' m';
  }
  render(ctx, G.mode === 'paused' || G.mode === 'over' ? 0 : dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// For poking at things in the console. sim(n) fast-forwards n seconds with the bot playing.
window.__branch = {
  G, start, update, upPress, upRelease, downPress, downRelease, rightPress,
  sim(secs) { for (let i = 0; i < secs * 60 && G.mode === 'play'; i++) { bot(); update(1 / 60); } },
};
