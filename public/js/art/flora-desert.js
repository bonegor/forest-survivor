// The Sunscorch's flora: the desert's trees, scrub, stones and small things, standing in the
// Darkwood's slots (darkwood.js layoutChunk) on the first of the five Survival maps.
//
// The owner's (28 October 2026): "One would be the desert map. [...] And I want you to make it
// so that the first one where we start is the desert map. From there on, we progress to the
// frozen map." So this is the first wood a new player walks into: a night desert under a cool
// moon, its sand still warm, and every name below stands where the Darkwood keeps one of its own.
//
//   sand_cactus1/2   saguaros, in the oaks' slots: the desert's common tree
//   sand_palm1       a date palm, in the oaks' slots along the roads (the old caravan wells)
//   sand_joshua1/2   joshua trees, in the pines' slots: the tall spiky stands
//   sand_acacia1/2   bleached dead acacias, in the dead trees' slots (the "cursed" pans)
//   sand_scrub1/2    dry scrub (sagebrush, and a brittlebush in yellow flower), the bushes'
//   sand_rock1/2/3   sandstone, the size of rock1/2/3
//   sand_bones       a steer's skull and ribs, bleached, in the stump's slot
//   sand_agave       a small blue agave, the redcaps' place at the trees' feet
//   sand_bloom       a little cactus whose white flowers open at night and glow, the glowing
//                    mushrooms' place (emissive 'zXY')
//   sand_cairn       a cairn of piled stones over a grave, the gravestones' place
//   crypt_desert     the crypt (props.js) as a sandstone tomb: the same 26x29 frames, open and
//                    sealed, its stairs still glowing in 'j' (no look's door since 28 October 2026,
//                    when the Sunscorch's crypts became caves, art/terrain.js crypt_cave: kept for
//                    a look that may want it again)
//
// Painted like procgen.js: pixel buffers in palette tones, lit from the top-left and dithered
// with the same Bayer matrix, so they sit beside the Darkwood's own at its level of detail. One
// family of colours: sun-dried greens (v E e and the ranger's olive 4 3 2 1) for what lives,
// the knight's khaki (J I H D C) for bark and old wood, bone (z T) for what the sun has
// bleached, and the warm sandstone ramp (m b B S t T) for the rocks and the tomb.

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
// A tone from a lightness 0..1: tones dark -> light.
const toneOf = (tones, lum) => tones[Math.max(0, Math.min(tones.length - 1, Math.floor(lum * tones.length)))];

// A limb: a polyline of [x, y, r] (r its half-width there) painted as a round tube lit from the
// top-left, each pixel shaded by its offset from the nearest point of the line (a straight
// upright limb is a lit cylinder, its ends round). opts.contrast stretches the shading about
// 0.6 (an upright cylinder's light falls off only on its right, so it wants more than a ball),
// opts.ribs grooves it along its length (a saguaro's pleats), opts.tex(x, y, s, t) adds to a
// pixel's lightness (s across the limb, t along it, 0..1), and limbs painted over one another
// with a shared opts.owner get a dark seam where the front one's edge crosses the one behind.
function tube(buf, pts, tones, opts = {}) {
  const own = opts.owner, id = opts.id ?? 0, sep = opts.separator ?? tones[0], k = opts.contrast ?? 1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y, r] of pts) {
    x0 = Math.min(x0, x - r);
    x1 = Math.max(x1, x + r);
    y0 = Math.min(y0, y - r);
    y1 = Math.max(y1, y + r);
  }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(buf.h - 1, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(buf.w - 1, Math.ceil(x1)); x++) {
      const px = x + 0.5, py = y + 0.5;
      let best = Infinity, dx = 0, dy = 0, r = 1, ux = 0, uy = -1, at = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay, ar] = pts[i], [bx, by, br] = pts[i + 1];
        const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
        let t = l2 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const rr = ar + (br - ar) * t, ex = px - (ax + vx * t), ey = py - (ay + vy * t);
        const q = Math.hypot(ex, ey) / rr;
        if (q < best) {
          const l = Math.sqrt(l2) || 1;
          best = q;
          dx = ex;
          dy = ey;
          r = rr;
          ux = vx / l;
          uy = vy / l;
          at = (i + t) / (pts.length - 1);
        }
      }
      if (best > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - best * best));
      let lum = ((dx / r) * LX + (dy / r) * LY + nz * LZ) * 0.5 + 0.5;
      if (opts.rim) lum -= opts.rim * Math.max(0, best - 0.7) / 0.3; // the edge turning away
      lum = 0.6 + (lum - 0.6) * k + (opts.lift || 0) + bayer(x, y) * (opts.dither ?? 0.2);
      const s = dx * -uy + dy * ux; // across the limb, + to its right going along it
      if (opts.ribs && Math.floor(s + 0.5 + (opts.ribPhase || 0)) & 1) lum -= opts.ribs;
      if (opts.tex) lum += opts.tex(x, y, s, at);
      const idx = y * buf.w + x;
      if (own && own[idx] >= 0 && own[idx] !== id && best > 1 - 1.1 / r) buf.d[idx] = sep;
      else buf.d[idx] = toneOf(tones, lum);
      if (own) own[idx] = id;
    }
  }
}

