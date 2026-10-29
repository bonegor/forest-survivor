// The Sunscorch's ranges in dry stone (29 October 2026). The owner's words that day: "the mountain ridge
// looks kind of bad. It doesn't really look like a mountain. I provided you with example of what it could
// look like. I mean the edge of the walking surface at least, keep in mind that the top of the mountain
// ridge is not walkable so the provided pic is only applicable for the cliff part."
//
// So the ranges are drawn as the game's 3/4 view sees raised ground. Every point of the rock has a height.
// The top range: the band's own cliff (FACE0 px), then tiers stepping up and back behind it. The bottom
// range: high ground whose rim is the band's edge (its wall faces away from the viewer, so only its cap
// and a thin dark lip show there), a ledge, then a step up to its crest (only its rim seen, its riser
// facing away too), and past the crest stepping down and away in tiers. Their edges wander into bays
// and spurs and are broken into jags, each tier stands taller in one place and lower in the next,
// gullies cut flat-floored bays back through their walls here and there (their floors a cleft in
// shade), and outcrops and boulders sit on them (drawn over the march, paintDomes). Each column of the chunk is
// walked from the viewer (the south) into the range and every point drawn where its height lifts it
// (y - z), the nearer rock hiding what lies behind it. Where the ground steps up toward the viewer a wall
// shows, built of rounded stones in staggered courses as on the owner's picture (bigger higher up): each
// stone outlined dark, lit on its top left, shaded along its bottom and right, its rounded bottom
// dropping over the course below; the wall lightest at its top and darkest at its foot, a little lighter
// where it turns toward the light; turned more than 60 degrees from the viewer (a gully's sides), seen
// edge-on as long stripes along its edge, pale looking west, dark looking east. A cap of flat pale
// cobbles runs along every edge, the flat tops of its wall's top course (ragged higher up), and a rim of
// smaller cobbles along the bottom range's rim and its crest's; a warm shade lies on the sand at the band's wall, a
// darker one on every tier at a wall's foot, and loose stones gather there. The tops are varnished red
// rock strewn with rubble, always darker than any sand, a tone lighter higher up. The outcrops and
// boulders are rounded stones of a rosier rock, outlined, lit from the top left, each casting its shadow
// to its lower right. The cave mouths are arches of pale voussoirs on jambs of stone, cut into the band's
// wall round a dark recess, the wall's shade on the sand round the door's foot. The spires (corridor.js ridge) stand on the ledges (spireFoot). Past what the
// camera can ever show (VIS px from a face) a range is drawn flat, cheaply. (The ramps and the recipe: the
// style study of the owner's picture, 29 October 2026, and its judging the same day.)
//
// Pure: every pixel is a function of its world position (the faces as the lattice holds them, slow noise
// on the world's 8 px grid, outcrops and boulders laid one per cell of the world), so chunks painted apart
// meet without a seam. The Sunscorch only (its look.terrain.style): the Frostfell keeps paint.js's cliffs.
// Under the rock it paints whole, no ground is painted at all (groundRows, darkwood.js paintChunk's rows).

import { fbm, hash2 } from '../../engine/util.js';
import { TCHUNK } from './terrain.js';

const CH = TCHUNK, GX = CH / 8 + 2;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
// The top range: the band's cliff, the plateau over it, then a tier every TW px deeper (its edge
// wandering TA px either way, and jagged JA px): ZT the heights of tiers 0 to 3, the band's wall ZT[0] px
// high (the cave's door, 29 px, stands in it). (A tier's top is drawn its height above where it lies, so
// from the band the hero sees the wall and two tiers over it, the third's wall at the edge of the view.)
const TA = 30, TF0 = 46, TW = 38, ZT = [28, 52, 76, 104], JA = 7;
export const FACE0 = ZT[0];
// The bottom range (style.md 4.4, and its judging, 29 October 2026: stepping down from its rim at once,
// 25 to 45 px behind it, "the range reads as terraces falling away from the band, like a canyon edge,
// rather than high ground"): level with the band at its rim (tier 0, a ledge BF0 px of F deep), then UP
// a step to its crest (tier 1, ZB[1] px over the band: its riser faces north, away from the viewer, so
// only its rim shows, RIM2W px of cobbles), and past the crest down a step at every tier (ZB), the
// crest's south face the first wall seen, 70 px or so behind the rim (BF0 + BW of F). Its edges wander
// BA px either way.
const BA = 18, BF0 = 40, BW = 38, ZB = [0, 16, -8, -32, -56], RIM2W = 5;
// Each range's last tier (side 0 the top range, 1 the bottom).
const LAST = [ZT.length - 1, ZB.length - 1];
// What the camera can show (Game.update: it follows the hero, his feet 8 px under its middle, shaken
// up to 4.5 px; view.js sets its scale S = round(short side / 300) x 0.8, so on any landscape screen it
// is at most about 470 px tall, the worst a short side just under 750 px): never more than about 242
// px past a face the hero stands at (his feet 5 px out from it). Rows more than VIS px past a range's
// edge are drawn as its last tier's flat top, straight from its texture: cheap, and never in view.
const VIS = 250;
// Gullies: here and there (in one cell of GCELL px along a range in two) every tier's edge is cut back
// GD px of F along a stretch of 40 to 70 px of it, a flat-floored bay whose sides ease in (a plateau,
// smoothstep on how far in from its ends), so a cleft runs up through all its walls, its floor in shade
// (never the band's own wall or rim). The tiers' jags are smoothed out within one.
const GCELL = 128, GD = 17;
// Every tier but the band's own wall, the bottom range's rim and each range's last is lifted or sunk up
// to OFF px along its length (a slow noise of x), so its wall stands taller in one
// place and lower in the next.
const OFF = 7;
// The caps: RIM px of flat cobbles along the top of every wall, RIMB along the bottom range's rim at the
// band (its wall unseen, the cap and its dark lip all that shows there).
const RIM = 6, RIMB = 8;
// Outcrops (a cluster of rounded stones, one in a cell of 60 x 46 px of the world, or none) and
// boulders (one in 26 x 20, or none): [cell w, cell h, share, rx from, rx span, clear of a cap]. None
// deeper than DOME_D px into a range (past where the hero can see). Drawn over the march (paintDomes),
// each standing DOME_H px at most over its foot on the screen (its egg's top, sqrt(ry² + h²) and its
// wobble).
const DOMES = [
  [60, 46, 0.5, 9, 11, 6],
  [26, 20, 0.2, 3, 3.5, 4],
];
const DOME_D = [170, 220], DOME_H = 22;
// Past FLAT px into a range (its last tier everywhere) the rock is flat: there the march draws it
// straight from its texture.
const FLAT = [210, 250];
// How far the rock is lifted at most (the top range's last tier, never lifted itself; the bottom range's
// crest), and the bottom range sunk.
const UP_T = Math.max(ZT[LAST[0]], ZT[LAST[0] - 1] + OFF), UP_B = ZB[1] + OFF, DOWN = OFF - ZB[LAST[1]];
// The grid starts GOFF px above the chunk (the bottom range's sunk tiers are drawn below where they lie).
const GOFF = Math.ceil(DOWN / 8) * 8 + 8, GY = Math.ceil((GOFF + CH + UP_T) / 8) + 2;

// Scratch made once: the slow noise on the chunk's 8 px grid (WG the edges' wander, JG their jags, BG
// the tops' blotches), a column of it at a time (CF, CFX, CB: column), the rows of it wanted (ROW), the
// faces along the chunk (LO, HI, their slopes LD, HD and NLO, NHI), the tiers' lifts (OFT, OFB), the
// gullies (GU, their slope across GUX), TILE (hashes for the tops' scatter), all small and made with the
// module (const, so the march reads them without a check); DMASK, what the stones have drawn on the
// chunk (1 a stone's shadow, 2 a stone), EM a stone's egg over its box, ZC its tier's height along it
// (paintDomes).
const WG = new Float32Array(GX * GY), JG = new Float32Array(GX * GY), BG = new Float32Array(GX * GY);
const CF = new Float32Array(GY), CFX = new Float32Array(GY), CB = new Float32Array(GY), ROW = new Uint8Array(GY);
const LO = new Float32Array(CH), HI = new Float32Array(CH), LD = new Float32Array(CH), HD = new Float32Array(CH);
const NLO = new Float32Array(CH), NHI = new Float32Array(CH), OFT = new Int8Array(ZT.length * CH), OFB = new Int8Array(ZB.length * CH);
const GU = new Float32Array(2 * CH), GUX = new Float32Array(2 * CH);
const TILE = new Float32Array(128 * 128);
for (let i = 0; i < TILE.length; i++) TILE[i] = hash2(i & 127, i >> 7, 71);
const DMASK = new Uint8Array(CH * CH), ZC = new Int16Array(64), DL = [];
let EM = new Float32Array(64 * 64), GY0 = 0;
const CACHE = new WeakMap(); // topo -> the domes of the cells made so far (Map), each made once
// The point the march is at (set by zAt, read by the painters: nothing made per point): its height Z,
// tier T; and in M (whose fields hold their numbers in place) px of F past the tier's north edge (fl),
// F (ff), and a slope asked for (nx, ny).
// (NOTCH 1 on a gully's floor, cut back from the tier above, NM px of F in from the bay's wall round it;
// FLATP 1 on the flat beyond FLAT.)
let Z = 0, T = 0, NOTCH = 0, NM = 0, FLATP = 0;
const M = { fl: 0.5, ff: 0.5, nx: 0.5, ny: 0.5 };

const R = (c) => c & 255, G = (c) => (c >>> 8) & 255, B = (c) => (c >>> 16) & 255;
const tint = (c, r, g, b) => ((255 << 24) | (((B(c) * b) | 0) << 16) | (((G(c) * g) | 0) << 8) | ((R(c) * r) | 0)) | 0;

