// Adds the glow rows to pxl's strip: node make-sheet.mjs <pxl dir> <knight_e.png from pxl build> <out sheet.png>
// Row 0 is the strip (22 frames of 48x48, facing right); row 1 keeps only the glowing colours
// (the eyes and the blade's red edge: #ff2e35, #ff5a3c, #b3162a); row 2 is row 1 mirrored.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [pxl, src, out] = process.argv.slice(2);
const { decodePng, encodePng } = await import(pathToFileURL(pxl + "/src/node/png.ts").href);
const { Img } = await import(pathToFileURL(pxl + "/src/core/image.ts").href);
const GLOW = ["ff2e35", "ff5a3c", "b3162a"].map((h) => ((parseInt(h, 16) << 8) | 255) >>> 0);
const im = decodePng(readFileSync(src));
const W = im.w, H = im.h;
if (W !== 1056 || H !== 48) throw new Error(`strip is ${W}x${H}, expected 1056x48`);
const o = new Img(W, H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = im.data[y * W + x] >>> 0;
  o.data[y * W + x] = c;
  if (GLOW.includes(c)) {
    o.data[(H + y) * W + x] = c;
    const f = Math.floor(x / 48), fx = x % 48;
    o.data[(2 * H + y) * W + f * 48 + (47 - fx)] = c;
  }
}
writeFileSync(out, encodePng(o));
console.log("wrote", out, W + "x" + H * 3);
