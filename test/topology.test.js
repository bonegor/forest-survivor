// The Survival maps' grounds of their own (game/topology, 28 October 2026). The owner's that day: "The
// desert map should be long left to right map that has a mountain range at top and bottom. At the top,
// there is an entrance of a cave every once in a while 2 mins walk apart roughly and that is basicallly
// the crypt. feel free to add quicksand", "The frost map goes up and down ... ice here and there ...
// Entrance to crypts are iglus here and there, some 2 minutes apart. Both frost and desert have roads
// that are not constantly straigh", and "for hell, it has to bean area made of patches of land
// connected by bridges and occasionally just land ... one version has lava around these patches of land
// and below the bridges and the other has like a huge fall into the void." The Darkwood stays as it was,
// pixel for pixel and draw for draw; the hero is held by the new ground, the horde crosses it.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import * as D from '../public/js/game/darkwood.js';
import { BIOMES } from '../public/js/game/biomes.js';
import { MAPS } from '../public/js/data/maps.js';
import { SPR } from '../public/js/engine/sprites.js';
import { Game } from '../public/js/game/game.js';
import { makeTopology, SURFACE, TMAX } from '../public/js/game/topology/index.js';
import { blobOutline } from '../public/js/game/topology/shapes.js';
import { TERRAIN_SOLIDS } from '../public/js/art/terrain.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { metaBonuses, defaultProfile } from '../public/js/shared/profile.js';

const meta = metaBonuses(defaultProfile());
// A headless night on a map, its dice seeded (the run's seed, the Abyss's lava or void, comes from them).
function night(map, seed = 5) {
  const old = Math.random;
  Math.random = mulberry32(seed);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta, settings: { numbers: false }, headless: true, ...(map ? { map } : {}) });
    g.snapCam();
    return g;
  } finally {
    Math.random = old;
  }
}
const topo = (id, run = 7) => makeTopology(BIOMES[id], MAPS[id].seed, run);
const textHash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};
const deg = (r) => (r * 180) / Math.PI;

// ---- 1. The Darkwood untouched -------------------------------------------------------------------
test('the Darkwood, the Bloomvale and a night without a map have no topology; the lattice is as it was', () => {
  assert.equal(makeTopology(BIOMES.forest, 1, 7), null);
  assert.equal(makeTopology(BIOMES.meadow, 4, 7), null);
  const g = night();
  assert.equal(g.world.topo, null);
  assert.deepEqual(g.world.start, D.start(), "the start is darkwood's");
  if (D.DARKWOOD.seed !== 1) D.setWorld({ seed: 1 });
  for (const [cx, cy] of [[0, 0], [9, 5], [11, -7], [-7, 12]]) {
    const a = D.layoutChunk(cx, cy), b = D.layoutChunk(cx, cy, null, null, null);
    assert.deepEqual(b.props, a.props, `chunk ${cx},${cy}: the same props with a null topology`);
  }
});

test("dressLandmark's extraction keeps every Darkwood landmark as it stood (HEAD's, 28 October 2026)", () => {
  // Hashed from darkwood.js's landmark() before dressLandmark was taken out of it.
  const FIXTURE = [[1, 28, '671e34eb'], [2, 21, '55a792ac'], [3, 26, '4d485477'], [5, 19, '61ef01de']];
  try {
    for (const [seed, n, hash] of FIXTURE) {
      D.setWorld({ seed });
      const cells = [];
      for (let k = 0; k < 40; k++) cells.push([(k % 8) - 4, Math.floor(k / 8) * 2 - 4 + (((k % 8) + 1) & 1)]);
      const L = cells
        .filter(([i, j]) => (i + j) & 1)
        .map(([i, j]) => D.landmark(i, j))
        .filter(Boolean)
        .map((L) => `${L.kind}@${L.x.toFixed(2)},${L.y.toFixed(2)}:` + L.props.map((p) => `${p.n}@${p.x},${p.y}${p.light ? ':' + p.light.join('/') : ''}`).join(';'));
      assert.equal(L.length, n, `seed ${seed}: its landmarks`);
      assert.equal(textHash(L.join('|')), hash, `seed ${seed}: what stands at them`);
    }
  } finally {
    D.setWorld({ seed: 1 });
  }
});

