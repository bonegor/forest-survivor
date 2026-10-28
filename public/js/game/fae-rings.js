// The Bloomvale's fae rings (28 October 2026): where they stand and when they dance. The owner's:
// "Meadow, IDK what to do with meadow, you guys figure out something, have some good game design idea
// how to make meadow not be identical to forest." So the meadow's land is the Darkwood's (its roads,
// crossroads, shrines, crypts, groves and landmarks), and over it stand fae rings: circles of ten
// moonblooms, each waking on a rhythm of its own, about once a minute. Its blooms open one by one
// (the stir, 6 s), then it dances (12 s): every monster of the horde that crosses its line is swept
// into a wheel turning round it, circling the hero's eye instead of chasing him, until the music
// stops and the dancers break wild (game/fae.js, enemies.js). From 8:00 the court turns Unseelie:
// shorter dances, wilder releases. "Fae ring" in every word the player reads, never "fairy ring":
// that is the Puffcap Spores' evolution (data/weapons.js).
//
// Pure and Node-safe (no canvas, no sprites), so the tools (tools/mapgen/endless.mjs) and the tests
// place the rings as the game does. Every ring comes from the map's world seed and its cell alone
// (hash2, never Math.random), so a chunk made in any order agrees with every other about where the
// rings' clearings are (biomes.js biomeProp: nothing stands in one). Only the Bloomvale's look names
// this table (biomes/meadow.js `fae`); the Darkwood never reads it.

import { hash2, TAU } from '../engine/util.js';
import { DARKWOOD, node, road, roadExists, landmark, start } from './darkwood.js';

// Every number of the court (the judge's pick, 28 October 2026; the knobs to turn if play says it is
// too kind or too harsh are its dance, cell, unseelie.at and reach, and the map's horde).
export const FAE = {
  cell: 720, tries: 3, inner: 0.6, // the rings' lattice: one a cell, from 3 candidates in its middle 60%
  keep: { start: 320, node: 230, landmark: 190, road: 85, footpath: 75 }, // a centre's room (px)
  r: 48, // the dance line: a monster whose centre comes within it joins
  blooms: 10, bloomR: 50, // ten moonblooms round it
  clear: 64, // nothing stands within this of the centre (biomes.js biomeProp)
  band: 6, // the darker grass under the line
  period: 60,
  seelie: { sleep: 42, stir: 6, dance: 12, quick: 3, wild: 3, pace: 1.25 },
  unseelie: { at: 480, sleep: 44, stir: 6, dance: 10, quick: 3, wild: 4, pace: 1.4 },
  first: 100, last: 820, // no dance begins before 1:40 or after 13:40
  wilt: 6, // the blooms droop this long after a dance
  spin: 0.9, quickSpin: 1.5, pull: 4, // the wheel: rad/s; toward the line at pull·(r − d), within ±pace
  drop: 56, // a dancer this far past the line leaves the dance, not wild
  reach: 640, near: 1000, mark: 900, teach: 600, // takes dancers / kept and drawn / HUD arrow / first banner
  sound: 450, // the bell and the whoosh within this of the hero
  light: 110, // a dancing ring's light (stirring: 40 + 30·k)
};

// A ring's states (ringPhase): asleep, its blooms opening, dancing.
export const ASLEEP = 0, STIR = 1, DANCE = 2;

// The court's dice: the cell's own, from the map's world seed (darkwood.js DARKWOOD.seed), apart from
// every hash darkwood.js draws.
const H = (a, b, k) => hash2(a, b, DARKWOOD.seed * 1013 + 4409 + k * 7919);

// Whether a point is within r of any of a path's points (every 4 px along it), rejected first by its
// bounds (darkwood.js pathOf: minx..maxy, half widths and all).
function nearPath(p, x, y, r) {
  if (x < p.minx - r || x > p.maxx + r || y < p.miny - r || y > p.maxy + r) return false;
  const xs = p.xs, ys = p.ys, r2 = r * r;
  for (let k = 0; k < xs.length; k++) if ((xs[k] - x) ** 2 + (ys[k] - y) ** 2 < r2) return true;
  return false;
}

