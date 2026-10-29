// The Abyss's ground, round 3 (game/topology, 29 October 2026): fault plates. The owner's words that
// day: "the hell part is like, the land patches look kinda shitty. They are a bit too big but also, the
// setup should be more like grey and the floow should resemble act 4 of diablo 2. Also, the patches of
// land should have a better algorithm that makes it look just better than what we have now because the
// patches rn look silly." So no beads on a grid and no round blobs: grey rock broken into jagged plates,
// split by rivers of fire (or chasms over the void), with flat walkways across them, every patch about
// half the old islands' size and every one with a way home. (topology/islands.js, the 28 October
// islands, stays registered; nothing names it now.)
//
// The ground is a Voronoi of plates (sites on a `G` px grid, each coarse cell left whole or split 2x2 or
// 3x3 by a slow "shatter" noise). Plates are grouped into masses: an additively weighted Voronoi of a
// jittered `M` px lattice of mass sites (some left out where the plates run broad). Each seam is a
// jagged polyline (midpoint displacement between its two Voronoi vertices, worked out from the three
// plates' sorted ids, so every chunk computes the very same numbers):
//   between two masses: a river of lava (or a chasm), its half width from a slow "heat" noise, capped by
//     the smaller plate's inradius, a fifth of them broad, narrowing toward a vertex where it is the
//     only river and widening where three meet (and a lake there);
//   inside a mass: closed (a fissure or a dark joint); some carry lava: a lens in the middle where no
//     river reaches either end, a rift tapering in from a wet end. Where lava ends the same line goes on
//     as a fissure (the painter's `seams`), so a fissure reads as a river that never opened.
// Pits sit in the middle of broad plates. Then chips: small bites out of every coast (a rotated,
// stretched 64 px Voronoi, never within 36 px of a closed seam, where the necks are, nor 48 px of a
// walkway's end), so the banks get capes and notches.
//
// Reachability by construction. A node is a mass's land: its plates joined by strong seams (seams long
// enough to keep a 44 px neck after the rivers at their ends have eaten in). Its anchor is its plate
// nearest the start's site. Each node takes a way home: a seam from one of its plates to a node whose
// anchor is nearer the start (the anchor's Delaunay neighbour nearer the start always qualifies: greedy
// routing never sticks on a Delaunay graph), and a second one where there is one 150 px from the first;
// a node with one way out whose plates are small takes another anyway (no pockets under a horde), and a
// few seams are crossed at random too. A crossing is a walkway (a straight deck of stone, rock, iron or
// bone) or a ford (a neck of land between two rifts). Anchors fall strictly along every way home, so
// every node reaches the start. Everything is made on demand from hashes of the cells it touches and
// cached: no global flood fill, the same answer chunk by chunk and in any order.
//
// Ported from the round-3 prototype (scratchpad hell3/free/abyss.mjs and places.mjs) with the lead
// designer's tuned parameters (biomes/hell.js topology). Pure: no canvas, no sprites.

import { hash2, fbm, valueNoise } from '../../engine/util.js';
import { SURFACE, TN, TSTEP, TMAX, TCHUNK, sampleField } from './terrain.js';
import { dice, ss, clampT, settle, DEEP } from './shapes.js';
import { shrineOrder, adder, walkPath, shrinePlace, startCamp, dress, bridgehead } from './places.js';

const DEEP_IN = 40; // a lake's or pit's field inside this far from its rim is left at -DEEP_IN (deep: flat)
const KEEP = 6000; // trim(): what lies farther than this from the hero is forgotten (made again the same)
const LANDMARK_KINDS = ['graveyard', 'gallows', 'circle', 'ruins'];
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const lerp = (a, b, t) => a + (b - a) * t;

// Everything biomes/hell.js's topology leaves out keeps the prototype's value.
export const PLATES = {
  G: 330, // the coarse cell (px): one plate, or 2x2, or 3x3
  split: [0.55, 0.67], // the shatter noise above which a coarse cell splits 2x2, 3x3
  shatterScale: 1300, // px across the shatter noise's features
  jit: 0.85, // a site's jitter, of its sub-cell
  M: 460, massJit: 0.8, massW: 0.32, startW: 0.45, massDrop: 0.45, // masses: lattice, jitter, additive weight (of M), sites dropped where plates are broad
  heatScale: 1700, // px across the heat noise's features (hot: more lava, cool: more plateau)
  pMinorLand: [0.92, 0.72], shardLava: 0.17, // share of seams inside a mass left closed, cool -> hot; less (per split level) among small plates
  hwFrac: [0.17, 0.3], // a river inside a mass: half width as a share of the smaller plate's inradius
  hwMajor: [22, 70], pBroad: 0.2, broad: 1.6, seamF: [0.7, 1.3], // a river between masses: half width, cool -> hot; a broad one's factor, else a per-seam factor
  hwMin: 6, hwMinMajor: 16, hwMax: 100, homeHw: 44, capMajor: 0.62, // a river between masses never under 32 px across but at a tip; never wider than capMajor of the smaller plate's inradius (a seam inside: 0.42)
  taper: [0.75, 1, 1.25], // a river's width at a vertex where it is the only river, one of two, one of three
  Lmin: 60, // a crossed seam's least length (shorter only as the last resort)
  q2: [1, 1], bigNode: 70000, // chance a node takes a second way home (150 px or more from the first): small / big (area px^2)
  pocketIn: 60, pocketArea: 67400, // a node with one way out whose smallest plate's inradius is under pocketIn, or whose land is over pocketArea px^2 (a third of a view), takes another
  pLoop: 0.15, // chance any other river seam is crossed too
  pFord: 0.9, // a node's first way home over a river is a ford, not a walkway (when long enough, and allowed: see edge())
  neck: [46, 64], // a ford's neck of land, px
  needNeck: 44, // the land a joined closed seam keeps, px
  pRift: [0.4, 0.75], // a closed seam takes a rift from a wet vertex, cool -> hot
  pBend: 0.55, // a lone river turns into a closed seam as a rift rather than ending at the vertex
  lake: { p: [0.45, 0.85], max: 160, pBend: 0.4 },
  capMin: 10, // the narrowest a river is pinched to beside a joined closed seam
  lensEnd: 26, // a lens's tips stop this far short of its vertices
  pit: { p: [0.45, 0.15], minIn: 125 },
  rough: [0.09, 0.15, 0.2], // midpoint displacement per level, of the segment's length
  reach: 32, // px the land side of the field is worked out to (beyond: TMAX)
  warm: [600, 1600], // prewarm()'s ring round the hero, px
  deck: { hw: [12, 15], inset: 16 },
  materials: { stone: 0.6, rock: 0.2, iron: 0.15, bone: 0.05 }, // stone is Act IV's walkway; rock a natural causeway
  // Chips: bites of up to `max` px out of the coasts (where the land is under `top` px), from a `cell` px
  // Voronoi turned `rot` and stretched `stretch` along, blended `blend` px either side of a cell's
  // border; none within seam[0] px of a closed seam's line (ramping in by seam[1]) nor end[0] px of a
  // walkway's end or a ford's neck.
  chip: { max: 14, top: 24, cell: 64, rot: 0.6, stretch: 1.3, blend: 4, seam: [36, 48], end: [48, 60] },
  places: {
    crypt: { cell: 2000, off: [1000, 1000], jit: 300, pick: 420, room: 80 },
    shrine: { cell: 1150, off: [575, 0], jit: 180, pick: 380, room: 70 },
    landmark: { cell: 760, off: [380, 380], jit: 160, pick: 300, room: 110, p: 0.6 },
  },
};

export function siteId(ci, cj, k) {
  return ((ci + 4096) * 8192 + (cj + 4096)) * 16 + k;
}
const ROOT = siteId(0, 0, 0);

function circ(ax, ay, bx, by, cx, cy) {
  bx -= ax;
  by -= ay;
  cx -= ax;
  cy -= ay;
  const d = 2 * (bx * cy - by * cx), b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  return [ax + (cy * b2 - by * c2) / d, ay + (bx * c2 - cx * b2) / d];
}

// Signed px to a polygon's rim, + outside.
export function polySdf(xs, ys, px, py) {
  let d = Infinity, inside = false;
  const n = xs.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ex = xs[j] - xs[i], ey = ys[j] - ys[i], wx = px - xs[i], wy = py - ys[i];
    let t = (wx * ex + wy * ey) / (ex * ex + ey * ey);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = wx - ex * t, dy = wy - ey * t, q = dx * dx + dy * dy;
    if (q < d) d = q;
    if (ys[i] > py !== ys[j] > py && px < (ex * (py - ys[i])) / ey + xs[i]) inside = !inside;
  }
  return inside ? -Math.sqrt(d) : Math.sqrt(d);
}
const rinOf = (p) => (p.rin === undefined ? (p.rin = Math.min(...p.xs.map((x, k) => Math.hypot(x - p.x, p.ys[k] - p.y)))) : p.rin);

// The key of `w` ({ name: share }) that r (0..1) falls in.
function pickWeighted(w, r) {
  let t = 0;
  const keys = Object.keys(w), sum = keys.reduce((s, k) => s + w[k], 0);
  for (const k of keys) {
    t += w[k] / sum;
    if (r < t) return k;
  }
  return keys[keys.length - 1];
}

export class Plates {
  constructor(T, mapSeed, runSeed) {
    this.T = T;
    this.P = { ...PLATES, ...T };
    this.kind = 'plates';
    this.axis = null;
    // Lava or the void, from the run's seed (islands.js's rule, verbatim): the layout is the map's
    // alone, the same in both; lava without one (tools/mapgen/endless.mjs without --run).
    this.variant = runSeed === undefined || runSeed === null ? T.variants[0] : hash2(runSeed & 0xffff, runSeed >>> 16, 4049) < 0.5 ? T.variants[0] : T.variants[1];
    this.blocked = SURFACE.GAP;
    this.patchKind = 0;
    this.cryptRange = { near: 2400, far: 2800 };
    const { H, rngOf, s } = dice(mapSeed);
    this.H = H;
    this.rngOf = rngOf;
    this.s = s;
    this.order = shrineOrder(rngOf);
    this.coarse = new Map();
    this.cells = new Map();
    this.masses = new Map();
    this.edges = new Map();
    this.verts = new Map();
    this.geoms = new Map();
    this.bridges = new Map();
    this.vp = new Map();
    this.nodes = new Map();
    this.room = new Map(); // a plate's best point and its room
    this.picks = new Map(); // places by lattice cell
    this.cache = new Map(); // place and landmark objects, bridgeheads, the start
    this.tcs = new Map(); // terrain chunks (canStand reads them)
    this.warm = new Set(); // prewarm(): the sites made ready
    this.warmKey = NaN;
    this.warmList = [];
    this.warmAt = 0;
  }
  ph(a, b, k) {
    return a < b ? this.H(a, b, k) : this.H(b, a, k);
  }
  heat(x, y) {
    return ss(0.4, 0.6, fbm(x / this.P.heatScale, y / this.P.heatScale, this.s + 5, 2));
  }

