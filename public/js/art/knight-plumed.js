// Plumed knight by Mattz Art: https://xzany.itch.io/free-knight-2d-pixel-art
// The exact normalized frames selected in the comparer, in the colours picked in
// the Sprite Lab (recoloured.js; the original is archived outside the published game).
// Asset terms are preserved in public/assets/knight-plumed/LICENSE.txt.
import data from '../../assets/knight-plumed/recoloured.js';
import { makeBuf } from '../engine/pixels.js';
import { normalWalkRate } from '../game/hero-animation.js';

const { idle, walk, attack } = data.animations;
// The source swing runs at 10 fps. Hold its six poses on the Knight's 24 Hz
// strike clock so his existing one-tick lead into sword contact stays intact.
const swing = [0, 0, 1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5];
const moving = attack.map((_, pose) => walk.map((_, step) => data.frames.length + pose * walk.length + step));

// Uppermost leg rows sit behind the tabard. Where the lowered walking sword
// hides a greave, its other half-stride supplies the unobstructed steel.
function walkingLegs(frames, step) {
  const stride = frames[walk[step]], other = frames[walk[(step + 4) % walk.length]];
  const legs = makeBuf(stride.w, stride.h);
  for (let y = 40; y < data.footLine; y++) {
    for (let x = 31; x <= 47; x++) {
      const i = y * stride.w + x;
      let color = stride.d[i];
      if (step === 0 && x >= 40) color = 0;
      if (step === 5 && x >= 42 && y <= 42) color = other.d[i];
      if (step >= 6 && x >= 35 && x <= 41 && y <= 45) color = other.d[i];
      if (step === 4 && x > 42 && y === 40) color = 0;
      legs.d[i] = color;
    }
  }
  return legs;
}

// Bottom edges of the attacker's tabard, cape and low sword, traced on the
// six standing poses. Paint those in front of the travelling hips and knees.
function movingStrike(strike, legs, pose, step) {
  const out = { ...legs, d: legs.d.slice() };
  const bob = [0, -1, 0, 1, 0, -1, 0, 1][step];
  for (let x = 0; x < strike.w; x++) {
    let hem = pose >= 3 ? 41 : 40;
    if (pose <= 2 && x < 35) hem = 44 - Math.max(0, x - 32);
    if (pose === 0 && x >= 38) hem = x >= 42 && x <= 45 ? 42 : 41;
    if (pose >= 4 && x <= 40) hem = 43;
    for (let y = 0; y <= hem; y++) {
      const pixel = strike.d[y * strike.w + x];
      if (pixel) out.d[(y + bob) * out.w + x] = pixel;
    }
  }
  return out;
}

let decoded;
export const KNIGHT_PLUMED = {
  gen() {
    // Palette indices are one byte per pixel, or two (little-endian) past 256 colours.
    const n = data.indexBytes || 1;
    if (decoded) return decoded;
    const frames = data.frames.map(encoded => {
      const bytes = atob(encoded), d = new Uint32Array(data.w * data.h);
      for (let i = 0; i < d.length; i++) d[i] = data.palette[n === 2 ? bytes.charCodeAt(2 * i) | bytes.charCodeAt(2 * i + 1) << 8 : bytes.charCodeAt(i)];
      return { w: data.w, h: data.h, d };
    });
    const legs = walk.map((_, step) => walkingLegs(frames, step));
    decoded = frames.concat(attack.flatMap((index, pose) =>
      legs.map((stride, step) => movingStrike(frames[index], stride, pose, step))));
    return decoded;
  },
  idle, walk,
  attack: swing.map(pose => attack[pose]),
  attackWalk: swing.map(pose => moving[pose]),
  attackStart: 6, attackRelease: 7,
  motionRate: normalWalkRate('knight', data.fps.walk),
  idleRate: data.fps.idle / 1.6,
  attackFps: 24,
  anchorY: data.footLine,
  fitW: 36,
  fitH: 32,
  selfBob: true,
  outline: false,
};
