// Clump Quest's canvas drawing helpers, plus the gallery-wide math helpers re-exported.
import { TAU } from '../../shared/util.js';
export { TAU, clamp, lerp, rand, pick, ease, hash } from '../../shared/util.js';

export const INK = '#2b1b2e';
export const FONT = 'Fredoka, "Trebuchet MS", system-ui, sans-serif';

// fill + cartoon outline for the current path
export function fs(c, fill, lw = 2.5) {
  c.fillStyle = fill;
  c.fill();
  if (lw) {
    c.lineWidth = lw;
    c.strokeStyle = INK;
    c.stroke();
  }
}
export function circ(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, Math.max(0.1, r), 0, TAU);
}
export function ell(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
export function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
export function poly(c, pts) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}
export function star(c, x, y, r, n = 5, rot = 0, inner = 0.45) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n - Math.PI / 2;
    const rad = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
export function line(c, x1, y1, x2, y2, col, w) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.stroke();
}
// outlined limb
export function limb(c, x1, y1, x2, y2, col, w) {
  line(c, x1, y1, x2, y2, INK, w + 4);
  line(c, x1, y1, x2, y2, col, w);
}
