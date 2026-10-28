// The Frostfell's trees, bushes, rocks and small props: the frozen map, the second night of the
// five. The owner's (28 October 2026): "One would be the desert map. One would be a frozen, you
// know, snowy map. ... From there on, we progress to the frozen map. From there on, we progress to
// our current forest map." So the Frostfell lies between the Sunscorch and the Darkwood, and its
// woods are the Darkwood's under snow: the same slots, the same sizes, the same top-left light.
//
// Painted as procgen.js paints the Darkwood's (pure pixel buffers, so the Node tools draw them too):
// sphere-shaded blobs dithered with a Bayer matrix, in palette tones only, so they tune and burst
// like the rest. Snow lies on whatever faces the sky, its hem scalloped and dripping a pixel here
// and there; under it the leaves and needles are the forest's darkest greens, the bark its browns,
// the stone its slate. Snow is the cold ramp N g G w (white only where the light strikes), ice the
// ramp u U c X w the Frostfell's monsters are drawn in, so trees and foes read as one winter.
//
// What each stands in for, by darkwood.js layoutChunk's slots:
//   snow_oak1, snow_oak2      the oaks: a broadleaf heavy with snow, every clump capped white
//   snow_pine1, snow_pine2    the pines: snow-laden firs (the second fuller, in six closer skirts)
//   snow_dead1, snow_dead2    the dead trees of the cursed woods: bare, rimed, icicles hanging
//   snow_bush1, snow_bush2    the bushes at the grove edges (the second with red winterberries)
//   snow_rock1..3             the stone clusters, rock1..3's sizes, capped with snow
//   snow_stump                the stumps: a broken stump, snow in the break
//   snow_shrub                the redcaps at an oak's foot: a frost shrub, rime needles, red berries
//   snow_crystal              the glowing mushrooms: a cluster of ice crystals, a glint running
//                             over them (8 frames for an anim of about 4)
//   snow_grave                the gravestones and grave crosses: dark stone, snow on its head
//   crypt_frozen              the crypt: the same 26x29 mausoleum and frames, its roof under snow,
//                             its columns ice, icicles from the cornice; open, its stairs still glow
//                             'j'; sealed, its door is a slab of ice with the cross in it

import { makeBuf } from '../engine/pixels.js';
import { packedPalette } from './palette.js';
import { mulberry32 } from '../engine/util.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// Light from the top-left, slightly towards the viewer (as procgen.js).
const LX = -0.5, LY = -0.72, LZ = 0.48;

function set(buf, x, y, c) {
  if (x >= 0 && y >= 0 && x < buf.w && y < buf.h) buf.d[y * buf.w + x] = c;
}
function get(buf, x, y) {
  return x >= 0 && y >= 0 && x < buf.w && y < buf.h ? buf.d[y * buf.w + x] : 0;
}
// The tone a 0..1 lightness falls on, darkest first.
const tone = (tones, lum) => tones[Math.max(0, Math.min(tones.length - 1, Math.floor(lum * tones.length)))];

// The ramps, darkest first: snow, the leaves under it, bark, frosted ash, stone.
function ramps() {
  const p = packedPalette();
  return {
    p,
    snow: [p.N, p.g, p.G, p.w],
    bank: [p.n, p.N, p.g, p.G], // snow banked at a foot, a shade under the snow on the boughs
    leaf: [p.v, p.E, p.e],
    bark: [p.m, p.b, p.B],
    ash: [p.h, p.a, p.A],
    stone: [p.K, p.n, p.N, p.g],
  };
}

