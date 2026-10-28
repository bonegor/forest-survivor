// The Abyss's own flora: the trees, spires, thorns, rocks and small props of the fifth and last
// Survival map (data/maps.js 'hell', look 'hell'). The owner's (28 October 2026): "And one more
// would be a dark, hellish, essentially dark, hellish, demonic map", the last one played, after
// the Darkwood. Painted as the Darkwood's are (procgen.js): pixel buffers lit from the top left,
// dithered with a Bayer matrix, in palette tones only, so they tune and burst like the rest; the
// small props and the hellgate are palette strings, as props.js draws its own.
//
// What stands in for what (the forest's layout slots, game/darkwood.js layoutChunk):
//   hell_tree1, hell_tree2          charred black trees, their cracks and twigs glowing   (oak)
//   hell_spire1, hell_spire2        obsidian shards and basalt columns, faint lava veins  (pine)
//   hell_thorn1, hell_thorn2        black thorny bone-trees, their points smouldering     (dead tree)
//   hell_thornbush1, 2              black thorn bushes, the second with ember berries     (bush)
//   hell_rock1, 2, 3                obsidian, a brimstone boulder, a brimstone lump       (rock)
//   hell_bones                      a small heap of bones                                 (redcaps)
//   hell_vent                       a brimstone vent breathing fire, three frames         (mushrooms)
//   crypt_hell                      the crypt as a hellgate of red-black stone: the same
//                                   26x29 frames, open and sealed, its stairs burning orange
//
// Hell's night is a dark red one, so most of what is seen there is what glows: the embers in the
// charred wood and at the thorns' points, the lava in the spires, the vents' fire, the gate's
// stairs. Those are the ember keys, unlit (def.emissive): R the coolest, then O, o and y, f the
// hottest. No other part of a sprite here is drawn in a key it glows in. (The black thorns' edges
// catch a warm rim too, d and b, lit as the rest of them: so they read on the ash in the dark.)

import { makeBuf } from '../engine/pixels.js';
import { packedPalette } from './palette.js';
import { mulberry32 } from '../engine/util.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// Light from the top-left, slightly towards the viewer (as procgen.js).
const LX = -0.5, LY = -0.72, LZ = 0.48;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const tone = (tones, lum) => tones[clamp(Math.floor(lum * tones.length), 0, tones.length - 1)];

function set(buf, x, y, c) {
  if (x >= 0 && y >= 0 && x < buf.w && y < buf.h) buf.d[y * buf.w + x] = c;
}
function get(buf, x, y) {
  return x >= 0 && y >= 0 && x < buf.w && y < buf.h ? buf.d[y * buf.w + x] : 0;
}

// The pixels of a 1 px line from (x0, y0) to (x1, y1), each once, in order.
function linePts(x0, y0, x1, y1) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
    const l = out[out.length - 1];
    if (!l || l[0] !== x || l[1] !== y) out.push([x, y]);
  }
  return out;
}

// Paints sphere-shaded blobs back to front (procgen.js's, as it is). tones: darkest -> brightest.
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
        const ang = Math.atan2(ny, nx);
        const wob = opts.wobble ? 1 + Math.sin(ang * b.lobes + b.phase) * opts.wobble : 1;
        const d2 = nx * nx + ny * ny;
        if (d2 > wob * wob) continue;
        const idx = y * buf.w + x;
        const nz = Math.sqrt(Math.max(0, 1 - d2));
        let lum = nx * LX + ny * LY + nz * LZ;
        lum = lum * 0.5 + 0.5 + (opts.lift || 0);
        lum += bayer(x, y) * (opts.dither ?? 0.28);
        if (opts.speckle && rng() < opts.speckle) lum += (rng() - 0.5) * 0.5;
        const edge = Math.sqrt(d2) > wob - 1.2 / Math.min(b.rx, b.ry);
        if (owner[idx] >= 0 && edge && ny > -0.2) buf.d[idx] = sep;
        else buf.d[idx] = tone(tones, lum);
        owner[idx] = i;
      }
    }
  });
}

// A tapered limb from (x0, y0) to (x1, y1), w0 thick at its root and w1 at its end, shaded round
// as a branch is, lit from the top-left. Marks what it paints in `mask` (1 per pixel) if given.
function limb(buf, x0, y0, x1, y1, w0, w1, tones, o = {}) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const r = Math.max(w0, w1) / 2 + 1;
  for (let y = Math.floor(Math.min(y0, y1) - r); y <= Math.ceil(Math.max(y0, y1) + r); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - r); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
      if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) continue;
      const qx = x + 0.5 - x0, qy = y + 0.5 - y0;
      const t = clamp((qx * ux + qy * uy) / len, 0, 1);
      const half = (w0 + (w1 - w0) * t) / 2;
      const ex = qx - ux * t * len, ey = qy - uy * t * len;
      if (ex * ex + ey * ey > half * half) continue;
      const s = clamp((ex * nx + ey * ny) / Math.max(half, 0.5), -1, 1);
      const nz = Math.sqrt(1 - s * s);
      const lum = (nx * s * LX + ny * s * LY + nz * LZ) * 0.5 + 0.5 + (o.lift || 0) + bayer(x, y) * (o.dither ?? 0.24);
      buf.d[y * buf.w + x] = tone(tones, lum);
      if (o.mask) o.mask[y * buf.w + x] = 1;
    }
  }
}

// A glowing crack wandering up (or along) a run of wood or stone: cool at its ends, hot in its
// middle. `inside(x, y)` keeps it on the material. ramp: the ember keys, coolest first.
function crack(buf, x, y, len, ramp, rng, inside, o = {}) {
  const pts = [];
  let dx = 0;
  for (let i = 0; i < len; i++) {
    if (!inside(x, y)) break;
    pts.push([x, y]);
    if (rng() < (o.wander ?? 0.45)) dx = clamp(dx + (rng() < 0.5 ? -1 : 1), -1, 1);
    else if (rng() < 0.3) dx = 0;
    x += dx;
    y += o.dy ?? -1;
  }
  pts.forEach(([px, py], i) => {
    const u = pts.length > 1 ? i / (pts.length - 1) : 0.5;
    const heat = 1 - Math.abs(u - (o.hot ?? 0.5)) * 2; // 1 at the hot spot, 0 at the ends
    const k = clamp(Math.floor(heat * ramp.length * 0.999 + (rng() - 0.5) * 0.8), 0, ramp.length - 1);
    set(buf, px, py, ramp[k]);
  });
  return pts;
}