// A range's tier at depth d px into it, its edge moved w px: T, M.fl (px of F past the tier's north
// edge), M.ff.
function tierOf(d, w, side) {
  const F = d + w, F0 = side ? BF0 : TF0, W = side ? BW : TW, top = LAST[side];
  let t = 0, fl = d;
  if (F >= F0) {
    const q = (F - F0) / W, f = Math.floor(q);
    t = 1 + f;
    fl = (q - f) * W;
    if (t > top) {
      fl += (t - top) * W;
      t = top;
    }
  }
  T = t;
  M.fl = fl;
  M.ff = F;
}

// How deep a gully cuts a range's edges back at x (world), 0 to 1 (side 0 the top range, 1 the bottom):
// its cell's, if it has one, 20 to 35 px either side of its middle (always inside the cell), 1 across
// its floor and easing out over the last 45% of the way to its ends: a flat-floored bay, not a slit.
function gully(wx, side) {
  const q = Math.floor(wx / GCELL);
  if (hash2(q, side, 76) > 0.5) return 0;
  const hw = 20 + hash2(q, side, 78) * 15, m = q * GCELL + hw + 2 + hash2(q, side, 77) * (GCELL - 2 * hw - 4);
  const p = 1 - Math.abs(wx - m) / hw;
  if (p <= 0) return 0;
  const s = p >= 0.45 ? 1 : p / 0.45;
  return s * s * (3 - 2 * s);
}
// The edges moved by a gully at depth d (px of F): back into the range, away from the band (the bottom
// range's only past its crest's rim, so its rim tier always meets the band and the gully cuts back into
// the crest from the low ground beyond it).
const cut = (g, d, side) => (side ? GD * g * (d < 58 ? 0 : d > 90 ? 1 : (d - 58) / 32) : -GD * g);

// The outcrop (kind 0) or boulder (1) of cell (i, j) on a range (side 0 the top, 1 the bottom): its
// stones (none, one, or an outcrop's three), each an ellipse with a wobble round its rim, standing h px
// tall (its egg on the screen ht px tall over its foot's middle: paintDomes), on a tier and clear of the
// band and of that tier's capped edge across its width (so none hangs over a wall or a gully's side:
// drawn whole over the march, it would stand in the air).
const frontOf = (side) => (side ? (T < LAST[1] ? (T === 0 ? BF0 - M.ff : BW - M.fl) : 99) : T === 0 ? 99 : M.fl);
function domesOf(kind, i, j, side, topo, s) {
  const [cw, chh, share, r0, rs, clear] = DOMES[kind], k = 81 + side * 10 + kind * 20;
  if (hash2(i, j, k) > share) return null;
  const rx = r0 + hash2(i, j, k + 1) * rs, ry = Math.min(rx * (0.55 + hash2(i, j, k + 2) * 0.2), 13);
  const mx = rx * 1.2 + 4, my = ry * 1.2 + 4;
  const x = i * cw + mx + hash2(i, j, k + 3) * (cw - 2 * mx), y = j * chh + my + hash2(i, j, k + 4) * (chh - 2 * my);
  // Its tier at x (world) on its row, and how far its front edge lies (the south edge: in the top range
  // at M.fl 0, in the bottom range where the next tier down begins), or -1 too near the band or too deep.
  const at = (x) => {
    const d = side ? y - topo.hi(x) : topo.lo(x) - y;
    if (d < ry + (side ? 26 : 22) || d > DOME_D[side]) return -1;
    const g = gully(x, side), w = (side ? BA : TA) * (2 * fbm(x / 100, y / 64, s + 201, 3) - 1) + JA * (1 - g) * (2 * fbm(x / 20, y / 14, s + 251, 2) - 1);
    tierOf(d, w + cut(g, d, side), side);
    return frontOf(side);
  };
  const front = at(x), t = T, zs = side ? ZB : ZT;
  // (None on the bottom range's rim ledge: the crest in front of it, higher, would hide it.)
  if (front < ry * (kind ? 1 : 1.5) + clear || (side && t === 0)) return null;
  // Either side of it: on its tier and clear of the front edge there, or on a higher tier behind it (the
  // stone leaning on that tier's wall); never on a tier lower down (it would hang over the edge) nor on
  // a higher one in front (that would hide it).
  const reach = rx * (kind ? 0.9 : 1.1);
  for (const e of [-reach, reach]) {
    const f = at(x + e);
    if (f < 0 || (T === t ? f < ry * 0.6 + 2 : (side ? T > t : T < t) || zs[T] < zs[t])) return null;
  }
  // (Its wobble's phases p and q kept as their cosines and sines, cp sp cq sq.)
  const one = (x, y, rx, ry, n) => {
    const p = hash2(i, j, k + 6 + n) * 6.283, q = hash2(i, j, k + 9 + n) * 6.283, h = Math.round(2 + ry * 0.75);
    return { x, y, rx, ry, h, ht: Math.sqrt(ry * ry + h * h), t, side, big: !kind, cp: Math.cos(p), sp: Math.sin(p), cq: Math.cos(q), sq: Math.sin(q) };
  };
  if (kind) return [one(x, y, rx, ry, 0)];
  // An outcrop: its big stone, and one or two smaller leaning on it in front.
  const out = [one(x, y, rx, ry, 0)], hl = hash2(i, j, k + 12);
  if (hl < 0.8) out.push(one(x - rx * 0.62, y + ry * 0.45, rx * 0.58, ry * 0.62, 1));
  if (hl > 0.35) out.push(one(x + rx * 0.58, y + ry * 0.55, rx * 0.5, ry * 0.55, 2));
  return out;
}
function cachedDomes(kind, i, j, side, topo, s) {
  let C = CACHE.get(topo);
  if (!C || C.size > 60000) CACHE.set(topo, (C = new Map()));
  const key = ((i * 2048 + j + 1024) * 2 + side) * 2 + kind;
  let v = C.get(key);
  if (v === undefined) C.set(key, (v = domesOf(kind, i, j, side, topo, s)));
  return v;
}
// A stone's wobble round its rim at the angle whose cosine and sine are cs, sn (sin(3a + p) and sin(5a +
// q)): the rim moved at most 16% out or in, so a point 1.16 of its radii out or more is past it (RIM2).
const RIM2 = 1.16 * 1.16;
const wobble = (c, cs, sn) => {
  const s3 = 3 * sn - 4 * sn * sn * sn, c3 = 4 * cs * cs * cs - 3 * cs;
  const s5 = sn * (16 * sn * sn * sn * sn - 20 * sn * sn + 5), c5 = cs * (16 * cs * cs * cs * cs - 20 * cs * cs + 5);
  return 1 + 0.1 * (s3 * c.cp + c3 * c.sp) + 0.06 * (s5 * c.cq + c5 * c.sq);
};
// How far out toward a stone's rim on the ground (dx, dy) from its middle lies, 1 at it.
function domeE(c, dx, dy) {
  const ux = dx / c.rx, uy = dy / c.ry, r = Math.sqrt(ux * ux + uy * uy) || 1e-6;
  return r / wobble(c, ux / r, uy / r);
}
// How far out on its egg on the screen (paintDomes) the point (dx, dy) from its foot's middle lies, 1 at
// its rim: rx either side, ht up (its top), ry down (its south rim on the ground).
function eggE(c, dx, dy) {
  const X = dx / c.rx, Y = dy < 0 ? dy / c.ht : dy / c.ry, r = Math.sqrt(X * X + Y * Y) || 1e-6;
  return r / wobble(c, X / r, Y / r);
}
// Tier t's lift at column wx (world) of a range (side), as the chunk's OFT and OFB hold it: for a column
// past the chunk's edge.
function offAt(t, side, wx, s) {
  if (t < 1 || t >= LAST[side]) return 0;
  const xa = Math.floor(wx / 8) * 8, a = fbm(xa / 64, t * 7.3 + side * 50, s + 241, 2), b = fbm((xa + 8) / 64, t * 7.3 + side * 50, s + 241, 2);
  const o = Math.round(2.4 * OFF * (a + ((b - a) * (wx - xa)) / 8 - 0.5));
  return o > OFF ? OFF : o < -OFF ? -OFF : o;
}

