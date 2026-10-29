// The Abyss's floor (29 October 2026), as topology/stone.js is the Sunscorch's: every pixel of a chunk of
// the fault plates (topology/plates.js) painted here, no Darkwood ground under it (paint.js groundRows).
// The owner's words that day: "the setup should be more like grey and the floow should resemble act 4 of
// diablo 2. Also, the patches of land should have a better algorithm that makes it look just better than
// what we have now because the patches rn look silly."
//
// So the land is grey, cracked Act IV rock in the style study's palette (biomes/hell.js terrain; our own
// pixels, nothing of the game's art): bare rock broken into slabs (most of it), each plate a shade of its
// own and one in five leaning to slate; broken flagstone fields round the places (the start, the shrines,
// the crypts, the landmarks), at the walkways' landings and here and there on their own, the stones going
// missing toward a field's edge and then rubble; long hairline cracks; the plates' closed seams as glowing
// fissures in stretches (the rest dark joints), never lava's colours, so a line never reads as a river;
// ash dithered over it, bone flecks and a few dried bloodstains. At the edges: the lava's scorch on the
// rock, its cooled crust and ember crust, a cliff face under every south rim (strata, its foot lit by the
// lava; over the void, fading into the dark); the lava's flow, redder at its shores, a cooled floe here
// and there; the void black with a speck. The walkways in flat-ended stone slabs, iron plates or bone, the
// rock causeways as rock with a rim and a south face, each casting its shade; and under the start's camp
// the Sanctuary's tiled plaza with its inlaid border.
//
// Pure, as paint.js: slow noise on the chunk's 8 px grid and the lattice's 4 px one, every cell pattern
// (the slabs, the cracks, the floes) from sites laid one per cell of the world, the seams from the plates'
// own polylines (tc.seams), so chunks painted apart meet without a seam. No noise call per pixel.

import { fbm, valueNoise, hash2 } from '../../engine/util.js';
import { TN, TSTEP, TMAX, TCHUNK } from './terrain.js';

const CH = TCHUNK, N8 = CH / 8 + 1;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
// The flagstones' threshold on the paving field (its slow noise, lifted round the places): above it,
// paving; a little under it, the rubble where the paving gives out.
const PV0 = 0.6;
// The slabs of the bare rock (a warped Voronoi, SLAB px cells, stretched SY across so they lie wide), the
// hairline cracks' (HAIR px) and the lava's floes' (FLOE px).
const SLAB = 34, SY = 1.2, HAIR = 55, FLOE = 20;
// How far a seam's line reaches into the rock round it (its scorch), px.
const SEAM_R = 6;
// The share of the seams lit (a seam's glow hash over GLOW): 45%.
const GLOW = 0.55;
// The Sanctuary's plaza under the start's camp: TILE px tiles, PW x PH of them.
const TILE = 16, PW = 9, PH = 7;
// The paving round a place (px, the field lifted by up to LIFT at its middle, nothing past r).
const PAVE_R = { start: 200, crypt: 180, shrine: 150, landmark: 140, bridgehead: 34 };
const LIFT = 0.32;

// Scratch made once and reused for every chunk.
// (FD, FG: the seams, mapSeams; LANDM: the open rock, where bones and blood may lie; FLOOR: a deck's
// pixel that showed the floor below, a rock causeway on the land or past its broken edge.)
const FD = new Float32Array(CH * CH), FG = new Uint8Array(CH * CH), LANDM = new Uint8Array(CH * CH), FLOOR = new Uint8Array(CH * CH), FLM = new Uint8Array(CH * CH);
const LF = new Float32Array(TN * TN), WA = new Float32Array(TN * TN), WB = new Float32Array(TN * TN), JT = new Float32Array(TN * TN);
// The slabs' and the hairline cracks' cells at the lattice's points (SLA, HLA: the nearest site; SLE,
// HLE: how far from its edge). A pixel whose four lattice points lie in one cell lies in it too (a cell
// is convex, and the warp moves the pixel within what its points span), its edge's distance theirs
// between them; else it is the nearest of their (two to four) sites (among), never a search of nine.
const SLA = new Int32Array(TN * TN), SLE = new Float32Array(TN * TN), HLA = new Int32Array(TN * TN), HLE = new Float32Array(TN * TN);
let ALONG = null, ACROSS = null, NEAR = null, WIDE = null, MAT = null, DECKS = null;
const BOX = [0, 0, 0, 0];

const R = (c) => c & 255, G = (c) => (c >>> 8) & 255, B = (c) => (c >>> 16) & 255;
const rgb = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) | 0;
const mix = (c, d, t) => rgb((R(c) + (R(d) - R(c)) * t) | 0, (G(c) + (G(d) - G(c)) * t) | 0, (B(c) + (B(d) - B(c)) * t) | 0);
const shade = (c, k) => rgb((R(c) * k) | 0, (G(c) * k) | 0, (B(c) * k) | 0);
const pick = (r, t) => r[t < 0 ? 0 : t >= r.length ? r.length - 1 : t | 0];

// A field on the chunk's 8 px grid (33 x 33) and on the lattice's 4 px one (65 x 65).
function grid8(x0, y0, fn) {
  const a = new Float32Array(N8 * N8);
  for (let j = 0; j < N8; j++) for (let i = 0; i < N8; i++) a[j * N8 + i] = fn(x0 + i * 8, y0 + j * 8);
  return a;
}
const at8 = (a, x, y) => {
  const i = x >> 3, j = y >> 3, tx = (x & 7) * 0.125, ty = (y & 7) * 0.125, c = j * N8 + i;
  return (a[c] + (a[c + 1] - a[c]) * tx) * (1 - ty) + (a[c + N8] + (a[c + N8 + 1] - a[c + N8]) * tx) * ty;
};
const at4 = (a, x, y) => {
  const i = x >> 2, j = y >> 2, tx = (x & 3) * 0.25, ty = (y & 3) * 0.25, c = j * TN + i;
  return (a[c] + (a[c + 1] - a[c]) * tx) * (1 - ty) + (a[c + TN] + (a[c + TN + 1] - a[c + TN]) * tx) * ty;
};

