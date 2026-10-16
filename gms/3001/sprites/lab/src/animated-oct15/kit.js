// Shared by the heroes picked on 15 October and animated here (archer.js, mage.js, necromancer.js):
// a grid of palette letters to draw a pose on, and the step from letters to pixels in the look the
// user saved on the review page (public/97sjbk94u6md), given as the very code it handed over.
import { makeBuf, hexPack } from '../../../../../../public/js/engine/pixels.js';
// The review page's colour bar: the lab's arithmetic (gms/3001/lib/recolour.js, kept identical by
// test/sprite-review.test.js), with no browser imports, so this builds in Node too.
import { recolourPixels, parsePickCode } from '../../../../../../public/97sjbk94u6md/recolour.js';

// A 48x48 grid of palette letters; '.' is clear.
export class Grid {
  constructor(pal, from = null) {
    this.pal = pal;
    this.g = from ? from.map((r) => [...r]) : Array.from({ length: 48 }, () => Array(48).fill('.'));
  }
  get(x, y) {
    return x < 0 || y < 0 || x > 47 || y > 47 ? '.' : this.g[y][x];
  }
  set(x, y, ch) {
    if (x < 0 || y < 0 || x > 47 || y > 47) throw new Error(`pixel outside the cell at ${x},${y}`);
    if (!(ch in this.pal)) throw new Error(`unknown colour "${ch}" at ${x},${y}`);
    this.g[y][x] = ch;
    return this;
  }
  // Rows of letters at (x0, y0); skip(i, j) leaves a pixel of them out.
  put(x0, y0, rows, skip = null) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      if (ch === '.' || ch === ' ' || (skip && skip(i, j))) return;
      this.set(x0 + i, y0 + j, ch);
    }));
    return this;
  }
  // A 1-px line.
  line(x0, y0, x1, y1, ch) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), ch);
    return this;
  }
  // Cells of another grid (a layer cut from a drawing), moved by (dx, dy).
  cells(list, dx = 0, dy = 0) {
    for (const [x, y, ch] of list) this.set(x + dx, y + dy, ch);
    return this;
  }
}

// The cells of a drawing (a grid of letters) where keep(x, y, ch) holds: one layer of it.
export function cut(rows, keep) {
  const out = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch !== '.' && keep(x, y, ch)) out.push([x, y, ch]);
  }));
  return out;
}

// A saved look, from the code the review page hands over ("FS mage polish-a hue=-9 ...").
export function lookOf(code) {
  const p = parsePickCode(code);
  if (!p) throw new Error(`not a look: ${code}`);
  return p.values;
}

const hexOf = (c) => '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');

// Letters to pixels: a frame's colours, and how its glowing letters look in the given look (null:
// as drawn).
export function painter(pal, glowKeys) {
  const PACK = Object.fromEntries(Object.entries(pal).map(([k, c]) => [k, hexPack(c)]));
  const glowing = new Set(glowKeys.map((k) => PACK[k]));
  const toBuf = (grid, look) => {
    const b = makeBuf(48, 48);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (grid[y][x] !== '.') b.d[y * 48 + x] = PACK[grid[y][x]];
    if (!look) return b;
    // The look as the review page shows it. What glows keeps its colour without the outline's
    // darkening: the game draws it unlit over the sprite anyway, as the page does.
    const d = recolourPixels(b.d, 48, 48, look), plain = recolourPixels(b.d, 48, 48, look, false);
    for (let i = 0; i < d.length; i++) if (glowing.has(b.d[i])) d[i] = plain[i];
    return { w: 48, h: 48, d };
  };
  const glow = (look) => glowKeys.map((k) => hexOf(look ? recolourPixels(new Uint32Array([PACK[k]]), 1, 1, look, false)[0] : PACK[k]));
  return { toBuf, glow };
}
