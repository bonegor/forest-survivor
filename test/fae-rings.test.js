// The Bloomvale's fae court (game/fae-rings.js, game/fae.js, 28 October 2026). The owner's: "Meadow,
// IDK what to do with meadow, you guys figure out something, have some good game design idea how to
// make meadow not be identical to forest." Fae rings, circles of ten moonblooms, stand all over the
// Bloomvale where the land leaves room; each wakes on a clock of its own, stirs for 6 s and dances for
// 12 s (10 s from 8:00, the Unseelie Hour), taking the horde that crosses its line into a wheel round
// it, and when the music stops its dancers break wild, never past the swift class. Nothing of it
// holds, pushes or hurts the hero, nothing stands in a ring's clearing, and the Darkwood has none of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const D = await mod('public/js/game/darkwood.js');
const F = await mod('public/js/game/fae-rings.js');
const { FAE, ringAt, ringsNear, ringPhase, clearAt, ASLEEP, STIR, DANCE } = F;
const { Game } = await mod('public/js/game/game.js');
const { NIGHT_LOOKS } = await mod('public/js/game/enemies.js');
const { BIOMES } = await mod('public/js/game/biomes.js');
const { input } = await mod('public/js/engine/input.js');
const { hash2, mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

const MEADOW_SEED = 4; // data/maps.js meadow seed

// A night on a map (the Darkwood's without one): an unkillable hero standing still, unarmed, with no
// spawner, so only what a test puts there is there. `mortal` keeps him mortal.
function game(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed ?? 7);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false, headless: true, map: o.map });
    if (!o.spawn) g.spawner.update = () => {};
    g.player.devGod = !o.mortal;
    g.player.weapons.length = 0;
    g.syncCam();
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// The ring nearest the hero, and the night's time `into` seconds into its first dance.
function nearestRing(g) {
  const p = g.player;
  return ringsNear(p.x, p.y, FAE.reach).sort((a, b) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2))[0];
}
function danceTime(r, into = 1, from = 0, fierce = false) {
  for (let t = from; t < 900; t += 0.25) {
    ringPhase(r, t);
    if (r.state === DANCE && r.fierce === fierce) return r.ds + into;
  }
  throw new Error('no dance');
}
// Into its dance: the grid rebuilt round the hero (as Game.update does) and the court's frame run.
function takeIn(g, t) {
  g.time = t;
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
  g.world.court.update(0);
}
const angle = (e, r) => Math.atan2(e.y - r.y, e.x - r.x);
const dist = (e, r) => Math.hypot(e.x - r.x, e.y - r.y);

test('the fae rings stand where the land leaves room: off the start, the crossroads, the landmarks, the roads and the footpaths', () => {
  D.setWorld({ seed: MEADOW_SEED });
  const K = FAE.keep, s = D.start(), Dsp = D.DARKWOOD.spacing;
  const near = (p, x, y, r) => {
    for (let k = 0; k < p.xs.length; k++) if ((p.xs[k] - x) ** 2 + (p.ys[k] - y) ** 2 < r * r) return true;
    return false;
  };
  let cells = 0, held = 0;
  const seen = [];
  for (let b = -12; b <= 12; b++) {
    for (let a = -12; a <= 12; a++) {
      cells++;
      const r = ringAt(a, b);
      if (!r) continue;
      held++;
      seen.push([a, b, r.x, r.y, r.ph, r.a0]);
      const where = `ring ${a},${b} at ${Math.round(r.x)},${Math.round(r.y)}`;
      assert.ok(Math.hypot(r.x - s.x, r.y - s.y) >= K.start, `${where}: off the start`);
      // Every crossroads, landmark, road and footpath within two lattice steps, checked point by point.
      const ci = Math.round(r.x / Dsp), cj = Math.round(r.y / Dsp);
      for (let j = cj - 2; j <= cj + 2; j++) {
        for (let i = ci - 3; i <= ci + 2; i++) {
          if (((i + j) & 1) === 0) {
            const n = D.node(i, j);
            assert.ok(Math.hypot(n.x - r.x, n.y - r.y) >= K.node, `${where}: off the crossroads ${i},${j}`);
            for (const sgn of [1, -1]) if (D.roadExists(i, j, sgn)) assert.ok(!near(D.road(i, j, sgn), r.x, r.y, K.road), `${where}: off the road ${i},${j},${sgn}`);
          } else {
            const L = D.landmark(i, j);
            if (!L) continue;
            assert.ok(Math.hypot(L.x - r.x, L.y - r.y) >= K.landmark, `${where}: off the ${L.kind} ${i},${j}`);
            assert.ok(!near(L.path, r.x, r.y, K.footpath), `${where}: off the footpath to the ${L.kind} ${i},${j}`);
          }
        }
      }
      // In its cell's middle, its ten blooms on a true circle round it, clockwise from its first.
      assert.ok(r.x >= (a + 0.2) * FAE.cell - 1e-9 && r.x <= (a + 0.8) * FAE.cell + 1e-9, `${where}: in its cell's middle`);
      assert.equal(r.blooms.length, FAE.blooms);
      for (const bl of r.blooms) assert.ok(Math.abs(Math.hypot(bl.x - r.x, bl.y - r.y) - FAE.bloomR) < 1e-6);
    }
  }
  assert.ok(held / cells >= 0.95, `${held} of ${cells} cells hold a ring`);
  // Made from the world seed alone: another world in between, and back, gives the same rings.
  D.setWorld({ seed: 1 });
  ringAt(0, 0);
  D.setWorld({ seed: MEADOW_SEED });
  const again = [];
  for (let b = -12; b <= 12; b++) for (let a = -12; a <= 12; a++) {
    const r = ringAt(a, b);
    if (r) again.push([a, b, r.x, r.y, r.ph, r.a0]);
  }
  assert.deepEqual(again, seen);
});

