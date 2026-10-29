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
import { paintTerrain } from '../public/js/game/topology/paint.js';
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
test("the Darkwood and a night without a map have no topology; the Bloomvale's is the quilt", () => {
  assert.equal(makeTopology(BIOMES.forest, 1, 7), null);
  assert.equal(makeTopology(BIOMES.meadow, 4, 7).kind, 'quilt');
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
// Its band narrowed from 1,200 px to 300 on 29 October 2026, the owner's: "make the desert map
// narrower, like (on average) the space, make it be slightly narrower than avg computer screen" (the
// view is about 320-360 world px tall): about 300 px across on average, never under about 220 or over
// about 380, the road bending up to about a third of it and never nearer a range than `road.keep`.
test('the Sunscorch: open sand about 300 px across between two ranges along x, a road that never runs long straight', () => {
  const T = topo('desert'), K = T.T.road.keep;
  assert.equal(T.T.band, 300);
  let sum = 0, n = 0, far = 0;
  for (let x = -60000; x <= 60000; x += 40) {
    const lo = T.lo(x), hi = T.hi(x), band = hi - lo, r = T.road(x);
    sum += band;
    n++;
    assert.ok(band >= 215 && band <= 380, `the band at ${x}: ${band}`);
    assert.ok(lo < -90 && hi > 90, `the ranges at ${x}`);
    assert.ok(T.openAt(x, r) > 0, `the road at ${x} is on the sand`);
    assert.ok(T.openAt(x, -260) < 0 && T.openAt(x, 260) < 0, `the ranges at ${x} are rock`);
    assert.ok(r - lo >= K && hi - r >= K, `the road at ${x} keeps ${K} px off the ranges: ${(r - lo).toFixed(1)}, ${(hi - r).toFixed(1)}`);
    far = Math.max(far, Math.abs(r - (lo + hi) / 2));
  }
  assert.ok(sum / n >= 285 && sum / n <= 315, `${(sum / n).toFixed(1)} px across on average`);
  assert.ok(far >= 70 && far <= 110, `the road bends up to ${far.toFixed(1)} px off the band's middle`);
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
    // Smaller since the band narrowed to 300 px (29 October 2026): 24-48 px across, 30-70 before.
    assert.ok(2 * p.r >= 24 && 2 * p.r <= 48, `${p.key}: ${2 * p.r} px across`);
    assert.ok(T.patchAt(p.x, p.y) > 0, `${p.key}: its middle is quicksand`);
    for (let k = 0; k < p.pts.length; k += 2) {
      const x = p.pts[k], y = p.pts[k + 1];
      assert.ok(Math.abs(y - T.road(x)) - T.roadHw(x) >= P.offRoad, `${p.key}: ${P.offRoad} px off the road's edge`);
      assert.ok(y - T.lo(x) >= P.fromFace - 4 && T.hi(x) - y >= P.fromFace - 4, `${p.key}: off the ranges`);
    }
    for (const S of T.spotsNear(p.x, 400)) assert.ok(Math.hypot(S.x - p.x, S.y - p.y) - p.ext >= 150, `${p.key}: clear of the ${S.kind} at ${S.x},${S.y}`);
  });
  const per = n / 10;
  assert.ok(per >= 6 && per <= 20, `${per} pools per 10,000 px`);
  assert.equal(P.offRoad, 26);
});