// ---------------------------------------------------------------- charred trees (oak slot) --

// A broad old tree burnt black where it stood: a thick gnarled trunk, heavy limbs spreading into
// an oak's round crown, the fine twigs burnt off to stubs that still smoulder at their ends, and
// cracks in the char glowing with the fire still inside it. The glow keeps above its lowest
// rows, where the horde walks in front of it.
function genCharredTree(seed = 1, o = {}) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = 34, H = 44;
  const buf = makeBuf(W, H);
  const mask = new Uint8Array(W * H);
  const WOOD = [pal.k, pal.h, pal.m, pal.a];
  const lean = o.lean || 0;
  const top = o.top ?? 24; // where the crown splits from the trunk
  const tips = [];
  // The trunk: thick at the foot, bending as it climbs (a smooth wobble, and the lean).
  const ph = rng() * 6;
  const at = (y) => W / 2 + Math.sin(ph + y * 0.21) * 0.9 + lean * ((H - 1 - y) / (H - 1 - top)) ** 1.5;
  const steps = [H - 1, H - 7, H - 12, H - 17, top];
  const widths = [7.6, 6.8, 6.2, 5.8, 5.2];
  for (let i = 0; i < steps.length - 1; i++) limb(buf, at(steps[i]), steps[i], at(steps[i + 1]), steps[i + 1], widths[i], widths[i + 1], WOOD, { mask, lift: 0.05 });
  // Roots gripping the ash at the foot.
  for (const s of [-1, 1]) {
    limb(buf, W / 2 + s * 1.5, H - 5, W / 2 + s * rng.range(6, 7.5), H - 1, 3.6, 1.2, WOOD, { mask, lift: 0.05 });
    if (rng() < 0.6) limb(buf, W / 2 + s * 0.5, H - 3, W / 2 + s * 3.5, H - 0.6, 2.6, 1.4, WOOD, { mask });
  }
  // Char splits along the grain: dark fissures up the trunk's lit side.
  for (let i = 0; i < 4; i++) {
    let x = Math.round(at(H - 4) - 2.5 + rng.range(0, 2.5));
    for (let y = H - 2 - rng.int(0, 4), n = rng.int(4, 8); n > 0 && y > top; y--, n--) {
      if (rng() < 0.25) x += rng() < 0.5 ? -1 : 1;
      if (mask[y * W + x] && get(buf, x, y) !== pal.k) set(buf, x, y, get(buf, x, y) === pal.a ? pal.m : pal.h);
    }
  }
  // The crown: heavy limbs, each forking into lighter ones, the twigs burnt to stubs. It keeps
  // within an oak's round shape, a little lopsided.
  const fx = at(top), ccx = fx + lean * 0.3, ccy = 15, crx = 16, cry = 14;
  const inCrown = (x, y) => ((x - ccx) / crx) ** 2 + ((y - ccy) / cry) ** 2 < 1;
  const grow = (x, y, ang, len, w, depth) => {
    let x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
    // Shorten a limb that would leave the crown.
    for (let k = 0; k < 8 && !inCrown(x1, y1); k++) {
      len *= 0.85;
      x1 = x + Math.cos(ang) * len;
      y1 = y + Math.sin(ang) * len;
    }
    if (w >= 1.5) limb(buf, x, y, x1, y1, w, Math.max(1, w * 0.62), WOOD, { mask, lift: 0.1 });
    else {
      for (const [px, py] of linePts(x, y, x1, y1)) {
        set(buf, px, py, Math.cos(ang) < -0.3 ? pal.m : pal.h);
        mask[py * W + px] = 1;
      }
    }
    if (depth <= 0 || len < 2) {
      tips.push([Math.round(x1), Math.round(y1), ang, w]);
      return;
    }
    // Burnt: a limb may end in a broken stump instead of forking on.
    if (depth <= 2 && w > 1.2 && rng() < (o.broken ?? 0.12)) {
      tips.push([Math.round(x1), Math.round(y1), ang, w, true]);
      return;
    }
    const n = depth >= 3 ? 2 : rng() < 0.75 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const spread = n === 1 ? rng.range(-0.4, 0.4) : (i ? 1 : -1) * rng.range(0.32, 0.7);
      // Limbs bend back upward as they go (they grew toward the light once).
      const up = (-Math.PI / 2 - ang) * 0.2;
      grow(x1, y1, ang + spread + up, len * rng.range(0.58, 0.74), w * 0.58, depth - 1);
    }
  };
  for (const [a, len, w] of o.limbs || [[-2.45, 9, 3.6], [-1.85, 9, 3.2], [-1.3, 10, 3.8], [-0.7, 9, 3.4]]) {
    grow(fx + Math.cos(a) * 1.2, top + 1.5, a + rng.range(-0.1, 0.1), len + rng.range(-1, 1), w, 4);
  }
  // Cracks in the char, glowing: up the trunk, never in its lowest rows (the horde walks there,
  // and the glow is drawn over what passes in front of it).
  const onWood = (x, y) => mask[y * W + x] === 1 && y < H - 10;
  const EMBER = [pal.R, pal.O, pal.o, pal.y];
  for (let i = 0; i < (o.cracks ?? 2); i++) {
    const x = Math.round(at(H - 12) + rng.range(-1.5, 1.5)), y = H - 11 - rng.int(0, 3);
    crack(buf, x, y, rng.int(7, 12), EMBER, rng, (px, py) => onWood(px, py) && onWood(px - 1, py) && onWood(px + 1, py), { hot: rng.range(0.35, 0.65) });
  }
  // A hollow burnt into the trunk, the fire still in it.
  if (o.hollow) {
    const hx = Math.round(at(H - 16)) - 2, hy = H - 19;
    const rows = ['.kk.', 'kRRk', 'kOok', 'Ooyo', 'Ryfo', 'kOok', '.kk.'];
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      if (ch !== '.') set(buf, hx + i, hy + j, pal[ch]);
    }));
  }
  // The stubs of the twigs smoulder at their ends: most a dull red, a few still bright; a broken
  // limb glows across its break.
  for (const [x, y, ang, w, broken] of tips) {
    if (!mask[y * W + x]) continue;
    const bx = Math.round(x - Math.cos(ang)), by = Math.round(y - Math.sin(ang));
    const r = rng();
    if (broken) {
      set(buf, x, y, pal.o);
      if (mask[by * W + bx]) set(buf, bx, by, pal.O);
      const sx = Math.round(x - Math.sin(ang)), sy = Math.round(y + Math.cos(ang));
      if (mask[sy * W + sx] && w > 1.8) set(buf, sx, sy, pal.y);
    } else if (r < 0.14) {
      set(buf, x, y, rng() < 0.35 ? pal.y : pal.o);
      if (mask[by * W + bx]) set(buf, bx, by, pal.R);
    } else if (r < 0.62) set(buf, x, y, rng() < 0.3 ? pal.O : pal.R);
  }
  return buf;
}

