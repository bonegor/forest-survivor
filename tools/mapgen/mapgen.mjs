// Darkwood map generator (prototype, not wired into the game). Makes one fixed
// forest map offline: a road that loops past the shrines, footpaths out to a
// few landmarks, groves and meadows and undergrowth that belong together, and
// a compact file the game could load. Previews use the game's own sprites,
// palette and night lighting.
//   node tools/mapgen/mapgen.mjs [--seed=1] [--size=8192] [--shrines=10] [--trees=1] [--out=tools/mapgen/out]

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import zlib from 'node:zlib';
import { ART, resolveFrames } from '../../public/js/art/defs.js';
import { packedPalette, OUTLINE } from '../../public/js/art/palette.js';
import { fromRows, outline, makeBuf, hexPack } from '../../public/js/engine/pixels.js';
import { GLYPHS } from '../../public/js/engine/fontdata.js';
import { fbm, valueNoise, hash2, mulberry32, clamp, TAU } from '../../public/js/engine/util.js';
import { writePng } from '../png.mjs';

const arg = (k, d) => {
  const a = process.argv.find((s) => s.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const SEED = Number(arg('seed', 1));
const SIZE = Number(arg('size', 8192)); // world pixels, square
const NSHRINES = Number(arg('shrines', 10));
const TREES = Number(arg('trees', 1)); // scales how thick the groves are
const OUT = arg('out', 'tools/mapgen/out');
const CHUNK = 256; // the game's chunk size
const CELL = 8; // resolution of the generator's fields
const GW = SIZE / CELL;
const NCH = SIZE / CHUNK;
const SPEED = 70; // the hero's walking speed, world px per second
mkdirSync(OUT, { recursive: true });

const T0 = performance.now();
const lap = (label) => console.log(`  ${label.padEnd(30)} ${String(Math.round(performance.now() - T0)).padStart(6)} ms`);
const ss = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rng = mulberry32(SEED * 7919 + 1);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// Noise sampled round a circle, so anything that varies along the closed road wraps without a seam.
const loopNoise = (u, wavelength, length, seed, oct = 3) => {
  const rho = length / (TAU * wavelength);
  return fbm(Math.cos(u * TAU) * rho + 40, Math.sin(u * TAU) * rho + 40, seed, oct);
};

function polyLength(pts, closed) {
  let L = 0;
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    L += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return L;
}
// Evenly spaced points along a polyline.
function resample(pts, step, closed) {
  const n = pts.length, cum = [0];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = cum[segs], m = Math.max(2, Math.round(L / step)), out = [];
  let j = 0;
  for (let k = 0; k < (closed ? m : m + 1); k++) {
    const s = Math.min(L, (k / m) * L);
    while (j < segs - 1 && cum[j + 1] < s) j++;
    const a = pts[j], b = pts[(j + 1) % n], t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
const normalsOf = (pts, closed) =>
  pts.map((p, i) => {
    const a = pts[closed ? (i - 1 + pts.length) % pts.length : Math.max(0, i - 1)];
    const b = pts[closed ? (i + 1) % pts.length : Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [ty / l, -tx / l];
  });

console.log(`Darkwood map, seed ${SEED}, ${SIZE}x${SIZE} px (${NCH}x${NCH} chunks)`);

// ---- 1. The road: a lumpy loop round the middle of the map that meanders ----------------------
const C = SIZE / 2;
const R0 = SIZE * 0.31;
let guide = [];
for (let i = 0; i < 1440; i++) {
  const a = (i / 1440) * TAU;
  const n = fbm(Math.cos(a) * 2.1 + 20, Math.sin(a) * 2.1 + 20, SEED + 5, 3);
  const r = R0 * (1 + (n - 0.5) * 1.1);
  guide.push([C + Math.cos(a) * r, C + Math.sin(a) * r]);
}
guide = resample(guide, 8, true);
const Lg = polyLength(guide, true), gn = normalsOf(guide, true);
let roadPts = guide.map((p, i) => {
  const u = i / guide.length;
  const m = 320 * (loopNoise(u, 1500, Lg, SEED + 9) - 0.5) * 2 + 130 * (loopNoise(u, 430, Lg, SEED + 19, 2) - 0.5) * 2;
  return [p[0] + gn[i][0] * m, p[1] + gn[i][1] * m];
});
for (let pass = 0; pass < 5; pass++) {
  roadPts = roadPts.map((p, i) => {
    const a = roadPts[(i - 1 + roadPts.length) % roadPts.length], b = roadPts[(i + 1) % roadPts.length];
    return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
  });
}
roadPts = resample(roadPts, 4, true);
const ROADLEN = polyLength(roadPts, true), NR = roadPts.length, rnorm = normalsOf(roadPts, true);
const roadHW = roadPts.map((_, i) => 13 + 4.5 * (loopNoise(i / NR, 520, ROADLEN, SEED + 23, 2) - 0.5) * 2);
const inward = (i) => {
  const [x, y] = roadPts[i], [nx, ny] = rnorm[i];
  return nx * (C - x) + ny * (C - y) > 0 ? 1 : -1;
};

// The run starts at a campfire beside the road, at its southernmost point.
let iCamp = 0;
for (let i = 1; i < NR; i++) if (roadPts[i][1] > roadPts[iCamp][1]) iCamp = i;
const campSide = inward(iCamp);
const camp = {
  x: roadPts[iCamp][0] + rnorm[iCamp][0] * campSide * (roadHW[iCamp] + 46),
  y: roadPts[iCamp][1] + rnorm[iCamp][1] * campSide * (roadHW[iCamp] + 46),
};

// ---- 2. Zones and groves: low-frequency fields that give each stretch its own character ----------
function zoneRaw(x, y) {
  const fade = ss(700, 1400, Math.hypot(x - camp.x, y - camp.y)); // the camp sits in an oak meadow
  const cursed = ss(0.6, 0.665, fbm(x / 1900, y / 1900, SEED + 31, 2)) * fade;
  const pine = ss(0.5, 0.565, fbm(x / 1500 + 7.3, y / 1500 - 3.1, SEED + 47, 2)) * (1 - cursed) * fade;
  return [pine, cursed];
}
const groveRaw = (x, y) => ss(0.57, 0.7, fbm(x / 640, y / 640, SEED + 3, 3));

// ---- 3. Shrines along the road, landmarks off it, footpaths out to them ------------------------
const SHRINE_TYPES = ['fury', 'haste', 'fortune', 'wisdom', 'protection'];
const typeOffset = rng.int(0, 4);
const shrines = [];
for (let k = 0; k < NSHRINES; k++) {
  const u = (iCamp / NR + (k + 1 + rng.range(-0.2, 0.2)) / (NSHRINES + 1)) % 1;
  const i = Math.floor(u * NR);
  const side = (k % 2 ? 1 : -1) * inward(i);
  const off = roadHW[i] + 54;
  shrines.push({ x: roadPts[i][0] + rnorm[i][0] * side * off, y: roadPts[i][1] + rnorm[i][1] * side * off, type: SHRINE_TYPES[(k + typeOffset) % 5], i, side });
}

function nearestRoad(x, y) {
  let best = 1e9, bi = 0;
  for (let i = 0; i < NR; i += 2) {
    const d = (roadPts[i][0] - x) ** 2 + (roadPts[i][1] - y) ** 2;
    if (d < best) { best = d; bi = i; }
  }
  return [Math.sqrt(best), bi];
}
const LANDMARK_KINDS = ['circle', 'ruins', 'graveyard', 'woodcamp', 'graveyard', 'ruins'];
const landmarks = [];
for (let tries = 0; landmarks.length < LANDMARK_KINDS.length && tries < 20000; tries++) {
  const kind = LANDMARK_KINDS[landmarks.length];
  const x = rng.range(800, SIZE - 800), y = rng.range(800, SIZE - 800);
  const [d] = nearestRoad(x, y);
  if (d < 300 || d > 950) continue;
  const spots = [camp, ...shrines, ...landmarks];
  if (spots.some((s) => Math.hypot(s.x - x, s.y - y) < 1000)) continue;
  const [, cursed] = zoneRaw(x, y);
  if (kind === 'graveyard' && cursed < 0.5 && tries < 12000) continue; // graveyards want the cursed woods
  if (kind !== 'graveyard' && cursed > 0.3 && tries < 12000) continue;
  landmarks.push({ x, y, kind });
}

// Every path is a polyline with a half width per point: the road, short spurs to the shrines,
// and winding footpaths out to the landmarks.
const PX = [], PY = [], PW = [], PATH = [];
const paths = [];
function addPath(pts, hw, kind, closed = false) {
  const id = paths.length, start = PX.length;
  pts.forEach((p, k) => {
    PX.push(p[0]);
    PY.push(p[1]);
    PW.push(typeof hw === 'function' ? hw(k, pts.length) : hw);
    PATH.push(id);
  });
  paths.push({ kind, start, end: PX.length, closed });
}
addPath(roadPts, (k) => roadHW[k], 'road', true);
function footpath(ax, ay, bx, by, seed, wander) {
  const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(len / 4));
  const nx = -(by - ay) / len, ny = (bx - ax) / len, pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const w = Math.sin(t * Math.PI) * (fbm((t * len) / 260, 0.5, seed, 2) - 0.5) * 2 * Math.min(wander, len * 0.3);
    pts.push([ax + (bx - ax) * t + nx * w, ay + (by - ay) * t + ny * w]);
  }
  return pts;
}
for (const s of shrines) addPath(footpath(roadPts[s.i][0], roadPts[s.i][1], s.x, s.y + 6, SEED + s.i, 0), (k, n) => 9 - (3 * k) / n, 'spur');
addPath(footpath(roadPts[iCamp][0], roadPts[iCamp][1], camp.x, camp.y, SEED + 77, 0), 10, 'spur');
for (const L of landmarks) {
  const [, i] = nearestRoad(L.x, L.y);
  L.road = i;
  addPath(footpath(roadPts[i][0], roadPts[i][1], L.x, L.y + 30, SEED + Math.round(L.x), 140), 6.5, 'footpath');
}
lap('road, shrines, landmarks');

// ---- 4. Fields: distance to the nearest path, clearings, zones and groves ------------------------
const RMAX = 240;
const dist = new Float32Array(GW * GW).fill(RMAX);
const nearP = new Int32Array(GW * GW).fill(-1);
for (let k = 0; k < PX.length; k++) {
  const px = PX[k], py = PY[k];
  const i0 = Math.max(0, Math.floor((px - RMAX) / CELL)), i1 = Math.min(GW - 1, Math.floor((px + RMAX) / CELL));
  const j0 = Math.max(0, Math.floor((py - RMAX) / CELL)), j1 = Math.min(GW - 1, Math.floor((py + RMAX) / CELL));
  for (let j = j0; j <= j1; j++) {
    const dy = (j + 0.5) * CELL - py;
    for (let i = i0; i <= i1; i++) {
      const dx = (i + 0.5) * CELL - px, d = Math.sqrt(dx * dx + dy * dy), c = j * GW + i;
      // distance to the path's edge, so wide and narrow paths share one field
      if (d - PW[k] < dist[c]) {
        dist[c] = d - PW[k];
        nearP[c] = k;
      }
    }
  }
}
lap('distance field');

const clearings = [
  { x: camp.x, y: camp.y - 6, r: 150 },
  ...shrines.map((s) => ({ x: s.x, y: s.y, r: 84 })),
  ...landmarks.map((L) => ({ x: L.x, y: L.y, r: L.kind === 'woodcamp' ? 100 : 128 })),
];
const clearF = new Float32Array(GW * GW);
for (const c of clearings) {
  const R = c.r * 1.3;
  for (let j = Math.max(0, Math.floor((c.y - R) / CELL)); j <= Math.min(GW - 1, Math.floor((c.y + R) / CELL)); j++) {
    for (let i = Math.max(0, Math.floor((c.x - R) / CELL)); i <= Math.min(GW - 1, Math.floor((c.x + R) / CELL)); i++) {
      const dx = (i + 0.5) * CELL - c.x, dy = (j + 0.5) * CELL - c.y, a = Math.atan2(dy, dx);
      const rr = c.r * (1 + 0.42 * (valueNoise(Math.cos(a) * 1.8 + c.x * 0.01, Math.sin(a) * 1.8 + c.y * 0.01, SEED + 13) - 0.5));
      const v = ss(rr, rr * 0.7, Math.hypot(dx, dy));
      if (v > clearF[j * GW + i]) clearF[j * GW + i] = v;
    }
  }
}
const pineF = new Float32Array(GW * GW), cursedF = new Float32Array(GW * GW), groveF = new Float32Array(GW * GW);
for (let j = 0; j < GW; j++) {
  for (let i = 0; i < GW; i++) {
    const x = (i + 0.5) * CELL, y = (j + 0.5) * CELL, c = j * GW + i;
    const [p, cu] = zoneRaw(x, y);
    pineF[c] = p;
    cursedF[c] = cu;
    groveF[c] = groveRaw(x, y);
  }
}
lap('zone, grove, clearing fields');

function sampleF(a, x, y) {
  const fx = clamp(x / CELL - 0.5, 0, GW - 1.001), fy = clamp(y / CELL - 0.5, 0, GW - 1.001);
  const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, c = j * GW + i;
  return (a[c] * (1 - tx) + a[c + 1] * tx) * (1 - ty) + (a[c + GW] * (1 - tx) + a[c + GW + 1] * tx) * ty;
}
const cellOf = (x, y) => clamp(Math.floor(y / CELL), 0, GW - 1) * GW + clamp(Math.floor(x / CELL), 0, GW - 1);
// Exact distance to the nearest path's edge, refined along the path near the nearest point.
function pathDist(x, y) {
  const k0 = nearP[cellOf(x, y)];
  if (k0 < 0) return [RMAX, -1];
  const P = paths[PATH[k0]];
  let best = 1e9, bk = k0;
  for (let o = -10; o <= 10; o++) {
    let k = k0 + o;
    if (k < P.start || k >= P.end) {
      if (!P.closed) continue;
      k = P.start + ((((k - P.start) % (P.end - P.start)) + (P.end - P.start)) % (P.end - P.start));
    }
    const d = Math.hypot(PX[k] - x, PY[k] - y) - PW[k];
    if (d < best) { best = d; bk = k; }
  }
  // a neighbouring path may be closer than this cell's own
  return [Math.min(best, sampleF(dist, x, y) + 3), bk];
}

// ---- 5. Props: trees first, then what grows around them --------------------------------------
const props = [];
const add = (n, x, y) => {
  if (x < 2 || y < 2 || x > SIZE - 3 || y > SIZE - 3) return null;
  const p = { n, x: Math.round(x), y: Math.round(y) };
  props.push(p);
  return p;
};
const border = (x, y) => ss(C - 300, C - 90, Math.max(Math.abs(x - C), Math.abs(y - C)));
function treeDensity(x, y) {
  const c = cellOf(x, y);
  const d = dist[c];
  const open = 1 - clearF[c];
  const roadF = ss(55, 165, d); // the road and its verges stay open to fight on
  const zoneMul = 1 + pineF[c] * 0.2 - cursedF[c] * 0.45;
  const k = nearP[c];
  // here and there the road runs down an avenue of trees
  let avenue = 0;
  if (k >= 0 && PATH[k] === 0 && d > 36 && d < 52) avenue = loopNoise((k - paths[0].start) / NR, 700, ROADLEN, SEED + 61, 2) > 0.6 ? 0.55 : 0;
  return clamp((groveF[c] * 0.62 * roadF * open * zoneMul + 0.005 * roadF * open) * TREES + avenue * open + border(x, y) * 0.8 * (d > 60 ? 1 : 0), 0, 1);
}
const trees = [];
const tgrid = new Map();
const TREE_GAP = 30;
const tkey = (i, j) => i * 100003 + j;
function treeNear(x, y, r) {
  const i = Math.floor(x / 32), j = Math.floor(y / 32);
  for (let jj = j - 1; jj <= j + 1; jj++) for (let ii = i - 1; ii <= i + 1; ii++) {
    const l = tgrid.get(tkey(ii, jj));
    if (l) for (const t of l) if ((t.x - x) ** 2 + (t.y - y) ** 2 < r * r) return true;
  }
  return false;
}
for (let gy = 0; gy < SIZE; gy += 22) {
  for (let gx = 0; gx < SIZE; gx += 22) {
    const x = gx + rng() * 22, y = gy + rng() * 22;
    const dens = treeDensity(x, y);
    const gap = TREE_GAP - 4 + 18 * valueNoise(x / 170, y / 170, SEED + 83);
    if (dens < 0.001 || rng() > dens || treeNear(x, y, gap)) continue;
    const c = cellOf(x, y), pine = pineF[c], cursed = cursedF[c];
    const z = rng(), cl = valueNoise(x / 260, y / 260, SEED + 71); // species come in clumps
    let n;
    if (z < cursed) n = cl < 0.7 ? rng.pick(['deadtree1', 'deadtree2']) : rng.pick(['pine1', 'pine2']);
    else if (z < cursed + pine) n = cl < 0.82 ? rng.pick(['pine1', 'pine2']) : rng.pick(['oak1', 'oak2', 'oak3']);
    else n = cl < 0.72 ? rng.pick(['oak1', 'oak2', 'oak3']) : rng.pick(['pine1', 'pine2']);
    const t = add(n, x, y);
    if (!t) continue;
    trees.push(t);
    const key = tkey(Math.floor(x / 32), Math.floor(y / 32));
    if (!tgrid.has(key)) tgrid.set(key, []);
    tgrid.get(key).push(t);
  }
}
lap(`trees (${trees.length})`);

const offRoad = (x, y, m) => dist[cellOf(x, y)] > m;
// Mushrooms and toadstools at the feet of trees, more in the dark pinewoods.
for (const t of trees) {
  const c = cellOf(t.x, t.y);
  const p = t.n.startsWith('oak') ? 0.12 : 0.34;
  if (rng() > p * (1 - border(t.x, t.y))) continue;
  for (let k = rng.int(1, 2); k > 0; k--) {
    const a = rng.range(0.15, Math.PI - 0.15), r = rng.range(9, 22); // in front of the trunk, where it can be seen
    const x = t.x + Math.cos(a) * r * 1.3, y = t.y + Math.sin(a) * r * 0.6 + 3;
    if (offRoad(x, y, 8) && !treeNear(x, y, 7)) add(cursedF[c] > 0.5 || !t.n.startsWith('oak') ? 'mushrooms' : 'redcaps', x, y);
  }
}
// Bushes gather where the groves thin into meadow; a few dot the meadows.
for (let gy = 0; gy < SIZE; gy += 40) {
  for (let gx = 0; gx < SIZE; gx += 40) {
    const x = gx + rng() * 40, y = gy + rng() * 40, c = cellOf(x, y);
    const g = groveF[c], edge = ss(0.05, 0.3, g) * ss(0.85, 0.55, g);
    const p = (0.42 * edge + 0.02) * (1 - clearF[c] * 0.8) * (1 - border(x, y)) * (1 - cursedF[c] * 0.8);
    if (rng() < p && offRoad(x, y, 12) && !treeNear(x, y, 14)) add(rng.pick(['bush1', 'bush2']), x, y);
  }
}
// Stones lie in little clusters, more of them in the cursed woods.
for (let gy = 0; gy < SIZE; gy += 420) {
  for (let gx = 0; gx < SIZE; gx += 420) {
    const x0 = gx + rng() * 420, y0 = gy + rng() * 420, c = cellOf(x0, y0);
    if (rng() > 0.45 + cursedF[c] * 0.4) continue;
    for (let k = rng.int(2, 5); k > 0; k--) {
      const x = x0 + rng.range(-38, 38), y = y0 + rng.range(-24, 24);
      if (offRoad(x, y, 10) && !treeNear(x, y, 14)) add(rng() < 0.2 ? 'rock2' : rng.pick(['rock1', 'rock3']), x, y);
    }
  }
}
// Old stumps at the grove edges, gravestones scattered in the cursed woods.
for (let gy = 0; gy < SIZE; gy += 110) {
  for (let gx = 0; gx < SIZE; gx += 110) {
    const x = gx + rng() * 110, y = gy + rng() * 110, c = cellOf(x, y);
    const g = groveF[c], edge = ss(0.05, 0.3, g) * ss(0.85, 0.55, g);
    if (rng() < 0.22 * edge * (1 - clearF[c]) && offRoad(x, y, 14) && !treeNear(x, y, 16)) add('stump', x, y);
    if (rng() < 0.05 * cursedF[c] && offRoad(x, y, 20) && !treeNear(x, y, 14)) add(rng() < 0.6 ? 'gravestone' : 'gravecross', x, y);
  }
}
// The places that matter.
const lights = [];
add('campfire', camp.x, camp.y);
lights.push([camp.x, camp.y - 6, 110, 'fire', 1]);
add('stump', camp.x - 22, camp.y - 4);
add('stump', camp.x + 21, camp.y + 5);
add('lantern', camp.x + 30, camp.y - 26);
lights.push([camp.x + 30, camp.y - 32, 60, 'warm', 1]);
const SHRINE_LIGHT = { fury: 'red', haste: 'cyan', fortune: 'gold', wisdom: 'purple', protection: 'green' };
for (const s of shrines) {
  add('lantern', s.x - 19, s.y + 3);
  add('lantern', s.x + 19, s.y + 3);
  lights.push([s.x - 19, s.y - 3, 60, 'warm', 1], [s.x + 19, s.y - 3, 60, 'warm', 1], [s.x, s.y - 12, 70, SHRINE_LIGHT[s.type], 0.9]);
  for (let k = 0; k < 3; k++) {
    const a = rng.range(0, TAU), r = rng.range(32, 52);
    add(rng() < 0.5 ? 'redcaps' : 'rock3', s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.7);
  }
}
for (const L of landmarks) {
  if (L.kind === 'circle') {
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU;
      add('menhir', L.x + Math.cos(a) * 50, L.y + Math.sin(a) * 36);
      lights.push([L.x + Math.cos(a) * 50, L.y + Math.sin(a) * 36 - 8, 34, 'cyan', 0.55]);
    }
    add('campfire', L.x, L.y);
    lights.push([L.x, L.y - 6, 110, 'fire', 1]);
  } else if (L.kind === 'ruins') {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + rng.range(-0.25, 0.25);
      add(rng() < 0.5 ? 'ruinpillar' : 'brokenpillar', L.x + Math.cos(a) * 46, L.y + Math.sin(a) * 32);
    }
    add('rubble', L.x + rng.range(-16, 16), L.y + rng.range(-8, 8));
    add('rubble', L.x + rng.range(-28, 28), L.y + rng.range(-16, 16));
  } else if (L.kind === 'graveyard') {
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) if (rng() < 0.8) add(rng() < 0.6 ? 'gravestone' : 'gravecross', L.x - 36 + k * 24 + rng.range(-3, 3), L.y - 22 + r * 22 + rng.range(-2, 2));
    add(rng() < 0.5 ? 'deadtree1' : 'deadtree2', L.x + 58, L.y - 30);
    add('lantern', L.x - 50, L.y + 30);
    lights.push([L.x - 50, L.y + 24, 60, 'warm', 1]);
  } else {
    add('campfire', L.x, L.y);
    lights.push([L.x, L.y - 6, 110, 'fire', 1]);
    for (let k = 0; k < 4; k++) add('stump', L.x + rng.range(-50, 50), L.y + rng.range(-34, 34));
  }
}
for (const p of props) {
  if (p.n === 'mushrooms') lights.push([p.x, p.y - 2, 26, 'cyan', 0.55]);
}
for (const s of shrines) props.push({ n: 'shrine', x: Math.round(s.x), y: Math.round(s.y), shrine: s.type });
lap(`undergrowth and places (${props.length} props)`);