test('every spot of the Bloomvale has a fae ring within 800 px', () => {
  D.setWorld({ seed: MEADOW_SEED });
  for (let n = 0; n < 400; n++) {
    const x = (hash2(n, 1, 4242) - 0.5) * 12000, y = (hash2(n, 2, 4242) - 0.5) * 12000;
    const near = ringsNear(x, y, 800);
    assert.ok(near.length > 0, `a ring within 800 px of ${Math.round(x)},${Math.round(y)}`);
  }
});

test("a ring's night: asleep till 1:40, a 6 s stir before each dance, 12 s dances (10 s from 8:00), the quickening last, none after 13:52", () => {
  D.setWorld({ seed: MEADOW_SEED });
  const rings = [];
  for (let b = -8; b <= 8 && rings.length < 200; b++) for (let a = -8; a <= 8 && rings.length < 200; a++) {
    const r = ringAt(a, b);
    if (r) rings.push(r);
  }
  assert.equal(rings.length, 200);
  for (const r of rings) {
    let prev = ASLEEP, stir = null, first = true;
    for (let i = 0; i <= 3600; i++) {
      const t = i * 0.25;
      ringPhase(r, t);
      if (r.state === STIR && prev !== STIR) stir = t;
      if (r.state === DANCE && prev !== DANCE) {
        assert.ok(r.ds >= FAE.first && r.ds <= FAE.last, `a dance begins in [100, 820]: ${r.ds}`);
        if (first) assert.ok(r.ds >= 100 && r.ds < 160, `each ring's first dance begins in [100, 160): ${r.ds}`);
        first = false;
        assert.ok(stir !== null && Math.abs(r.ds - FAE.seelie.stir - stir) <= 0.25, `6 s of stirring before the dance at ${r.ds}`);
        // Its cycle began a sleep and a stir before; its court is that start's.
        const start = r.ds - (r.fierce ? FAE.unseelie.sleep + FAE.unseelie.stir : FAE.seelie.sleep + FAE.seelie.stir);
        assert.equal(r.fierce, start >= FAE.unseelie.at, `the court of a cycle that starts at ${start}`);
        assert.equal(r.end - r.ds, start >= FAE.unseelie.at ? 10 : 12, `the dance from ${r.ds}`);
      }
      if (r.state === DANCE) assert.equal(r.quick, t >= r.end - 3, `the quickening only in the dance's last 3 s (${t})`);
      else assert.equal(r.quick, false);
      if (t > 832) assert.equal(r.state, ASLEEP, `nothing stirs or dances after 13:52 (${t})`);
      prev = r.state;
    }
  }
  // A cycle that starts just before 8:00 (its phase puts a cycle's start at 479) is Seelie, and
  // dances its 12 s; one that starts at 8:00 is Unseelie, 10 s.
  const c479 = { ph: (60 - (479 % 60)) % 60 };
  ringPhase(c479, 479 + 48 + 1);
  assert.equal(c479.state, DANCE);
  assert.equal(c479.fierce, false);
  assert.equal(c479.end - c479.ds, 12);
  const c480 = { ph: (60 - (480 % 60)) % 60 };
  ringPhase(c480, 480 + 50 + 1);
  assert.equal(c480.state, DANCE);
  assert.equal(c480.fierce, true);
  assert.equal(c480.end - c480.ds, 10);
  // Pure: the same time gives the same ring, whatever came before.
  const q = rings[7], a = { ...ringPhase(q, 333) };
  ringPhase(q, 777);
  assert.deepEqual({ ...ringPhase(q, 333) }, a);
});