// The outcrops and boulders over the chunk, drawn after the march (their judging, 29 October 2026:
// marched with the rock, each one's top was outlined round all its rim, so in the 3/4 view the rim of
// its south half ran across its middle in broken dark dashes while its top against the wall behind had
// none, and they "read as little skulls, smileys or smudges"). Each stone is drawn whole, as the view
// sees a rounded stone standing on its tier: seen from the south, a stone of radii rx, ry and h px tall
// shows as an egg rx px either side of its middle, ht = sqrt(ry² + h²) px up from its foot's middle (its
// top) and ry down (its south rim, on the ground), at its tier's height in each column (as the march
// draws the tier). It is shaded as a ball lit from the top left and in front: its top left B6 and B7,
// its body B4 and B5, its front and right B2 and B3 in shade. Its silhouette is outlined: soft (B1)
// where it faces the light, its top and its left; the darkest (B0) along its right and its foot, and
// wherever it stands in front of a stone already drawn (the crease where an outcrop's stones meet, as
// on the owner's picture's two-lobed boulders). Each casts its own shape on its tier to its lower
// right, the rock there two tones darker (style.md 4.3; in the ranges' own tones, as all the rock).
// Drawn the farther first, each pixel's colour is a function of where it lies in the world and of the
// stones round it, all of those that reach the chunk drawn in every chunk in one order: chunks painted
// apart meet without a seam. (No noise per pixel: a stone's egg once over its box.)
const LITE = [-0.6, -0.55, 0.45]; // toward the light: the left, the top, the viewer
// A pixel of the rock (c, signed) in a stone's shadow: the tops' two tones darker (never under T1), the
// walls' one (a shadow reaching a cap or a wall's foot).
function shaded(P, c) {
  const Tp = P.top, S = P.stone;
  for (let i = 1; i < Tp.length; i++) if (Tp[i] === c) return Tp[i > 2 ? i - 2 : 1];
  for (let i = 1; i < S.length; i++) if (S[i] === c) return S[i - 1];
  return c;
}
function paintDomes(px, x0, y0, P, list, s) {
  const Bd = P.boulder;
  DMASK.fill(0);
  // A stone's tier's height at column wx (world): ZC over its box.
  const base = (c, wx) => {
    const zs = c.side ? ZB : ZT, x = wx - x0;
    if (c.t < 1 || c.t >= LAST[c.side]) return zs[c.t];
    return zs[c.t] + (x >= 0 && x < CH ? (c.side ? OFB : OFT)[c.t * CH + x] : offAt(c.t, c.side, wx, s));
  };
  // Their shadows first, the rock under them darkened once.
  for (const c of list) {
    const sh = c.big ? 3 : 2;
    const xa = Math.max(x0, Math.floor(c.x - c.rx * 1.17) + sh), xb = Math.min(x0 + CH - 1, Math.ceil(c.x + c.rx * 1.17) + sh);
    for (let wx = xa; wx <= xb; wx++) {
      const cy = c.y + sh - base(c, wx), dx = wx - c.x - sh, vx = dx / c.rx;
      const ya = Math.max(y0, Math.floor(cy - c.ry * 1.17)), yb = Math.min(y0 + CH - 1, Math.ceil(cy + c.ry * 1.17));
      for (let sy = ya; sy <= yb; sy++) {
        const q = (sy - y0) * CH + wx - x0;
        if (DMASK[q]) continue;
        const dy = sy - cy, vy = dy / c.ry;
        if (vx * vx + vy * vy < RIM2 && domeE(c, dx, dy) < 1) {
          px[q] = shaded(P, px[q] | 0);
          DMASK[q] = 1;
        }
      }
    }
  }
  // Then the stones.
  for (const c of list) {
    const bx0 = Math.max(x0 - 1, Math.floor(c.x - c.rx * 1.17)), bx1 = Math.min(x0 + CH, Math.ceil(c.x + c.rx * 1.17));
    const bw = bx1 - bx0 + 1;
    if (bw < 1 || bw > ZC.length) continue;
    let zlo = 1e9, zhi = -1e9;
    for (let i = 0; i < bw; i++) {
      const z = (ZC[i] = base(c, bx0 + i));
      if (z < zlo) zlo = z;
      if (z > zhi) zhi = z;
    }
    const by0 = Math.max(y0 - 1, Math.floor(c.y - zhi - c.ht * 1.17)), by1 = Math.min(y0 + CH, Math.ceil(c.y - zlo + c.ry * 1.17));
    const bh = by1 - by0 + 1;
    if (bh < 1 || by1 < y0 || by0 >= y0 + CH || bx1 < x0 || bx0 >= x0 + CH) continue;
    if (bw * bh > EM.length) EM = new Float32Array(bw * bh * 2);
    for (let i = 0; i < bw; i++) {
      const dx = bx0 + i - c.x, X = dx / c.rx, cy = c.y - ZC[i];
      for (let j = 0; j < bh; j++) {
        const dy = by0 + j - cy, Y = dy < 0 ? dy / c.ht : dy / c.ry;
        EM[j * bw + i] = X * X + Y * Y < RIM2 ? eggE(c, dx, dy) : 9;
      }
    }
    for (let j = 0; j < bh; j++) {
      const sy = by0 + j;
      if (sy < y0 || sy >= y0 + CH) continue;
      for (let i = 0; i < bw; i++) {
        const wx = bx0 + i, m = j * bw + i, e = EM[m];
        if (e >= 1 || wx < x0 || wx >= x0 + CH) continue;
        const q = (sy - y0) * CH + wx - x0, dx = wx - c.x, dy = sy - c.y + ZC[i];
        // Where on it, as on a ball (xn, yn on the unit disc; nz toward the viewer).
        const X = dx / c.rx, Y = dy < 0 ? dy / c.ht : dy / c.ry, f = e / (Math.sqrt(X * X + Y * Y) || 1e-6), xn = X * f, yn = Y * f;
        let col;
        if ((i ? EM[m - 1] : 9) >= 1 || (i < bw - 1 ? EM[m + 1] : 9) >= 1 || (j ? EM[m - bw] : 9) >= 1 || (j < bh - 1 ? EM[m + bw] : 9) >= 1) {
          // Its silhouette: soft toward the light, else (and over a stone behind it) the darkest.
          col = DMASK[q] === 2 || xn * 0.6 + yn * 0.8 > -0.15 ? Bd[0] : Bd[1];
        } else {
          // (Its front, the lower part of the egg, a tone darker: the top turning down into it.)
          const nz = Math.sqrt(Math.max(0, 1 - xn * xn - yn * yn)), l = LITE[0] * xn + LITE[1] * yn + LITE[2] * nz - (yn > 0.3 ? 0.22 : 0);
          let t = l > 0.85 ? 7 : l > 0.6 ? 6 : l > 0.35 ? 5 : l > 0.1 ? 4 : l > -0.12 ? 3 : 2;
          // A pit here and there on the big ones' bodies.
          if (c.big && t > 3 && t < 7 && hash2(wx, sy, 74) < 0.035) t--;
          col = Bd[t];
        }
        px[q] = col;
        DMASK[q] = 2;
      }
    }
  }
}

// The column x's noise (the grid's rows, interpolated across to it): CF how far its range's edges are
// moved there (the wander and the jags, these smoothed out in a gully: the top range's above the
// column's face, the bottom's below) and CFX its slope across, on the rows the march reads (ROW 2); CB
// the tops' blotches, on those and the rows only drawn flat (ROW 1). CFT the most the top range's edges
// are moved toward the band in the column, CFB the bottom range's (so its march knows where to start).
let CFT = 0, CFB = 0;
function column(x) {
  const i = x >> 3, tx = (x & 7) * 0.125, lo = LO[x] + 8, jt = 2 * JA * (1 - GU[x]), jb = 2 * JA * (1 - GU[CH + x]);
  CFT = -99;
  CFB = 99;
  for (let j = 0; j < GY; j++) {
    if (!ROW[j]) continue;
    const c = j * GX + i;
    CB[j] = BG[c] + (BG[c + 1] - BG[c]) * tx;
    if (ROW[j] < 2) continue;
    const top = GY0 + j * 8 < lo, A = 2 * (top ? TA : BA), J = top ? jt : jb;
    const f = A * (WG[c] + (WG[c + 1] - WG[c]) * tx - 0.5) + J * (JG[c] + (JG[c + 1] - JG[c]) * tx - 0.5);
    CF[j] = f;
    CFX[j] = (A * (WG[c + 1] - WG[c]) + J * (JG[c + 1] - JG[c])) * 0.125;
    // (The first grid row past the face too, which the top range's last rows are read between.)
    if (GY0 + j * 8 < lo + 8) {
      if (f > CFT) CFT = f;
    }
    if (!top && f < CFB) CFB = f;
  }
}
// A column's value at grid row ly (px) of one of its noises.
const along = (a, ly) => {
  const j = ly >> 3;
  return a[j] + (a[j + 1] - a[j]) * (ly & 7) * 0.125;
};
// The slope of a range's F at row ly of the column x (its wander and jags, the face's own lean): M.nx,
// M.ny.
function slopeF(x, ly, side) {
  const j = ly >> 3;
  M.nx = (side ? -HD[x] : LD[x]) + (side ? GD : -GD) * GUX[side * CH + x] + CFX[j] + (CFX[j + 1] - CFX[j]) * (ly & 7) * 0.125;
  M.ny = (side ? 1 : -1) + (CF[j + 1] - CF[j]) * 0.125;
}

// The height at column x, ground row yg (world): Z, its tier. The top range's rows lie above LO[x], the
// bottom range's below HI[x].
function zAt(x, yg, side) {
  const ly = yg - GY0, d = side ? yg - HI[x] : LO[x] - yg, zs = side ? ZB : ZT;
  if (d >= FLAT[side]) {
    // Past every tier's edge: the range's last tier, flat.
    T = LAST[side];
    NOTCH = 0;
    FLATP = 1;
    M.fl = 99;
    Z = zs[T];
    return;
  }
  const f = along(CF, ly), c = cut(GU[side * CH + x], d, side);
  tierOf(d, f + c, side);
  NOTCH = 0;
  FLATP = 0;
  if (c !== 0) {
    // Whether the gully moved the tier: its floor, in shade; and how far in from the edge it moved (in
    // px of F: the bay's wall round it, along its back and its sides).
    const F = d + f, F0 = side ? BF0 : TF0, W = side ? BW : TW, t = F < F0 ? 0 : Math.min(LAST[side], 1 + Math.floor((F - F0) / W));
    if (t !== T) {
      NOTCH = 1;
      NM = Math.abs(F + c - F0 - Math.min(t, T) * W);
    }
  }
  let z = zs[T] + (side ? OFB : OFT)[T * CH + x];
  if (side) z = rimHold(z, d, T);
  Z = z;
}
// The bottom range never lifted over the band (its rim stays where the hero is stopped), nor its crest
// over its rim (RIMB px of cobbles and 4 of its ledge always show before it).
function rimHold(z, d, t) {
  const most = Math.floor(d) - (t ? RIMB + 4 : 4);
  return z > most ? (most < 0 ? 0 : most) : z;
}

// The stone of a course (cs its seed) at xs, its stones pw px long on average: SI, SA (its joint's
// column), SB (the next one's).
let SI = 0, SA = 0, SB = 0;
function stoneAt(xs, pw, cs) {
  let i = Math.floor(xs / pw), a = i * pw + ((hash2(i, cs, 62) * 5) | 0) - 2, b;
  if (xs < a) {
    b = a;
    i--;
    a = i * pw + ((hash2(i, cs, 62) * 5) | 0) - 2;
  } else {
    b = (i + 1) * pw + ((hash2(i + 1, cs, 62) * 5) | 0) - 2;
    if (xs >= b) {
      i++;
      a = b;
      b = (i + 1) * pw + ((hash2(i + 1, cs, 62) * 5) | 0) - 2;
    }
  }
  SI = i;
  SA = a;
  SB = b;
}