// ---- 6. Storage: vectors for what was designed, baked props, ground detail stays procedural -------
const TYPES = [...new Set(props.map((p) => p.n))].sort();
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const l = Math.hypot(bx - ax, by - ay) || 1;
  let worst = 0, wi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / l;
    if (d > worst) { worst = d; wi = i; }
  }
  if (worst < eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, wi + 1), eps).slice(0, -1), ...rdp(pts.slice(wi), eps)];
}
const simplify = (P, eps) => {
  const pts = [];
  for (let k = P.start; k < P.end; k++) pts.push([PX[k], PY[k], PW[k]]);
  if (!P.closed) return rdp(pts, eps);
  const half = Math.floor(pts.length / 2);
  return [...rdp(pts.slice(0, half + 1), eps).slice(0, -1), ...rdp([...pts.slice(half), pts[0]], eps).slice(0, -1)];
};
const mapJson = {
  name: 'The Darkwood',
  version: 1,
  seed: SEED,
  size: SIZE,
  chunk: CHUNK,
  start: { x: Math.round(camp.x), y: Math.round(camp.y + 16) },
  // [x, y, half width] along each path; the game rebuilds its distance field from these
  paths: paths.map((P) => ({ kind: P.kind, closed: P.closed, points: simplify(P, 1).map(([x, y, w]) => [Math.round(x), Math.round(y), Math.round(w * 2) / 2]) })),
  shrines: shrines.map((s) => ({ x: Math.round(s.x), y: Math.round(s.y), type: s.type })),
  landmarks: landmarks.map((L) => ({ x: Math.round(L.x), y: Math.round(L.y), kind: L.kind })),
  clearings: clearings.map((c) => [Math.round(c.x), Math.round(c.y), c.r]),
  zones: { seed: SEED, cursed: [1900, 0.6, 0.665], pine: [1500, 0.5, 0.565], groves: [640, 0.55, 0.68] },
  propTypes: TYPES,
  props: 'darkwood.props.bin',
};
// Props: grouped by chunk, 3 bytes each: a varint count per chunk, then the chunk's types, x's
// within the chunk, and y's as steps down the chunk (sorted top to bottom).
function encodeProps(list) {
  const byChunk = Array.from({ length: NCH * NCH }, () => []);
  for (const p of list) byChunk[Math.min(NCH - 1, Math.floor(p.y / CHUNK)) * NCH + Math.min(NCH - 1, Math.floor(p.x / CHUNK))].push(p);
  const out = [0x44, 0x57, 0x50, 0x31, NCH & 255, NCH >> 8]; // "DWP1", chunks per side
  for (const l of byChunk) {
    l.sort((a, b) => a.y - b.y || a.x - b.x);
    let n = l.length;
    do {
      out.push((n & 127) | (n > 127 ? 128 : 0));
      n >>= 7;
    } while (n > 0);
    let py = 0;
    for (const p of l) out.push(TYPES.indexOf(p.n));
    for (const p of l) out.push(p.x % CHUNK);
    for (const p of l) out.push((p.y % CHUNK) - py), (py = p.y % CHUNK);
  }
  return Buffer.from(out);
}
function decodeProps(buf, types) {
  const nch = buf[4] | (buf[5] << 8), list = [];
  let o = 6;
  for (let c = 0; c < nch * nch; c++) {
    let n = 0, sh = 0, b;
    do {
      b = buf[o++];
      n |= (b & 127) << sh;
      sh += 7;
    } while (b & 128);
    const cx = (c % nch) * CHUNK, cy = Math.floor(c / nch) * CHUNK;
    let y = 0;
    for (let k = 0; k < n; k++) list.push({ n: types[buf[o + k]], x: cx + buf[o + n + k], y: cy + (y += buf[o + 2 * n + k]) });
    o += 3 * n;
  }
  return list;
}
const propsBin = encodeProps(props);
const back = decodeProps(propsBin, TYPES);
const keyOf = (p) => `${p.n}@${p.x},${p.y}`;
const before = props.map(keyOf).sort(), after = back.map(keyOf).sort();
const roundTrip = before.length === after.length && before.every((k, i) => k === after[i]);
const jsonText = JSON.stringify(mapJson);
writeFileSync(join(OUT, 'darkwood.map.json'), jsonText);
writeFileSync(join(OUT, 'darkwood.props.bin'), propsBin);
const gz = (b) => zlib.gzipSync(b, { level: 9 }).length;
// For comparison: the same map as a raster of terrain classes, one byte per 8x8 cell.
const raster = Buffer.alloc(GW * GW);
for (let c = 0; c < GW * GW; c++) raster[c] = dist[c] < 0 ? 1 : clearF[c] > 0.5 ? 2 : cursedF[c] > 0.5 ? 3 : pineF[c] > 0.5 ? 4 : groveF[c] > 0.5 ? 5 : 0;
lap('storage');