test("nothing stands in a fae ring's clearing", () => {
  D.setWorld({ seed: MEADOW_SEED });
  for (let b = -3; b <= 3; b++) {
    for (let a = -3; a <= 3; a++) {
      const r = ringAt(a, b);
      if (!r) continue;
      assert.ok(clearAt(r.x + 63, r.y) && clearAt(r.x, r.y - 63) && clearAt(r.x - 40, r.y + 40), 'within 64 px of its middle');
      assert.ok(!clearAt(r.x + 65, r.y) && !clearAt(r.x, r.y + 65), 'and not beyond');
    }
  }
  assert.equal(BIOMES.meadow.clearAt, clearAt);
  assert.equal(BIOMES.meadow.fae, FAE);
  game((g) => {
    let n = 0;
    for (let cy = -2; cy <= 1; cy++) {
      for (let cx = -2; cx <= 1; cx++) {
        for (const p of g.world.chunk(cx, cy).props) {
          n++;
          for (const r of ringsNear(p.x, p.y, FAE.clear + 1)) assert.ok(dist(p, r) >= FAE.clear, `${p.spr.name} at ${p.x},${p.y} stands in the ring at ${Math.round(r.x)},${Math.round(r.y)}`);
        }
      }
    }
    assert.ok(n > 0);
  }, { map: 'meadow' });
});

test('a dancing ring takes the horde, and no one else', () => {
  game((g, p) => {
    const court = g.world.court, r = nearestRing(g);
    assert.ok(court && r, 'a court, and a ring within reach of the start');
    const at = (k, d = 20) => [r.x + Math.cos(k) * d, r.y + Math.sin(k) * d];
    const foe = g.spawnEnemy('skeleton', ...at(0), { instant: true });
    foe.lockT = 0.5;
    foe.state = 'wind';
    const others = {
      boss: g.spawnEnemy('boneking', ...at(0.8), { instant: true, always: true }),
      lord: g.spawnEnemy('skeleton', ...at(1.6), { instant: true, lord: true }),
      champion: g.spawnEnemy('skeleton', ...at(2.4), { instant: true, elite: true }),
      thief: g.spawnEnemy('thief', ...at(3.2), { instant: true }),
      rising: g.spawnEnemy('skeleton', ...at(4)),
      wild: g.spawnEnemy('skeleton', ...at(4.8), { instant: true }),
      far: g.spawnEnemy('skeleton', ...at(5.6, 50), { instant: true }),
    };
    others.wild.wildT = 2;
    // Asleep, it takes no one.
    takeIn(g, 50);
    assert.equal(foe.dance, null, 'asleep');
    takeIn(g, danceTime(r, 1));
    assert.equal(foe.dance, r, 'a skeleton within its line joins');
    assert.equal(foe.lockT, 0, 'what it was locked on is dropped');
    assert.equal(foe.state, 'move', 'and its wind-up');
    assert.equal(foe.danceEnd, r.end);
    assert.equal(foe.danceC, FAE.seelie);
    for (const [who, e] of Object.entries(others)) assert.equal(e.dance, null, `no ${who}`);
  }, { map: 'meadow' });
});

