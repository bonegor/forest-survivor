// The Bloomvale's Fae Thread (game/fae-thread.js, game/fae.js, enemies.js lullT; 29 October 2026). The
// owner's (28 October 2026): "Meadow, IDK what to do with meadow, you guys figure out something, have
// some good game design idea how to make meadow not be identical to forest." As the hero walks through
// the crop fields he trails a silver thread; walk a circle and cross it, and the fae sow it: every foe of
// the horde inside falls asleep for 2 s (no step, no bite, no shot, no charge; blows still land), the
// gems inside fly to him, and the thread rests 8 s. 96 px off the flowers in a row snaps it; a lane
// crossed forgives. Nothing of it holds, pushes or hurts the hero, the thief never sleeps, and the
// Darkwood has none of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const F = await mod('public/js/game/fae-thread.js');
const { THREAD, Thread, area, inside, simplify, segCross, rasterCircle, strawPalette } = F;
const { Game } = await mod('public/js/game/game.js');
const { BIOMES } = await mod('public/js/game/biomes.js');
const { laneY } = await mod('public/js/game/topology/quilt.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// A night on a map (the Darkwood's without one): an unkillable hero, unarmed, with no spawner, so only
// what a test puts there is there. `mortal` keeps him mortal.
function game(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed ?? 7);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false, headless: true, map: 'map' in o ? o.map : 'meadow' });
    g.spawner.update = () => {};
    g.player.devGod = !o.mortal;
    g.player.weapons.length = 0;
    g.time = o.time ?? 30;
    g.syncCam();
    return fn(g, g.player, g.world.court);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// One frame of the hero at (x, y), as Game.update runs it: the frame counted, the grid rebuilt round him
// and the court's update.
function stepTo(g, x, y, dt = 1 / 60) {
  const p = g.player;
  p.x = x;
  p.y = y;
  g.frame++;
  g.grid.rebuild(g.enemies, p.x, p.y);
  g.world.court.update(dt);
}
// Walked through the corners at `sp` px a frame (about the hero's 113 px/s on Veteran at 60 fps).
function walk(g, pts, sp = 2) {
  for (let s = 1; s < pts.length; s++) {
    const [ax, ay] = pts[s - 1], [bx, by] = pts[s], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / sp));
    for (let k = 1; k <= n; k++) stepTo(g, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
  }
}
// A square of side s from (x, y), its fourth side crossing its first 20 px past the corner.
const square = (x, y, s) => [
  [x - 20, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
  [x, y - 20],
];
// The start field's 140 px square (the cornflower plot, clear of the crypt's apron) and a point in it.
const SQ = square(0, 20, 140), IN = [70, 90], OUT = [300, 90];

// The pure walk the court does (update), on a Thread alone: a point every THREAD.step px, the newest
// qualifying crossing closing the loop, simplified as the game does. Its loop's area, or null.
function pureWalk(pts, sp = 2) {
  const th = new Thread(), LOOP = new Float32Array(2 * (THREAD.points + 2)), POLY = new Float32Array(2 * THREAD.verts);
  let [lx, ly] = pts[0], dist = 0;
  th.add(lx, ly, 0);
  for (let s = 1; s < pts.length; s++) {
    const [ax, ay] = pts[s - 1], [bx, by] = pts[s], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / sp));
    for (let k = 1; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n;
      dist += Math.hypot(x - lx, y - ly);
      const i = th.cross(lx, ly, x, y, dist, THREAD.gap);
      if (i >= 0) {
        const m = simplify(LOOP, th.loop(i, th.ix, th.iy, lx, ly, LOOP), THREAD.verts, POLY);
        return { area: area(POLY, m), m, th };
      }
      const j = th.n - 1;
      if ((x - th.x(j)) ** 2 + (y - th.y(j)) ** 2 >= THREAD.step ** 2) th.add(x, y, dist);
      lx = x;
      ly = y;
    }
  }
  return { area: null, th };
}

test('the thread keeps its last 150 points, one every 6 px', () => {
  const th = new Thread();
  for (let i = 0; i < 400; i++) th.add(i * 6, 0, i * 6);
  assert.equal(th.n, THREAD.points);
  assert.equal(th.x(0), (400 - THREAD.points) * 6, 'the oldest kept');
  assert.equal(th.x(th.n - 1), 399 * 6, 'the newest');
  assert.equal(th.span, (THREAD.points - 1) * 6);
  th.clear();
  assert.equal(th.n, 0);
});

