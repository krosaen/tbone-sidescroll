// Branch Line's sound effects, built on the shared synth. Kept soft: it's a sunny afternoon.
import { tone, noise } from '../../shared/audio.js';
export { initAudio, setMuted, isMuted } from '../../shared/audio.js';

// A martial-arts snap: a whip-crack of air, a sharp slap and a body thump.
function snap(v, pitch, delay = 0) {
  noise(0.09, 0.12 * v, 900 * pitch, 4200 * pitch, delay); // whoosh
  noise(0.035, 0.42 * v, 5200 * pitch, 2600 * pitch, delay + 0.05); // crack
  tone('sine', 210 * pitch, 55, 0.14, 0.32 * v, delay + 0.05); // thump
}

export const sfx = {
  jump() { tone('sine', 420, 760, 0.12, 0.05); },
  launch() { tone('sine', 380, 1200, 0.22, 0.06); noise(0.18, 0.05, 800, 3000); },
  drop() { tone('sine', 700, 260, 0.18, 0.05); },
  glide() { [1568, 2093, 2637].forEach((f, i) => tone('sine', f, f, 0.25, 0.025, i * 0.06)); noise(0.5, 0.04, 600, 1500); },
  slide() { noise(0.3, 0.07, 2500, 600); },
  butt() { noise(0.08, 0.06, 900, 400); },
  spin() { noise(0.45, 0.12, 500, 3500); tone('sawtooth', 220, 880, 0.4, 0.04); },
  land() { noise(0.05, 0.06, 500, 200); tone('triangle', 220, 160, 0.06, 0.04); },
  twang() { tone('triangle', 140, 120, 0.35, 0.07); tone('sine', 280, 250, 0.3, 0.03); },
  // Headbutt combo: 1 = a clean snap, 2 = louder and brighter, 3 = biggest, with an echo.
  kick(level) {
    if (level <= 1) snap(1, 1);
    else if (level === 2) { snap(1.5, 1.2); tone('square', 900, 300, 0.12, 0.06, 0.05); }
    else {
      snap(2.1, 1.35);
      tone('sawtooth', 160, 40, 0.35, 0.12, 0.05);
      for (let i = 1; i <= 3; i++) snap(1.4 * 0.45 ** i, 1.35, 0.16 * i); // echo
    }
  },
  thump() { noise(0.06, 0.12, 1200, 400); tone('sine', 300, 90, 0.1, 0.08); },
  tackle() { tone('sine', 300, 900, 0.18, 0.07); noise(0.12, 0.08, 1500, 3000); },
  hit() { tone('square', 300, 110, 0.25, 0.07); },
  chatter() { for (let i = 0; i < 7; i++) tone('square', 2600 + (i & 1) * 500, 2000, 0.025, 0.018, i * 0.055); },
  caw() { tone('sawtooth', 620, 480, 0.16, 0.03); tone('sawtooth', 600, 460, 0.16, 0.03, 0.2); },
  chirp() { tone('sine', 2400, 3200, 0.06, 0.03); tone('sine', 2600, 3400, 0.06, 0.03, 0.09); },
  // golden eagles are mostly quiet; a thin, high yelp
  eagleCall() { tone('sawtooth', 1700, 1350, 0.22, 0.03); tone('sawtooth', 1750, 1400, 0.22, 0.03, 0.3); tone('sawtooth', 1800, 1300, 0.3, 0.03, 0.6); },
  swoop() { noise(0.55, 0.16, 300, 2200); },
  grab() { noise(0.1, 0.2, 1800, 600); tone('square', 200, 90, 0.2, 0.08); },
  eagleHurt() { tone('sawtooth', 1500, 900, 0.25, 0.05, 0.08); },
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.3, 0.08, i * 0.1)); },
  over() { [523, 440, 349, 262].forEach((f, i) => tone('triangle', f, f * 0.95, 0.35, 0.08, i * 0.18)); },
};