// A 1 px line, its colour from tone(t) along it (t 0..1; a falsy colour leaves a pixel be).
function line(buf, x0, y0, x1, y1, tone) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 1.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = tone(t);
    if (c) set(buf, Math.floor(x0 + (x1 - x0) * t), Math.floor(y0 + (y1 - y0) * t), c);
  }
}

// Sphere-shaded blobs back to front (procgen.js paintBlobs), each with its own tones if it
// gives them, a thin dark seam where a front blob overlaps one behind. A blob with `flat` is cut
// off level above that row, its top face (`face` rows deep) in its `top` tones.
function paintBlobs(buf, blobs, tones, rng, opts = {}) {
  const owner = new Int16Array(buf.w * buf.h).fill(-1);
  blobs.forEach((b, i) => {
    const ts = b.tones || tones, sep = opts.separator ?? ts[0];
    const x0 = Math.floor(b.x - b.rx - 1), x1 = Math.ceil(b.x + b.rx + 1);
    const y0 = Math.floor(b.y - b.ry - 1), y1 = Math.ceil(b.y + b.ry + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) continue;
        if (b.flat != null && y < b.flat) continue;
        const nx = (x + 0.5 - b.x) / b.rx, ny = (y + 0.5 - b.y) / b.ry;
        const ang = Math.atan2(ny, nx);
        const wob = opts.wobble ? 1 + Math.sin(ang * b.lobes + b.phase) * opts.wobble : 1;
        const d2 = nx * nx + ny * ny;
        if (d2 > wob * wob) continue;
        const idx = y * buf.w + x;
        const nz = Math.sqrt(Math.max(0, 1 - d2));
        let lum = (nx * LX + ny * LY + nz * LZ) * 0.5 + 0.5 + (opts.lift || 0);
        lum += bayer(x, y) * (opts.dither ?? 0.28);
        if (opts.speckle && rng() < opts.speckle) lum += (rng() - 0.5) * 0.5;
        const edge = Math.sqrt(d2) > wob - 1.2 / Math.min(b.rx, b.ry);
        const face = b.flat != null && y < b.flat + (b.face ?? 1);
        if (!face && opts.tex) lum += opts.tex(x, y, b);
        if (owner[idx] >= 0 && edge && ny > -0.2) buf.d[idx] = sep;
        else if (face) buf.d[idx] = toneOf(b.top, lum - 0.1 + (y - b.flat) * -0.3);
        else buf.d[idx] = toneOf(ts, lum);
        owner[idx] = i;
      }
    }
  });
}

// ---- Saguaros ------------------------------------------------------------------------------------
// A pleated column and its arms, each arm going out level from the trunk and turning up. arms:
// [{ side: -1 | 1, y: where it leaves the trunk, out: its column's distance from the trunk's
// axis, top: where it ends, r }]; crown: how many tips wear white flowers; fruit: [x, y] in red.
export function genSaguaro(seed = 1, o = {}) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = o.w ?? 24, H = o.h ?? 44;
  const buf = makeBuf(W, H);
  const owner = new Int16Array(W * H).fill(-1);
  const tones = o.tones ?? [pal.v, pal.E, pal.e, pal['1']];
  // Centred on a half pixel, so the trunk is 7 px across and the arms 5, a pleat on every other.
  const cx = o.cx ?? Math.floor(W / 2) + 0.5, r = o.r ?? 3.45, top = o.top ?? 2;
  const look = { ribs: o.ribs ?? 0.25, dither: 0, owner, contrast: o.contrast ?? 2, lift: o.lift ?? -0.05, rim: 0.12 };
  let id = 0;
  const tips = [[cx, top]];
  for (const a of o.arms || []) {
    const s = a.side, ra = a.r ?? 2.45, ax = cx + s * a.out, ya = a.y, bend = a.bend ?? 2.6;
    tube(buf, [
      [cx, ya, ra],
      [ax - s * bend, ya, ra],
      [ax - s * bend * 0.29, ya - bend * 0.29, ra],
      [ax, ya - bend, ra],
      [ax, a.top + ra, ra],
    ], tones, { ...look, id: ++id });
    tips.push([ax, a.top]);
  }
  tube(buf, [[cx, H + 4, r], [cx, top + r, r]], tones, { ...look, id: ++id });
  void rng;
  if (o.crown) {
    for (const [i, [tx, ty]] of tips.entries()) {
      if (i >= o.crown) break;
      const fx = Math.floor(tx - 0.5);
      set(buf, fx - 1, ty, pal.z);
      set(buf, fx, ty, pal.Y);
      set(buf, fx + 1, ty, pal.z);
      set(buf, fx, ty - 1, pal.z);
    }
  }
  if (o.fruit) for (const [x, y] of o.fruit) set(buf, x, y, pal.r);
  return buf;
}