// ---------------------------------------------------------------- spires (pine slot) --

// A shard of black glass from base (bx, by) to tip (tx, ty), hw wide at its base each side: two
// faces meeting at a ridge, the left one turned to the light, with a bright edge where they meet.
function shard(buf, bx, by, tx, ty, hw, tones, o = {}) {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux; // n: across the shard
  const ridge = o.ridge ?? -0.15; // where the faces meet, -1..1 across
  for (let y = Math.floor(Math.min(by, ty) - hw - 1); y <= Math.ceil(Math.max(by, ty) + 1); y++) {
    for (let x = Math.floor(Math.min(bx, tx) - hw - 1); x <= Math.ceil(Math.max(bx, tx) + hw + 1); x++) {
      if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) continue;
      const qx = x + 0.5 - bx, qy = y + 0.5 - by;
      const t = (qx * ux + qy * uy) / len; // 0 at the base, 1 at the tip
      if (t < -0.02 || t > 1) continue;
      const half = hw * Math.pow(1 - clamp(t, 0, 1), o.taper ?? 0.85) + 0.35;
      const s = (qx * nx + qy * ny) / half;
      if (Math.abs(s) > 1) continue;
      // Each face's normal: across the shard, tipped toward the viewer and a little up its length.
      const side = s < ridge ? -1 : 1;
      const fx = nx * side * 0.72 - ux * 0.22, fy = ny * side * 0.72 - uy * 0.22, fz = 0.62;
      let lum = (fx * LX + fy * LY + fz * LZ) * 0.5 + 0.5 + (o.lift ?? -0.26);
      lum += bayer(x, y) * (o.dither ?? 0.08) + t * 0.14 - (1 - t) * 0.06;
      // The ridge catches the light, glass's bright edge, and so does the lit face's outer rim
      // toward the top: the rest of the glass stays black.
      const ridgeHit = Math.abs(s - ridge) * half < 0.55;
      let c = tone(tones, lum);
      if (ridgeHit && t > 0.08) c = tones[tones.length - 1];
      else if (side < 0 && s < -0.72 && t > 0.4 && fx * LX + fy * LY > 0) c = tones[tones.length - 2];
      buf.d[y * buf.w + x] = c;
      if (o.mask) o.mask[y * buf.w + x] = 1 + (side > 0 ? 1 : 0);
    }
  }
}