test('a 120 px square closes on its fourth side, its loop within 5% of 14,400 px²', () => {
  const r = pureWalk(square(0, 0, 120));
  assert.ok(r.area !== null, 'closed');
  assert.ok(Math.abs(r.area - 14400) / 14400 < 0.05, `area ${r.area}`);
  assert.ok(r.m <= THREAD.verts);
  // A loop under 4,000 px² is found too, but sows nothing (the court's minArea): a 50 px square is 2,500.
  const small = pureWalk(square(0, 0, 50));
  assert.ok(small.area === null || small.area < THREAD.minArea, `a 50 px square: ${small.area}`);
});

test('a straight line, a zigzag and a reversal along the same line never close', () => {
  assert.equal(pureWalk([[0, 0], [800, 0]]).area, null, 'a straight line');
  const zz = [];
  for (let i = 0; i < 30; i++) zz.push([i * 30, i % 2 ? 40 : 0]);
  assert.equal(pureWalk(zz).area, null, 'a zigzag');
  assert.equal(pureWalk([[0, 0], [300, 0], [0, 0], [300, 0]]).area, null, 'back and forth along one line');
  // Collinear overlap is no crossing; a step through a point of the thread is one.
  assert.equal(segCross(0, 0, 10, 0, 5, 0, 20, 0, null), false);
  assert.equal(segCross(5, -5, 5, 5, 0, 0, 10, 0, null), true);
});

test('inside is right on a square and on a concave U', () => {
  const sq = Float32Array.of(0, 0, 100, 0, 100, 100, 0, 100);
  assert.ok(inside(sq, 4, 50, 50) && inside(sq, 4, 1, 99));
  assert.ok(!inside(sq, 4, -1, 50) && !inside(sq, 4, 50, 101));
  const U = Float32Array.of(0, 0, 30, 0, 30, 60, 60, 60, 60, 0, 90, 0, 90, 90, 0, 90);
  assert.ok(inside(U, 8, 15, 30), 'in the left arm');
  assert.ok(inside(U, 8, 75, 30), 'in the right arm');
  assert.ok(inside(U, 8, 45, 75), 'in the base');
  assert.ok(!inside(U, 8, 45, 30), 'not in the notch');
});

test('simplify keeps at most 48 vertices and the area within 5%', () => {
  for (const n of [49, 100, 152]) {
    const poly = new Float32Array(2 * n), out = new Float32Array(2 * THREAD.verts);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, r = 100 + 10 * Math.sin(a * 5);
      poly[2 * i] = r * Math.cos(a);
      poly[2 * i + 1] = r * Math.sin(a);
    }
    const m = simplify(poly, n, THREAD.verts, out);
    assert.ok(m <= THREAD.verts, `${n}: ${m}`);
    assert.deepEqual([out[0], out[1]], [poly[0], poly[1]], 'the crossing kept');
    assert.ok(Math.abs(area(out, m) / area(poly, n) - 1) < 0.05);
  }
});

test('rasterCircle writes only inside the polygon and only on the bloom, the same each time', () => {
  const Pal = strawPalette(BIOMES.meadow.terrain);
  // A chunk whose west half is a lane (bloom -5) and east half flowers (bloom 10).
  const bloom = new Float32Array(65 * 65).fill(10);
  for (let j = 0; j < 65; j++) for (let i = 0; i < 32; i++) bloom[j * 65 + i] = -5;
  const tc = { x0: 0, y0: 0, bloom };
  const poly = new Float32Array(80);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2, r = 70 + 4 * Math.sin(a * 3);
    poly[2 * i] = 128 + r * Math.cos(a);
    poly[2 * i + 1] = 128 + r * Math.sin(a);
  }
  const a = new Uint32Array(256 * 256), b = new Uint32Array(256 * 256);
  const n = rasterCircle(poly, 40, 128, 128, 0, 0, 256, 256, tc, Pal, a);
  rasterCircle(poly, 40, 128, 128, 0, 0, 256, 256, tc, Pal, b);
  assert.ok(n > 5000, `${n} pixels pressed`);
  assert.deepEqual(a, b, 'deterministic');
  const allowed = new Set([...Pal.straw, Pal.strawRim].map((c) => c >>> 0));
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const v = a[y * 256 + x];
      if (!v) continue;
      assert.ok(inside(poly, 40, x + 0.5, y + 0.5), `inside at ${x},${y}`);
      assert.ok(x + 0.5 > 125.33, `on the bloom at ${x},${y}`);
      assert.ok(allowed.has(v), `straw at ${x},${y}`);
    }
  }
});