// A wall's run down column x, rows ys0 to ys1 - 1 (tp its top's row, so k = ys - tp - 1 px down it): S
// the stone tones (the outline, then dark to light: R0 to R5 of the style, with a half step between
// each of the darker ones), fh the wall's height, key the wall's own (so the walls of two tiers never
// line up), lit its turn toward the light (-1 to 2 tones), sz its stones' size (0 the band's wall; 1 and 2
// higher up, bigger and rougher). Each course is staggered on the one above, and each stone's rounded
// bottom drops 0 to 2 px (more higher up) over the course below, so no joint runs straight.
let AX = 0, AA = 0, AB = 0, AY = 0, AH = 0, AS = 0, UX = 0, UA = 0, UB = 0, UY = 0, UH = 0, US = 0, UD = 0;
// Each wall's courses' extra height (0 to 2 px over 7 + sz), by its key and course, hashed once: COURSE
// (CKEYS keys of CN courses; a course past them, never on a wall, hashed as it comes).
const CKEYS = 48, CN = 12, COURSE = new Uint8Array(CKEYS * CN);
for (let i = 0; i < COURSE.length; i++) COURSE[i] = (hash2(i % CN, (i / CN) | 0, 60) * 3) | 0;
const courseH = (ci, key) => (ci < CN && key < CKEYS ? COURSE[key * CN + ci] : (hash2(ci, key, 60) * 3) | 0);
// The stone of course ci of wall key under column wx (pw its stones' pitch): SX its column along the
// course (each course staggered by its own hash), SI, SA, SB as stoneAt, S63 its tone's hash and S64
// its drop's. The last asked of each course of each wall is kept (SLOT: SA, SB, SI; SLOTH the two
// hashes), so the columns along a stone ask for it once.
const SOFF = new Float64Array(CKEYS * CN), SLOT = new Int32Array(CKEYS * CN * 3), SLOTH = new Float64Array(CKEYS * CN * 2);
for (let i = 0; i < SOFF.length; i++) {
  SOFF[i] = hash2(i % CN, (i / CN) | 0, 61);
  SLOT[i * 3] = 1; // none yet (SA past SB)
}
let SX = 0, S63 = 0, S64 = 0;
function courseStone(ci, key, wx, pw) {
  const cs = ci * 37 + key * 101;
  if (ci >= CN || key >= CKEYS) {
    SX = wx + ((hash2(ci, key, 61) * pw) | 0);
    stoneAt(SX, pw, cs);
    S63 = hash2(SI, cs, 63);
    S64 = hash2(SI, cs, 64);
    return;
  }
  const n = key * CN + ci, o = n * 3;
  SX = wx + ((SOFF[n] * pw) | 0);
  if (SX >= SLOT[o] && SX < SLOT[o + 1]) {
    SA = SLOT[o];
    SB = SLOT[o + 1];
    SI = SLOT[o + 2];
  } else {
    stoneAt(SX, pw, cs);
    SLOT[o] = SA;
    SLOT[o + 1] = SB;
    SLOT[o + 2] = SI;
    SLOTH[n * 2] = hash2(SI, cs, 63);
    SLOTH[n * 2 + 1] = hash2(SI, cs, 64);
  }
  S63 = SLOTH[n * 2];
  S64 = SLOTH[n * 2 + 1];
}
function wallRun(px, x, wx, ys0, ys1, tp, fh, key, lit, sz, S) {
  const c7 = 7 + sz, pw = 12 + 2 * sz, dmax = sz ? 4 : 3;
  let k = ys0 - tp - 1, ci = 0, c0 = 0, ch = c7 + courseH(0, key), pch = 0, cur = -1;
  while (k >= c0 + ch) {
    c0 += ch;
    ci++;
    pch = ch;
    ch = c7 + courseH(ci, key);
  }
  for (let ys = ys0; ys < ys1; ys++, k++) {
    if (k >= c0 + ch) {
      c0 += ch;
      ci++;
      pch = ch;
      ch = c7 + courseH(ci, key);
    }
    if (cur !== ci) {
      // This course's stone at the column, and the one above it (whose bottom may drop over this one).
      cur = ci;
      courseStone(ci, key, wx, pw);
      AX = SX;
      AA = SA;
      AB = SB;
      AY = c0;
      AS = S63;
      AH = ch - 1 + ((S64 * dmax) | 0);
      UD = 0;
      if (ci > 0) {
        courseStone(ci - 1, key, wx, pw);
        UX = SX;
        UA = SA;
        UB = SB;
        UY = c0 - pch;
        US = S63;
        UD = UX - UA - 1 >= 0 ? (S64 * dmax) | 0 : 0;
        UH = pch - 1 + UD;
      }
    }
    // The pixel's stone: the one above where its bottom drops this far, else this course's.
    const up = k - c0 < UD, ix = up ? UX - UA - 1 : AX - AA - 1, w = up ? UB - UA - 1 : AB - AA - 1;
    const iy = up ? k - UY - 1 : k - AY - 1, h = up ? UH : AH, hs = up ? US : AS, q = ys * CH + x;
    // The joints: the outline of the stones above and to the left (a tone lighter in the top course).
    // Over the top course, where the cap's flat tops turn down into its stones' fronts, a 1 px contact
    // line of R2 (its judging, 29 October 2026: a dark slit there, ticked by the joints, "makes the cap
    // read as coping sitting on posts"; on the owner's picture the cap is the top course's own tops).
    if (ix < 0 || iy < 0) {
      px[q] = c0 === 0 && !up ? (iy < 0 ? S[4] : S[1]) : S[0];
      continue;
    }
    // Its corners rounded off (the bigger stones more): outside them, the joint (at the top course's
    // top, the contact line).
    const r = w > 11 ? 3 : 2, jx = w - 1 - ix, jy = h - 1 - iy;
    if (ix + iy < r || jx + iy < r || ix + jy < r || jx + jy < r + 1) {
      px[q] = c0 === 0 && !up && iy === 0 ? S[4] : S[0];
      continue;
    }
    // Its tone (R2, the half step under R3, ...): its own (three in ten a tone lighter, two darker), the
    // wall's turn toward the light, the top course a tone lighter, the foot's two darker.
    const top = up ? UY === 0 : AY === 0;
    const body = 4 + (hs < 0.2 ? -1 : hs > 0.7 ? 1 : 0) + lit + (top ? 1 : 0) - (k >= fh - 4 ? 2 : k >= fh - 10 ? 1 : 0);
    let t;
    if (jy === 0 || jx === 0) t = body - 1; // its shaded bottom and right
    else if (ix === 0) t = body - 1; // a soft outline on its lit left
    else if (iy === 0) t = jx < 2 ? body : body + 1;
    else if (iy <= 2 && ix + iy <= w >> 1) t = body + 2; // the light gathered at its top left
    else if (ix === 1 || iy === 1) t = body + 1;
    else if (jy === 1 || jx === 1) t = body - 1;
    else t = body;
    px[q] = S[t < 1 ? 1 : t > 7 ? 7 : t];
  }
}

// A wall seen edge-on, turned more than about 60 degrees from the viewer (style.md 4.1): its courses as
// 3 or 4 long stripes along its edge (each a band of rows k = ys - tp - 1 down it, so they run parallel
// to its top), a joint a tone darker between them, each stripe's long stones (11 px of the ground along
// the edge) a tone apart here and there. Looking west, into the light: S[5..7], its foot S[4]. Looking
// east: S[2..4], its foot and its top an outline of S[0].
function sideRun(px, x, yg, ys0, ys1, tp, fh, west, key, S) {
  const n = fh < 16 ? 3 : 4;
  for (let ys = ys0; ys < ys1; ys++) {
    const k = ys - tp - 1, s = ((k * n) / fh) | 0, sg = Math.floor((yg + s * 5) / 11);
    let t;
    if (k >= fh - 1) t = west ? 4 : 0;
    else if (!west && k === 0) t = 0;
    else if (s > 0 && ((k * n) / fh) - s < n / fh) t = west ? 5 : 1;
    else t = (west ? 7 : 4) - Math.round((s * 2) / (n - 1)) - (hash2(sg, s + key * 5, 79) < 0.3 ? 1 : 0);
    px[ys * CH + x] = S[t];
  }
}

// The caps and the rim, after their judging (29 October 2026): slabs 10 to 20 px long, laid as
// rectangles with dead-straight edges and a lit line along the whole of them, read "as a brick kerb or
// paving curb, not the reference's cobbled rim". Cp the caps' tones (the dark lip, the joints' R3, then
// R4 a half step down to R5), S the walls' stone.
//
// The cap along a wall's top (style.md 4.1): the flat tops of its top course's stones, each over its
// own stone (the course's joints, courseStone of the wall's key kw, its stones pw px apart), d px in
// from the wall's top and w deep. Each a pale top, R4 (a half tone up or down as its stone is), a glint
// of R5 at its back left; a joint of R2 between it and the next, its left a half tone darker and its
// right R3; its back edge R2 where it meets the rock behind, its corners rounded off (the back ones
// into the rock, the front ones into the wall's contact line under it, its front row turning down into
// the stone's front). Higher up
// the range (rough) each stone's top is of a depth of its own. -1 behind it: the rock shows.
function capTop(Cp, S, wx, d, w, kw, pw, rough) {
  courseStone(0, kw, wx, pw);
  const ix = SX - SA - 1, jx = SB - SA - 2 - ix, hs = S63;
  const e = d < 0 ? 0 : d | 0, back = w - (rough ? (S64 * 3) | 0 : S64 < 0.3 ? 1 : 0) - 1 - e;
  if (back < 0) return -1;
  if (ix < 0) return back === 0 ? -1 : S[4];
  if (back === 0) return ix < 2 || jx < 2 ? -1 : S[4];
  if (e === 0) return ix === 0 || jx === 0 ? S[4] : jx === 1 ? Cp[1] : Cp[3];
  if (ix === 0) return Cp[2];
  if (jx === 0) return Cp[1];
  if (back === 1 && ix <= 3) return Cp[5];
  return hs < 0.2 ? Cp[2] : hs > 0.7 ? Cp[4] : Cp[3];
}

