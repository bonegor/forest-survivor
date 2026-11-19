import trail from './baseline/trailblazer.js';

// Sylva's retained native drawing. Each scanline distinguishes hair from
// skin, brows and eyes so a recipient can keep its own head covering.
const mask = [
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

const [left, top, width, , encoded] = trail.frames[0];
const raw = Buffer.from(encoded, 'base64');

export const trailHeadRows = mask.map(([x, row], i) => {
  const y = 27 + i;
  const pixels = [...row].map((part, j) => {
    const offset = ((y - top) * width + x + j - left) * trail.indexBytes;
    return { hair: part === 'h', color: trail.palette[raw.readUIntLE(offset, trail.indexBytes)] };
  });
  return { x, y, pixels };
});
