// Plumed knight by Mattz Art: https://xzany.itch.io/free-knight-2d-pixel-art
// The exact normalized frames selected in the comparer, in the colours picked in
// the Sprite Lab (recoloured.js; the original is archived outside the published game).
// Asset terms are preserved in public/assets/knight-plumed/LICENSE.txt.
import data from '../../assets/knight-plumed/recoloured.js';

let decoded;
export const KNIGHT_PLUMED = {
  gen() {
    // Palette indices are one byte per pixel, or two (little-endian) past 256 colours.
    const n = data.indexBytes || 1;
    return decoded ??= data.frames.map(encoded => {
      const bytes = atob(encoded), d = new Uint32Array(data.w * data.h);
      for (let i = 0; i < d.length; i++) d[i] = data.palette[n === 2 ? bytes.charCodeAt(2 * i) | bytes.charCodeAt(2 * i + 1) << 8 : bytes.charCodeAt(i)];
      return { w: data.w, h: data.h, d };
    });
  },
  idle: data.animations.idle,
  walk: data.animations.walk,
  attack: data.animations.attack,
  motionRate: data.fps.walk / (9.8 * .97),
  idleRate: data.fps.idle / 1.6,
  attackFps: data.fps.attack,
  anchorY: data.footLine,
  fitW: 36,
  fitH: 32,
  selfBob: true,
  outline: false,
};