// A cluster of obsidian shards, the tallest in the middle as a pine's crown is, out of a heap of
// broken glass; thin veins of lava in it, faint, glowing.
function genObsidianSpire(seed = 1) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = 26, H = 46;
  const buf = makeBuf(W, H);
  const mask = new Uint8Array(W * H);
  const GLASS = [pal.k, pal.q, pal.p, pal.j];
  const cx = W / 2;
  // Back shards first, then the tallest, then the small ones in front.
  const shards = [
    [cx - 4, H - 3, cx - 10, H - 27, 3.8],
    [cx + 4, H - 3, cx + 9.5, H - 32, 4],
    [cx + 0.5, H - 2, cx + rng.range(-1, 1), 1, 6.2],
    [cx - 3, H - 1, cx - 8.5, H - 16, 3],
    [cx + 3.5, H - 1, cx + 8, H - 13, 2.8],
  ];
  const ridges = shards.map(() => rng.range(-0.3, 0.05));
  const draw = (i) => shard(buf, ...shards[i], GLASS, { mask: i === 2 ? mask : null, ridge: ridges[i] });
  [0, 1, 2].forEach(draw);
  // A glint high on the tall shard's ridge.
  const gx = [...Array(W).keys()].find((i) => get(buf, i, 11) === pal.j);
  if (gx !== undefined) set(buf, gx, 11, pal.G);
  // A lava vein in the tall shard's dark face, faint: winding up its middle from above the foot,
  // never in the lowest rows (the horde walks in front of those, and the glow is drawn over them).
  const dark = (x, y) => mask[y * W + x] === 2 && get(buf, x, y) !== pal.j && get(buf, x, y) !== pal.G;
  const y0 = H - 11, y1 = H - 31;
  for (let y = y0; y >= y1; y--) {
    const xs = [...Array(W).keys()].filter((x) => dark(x, y));
    if (xs.length < 2) break;
    const u = (y0 - y) / (y0 - y1);
    const x = xs[Math.min(xs.length - 1, Math.round((xs.length - 1) * (0.45 + Math.sin(u * 7 + seed) * 0.3)))];
    set(buf, x, y, u > 0.25 && u < 0.4 ? pal.o : (u > 0.12 && u < 0.55) || u > 0.8 ? pal.O : pal.R);
  }
  // The small shards in front, then rubble of glass at the foot.
  [3, 4].forEach(draw);
  const blobs = [];
  for (let i = 0; i < 4; i++) {
    const r = rng.range(1.6, 2.4);
    blobs.push({ x: cx - 6 + i * 4 + rng.range(-0.5, 0.5), y: H - r * 0.8, rx: r, ry: r * 0.75, lobes: 3, phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  paintBlobs(buf, blobs, [pal.k, pal.q, pal.p], rng, { wobble: 0.05, dither: 0.2, lift: -0.1 });
  return buf;
}

// Basalt that cooled into columns: six-sided pillars of dark stone standing together, the
// tallest in the middle, each with a lit top and a lit left face, the lava glowing faint in the
// joints between them.
function genBasaltSpire(seed = 1) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = 24, H = 44;
  const buf = makeBuf(W, H);
  const STONE = [pal.k, pal.V, pal.W, pal.Q];
  // Columns back to front: [left x, width, height, foot raised by, top cut: +1 down to the right].
  const cols = [
    [3, 5, 23, 2, 1], [16, 5, 27, 2, -1], [7, 5, 35, 1, 1], [12, 5, 43, 1, -1], [9, 4, 17, 0, 1], [1, 4, 12, 0, -1], [18, 5, 14, 0, 1],
  ];
  const joints = [];
  for (const [x0, w, h, raise, cut] of cols) {
    const foot = H - 1 - raise;
    const top = foot - h + 1;
    // Cross-joints where the column cooled and cracked, few and uneven: a dark line stepping
    // across it, the stone under it lit.
    const cj = [];
    for (let y = top + rng.int(7, 11); y < foot - 5; y += rng.int(10, 15)) cj.push(y);
    const step = rng.int(1, w - 2);
    for (let x = x0; x < x0 + w; x++) {
      const u = (x - x0 + 0.5) / w; // 0..1 across
      const topY = Math.round(top + (cut > 0 ? u : 1 - u) * 2);
      const jo = x - x0 >= step ? 1 : 0; // the joint steps down a row partway across
      for (let y = topY; y <= foot; y++) {
        // A six-sided column: the left third faces the light, the middle the viewer, the right away.
        const face = u < 0.3 ? 0.8 : u < 0.72 ? 0.46 : 0.16;
        let lum = face + bayer(x, y) * 0.14 - (y - topY) * 0.005;
        if (y - topY < 2) lum = y === topY ? 0.98 : 0.78; // the cut top, under the sky
        if (cj.includes(y - jo)) lum = 0.02;
        else if (cj.includes(y - jo - 1)) lum += 0.2;
        set(buf, x, y, tone(STONE, lum));
      }
      set(buf, x, topY - 1, 0);
    }
    // A dark seam down its right side, where it meets the next.
    for (let y = top + 2; y <= foot; y++) if (get(buf, x0 + w - 1, y) !== pal.Q) set(buf, x0 + w - 1, y, pal.k);
    joints.push(...cj.map((y) => [x0, y, w, h, step]));
  }
  // Lava glowing faint in a few of the joints, above the foot.
  const hot = joints.filter(([, y, , h]) => h > 20 && y < H - 12 && y > 6);
  for (let i = 0; i < Math.min(3, hot.length); i++) {
    const [x0, y, w, , step] = hot[(i * 2 + rng.int(0, 1)) % hot.length];
    for (let x = x0; x < x0 + w - 1; x++) set(buf, x, y + (x - x0 >= step ? 1 : 0), x === x0 + 1 + (i % 2) ? pal.O : pal.R);
  }
  return buf;
}

// ---------------------------------------------------------------- thorn trees (dead-tree slot) --

// A bough along a curve (quadratic, from p0 bending toward p1 to p2), w0 thick at its root and w1
// at its end, in short tapered pieces. Returns points along it with the way it runs there, for
// thorns.
function bough(buf, p0, p1, p2, w0, w1, tones, mask, o = {}) {
  const at = (t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const n = Math.max(2, Math.round(len / 2.5));
  const out = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i / n), [x1, y1] = at((i + 1) / n);
    const wa = w0 + (w1 - w0) * (i / n), wb = w0 + (w1 - w0) * ((i + 1) / n);
    if (wa >= 1.5) limb(buf, x0, y0, x1, y1, wa, Math.max(1, wb), tones, { mask, dither: 0.16, lift: o.lift ?? 0.06 });
    else {
      const lit = (x1 - x0) < -0.3 * Math.abs(y1 - y0) || (y1 - y0) < -0.9 * Math.hypot(x1 - x0, y1 - y0);
      for (const [x, y] of linePts(x0, y0, x1, y1)) {
        set(buf, x, y, lit ? tones[tones.length - 1] : tones[1]);
        if (mask && x >= 0 && y >= 0 && x < buf.w && y < buf.h) mask[y * buf.w + x] = 1;
      }
    }
    out.push([x1, y1, Math.atan2(y1 - y0, x1 - x0), wb]);
  }
  return out;
}

