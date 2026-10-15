// The Darkwood's map: an endless forest, laid out the same in every run. Nothing is stored:
// each 256 px chunk is worked out from the world seed and its own position, so it comes out
// the same whenever, and in whatever order, it is made. The roads form a loose diagonal
// lattice. The run starts on a crossroads with four roads out towards the four corners; each
// road keeps to its heading with a bend here and there, and ends some 30 s of walking later at
// another crossroads with a shrine. Landmarks sit in the woods between the roads, down footpaths.
// Layout and pixels only, no canvas, so tools/mapgen/endless.mjs can draw previews from it too.

import { fbm, valueNoise, hash2, mulberry32, clamp, TAU } from '../engine/util.js';
import { hexPack } from '../engine/pixels.js';

// Everything the world is made from.
export const DARKWOOD = {
  seed: 1,
  spacing: 1500, // crossroads sit near (i, j) * spacing with i + j even: neighbours are ~2120 px apart
  stray: 0.2, // how far a crossroads strays from its lattice point, as a share of the spacing
  dropRoad: 0.16, // the odd road is left out, but every crossroads keeps three or four
  bend: 0.3, // the most a bend turns a road off its heading (tan of about 17°)
  trees: 1, // how thick the groves are
};
export const CHUNK = 256; // the game's chunk size
const CELL = 8; // resolution of a chunk's fields
const RMAX = 176; // the fields only care how far a path is up to here (trees thin out up to 165 px from a road)
const MARGIN = 112; // a chunk's fields reach this far beyond it, so trees just over the edge are known
const GN = (CHUNK + 2 * MARGIN) / CELL;
export const TREE_NAMES = new Set(['oak1', 'oak2', 'oak3', 'pine1', 'pine2', 'deadtree1', 'deadtree2']);
const SHRINE_TYPES = ['fury', 'haste', 'fortune', 'wisdom', 'protection'];

let SEED, D, JIT, h, rngOf, SHRINE_ORDER;
const roadCache = new Map(), placeCache = new Map(), landmarkCache = new Map();
// Another world (the map tools try other seeds); the game keeps the default.
export function setWorld(o = {}) {
  Object.assign(DARKWOOD, o);
  SEED = DARKWOOD.seed;
  D = DARKWOOD.spacing;
  JIT = DARKWOOD.stray * D;
  // Hashes of integer coordinates: the only source of randomness, so any piece can be made alone.
  h = (a, b, k) => hash2(a, b, SEED * 977 + k * 7919);
  rngOf = (a, b, k) => mulberry32((h(a, b, k) * 4294967296) >>> 0);
  // (i + 3j) mod 5 differs between any two neighbouring crossroads, so the roads out of any one
  // lead to different shrines; the seed shuffles which type is which.
  const r = rngOf(0, 0, 15);
  SHRINE_ORDER = [...SHRINE_TYPES];
  for (let k = SHRINE_ORDER.length - 1; k > 0; k--) {
    const m = Math.floor(r() * (k + 1));
    [SHRINE_ORDER[k], SHRINE_ORDER[m]] = [SHRINE_ORDER[m], SHRINE_ORDER[k]];
  }
  roadCache.clear();
  placeCache.clear();
  landmarkCache.clear();
}
setWorld();

const ss = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
// Bilinear interpolation in a grid N wide, from the cell at c, with the four weights.
const lerp4 = (a, c, N, w00, w10, w01, w11) => a[c] * w00 + a[c + 1] * w10 + a[c + N] * w01 + a[c + N + 1] * w11;

// Evenly spaced points along a polyline.
function resample(pts, step) {
  const n = pts.length, cum = [0];
  for (let i = 0; i < n - 1; i++) cum.push(cum[i] + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]));
  const L = cum[n - 1], m = Math.max(2, Math.round(L / step)), out = [];
  let j = 0;
  for (let k = 0; k <= m; k++) {
    const s = (k / m) * L;
    while (j < n - 2 && cum[j + 1] < s) j++;
    const a = pts[j], b = pts[j + 1], t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
const normalsOf = (pts) =>
  pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [ty / l, -tx / l];
  });
// Corner cutting that keeps the two ends where they are.
function chaikin(p) {
  const out = [p[0]];
  for (let k = 0; k < p.length - 1; k++) {
    const [ax, ay] = p[k], [bx, by] = p[k + 1];
    out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
  }
  out.push(p[p.length - 1]);
  return out;
}
// A path as the chunks see it: points, a half width at each, and its bounds.
function pathOf(kind, xs, ys, hw, av = null) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (let k = 0; k < xs.length; k++) {
    minx = Math.min(minx, xs[k] - hw[k]);
    maxx = Math.max(maxx, xs[k] + hw[k]);
    miny = Math.min(miny, ys[k] - hw[k]);
    maxy = Math.max(maxy, ys[k] + hw[k]);
  }
  return { kind, xs, ys, hw, av: av || new Uint8Array(xs.length), minx, miny, maxx, maxy };
}
const overlaps = (p, x0, y0, x1, y1) => p.minx < x1 && p.maxx > x0 && p.miny < y1 && p.maxy > y0;
const farFrom = (p, x, y, r) => x < p.minx - r || x > p.maxx + r || y < p.miny - r || y > p.maxy + r;