// ---- 2. Pure and orderless -----------------------------------------------------------------------
test('a topology comes out the same in any order: its fields and its chunks, made forward or backward', () => {
  for (const id of ['desert', 'frozen', 'hell']) {
    D.setWorld({ seed: MAPS[id].seed });
    const list = [];
    for (let k = 0; k < 60; k++) list.push([(k % 12) - 6, Math.floor(k / 12) - 2]);
    const snap = (T, order) => {
      const out = new Map();
      for (const [cx, cy] of order) {
        const tc = T.terrain(cx, cy), lay = D.layoutChunk(cx, cy, null, BIOMES[id].density, T);
        const f = (a) => (a ? Array.from(a).join(',') : 'none');
        out.set(`${cx},${cy}`, [f(tc.open), f(tc.patch), f(tc.deck), JSON.stringify(lay.props), JSON.stringify(lay.crypts)].join('|'));
      }
      return out;
    };
    const fwd = snap(topo(id), list), back = snap(topo(id), [...list].reverse());
    for (const [k, v] of fwd) assert.equal(back.get(k), v, `${id}: chunk ${k}`);
  }
  D.setWorld({ seed: 1 });
});

test("a chunk's fields agree with its neighbours' along their seam, and with the analytic answer", () => {
  for (const id of ['desert', 'frozen', 'hell']) {
    const T = topo(id);
    for (const [cx, cy] of [[0, -3], [0, 2], [-3, 0], [2, 1], [5, -2]]) {
      const a = T.terrain(cx, cy), b = T.terrain(cx + 1, cy);
      for (let j = 0; j < 65; j++) {
        const va = a.open ? a.open[j * 65 + 64] : TMAX, vb = b.open ? b.open[j * 65] : TMAX;
        assert.equal(va, vb, `${id}: ${cx},${cy} east seam, row ${j}`);
      }
      for (let k = 0; k < 40; k++) {
        const i = (k * 7) % 65, j = (k * 13) % 65, x = cx * 256 + i * 4, y = cy * 256 + j * 4, v = a.open ? a.open[j * 65 + i] : TMAX;
        assert.ok(Math.abs(T.openAt(x, y) - v) <= 1.5, `${id}: open at ${x},${y}: ${T.openAt(x, y)} against ${v}`);
      }
    }
  }
});

// ---- 3-6. The Sunscorch ---------------------------------------------------------------------------
test('the Sunscorch: open sand between two ranges along x, a road that never runs long straight', () => {
  const T = topo('desert'), half = T.T.band / 2, lim = half - T.T.road.keep;
  for (let x = -60000; x <= 60000; x += 200) {
    const band = T.hi(x) - T.lo(x);
    assert.ok(band >= 1000 && band <= 1400, `the band at ${x}: ${band}`);
    assert.ok(T.lo(x) < -400 && T.hi(x) > 400, `the ranges at ${x}`);
    assert.ok(T.openAt(x, T.road(x)) > 0, `the road at ${x} is on the sand`);
    assert.ok(T.openAt(x, -900) < 0 && T.openAt(x, 900) < 0, `the ranges at ${x} are rock`);
    assert.ok(Math.abs(T.road(x)) <= lim, `the road at ${x} keeps off the ranges`);
  }
  for (let w = -20000; w <= 20000 - 900; w += 300) {
    let lo = Infinity, hi = -Infinity;
    for (let u = w; u <= w + 900; u += 50) {
      const a = Math.atan2(T.road(u + 4) - T.road(u - 4), 8);
      lo = Math.min(lo, a);
      hi = Math.max(hi, a);
    }
    assert.ok(deg(hi - lo) >= 4, `the road turns within ${w}..${w + 900}: ${deg(hi - lo).toFixed(1)}°`);
  }
  const s = T.start();
  assert.ok(Math.abs(s.y - T.road(s.x)) <= 40, 'the hero starts on the road, by its plaza');
  assert.ok(T.openAt(s.x, s.y) >= 12 && T.patchAt(s.x, s.y) < 0, 'on open sand');
});