// ---- 7. Previews ------------------------------------------------------------------------------
const pal = packedPalette();
const sprites = {};
function sprite(name) {
  if (sprites[name]) return sprites[name];
  const def = ART[name];
  const raw = resolveFrames(def)[0];
  let b = Array.isArray(raw) ? fromRows(raw, pal) : raw;
  const thin = def.thin ? new Set([...def.thin].map((ch) => pal[ch])) : null;
  if (def.outline !== false) b = outline(b, OUTLINE, false, thin);
  return (sprites[name] = b);
}
const rgbOf = (c) => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
const packRgb = (r, g, b) => ((255 << 24) | (clamp(b, 0, 255) << 16) | (clamp(g, 0, 255) << 8) | clamp(r, 0, 255)) >>> 0;
const H = (hex) => hexPack(hex);
const GRASS = {
  oak: ['#1b3426', '#20402d', '#264a32', '#2c5437', '#335f3d'].map(H),
  pine: ['#142b27', '#18332d', '#1c3b32', '#214337', '#264b3c'].map(H),
  cursed: ['#202528', '#272c2d', '#2f3431', '#383c36', '#41443b'].map(H),
};
const ROAD = ['#2c2420', '#3a2e28', '#463629', '#53412f', '#5f4b36'].map(H);
const TUFT = { oak: ['#3a6a44', '#4a7d4e', '#2f5a3a'].map(H), pine: ['#2f5a46', '#3a6a52', '#264c3c'].map(H), cursed: ['#4a5048', '#575c52', '#3c4140'].map(H) };
const LEAF = { oak: ['#7a4a2a', '#8f5a2e', '#5e3a24', '#a0642c'].map(H), pine: ['#4a3a2a', '#5a4632', '#3a3024'].map(H), cursed: ['#5a4e4a', '#6a5e56', '#4a4040'].map(H) };
const FLOWER = ['#e8e8d0', '#feae34', '#f6757a', '#8fb8ff', '#c49bd9'].map(H);
const PEBBLE = ['#5a6988', '#3a4466', '#8b9bb4'].map(H);
const zoneAt = (x, y, t) => {
  return sampleF(cursedF, x, y) > t ? 'cursed' : sampleF(pineF, x, y) > t ? 'pine' : 'oak';
};