// The bottom range's rim at the band (style.md 4.4): RIMB px of flat cobbles over its hidden wall, d px
// in from the sand (going down the screen). From the sand in: the dark lip (R1; where the rim turns to
// face east, out of the light, R0 and a px deeper), scalloped: each cobble bulges a px over it onto the
// sand (rimLip, the lip there drawn on the sand's last row: paintStone), its ends and its joint rounded
// back behind it; the cobbles' lit front edge (R5 at the west of each, R4 east); cobbles 3 to 7 px long
// (RP apart, and a joint), the joints a tone under their fill (R3), now and then slanted a px across
// the rim; here and there split in two along the rim (a broken joint, the back row's joints offset half
// a cobble); each cobble's right and back a half tone darker; behind them a contact line of R2 on the
// rock, a px nearer the band behind some (-1 past it: the rock).
const RP = 6;
const rimJ = (i, e, row) => i * RP + (row ? 3 : 0) + (hash2(i, row, 65) < 0.5 ? 1 : 0) + (row === 0 && e >= 3 ? (hash2(i, 0, 69) < 0.25 ? -1 : hash2(i, 0, 69) > 0.75 ? 1 : 0) : 0);
// The cobble of a row (0 the front, 1 the back) at xs, e px in: RI, RA (its joint's column), RB (the
// next one's).
let RI = 0, RA = 0, RB = 0;
function rimCobble(xs, e, row) {
  let i = Math.floor((xs - (row ? 3 : 0)) / RP);
  if (rimJ(i, e, row) > xs) i--;
  else if (rimJ(i + 1, e, row) <= xs) i++;
  RI = i;
  RA = rimJ(i, e, row);
  RB = rimJ(i + 1, e, row);
}
const rimSplit = (i) => hash2(i, 0, 66) < 0.55;
// Whether the rim's front cobble at column wx bulges over the lip there (its middle: not its joint nor
// the px either side of it).
function rimLip(wx) {
  const xs = wx + 273;
  rimCobble(xs, 0, 0);
  return xs - RA >= 2 && RB - 1 - xs >= 1;
}
// (w its depth, RIMB at the band; the crest's thinner rim, RIM2W, its cobbles in one row and laid on
// their own, xs from wx + ko.)
function rimPixel(Cp, S, wx, d, east, w, ko) {
  const e = d < 0 ? 0 : d | 0, xs = wx + ko, f0 = east ? 1 : 0, lip = east ? S[0] : Cp[0];
  if (e < f0) return lip;
  rimCobble(xs, e, 0);
  const iA = RI, split = w >= RIMB && rimSplit(iA);
  let i = iA, row = 0, a = RA, b = RB;
  if (split && e >= 4) {
    if (e === 4) return Cp[1];
    // The back row's cobble, up to the joints of the front row's whole cobbles either side.
    rimCobble(xs, e, 1);
    i = RI;
    row = 1;
    a = RA < a && !rimSplit(iA - 1) ? a : RA;
    b = RB > b && !rimSplit(iA + 1) ? b : RB;
  }
  const ex = xs - a, ex1 = b - 1 - xs, last = row || !split ? w - (hash2(i, row, 68) < 0.35 ? 3 : 2) : 3;
  if (e > last + 1) return -1;
  if (e === last + 1) return S[4];
  if (row === 0 && e === f0) return ex < 2 || ex1 === 0 ? lip : ex <= 3 ? Cp[5] : Cp[4];
  if (row === 0 && e === f0 + 1 && ex < 2) return ex ? Cp[5] : lip;
  if (ex === 0) return Cp[1];
  if (ex1 === 0 || e === last) return Cp[2];
  const h = hash2(i, row, 67);
  return h < 0.25 ? Cp[4] : h > 0.85 ? Cp[2] : Cp[3];
}

// The tone a tier's top stands at (of the tops' T1 to T5): the first ledges T3, higher up T4; the
// bottom range's crest, its high ground, T4, its rim ledge and the tiers stepping down past the crest
// T3.
const topBase = (side, T) => (side ? (T === 1 ? 4 : 3) : T < 2 ? 3 : 4);
// Bare rock on a tier's top: Tp the tops' tones (dark to light), base the tone the tier stands at, foot px from the next wall up (its shade deepening into the terrace's back, and the
// loose stones fallen there).
// (Its scatter read from TILE, 128 x 128 px of hashes laid over the world, not hashed afresh.)
function topPixel(Tp, ly, wx, yg, base, foot, bay) {
  if (foot < 2.2) return Tp[1];
  let t = base - (along(CB, ly) + bay * 0.14 < 0.44 ? 1 : 0) - (foot < 5 + bay * 2 ? 2 : foot < 13 + bay * 8 ? 1 : 0);
  // (Never under the ramp's T1: a tone past its end was no colour at all, a hole in the chunk the
  // night showed through, a lone near-black speck.)
  if (t < 1) t = 1;
  // Rubble: a pebble in two 8 px cells in five (in most by a wall's foot), 2 to 4 px, lit on its top
  // left, its shade below.
  const cx = wx >> 3, cy = yg >> 3, hp = TILE[(((cy + 61) & 127) << 7) | ((cx + 37) & 127)];
  if (hp < (foot < 14 ? 0.75 : 0.4)) {
    const dx = wx - (cx << 3) - 1 - (((hp * 977) | 0) % 5), dy = yg - (cy << 3) - 1 - (((hp * 7919) | 0) % 5);
    const pw = hp < 0.1 ? 4 : hp < 0.3 ? 3 : 2, ph = pw > 2 ? 3 : 2;
    if (dx >= 0 && dx < pw && dy >= 0 && dy < ph) {
      if (dy === ph - 1) return Tp[t - 2 < 1 ? 1 : t - 2];
      if (dy === 0) return dx === pw - 1 && pw > 2 ? Tp[t > 4 ? 5 : t + 1] : Tp[t + 2 > 5 ? 5 : t + 2];
      return dx === 0 ? Tp[t + 1 > 5 ? 5 : t + 1] : Tp[t > 5 ? 5 : t];
    }
  }
  const s = TILE[((yg & 127) << 7) | (wx & 127)];
  if (s < 0.04) t -= 1;
  else if (s > 0.975) t += 1;
  return Tp[t < 1 ? 1 : t > 5 ? 5 : t];
}

// The flat beyond FLAT (never in view: a tier's top is drawn its height above where it lies): its
// blotches and grain only, cheaply.
function flatPixel(Tp, ly, wx, yg, base, bay) {
  const s = TILE[((yg & 127) << 7) | (wx & 127)];
  const t = base - (along(CB, ly) + bay * 0.14 < 0.44 ? 1 : 0) - (s < 0.04 ? 1 : 0);
  return Tp[t < 1 ? 1 : t];
}

// A wall's turn toward the light, from the slope (gx, gy) of what rises behind it: -1 to 1 tone.
function litOf(gx, gy) {
  const l = (0.5 * gx + 0.72 * gy) / (Math.sqrt(gx * gx + gy * gy) || 1); // the wall faces -g
  return l > -0.4 ? 1 : l < -0.84 ? -1 : 0;
}

// What the march draws at a point it reaches: the wall rising to it (rows tp+1 to hor-1 of the
// column, none above `from`) and its top (row tp), from the point's height z and the one before it (pz,
// its tier pt; pt -1 the band's sand). side 0 the top range, 1 the bottom.
function drawPoint(px, x, wx, yg, tp, hor, from, z, pz, pt, side, P) {
  const ly = yg - GY0;
  if (tp + 1 < hor) {
    const fh = z - pz, y1 = tp + 1 < from ? from : tp + 1;
    // The wall stepping up here: the band's (the sand before it), a tier's. (F rises into the top
    // range, northward, and into the bottom range, southward: its walls face the other way.)
    let gx, gy, key;
    if (pt < 0) {
      gx = LD[x];
      gy = -1;
      key = 0;
    } else {
      slopeF(x, ly, side);
      gx = side ? -M.nx : M.nx;
      gy = side ? -M.ny : M.ny;
      key = 1 + side * 40 + T;
    }
    // Turned more than about 60 degrees from the viewer (a gully's sides, a sharp jag), it is seen
    // edge-on; else its stones.
    if (gx * gx > 3 * gy * gy) sideRun(px, x, yg, y1, hor, tp, fh, gx > 0, key, P.stone);
    else {
      const lit = litOf(gx, gy) + (side ? (T < 2 ? 1 : 0) : T >= 3 ? 1 : 0) - (key && GU[side * CH + x] > 0.4 ? 1 : 0);
      wallRun(px, x, wx, y1, hor, tp, fh, key, lit, key ? (T < 2 ? 1 : 2) : 0, P.stone);
    }
  }
  if (tp < from) return;
  const bay = BAYER[((yg & 3) << 2) | (wx & 3)];
  if (FLATP) {
    px[tp * CH + x] = flatPixel(P.top, ly, wx, yg, topBase(side, T), bay);
    return;
  }
  const base = topBase(side, T);
  let col;
  if (NOTCH) {
    // A gully's floor, a cleft in shade (style.md 2 and 4.3): its core the tops' T1 where it runs in
    // under the walls, toward its mouth shaded scree (two tones under the tier's own rock), so the bay
    // reads as a cut into the range through its sides (its walls seen edge-on, sideRun) and its floor,
    // neither a stain nor a hole. (dw: px to the bay's wall round it, across its sides by the gully's
    // slope across, gs.) No lit lip along its west side: its judging (29 October 2026) found it a
    // stray orange stick at a wall's foot, and the core of T0 lost in the shade there.
    const gs = GUX[side * CH + x], dw = NM / Math.sqrt(GD * GD * gs * gs + 1);
    col = dw < 4 + bay * 2 ? P.top[1] : topPixel(P.top, ly, wx, yg, base - 1, dw, bay);
  } else {
    // px to the tier's front edge (its south edge, over its wall, capped) and to its back (the north
    // edge: the foot of the next wall up, the bottom range's rim at the band, capped with its lip, or
    // its crest's rim over the hidden riser up from the rim ledge), reckoned only near one. (The rim
    // ledge's front meets that riser: hidden behind the crest, no cap.)
    // (In px only near a cap or a rim; the shade at a wall's foot is reckoned in F.)
    const nf = side ? (T < LAST[1] && T > 0 ? BW - M.fl : 99) : T === 0 ? 99 : M.fl;
    const nb = side ? (T === 0 ? 99 : M.fl) : T < LAST[0] ? (T === 0 ? TF0 - M.ff : TW - M.fl) : 99;
    let front = nf, back = nb;
    if (nf < 15 || (side && T === 1 && nb < 15)) {
      slopeF(x, ly, side);
      const g = Math.sqrt(M.nx * M.nx + M.ny * M.ny) || 1;
      front = nf / g;
      back = nb / g;
    }
    if (T === 0) {
      if (side) back = (yg - HI[x]) * NHI[x];
      else front = (LO[x] - yg) * NLO[x];
    }
    col = -1;
    if (front < RIM) {
      // The cap: the flat tops of the top course of the wall under it (its key and its stones' pitch as
      // drawPoint gives wallRun them).
      const kw = side || T ? 1 + side * 40 + T : 0;
      col = capTop(P.cap, P.stone, wx, front, RIM, kw, kw ? (T < 2 ? 14 : 16) : 12, kw !== 0);
    } else if (side && T === 0 && back < RIMB) col = rimPixel(P.cap, P.stone, wx, back, HD[x] > 0.7, RIMB, 273);
    else if (side && T === 1 && back < RIM2W) col = rimPixel(P.cap, P.stone, wx, back, false, RIM2W, 1009);
    // The shade at the foot of the next wall up (the tier's behind; none behind a rim).
    if (col === -1) col = topPixel(P.top, ly, wx, yg, base, side && T < 2 ? 99 : back, bay);
  }
  px[tp * CH + x] = col;
}