// ---- Joshua trees --------------------------------------------------------------------------------
// A shaggy trunk forking into crooked limbs, each ending in a ball of dagger leaves over a short
// skirt of dead ones. limbs: polylines of [x, y, r] from the fork; the last point holds the leaves.
function rosette(buf, cx, cy, R, rng, pal) {
  const live = [pal['4'], pal['3'], pal['2'], pal['1']];
  const dead = [pal.J, pal.I, pal.H];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.3 + 0.4 * (i / 6)) + rng.range(-0.1, 0.1), L = R * rng.range(0.75, 1.05);
    line(buf, cx, cy + 1, cx + Math.cos(a) * L * 0.8, cy + 1 + Math.sin(a) * L, (t) => dead[Math.min(2, Math.floor(t * 2.2 + (Math.cos(a) < 0 ? 0.6 : 0)))]);
  }
  const spikes = [];
  for (let i = 0; i < 24; i++) spikes.push({ a: -Math.PI * 1.1 + Math.PI * 1.2 * (i / 23) + rng.range(-0.08, 0.08), L: R * rng.range(0.6, 1) });
  spikes.sort((p, q) => q.L - p.L);
  for (const { a, L } of spikes) {
    const ux = Math.cos(a), uy = Math.sin(a), face = -(ux * LX + uy * LY); // > 0 facing the light
    line(buf, cx, cy, cx + ux * L, cy + uy * L, (t) => toneOf(live, 0.18 + 0.32 * face + 0.5 * t - (L > R * 0.85 ? 0.1 : 0)));
  }
}

export function genJoshua(seed = 1, o = {}) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = o.w ?? 30, H = o.h ?? 46;
  const buf = makeBuf(W, H);
  const owner = new Int16Array(W * H).fill(-1);
  const bark = [pal.J, pal.I, pal.H, pal.D];
  // Shaggy: dead leaves hang in streaks down the bark.
  const streak = Array.from({ length: W }, () => (rng() < 0.45 ? -0.2 : 0.04));
  const look = { owner, dither: 0.2, contrast: 1.3, tex: (x, y) => streak[x] * ((y * 7 + x * 3) % 5 < 3 ? 1 : 0.3) };
  let id = 0;
  const cx = o.cx ?? W / 2, r = o.r ?? 2.4;
  for (const limb of o.limbs) tube(buf, limb, bark, { ...look, id: ++id });
  tube(buf, [[cx, H + 3, r], [cx, H - 3, r * 0.92], [cx + (o.lean ?? 0), o.fork, r * 0.8]], bark, { ...look, id: ++id });
  for (const limb of o.limbs) {
    const [x, y] = limb[limb.length - 1];
    rosette(buf, x, y, o.leaf ?? 3.9, rng, pal);
  }
  return buf;
}