// A black tree grown like bone: thorn1 twisted up into a claw, its boughs hooking in at their
// points; thorn2 a spine whose ribs arch out and droop, a weeping cage of them, shorter toward
// the top. Thorns rake along them toward their ends, and the points are pale as old bone.
// Black on the black ash it vanished by night (28 October 2026), so it is lit as the charred
// trees are: the fires' warm light catches its edges facing up and to the left (an ember rim,
// lit as the rest of it is), its highest points smoulder and a crack up its trunk glows with
// them (the ember keys, unlit), and its wood is a shade less black. None of the glow in its
// lowest rows, where the horde walks in front of it (the glow is drawn over what passes there).
function genThornTree(seed = 1, kind = 'claw') {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = 28, H = 38;
  const buf = makeBuf(W, H);
  const mask = new Uint8Array(W * H);
  const BLACK = [pal.k, pal.h, pal.m, pal.a], DARK = { lift: -0.12 };
  const j = (v) => v + rng.range(-0.6, 0.6);
  const runs = []; // [points along it, thorns on it (-1: only its pale point)]
  if (kind === 'claw') {
    // The trunk, twisting, then three long boughs hooking in at their points, and two low ones.
    runs.push([bough(buf, [14, 37], [10.5, 30], [14, 22], 4.4, 3.2, BLACK, mask, DARK), 0]);
    runs.push([bough(buf, [13, 30], [j(6), j(31)], [j(3), j(24)], 1.8, 1, BLACK, mask, DARK), 2]);
    runs.push([bough(buf, [15, 28], [j(20), j(28.5)], [j(21.5), j(24)], 1.5, 1, BLACK, mask, DARK), 1]);
    runs.push([bough(buf, [13, 23], [j(5), j(21)], [j(3), j(9)], 2.4, 1, BLACK, mask, DARK), 3]);
    runs.push([bough(buf, [14.5, 22], [j(18), j(13)], [j(13.5), j(3)], 2.4, 1, BLACK, mask, DARK), 3]);
    runs.push([bough(buf, [15, 23], [j(24), j(21)], [j(25), j(9)], 2.2, 1, BLACK, mask, DARK), 3]);
    for (const k of [3, 4, 5]) {
      // A hook at the end of each, turning inward.
      const p = runs[k][0][runs[k][0].length - 1], dir = k === 3 ? 1 : k === 4 ? -1 : -1;
      runs.push([bough(buf, [p[0], p[1]], [p[0], p[1] - 3], [p[0] + dir * 2.5, p[1] - 4.5], 1, 1, BLACK, mask, DARK), -1]);
    }
  } else {
    // The spine, a little bowed, and its ribs, longest low down, each arching out and drooping.
    runs.push([bough(buf, [14, 37], [15.5, 22], [14, 3], 4.2, 1.4, BLACK, mask, DARK), -1]);
    // Off alternate sides, as a tree branches: [height, side, reach, droop].
    const ribs = [[28, -1, 12.5, 6], [24, 1, 12, 6], [19, -1, 10.5, 5], [15, 1, 9.5, 5], [10, -1, 7.5, 4], [7, 1, 6, 3]];
    ribs.forEach(([y, s, reach, droop], i) => {
      const x = 14 + s, w = 2.2 - i * 0.18;
      runs.push([bough(buf, [x, y], [j(x + s * reach * 0.55), j(y - 6)], [j(x + s * reach), j(y + droop)], w, 1, BLACK, mask, DARK), 2]);
    });
    // The spine's knobs: a vertebra every few pixels, lit on its left.
    for (let y = 32; y > 6; y -= 4) {
      const xs = [...Array(W).keys()].filter((x) => mask[y * W + x]);
      if (xs.length) set(buf, xs[0], y, pal.Z);
    }
  }
  // The ember rim, where its edge faces up or to the left: on the thick of it a warm orange where
  // it faces up (the most lit) and a rust where it faces only to the left; a bough too thin for a
  // rim of its own takes the rust along its edge; the twigs left as they are.
  const open = (x, y) => x < 0 || y < 0 || x >= W || y >= H || !mask[y * W + x];
  const depth = (x, y, dx, dy) => {
    let n = 0;
    while (n < 3 && !open(x + dx * n, y + dy * n)) n++;
    return n;
  };
  const rim = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = get(buf, x, y);
      if (!mask[y * W + x] || c === pal.k || c === pal.Z || (open(x + 1, y) && open(x, y + 1))) continue;
      const up = open(x, y - 1);
      if (!up && !open(x - 1, y)) continue;
      rim.push([x, y, up && depth(x, y, 0, 1) >= 3 ? pal.d : pal.b]);
    }
  }
  for (const [x, y, c] of rim) set(buf, x, y, c);
  // Thorns raked toward the ends, off alternate sides; the pale points at each run's end. Where a
  // claw's bough runs on into its hook, its end is a knuckle, not a point (no ember there).
  const knuckles = kind === 'claw' ? [3, 4, 5] : [];
  const ends = [];
  for (const [r, [pts, count]] of runs.entries()) {
    const [ex, ey] = pts[pts.length - 1];
    if (count < 0) {
      set(buf, Math.round(ex), Math.round(ey), pal.Z);
      ends.push(pts);
      continue;
    }
    let side = rng() < 0.5 ? -1 : 1;
    const step = Math.max(1, Math.floor(pts.length / (count + 1)));
    for (let i = step; i < pts.length - 1 && count; i += step) {
      const [x, y, a, w] = pts[i];
      const ta = a + side * 0.9, off = w / 2 + 0.3;
      for (let k = 1; k <= 2; k++) {
        const px = Math.round(x + Math.cos(ta) * (off + k - 0.5)), py = Math.round(y + Math.sin(ta) * (off + k - 0.5));
        if (px < 0 || py < 0 || px >= W || py >= H || mask[py * W + px]) continue;
        set(buf, px, py, k === 2 ? pal.A : pal.h);
      }
      side = -side;
    }
    if (count > 0) {
      set(buf, Math.round(ex), Math.round(ey), pal.Z);
      if (!knuckles.includes(r)) ends.push(pts);
    }
  }
  // The embers: the highest points smoulder, hottest at the very tip and duller back along the
  // bough, the highest of all the hottest; the low ones stay bone. Then a crack glowing up the
  // middle of the trunk from above its lowest rows, the hottest half way up it.
  const tips = ends.filter((pts) => pts[pts.length - 1][1] < H - 14).sort((a, b) => a[a.length - 1][1] - b[b.length - 1][1]);
  tips.forEach((pts, i) => {
    // A point past the top of the picture smoulders where it leaves it.
    const end = [...pts].reverse().find(([, y]) => Math.round(y) >= 0);
    if (!end) return;
    const [x, y, a] = end;
    const back = linePts(x, y, x - Math.cos(a) * 2.6, y - Math.sin(a) * 2.6).filter(([px, py]) => mask[py * W + px]).slice(0, 3);
    back.forEach(([px, py], k) => set(buf, px, py, [i === 0 ? pal.y : pal.o, pal.O, pal.R][k]));
  });
  const EMBER = [pal.R, pal.O, pal.o, pal.y];
  const trunk = runs[0][0];
  const mid = (y) => {
    for (let i = 1; i < trunk.length; i++) {
      const [xa, ya] = trunk[i - 1], [xb, yb] = trunk[i];
      if ((y - ya) * (y - yb) <= 0) return xa + ((xb - xa) * (y - ya)) / (yb - ya || 1);
    }
    return trunk.reduce((b, p) => (Math.abs(p[1] - y) < Math.abs(b[1] - y) ? p : b))[0];
  };
  const y0 = kind === 'claw' ? H - 11 : H - 12, y1 = kind === 'claw' ? H - 16 : H - 18;
  for (let y = y0; y >= y1; y--) {
    const x = Math.round(mid(y) - 0.3), u = (y0 - y) / (y0 - y1);
    if (mask[y * W + x]) set(buf, x, y, EMBER[clamp(Math.floor((1 - Math.abs(u - 0.5) * 2) * EMBER.length), 0, EMBER.length - 1)]);
  }
  return buf;
}

