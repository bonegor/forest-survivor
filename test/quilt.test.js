// The Bloomvale's quilt (game/topology/quilt.js, 29 October 2026): the fae's flower farm, the owner's
// "bright flower, colorful map" of 28 October 2026. An endless patchwork of single-colour flower fields
// between farm lanes, the same in any order and without seams, its start a pressed straw disc in a
// cornflower field, its shrines at the lanes' T junctions with the crypts beside them, its landmarks
// in hay fields, every tree its own, and nothing in it that holds, slows or hurts anyone.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import * as D from '../public/js/game/darkwood.js';
import { BIOMES, biomeProp } from '../public/js/game/biomes.js';
import { MAPS } from '../public/js/data/maps.js';
import { SPR } from '../public/js/engine/sprites.js';
import { Game } from '../public/js/game/game.js';
import { makeTopology, SURFACE, TN } from '../public/js/game/topology/index.js';
import { laneY, laneX, cutDist } from '../public/js/game/topology/quilt.js';
import { paintQuilt } from '../public/js/game/topology/paint-quilt.js';
import { sampleField } from '../public/js/game/topology/terrain.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { hexPack } from '../public/js/engine/pixels.js';
import { metaBonuses, defaultProfile } from '../public/js/shared/profile.js';

const LOOK = BIOMES.meadow, SEED = MAPS.meadow.seed;
const topo = () => makeTopology(LOOK, SEED, 7);
const meta = metaBonuses(defaultProfile());
function night(map) {
  const old = Math.random;
  Math.random = mulberry32(5);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta, settings: { numbers: false }, headless: true, map });
    g.snapCam();
    return g;
  } finally {
    Math.random = old;
  }
}
// The look's palette as paint.js hands it on (every colour a signed 32-bit number).
const conv = (v) => (typeof v === 'number' ? (Number.isInteger(v) && v > 0x7fffffff ? v | 0 : v) : Array.isArray(v) ? Int32Array.from(v, (c) => c | 0) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, w]) => [k, conv(w)])) : v);
const PAL = conv(LOOK.terrain);
const fnv = (a) => {
  let h = 2166136261;
  for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619);
  return h >>> 0;
};

// ---- 1. Order and seams ---------------------------------------------------------------------------
test('the quilt comes out the same in any order, and its chunks meet without a seam', () => {
  const r = mulberry32(11), list = [];
  for (let k = 0; k < 60; k++) list.push([r.int(-20, 20), r.int(-20, 20)]);
  const snap = (T, cx, cy) => {
    const tc = T.terrain(cx, cy), ids = [];
    for (let c = 0; c < TN * TN; c++) {
      const p = tc.plots[tc.plot[c]];
      ids.push(`${p.k},${p.m},${p.kind},${p.crop}`);
    }
    const lay = D.layoutChunk(cx, cy, null, LOOK.density, T);
    return { edge: Array.from(tc.edge), bloom: Array.from(tc.bloom), ids: ids.join('|'), props: JSON.stringify(lay.props), crypts: JSON.stringify(lay.crypts) };
  };
  try {
    D.setWorld({ seed: SEED });
    const A = topo(), fwd = list.map(([x, y]) => snap(A, x, y));
    const B = topo(), back = [...list].reverse().map(([x, y]) => snap(B, x, y)).reverse();
    for (let k = 0; k < list.length; k++) assert.deepEqual(back[k], fwd[k], `chunk ${list[k]}: the same made forward or backward`);
  } finally {
    D.setWorld({ seed: 1 });
  }
  const T = topo();
  for (const [cx, cy] of list.slice(0, 20)) {
    const a = T.terrain(cx, cy), b = T.terrain(cx + 1, cy), d = T.terrain(cx, cy + 1);
    for (let j = 0; j < TN; j++) {
      assert.equal(a.edge[j * TN + 64], b.edge[j * TN], `chunk ${cx},${cy}: its east seam`);
      assert.equal(a.bloom[j * TN + 64], b.bloom[j * TN], `chunk ${cx},${cy}: its east seam's bloom`);
      assert.equal(a.edge[64 * TN + j], d.edge[j], `chunk ${cx},${cy}: its south seam`);
      assert.equal(a.bloom[64 * TN + j], d.bloom[j], `chunk ${cx},${cy}: its south seam's bloom`);
    }
  }
});