test("the Sunscorch's crypts are caves at the foot of the top range, a minute and then two minutes' walk apart", () => {
  const T = topo('desert'), C = T.T.crypts;
  const caves = T.cryptsIn(-60000, 60000).map((k) => [k, T.cryptPlace(k)]).sort((a, b) => a[1].x - b[1].x);
  const keys = new Set();
  for (const [k, P] of caves) {
    const c = P.crypt;
    assert.equal(c.face, 'cliff');
    assert.equal(c.key, `${k},0`);
    const [a, b] = c.key.split(',').map(Number);
    assert.ok(Number.isInteger(a) && Number.isInteger(b), 'its key two integers (game.js cryptName)');
    assert.ok(!keys.has(c.key));
    keys.add(c.key);
    const below = c.y - T.lo(c.x);
    assert.ok(below > 0 && below <= 24, `cave ${k}: ${below} px below the face`);
    assert.ok(T.openAt(c.x, c.y + 12) >= 10, `cave ${k}: open ground before its steps`);
    assert.ok(T.openAt(c.x, c.y - 30) < 0, `cave ${k}: rock above it`);
    const n = P.path.xs.length - 1;
    assert.ok(Math.hypot(P.path.xs[n] - c.x, P.path.ys[n] - (c.y + 14)) < 4, `cave ${k}: a footpath reaches its steps`);
    assert.ok(Math.abs(P.path.ys[1] - T.road(P.path.xs[1])) < 30, `cave ${k}: from the road`);
  }
  const east = caves.filter(([k]) => k > 0).map(([, P]) => P.crypt), west = caves.filter(([k]) => k < 0).map(([, P]) => P.crypt).reverse();
  for (const side of [east, west]) {
    const d0 = Math.abs(side[0].x);
    assert.ok(d0 >= 3000 && d0 <= 6000, `the nearest cave ${d0} px from the start`);
    for (let i = 1; i < side.length; i++) {
      const d = Math.abs(side[i].x - side[i - 1].x);
      assert.ok(d >= 7000 && d <= 11000, `caves ${d} px apart`);
    }
  }
  assert.ok(C.every > 8000, "two minutes' walk");
});

test('the Sunscorch: quicksand off the road, off the ranges, clear of every place, not too many', () => {
  const T = topo('desert'), P = T.T.patches;
  let n = 0;
  T.forPatches(-50000, 50000, (p) => {
    n++;
    assert.equal(p.kind, 'quicksand');
    assert.ok(2 * p.r >= 30 && 2 * p.r <= 70, `${p.key}: ${2 * p.r} px across`);
    assert.ok(T.patchAt(p.x, p.y) > 0, `${p.key}: its middle is quicksand`);
    for (let k = 0; k < p.pts.length; k += 2) {
      const x = p.pts[k], y = p.pts[k + 1];
      assert.ok(Math.abs(y - T.road(x)) - T.roadHw(x) >= 40, `${p.key}: 40 px off the road's edge`);
      assert.ok(y - T.lo(x) >= 56 && T.hi(x) - y >= 56, `${p.key}: off the ranges`);
    }
    for (const S of T.spotsNear(p.x, 400)) assert.ok(Math.hypot(S.x - p.x, S.y - p.y) - p.ext >= 150, `${p.key}: clear of the ${S.kind} at ${S.x},${S.y}`);
  });
  const per = n / 10;
  assert.ok(per >= 6 && per <= 20, `${per} pools per 10,000 px`);
  assert.equal(P.offRoad, 40);
});

test("the Sunscorch's and the Frostfell's shrines stand on the road, a shrine's walk apart, neighbours unlike", () => {
  for (const id of ['desert', 'frozen']) {
    const T = topo(id);
    for (const s of [1, -1]) {
      let prev = null;
      for (let m = 1; m <= 10; m++) {
        const P = T.shrinePlace(s * m), u = T.U(P.x, P.y), v = T.V(P.x, P.y);
        assert.ok(Math.abs(v - T.road(u)) < 1, `${id}: shrine ${s * m} on the road`);
        if (prev) {
          const d = Math.abs(u - T.U(prev.x, prev.y));
          assert.ok(d >= 1700 && d <= 2800, `${id}: shrines ${d} px apart`);
          assert.notEqual(P.type, prev.type, `${id}: neighbouring shrines differ`);
        }
        prev = P;
      }
    }
  }
});

