// The Bloomvale's Fae Thread (29 October 2026): the numbers and the pure geometry of the hero's own
// fae rings. The owner's (28 October 2026): "Meadow, IDK what to do with meadow, you guys figure out
// something, have some good game design idea how to make meadow not be identical to forest", and
// "another would be sort of like a bright flower, colorful map." The rings that woke on a clock of
// their own (game/fae-rings.js, gone since) did not register; so the fields' flowers are his now. As
// he walks through the crops he trails a silver thread; walk a circle and cross it, and the fae sow
// it: what the circle holds falls asleep for 2 s, the gems in it fly to him and a crop circle stays
// pressed into the field (game/fae.js brings it to life; enemies.js lullT holds the sleepers).
//
// Pure and Node-safe (no canvas, no sprites, no Math.random), so the tests and the tools
// (tools/mapgen/endless.mjs) draw a sown circle as the game does. Only the Bloomvale's look names this
// table (biomes/meadow.js `fae`); the Darkwood never reads it.

import { TAU } from '../engine/util.js';
import { hexPack } from '../engine/pixels.js';
import { sampleField, TMAX } from './topology/terrain.js';

// Every number of the thread (the build spec of 29 October 2026). The knobs to turn if play says it is
// too kind, bluntest first: rest 8 -> 10, lull 2.0 -> 1.5, minArea 4,000 -> 9,000, points 150 -> 117;
// if he never notices it, minArea -> 3,000 and points -> 180.
export const THREAD = {
  step: 6, // px of path between two points of the thread
  points: 150, // the thread is the last 150 points (900 px) of his path in the bloom
  snap: 96, // px of path in a row off the bloom that clear it (a lane, 32 px, or an avenue, 64, forgive)
  gap: 150, // a crossed segment's newer end is at least this far behind him along the path
  minArea: 4000, // px²: a smaller loop sows nothing (a circle about 72 px across)
  lull: 2.0, // s asleep
  rest: 8, // s with no thread after a sowing
  last: 840, // no thread from 14:00 (the last stand and the dawn stay clean)
  jump: 160, // a step longer than this in one frame (a teleport) clears the thread
  verts: 48, // a loop is simplified to at most this many vertices for every test
  bloomEvery: 22, blooms: 48, // a moonbloom every 22 px of a sowing's rim, at most 48
  open: 0.4, wilt: 3, // the blooms open over 0.4 s, and wilt for 3 s after the lull
  near: 30, // the would-be loop is previewed while a crossable segment is this near him
  tell: 120, // the field's sown edge is told within this of him while a thread exists
  calm: 24, // segments this near him are drawn no brighter than 0.35
  sound: 450, // the bell and the whoosh within this of the hero
  light: 110, // a sowing's pink light through the lull
  circles: 64, // sown circles kept (and replayed into chunks made anew)
  stamp: 6, // px of bloom path between two stamps of the walked track
  teach: { after: 5, len: 300 }, // the first banner: not before 0:05, at 300 px of thread
};

// ---- The thread: a ring of its last THREAD.points points ---------------------------------------

// Where a step crosses a segment (segCross), the one array, filled again by the next call.
const HIT = [0, 0];