// ---- The date palm -------------------------------------------------------------------------------
// A ringed trunk leaning a little, a crown of feathered fronds drooping out of it and two bunches
// of dates under them. A frond: [degrees (0 right, 90 up), length, droop in px at its tip, the
// longest leaflet]: its stalk, then a leaflet every pixel along it, swept toward the tip and
// hanging, long and short in turn so its lower edge is a comb.
function frond(buf, x0, y0, [deg, L, droop, wMax = 3], tones) {
  const a = (deg * Math.PI) / 180, ax = Math.cos(a), ay = -Math.sin(a);
  const lit = -(ax * LX + ay * LY) * 0.22; // fronds reaching up and left catch the light
  const at = (t) => [x0 + ax * L * t, y0 + ay * L * t + droop * t * t];
  const steps = Math.ceil(L * 4);
  let [qx, qy] = at(0), walked = 0, k = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, [x, y] = at(t);
    walked += Math.hypot(x - qx, y - qy);
    qx = x;
    qy = y;
    set(buf, Math.floor(x), Math.floor(y), toneOf(tones, 0.86 + lit - 0.3 * t));
    if (walked < k + 1) continue;
    k = Math.floor(walked);
    if (t < 0.16) continue; // the bare stalk out of the crown
    let tx = ax * L, ty = ay * L + 2 * droop * t;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    let nx = -ty, ny = tx;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    let dx = nx * 0.72 + tx * 0.7, dy = ny * 0.72 + ty * 0.7;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl;
    dy /= dl;
    const w = wMax * Math.pow(Math.sin(Math.PI * Math.min(1, (t - 0.12) / 0.9)), 0.7);
    const len = Math.max(1, Math.round(k & 1 ? w : w * 0.55));
    for (let j = 1; j <= len; j++) {
      const px = Math.floor(x + dx * j), py = Math.floor(y + dy * j);
      set(buf, px, py, toneOf(tones, 0.74 + lit - (0.48 * j) / len - 0.18 * t + bayer(px, py) * 0.16));
    }
  }
}

export function genPalm(seed = 1, o = {}) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = o.w ?? 38, H = o.h ?? 54;
  const buf = makeBuf(W, H);
  const owner = new Int16Array(W * H).fill(-1);
  const bark = [pal.J, pal.I, pal.H, pal.D];
  const leaves = o.leaves ?? [pal.v, pal.E, pal.e, pal.L];
  const base = o.base ?? W / 2 - 1.5, lean = o.lean ?? 2.5;
  const crx = base + lean, cry = o.crown ?? 14;
  // The trunk bows gently from its foot to the crown (a quadratic curve, upright at the foot),
  // swelling where it meets the sand.
  const trunk = [[base, H + 2, 3.3]];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, y0 = H - 1.5, y1 = cry + 3, cy = H * 0.5;
    trunk.push([base + lean * t * t, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1, 2.4 - 0.4 * t]);
  }
  // Old leaf bases ring the trunk in staggered scales.
  const scales = (x, y, s) => ((y + (s > 0 ? 1 : 0)) % 3 === 0 ? -0.26 : 0) + (rng() < 0.06 ? -0.15 : 0);
  tube(buf, trunk, bark, { owner, id: 1, dither: 0.14, contrast: 1.3, tex: scales });
  const fronds = o.fronds ?? [
    [98, 9, 1, 2], [60, 12, 3, 2.5], [126, 12, 3, 2.5],
    [22, 16, 7, 3], [158, 16, 7, 3], [-14, 14, 8, 3], [194, 14, 8, 3], [-48, 9, 5, 2.2], [228, 9, 5, 2.2],
  ];
  // The fronds reaching up stand behind, the drooping ones hang over them, and the dates hang
  // from the crown's heart between the two that droop lowest.
  const back = fronds.filter(([d]) => d > 40 && d < 140), front = fronds.filter(([d]) => !(d > 40 && d < 140));
  for (const f of back) frond(buf, crx, cry, f, leaves);
  for (const f of front) frond(buf, crx, cry, f, leaves);
  for (const [dx, dy] of o.dates ?? [[-2, 3], [2, 4]]) {
    const x = Math.round(crx + dx), y = Math.round(cry + dy);
    for (const [ddx, ddy, c] of [[0, -1, 'H'], [0, 0, 'b'], [-1, 1, 'd'], [0, 1, 'O'], [1, 1, 'b'], [-1, 2, 'O'], [0, 2, 'O'], [1, 2, 'm'], [0, 3, 'b']]) set(buf, x + ddx, y + ddy, pal[c]);
    set(buf, x - 1, y + 1, pal.y);
  }
  set(buf, Math.floor(crx), cry, pal.E);
  set(buf, Math.floor(crx) - 1, cry, pal.e);
  return buf;
}