// Sphere-shaded blobs back to front, as procgen.js paintBlobs paints the Darkwood's canopies, with
// snow on what of each blob faces the sky: above its snowline (ny: -1 at the blob's crown, 1 at its
// foot) a pixel takes the snow's tones, below it the leaves' (or the stone's). The line is
// scalloped and drips a pixel or two lower here and there, and the leaves just under it lie in its
// shadow, a tone darker. opts.volume shades the whole crown as one sphere besides, so a white tree
// keeps its roundness. Returns the snow mask.
function paintSnowBlobs(buf, blobs, tones, snow, rng, opts = {}) {
  const owner = new Int16Array(buf.w * buf.h).fill(-1);
  const white = new Uint8Array(buf.w * buf.h);
  const sep = opts.separator ?? tones[0];
  const line = opts.snowline ?? 0, vol = opts.volume;
  blobs.forEach((b, i) => {
    const x0 = Math.floor(b.x - b.rx - 1), x1 = Math.ceil(b.x + b.rx + 1);
    const y0 = Math.floor(b.y - b.ry - 1), y1 = Math.ceil(b.y + b.ry + 1);
    const hem = [];
    for (let x = x0; x <= x1; x++) hem.push(line + Math.sin(x * 1.3 + b.phase) * (opts.scallop ?? 0.1) + (rng() < (opts.drips ?? 0.16) ? rng.range(0.15, 0.4) : 0));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) continue;
        const nx = (x + 0.5 - b.x) / b.rx, ny = (y + 0.5 - b.y) / b.ry;
        const ang = Math.atan2(ny, nx);
        const wob = opts.wobble ? 1 + Math.sin(ang * b.lobes + b.phase) * opts.wobble : 1;
        const d2 = nx * nx + ny * ny;
        if (d2 > wob * wob) continue;
        const idx = y * buf.w + x;
        const nz = Math.sqrt(Math.max(0, 1 - d2));
        const snowy = ny < hem[x - x0];
        let lum = nx * LX + ny * LY + nz * LZ; // -1..1
        if (vol) lum += ((x + 0.5 - vol.x) / vol.rx * LX + (y + 0.5 - vol.y) / vol.ry * LY) * vol.k;
        lum = lum * 0.5 + 0.5 + (snowy ? opts.snowLift ?? 0 : opts.lift ?? 0);
        lum += bayer(x, y) * (opts.dither ?? 0.28);
        if (opts.speckle && rng() < opts.speckle) lum += (rng() - 0.5) * 0.5;
        // Thin dark seam where a front blob overlaps the one behind it.
        const edge = Math.sqrt(d2) > wob - 1.2 / Math.min(b.rx, b.ry);
        if (owner[idx] >= 0 && edge && ny > -0.2) {
          buf.d[idx] = sep;
          white[idx] = 0;
        } else if (owner[idx] >= 0 && edge && snowy && opts.snowSeam) {
          buf.d[idx] = snow[0]; // two caps meeting
          white[idx] = 1;
        } else {
          buf.d[idx] = tone(snowy ? snow : tones, lum);
          white[idx] = snowy ? 1 : 0;
        }
        owner[idx] = i;
      }
    }
  });
  // The leaves (or stone) just under the snow lie in its shadow.
  for (let y = buf.h - 1; y > 0; y--) {
    for (let x = 0; x < buf.w; x++) {
      const i = y * buf.w + x;
      if (!buf.d[i] || white[i] || !white[i - buf.w]) continue;
      const t = tones.indexOf(buf.d[i]);
      if (t > 0) buf.d[i] = tones[t - 1];
    }
  }
  return white;
}

