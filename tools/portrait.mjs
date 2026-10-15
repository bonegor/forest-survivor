#!/usr/bin/env node
// Turns painted hero art in tools/portraits into menu art the game can draw
// crisply on its pixel canvas, each with its colours reduced to a small
// palette:
//   <hero>.png        the figure on black: the background is cut away and the
//                     figure shrunk by whole factors (one size per menu)
//   <hero>-scene.png  a whole picture, shrunk to fit the hero panel, and
//                     copied as is to public/img for the full-size view; with
//                     <hero>.png too, the figure is also lifted out of it at
//                     full size (public/img/<hero>-figure.png)
//   node tools/portrait.mjs            -> writes public/js/art/portraits.js
//   node tools/portrait.mjs --preview  -> also writes tools/out/portraits.png
import { readdirSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './png.mjs';
import { makeBuf, blit, scaleN, hexPack } from '../public/js/engine/pixels.js';

const SRC = 'tools/portraits';
const OUT = 'public/js/art/portraits.js';
const IMG = 'public/img';
// Each figure size divides the painting by a whole factor: `camp` for the
// campfire (drawn 1:1 where other poses are doubled). A scene is fitted to
// SCENE_H rows for the hero panel (1:1 where other poses are tripled).
const SIZES = { camp: { factor: 6, colors: 40 } };
const SCENE_H = 94, SCENE_COLORS = 64;
const BG_MAX = 14; // channel value at or below which a border-connected pixel counts as background
// Midtone lift (a gamma) so the figure reads on the dark, vignetted menus;
// 1 keeps the painting's own levels. --lift=1.4 overrides it.
const LIFT = Number((process.argv.find((a) => a.startsWith('--lift=')) || '').split('=')[1] || 1.4);
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const rgb = (c) => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// Clear the black backdrop by flooding in from the border. The default also
// takes the near-black fringe; a strict `max` floods pure black only, so it
// cannot leak along the figure's own dark outlines into, say, a visor.
function cutBackground(img, max = BG_MAX) {
  const { w, h, d } = img;
  const dark = (i) => Math.max(...rgb(d[i])) <= max;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !dark(i)) continue;
    seen[i] = 1;
    d[i] = 0;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  return img;
}

// Crop to the figure, padded so the crop divides evenly by every factor.
function crop(img) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (!(img.d[y * img.w + x] >>> 24)) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const lcm = 6, w = Math.ceil((x1 - x0 + 1) / lcm) * lcm, h = Math.ceil((y1 - y0 + 1) / lcm) * lcm;
  const out = makeBuf(w, h);
  // Keep the feet on the bottom edge; centre the spare columns.
  const ox = x0 - Math.floor((w - (x1 - x0 + 1)) / 2), oy = y1 + 1 - h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x + ox, sy = y + oy;
    if (sx >= 0 && sy >= 0 && sx < img.w && sy < img.h) out.d[y * w + x] = img.d[sy * img.w + sx];
  }
  return Object.assign(out, { ox, oy });
}

// ------------------------------------------------- figure from the scene --
// When a hero has both pictures, the figure in the scene is the same art at
// another scale. Find that scale and offset (by luminance correlation), then
// lift the figure out of the scene through the black-backed figure's outline:
// the result covers exactly the campfire sprite's frame, at the scene's
// resolution, for the full-size view on the title screen.

const lum = (c) => 0.2126 * (c & 255) + 0.7152 * ((c >>> 8) & 255) + 0.0722 * ((c >>> 16) & 255);

function align(cut, scene) {
  const all = [];
  for (let y = 0; y < cut.h; y += 2) for (let x = 0; x < cut.w; x += 2) {
    const c = cut.d[y * cut.w + x];
    if (c >>> 24) all.push([x, y, lum(c)]);
  }
  const L = Float32Array.from(scene.d, lum);
  const at = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi + 1 >= scene.w || yi + 1 >= scene.h) return null;
    const fx = x - xi, fy = y - yi, i = yi * scene.w + xi;
    return (L[i] * (1 - fx) + L[i + 1] * fx) * (1 - fy) + (L[i + scene.w] * (1 - fx) + L[i + scene.w + 1] * fx) * fy;
  };
  const corr = (pts, s, ox, oy) => {
    let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
    for (const [x, y, a] of pts) {
      const b = at(ox + x * s, oy + y * s);
      if (b === null) return -1;
      n++; sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b;
    }
    return (sab / n - (sa / n) * (sb / n)) / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2));
  };
  // Coarse over every scale and placement with a thin sample, then refine.
  const few = all.filter((_, i) => i % 9 === 0);
  let best = { r: -2 };
  for (let s = 1; s <= 3; s += 0.02) {
    for (let oy = 0; oy + cut.h * s <= scene.h; oy += 2) for (let ox = 0; ox + cut.w * s <= scene.w; ox += 2) {
      const r = corr(few, s, ox, oy);
      if (r > best.r) best = { r, s, ox, oy };
    }
  }
  const c = best;
  for (let s = c.s - 0.03; s <= c.s + 0.03; s += 0.002) for (let ox = c.ox - 3; ox <= c.ox + 3; ox += 0.25) for (let oy = c.oy - 3; oy <= c.oy + 3; oy += 0.25) {
    const r = corr(all, s, ox, oy);
    if (r > best.r) best = { r, s, ox, oy };
  }
  return best;
}

