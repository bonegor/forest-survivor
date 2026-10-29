// How game/topology's ground is painted (28 October 2026): after darkwood.js paintChunk has painted a
// chunk's ground, roads, tufts and pebbles (and its cracks' glow), this overpaints what the terrain
// makes of it, from the very fields that hold the hero (topology/terrain.js), so the edge seen is the
// edge felt. The Sunscorch's ranges (since 29 October 2026 in dry stone, topology/stone.js: walls of
// rounded stones in tiers, the band's own under the top range with its cave mouths' arches) and its
// quicksand and oases; the Frostfell's cliffs (snow on their ridges) and ice; the Abyss's lava (crust at
// its edges, a short dark cliff under each island's south rim, glowing into the night's light) or the
// void (black, a speck here and there, strata fading into the dark under the south rims, a lit lip on
// the others), and its bridges' decks of planks, bone or stone, each casting its shade on what is below.
// Pure, on packed pixels as paintChunk: slow noise on an 8 px grid per chunk, never a noise call per
// pixel. The palettes are the look's own (look.terrain, biomes/<look>.js).

import { fbm, valueNoise, hash2 } from '../../engine/util.js';
import { TN, TSTEP, TMAX, TCHUNK, SURFACE } from './terrain.js';
import { paintStone, groundRows as stoneRows } from './stone.js';
import { paintQuilt } from './paint-quilt.js';
import { paintAbyss } from './abyss.js';

// The rows of a chunk whose ground below must be painted, [a, b), for darkwood.js paintChunk (its
// `rows`), or null for all of them: the Sunscorch's dry-stone ranges (29 October 2026) paint every
// pixel above the top range's face and below the bottom range's over whole, so the sand there would
// never be seen (about a third of a chunk's time, on a chunk of the ranges). Every other look's
// terrain keeps the ground it paints over at its edges, so it gets all of it. The Abyss's floor (29
// October 2026, topology/abyss.js) paints every pixel of its chunks: none.
export function groundRows(tc, look, topo) {
  if (tc && tc.any && look.terrain?.style === 'abyss') return [0, 0];
  return tc && tc.any && look.terrain?.style === 'drystone' ? stoneRows(tc.x0, tc.y0, topo) : null;
}

const CH = TCHUNK, N8 = CH / 8 + 1;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const FACE_H = 28; // the top range's cliff face, px into the rock
const LIGHT = [-0.5, -0.72]; // toward the light, from the top left (as procgen.js lights its art)
// The scratch a chunk's bridges are mapped onto (px along each deck, px across it, and how near its
// line), made once and reused for every chunk.
let ALONG = null, ACROSS = null, NEAR = null, WIDE = null, MAT = null, DECKS = null;
const BOX = [0, 0, 0, 0]; // the decks' pixels' box in the chunk: x0, y0, x1, y1

const R = (c) => c & 255, G = (c) => (c >>> 8) & 255, B = (c) => (c >>> 16) & 255;
const rgb = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const shade = (c, k) => rgb((R(c) * k) | 0, (G(c) * k) | 0, (B(c) * k) | 0);
const mix = (c, d, t) => rgb((R(c) + (R(d) - R(c)) * t) | 0, (G(c) + (G(d) - G(c)) * t) | 0, (B(c) + (B(d) - B(c)) * t) | 0);

// A look's palette with every colour as a signed 32-bit number (the same bits): a packed colour with
// its alpha set is past 2^31, which the engine would box each time a helper hands one back; signed, it
// is a small integer, and a Uint32Array stores it as the same colour. Made once per look.
const SIGNED = new WeakMap();
function signed(T) {
  let S = SIGNED.get(T);
  if (S) return S;
  const conv = (v) => (typeof v === 'number' ? (Number.isInteger(v) && v > 0x7fffffff ? v | 0 : v) : Array.isArray(v) ? Int32Array.from(v, (c) => c | 0) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, w]) => [k, conv(w)])) : v);
  S = conv(T);
  SIGNED.set(T, S);
  return S;
}