test('the wheel turns round the line, clockwise, as fast as the dancer may go', () => {
  game((g, p) => {
    const r = nearestRing(g);
    const free = g.spawnEnemy('skeleton', r.x + 70, r.y, { instant: true });
    const slow = g.spawnEnemy('skeleton', r.x + 70, r.y, { instant: true });
    const ice = g.spawnEnemy('skeleton', r.x + 70, r.y, { instant: true });
    // Taken in as they cross the line, then the hero far off.
    for (const e of [free, slow, ice]) e.x = r.x + 40;
    takeIn(g, danceTime(r, 1));
    for (const e of [free, slow, ice]) {
      assert.equal(e.dance, r);
      e.x = r.x + 70;
      e.y = r.y;
    }
    p.x = r.x + 3000;
    slow.slowT = 10;
    slow.slowF = 0.5;
    ice.freezeT = 10;
    for (let i = 0; i < 30; i++) for (const e of [free, slow, ice]) e.update(1 / 60);
    assert.ok(Math.abs(dist(free, r) - FAE.r) < 70 - FAE.r, `drawn toward the line: ${dist(free, r)}`);
    const turned = angle(free, r), half = angle(slow, r);
    assert.ok(turned > 0, `clockwise on the screen (y down): ${turned}`);
    assert.ok(Math.abs(turned - FAE.spin * 0.5) < 0.05, `at ${FAE.spin} rad/s: ${turned}`);
    assert.ok(half > 0 && half / turned > 0.4 && half / turned < 0.6, `slowed by half, about half as far: ${half} of ${turned}`);
    assert.deepEqual([ice.x, ice.y], [r.x + 70, r.y], 'frozen, not at all');
    assert.equal(free.dance, r, 'still dancing');
  }, { map: 'meadow' });
});

test('the dance never sends a foe at the hero, and its touch still hurts', () => {
  game((g, p) => {
    const r = nearestRing(g);
    const e = g.spawnEnemy('skeleton', r.x + 48, r.y, { instant: true });
    p.x = e.x;
    p.y = e.y;
    takeIn(g, danceTime(r, 1));
    assert.equal(e.dance, r);
    const hp = p.hp;
    e.update(1 / 60);
    assert.ok(p.hp < hp, 'a dancer he stands in bites as ever');
  }, { map: 'meadow', mortal: true });
  game((g, p) => {
    const r = nearestRing(g);
    const witch = g.spawnEnemy('thornwitch', r.x + 30, r.y, { instant: true });
    witch.cdT = 0;
    p.x = r.x + 100;
    p.y = r.y;
    takeIn(g, danceTime(r, 1));
    assert.equal(witch.dance, r);
    for (let i = 0; i < 300; i++) witch.update(1 / 60);
    assert.equal(g.eshots.length, 0, 'a Thorn Witch dancing 5 s fires nothing');
    assert.equal(witch.dance, r);
  }, { map: 'meadow' });
});

test('when the music stops they break wild, never past the swift', () => {
  game((g, p) => {
    const r = nearestRing(g);
    const e = g.spawnEnemy('goblin', r.x + 30, r.y, { instant: true });
    takeIn(g, danceTime(r, 1));
    assert.equal(e.dance, r);
    g.time = e.danceEnd;
    e.update(1 / 60);
    assert.equal(e.dance, null, 'out of the dance');
    assert.equal(e.wildT, FAE.seelie.wild, 'wild for 3 s');
    // A wild foe in a dancing ring is not taken.
    e.x = r.x + 10;
    e.y = r.y;
    takeIn(g, danceTime(r, 1, g.time + 1));
    assert.equal(e.dance, null, 'a wild one is never taken');
    // An Unseelie dance's release: 4 s.
    const u = g.spawnEnemy('goblin', r.x + 30, r.y, { instant: true });
    takeIn(g, danceTime(r, 1, FAE.unseelie.at, true));
    assert.equal(u.dance, r);
    assert.equal(u.danceC, FAE.unseelie);
    g.time = u.danceEnd;
    u.update(1 / 60);
    assert.equal(u.wildT, FAE.unseelie.wild, 'wild for 4 s under the Unseelie');
    // How much quicker, by speed class: never past the swift.
    const k = (type, C) => {
      const f = g.spawnEnemy(type, p.x + 400, p.y + 400, { instant: true });
      f.breakWild(C);
      return f.wildK;
    };
    assert.equal(k('rabbit', FAE.seelie), 1, 'a Killer Rabbit (swift)');
    assert.ok(Math.abs(k('goblin', FAE.seelie) - 1 / 0.9) < 1e-9, 'a goblin (quick)');
    assert.ok(Math.abs(k('myconid', FAE.seelie) - 1.25) < 1e-9, 'a Myconid (steady)');
    assert.ok(Math.abs(k('flytrap', FAE.seelie) - 1.25) < 1e-9, 'a Snapjaw (slow), Seelie');
    assert.ok(Math.abs(k('flytrap', FAE.unseelie) - 1.4) < 1e-9, 'and Unseelie');
    assert.ok(Math.abs(k('myconid', FAE.unseelie) - 1.25) < 1e-9, 'a Myconid no faster under the Unseelie');
  }, { map: 'meadow' });
});

