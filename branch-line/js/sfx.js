// Branch Line's sound effects, built on the shared synth. Kept soft: it's a sunny afternoon.
import { tone, noise } from '../../shared/audio.js';
export { initAudio, setMuted, isMuted } from '../../shared/audio.js';

export const sfx = {
  jump() { tone('sine', 420, 760, 0.12, 0.05); },
  launch() { tone('sine', 380, 1200, 0.22, 0.06); noise(0.18, 0.05, 800, 3000); },
  drop() { tone('sine', 700, 260, 0.18, 0.05); },
  glide() { noise(0.5, 0.05, 600, 1500); },
  slide() { noise(0.3, 0.07, 2500, 600); },
  butt() { noise(0.08, 0.08, 900, 400); },
  land() { noise(0.05, 0.06, 500, 200); tone('triangle', 220, 160, 0.06, 0.04); },
  twang() { tone('triangle', 140, 120, 0.35, 0.07); tone('sine', 280, 250, 0.3, 0.03); },
  bonk() { tone('square', 420, 140, 0.12, 0.06); noise(0.06, 0.12, 1200, 400); },
  tackle() { tone('sine', 300, 900, 0.18, 0.07); noise(0.12, 0.08, 1500, 3000); },
  splat() { noise(0.25, 0.2, 700, 150); tone('sine', 200, 60, 0.2, 0.08); },
  hit() { tone('square', 300, 110, 0.25, 0.07); },
  caw() { tone('sawtooth', 620, 480, 0.16, 0.03); tone('sawtooth', 600, 460, 0.16, 0.03, 0.2); },
  chirp() { tone('sine', 2400, 3200, 0.06, 0.03); tone('sine', 2600, 3400, 0.06, 0.03, 0.09); },
  over() { [523, 440, 349, 262].forEach((f, i) => tone('triangle', f, f * 0.95, 0.35, 0.08, i * 0.18)); },
};