// ---- 7. The Frostfell -----------------------------------------------------------------------------
test('the Frostfell: a corridor along y, igloos by the road, ice sheets and ponds off it', () => {
  const T = topo('frozen');
  assert.equal(T.axis, 'y');
  for (let y = -60000; y <= 60000; y += 200) {
    const band = T.hi(y) - T.lo(y);
    assert.ok(band >= 1300 && band <= 1700, `the band at ${y}: ${band}`);
    assert.ok(T.openAt(T.road(y), y) > 0 && T.openAt(-1100, y) < 0 && T.openAt(1100, y) < 0, `the cliffs at ${y}`);
  }
  const s = T.start();
  assert.ok(Math.abs(s.x - T.road(s.y)) <= 40 && T.openAt(s.x, s.y) >= 12, 'the start on the road');
  const igloos = T.cryptsIn(-50000, 50000).map((k) => T.cryptPlace(k).crypt).sort((a, b) => a.y - b.y);
  for (const c of igloos) {
    assert.equal(c.face, 'igloo');
    const off = Math.abs(c.x - T.road(c.y));
    assert.ok(off >= 60 && off <= 130, `igloo ${c.key}: ${off} px off the road`);
    assert.ok(T.openAt(c.x, c.y + 12) >= 10 && T.patchAt(c.x, c.y + 12) < 0, `igloo ${c.key}: its door faces south onto snow`);
  }
  for (let i = 1; i < igloos.length; i++) {
    if (Math.sign(igloos[i].y) !== Math.sign(igloos[i - 1].y)) continue;
    const d = igloos[i].y - igloos[i - 1].y;
    assert.ok(d >= 7000 && d <= 11000, `igloos ${d} px apart`);
  }
  let n = 0, ponds = 0;
  T.forPatches(-30000, 30000, (p) => {
    n++;
    assert.equal(p.kind, 'ice');
    assert.ok(2 * p.r >= 50 && 2 * p.r <= 260, `${p.key}: ${2 * p.r} px across`);
    for (let k = 0; k < p.pts.length; k += 2) {
      const x = p.pts[k], y = p.pts[k + 1];
      assert.ok(Math.abs(x - T.road(y)) - T.roadHw(y) >= 30, `${p.key}: 30 px off the road's edge`);
    }
    if (p.rocks) {
      ponds++;
      assert.equal(p.rocks.kind, 'pond');
      for (const q of p.rocks.props) assert.ok(TERRAIN_SOLIDS[q.n], `${p.key}: its ${q.n} stops the hero`);
    }
  });
  assert.ok(n > 40 && ponds > 5, `${n} ice sheets, ${ponds} ponds with rocks`);
});

// ---- 8. The Abyss ----------------------------------------------------------------------------------
test('the Abyss: islands every one reachable from the start, three joinings or more each, never touching', () => {
  const T = topo('hell');
  for (let j = -10; j <= 10; j++) for (let i = -10; i <= 10; i++) assert.ok(T.joinings(i, j).length >= 3, `island ${i},${j} keeps 3 joinings`);
  const seen = new Set(['0,0']), q = [[0, 0]];
  while (q.length) {
    const [i, j] = q.shift();
    for (const L of T.joinings(i, j)) {
      const o = L.A.i === i && L.A.j === j ? L.B : L.A, k = `${o.i},${o.j}`;
      if (Math.abs(o.i) <= 10 && Math.abs(o.j) <= 10 && !seen.has(k)) {
        seen.add(k);
        q.push([o.i, o.j]);
      }
    }
  }
  for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) assert.ok(seen.has(`${i},${j}`), `island ${i},${j} can be walked to`);
  const S = T.island(0, 0);
  assert.ok(S.R >= 480, `the start island ${S.R} px round`);
  assert.equal(T.joinings(0, 0).length, 4, 'the start keeps all four');
  for (let j = -4; j <= 4; j++) {
    for (let i = -4; i <= 4; i++) {
      const a = blobOutline(T.island(i, j).blob, 96);
      for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const b = blobOutline(T.island(i + di, j + dj).blob, 96);
        let d = Infinity;
        for (let p = 0; p < a.length; p += 2) for (let r = 0; r < b.length; r += 2) d = Math.min(d, Math.hypot(a[p] - b[r], a[p + 1] - b[r + 1]));
        assert.ok(d >= 80, `islands ${i},${j} and ${i + di},${j + dj}: coasts ${d.toFixed(1)} px apart`);
      }
    }
  }
  const kinds = { bridge: 0, isthmus: 0, broad: 0 };
  for (let j = -6; j <= 6; j++) {
    for (let i = -6; i <= 6; i++) {
      for (const d of [0, 1]) {
        const L = T.link(i, j, d);
        if (!L) continue;
        kinds[L.kind]++;
        const w = 2 * L.hw;
        if (L.kind === 'bridge') assert.ok(w >= 24 && w <= 36, `bridge ${L.key}: ${w} px wide`);
        if (L.kind === 'isthmus') assert.ok(w >= 40 && w <= 80, `isthmus ${L.key}: ${w} px wide`);
        if (L.kind === 'broad') assert.ok(w >= 140, `broad joining ${L.key}: ${w} px wide`);
      }
    }
  }
  assert.ok(kinds.bridge > 0 && kinds.isthmus > 0 && kinds.broad > 0, JSON.stringify(kinds));
});

