// What a Survival map's own ground does to the hero (player.js QUICKSAND, ICE, FROST; 28 October 2026).
// The owner's words that day: the Frostfell's "hero steps on the ice and continues sliding until reaches
// regular ground. If hits wall while sliding will stop and can decide where to slide next", and its
// "gusts here and there freeze monsters or hero"; and the Sunscorch's quicksand, which held him at first
// ("hero steps in and cannot move for a few seconds") until the owner's of 29 October 2026: "make it so
// that it doesnt exactly stop the hero, but only greatly slows him down, for like 2/3 slower". So the
// quicksand slows him to a third of his pace, easing in at its rim, and sinks him a little as the tell,
// but never holds him; a gust's hold is short, drawn, and followed by a grace to walk out in; his
// weapons fire on through it; the monsters cross the mountains and the gaps at WALL_PACE and are slowed
// by neither quicksand nor ice; and the Darkwood, which has no such ground, is exactly as it was.
//
// The ground is stubbed on a Darkwood game (world spec 6, "test stubs"): a topology of plain ground
// (PLAIN, the interface of world spec 1.3, so the Forest's own queries find nothing in it) and the
// world's surfaceAt and patchDepth saying what lies where; the real maps' ground is test/topology.test.js's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { QUICKSAND, ICE, FROST } = await mod('public/js/game/player.js');
const { WALL_PACE } = await mod('public/js/game/enemies.js');
const { CROWD } = await mod('public/js/game/crowd.js');
const { SURFACE, FOE_SLOWED, HERO_BLOCKED, TMAX } = await mod('public/js/game/topology/index.js');
const { TINTS, SPR } = await mod('public/js/engine/sprites.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

const DT = 1 / 60;
const meta = P.metaBonuses(P.defaultProfile());

// A headless Darkwood night, the hero untouchable, nothing sent at him, his input the test's.
function gameCase(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed ?? 4242);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: o.hero || 'knight', mode: 's15', meta, settings: { numbers: false }, crypts: false, headless: true });
    g.player.devGod = true;
    if (!o.horde) g.spawner.update = () => {};
    g.update(DT);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    input.endFrame();
    Math.random = oldRandom;
  }
}

// A topology of plain ground everywhere (world spec 1.3 and 1.4): no roads, places, patches, walls.
const nullChunk = (cx, cy) => ({
  cx, cy, x0: cx * 256, y0: cy * 256, open: null, patch: null, deck: null, road: null, roadHw: null,
  blocked: SURFACE.WALL, patchKind: SURFACE.QUICKSAND, patches: [], bridges: [], pools: [], caves: [],
  lava: false, lavaTiles: null, any: false,
});
const PLAIN = {
  kind: 'corridor', axis: 'x', variant: null, blocked: SURFACE.WALL, patchKind: SURFACE.QUICKSAND,
  cryptRange: { near: 4800, far: 5200 },
  start: () => ({ x: 0, y: 0 }),
  features: () => ({ paths: [], places: [], landmarks: [] }),
  shrinesNear: () => [],
  cryptsNear: () => [],
  patchesNear: () => [],
  openAt: () => TMAX,
  patchAt: () => -TMAX,
  canStand: () => true,
  terrain: nullChunk,
  trim: () => {},
};

// The ground under (x, y) as ground(x, y) says, [surface, px into the patch]; nothing holds him but
// what `hold` does (a wall), so a trunk by the start never nudges a held hero.
function stubGround(g, ground, hold = () => {}) {
  const w = g.world, p = g.player;
  w.topo = PLAIN;
  w.surfaceAt = (x, y) => ground(x, y)[0];
  w.patchDepth = (x, y) => ground(x, y)[1];
  w.collide = (e) => {
    if (e === p) hold(e);
  };
}

// A patch of `kind` from x0 to x1 across every y: inside it the depth is px from its nearer edge.
const band = (kind, x0, x1) => (x) => {
  const d = Math.min(x - x0, x1 - x);
  return d > 0 ? [kind, Math.min(TMAX, d)] : [SURFACE.GROUND, Math.max(-TMAX, d)];
};
const steps = (p, n) => {
  for (let i = 0; i < n; i++) p.update(DT);
};

