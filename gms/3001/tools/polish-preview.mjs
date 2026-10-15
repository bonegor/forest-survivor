// Renders one hero's polish proposals for review, next to the knight (the style to match), the
// hero's sprite in the game now and the standing studies of 14 October:
//   node gms/3001/tools/polish-preview.mjs <archer|mage|necromancer> <out dir>
// It reads gms/3001/sprites/lab/src/polish-oct15-<hero>.js, whose default export is a list of
//   { cls, id, name, description, glow: ['#hex', ...] (colours that glow unlit at night), def }
// def as gms/3001/tools/build.mjs takes it: { gen: () => [48x48 buffer, facing right], idle: [0],
// walk: [0], anchorY: 40, outline: false, selfBob: true }. It writes, into <out dir>:
//   board.png               every proposal left and right at 4x, at 1x, and the knight at 4x
//   ingame.png              each at the game's own scale (3x) on the forest floor, the knight beside
//   <id>-x10.png            one proposal facing right at 10x on a pixel grid (also for the
//                           references: knight, current, oct14...)
// and prints a report: visible size, the ground line, colours, outline, stray pixels.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const mod = (f) => import(pathToFileURL(join(ROOT, f)).href);
await mod('tools/headless.mjs');
const { SPR, buildSprites } = await mod('public/js/engine/sprites.js');
const { makeBuf, flipX, hexPack } = await mod('public/js/engine/pixels.js');
const { GLYPHS } = await mod('public/js/engine/fontdata.js');
const { writePng } = await mod('tools/png.mjs');

const [hero, outArg] = process.argv.slice(2);
if (!['archer', 'mage', 'necromancer'].includes(hero) || !outArg) {
  console.error('node gms/3001/tools/polish-preview.mjs <archer|mage|necromancer> <out dir>');
  process.exit(1);
}
const out = outArg.replace(/[\\/]$/, '');
mkdirSync(out, { recursive: true });
if (!SPR.knight) buildSprites();

const src = pathToFileURL(join(ROOT, `gms/3001/sprites/lab/src/polish-oct15-${hero}.js`)).href + '?t=' + Date.now();
const proposals = (await import(src)).default;
const oct14 = (await mod('gms/3001/sprites/lab/src/standing-oct14.js')).default.filter((p) => p.cls === hero);

// The pictures to show: the references first, then the proposals.
const frameOf = (spr) => spr.frames[(spr.idle && spr.idle[0]) || 0].buf;
const refs = [
  { id: 'knight', name: 'KNIGHT (STYLE)', buf: frameOf(SPR.knight), anchorY: SPR.knight.anchorY },
  { id: 'current', name: 'IN THE GAME NOW', buf: frameOf(SPR[hero]), anchorY: SPR[hero].anchorY },
  ...oct14.map((p, i) => ({ id: 'oct14' + (i ? '-' + (i + 1) : ''), name: 'OCT 14: ' + p.name.split(' · ')[1], buf: p.def.gen()[0], anchorY: p.def.anchorY })),
];
const mine = proposals.map((p) => {
  const bufs = p.def.gen();
  return { ...p, buf: bufs[0], anchorY: p.def.anchorY ?? 40, glow: p.glow || [] };
});