// The ground at full detail for a window of the world, as the game would paint its chunks.
function paintGround(x0, y0, w, h) {
  const buf = makeBuf(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = x0 + x, wy = y0 + y, b = bayer(wx, wy), n = hash2(wx, wy, SEED) - 0.5;
      const z = zoneAt(wx, wy, 0.5 + b * 0.9 + n * 0.3);
      let col;
      const [d] = pathDist(wx, wy);
      const edge = b * 2.2 + n * 1.6;
      if (d < edge) {
        const hw = 13, u = clamp(-d / hw, 0, 1); // 0 at the edge, 1 at the middle
        let t = 0.18 + u * 0.75 + b * 0.35 + n * 0.25;
        if (Math.abs(u - 0.55) < 0.08 + b * 0.05 && hash2(wx >> 2, wy >> 2, SEED + 3) > 0.45 && u < 0.9) t = 0.22; // cart ruts
        col = ROAD[clamp(Math.floor(t * ROAD.length), 0, ROAD.length - 1)];
      } else {
        const g = sampleF(groveF, wx, wy), cl = sampleF(clearF, wx, wy);
        let t = fbm(wx / 110, wy / 110, SEED, 3) * 1.25 - 0.12 + b * 0.22 + n * 0.12 - g * 0.26 + cl * 0.1;
        if (d < 5 + edge) t -= 0.25; // trodden verge
        col = GRASS[z][clamp(Math.floor(t * 5), 0, 4)];
      }
      buf.d[y * w + x] = col;
    }
  }
  // Tufts, leaves, flowers and pebbles, seeded per chunk like the game's own.
  const put = (x, y, c) => {
    const lx = x - x0, ly = y - y0;
    if (lx >= 0 && ly >= 0 && lx < w && ly < h) buf.d[ly * w + lx] = c;
  };
  for (let cy = Math.floor(y0 / CHUNK); cy <= Math.floor((y0 + h) / CHUNK); cy++) {
    for (let cx = Math.floor(x0 / CHUNK); cx <= Math.floor((x0 + w) / CHUNK); cx++) {
      const r = mulberry32((hash2(cx, cy, SEED) * 4294967296) >>> 0);
      const bx = cx * CHUNK, by = cy * CHUNK;
      for (let i = 0; i < 360; i++) {
        const x = bx + r.int(1, CHUNK - 4), y = by + r.int(2, CHUNK - 2), z = zoneAt(x, y, 0.5);
        if (pathDist(x, y)[0] < 3 || (z !== 'oak' && r() < 0.35)) continue;
        const T = TUFT[z], col = r.pick(T);
        put(x, y, col); put(x, y - 1, col); put(x + 2, y, col); put(x + 2, y - 1, T[1]); put(x + 1, y + 1, T[2]);
        if (r() < 0.4) put(x + 1, y - 2, T[1]);
      }
      for (let i = 0; i < 110; i++) {
        const x = bx + r.int(0, CHUNK - 2), y = by + r.int(0, CHUNK - 2), z = zoneAt(x, y, 0.5);
        if (r() > 0.3 + sampleF(groveF, x, y)) continue; // leaves fall under the trees
        const col = r.pick(LEAF[z]);
        put(x, y, col);
        if (r() < 0.5) put(x + 1, y, col);
      }
      for (let i = 0; i < 160; i++) {
        const x = bx + r.int(1, CHUNK - 2), y = by + r.int(1, CHUNK - 3);
        // flowers bloom in patches out in the open meadows
        const patch = valueNoise(x / 70, y / 70, SEED + 91) * (1 - sampleF(groveF, x, y)) * (1 - sampleF(cursedF, x, y));
        if (patch < 0.5 || r() > (patch - 0.5) * 3 || pathDist(x, y)[0] < 4) continue;
        const col = r.pick(FLOWER);
        put(x, y, col); put(x, y + 1, TUFT.oak[2]);
        if (r() < 0.3) { put(x + 2, y + 1, col); put(x + 2, y + 2, TUFT.oak[2]); }
      }
      for (let i = 0; i < 90; i++) {
        const x = bx + r.int(0, CHUNK - 3), y = by + r.int(0, CHUNK - 2);
        if (pathDist(x, y)[0] > 0 && r() < 0.8) continue; // pebbles mostly on the paths
        put(x, y, PEBBLE[2]); put(x + 1, y, PEBBLE[0]); put(x, y + 1, PEBBLE[1]); put(x + 1, y + 1, PEBBLE[1]);
      }
    }
  }
  return buf;
}