test('the ground slows or holds the hero, never the horde: quicksand and ice slow no monster, walls and gaps slow a walker', () => {
  assert.equal(HERO_BLOCKED[SURFACE.QUICKSAND], 0, 'quicksand is walked onto');
  assert.equal(HERO_BLOCKED[SURFACE.ICE], 0, 'and so is ice');
  for (const s of [SURFACE.QUICKSAND, SURFACE.ICE, SURFACE.GROUND, SURFACE.ROAD, SURFACE.BRIDGE]) assert.equal(FOE_SLOWED[s], 0, `${s} slows no monster`);
  assert.equal(FOE_SLOWED[SURFACE.WALL], 1);
  assert.equal(FOE_SLOWED[SURFACE.GAP], 1);
  assert.deepEqual(QUICKSAND, { pace: 1 / 3, enter: 4, sink: 4, settle: 0.35 });
  assert.deepEqual(ICE, { speed: 1.25, start: 12, enter: 1, leave: -1, block: 0.5 });
  assert.deepEqual(FROST, { hold: 1.5, grace: 1.5 });
});

test('quicksand: wading he walks on at a third of his pace, sinking as he goes, never held; out of it his pace and his feet are his again', () =>
  gameCase((g, p) => {
    const x0 = p.x + 40, x1 = x0 + 160;
    stubGround(g, band(SURFACE.QUICKSAND, x0, x1));
    const said = [];
    g.numbers.text = (x, y, s) => said.push(s);
    input.bot = { x: 1, y: 0 };
    const full = p.moveSpeed, most = (QUICKSAND.sink / QUICKSAND.settle) * DT;
    // In, well past its rim: he never stops, and he sinks a little at a time.
    let n = 0, sink = p.sink;
    while (p.x < x0 + QUICKSAND.enter + 24 && n++ < 600) {
      p.update(DT);
      assert.equal(p.held, null, 'never held');
      assert.equal(p.moving, true, 'walking on');
      assert.ok(Math.abs(p.sink - sink) <= most + 1e-9, 'sinking, eased');
      sink = p.sink;
    }
    assert.ok(p.x >= x0 + QUICKSAND.enter + 24, 'through the rim and on');
    assert.equal(p.wade, 1, 'wading');
    assert.equal(p.sink, QUICKSAND.sink, 'sunk in');
    // Wading: a third of his pace, the way he is steered.
    const xa = p.x;
    steps(p, 30);
    const v = (p.x - xa) / (30 * DT);
    assert.ok(Math.abs(v / full - QUICKSAND.pace) < 0.01, `wading at ${(v / full).toFixed(3)} of his pace`);
    input.bot = { x: 0, y: 1 };
    const ya = p.y;
    steps(p, 30);
    assert.ok(p.y > ya && p.y - ya < full * QUICKSAND.pace * 30 * DT + 1e-9, 'turning as he likes, no faster');
    // Out the far side: his pace again, rising out of it as he sank.
    input.bot = { x: 1, y: 0 };
    sink = p.sink;
    while (p.x < x1 + 60 && n++ < 2000) {
      p.update(DT);
      assert.equal(p.held, null);
      assert.ok(Math.abs(p.sink - sink) <= most + 1e-9, 'rising, eased');
      sink = p.sink;
    }
    assert.ok(p.x >= x1 + 60, 'out');
    assert.deepEqual([p.wade, p.sink, p.sandPace], [0, 0, 1], 'on his own feet');
    assert.ok(Math.abs(p.vx - full) < full * 1e-3, 'his own pace');
    assert.ok(!said.includes('Quicksand!'), 'no word over him: it never holds him');
  }));