// ---- Bleached dead acacias -----------------------------------------------------------------------
// The thorn tree's vase of limbs and its flat crown, long dead and bleached by the sun: limbs as
// tubes, then fans of bare twigs reaching out level along the top, white thorns here and there.
// twigs: [x, y, degrees, length].
export function genAcacia(seed = 1, o = {}) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = o.w ?? 36, H = o.h ?? 34;
  const buf = makeBuf(W, H);
  const owner = new Int16Array(W * H).fill(-1);
  const wood = o.wood ?? [pal.a, pal.A, pal.Z, pal.z];
  const grain = (x, y, s) => (Math.abs(s) < 0.6 && (x * 5 + y * 3) % 7 === 0 ? -0.16 : 0);
  let id = 0;
  for (const limb of o.limbs) tube(buf, limb, wood, { owner, id: ++id, dither: 0.16, contrast: 1.25, tex: grain, lift: o.lift ?? -0.2 });
  // A twig and the two it forks into, both turned level (out along the crown, not up).
  const lit = o.twigTones ?? [wood[1], wood[2]];
  const twig = (x, y, a, L, depth) => {
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
    line(buf, x, y, ex, ey, (t) => (t < 0.3 || Math.cos(a) > 0.2 ? lit[0] : lit[1]));
    if (rng() < (o.thorns ?? 0.12)) set(buf, Math.floor(ex), Math.floor(ey) - 1, pal.T);
    if (depth > 0) {
      const TAU = Math.PI * 2; // the way it is heading, laid flat:
      const level = Math.cos(a) < 0 ? Math.PI + TAU * Math.round((a - Math.PI) / TAU) : TAU * Math.round(a / TAU);
      for (let k = 0; k < 2; k++) {
        const t = rng.range(0.45, 0.85), na = a + (level - a) * (k ? 0.75 : 0.35) + rng.range(-0.12, 0.12) - (k ? 0 : 0.25 * Math.sign(Math.cos(a) || 1));
        twig(x + (ex - x) * t, y + (ey - y) * t, na, L * rng.range(0.45, 0.65), depth - 1);
      }
    }
  };
  for (const [x, y, deg, L] of o.twigs ?? []) twig(x, y, (deg * Math.PI) / 180, L, 1);
  return buf;
}

// ---- Scrub ---------------------------------------------------------------------------------------
// A low scraggly mound of small dusty leaves, bare twigs poking out of it; flowers: a brittlebush
// in bloom.
export function genScrub(seed = 1, o = {}) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = o.w ?? 18, H = o.h ?? 12;
  const buf = makeBuf(W, H);
  const tones = o.tones ?? [pal['4'], pal['3'], pal['2'], pal['1']];
  for (let i = 0; i < (o.twigs ?? 5); i++) {
    const x = rng.range(4, W - 4), a = -Math.PI / 2 + rng.range(-1.1, 1.1), L = rng.range(6, 9);
    line(buf, x, H - 2, x + Math.cos(a) * L, H - 2 + Math.sin(a) * L, (t) => (t > 0.6 ? pal.D : pal.H));
  }
  const blobs = [];
  const n = o.blobs ?? 4;
  for (let i = 0; i < n; i++) {
    const r = rng.range(3, 4.4);
    blobs.push({ x: 3.6 + i * ((W - 7) / (n - 1)) + rng.range(-1, 1), y: H - r - rng.range(0, 1.6), rx: r, ry: r * 0.8, lobes: rng.int(6, 9), phase: rng() * 6 });
  }
  blobs.sort((a, b) => a.y - b.y);
  paintBlobs(buf, blobs, tones, rng, { wobble: 0.2, speckle: 0.14, lift: -0.02, dither: 0.32 });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (get(buf, x, y) === tones[1] && rng() < (o.dry ?? 0.12)) set(buf, x, y, pal.H);
  // and a few dead ones poking out of the top
  for (let i = 0; i < (o.dead ?? 3); i++) {
    const x = rng.range(4, W - 5), a = -Math.PI / 2 + rng.range(-0.7, 0.7);
    let y = 0;
    while (y < H - 1 && !get(buf, Math.floor(x), y)) y++;
    line(buf, x, y + 1.5, x + Math.cos(a) * 3.2, y + 1.5 + Math.sin(a) * 3.2, (t) => (t > 0.3 ? pal.D : 0));
  }
  if (o.flowers) {
    for (let i = 0; i < o.flowers; i++) {
      const x = rng.int(2, W - 3), y = rng.int(1, H - 5);
      if (!get(buf, x, y)) continue;
      set(buf, x, y, pal.Y);
      if (rng() < 0.5) set(buf, x + 1, y, pal.y);
    }
  }
  return buf;
}

