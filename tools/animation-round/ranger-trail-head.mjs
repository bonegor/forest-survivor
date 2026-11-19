import { trailHeadRows } from './trail-head.mjs';
import { packedPalette } from '../../public/js/art/palette.js';

const palette = packedPalette();

function auburn(silver) {
  const light = silver >>> 8 & 255;
  if (light < 25) return palette.k;
  if (light < 58) return palette.m;
  if (light < 108) return palette.b;
  if (light < 173) return palette.O;
  if (light < 207) return palette.d;
  return palette.B;
}

const head = trailHeadRows.map(({ x, pixels }) => ({
  x,
  colors: pixels.map(({ hair, color }) => hair ? auburn(color) : color),
}));

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