test('one carried off its ring leaves the dance unreleased', () => {
  game((g) => {
    const r = nearestRing(g);
    const e = g.spawnEnemy('skeleton', r.x + 30, r.y, { instant: true });
    takeIn(g, danceTime(r, 1));
    assert.equal(e.dance, r);
    e.x = r.x + FAE.r + FAE.drop + 1;
    e.update(1 / 60);
    assert.equal(e.dance, null);
    assert.equal(e.wildT, 0);
  }, { map: 'meadow' });
});

test('the Darkwood has none of it', () => {
  assert.equal(BIOMES.forest.fae, undefined);
  assert.equal(BIOMES.forest.clearAt, undefined);
  game((g, p) => {
    const w = g.world;
    assert.equal(w.court, null);
    for (const k of ['drawGlow', 'marker', 'drawGroundProps']) assert.ok(!Object.hasOwn(w, k), `no ${k} of its own`);
    for (let i = 0; i < 12; i++) g.spawnEnemy('skeleton', p.x + Math.cos(i) * 60, p.y + Math.sin(i) * 60, { instant: true });
    for (let i = 0; i < 600; i++) g.update(1 / 60);
    assert.ok(g.enemies.length > 0, 'a horde came');
    for (const e of g.enemies) assert.ok(e.dance === null && !(e.wildT > 0), `${e.type}: never dancing nor wild`);
  }, { spawn: true });
});

test('a night of the court: one "A fae ring stirs" and one "The Unseelie Hour"', () => {
  game((g) => {
    const said = [];
    const banner = g.banner.bind(g);
    g.banner = (title, ...rest) => {
      said.push(title);
      return banner(title, ...rest);
    };
    for (let t = 0; t <= 900; t += 0.5) {
      g.time = t;
      g.world.court.update(0.5);
    }
    assert.equal(said.filter((s) => s === 'A fae ring stirs').length, 1);
    assert.equal(said.filter((s) => s === 'The Unseelie Hour').length, 1);
    assert.equal(said.length, 2, said.join(', '));
  }, { map: 'meadow' });
});

test("the HUD's arrow goes to the nearest waking ring, in its court's colour", () => {
  game((g, p) => {
    const court = g.world.court;
    g.time = 50;
    court.update(0);
    assert.equal(g.world.marker(), null, 'none awake before 1:40');
    for (const t of [130, 300, 520, 700]) {
      g.time = t;
      court.update(0);
      let best = null, bd = Infinity;
      for (const r of ringsNear(p.x, p.y, FAE.mark)) {
        ringPhase(r, t);
        const d = dist(r, p);
        if (r.state !== ASLEEP && d < bd) {
          bd = d;
          best = r;
        }
      }
      const m = g.world.marker();
      if (!best) assert.equal(m, null, `${t}: none awake within 900 px`);
      else assert.deepEqual([...m], [best.x, best.y - 6, best.fierce ? '#b55088' : '#f6757a', 'ring'], `${t}: the nearest`);
    }
  }, { map: 'meadow' });
  const hud = readFileSync(root + 'public/js/game/hud.js', 'utf8');
  const rows = JSON.parse(`[${hud.match(/\n {2}ring: \[([^\]]+)\]/)[1].replaceAll("'", '"')}]`);
  assert.equal(rows.length, 6);
  for (const row of rows) assert.equal(row.length, 6);
});

test("the night looks: a dancer's is appended, the rest keep their places", () => {
  assert.equal(NIGHT_LOOKS.length, 7);
  assert.equal(NIGHT_LOOKS[6][0], 'night-charmed');
  assert.equal(NIGHT_LOOKS[3][0], 'night-eliteo');
});