// ---- 2. Analytic = lattice ------------------------------------------------------------------------
test('edgeAt and bloomAt are the lattice at its points', () => {
  const T = topo();
  for (const [cx, cy] of [[0, 0], [-1, 0], [0, -1], [3, 2], [-5, 7], [9, -4], [-12, -12], [20, 3], [-7, 15], [261, 183]]) {
    const tc = T.terrain(cx, cy);
    for (let c = 0; c < TN * TN; c += 5) {
      const x = tc.x0 + (c % TN) * 4, y = tc.y0 + Math.floor(c / TN) * 4;
      assert.ok(Math.abs(T.edgeAt(x, y) - tc.edge[c]) < 1e-3, `edge at ${x}, ${y}`);
      assert.ok(Math.abs(T.bloomAt(x, y) - tc.bloom[c]) < 1e-3, `bloom at ${x}, ${y}`);
      assert.equal(T.plotAt(x, y), tc.plots[tc.plot[c]], `plot at ${x}, ${y}`);
    }
  }
});

// ---- 3. Lanes -------------------------------------------------------------------------------------
test('the lanes keep their fields wide: 260 px or more between neighbours, never two dropped side by side', () => {
  const T = topo();
  for (let k = -20; k <= 20; k++) {
    const a = T.ew(k), b = T.ew(k + 1);
    for (let x = -60000; x <= 60000; x += 40) assert.ok(laneY(b, x) - laneY(a, x) >= 260, `east-west lanes ${k} and ${k + 1} at x ${x}`);
  }
  for (let k = -10; k <= 10; k++) {
    for (let m = -30; m <= 30; m++) {
      const l = T.ns(k, m);
      assert.ok(!(l.dropped && T.ns(k, m + 1).dropped), `lanes (${k}, ${m}) and (${k}, ${m + 1}) both dropped`);
      if (l.dropped) continue;
      const r = T.rightOf(l);
      for (const y of [(k - 0.5) * T.T.band, k * T.T.band, (k + 0.5) * T.T.band]) assert.ok(laneX(r, y) - laneX(l, y) >= 260, `lanes (${k}, ${m}) and (${k}, ${r.m}) at y ${y}`);
    }
  }
});

// ---- 4. The start ---------------------------------------------------------------------------------
test('the start: a straw disc in the cornflower field, its camp, crypt and moonblooms, three crops in view', () => {
  const T = topo();
  assert.deepEqual(T.start(), { x: 4, y: 18 });
  assert.ok(T.bloomAt(4, 18) > 0, 'the hero starts on the bloom');
  const crop = (x, y) => {
    const p = T.plotAt(x, y);
    assert.equal(p.kind, 'crop', `${x}, ${y}: a crop`);
    return p.crop;
  };
  assert.equal(crop(0, 0), 'cornflower');
  assert.equal(crop(-400, 0), 'pinks');
  assert.equal(crop(400, 0), 'coral');
  assert.equal(crop(0, -300), 'tulips');
  assert.equal(crop(0, 500), 'lavender');
  const F = T.features(-300, -300, 300, 300), P = F.places.find((q) => q.kind === 'start');
  assert.ok(P, 'the start camp');
  for (const n of ['campfire', 'stump', 'lantern', 'menhir']) assert.ok(P.props.some((q) => q.n === n), `the camp's ${n}`);
  assert.deepEqual(P.crypt, { key: '0,0', x: -37, y: -52, depth: 1, face: 'field' });
  const blooms = P.props.filter((q) => q.n.startsWith('moonbloom'));
  assert.ok(blooms.length >= 9 && blooms.length <= 12, `${blooms.length} moonblooms round the disc`);
  for (const b of blooms) assert.ok(Math.abs(Math.hypot(b.x, b.y) - 96) < 1.5, 'each 96 px out');
  assert.ok(blooms.filter((b) => b.light).length >= 3, 'every third one lit');
  // The first screen: 600 x 338 round (4, 8).
  let on = 0, all = 0;
  const seen = new Set();
  for (let y = 8 - 169; y <= 8 + 169; y += 4) {
    for (let x = 4 - 300; x <= 4 + 300; x += 4) {
      all++;
      if (T.bloomAt(x, y) > 0) {
        on++;
        seen.add(T.plotAt(x, y).crop);
      }
    }
  }
  assert.ok(on / all >= 0.6, `${((100 * on) / all).toFixed(1)}% of the first screen in flower`);
  assert.ok(seen.size >= 3, `crops in view: ${[...seen]}`);
  const trees = F.landmarks.filter((L) => L.kind === 'avenue').flatMap((L) => L.props);
  assert.ok(trees.some((q) => Math.hypot(q.x - 4, q.y - 18) < 260), 'an avenue on the first screen');
  assert.ok(F.landmarks.some((L) => L.kind === 'lone' && L.props.some((q) => q.x === -120 && q.y === 140)), 'the lone tree at (-120, 140)');
});

