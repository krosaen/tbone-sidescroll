// Clump Quest's sound effects, built on the shared synth.
import { tone, noise } from '../../shared/audio.js';
export { initAudio, setMuted, isMuted } from '../../shared/audio.js';

export const sfx = {
  jump() { tone('square', 280, 620, 0.12, 0.05); },
  land() { noise(0.06, 0.08, 300, 100); },
  punch() { noise(0.12, 0.3, 500, 120); tone('sine', 170, 45, 0.2, 0.3); },
  smash() { noise(0.3, 0.35, 900, 100); tone('sine', 110, 35, 0.3, 0.3); },
  whip() { noise(0.16, 0.2, 500, 5000); tone('sawtooth', 300, 1200, 0.1, 0.04); },
  fire() { tone('sawtooth', 700, 120, 0.25, 0.08); noise(0.2, 0.1, 2500, 500); },
  orb() { tone('sine', 520, 780, 0.3, 0.1); tone('sine', 780, 1040, 0.3, 0.07, 0.05); },
  block() { tone('triangle', 900, 300, 0.2, 0.2); noise(0.08, 0.2, 2000, 800); },
  bless() { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.09, i * 0.05)); },
  enh() { tone('sawtooth', 200, 1600, 0.3, 0.08); },
  hurt() { tone('square', 320, 70, 0.3, 0.12); },
  hit() { tone('square', 500, 200, 0.08, 0.08); },
  pop() { tone('sine', 900, 300, 0.1, 0.12); },
  clang() { tone('square', 1300, 900, 0.25, 0.07); tone('square', 1730, 1200, 0.25, 0.05); },
  heal() { [659, 784, 988, 1319].forEach((f, i) => tone('sine', f, f, 0.3, 0.1, i * 0.07)); },
  light() { noise(0.4, 0.15, 400, 3000); tone('sine', 300, 900, 0.4, 0.08); },
  click() { tone('triangle', 700, 1000, 0.1, 0.12); },
  spit() { tone('square', 220, 500, 0.1, 0.06); },
  thud() { noise(0.2, 0.3, 200, 60); tone('sine', 90, 40, 0.25, 0.3); },
  boss() { [196, 185, 175, 147].forEach((f, i) => tone('sawtooth', f, f, 0.3, 0.09, i * 0.18)); },
  win() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone('triangle', f, f, 0.3, 0.1, i * 0.09)); },
  over() { [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * 0.9, 0.4, 0.12, i * 0.2)); },
};