// ---------------------------------------------------------------- thorn bushes --

// A mound of black thorn: a dark dome of tangled stems, twigs fanning out of its foot through it
// and past its edge, lit where they face up and to the left, their thorny points pale; the second
// bears berries, the ripe ones glowing like embers. Lit as the thorn trees are (28 October 2026,
// it vanished on the ash by night): its edge where it faces up and to the left takes the fires'
// warm rim, the thorns there rust, two of its highest points smoulder (the ember keys, unlit) and
// its tangle is a shade less black.
function genThornBush(seed = 1, berries = false) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = 18, H = 12;
  const buf = makeBuf(W, H);
  const mask = new Uint8Array(W * H);
  // The dome: a big blob in the middle, two lower at its sides, leaving room round it for thorns.
  const blobs = [
    { x: W / 2 + rng.range(-0.6, 0.6), y: H - 4.4, rx: 4.6, ry: 3.9, lobes: 9, phase: rng() * 6 },
    { x: 4.6, y: H - 2.6, rx: 2.9, ry: 2.5, lobes: 7, phase: rng() * 6 },
    { x: W - 4.6, y: H - 2.6, rx: 2.9, ry: 2.5, lobes: 7, phase: rng() * 6 },
  ];
  paintBlobs(buf, blobs, [pal.k, pal.h, pal.m, pal.a], rng, { wobble: 0.14, speckle: 0.12, lift: -0.16, dither: 0.3 });
  for (let i = 0; i < W * H; i++) if (buf.d[i]) mask[i] = 1;
  // Twigs fanning out of its foot, through the tangle and two or three pixels past its edge as
  // thorns: rust where the light catches them (up and to the left), pale at their points.
  const n = 15;
  const points = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (Math.PI * (i + 0.5)) / n + rng.range(-0.07, 0.07);
    const fx = W / 2 + Math.cos(a) * 1.5, fy = H - 1;
    const pts = linePts(fx, fy, fx + Math.cos(a) * 14, fy + Math.sin(a) * 11);
    const lit = Math.cos(a) < 0.2;
    const reach = rng() < 0.5 ? 3 : 2;
    let out = 0, last = null;
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x >= W || y >= H) break;
      if (!mask[y * W + x]) {
        if (++out > reach) break;
        set(buf, x, y, out === reach ? pal.A : lit ? pal.b : pal.h); // past the edge: a thorn
        if (out === reach) points.push([x, y, last]);
        last = [x, y];
        continue;
      }
      if (y < H - 2 && rng() < 0.6) set(buf, x, y, lit ? pal.a : pal.m);
    }
  }
  // The rim: the dome's edge (not under a thorn) as lit as it faces the light, from the middle of
  // the mound: a warm orange where it faces up and to the left, a rust round from there.
  const cx = blobs[0].x, cy = blobs[0].y;
  const rim = [];
  for (let y = 0; y < H - 2; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x] || get(buf, x, y) === pal.A) continue;
      if (get(buf, x, y - 1) && get(buf, x - 1, y)) continue;
      const nx = x + 0.5 - cx, ny = (y + 0.5 - cy) * 1.2, l = Math.hypot(nx, ny) || 1;
      const lit = (nx * LX + ny * LY) / l;
      if (lit > 0.62) rim.push([x, y, pal.d]);
      else if (lit > 0.05) rim.push([x, y, pal.b]);
    }
  }
  for (const [x, y, c] of rim) set(buf, x, y, c);
  // Its highest point smoulders, hot at the tip and dull behind it, and one more high up, dull,
  // far enough from it that the two never read as a pair of eyes.
  points.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const hot = points.slice(0, 1);
  const next = hot.length && points.find(([x, y]) => Math.abs(x - hot[0][0]) >= 4 && y < H - 6);
  if (next) hot.push(next);
  hot.forEach(([x, y, behind], i) => {
    set(buf, x, y, i ? pal.O : pal.o);
    if (behind && !i) set(buf, behind[0], behind[1], pal.O);
  });
  if (berries) {
    // Berries in clusters of two or three, on the canes and the tangle.
    let n = 0;
    for (let tries = 0; tries < 80 && n < 4; tries++) {
      const x = rng.int(3, W - 5), y = rng.int(2, H - 4);
      if (!mask[y * W + x] || !mask[(y + 1) * W + x + 1]) continue;
      set(buf, x, y, n % 2 ? pal.r : pal.x);
      set(buf, x + 1, y + 1, n % 2 ? pal.x : pal.R);
      if (n % 2 === 0) set(buf, x + 1, y, pal.r);
      n++;
    }
  }
  return buf;
}

// ---------------------------------------------------------------- rocks --

