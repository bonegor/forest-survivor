// Finish Knight G's sheet: take the strip pxl builds (22 frames of 48x48, one row) and add the
// glow rows exactly as the Paladin's sheet has them (rows ["right","glow","glowLeft"]): the glow
// row keeps only the glowing colours, and the third is that row mirrored for facing left.
// Also checks the frames: 1 px clear at every edge, the soles on row 39.
// Usage: node finish.mjs <pxl build out dir>/anims/knight_g.png <sheet out png>
import { readPng, writePng } from "../../../../../../tools/png.mjs";
const [, , inPath, outPath] = process.argv;
const GLOW = ["#a6e6ff", "#fff1b8", "#5f9aee", "#f4fdff"];   // g y z h in the .px.js palette
const pack = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
};
const glow = new Set(GLOW.map(pack));
const src = readPng(inPath);
const W = 48, H = 48, N = 22;
if (src.w !== W * N || src.h !== H) throw new Error(`strip is ${src.w}x${src.h}, expected ${W * N}x${H}`);
const out = { w: src.w, h: H * 3, d: new Uint32Array(src.w * H * 3) };
let bad = 0;
for (let k = 0; k < N; k++) {
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1, feet = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = src.d[y * src.w + k * W + x];
    if (c >>> 24 === 0) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    if (y === 39) feet = true;
    out.d[y * src.w + k * W + x] = c;
    if (glow.has(c >>> 0)) {
      out.d[(H + y) * src.w + k * W + x] = c;
      out.d[(2 * H + y) * src.w + k * W + (W - 1 - x)] = c;
    }
  }
  const edge = x0 < 1 || y0 < 1 || x1 > W - 2 || y1 > H - 2;
  if (edge || !feet || y1 > 39) { bad++; console.log(`frame ${k}: bbox x ${x0}-${x1} y ${y0}-${y1}${edge ? " TOUCHES THE EDGE" : ""}${!feet ? " NO FEET ON ROW 39" : ""}${y1 > 39 ? " BELOW ROW 39" : ""}`); }
  else console.log(`frame ${k}: x ${x0}-${x1} y ${y0}-${y1}`);
}
writePng(outPath, out);
console.log(bad ? `${bad} frame(s) need a look` : "all frames clear of the edge, feet on row 39");