test("the Abyss's crypts stand on islands, the nearest four a minute's walk from the start; its gaps lava or void by the run", () => {
  const T = topo('hell');
  const near = T.cryptsNear(0, 0, 3000).filter((c) => c.key !== '0,0').map((c) => c.key).sort();
  assert.deepEqual(near, ['-2,-2', '-2,2', '2,-2', '2,2']);
  for (const c of T.cryptsNear(0, 0, 9000)) {
    assert.equal(c.face, 'island');
    assert.ok(T.openAt(c.x, c.y + 12) >= 10, `crypt ${c.key}: land before its steps`);
    assert.ok(T.openAt(c.x, c.y - 21) >= 5 && T.openAt(c.x - 15, c.y - 12) >= 5 && T.openAt(c.x + 15, c.y - 12) >= 5, `crypt ${c.key}: its walls on land`);
  }
  const count = { lava: 0, void: 0 };
  for (let s = 1; s <= 60; s++) count[makeTopology(BIOMES.hell, MAPS.hell.seed, s).variant]++;
  assert.ok(count.lava >= 20 && count.lava <= 40 && count.void >= 20, JSON.stringify(count));
  assert.equal(makeTopology(BIOMES.hell, 5, 1234).variant, makeTopology(BIOMES.hell, 5, 1234).variant, 'the same run, the same gaps');
  let a = null, b = null;
  for (let s = 1; s <= 60 && !(a && b); s++) {
    const t = makeTopology(BIOMES.hell, MAPS.hell.seed, s);
    if (t.variant === 'lava') a ??= t;
    else b ??= t;
  }
  for (let j = -3; j <= 3; j++) {
    for (let i = -3; i <= 3; i++) {
      const p = a.island(i, j), q = b.island(i, j);
      assert.deepEqual([p.x, p.y, p.R], [q.x, q.y, q.R], `island ${i},${j} the same over lava and void`);
      for (const d of [0, 1]) assert.equal(a.link(i, j, d)?.kind, b.link(i, j, d)?.kind);
    }
  }
});

// ---- 9. The Forest over a topology -------------------------------------------------------------------
test('the ground at a point: rock, gap, deck, quicksand, ice, road', () => {
  const desert = night('desert'), W = desert.world, T = W.topo;
  assert.ok(T && T.kind === 'corridor');
  assert.equal(W.surfaceAt(0, -1000), SURFACE.WALL, 'the top range');
  assert.equal(W.surfaceAt(3000, T.road(3000)), SURFACE.ROAD);
  const pool = T.patchesNear(0, 0, 8000)[0];
  assert.equal(W.surfaceAt(pool.x, pool.y), SURFACE.QUICKSAND);
  assert.equal(W.patchAt(pool.x, pool.y), pool);
  assert.ok(W.patchDepth(pool.x, pool.y) > 0);
  const frozen = night('frozen'), sheet = frozen.world.topo.patchesNear(0, 0, 8000)[0];
  assert.equal(frozen.world.surfaceAt(sheet.x, sheet.y), SURFACE.ICE);
  assert.equal(frozen.world.surfaceAt(-1200, 0), SURFACE.WALL, 'the left cliff');
  const hell = night('hell'), H = hell.world.topo;
  assert.equal(hell.world.surfaceAt(450, 450), SURFACE.GAP, 'between the start and its south-east neighbour');
  let bridge = null;
  for (let j = -2; j <= 2 && !bridge; j++) for (let i = -2; i <= 2 && !bridge; i++) for (const d of [0, 1]) if (H.link(i, j, d)?.kind === 'bridge') bridge = H.link(i, j, d);
  const mid = bridge.pts[(bridge.mA + bridge.mB) >> 1];
  assert.equal(hell.world.surfaceAt(mid[0], mid[1]), SURFACE.BRIDGE);
  assert.equal(hell.world.free(mid[0], mid[1]), true, 'a deck holds him');
  const wood = night();
  assert.equal(wood.world.surfaceAt(0, -1000), SURFACE.GROUND);
  assert.equal(wood.world.free(5000, 5000), true);
});

