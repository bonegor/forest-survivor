import { hexPack } from '../../public/js/engine/pixels.js';
import { paladinCrest } from './heavy-hero-clarity.mjs';
import { trailHeadRows } from './trail-head.mjs';

// Keep Sylva's brow, eye spacing and cheek at their native resolution.
const nearEye = hexPack('#996036'), farEye = hexPack('#62391f');
const face = [];
for (const { x: left, y, pixels } of trailHeadRows) {
  for (const [column, { hair, color }] of pixels.entries()) {
    if (hair) continue;
    const x = left + column;
    const iris = y === 34 && (x === 38 || x === 41);
    const paint = iris ? ((color & 0xff000000) | ((x === 38 ? nearEye : farEye) & 0xffffff)) >>> 0 : color;
    face.push({ dx: x - 37, dy: y - 28, paint });
  }
}

// The near ear is a compact helix and lobe tucked into the hair. The red
// lock continues down the nape and tapers behind the sword-side pauldron.
const ink = Object.fromEntries(Object.entries({
  k: '#160d22', d: '#4d122a', r: '#76192e', R: '#962438',
  h: '#dc9a80', s: '#a86359', l: '#c78270',
}).map(([key, value]) => [key, hexPack(value)]));
const lockAndEar = [
  [-5,  5, 'kdRrh'],
  [-6,  6, 'krrRhs'],
  [-6,  7, 'krRrdl'],
  [-7,  8, 'kdRrd'],
  [-7,  9, 'krRd'],
  [-7, 10, 'kRr'],
  [-7, 11, 'rd'],
  [-7, 12, 'd'],
];

export function fitPaladinFace(frame, swordPixels) {
  const crest = paladinCrest(frame);
  const d = frame.d.slice();
  for (const { dx, dy, paint } of face) {
    const i = (crest.y + dy) * frame.w + crest.x + dx;
    if (!swordPixels?.has(i)) d[i] = paint;
  }
  for (const [dx, dy, row] of lockAndEar) {
    const left = (crest.y + dy) * frame.w + crest.x + dx;
    for (let x = 0; x < row.length; x++) {
      const i = left + x;
      if (swordPixels?.has(i) || (dy >= 10 && frame.d[i] >>> 24 > 127)) continue;
      d[i] = ink[row[x]];
    }
  }
  return { ...frame, d };
}
