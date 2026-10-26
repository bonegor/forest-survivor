// Turns pxl's 22-frame strip of berserker-b.px.js into the lab sheet: one row ["right"], 22 frames of
// 48x48 facing right (nothing on this look glows at night, so there are no glow rows). It checks the
// strip's size, that nothing lies below the soles (row 39) and that no pixel is pure black or half
// transparent, then writes it.
// usage (from the repo root):
//   node gms/3001/sprites/lab/src/berserker-knightstyle/b/make-sheet.mjs <out>/anims/berserker_b.png gms/3001/sprites/lab/sheets/berserker-knightstyle-b.png
import { readPng, writePng } from '../../../../../../../tools/png.mjs';
import { makeBuf } from '../../../../../../../public/js/engine/pixels.js';

const FW = 48, FH = 48, FRAMES = 22;
const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) throw new Error('usage: make-sheet.mjs <strip.png> <sheet.png>');
const src = readPng(inFile);
if (src.w !== FW * FRAMES || src.h !== FH) throw new Error(`${inFile}: expected ${FW * FRAMES}x${FH}, got ${src.w}x${src.h}`);
const out = makeBuf(src.w, FH);
const colours = new Set();
for (let y = 0; y < FH; y++) for (let x = 0; x < src.w; x++) {
  const c = src.d[y * src.w + x], a = c >>> 24;
  if (!a) continue;
  if (a !== 255) throw new Error(`half-transparent pixel at ${x},${y}`);
  if ((c & 0xffffff) === 0) throw new Error(`pure black pixel at ${x},${y}`);
  if (y > 39) throw new Error(`pixel below the soles at ${x},${y}`);
  out.d[y * out.w + x] = c; colours.add(c);
}
writePng(outFile, out);
console.log(`${outFile}: ${FRAMES} frames, ${out.w}x${out.h}, ${colours.size} colours`);
