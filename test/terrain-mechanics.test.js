// What a Survival map's own ground does to the hero (player.js QUICKSAND, ICE, FROST; 28 October 2026).
// The owner's words that day: the Sunscorch's "quicksand, hero steps in and cannot move for a few
// seconds"; the Frostfell's "hero steps on the ice and continues sliding until reaches regular ground.
// If hits wall while sliding will stop and can decide where to slide next", and its "gusts here and
// there freeze monsters or hero". Each hold is short, drawn, and followed by a grace to walk out in; his
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
const { SURFACE, FOE_SLOWED, HERO_BLOCKED, TMAX } = await mod('public/js/game/topology/index.js');
const { TINTS } = await mod('public/js/engine/sprites.js');
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

test('the ground holds the hero, never the horde: quicksand and ice slow no monster, walls and gaps slow a walker', () => {
  assert.equal(HERO_BLOCKED[SURFACE.QUICKSAND], 0, 'quicksand is walked onto');
  assert.equal(HERO_BLOCKED[SURFACE.ICE], 0, 'and so is ice');
  for (const s of [SURFACE.QUICKSAND, SURFACE.ICE, SURFACE.GROUND, SURFACE.ROAD, SURFACE.BRIDGE]) assert.equal(FOE_SLOWED[s], 0, `${s} slows no monster`);
  assert.equal(FOE_SLOWED[SURFACE.WALL], 1);
  assert.equal(FOE_SLOWED[SURFACE.GAP], 1);
  assert.deepEqual(QUICKSAND, { hold: 2.5, grace: 1.5, sink: 4, enter: 2 });
  assert.deepEqual(ICE, { speed: 1.25, start: 12, enter: 1, leave: -1, block: 0.5 });
  assert.deepEqual(FROST, { hold: 1.5, grace: 1.5 });
});

test('quicksand: he is held 2.5 s whatever is pressed, sinking, his weapons firing on; then 1.5 s in which it takes him not', () =>
  gameCase((g, p) => {
    const x0 = p.x + 40;
    stubGround(g, band(SURFACE.QUICKSAND, x0, x0 + 60));
    input.bot = { x: 1, y: 0 };
    let n = 0;
    while (!p.held && n++ < 300) g.update(DT);
    assert.ok(p.held, 'taken');
    assert.equal(p.held.kind, 'sand');
    assert.ok(p.x - x0 > QUICKSAND.enter && p.x - x0 < QUICKSAND.enter + 4, `once his feet are ${QUICKSAND.enter} px in (${(p.x - x0).toFixed(2)})`);
    assert.equal(p.vx, 0);
    // A Ghoul in his sword's reach, on the side he faces.
    const foe = g.spawnEnemy('zombie', p.x + 14, p.y, { instant: true, always: true });
    const at = [p.x, p.y], hp0 = foe.hp;
    // Held: no step whichever way he is steered, and his weapons fire on.
    const ways = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0.7, y: -0.7 }];
    let held = 0;
    while (p.held && held < 400) {
      input.bot = ways[held % ways.length];
      g.update(DT);
      held++;
      if (p.held) {
        assert.deepEqual([p.x, p.y], at, 'he does not move');
        assert.equal(p.moving, false, 'nor walk');
      }
      if (held === Math.round(0.4 / DT)) assert.equal(p.sink, QUICKSAND.sink, 'sunk in');
    }
    assert.ok(Math.abs(held * DT - QUICKSAND.hold) <= 2 * DT, `held ${(held * DT).toFixed(3)} s`);
    assert.ok(foe.dead || foe.hp < hp0, 'his sword struck the Ghoul while he was held');
    // Free: he walks (the frame that lets him go moves him on).
    assert.ok(p.x !== at[0] || p.y !== at[1], 'he walks again');
    assert.equal(p.sink, 0);
    // Standing in the pool through his grace, it takes him not; then it does again.
    input.bot = { x: 0, y: 0 };
    let free = 0;
    while (!p.held && free < 400) {
      p.update(DT);
      free++;
    }
    assert.ok(Math.abs(free * DT - QUICKSAND.grace) <= 3 * DT, `taken again after ${(free * DT).toFixed(3)} s`);
  }));

test('quicksand takes no hero in the air, and none where the map has no ground of its own', () =>
  gameCase((g, p) => {
    stubGround(g, () => [SURFACE.QUICKSAND, 30]);
    // No topology (the Darkwood, Ranked, the road by day): the same stubs, and nothing.
    g.world.topo = null;
    input.bot = { x: 1, y: 0 };
    steps(p, 30);
    assert.equal(p.held, null, 'the Darkwood has no quicksand');
    g.world.topo = PLAIN;
    // Mid-leap (the Twin Axes'), not until he comes down.
    p.leapTo(p.x + 30, p.y, () => {}, 0.2);
    p.update(DT);
    assert.equal(p.held, null, 'not in the air');
    steps(p, 30);
    assert.equal(p.leap, null);
    assert.equal(p.held?.kind, 'sand', 'taken where he lands');
  }));

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

test('sunk in quicksand he is drawn lower, his feet cut, so they stay at the sand; the Darkwood draws him whole', () =>
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
    p.held = { kind: 'sand', t: 1, max: QUICKSAND.hold };
    g.placePlayer(g.cam);
    const sunk = p._rect, cut = Math.round(QUICKSAND.sink * S);
    assert.equal(sunk[8], QUICKSAND.sink);
    assert.equal(sunk[1], whole[1] + cut, 'drawn lower');
    ({ ctx, calls } = recorder());
    g.drawHero(ctx, g.cam);
    const img = sunk[6], drawn = calls.find((c) => c[0] === 'drawImage' && c[1] === img);
    assert.deepEqual(drawn.slice(2), [0, 0, img.width, img.height - QUICKSAND.sink, sunk[0], sunk[1], sunk[2], sunk[3] - cut], 'his feet cut');
    assert.ok(calls.some((c) => c[0] === 'ellipse'), "the hold's clock round his feet");
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
    // Down a crypt's steps: every hold of the ground left up here.
    const set = () => {
      p.held = { kind: 'sand', t: 2, max: QUICKSAND.hold };
      p.sandFree = 1;
      p.frostFree = 1;
      p.slide = { x: 1, y: 0 };
      p.onIce = true;
    };
    const clear = (where) => assert.deepEqual([p.held, p.sandFree, p.frostFree, p.slide, p.onIce], [null, 0, 0, null, false], where);
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