function blitSprite(buf, spr, x, y) {
  for (let j = 0; j < spr.h; j++) {
    const yy = y + j;
    if (yy < 0 || yy >= buf.h) continue;
    for (let i = 0; i < spr.w; i++) {
      const xx = x + i, c = spr.d[j * spr.w + i];
      if (xx < 0 || xx >= buf.w || c >>> 24 < 128) continue;
      buf.d[yy * buf.w + xx] = c;
    }
  }
}
const LIGHT_COLORS = { warm: [255, 186, 120], fire: [255, 140, 60], white: [255, 255, 255], cyan: [120, 240, 255], red: [255, 80, 60], gold: [255, 210, 90], purple: [200, 120, 255], green: [150, 255, 120] };
const falloff = (t) => (t < 0.25 ? 1 - t * 0.72 : t < 0.5 ? 0.82 - (t - 0.25) * 1.36 : t < 0.75 ? 0.48 - (t - 0.5) * 1.2 : 0.18 - (t - 0.75) * 0.72);

// One screen of the game: 600x338 world px at night, as at 1080p (shown 3x bigger).
function renderView(name, cx, cy, hero = false) {
  const w = 600, h = 338, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
  const buf = paintGround(x0, y0, w, h);
  const vis = props.filter((p) => p.x > x0 - 40 && p.x < x0 + w + 40 && p.y > y0 - 4 && p.y < y0 + h + 60);
  if (hero) vis.push({ n: 'knight', x: Math.round(camp.x + 30), y: Math.round(camp.y + 16) });
  vis.sort((a, b) => a.y - b.y);
  for (const p of vis) {
    const s = sprite(p.n);
    blitSprite(buf, s, p.x - x0 - Math.floor(s.w / 2), p.y - y0 - s.h + 1);
  }
  // Night: ambient light times the scene, lamps and fires added on, like the game's light pass.
  const L = [...lights.filter(([x, y, r]) => x > x0 - r && x < x0 + w + r && y > y0 - r && y < y0 + h + r)];
  L.push([cx, cy - 6, 125, 'warm', 1], [cx, cy - 8, 46, 'white', 0.7]); // the hero's own lantern glow
  const amb = [118, 120, 172];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let lr = amb[0], lg = amb[1], lb = amb[2];
      for (const [lx, ly, r, key, k] of L) {
        const d = Math.hypot(x0 + x - lx, y0 + y - ly) / r;
        if (d >= 1) continue;
        const f = falloff(d) * k, c = LIGHT_COLORS[key];
        lr += c[0] * f; lg += c[1] * f; lb += c[2] * f;
      }
      const [r, g, b] = rgbOf(buf.d[y * w + x]);
      buf.d[y * w + x] = packRgb(Math.round((r * Math.min(lr, 255)) / 255), Math.round((g * Math.min(lg, 255)) / 255), Math.round((b * Math.min(lb, 255)) / 255));
    }
  }
  const S = 3, big = makeBuf(w * S, h * S);
  for (let y = 0; y < h * S; y++) for (let x = 0; x < w * S; x++) big.d[y * w * S + x] = buf.d[Math.floor(y / S) * w + Math.floor(x / S)];
  writePng(join(OUT, `view-${name}.png`), big);
}

