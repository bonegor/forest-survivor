// Procedurally painted scenery (trees, bushes, rocks). Pure pixel buffers so
// the Node preview tool can render them too.

import { makeBuf } from '../engine/pixels.js';
import { packedPalette } from './palette.js';
import { mulberry32 } from '../engine/util.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// Light from the top-left, slightly towards the viewer.
const LX = -0.5, LY = -0.72, LZ = 0.48;

function set(buf, x, y, c) {
  if (x >= 0 && y >= 0 && x < buf.w && y < buf.h) buf.d[y * buf.w + x] = c;
}
function get(buf, x, y) {
  return x >= 0 && y >= 0 && x < buf.w && y < buf.h ? buf.d[y * buf.w + x] : 0;
}

// Paints sphere-shaded blobs back to front. tones: darkest -> brightest.
function paintBlobs(buf, blobs, tones, rng, opts = {}) {
  const owner = new Int16Array(buf.w * buf.h).fill(-1);
  const sep = opts.separator ?? tones[0];
  blobs.forEach((b, i) => {
    const x0 = Math.floor(b.x - b.rx - 1), x1 = Math.ceil(b.x + b.rx + 1);
    const y0 = Math.floor(b.y - b.ry - 1), y1 = Math.ceil(b.y + b.ry + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) continue;
        const nx = (x + 0.5 - b.x) / b.rx, ny = (y + 0.5 - b.y) / b.ry;
        // Wobbly edge for a leafy silhouette.
        const ang = Math.atan2(ny, nx);
        const wob = opts.wobble ? 1 + Math.sin(ang * b.lobes + b.phase) * opts.wobble : 1;
        const d2 = nx * nx + ny * ny;
        if (d2 > wob * wob) continue;
        const idx = y * buf.w + x;
        const nz = Math.sqrt(Math.max(0, 1 - d2));
        let lum = nx * LX + ny * LY + nz * LZ; // -1..1
        lum = lum * 0.5 + 0.5 + (opts.lift || 0);
        lum += bayer(x, y) * (opts.dither ?? 0.28);
        if (opts.speckle && rng() < opts.speckle) lum += (rng() - 0.5) * 0.5;
        let t = Math.floor(lum * tones.length);
        t = Math.max(0, Math.min(tones.length - 1, t));
        // Thin dark seam where a front blob overlaps the one behind it.
        const edge = Math.sqrt(d2) > wob - 1.2 / Math.min(b.rx, b.ry);
        if (owner[idx] >= 0 && edge && ny > -0.2) buf.d[idx] = sep;
        else buf.d[idx] = tones[t];
        owner[idx] = i;
      }
    }
  });
}

function trunk(buf, cx, top, bottom, w, pal, rng) {
  const tones = [pal.m, pal.b, pal.B];
  for (let y = top; y <= bottom; y++) {
    const flare = y > bottom - 3 ? bottom - 3 - y : 0; // roots widen
    const half = w / 2 - flare * 0.8;
    for (let x = Math.floor(cx - half); x < Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - (cx - half)) / (half * 2); // 0..1 across
      let t = u < 0.3 ? 2 : u < 0.72 ? 1 : 0;
      if (rng() < 0.12) t = Math.max(0, t - 1); // bark grain
      set(buf, x, y, tones[t]);
    }
  }
}

export function genOak(seed = 1) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = 34, H = 44;
  const buf = makeBuf(W, H);
  const cx = W / 2;
  trunk(buf, cx, 24, H - 1, 6, pal, rng);
  // A couple of branches poking into the canopy.
  for (let i = 0; i < 4; i++) set(buf, Math.round(cx - 2 - i), 24 - i, pal.b);
  for (let i = 0; i < 3; i++) set(buf, Math.round(cx + 2 + i), 23 - i, pal.m);
  const blobs = [];
  const centers = [
    [0, -6, 10], [-8, 0, 8], [8, 0, 8], [-5, 7, 8], [5, 7, 8], [0, 3, 9], [-10, 8, 6], [10, 8, 6], [0, 11, 7],
  ];
  for (const [dx, dy, r] of centers) {
    const rr = r + rng.range(-1, 1.2);
    blobs.push({ x: cx + dx + rng.range(-1, 1), y: 16 + dy + rng.range(-1, 1), rx: rr, ry: rr * 0.92, lobes: rng.int(5, 8), phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  paintBlobs(buf, blobs, [pal.v, pal.E, pal.e, pal.L], rng, { wobble: 0.08, speckle: 0.06, lift: -0.16 });
  return buf;
}

export function genPine(seed = 1) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = 26, H = 46;
  const buf = makeBuf(W, H);
  const cx = W / 2;
  trunk(buf, cx, 36, H - 1, 4, pal, rng);
  const layers = 5;
  const tones = [pal.v, pal.E, pal.e, pal.L];
  for (let i = 0; i < layers; i++) {
    const top = 1 + i * 6.5;
    const bot = top + 11 + i * 0.6;
    const halfW = 4 + i * 2.4;
    for (let y = Math.floor(top); y <= bot && y < H; y++) {
      const t = (y - top) / (bot - top);
      const jag = (Math.sin(y * 2.3 + i) + 1) * 0.6 + rng() * 0.7;
      const hw = halfW * t + 1 + (t > 0.7 ? jag : 0);
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const u = (x + 0.5 - cx) / Math.max(1, hw); // -1..1
        let lum = 0.62 - u * 0.42 - t * 0.25 + bayer(x, y) * 0.3;
        if (y > bot - 1.5) lum -= 0.4; // shadow on each skirt's lower edge
        if (rng() < 0.05) lum += 0.3;
        const k = Math.max(0, Math.min(3, Math.floor(lum * 4)));
        set(buf, x, y, tones[k]);
      }
    }
  }
  // Snowless tip highlight.
  set(buf, Math.floor(cx), 0, pal.e);
  return buf;
}