test("quicksand's rim eases the slow in, so it never snaps: none at the rim, all of it QUICKSAND.enter px in", () =>
  gameCase((g, p) => {
    const at = (d) => {
      stubGround(g, () => [d > 0 ? SURFACE.QUICKSAND : SURFACE.GROUND, d]);
      p.groundUnder(g, false, DT);
      return p.sandPace;
    };
    assert.equal(at(-3), 1, 'beside it');
    assert.equal(at(0), 1, 'at its rim');
    assert.ok(Math.abs(at(QUICKSAND.enter / 2) - (1 + QUICKSAND.pace) / 2) < 1e-9, 'half of it half way');
    assert.ok(Math.abs(at(QUICKSAND.enter) - QUICKSAND.pace) < 1e-9, 'all of it');
    assert.ok(Math.abs(at(40) - QUICKSAND.pace) < 1e-9, 'and no more deeper in');
    let last = 1;
    for (let d = 0.25; d <= QUICKSAND.enter; d += 0.25) {
      const k = at(d);
      assert.ok(k < last, `slower ${d} px in`);
      last = k;
    }
  }));

test('quicksand slows no hero in the air, and none where the map has no ground of its own; a leap carries him its whole way', () =>
  gameCase((g, p) => {
    stubGround(g, () => [SURFACE.QUICKSAND, 30]);
    // No topology (the Darkwood, Ranked, the road by day): the same stubs, and nothing.
    g.world.topo = null;
    input.bot = { x: 1, y: 0 };
    steps(p, 30);
    assert.deepEqual([p.wade, p.sink, p.sandPace], [0, 0, 1], 'the Darkwood has no quicksand');
    assert.ok(Math.abs(p.vx - p.moveSpeed) < p.moveSpeed * 1e-3, 'his own pace');
    g.world.topo = PLAIN;
    steps(p, 30);
    assert.equal(p.wade, 1, 'wading');
    assert.equal(p.held, null);
    // Mid-leap (the Twin Axes'), unslowed: it lands where it was aimed, as far as ever.
    const to = p.x + 30;
    let landed = null;
    assert.equal(p.leapTo(to, p.y, () => (landed = p.x), 0.2), true, 'he leaps out of it');
    p.update(DT);
    assert.equal(p.wade, 0, 'not in the air');
    assert.equal(p.sandPace, 1);
    steps(p, 30);
    assert.equal(p.leap, null);
    assert.ok(Math.abs(landed - to) < 1e-9, 'its whole way');
    assert.equal(p.held, null, 'never held');
    assert.equal(p.wade, 1, 'wading again where he lands');
  }));

test('wading, the crowd on him eases him off it no faster than he wades', () => {
  const eased = (surface) =>
    gameCase((g, p) => {
      stubGround(g, () => [surface, 30]);
      steps(p, 30);
      for (let i = 0; i < 6; i++) g.spawnEnemy('skeleton', p.x + 2 + i * 0.5, p.y + 1, { instant: true, always: true });
      g.state = 'play';
      const x = p.x, y = p.y;
      g.separate(DT);
      return Math.hypot(p.x - x, p.y - y);
    });
  const dry = eased(SURFACE.GROUND), wet = eased(SURFACE.QUICKSAND);
  assert.ok(dry > 0, 'eased off them on dry sand');
  assert.ok(dry <= CROWD.hero.most * DT + 1e-9, 'never as fast as he walks');
  assert.ok(wet <= CROWD.hero.most * DT * QUICKSAND.pace + 1e-9, `wading, at most a third of that (${wet.toFixed(4)} px)`);
  assert.ok(wet < dry);
});

test("held, he can't leap: the Twin Axes chop where he stands", () =>
  gameCase((g, p) => {
    p.freeze(1.5);
    let chopped = false;
    assert.equal(p.leapTo(p.x + 30, p.y, () => (chopped = true)), false);
    assert.ok(chopped, 'the blow falls at once, where he stands');
    assert.equal(p.leap, null);
  }));