// ---- Sandstone -----------------------------------------------------------------------------------
// Wind-worn boulders, cut level on top where their beds lie flat, banded in their layers.
export function genSandstone(seed = 1, size = 1, o = {}) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = Math.round(12 * size + 2), H = Math.round(9 * size + 2);
  const buf = makeBuf(W, H);
  const side = o.side ?? [pal.m, pal.b, pal.B, pal.d, pal.t];
  const top = o.top ?? [pal.d, pal.t, pal.T];
  const blobs = [];
  const n = size > 1.2 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const r = rng.range(3.4, 4.6) * size * (i === 1 && n === 3 ? 1.12 : 1);
    const x = W / 2 + (i - (n - 1) / 2) * 3.4 * size, y = H - r * 0.85 - 0.5;
    blobs.push({ x, y, rx: r, ry: r * 0.88, lobes: 3, phase: rng() * 6, flat: Math.round(y - r * 0.88 * rng.range(0.62, 0.78)), face: size > 1.2 ? 2 : 1, tones: side, top });
  }
  blobs.sort((a, b) => a.y - b.y);
  // Its beds: a dark parting every third row, wavering a little, the rows between alternately
  // a shade lighter, and here and there a crack down through them.
  const wave = rng() * 6, crack = new Set([Math.floor(rng.range(2, W - 3)), Math.floor(rng.range(2, W - 3))]);
  const strata = (x, y) => {
    const row = y + Math.round(Math.sin(x * 0.5 + wave) * 0.7);
    return (row % 3 === 0 ? -(o.parting ?? 0.3) : row % 3 === 1 ? 0.06 : -0.02) + (crack.has(x) && (x + y) % 4 ? -0.2 : 0);
  };
  paintBlobs(buf, blobs, side, rng, { wobble: 0.05, dither: 0.14, separator: pal.m, tex: strata, lift: o.lift ?? 0.02 });
  return buf;
}

// ---- Agave ---------------------------------------------------------------------------------------
// A small blue agave: thick pointed leaves fanning up out of the sand, each lit on its upper
// edge, a dark spine at its tip; the upright ones first, the spreading ones over them.
export function genAgave(seed = 1, o = {}) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const W = o.w ?? 15, H = o.h ?? 9;
  const buf = makeBuf(W, H);
  const owner = new Int16Array(W * H).fill(-1);
  const tones = o.tones ?? [pal.v, pal.E, pal.e, pal.Z];
  const cx = W / 2, by = H - 0.6;
  // [degrees, length, how far it bends outward by its tip (degrees), half-width at its foot]
  const leaves = o.leaves ?? [[90, 6.8, 0, 1.9], [54, 7, 20, 1.95], [126, 7, -20, 1.95], [16, 6.6, 12, 1.9], [164, 6.6, -12, 1.9]];
  leaves.forEach(([deg, L, bend, w], i) => {
    const pts = [[cx, by, w]];
    let x = cx, y = by;
    for (let k = 1; k <= 4; k++) {
      const a = ((deg - bend * (k / 4) ** 2 + rng.range(-2, 2)) * Math.PI) / 180;
      x += (Math.cos(a) * L) / 4;
      y -= (Math.sin(a) * L) / 4;
      pts.push([x, y, w * (1 - k / 4) ** 0.85 + 0.42]);
    }
    tube(buf, pts, tones, { owner, id: i, contrast: 1.5, dither: 0.1, rim: 0.12, lift: o.lift ?? 0.02 });
    // the dark spine at its tip
    const [tx, ty] = pts[4], [qx, qy] = pts[3];
    if (o.spines !== false) set(buf, Math.floor(tx - (tx - qx) * 0.15), Math.floor(ty - (ty - qy) * 0.15), pal.H);
  });
  return buf;
}

// ---- Small things, drawn by hand -----------------------------------------------------------------
// A steer's skull lying in the sand, its long horns gone the colour of old leather, and the ribs
// it left behind.
const BONES = [
  '..........H.........H',
  '.T..T....DH........HD',
  'zT.zT.zT.CDCD....DCDC',
  'z..z..z.....zzzzzT...',
  'z..z..z.....hzzzTh...',
  '.z..z..z.....zzzT....',
  'zZzzZzzZz....zzhT....',
  '..............zTD....',
];

// A night-blooming cereus: two little ribbed cacti, the taller one's white flower open wide
// over it, the smaller one's just opening; in the second frame the light in them shifts
// (its heart and petals trade places), a slow shimmer if they are played in turn.
const BLOOM = [
  [
    '.z.z.z......',
    'zzzYzzz.....',
    '.zzXzz......',
    '..1eEv...z..',
    '.1eeEv..zYz.',
    '.1e1Ev...X..',
    '.1eeEv..1eE.',
    '.1e1Ev.1eeEv',
    '..eEv..1e1Ev',
  ],
  [
    '.z.z.z......',
    'zzXzXzz.....',
    '.zzYzz......',
    '..1eEv...z..',
    '.1eeEv..zXz.',
    '.1e1Ev...Y..',
    '.1eeEv..1eE.',
    '.1e1Ev.1eeEv',
    '..eEv..1e1Ev',
  ],
];

