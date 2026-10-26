// Turns pxl's 22-frame strip of berserker-a.px.js into the lab sheet: one row ("right"), 22 frames of
// 48x48 facing right (idle 0-7, walk 8-15, attack 16-21). Nothing on this look glows, so there are no
// glow rows. It checks the size and that no pixel is pure black or half transparent.
// usage (from the repo root):
//   node gms/3001/sprites/lab/src/berserker-knightstyle/a/make-sheet.mjs <out>/anims/berserker_a.png gms/3001/sprites/lab/sheets/berserker-knightstyle-a.png
import { readPng, writePng } from '../../../../../../../tools/png.mjs';
import { makeBuf } from '../../../../../../../public/js/engine/pixels.js';

const FW = 48, FH = 48, FRAMES = 22;
const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) throw new Error('usage: make-sheet.mjs <strip.png> <sheet.png>');
const src = readPng(inFile);
if (src.w !== FW * FRAMES || src.h !== FH) throw new Error(`${inFile}: expected ${FW * FRAMES}x${FH}, got ${src.w}x${src.h}`);
const out = makeBuf(src.w, FH);
const colours = new Set();
for (let i = 0; i < src.w * FH; i++) {
  const c = src.d[i], a = c >>> 24;
  if (a && a !== 255) throw new Error(`half-transparent pixel at ${i % src.w},${Math.floor(i / src.w)}`);
  if (a && (c & 0xffffff) === 0) throw new Error(`pure black pixel at ${i % src.w},${Math.floor(i / src.w)}`);
  out.d[i] = c;
  if (a) colours.add(c);
}
writePng(outFile, out);
console.log(`${outFile}: ${FRAMES} frames, ${out.w}x${out.h}, ${colours.size} colours`);