function trunk(buf, cx, top, bottom, w, tones, rng) {
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

// Snow banked against a foot: a low mound across [xa, xb] on the bottom rows, lit from the left,
// a shade under the snow on the boughs so the tree stands in the ground's snow rather than on a
// white plate.
function drift(buf, xa, xb, rows, tones) {
  const H = buf.h, mid = (xa + xb) / 2, half = (xb - xa) / 2 + 0.5;
  for (let x = Math.floor(xa); x <= Math.ceil(xb); x++) {
    const u = (x + 0.5 - mid) / half; // -1..1
    const tall = Math.round(rows * Math.sqrt(Math.max(0, 1 - u * u)) + 0.3);
    for (let k = 0; k < tall; k++) {
      const lum = 0.62 - u * 0.4 + (k === tall - 1 ? 0.12 : -0.1) + bayer(x, H - 1 - k) * 0.25;
      set(buf, x, H - 1 - k, tone(tones, lum));
    }
  }
}

// o tunes the snow: o.snowline (how far down each clump the snow reaches, -1..1 of it), o.scallop
// and o.drips (its hem), o.volume (how much the crown shades as one sphere), o.snowLift.
export function genSnowOak(seed = 1, o = {}) {
  const { p, snow, bank, leaf, bark } = ramps();
  const rng = mulberry32(seed);
  const W = 34, H = 44;
  const buf = makeBuf(W, H);
  const cx = W / 2;
  trunk(buf, cx, 24, H - 1, 6, bark, rng);
  // A couple of branches poking into the canopy.
  for (let i = 0; i < 4; i++) set(buf, Math.round(cx - 2 - i), 24 - i, p.b);
  for (let i = 0; i < 3; i++) set(buf, Math.round(cx + 2 + i), 23 - i, p.m);
  const blobs = [];
  const centers = [
    [0, -6, 10], [-8, 0, 8], [8, 0, 8], [-5, 7, 8], [5, 7, 8], [0, 3, 9], [-10, 8, 6], [10, 8, 6], [0, 11, 7],
  ];
  for (const [dx, dy, r] of centers) {
    const rr = r + rng.range(-1, 1.2);
    blobs.push({ x: cx + dx + rng.range(-1, 1), y: 16 + dy + rng.range(-1, 1), rx: rr, ry: rr * 0.92, lobes: rng.int(5, 8), phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  paintSnowBlobs(buf, blobs, leaf, snow, rng, {
    wobble: 0.08, speckle: 0.06, lift: o.lift ?? 0.02, snowLift: o.snowLift ?? -0.04, snowline: o.snowline ?? -0.4,
    scallop: o.scallop ?? 0.06, drips: o.drips ?? 0.1, volume: { x: cx, y: 17, rx: 16, ry: 16, k: o.volume ?? 0.5 },
  });
  drift(buf, cx - 5, cx + 4, 2, bank);
  return buf;
}

// o.layers skirts, each o.step below the last and o.grow wider; o.snow is how far down each skirt
// the snow reaches (0..1 of its height, deeper on the lit side).
export function genSnowPine(seed = 1, o = {}) {
  const { p, snow, bank, leaf, bark } = ramps();
  const rng = mulberry32(seed);
  const W = 26, H = 46;
  const buf = makeBuf(W, H);
  const cx = W / 2;
  trunk(buf, cx, 36, H - 1, 4, bark, rng);
  const layers = o.layers ?? 5, step = o.step ?? 6.5, grow = o.grow ?? 2.4;
  const deep = o.snow ?? 0.55;
  for (let i = 0; i < layers; i++) {
    const top = 1 + i * step;
    const bot = top + 11 + i * 0.6;
    const halfW = 4 + i * grow;
    const phase = rng() * 6;
    for (let y = Math.floor(top); y <= bot && y < H; y++) {
      const t = (y - top) / (bot - top);
      const jag = (Math.sin(y * 2.3 + i) + 1) * 0.6 + rng() * 0.7;
      const hw = halfW * t + 1 + (t > 0.7 ? jag : 0);
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const u = (x + 0.5 - cx) / Math.max(1, hw); // -1..1
        // The snowline: deeper on the lit side, scalloped along the skirt; a bough tip shows
        // dark through it here and there.
        const line = deep - u * 0.14 + Math.sin(x * 1.4 + phase) * 0.1;
        const snowy = t < line && !(t > 0.15 && rng() < 0.06);
        let lum = 0.62 - u * 0.42 - t * 0.25 + bayer(x, y) * 0.3;
        if (y > bot - 1.5) lum -= 0.4; // shadow on each skirt's lower edge
        if (rng() < 0.05) lum += 0.3;
        set(buf, x, y, snowy ? tone(snow, lum + 0.1) : tone(leaf, lum - 0.05));
      }
    }
  }
  set(buf, Math.floor(cx), 0, p.w); // snow on the tip
  drift(buf, cx - 4, cx + 3, 2, bank);
  return buf;
}

// The Darkwood's dead tree (procgen.js genDeadTree) frozen: its lit edge rimed with frost, snow on
// every top that is not a sheer drop, icicles under the boughs.
export function genSnowDead(seed = 1) {
  const { p, bank, ash } = ramps();
  const rng = mulberry32(seed);
  const W = 28, H = 38;
  const buf = makeBuf(W, H);
  const line = (x0, y0, x1, y1, w, c) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (let k = 0; k < w; k++) set(buf, Math.round(x - w / 2 + k), Math.round(y), k === 0 ? (w > 1 && y < H - 4 ? p.g : ash[2]) : c);
    }
  };
  const branch = (x, y, ang, len, w, depth) => {
    const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
    line(x, y, x1, y1, Math.max(1, Math.round(w)), depth > 2 ? ash[1] : ash[0]);
    if (depth <= 0 || len < 3) return;
    const n = depth > 2 ? 2 : rng.int(1, 2);
    for (let i = 0; i < n; i++) branch(x1, y1, ang + rng.range(-0.9, 0.9), len * rng.range(0.55, 0.75), w * 0.6, depth - 1);
  };
  branch(W / 2, H - 1, -Math.PI / 2, 16, 4, 4);
  branch(W / 2, H - 9, -Math.PI / 2 - 0.8, 8, 2, 2);
  branch(W / 2, H - 12, -Math.PI / 2 + 0.7, 9, 2, 2);
  const wood = buf.d.slice();
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? wood[y * W + x] : 0);
  for (let y = 0; y < H - 3; y++) {
    for (let x = 0; x < W; x++) {
      if (!at(x, y) || at(x, y - 1)) continue;
      const flat = at(x - 1, y) || at(x + 1, y);
      if (!flat) {
        // A twig's tip, nothing above it at all: a pinch of snow on it.
        if (!at(x - 1, y - 1) && !at(x + 1, y - 1)) set(buf, x, y, x < W / 2 + 2 ? p.w : p.G);
        continue;
      }
      set(buf, x, y, x < W / 2 + 2 ? p.w : p.G);
      if (at(x - 1, y) && at(x + 1, y) && !get(buf, x, y - 1) && rng() < 0.45) set(buf, x, y - 1, p.G); // a ridge of it
      if (!at(x, y + 1) && rng() < 0.3) {
        set(buf, x, y + 1, p.X);
        if (rng() < 0.5) set(buf, x, y + 2, p.U);
      }
    }
  }
  drift(buf, W / 2 - 4, W / 2 + 3, 2, bank);
  return buf;
}