// ---- The cairn -----------------------------------------------------------------------------------
// A cairn over a grave in the pans: rounded stones piled into a cone, sandstone and grey ones
// mixed, the lower ones in front with a dark seam where each sits on the one behind.
export function genCairn(seed = 1) {
  const pal = packedPalette();
  const rng = mulberry32(seed);
  const buf = makeBuf(11, 14);
  const sand = [pal.m, pal.b, pal.B, pal.d, pal.t], grey = [pal.h, pal.a, pal.A, pal.Z];
  // [x, y, rx, ry, sandstone?], the top stone first
  const stones = [
    [5.6, 1.7, 1.5, 1.4, 1],
    [5.1, 4.2, 2.0, 1.4, 0],
    [3.8, 6.8, 1.9, 1.5, 1], [7.1, 7.0, 1.8, 1.4, 0],
    [2.6, 9.6, 2.1, 1.5, 0], [6.0, 9.8, 2.1, 1.6, 1], [9.0, 10.1, 1.6, 1.4, 1],
    [2.1, 12.4, 2.0, 1.5, 1], [5.6, 12.5, 2.3, 1.5, 0], [8.9, 12.4, 1.9, 1.5, 0],
  ].map(([x, y, rx, ry, s]) => ({ x, y, rx, ry, lobes: 4, phase: rng() * 6, tones: s ? sand : grey }));
  paintBlobs(buf, stones, sand, rng, { wobble: 0.06, dither: 0.2, lift: 0.04 });
  return buf;
}

// ---- The tomb ------------------------------------------------------------------------------------
// The crypt's own frames (props.js crypt) in sandstone: the pediment carries a winged sun, the
// cornice a faded painted band, and the sealed door an ankh. The stairs still glow 'j'.
const TOMB = [
  [
    '...........kkkk...........',
    '.........kkBTTBkk.........',
    '.......kkBTTSSTTBkk.......',
    '.....kkBTTSSYySSTTBkk.....',
    '...kkBTTSuUSyySUuSTTBkk...',
    '.kkBTTSSSSSSSSSSSSSSTTBkk.',
    'kBBdBBBBBBBBBBBBBBBBBBdBBk',
    'kbubdbubdbubddbubdbubdbubk',
    '.kTtBkttttttttttttttkTtBk.',
    '.kTtBktttttkkkktttttkTtBk.',
    '.kTtBkttttkhhhhkttttkTtBk.',
    '.kTtBktttkhhhhhhktttkTtBk.',
    '.kTtBkttkhhhhhhhhkttkTtBk.',
    '.kTtBkttkhhhhhhhhkttkTtBk.',
    '.kTtBkBBkhhhhhhhhkBBkTtBk.',
    '.kTtBkttkhhhhhhhhkttkTtBk.',
    '.kTtBkttkhhhhhhhhkttkTtBk.',
    '.kTtBkttkhhhhhhhhkttkTtBk.',
    '.kTtBkBBkhhhhhhhhkBBkTtBk.',
    '.kTtBkttkhhhhhhhhkttkTtBk.',
    '.kTtBkttkhhhhhhhhkttkTtBk.',
    '.kTdBkttkqqqqqqqqkttkTtBk.',
    '.kdBBkttkjjjjjjjjkttkTdBk.',
    '.kBBBktdkqqqqqqqqkdtkdBBk.',
    'kBBBBBBBkjjjjjjjjkBBBBBBBk',
    'kTTTTTTTTTTTTTTTTTTTTTTTTk',
    'kttdttttttttttttttttttdttk',
    'kBBBBBBBBBBBBBBBBBBBBBBBBk',
    '.kkkkkkkkkkkkkkkkkkkkkkkk.',
  ],
  // sealed: a slab over the door, the ankh on it
  { from: 0, rows: {
    10: '.kTtBkttttkBBBBkttttkTtBk.',
    11: '.kTtBktttkBbYybBktttkTtBk.',
    12: '.kTtBkttkBbYbbybBkttkTtBk.',
    13: '.kTtBkttkBbybbybBkttkTtBk.',
    14: '.kTtBkBBkBbbyybbBkBBkTtBk.',
    15: '.kTtBkttkBYyyyyyBkttkTtBk.',
    16: '.kTtBkttkBbbyybbBkttkTtBk.',
    17: '.kTtBkttkBbbyybbBkttkTtBk.',
    18: '.kTtBkBBkBbbyybbBkBBkTtBk.',
    19: '.kTtBkttkBbbyybbBkttkTtBk.',
    20: '.kTtBkttkBbbbbbbBkttkTtBk.',
    21: '.kTdBkttkBbbbbbbBkttkTtBk.',
    22: '.kdBBkttkBbbbbbbBkttkTdBk.',
    23: '.kBBBktdkBBBBBBBBkdtkdBBk.',
    24: 'kBBBBBBBkBBBBBBBBkBBBBBBBk',
  } },
];