  // ---- Sites ---------------------------------------------------------------------------------------
  sitesOf(ci, cj) {
    const key = ci * 65536 + cj;
    let out = this.coarse.get(key);
    if (out) return out;
    const P = this.P, G = P.G, near = Math.abs(ci) <= 1 && Math.abs(cj) <= 1;
    let n = 1;
    if (!near) {
      const sh = fbm((ci * G) / P.shatterScale, (cj * G) / P.shatterScale, this.s + 1, 2) + (this.H(ci, cj, 2) - 0.5) * 0.12;
      n = sh > P.split[1] ? 3 : sh > P.split[0] ? 2 : 1;
    }
    const g = G / n;
    out = [];
    for (let b = 0; b < n; b++) {
      for (let a = 0; a < n; a++) {
        const k = b * n + a;
        const x = (ci - 0.5) * G + (a + 0.5) * g, y = (cj - 0.5) * G + (b + 0.5) * g;
        let jx = (this.H(ci * 4 + a, cj * 4 + b, 3) - 0.5) * P.jit * g, jy = (this.H(ci * 4 + a, cj * 4 + b, 4) - 0.5) * P.jit * g;
        if (!ci && !cj) jx = jy = 0;
        else if (near) {
          // the start's eight neighbours stray only away from it, so the start's plate is broad
          if (ci) jx = Math.sign(ci) * Math.abs(jx);
          if (cj) jy = Math.sign(cj) * Math.abs(jy);
        }
        out.push({ id: siteId(ci, cj, k), x: x + jx, y: y + jy, ci, cj, k, n });
      }
    }
    this.coarse.set(key, out);
    return out;
  }
  site(id) {
    const k = id % 16, q = (id - k) / 16, cj = (q % 8192) - 4096, ci = (q - (cj + 4096)) / 8192 - 4096;
    return this.sitesOf(ci, cj)[k];
  }

