import trail from './baseline/trailblazer.js';
import { packedPalette } from '../../public/js/art/palette.js';

const palette = packedPalette();
const [left, top, width, , encoded] = trail.frames[0];
const pixels = Buffer.from(encoded, 'base64');

// The head in Trailblazer's approved standing pose. Each entry spans one
// source scanline. 'f' copies the face or pointed ear; 'h' recolors the hair.
// The quiver, fletching and green collar around it belong to the donor body.
const rows = [
  [37, 'hhhh'],
  [35, 'hhhhhhhh'],
  [34, 'hhhhhhhhh'],
  [33, 'hhhhhhhhhhh'],
  [32, 'hhhhhhhfhfhh'],
  [31, 'hhhhhhhffffhh'],
  [31, 'hhhffffffffh'],
  [31, 'hhhhffffffff'],
  [32, 'hhhhhffffff'],
  [33, 'hhhhfffff'],
];

function auburn(silver) {
  const light = silver >>> 8 & 255;
  if (light < 25) return palette.k;
  if (light < 58) return palette.m;
  if (light < 108) return palette.b;
  if (light < 173) return palette.O;
  if (light < 207) return palette.d;
  return palette.B;
}

const head = rows.map(([x, row], line) => {
  const y = 27 + line;
  const colors = [...row].map((material, i) => {
    const p = ((y - top) * width + x + i - left) * trail.indexBytes;
    const color = trail.palette[pixels.readUIntLE(p, trail.indexBytes)];
    return material === 'h' ? auburn(color) : color;
  });
  return { x, colors };
});

export function fitTrailHead(frame, attackStep) {
  const { w, d } = frame;
  // The hair crown tracks the original Ranger's breathing and walk bob.
  let crown = 23;
  while (crown < 36 && !d[crown * w + 39]) crown++;
  if (crown === 36) throw Error('Ranger crown missing');
  const aiming = attackStep >= 0 && attackStep < 3;
  const first = crown - (aiming ? 1 : 0);
  const original = d.slice();
  const at = (x, y) => y * w + x;
  const inFront = (x, y) => aiming && (
    (attackStep === 1 && original[at(x, y)] === palette.D && x >= 38) ||
    (y >= crown + 7 && x < 37) || y >= crown + 8
  );

  for (let y = crown - 1; y <= crown + 9; y++) {
    const x0 = y < crown + 7 ? 28 : y === crown + 7 ? 33 : 36;
    for (let x = x0; x <= 44; x++) {
      if (!inFront(x, y) && (y < crown + 9 || x < 43)) d[at(x, y)] = 0;
    }
  }
  for (const [line, row] of head.entries()) {
    const y = first + line;
    for (const [i, color] of row.colors.entries()) {
      const x = row.x + i + 1;
      if (!inFront(x, y)) d[at(x, y)] = color;
    }
  }
  // Extend the two overlapping back locks two native pixels down the nape.
  for (const [line, row] of ['bOmb', 'mbm'].entries()) {
    const y = first + head.length + line;
    for (const [i, key] of [...row].entries()) {
      const x = 33 + i;
      if (!inFront(x, y)) d[at(x, y)] = palette[key];
    }
  }
  return frame;
}