// No trunks in the chunks of the box (so a walk is held by the ground alone, not a tree on its way).
function clearTrunks(g, x0, y0, x1, y1) {
  for (let cy = Math.floor(Math.min(y0, y1) / 256) - 1; cy <= Math.floor(Math.max(y0, y1) / 256) + 1; cy++) {
    for (let cx = Math.floor(Math.min(x0, x1) / 256) - 1; cx <= Math.floor(Math.max(x0, x1) / 256) + 1; cx++) g.world.chunk(cx, cy).trunks.length = 0;
  }
}
// Walks e from where it stands toward (tx, ty) at `speed` px/s for `secs`, as the game moves the hero:
// a step, then the world's collision.
function walk(g, e, tx, ty, secs, speed = 70) {
  for (let i = 0; i < secs * 60; i++) {
    const dx = tx - e.x, dy = ty - e.y, l = Math.hypot(dx, dy);
    if (l < 1) break;
    e.vx = (dx / l) * speed;
    e.vy = (dy / l) * speed;
    e.x += e.vx / 60;
    e.y += e.vy / 60;
    g.world.collide(e);
  }
}

test('the hero is held by the mountains, the coasts and a gap, crosses a bridge, and a leap stops short', () => {
  const desert = night('desert'), W = desert.world, T = W.topo, p = desert.player;
  // North from the road to the top range, a little way along from the start.
  const x = 1300;
  clearTrunks(desert, x, T.lo(x) - 50, x, T.road(x));
  p.x = x;
  p.y = T.road(x);
  desert.crypts.length = 0;
  walk(desert, p, x, T.lo(x) - 400, 3 + (T.road(x) - T.lo(x)) / 70);
  assert.ok(W.openAt(p.x, p.y) >= 4.5, `held at the face, ${W.openAt(p.x, p.y).toFixed(1)} px from it`);
  assert.ok(p.y < T.lo(x) + 30, `and he got there (${p.y.toFixed(0)} against ${T.lo(x).toFixed(0)})`);

  const hell = night('hell'), H = hell.world, hp = hell.player, I = H.topo.island(0, 0);
  hell.crypts.length = 0;
  clearTrunks(hell, I.x, I.y, I.x + 900, I.y + 900);
  hp.x = I.x + 60;
  hp.y = I.y + 60;
  walk(hell, hp, I.x + 1200, I.y + 1200, 12);
  const out = Math.hypot(hp.x - I.x, hp.y - I.y);
  assert.ok(H.openAt(hp.x, hp.y) >= 4.5 && out < I.blob.ext + 2 && out > I.blob.inn - 20, `held at the start island's coast (${out.toFixed(0)} px out)`);
  assert.equal(H.open(I.x + 700, I.y + 700, hp.r), false, 'no leap lands over the gap');
  // A bridge, end to end.
  let L = null;
  for (let j = -2; j <= 2 && !L; j++) for (let i = -2; i <= 2 && !L; i++) for (const d of [0, 1]) if (H.topo.link(i, j, d)?.kind === 'bridge') L = H.topo.link(i, j, d);
  const a = L.pts[Math.max(0, L.mA - 6)], b = L.pts[Math.min(L.pts.length - 1, L.mB + 6)];
  clearTrunks(hell, a[0], a[1], b[0], b[1]);
  hp.x = a[0];
  hp.y = a[1];
  for (let k = Math.max(0, L.mA - 6); k <= Math.min(L.pts.length - 1, L.mB + 6); k++) walk(hell, hp, L.pts[k][0], L.pts[k][1], 0.5);
  assert.ok(Math.hypot(hp.x - b[0], hp.y - b[1]) < 6, `across bridge ${L.key}`);
  // The thief is held at a gap as the hero is; a ghoul walks over it.
  const gap = [I.x + I.blob.ext * 0.72 + 30, I.y + I.blob.ext * 0.72 + 30];
  assert.equal(H.surfaceAt(gap[0], gap[1]), SURFACE.GAP);
  const th = hell.spawnEnemy('thief', gap[0], gap[1], { instant: true, always: true });
  H.collide(th);
  assert.ok(H.openAt(th.x, th.y) >= th.r - 0.5, 'the thief brought back to land');
  const z = hell.spawnEnemy('zombie', gap[0], gap[1], { instant: true, always: true }), at = [z.x, z.y];
  H.collide(z);
  assert.deepEqual([z.x, z.y], at, 'a ghoul crosses');
  // slows() answers only within 800 px of the hero, and the bridge left him far off: home first.
  hp.x = I.x;
  hp.y = I.y;
  assert.equal(H.slows(gap[0], gap[1]), true, 'slower over the gap');
  assert.equal(H.slows(I.x, I.y), false, 'not on land');
  assert.equal(night().world.slows(0, 0), false, 'never in the Darkwood');
});