test('ice: he slides on at 1.25 times his pace the way he came, whatever is pressed, until regular ground', () =>
  gameCase((g, p) => {
    const x0 = p.x + 40, x1 = x0 + 300, y = p.y;
    stubGround(g, band(SURFACE.ICE, x0, x1));
    input.bot = { x: 1, y: 0 };
    let n = 0;
    while (!p.slide && n++ < 300) p.update(DT);
    assert.ok(p.slide, 'sliding');
    assert.ok(Math.abs(p.slide.x - 1) < 1e-9 && Math.abs(p.slide.y) < 1e-9, 'along the way he came on');
    // Steered down for a second: on he slides, straight, at ICE.speed of his pace.
    input.bot = { x: 0, y: 1 };
    for (let i = 0; i < 60; i++) {
      const bx = p.x;
      p.update(DT);
      assert.ok(Math.abs(p.x - bx - p.moveSpeed * ICE.speed * DT) < 1e-9, 'his pace on the ice');
      assert.equal(p.y, y, 'the steering ignored');
      assert.equal(p.moving, false, 'his standing pose');
    }
    // Off the far side, his steering is his again: he turns down, his slide's pace easing.
    while (p.slide && n++ < 2000) p.update(DT);
    assert.equal(p.slide, null);
    assert.equal(p.onIce, false, 'on regular ground');
    assert.ok(p.x > x1, 'past the ice');
    steps(p, 30);
    assert.ok(p.vy > 0 && p.y > y, 'he walks where he is steered');
    assert.ok(p.vx < p.moveSpeed * ICE.speed * 0.2, 'the slide spent');
  }));

test('ice: struck against something solid he stops, stands on the ice, and a direction pressed sends him off that way', () =>
  gameCase((g, p) => {
    const x0 = p.x + 40, wall = x0 + 100;
    // Ice from x0 on; a wall at `wall` that the world holds him out of.
    stubGround(g, (x) => (x > x0 ? [SURFACE.ICE, Math.min(TMAX, x - x0)] : [SURFACE.GROUND, Math.max(-TMAX, x - x0)]), (e) => {
      if (e.x > wall) e.x = wall;
    });
    input.bot = { x: 1, y: 0 };
    let n = 0;
    while (!p.slide && n++ < 300) p.update(DT);
    assert.ok(p.slide, 'sliding at the wall');
    while (p.slide && n++ < 600) p.update(DT);
    assert.equal(p.slide, null, 'stopped');
    assert.equal(p.onIce, true, 'standing on the ice');
    assert.equal(p.x, wall);
    // Nothing pressed: he stands.
    input.bot = { x: 0, y: 0 };
    const at = [p.x, p.y];
    steps(p, 20);
    assert.deepEqual([p.x, p.y], at, 'he stands');
    // Up: a new slide, up.
    input.bot = { x: 0, y: -1 };
    p.update(DT);
    assert.ok(p.slide && Math.abs(p.slide.y + 1) < 1e-9, 'a slide up');
    const y1 = p.y;
    p.update(DT);
    assert.ok(Math.abs(y1 - p.y - p.moveSpeed * ICE.speed * DT) < 1e-9, 'at his ice pace');
  }));

test("the horde keeps its pace on ice and in quicksand: only walls and gaps slow a walker", () => {
  const walked = (surface) =>
    gameCase((g, p) => {
      stubGround(g, () => [surface, 20]);
      const e = g.spawnEnemy('skeleton', p.x + 200, p.y + 10, { instant: true, always: true });
      const x0 = e.x, y0 = e.y;
      for (let i = 0; i < 60; i++) e.update(DT);
      return Math.hypot(e.x - x0, e.y - y0);
    });
  const plain = walked(SURFACE.GROUND);
  assert.ok(plain > 5, 'it walks');
  assert.equal(walked(SURFACE.ICE), plain, 'ice');
  assert.equal(walked(SURFACE.QUICKSAND), plain, 'quicksand');
});