// No oasis, ruin or pool ever closes the band (29 October 2026: the band 300 px across): past each
// landmark (all it stands on, its props' feet `fit.foot` px round and an oasis's water) and each pool
// there are at least 90 px of open sand across, on one side or the other, at every point along it, and
// no pool lies alongside a landmark to narrow that. Each stands on the sand, off the road.
test('the Sunscorch: a way of 90 px or more past every landmark and quicksand pool', () => {
  const T = topo('desert'), M = T.T.landmarks, S = T.T.shrines.every, Ls = [];
  assert.ok(M.fit && M.fit.pass >= 90, 'landmarks fitted across the band');
  for (let k = Math.floor(-50000 / S); k <= Math.ceil(50000 / S); k++) {
    const L = T.landmark(k);
    if (!L) continue;
    Ls.push(L);
    const B = L.body;
    for (let u = B.u0; u <= B.u1; u += 4) {
      const lo = T.lo(u), hi = T.hi(u), r = T.road(u), hw = T.roadHw(u);
      assert.ok(Math.max(B.v0 - lo, hi - B.v1) >= 90, `${L.kind} at ${L.x.toFixed(0)},${L.y.toFixed(0)}: a way past it at ${u.toFixed(0)}`);
      assert.ok(B.v0 - lo >= M.fit.face - 1 && hi - B.v1 >= M.fit.face - 1, `${L.kind} at ${L.x.toFixed(0)}: on the sand`);
      assert.ok(B.v0 > r + hw || B.v1 < r - hw, `${L.kind} at ${L.x.toFixed(0)}: off the road`);
    }
    for (const p of L.props) assert.ok(p.n === 'sand_reeds' || T.openAt(p.x, p.y) >= 10, `${L.kind}: its ${p.n} at ${p.x},${p.y} on the sand`);
  }
  const kinds = new Set(Ls.map((L) => L.kind));
  assert.ok(Ls.length >= 20 && ['ruins', 'bones', 'circle', 'oasis'].every((k) => kinds.has(k)), `${Ls.length} landmarks, ${[...kinds].join(', ')}`);
  T.forPatches(-50000, 50000, (p) => {
    for (let u = p.x - p.ext; u <= p.x + p.ext; u += 4) assert.ok(Math.max(p.y - p.ext - T.lo(u), T.hi(u) - p.y - p.ext) >= 90, `${p.key}: a way past it at ${u.toFixed(0)}`);
    for (const L of Ls) assert.ok(p.x + p.ext <= L.body.u0 || p.x - p.ext >= L.body.u1, `${p.key}: not alongside the ${L.kind} at ${L.x.toFixed(0)}`);
  });
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
// Its band narrowed from 1,500 px to about 520 on 29 October 2026, the owner's: "ok, also, then the
// frozen map must be made narrower" (after the Sunscorch's "slightly narrower than avg computer
// screen"; the view is about 570-640 world px wide): about 520 px across on average, never under about
// 430 or over about 610, the road bending up to about a third of it and never nearer a cliff than
// `road.keep`, every igloo on the snow with room round it.
test('the Frostfell: a corridor along y about 520 px across, igloos by the road, ice sheets and ponds off it', () => {
  const T = topo('frozen'), K = T.T.road.keep;
  assert.equal(T.axis, 'y');
  let sum = 0, n0 = 0, far = 0;
  for (let y = -60000; y <= 60000; y += 40) {
    const lo = T.lo(y), hi = T.hi(y), band = hi - lo, r = T.road(y);
    sum += band;
    n0++;
    assert.ok(band >= 430 && band <= 610, `the band at ${y}: ${band}`);
    assert.ok(T.openAt(r, y) > 0 && T.openAt(-420, y) < 0 && T.openAt(420, y) < 0, `the cliffs at ${y}`);
    assert.ok(r - lo >= K && hi - r >= K, `the road at ${y} keeps ${K} px off the cliffs: ${(r - lo).toFixed(1)}, ${(hi - r).toFixed(1)}`);
    far = Math.max(far, Math.abs(r - (lo + hi) / 2));
  }
  assert.ok(sum / n0 >= 505 && sum / n0 <= 535, `${(sum / n0).toFixed(1)} px across on average`);
  assert.ok(far >= 140 && far <= 200, `the road bends up to ${far.toFixed(1)} px off the band's middle`);
  const s = T.start();
  assert.ok(Math.abs(s.x - T.road(s.y)) <= 40 && T.openAt(s.x, s.y) >= 12, 'the start on the road');
  for (const p of T.startPlace().props) assert.ok(T.openAt(p.x, p.y) >= 10, `the start's ${p.n} on the snow`);
  for (let k = -20; k <= 20; k++) if (k) for (const p of T.shrinePlace(k).props) assert.ok(T.openAt(p.x, p.y) >= 8, `shrine ${k}'s ${p.n} on the snow`);
  const igloos = T.cryptsIn(-50000, 50000).map((k) => T.cryptPlace(k).crypt).sort((a, b) => a.y - b.y);
  for (const c of igloos) {
    assert.equal(c.face, 'igloo');
    const off = Math.abs(c.x - T.road(c.y));
    assert.ok(off >= 60 && off <= 130, `igloo ${c.key}: ${off} px off the road`);
    assert.ok(T.openAt(c.x, c.y + 12) >= 10 && T.patchAt(c.x, c.y + 12) < 0, `igloo ${c.key}: its door faces south onto snow`);
    // Its walls and its lanterns (24 px either side) on the snow too (corridor.js cryptPlace `room`).
    for (const du of [-28, -14, 0, 8]) assert.ok(Math.min(c.x - T.lo(c.y + du), T.hi(c.y + du) - c.x) >= 36, `igloo ${c.key}: room to the cliff`);
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
    // Smaller since the band narrowed to about 520 px (29 October 2026): 50-170 px across, 50-260 before.
    assert.ok(2 * p.r >= 50 && 2 * p.r <= 170, `${p.key}: ${2 * p.r} px across`);
    for (let k = 0; k < p.pts.length; k += 2) {
      const x = p.pts[k], y = p.pts[k + 1];
      assert.ok(Math.abs(x - T.road(y)) - T.roadHw(y) >= 30, `${p.key}: 30 px off the road's edge`);
      assert.ok(x - T.lo(y) >= T.T.patches.fromFace - 4 && T.hi(y) - x >= T.T.patches.fromFace - 4, `${p.key}: off the cliffs`);
    }
    if (p.rocks) {
      ponds++;
      assert.equal(p.rocks.kind, 'pond');
      for (const q of p.rocks.props) assert.ok(TERRAIN_SOLIDS[q.n], `${p.key}: its ${q.n} stops the hero`);
    }
  });
  assert.ok(n > 40 && ponds > 5, `${n} ice sheets, ${ponds} ponds with rocks`);
});

// No landmark, ice sheet or pond closes the band (29 October 2026: the band about 520 px across): past
// each landmark (its props' feet `fit.foot` px round) and each sheet there are at least 120 px of open
// snow across, on one side or the other, at every point along it, and no sheet lies alongside a
// landmark to narrow that. Each landmark stands on the snow, off the road.
test('the Frostfell: a way of 120 px or more past every landmark, ice sheet and pond', () => {
  const T = topo('frozen'), M = T.T.landmarks, S = T.T.shrines.every, Ls = [];
  assert.ok(M.fit && M.fit.pass >= 120, 'landmarks fitted across the band');
  for (let k = Math.floor(-50000 / S); k <= Math.ceil(50000 / S); k++) {
    const L = T.landmark(k);
    if (!L) continue;
    Ls.push(L);
    const B = L.body;
    for (let u = B.u0; u <= B.u1; u += 4) {
      const lo = T.lo(u), hi = T.hi(u), r = T.road(u), hw = T.roadHw(u);
      assert.ok(Math.max(B.v0 - lo, hi - B.v1) >= 120, `${L.kind} at ${L.x.toFixed(0)},${L.y.toFixed(0)}: a way past it at ${u.toFixed(0)}`);
      assert.ok(B.v0 - lo >= M.fit.face - 1 && hi - B.v1 >= M.fit.face - 1, `${L.kind} at ${L.y.toFixed(0)}: on the snow`);
      assert.ok(B.v0 > r + hw || B.v1 < r - hw, `${L.kind} at ${L.y.toFixed(0)}: off the road`);
    }
    for (const p of L.props) assert.ok(T.openAt(p.x, p.y) >= 10, `${L.kind}: its ${p.n} at ${p.x},${p.y} on the snow`);
  }
  const kinds = new Set(Ls.map((L) => L.kind));
  assert.ok(Ls.length >= 12 && ['circle', 'woodcamp', 'ruins', 'graveyard'].every((k) => kinds.has(k)), `${Ls.length} landmarks, ${[...kinds].join(', ')}`);
  T.forPatches(-50000, 50000, (p) => {
    for (let u = p.y - p.ext; u <= p.y + p.ext; u += 4) assert.ok(Math.max(p.x - p.ext - T.lo(u), T.hi(u) - p.x - p.ext) >= 120, `${p.key}: a way past it at ${u.toFixed(0)}`);
    for (const L of Ls) assert.ok(p.y + p.ext <= L.body.u0 || p.y - p.ext >= L.body.u1, `${p.key}: not alongside the ${L.kind} at ${L.y.toFixed(0)}`);
    if (p.rocks) for (const q of p.rocks.props) assert.ok(T.openAt(q.x, q.y) >= 4, `${p.key}: its ${q.n} on the snow`);
  });
});

// Its cliffs past the fields' reach (29 October 2026): the fields stop TMAX px into the rock, and there
// the terraces ran out along a straight line (a row of the rock beyond it showed a snow-lit step about
// twice), which the band, narrowed to about 520 px, shows whenever the hero is near a cliff. Painted
// from the faces themselves past it (topology/paint.js), the steps run on into the rock as they began.
test("the Frostfell's cliffs: terraces all the way into the rock, not stopping at the fields' reach", () => {
  const T = topo('frozen'), L = BIOMES.frozen, SNOW = L.terrain.snow >>> 0;
  for (const cy of [-40, -3, 0, 9, 31]) {
    for (const cx of [Math.floor((T.lo(cy * 256) - 400) / 256), Math.floor((T.hi(cy * 256) + 400) / 256)]) {
      const px = new Uint32Array(256 * 256);
      paintTerrain(T.terrain(cx, cy), px, null, L, T);
      let n = 0;
      for (let y = 0; y < 256; y += 16) for (let x = 1; x < 256; x++) if (px[y * 256 + x] === SNOW && px[y * 256 + x - 1] !== SNOW) n++;
      assert.ok(n / 16 >= 8, `chunk ${cx},${cy}, deep in the rock: ${(n / 16).toFixed(1)} snow-lit steps a row`);
    }
  }
});

// ---- 8. The Abyss ----------------------------------------------------------------------------------
// Fault plates since 29 October 2026 (topology/plates.js). The owner's that day: "the land patches look
// kinda shitty. They are a bit too big ... the patches of land should have a better algorithm that makes
// it look just better than what we have now because the patches rn look silly." Jagged plates split by
// rivers of fire, about half the old islands' size, every patch with ways out.
const VIEW = 600 * 337; // the view in world px (engine/view.js at 1920 x 1080)
// The lattice of the (2k x 2k) chunks round the start, `open` (land and decks) and `deck`, as one field.
function boxField(T, k) {
  const N = 2 * k * 64 + 1, open = new Float32Array(N * N), deck = new Float32Array(N * N);
  for (let cy = -k; cy < k; cy++) {
    for (let cx = -k; cx < k; cx++) {
      const t = T.terrain(cx, cy);
      for (let j = 0; j < 65; j++) {
        for (let i = 0; i < 65; i++) {
          const c = j * 65 + i, at = ((cy + k) * 64 + j) * N + (cx + k) * 64 + i;
          open[at] = t.open ? t.open[c] : TMAX;
          deck[at] = t.deck ? t.deck[c] : -TMAX;
        }
      }
    }
  }
  return { N, x0: -k * 256, open, deck };
}
// The lattice points (4 ways) reached from point c0 through those where ok(c).
function floodFrom(N, c0, ok) {
  const seen = new Uint8Array(N * N), q = [c0];
  seen[c0] = 1;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], i = c % N;
    for (const d of [i > 0 ? c - 1 : -1, i < N - 1 ? c + 1 : -1, c - N, c + N]) {
      if (d >= 0 && d < N * N && !seen[d] && ok(d)) {
        seen[d] = 1;
        q.push(d);
      }
    }
  }
  return seen;
}
// The nodes (a mass's land, topology/plates.js) whose plates' sites lie within r of the start.
function nodesNear(T, r) {
  const out = new Map();
  for (const S of T.sitesIn(-r, -r, r, r)) {
    const N = T.node(S.id);
    out.set(N.id, N);
  }
  return [...out.values()];
}