// A row y of a field on the 8 px grid (row8) or the 4 px lattice (row4), every pixel's value, into out.
const RW = new Float32Array(CH), RP = new Float32Array(CH), RA = new Float32Array(CH), RH = new Float32Array(CH), RT = new Float32Array(CH), RF = new Float32Array(CH);
const RWA = new Float32Array(CH), RWB = new Float32Array(CH);
function row8(a, y, out) {
  const j = y >> 3, ty = (y & 7) * 0.125;
  for (let i = 0; i < N8 - 1; i++) {
    const c = j * N8 + i, l = a[c] + (a[c + N8] - a[c]) * ty, r = a[c + 1] + (a[c + N8 + 1] - a[c + 1]) * ty, d = (r - l) * 0.125;
    for (let q = 0, x = i * 8; q < 8; q++) out[x + q] = l + d * q;
  }
}
function row4(a, y, out) {
  const j = y >> 2, ty = (y & 3) * 0.25;
  for (let i = 0; i < TN - 1; i++) {
    const c = j * TN + i, l = a[c] + (a[c + TN] - a[c]) * ty, r = a[c + 1] + (a[c + TN + 1] - a[c + 1]) * ty, d = (r - l) * 0.25;
    for (let q = 0, x = i * 4; q < 4; q++) out[x + q] = l + d * q;
  }
}

// ---- Cells laid one per cell of the world (a Worley pattern's sites), for the chunk ----------------
// The sites of the cells (cell px, the y axis stretched by sy) that the chunk's pixels can reach, each
// jittered `jit` of its cell by its hash: X, Y (in the stretched space), GI (its cell's id in the world).
function cells(cell, sy, x0, y0, seed, jit, pad) {
  const ci0 = Math.floor((x0 - pad) / cell) - 1, ci1 = Math.floor((x0 + CH + pad) / cell) + 1;
  const cj0 = Math.floor(((y0 - pad) * sy) / cell) - 1, cj1 = Math.floor(((y0 + CH + pad) * sy) / cell) + 1;
  const nw = ci1 - ci0 + 1, nh = cj1 - cj0 + 1, n = nw * nh;
  const W = { cell, ci0, cj0, nw, nh, X: new Float32Array(n), Y: new Float32Array(n), GI: new Int32Array(n), I: new Int32Array(n), J: new Int32Array(n), F: null };
  for (let j = 0; j < nh; j++) {
    for (let i = 0; i < nw; i++) {
      const gi = ci0 + i, gj = cj0 + j, q = j * nw + i;
      W.X[q] = (gi + 0.5 + (hash2(gi, gj, seed) - 0.5) * jit) * cell;
      W.Y[q] = (gj + 0.5 + (hash2(gi, gj, seed + 1) - 0.5) * jit) * cell;
      W.GI[q] = (Math.imul(gi, 7919) + gj) | 0;
      W.I[q] = gi;
      W.J[q] = gj;
    }
  }
  return W;
}
// The nearest two sites to (p, q) (in the pattern's space): WI[0] the nearest (its index), WI[1] the
// second, WD[0] how far (px) the point lies from the edge between them (typed arrays: a number kept in a
// module's variable is boxed at every write, which made a chunk's garbage).
const WI = new Int32Array(2), WD = new Float64Array(1);
function worley(W, p, q) {
  const ci = Math.floor(p / W.cell) - W.ci0, cj = Math.floor(q / W.cell) - W.cj0, X = W.X, Y = W.Y;
  let f1 = 1e12, f2 = 1e12, a = 0, b = 0;
  for (let dj = -1; dj <= 1; dj++) {
    const row = (cj + dj) * W.nw + ci;
    for (let di = -1; di <= 1; di++) {
      const n = row + di, dx = p - X[n], dy = q - Y[n], d = dx * dx + dy * dy;
      if (d < f1) {
        f2 = f1;
        b = a;
        f1 = d;
        a = n;
      } else if (d < f2) {
        f2 = d;
        b = n;
      }
    }
  }
  const lx = X[b] - X[a], ly = Y[b] - Y[a];
  WI[0] = a;
  WI[1] = b;
  WD[0] = (f2 - f1) / (2 * (Math.sqrt(lx * lx + ly * ly) || 1));
}

// The nearest of the sites at lattice point c's square's four corners (A) to (p, q), and the next: WI,
// WD as worley.
function among(W, p, q, A, c) {
  const X = W.X, Y = W.Y;
  let f1 = 1e12, f2 = 1e12, a = -1, b = -1;
  for (let m = 0; m < 4; m++) {
    const n = A[m === 0 ? c : m === 1 ? c + 1 : m === 2 ? c + TN : c + TN + 1];
    if (n === a || n === b) continue;
    const dx = p - X[n], dy = q - Y[n], d = dx * dx + dy * dy;
    if (d < f1) {
      f2 = f1;
      b = a;
      f1 = d;
      a = n;
    } else if (d < f2) {
      f2 = d;
      b = n;
    }
  }
  if (b < 0) b = a;
  const lx = X[b] - X[a], ly = Y[b] - Y[a];
  WI[0] = a;
  WI[1] = b;
  WD[0] = b === a ? 99 : (f2 - f1) / (2 * (Math.sqrt(lx * lx + ly * ly) || 1));
}