// A lump of obsidian: black glass broken into flat faces, each as the lump's round would be turned
// where the face lies, so the faces facing the top-left catch the light and the rest go black;
// the edges where a lit face meets the next shine as glass does. size as procgen.js genRock's.
function genObsidianRock(seed = 1, size = 1) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = Math.round(12 * size + 2), H = Math.round(9 * size + 2);
  const buf = makeBuf(W, H);
  const GLASS = [pal.k, pal.q, pal.p, pal.j];
  // The lump: a squat dome, a little lopsided, its foot on the bottom row.
  const cx = W / 2 + rng.range(-0.5, 0.5), cy = H - 1, rx = W / 2 - 0.4, ry = H - 1.2;
  const ph = rng() * 6;
  const inside = (x, y) => {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, a = Math.atan2(ny, nx);
    return nx * nx + ny * ny < (1 + Math.sin(a * 3 + ph) * 0.07) ** 2 && y < H;
  };
  const normal = (x, y) => {
    const nx = (x - cx) / rx, ny = (y - cy) / ry;
    return [nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))];
  };
  // The faces: seeded on a jittered grid, each lit as the dome is where it lies.
  const seeds = [];
  const cols = Math.max(2, Math.round(3.6 * size)), rows = Math.max(2, Math.round(3 * size));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = ((i + 0.5 + rng.range(-0.3, 0.3)) / cols) * W, y = ((j + 0.5 + rng.range(-0.3, 0.3)) / rows) * H;
      const [nx, ny, nz] = normal(x, y);
      seeds.push([x, y, (nx * LX + ny * LY + nz * LZ) * 0.62 + 0.12 + rng.range(-0.1, 0.1)]);
    }
  }
  const face = new Int8Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      let best = 0, bd = Infinity;
      seeds.forEach(([sx, sy], i) => {
        const d = (x + 0.5 - sx) ** 2 + ((y + 0.5 - sy) * 1.25) ** 2;
        if (d < bd) [bd, best] = [d, i];
      });
      face[y * W + x] = best;
      buf.d[y * W + x] = tone(GLASS, seeds[best][2] - 0.06);
    }
  }
  // Edges: where a face meets the one below or right of it, the lit one's edge shines.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const f = face[y * W + x];
      if (f < 0) continue;
      const r = x + 1 < W ? face[y * W + x + 1] : -1, d = y + 1 < H ? face[(y + 1) * W + x] : -1;
      const other = r >= 0 && r !== f ? r : d >= 0 && d !== f ? d : -1;
      if (other < 0) continue;
      const hi = Math.max(seeds[f][2], seeds[other][2]);
      if (seeds[f][2] >= seeds[other][2] && hi > 0.5) set(buf, x, y, hi > 0.66 ? pal.j : pal.p);
      else if (seeds[f][2] < 0.45) set(buf, x, y, pal.k);
    }
  }
  // A glint on the brightest face.
  let gi = -1, gl = 0;
  for (let i = 0; i < W * H; i++) if (face[i] >= 0 && seeds[face[i]][2] > gl) [gl, gi] = [seeds[face[i]][2], i];
  if (gi >= 0 && size >= 1) buf.d[gi] = pal.G;
  return buf;
}

// Brimstone: dark stone crusted with sulphur where the fumes settle on its tops, the crust
// grown into little crystals. crust: how much of it is crusted, 0..1.
function genBrimstone(seed = 1, size = 1, crust = 0.5) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = Math.round(12 * size + 2), H = Math.round(9 * size + 2);
  const buf = makeBuf(W, H);
  // A heap: one big stone behind, smaller ones in front of it to either side.
  const blobs = [];
  const big = 4.4 * size;
  blobs.push({ x: W / 2 + rng.range(-1, 1) * size, y: H - big * 0.95, rx: big, ry: big * 0.82, lobes: 3, phase: rng() * 6 });
  for (const s of size > 1.2 ? [-1, 1] : [1]) {
    const r = rng.range(2.6, 3.2) * size;
    blobs.push({ x: W / 2 + s * rng.range(2.6, 3.4) * size, y: H - r * 0.78 - 0.4, rx: r, ry: r * 0.76, lobes: 3, phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  paintBlobs(buf, blobs, [pal.k, pal.h, pal.a, pal.A], rng, { wobble: 0.08, dither: 0.22, separator: pal.k, lift: -0.06 });
  // The crust: over the top of every stone in the heap (to the dark seam where a stone in front
  // meets the one behind), thick in drifts and thin between, lit on the upper left.
  const SULPHUR = [pal.D, pal.C, pal.Y, pal.T];
  const top = (x, y) => !get(buf, x, y) || get(buf, x, y) === pal.k;
  const crusted = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (top(x, y)) continue;
      let depth = 0;
      while (depth < 5 && !top(x, y - depth - 1)) depth++;
      const thick = crust * 3.4 * (0.5 + 0.5 * Math.sin(x * 0.85 + seed * 1.7));
      if (depth > thick) continue;
      crusted.push([x, y, 1.05 - (depth / (thick + 1)) * 0.75 - (x / W) * 0.3 + bayer(x, y) * 0.22]);
    }
  }
  for (const [x, y, lum] of crusted) set(buf, x, y, tone(SULPHUR, lum));
  // A few crystals standing out of the crust, a pixel high.
  for (let i = 0; i < Math.round(1 + crust * 3); i++) {
    const x = rng.int(2, W - 3);
    let y = 0;
    while (y < H && !get(buf, x, y)) y++;
    if (y >= H - 2 || ![pal.Y, pal.T].includes(get(buf, x, y))) continue;
    set(buf, x, y - 1, rng() < 0.5 ? pal.T : pal.Y);
  }
  return buf;
}

// ---------------------------------------------------------------- small props --

// A heap of bones on the ash: a skull on top, a thigh bone across in front, ribs behind.
const BONES = [
  '.......zzz..',
  '......zzzzZ.',
  '..zz..zkzkZ.',
  '.z..z.ZzZZA.',
  'zz.zzzzzzzzZ',
  'ZZzZZZZZZZZA',
  '.AAaAaAAaAA.',
];

// A vent in the brimstone: a squat chimney of crusted rock, sulphur running down it from the lip,
// the fire in its mouth and a jet of flame leaping out (three frames, for a light's anim).
const VENT_BASE = [
  '....TYffyCD...',
  '...TCoyyoCD...',
  '..AaCDRRDCah..',
  '..AaaDCCDaah..',
  '.AaaaaDaaaahh.',
  'hAaaaaaaaahhhh',
  '.hhhhhhhhhhhh.',
];
const ventFrame = (flame) => [...flame, ...VENT_BASE];
const VENT = [
  ventFrame([
    '......o.......',
    '......oy......',
    '.....oyo......',
    '.....yfy......',
    '.....yffo.....',
  ]),
  ventFrame([
    '.......o......',
    '...o..yo......',
    '......yfo.....',
    '.....oyfy.....',
    '.....yffy.....',
  ]),
  ventFrame([
    '.....o........',
    '.....oyo...o..',
    '......yfo.....',
    '.....yffy.....',
    '....oyffo.....',
  ]),
];