// ---- The lattice: crossroads, and the roads between them --------------------------------------
const isOrigin = (i, j) => i === 0 && j === 0;
// Every road joins a crossroads with both coordinates even to one with both odd, so the
// even ones are every second crossroads along any walk: a crypt about a minute apart.
export const isCrypt = (i, j) => ((i | j) & 1) === 0 && !isOrigin(i, j);
// 1 for the ring of crypts nearest the start, 2 for the next, and so on.
export const cryptDepth = (i, j) => Math.max(Math.abs(i), Math.abs(j)) / 2;
// The start has a crypt of its own too, a step from the hero, as deep as the first ring's.
const hasCrypt = (i, j) => isCrypt(i, j) || isOrigin(i, j);
// The run starts on the crossroads at (0, 0); every other one strays a little from its lattice point.
export const node = (i, j) =>
  isOrigin(i, j) ? { x: 0, y: 0 } : { x: i * D + (h(i, j, 1) - 0.5) * 2 * JIT, y: j * D + (h(i, j, 2) - 0.5) * 2 * JIT };
// A road is named by its west end (i, j) and whether it heads south-east (s = 1) or north-east (s = -1).
const roadId = (i, s) => 2 * i + (s > 0 ? 1 : 0);
const roadHash = (i, j, s) => h(roadId(i, s), j, 3);
export const roadsOf = (i, j) => [[i, j, 1], [i, j, -1], [i - 1, j - 1, 1], [i - 1, j + 1, -1]];
// Each crossroads may give up at most one road, its least-hashed one if that is under dropRoad,
// and a road goes only if both its ends give it up. So no crossroads is ever left with fewer than three.
function givesUp(i, j) {
  if (isOrigin(i, j)) return null;
  let best = null, bh = DARKWOOD.dropRoad;
  for (const e of roadsOf(i, j)) {
    const v = roadHash(...e);
    if (v < bh) {
      bh = v;
      best = e;
    }
  }
  return best;
}
const sameRoad = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
export const roadExists = (i, j, s) => !(sameRoad(givesUp(i, j), [i, j, s]) && sameRoad(givesUp(i + 1, j + s), [i, j, s]));

export function road(i, j, s) {
  const key = `${i},${j},${s}`;
  let e = roadCache.get(key);
  if (e) return e;
  const id = roadId(i, s), r = rngOf(id, j, 4), es = Math.floor(h(id, j, 5) * 1e6);
  const A = node(i, j), B = node(i + 1, j + s);
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  // Straight out of each crossroads, then one to three places where the road steps aside.
  const ts = [0, 0.1], os = [0, 0];
  const nb = r.int(1, 3);
  for (let k = 0; k < nb; k++) {
    ts.push(0.18 + (0.64 * (k + r.range(0.2, 0.8))) / nb);
    os.push((r() < 0.5 ? -1 : 1) * r.range(0.03, 0.08) * L);
  }
  ts.push(0.9, 1);
  os.push(0, 0);
  // No stretch may turn more than `bend` off the heading: scale the steps down if one would.
  let steep = 0;
  for (let k = 1; k < ts.length; k++) steep = Math.max(steep, Math.abs(os[k] - os[k - 1]) / ((ts[k] - ts[k - 1]) * L));
  const f = Math.min(1, DARKWOOD.bend / (steep || 1));
  const ctrl = ts.map((t, k) => [A.x + dx * t + nx * os[k] * f, A.y + dy * t + ny * os[k] * f]);
  // Straight runs with rounded bends: extra points along each run keep it straight while the
  // corner cutting rounds off only the last and first 30% either side of a bend.
  let pts = [];
  for (let k = 0; k < ctrl.length - 1; k++) {
    const [ax, ay] = ctrl[k], [bx, by] = ctrl[k + 1];
    for (const u of [0, 0.3, 0.7]) pts.push([ax + (bx - ax) * u, ay + (by - ay) * u]);
  }
  pts.push(ctrl[ctrl.length - 1]);
  for (let pass = 0; pass < 4; pass++) pts = chaikin(pts);
  pts = resample(pts, 4);
  const nrm = normalsOf(pts), n = pts.length, len = (n - 1) * 4;
  const xs = new Float64Array(n), ys = new Float64Array(n), hw = new Float32Array(n), av = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1), a = u * len;
    const w = (fbm(a / 170, 3.7, es, 2) - 0.5) * 8 * Math.sin(Math.PI * u); // a slight hand-made wobble
    xs[k] = pts[k][0] + nrm[k][0] * w;
    ys[k] = pts[k][1] + nrm[k][1] * w;
    hw[k] = 13 + 4.5 * (fbm(a / 520, 1.3, es + 23, 2) - 0.5) * 2;
    av[k] = fbm(a / 700, 2.9, es + 61, 2) > 0.6 ? 1 : 0; // here and there an avenue of trees
  }
  e = pathOf('road', xs, ys, hw, av);
  e.key = key;
  e.len = len;
  roadCache.set(key, e);
  return e;
}

// ---- Zones and groves: fields of position alone, so they are endless already ----------------------
export function zoneRaw(x, y) {
  const fade = ss(700, 1400, Math.hypot(x, y)); // the start is an oak meadow
  const cursed = ss(0.6, 0.665, fbm(x / 1900, y / 1900, SEED + 31, 2)) * fade;
  const pine = ss(0.5, 0.565, fbm(x / 1500 + 7.3, y / 1500 - 3.1, SEED + 47, 2)) * (1 - cursed) * fade;
  return [pine, cursed];
}
const groveRaw = (x, y) => ss(0.57, 0.7, fbm(x / 640, y / 640, SEED + 3, 3));