// Row j of the land field without the decks (L, from O and DK when the plates give none: a deck's side
// over the lava as lava), and its least value.
function landRow(j, L, O, DK) {
  let m = TMAX;
  for (let c = j * TN, e = c + TN; c < e; c++) {
    if (O) L[c] = DK && DK[c] > -10 && DK[c] >= O[c] - 1e-3 ? Math.min(O[c], -12) : O[c];
    if (L[c] < m) m = L[c];
  }
  return m;
}
// Row j of the lattice: its noise, and the slabs' and cracks' cells at its points.
function latticeRow(j, x0, y0, s, SL, HL) {
  for (let i = 0; i < TN; i++) {
    const x = x0 + i * TSTEP, y = y0 + j * TSTEP, c = j * TN + i;
    const wa = (WA[c] = valueNoise(x / 10, y / 10, s + 81)), wb = (WB[c] = valueNoise(x / 10, y / 10, s + 82));
    JT[c] = hash2(x >> 2, y >> 2, s + 9);
    worley(SL, x + 4 * (wa - 0.5), (y + 3 * (wb - 0.5)) * SY);
    SLA[c] = WI[0];
    SLE[c] = WD[0];
    worley(HL, x + 6 * (wa - 0.5), y + 6 * (wb - 0.5));
    HLA[c] = WI[0];
    HLE[c] = WD[0];
  }
}
// The id of the plate site nearest (x, y).
function nearestSite(S, x, y) {
  let bd = Infinity, id = 0;
  for (let m = 0; m < S.xs.length; m++) {
    const dx = x - S.xs[m], dy = y - S.ys[m], d = dx * dx + dy * dy;
    if (d < bd) {
      bd = d;
      id = S.ids[m];
    }
  }
  return id;
}
// Floe cell q drawn into FLM (2 its ember rim, 1 its body): its Voronoi cell inset 3 px, if it is a
// floe's (pure: by its cell's hash and a slow noise at its site: one cell in eight where the noise lets
// them be, few in all, so they never make a net), in the lava 12 px or more from the shore (the row's
// test, hh). Its rim 2 px of ember crust, only a big one's middle dark.
function floe(W, q, x0, y0, s, L) {
  if (W.I[q] & 1 || W.J[q] & 1 || hash2(W.I[q], W.J[q], s + 64) >= 0.5) return;
  const sx = W.X[q], sy = W.Y[q];
  if (fbm(sx / 90, sy / 90, s + 65, 2) < 0.58) return;
  const xa = Math.max(0, Math.floor(sx - 20 - x0)), xb = Math.min(CH - 1, Math.ceil(sx + 20 - x0));
  const ya = Math.max(0, Math.floor(sy - 20 - y0)), yb = Math.min(CH - 1, Math.ceil(sy + 20 - y0));
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      if (L && at4(L, x, y) > -12) continue;
      const wx = x0 + x, wy = y0 + y;
      worley(W, wx + 0.5, wy + 0.5);
      if (WI[0] !== q) continue;
      const e = WD[0], bay = BAYER[((wy & 3) << 2) | (wx & 3)];
      if (e > 3 + bay * 0.8) FLM[y * CH + x] = e < 5 ? 2 : 1;
    }
  }
}

// The plates near the chunk (tc.sites: ids and positions), as flat arrays.
function sitesOf(S) {
  if (!S) return null;
  if (S.xs && S.ys) return { ids: S.ids || S.id || S.xs.map((_, k) => k), xs: S.xs, ys: S.ys };
  if (!S.length) return null;
  return { ids: S.map((p) => p.id), xs: S.map((p) => p.x), ys: S.map((p) => p.y) };
}

// The places near the chunk whose paving reaches it ([x, y, r] each), and the start's plaza, if any (its
// top left corner): the plates' round places (tc.rounds: the start, the shrines, the crypts and the
// landmarks, each with its own r), else the topology's features (pure, as the layout's).
function placesNear(tc, topo, x0, y0) {
  const out = [];
  let plaza = null;
  const add = (x, y, r) => {
    const dx = Math.max(x0 - x, 0, x - x0 - CH), dy = Math.max(y0 - y, 0, y - y0 - CH);
    if (dx * dx + dy * dy < r * r) out.push(x, y, r);
  };
  if (tc.rounds) {
    for (const p of tc.rounds) {
      add(p.x, p.y, p.r * 0.75);
      if (p.kind === 'start') plaza = [Math.round(p.x) - (PW * TILE) / 2, Math.round(p.y) - (PH * TILE) / 2];
    }
    return { pave: out, plaza };
  }
  if (!topo.features) return { pave: out, plaza };
  const m = 320, f = topo.features(x0 - m, y0 - m, x0 + CH + m, y0 + CH + m);
  for (const p of f.places || []) {
    if (p.kind === 'start') {
      add(p.x, p.y, PAVE_R.start);
      plaza = [Math.round(p.x) - (PW * TILE) / 2, Math.round(p.y) - (PH * TILE) / 2];
    } else if (p.kind === 'shrine') add(p.x, p.y, PAVE_R.shrine);
    else if (p.crypt) add(p.crypt.x, p.crypt.y + 24, PAVE_R.crypt);
  }
  for (const L of f.landmarks || []) add(L.x, L.y, L.kind === 'bridgehead' ? PAVE_R.bridgehead : PAVE_R.landmark);
  return { pave: out, plaza };
}

// ---- The fissures: each seam's line rasterised into the chunk (FD px from the nearest, FG its glowing) -
function mapSeams(seams, x0, y0) {
  FD.fill(99);
  FG.fill(0);
  if (!seams) return;
  for (const sm of seams) {
    // (glow: 1 where the line carries on from lava, always lit, 2 here; else a hash, the 45% over GLOW lit
    // in stretches, 1; the rest dark joints, 0.)
    const xs = sm.xs, ys = sm.ys, n = xs.length, hot = sm.glow === true || sm.glow >= 1 ? 2 : sm.glow > GLOW ? 1 : 0;
    for (let q = 0; q + 1 < n; q++) seamSeg(xs[q], ys[q], xs[q + 1], ys[q + 1], hot, x0, y0);
  }
}
// One segment of a seam's line, from (ax, ay) to (bx, by), into FD and FG.
function seamSeg(ax, ay, bx, by, hot, x0, y0) {
  const ex = bx - ax, ey = by - ay, el = ex * ex + ey * ey || 1;
  const xa = Math.max(0, Math.floor(Math.min(ax, ax + ex) - SEAM_R - x0)), xb = Math.min(CH - 1, Math.ceil(Math.max(ax, ax + ex) + SEAM_R - x0));
  if (xa > xb) return;
  const ya = Math.max(0, Math.floor(Math.min(ay, ay + ey) - SEAM_R - y0)), yb = Math.min(CH - 1, Math.ceil(Math.max(ay, ay + ey) + SEAM_R - y0));
  for (let y = ya; y <= yb; y++) {
    const wy = y0 + y + 0.5;
    for (let x = xa; x <= xb; x++) {
      const wx = x0 + x + 0.5;
      let u = ((wx - ax) * ex + (wy - ay) * ey) / el;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const dx = wx - ax - ex * u, dy = wy - ay - ey * u, k = y * CH + x;
      // (A little jitter at the pixel's scale, so the line is no clean vector: the lattice's noise.)
      const d = Math.sqrt(dx * dx + dy * dy) + (at4(JT, x, y) - 0.5) * 1.4;
      if (d < FD[k]) {
        FD[k] = d;
        FG[k] = hot;
      }
    }
  }
}