// The whole map at one pixel per 8x8 world pixels, daylit for legibility.
function drawText(buf, s, x, y, col) {
  const ink = H('#181425');
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = (GLYPHS[ch] || GLYPHS['?']).split('/');
    for (let pass = 0; pass < 2; pass++) {
      g.forEach((row, j) => [...row].forEach((c, i) => {
        if (c !== '#') return;
        if (pass === 0) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) { const xx = cx + i + ox, yy = y + j + oy; if (xx >= 0 && yy >= 0 && xx < buf.w && yy < buf.h) buf.d[yy * buf.w + xx] = ink; }
        else { const xx = cx + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < buf.w && yy < buf.h) buf.d[yy * buf.w + xx] = col; }
      }));
    }
    cx += g[0].length + 1;
  }
  return cx - x;
}
function renderOverview() {
  const buf = makeBuf(GW, GW);
  for (let j = 0; j < GW; j++) {
    for (let i = 0; i < GW; i++) {
      const c = j * GW + i, x = (i + 0.5) * CELL, y = (j + 0.5) * CELL, b = bayer(i, j);
      const z = cursedF[c] > 0.5 + b * 0.5 ? 'cursed' : pineF[c] > 0.5 + b * 0.5 ? 'pine' : 'oak';
      let t = fbm(x / 110, y / 110, SEED, 2) * 0.6 + 0.35 - groveF[c] * 0.3 + clearF[c] * 0.15 + b * 0.1;
      let col = GRASS[z][clamp(Math.floor(t * 5), 0, 4)];
      if (dist[c] < 0.5 + b * 4) col = ROAD[dist[c] < -5 ? 4 : 3];
      buf.d[c] = col;
    }
  }
  const dot = (x, y, r, col, ink) => {
    const cx = x / CELL, cy = y / CELL;
    for (let j = Math.floor(cy - r - 1); j <= Math.ceil(cy + r + 1); j++) for (let i = Math.floor(cx - r - 1); i <= Math.ceil(cx + r + 1); i++) {
      if (i < 0 || j < 0 || i >= GW || j >= GW) continue;
      const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
      if (d <= r) buf.d[j * GW + i] = col;
      else if (ink && d <= r + 0.8) buf.d[j * GW + i] = ink;
    }
  };
  const CANOPY = { oak: H('#3e8948'), pine: H('#265c42'), dead: H('#6d5d58') };
  const sorted = [...props].sort((a, b) => a.y - b.y);
  for (const p of sorted) {
    if (p.n.startsWith('oak')) dot(p.x, p.y - 16, 2.1, CANOPY.oak, H('#193c3e'));
    else if (p.n.startsWith('pine')) dot(p.x, p.y - 16, 1.7, CANOPY.pine, H('#122a24'));
    else if (p.n.startsWith('dead')) dot(p.x, p.y - 12, 1.4, CANOPY.dead, H('#262b44'));
    else if (p.n.startsWith('bush')) dot(p.x, p.y - 4, 0.9, H('#4a7d4e'));
    else if (p.n.startsWith('rock') || p.n === 'rubble') dot(p.x, p.y - 3, 0.7, H('#8b9bb4'));
    else if (p.n.startsWith('grave') || p.n.includes('pillar')) dot(p.x, p.y - 4, 0.8, H('#c0cbdc'));
    else if (p.n === 'menhir') dot(p.x, p.y - 4, 0.9, H('#2ce8f5'));
    else if (p.n === 'campfire' || p.n === 'lantern') dot(p.x, p.y - 4, 1, H('#feae34'));
  }
  const COL = { fury: '#e43b44', haste: '#2ce8f5', fortune: '#feae34', wisdom: '#c49bd9', protection: '#63c74d' };
  shrines.forEach((s, k) => {
    dot(s.x, s.y, 5.5, H(COL[s.type]), H('#ffffff'));
    dot(s.x, s.y, 2.2, H('#ffffff'));
    drawText(buf, `${k + 1} ${s.type}`, Math.round(s.x / CELL) + 9, Math.round(s.y / CELL) - 4, H(COL[s.type]));
  });
  dot(camp.x, camp.y, 6, H('#f77622'), H('#ffffff'));
  drawText(buf, 'start', Math.round(camp.x / CELL) + 10, Math.round(camp.y / CELL) - 4, H('#ffffff'));
  for (const L of landmarks) drawText(buf, L.kind, Math.round(L.x / CELL) - 14, Math.round(L.y / CELL) + 9, H('#c0cbdc'));
  writePng(join(OUT, 'overview.png'), buf);
}
renderOverview();
lap('overview preview');

