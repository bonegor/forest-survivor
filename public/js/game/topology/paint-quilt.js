// How the Bloomvale's quilt is painted (29 October 2026, game/topology/quilt.js): over what darkwood.js
// paintChunk laid down, every pixel but the places' cuts (their plazas, walks and door aprons keep
// paintChunk's pale walk and meadow grass). The owner's "bright flower, colorful map" (28 October
// 2026), as the round-3 spec of 29 October draws it: each crop field one colour of flowers in rows
// 8 px apart (3 px of leafy furrow, 5 of flowers in 2 x 2 clusters; tulips in beds of four rows, each
// bed another crop's colour), a 1 px rim where the flowers meet the headland, the headland a teal
// green strewn with a few petals of the field's flowers; the farm lanes a grassy crown between two
// pale ruts; the orchards mown in stripes under their petals; the hay in windrows with stubble; the
// start's camp in a pressed straw disc swirled about its middle.
// Inputs are the chunk's lattice (`edge` and `bloom` bilinear, `plot` from the nearest point: right
// wherever a crop's pixel lies, since two fields' flowers are always 26 px or more apart), Bayer and
// hash2. No noise call per pixel. The palette is the look's (MEADOW.terrain), signed (paint.js).

import { hash2, TAU } from '../../engine/util.js';
import { TN, TCHUNK } from './terrain.js';
import { laneY, laneX, cutDist } from './quilt.js';

const CH = TCHUNK;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const SWIRL = (3 * 8) / TAU; // the straw's swirl, turns of its three tones per radian (whole, so no seam)
let MASK = null; // which pixels of the chunk lie in a cut, made once and reused

// The straw of a pressed circle at (dx, dy) from its middle, r its radius: three tones swirling about
// the middle, a 1 px rim at its edge.
export function strawPixel(P, dx, dy, r, bay) {
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > r - 1.2) return P.strawRim;
  const t = Math.floor(d / 3 + Math.atan2(dy, dx) * SWIRL + bay);
  return P.straw[((t % 3) + 3) % 3];
}