test('frozen: held 1.5 s in the ice tint, then 1.5 s in which no gust freezes him; the Ward, a leap and the Shadow Dance refuse it', () =>
  gameCase((g, p) => {
    input.bot = { x: 1, y: 0 };
    steps(p, 10);
    assert.equal(p.freeze(FROST.hold), true);
    assert.equal(p.held.kind, 'frost');
    assert.equal(p.vx, 0);
    // Drawn in his standing frame, in the frozen foes' tint.
    p.flash = 0;
    g.placePlayer(g.cam);
    const [, , , , fr, flip, img] = p._rect;
    assert.equal(img, fr.variant('frozen', TINTS.frozen, flip), 'the ice tint over him');
    assert.equal(p.freeze(), false, 'no second hold on a held hero');
    const at = [p.x, p.y];
    let n = 0;
    while (p.held && n < 400) {
      p.update(DT);
      n++;
      if (p.held) assert.deepEqual([p.x, p.y], at, 'he does not move');
    }
    assert.ok(Math.abs(n * DT - FROST.hold) <= 2 * DT, `frozen ${(n * DT).toFixed(3)} s`);
    assert.ok(Math.abs(p.frostFree - FROST.grace) <= 2 * DT, 'his grace');
    assert.equal(p.freeze(), false, 'refused in his grace');
    steps(p, Math.ceil(FROST.grace / DT) + 1);
    assert.equal(p.freeze(), true, 'and after it, taken again');
    p.clearTerrain();
    // What no blow touches, no gust freezes.
    p.addBuff('ward', 5);
    assert.equal(p.freeze(), false, 'in the Ward');
    p.buffs.clear();
    p.leap = { x0: p.x, y0: p.y, x1: p.x + 20, y1: p.y, t: 0, dur: 0.2, onLand: () => {}, lx: p.x, ly: p.y };
    assert.equal(p.freeze(), false, 'in the air');
    p.leap = null;
    p.ult = { type: 'shadowdance', t: 3 };
    assert.equal(p.freeze(), false, 'in the Shadow Dance');
    p.ult = null;
    assert.equal(p.freeze(), true);
  }));

test('sunk in quicksand he is drawn lower, his feet cut, so they stay at the sand, the swirl under him and no clock; the Darkwood draws him whole', () =>
  gameCase((g, p) => {
    const recorder = () => {
      const calls = [];
      const ctx = new Proxy({}, { get: (t, k) => (...a) => calls.push([k, ...a]), set: (t, k, v) => (calls.push(['=' + String(k), v]), true) });
      return { ctx, calls };
    };
    const S = g.cam.S;
    p.flash = 0;
    p.invuln = 0;
    g.placePlayer(g.cam);
    const whole = [...p._rect];
    assert.equal(whole[8], 0);
    let { ctx, calls } = recorder();
    g.drawHero(ctx, g.cam);
    const plain = calls.find((c) => c[0] === 'drawImage' && c[1] === whole[6]);
    assert.deepEqual(plain.slice(2), whole.slice(0, 4), 'whole, as ever');
    assert.ok(!calls.some((c) => c[0] === 'ellipse'), 'nothing round his feet');
    p.sink = QUICKSAND.sink;
    g.placePlayer(g.cam);
    const sunk = p._rect, cut = Math.round(QUICKSAND.sink * S);
    assert.equal(sunk[8], QUICKSAND.sink);
    assert.equal(sunk[1], whole[1] + cut, 'drawn lower');
    ({ ctx, calls } = recorder());
    g.drawHero(ctx, g.cam);
    const img = sunk[6], drawn = calls.find((c) => c[0] === 'drawImage' && c[1] === img);
    assert.deepEqual(drawn.slice(2), [0, 0, img.width, img.height - QUICKSAND.sink, sunk[0], sunk[1], sunk[2], sunk[3] - cut], 'his feet cut');
    const swirl = new Set(SPR.fx_quicksand.frames.map((f) => f.c));
    assert.ok(calls.some((c) => c[0] === 'drawImage' && swirl.has(c[1])), 'the swirl he wades in');
    assert.ok(!calls.some((c) => c[0] === 'ellipse'), 'no clock: it never holds him (29 October 2026)');
    // Frozen by a gust: the hold's clock round his feet, as ever.
    p.sink = 0;
    assert.equal(p.freeze(FROST.hold), true);
    g.placePlayer(g.cam);
    ({ ctx, calls } = recorder());
    g.drawHero(ctx, g.cam);
    assert.ok(calls.some((c) => c[0] === 'ellipse'), "the hold's clock round his feet");
    assert.ok(!calls.some((c) => c[0] === 'drawImage' && swirl.has(c[1])), 'and no swirl');
  }));