test('the Abyss: fault plates, every patch of land walked to from the start, every node a way home and two ways out', () => {
  const T = topo('hell');
  assert.equal(T.kind, 'plates');
  const F = boxField(T, 8), { N, open } = F, s = T.start();
  const seen = floodFrom(N, Math.round((s.y - F.x0) / 4) * N + Math.round((s.x - F.x0) / 4), (c) => open[c] >= 5);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = F.x0 + i * 4, y = F.x0 + j * 4, c = j * N + i;
      if (Math.abs(x) <= 1024 && Math.abs(y) <= 1024 && open[c] >= 8) assert.ok(seen[c], `the land at ${x},${y} (${open[c].toFixed(1)} px from its edge) is walked to from the start`);
    }
  }
  const root = T.sitesOf(0, 0)[0].id;
  for (const Nd of nodesNear(T, 2000)) {
    if (Nd.set.has(root)) continue;
    const c = T.crossingsOf(Nd);
    assert.ok(c.length >= 1, `node ${Nd.id}: a way home`);
    assert.ok(c[0].M.ad < Nd.ad, `node ${Nd.id}: its way home leads to an anchor nearer the start (${c[0].M.ad.toFixed(0)} against ${Nd.ad.toFixed(0)})`);
    // No pocket under a horde: a node of a third of a view or more has two ways out at least.
    if (Nd.area > VIEW / 3) assert.ok(T.waysOut(Nd) >= 2, `node ${Nd.id} (${(Nd.area / VIEW).toFixed(2)} view): ${T.waysOut(Nd)} ways out`);
  }
});