// A ring of x, y and path distance (px of his path at that point), oldest to newest; nothing is
// allocated once it is made.
export class Thread {
  constructor(cap = THREAD.points) {
    this.cap = cap;
    this.xs = new Float32Array(cap);
    this.ys = new Float32Array(cap);
    this.ds = new Float32Array(cap);
    this.head = 0; // where the next point goes
    this.n = 0;
    this.ix = 0; // the crossing point (cross)
    this.iy = 0;
    this.nx = 0; // the nearest point on the nearest crossable segment (nearest), and how far
    this.ny = 0;
    this.nd = Infinity;
  }
  // The ring's slot of point i (0 the oldest, n - 1 the newest).
  at(i) {
    return (this.head - this.n + i + this.cap) % this.cap;
  }
  x(i) {
    return this.xs[this.at(i)];
  }
  y(i) {
    return this.ys[this.at(i)];
  }
  d(i) {
    return this.ds[this.at(i)];
  }
  add(x, y, d) {
    const k = this.head;
    this.xs[k] = x;
    this.ys[k] = y;
    this.ds[k] = d;
    this.head = (k + 1) % this.cap;
    if (this.n < this.cap) this.n++;
  }
  clear() {
    this.n = 0;
  }
  // Its length along the path, px.
  get span() {
    return this.n < 2 ? 0 : this.d(this.n - 1) - this.d(0);
  }
  // The newest segment (i, i + 1) whose newer end is at least `gap` px of path behind dNow and that
  // the step (ax, ay) -> (bx, by) properly crosses: its i, the crossing in (ix, iy); -1 for none.
  cross(ax, ay, bx, by, dNow, gap) {
    const lim = dNow - gap;
    for (let i = this.n - 2; i >= 0; i--) {
      const a = this.at(i), b = this.at(i + 1);
      if (this.ds[b] > lim) continue;
      if (segCross(ax, ay, bx, by, this.xs[a], this.ys[a], this.xs[b], this.ys[b], HIT)) {
        this.ix = HIT[0];
        this.iy = HIT[1];
        return i;
      }
    }
    return -1;
  }
  // The crossable segment (as cross) nearest (x, y): its i, the nearest point on it in (nx, ny) and
  // how far in nd; -1 for none.
  nearest(x, y, dNow, gap) {
    const lim = dNow - gap;
    let best = -1, bd = Infinity;
    for (let i = this.n - 2; i >= 0; i--) {
      const a = this.at(i), b = this.at(i + 1);
      if (this.ds[b] > lim) continue;
      const ax = this.xs[a], ay = this.ys[a], ex = this.xs[b] - ax, ey = this.ys[b] - ay, l2 = ex * ex + ey * ey;
      let t = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + ex * t, py = ay + ey * t, d2 = (px - x) ** 2 + (py - y) ** 2;
      if (d2 < bd) {
        bd = d2;
        best = i;
        this.nx = px;
        this.ny = py;
      }
    }
    this.nd = Math.sqrt(bd);
    return best;
  }
  // The loop closed across segment i at (ix, iy): the crossing, the thread's points from the segment's
  // newer end to the newest, and the step's start (lx, ly), flat into out ([x, y, x, y...]); its
  // vertex count.
  loop(i, ix, iy, lx, ly, out) {
    let k = 0;
    out[k++] = ix;
    out[k++] = iy;
    for (let j = i + 1; j < this.n; j++) {
      const s = this.at(j);
      out[k++] = this.xs[s];
      out[k++] = this.ys[s];
    }
    out[k++] = lx;
    out[k++] = ly;
    return k >> 1;
  }
}

// ---- Pure geometry on flat polygons ([x0, y0, x1, y1, ...], n vertices) -----------------------

// Whether the step a -> b properly crosses the segment c -> d: the crossing into out ([x, y]). The
// step counts its far end and not its near one, the segment its near end and not its far one, so a
// crossing through a point of the thread counts once and a step that ends on a line crosses it then,
// not again next frame. Collinear overlap is no crossing.
export function segCross(ax, ay, bx, by, cx, cy, dx, dy, out) {
  const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (den === 0) return false;
  const qx = cx - ax, qy = cy - ay;
  const t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
  if (!(t > 0 && t <= 1 && u >= 0 && u < 1)) return false;
  if (out) {
    out[0] = ax + rx * t;
    out[1] = ay + ry * t;
  }
  return true;
}

// A polygon's area (the shoelace), px², whichever way it winds.
export function area(poly, n) {
  let s = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) s += poly[2 * j] * poly[2 * i + 1] - poly[2 * i] * poly[2 * j + 1];
  return Math.abs(s) / 2;
}