// A field on the 8 px grid of the chunk (33 x 33), and its bilinear value and slope at a pixel.
function grid(x0, y0, fn) {
  const a = new Float32Array(N8 * N8);
  for (let j = 0; j < N8; j++) for (let i = 0; i < N8; i++) a[j * N8 + i] = fn(x0 + i * 8, y0 + j * 8);
  return a;
}
const at8 = (a, x, y) => {
  const i = x >> 3, j = y >> 3, tx = (x & 7) / 8, ty = (y & 7) / 8, c = j * N8 + i;
  return (a[c] + (a[c + 1] - a[c]) * tx) * (1 - ty) + (a[c + N8] + (a[c + N8 + 1] - a[c + N8]) * tx) * ty;
};

// paintTerrain(tc, px, glow, look, topo): tc the chunk's TerrainChunk, px its CHUNK x CHUNK packed
// pixels as paintChunk left them, glow its cracks' glow (or null: none is kept, headless tools).
export function paintTerrain(tc, px, glow, look, topo) {
  if (!look.terrain || !tc.any) return;
  const P = signed(look.terrain);
  // The Abyss's grey Act IV floor (29 October 2026) is painted whole by its own function.
  if (P.style === 'abyss') return paintAbyss(tc, px, glow, P, topo);
  // The Bloomvale's quilt of flower fields (29 October 2026) is painted by its own function.
  if (topo && topo.kind === 'quilt') return paintQuilt(tc, px, P, topo);
  const { x0, y0, open: O, patch: PT, deck: DK } = tc, gap = tc.blocked === SURFACE.GAP;
  const lava = gap && topo.variant === 'lava', s = topo.s || 0;
  // The Sunscorch's ranges are dry stone (29 October 2026, topology/stone.js): painted after the rest,
  // over every pixel of rock; this loop keeps only its oases and quicksand.
  const stone = P.style === 'drystone';
  let minOpen = TMAX;
  if (O) for (let c = 0; c < O.length; c++) if (O[c] < minOpen) minOpen = O[c];
  // Slow noise, only where it is wanted.
  const rock = !gap && minOpen < 0 && !stone;
  // The ranges' ridges on the 8 px grid, and how each point of it faces the light (from its neighbours
  // 8 px either side, one point past the chunk's edge so the next chunk's agree along the seam).
  let ridgeG = null, litG = null;
  if (rock) {
    const M = N8 + 2, R = new Float32Array(M * M);
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) R[j * M + i] = 1 - Math.abs(2 * fbm((x0 + (i - 1) * 8) / 90, (y0 + (j - 1) * 8) / 60, s + 71, 3) - 1);
    ridgeG = new Float32Array(N8 * N8);
    litG = new Float32Array(N8 * N8);
    for (let j = 0; j < N8; j++) {
      for (let i = 0; i < N8; i++) {
        const c = (j + 1) * M + i + 1, rx = (R[c + 1] - R[c - 1]) / 16, ry = (R[c + M] - R[c - M]) / 16;
        const lit = -(rx * LIGHT[0] + ry * LIGHT[1]) * 70;
        ridgeG[j * N8 + i] = R[c];
        litG[j * N8 + i] = lit < -1.6 ? -1.6 : lit > 1.6 ? 1.6 : lit;
      }
    }
  }
  // The lava's flow: a slow noise and streaks along it, as one grid.
  const lavaG = lava && minOpen < 0 ? grid(x0, y0, (x, y) => fbm(x / 70, y / 70, s + 81, 3) * 0.75 + fbm(x / 40 + y / 90, 0.5, s + 83, 2) * 0.45 - 0.2) : null;
  const ramp = lava ? P.lava.ramp : null, V0 = gap && !lava ? P.void[0] : 0, V1 = gap && !lava ? P.void[1] : 0;
  // Land farther than this from an edge is left as paintChunk painted it (the lava's warmth on its
  // shore reaches 6 px, a lip over the void 1.5, the shade by a wall and an oasis's wet rim 3).
  const keep = gap ? (lava ? 6 : 1.5) : 3;
  const ice = tc.patchKind === SURFACE.ICE && PT;
  const iceG = ice ? grid(x0, y0, (x, y) => fbm(x / 60, y / 60, s + 91, 2)) : null;
  const crackG = ice ? grid(x0, y0, (x, y) => valueNoise(x / 24, y / 24, s + 93)) : null;
  // Bridges: each deck's pixels mapped to (along, across) by its nearest point.
  const decks = tc.bridges.length > 0;
  if (decks) mapDecks(tc);
  // The pools (an oasis's water) and caves near this chunk.
  const pools = tc.pools, caves = tc.caves;
  // A corridor's faces along the chunk, every 4 px of u (its lo, hi and their slopes: corridor.js
  // terrain()'s very formula), for its rock past the field's reach. The fields stop at TMAX px into the
  // rock, so there its terraces ran out along a straight line and the side face's band fell away (the
  // field flat, no way out of it); the Frostfell, narrowed to about 520 px on 29 October 2026, shows
  // that line whenever the hero is near a cliff. Past DEEP_IN px in, its depth and the way out of the
  // land are worked out from the faces themselves, so the terraces run on as they began.
  let FL = null;
  if (rock && topo && topo.kind === 'corridor') {
    const ax = topo.axis === 'x', u0 = ax ? x0 : y0, L = new Float32Array(TN + 2), H = new Float32Array(TN + 2);
    for (let m = 0; m < TN + 2; m++) {
      L[m] = topo.lo(u0 + (m - 1) * TSTEP);
      H[m] = topo.hi(u0 + (m - 1) * TSTEP);
    }
    FL = new Float32Array(TN * 4);
    for (let a = 0; a < TN; a++) {
      FL[a * 4] = L[a + 1];
      FL[a * 4 + 1] = H[a + 1];
      FL[a * 4 + 2] = (L[a + 2] - L[a]) / 8;
      FL[a * 4 + 3] = (H[a + 2] - H[a]) / 8;
    }
  }
  const DEEP_IN = TMAX - 8, axX = topo && topo.axis === 'x';

  for (let y = 0; y < (stone && !pools.length && !PT ? 0 : CH); y++) {
    const j = y >> 2, fy = (y & 3) * 0.25, wy = y0 + y;
    for (let x = 0; x < CH; x++) {
      const i = x >> 2, fx = (x & 3) * 0.25, c = j * TN + i, wx = x0 + x, k = y * CH + x;
      let o = TMAX, gx = 0, gy = 0;
      if (O) {
        const a = O[c], b = O[c + 1], d = O[c + TN], e = O[c + TN + 1];
        o = (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
        if (o < 48) {
          gx = (b - a) * (1 - fy) + (e - d) * fy;
          gy = (d - a) * (1 - fx) + (e - b) * fx;
        }
      }
      let pt = -TMAX;
      if (PT) {
        const a = PT[c], b = PT[c + 1], d = PT[c + TN], e = PT[c + TN + 1];
        pt = (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
      }
      const onDeck = decks && NEAR[k] < WIDE[k];
      if (o > keep && pt < -4 && !onDeck) continue;
      const bay = BAYER[((wy & 3) << 2) | (wx & 3)];
      // Deep in the lava or the void (past every band an edge has): its colour at once.
      if (gap && !onDeck && o < (lava ? -12 : -25)) {
        if (lava) {
          const ci = (y >> 3) * N8 + (x >> 3), tx = (x & 7) / 8, ty = (y & 7) / 8, a = lavaG;
          const v = (a[ci] + (a[ci + 1] - a[ci]) * tx) * (1 - ty) + (a[ci + N8] + (a[ci + N8 + 1] - a[ci + N8]) * tx) * ty;
          let t = Math.floor(v * 4 + bay * 0.7 + (o < -17 ? 0.3 : (-o - 3) / 14 * 0.6 - 0.3));
          t = t < 0 ? 0 : t > 3 ? 3 : t;
          px[k] = ramp[t];
          if (glow) glow[k] = ramp[t];
        } else {
          px[k] = hash2(wx, wy, 9) < 0.002 ? V1 : V0;
          if (glow) glow[k] = 0;
        }
        continue;
      }
      const gl = Math.sqrt(gx * gx + gy * gy) || 1, nxo = -gx / gl, nyo = -gy / gl; // out of the land, into the wall or gap
      if (onDeck) {
        px[k] = deckPixel(P, k, wx, wy, bay);
        if (glow) glow[k] = 0;
        continue;
      }
      if (o < 0) {
        let h = -o;
        // An oasis's water: lighter 2 px in from its edge.
        let pool = false;
        for (let q = 0; q < pools.length && !pool; q++) {
          const p = pools[q];
          if (Math.abs(wx - p.x) < p.ext + 3 && Math.abs(wy - p.y) < p.ext + 3) pool = true;
        }
        if (pool) {
          px[k] = P.water[h > 14 + bay * 4 ? 0 : h > 7 + bay * 3 ? 1 : h > 2 ? 2 : 3];
          continue;
        }
        if (gap) {
          px[k] = gapPixel(P, lava, h, nxo, nyo, wx, wy, bay, lavaG, x, y, glow, k);
          continue;
        }
        if (stone) continue;
        // Past the field's reach in a corridor's rock: its depth and way out from the faces (FL above).
        let rx = nxo, ry = nyo;
        if (FL && h > DEEP_IN) {
          const a = axX ? x : y, q = (a >> 2) * 4, t = (a & 3) * 0.25, v = axX ? wy : wx;
          const l = FL[q] + (FL[q + 4] - FL[q]) * t, hv = FL[q + 1] + (FL[q + 5] - FL[q + 1]) * t;
          const sl = FL[q + 2] + (FL[q + 6] - FL[q + 2]) * t, sh = FL[q + 3] + (FL[q + 7] - FL[q + 3]) * t;
          const nl = 1 / Math.sqrt(1 + sl * sl), nh = 1 / Math.sqrt(1 + sh * sh), dl = (l - v) * nl, dh = (v - hv) * nh;
          // Out of the land, along u and across v: (sl, -1) x nl past the lo face, (-sh, 1) x nh past the hi.
          const ou = dl >= dh ? sl * nl : -sh * nh, ov = dl >= dh ? -nl : nh;
          h = Math.max(h, dl, dh);
          rx = axX ? ou : ov;
          ry = axX ? ov : ou;
        }
        const ci = (y >> 3) * N8 + (x >> 3), tx = (x & 7) / 8, ty = (y & 7) / 8, w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
        const ridge = ridgeG[ci] * w00 + ridgeG[ci + 1] * w10 + ridgeG[ci + N8] * w01 + ridgeG[ci + N8 + 1] * w11;
        const lit = litG[ci] * w00 + litG[ci + 1] * w10 + litG[ci + N8] * w01 + litG[ci + N8 + 1] * w11;
        // The rock (inlined: a call would box its numbers at every pixel). A cliff face where the rock
        // lies north of the land (seen from the game's 3/4 view the wall rises behind it), a narrower
        // band of it along the Frostfell's side cliffs (so the wall's edge reads wherever it runs), none
        // where it faces north; beyond it, and along every other edge, the rock rising away from the
        // land in terraces, their steps wandering with the ridges: a riser at the foot of each step (a
        // little face where it looks south, a shadow line where it does not), a lit lip at its top, the
        // step's top lit from the top left by the ridges' slope and lighter the higher it stands, dark
        // crevices along the ridges' valleys; snow on the Frostfell's ledges and high ridges.
        const f = Math.max(0, Math.min(1, (-ry - 0.35) / 0.3)), side = Math.max(0, Math.min(1, (Math.abs(rx) - 0.5) / 0.3));
        const fh = FACE_H * Math.max(f, 0.42 * side);
        let col;
        if (h < fh) {
          if (h < 1.2) col = P.foot;
          else if (h > fh - 1.5) col = P.lip;
          else {
            const along = f >= side ? wx : wy; // the strata run down the face
            let t = (hash2(along >> 1, 0, 7) * 3 + (h / fh) * 3) | 0;
            if ((h + hash2(along >> 3, 1, 8) * 5) % 9 < 1) t -= 1; // a ledge
            col = P.face[t < 0 ? 0 : t > 4 ? 4 : t];
          }
        } else if (fh < 14 && h < fh + 2.4) col = h < fh + 1.2 ? P.lip : P.rock[5];
        else if (ridge < 0.05 + bay * 0.03) col = P.rock[0]; // a crevice
        else {
          const fs = Math.max(0, Math.min(1, (-ry - 0.05) / 0.4)); // how much a step's riser shows
          const q = (h - fh + ridge * 36) / 22, step = Math.floor(q), fr = q - step, riser = 0.07 + 0.2 * fs;
          if (fr < riser) {
            if (fs < 0.3) col = P.rock[0];
            else {
              const t = Math.floor((fr / riser) * 3.2 + (((Math.imul(wx >> 1, 73856093) ^ Math.imul(step, 19349663)) >>> 0) % 8) * 0.2);
              col = P.face[t < 0 ? 0 : t > 4 ? 4 : t];
            }
          } else if (fr < riser + 0.07) col = P.snow || P.rock[5];
          else if (P.snow && (fr < riser + 0.16 + bay * 0.06 || ridge > 0.86 + bay * 0.06)) col = P.snow;
          else {
            const t = Math.floor(1.4 + Math.min(2, step * 0.55) + ridge * 1.2 + lit + bay * 0.9);
            col = P.rock[t < 1 ? 1 : t > 5 ? 5 : t];
          }
        }
        px[k] = col;
        continue;
      }
      // On land.
      if (pt > -1.5 && tc.patchKind) {
        if (tc.patchKind === SURFACE.QUICKSAND) {
          if (pt >= 0) px[k] = sandPixel(P, pt, wx, wy, bay, tc);
        } else px[k] = icePixel(P, pt, wx, wy, bay, iceG, crackG, x, y);
        if (pt >= 0 || tc.patchKind === SURFACE.ICE) continue;
      }
      // Its edge: a wet rim round an oasis's water; a lit lip and shade along a wall to the west or
      // north (the light comes from the top left); a lit lip over the void, the lava's warmth on its shore.
      if (o < 2.5) {
        let wet = false;
        for (let q = 0; q < pools.length && !wet; q++) {
          const p = pools[q];
          if (Math.abs(wx - p.x) < p.ext + 6 && Math.abs(wy - p.y) < p.ext + 6) wet = true;
        }
        if (wet) {
          px[k] = P.quicksand[1];
          continue;
        }
      }
      if (gap) {
        if (lava && o < 6) px[k] = mix(px[k], P.lava.crust[1], (1 - o / 6) * 0.45);
        else if (!lava && o < 1.5 && nyo < 0.35) px[k] = P.lip;
      } else if (!stone && o < 3 && (nxo < -0.3 || nyo < -0.3)) px[k] = shade(px[k], 0.78 + o * 0.05);
    }
  }
  // The caves' recesses, cut into the cliff round their doors (the door's sprite covers its middle);
  // the Sunscorch's ranges and its caves' arches in dry stone.
  if (stone) paintStone(tc, px, P, topo);
  else for (const cv of caves) paintCave(P, cv, x0, y0, px);
  // A deck's shade on the lava or the void just south of it.
  if (decks && DK && BOX[2] >= 0) {
    for (let y = BOX[1]; y <= Math.min(CH - 1, BOX[3] + 3); y++) {
      for (let x = BOX[0]; x <= BOX[2]; x++) {
        const k = y * CH + x;
        if (NEAR[k] < WIDE[k]) continue;
        let under = false;
        for (let d = 1; d <= 3 && !under; d++) if (y - d >= 0 && NEAR[k - d * CH] < WIDE[k - d * CH]) under = true;
        if (!under) continue;
        const o = sampleOpen(O, x, y);
        if (o < 0) {
          px[k] = shade(px[k], P.shade);
          if (glow) glow[k] = 0;
        }
      }
    }
  }
}

function sampleOpen(O, x, y) {
  if (!O) return TMAX;
  const i = x >> 2, j = y >> 2, fx = (x & 3) * 0.25, fy = (y & 3) * 0.25, c = j * TN + i;
  return (O[c] + (O[c + 1] - O[c]) * fx) * (1 - fy) + (O[c + TN] + (O[c + TN + 1] - O[c + TN]) * fx) * fy;
}

// Below an island: lava (its ramp by a slow flow and streaks, its crust where it meets the rock, a
// short dark cliff under each south rim; its own colour into the glow) or the void (black, specks, the
// south cliffs' strata fading into it, a dark drop under the other rims; nothing into the glow).
function gapPixel(P, lava, h, nxo, nyo, wx, wy, bay, lavaG, x, y, glow, k) {
  const south = Math.max(0, Math.min(1, (nyo - 0.35) / 0.3));
  if (lava) {
    const L = P.lava;
    if (h < 8 * south) {
      if (glow) glow[k] = 0;
      return P.cliff[Math.min(3, ((h / 2.5) | 0) + (hash2(wx >> 1, 3, 5) < 0.3 ? 1 : 0))];
    }
    if (h < 3 + 8 * south) {
      if (glow) glow[k] = 0;
      return L.crust[h - 8 * south < 1.5 ? 0 : 1];
    }
    const v = at8(lavaG, x, y);
    let t = Math.floor(v * 4 + bay * 0.7 + Math.min(1, (h - 3) / 14) * 0.6 - 0.3);
    t = t < 0 ? 0 : t > 3 ? 3 : t;
    if (glow) glow[k] = L.ramp[t];
    return L.ramp[t];
  }
  if (glow) glow[k] = 0;
  const V = P.void;
  if (h < 24 * south) {
    const fade = h / 24 + bay * 0.25;
    if (fade > 0.82) return V[0];
    const t = ((h / 6) | 0) + (hash2(wx >> 1, 4, 6) < 0.25 ? 1 : 0);
    return P.cliff[t > 3 ? 3 : t];
  }
  if (h < 2 && south < 0.5) return P.drop;
  return hash2(wx, wy, 9) < 0.002 ? V[1] : V[0];
}

// Quicksand: darker than any sand, deeper darker, a still spiral of ripples a tone lighter, a pale dry
// rim and a wet dark ring inside it.
function sandPixel(P, pt, wx, wy, bay, tc) {
  if (pt < 1.5) return P.qsRim;
  if (pt < 3) return P.qsWet;
  const Q = P.quicksand;
  let t = 4 - Math.floor(Math.min(1, pt / 12) * 3 + bay * 0.8 + 0.4);
  // The spiral round the nearest pool's middle.
  let best = null, bd = Infinity;
  for (const p of tc.patches) {
    const d = (wx - p.x) ** 2 + (wy - p.y) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  if (best) {
    const dist = Math.sqrt(bd), ang = Math.atan2(wy - best.y, wx - best.x);
    if (Math.sin(dist * 0.55 + ang * 2) > 0.55) t += 1;
  }
  return Q[t < 0 ? 0 : t > 4 ? 4 : t];
}

// Ice: pale cyan to white by a slow noise, a diagonal sheen, fine cracks, a white rim and the snow's
// blue shadow just outside it.
function icePixel(P, pt, wx, wy, bay, iceG, crackG, x, y) {
  if (pt < 0) return P.iceEdge;
  if (pt < 1.2) return P.iceRim;
  if (Math.abs(at8(crackG, x, y) - 0.5) < 0.015) return P.iceCrack;
  let t = Math.floor(at8(iceG, x, y) * 4.4 + bay * 0.8 - 0.6);
  if ((((wx + wy) % 23) + 23) % 23 < 2) t += 1;
  return P.ice[t < 0 ? 0 : t > 3 ? 3 : t];
}

// The arch of a cave's mouth cut into the cliff above its door: dark inside, a lit rim round it.
function paintCave(P, cv, x0, y0, px) {
  const top = cv.y - 34, hw = 17;
  for (let wy = top - 1; wy <= cv.y; wy++) {
    const y = wy - y0;
    if (y < 0 || y >= CH) continue;
    for (let wx = cv.x - hw - 1; wx <= cv.x + hw + 1; wx++) {
      const x = wx - x0;
      if (x < 0 || x >= CH) continue;
      const dx = Math.abs(wx - cv.x), sy = wy - (top + hw); // above the springing line the arch is round
      const r = sy < 0 ? Math.sqrt(dx * dx + sy * sy) : dx;
      if (r < hw - 0.5) px[y * CH + x] = r > hw - 3 && hash2(wx, wy, 11) < 0.5 ? P.face[0] : P.foot;
      else if (r < hw + 0.7) px[y * CH + x] = P.lip;
    }
  }
}

// ---- Bridges ---------------------------------------------------------------------------------------
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
    const { xs, ys, hw } = br, n = xs.length, R = hw + 1.5;
    for (let q = 0; q < n; q++) {
      const a = Math.max(0, q - 1), b = Math.min(n - 1, q + 1), tx = xs[b] - xs[a], ty = ys[b] - ys[a], tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const px0 = Math.max(0, Math.floor(xs[q] - R - x0)), px1 = Math.min(CH - 1, Math.ceil(xs[q] + R - x0));
      const py0 = Math.max(0, Math.floor(ys[q] - R - y0)), py1 = Math.min(CH - 1, Math.ceil(ys[q] + R - y0));
      for (let y = py0; y <= py1; y++) {
        const dy = y0 + y + 0.5 - ys[q];
        for (let x = px0; x <= px1; x++) {
          // Only the strip of the deck this point is nearest to along it (its neighbours have theirs).
          const dx = x0 + x + 0.5 - xs[q], al = dx * ux + dy * uy;
          if ((al < -2.6 || al > 2.6) && q > 0 && q < n - 1) continue;
          const d = Math.sqrt(dx * dx + dy * dy), k = y * CH + x;
          if (d > R || d >= NEAR[k]) continue;
          NEAR[k] = d;
          WIDE[k] = hw + 0.5;
          ALONG[k] = q * TSTEP + al;
          if (x < BOX[0]) BOX[0] = x;
          if (x > BOX[2]) BOX[2] = x;
          if (y < BOX[1]) BOX[1] = y;
          if (y > BOX[3]) BOX[3] = y;
          ACROSS[k] = dx * uy - dy * ux;
          // which bridge (its material, its width) in the high bits, a hash of it in the low ones
          MAT[k] = (bi << 16) | ((hash2(xs[0] | 0, ys[0] | 0, 17) * 4093) | 0);
        }
      }
    }
  });
  DECKS = tc.bridges;
}
function deckPixel(P, k, wx, wy, bay) {
  const br = DECKS[MAT[k] >> 16], key = MAT[k] & 0xffff, s = ALONG[k], t = ACROSS[k], at = Math.abs(t), hw = br.hw;
  if (at > hw - 0.8) return P.plankGap; // its edge
  if (br.material === 'bone') {
    // Vertebrae every 7 px, ribs out to the edges.
    const m = ((s % 7) + 7) % 7, ds = m - 3.5, disc = ds * ds + (t * 0.55) ** 2;
    if (at > hw - 4 && m < 2) return P.bone[1];
    if (disc < 9) return P.bone[disc < 3 ? 0 : 1];
    return P.bone[at < hw * 0.5 ? 2 : 3];
  }
  if (br.material === 'stone') {
    const slab = Math.floor(s / 8), m = ((s % 8) + 8) % 8, mid = slab & 1 ? hw * 0.35 : -hw * 0.35;
    if (m < 1 || Math.abs(t - mid) < 0.5) return P.mortar;
    if (at > hw - 2 + bay) return P.stone[2];
    return P.stone[(slab * 5 + key) % 2];
  }
  // Planks across it, a dark gap every 4th row, rails along its sides, a nail every 12 px.
  if (at > hw - 2.5) return P.rail;
  const m4 = ((s % 4) + 4) % 4;
  if (m4 < 1) return P.plankGap;
  if (at > hw - 4.5 && at < hw - 3.5 && ((s % 12) + 12) % 12 < 1.2) return P.nail;
  const plank = Math.floor(s / 4);
  return P.planks[(((plank * 7 + key) % 3) + 3) % 3];
}