// ---- The walkways: each deck's pixels mapped to (along, across) by its nearest point (as paint.js) ---
function mapDecks(tc) {
  if (!ALONG) {
    ALONG = new Float32Array(CH * CH);
    ACROSS = new Float32Array(CH * CH);
    NEAR = new Float32Array(CH * CH);
    WIDE = new Float32Array(CH * CH);
    MAT = new Int32Array(CH * CH);
  }
  NEAR.fill(1e9);
  WIDE.fill(0);
  BOX[0] = BOX[1] = CH;
  BOX[2] = BOX[3] = -1;
  const { x0, y0 } = tc;
  tc.bridges.forEach((br, bi) => {
    const { xs, ys, hw } = br, n = xs.length, Rr = hw + 1.5;
    for (let q = 0; q < n; q++) {
      const a = Math.max(0, q - 1), b = Math.min(n - 1, q + 1), tx = xs[b] - xs[a], ty = ys[b] - ys[a], tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const px0 = Math.max(0, Math.floor(xs[q] - Rr - x0)), px1 = Math.min(CH - 1, Math.ceil(xs[q] + Rr - x0));
      const py0 = Math.max(0, Math.floor(ys[q] - Rr - y0)), py1 = Math.min(CH - 1, Math.ceil(ys[q] + Rr - y0));
      for (let y = py0; y <= py1; y++) {
        const dy = y0 + y + 0.5 - ys[q];
        for (let x = px0; x <= px1; x++) {
          const dx = x0 + x + 0.5 - xs[q], al = dx * ux + dy * uy;
          if ((al < -2.6 || al > 2.6) && q > 0 && q < n - 1) continue;
          const d = Math.sqrt(dx * dx + dy * dy), k = y * CH + x;
          if (d > Rr || d >= NEAR[k]) continue;
          NEAR[k] = d;
          WIDE[k] = hw + 0.5;
          ALONG[k] = q * TSTEP + al;
          ACROSS[k] = dx * uy - dy * ux;
          MAT[k] = (bi << 16) | ((hash2(xs[0] | 0, ys[0] | 0, 17) * 4093) | 0);
          if (x < BOX[0]) BOX[0] = x;
          if (x > BOX[2]) BOX[2] = x;
          if (y < BOX[1]) BOX[1] = y;
          if (y > BOX[3]) BOX[3] = y;
        }
      }
    }
  });
  DECKS = tc.bridges;
}

// A walkway's pixel (flat-ended slabs only: STYLE's "no ribbed or round-capped decks, no planks"), or 0
// where the floor below shows (a rock causeway's broken edge, its ends on the land).
function deckPixel(P, k, o, bay) {
  const br = DECKS[MAT[k] >> 16], key = MAT[k] & 0xffff, s = ALONG[k], t = ACROSS[k], at = Math.abs(t), hw = br.hw;
  if (br.material === 'rock') {
    // A causeway of the rock itself: on the land it is the land; over the lava its edges broken, a lit
    // rim along them, rock between with a paving stone here and there (its south face: the shade's pass).
    if (o > 1) return 0;
    const u = s / 5, i = Math.floor(u), f = u - i, nz = hash2(i, key, 7) * (1 - f) + hash2(i + 1, key, 7) * f;
    const edge = hw - 1 - 3 * nz;
    if (at > edge) return 0;
    if (at > edge - 1.2) return P.lip;
    const bi = Math.floor(s / 8), bj = Math.floor((t + hw) / 6);
    if (hash2(bi, bj + key, 13) < 0.22) {
      const ms = s - bi * 8, mt = t + hw - bj * 6;
      if (ms < 1 || mt < 1) return P.mortar;
      return P.stone[ms < 2 || mt < 2 ? 3 : 2];
    }
    if (hash2(s | 0, t | 0, 14) < 0.03) return P.rubble[2];
    return pick(P.rock, 1.6 + hash2(Math.floor(s / 5), Math.floor(t / 5), 13) * 1.6 + bay * 0.9 - (at / hw) * 0.8);
  }
  if (at > hw - 0.8) return P.joint; // its edge
  if (br.material === 'iron') {
    // Iron plates 12 px along (6 read as a ladder's rungs: their judging, 29 October 2026), a dark joint
    // between, the rim darker, a rivet by each plate's corners, the plates a tone apart here and there.
    if (at > hw - 2.5) return P.iron[0];
    const m = ((s % 12) + 12) % 12;
    if (m < 1) return P.ironJoint;
    if ((m > 2 && m < 3 || m > 9 && m < 10) && at > hw - 4.5 && at < hw - 3.5) return P.iron[2];
    return P.iron[hash2(Math.floor(s / 12), key, 16) < 0.3 ? 0 : 1];
  }
  if (br.material === 'bone') {
    // Flat slabs of bone 7 px along with square ends, a darker joint, the edges a tone down.
    const m = ((s % 7) + 7) % 7;
    if (m < 1) return P.bone[3];
    if (at > hw - 1.8) return P.bone[2];
    return P.bone[hash2(Math.floor(s / 7), key, 15) < 0.5 ? 0 : 1];
  }
  // Stone: slabs 9 px along, a joint down the middle of every other, curbs 2 px either side.
  if (at > hw - 2.2) return P.curb;
  const slab = Math.floor(s / 9), m = ((s % 9) + 9) % 9;
  if (m < 1 || (slab & 1 && at < 0.5)) return P.joint;
  if (m < 2) return P.walk[2]; // its lit leading edge
  return P.walk[hash2(slab, t > 0 ? 1 : 0, key) < 0.5 ? 0 : 1];
}