// ---- 5. Shrines and crypts ------------------------------------------------------------------------
test('shrines stand at the lanes\' T junctions, the crypts a step north of theirs', () => {
  const T = topo(), keys = new Set();
  for (let j = -6; j <= 6; j++) {
    for (let i = -6; i <= 6; i++) {
      if ((i + j) & 1 || (!i && !j)) continue;
      const P = T.place(i, j), J = P.junction;
      assert.ok(T.edgeAt(P.x, P.y) < 0, `shrine ${i},${j} in a lane`);
      const ns = T.ns(J.k, J.m), ew = T.ew(J.k);
      assert.ok(!ns.dropped, `shrine ${i},${j}: a live lane`);
      assert.ok(Math.abs(P.x - laneX(ns, P.y)) < ns.hw && Math.abs(P.y - laneY(ew, P.x)) < ew.hw, `shrine ${i},${j} on both lanes`);
      assert.equal(P.type, T.order[(((i + 3 * j) % 5) + 5) % 5]);
      for (const [a, b] of [[i + 1, j + 1], [i - 1, j + 1], [i + 1, j - 1], [i - 1, j - 1]]) if (a || b) assert.notEqual(T.place(a, b).type, P.type, `shrines ${i},${j} and ${a},${b} differ`);
      if (T.isCrypt(i, j)) {
        const c = P.crypt, dy = c.y - P.y;
        assert.ok(dy <= -55 && dy >= -80, `crypt ${c.key} ${dy} px north of its shrine`);
        assert.ok(T.bloomAt(c.x, c.y) <= 0 && T.bloomAt(c.x, c.y + 14) <= 0, `crypt ${c.key}: no flowers at its door or steps`);
        assert.ok(!keys.has(c.key), `crypt ${c.key} once`);
        keys.add(c.key);
      }
    }
  }
  const near = T.cryptsNear(4, 18, 2400);
  assert.ok(near.some((c) => c.key === '0,0'), "the start's crypt");
  assert.equal(new Set(near.map((c) => c.key)).size, near.length, 'every key once');
});