// Views: the start, the first shrine, the best avenue or grove the road passes, a cursed stretch, a landmark.
renderView('start', camp.x, camp.y + 24, true);
const s1 = shrines[0];
renderView('shrine', (s1.x + roadPts[s1.i][0]) / 2, (s1.y + roadPts[s1.i][1]) / 2 + 10);
let bestI = 0, bestV = -1;
for (let i = 0; i < NR; i += 25) {
  const [x, y] = roadPts[i], [nx, ny] = rnorm[i];
  const v = groveRaw(x + nx * 200, y + ny * 200) + groveRaw(x - nx * 200, y - ny * 200) - (Math.hypot(x - camp.x, y - camp.y) < 1500 ? 1 : 0);
  if (v > bestV) { bestV = v; bestI = i; }
}
renderView('road', roadPts[bestI][0], roadPts[bestI][1]);
const cursedShrine = shrines.find((s) => cursedF[cellOf(s.x, s.y)] > 0.5) || shrines.find((s) => pineF[cellOf(s.x, s.y)] > 0.5) || shrines[3];
renderView('shrine2', (cursedShrine.x + roadPts[cursedShrine.i][0]) / 2, (cursedShrine.y + roadPts[cursedShrine.i][1]) / 2 + 10);
const lm = landmarks.find((L) => L.kind === 'circle') || landmarks[0];
if (lm) renderView('landmark', lm.x, lm.y + 10);
lap('game-scale previews');