// Whether a ring's centre has room at (x, y): off the start, the crossroads (their shrines, crypts and
// lanterns), the landmarks, the roads and the landmarks' footpaths, so a dance never fills a road and
// a ring never stands in a shrine's or a crypt's way (the owner's rule: crypts remain, as on every map).
export function roomAt(x, y) {
  const K = FAE.keep, s = start();
  if ((x - s.x) ** 2 + (y - s.y) ** 2 < K.start * K.start) return false;
  const D = DARKWOOD.spacing, ci = Math.round(x / D), cj = Math.round(y / D);
  // The crossroads (i + j even) and the landmarks (odd) of the lattice points round it: each strays at
  // most a fifth of the spacing from its point.
  for (let j = cj - 1; j <= cj + 1; j++) {
    for (let i = ci - 1; i <= ci + 1; i++) {
      if (((i + j) & 1) === 0) {
        const n = node(i, j);
        if ((n.x - x) ** 2 + (n.y - y) ** 2 < K.node * K.node) return false;
      } else {
        const L = landmark(i, j);
        if (L && (L.x - x) ** 2 + (L.y - y) ** 2 < K.landmark * K.landmark) return false;
      }
    }
  }
  // The roads (named by their west end, i + j even) and the footpaths that might pass by.
  for (let j = cj - 1; j <= cj + 1; j++) {
    for (let i = ci - 2; i <= ci + 1; i++) {
      if (((i + j) & 1) === 0) {
        if (roadExists(i, j, 1) && nearPath(road(i, j, 1), x, y, K.road)) return false;
        if (roadExists(i, j, -1) && nearPath(road(i, j, -1), x, y, K.road)) return false;
      } else {
        const L = landmark(i, j);
        if (L && nearPath(L.path, x, y, K.footpath)) return false;
      }
    }
  }
  return true;
}

// A ring at (x, y) in cell (a, b): its clock's phase, its first bloom's angle and its ten blooms, each
// in a forest prop's shape (forest.js generate), so Forest.drawProp and drawPropEmissive draw them as
// they are (game/fae.js dresses each in its sprite and frame).
function makeRing(a, b, x, y) {
  const a0 = H(a, b, 10) * TAU, blooms = [];
  for (let i = 0; i < FAE.blooms; i++) {
    // Clockwise on the screen as i grows (y points down): the blooms open like a clock filling.
    const ang = a0 + (i * TAU) / FAE.blooms;
    const kind = H(a * 16 + i, b, 11) < 0.3 ? 2 : 1;
    blooms.push({ spr: null, x: x + Math.cos(ang) * FAE.bloomR, y: y + Math.sin(ang) * FAE.bloomR, kind, frame: 0, anim: 0, light: null, tree: false, t: 0, solid: 0, trunk: 0 });
  }
  return {
    a, b, x, y, ph: H(a, b, 9) * FAE.period, a0, blooms,
    state: ASLEEP, k: 0, quick: false, ds: 0, end: 0, fierce: false, wilt: false,
    seen: false, rang: false, spinA: 0, at: -1, moteT: 0,
  };
}

// The rings made so far, by cell under a numeric key (no string a lookup), for the world they were
// made in: darkwood.js keeps its world as module state shared across runs, so another world's seed
// (or spacing) starts the cache afresh.
const RINGS = new Map();
let madeFor = NaN, madeD = NaN;
const cellKey = (a, b) => (a + 32768) * 65536 + (b + 32768);

// Cell (a, b)'s ring, or null where none of its candidates had room.
export function ringAt(a, b) {
  if (madeFor !== DARKWOOD.seed || madeD !== DARKWOOD.spacing) {
    RINGS.clear();
    madeFor = DARKWOOD.seed;
    madeD = DARKWOOD.spacing;
  }
  const key = cellKey(a, b);
  let r = RINGS.get(key);
  if (r !== undefined) return r;
  r = null;
  const C = FAE.cell, m = (1 - FAE.inner) / 2;
  for (let k = 0; k < FAE.tries && !r; k++) {
    const x = (a + m + FAE.inner * H(a, b, 2 * k + 1)) * C, y = (b + m + FAE.inner * H(a, b, 2 * k + 2)) * C;
    if (roomAt(x, y)) r = makeRing(a, b, x, y);
  }
  RINGS.set(key, r);
  return r;
}