test('the Abyss: patches about a view, two thirds land, walkways at every angle, no thin blocking lava', () => {
  const T = topo('hell'), F = boxField(T, 10), { N, open, deck } = F;
  // The land without its decks, in masses (4-way connected), over a 5,120 px square.
  const land = (c) => open[c] > 0 && deck[c] <= 0, lab = new Int32Array(N * N).fill(-1), areas = [];
  let n = 0;
  for (let c = 0; c < N * N; c++) {
    if (!land(c)) continue;
    n++;
    if (lab[c] >= 0) continue;
    const q = [c];
    lab[c] = areas.length;
    for (let h = 0; h < q.length; h++) {
      const d = q[h], i = d % N;
      for (const e of [i > 0 ? d - 1 : -1, i < N - 1 ? d + 1 : -1, d - N, d + N]) {
        if (e >= 0 && e < N * N && lab[e] < 0 && land(e)) {
          lab[e] = areas.length;
          q.push(e);
        }
      }
    }
    areas.push(q.length * 16);
  }
  const share = n / (N * N);
  assert.ok(share >= 0.55 && share <= 0.75, `land share ${share.toFixed(3)}`);
  // The mass a land point stands on, the median by area (fords join two masses into one here, so it
  // runs a little above the masses' own: 1.19 view at the port, 29 October 2026; the islands' 1.2-3.5).
  const sorted = [...areas].sort((a, b) => a - b), total = sorted.reduce((a, b) => a + b, 0);
  let acc = 0, med = 0;
  for (const a of sorted) {
    acc += a;
    if (acc >= total / 2) {
      med = a;
      break;
    }
  }
  assert.ok(med / VIEW >= 0.4 && med / VIEW <= 1.5, `the mass under a land point: ${(med / VIEW).toFixed(2)} view`);
  // No lattice: the walkways run every way, not mostly along the axes.
  const decks = T.decksNear(-2560, -2560, 2560, 2560);
  let ax = 0;
  for (const B of decks) {
    const a = Math.abs(deg(Math.atan2(B.y2 - B.y1, B.x2 - B.x1))) % 90;
    if (Math.min(a, 90 - a) < 12) ax++;
  }
  assert.ok(decks.length > 50 && ax / decks.length < 0.45, `${ax} of ${decks.length} walkways within 12° of an axis`);
  for (const B of decks) assert.ok(['stone', 'rock', 'iron', 'bone'].includes(B.material), `walkway ${B.key}: ${B.material}`);
  // No river between masses under 32 px across but within 40 px of its tip at a vertex.
  for (const g of T.near(-2000, -2000, 2000, 2000, 0).geoms) {
    if (g.e.land) continue;
    for (let i = 0; i < g.xs.length; i++) {
      const h = g.hw[i];
      if (h > 0.6 && h < 15.5) assert.ok(Math.min(g.s[i], g.L - g.s[i]) <= 40, `river ${g.key}: ${(2 * h).toFixed(1)} px across at ${g.xs[i].toFixed(0)},${g.ys[i].toFixed(0)}`);
    }
  }
});

