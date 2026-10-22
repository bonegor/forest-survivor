// Lays the Ember Knight's sheet: the strip pxl built (1056x48) as the first row, then the glow rows
// exactly as the Paladin's sheet has them: row 2 only the glowing colours of each frame, row 3 the
// same mirrored left-right (the frame facing left).
//   node make-sheet.mjs <built knight_c.png> <out sheet png>
import { readPng, writePng } from '../../../../../../tools/png.mjs';

const GLOW = ['#d9391a', '#ff6a1a', '#ffa83a', '#ffe58c'];            // Q a A F
const pack = (h) => (0xff000000 | (parseInt(h.slice(5, 7), 16) << 16) | (parseInt(h.slice(3, 5), 16) << 8) | parseInt(h.slice(1, 3), 16)) >>> 0;
const glow = new Set(GLOW.map(pack));
const [src, out] = process.argv.slice(2);
const png = readPng(src);
const W = 48, N = png.w / W;
if (png.h !== 48 || N !== 22) throw new Error(`expected 1056x48, got ${png.w}x${png.h}`);
const o = { w: png.w, h: 144, d: new Uint32Array(png.w * 144) };
for (let y = 0; y < 48; y++) for (let x = 0; x < png.w; x++) {
  const c = png.d[y * png.w + x] >>> 0;
  o.d[y * o.w + x] = c;
  if (glow.has(c)) {
    o.d[(48 + y) * o.w + x] = c;
    const k = Math.floor(x / W), lx = x - k * W;
    o.d[(96 + y) * o.w + k * W + (W - 1 - lx)] = c;
  }
}
writePng(out, o);
console.log(`${out}: ${o.w}x${o.h}, ${[...glow].length} glow colours`);