// The rings within r of (x, y), into `out` (emptied first), cell by cell.
export function ringsNear(x, y, r, out = []) {
  out.length = 0;
  const C = FAE.cell, r2 = r * r;
  const a0 = Math.floor((x - r) / C), a1 = Math.floor((x + r) / C), b0 = Math.floor((y - r) / C), b1 = Math.floor((y + r) / C);
  for (let b = b0; b <= b1; b++) {
    for (let a = a0; a <= a1; a++) {
      const q = ringAt(a, b);
      if (q && (q.x - x) ** 2 + (q.y - y) ** 2 <= r2) out.push(q);
    }
  }
  return out;
}

// Whether (x, y) is in a ring's clearing (within FAE.clear of its centre): nothing laid out stands
// there (biomes.js biomeProp), in the game and in the tools alike. A centre keeps a fifth of a cell
// (144 px) from its cell's edges, so only the cell's own ring can be that near.
export function clearAt(x, y) {
  const q = ringAt(Math.floor(x / FAE.cell), Math.floor(y / FAE.cell));
  return !!q && (q.x - x) ** 2 + (q.y - y) ** 2 < FAE.clear * FAE.clear;
}

// The court of a cycle that starts at c: Seelie, or Unseelie from unseelie.at. A cycle keeps the court
// it starts in, so no dance is cut at 8:00.
const courtOf = (c) => (c >= FAE.unseelie.at ? FAE.unseelie : FAE.seelie);
// Whether the dance of the cycle starting at c happens: none begins before FAE.first or after FAE.last
// (the first 1:40 are the hero's own; the 14:00 last stand and the dawn stay clean).
const liveAt = (c) => {
  const C = courtOf(c), ds = c + C.sleep + C.stir;
  return ds >= FAE.first && ds <= FAE.last;
};

// A ring at the night's time t (g.time: it stands still in a crypt, and so do the rings), written into
// the ring: its state (ASLEEP, STIR, DANCE), how far through it (k, 0 to 1), whether its dance is in
// its last seconds (quick, the quickening), when this cycle's dance starts (ds) and ends (end), whether
// the court is Unseelie (fierce) and whether its blooms droop after a dance (wilt). Pure: the same t
// gives the same ring, whatever came before.
export function ringPhase(r, t) {
  const P = FAE.period, c = Math.floor((t + r.ph) / P) * P - r.ph, C = courtOf(c);
  const ds = c + C.sleep + C.stir, live = ds >= FAE.first && ds <= FAE.last, u = t - c;
  let state, k;
  if (!live || u < C.sleep) {
    state = ASLEEP;
    k = u / C.sleep;
  } else if (u < C.sleep + C.stir) {
    state = STIR;
    k = (u - C.sleep) / C.stir;
  } else {
    state = DANCE;
    k = (u - C.sleep - C.stir) / C.dance;
  }
  r.state = state;
  r.k = k < 0 ? 0 : k > 1 ? 1 : k;
  r.ds = ds;
  r.end = ds + C.dance;
  r.fierce = C === FAE.unseelie;
  r.quick = state === DANCE && t >= r.end - C.quick;
  r.wilt = state === ASLEEP && u < FAE.wilt && liveAt(c - P);
  return r;
}

// Forget the cells far from (x, y) (keep px from their middles); they come back the same if needed
// again.
export function trimRings(x, y, keep = 2600) {
  const C = FAE.cell, k2 = keep * keep;
  for (const key of RINGS.keys()) {
    const a = Math.floor(key / 65536) - 32768, b = (key % 65536) - 32768;
    if (((a + 0.5) * C - x) ** 2 + ((b + 0.5) * C - y) ** 2 > k2) RINGS.delete(key);
  }
}

// How many cells are remembered (the tests).
export const ringCount = () => RINGS.size;
