// Knight D's sheet: takes pxl's strip (anims/knight_d.png, 1056x48) and adds the two glow rows the
// lab's tools/build.mjs makes for a sheet with glow colours: row 2 keeps only the pixels in the glow
// colours, row 3 is that row flipped left to right per frame. Writes sheets/knight-d.png (1056x144).
// Usage: node build-sheet-d.mjs <pxl out>/anims/knight_d.png [sheet out, default ../../sheets/knight-d.png]
import { readPng, writePng } from '../../../../../../tools/png.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const GLOW = ['#4fcdfc', '#a6efff', '#effeff'];          // G H J in knight-d.px.js
const W = 48, H = 48, N = 22;
const pack = (hex) => (0xff000000 | (parseInt(hex.slice(5, 7), 16) << 16) | (parseInt(hex.slice(3, 5), 16) << 8) | parseInt(hex.slice(1, 3), 16)) >>> 0;
const glow = new Set(GLOW.map(pack));

const src = process.argv[2];
if (!src) throw new Error('usage: node build-sheet-d.mjs <anims/knight_d.png> [out]');
const out = process.argv[3] || join(dirname(fileURLToPath(import.meta.url)), '../../sheets/knight-d.png');
const png = readPng(src);
if (png.w !== W * N || png.h !== H) throw new Error(`strip is ${png.w}x${png.h}, expected ${W * N}x${H}`);
const sheet = { w: W * N, h: H * 3, d: new Uint32Array(W * N * H * 3) };
for (let f = 0; f < N; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let c = png.d[y * png.w + f * W + x] >>> 0;
  if (c >>> 24 === 0) c = 0;
  sheet.d[y * sheet.w + f * W + x] = c;
  if (glow.has(c)) {
    sheet.d[(H + y) * sheet.w + f * W + x] = c;
    sheet.d[(2 * H + y) * sheet.w + f * W + (W - 1 - x)] = c;
  }
}
writePng(out, sheet);
console.log('wrote', out);