// The highest row of the screen ground row yg of column x can be drawn at, on its range (side): the row
// less the most it can be lifted there (its tier were its edges moved as far toward the band as they
// are anywhere in the column, CFT or CFB, a gully only ever moving them back, with that tier's lift
// there; on the bottom range, whose crest stands over its rim ledge, the highest of that tier's and the
// tiers past it). Ever higher up the screen the farther north the row, so the march's first row is
// found by halving. (The outcrops and boulders are drawn over the march: paintDomes.)
function reach(x, yg, side) {
  if (side) {
    const d = yg - HI[x], fm = d + CFB, tm = fm < BF0 ? 0 : Math.min(LAST[1], 1 + Math.floor((fm - BF0) / BW));
    if (d >= FLAT[1]) return yg - ZB[LAST[1]];
    let z = -1e9;
    for (let t = tm; t <= LAST[1]; t++) z = Math.max(z, ZB[t] + OFB[t * CH + x]);
    return yg - z;
  }
  const d = LO[x] - yg, fm = d + CFT, tm = fm < TF0 ? 0 : Math.min(LAST[0], 1 + Math.floor((fm - TF0) / TW));
  return yg - (d >= FLAT[0] ? ZT[LAST[0]] : ZT[tm] + OFT[tm * CH + x]);
}

// One column of a range: the top range's rows of rock (above LO[x]) walked from the band north, from
// the first that can be lifted into the chunk; the bottom range's (below HI[x]) from past the chunk's
// foot north to the band, and as far above the chunk as a sunk tier can be drawn into it.
function march(px, x, x0, y0, side, P) {
  const wx = x0 + x, Tp = P.top, LB = LAST[1], LT = LAST[0];
  let hor, yg, from, last, pz = 0, pt = -1;
  if (side) {
    from = Math.max(0, Math.floor(HI[x]) + 1 - y0);
    if (from >= CH) return;
    // More than VIS px past the band's edge, never in view: flat.
    hor = Math.min(CH, Math.ceil(HI[x] + VIS) - y0);
    if (hor < CH) flatRows(px, x, wx, y0, Math.max(hor, from), CH, ZB[LB], topBase(1, LB), Tp);
    if (hor <= from) return;
    yg = y0 + hor - 1 + UP_B;
    last = Math.max(Math.floor(HI[x]) + 1, y0 - DOWN);
    // Farther from the band the rock sinks: skip the rows that can't rise into what is drawn (the last
    // that can found by halving: see reach).
    const aim = y0 + hor;
    if (yg > last && reach(x, yg, 1) >= aim) {
      let a = last, b = yg;
      if (reach(x, a, 1) < aim) {
        while (b - a > 1) {
          const m = (a + b) >> 1;
          if (reach(x, m, 1) < aim) a = m;
          else b = m;
        }
      }
      yg = a;
    }
  } else {
    const lo = LO[x], end = Math.min(CH, Math.ceil(lo) - y0);
    if (end <= 0) return;
    // More than VIS px past the band's edge, never in view: flat.
    from = Math.max(0, Math.floor(lo - VIS) - y0);
    if (from > 0) flatRows(px, x, wx, y0, 0, Math.min(from, end), ZT[LT], topBase(0, LT), Tp);
    if (from >= end) return;
    hor = end;
    last = y0;
    yg = Math.min(Math.ceil(lo) - 1, y0 + end - 1 + UP_T);
    // Nearer the band the rock stands lower: skip the rows that can't reach the chunk (the last that
    // can found by halving).
    const aim = y0 + end - 1;
    if (yg > y0 && reach(x, yg, 0) > aim) {
      let a = y0, b = yg;
      if (reach(x, a, 0) <= aim) {
        while (b - a > 1) {
          const m = (a + b) >> 1;
          if (reach(x, m, 0) <= aim) a = m;
          else b = m;
        }
      }
      yg = a;
    }
    if (yg + 1 >= lo) yg = Math.ceil(lo) - 1;
  }
  if (side || yg + 1 < LO[x]) {
    zAt(x, yg + 1, side);
    pz = Z;
    pt = T;
  }
  if (side) {
    // The bottom range's flat beyond FLAT (marched first): a pixel a row, straight from its texture.
    for (; yg >= last && hor > from && yg - HI[x] >= FLAT[1]; yg--) {
      const tp = yg - ZB[LB] - y0;
      if (tp < hor) {
        if (tp >= from) px[tp * CH + x] = flatPixel(Tp, yg - GY0, wx, yg, topBase(1, LB), BAYER[((yg & 3) << 2) | (wx & 3)]);
        hor = tp;
      }
      pz = ZB[LB];
      pt = LB;
    }
  }
  for (; yg >= last && hor > from; yg--) {
    if (!side && pt === LT && pz === ZT[LT] && LO[x] - yg >= FLAT[0]) {
      // The top range's flat beyond FLAT: the rest of the column straight from its texture.
      flatRows(px, x, wx, y0, from, Math.min(hor, yg - ZT[LT] - y0 + 1), ZT[LT], topBase(0, LT), Tp);
      break;
    }
    zAt(x, yg, side);
    const z = Z, tp = yg - z - y0;
    if (tp < hor) {
      drawPoint(px, x, wx, yg, tp, hor, from, z, pz, pt, side, P);
      hor = tp;
    }
    pz = z;
    pt = T;
  }
}

// Rows ys0 to ys1 - 1 of the column, past what is ever in view: its range's last tier (z its height),
// drawn straight from its texture.
function flatRows(px, x, wx, y0, ys0, ys1, z, base, Tp) {
  for (let ys = ys0; ys < ys1; ys++) {
    const g = y0 + ys + z;
    px[ys * CH + x] = flatPixel(Tp, g - GY0, wx, g, base, BAYER[((g & 3) << 2) | (wx & 3)]);
  }
}

// A cave's mouth in the band's wall (its door's sprite covers the middle): a dark recess, ringed by an
// arch of pale voussoirs (the caps' cobbles, Cp[3..5], lit on the west, radial joints of S[1], a 1 px
// ring of S[0] round the outside and a soft one of Cp[1] inside), on jambs of the wall's stone going
// down to the sand either side, blocks 6 px tall (S[4], S[5] on the lit west one, each block's top a
// tone up, its joints S[1], its outer edge S[0]); the wall's courses round it; and the wall's shade on
// the sand round the door's foot.
function paintCave(P, cv, x0, y0, px) {
  const S = P.stone, Cp = P.cap, foot = cv.y - 16, spring = foot - 7, rin = 15, rout = 20;
  for (let wy = spring - rout; wy < foot; wy++) {
    const y = wy - y0;
    if (y < 0 || y >= CH) continue;
    for (let wx = cv.x - rout; wx <= cv.x + rout; wx++) {
      const x = wx - x0;
      if (x < 0 || x >= CH) continue;
      const dx = wx - cv.x + 0.5, dy = wy - spring + 0.5, r = dy < 0 ? Math.sqrt(dx * dx + dy * dy) : Math.abs(dx);
      if (r >= rout) continue;
      const k = y * CH + x;
      if (r < rin) {
        // The recess: dark, darkest deep in.
        px[k] = r < rin - 2.5 || hash2(wx, wy, 11) < 0.5 ? S[0] : S[1];
        continue;
      }
      const rr = r - rin;
      if (rr >= rout - rin - 1) {
        px[k] = S[0];
        continue;
      }
      if (dy < 0) {
        // A voussoir (radial joints every 0.42 rad over the arch).
        const a = Math.atan2(-dy, dx) / 0.4189, f = a - Math.floor(a);
        if (f * r * 0.4189 < 1) px[k] = S[1];
        else if (rr < 0.8) px[k] = Cp[1];
        else {
          const t = 4 + (dx < -5 ? 1 : dx > 5 ? -1 : 0) - (rr > rout - rin - 2 ? 1 : 0) + ((1 - f) * r * 0.4189 < 2 && rr < 2.6 ? 1 : 0);
          px[k] = Cp[t < 3 ? 3 : t > 5 ? 5 : t];
        }
        continue;
      }
      // A jamb's block (6 px tall, from the springing down).
      const kb = (((wy - spring) % 6) + 6) % 6;
      if (kb === 0) px[k] = S[1];
      else if (rr < 0.8) px[k] = Cp[1];
      else px[k] = S[(dx < 0 ? 5 : 4) + (kb === 1 ? 1 : 0) - (kb === 5 || rr > rout - rin - 2 ? 1 : 0)];
    }
  }
  // The door's own foot: its sprite (26 x 29 and its outline, its bottom row on cv.y, its sides on
  // cv.x - 14 and cv.x + 13) stands its lowest 16 px out on the sand before the wall, so the wall's hard
  // shade runs on round its sides and its base, 2 px of the sand at (0.84, 0.74, 0.66) (its judging, 29
  // October 2026: with none, "it looks pasted on").
  for (let wy = foot + 2; wy <= cv.y + 2; wy++) {
    const y = wy - y0;
    if (y < 0 || y >= CH) continue;
    for (let wx = cv.x - 16; wx <= cv.x + 15; wx++) {
      const x = wx - x0;
      if (x < 0 || x >= CH || (wy <= cv.y && wx > cv.x - 15 && wx < cv.x + 14)) continue;
      px[y * CH + x] = tint(px[y * CH + x], 0.84, 0.74, 0.66);
    }
  }
}