// Whether (x, y) is inside the polygon (even-odd), so a loop that crosses itself holds what it
// holds an odd number of times.
export function inside(poly, n, x, y) {
  let c = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[2 * i], yi = poly[2 * i + 1], xj = poly[2 * j], yj = poly[2 * j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// At most `max` of the polygon's vertices into out: every ceil(n / max)-th, from the first (a loop's
// crossing, so it is kept). Its vertex count.
export function simplify(poly, n, max, out) {
  const k = Math.ceil(n / max);
  let m = 0;
  for (let i = 0; i < n; i += k) {
    out[2 * m] = poly[2 * i];
    out[2 * m + 1] = poly[2 * i + 1];
    m++;
  }
  return m;
}

// ---- The straw: the start's disc and every sown circle, painted alike --------------------------

// The look's straw (look.terrain: straw, three tones; strawRim; tread, two tones), or the spec's own
// where the look has none yet, packed as paintChunk lays its colours. Made once per look.
const DEF = { straw: ['#ead4aa', '#e0c694', '#d2b27e'], strawRim: '#b08a62', tread: ['#e0c89a', '#d4b888'] };
const PALS = new WeakMap();
const packs = (v, hexes) => Int32Array.from(Array.isArray(v) || ArrayBuffer.isView(v) ? v : hexes.map((h) => hexPack(h)), (c) => c | 0);
export function strawPalette(T) {
  const key = T || DEF;
  let S = PALS.get(key);
  if (S) return S;
  const t = T || {};
  S = {
    straw: packs(t.straw, DEF.straw),
    strawRim: (typeof t.strawRim === 'number' ? t.strawRim : hexPack(DEF.strawRim)) | 0,
    tread: packs(t.tread, DEF.tread),
  };
  PALS.set(key, S);
  return S;
}

// A 4 x 4 Bayer matrix, in [-0.5, 0.5), by world pixel, so neighbouring chunks agree: the same as
// topology/paint-quilt.js lays the start's disc with (its strawPixel), so a sown circle's straw is the
// disc's.
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
export const bayerAt = (wx, wy) => BAY[(wy & 3) * 4 + (wx & 3)];

// The straw's swirl at (dx, dy) from a circle's centre, r = its length: the tone of P.straw at
// floor(r / 3 + 24·θ/TAU + bay) mod 3, laid in rings 3 px apart and turned about the centre (24
// turns of tone a round, a whole number of threes, so there is no seam where θ wraps).
export function strawAt(dx, dy, r, bay, P) {
  const v = Math.floor(r / 3 + (Math.atan2(dy, dx) / TAU) * 24 + bay);
  return P.straw[((v % 3) + 3) % 3];
}

// Whether (x, y) is within `lim` px of any of the polygon's edges. An edge whose box, `lim` px round,
// misses the point is passed over at once (29 October 2026): every pixel of a sowing tests all its
// edges, and a wide one (280 px across, some 60,000 pixels by 48 edges) cost a frame's hitch.
function nearEdge(poly, n, x, y, lim) {
  const l2 = lim * lim;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = poly[2 * j], ay = poly[2 * j + 1], bx = poly[2 * i], by = poly[2 * i + 1];
    if ((x < ax - lim && x < bx - lim) || (x > ax + lim && x > bx + lim) || (y < ay - lim && y < by - lim) || (y > ay + lim && y > by + lim)) continue;
    const ex = bx - ax, ey = by - ay, e2 = ex * ex + ey * ey;
    let t = e2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / e2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    if ((ax + ex * t - x) ** 2 + (ay + ey * t - y) ** 2 < l2) return true;
  }
  return false;
}

// The crossings of a scanline (rasterCircle), sorted; a loop has at most 152 vertices.
const XS = new Float64Array(160);

// A sown circle pressed into packed pixels: `out` holds w x h pixels whose top left is world (x0, y0);
// every pixel whose middle is inside the polygon (even-odd) and on the bloom (tc's `bloom` lattice > 0:
// crops only, so lanes, headlands and plazas cross a circle unpressed; everywhere without a lattice)
// takes the straw's swirl about (cx, cy), and a 2 px rim of P.strawRim inside its edge. Deterministic:
// the same polygon gives the same pixels. Its count of pixels written.
export function rasterCircle(poly, n, cx, cy, x0, y0, w, h, tc, P, out) {
  if (n < 3) return 0;
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = poly[2 * i], y = poly[2 * i + 1];
    if (x < minx) minx = x;
    if (x > maxx) maxx = x;
    if (y < miny) miny = y;
    if (y > maxy) maxy = y;
  }
  const j0 = Math.max(0, Math.floor(miny - y0)), j1 = Math.min(h - 1, Math.ceil(maxy - y0));
  if (j0 > j1 || maxx < x0 || minx > x0 + w) return 0;
  const B = tc && tc.bloom, rim = P.strawRim;
  let wrote = 0;
  for (let j = j0; j <= j1; j++) {
    const y = y0 + j + 0.5;
    let m = 0;
    for (let i = 0, k = n - 1; i < n; k = i++) {
      const yi = poly[2 * i + 1], yk = poly[2 * k + 1];
      if (yi > y !== yk > y) {
        const xi = poly[2 * i], xk = poly[2 * k], x = xi + ((y - yi) * (xk - xi)) / (yk - yi);
        // Insertion sort: a scanline crosses few edges.
        let q = m++;
        while (q > 0 && XS[q - 1] > x) {
          XS[q] = XS[q - 1];
          q--;
        }
        XS[q] = x;
      }
    }
    const wy = y0 + j, row = j * w;
    for (let s = 0; s + 1 < m; s += 2) {
      const a = Math.max(0, Math.ceil(XS[s] - 0.5 - x0)), b = Math.min(w - 1, Math.ceil(XS[s + 1] - 0.5 - x0) - 1);
      for (let i = a; i <= b; i++) {
        const wx = x0 + i, px = wx + 0.5;
        if (B && sampleField(tc, B, px, y, -TMAX) <= 0) continue;
        if (nearEdge(poly, n, px, y, 2)) out[row + i] = rim;
        else {
          const dx = px - cx, dy = y - cy;
          out[row + i] = strawAt(dx, dy, Math.sqrt(dx * dx + dy * dy), bayerAt(wx, wy), P);
        }
        wrote++;
      }
    }
  }
  return wrote;
}