export function genDeadTree(seed = 1) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = 28, H = 38;
  const buf = makeBuf(W, H);
  const line = (x0, y0, x1, y1, w, tone) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (let k = 0; k < w; k++) set(buf, Math.round(x - w / 2 + k), Math.round(y), k === 0 ? pal.A : tone);
    }
  };
  const branch = (x, y, ang, len, w, depth) => {
    const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
    line(x, y, x1, y1, Math.max(1, Math.round(w)), depth > 2 ? pal.a : pal.h);
    if (depth <= 0 || len < 3) return;
    const n = depth > 2 ? 2 : rng.int(1, 2);
    for (let i = 0; i < n; i++) branch(x1, y1, ang + rng.range(-0.9, 0.9), len * rng.range(0.55, 0.75), w * 0.6, depth - 1);
  };
  branch(W / 2, H - 1, -Math.PI / 2, 16, 4, 4);
  branch(W / 2, H - 9, -Math.PI / 2 - 0.8, 8, 2, 2);
  branch(W / 2, H - 12, -Math.PI / 2 + 0.7, 9, 2, 2);
  return buf;
}

export function genBush(seed = 1, berries = false) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = 18, H = 12;
  const buf = makeBuf(W, H);
  const blobs = [];
  for (let i = 0; i < 4; i++) {
    const r = rng.range(3.5, 5);
    blobs.push({ x: 4 + i * 3.4 + rng.range(-1, 1), y: H - r - rng.range(0, 2), rx: r, ry: r * 0.85, lobes: 6, phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  paintBlobs(buf, blobs, [pal.v, pal.E, pal.e, pal.L], rng, { wobble: 0.12, speckle: 0.08, lift: -0.05 });
  if (berries) {
    for (let i = 0; i < 4; i++) {
      const x = rng.int(3, W - 4), y = rng.int(3, H - 3);
      if (get(buf, x, y)) set(buf, x, y, i % 2 ? pal.r : pal.x);
    }
  }
  return buf;
}

export function genRock(seed = 1, size = 1, moss = false) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = Math.round(12 * size + 2), H = Math.round(9 * size + 2);
  const buf = makeBuf(W, H);
  const blobs = [];
  const n = size > 1.2 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const r = rng.range(3.2, 4.6) * size;
    blobs.push({ x: W / 2 + (i - (n - 1) / 2) * 3.5 * size, y: H - r * 0.8 - 0.5, rx: r, ry: r * 0.78, lobes: 3, phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  paintBlobs(buf, blobs, [pal.K, pal.n, pal.N, pal.g], rng, { wobble: 0.06, dither: 0.22, separator: pal.K });
  if (moss) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = get(buf, x, y);
        if (!c) continue;
        const above = get(buf, x, y - 2);
        if (!above && rng() < 0.8) set(buf, x, y, rng() < 0.6 ? pal.e : pal.E);
      }
    }
  }
  return buf;
}

export function genStump(seed = 1) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const buf = makeBuf(12, 9);
  trunk(buf, 6, 2, 8, 8, pal, rng);
  for (let x = 2; x < 10; x++) set(buf, x, 2, x < 4 || x > 7 ? pal.b : pal.t);
  for (let x = 3; x < 9; x++) set(buf, x, 1, pal.b);
  set(buf, 5, 2, pal.B);
  set(buf, 6, 2, pal.B);
  return buf;
}

// Seeded variants, exposed like regular sprite defs.
export const PROC_ART = {
  oak1: { gen: () => [genOak(3)] },
  oak2: { gen: () => [genOak(17)] },
  oak3: { gen: () => [genOak(42)] },
  pine1: { gen: () => [genPine(5)] },
  pine2: { gen: () => [genPine(23)] },
  deadtree1: { gen: () => [genDeadTree(7)] },
  deadtree2: { gen: () => [genDeadTree(31)] },
  bush1: { gen: () => [genBush(2)] },
  bush2: { gen: () => [genBush(9, true)] },
  rock1: { gen: () => [genRock(4, 1)] },
  rock2: { gen: () => [genRock(8, 1.6, true)] },
  rock3: { gen: () => [genRock(15, 0.7)] },
  stump: { gen: () => [genStump(3)] },
};