// The crypt by the road, as a gate into hell: walls of black stone, reddened where the light
// falls on them and orange where the fire below does, the same 26x29 as props.js crypt
// (forest.js CRYPT_BOX goes by it). Open, its stairs burn up out of the dark, the deeper the
// hotter, and the sigil over the door burns with them (o and y glow, def.emissive); sealed, a
// door of black iron shuts it, banded, with a seal of blood on it, and the sigil is cold.
const gateTop = (sigil) => [
  '...........kkkk...........',
  '.........kkRbbRkk.........',
  '.......kkRbbmmbbRkk.......',
  `.....kkRbbmm${sigil[0]}mmbbRkk.....`,
  `...kkRbbmmmm${sigil[1]}mmmmbbRkk...`,
  '.kkRbbmmmmmmmmmmmmmmbbRkk.',
  'kRRbRRRRRRRRRRRRRRRRRRbRRk',
  'khhhhhhhhhhhhhhhhhhhhhhhhk',
];
const GATE_FOOT = [
  'kRRRRRRRRRRRRRRRRRRRRRRRRk',
  'kbmmmmmmmmmmmmmmmmmmmmmmbk',
  'khhhhhhhhhhhhhhhhhhhhhhhhk',
  '.kkkkkkkkkkkkkkkkkkkkkkkk.',
];
const CRYPT_HELL = [
  [
    ...gateTop(['yo', 'oO']),
    '.kbmhkmmmmmmmmmmmmmmkbmhk.',
    '.kbmhkmmmmmkkkkmmmmmkbmhk.',
    '.kbmhkmmmmkhhhhkmmmmkbmhk.',
    '.kbmhkmmmkhhhhhhkmmmkbmhk.',
    '.kbmhkmmkhhhhhhhhkmmkbmhk.',
    '.kbmhkmmkhhhhhhhhkmmkbmhk.',
    '.kbmhkhhkhhhhhhhhkhhkbmhk.',
    '.kbmhkmmkhhhhhhhhkmmkbmhk.',
    '.kbmhkmmkhhhhhhhhkmmkbmhk.',
    '.kbmhkmmkmmmmmmmmkmmkbmhk.',
    '.kbmhkhhkmmmmmmmmkhhkbmhk.',
    '.kbmhkmmkRRRRRRRRkmmkbmhk.',
    '.kbmhkmmkRRRRRRRRkmmkbmhk.',
    '.kbOhkmmkOOOOOOOOkmmkbmhk.',
    '.kOOhkmmkyyyyyyyykmmkbOhk.',
    '.kOOhkmOkOOOOOOOOkOmkOOhk.',
    'kRRRRRRRkooooooookRRRRRRRk',
    ...GATE_FOOT,
  ],
  [
    ...gateTop(['RR', 'Rb']),
    '.kbmhkmmmmmmmmmmmmmmkbmhk.',
    '.kbmhkmmmmmkkkkmmmmmkbmhk.',
    '.kbmhkmmmmkVVVVkmmmmkbmhk.',
    '.kbmhkmmmkVWWWWVkmmmkbmhk.',
    '.kbmhkmmkVWWWWWWVkmmkbmhk.',
    '.kbmhkmmkVQQQQQQVkmmkbmhk.',
    '.kbmhkhhkVWWWWWWVkhhkbmhk.',
    '.kbmhkmmkVWWRRWWVkmmkbmhk.',
    '.kbmhkmmkVWRrRRWVkmmkbmhk.',
    '.kbmhkmmkVWRRRRWVkmmkbmhk.',
    '.kbmhkhhkVWWRRWWVkhhkbmhk.',
    '.kbmhkmmkVWWWWWWVkmmkbmhk.',
    '.kbmhkmmkVQQQQQQVkmmkbmhk.',
    '.kbmhkmmkVWWWWWWVkmmkbmhk.',
    '.kbmhkmmkVWWWWWWVkmmkbmhk.',
    '.kbmhkmmkVVVVVVVVkmmkbmhk.',
    'kRRRRRRRkVVVVVVVVkRRRRRRRk',
    ...GATE_FOOT,
  ],
];

// ---------------------------------------------------------------- the defs --

const EMBERS = 'ROoyf';

export const FLORA_HELL = {
  hell_tree1: { emissive: EMBERS, gen: () => [genCharredTree(4, { hollow: true, cracks: 1 })] },
  hell_tree2: { emissive: EMBERS, gen: () => [genCharredTree(29, { lean: 2.5, cracks: 2, broken: 0.3, limbs: [[-2.5, 9, 3.4], [-1.9, 11, 3.8], [-1.35, 10, 3.6], [-0.85, 11, 3.8], [-0.35, 7, 3]] })] },
  hell_spire1: { emissive: EMBERS, gen: () => [genObsidianSpire(6)] },
  hell_spire2: { emissive: EMBERS, gen: () => [genBasaltSpire(13)] },
  hell_thorn1: { emissive: EMBERS, gen: () => [genThornTree(7, 'claw')] },
  hell_thorn2: { emissive: EMBERS, gen: () => [genThornTree(41, 'ribs')] },
  hell_thornbush1: { emissive: EMBERS, gen: () => [genThornBush(2)] },
  // Its dark berries (R) stay unlit: only the ripe ones (x) glow, and its smouldering points.
  hell_thornbush2: { emissive: 'xOoyf', gen: () => [genThornBush(9, true)] },
  hell_rock1: { gen: () => [genObsidianRock(4, 1)] },
  hell_rock2: { gen: () => [genBrimstone(8, 1.6, 0.55)] },
  hell_rock3: { gen: () => [genBrimstone(15, 0.7, 0.9)] },
  hell_bones: { frames: [BONES] },
  hell_vent: { emissive: EMBERS, frames: VENT },
  crypt_hell: { emissive: 'oy', frames: CRYPT_HELL },
};