// ---- drawing on a board ---------------------------------------------------------------------
const C = {
  bg: hexPack('#14181d'), panel: hexPack('#1e252b'), floor: hexPack('#2f3b2c'), floor2: hexPack('#283325'),
  text: hexPack('#e5e2d8'), muted: hexPack('#8d9aa1'), gold: hexPack('#d4b47b'), line: hexPack('#55644f'),
  grid: hexPack('#262d33'), grid2: hexPack('#1b2126'), bad: hexPack('#ff6b5b'),
};
function rect(b, x, y, w, h, c) {
  for (let j = Math.max(0, y); j < Math.min(b.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(b.w, x + w); i++) b.d[j * b.w + i] = c;
}
function text(b, s, x, y, c = C.text, k = 2) {
  for (const ch of s.toUpperCase()) {
    const rows = (GLYPHS[ch] || GLYPHS['?']).split('/');
    rows.forEach((r, j) => [...r].forEach((v, i) => { if (v !== '0' && v !== '.' && v !== ' ') rect(b, x + i * k, y + j * k, k, k, c); }));
    x += (rows[0].length + 1) * k;
  }
}
// A sprite standing on the line `foot` (its anchorY there), centred on cx, k screen pixels a pixel.
function sprite(b, buf, cx, foot, anchorY, k) {
  for (let y = 0; y < buf.h; y++) for (let x = 0; x < buf.w; x++) {
    const c = buf.d[y * buf.w + x];
    if (c >>> 24) rect(b, Math.round(cx - (buf.w * k) / 2 + x * k), foot - anchorY * k + y * k, k, k, c);
  }
}

// board.png: a row each, left 4x, right 4x, both at 1x, and the knight at 4x on the same ground.
const ROW = 230, W = 1100;
const board = makeBuf(W, 70 + ROW * (refs.length - 1 + mine.length));
board.d.fill(C.bg);
text(board, `${hero} polish / 15 Oct`, 24, 20, C.gold, 3);
text(board, 'left 4x / right 4x / 1x native / knight 4x for scale', 26, 50, C.muted, 1);
const rows = [...refs.slice(1), ...mine];
rows.forEach((r, i) => {
  const top = 70 + i * ROW, foot = top + 200;
  rect(board, 16, top, W - 32, ROW - 10, C.panel);
  rect(board, 16, foot, W - 32, ROW - 10 - (foot - top), C.floor);
  text(board, r.name || r.id, 28, top + 10, i < refs.length - 1 ? C.muted : C.text, 2);
  if (r.description) text(board, r.id, 28, top + 32, C.muted, 1);
  sprite(board, flipX(r.buf), 190, foot, r.anchorY, 4);
  sprite(board, r.buf, 430, foot, r.anchorY, 4);
  sprite(board, flipX(r.buf), 610, foot, r.anchorY, 1);
  sprite(board, r.buf, 660, foot, r.anchorY, 1);
  sprite(board, frameOf(SPR.knight), 900, foot, SPR.knight.anchorY, 4);
});
writePng(join(out, 'board.png'), board);

// ingame.png: everyone side by side at 3x on the forest floor, as the game shows them.
const all = [refs[0], ...refs.slice(1), ...mine];
const ig = makeBuf(Math.max(600, 40 + all.length * 150), 260);
ig.d.fill(C.floor2);
rect(ig, 0, 0, ig.w, 40, C.bg);
text(ig, 'at the game scale (3x), standing on the forest floor', 16, 14, C.muted, 1);
all.forEach((r, i) => {
  const cx = 90 + i * 150, foot = 220;
  sprite(ig, r.buf, cx, foot, r.anchorY, 3);
  text(ig, (r.id || '').slice(0, 14), cx - 60, 236, C.muted, 1);
});
writePng(join(out, 'ingame.png'), ig);

// <id>-x10.png: one picture at 10x on a pixel grid, facing right.
function closeUp(r) {
  const k = 10, b = makeBuf(r.buf.w * k, r.buf.h * k);
  for (let y = 0; y < r.buf.h; y++) for (let x = 0; x < r.buf.w; x++) {
    const c = r.buf.d[y * r.buf.w + x];
    rect(b, x * k, y * k, k, k, c >>> 24 ? c : (x + y) % 2 ? C.grid : C.grid2);
  }
  // The ground line.
  rect(b, 0, r.anchorY * k, b.w, 1, C.bad);
  writePng(join(out, `${r.id}-x10.png`), b);
}
for (const r of [...refs, ...mine]) closeUp(r);

// ---- the report -------------------------------------------------------------------------------
const luma = (c) => (0.299 * (c & 255) + 0.587 * ((c >>> 8) & 255) + 0.114 * ((c >>> 16) & 255)) / 255;
function check(r) {
  const { w, h, d } = r.buf, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  let x0 = w, y0 = h, x1 = -1, y1 = -1, edge = 0, darkEdge = 0, stray = 0, partial = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(x, y), a = c >>> 24;
    if (!a) continue;
    if (a !== 255) partial++;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].filter((v) => v >>> 24).length;
    if (n < 4) { edge++; if (luma(c) < 0.3) darkEdge++; }
    if (n === 0) stray++;
  }
  const colours = new Set([...d].filter((c) => c >>> 24));
  const glowMissing = (r.glow || []).filter((hex) => !colours.has(hexPack(hex)));
  return {
    id: r.id, cell: `${w}x${h}`, visible: `${x1 - x0 + 1}x${y1 - y0 + 1}`, feetRow: y1, anchorY: r.anchorY,
    ground: y1 === r.anchorY - 1 ? 'ok' : `feet end on row ${y1}, the ground line is ${r.anchorY}`,
    colours: colours.size, darkOutline: `${Math.round((100 * darkEdge) / Math.max(1, edge))}% of edge pixels`,
    strayPixels: stray, semiTransparent: partial, glowMissing,
  };
}
console.log(JSON.stringify({ references: refs.map(check), proposals: mine.map(check), wrote: out }, null, 1));