test('what falls over the void lands on land; the horde comes in on land; nothing drawn in the Darkwood', () => {
  const hell = night('hell'), H = hell.world, I = H.topo.island(0, 0);
  const pk = hell.addPickup('gem', I.x + I.blob.ext + 60, I.y + 20, 1);
  assert.ok(H.free(pk.x, pk.y), 'the gem on land');
  assert.ok(Math.hypot(pk.x - (I.x + I.blob.ext + 60), pk.y - (I.y + 20)) <= 400, 'near where it fell');
  const p = hell.player;
  p.x = I.x;
  p.y = I.y;
  p.vx = p.vy = 0;
  hell.snapCam();
  const old = Math.random;
  Math.random = mulberry32(3);
  let free = 0;
  try {
    for (let k = 0; k < 300; k++) {
      const s = H.spawnPoint(hell);
      if (H.free(s.x, s.y)) free++;
    }
  } finally {
    Math.random = old;
  }
  assert.ok(free >= 240, `${free} of 300 on land`);
  assert.ok(H.landSpot(I.x, I.y), 'land at the start');
  const wood = night(), calls = [];
  const ctx = new Proxy({}, { get: (t, k) => (...a) => calls.push(k), set: (t, k) => (calls.push('=' + String(k)), true) });
  wood.world.drawGroundProps(ctx, wood.cam, 1.5);
  wood.world.drawTerrainTells(ctx, wood.cam);
  assert.deepEqual(calls, [], 'no context calls in the Darkwood');
  assert.deepEqual(wood.world.floorNear(10, 20), { x: 10, y: 20 });
  assert.deepEqual(wood.world.freeSpot(10, 20), { x: 10, y: 20 });
});

// ---- 10. Art ------------------------------------------------------------------------------------------
test('every name the topologies lay out is drawn, or stands in; the new doors are the crypt\'s size', () => {
  const names = new Set(['crypt_cave', 'crypt_igloo']);
  for (const id of ['desert', 'frozen', 'hell']) {
    const T = topo(id);
    D.setWorld({ seed: MAPS[id].seed });
    for (let cy = -4; cy <= 4; cy++) for (let cx = -4; cx <= 4; cx++) for (const q of D.layoutChunk(cx, cy, null, BIOMES[id].density, T).props) if (q.src) names.add(q.n);
    for (const n of T.T.spires?.name || []) names.add(n);
  }
  for (const n of ['ice_rock1', 'ice_rock2', 'ice_rock3', 'sand_reeds', 'sand_ribcage', 'sand_skull', 'hell_post_wood', 'hell_post_bone', 'hell_post_stone']) names.add(n);
  D.setWorld({ seed: 1 });
  for (const n of names) assert.ok(SPR[n], `${n} is drawn or stands in`);
  // The crypt's 26 x 29 art, 28 x 31 as built (the 1 px ink outline round it): as SPR.crypt.
  for (const n of ['crypt_cave', 'crypt_igloo']) {
    assert.equal(SPR[n].w, SPR.crypt.w, `${n}: the crypt's width`);
    assert.equal(SPR[n].h, SPR.crypt.h, `${n}: the crypt's height`);
    assert.equal(SPR[n].frames.length, 2, `${n}: open and sealed`);
  }
});