// ---- Places: the crossroads and their shrines, and landmarks between the roads ------------------
export const shrineType = (i, j) => SHRINE_ORDER[(((i + 3 * j) % 5) + 5) % 5];
// The directions of the open ground between a crossroads' roads, widest first.
function wedges(i, j, x, y) {
  const angles = [];
  for (const [a, b, s] of roadsOf(i, j)) {
    if (!roadExists(a, b, s)) continue;
    const e = road(a, b, s), k = a === i && b === j ? 12 : e.xs.length - 13; // 48 px out along it
    angles.push(Math.atan2(e.ys[k] - y, e.xs[k] - x));
  }
  angles.sort((p, q) => p - q);
  return angles
    .map((a, k) => {
      const next = k + 1 < angles.length ? angles[k + 1] : angles[0] + TAU;
      return { dir: (a + next) / 2, width: next - a };
    })
    .sort((p, q) => q.width - p.width);
}
// A crossroads: the start, or a wayside shrine with a lantern either side, and at every
// second one a crypt. The shrine and the crypt are the game's to draw and use; the props
// here are the dressing round them.
export function place(i, j) {
  const key = `${i},${j}`;
  let P = placeCache.get(key);
  if (P) return P;
  const { x, y } = node(i, j), start = isOrigin(i, j), r = rngOf(i, j, 11);
  P = { x, y, i, j, key, kind: start ? 'start' : 'shrine', props: [] };
  P.path = pathOf('plaza', [x], [y], [start ? 40 : 32]);
  P.clear = { x, y, r: start ? 190 : isCrypt(i, j) ? 150 : 130 };
  const add = (n, px, py, extra) => P.props.push({ n, x: Math.round(px), y: Math.round(py), ...extra });
  const W = wedges(i, j, x, y);
  const at = (w, d) => [x + Math.cos(w.dir) * d, y + Math.sin(w.dir) * d * 0.8];
  const northmost = () => [...W].sort((p, q) => Math.abs(Math.sin(p.dir) + 1) - Math.abs(Math.sin(q.dir) + 1))[0];
  let door = null;
  if (hasCrypt(i, j)) {
    // The crypt stands in the open ground to the north, its door facing the crossroads,
    // with a gravel walk up to its steps.
    door = northmost();
    const [cx, cy] = at(door, 78);
    P.crypt = { key, x: Math.round(cx), y: Math.round(cy), depth: start ? 1 : cryptDepth(i, j) };
    const xs = [x], ys = [y], hw = [start ? 40 : 32];
    const len = Math.hypot(cx - x, cy - y);
    for (let d = 26; d <= len; d += 4) {
      xs.push(x + ((cx - x) * d) / len);
      ys.push(y + ((cy - y) * d) / len);
      hw.push(9);
    }
    P.path = pathOf('plaza', xs, ys, hw);
  }
  if (start) {
    // A campfire in the open ground to the south, the crypt to the north, the hero between;
    // a lantern to one side and a waystone to the other.
    const south = [...W].sort((p, q) => Math.abs(Math.sin(p.dir) - 1) - Math.abs(Math.sin(q.dir) - 1))[0];
    const [fx, fy] = at(south, 84);
    add('campfire', fx, fy, { anim: 8, light: ['fire', 110] });
    add('stump', fx - 24, fy - 4);
    add('stump', fx + 23, fy + 6);
    const [lamp, stone] = W.filter((w) => w !== south && w !== door);
    if (lamp) add('lantern', ...at(lamp, 66), { light: ['warm', 60] });
    if (stone) add('menhir', ...at(stone, 70), { light: ['cyan', 40] });
    P.hero = { x: Math.round(x + 4), y: Math.round(y + 18) };
  } else {
    P.type = shrineType(i, j);
    add('lantern', x - 19, y + 3, { light: ['warm', 60] });
    add('lantern', x + 19, y + 3, { light: ['warm', 60] });
    for (const w of W.filter((w) => w !== door).slice(0, 2)) {
      for (let k = r.int(1, 3); k > 0; k--) {
        const [px, py] = at({ dir: w.dir + r.range(-0.25, 0.25) }, r.range(54, 78));
        add(r() < 0.5 ? 'redcaps' : 'rock3', px, py);
      }
    }
  }
  placeCache.set(key, P);
  return P;
}
// Where the hero starts: on the first crossroads, by the campfire.
export const start = () => place(0, 0).hero;
// The crypts of the crossroads within r of a point.
export function cryptsNear(x, y, r) {
  const out = [];
  for (let j = Math.floor((y - r) / D) - 1; j <= Math.ceil((y + r) / D) + 1; j++) {
    for (let i = Math.floor((x - r) / D) - 1; i <= Math.ceil((x + r) / D) + 1; i++) {
      if ((i + j) & 1 || !hasCrypt(i, j)) continue;
      const n = node(i, j);
      if ((n.x - x) ** 2 + (n.y - y) ** 2 <= r * r) out.push(place(i, j).crypt);
    }
  }
  return out;
}
// The shrines of the crossroads within r of a point.
export function shrinesNear(x, y, r) {
  const out = [];
  for (let j = Math.floor((y - r) / D) - 1; j <= Math.ceil((y + r) / D) + 1; j++) {
    for (let i = Math.floor((x - r) / D) - 1; i <= Math.ceil((x + r) / D) + 1; i++) {
      if ((i + j) & 1 || isOrigin(i, j)) continue;
      const n = node(i, j);
      if ((n.x - x) ** 2 + (n.y - y) ** 2 <= r * r) out.push({ key: `${i},${j}`, x: n.x, y: n.y, type: shrineType(i, j) });
    }
  }
  return out;
}

