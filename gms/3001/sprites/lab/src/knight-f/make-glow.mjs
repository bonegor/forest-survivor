// Adds the glow rows to Knight F's strip, the way the Paladin's sheet has them:
//   row 0  the 22 frames facing right (pxl's knight_f.png, untouched)
//   row 1  "glow": only the pixels whose colour is a glowing one, same place
//   row 2  "glowLeft": row 1 mirrored inside each 48 px frame
// usage: PXL_DIR=<claude-pxl> node make-glow.mjs <knight_f.png> <out sheet.png>
// The glowing colours are the same as entry.json's "glow" list.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const GLOW = ["d8ff8a", "5bff7d", "c4ff9c", "fff6d6"];   // eyes, vine, the whip's arc, the blade's glint
const P = process.env.PXL_DIR;
if (!P) throw new Error("set PXL_DIR to the claude-pxl folder");
const { decodePng, encodePng } = await import(pathToFileURL(P + "/src/node/png.ts").href);
const { Img } = await import(pathToFileURL(P + "/src/core/image.ts").href);

const [inFile, outFile] = process.argv.slice(2);
const src = decodePng(readFileSync(inFile));
const FW = 48, FH = 48, N = src.w / FW;
const out = new Img(src.w, FH * 3);
const hex = (c) => (c >>> 8).toString(16).padStart(6, "0");
for (let y = 0; y < FH; y++) for (let x = 0; x < src.w; x++) {
  const c = src.data[y * src.w + x] >>> 0;
  out.data[y * out.w + x] = c;
  if ((c & 255) >= 128 && GLOW.includes(hex(c))) {
    out.data[(FH + y) * out.w + x] = c;
    const f = Math.floor(x / FW), lx = x % FW;
    out.data[(2 * FH + y) * out.w + f * FW + (FW - 1 - lx)] = c;
  }
}
writeFileSync(outFile, encodePng(out));
console.log(`${inFile}: ${N} frames -> ${outFile} (${out.w}x${out.h})`);
