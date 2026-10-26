// Turns pxl's 88-frame strip of ranger-f.px.js into the lab sheet, laid out as the Ranger's
// (rows ["right", "glow", "glowLeft"]):
//   row 0  "right":    the 88 frames facing right, as pxl drew them
//   row 1  "glow":     only the glowing pixels (the moonstone in the grip, the arrowhead), same place
//   row 2  "glowLeft": row 1 mirrored inside each 48 px frame
// usage (from the repo root):
//   node gms/3001/sprites/lab/src/ranger-knightstyle/f/make-sheet.mjs <out>/anims/ranger_f.png gms/3001/sprites/lab/sheets/archer-knightstyle-f.png
import { readPng, writePng } from '../../../../../../../tools/png.mjs';
import { makeBuf } from '../../../../../../../public/js/engine/pixels.js';

const GLOW = ['b6ffdc'];   // the catalogue entry's "glow" list
const FW = 48, FH = 48, FRAMES = 88;
const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) throw new Error('usage: make-sheet.mjs <strip.png> <sheet.png>');
const src = readPng(inFile);
if (src.w !== FW * FRAMES || src.h !== FH) throw new Error(`${inFile}: expected ${FW * FRAMES}x${FH}, got ${src.w}x${src.h}`);
const out = makeBuf(src.w, FH * 3);
const hex = (c) => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');
let glowing = 0;
for (let y = 0; y < FH; y++) for (let x = 0; x < src.w; x++) {
  const c = src.d[y * src.w + x];
  out.d[y * out.w + x] = c;
  if (c >>> 24 === 255 && GLOW.includes(hex(c))) {
    glowing++;
    out.d[(FH + y) * out.w + x] = c;
    const f = Math.floor(x / FW), lx = x % FW;
    out.d[(2 * FH + y) * out.w + f * FW + (FW - 1 - lx)] = c;
  }
}
writePng(outFile, out);
console.log(`${outFile}: ${FRAMES} frames, ${out.w}x${out.h}, ${glowing} glowing pixels`);