export function genSnowBush(seed = 1, berries = false) {
  const { p, snow, leaf } = ramps();
  const rng = mulberry32(seed);
  const W = 18, H = 12;
  const buf = makeBuf(W, H);
  const blobs = [];
  for (let i = 0; i < 4; i++) {
    const r = rng.range(3.5, 5);
    blobs.push({ x: 4 + i * 3.4 + rng.range(-1, 1), y: H - r - rng.range(0, 2), rx: r, ry: r * 0.85, lobes: 6, phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  const white = paintSnowBlobs(buf, blobs, leaf, snow, rng, {
    wobble: 0.12, speckle: 0.08, lift: 0, snowLift: -0.04, snowline: -0.22,
    volume: { x: W / 2, y: H / 2, rx: 10, ry: 7, k: 0.3 },
  });
  if (berries) {
    for (let i = 0, tries = 0; i < 5 && tries < 80; tries++) {
      const x = rng.int(2, W - 3), y = rng.int(3, H - 2);
      if (get(buf, x, y) && !white[y * W + x] && !white[(y - 1) * W + x]) set(buf, x, y, i++ % 2 ? p.r : p.x);
    }
  }
  return buf;
}

export function genSnowRock(seed = 1, size = 1) {
  const { snow, stone } = ramps();
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
  paintSnowBlobs(buf, blobs, stone, snow.slice(1), rng, { wobble: 0.06, dither: 0.22, separator: stone[0], lift: -0.04, snowline: -0.35, scallop: 0.08, drips: 0.2, snowSeam: true });
  return buf;
}

// The crypt (props.js) in frosted stone and ice: the same pixels where it has pixels, the roof
// under snow, the cornice's moss now snow, icicles from it, its columns ice, snow drifted at their
// feet and on the step. Open, its stairs glow 'j' as ever; sealed, its door is a slab of ice with
// the cross in it.
const CRYPT_TOP = [
  '...........kkkk...........',
  '.........kkGwwGkk.........',
  '.......kkGwwGGwwGkk.......',
  '.....kkGwwGGXXGGwwgkk.....',
  '...kkGwwGGGGcXGGGGggNkk...',
  '.kkGwwGGGGGGGGGGGGgggNNkk.',
  'kNNGNNNNNNNNNNNNNNNNNNGNNk',
  'knnnnnnXnnnXnnXnnnXnnnnnnk',
  '.kXUukGcgggNggNgggcgkXUuk.',
  '.kXUukgGgggkkkkggggNkXUuk.',
];
const CRYPT_FOOT = [
  'kGGGGGGGGGGGGGGGGGGGGGGGGk',
  'kggggggggggggggggggggggggk',
  'kNNNNNNNNNNNNNNNNNNNNNNNNk',
  '.kkkkkkkkkkkkkkkkkkkkkkkk.',
];
const CRYPT_FROZEN = [
  [
    ...CRYPT_TOP,
    '.kXUukggggkhhhhkggggkXUuk.',
    '.kXUukgggkhhhhhhkgggkXUuk.',
    '.kXUukggkhhhhhhhhkggkXUuk.',
    '.kXUukggkhhhhhhhhkggkXUuk.',
    '.kXUukNNkhhhhhhhhkNNkXUuk.',
    '.kXUukggkhhhhhhhhkggkXUuk.',
    '.kXUukggkhhhhhhhhkggkXUuk.',
    '.kXUukggkhhhhhhhhkggkXUuk.',
    '.kXUukNNkhhhhhhhhkNNkXUuk.',
    '.kXUukggkhhhhhhhhkggkXUuk.',
    '.kXUukggkhhhhhhhhkggkXUuk.',
    '.kXUukggkqqqqqqqqkggkXUuk.',
    '.kGXukggkjjjjjjjjkggkXGuk.',
    '.kwGGkgGkqqqqqqqqkGgkGwGk.',
    'kNGwGNNNkjjjjjjjjkNNNGwGNk',
    ...CRYPT_FOOT,
  ],
  [
    ...CRYPT_TOP,
    '.kXUukggggkuuuukggggkXUuk.',
    '.kXUukgggkuUUUUukgggkXUuk.',
    '.kXUukggkucUUUUUukggkXUuk.',
    '.kXUukggkucUXXUUukggkXUuk.',
    '.kXUukNNkuUUXXUUukNNkXUuk.',
    '.kXUukggkuXXwwXXukggkXUuk.',
    '.kXUukggkuUUXXUUukggkXUuk.',
    '.kXUukggkuUUXXUUukggkXUuk.',
    '.kXUukNNkuUUXXUUukNNkXUuk.',
    '.kXUukggkuUUXXUuukggkXUuk.',
    '.kXUukggkuUUUUuuukggkXUuk.',
    '.kXUukggkuUUUuuuukggkXUuk.',
    '.kGXukggkuUUuuuuukggkXGuk.',
    '.kwGGkgGkuuuuuuuukGgkGwGk.',
    'kNGwGNNNkuuuuuuuukNNNGwGNk',
    ...CRYPT_FOOT,
  ],
];

// The ice crystals, and the glint that runs over them: up the tall one, then on the small ones in
// turn, with still frames between.
const CRYSTAL = [
  '.....w......',
  '.....Xc.....',
  '....XXcU....',
  '..X.XccU....',
  '.XcUXccU..X.',
  '.XcUXcuU.XcU',
  '.XcuXcuUuXcU',
  'gGXuUXcuUXuU',
  'GwGgGGGgGGgN',
  '.gGgggggNNn.',
];
const glint = (at) => CRYSTAL.map((r, y) => [...r].map((ch, x) => (at.some(([gx, gy]) => gx === x && gy === y) ? 'w' : ch)).join(''));

export const FLORA_FROZEN = {
  snow_oak1: { gen: () => [genSnowOak(3)] },
  snow_oak2: { gen: () => [genSnowOak(17)] },
  snow_pine1: { gen: () => [genSnowPine(5, { snow: 0.45 })] },
  snow_pine2: { gen: () => [genSnowPine(23, { layers: 6, step: 5, grow: 1.9, snow: 0.38 })] },
  snow_dead1: { gen: () => [genSnowDead(7)] },
  snow_dead2: { gen: () => [genSnowDead(31)] },
  snow_bush1: { gen: () => [genSnowBush(2)] },
  snow_bush2: { gen: () => [genSnowBush(9, true)] },
  snow_rock1: { gen: () => [genSnowRock(4, 1)] },
  snow_rock2: { gen: () => [genSnowRock(8, 1.6)] },
  snow_rock3: { gen: () => [genSnowRock(15, 0.7)] },
  snow_stump: {
    frames: [[
      '........b...',
      '...w...Bbm..',
      '..wGw..Bbm..',
      '.bGGGGGgtbm.',
      '.BBGgGgtbbm.',
      '.BbBbbbbbmm.',
      '.BBbBbbbbmm.',
      '.BbBbbbmbmm.',
      'BBbBbbbbbbmm',
      'wGgBbbbbbmgN',
    ]],
  },
  snow_shrub: {
    frames: [[
      '...w...X...',
      '.X.wG.wGX..',
      '..wGGgwGgX.',
      '.wGvGEGgGg.',
      '.GvEvEvEgN.',
      'gvEvrvEvEv.',
      '.vEvxvEvrv.',
      '..vvKvvKv..',
    ]],
  },
  snow_crystal: {
    emissive: 'cUXw',
    frames: [
      CRYSTAL,
      glint([[5, 1]]),
      glint([[5, 3], [4, 4]]),
      CRYSTAL,
      glint([[10, 4], [9, 5]]),
      CRYSTAL,
      glint([[2, 3], [1, 4]]),
      CRYSTAL,
    ],
  },
  snow_grave: {
    frames: [[
      '...wwG....',
      '..wGGGGg..',
      '.wGGGGgggN',
      '.GnNNNNngN',
      '.gNNnnNNng',
      '.gNnnnnnNn',
      '.gNNnnNNnn',
      '.gNNnnNNnn',
      '.gNNNNNNnn',
      '.gNNNNNnnn',
      'GwnnnnnnGg',
      '.GGGgGGgN.',
    ]],
  },
  crypt_frozen: { emissive: 'j', frames: CRYPT_FROZEN },
};