// ---- 6. Landmarks ---------------------------------------------------------------------------------
test('landmarks stand in the middle of hay fields, clear of every cut, and what they hold is drawn', () => {
  const T = topo(), plots = new Set(), names = new Set();
  let n = 0;
  night('meadow'); // the art built
  for (let j = -6; j <= 6; j++) {
    for (let i = -6; i <= 6; i++) {
      const L = T.landmark(i, j);
      if (!L) continue;
      n++;
      const p = T.plotAt(L.x, L.y);
      assert.equal(p.kind, 'hay', `landmark ${i},${j} in hay`);
      assert.equal(p.key, L.plotKey);
      assert.ok(Math.abs(p.x - L.x) < 1e-6 && Math.abs(p.y - L.y) < 1e-6, `landmark ${i},${j} at its field's middle`);
      assert.ok(T.cutAt(L.x, L.y) >= L.clear.r, `landmark ${i},${j}: its clearing meets no cut`);
      assert.ok(Math.hypot(L.x, L.y) > 600, `landmark ${i},${j} away from the start`);
      assert.ok(!plots.has(p.key), `landmark ${i},${j} alone in its field`);
      plots.add(p.key);
      for (const q of L.props) names.add(biomeProp(LOOK, { ...q, src: L.kind })?.n);
    }
  }
  assert.ok(n >= 20, `${n} landmarks`);
  for (const q of T.place(0, 0).props) if (!q.n.startsWith('moonbloom')) names.add(biomeProp(LOOK, { ...q, src: 'start' })?.n);
  for (const n of ['oak1', 'oak2', 'oak3']) names.add(biomeProp(LOOK, { n, x: 0, y: 0, src: 'avenue' }).n);
  names.delete(undefined);
  for (const n of names) assert.ok(SPR[n], `${n} is drawn`);
});

// ---- 7. Shares ------------------------------------------------------------------------------------
test('the ground is mostly flowers: crops, lanes, orchards and hay in their shares', () => {
  const T = topo(), kinds = new Map();
  let all = 0, crop = 0, lane = 0;
  for (let cy = -20; cy < 20; cy++) {
    for (let cx = -20; cx < 20; cx++) {
      const tc = T.terrain(cx, cy);
      for (let c = 0; c < TN * TN; c += 3) {
        const p = tc.plots[tc.plot[c]];
        kinds.set(p.key, p);
        all++;
        if (tc.edge[c] < 0) lane++;
        else if (tc.bloom[c] > 0) crop++;
      }
    }
  }
  assert.ok(crop / all >= 0.62, `${((100 * crop) / all).toFixed(1)}% in flower`);
  assert.ok(lane / all <= 0.08, `${((100 * lane) / all).toFixed(1)}% lanes`);
  const ps = [...kinds.values()], share = (k) => ps.filter((p) => p.kind === k).length / ps.length;
  assert.ok(share('orchard') >= 0.06 && share('orchard') <= 0.14, `orchards ${share('orchard')}`);
  assert.ok(share('hay') >= 0.08 && share('hay') <= 0.16, `hay ${share('hay')}`);
  for (const p of ps) {
    if (p.kind !== 'crop') continue;
    const e = T.plot(p.k, p.m2);
    if (e.kind === 'crop') assert.notEqual(e.crop, p.crop, `fields (${p.k}, ${p.m}) and (${e.k}, ${e.m}) share a crop`);
  }
});

// ---- 8. What stands -------------------------------------------------------------------------------
test('only hay fields hold the scatter; every tree is the quilt\'s, off the lanes, a tree with a trunk', () => {
  const T = topo(), r = mulberry32(21);
  for (let k = 0; k < 4000; k++) {
    const x = (r() - 0.5) * 8000, y = (r() - 0.5) * 8000;
    if (T.canStand(x, y)) assert.ok(T.plotAt(x, y).kind === 'hay' && T.edgeAt(x, y) >= 14, `${x}, ${y}: the scatter only in hay`);
  }
  const hay = [];
  for (let k = -6; k <= 6; k++) T.bandPlots(k, -3000, 3000, (p) => p.kind === 'hay' && !p.lm && hay.push(p));
  assert.ok(hay.some((p) => T.canStand(p.x, p.y)), 'the middle of a hay field holds the scatter');
  const F = T.features(-3000, -3000, 3000, 3000), trees = F.landmarks.filter((L) => ['avenue', 'orchard', 'lone'].includes(L.kind)).flatMap((L) => L.props);
  assert.ok(trees.length > 100);
  for (const q of trees) {
    assert.ok(D.TREE_NAMES.has(q.n), `${q.n} in a tree's slot`);
    assert.ok(T.edgeAt(q.x, q.y) >= 4, `tree at ${q.x}, ${q.y} off the lanes`);
  }
  // Through the game's world: a tree with its trunk (the avenue by the start, at x 191 and 229).
  const g = night('meadow'), c = g.world.chunk(0, 0);
  assert.ok(c.props.some((p) => p.tree && p.trunk > 0 && (p.x === 191 || p.x === 229)), 'an avenue tree by the start stops the hero at its trunk');
  // The Druid: flowers within 48 px of a tree.
  let on = 0, near = 0;
  for (let k = 0; k < 4000; k++) {
    const x = (r() - 0.5) * 5000, y = (r() - 0.5) * 5000;
    if (T.bloomAt(x, y) <= 0) continue;
    on++;
    if (trees.some((q) => (q.x - x) ** 2 + (q.y - y) ** 2 < 48 * 48)) near++;
  }
  assert.ok(near / on >= 0.15, `${((100 * near) / on).toFixed(1)}% of the flowers within 48 px of a tree`);
});