const INK = hexPack('#181425');

function figureFromScene(cut, region, scene) {
  const { r, s, ox, oy } = align(cut, scene);
  if (r < 0.95) throw new Error(`the figure and the scene do not match (best correlation ${r.toFixed(3)})`);
  const w = Math.round(region.w * s), h = Math.round(region.h * s);
  const out = makeBuf(w, h);
  const solid = new Uint8Array(w * h);
  for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {
    const fx = Math.floor(region.x + (u + 0.5) / s), fy = Math.floor(region.y + (v + 0.5) / s);
    const sx = Math.round(ox + region.x * s + u), sy = Math.round(oy + region.y * s + v);
    if (fx < 0 || fy < 0 || fx >= cut.w || fy >= cut.h || sx < 0 || sy < 0 || sx >= scene.w || sy >= scene.h) continue;
    const f = cut.d[fy * cut.w + fx], c = scene.d[sy * scene.w + sx];
    // Clear where the figure is clear, and in its enclosed gaps (between arm
    // and body, say): black on the black-backed figure, bright scene behind.
    if (!(f >>> 24) || (Math.max(...rgb(f)) <= BG_MAX && lum(c) > 50)) continue;
    solid[v * w + u] = 1;
    out.d[v * w + u] = c;
  }
  // Shave one pixel off the edge (the scene blends into it there), then ink a
  // two-pixel outline round the figure like the game's own outlines.
  const edge = (i, set) => { const x = i % w, y = (i / w) | 0; return (x > 0 && set[i - 1]) + (x < w - 1 && set[i + 1]) + (y > 0 && set[i - w]) + (y < h - 1 && set[i + w]); };
  const shaved = solid.map((v, i) => (v && edge(i, solid) === 4 ? 1 : 0));
  let ring = shaved;
  for (let k = 0; k < 2; k++) ring = ring.map((v, i) => (v || edge(i, ring) ? 1 : 0));
  for (let i = 0; i < w * h; i++) out.d[i] = shaved[i] ? out.d[i] : ring[i] ? INK : 0;
  return { buf: out, s, r };
}

// sRGB channel <-> linear light, so averaging keeps the painting's brightness.
const toLin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v) => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

// Shrink by n: a cell stays solid when most of it is figure, taking the
// average colour of its figure pixels (in linear light, then lifted).
function shrink(img, n) {
  const w = img.w / n, h = img.h / n;
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, k = 0;
    for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) {
      const c = img.d[(y * n + dy) * img.w + x * n + dx];
      if (!(c >>> 24)) continue;
      const [cr, cg, cb] = rgb(c);
      r += toLin(cr); g += toLin(cg); b += toLin(cb); k++;
    }
    cells.push(k * 2 > n * n ? [r, g, b].map((v) => Math.min(255, toSrgb((v / k) ** (1 / LIFT)))) : null);
  }
  return { w, h, cells };
}

// Median-cut palette of `count` colours.
function palette(colors, count) {
  let boxes = [colors];
  while (boxes.length < count) {
    let best = -1, bestRange = 0, axis = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let a = 0; a < 3; a++) {
        let lo = 255, hi = 0;
        for (const c of box) { lo = Math.min(lo, c[a]); hi = Math.max(hi, c[a]); }
        if (hi - lo > bestRange) [best, bestRange, axis] = [i, hi - lo, a];
      }
    });
    if (best < 0) break;
    const box = boxes[best].sort((p, q) => p[axis] - q[axis]);
    const mid = box.length >> 1;
    boxes.splice(best, 1, box.slice(0, mid), box.slice(mid));
  }
  return boxes.map((box) => box.reduce((s, c) => s.map((v, i) => v + c[i] / box.length), [0, 0, 0]).map(Math.round));
}

function nearest(pal, c) {
  let best = 0, dist = Infinity;
  pal.forEach((p, i) => {
    const d = (p[0] - c[0]) ** 2 * 0.3 + (p[1] - c[1]) ** 2 * 0.59 + (p[2] - c[2]) ** 2 * 0.11;
    if (d < dist) [best, dist] = [i, d];
  });
  return best;
}