// Broken flagstones (STYLE 4.2), large and roughly square: courses FROW px high, stones about FW px
// long (FJIT either way), each stone's top a couple of px up or down of its own, so no joint runs on in a
// straight line (laid in even courses with level tops they read as a brick wall: their judging, 29
// October 2026); the joints wandering a px or two and dark, each stone's top row lit; one in three cracked
// across, one in six slate; missing ones (more toward a field's edge) are rubble. FJ: whether the pixel
// is a joint.
const FROW = 22, FW = 27, FJIT = 10, FTOP = 5;
let FJ = 0;
// The stone of course r at u (along the course): FS[0] its column, [1] [2] its joints, [3] its top.
const FS = new Float64Array(4);
function stoneIn(r, u, s) {
  const uu = u + hash2(r, 0, s + 44) * FW, c = Math.floor(uu / FW);
  let lo = c * FW + (hash2(c, r, s + 45) - 0.5) * FJIT, hi = (c + 1) * FW + (hash2(c + 1, r, s + 45) - 0.5) * FJIT, col = c;
  if (uu < lo) {
    hi = lo;
    col = c - 1;
    lo = col * FW + (hash2(col, r, s + 45) - 0.5) * FJIT;
  } else if (uu >= hi) {
    lo = hi;
    col = c + 1;
    hi = (col + 1) * FW + (hash2(col + 1, r, s + 45) - 0.5) * FJIT;
  }
  FS[0] = col;
  FS[1] = lo - uu + u;
  FS[2] = hi - uu + u;
  FS[3] = r * FROW + (hash2(col, r, s + 46) - 0.5) * FTOP;
}
function flagstone(P, wx, wy, bay, wear, pv, wa, wb, s) {
  const gx = wx + 2.2 * (wa - 0.5), gy = wy + 2 * (wb - 0.5);
  let r = Math.floor(gy / FROW);
  stoneIn(r + 1, gx, s);
  if (gy >= FS[3]) r++; // the stone below reaches up here
  else {
    stoneIn(r, gx, s);
    if (gy < FS[3]) stoneIn(--r, gx, s); // this course's stone starts lower: the one above
  }
  const col = FS[0], lo = FS[1], hi = FS[2], vy = gy - FS[3];
  let mort = vy < 1 || gx - lo < 0.8 || hi - gx < 0.8;
  if (!mort && hash2(col, r, s + 47) < 0.33) {
    const mx = (lo + hi) / 2, sl = (hash2(col, r, s + 48) - 0.5) * 3.2, cy = FROW / 2 + (hash2(col, r, s + 49) - 0.5) * 6;
    if (Math.abs(gx - mx - (vy - cy) * sl) < 0.6) mort = true;
  }
  FJ = 0;
  if (mort) {
    FJ = 1;
    return P.mortar;
  }
  if (hash2(col * 31 + r, 7, s + 76) < 0.05 + Math.max(0, PV0 + 0.08 - pv) * 5) return P.rubble[hash2(wx, wy, s + 77) < 0.12 ? 2 : hash2(wx >> 1, wy >> 1, s + 78) < 0.5 ? 0 : 1];
  const Rm = hash2(col, r, s + 75) < 0.17 ? P.slate : P.stone;
  let t = 1.1 + hash2(col, r, s + 74) * 2.1 + (wear - 0.5) * 1.8 + bay * 0.7;
  if (vy < 2.2) t += 1; // the lit top edge
  else if (gx - lo < 1.8) t += 0.5; // and a little along the left
  if (hash2(wx, wy, s + 79) < 0.015) t = 0; // pitting
  return pick(Rm, t);
}

// The Sanctuary's plaza (STYLE 4.5): tiles of two tones in a checker, a px of grout, each lit along its
// top and left; the border's tiles inlaid with a red band and gold at their middles.
function plazaPixel(P, tx, ty, wx, wy) {
  const i = (tx / TILE) | 0, j = (ty / TILE) | 0, u = tx - i * TILE, v = ty - j * TILE;
  if (u === TILE - 1 || v === TILE - 1) return P.grout;
  const edge = i === 0 || j === 0 || i === PW - 1 || j === PH - 1;
  if (u === 0 || v === 0) return P.tile[2];
  if (edge) {
    const along = i === 0 || i === PW - 1 ? v : u, across = i === 0 || i === PW - 1 ? u : v;
    if (across >= 6 && across <= 8) return along >= 5 && along <= 9 ? P.inlay[1] : P.inlay[0];
    return P.tile[0];
  }
  if (hash2(wx, wy, 501) < 0.04) return P.tile[0];
  return P.tile[(i + j) & 1];
}