// Where a spire's foot may stand on a range at x (world; side 0 the top range, 1 the bottom), as the
// march draws it (style.md 4.3: "place their feet on a ledge with at least 6 px of ledge south of the
// foot, never on a face line"): on a ledge in view (a tier's top, not its cap, a gully's floor or the
// bottom range's rim), at least 6 px of that ledge in front of (south of) its foot and 2 behind it.
// The top range's highest tier in view first (k, 0 to 1, takes the next one now and then); on the
// bottom range any of its first three ledges below its rim, k picking which (its judging, 29 October
// 2026: all on the first ledge behind the rim, they stood "in a line ... as fence posts or traffic
// cones"); h (0 to 1) picks the row. The world row of its foot (where the sprite stands), or null where
// there is none. The faces, the edges' wander and jags, the gullies and the tiers' lifts are a chunk's
// own, from the same world grid, so the ledge is where it is drawn (no dome: a spire may stand by a
// boulder).
const LEDGE = []; // [tier, its first row, its last] of each ledge in view (the last query's)
const SPIRE = 200;
export function spireFoot(topo, wx, side, h, k) {
  const s = topo.s || 0, zs = side ? ZB : ZT, L = LAST[side];
  const m4 = Math.floor(wx / 4) * 4, q4 = (wx - m4) / 4;
  const l0 = topo.lo(m4), l1 = topo.lo(m4 + 4), h0 = topo.hi(m4), h1 = topo.hi(m4 + 4);
  const lo = l0 + (l1 - l0) * q4, hi = h0 + (h1 - h0) * q4;
  const gt = gully(wx, 0), gb = gully(wx, 1), g = side ? gb : gt;
  const xa = Math.floor(wx / 8) * 8, tx = (wx & 7) * 0.125;
  // The edges' slope across there: the face's lean and the gully's, as slopeF has them (with CFX).
  const lean = (side ? -(h1 - h0) / 4 : (l1 - l0) / 4) + (side ? GD : -GD) * (gully(wx + 1, side) - gully(wx - 1, side)) * 0.5;
  // The edges' wander and jags at grid row j (world y 8j), and their slope across, as column() has
  // them: [CF, CFX].
  const cf = (j) => {
    const wy = j * 8, top = wy < lo + 8, A = 2 * (top ? TA : BA), J = 2 * JA * (1 - (top ? gt : gb));
    const w0 = fbm(xa / 100, wy / 64, s + 201, 3), w1 = fbm((xa + 8) / 100, wy / 64, s + 201, 3);
    const j0 = fbm(xa / 20, wy / 14, s + 251, 2), j1 = fbm((xa + 8) / 20, wy / 14, s + 251, 2);
    return [A * (w0 + (w1 - w0) * tx - 0.5) + J * (j0 + (j1 - j0) * tx - 0.5), (A * (w1 - w0) + J * (j1 - j0)) * 0.125];
  };
  // Each tier's lift there (none for the first and the last).
  const off = [0];
  for (let t = 1; t < L; t++) {
    const a = fbm(xa / 64, t * 7.3 + side * 50, s + 241, 2), b = fbm((xa + 8) / 64, t * 7.3 + side * 50, s + 241, 2);
    const o = Math.round(2.4 * OFF * (a + ((b - a) * (wx - xa)) / 8 - 0.5));
    off.push(o > OFF ? OFF : o < -OFF ? -OFF : o);
  }
  off.push(0);
  // Walked from the band into the range, a ground row at a time, as the march walks it: the top
  // range's rows rise up the screen going north, each seen only above all in front of it; the bottom
  // range's fall down it going south, each taken only below the last (past its crest its tiers step
  // down; the crest's first rows, drawn over the rim ledge's last, are left out, and no spire stands at
  // its rim). As far as is in view.
  LEDGE.length = 0;
  const F0 = side ? BF0 : TF0, W = side ? BW : TW, edge = side ? Math.floor(hi) : Math.ceil(lo);
  let jc = null, c0 = 0, c1 = 0, run = -1, prev = edge;
  for (let yg = side ? edge + 1 : edge - 1; Math.abs(yg - edge) < 2 * VIS; yg += side ? 1 : -1) {
    const d = side ? yg - hi : lo - yg;
    let z, ledge = false;
    if (d >= FLAT[side]) z = zs[L];
    else {
      const j = yg >> 3;
      if (j !== jc) {
        // (The grid's rows a row at a time, either way.)
        if (jc !== null && j === jc + 1) {
          c0 = c1;
          c1 = cf(j + 1);
        } else if (jc !== null && j === jc - 1) {
          c1 = c0;
          c0 = cf(j);
        } else {
          c0 = cf(j);
          c1 = cf(j + 1);
        }
        jc = j;
      }
      const fy = (yg & 7) * 0.125, f = c0[0] + (c1[0] - c0[0]) * fy, F = d + f;
      tierOf(d, f + cut(g, d, side), side);
      z = zs[T] + off[T];
      if (side) z = rimHold(z, d, T);
      // Not on the rim tier, a cap, the crest's rim or a gully's floor (where the gully moved the
      // tier). The cap as the painter has it: RIM px square to the edge, its F px over the slope of F
      // there.
      const tu = F < F0 ? 0 : Math.min(L, 1 + Math.floor((F - F0) / W));
      let front = side ? (T < L ? (T === 0 ? BF0 - M.ff : BW - M.fl) : 99) : M.fl;
      if (front < 15) {
        const nx = lean + c0[1] + (c1[1] - c0[1]) * fy, ny = (side ? 1 : -1) + (c1[0] - c0[0]) * 0.125;
        front /= Math.sqrt(nx * nx + ny * ny) || 1;
      }
      ledge = T > 0 && tu === T && front >= RIM + 1 && !(side && T === 1 && M.fl < RIM2W + 2);
    }
    const tp = yg - z;
    if (side ? tp >= hi + VIS : tp < lo - VIS) break;
    if (side ? tp <= prev : tp >= prev) continue;
    if (ledge && run >= 0 && LEDGE[run] === T && tp === prev + (side ? 1 : -1)) LEDGE[run + (side ? 2 : 1)] = tp;
    else if (ledge) {
      run = LEDGE.length;
      LEDGE.push(T, tp, tp);
    } else run = -1;
    prev = tp;
  }
  // The ledges with room for a foot (2 px behind it, 6 in front) within SPIRE px of the band's edge
  // (so the spire is seen whole from the band's edge): on the top range the upper tiers' first, k
  // picking the first of them seven times in ten, else the next; on the bottom range those of its tiers
  // 1 to 3, k picking any of them alike.
  let first = -1, next = -1, n = 0;
  const rank = (t) => (side ? (t >= 1 && t <= 3 ? 1 : 0) : t);
  for (let r = 0; r < LEDGE.length; r += 3) {
    LEDGE[r + 1] = Math.max(LEDGE[r + 1] + 2, side ? -Infinity : Math.ceil(lo - SPIRE));
    LEDGE[r + 2] = Math.min(LEDGE[r + 2] - 6, side ? Math.floor(hi + SPIRE) : Infinity);
    if (LEDGE[r + 2] < LEDGE[r + 1] || !rank(LEDGE[r])) {
      LEDGE[r] = -1;
      continue;
    }
    n++;
    if (first < 0 || rank(LEDGE[r]) > rank(LEDGE[first])) {
      next = first;
      first = r;
    } else if (next < 0 || rank(LEDGE[r]) > rank(LEDGE[next])) next = r;
  }
  let r = k < 0.7 || next < 0 ? first : next;
  if (side && n) {
    for (let m = Math.min(n - 1, Math.floor(k * n)), q = 0; q < LEDGE.length; q += 3) {
      if (LEDGE[q] < 0) continue;
      if (m-- === 0) {
        r = q;
        break;
      }
    }
  }
  if (r < 0) return null;
  const a = LEDGE[r + 1], b = LEDGE[r + 2];
  return a + Math.floor(h * (b - a + 1));
}

// The rows of the chunk at (x0, y0) whose ground paintStone leaves to show, [a, b): every row above the
// top range's face in every column of it, and every row below the bottom range's, it paints whole (the
// faces as the lattice holds them, every 4 px of x, so their least and most there bound them).
export function groundRows(x0, y0, topo) {
  let lo = Infinity, hi = -Infinity;
  for (let m = 0; m <= CH / 4; m++) {
    const l = topo.lo(x0 + m * 4), h = topo.hi(x0 + m * 4);
    if (l < lo) lo = l;
    if (h > hi) hi = h;
  }
  const a = Math.ceil(lo) - y0, b = Math.floor(hi) + 1 - y0;
  return [a < 0 ? 0 : a > CH ? CH : a, b < 0 ? 0 : b > CH ? CH : b];
}