test('a sowing lulls the horde inside, and no one else', () => {
  game((g, p, court) => {
    assert.ok(court, 'the Bloomvale has a court');
    assert.equal(g.world.topo.kind, 'quilt');
    const foe = g.spawnEnemy('skeleton', ...IN, { instant: true });
    foe.lockT = 0.5;
    foe.state = 'wind';
    const bat = g.spawnEnemy('bat', IN[0] + 20, IN[1], { instant: true });
    const out = g.spawnEnemy('skeleton', ...OUT, { instant: true });
    const others = {
      boss: g.spawnEnemy('boneking', IN[0] - 30, IN[1] + 20, { instant: true, always: true }),
      lord: g.spawnEnemy('skeleton', IN[0] - 20, IN[1] - 20, { instant: true, lord: true }),
      champion: g.spawnEnemy('skeleton', IN[0] + 30, IN[1] + 30, { instant: true, elite: true }),
      thief: g.spawnEnemy('thief', IN[0], IN[1] + 30, { instant: true }),
      rising: g.spawnEnemy('skeleton', IN[0] + 10, IN[1] - 30),
    };
    walk(g, SQ);
    assert.equal(foe.lullT, THREAD.lull, 'a skeleton inside sleeps 2 s');
    assert.equal(foe.lockT, 0, 'what it was locked on is dropped');
    assert.equal(foe.state, 'move', 'and its wind-up');
    assert.equal(bat.lullT, THREAD.lull, 'fliers sleep too');
    assert.equal(out.lullT, 0, 'one outside does not');
    for (const [who, e] of Object.entries(others)) assert.equal(e.lullT, 0, `no ${who}`);
    assert.equal(court.thread.n, 0, 'the thread is spent');
    assert.ok(court.restT > 0, 'and rests');
    assert.equal(court.circles.length, 1, 'the circle is kept');
  });
});

test('a sleeper neither steps, shoots, charges nor bites, a blow does not wake it, and at 2 s it walks', () => {
  game((g, p) => {
    const e = g.spawnEnemy('skeleton', ...IN, { instant: true });
    const witch = g.spawnEnemy('thornwitch', IN[0] - 30, IN[1], { instant: true });
    const boar = g.spawnEnemy('boar', IN[0] + 30, IN[1] + 20, { instant: true });
    boar.state = 'wind';
    boar.stateT = 0.05;
    walk(g, SQ);
    assert.equal(e.lullT, THREAD.lull);
    assert.equal(boar.state, 'move', "the boar's wind-up dropped");
    p.x = IN[0] + 60;
    p.y = IN[1];
    witch.cdT = 0;
    const at = [e.x, e.y];
    for (let i = 0; i < 114; i++) for (const f of [e, witch, boar]) f.update(1 / 60); // 1.9 s
    assert.deepEqual([e.x, e.y], at, 'a sleeper does not move');
    assert.equal(g.eshots.length, 0, 'a Thorn Witch asleep fires nothing');
    assert.notEqual(boar.state, 'dash', 'a boar asleep neither dashes');
    e.draw(document.createElement('canvas').getContext('2d'), g.cam);
    assert.equal(e._look, 6, 'charmed pink, ringed in pink by night');
    g.hitEnemy(e, 1, { kb: 0 });
    assert.ok(e.lullT > 0, 'a blow does not wake it');
    for (let i = 0; i < 12; i++) e.update(1 / 60); // past 2.0 s
    assert.ok(e.lullT <= 0);
    e.update(1 / 60);
    assert.ok(e.x !== at[0] || e.y !== at[1], 'at 2.0 s it walks again');
  });
  game(
    (g, p) => {
      const e = g.spawnEnemy('skeleton', ...IN, { instant: true });
      walk(g, SQ);
      assert.equal(e.lullT, THREAD.lull);
      p.x = e.x;
      p.y = e.y;
      const hp = p.hp;
      for (let i = 0; i < 60; i++) e.update(1 / 60);
      assert.equal(p.hp, hp, 'the hero standing on a sleeper loses no health');
    },
    { mortal: true },
  );
});

test('a sowing gathers the gems inside, never box loot, never what is outside', () => {
  game((g) => {
    const gem = g.addPickup('gem', IN[0], IN[1], 1, { pop: false });
    const box = g.addPickup('gem', IN[0] + 20, IN[1], 1, { pop: false, box: true });
    const far = g.addPickup('gem', ...OUT, 1, { pop: false });
    walk(g, SQ);
    assert.equal(gem.pulled, true, 'a gem inside flies to him');
    assert.equal(gem.speed, -60, 'with the magnet hop');
    assert.equal(box.pulled, false, "a box's loot waits");
    assert.equal(far.pulled, false, 'a gem outside stays');
  });
});