// paintAbyss(tc, px, glow, P, topo): as paint.js paintTerrain (P the look's palette, signed).
export function paintAbyss(tc, px, glow, P, topo) {
  const { x0, y0, open: O, deck: DK } = tc;
  const lava = topo.variant === 'lava', s = topo.s || 0;
  // The land without the decks (the lava runs on under them): the plates' own, else the open field with
  // the decks taken out of it (a deck's side over the lava as lava).
  // (Every loop over the chunk is a function called a row or an item at a time: the engine optimizes
  // those at once, while a loop run once a call in paintAbyss itself stayed slow.)
  const L = tc.land || (O ? LF : null);
  let minL = TMAX;
  if (L) for (let j = 0; j < TN; j++) minL = Math.min(minL, landRow(j, L, tc.land ? null : O, DK));
  // The slow noise on the 8 px grid: the stones' wear, the ash, the paving (lifted round the places), a
  // fissure's heat (it glows in stretches), where the hairline cracks run, the lava's flow.
  const { pave, plaza } = placesNear(tc, topo, x0, y0);
  const wearG = grid8(x0, y0, (x, y) => fbm(x / 40, y / 40, s + 72, 3));
  const ashG = grid8(x0, y0, (x, y) => fbm(x / 70 + 3, y / 70, s + 73, 3));
  const paveG = grid8(x0, y0, (x, y) => {
    let v = fbm(x / 160, y / 160, s + 71, 3);
    for (let q = 0; q < pave.length; q += 3) {
      const dx = x - pave[q], dy = y - pave[q + 1], r = pave[q + 2], d2 = (dx * dx + dy * dy) / (r * r);
      if (d2 < 1) v += LIFT * (1 - d2);
    }
    return v;
  });
  const heatG = grid8(x0, y0, (x, y) => fbm(x / 70, y / 70, s + 31, 2));
  const hairG = grid8(x0, y0, (x, y) => fbm(x / 60, y / 60, s + 93, 2));
  const flowG = lava && minL < 0 ? grid8(x0, y0, (x, y) => fbm(x / 70, y / 70, s + 81, 3) * 0.75 + fbm(x / 40 + y / 90, 0.5, s + 83, 2) * 0.45 - 0.2) : null;
  // The cells: the slabs (each a tone by its hash, its plate's shade, slate in its plate's share), the
  // hairline cracks, the floes.
  const SL = cells(SLAB, SY, x0, y0, s + 82, 0.85, 8);
  const ns = SL.X.length, SLT = new Float32Array(ns), SLS = new Uint8Array(ns);
  const sites = sitesOf(tc.sites);
  for (let q = 0; q < ns; q++) {
    let off = 0, slate = 1 / 12;
    if (sites) {
      // The plate the slab lies in (its site's nearest plate site): each plate a shade of its own, one in
      // five leaning to slate. The shade changes at the slabs' joints, never in a band.
      const id = nearestSite(sites, SL.X[q], SL.Y[q] / SY);
      off = (hash2(id | 0, 0, s + 301) - 0.5) * 1.1;
      if (hash2(id | 0, 1, s + 302) < 0.2) slate = 0.5;
    }
    SLT[q] = hash2(SL.I[q], SL.J[q], s + 83) * 1.3 + off;
    SLS[q] = hash2(SL.I[q], SL.J[q], s + 85) < slate ? 1 : 0;
  }
  const HL = cells(HAIR, 1, x0, y0, s + 92, 0.85, 8);
  // The lattice's noise (the slabs' and the joints' wander WA, WB; a fine jitter JT) and the cells at
  // its points.
  for (let j = 0; j < TN; j++) latticeRow(j, x0, y0, s, SL, HL);
  // The floes: one cell in eight (in the even cells only, so no two touch), where a slow noise gathers
  // them, each drawn into FLM.
  FLM.fill(0);
  const FL = flowG ? cells(FLOE, 1, x0, y0, s + 63, 0.8, 0) : null;
  if (FL) for (let q = 0; q < FL.X.length; q++) floe(FL, q, x0, y0, s, L);
  mapSeams(tc.seams, x0, y0);
  const decks = tc.bridges && tc.bridges.length > 0;
  if (decks) mapDecks(tc);
  LANDM.fill(0);
  Object.assign(C, { x0, y0, L, lava, s, decks, plaza, wearG, ashG, paveG, heatG, hairG, flowG, SL, SLT, SLS, HL, FL });
  for (let y = 0; y < CH; y++) paintRow(px, glow, P, y);
  finish(px, glow, P, x0, y0, s, L, decks);
}

// The chunk being painted, as paintAbyss made it ready (its fields' one shape, so paintRow reads them
// alike every time).
const C = { x0: 0, y0: 0, L: null, lava: false, s: 0, decks: false, plaza: null, wearG: null, ashG: null, paveG: null, heatG: null, hairG: null, flowG: null, SL: null, SLT: null, SLS: null, HL: null, FL: null };

