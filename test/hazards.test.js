// What a Survival map's sky does to the fight (game/hazards, 28 October 2026). The owner's words that
// day: the Sunscorch's "weather is clear or has duststorm with effect reduced visibility", the
// Frostfell's "Weather is snow blizzard, gusts here and there freeze monsters or hero". A gust gathers
// where it can be seen, then freezes the horde in it and the hero (who has a grace after), on its own
// dice; the duststorm hides what is beyond the hero's clear sight but its marker; and the maps without
// hazards (the Darkwood, the Abyss) have none of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { BIOMES } = await mod('public/js/game/biomes.js');
const { makeHazards, Hazards } = await mod('public/js/game/hazards/index.js');
const { Gusts, BLAST, CLEAR } = await mod('public/js/game/hazards/gusts.js');
const { Haze } = await mod('public/js/game/hazards/haze.js');
const { FROST } = await mod('public/js/game/player.js');
const { Weather } = await mod('public/js/game/weather.js');
const { input } = await mod('public/js/engine/input.js');
const { view } = await mod('public/js/engine/view.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

const DT = 1 / 30;
const meta = P.metaBonuses(P.defaultProfile());
const SPEC = BIOMES.frozen.hazards.gusts;

// A headless night (the Darkwood's unless a map is named), the hero untouchable and still, nothing
// sent at him, the shrines and crypts by the start out of the way.
function gameCase(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed ?? 4242);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', map: o.map, meta, settings: { numbers: false }, crypts: false, headless: true });
    g.player.devGod = true;
    g.spawner.update = () => {};
    g.shrines.length = 0;
    g.crypts.length = 0;
    g.grid.rebuild(g.enemies, g.player.x, g.player.y);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// The gusts' clock run on by hand: the day's clock, the weather (or `w` of the gusts' key held), the gusts.
function blow(g, G, secs, w = null) {
  for (let i = 0; i < Math.round(secs / DT); i++) {
    g.time += DT;
    if (w === null) g.weather.update(DT);
    else g.weather.now[SPEC.key] = w;
    G.update(DT);
  }
}

test('no hazards where the look names none: the Darkwood, the Abyss, a night without a map', () =>
  gameCase((g) => {
    assert.equal(g.hazards, null, 'a night without a map is the Darkwood');
    assert.equal(makeHazards(g, BIOMES.forest), null);
    assert.equal(makeHazards(g, BIOMES.hell), null);
    if (!BIOMES.meadow.hazards) assert.equal(makeHazards(g, BIOMES.meadow), null);
    assert.equal(makeHazards(g, null), null);
    assert.ok(makeHazards(g, BIOMES.frozen) instanceof Hazards);
    assert.ok(makeHazards(g, BIOMES.frozen).list[0] instanceof Gusts, 'the Frostfell: gusts');
    assert.ok(makeHazards(g, BIOMES.desert).list[0] instanceof Haze, 'the Sunscorch: the dust haze');
  }));

test("the Frostfell's night brings its gusts, the Sunscorch's its haze", () => {
  gameCase((g) => {
    assert.ok(g.hazards instanceof Hazards);
    assert.equal(g.hazards.list[0].s, SPEC, "the look's numbers");
  }, { map: 'frozen' });
  gameCase((g) => assert.ok(g.hazards.list[0] instanceof Haze), { map: 'desert' });
});

test('no gust before two minutes; then as often as the weather blows, never more than `most` gathering', () =>
  gameCase((g) => {
    const G = new Gusts(g, SPEC);
    blow(g, G, SPEC.after - 1, 1);
    assert.equal(G.made, 0, 'none in the first two minutes, a blizzard or not');
    blow(g, G, 60, 1);
    // A blizzard's: one every 5 to 11 s.
    assert.ok(G.made >= 4 && G.made <= 13, `${G.made} in a minute of blizzard`);
    let most = 0;
    const was = G.made;
    for (let i = 0; i < 600; i++) {
      g.time += DT;
      G.update(DT);
      most = Math.max(most, G.gathering);
    }
    assert.ok(most <= SPEC.most);
    // Under a clear sky twenty times rarer.
    const calm = new Gusts(g, SPEC);
    blow(g, calm, 60, 0);
    assert.ok(calm.made <= 1, 'next to none under a clear sky');
    assert.ok(G.made > was);
  }));

test('the same seed brings the same gusts to the same places', () => {
  const run = () =>
    gameCase((g) => {
      // Under the Frostfell's own sky, forecast from the run's seed.
      g.weather = new Weather(g, BIOMES.frozen.weather);
      const G = new Gusts(g, SPEC), out = [];
      const launch = G.launch.bind(G);
      G.launch = () => {
        const q = launch();
        if (q) out.push([+g.time.toFixed(4), q.x, q.y, q.r]);
        return q;
      };
      blow(g, G, 300);
      return out;
    }, { seed: 7 });
  const a = run();
  assert.ok(a.length > 0, 'some came');
  assert.ok(a.every(([t]) => t >= SPEC.after));
  assert.deepEqual(run(), a);
});

test('a gust gathers 1.2 s, then freezes the horde in it 3 s, slows a boss, and freezes the hero 1.5 s, his grace after', () =>
  gameCase((g, p) => {
    const G = new Gusts(g, SPEC), x = p.x, y = p.y;
    const boss = g.spawnBoss('butcher', x - 15, y + 5);
    const foe = g.spawnEnemy('skeleton', x + 12, y, { instant: true, always: true });
    const far = g.spawnEnemy('skeleton', x + 200, y, { instant: true, always: true });
    g.grid.rebuild(g.enemies, x, y);
    G.list.push({ x, y, r: 40, t: 0, seed: 1, blown: false });
    let t = 0;
    while (!G.list[0].blown && t < 5) {
      G.update(DT);
      t += DT;
    }
    assert.ok(Math.abs(t - SPEC.tell) <= DT + 1e-9, `blew after ${t.toFixed(3)} s`);
    assert.ok(foe.freezeT >= SPEC.foes - 1e-9, 'the skeleton in it frozen');
    assert.equal(far.freezeT, 0, 'the one outside it not');
    assert.ok(boss.slowT >= SPEC.foes - 1e-9 && boss.slowF >= 0.6, 'the boss slowed');
    assert.ok(!(boss.freezeT > 0), 'never frozen');
    assert.equal(p.held?.kind, 'frost', 'the hero frozen');
    assert.equal(p.held.max, SPEC.hero);
    // Its ring thrown out, then gone.
    G.update(BLAST);
    assert.equal(G.list.length, 0);
    // Frozen 1.5 s, then his grace: another blast on him takes him not.
    let n = 0;
    while (p.held && n < 200) {
      p.update(DT);
      n++;
    }
    assert.ok(Math.abs(n * DT - FROST.hold) <= 2 * DT);
    G.list.push({ x: p.x, y: p.y, r: 40, t: SPEC.tell - 1e-6, seed: 2, blown: false });
    G.update(DT);
    assert.equal(p.held, null, 'not in his grace');
    for (let i = 0; i < Math.ceil(FROST.grace / DT) + 1; i++) p.update(DT);
    G.list.push({ x: p.x, y: p.y, r: 40, t: SPEC.tell - 1e-6, seed: 3, blown: false });
    G.update(DT);
    assert.equal(p.held?.kind, 'frost', 'after it, frozen again');
  }));

test('none in a crypt, what was gathering let go; none aimed at a hero held, sliding or on ice', () =>
  gameCase((g, p) => {
    const H = makeHazards(g, BIOMES.frozen), G = H.list[0];
    g.time = 200;
    g.weather.now[SPEC.key] = 1;
    G.list.push({ x: p.x + 300, y: p.y, r: 40, t: 0, seed: 1, blown: false });
    g.inCrypt = { key: '2,0' };
    for (let i = 0; i < 1800; i++) H.update(DT);
    assert.equal(G.made, 0, 'none made below');
    assert.equal(G.list.length, 0, 'the one gathering gone');
    g.inCrypt = null;
    for (let i = 0; i < 1800; i++) H.update(DT);
    assert.ok(G.made > 0, 'back up, they blow again');
    // Aimed every time (aim 1): at his feet while he stands on his own, never while he can't step away.
    const A = new Gusts(g, { ...SPEC, aim: 1 });
    p.clearTerrain();
    const q = A.launch();
    assert.deepEqual([q.x, q.y], [p.x, p.y], 'at his feet');
    for (const [what, set] of [['held', () => (p.held = { kind: 'frost', t: 9, max: 9 })], ['sliding', () => (p.slide = { x: 1, y: 0 })], ['on ice', () => (p.onIce = true)]]) {
      p.clearTerrain();
      set();
      for (let i = 0; i < 40; i++) {
        const s = A.launch();
        if (s) assert.ok(Math.hypot(s.x - p.x, s.y - p.y) >= s.r + p.r + 8, `never over him ${what}`);
      }
    }
    p.clearTerrain();
  }));

test('no gust by a crypt door or a shrine', () =>
  gameCase((g, p) => {
    const A = new Gusts(g, { ...SPEC, aim: 1 });
    g.crypts.push({ key: '2,0', x: p.x + 20, y: p.y - 30, depth: 1, crypt: true });
    g.shrines.push({ x: p.x - 150, y: p.y + 40, type: 'fury', used: false, shrine: true });
    for (let i = 0; i < 200; i++) {
      const q = A.launch();
      if (!q) continue;
      for (const o of [...g.crypts, ...g.shrines]) assert.ok(Math.hypot(q.x - o.x, q.y - o.y) >= CLEAR + q.r - 1e-9, 'its edge kept off');
    }
  }));

test('the gusts draw on no Math.random', () =>
  gameCase((g) => {
    const G = new Gusts(g, { ...SPEC, tell: 1e9 }); // gathering for ever: no blast in it
    g.time = SPEC.after;
    const random = Math.random;
    let calls = 0;
    Math.random = () => (calls++, random());
    try {
      for (let i = 0; i < 9000; i++) {
        g.time += DT;
        g.weather.now[SPEC.key] = 1;
        G.update(DT);
      }
    } finally {
      Math.random = random;
    }
    assert.ok(G.made > 0, 'gusts came');
    assert.equal(calls, 0);
  }));

test("the Sunscorch's duststorm: clear sight 120 px round him while it is thick, the sand drawn only while it blows", () =>
  gameCase((g, p) => {
    const recorder = () => {
      const calls = [];
      const ctx = new Proxy({}, { get: (t, k) => (...a) => calls.push([k, ...a]), set: (t, k, v) => (calls.push(['=' + String(k), v]), true) });
      return { ctx, calls };
    };
    // A 1080p screen, so the sand has a screen to cover.
    const was = [view.pxW, view.pxH];
    view.pxW = 1920;
    view.pxH = 1080;
    g.syncCam();
    g.snapCam();
    const skies = BIOMES.desert.weather.skies;
    assert.deepEqual(Object.keys(skies).sort(), ['clear', 'duststorm'], 'clear or a duststorm');
    assert.deepEqual([skies.clear.murk, skies.duststorm.murk], [0, 1]);
    const H = g.hazards;
    g.weather.now.murk = 1;
    assert.equal(H.hazeR, 120, 'at its height');
    g.weather.now.murk = 0.3;
    assert.equal(H.hazeR, null, 'thin');
    g.weather.now.murk = 0;
    assert.equal(H.hazeR, null, 'clear');
    let { ctx, calls } = recorder();
    H.drawOverlay(ctx, g.cam);
    assert.equal(calls.length, 0, 'nothing drawn under a clear sky');
    g.weather.now.murk = 1;
    ({ ctx, calls } = recorder());
    H.drawOverlay(ctx, g.cam);
    assert.ok(calls.some((c) => c[0] === 'drawImage') && calls.some((c) => c[0] === 'fillRect'), 'the sand round his clear sight');
    assert.ok(calls.some((c) => c[0] === '=globalAlpha' && Math.abs(c[1] - BIOMES.desert.hazards.haze.alpha) < 1e-9));
    // Nor in a crypt, where the forest waits.
    g.inCrypt = { key: '2,0' };
    assert.equal(H.hazeR, null);
    ({ ctx, calls } = recorder());
    H.drawOverlay(ctx, g.cam);
    assert.equal(calls.length, 0);
    g.inCrypt = null;
    // The HUD: a shrine on the screen 200 px off shows its marker where it stands while the sand
    // hides it, none when the sky is clear, none for one inside his clear sight.
    g.snapCam();
    g.shrines.length = 0;
    g.crypts.length = 0;
    g.pickups.length = 0;
    g.warnings.length = 0;
    const shrine = { x: p.x + 200, y: p.y, type: 'fury', used: false, t: 0, shrine: true, key: 'test' };
    g.shrines.push(shrine);
    const icons = () => {
      const r = recorder();
      g.hud.drawIndicators(r.ctx, 480, 270, 1);
      return r.calls.filter((c) => c[0] === 'drawImage').length;
    };
    g.weather.now.murk = 1;
    assert.equal(icons(), 1, 'hazed: its marker where it stands');
    shrine.x = p.x + 100;
    assert.equal(icons(), 0, 'within his clear sight: none');
    shrine.x = p.x + 200;
    g.weather.now.murk = 0;
    assert.equal(icons(), 0, 'clear: none, as ever');
    [view.pxW, view.pxH] = was;
  }, { map: 'desert' }));

test('the gusts and the haze draw without a hitch, and nothing of them in the Darkwood', () => {
  gameCase((g, p) => {
    const ctx = document.createElement('canvas').getContext('2d');
    const G = g.hazards.list[0];
    G.list.push({ x: p.x + 30, y: p.y, r: 40, t: 0.6, seed: 5, blown: false }, { x: p.x - 30, y: p.y, r: 36, t: SPEC.tell + 0.1, seed: 6, blown: true });
    g.hazards.drawGround(ctx, g.cam);
    g.hazards.drawOver(ctx, g.cam);
    g.hazards.drawOverlay(ctx, g.cam);
  }, { map: 'frozen' });
  gameCase((g) => {
    assert.equal(g.hazards, null);
    g.hud.drawIndicators(document.createElement('canvas').getContext('2d'), 480, 270, 0);
    assert.equal(g.hud.hazeR, null, 'no haze for the HUD');
  });
});