test('after a sowing the thread rests 8 s, then comes again', () => {
  game((g, p, court) => {
    walk(g, SQ);
    assert.equal(court.circles.length, 1);
    const e = g.spawnEnemy('skeleton', ...IN, { instant: true });
    walk(g, square(0, 20, 140)); // about 5 s
    assert.equal(court.circles.length, 1, 'a second square in the rest sows nothing');
    assert.equal(e.lullT, 0);
    assert.equal(court.thread.n, 0, 'and spins nothing');
    // Standing out the rest (8.1 s in all), then walking.
    for (let i = 0; i < 8.1 * 60 && court.restT > 0; i++) stepTo(g, p.x, p.y);
    assert.ok(court.restT <= 0);
    walk(g, [[p.x, p.y], [p.x + 40, p.y]]);
    assert.ok(court.thread.n > 0, 'points come again');
  });
});

test('the thread snaps: 100 px along a lane, a teleport, a skipped frame; a lane crossed forgives', () => {
  game((g, p, court) => {
    const topo = g.world.topo, l = topo.ew(0);
    // Built up in the start field, then along lane 0's middle.
    walk(g, [[40, 100], [40, -80]]);
    assert.ok(court.thread.n > 10);
    const ly = (x) => laneY(l, x);
    assert.ok(topo.bloomAt(40, ly(40)) <= 0, 'the lane is no bloom');
    walk(g, [[40, -80], [40, ly(40)]]);
    const pts = [];
    for (let x = 40; x <= 140; x += 10) pts.push([x, ly(x)]);
    walk(g, pts);
    assert.equal(court.thread.n, 0, '100 px along a lane clears it');
  });
  game((g, p, court) => {
    const topo = g.world.topo;
    assert.ok(topo.bloomAt(60, -40) > 0 && topo.bloomAt(-40, -140) > 0, 'flowers both sides');
    walk(g, [[60, 60], [60, -40]]);
    const n = court.thread.n;
    walk(g, [[60, -40], [-40, -140]]); // across lane 0 at 45°
    assert.ok(court.thread.n > n, 'crossing a lane at 45° does not snap it');
  });
  game((g, p, court) => {
    walk(g, [[40, 100], [40, 0]]);
    assert.ok(court.thread.n > 0);
    stepTo(g, 40 + THREAD.jump + 40, 0);
    assert.equal(court.thread.n, 0, 'a step over 160 px clears it');
  });
  game((g, p, court) => {
    walk(g, [[40, 100], [40, 0]]);
    assert.ok(court.thread.n > 0);
    g.frame += 5; // the forest set aside (a crypt)
    stepTo(g, 40, -2);
    assert.equal(court.thread.n, 0, 'a skipped frame clears it');
  });
});

test('when: nothing after 14:00, nothing standing, and each banner once', () => {
  game(
    (g, p, court) => {
      walk(g, [[40, 100], [40, 0]]);
      assert.equal(court.thread.n, 0, 'nothing is spun at 14:01');
    },
    { time: 841 },
  );
  game((g, p, court) => {
    walk(g, [[40, 100], [40, 60]]);
    const n = court.thread.n;
    for (let i = 0; i < 60; i++) stepTo(g, 40, 60);
    assert.equal(court.thread.n, n, 'a standing hero adds no point');
  });
  game((g, p, court) => {
    const said = [];
    const banner = g.banner.bind(g);
    g.banner = (title, ...rest) => {
      said.push(title);
      return banner(title, ...rest);
    };
    walk(g, [[40, 160], [40, 100]]);
    assert.equal(said.length, 0, 'not before 300 px of thread');
    walk(g, SQ);
    for (let i = 0; i < 8.1 * 60 && court.restT > 0; i++) stepTo(g, p.x, p.y);
    walk(g, SQ);
    assert.equal(said.filter((s) => s === 'The Fae Thread').length, 1);
    assert.equal(said.filter((s) => s === 'Fae-sown').length, 1);
    assert.equal(court.circles.length, 2, 'two sowings');
  });
});

test('the Darkwood has none of it', () => {
  assert.equal(BIOMES.forest.fae, undefined);
  assert.equal(BIOMES.meadow.fae, THREAD);
  assert.equal(BIOMES.meadow.clearAt, undefined);
  game(
    (g) => {
      assert.equal(g.world.court, null);
      assert.equal(g.world.topo, null);
      for (const k of ['drawGlow', 'marker', 'drawGroundProps']) assert.ok(!Object.hasOwn(g.world, k), `no ${k} of its own`);
    },
    { map: null },
  );
});