export const FLORA_DESERT = {
  sand_cactus1: { gen: () => [genSaguaro(3, { w: 24, h: 42, arms: [{ side: -1, y: 24, out: 8, top: 12 }, { side: 1, y: 19, out: 8, top: 9 }] })] },
  sand_cactus2: { gen: () => [genSaguaro(11, { w: 26, h: 46, arms: [{ side: -1, y: 18, out: 8, top: 7 }, { side: -1, y: 32, out: 7, top: 25, r: 2.1 }, { side: 1, y: 25, out: 8, top: 12 }], crown: 1, fruit: [[21, 11]] })] },
  sand_palm1: { gen: () => [genPalm(5)] },
  sand_joshua1: { gen: () => [genJoshua(7, { w: 30, h: 46, fork: 31, limbs: [
    [[15, 33, 1.8], [11, 29, 1.6], [8, 27, 1.4], [6, 22, 1.3], [6, 18, 1.2]],
    [[15, 33, 1.8], [18, 28, 1.6], [21, 26, 1.4], [23, 21, 1.3]],
    [[15, 32, 1.6], [15, 25, 1.4], [13, 19, 1.3], [13, 13, 1.2]],
    [[15, 25, 1.2], [19, 19, 1.1], [20, 10, 1.0]],
  ] })] },
  sand_joshua2: { gen: () => [genJoshua(19, { w: 28, h: 48, fork: 30, lean: 0.5, limbs: [
    [[14.5, 31, 1.7], [11, 26, 1.5], [9, 20, 1.3], [9, 15, 1.2]],
    [[14.5, 31, 1.7], [17, 24, 1.5], [17, 17, 1.3], [19, 11, 1.2], [19, 7, 1.1]],
    [[17, 20, 1.2], [21, 17, 1.1], [23, 14, 1.0]],
  ] })] },
  sand_acacia1: { gen: () => [genAcacia(4, { w: 36, h: 34,
    limbs: [
      [[18, 37, 2.3], [18.5, 24, 1.9], [18.5, 21, 1.7]],
      [[18.5, 22, 1.6], [13, 15, 1.3], [8, 10, 1.0], [3, 8, 0.7]],
      [[18.5, 22, 1.5], [22, 15, 1.2], [27, 10, 1.0], [32, 8, 0.7]],
      [[18.5, 19, 1.2], [17, 12, 1.0], [14, 7, 0.75]],
      [[22, 15, 1.0], [23.5, 10, 0.8], [24, 6, 0.6]],
    ],
    twigs: [[4, 8, 195, 3], [7, 9, 215, 5], [11, 11, 235, 4], [14, 7, 200, 6], [15, 8, 250, 4], [24, 6, 300, 4], [27, 10, 320, 5], [30, 8, 340, 4], [32, 8, 355, 3]],
  })] },
  sand_acacia2: { gen: () => [genAcacia(23, { w: 32, h: 36,
    limbs: [
      [[13, 39, 2.4], [14, 28, 2.0], [16, 22, 1.8]],
      [[16, 23, 1.7], [11, 16, 1.4], [6, 12, 1.1], [2, 11, 0.8]],
      [[16, 23, 1.6], [21, 17, 1.4], [24, 14, 1.3]],
      [[15, 24, 1.1], [16, 15, 0.9], [15, 9, 0.7]],
    ],
    twigs: [[3, 11, 190, 3], [6, 12, 215, 6], [10, 15, 240, 4], [15, 9, 215, 6], [16, 10, 320, 5], [24, 14, 330, 3]],
  })] },
  sand_scrub1: { gen: () => [genScrub(2)] },
  sand_scrub2: { gen: () => [genScrub(9, { flowers: 6, twigs: 3, dry: 0.04 })] },
  sand_rock1: { gen: () => [genSandstone(4, 1)] },
  sand_rock2: { gen: () => [genSandstone(8, 1.6)] },
  sand_rock3: { gen: () => [genSandstone(15, 0.7)] },
  sand_bones: { frames: [BONES] },
  sand_agave: { gen: () => [genAgave(6)] },
  sand_bloom: { emissive: 'zXY', frames: BLOOM },
  sand_cairn: { gen: () => [genCairn(5)] },
  crypt_desert: { emissive: 'j', frames: TOMB },
};