test("a level-up's cards stop the hold's clock; a crypt below and the forest above let every hold go; the ultimate goes off held", () =>
  gameCase((g, p) => {
    p.freeze(FROST.hold);
    const t = p.held.t;
    g.state = 'levelup';
    for (let i = 0; i < 120; i++) g.update(DT);
    assert.equal(p.held.t, t, 'the clock stood still');
    g.state = 'play';
    // The ultimate is his to launch, held or not.
    p.fury = 100;
    p.ultLocked = false;
    input.justDown.add('Space');
    p.update(DT);
    input.endFrame();
    assert.ok(g.ultLaunch, 'launched');
    assert.equal(p.fury, 0);
    g.ultLaunch = null;
    // Down a crypt's steps: every hold of the ground left up here, and the quicksand he waded.
    const set = () => {
      p.held = { kind: 'frost', t: 2, max: FROST.hold };
      p.frostFree = 1;
      p.wade = 1;
      p.sink = QUICKSAND.sink;
      p.slide = { x: 1, y: 0 };
      p.onIce = true;
    };
    const clear = (where) => assert.deepEqual([p.held, p.frostFree, p.wade, p.sink, p.slide, p.onIce], [null, 0, 0, 0, null, false], where);
    const door = { key: '2,0', x: p.x, y: p.y - 40, depth: 1, crypt: true, sealed: false, t: 0 };
    g.crypts.push(door);
    set();
    g.enterCrypt(door);
    for (let i = 0; i < 200 && !g.inCrypt; i++) g.update(DT);
    assert.ok(g.inCrypt, 'below');
    clear('in the crypt');
    for (let i = 0; i < 200 && g.state !== 'play'; i++) g.update(DT);
    set();
    g.leaveCrypt();
    for (let i = 0; i < 200 && g.inCrypt; i++) g.update(DT);
    assert.equal(g.inCrypt, null, 'back up');
    clear('by the door');
  }));

test('a walker crosses walls and gaps at WALL_PACE, a flier and a Wraith at their own; the Darkwood walks as it always did', () => {
  const walked = (type, slows) =>
    gameCase((g, p) => {
      g.world.slows = slows;
      const e = g.spawnEnemy(type, p.x + 200, p.y + 10, { instant: true, always: true });
      const x0 = e.x, y0 = e.y;
      for (let i = 0; i < 60; i++) e.update(DT);
      return Math.hypot(e.x - x0, e.y - y0);
    });
  const yes = () => true, no = () => false;
  const k = walked('skeleton', yes) / walked('skeleton', no);
  assert.ok(Math.abs(k - WALL_PACE) < 0.03, `a skeleton at ${k.toFixed(3)} of its pace`);
  assert.equal(walked('bat', yes), walked('bat', no), 'a bat flies over at its own');
  assert.equal(walked('ghost', yes), walked('ghost', no), 'a Wraith goes through at its own');
  // The Darkwood: a night with the horde, as the Forest asks (no topology: slows is false at once) and
  // as it was before there was any slows to ask: the same everywhere over 120 frames.
  const night = (drop) =>
    gameCase((g, p) => {
      if (drop) g.world.slows = undefined;
      else if (g.world.slows) assert.equal(g.world.slows(p.x + 40, p.y), false, 'never slowed in the Darkwood');
      input.bot = { x: 0.6, y: 0.8 };
      const out = [];
      for (let i = 0; i < 120; i++) {
        g.update(DT);
        out.push([p.x, p.y, ...g.enemies.map((e) => [e.type, e.x, e.y]).flat()].join());
      }
      return out;
    }, { horde: true, seed: 99 });
  assert.deepEqual(night(false), night(true));
});