// A footpath that wanders a little on its way out to a landmark.
function footpath(ax, ay, bx, by, seed, wander) {
  const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(len / 4));
  const nx = -(by - ay) / len, ny = (bx - ax) / len, xs = [], ys = [], hw = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const w = Math.sin(t * Math.PI) * (fbm((t * len) / 260, 0.5, seed, 2) - 0.5) * 2 * Math.min(wander, len * 0.3);
    xs.push(ax + (bx - ax) * t + nx * w);
    ys.push(ay + (by - ay) * t + ny * w);
    hw.push(6.5);
  }
  return pathOf('footpath', xs, ys, hw);
}
// The woods between four roads (i + j odd) may hold a landmark, down a footpath from the nearest road.
export function landmark(i, j) {
  const key = `${i},${j}`;
  if (landmarkCache.has(key)) return landmarkCache.get(key);
  let L = null;
  if (h(i, j, 6) < 0.55) {
    const x = i * D + (h(i, j, 7) - 0.5) * 0.36 * D, y = j * D + (h(i, j, 8) - 0.5) * 0.36 * D;
    const cursed = zoneRaw(x, y)[1];
    const kind = cursed > 0.5 ? 'graveyard' : ['circle', 'ruins', 'woodcamp', 'ruins', 'circle'][Math.floor(h(i, j, 9) * 5)];
    let best = Infinity, bx = 0, by = 0;
    for (const [a, b, s] of [[i - 1, j, -1], [i - 1, j, 1], [i, j - 1, 1], [i, j + 1, -1]]) {
      if (!roadExists(a, b, s)) continue;
      const e = road(a, b, s);
      for (let k = 0; k < e.xs.length; k += 2) {
        const d = (e.xs[k] - x) ** 2 + (e.ys[k] - y) ** 2;
        if (d < best) {
          best = d;
          bx = e.xs[k];
          by = e.ys[k];
        }
      }
    }
    L = { x, y, i, j, kind, props: [], clear: { x, y, r: kind === 'woodcamp' ? 100 : 128 } };
    L.path = footpath(bx, by, x, y + 30, Math.floor(h(i, j, 14) * 1e6), 140);
    const r = rngOf(i, j, 10);
    const add = (n, px, py, extra) => L.props.push({ n, x: Math.round(px), y: Math.round(py), ...extra });
    if (kind === 'circle') {
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * TAU;
        add('menhir', x + Math.cos(a) * 50, y + Math.sin(a) * 36, { light: ['cyan', 34] });
      }
      add('campfire', x, y, { anim: 8, light: ['fire', 110] });
    } else if (kind === 'ruins') {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + r.range(-0.25, 0.25);
        add(r() < 0.5 ? 'ruinpillar' : 'brokenpillar', x + Math.cos(a) * 46, y + Math.sin(a) * 32);
      }
      add('rubble', x + r.range(-16, 16), y + r.range(-8, 8));
      add('rubble', x + r.range(-28, 28), y + r.range(-16, 16));
    } else if (kind === 'graveyard') {
      for (let row = 0; row < 3; row++) {
        for (let k = 0; k < 4; k++) {
          if (r() < 0.8) add(r() < 0.6 ? 'gravestone' : 'gravecross', x - 36 + k * 24 + r.range(-3, 3), y - 22 + row * 22 + r.range(-2, 2));
        }
      }
      add(r() < 0.5 ? 'deadtree1' : 'deadtree2', x + 58, y - 30);
      add('lantern', x - 50, y + 30, { light: ['warm', 60] });
    } else {
      add('campfire', x, y, { anim: 8, light: ['fire', 110] });
      for (let k = 0; k < 4; k++) add('stump', x + r.range(-50, 50), y + r.range(-34, 34));
    }
  }
  landmarkCache.set(key, L);
  return L;
}

// Everything that reaches into a box of the world.
function features(bx0, by0, bx1, by1) {
  const paths = [], places = [], landmarks = [];
  const i0 = Math.floor(bx0 / D) - 2, i1 = Math.ceil(bx1 / D) + 2;
  const j0 = Math.floor(by0 / D) - 2, j1 = Math.ceil(by1 / D) + 2;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      if (((i + j) & 1) === 0) {
        for (const s of [1, -1]) {
          if (!roadExists(i, j, s)) continue;
          const e = road(i, j, s);
          if (overlaps(e, bx0, by0, bx1, by1)) paths.push(e);
        }
        const n = node(i, j);
        if (n.x > bx0 - 260 && n.x < bx1 + 260 && n.y > by0 - 260 && n.y < by1 + 260) {
          const P = place(i, j);
          places.push(P);
          paths.push(P.path);
        }
      } else {
        const L = landmark(i, j);
        if (L && (overlaps(L.path, bx0, by0, bx1, by1) || (Math.abs(L.x - (bx0 + bx1) / 2) < (bx1 - bx0) / 2 + 200 && Math.abs(L.y - (by0 + by1) / 2) < (by1 - by0) / 2 + 200))) {
          landmarks.push(L);
          paths.push(L.path);
        }
      }
    }
  }
  return { paths, places, landmarks };
}

// Forget the roads and places far from (x, y); they come back the same if needed again.
export function trimCaches(x, y, keep = 2.5 * D) {
  for (const [k, e] of roadCache) if (farFrom(e, x, y, keep)) roadCache.delete(k);
  for (const [k, P] of placeCache) if (Math.hypot(P.x - x, P.y - y) > keep) placeCache.delete(k);
  for (const [k, L] of landmarkCache) if (!L || Math.hypot(L.x - x, L.y - y) > keep) landmarkCache.delete(k);
}
export const cacheSizes = () => ({ roads: roadCache.size, places: placeCache.size, landmarks: landmarkCache.size, roadList: [...roadCache.values()] });