// paintStone(tc, px, P, topo): the Sunscorch's ranges over the chunk (tc its TerrainChunk, px its
// packed pixels, P the look's terrain tones as paint.js holds them, topo its Corridor).
export function paintStone(tc, px, P, topo) {
  const { x0, y0 } = tc, s = topo.s || 0;
  GY0 = y0 - GOFF;
  // The faces as the lattice holds them (every 4 px of x, between them straight: the very edge that
  // stops the hero, topology/corridor.js terrain).
  let loMax = -Infinity, loMin = Infinity, hiMin = Infinity, hiMax = -Infinity, la = topo.lo(x0), ha = topo.hi(x0);
  for (let m = 0; m < CH / 4; m++) {
    const lb = topo.lo(x0 + (m + 1) * 4), hb = topo.hi(x0 + (m + 1) * 4), sl = (lb - la) / 4, sh = (hb - ha) / 4;
    for (let q = 0; q < 4; q++) {
      const x = m * 4 + q;
      LO[x] = la + sl * q;
      HI[x] = ha + sh * q;
      LD[x] = sl;
      HD[x] = sh;
      NLO[x] = 1 / Math.sqrt(1 + sl * sl);
      NHI[x] = 1 / Math.sqrt(1 + sh * sh);
      if (LO[x] > loMax) loMax = LO[x];
      if (LO[x] < loMin) loMin = LO[x];
      if (HI[x] < hiMin) hiMin = HI[x];
      if (HI[x] > hiMax) hiMax = HI[x];
    }
    la = lb;
    ha = hb;
  }
  const top = loMax > y0, bot = hiMin < y0 + CH - 1;
  if (!top && !bot) return;
  // The gullies along the chunk, and their slope across.
  for (let side = 0; side < 2; side++) {
    let a = gully(x0 - 1, side), b = gully(x0, side);
    for (let x = 0; x < CH; x++) {
      const c = gully(x0 + x + 1, side);
      GU[side * CH + x] = b;
      GUX[side * CH + x] = (c - a) * 0.5;
      a = b;
      b = c;
    }
  }
  // The noise on the grid's rows (ground rows ga to gb, world): ROW 2 where the march reads it (the top
  // range's from VIS px over its face down to its lowest rock lifted into the chunk; the bottom range's
  // from its highest rock sunk into the chunk down to what can rise from VIS px past its face), ROW 1
  // (the blotches alone) where its rows past VIS are drawn flat, their last tier's height off them.
  ROW.fill(0);
  const LT = LAST[0], LB = LAST[1];
  const mark = (ga, gb, v) => {
    const jb = Math.min(GY - 1, Math.ceil((gb - GY0) / 8) + 1);
    for (let j = Math.max(0, Math.floor((ga - GY0) / 8) - 1); j <= jb; j++) if (ROW[j] < v) ROW[j] = v;
  };
  // A chunk wholly past VIS of a range (its summit, or its last tier's flat far below): flat.
  const deepT = top && Math.floor(loMin - VIS) >= y0 + CH, deepB = bot && Math.ceil(hiMax + VIS) <= y0;
  if (deepT || deepB) mark(y0 + (deepT ? ZT[LT] : ZB[LB]), y0 + CH + (deepT ? ZT[LT] : ZB[LB]), 1);
  else {
    if (top) {
      const ga = Math.max(y0, Math.floor(loMin - VIS)), flat = Math.min(CH, Math.floor(loMax - VIS) - y0);
      if (ga <= loMax) mark(ga, Math.min(loMax, y0 + CH + UP_T), 2);
      if (flat > 0) mark(y0 + ZT[LT], y0 + flat + ZT[LT], 1);
    }
    if (bot) {
      const gb = Math.ceil(hiMax + VIS), flat = Math.max(0, Math.ceil(hiMin + VIS) - y0);
      mark(Math.max(hiMin, y0 - DOWN), Math.min(y0 + CH, gb) + UP_B, 2);
      if (flat < CH) mark(y0 + flat + ZB[LB], y0 + CH + ZB[LB], 1);
    }
  }
  for (let j = 0; j < GY; j++) {
    if (!ROW[j]) continue;
    const wy = GY0 + j * 8;
    for (let i = 0; i < GX; i++) {
      const wx = x0 + i * 8, c = j * GX + i;
      BG[c] = fbm(wx / 34, wy / 22, s + 221, 2);
      if (ROW[j] < 2) continue;
      WG[c] = fbm(wx / 100, wy / 64, s + 201, 3);
      JG[c] = fbm(wx / 20, wy / 14, s + 251, 2);
    }
  }
  if (deepT || deepB) {
    for (let x = 0; x < CH; x++) {
      column(x);
      flatRows(px, x, x0 + x, y0, 0, CH, deepT ? ZT[LT] : ZB[LB], topBase(deepT ? 0 : 1, deepT ? LT : LB), P.top);
    }
    return;
  }
  // Each tier's lift along the chunk (every 8 px of x, between them straight; none for the band's
  // wall, the bottom range's rim and each range's last tier).
  for (let t = 1; t < LB; t++) {
    for (let side = 0; side < 2; side++) {
      if (t >= LAST[side]) continue;
      const O = side ? OFB : OFT;
      let a = fbm(x0 / 64, t * 7.3 + side * 50, s + 241, 2);
      for (let m = 0; m < CH / 8; m++) {
        const b = fbm((x0 + (m + 1) * 8) / 64, t * 7.3 + side * 50, s + 241, 2);
        for (let q = 0; q < 8; q++) {
          const o = Math.round(2.4 * OFF * (a + ((b - a) * q) / 8 - 0.5));
          O[t * CH + m * 8 + q] = o > OFF ? OFF : o < -OFF ? -OFF : o;
        }
        a = b;
      }
    }
  }
  for (let x = 0; x < CH; x++) {
    column(x);
    if (top) march(px, x, x0, y0, 0, P);
    if (bot) march(px, x, x0, y0, 1, P);
  }
  // The outcrops and boulders whose stones reach into the chunk (on the screen, their tier's height off
  // them), over the march: the farther first.
  DL.length = 0;
  for (let side = 0; side < 2; side++) {
    if (side ? !bot : !top) continue;
    // The rows of the range a stone can stand on and be drawn into the chunk.
    const ya = side ? Math.max(hiMin, y0 - DOWN - 20) : Math.max(y0 - 20, Math.floor(loMin - DOME_D[0]));
    const yb = side ? Math.min(y0 + CH + UP_B + DOME_H, Math.ceil(hiMax + DOME_D[1])) : Math.min(loMax, y0 + CH + UP_T + DOME_H);
    if (ya > yb) continue;
    const zs = side ? ZB : ZT;
    for (let kind = 0; kind < 2; kind++) {
      const [cw, chh] = DOMES[kind];
      for (let j = Math.floor((ya - 20) / chh); j <= Math.floor((yb + 20) / chh); j++) {
        for (let i = Math.floor((x0 - 50) / cw); i <= Math.floor((x0 + CH + 50) / cw); i++) {
          const L = cachedDomes(kind, i, j, side, topo, s);
          if (!L) continue;
          for (const c of L) {
            if (c.x + c.rx * 1.17 + 3 < x0 || c.x - c.rx * 1.17 >= x0 + CH) continue;
            if (c.y - zs[c.t] + OFF + c.ry * 1.17 + 3 < y0 || c.y - zs[c.t] - OFF - c.ht * 1.17 >= y0 + CH) continue;
            DL.push(c);
          }
        }
      }
    }
  }
  if (DL.length) {
    DL.sort((a, b) => a.y - b.y || a.x - b.x);
    paintDomes(px, x0, y0, P, DL, s);
  }
  // The band's wall's shade on the sand at its foot, warm (the sand's own darker tone, not grey): a
  // hard band hugging the stones' bottoms, then a soft pool, its depth wandering along the wall (a slow
  // noise every 8 px of x, between them straight). And a contact shade on the sand along the bottom
  // range's rim, where the light falls, round its cobbles' bulges (the lip on the sand's last row
  // under each cobble's middle: rimPixel).
  if (top) {
    let a = fbm(x0 / 30, 0.5, s + 261, 2);
    for (let m = 0; m < CH / 8; m++) {
      const b = fbm((x0 + (m + 1) * 8) / 30, 0.5, s + 261, 2);
      for (let q = 0; q < 8; q++) {
        const x = m * 8 + q, lo = LO[x], wx = x0 + x, pool = 3 + Math.max(0, Math.min(1, (a + ((b - a) * q) / 8 - 0.3) * 2.5)) * 7;
        for (let y = Math.max(0, Math.ceil(lo) - y0); y < CH; y++) {
          const d = y0 + y - lo, bay = BAYER[(((y0 + y) & 3) << 2) | (wx & 3)];
          if (d > 11) break;
          const k = y * CH + x;
          if (d < 2) px[k] = tint(px[k], 0.84, 0.74, 0.66);
          else if (d < pool + bay * 2.5) px[k] = tint(px[k], 0.93, 0.87, 0.82);
        }
      }
      a = b;
    }
  }
  if (bot) {
    for (let x = 0; x < CH; x++) {
      const yl = Math.floor(HI[x]) - y0, bulge = HD[x] <= 0.7 && rimLip(x0 + x), y = bulge ? yl - 1 : yl;
      if (bulge && yl >= 0 && yl < CH) px[yl * CH + x] = P.cap[0];
      if (y >= 0 && y < CH) px[y * CH + x] = tint(px[y * CH + x], 0.92, 0.86, 0.8);
    }
  }
  for (const cv of tc.caves) paintCave(P, cv, x0, y0, px);
}