test("the Abyss's crypts stand on the plates, the nearest a minute's walk from the start; its gaps lava or void by the run", () => {
  const T = topo('hell');
  const near = T.cryptsNear(0, 0, 3000).filter((c) => c.key !== '0,0').map((c) => Math.hypot(c.x, c.y)).sort((a, b) => a - b);
  assert.ok(near[0] >= 900 && near[0] <= 1400, `the nearest crypt ${near[0].toFixed(0)} px from the start`);
  const keys = new Set();
  for (const c of T.cryptsNear(0, 0, 9000)) {
    assert.equal(c.face, 'island');
    const [a, b] = c.key.split(',').map(Number);
    assert.ok(Number.isInteger(a) && Number.isInteger(b) && !keys.has(c.key), `crypt ${c.key}: two integers, its own (game.js cryptName)`);
    keys.add(c.key);
    assert.ok(T.openAt(c.x, c.y + 12) >= 10, `crypt ${c.key}: land before its steps`);
    assert.ok(T.openAt(c.x, c.y - 21) >= 5 && T.openAt(c.x - 15, c.y - 12) >= 5 && T.openAt(c.x + 15, c.y - 12) >= 5, `crypt ${c.key}: its walls on land`);
  }
  for (const p of T.startPlace().props) assert.ok(T.openAt(p.x, p.y) >= 20, `the start's ${p.n} on land`);
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
  const f = (x) => (x ? Array.from(x).join(',') : 'none');
  for (const [cx, cy] of [[0, 0], [-3, 2], [4, -1], [6, 6]]) {
    const p = a.terrain(cx, cy), q = b.terrain(cx, cy);
    assert.equal(f(p.open) + f(p.deck), f(q.open) + f(q.deck), `chunk ${cx},${cy} the same over lava and void`);
  }
  assert.deepEqual(a.cryptsNear(0, 0, 4000), b.cryptsNear(0, 0, 4000));
});