// ---- A chunk: its fields, then its props --------------------------------------------------
const TC = 22; // trees are candidates on a 22 px jittered grid
const TREE_GAP = 30;
// The props whose feet stand in chunk (cx, cy), the shrines too, and the fields that paintChunk needs.
export function layoutChunk(cx, cy) {
  const x0 = cx * CHUNK, y0 = cy * CHUNK, x1 = x0 + CHUNK, y1 = y0 + CHUNK;
  const gx0 = x0 - MARGIN, gy0 = y0 - MARGIN, gx1 = gx0 + GN * CELL, gy1 = gy0 + GN * CELL;
  const F = features(gx0 - RMAX, gy0 - RMAX, gx1 + RMAX, gy1 + RMAX);

  // The paths as flat arrays, and how far each field cell is from the nearest path's edge.
  const PX = [], PY = [], PW = [], PID = [], AV = [], paths = [];
  for (const p of F.paths) {
    const start = PX.length;
    for (let k = 0; k < p.xs.length; k++) {
      PX.push(p.xs[k]);
      PY.push(p.ys[k]);
      PW.push(p.hw[k]);
      PID.push(paths.length);
      AV.push(p.av[k]);
    }
    paths.push({ kind: p.kind, start, end: PX.length });
  }
  const NC = GN * GN;
  const dist = new Float32Array(NC).fill(RMAX), nearP = new Int32Array(NC).fill(-1);
  for (const P of paths) {
    for (let k = P.start; k < P.end; k += P.end - P.start > 1 ? 2 : 1) {
      const px = PX[k], py = PY[k];
      if (px < gx0 - RMAX || px > gx1 + RMAX || py < gy0 - RMAX || py > gy1 + RMAX) continue;
      const i0 = Math.max(0, Math.floor((px - RMAX - gx0) / CELL)), i1 = Math.min(GN - 1, Math.floor((px + RMAX - gx0) / CELL));
      const j0 = Math.max(0, Math.floor((py - RMAX - gy0) / CELL)), j1 = Math.min(GN - 1, Math.floor((py + RMAX - gy0) / CELL));
      for (let j = j0; j <= j1; j++) {
        const dy = gy0 + (j + 0.5) * CELL - py;
        for (let i = i0; i <= i1; i++) {
          const dx = gx0 + (i + 0.5) * CELL - px, d = Math.sqrt(dx * dx + dy * dy) - PW[k], c = j * GN + i;
          if (d < dist[c]) {
            dist[c] = d;
            nearP[c] = k;
          }
        }
      }
    }
  }
  const clearF = new Float32Array(NC);
  for (const c of [...F.places, ...F.landmarks].map((p) => p.clear)) {
    const R = c.r * 1.3;
    for (let j = Math.max(0, Math.floor((c.y - R - gy0) / CELL)); j <= Math.min(GN - 1, Math.floor((c.y + R - gy0) / CELL)); j++) {
      for (let i = Math.max(0, Math.floor((c.x - R - gx0) / CELL)); i <= Math.min(GN - 1, Math.floor((c.x + R - gx0) / CELL)); i++) {
        const dx = gx0 + (i + 0.5) * CELL - c.x, dy = gy0 + (j + 0.5) * CELL - c.y, a = Math.atan2(dy, dx);
        const rr = c.r * (1 + 0.42 * (valueNoise(Math.cos(a) * 1.8 + c.x * 0.01, Math.sin(a) * 1.8 + c.y * 0.01, SEED + 13) - 0.5));
        const v = ss(rr, rr * 0.7, Math.sqrt(dx * dx + dy * dy));
        if (v > clearF[j * GN + i]) clearF[j * GN + i] = v;
      }
    }
  }
  // Zones and groves change slowly: work them out on a 32 px lattice of the world and interpolate.
  const LS = 32, lx0 = Math.floor(gx0 / LS), ly0 = Math.floor(gy0 / LS), LN = (GN * CELL) / LS + 2;
  const pineL = new Float32Array(LN * LN), cursedL = new Float32Array(LN * LN), groveL = new Float32Array(LN * LN);
  for (let j = 0; j < LN; j++) {
    for (let i = 0; i < LN; i++) {
      const x = (lx0 + i) * LS, y = (ly0 + j) * LS, [p, cu] = zoneRaw(x, y);
      pineL[j * LN + i] = p;
      cursedL[j * LN + i] = cu;
      groveL[j * LN + i] = groveRaw(x, y);
    }
  }
  const pineF = new Float32Array(NC), cursedF = new Float32Array(NC), groveF = new Float32Array(NC);
  for (let j = 0; j < GN; j++) {
    const fy = (gy0 + (j + 0.5) * CELL) / LS - ly0, lj = Math.floor(fy), ty = fy - lj;
    for (let i = 0; i < GN; i++) {
      const fx = (gx0 + (i + 0.5) * CELL) / LS - lx0, li = Math.floor(fx), tx = fx - li, l = lj * LN + li, c = j * GN + i;
      const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
      pineF[c] = lerp4(pineL, l, LN, w00, w10, w01, w11);
      cursedF[c] = lerp4(cursedL, l, LN, w00, w10, w01, w11);
      groveF[c] = lerp4(groveL, l, LN, w00, w10, w01, w11);
    }
  }
  const cellOf = (x, y) => clamp(Math.floor((y - gy0) / CELL), 0, GN - 1) * GN + clamp(Math.floor((x - gx0) / CELL), 0, GN - 1);
  const sampleF = (a, x, y) => {
    const fx = clamp((x - gx0) / CELL - 0.5, 0, GN - 1.001), fy = clamp((y - gy0) / CELL - 0.5, 0, GN - 1.001);
    const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, c = j * GN + i;
    return (a[c] * (1 - tx) + a[c + 1] * tx) * (1 - ty) + (a[c + GN] * (1 - tx) + a[c + GN + 1] * tx) * ty;
  };
  // Exact distance to the nearest path's edge near the paths; elsewhere the field is close enough.
  const pathDist = (x, y) => {
    const coarse = sampleF(dist, x, y), k0 = nearP[cellOf(x, y)];
    if (k0 < 0 || coarse > 24) return coarse;
    const P = paths[PID[k0]];
    let best = Infinity;
    for (let k = Math.max(P.start, k0 - 10); k <= Math.min(P.end - 1, k0 + 10); k++) {
      const dx = PX[k] - x, dy = PY[k] - y, d = Math.sqrt(dx * dx + dy * dy) - PW[k];
      if (d < best) best = d;
    }
    return Math.min(best, coarse + 3);
  };

  // Props are owned by the chunk their foot stands in; anything over the edge belongs to a neighbour.
  const props = [];
  const owns = (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
  const add = (n, x, y, extra) => {
    const p = { n, x: Math.round(x), y: Math.round(y), ...extra };
    if (!owns(p.x, p.y)) return null;
    props.push(p);
    return p;
  };

  // Trees: one candidate per grid cell, kept if the woods are thick enough there and no stronger
  // candidate stands within its spacing. Every chunk that can see a candidate agrees on it, so
  // trees never crowd or double up along a seam.
  function treeDensity(x, y) {
    const c = cellOf(x, y), d = dist[c], open = 1 - clearF[c];
    const roadF = ss(55, 165, d); // the roads and their verges stay open to fight on
    const zoneMul = 1 + pineF[c] * 0.2 - cursedF[c] * 0.45;
    const k = nearP[c];
    const avenue = k >= 0 && AV[k] && d > 36 && d < 52 ? 0.55 : 0;
    return clamp((groveF[c] * 0.62 * roadF * open * zoneMul + 0.005 * roadF * open) * DARKWOOD.trees * 1.3 + avenue * open, 0, 1);
  }
  const cands = new Map();
  const ckey = (i, j) => i * 1048576 + j;
  for (let gj = Math.ceil(gy0 / TC); gj < Math.floor(gy1 / TC); gj++) {
    for (let gi = Math.ceil(gx0 / TC); gi < Math.floor(gx1 / TC); gi++) {
      const r = rngOf(gi, gj, 20);
      const x = gi * TC + r() * TC, y = gj * TC + r() * TC, u = r(), pri = r();
      if (u >= treeDensity(x, y)) continue;
      cands.set(ckey(gi, gj), { x, y, pri, r, gi, gj, gap: TREE_GAP - 4 + 18 * valueNoise(x / 170, y / 170, SEED + 83) });
    }
  }
  const trees = [], tgrid = new Map();
  for (const c of cands.values()) {
    if (c.x < x0 - 64 || c.x >= x1 + 64 || c.y < y0 - 64 || c.y >= y1 + 64) continue;
    let ok = true;
    for (let j = c.gj - 2; j <= c.gj + 2 && ok; j++) {
      for (let i = c.gi - 2; i <= c.gi + 2 && ok; i++) {
        const q = cands.get(ckey(i, j));
        if (q && q !== c && q.pri > c.pri && (q.x - c.x) ** 2 + (q.y - c.y) ** 2 < c.gap * c.gap) ok = false;
      }
    }
    if (!ok) continue;
    const r = c.r, cc = cellOf(c.x, c.y), pine = pineF[cc], cursed = cursedF[cc];
    const z = r(), cl = valueNoise(c.x / 260, c.y / 260, SEED + 71); // species come in clumps
    let n;
    if (z < cursed) n = cl < 0.7 ? r.pick(['deadtree1', 'deadtree2']) : r.pick(['pine1', 'pine2']);
    else if (z < cursed + pine) n = cl < 0.82 ? r.pick(['pine1', 'pine2']) : r.pick(['oak1', 'oak2', 'oak3']);
    else n = cl < 0.72 ? r.pick(['oak1', 'oak2', 'oak3']) : r.pick(['pine1', 'pine2']);
    const t = { n, x: Math.round(c.x), y: Math.round(c.y), r };
    trees.push(t);
    const k = ckey(Math.floor(t.x / 32), Math.floor(t.y / 32));
    if (!tgrid.has(k)) tgrid.set(k, []);
    tgrid.get(k).push(t);
    add(n, t.x, t.y);
  }
  const treeNear = (x, y, rad) => {
    const i = Math.floor(x / 32), j = Math.floor(y / 32);
    for (let jj = j - 1; jj <= j + 1; jj++) {
      for (let ii = i - 1; ii <= i + 1; ii++) {
        const l = tgrid.get(ckey(ii, jj));
        if (l) for (const t of l) if ((t.x - x) ** 2 + (t.y - y) ** 2 < rad * rad) return true;
      }
    }
    return false;
  };
  const offRoad = (x, y, m) => dist[cellOf(x, y)] > m;
  // Mushrooms and toadstools at the feet of trees, more in the dark pinewoods.
  for (const t of trees) {
    const r = t.r, cc = cellOf(t.x, t.y);
    if (r() > (t.n.startsWith('oak') ? 0.12 : 0.34)) continue;
    for (let k = r.int(1, 2); k > 0; k--) {
      const a = r.range(0.15, Math.PI - 0.15), rr = r.range(9, 22); // in front of the trunk, where it can be seen
      const x = t.x + Math.cos(a) * rr * 1.3, y = t.y + Math.sin(a) * rr * 0.6 + 3;
      if (!offRoad(x, y, 8) || treeNear(x, y, 7)) continue;
      if (cursedF[cc] > 0.5 || !t.n.startsWith('oak')) add('mushrooms', x, y, { light: ['cyan', 26] });
      else add('redcaps', x, y);
    }
  }
  // The rest is scattered on coarser jittered grids, each cell seeded by its own position.
  const cells = (size, pad, k, fn) => {
    for (let gj = Math.floor((y0 - pad) / size); gj <= Math.floor((y1 + pad) / size); gj++) {
      for (let gi = Math.floor((x0 - pad) / size); gi <= Math.floor((x1 + pad) / size); gi++) {
        const r = rngOf(gi, gj, k);
        fn(gi * size + r() * size, gj * size + r() * size, r);
      }
    }
  };
  // Bushes gather where the groves thin into meadow; a few dot the meadows.
  cells(40, 0, 21, (x, y, r) => {
    const c = cellOf(x, y), g = groveF[c], edge = ss(0.05, 0.3, g) * ss(0.85, 0.55, g);
    const p = (0.42 * edge + 0.02) * (1 - clearF[c] * 0.8) * (1 - cursedF[c] * 0.8);
    const pick = r.pick(['bush1', 'bush2']);
    if (r() < p && offRoad(x, y, 12) && !treeNear(x, y, 14)) add(pick, x, y);
  });
  // Stones lie in little clusters, more of them in the cursed woods.
  cells(420, 40, 22, (xc, yc, r) => {
    const keep = r() < 0.45 + zoneRaw(xc, yc)[1] * 0.4; // the centre may lie beyond the fields
    for (let k = r.int(2, 5); k > 0; k--) {
      const x = xc + r.range(-38, 38), y = yc + r.range(-24, 24), n = r() < 0.2 ? 'rock2' : r.pick(['rock1', 'rock3']);
      if (keep && owns(Math.round(x), Math.round(y)) && offRoad(x, y, 10) && !treeNear(x, y, 14)) add(n, x, y);
    }
  });
  // Old stumps at the grove edges, gravestones scattered in the cursed woods.
  cells(110, 0, 23, (x, y, r) => {
    const c = cellOf(x, y), g = groveF[c], edge = ss(0.05, 0.3, g) * ss(0.85, 0.55, g);
    const a = r(), b = r(), grave = r() < 0.6 ? 'gravestone' : 'gravecross';
    if (a < 0.22 * edge * (1 - clearF[c]) && offRoad(x, y, 14) && !treeNear(x, y, 16)) add('stump', x, y);
    else if (b < 0.05 * cursedF[c] && offRoad(x, y, 20) && !treeNear(x, y, 14)) add(grave, x, y);
  });
  // The places that matter.
  const shrines = [], crypts = [];
  for (const P of [...F.places, ...F.landmarks]) {
    for (const p of P.props) add(p.n, p.x, p.y, p.light ? { light: p.light, anim: p.anim } : undefined);
    if (P.type && owns(Math.round(P.x), Math.round(P.y))) shrines.push({ key: P.key, x: P.x, y: P.y, type: P.type });
    if (P.crypt && owns(P.crypt.x, P.crypt.y)) crypts.push(P.crypt);
  }

  return {
    cx, cy, props, shrines, crypts, places: F.places, landmarks: F.landmarks,
    // for paintChunk
    dist, nearP, clearF, pineF, cursedF, groveF, sampleF, pathDist, PX, PY, PW, PID, paths,
  };
}

// ---- The ground ----------------------------------------------------------------------------------
const H = (hex) => hexPack(hex);
export const GRASS = {
  oak: ['#1b3426', '#20402d', '#264a32', '#2c5437', '#335f3d'].map(H),
  pine: ['#142b27', '#18332d', '#1c3b32', '#214337', '#264b3c'].map(H),
  cursed: ['#202528', '#272c2d', '#2f3431', '#383c36', '#41443b'].map(H),
};
export const ROAD = ['#2c2420', '#3a2e28', '#463629', '#53412f', '#5f4b36'].map(H);
const TUFT = { oak: ['#3a6a44', '#4a7d4e', '#2f5a3a'].map(H), pine: ['#2f5a46', '#3a6a52', '#264c3c'].map(H), cursed: ['#4a5048', '#575c52', '#3c4140'].map(H) };
const LEAF = { oak: ['#7a4a2a', '#8f5a2e', '#5e3a24', '#a0642c'].map(H), pine: ['#4a3a2a', '#5a4632', '#3a3024'].map(H), cursed: ['#5a4e4a', '#6a5e56', '#4a4040'].map(H) };
const FLOWER = ['#e8e8d0', '#feae34', '#f6757a', '#8fb8ff', '#c49bd9'].map(H);
const PEBBLE = ['#5a6988', '#3a4466', '#8b9bb4'].map(H);

// Paints a chunk's ground into px, CHUNK x CHUNK packed pixels. The slow fields are sampled
// every 8 px and interpolated; the exact distance to a path is worked out only near the paths.
export function paintChunk(cd, px) {
  const { cx, cy, sampleF, pathDist } = cd;
  const x0 = cx * CHUNK, y0 = cy * CHUNK, N = CHUNK / 8 + 1;
  const grid = (fn) => {
    const a = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) a[j * N + i] = fn(x0 + i * 8, y0 + j * 8);
    return a;
  };
  const patchG = grid((x, y) => fbm(x / 110, y / 110, SEED, 3));
  const groveG = grid((x, y) => sampleF(cd.groveF, x, y)), clearG = grid((x, y) => sampleF(cd.clearF, x, y));
  const pineG = grid((x, y) => sampleF(cd.pineF, x, y)), cursedG = grid((x, y) => sampleF(cd.cursedF, x, y));
  const distG = grid((x, y) => sampleF(cd.dist, x, y));
  const at = (a, x, y) => {
    const fx = (x - x0) / 8, fy = (y - y0) / 8, i = Math.min(N - 2, Math.floor(fx)), j = Math.min(N - 2, Math.floor(fy)), tx = fx - i, ty = fy - j, c = j * N + i;
    return (a[c] + (a[c + 1] - a[c]) * tx) * (1 - ty) + (a[c + N] + (a[c + N + 1] - a[c + N]) * tx) * ty;
  };
  const zoneAt = (x, y, t) => (at(cursedG, x, y) > t ? 'cursed' : at(pineG, x, y) > t ? 'pine' : 'oak');
  const { nearP, PX, PY, PW, PID, paths } = cd, ZONES = [GRASS.oak, GRASS.pine, GRASS.cursed], m = MARGIN / CELL;
  for (let y = 0; y < CHUNK; y++) {
    const j = y >> 3, ty = (y & 7) / 8;
    for (let x = 0; x < CHUNK; x++) {
      const i = x >> 3, tx = (x & 7) / 8, c = j * N + i;
      const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
      const wx = x0 + x, wy = y0 + y, b = BAYER[((wy & 3) << 2) | (wx & 3)], n = hash2(wx, wy, SEED) - 0.5;
      let d = lerp4(distG, c, N, w00, w10, w01, w11);
      if (d < 24) {
        const k0 = nearP[(j + m) * GN + i + m];
        if (k0 >= 0) {
          const P = paths[PID[k0]];
          let best = Infinity;
          for (let k = Math.max(P.start, k0 - 5), k1 = Math.min(P.end - 1, k0 + 5); k <= k1; k++) {
            const dx = PX[k] - wx, dy = PY[k] - wy, e = Math.sqrt(dx * dx + dy * dy) - PW[k];
            if (e < best) best = e;
          }
          d = Math.min(best, d + 3);
        }
      }
      const edge = b * 2.2 + n * 1.6;
      let col;
      if (d < edge) {
        const u = clamp(-d / 13, 0, 1); // 0 at the edge, 1 in the middle
        let t = 0.18 + u * 0.75 + b * 0.35 + n * 0.25;
        if (Math.abs(u - 0.55) < 0.08 + b * 0.05 && hash2(wx >> 2, wy >> 2, SEED + 3) > 0.45 && u < 0.9) t = 0.22; // cart ruts
        col = ROAD[clamp(Math.floor(t * ROAD.length), 0, ROAD.length - 1)];
      } else {
        const zt = 0.5 + b * 0.9 + n * 0.3, z = lerp4(cursedG, c, N, w00, w10, w01, w11) > zt ? 2 : lerp4(pineG, c, N, w00, w10, w01, w11) > zt ? 1 : 0;
        let t = lerp4(patchG, c, N, w00, w10, w01, w11) * 1.25 - 0.12 + b * 0.22 + n * 0.12 - lerp4(groveG, c, N, w00, w10, w01, w11) * 0.26 + lerp4(clearG, c, N, w00, w10, w01, w11) * 0.1;
        if (d < 5 + edge) t -= 0.25; // trodden verge
        col = ZONES[z][clamp(Math.floor(t * 5), 0, 4)];
      }
      px[y * CHUNK + x] = col;
    }
  }
  // Tufts, leaves, flowers and pebbles, seeded per chunk.
  const put = (x, y, col) => {
    const lx = x - x0, ly = y - y0;
    if (lx >= 0 && ly >= 0 && lx < CHUNK && ly < CHUNK) px[ly * CHUNK + lx] = col;
  };
  const r = rngOf(cx, cy, 30);
  for (let i = 0; i < 360; i++) {
    const x = x0 + r.int(1, CHUNK - 4), y = y0 + r.int(2, CHUNK - 2), z = zoneAt(x, y, 0.5);
    if (pathDist(x, y) < 3 || (z !== 'oak' && r() < 0.35)) continue;
    const T = TUFT[z], col = r.pick(T);
    put(x, y, col);
    put(x, y - 1, col);
    put(x + 2, y, col);
    put(x + 2, y - 1, T[1]);
    put(x + 1, y + 1, T[2]);
    if (r() < 0.4) put(x + 1, y - 2, T[1]);
  }
  for (let i = 0; i < 110; i++) {
    const x = x0 + r.int(0, CHUNK - 2), y = y0 + r.int(0, CHUNK - 2), z = zoneAt(x, y, 0.5);
    if (r() > 0.3 + at(groveG, x, y)) continue; // leaves fall under the trees
    const col = r.pick(LEAF[z]);
    put(x, y, col);
    if (r() < 0.5) put(x + 1, y, col);
  }
  for (let i = 0; i < 160; i++) {
    const x = x0 + r.int(1, CHUNK - 2), y = y0 + r.int(1, CHUNK - 3);
    // flowers bloom in patches out in the open meadows
    const patch = valueNoise(x / 70, y / 70, SEED + 91) * (1 - at(groveG, x, y)) * (1 - at(cursedG, x, y));
    if (patch < 0.5 || r() > (patch - 0.5) * 3 || pathDist(x, y) < 4) continue;
    const col = r.pick(FLOWER);
    put(x, y, col);
    put(x, y + 1, TUFT.oak[2]);
    if (r() < 0.3) {
      put(x + 2, y + 1, col);
      put(x + 2, y + 2, TUFT.oak[2]);
    }
  }
  for (let i = 0; i < 90; i++) {
    const x = x0 + r.int(0, CHUNK - 3), y = y0 + r.int(0, CHUNK - 2);
    if (pathDist(x, y) > 0 && r() < 0.8) continue; // pebbles mostly on the paths
    put(x, y, PEBBLE[2]);
    put(x + 1, y, PEBBLE[0]);
    put(x, y + 1, PEBBLE[1]);
    put(x + 1, y + 1, PEBBLE[1]);
  }
}