// Fit a whole picture to `h` rows, averaging the source area under each cell
// in linear light (no lift: a daylight scene needs none).
function fit(img, h) {
  const f = img.h / h, w = Math.round(img.w / f);
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sum = [0, 0, 0];
    let k = 0;
    for (let sy = Math.floor(y * f); sy < Math.min(img.h, Math.ceil((y + 1) * f)); sy++) {
      const wy = Math.min(sy + 1, (y + 1) * f) - Math.max(sy, y * f);
      for (let sx = Math.floor(x * f); sx < Math.min(img.w, Math.ceil((x + 1) * f)); sx++) {
        const wt = wy * (Math.min(sx + 1, (x + 1) * f) - Math.max(sx, x * f));
        rgb(img.d[sy * img.w + sx]).forEach((v, i) => (sum[i] += toLin(v) * wt));
        k += wt;
      }
    }
    cells.push(sum.map((v) => Math.min(255, toSrgb(v / k))));
  }
  return { w, h, cells };
}

function convert({ w, h, cells }, colors) {
  const pal = palette(cells.filter(Boolean), colors);
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const c = cells[y * w + x];
      row += c ? KEYS[nearest(pal, c)] : '.';
    }
    rows.push(row);
  }
  return { colors: pal.map(hex), rows };
}

const art = {}, figures = {}, scenes = {};
mkdirSync(IMG, { recursive: true });
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.png')).sort()) {
  const [hero, kind] = path.basename(file, '.png').split('-');
  const img = readPng(path.join(SRC, file));
  art[hero] ??= {};
  if (kind === 'scene') {
    // The hero panel shows the picture itself at full resolution; the low-res
    // copy stands in until it loads and wherever it cannot be shown.
    art[hero].scene = convert(fit(img, SCENE_H), SCENE_COLORS);
    copyFileSync(path.join(SRC, file), path.join(IMG, file));
    scenes[hero] = img;
  }
  else {
    const cut = cutBackground(img);
    const figure = crop(cut);
    for (const [size, { factor, colors }] of Object.entries(SIZES)) art[hero][size] = convert(shrink(figure, factor), colors);
    // The campfire sprite's frame (its 1px outline included) in painting pixels.
    const f = SIZES.camp.factor;
    const strict = cutBackground(readPng(path.join(SRC, file)), 2);
    figures[hero] = { cut: strict, region: { x: figure.ox - f, y: figure.oy - f, w: figure.w + 2 * f, h: figure.h + 2 * f } };
  }
}
for (const hero of Object.keys(figures).filter((h) => scenes[h])) {
  const { buf, s, r } = figureFromScene(figures[hero].cut, figures[hero].region, scenes[hero]);
  writePng(path.join(IMG, `${hero}-figure.png`), buf);
  console.log(`${hero}: figure lifted from the scene at ${s.toFixed(3)}x (match ${r.toFixed(3)}), ${buf.w}x${buf.h} -> ${IMG}/${hero}-figure.png`);
}

const body = Object.entries(art).map(([hero, sizes]) => `  ${hero}: {\n${Object.entries(sizes).map(([size, { colors, rows }]) =>
  `    ${size}: {\n      colors: ${JSON.stringify(colors)},\n      rows: [\n${rows.map((r) => `        '${r}',`).join('\n')}\n      ],\n    },`).join('\n')}\n  },`).join('\n');

writeFileSync(OUT, `// Painted menu portraits, generated from tools/portraits/*.png by
// tools/portrait.mjs; edit the PNG and rerun it rather than editing this file.
// Each size has its own small palette; rows use one character per pixel
// (an index into \`colors\`), '.' for clear.

import { makeBuf, hexPack } from '../engine/pixels.js';

const KEYS = '${KEYS}';

export const PORTRAITS = {
${body}
};

// The portrait of \`hero\` at \`size\` as a pixel buffer.
export function portrait(hero, size) {
  const { colors, rows } = PORTRAITS[hero][size];
  const packed = colors.map((c) => hexPack(c));
  const buf = makeBuf(rows[0].length, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') buf.d[y * buf.w + x] = packed[KEYS.indexOf(row[x])];
  });
  return buf;
}
`);
console.log(`wrote ${OUT}: ${Object.entries(art).map(([h, s]) => `${h} (${Object.entries(s).map(([n, v]) => `${n} ${v.rows[0].length}x${v.rows.length}`).join(', ')})`).join('; ')}`);

if (process.argv.includes('--preview')) {
  const { portrait } = await import(new URL('../' + OUT, import.meta.url).href + '?' + Date.now());
  const bufs = Object.entries(art).flatMap(([hero, sizes]) => Object.keys(sizes).map((size) => portrait(hero, size)));
  const sheet = makeBuf(bufs.reduce((s, b) => s + b.w + 4, 4), Math.max(...bufs.map((b) => b.h)) + 8);
  sheet.d.fill(hexPack('#2a2236'));
  let x = 4;
  for (const b of bufs) { blit(sheet, b, x, sheet.h - 4 - b.h); x += b.w + 4; }
  mkdirSync('tools/out', { recursive: true });
  writePng('tools/out/portraits.png', scaleN(sheet, 4));
  console.log('wrote tools/out/portraits.png');
}