// ---- 9. The Forest over a topology -------------------------------------------------------------------
// The Abyss's marks round the hero's start: the nearest lava (20 px in or more) of 16 ways out within
// 700 px, and the nearest walkway.
function abyssMarks(T) {
  const s = T.start();
  let gap = null;
  for (let r = 40; r < 700 && !gap; r += 8) {
    for (let k = 0; k < 16 && !gap; k++) {
      const a = (k * Math.PI) / 8, x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
      if (T.openAt(x, y) <= -20) gap = { x, y, a, r };
    }
  }
  const mid = (B) => Math.hypot((B.x1 + B.x2) / 2 - s.x, (B.y1 + B.y2) / 2 - s.y);
  const deck = T.decksNear(s.x - 1500, s.y - 1500, s.x + 1500, s.y + 1500).sort((p, q) => mid(p) - mid(q))[0];
  return { s, gap, deck };
}

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
  assert.equal(frozen.world.surfaceAt(-500, 0), SURFACE.WALL, 'the left cliff');
  const hell = night('hell'), H = hell.world.topo, M = abyssMarks(H);
  assert.equal(H.kind, 'plates');
  assert.equal(hell.world.surfaceAt(M.gap.x, M.gap.y), SURFACE.GAP, 'the lava nearest the start');
  const mid = [(M.deck.x1 + M.deck.x2) / 2, (M.deck.y1 + M.deck.y2) / 2];
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

  // The Abyss (fault plates, 29 October 2026): from the start straight at the nearest lava and on.
  const hell = night('hell'), H = hell.world, hp = hell.player, M = abyssMarks(H.topo), I = M.s;
  hell.crypts.length = 0;
  const far = [I.x + Math.cos(M.gap.a) * (M.gap.r + 300), I.y + Math.sin(M.gap.a) * (M.gap.r + 300)];
  clearTrunks(hell, I.x, I.y, far[0], far[1]);
  hp.x = I.x;
  hp.y = I.y;
  walk(hell, hp, far[0], far[1], 12);
  assert.ok(H.openAt(hp.x, hp.y) >= 4.5 && H.surfaceAt(hp.x, hp.y) !== SURFACE.GAP, `held at the coast (${H.openAt(hp.x, hp.y).toFixed(1)} px from it)`);
  assert.equal(H.open(M.gap.x, M.gap.y, hp.r), false, 'no leap lands over the gap');
  // A walkway, end to end.
  const B = M.deck, len = Math.hypot(B.x2 - B.x1, B.y2 - B.y1), ux = (B.x2 - B.x1) / len, uy = (B.y2 - B.y1) / len;
  const a = [B.x1 - ux * 8, B.y1 - uy * 8], b = [B.x2 + ux * 8, B.y2 + uy * 8];
  clearTrunks(hell, a[0], a[1], b[0], b[1]);
  hp.x = a[0];
  hp.y = a[1];
  for (let d = 0; d <= len + 16; d += 4) walk(hell, hp, a[0] + ux * d, a[1] + uy * d, 0.5);
  assert.ok(Math.hypot(hp.x - b[0], hp.y - b[1]) < 6, `across walkway ${B.key} (${B.material})`);
  // The thief is held at a gap as the hero is; a ghoul walks over it.
  const gap = [M.gap.x, M.gap.y];
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
  const hell = night('hell'), H = hell.world, M = abyssMarks(H.topo), I = M.s;
  const pk = hell.addPickup('gem', M.gap.x, M.gap.y, 1);
  assert.ok(H.free(pk.x, pk.y), 'the gem on land');
  assert.ok(Math.hypot(pk.x - M.gap.x, pk.y - M.gap.y) <= 400, 'near where it fell');
  // Where nothing is found round it, what fell is carried to the nearest node's dry heart (plates.js home).
  const seek = H.seek;
  H.seek = () => null;
  try {
    assert.deepEqual(H.floorNear(M.gap.x, M.gap.y), H.topo.home(M.gap.x, M.gap.y));
  } finally {
    H.seek = seek;
  }
  const home = H.topo.home(M.gap.x, M.gap.y);
  assert.ok(H.topo.openAt(home.x, home.y) >= 20, 'home is dry land');
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
  for (const n of ['ice_rock1', 'ice_rock2', 'ice_rock3', 'sand_reeds', 'sand_ribcage', 'sand_skull', 'hell_post_wood', 'hell_post_bone', 'hell_post_stone', 'hell_post_iron']) names.add(n);
  D.setWorld({ seed: 1 });
  for (const n of names) assert.ok(SPR[n], `${n} is drawn or stands in`);
  // The crypt's 26 x 29 art, 28 x 31 as built (the 1 px ink outline round it): as SPR.crypt.
  for (const n of ['crypt_cave', 'crypt_igloo']) {
    assert.equal(SPR[n].w, SPR.crypt.w, `${n}: the crypt's width`);
    assert.equal(SPR[n].h, SPR.crypt.h, `${n}: the crypt's height`);
    assert.equal(SPR[n].frames.length, 2, `${n}: open and sealed`);
  }
});