// One row of the chunk, every pixel of it: a function of its own, called 256 times a chunk, so the
// engine makes it fast at once (a chunk's whole loop in one call ran mostly unoptimized: 8-14 ms a
// chunk, against about 2 here).
function paintRow(px, glow, P, y) {
  const { x0, y0, L, lava, s, decks, plaza, wearG, ashG, paveG, heatG, hairG, flowG, SL, SLT, SLS, HL, FL } = C;
  const LAVA = P.lava, ramp = LAVA.ramp, crust = LAVA.crust, V = P.void, F = P.fissure, SC = P.scorch;
  const j = y >> 2, fy = (y & 3) * 0.25, wy = y0 + y;
  // The row's slow noise, each field's 256 values at once.
  row8(wearG, y, RW);
  row8(paveG, y, RP);
  row8(ashG, y, RA);
  row8(hairG, y, RH);
  row8(heatG, y, RT);
  if (flowG) row8(flowG, y, RF);
  row4(WA, y, RWA);
  row4(WB, y, RWB);
  {
    for (let x = 0; x < CH; x++) {
      const i = x >> 2, fx = (x & 3) * 0.25, c = j * TN + i, wx = x0 + x, k = y * CH + x;
      const bay = BAYER[((wy & 3) << 2) | (wx & 3)];
      let o = TMAX, gx = 0, gy = 0;
      if (L) {
        const a = L[c], b = L[c + 1], d = L[c + TN], e = L[c + TN + 1];
        o = (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
        if (o < 12 && o > -40) {
          gx = (b - a) * (1 - fy) + (e - d) * fy;
          gy = (d - a) * (1 - fx) + (e - b) * fx;
        }
      }
      const gl = Math.sqrt(gx * gx + gy * gy) || 1, nyo = -gy / gl; // out of the land: south when > 0
      if (decks && NEAR[k] < WIDE[k]) {
        const col = deckPixel(P, k, o, bay);
        FLOOR[k] = col === 0 ? 1 : 0;
        if (col !== 0) {
          px[k] = col;
          continue;
        }
      }
      if (o <= 0) {
        // ---- The lava or the void ----
        const h = -o, south = nyo < 0.35 ? 0 : nyo > 0.65 ? 1 : (nyo - 0.35) / 0.3, FH = lava ? 10 : 24, fh = FH * south;
        let col;
        if (h < fh) {
          // The cliff face under a south rim: strata, darker down; over the lava its foot lit by it, over
          // the void fading into the dark.
          const t = h / FH;
          col = h < 1 ? P.cliff[0] : pick(P.cliff, 0.6 + t * 3.4 + bay * 0.8);
          if ((h + hash2(wx >> 2, 3, s + 5) * 4) % 4 < 0.7) col = P.strata;
          if (lava && h > fh - 2.5) col = mix(col, P.under, 0.6);
          else if (!lava && t > 0.5 + bay * 0.25) col = mix(col, V[0], Math.min(1, (t - 0.4) * 1.7));
        } else if (!lava) {
          const hh = h - fh;
          col = hh < 1.5 && south < 0.5 ? V[1] : hash2(wx, wy, s + 52) < 0.003 ? V[2] : V[0];
        } else {
          // The lava: its cooled crust where it meets the rock, an ember crust, then its flow (redder at
          // its shores, yellow only out in it), a cooled floe here and there out from the shore.
          const hh = h - fh;
          if (hh < 1.5) col = crust[0];
          else if (hh < 3.5 + bay) col = bay < -0.3 ? crust[2] : crust[1];
          else {
            let floe = 0;
            if (hh > 12) floe = FLM[k];
            if (floe) {
              // (Its rim the lava's darkest red, its middle the floe's rim tone: both lit, so under the
              // night a floe reads as a crust cooling on the flow, never a hole in it.)
              col = floe === 2 ? ramp[0] : P.floe[1];
              if (glow) glow[k] = col;
            } else {
              const v = RF[x];
              col = pick(ramp, v * 4 + bay * 0.7 + Math.min(1, (hh - 3) / 14) * 0.6 - 0.3);
              if (glow) glow[k] = col;
            }
          }
        }
        px[k] = col;
        continue;
      }
      // ---- The rock ----
      const wa = RWA[x], wb = RWB[x], wear = RW[x];
      let col, joint = 0, plain = o > 4;
      if (plaza && wx >= plaza[0] && wx < plaza[0] + PW * TILE && wy >= plaza[1] && wy < plaza[1] + PH * TILE && o > 2) {
        px[k] = plazaPixel(P, wx - plaza[0], wy - plaza[1], wx, wy);
        continue;
      }
      const pv = RP[x];
      if (pv > PV0) {
        col = flagstone(P, wx, wy, bay, wear, pv, wa, wb, s);
        joint = FJ;
      } else {
        // Bare rock in slabs, a faint seam along most of their edges, gravel.
        let n = SLA[c], we;
        if (n === SLA[c + 1] && n === SLA[c + TN] && n === SLA[c + TN + 1]) we = at4(SLE, x, y);
        else {
          among(SL, wx + 4 * (wa - 0.5), (wy + 3 * (wb - 0.5)) * SY, SLA, c);
          n = WI[0];
          we = WD[0];
        }
        if (we < 0.75 && hash2(Math.min(SL.GI[n], SL.GI[WI[1]]), Math.max(SL.GI[n], SL.GI[WI[1]]), s + 84) < 0.7) {
          col = P.crack;
          joint = 1;
        } else col = pick(SLS[n] ? P.slate : P.rock, 1.4 + SLT[n] + (wear - 0.5) * 2.2 + bay * 0.9);
        const hs = hash2(wx, wy, s + 85);
        if (hs < 0.018) col = P.rubble[hs < 0.009 ? 0 : 2];
        // The rubble where the paving gives out.
        else if (pv > PV0 - 0.06 && hash2(wx >> 1, wy >> 1, s + 87) < (pv - PV0 + 0.06) * 6) col = P.rubble[hash2(wx, wy, s + 88) < 0.15 ? 2 : hash2(wx >> 1, wy >> 1, s + 89) < 0.5 ? 0 : 1];
      }
      // The long hairline cracks, where their noise says (T-junctions where three cells meet).
      if (RH[x] > 0.56) {
        const h = HLA[c];
        let e;
        if (h === HLA[c + 1] && h === HLA[c + TN] && h === HLA[c + TN + 1]) e = at4(HLE, x, y);
        else {
          among(HL, wx + 6 * (wa - 0.5), wy + 6 * (wb - 0.5), HLA, c);
          e = WD[0];
        }
        if (e < 0.55) {
          col = P.crack;
          joint = 1;
        }
      }
      // The seams: a glowing fissure in stretches (over the void a dim ember), else a dark joint.
      const fd = FD[k];
      if (fd < SEAM_R) {
        plain = false;
        // (A line carrying on from lava glows all along, and hottest; the others in stretches.)
        const heat = FG[k] === 2 ? 0.5 + RT[x] * 0.5 : FG[k] ? RT[x] : 0;
        if (FG[k] && heat > 0.47) {
          const hot = heat > 0.56;
          if (lava) {
            if (fd < 0.55 && hot) col = F[2];
            else if (fd < (hot ? 1.3 : 0.75) + bay * 0.4) col = F[1];
            else if (fd < (hot ? 2.2 : 1.5)) col = F[0];
            else if (fd < (hot ? 4.5 : 3) + bay * 1.5) col = mix(col, SC[fd < 3.2 ? 1 : 0], 0.5);
            if (glow && fd < (hot ? 1.3 : 0.75) + bay * 0.4) glow[k] = col;
          } else {
            if (fd < (hot ? 1.1 : 0.7) + bay * 0.3) {
              col = hot && fd < 0.5 ? F[1] : F[0];
              if (glow) glow[k] = F[0];
            } else if (fd < (hot ? 3 : 2) + bay) col = mix(col, SC[0], 0.4);
          }
        } else if (fd < 0.9) {
          col = P.mortar;
          joint = 1;
        } else if (fd < 1.8) col = mix(col, P.crack, 0.6);
      }
      // Ash: a dithered film (STYLE: at most about half the pixels), in the joints first.
      const av = RA[x] + (wa - 0.5) * 0.12, f = Math.min(0.35, (av - 0.62) * 3) + (joint ? 0.2 : 0);
      if (f > 0 && bay + 0.5 < f && !(FG[k] && fd < 2.5)) col = P.ash[av > 0.7 ? 1 : 0];
      // The edge: the lava's heat on the rock by it (its scorch), a lit lip over the void and atop every
      // south face.
      if (o < 1.2 && nyo > 0.5) col = P.lip;
      else if (lava && o < 5 + bay * 1.4) col = o < 1.8 ? SC[2] : o < 3.4 ? SC[1] : mix(col, SC[0], 0.6);
      else if (!lava && o < 1.4) col = P.lip;
      px[k] = col;
      if (plain && !joint) LANDM[k] = 1;
    }
  }
}

// What is laid over the chunk once its pixels are painted: the bones and the blood on the open rock,
// the walkways' shade.
function finish(px, glow, P, x0, y0, s, L, decks) {
  // Bones (3-6 px, one 22 px cell in 22) and dried blood (a stain or two a view), only on the open rock.
  const ok = (x, y) => x >= 0 && y >= 0 && x < CH && y < CH && LANDM[y * CH + x] === 1;
  for (let cy = Math.floor((y0 - 8) / 22); cy <= Math.floor((y0 + CH) / 22); cy++) {
    for (let cx = Math.floor((x0 - 8) / 22); cx <= Math.floor((x0 + CH) / 22); cx++) {
      if (hash2(cx, cy, s + 95) > 0.045) continue;
      const bx = cx * 22 + Math.floor(hash2(cx, cy, s + 96) * 16) - x0, by = cy * 22 + Math.floor(hash2(cx, cy, s + 97) * 18) - y0;
      const skull = hash2(cx, cy, s + 98) < 0.3;
      const dots = skull ? SKULL : hash2(cx, cy, s + 99) < 0.5 ? BONE_A : BONE_B;
      for (let q = 0; q < dots.length; q += 3) {
        const X = bx + dots[q], Y = by + dots[q + 1];
        if (ok(X, Y)) px[Y * CH + X] = P.bones[dots[q + 2]];
      }
    }
  }
  for (let cy = Math.floor((y0 - 16) / 160); cy <= Math.floor((y0 + CH + 16) / 160); cy++) {
    for (let cx = Math.floor((x0 - 16) / 160); cx <= Math.floor((x0 + CH + 16) / 160); cx++) {
      if (hash2(cx, cy, s + 100) > 0.35) continue;
      const sx = cx * 160 + 12 + hash2(cx, cy, s + 101) * 136 - x0, sy = cy * 160 + 12 + hash2(cx, cy, s + 102) * 136 - y0, r = 3 + hash2(cx, cy, s + 103) * 4;
      for (let y = Math.max(0, Math.floor(sy - r - 2)); y <= Math.min(CH - 1, sy + r + 2); y++) {
        for (let x = Math.max(0, Math.floor(sx - r * 1.4 - 2)); x <= Math.min(CH - 1, sx + r * 1.4 + 2); x++) {
          if (!ok(x, y)) continue;
          const d = Math.hypot((x - sx) / 1.4, y - sy) + (hash2(x0 + x, y0 + y, s + 104) - 0.5) * 2;
          if (d < r) px[y * CH + x] = mix(px[y * CH + x], P.blood[d < r * 0.4 ? 2 : 1], 0.75);
          else if (d < r + 1 && hash2(x0 + x, y0 + y, s + 105) < 0.3) px[y * CH + x] = mix(px[y * CH + x], P.blood[0], 0.5);
        }
      }
    }
  }
  // A walkway's shade on the lava or the void just south of it (a rock causeway's own face there).
  if (decks && BOX[2] >= 0) {
    for (let y = BOX[1]; y <= Math.min(CH - 1, BOX[3] + 6); y++) {
      for (let x = BOX[0]; x <= BOX[2]; x++) {
        const k = y * CH + x;
        if (NEAR[k] < WIDE[k] && !FLOOR[k]) continue;
        let d = 0;
        for (let q = 1; q <= 6 && !d; q++) if (y - q >= 0 && NEAR[k - q * CH] < WIDE[k - q * CH] && !FLOOR[k - q * CH]) d = q;
        if (!d) continue;
        const o = L ? at4(L, x, y) : TMAX;
        if (o >= 0) continue;
        const rock = DECKS[MAT[k - d * CH] >> 16].material === 'rock';
        if (rock) {
          px[k] = d < 2 ? P.cliff[1] : d < 4 ? P.cliff[2] : d < 6 ? P.cliff[3] : P.cliff[4];
          if (glow) glow[k] = 0;
        } else if (d <= 3) {
          px[k] = shade(px[k], P.shade);
          if (glow) glow[k] = 0;
        }
      }
    }
  }
}

// The bone flecks: [dx, dy, tone] each (a skull's dome and eyes, a long bone and a short one).
const SKULL = [1, 0, 0, 2, 0, 0, 0, 1, 1, 1, 1, 2, 2, 1, 1, 3, 1, 2, 1, 2, 1, 2, 2, 1];
const BONE_A = [0, 0, 0, 1, 0, 1, 2, 0, 1, 3, 0, 1, 4, 0, 0, 0, 1, 2, 4, 1, 2];
const BONE_B = [0, 0, 1, 1, 1, 0, 2, 2, 1, 3, 3, 0, 0, 1, 2];
