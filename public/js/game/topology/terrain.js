// game/topology's terrain fields and how they are read (28 October 2026): the contracts every part of
// the world reads the ground by (topology/index.js re-exports them), and the pure sampling of a
// TerrainChunk. The owner's words that day: the Sunscorch "has a mountain range at top and bottom",
// the Frostfell's ice where the "hero steps on the ice and continues sliding", the Abyss "patches of
// land connected by bridges" over lava or "a huge fall into the void". Each is a few signed-distance
// fields sampled on a 4 px lattice per 256 px chunk (65 x 65 points, the 65th the next chunk's first):
//   open   px to the nearest wall or gap edge, + where the hero may stand (land and bridge decks)
//   patch  px into quicksand or ice, + inside
//   deck   px onto a bridge's deck, + on it
// Every point query, every collision, every painted pixel and every test reads the same bilinear
// interpolation of the same numbers, so the edge drawn, the edge that holds the hero and surfaceAt
// agree to within a pixel. Pure: no canvas, no sprites (tools/mapgen/endless.mjs reads it too).

// What the ground is at a point (Forest.surfaceAt). 7-15 are kept for the Bloomvale's design.
export const SURFACE = Object.freeze({ GROUND: 0, ROAD: 1, WALL: 2, QUICKSAND: 3, ICE: 4, GAP: 5, BRIDGE: 6 });
export const SURFACE_NAME = ['ground', 'road', 'wall', 'quicksand', 'ice', 'gap', 'bridge'];
// Which surfaces stop the hero (Forest.collide, open, free) and slow a walking monster (WALL_PACE): the
// mountains, the cliffs, an oasis's water (WALL) and the lava or the void (GAP). The owner's rule stands:
// monsters bump into nothing, so for them it is only a slower pace.
export const HERO_BLOCKED = Uint8Array.of(0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
export const FOE_SLOWED = HERO_BLOCKED;
export const TSTEP = 4; // world px between the terrain lattice's points
export const TN = 65; // points a side in a chunk (256 / 4 + 1: its far edge is the next chunk's near one)
export const TMAX = 127; // fields are clamped to ±TMAX px (null field: +TMAX everywhere for open, -TMAX for patch and deck)
export const TCHUNK = 256; // the world's chunk (darkwood.js CHUNK), so this file needs nothing of darkwood's

// Bilinear value of field f of chunk tc at world (x, y) (x, y inside the chunk); `none` when f is null.
export function sampleField(tc, f, x, y, none) {
  if (!f) return none;
  let fx = (x - tc.x0) / TSTEP, fy = (y - tc.y0) / TSTEP;
  fx = fx < 0 ? 0 : fx > TN - 1.0001 ? TN - 1.0001 : fx;
  fy = fy < 0 ? 0 : fy > TN - 1.0001 ? TN - 1.0001 : fy;
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, c = j * TN + i;
  return (f[c] + (f[c + 1] - f[c]) * tx) * (1 - ty) + (f[c + TN] + (f[c + TN + 1] - f[c + TN]) * tx) * ty;
}

// The field `open` and its gradient at (x, y) into `out` ({ open, gx, gy }; gradient per px, not
// normalised). A null field is +TMAX, flat.
export function fieldGrad(tc, x, y, out) {
  const f = tc && tc.open;
  if (!f) {
    out.open = TMAX;
    out.gx = 0;
    out.gy = 0;
    return out;
  }
  let fx = (x - tc.x0) / TSTEP, fy = (y - tc.y0) / TSTEP;
  fx = fx < 0 ? 0 : fx > TN - 1.0001 ? TN - 1.0001 : fx;
  fy = fy < 0 ? 0 : fy > TN - 1.0001 ? TN - 1.0001 : fy;
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, c = j * TN + i;
  const a = f[c], b = f[c + 1], d = f[c + TN], e = f[c + TN + 1];
  out.open = (a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty;
  out.gx = ((b - a) * (1 - ty) + (e - d) * ty) / TSTEP;
  out.gy = ((d - a) * (1 - tx) + (e - b) * tx) / TSTEP;
  return out;
}

// The SURFACE at (x, y): deck > 0 -> BRIDGE; open < 0 -> tc.blocked; patch > 0 -> tc.patchKind;
// within the corridor road's half width of its middle -> ROAD; else GROUND. axis: the corridor's
// ('x' or 'y'), null on islands (their causeways are ground underfoot: nothing goes by ROAD).
export function surfaceOf(tc, x, y, axis) {
  if (!tc) return SURFACE.GROUND;
  if (tc.deck && sampleField(tc, tc.deck, x, y, -TMAX) > 0) return SURFACE.BRIDGE;
  if (tc.open && sampleField(tc, tc.open, x, y, TMAX) < 0) return tc.blocked;
  if (tc.patch && sampleField(tc, tc.patch, x, y, -TMAX) > 0) return tc.patchKind;
  if (tc.road) {
    const u = axis === 'y' ? y - tc.y0 : x - tc.x0, v = axis === 'y' ? x : y;
    let k = Math.round(u / TSTEP);
    k = k < 0 ? 0 : k > TN - 1 ? TN - 1 : k;
    if (Math.abs(v - tc.road[k]) < tc.roadHw[k]) return SURFACE.ROAD;
  }
  return SURFACE.GROUND;
}