// ---- 8. Report --------------------------------------------------------------------------------
const count = (pre) => props.filter((p) => p.n.startsWith(pre)).length;
const nearRoadArea = (() => { let n = 0; for (let c = 0; c < GW * GW; c++) if (dist[c] < 150) n++; return n * CELL * CELL; })();
const treesNearRoad = trees.filter((t) => dist[cellOf(t.x, t.y)] < 150).length;
const treesEdge = trees.filter((t) => border(t.x, t.y) > 0.05).length;
const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
const spacing = ROADLEN / NSHRINES;
console.log(`
Map ${SIZE}x${SIZE} px = ${NCH}x${NCH} chunks = about ${Math.round((SIZE / 600) * (SIZE / 338))} screens; crossing it takes ${Math.round(SIZE / SPEED)} s of walking
Road loop ${Math.round(ROADLEN)} px = ${Math.round(ROADLEN / SPEED / 60 * 10) / 10} min of walking; a shrine every ${Math.round(spacing)} px (${Math.round(spacing / SPEED)} s)
Footpaths to ${landmarks.length} landmarks: ${landmarks.map((L) => L.kind).join(', ')}
Trees within 150 px of a path: ${(treesNearRoad / (nearRoadArea / CHUNK / CHUNK)).toFixed(1)} per chunk; in the edge wall: ${treesEdge}
Props ${props.length}: trees ${trees.length} (${(trees.length / (NCH * NCH)).toFixed(1)} per chunk overall, ${count('oak')} oak, ${count('pine')} pine, ${count('dead')} dead), bushes ${count('bush')}, rocks ${count('rock')}, mushrooms ${count('mushrooms') + count('redcaps')}, stumps ${count('stump')}, graves ${count('grave')}, shrines ${shrines.length}
Prop file round trip: ${roundTrip ? 'all ' + back.length + ' props decode back exactly' : 'MISMATCH'}

Stored                              raw        gzipped
  darkwood.map.json (vectors)  ${kb(jsonText.length).padStart(10)} ${kb(gz(Buffer.from(jsonText))).padStart(12)}
  darkwood.props.bin (props)   ${kb(propsBin.length).padStart(10)} ${kb(gz(propsBin)).padStart(12)}
  total                        ${kb(jsonText.length + propsBin.length).padStart(10)} ${kb(gz(Buffer.from(jsonText)) + gz(propsBin)).padStart(12)}
For comparison
  terrain raster, 1 byte per 8px cell ${kb(raster.length).padStart(10)} ${kb(gz(raster)).padStart(9)}
  the ground as pixels (RGBA)  ${(SIZE * SIZE * 4 / 1048576).toFixed(0).padStart(7)} MB`);
lap('done');
