// Renders sprite definitions to a PNG sheet so the pixel art can be reviewed
// without a browser:  node tools/preview.mjs [filter] [--scale=4] [--out=file]
// Sprites are drawn as the game builds them (engine/sprites.js spriteBuffers), colour tunes
// (art/tuned.js) included; --tuned=<file> lays a bake written elsewhere over them instead
// (tools/bake-tune.mjs --out=<file>), to look before it goes in.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ART, DRAWN, withTunes } from '../public/js/art/defs.js';
import { spriteBuffers } from '../public/js/engine/sprites.js';
import { makeBuf, blit, scaleN, pack, hexPack } from '../public/js/engine/pixels.js';
import { GLYPHS } from '../public/js/engine/fontdata.js';
import { writePng } from './png.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const filters = args.filter((a) => !a.startsWith('--'));
const SCALE = Number(opt('scale', 4));
const out = opt('out', 'tools/out/sheet.png');
const bgHex = opt('bg', '#2f3d33');

const art = opt('tuned') ? withTunes(DRAWN, (await import(pathToFileURL(resolve(opt('tuned'))).href)).TUNED) : ART;
const names = Object.keys(art).filter((n) => !filters.length || filters.some((f) => n.includes(f)));

function textBuf(str, color) {
  const glyphs = [...str].map((ch) => (GLYPHS[ch] || GLYPHS['?']).split('/'));
  const w = glyphs.reduce((s, g) => s + g[0].length + 1, 0);
  const buf = makeBuf(Math.max(1, w), 9);
  let x = 0;
  for (const g of glyphs) {
    g.forEach((row, y) => [...row].forEach((c, i) => { if (c === '#') buf.d[y * buf.w + x + i] = color; }));
    x += g[0].length + 1;
  }
  return buf;
}

const items = names.map((name) => ({ name, frames: spriteBuffers(art[name]).frames }));

// Simple shelf packing.
const MAXW = Number(opt('width', 900));
let x = 4, y = 4, rowH = 0;
const placed = [];
for (const it of items) {
  const fw = it.frames.reduce((s, f) => s + f.w + 3, 0);
  const label = textBuf(it.name, pack(220, 220, 230));
  const w = Math.max(fw, label.w) + 6;
  const h = Math.max(...it.frames.map((f) => f.h)) + 12;
  if (x + w > MAXW) { x = 4; y += rowH; rowH = 0; }
  placed.push({ it, x, y, label, h });
  x += w;
  rowH = Math.max(rowH, h + 4);
}
const sheet = makeBuf(MAXW, y + rowH + 4);
const bg = hexPack(bgHex);
sheet.d.fill(bg);
for (const p of placed) {
  let fx = p.x;
  const fh = Math.max(...p.it.frames.map((f) => f.h));
  for (const f of p.it.frames) {
    blit(sheet, f, fx, p.y + (fh - f.h));
    fx += f.w + 3;
  }
  blit(sheet, p.label, p.x, p.y + fh + 2);
}
mkdirSync('tools/out', { recursive: true });
writePng(out, scaleN(sheet, SCALE));
console.log(`wrote ${out} (${names.length} sprites)`);
