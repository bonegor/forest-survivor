import originalBosses from '../../public/assets/art/bosses.js';
import { PAL } from '../../public/js/art/palette.js';
import { hexPack } from '../../public/js/engine/pixels.js';

const colours = [
  null, '#20182c', PAL.Y, '#f39c29', '#8b4a30', '#a4b9d8', '#56313d', '#576c9a',
  PAL.K, '#e3f2fc', '#ffd670', '#cb6b38', '#354569', '#e0d5b7', '#959478',
  '#594342', PAL.h, PAL.z, PAL.K, PAL.K, null, null, null,
];
const SHIELD_SHADOW = 23;
const SHIELD_FACE = 24;
const SHIELD_GLINT = 25;
const CLOAK_EDGE = 26;
const GOLD_SPECULAR = 27;
const BLUE_SPECULAR = 28;
const STEEL_SPECULAR = 29;
const broadColours = [
  '#193a67', '#257db5', PAL.U, '#535576', '#fff4b0', '#65e2f5', '#d0e4f6',
];
const crownGlints = [[32, 11], [33, 11], [36, 16], [37, 15], [38, 15],
  [39, 14], [40, 14], [48, 11], [48, 12]];
const shieldGlints = [[37, 38], [38, 37], [39, 37], [36, 40], [37, 39]];
const steelGlints = [[25, 27], [26, 27], [27, 28], [26, 33], [27, 33], [28, 33],
  [51, 27], [52, 28]];
const shoulderFacets = [[26, 29], [27, 29], [28, 29], [27, 30], [28, 30],
  [28, 34], [29, 34], [30, 34], [49, 29], [50, 29], [51, 29], [50, 30], [51, 30]];
const face = [
  'EHHHHHDDE..',
  'EHHHHDDDE..',
  'EEHHDDDDE..',
  '.EDDDDDDDE.',
  '.E888D888EE',
  '.E8A8D8A8DE',
  '.D888D888DE',
  '.DDDE8EDD..',
  '..DD888DD..',
  '..EHDHDDE..',
  '...DDDDDE..',
  '....EEE....',
  '.....E.....',
];
const faceIndices = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function chunkyBoneKing(data) {
  const { w, h } = data;
  const source = originalBosses.boneking.frames.map(frame => Buffer.from(frame, 'base64'));
  const rest = source[0];
  const base = Buffer.from(data.frames[0], 'base64');
  const palette = data.palette.map((pixel, index) => {
    const color = colours[index];
    return color ? ((hexPack(color) & 0xffffff) | (pixel & 0xff000000)) >>> 0 : pixel;
  }).concat(broadColours.map(color => hexPack(color) >>> 0));

  const frames = data.frames.map((frame, number) => {
    const pixels = Buffer.from(frame, 'base64');
    // The released nova is a one-frame ivory flash. It keeps its effect colours.
    if (number === 26) return frame;
    const pose = source[number];
    let leftEye = w;
    let topEye = h;
    for (let i = 0; i < pose.length; i++) {
      if (pose[i] === 10 || pose[i] === 11) {
        leftEye = Math.min(leftEye, i % w);
        topEye = Math.min(topEye, Math.floor(i / w));
      }
    }
    const dx = leftEye - 38;
    const dy = topEye - 23;
    const paint = (x, y, choose) => {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= w || ty >= h) return;
      const original = y * w + x;
      const target = ty * w + tx;
      // Original material ownership leaves sword, fists and spell in front.
      if (!rest[original] || pose[target] !== rest[original]) return;
      const prev = pixels[target];
      if ((palette[prev] >>> 24) !== 255) return;
      pixels[target] = choose(prev, base[original]);
    };

    for (const [row, pattern] of face.entries()) {
      for (const [column, ink] of Array.from(pattern).entries()) {
        if (ink !== '.') paint(36 + column, 19 + row, (prev, model) =>
          [8, 10, 11, 13, 14, 17].includes(model) ? faceIndices.indexOf(ink) : prev);
      }
    }

    // Hard white-gold peaks and cold steel facets stay in their materials
    // through mirrored travel and sword poses.
    const goldGlint = (prev, model) => model === 2 || model === 3 ? GOLD_SPECULAR : prev;
    for (const [x, y] of crownGlints) paint(x, y, goldGlint);
    for (const [x, y] of shieldGlints) paint(x, y, goldGlint);
    // A single hard-cut gemstone repeats the shield blue at the crown.
    for (const [x, y, tone] of [[40, 15, BLUE_SPECULAR], [39, 16, SHIELD_SHADOW],
      [40, 16, SHIELD_GLINT], [41, 16, SHIELD_SHADOW], [40, 17, SHIELD_SHADOW]]) {
      paint(x, y, (prev, model) => [2, 3, 4, 6].includes(model) ? tone : prev);
    }
    for (const [x, y] of steelGlints) paint(x, y, (prev, model) =>
      model === 5 || model === 7 ? STEEL_SPECULAR : prev);
    for (const [x, y] of shoulderFacets) paint(x, y, (prev, model) =>
      model === 7 || model === 12 ? 5 : prev);

    // The shield has a large cobalt field under the existing tall gold crest.
    // Its lit face is a single stepped patch; the plate's right edge is shaded.
    for (let y = 36; y <= 51; y++) {
      for (let x = 36; x <= 46; x++) {
        paint(x, y, (prev, model) => {
          if (model !== 8 && model !== 12) return prev;
          if (x < 38 || x > 44 || (y >= 49 && (x < 40 || x > 43))) return prev;
          if ((x === 38 && y >= 39 && y <= 41) || (x === 39 && y === 38)) return BLUE_SPECULAR;
          if (y >= 38 && y <= 44 && x <= 40 && (x < 40 || y < 41)) return SHIELD_GLINT;
          return x < 43 && y <= 47 ? SHIELD_FACE : SHIELD_SHADOW;
        });
      }
    }

    // A few wide planes separate the cloak from the plate above it.
    for (let y = 52; y <= 61; y++) {
      for (let x = 33; x <= 43; x++) {
        paint(x, y, (prev, model) => {
          if (![1, 8, 12].includes(model) || x > 37 + (y > 55 ? 1 : 0)) return prev;
          if (x === 34 && y < 55) return CLOAK_EDGE;
          return x < 37 && y < 58 ? 12 : 8;
        });
      }
    }
    return pixels.toString('base64');
  });
  return { ...data, palette, frames, glow: ['#ffd670', '#cb6b38'] };
}