// paintQuilt(tc, px, P, topo): tc the chunk's lattice (Quilt.terrain), px its packed pixels, P the
// look's terrain palette.
export function paintQuilt(tc, px, P, topo) {
  const { x0, y0, edge: E, bloom: B, plot: PL, plots, cuts, start } = tc, T = topo.T;
  // The cuts, rasterised once.
  if (!MASK) MASK = new Uint8Array(CH * CH);
  let cut = false;
  if (cuts.length) {
    MASK.fill(0);
    // A plaza or walk (1) keeps paintChunk's pale path; a door's apron (2) is laid as headland.
    for (const c of cuts) {
      const ax = Math.max(0, Math.floor(c.minx - x0)), bx = Math.min(CH - 1, Math.ceil(c.maxx - x0));
      const ay = Math.max(0, Math.floor(c.miny - y0)), by = Math.min(CH - 1, Math.ceil(c.maxy - y0));
      for (let y = ay; y <= by; y++) {
        for (let x = ax; x <= bx; x++) {
          const k = y * CH + x;
          if (MASK[k] !== 1 && cutDist(c, x0 + x, y0 + y) < 0) {
            MASK[k] = c.apron ? 2 : 1;
            cut = true;
          }
        }
      }
    }
  }
  // Each plot's painter: its kind, palette, rows' axis and lanes, the colour its petals litter with.
  const crops = P.crops, tulips = T.tulips.map((n) => crops[n]), colY = new Map();
  const D = plots.map((p) => {
    const d = { kind: p.kind === 'crop' ? 0 : p.kind === 'orchard' ? 1 : 2, axis: p.axis, left: p.left, top: p.top, ys: null, C: null, tulip: false, daisy: false, bed: p.bedStart, litter: 0 };
    if (p.axis === 0) {
      let ys = colY.get(p.top.k);
      if (!ys) {
        ys = new Float64Array(CH);
        for (let x = 0; x < CH; x++) ys[x] = laneY(p.top, x0 + x);
        colY.set(p.top.k, ys);
      }
      d.ys = ys;
    }
    if (p.kind === 'crop') {
      d.tulip = p.crop === 'tulips';
      d.daisy = p.crop === 'daisy';
      d.C = d.tulip ? crops.tulips : crops[p.crop];
      d.litter = (d.tulip ? tulips[p.bedStart % tulips.length] : d.C).bloom[2];
    }
    return d;
  });
  const pitch = T.rows.pitch, furrow = T.rows.furrow, beds = T.rows.bed * pitch, nt = tulips.length;
  const HL = P.headland, LN = P.lane, litH = P.litter.headland, litL = P.litter.lane;
  const sr2 = start ? start.r * start.r : -1;
  for (let y = 0; y < CH; y++) {
    const j = y >> 2, fy = (y & 3) * 0.25, wy = y0 + y, jn = j + ((y & 3) >= 2 ? 1 : 0);
    for (let x = 0; x < CH; x++) {
      const k = y * CH + x, mk = cut ? MASK[k] : 0;
      if (mk === 1) continue;
      const wx = x0 + x, bay = BAYER[((wy & 3) << 2) | (wx & 3)];
      if (start) {
        const dx = wx - start.x, dy = wy - start.y;
        if (dx * dx + dy * dy < sr2) {
          px[k] = strawPixel(P, dx, dy, start.r, bay);
          continue;
        }
      }
      const i = x >> 2, fx = (x & 3) * 0.25, c = j * TN + i;
      const e = (E[c] + (E[c + 1] - E[c]) * fx) * (1 - fy) + (E[c + TN] + (E[c + TN + 1] - E[c + TN]) * fx) * fy;
      const d = D[PL[jn * TN + i + ((x & 3) >= 2 ? 1 : 0)]];
      // A lane: its edge, two ruts, a grassy crown, a petal of the field beside it here and there.
      if (e < 0) {
        const u = -e;
        let col = u < 1.2 ? LN.edge : u >= 2.5 && u < 4.5 ? LN.ruts[hash2(wx, wy, 3) < 0.5 ? 0 : 1] : LN.crown[bay > 0 ? 1 : 0];
        if (d.litter && u >= 1.2 && hash2(wx, wy, 5) < litL) col = d.litter;
        px[k] = col;
        continue;
      }
      if (mk === 2) {
        px[k] = HL[bay < -0.17 ? 0 : bay < 0.17 ? 1 : 2];
        continue;
      }
      // Along the rows: px from the plot's top lane (east-west rows) or its left (north-south).
      const along = d.axis === 0 ? wy - d.ys[x] : (wx - laneX(d.left, wy)) / d.left.nrm;
      if (d.kind === 0) {
        const b = (B[c] + (B[c + 1] - B[c]) * fx) * (1 - fy) + (B[c + TN] + (B[c + TN + 1] - B[c + TN]) * fx) * fy;
        if (b <= 0) {
          // The headland.
          px[k] = d.litter && hash2(wx, wy, 6) < litH ? d.litter : HL[bay < -0.17 ? 0 : bay < 0.17 ? 1 : 2];
          continue;
        }
        const row = Math.floor(along / pitch), pos = along - row * pitch;
        const C = d.tulip ? tulips[(((d.bed + Math.floor((row * pitch) / beds)) % nt) + nt) % nt] : d.C;
        if (b < 1.2) px[k] = C.rim;
        else if (pos < furrow) px[k] = d.C.leaf[hash2(wx, wy, 7) < 0.5 ? 0 : 1];
        else if (d.daisy && !((wx | wy) & 1) && hash2(wx, wy, 11) < 0.12) px[k] = C.heart;
        else {
          let t = Math.floor((hash2(wx >> 1, wy >> 1, 9) + bay * 0.6) * 3);
          px[k] = C.bloom[t < 0 ? 0 : t > 2 ? 2 : t];
        }
      } else if (d.kind === 1) {
        // An orchard: mown in stripes between its rows of trees, petals fallen on it.
        const O = P.orchard;
        if (hash2(wx, wy, 13) < 0.04) px[k] = O.petals[Math.floor(hash2(wx, wy, 14) * 3)];
        else px[k] = O.mown[Math.floor(((d.axis === 0 ? wy : wx) + 22) / 44) & 1];
      } else {
        // Hay: windrows every 16 px, stubble ticks.
        const m = ((along % 16) + 16) % 16;
        if (m < 3) px[k] = P.windrow;
        else if (hash2(wx, wy, 16) < 0.03) px[k] = P.stubble;
        else {
          const t = Math.floor((bay + 0.5) * 1.2 + hash2(wx, wy, 15) * 1.8);
          px[k] = P.hay[t < 0 ? 0 : t > 2 ? 2 : t];
        }
      }
    }
  }
}