// ---- 9. The world reads open ground ---------------------------------------------------------------
test('nothing in the quilt holds, slows or moves anyone', () => {
  const g = night('meadow'), W = g.world;
  assert.equal(W.topo.kind, 'quilt');
  for (const [x, y] of [[4, 18], [-210, 100], [0, -110], [700, 300], [-1500, 900], [2600, -400]]) {
    assert.ok(W.free(x, y), `${x}, ${y} free`);
    assert.ok(W.open(x, y, 5), `${x}, ${y} open`);
    assert.equal(W.slows(x, y), false);
    assert.deepEqual(W.landSpot(x, y), { x, y });
    const e = { x, y, r: 6 };
    W.holdOut(e);
    assert.deepEqual([e.x, e.y], [x, y], `${x}, ${y}: held nowhere`);
    assert.equal(W.surfaceAt(x, y), SURFACE.GROUND);
  }
});

// ---- 10. Paint ------------------------------------------------------------------------------------
test('the quilt paints every pixel outside the cuts, the same each time, in no pickup\'s colour', () => {
  const T = topo(), pick = ['#feae34', '#e43b44', '#63c74d', '#2ce8f5', '#b55088', '#fee761'].map((h) => hexPack(h) & 0xffffff);
  const C = LOOK.terrain.crops.cornflower, allowed = new Set([...C.bloom, ...C.leaf].map((c) => c >>> 0));
  let flowers = 0;
  for (const [cx, cy] of [[0, 0], [-1, 0], [0, 1], [-1, -1], [5, 3], [-8, 6]]) {
    const tc = T.terrain(cx, cy), a = new Uint32Array(256 * 256), b = new Uint32Array(256 * 256);
    paintQuilt(tc, a, PAL, T);
    paintQuilt(tc, b, PAL, T);
    assert.equal(fnv(a), fnv(b), `chunk ${cx},${cy}: the same twice`);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const wx = tc.x0 + x, wy = tc.y0 + y, k = y * 256 + x;
        if (tc.cuts.some((c) => !c.apron && cutDist(c, wx, wy) < 0)) continue;
        assert.notEqual(a[k], 0, `chunk ${cx},${cy}: pixel ${x}, ${y} painted`);
        assert.ok(!pick.includes(a[k] & 0xffffff), `chunk ${cx},${cy}: pixel ${x}, ${y} in a pickup's colour`);
        if (Math.hypot(wx, wy) < 86) continue; // the start's straw
        const p = T.plotAt(wx, wy);
        if (p.crop === 'cornflower' && sampleField(tc, tc.bloom, wx, wy, -127) >= 1.2) {
          flowers++;
          assert.ok(allowed.has(a[k]), `chunk ${cx},${cy}: pixel ${x}, ${y} a cornflower's colour`);
        }
      }
    }
  }
  assert.ok(flowers > 1000, `${flowers} cornflower pixels checked`);
});