  // ---- Voronoi cells (clipped from a box by every candidate's bisector, nearest first) --------------
  cell(id) {
    let C = this.cells.get(id);
    if (C) return C;
    const S = this.site(id), G = this.P.G;
    // The sites of the 3x3 coarse cells round it; the 5x5 or 7x7 when the cell reaches too far for
    // those to be all that could clip it.
    let W = 1;
    for (;;) {
      C = this.clipCell(S, W);
      const room = Math.min(S.x - (S.ci - W - 0.5) * G, (S.ci + W + 0.5) * G - S.x, S.y - (S.cj - W - 0.5) * G, (S.cj + W + 0.5) * G - S.y);
      if (C && 2 * C.rmax <= room) break;
      if (W === 3) {
        if (C) break;
        throw new Error(`plates: cell ${id}, window too small`);
      }
      W++;
    }
    this.cells.set(id, C);
    return C;
  }
  clipCell(S, W) {
    const id = S.id, G = this.P.G, cands = [];
    for (let dj = -W; dj <= W; dj++) {
      for (let di = -W; di <= W; di++) {
        for (const t of this.sitesOf(S.ci + di, S.cj + dj)) {
          if (t.id === id) continue;
          const dx = t.x - S.x, dy = t.y - S.y;
          cands.push({ t, dx, dy, d2: dx * dx + dy * dy });
        }
      }
    }
    cands.sort((a, b) => a.d2 - b.d2 || a.t.id - b.t.id);
    const B = (W + 0.6) * G;
    let px = [-B, B, B, -B], py = [-B, -B, B, B], tg = [-1, -1, -1, -1], r2 = 2 * B * B;
    for (const c of cands) {
      if (c.d2 > 4 * r2) break;
      const nx = c.dx, ny = c.dy, cc = c.d2 / 2;
      const ox = [], oy = [], ot = [], n = px.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, di = nx * px[i] + ny * py[i] - cc, dj = nx * px[j] + ny * py[j] - cc;
        const inI = di <= 0, inJ = dj <= 0;
        if (inI) {
          ox.push(px[i]);
          oy.push(py[i]);
          ot.push(tg[i]);
        }
        if (inI !== inJ) {
          const u = di / (di - dj);
          ox.push(px[i] + (px[j] - px[i]) * u);
          oy.push(py[i] + (py[j] - py[i]) * u);
          ot.push(inI ? c.t.id : tg[i]);
        }
      }
      px = ox;
      py = oy;
      tg = ot;
      r2 = 0;
      for (let i = 0; i < px.length; i++) r2 = Math.max(r2, px[i] * px[i] + py[i] * py[i]);
    }
    if (tg.includes(-1)) return null;
    // drop degenerate (near zero length) edges
    const xs = [], ys = [], tags = [];
    for (let i = 0; i < px.length; i++) {
      const j = (i + 1) % px.length;
      if (Math.hypot(px[j] - px[i], py[j] - py[i]) < 1e-6) continue;
      xs.push(S.x + px[i]);
      ys.push(S.y + py[i]);
      tags.push(tg[i]);
    }
    let inr = Infinity, minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, area = 0;
    for (let i = 0; i < xs.length; i++) {
      const j = (i + 1) % xs.length, ex = xs[j] - xs[i], ey = ys[j] - ys[i], wx = S.x - xs[i], wy = S.y - ys[i];
      let u = (wx * ex + wy * ey) / (ex * ex + ey * ey);
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      inr = Math.min(inr, Math.hypot(wx - ex * u, wy - ey * u));
      minx = Math.min(minx, xs[i]);
      maxx = Math.max(maxx, xs[i]);
      miny = Math.min(miny, ys[i]);
      maxy = Math.max(maxy, ys[i]);
      area += xs[i] * ys[j] - xs[j] * ys[i];
    }
    return { id, site: S, xs, ys, tags, inr, area: Math.abs(area) / 2, box: [minx, miny, maxx, maxy], rmax: Math.sqrt(r2) };
  }

  // ---- Seams before anything is joined: pure functions of the plates --------------------------------
  // A Voronoi vertex by its three plates, worked out in their sorted order (so every caller gets the
  // very same numbers).
  vpos(p, q, r) {
    if (p > q) [p, q] = [q, p];
    if (q > r) [q, r] = [r, q];
    if (p > q) [p, q] = [q, p];
    const key = p + ',' + q + ',' + r;
    let v = this.vp.get(key);
    if (!v) {
      const A = this.site(p), B = this.site(q), C = this.site(r);
      this.vp.set(key, (v = circ(A.x, A.y, B.x, B.y, C.x, C.y)));
    }
    return v;
  }
  seamLen(a, b, c1, c2) {
    const u = this.vpos(a, b, c1), v = this.vpos(a, b, c2);
    return Math.hypot(v[0] - u[0], v[1] - u[1]);
  }
  major(a, b) {
    return this.mass(a) !== this.mass(b);
  }
  // A seam inside a mass that carries lava: a lens in its middle, or a rift in from a wet end.
  lavaSeam(a, b) {
    if (a > b) [a, b] = [b, a];
    const P = this.P, SA = this.site(a), SB = this.site(b), small = Math.min(SA.n, SB.n) - 1; // 0 broad, 1 split 2x2, 2 split 3x3
    return this.H(a, b, 15) >= lerp(P.pMinorLand[0], P.pMinorLand[1], this.heat((SA.x + SB.x) / 2, (SA.y + SB.y) / 2)) - P.shardLava * small;
  }
  // A seam's river half width (between masses a channel, now and then a broad one; inside a mass a
  // share of the smaller plate), never more than capMajor (0.42 inside) of the smaller plate's
  // inradius. Between masses never under hwMinMajor (29 October 2026: no blocking lava narrower than
  // 32 px but at a tapering tip, so it reads under a horde).
  seamHw(a, b) {
    if (a > b) [a, b] = [b, a];
    const P = this.P, SA = this.site(a), SB = this.site(b), heat = this.heat((SA.x + SB.x) / 2, (SA.y + SB.y) / 2);
    const major = this.major(a, b), mi = Math.min(this.cell(a).inr, this.cell(b).inr);
    const hw = major
      ? lerp(P.hwMajor[0], P.hwMajor[1], heat) * (this.H(a, b, 18) < P.pBroad ? P.broad : lerp(P.seamF[0], P.seamF[1], this.H(a, b, 20)))
      : Math.max(P.hwMin, lerp(P.hwFrac[0], P.hwFrac[1], heat) * mi) * (0.85 + 0.3 * this.H(a, b, 18));
    // the start's plate keeps its camp clear: its channels stay modest
    const home = a === ROOT || b === ROOT ? P.homeHw : Infinity;
    return Math.max(major ? P.hwMinMajor : P.hwMin, Math.min(P.hwMax, hw, (major ? P.capMajor : 0.42) * mi, home));
  }
  // The rivers that may reach a vertex (every seam there between masses): how many, how wide, and how
  // far they eat into a closed seam leaving it (the angle between them about 120 degrees: 1.15 hw; a
  // margin for the hero).
  wetAt(a, b, c) {
    let k = 0, hw = 0;
    for (const [p, q] of [[a, b], [b, c], [a, c]]) {
      if (this.major(p, q)) {
        k++;
        hw = Math.max(hw, this.seamHw(p, q));
      }
    }
    return { k, hw, eat: k ? 1.3 * hw + 6 : 0 };
  }
  // What a closed seam inside a mass keeps beyond a neck once the rivers at its ends have eaten in (>= 0:
  // a strong seam, which no rift may cut).
  spare(a, b, c1, c2) {
    return this.seamLen(a, b, c1, c2) - this.wetAt(a, b, c1).eat - this.wetAt(a, b, c2).eat - this.P.needNeck;
  }

  // ---- Nodes: a mass's land, its plates joined by strong seams ---------------------------------------
  // Flooded over the few plates of one mass (a bounded, local fill, cached by plate). Its anchor: its
  // plate nearest the start.
  node(id) {
    let N = this.nodes.get(id);
    if (N) return N;
    const m = this.mass(id), set = new Set([id]), list = [id];
    for (let h = 0; h < list.length; h++) {
      const q = list[h], C = this.cell(q), n = C.tags.length;
      for (let i = 0; i < n; i++) {
        const t = C.tags[i];
        if (set.has(t) || this.mass(t) !== m) continue;
        if (this.spare(q, t, C.tags[(i - 1 + n) % n], C.tags[(i + 1) % n]) < 0) continue;
        set.add(t);
        list.push(t);
      }
    }
    let anchor = list[0], ad = Infinity, nid = Infinity, inr = Infinity, area = 0;
    for (const q of list) {
      const S = this.site(q), d = Math.hypot(S.x, S.y), C = this.cell(q);
      if (d < ad || (d === ad && q < anchor)) {
        ad = d;
        anchor = q;
      }
      nid = Math.min(nid, q);
      inr = Math.min(inr, C.inr);
      area += C.area;
    }
    N = { id: nid, plates: list, set, anchor, ad, inr, area, base: null, cands: null, cross: null };
    for (const q of list) this.nodes.set(q, N);
    return N;
  }
  // A seam crossed at random (a loop: routes across, not only home).
  loopSeam(a, b, L) {
    if (a > b) [a, b] = [b, a];
    return this.major(a, b) && L >= this.P.Lmin && this.H(a, b, 14) < this.P.pLoop;
  }
  // A node's ways home: a seam from one of its plates to a node whose anchor is nearer the start,
  // picked by hash among the long ones. One always exists: the anchor's own Voronoi neighbour nearer
  // the start (greedy routing on a Delaunay graph never sticks) lies in a node whose anchor is nearer
  // still. A second way home, to another node 150 px or more from the first, where there is one
  // (`q2`: every node since 29 October 2026, so routes are not one tree).
  baseCross(N) {
    if (N.base) return N.base;
    const P = this.P, out = [];
    let cands = [];
    if (!N.set.has(ROOT)) {
      for (const q of N.plates) {
        const C = this.cell(q), n = C.tags.length;
        for (let i = 0; i < n; i++) {
          const t = C.tags[i];
          if (N.set.has(t)) continue;
          const M = this.node(t);
          if (M.ad >= N.ad) continue;
          const c1 = C.tags[(i - 1 + n) % n], c2 = C.tags[(i + 1) % n], L = this.seamLen(q, t, c1, c2);
          if (L >= P.Lmin) cands.push({ q, t, M, L });
        }
      }
      if (!cands.length) {
        const C = this.cell(N.anchor), n = C.tags.length;
        let best = null;
        for (let i = 0; i < n; i++) {
          const t = C.tags[i], S = this.site(t), d = Math.hypot(S.x, S.y);
          if (d < N.ad && (!best || d < best.d)) best = { q: N.anchor, t, M: this.node(t), d, L: this.seamLen(N.anchor, t, C.tags[(i - 1 + n) % n], C.tags[(i + 1) % n]) };
        }
        if (!best) throw new Error(`plates: node ${N.id} has no way home`);
        cands.push(best);
      }
      // a seam longer than its river is wide, so the walkway at its middle is clear of the junctions
      const clear = cands.filter((c) => c.L >= 2 * this.seamHw(c.q, c.t) + 50);
      if (clear.length) cands = clear;
      const first = this.byHash(cands, 11);
      out.push(first);
      if (this.H(N.id, 0, 12) < (N.area >= P.bigNode ? P.q2[1] : P.q2[0])) {
        const f = this.site(first.q);
        const rest = cands.filter((c) => c.M !== first.M && Math.hypot(this.site(c.q).x - f.x, this.site(c.q).y - f.y) > 150);
        if (rest.length) out.push(this.byHash(rest, 13));
      }
    }
    N.base = out;
    N.cands = cands;
    return out;
  }
  byHash(arr, k) {
    return arr.reduce((b, c) => (this.ph(c.q, c.t, k) < this.ph(b.q, b.t, k) ? c : b));
  }
  // Its crossings: the ways home, and the pocket rule (29 October 2026): a node with only one way out
  // (its own ways home, its neighbours' into it and the loops counted) whose smallest plate is under
  // `pocketIn` px in radius, or whose land is over a third of a view, takes another, to any node with a nearer anchor, else across any long seam
  // out of it. Crossings never break the proof (they only add ways).
  crossingsOf(N) {
    if (N.cross) return N.cross;
    const P = this.P, out = this.baseCross(N).slice();
    if (!N.set.has(ROOT) && out.length < 2 && (N.inr < P.pocketIn || N.area > P.pocketArea)) {
      const ways = new Set(out.map((c) => (c.q < c.t ? c.q + ',' + c.t : c.t + ',' + c.q))), other = [];
      for (const q of N.plates) {
        const C = this.cell(q), n = C.tags.length;
        for (let i = 0; i < n; i++) {
          const t = C.tags[i];
          if (N.set.has(t)) continue;
          const key = q < t ? q + ',' + t : t + ',' + q, L = this.seamLen(q, t, C.tags[(i - 1 + n) % n], C.tags[(i + 1) % n]);
          if (this.loopSeam(q, t, L)) ways.add(key);
          for (const c of this.baseCross(this.node(t))) if (c.q === t && c.t === q) ways.add(key);
          if (L >= P.Lmin) other.push({ q, t, M: this.node(t), L, key });
        }
      }
      if (ways.size < 2) {
        const first = out[0], free = (c) => !ways.has(c.q < c.t ? c.q + ',' + c.t : c.t + ',' + c.q);
        let rest = N.cands.filter((c) => free(c) && (!first || c.M !== first.M));
        if (!rest.length) rest = N.cands.filter(free);
        if (!rest.length) rest = other.filter(free);
        if (rest.length) out.push(this.byHash(rest, 19));
      }
    }
    N.cross = out;
    return out;
  }
  crossed(a, b) {
    for (const c of this.crossingsOf(this.node(a))) if (c.t === b && c.q === a) return true;
    for (const c of this.crossingsOf(this.node(b))) if (c.t === a && c.q === b) return true;
    return false;
  }
  // How many ways out of node N (crossed seams from its plates to other nodes', fords among them).
  waysOut(N) {
    const seen = new Set();
    for (const q of N.plates) {
      for (const t of this.cell(q).tags) {
        if (N.set.has(t)) continue;
        const e = this.edge(q, t);
        if (e && e.crossing) seen.add(e.key);
      }
    }
    return seen.size;
  }

  // ---- Masses: an additively weighted Voronoi of a jittered lattice ---------------------------------
  massSite(mi, mj) {
    const P = this.P, M = P.M;
    if (!mi && !mj) return { x: 0, y: 0, w: P.startW * M };
    const x = (mi + (this.H(mi, mj, 21) - 0.5) * P.massJit) * M, y = (mj + (this.H(mi, mj, 22) - 0.5) * P.massJit) * M;
    // Where the plates run broad (the shatter noise low) some mass sites are left out, so a mass there
    // holds two or three broad plates, not one (a net of one-plate islands is the old beads again).
    if (this.dropped(mi, mj)) return null;
    return { x, y, w: (this.H(mi, mj, 23) - 0.5) * 2 * P.massW * M };
  }
  // Left out where the plates run broad, never two side by side (each keeps the least hash of its
  // neighbours that want out), never next to the start's.
  wantsOut(mi, mj) {
    const P = this.P, M = P.M;
    if (Math.abs(mi) + Math.abs(mj) <= 1) return false;
    const sh = fbm((mi * M) / P.shatterScale, (mj * M) / P.shatterScale, this.s + 1, 2);
    return this.H(mi, mj, 24) < P.massDrop * ss(P.split[0], P.split[0] - 0.12, sh);
  }
  dropped(mi, mj) {
    if (!this.wantsOut(mi, mj)) return false;
    const h = this.H(mi, mj, 24);
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (this.wantsOut(mi + a, mj + b) && this.H(mi + a, mj + b, 24) < h) return false;
    return true;
  }
  mass(id) {
    let m = this.masses.get(id);
    if (m !== undefined) return m;
    const S = this.site(id), M = this.P.M, mi0 = Math.round(S.x / M), mj0 = Math.round(S.y / M);
    let best = Infinity;
    for (let dj = -2; dj <= 2; dj++) {
      for (let di = -2; di <= 2; di++) {
        const q = this.massSite(mi0 + di, mj0 + dj);
        if (!q) continue;
        const v = Math.hypot(S.x - q.x, S.y - q.y) - q.w;
        if (v < best) {
          best = v;
          m = (mi0 + di) * 100000 + (mj0 + dj);
        }
      }
    }
    this.masses.set(id, m);
    return m;
  }

  // ---- Seams: their state (no geometry yet) --------------------------------------------------------
  // Between masses a river (crossed by a walkway or, now and then, a ford: a neck of land between two
  // rifts) where a node's way home or a loop runs over it; inside a mass closed: a lens of lava in its
  // middle where no river reaches it, a joined weak seam keeping its neck by pinching the rivers at its
  // ends.
  edge(a, b) {
    if (a > b) [a, b] = [b, a];
    const key = a + ',' + b;
    let e = this.edges.get(key);
    if (e !== undefined) return e;
    const A = this.cell(a), n = A.tags.length, i = A.tags.indexOf(b);
    if (i < 0) {
      this.edges.set(key, null);
      return null;
    }
    const P = this.P;
    const c1 = A.tags[(i - 1 + n) % n], c2 = A.tags[(i + 1) % n];
    const V1 = this.vpos(a, b, c1), V2 = this.vpos(a, b, c2);
    const L = Math.hypot(V2[0] - V1[0], V2[1] - V1[1]);
    const mx = (V1[0] + V2[0]) / 2, my = (V1[1] + V2[1]) / 2, heat = this.heat(mx, my);
    const major = this.major(a, b), tree = this.crossed(a, b);
    const req = tree || this.loopSeam(a, b, L);
    let land = !major, crossing = null, neck = P.needNeck, lens = false, lava = false, strong = false;
    if (!major) {
      lava = this.lavaSeam(a, b);
      lens = lava && this.wetAt(a, b, c1).k === 0 && this.wetAt(a, b, c2).k === 0 && L >= 2 * P.lensEnd + 24;
      strong = this.spare(a, b, c1, c2) >= 0;
      if (req) crossing = 'pinch';
    } else if (req) {
      const w = lerp(P.neck[0], P.neck[1], this.H(a, b, 16));
      const home = this.mass(ROOT), atHome = this.mass(a) === home || this.mass(b) === home; // the start's mass stays an island
      // A ford joins two masses' land, so fords must not chain into one great mass: one runs only from a
      // node of class 1 to a node of class 0 (by hash), on a first way home, so no node both gives and
      // takes one and a ford-joined mass is one node and those fording into it.
      const Na = this.node(a), Nb = this.node(b), cls = (N) => this.H(N.id, 1, 25) < 0.5;
      const first = (N, q, t) => N.cross && N.cross[0] && N.cross[0].q === q && N.cross[0].t === t;
      this.crossingsOf(Na);
      this.crossingsOf(Nb);
      const fordable = (first(Na, a, b) && cls(Na) && !cls(Nb)) || (first(Nb, b, a) && cls(Nb) && !cls(Na));
      if (L >= w + 70 && !atHome && fordable && this.H(a, b, 17) < P.pFord) {
        land = true;
        crossing = 'ford';
        neck = w;
      } else crossing = 'bridge';
    }
    e = { key, a, b, c1, c2, V1, V2, L, heat, major, tree, req, land, lens, lava, strong, crossing, neck, hw: this.seamHw(a, b) };
    this.edges.set(key, e);
    return e;
  }

  // ---- Vertices: rivers meeting, rifts, caps, lakes -------------------------------------------------
  vertex(p, q, r) {
    const t = [p, q, r].sort((x, y) => x - y);
    const key = t.join(',');
    let V = this.verts.get(key);
    if (V) return V;
    const P = this.P, es = [this.edge(t[0], t[1]), this.edge(t[1], t[2]), this.edge(t[0], t[2])].filter(Boolean);
    const [x, y] = this.vpos(t[0], t[1], t[2]);
    const open = es.filter((e) => !e.land), lands = es.filter((e) => e.land), k = open.length;
    const hwV = open.length ? Math.max(...open.map((e) => e.hw)) : 0;
    // A joined closed seam keeps its neck: the rivers at its ends narrow (half its spare length each,
    // over 2 for the angle they meet it at), never under capMin.
    let cap = Infinity;
    for (const e of lands) if (e.req) cap = Math.min(cap, Math.max(P.capMin, (e.L - Math.max(e.neck, P.needNeck)) / 2 / 2));
    const rifts = new Map();
    const heat = this.heat(x, y), h = this.H(t[0] ^ t[2], t[1], 31);
    if (k >= 1) {
      let cands = lands;
      if (k === 1) {
        // a lone river turns into one of the closed seams (a ford's first), or ends here
        const f = lands.find((e) => e.crossing === 'ford');
        cands = f ? [f] : h < P.pBend ? [lands[this.H(t[0], t[2], 32) < 0.5 ? 0 : lands.length - 1]] : [];
      }
      for (const e of cands) {
        if (!e) continue;
        if (e.crossing !== 'ford' && !e.lava && k >= 2 && this.H(e.a ^ t[0], e.b ^ t[2], 33) >= lerp(P.pRift[0], P.pRift[1], heat)) continue;
        let len = e.crossing === 'ford' ? (e.L - e.neck) / 2 : e.L * ((e.lava ? 0.3 : 0.15) + 0.3 * this.H(e.a, e.b ^ t[1], 34));
        if (e.req && e.crossing !== 'ford') len = Math.min(len, (e.L - P.needNeck) / 2 - 2 * Math.min(hwV, cap));
        // a strong seam keeps its neck: a rift may take what the river would eat anyway and half the spare
        if (e.strong) len = Math.min(len, this.wetAt(t[0], t[1], t[2]).eat + this.spare(e.a, e.b, e.c1, e.c2) / 2);
        if (len > 12) rifts.set(e.key, len);
      }
    }
    const flows = k >= 2 || rifts.size > 0;
    // A lake where three rivers meet, or (less often) a pool where one river bends past a closed seam
    // that is not joined (no neck to keep); clear of the middles of its seams, where the walkways are.
    let lake = null;
    const pl = k === 3 ? lerp(P.lake.p[0], P.lake.p[1], heat) : k === 2 && !lands.some((e) => e.req || e.strong) ? P.lake.pBend * lerp(P.lake.p[0], P.lake.p[1], heat) : 0;
    if (pl && this.H(t[0], t[1] ^ t[2], 35) < pl) {
      const minL = Math.min(...es.map((e) => e.L)), minX = Math.min(Infinity, ...es.filter((e) => e.crossing).map((e) => e.L / 2 - 34));
      const R = Math.min(P.lake.max * (0.45 + 0.55 * this.H(t[1], t[2], 36)), 0.36 * minL + hwV, minX);
      if (R > hwV * 1.3 && R > 30) {
        lake = this.blobPoly(x, y, R, t[0] ^ t[1], t[2], 0.35);
        lake.kind = 'lake';
      }
    }
    V = { key, x, y, k, hwV, cap, dry: false, rifts, flows, lake };
    this.verts.set(key, V);
    return V;
  }
  // An angular blob: m radii, each side broken once or twice more by midpoint displacement.
  blobPoly(x, y, R, a, b, amp) {
    const m = 7 + Math.floor(this.H(a, b, 40) * 4), xs = [], ys = [];
    const a0 = this.H(a, b, 41) * Math.PI * 2;
    let pts = [];
    for (let i = 0; i < m; i++) {
      const t = a0 + ((i + (this.H(a, b ^ i, 42) - 0.5) * 0.5) / m) * Math.PI * 2, r = R * (1 - amp + 2 * amp * this.H(a ^ i, b, 43));
      pts.push([x + Math.cos(t) * r, y + Math.sin(t) * r]);
    }
    for (let lv = 0; lv < 2; lv++) {
      const o = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length], dx = q[0] - p[0], dy = q[1] - p[1];
        const d = (this.H(a + i * 7 + lv * 131, b, 44) - 0.5) * 2 * 0.16;
        o.push(p, [(p[0] + q[0]) / 2 - dy * d, (p[1] + q[1]) / 2 + dx * d]);
      }
      pts = o;
    }
    for (const p of pts) {
      xs.push(p[0]);
      ys.push(p[1]);
    }
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      minx = Math.min(minx, xs[i]);
      maxx = Math.max(maxx, xs[i]);
      miny = Math.min(miny, ys[i]);
      maxy = Math.max(maxy, ys[i]);
    }
    return { xs, ys, box: [minx, miny, maxx, maxy], x, y, R };
  }

  // ---- A seam's geometry: its jagged line, the river along it, the fissure where it is closed -------
  geom(a, b) {
    if (a > b) [a, b] = [b, a];
    const key = a + ',' + b;
    let g = this.geoms.get(key);
    if (g !== undefined) return g;
    const e = this.edge(a, b);
    if (!e) {
      this.geoms.set(key, null);
      return null;
    }
    const P = this.P, VA = this.vertex(a, b, e.c1), VB = this.vertex(a, b, e.c2);
    // Midpoint displacement from V1 to V2 (endpoints fixed), then resampled every 4 px.
    const raw = [e.V1];
    const sub = (p, q, lv, idx) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
      if (len < 7) return;
      const r = P.rough[Math.min(lv, P.rough.length - 1)], d = (this.H(a ^ (lv * 977 + idx), b, 50) - 0.5) * 2 * r;
      const m = [(p[0] + q[0]) / 2 - dy * d, (p[1] + q[1]) / 2 + dx * d];
      sub(p, m, lv + 1, idx * 2);
      raw.push(m);
      sub(m, q, lv + 1, idx * 2 + 1);
    };
    sub(e.V1, e.V2, 0, 1);
    raw.push(e.V2);
    const xs = [], ys = [], ss_ = [];
    let acc = 0, carry = 0;
    xs.push(raw[0][0]);
    ys.push(raw[0][1]);
    ss_.push(0);
    for (let i = 1; i < raw.length; i++) {
      const p = raw[i - 1], q = raw[i], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      let u = 4 - carry;
      while (u <= len) {
        xs.push(p[0] + ((q[0] - p[0]) * u) / len);
        ys.push(p[1] + ((q[1] - p[1]) * u) / len);
        ss_.push(acc + u);
        u += 4;
      }
      carry = len - (u - 4);
      acc += len;
    }
    if (carry > 0.5) {
      xs.push(raw[raw.length - 1][0]);
      ys.push(raw[raw.length - 1][1]);
      ss_.push(acc);
    }
    const n = xs.length, Ltot = acc, hw = new Float32Array(n);
    // The river's width toward a vertex (s: px from it): full where it flows on (within the vertex's
    // cap, below), else a tip at the vertex.
    const end = (V, s, len) => (V.flows ? Infinity : ss(0, Math.max(20, Math.min(80, len * 0.45)), s));
    // Taper and confluence (29 October 2026): narrower toward a vertex where it is the only river,
    // broader toward one where three meet.
    const tf = (V) => P.taper[Math.max(0, Math.min(2, V.k - 1))], tA = tf(VA), tB = tf(VB);
    const home = a === ROOT || b === ROOT;
    for (let i = 0; i < n; i++) {
      const s1 = ss_[i], s2 = Ltot - s1;
      if (!e.land) {
        let w = Math.max(P.hwMinMajor, e.hw * (0.72 + 0.56 * valueNoise(s1 / 46, 0.5, this.H(a, b, 51) * 1e6)) * lerp(tA, tB, Ltot > 0 ? s1 / Ltot : 0.5));
        if (home) w = Math.min(w, P.homeHw);
        const f1 = end(VA, s1, Ltot), f2 = end(VB, s2, Ltot);
        if (f1 !== Infinity) w *= f1;
        else w = Math.min(w, VA.cap + 0.6 * s1);
        if (f2 !== Infinity) w *= f2;
        else w = Math.min(w, VB.cap + 0.6 * s2);
        hw[i] = w;
      } else if (e.lens) {
        // a lens: lava in the seam's middle, its tips `lensEnd` px (a joined seam's: more) short of the vertices
        const d0 = e.req ? P.lensEnd + 14 : P.lensEnd, l = Math.max(12, 0.3 * (Ltot - 2 * d0));
        hw[i] = e.hw * (0.72 + 0.56 * valueNoise(s1 / 46, 0.5, this.H(a, b, 51) * 1e6)) * ss(d0, d0 + l, s1) * ss(d0, d0 + l, s2);
      } else {
        let w = 0;
        const r1 = VA.rifts.get(e.key), r2 = VB.rifts.get(e.key);
        if (r1 && s1 < r1) w = Math.max(w, Math.min(VA.hwV, VA.cap + 0.6 * s1) * Math.pow(1 - s1 / r1, 0.8));
        if (r2 && s2 < r2) w = Math.max(w, Math.min(VB.hwV, VB.cap + 0.6 * s2) * Math.pow(1 - s2 / r2, 0.8));
        hw[i] = w;
      }
    }
    // The river (points with any width) and the closed stretches (the fissures). The river's discs:
    // every 4 px where it is narrow, sparser where it is wide (a disc union of radius h spaced d apart
    // scallops by about d^2 / 8h: under a px at d = h / 4).
    const rv = { xs: [], ys: [], hw: [] }, fis = [];
    let cur = null, last = -1e9;
    for (let i = 0; i < n; i++) {
      if (hw[i] > 0.6) {
        const step = Math.min(24, Math.max(4, hw[i] / 4));
        if (ss_[i] - last >= step - 0.01 || i === n - 1 || hw[i + 1] <= 0.6 || (i > 0 && hw[i - 1] <= 0.6)) {
          rv.xs.push(xs[i]);
          rv.ys.push(ys[i]);
          rv.hw.push(hw[i]);
          last = ss_[i];
        }
        if (cur) cur.hot = true; // lava resumes past it
        cur = null;
      } else {
        if (!cur) {
          cur = { xs: [], ys: [], hot: false, glow: 0 };
          if (i > 0) {
            cur.xs.push(xs[i - 1]);
            cur.ys.push(ys[i - 1]);
            if (hw[i - 1] > 0.6) cur.hot = true; // lava ends here: the line goes on as a fissure
          }
          fis.push(cur);
        }
        cur.xs.push(xs[i]);
        cur.ys.push(ys[i]);
      }
    }
    // A closed seam leaving a vertex where a lone river ends (no rift into it) goes on from its tip too.
    const tip = (V) => V.k === 1 && !V.rifts.size;
    if (fis.length && e.land) {
      if (hw[0] <= 0.6 && tip(VA)) fis[0].hot = true;
      if (hw[n - 1] <= 0.6 && tip(VB)) fis[fis.length - 1].hot = true;
    }
    fis.forEach((f, k) => {
      // glow: 1 where it carries on from lava; else a hash in [0, 1) the painter lights some stretches by
      f.glow = f.hot ? 1 : this.H(a ^ (k * 53), b, 52);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < f.xs.length; i++) {
        x0 = Math.min(x0, f.xs[i]);
        x1 = Math.max(x1, f.xs[i]);
        y0 = Math.min(y0, f.ys[i]);
        y1 = Math.max(y1, f.ys[i]);
      }
      f.box = [x0, y0, x1, y1];
    });
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, wmax = 0;
    for (let i = 0; i < n; i++) {
      minx = Math.min(minx, xs[i]);
      maxx = Math.max(maxx, xs[i]);
      miny = Math.min(miny, ys[i]);
      maxy = Math.max(maxy, ys[i]);
      wmax = Math.max(wmax, hw[i]);
    }
    // A ford's neck: the middle of its seam, where the two rifts stop.
    const neck = e.crossing === 'ford' ? [xs[n >> 1], ys[n >> 1]] : null;
    g = { key, e, VA, VB, xs, ys, s: ss_, hw, L: Ltot, river: rv, fis, wmax, neck, box: [minx - wmax, miny - wmax, maxx + wmax, maxy + wmax] };
    this.geoms.set(key, g);
    return g;
  }

  // A broad plate's pit: off its middle, small enough to leave a ring of land round it.
  pit(id) {
    const C = this.cell(id);
    if (C.pit !== undefined) return C.pit;
    C.pit = null;
    const P = this.P, S = C.site;
    if (id === ROOT || C.inr < P.pit.minIn) return null;
    const heat = this.heat(S.x, S.y);
    if (this.H(id, 0, 60) >= lerp(P.pit.p[0], P.pit.p[1], heat)) return null;
    let wmax = 0;
    for (const t of C.tags) {
      const e = this.edge(id, t);
      if (e && !e.land) wmax = Math.max(wmax, e.hw);
    }
    const room = C.inr - wmax - 48 - 18;
    const R = Math.min(110, room * (0.55 + 0.25 * this.H(id, 0, 61)));
    if (R < 34) return null;
    const off = (room - R) * 0.6 * this.H(id, 0, 62), ang = this.H(id, 0, 63) * Math.PI * 2;
    C.pit = this.blobPoly(S.x + Math.cos(ang) * off, S.y + Math.sin(ang) * off, R, id, 7, 0.3);
    C.pit.kind = 'pit';
    return C.pit;
  }

  // ---- What is near a box ----------------------------------------------------------------------------
  sitesIn(x0, y0, x1, y1) {
    const G = this.P.G, out = [];
    for (let cj = Math.floor(y0 / G + 0.5); cj <= Math.floor(y1 / G + 0.5); cj++) {
      for (let ci = Math.floor(x0 / G + 0.5); ci <= Math.floor(x1 / G + 0.5); ci++) out.push(...this.sitesOf(ci, cj));
    }
    return out;
  }
  // The seams' geometries and the lakes' and pits' polygons whose boxes come within `pad` of the box.
  near(x0, y0, x1, y1, pad = 0) {
    const G = this.P.G, seen = new Set(), geoms = [], polys = [];
    const hit = (b) => b[0] - pad <= x1 && b[2] + pad >= x0 && b[1] - pad <= y1 && b[3] + pad >= y0;
    for (const S of this.sitesIn(x0 - G * 1.1, y0 - G * 1.1, x1 + G * 1.1, y1 + G * 1.1)) {
      const C = this.cell(S.id), b = C.box;
      if (b[0] - 60 - pad > x1 || b[2] + 60 + pad < x0 || b[1] - 60 - pad > y1 || b[3] + 60 + pad < y0) continue;
      // the plate's seams and lakes, listed once (the same objects, in its tags' order)
      if (!C.gs) {
        C.gs = [];
        C.lakes = [];
        for (const t of C.tags) {
          const g = this.geom(S.id, t);
          if (!g) continue;
          C.gs.push(g);
          for (const V of [g.VA, g.VB]) if (V.lake && !C.lakes.includes(V.lake)) C.lakes.push(V.lake);
        }
      }
      for (const g of C.gs) {
        if (seen.has(g)) continue;
        seen.add(g);
        if (hit(g.box)) geoms.push(g);
      }
      for (const L of C.lakes) {
        if (seen.has(L)) continue;
        seen.add(L);
        if (hit(L.box)) polys.push(L);
      }
      const p = this.pit(S.id);
      if (p && hit(p.box)) polys.push(p);
    }
    return { geoms, polys };
  }
  // The walkways whose decks' boxes meet the box (a deck's ends lie within 160 px of its seam's box).
  decksNear(x0, y0, x1, y1) {
    const out = [];
    for (const g of this.near(x0, y0, x1, y1, 160).geoms) {
      if (g.e.crossing !== 'bridge') continue;
      const B = this.bridge(g);
      if (B && B.box[0] <= x1 && B.box[2] >= x0 && B.box[1] <= y1 && B.box[3] >= y0) out.push(B);
    }
    return out;
  }

  // ---- A walkway across a joined river: straight across it at its middle, out to land `inset` px deep
  // on either side. Tried at five places along the seam's middle, the shortest kept; each end on the
  // land of the plate it belongs to (nearer that plate's site). Measured on the land before its chips
  // (they keep 48 px off a walkway's ends).
  bridge(g) {
    if (this.bridges.has(g.key)) return this.bridges.get(g.key);
    const e = g.e, P = this.P;
    let B = null;
    if (e.crossing === 'bridge') {
      const n = g.xs.length, SA = this.site(e.a), SB = this.site(e.b);
      const local = this.near(g.box[0] - 200, g.box[1] - 200, g.box[2] + 200, g.box[3] + 200, P.reach + 2);
      const f0 = (this.H(e.a, e.b, 70) - 0.5) * 0.16;
      for (const f of [0.5, 0.4, 0.6, 0.3, 0.7]) {
        let i = Math.round((f + f0) * (n - 1));
        i = Math.max(3, Math.min(n - 4, i));
        if (n < 8) i = n >> 1;
        const a = Math.max(0, i - 3), b = Math.min(n - 1, i + 3);
        const tx = g.xs[b] - g.xs[a], ty = g.ys[b] - g.ys[a], tl = Math.hypot(tx, ty) || 1;
        let nx = -ty / tl, ny = tx / tl;
        const cx = g.xs[i], cy = g.ys[i];
        if (nx * (SA.x - cx) + ny * (SA.y - cy) < 0) {
          nx = -nx;
          ny = -ny;
        } // +normal toward A's site
        const out = (sg, S) => {
          for (let d = 3; d < 150; d += 3) {
            const x = cx + nx * sg * d, y = cy + ny * sg * d;
            if (this.rawLand(x, y, local) >= P.deck.inset) {
              // and on that plate's side of the seam (nearer its site than the other's)
              const T = S === SA ? SB : SA;
              return (x - S.x) ** 2 + (y - S.y) ** 2 < (x - T.x) ** 2 + (y - T.y) ** 2 ? d : 0;
            }
          }
          return 0;
        };
        const d1 = out(1, SA), d2 = out(-1, SB);
        if (!d1 || !d2) continue;
        if (!B || d1 + d2 < B.len) B = { key: g.key, x1: cx + nx * (d1 + 2), y1: cy + ny * (d1 + 2), x2: cx - nx * (d2 + 2), y2: cy - ny * (d2 + 2), len: d1 + d2 + 4 };
        if (B && B.len < 2 * e.hw + 2 * P.deck.inset + 30) break; // straight across already: good enough
      }
      if (!B) {
        // No straight crossing at the seam's middle reaches land on both sides (a lake, a tiny plate): a
        // walkway from site to site instead, trimmed to the land at each end.
        const dx = SB.x - SA.x, dy = SB.y - SA.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
        const mx = (SA.x + SB.x) / 2, my = (SA.y + SB.y) / 2;
        let d1 = len / 2, d2 = len / 2;
        for (let d = 4; d < len / 2; d += 2) {
          if (this.rawLand(mx - ux * d, my - uy * d, local) >= P.deck.inset) {
            d1 = d;
            break;
          }
        }
        for (let d = 4; d < len / 2; d += 2) {
          if (this.rawLand(mx + ux * d, my + uy * d, local) >= P.deck.inset) {
            d2 = d;
            break;
          }
        }
        B = { key: g.key, x1: mx - ux * (d1 + 2), y1: my - uy * (d1 + 2), x2: mx + ux * (d2 + 2), y2: my + uy * (d2 + 2), len: d1 + d2 + 4, fallback: true };
      }
      B.hw = lerp(P.deck.hw[0], P.deck.hw[1], this.H(e.a, e.b, 71));
      // stone 60, rock 20 (a natural causeway), iron 15, bone 5 (29 October 2026: stone is Act IV's walkway)
      B.material = pickWeighted(P.materials, this.H(e.a, e.b, 72));
      B.a = e.a;
      B.b = e.b;
      const pad = B.hw + 4;
      B.box = [Math.min(B.x1, B.x2) - pad, Math.min(B.y1, B.y2) - pad, Math.max(B.x1, B.x2) + pad, Math.max(B.y1, B.y2) + pad];
    }
    this.bridges.set(g.key, B);
    return B;
  }

  // ---- The field -------------------------------------------------------------------------------------
  // The land's signed px before its chips (no decks), analytic: + on land, TMAX past `reach` of every
  // river (places ask for more, to know how much room a spot has).
  rawLand(x, y, local = null, reach = this.P.reach) {
    const R = reach, { geoms, polys } = local || this.near(x - 1, y - 1, x + 1, y + 1, R + 2);
    let o = R > TMAX ? R : TMAX;
    for (const g of geoms) {
      const b = g.box;
      if (x < b[0] - R || x > b[2] + R || y < b[1] - R || y > b[3] + R) continue;
      const { xs, ys, hw } = g.river;
      for (let k = 0; k < xs.length; k++) {
        const dx = x - xs[k], dy = y - ys[k], rr = hw[k] + R;
        if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > rr * rr) continue;
        const v = Math.sqrt(d2) - hw[k];
        if (v < o) o = v;
      }
    }
    for (const p of polys) {
      if (x < p.box[0] - R || x > p.box[2] + R || y < p.box[1] - R || y > p.box[3] + R) continue;
      const v = Math.hypot(x - p.x, y - p.y) < rinOf(p) - DEEP_IN ? -DEEP_IN : polySdf(p.xs, p.ys, x, y);
      if (v < R && v < o) o = v;
    }
    const top = reach > TMAX ? reach : TMAX;
    return o < -TMAX ? -TMAX : o > top ? top : o;
  }
  // The land's signed px with its chips, analytic: the same numbers terrain() stamps at its lattice points.
  landAt(x, y, reach = this.P.reach) {
    const C = this.P.chip, local = this.near(x - 1, y - 1, x + 1, y + 1, Math.max(reach, C.end[1]) + 2), v = this.rawLand(x, y, local, reach);
    if (!(v < C.top && v > -40)) return v;
    const seams = local.geoms.filter((g) => g.e.land);
    if (!this.maskAt(x, y, seams, null)) return v;
    const ends = this.endsNear(x - C.end[1], y - C.end[1], x + C.end[1], y + C.end[1]);
    const out = v - this.chipAt(x, y, v, this.maskAt(x, y, seams, ends));
    return out < -TMAX ? -TMAX : out;
  }
  // The points chips keep off: walkways' ends and fords' necks near a box.
  endsNear(x0, y0, x1, y1) {
    const out = [];
    for (const B of this.decksNear(x0, y0, x1, y1)) out.push(B.x1, B.y1, B.x2, B.y2);
    for (const g of this.near(x0, y0, x1, y1, 2).geoms) if (g.neck) out.push(g.neck[0], g.neck[1]);
    return out;
  }
  // How much of a chip is let bite at (x, y): 0 within seam[0] of a closed seam's line or end[0] of a
  // walkway's end or a ford's neck, ramping to 1.
  maskAt(x, y, seams, ends) {
    const C = this.P.chip;
    let d2 = Infinity;
    const rs = C.seam[1];
    for (const g of seams) {
      const b = g.box;
      if (x < b[0] - rs || x > b[2] + rs || y < b[1] - rs || y > b[3] + rs) continue;
      for (let k = 0; k < g.xs.length; k++) {
        const dx = x - g.xs[k], dy = y - g.ys[k], q = dx * dx + dy * dy;
        if (q < d2) d2 = q;
      }
    }
    let m = d2 === Infinity ? 1 : ss(C.seam[0], C.seam[1], Math.sqrt(d2));
    if (!m || !ends) return m;
    let e2 = Infinity;
    for (let k = 0; k < ends.length; k += 2) {
      const dx = x - ends[k], dy = y - ends[k + 1], q = dx * dx + dy * dy;
      if (q < e2) e2 = q;
    }
    if (e2 !== Infinity) m *= ss(C.end[0], C.end[1], Math.sqrt(e2));
    return m;
  }
  // A chip's bite at (x, y), the land there v: a rotated, stretched Voronoi of `cell` px, each cell's
  // bite by hash, blended across its borders; full where the land is under 0, none from `top` px in,
  // easing off into the lava's depth (so lakes stay flat).
  chipAt(x, y, v, m) {
    if (!m) return 0;
    const C = this.P.chip, w = ss(C.top, 0, v) * ss(-40, -8, v);
    if (!w) return 0;
    const cs = Math.cos(C.rot), sn = Math.sin(C.rot), u = (x * cs + y * sn) / C.stretch, t = -x * sn + y * cs;
    const i0 = Math.floor(u / C.cell), j0 = Math.floor(t / C.cell);
    let d1 = Infinity, d2 = Infinity, b1 = 0, b2 = 0;
    for (let j = j0 - 1; j <= j0 + 1; j++) {
      for (let i = i0 - 1; i <= i0 + 1; i++) {
        const px = (i + this.H(i, j, 80)) * C.cell, py = (j + this.H(i, j, 81)) * C.cell, d = Math.hypot(u - px, t - py);
        const b = C.max * ss(0.2, 1, this.H(i, j, 82));
        if (d < d1) {
          d2 = d1;
          b2 = b1;
          d1 = d;
          b1 = b;
        } else if (d < d2) {
          d2 = d;
          b2 = b;
        }
      }
    }
    const k = 0.5 + 0.5 * ss(0, 2 * C.blend, d2 - d1);
    return (b1 * k + b2 * (1 - k)) * w * m;
  }
  // The top of the decks at (x, y) (+ on one), as terrain() stamps them.
  deckAt(x, y) {
    let o = -TMAX;
    for (const B of this.decksNear(x, y, x, y)) {
      if (x < B.box[0] || x > B.box[2] || y < B.box[1] || y > B.box[3]) continue;
      const v = deckSdf(B, x, y);
      if (v > o) o = v;
    }
    return clampT(o);
  }
  openAt(x, y) {
    return clampT(Math.max(this.landAt(x, y), this.deckAt(x, y)));
  }
  patchAt() {
    return -TMAX;
  }
  // Whether a tree or a stone of the scatter may stand at (x, y): on land 12 px from any edge, off the
  // decks, read from the cached lattice (29 October 2026: the analytic field is too dear per tree).
  canStand(x, y) {
    const tc = this.tcOf(Math.floor(x / TCHUNK), Math.floor(y / TCHUNK));
    return sampleField(tc, tc.open, x, y, TMAX) >= 12 && sampleField(tc, tc.deck, x, y, -TMAX) <= -4;
  }
  tcOf(cx, cy) {
    return this.tcs.get((cx + 32768) * 65536 + (cy + 32768)) || this.terrain(cx, cy);
  }

  // A chunk's TerrainChunk (islands.js's shape): `open` (land and decks), `deck`, the walkways and the
  // whole-lava tiles; and for the painter (topology/abyss.js) its fissures `seams` ({ xs, ys, glow }:
  // glow 1 where a line carries on from lava, else a hash in [0, 1)), the plates' `sites` within 400 px
  // ({ id, x, y, n }: the split level n 1-3) and the round places' `rounds` within 300 px ({ kind, x, y,
  // r }: the start, shrines, crypts and landmarks, where the flagstones are laid).
  terrain(cx, cy) {
    const key = (cx + 32768) * 65536 + (cy + 32768), had = this.tcs.get(key);
    if (had) return had;
    const x0 = cx * TCHUNK, y0 = cy * TCHUNK, x1 = x0 + TCHUNK, y1 = y0 + TCHUNK, R = this.P.reach, C = this.P.chip;
    const land = new Float32Array(TN * TN).fill(TMAX);
    const { geoms, polys } = this.near(x0, y0, x1, y1, Math.max(R, C.end[1]) + 2);
    for (const g of geoms) {
      const { xs, ys, hw } = g.river;
      for (let k = 0; k < xs.length; k++) {
        const px = xs[k], py = ys[k], h = hw[k], rr = h + R;
        if (px + rr < x0 || px - rr > x1 || py + rr < y0 || py - rr > y1) continue;
        const i0 = Math.max(0, Math.ceil((px - rr - x0) / TSTEP)), i1 = Math.min(TN - 1, Math.floor((px + rr - x0) / TSTEP));
        const j0 = Math.max(0, Math.ceil((py - rr - y0) / TSTEP)), j1 = Math.min(TN - 1, Math.floor((py + rr - y0) / TSTEP));
        const r2 = rr * rr;
        for (let j = j0; j <= j1; j++) {
          const dy = y0 + j * TSTEP - py, dy2 = dy * dy, row = j * TN;
          for (let i = i0; i <= i1; i++) {
            const dx = x0 + i * TSTEP - px, d2 = dx * dx + dy2;
            if (d2 > r2) continue;
            const v = Math.sqrt(d2) - h;
            if (v < land[row + i]) land[row + i] = v;
          }
        }
      }
    }
    for (const p of polys) {
      const b = p.box;
      if (b[0] - R > x1 || b[2] + R < x0 || b[1] - R > y1 || b[3] + R < y0) continue;
      const i0 = Math.max(0, Math.ceil((b[0] - R - x0) / TSTEP)), i1 = Math.min(TN - 1, Math.floor((b[2] + R - x0) / TSTEP));
      const j0 = Math.max(0, Math.ceil((b[1] - R - y0) / TSTEP)), j1 = Math.min(TN - 1, Math.floor((b[3] + R - y0) / TSTEP));
      // deep inside (more than DEEP_IN px in from the nearest its rim ever comes) the lake is just deep
      const rin = rinOf(p);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const wx = x0 + i * TSTEP, wy = y0 + j * TSTEP, c = j * TN + i;
          if (Math.hypot(wx - p.x, wy - p.y) < rin - DEEP_IN) {
            if (-DEEP_IN < land[c]) land[c] = -DEEP_IN;
            continue;
          }
          const v = polySdf(p.xs, p.ys, wx, wy);
          if (v < R && v < land[c]) land[c] = v;
        }
      }
    }
    for (let c = 0; c < land.length; c++) land[c] = land[c] < -TMAX ? -TMAX : land[c] > TMAX ? TMAX : land[c];
    // The chips, at each lattice point as landAt works them out.
    const ends = this.endsNear(x0 - C.end[1], y0 - C.end[1], x1 + C.end[1], y1 + C.end[1]);
    const seams = geoms.filter((g) => g.e.land);
    for (let j = 0; j < TN; j++) {
      for (let i = 0; i < TN; i++) {
        const c = j * TN + i, v = land[c];
        if (!(v < C.top && v > -40)) continue;
        const x = x0 + i * TSTEP, y = y0 + j * TSTEP, o = v - this.chipAt(x, y, v, this.maskAt(x, y, seams, ends));
        land[c] = o < -TMAX ? -TMAX : o;
      }
    }
    // Decks: stamped into `deck` and (as islands.js) into `open`.
    const open = Float32Array.from(land), bridges = [];
    let deck = null;
    for (const B of this.decksNear(x0, y0, x1, y1)) {
      if (!deck) deck = new Float32Array(TN * TN).fill(-TMAX);
      const i0 = Math.max(0, Math.ceil((B.box[0] - x0) / TSTEP)), i1 = Math.min(TN - 1, Math.floor((B.box[2] - x0) / TSTEP));
      const j0 = Math.max(0, Math.ceil((B.box[1] - y0) / TSTEP)), j1 = Math.min(TN - 1, Math.floor((B.box[3] - y0) / TSTEP));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const v = deckSdf(B, x0 + i * TSTEP, y0 + j * TSTEP), c = j * TN + i;
          if (v > deck[c]) deck[c] = v;
          if (v > open[c]) open[c] = v;
        }
      }
      // as islands.js hands its decks to the painter: points every 4 px from end to end
      const n = Math.max(2, Math.ceil(B.len / 4) + 1), xs = new Float32Array(n), ys = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        xs[k] = B.x1 + ((B.x2 - B.x1) * k) / (n - 1);
        ys[k] = B.y1 + ((B.y2 - B.y1) * k) / (n - 1);
      }
      bridges.push({ key: B.key, xs, ys, hw: B.hw, material: B.material, len: B.len });
    }
    let o = open;
    const allGap = settle(o, -TMAX);
    let allLand = true;
    for (let c = 0; c < o.length && allLand; c++) if (o[c] < TMAX) allLand = false;
    if (allGap) o = DEEP;
    else if (allLand) o = null;
    if (deck && settle(deck, -TMAX)) deck = null;
    // The 32 px tiles wholly lava (all nine lattice points of the tile under -3, none on a deck): the
    // ones draw.js animates with the crypts' baked lava; the rest stay as painted (islands.js's rule).
    let lava = false, lavaTiles = null;
    if (this.variant === 'lava' && o) {
      const list = [];
      for (let ty = 0; ty < 8; ty++) {
        for (let tx = 0; tx < 8; tx++) {
          let whole = true;
          for (let b = 0; b <= 8 && whole; b += 4) {
            for (let a = 0; a <= 8 && whole; a += 4) {
              const c = (ty * 8 + b) * TN + tx * 8 + a;
              if (o[c] >= -3 || (deck && deck[c] >= -3)) whole = false;
            }
          }
          if (whole) list.push(tx, ty);
        }
      }
      for (let c = 0; c < o.length && !lava; c++) if (o[c] < 0) lava = true;
      if (list.length) lavaTiles = Int8Array.from(list);
    }
    // For the painter: the fissures over the chunk, the plates' sites round it, the round places.
    const seamsOut = [], m = 8;
    for (const g of this.near(x0, y0, x1, y1, m).geoms) {
      for (const f of g.fis) if (f.box[0] - m <= x1 && f.box[2] + m >= x0 && f.box[1] - m <= y1 && f.box[3] + m >= y0) seamsOut.push({ xs: f.xs, ys: f.ys, glow: f.glow });
    }
    const sites = [];
    for (const S of this.sitesIn(x0 - 400, y0 - 400, x1 + 400, y1 + 400)) if (S.x >= x0 - 400 && S.x <= x1 + 400 && S.y >= y0 - 400 && S.y <= y1 + 400) sites.push({ id: S.id, x: S.x, y: S.y, n: S.n });
    const t = {
      cx, cy, x0, y0, open: o, patch: null, deck, road: null, roadHw: null,
      blocked: this.blocked, patchKind: 0, patches: [], bridges, pools: [], caves: [],
      lava, lavaTiles, any: true, seams: seamsOut, sites, rounds: this.roundsNear(x0 - 300, y0 - 300, x1 + 300, y1 + 300),
      // (the land without the decks, for the painter: the lava runs on under a walkway; abyss.js)
      land: o === null || o === DEEP ? o : land,
    };
    // at most 256 kept (each is made again the same when asked for again)
    if (this.tcs.size >= 256) this.tcs.delete(this.tcs.keys().next().value);
    this.tcs.set(key, t);
    return t;
  }

  // ---- Places (scratchpad hell3/free/places.mjs) -----------------------------------------------------
  // Each kind has its own jittered lattice; each lattice cell picks, among the plates whose sites lie
  // within `pick` px of its point, the one with the most room (px from its best point to the nearest
  // lava or void, analytic), if that is enough. A plate serves one place: crypts choose first, then
  // shrines, then landmarks; never the start's plate nor a plate with a pit.
  // A plate's best point and its room: the site, the cell's centroid, and points between, the one
  // farthest from any lava (a pit, a rift, a channel).
  roomOf(id) {
    let r = this.room.get(id);
    if (r) return r;
    const C = this.cell(id), S = C.site;
    let cx = 0, cy = 0;
    for (let k = 0; k < C.xs.length; k++) {
      cx += C.xs[k];
      cy += C.ys[k];
    }
    cx /= C.xs.length;
    cy /= C.xs.length;
    r = { x: S.x, y: S.y, room: -Infinity };
    const lx0 = Math.min(S.x, cx) - 25, ly0 = Math.min(S.y, cy) - 25, local = this.near(lx0, ly0, Math.max(S.x, cx) + 25, Math.max(S.y, cy) + 25, 202);
    for (const t of [0, 0.33, 0.66, 1]) {
      for (const [ox, oy] of [[0, 0], [24, 0], [-24, 0], [0, 24], [0, -24]]) {
        // the land before its chips (they bite only where it is under 24 px: no place stands there)
        const x = S.x + (cx - S.x) * t + ox, y = S.y + (cy - S.y) * t + oy, o = this.rawLand(x, y, local, 200);
        if (o > r.room) r = { x, y, room: o };
      }
    }
    this.room.set(id, r);
    return r;
  }
  pickIn(kind, u, v, taken) {
    const P = this.P.places[kind];
    if (P.p !== undefined && this.H(u, v, 900 + kind.length) >= P.p) return null;
    const px = u * P.cell + P.off[0] + (this.H(u, v, 901) - 0.5) * 2 * P.jit, py = v * P.cell + P.off[1] + (this.H(u, v, 902) - 0.5) * 2 * P.jit;
    let best = null;
    for (const S of this.sitesIn(px - P.pick, py - P.pick, px + P.pick, py + P.pick)) {
      if (S.id === ROOT || Math.hypot(S.x - px, S.y - py) > P.pick || (taken && taken(S.id))) continue;
      if (this.pit(S.id)) continue;
      const r = this.roomOf(S.id);
      if (r.room >= P.room && (!best || r.room > best.room || (r.room === best.room && S.id < best.id))) best = { kind, id: S.id, x: r.x, y: r.y, room: r.room, u, v };
    }
    return best;
  }
  // every place of a kind whose lattice cell's pick lies in the box (a cell's pick stands within its
  // jitter and pick radius of its lattice point: only those cells are asked)
  of(kind, x0, y0, x1, y1) {
    const P = this.P.places[kind], out = [], m = P.jit + P.pick + 1;
    for (let v = Math.floor((y0 - m - P.off[1]) / P.cell); v <= Math.ceil((y1 + m - P.off[1]) / P.cell); v++) {
      for (let u = Math.floor((x0 - m - P.off[0]) / P.cell); u <= Math.ceil((x1 + m - P.off[0]) / P.cell); u++) {
        const key = kind + u + ',' + v;
        let p = this.picks.get(key);
        if (p === undefined) {
          p = this.pick(kind, u, v);
          this.picks.set(key, p);
        }
        if (p && p.x >= x0 && p.x < x1 && p.y >= y0 && p.y < y1) out.push(p);
      }
    }
    return out;
  }
  pick(kind, u, v) {
    // a plate a crypt took near this lattice point is not offered to a shrine, nor either to a landmark
    const P = this.P.places[kind], cx = u * P.cell + P.off[0], cy = v * P.cell + P.off[1], R = P.pick + P.jit + 500;
    const ids = new Set(), order = ['crypt', 'shrine', 'landmark'];
    for (const k of order.slice(0, order.indexOf(kind))) for (const q of this.of(k, cx - R, cy - R, cx + R, cy + R)) ids.add(q.id);
    // and the start's camp keeps its plate and the shrines and crypts keep 350 px off the start
    const p = this.pickIn(kind, u, v, (id) => ids.has(id));
    if (p && kind !== 'landmark' && Math.hypot(p.x, p.y) < 350) return null;
    return p;
  }
  // The start: the camp at islands.js's offsets round the start's site (the fire to the south-east,
  // the lantern north-east, the waystone south-west) and a crypt a step away to the north-west, its
  // door facing the plaza, a walk up to its steps. The painter lays the Sanctuary's tiles under it.
  startPlace() {
    let P = this.cache.get('start');
    if (P) return P;
    const x = 0, y = 0;
    P = startCamp(x, y, { fire: [x + 58, y + 64], lamp: [x + 62, y - 50], stone: [x - 64, y + 50] });
    const a = -Math.PI / 2 - 0.62, cxp = Math.round(x + Math.cos(a) * 78), cyp = Math.round(y + Math.sin(a) * 78);
    P.crypt = { key: '0,0', x: cxp, y: cyp, depth: 1, face: 'island' };
    P.path = walkPath(x, y, 40, x, y, cxp, cyp + 14, 7, 0);
    this.cache.set('start', P);
    return P;
  }
  start() {
    return this.startPlace().hero;
  }
  // A picked place as layoutChunk takes it: a shrine (its plaza and lanterns) or a crypt (its door on
  // the north side of the room point, facing south, a walk up to its steps, a lantern either side).
  // Crypt keys are two odd integers (game.js cryptName), so none is the start's '0,0'.
  placeObj(p) {
    const key = 'p' + p.kind + p.u + ',' + p.v;
    let P = this.cache.get(key);
    if (P) return P;
    const x = Math.round(p.x), y = Math.round(p.y);
    if (p.kind === 'shrine') P = shrinePlace(`${p.u},${p.v}`, p.u, p.v, x, y, this.shrineType(p.u, p.v));
    else {
      const cxp = x, cyp = y - 36, k = `${2 * p.u + 1},${2 * p.v + 1}`;
      P = { x, y, i: p.u, j: p.v, key: k, kind: 'crypt', props: [], clear: { x, y: y - 18, r: 120 } };
      P.crypt = { key: k, x: cxp, y: cyp, depth: Math.max(1, Math.round(Math.max(Math.abs(cxp), Math.abs(cyp)) / 1800)), face: 'island' };
      P.path = walkPath(x, y + 8, 26, x, y + 8, cxp, cyp + 14, Math.floor(this.H(p.u, p.v, 35) * 1e6), 8);
      const add = adder(P);
      add('lantern', cxp - 24, cyp + 5, { light: ['warm', 60] });
      add('lantern', cxp + 24, cyp + 5, { light: ['warm', 60] });
    }
    this.cache.set(key, P);
    return P;
  }
  shrineType(u, v) {
    return this.order[(((u + 3 * v) % 5) + 5) % 5];
  }
  // A landmark at its room point (the Darkwood's kinds, dressed as darkwood.js dresses them), with no
  // footpath: the Abyss has no causeways now.
  landmarkObj(p) {
    const key = 'l' + p.u + ',' + p.v;
    let L = this.cache.get(key);
    if (L) return L;
    const x = Math.round(p.x), y = Math.round(p.y), kind = LANDMARK_KINDS[Math.floor(this.H(p.u, p.v, 9) * LANDMARK_KINDS.length)];
    L = dress({ x, y, i: p.u, j: p.v, kind, props: [], clear: { x, y, r: 100 } }, this.rngOf(p.u, p.v, 10), x);
    this.cache.set(key, L);
    return L;
  }
  // A walkway's heads: posts either side of the deck at each end (stone or iron; none on a rock
  // causeway: places.js bridgehead), a brazier at one walkway in three.
  heads(B) {
    const key = 'h' + B.key;
    let hs = this.cache.get(key);
    if (hs) return hs;
    const dx = B.x2 - B.x1, dy = B.y2 - B.y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const fire = this.H(B.a, B.b, 73) < 1 / 3, side = this.H(B.a, B.b, 74) < 0.5, i = 2e6 + (B.a % 1e5) * 2, j = B.b % 1e5;
    hs = [bridgehead(i, j, B.x1, B.y1, nx, ny, B.hw, B.material, fire && side), bridgehead(i + 1, j, B.x2, B.y2, nx, ny, B.hw, B.material, fire && !side)];
    this.cache.set(key, hs);
    return hs;
  }
  // The round places within a box, for the painter's flagstones (150-300 px fields).
  roundsNear(x0, y0, x1, y1) {
    const out = [];
    if (x0 <= 0 && x1 >= 0 && y0 <= 0 && y1 >= 0) out.push({ kind: 'start', x: 0, y: 0, r: 170 });
    for (const kind of ['crypt', 'shrine']) for (const p of this.of(kind, x0, y0, x1, y1)) out.push({ kind, x: Math.round(p.x), y: Math.round(p.y), r: 150 + Math.round(150 * this.H(p.u, p.v, 96)) });
    for (const p of this.of('landmark', x0, y0, x1, y1)) out.push({ kind: this.landmarkObj(p).kind, x: Math.round(p.x), y: Math.round(p.y), r: 150 + Math.round(150 * this.H(p.u, p.v, 97)) });
    return out;
  }

  // ---- The interface (topology/index.js) -------------------------------------------------------------
  features(bx0, by0, bx1, by1) {
    const paths = [], places = [], landmarks = [];
    const near = (x, y, m) => x > bx0 - m && x < bx1 + m && y > by0 - m && y < by1 + m;
    const meets = (p) => p.minx < bx1 && p.maxx > bx0 && p.miny < by1 && p.maxy > by0;
    const take = (P) => {
      const n = near(P.x, P.y, 260) || (P.crypt && near(P.crypt.x, P.crypt.y, 260));
      if (n) places.push(P);
      if (n || meets(P.path)) paths.push(P.path);
    };
    take(this.startPlace());
    for (const kind of ['crypt', 'shrine']) for (const p of this.of(kind, bx0 - 300, by0 - 300, bx1 + 300, by1 + 300)) take(this.placeObj(p));
    for (const p of this.of('landmark', bx0 - 200, by0 - 200, bx1 + 200, by1 + 200)) {
      const L = this.landmarkObj(p);
      if (near(L.x, L.y, 200)) landmarks.push(L);
    }
    for (const B of this.decksNear(bx0 - 200, by0 - 200, bx1 + 200, by1 + 200)) for (const h of this.heads(B)) if (near(h.x, h.y, 200)) landmarks.push(h);
    return { paths, places, landmarks };
  }
  shrinesNear(x, y, r) {
    const out = [];
    for (const p of this.of('shrine', x - r, y - r, x + r, y + r)) {
      const P = this.placeObj(p);
      if ((P.x - x) ** 2 + (P.y - y) ** 2 <= r * r) out.push({ key: P.key, x: P.x, y: P.y, type: P.type });
    }
    return out;
  }
  cryptsNear(x, y, r) {
    const out = [], S = this.startPlace().crypt;
    if ((S.x - x) ** 2 + (S.y - y) ** 2 <= r * r) out.push(S);
    for (const p of this.of('crypt', x - r - 60, y - r - 60, x + r + 60, y + r + 60)) {
      const c = this.placeObj(p).crypt;
      if ((c.x - x) ** 2 + (c.y - y) ** 2 <= r * r) out.push(c);
    }
    return out;
  }
  patchesNear() {
    return [];
  }
  // Where what fell beyond the land's reach is carried (Forest.floorNear's last resort): the room point
  // of the anchor of the node under (x, y) (its plate nearest the start), always dry.
  home(x, y) {
    const G = this.P.G;
    let best = null, bd = Infinity;
    for (const S of this.sitesIn(x - G * 1.5, y - G * 1.5, x + G * 1.5, y + G * 1.5)) {
      const d = (S.x - x) ** 2 + (S.y - y) ** 2;
      if (d < bd || (d === bd && S.id < best.id)) {
        bd = d;
        best = S;
      }
    }
    const r = this.roomOf(this.node(best.id).anchor);
    return { x: Math.round(r.x), y: Math.round(r.y) };
  }
  // Builds the plates, seams, nodes, walkways and each plate's room (what the places pick by) of the ring
  // `warm` px round (x, y) ahead of need, for at most `ms` a call (Forest.update, once a frame), so the
  // hero walking never meets a first build all at once: out to 1,600 px, not 1,000, as a crypt's pick
  // reaches 720 px from its lattice point and a chunk's places are asked for 300 px round it. Only
  // caches are filled: nothing it makes differs from what is made on demand.
  prewarm(x, y, ms) {
    const G = this.P.G, key = Math.round(x / G) * 65536 + Math.round(y / G);
    if (key !== this.warmKey) {
      this.warmKey = key;
      this.warmAt = 0;
      const [r0, r1] = this.P.warm;
      this.warmList = this.sitesIn(x - r1, y - r1, x + r1, y + r1)
        .map((S) => [Math.hypot(S.x - x, S.y - y), S.id])
        .filter(([d, id]) => d >= r0 && d <= r1 && !this.warm.has(id))
        .sort((a, b) => a[0] - b[0])
        .map((q) => q[1]);
    }
    if (this.warmAt >= this.warmList.length) return;
    const t0 = now();
    while (this.warmAt < this.warmList.length) {
      const id = this.warmList[this.warmAt++];
      if (this.warm.has(id)) continue;
      for (const t of this.cell(id).tags) {
        const g = this.geom(id, t);
        if (g && g.e.crossing === 'bridge') this.bridge(g);
      }
      this.pit(id);
      this.roomOf(id);
      this.warm.add(id);
      if (now() - t0 >= ms) break;
    }
  }
  trim(x, y) {
    const far = (px, py) => Math.abs(px - x) > KEEP || Math.abs(py - y) > KEEP;
    const G = this.P.G;
    for (const k of this.coarse.keys()) {
      const cj = ((k % 65536) + 65536 + 32768) % 65536 - 32768, ci = Math.round((k - cj) / 65536);
      if (far(ci * G, cj * G)) this.coarse.delete(k);
    }
    for (const [k, C] of this.cells) if (far(C.site.x, C.site.y)) this.cells.delete(k);
    for (const k of this.masses.keys()) {
      const S = this.siteXY(k);
      if (far(S[0], S[1])) this.masses.delete(k);
    }
    for (const [k, N] of this.nodes) {
      const S = this.siteXY(k);
      if (far(S[0], S[1])) this.nodes.delete(k);
    }
    for (const [k, e] of this.edges) if (!e || far(e.V1[0], e.V1[1])) this.edges.delete(k);
    for (const [k, V] of this.verts) if (far(V.x, V.y)) this.verts.delete(k);
    for (const [k, v] of this.vp) if (far(v[0], v[1])) this.vp.delete(k);
    for (const [k, g] of this.geoms) if (!g || far(g.xs[0], g.ys[0])) this.geoms.delete(k);
    for (const [k, B] of this.bridges) if (!B || far(B.x1, B.y1)) this.bridges.delete(k);
    for (const [k, r] of this.room) if (far(r.x, r.y)) this.room.delete(k);
    for (const [k, p] of this.picks) if (!p || far(p.x, p.y)) this.picks.delete(k);
    for (const [k, P] of this.cache) {
      const q = Array.isArray(P) ? P[0] : P;
      if (far(q.x, q.y)) this.cache.delete(k);
    }
    for (const k of this.warm) {
      const S = this.siteXY(k);
      if (far(S[0], S[1])) this.warm.delete(k);
    }
    for (const [k, t] of this.tcs) if (Math.abs(t.x0 + 128 - x) > 1600 || Math.abs(t.y0 + 128 - y) > 1600) this.tcs.delete(k);
  }
  // A site's coarse cell's middle (cheap, for trim()).
  siteXY(id) {
    const k = id % 16, q = (id - k) / 16, cj = (q % 8192) - 4096, ci = (q - (cj + 4096)) / 8192 - 4096;
    return [ci * this.P.G, cj * this.P.G];
  }
}

// A straight deck's top at (x, y): its half width less the distance to its middle line.
function deckSdf(B, x, y) {
  const ex = B.x2 - B.x1, ey = B.y2 - B.y1, el = ex * ex + ey * ey, wx = x - B.x1, wy = y - B.y1;
  let u = (wx * ex + wy * ey) / el;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return B.hw - Math.hypot(wx - ex * u, wy - ey * u);
}

export { ROOT };
