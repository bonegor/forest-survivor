// Making less garbage each frame (tools/perf.mjs measures it) changed how things are worked out,
// not what they do. What they do is pinned here as data recorded on 16 October 2026, when the new
// code still matched the old pixel for pixel: the HUD's orbs and edge arrows, monster headings
// (world.steer, wander), where a monster, a pickup and the Guardian Blades are drawn. Monsters
// move the same whether a heading's pair is read at once or copied (steer's contract), Arrow
// Storm's arrows fall on the foes on screen and strike what they land on, and a burst without
// options is one with empty ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { Enemy } = await mod('public/js/game/enemies.js');
const { Pickup } = await mod('public/js/game/pickups.js');
const { Forest } = await mod('public/js/game/forest.js');
const { Dungeon } = await mod('public/js/game/dungeon.js');
const { Orbit, ArrowRain } = await mod('public/js/game/effects.js');
const { Particles, PC, P } = await mod('public/js/game/particles.js');
const { glow, shadowSprite } = await mod('public/js/game/fxsprites.js');
const { input } = await mod('public/js/engine/input.js');
const { view } = await mod('public/js/engine/view.js');
const { mulberry32, rand, TAU } = await mod('public/js/engine/util.js');
const Prof = await mod('public/js/shared/profile.js');

// A 1080p screen, so what is drawn is on it.
view.pxW = 1920;
view.pxH = 1080;

// What the code gave on 16 October 2026 (see the top), and the same as the code before the change.
const FIX = {
  orbs: ["d293ac53ea82f2df","224bd7966553e103","8c338af70924272d","3f8997b362031117","65835f9326b14d84","5eb7a4b2288f8e08"],
  // Each arrow: [x, y, angle, colour], at two moments.
  arrows: [
    [
      [466,150,0.018053594,"#e43b44"], [14,142,-3.121952322,"#feae34"], [240,52,-1.570796327,"#feae34"], [336,240,0.773807534,"#feae34"],
      [466,142,-0.019640331,"#fee761"], [240,52,-1.570796327,"#fee761"], [144,240,2.36778512,"#fee761"],
    ],
    [
      [465,150,0.018053594,"#e43b44"], [15,142,-3.121952322,"#feae34"], [240,53,-1.570796327,"#feae34"], [335,239,0.773807534,"#feae34"],
      [465,142,-0.019640331,"#fee761"], [240,53,-1.570796327,"#fee761"], [145,239,2.36778512,"#fee761"],
    ],
  ],
  headings: {
    forest: [[0.6,0.8],[0,0],[0.9958750466774561,-0.09073528203061267]],
    // From each floor tile, row by row: toward the hero, then toward (40, 40).
    dungeon: [
      [-0.16439898730535732,0.986393923832144], [0.6489466060827497,0.7608339519590859],
      [-0.9945054529214061,0.10468478451804275], [0.35713746626659143,0.9340518348510853],
      [-0.9945054529214061,0.10468478451804275], [-0.08789381029635715,0.996129850025381],
      [-0.9945054529214061,0.10468478451804275], [-0.48782135766494206,0.8729434821372647],
      [-0.9945054529214061,0.10468478451804275], [-0.7172793808592269,0.696785684263249],
      [-0.7259526839058266,0.6877446479107832], [-0.8320502943378436,0.5547001962252291],
      [-0.16439898730535732,0.986393923832144], [0.8496401661981191,0.5273628617781428],
      [-0.16439898730535732,0.986393923832144], [-0.8892878023181471,0.45734801262076136],
      [-0.7259526839058266,0.6877446479107832], [-0.9429903335828894,0.3328201177351374],
      [-0.08789381029635715,0.996129850025381], [0.9976303284229832,0.06880209161537815],
      [-0.9945054529214061,0.10468478451804275], [0.9883716976506173,0.15205718425394113],
      [-0.9945054529214061,0.10468478451804275], [-0.8320502943378436,0.554700196225229],
      [-0.16439898730535732,0.986393923832144], [-0.9983713344239766,0.057049790538512946],
      [-0.7259526839058266,0.6877446479107832], [-0.9992319507315425,0.039185566695354605],
      [-0.16439898730535732,0.986393923832144], [0.9005516363645786,-0.43474906583117584],
      [-0.16439898730535732,0.986393923832144], [-0.20952908873087348,-0.9778024140774096],
      [-0.7259526839058266,0.6877446479107832], [-0.805055837353368,-0.5931990380498502],
      [-0.7259526839058266,0.6877446479107832], [-0.9284766908852591,-0.37139067635410367],
      [-0.7259526839058266,0.6877446479107832], [-0.9643261479171182,-0.2647169817811697],
      [-0.8320502943378436,0.554700196225229], [0.695022096847475,-0.718988376049112],
      [-0.9945054529214061,0.10468478451804275], [0.3976074376343004,-0.9175556253099241],
      [-0.9983713344239766,0.057049790538512946], [-0.09950371902099892,-0.9950371902099892],
      [-0.9945054529214061,0.10468478451804275], [-0.5350520811843447,-0.8448190755542284],
      [-0.9945054529214061,0.10468478451804275], [-0.7592566023652967,-0.6507913734559686],
      [-0.9945054529214061,0.10468478451804275], [-0.8619342151577696,-0.5070201265633939],
    ],
    // Every 100 steps: x, y, and the spot it strolls to and for how long yet.
    stroll: [
      [30.58088111092715,-25.783904096923386,51.48625290461153,-43.41001825248584,0.758719733823095],
      [66.25833224340568,-35.46662204963341,109.42952735074329,-31.684446153347118,2.4730524089187416],
      [105.30727964804557,-32.01681706126664,33.30575732511461,-33.14468200177747,2.4589812946505845],
      [65.31218625101106,-32.64331858761838,33.30575732511461,-33.14468200177747,0.7923146279839223],
      [60.40791752646716,-16.924881468657347,77.7923759276111,3.111608162079932,1.5174106057112446],
      [92.13143672381288,-3.474427031038287,109.93612052424334,-7.4752965097055455,2.004226511996242],
    ],
  },
  monsterRects: [
    [1007.3600000000001,516.64,54.400000000000006,64],
    [1007.3600000000001,516.64,54.400000000000006,64],
    [834.88,468.9771835766289,51.2,28.8],
    [834.88,465.4475841255709,51.2,28.8],
  ],
  pickupRects: [
    [994,461,43.2,43.2,1],
    [819,576,22.400000000000002,22.400000000000002,1],
    [994,466,43.2,43.2,0],
  ],
  // For each of three rings of blades: every drawImage (x, y, w, h) and alpha set, in order; then the lights.
  orbit: [
    [
      1, 0.22, [1011,582,79,79], 0.22, [992,593,79,79], 1, [970,601,79,79],
      0.22, [836,586,79,79], 0.22, [818,573,79,79], 1, [802,558,79,79], 0.22,
      [777,446,79,79], 0.22, [786,427,79,79], 1, [798,409,79,79], 0.22, [916,355,79,79],
      0.22, [940,356,79,79], 1, [963,360,79,79], 0.22, [1061,439,79,79], 0.22,
      [1067,458,79,79], 1, [1069,478,79,79], 1, 0.45, [974.0578071487398,605.1795019640637,70.4,70.4], [806.2251882696022,562.3720129829242,70.4,70.4],
      [802.2589289922547,413.4682114441317,70.4,70.4], [967.6402648297968,364.24809002022863,70.4,70.4], [1073.8178107596063,482.73218358865194,70.4,70.4], 1,
    ],
    3,
    [
      1, 0.22, [1034,399,79,79], 0.22, [1048,416,79,79], 1, [1059,434,79,79],
      0.22, [1047,548,79,79], 0.22, [1033,564,79,79], 1, [1016,578,79,79], 0.22,
      [885,604,79,79], 0.22, [863,598,79,79], 1, [841,589,79,79], 0.22, [772,491,79,79],
      0.22, [772,471,79,79], 1, [776,451,79,79], 0.22, [864,364,79,79], 0.22,
      [887,358,79,79], 1, [910,355,79,79], 1, 0.45, [1063.046224972983,438.2307238700047,70.4,70.4], [1020.5214432020298,582.720065811289,70.4,70.4],
      [845.712880378064,592.9927777909986,70.4,70.4], [780.2000287992848,454.85232100981295,70.4,70.4], [914.5194226476381,359.20411151789483,70.4,70.4], 1,
    ],
    3,
    [
      0.3999999999999986, 0.08799999999999969, [779,441,79,79], 0.08799999999999969, [788,423,79,79], 0.3999999999999986, [801,405,79,79],
      0.08799999999999969, [922,355,79,79], 0.08799999999999969, [945,356,79,79], 0.3999999999999986, [968,361,79,79], 0.08799999999999969,
      [1063,443,79,79], 0.08799999999999969, [1068,463,79,79], 0.3999999999999986, [1070,483,79,79], 0.08799999999999969, [1007,584,79,79],
      0.08799999999999969, [987,595,79,79], 0.3999999999999986, [965,602,79,79], 0.08799999999999969, [832,583,79,79], 0.08799999999999969,
      [814,570,79,79], 0.3999999999999986, [799,554,79,79], 1, 0.17999999999999935, [805.3847372410362,409.7750156751746,70.4,70.4], [972.7384725845575,365.6337270222061,70.4,70.4],
      [1073.8428681849753,487.28175012090077,70.4,70.4], [968.9750857345276,606.6056517130949,70.4,70.4], [803.0588362549031,558.7038554686238,70.4,70.4], 1,
    ],
    3,
  ],
};
const fixture = (name, got) => assert.deepEqual(got, FIX[name], name);

// An unkillable knight, standing still; quiet: unarmed and with no spawner, only what a test puts there.
function game(fn, { mode = 's15', seed = 11, crypts = false, quiet = true } = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode, meta: Prof.metaBonuses(Prof.defaultProfile()), settings: { numbers: false }, crypts });
    g.player.devGod = true;
    if (quiet) {
      g.spawner.update = () => {};
      g.player.weapons.length = 0;
    }
    g.syncCam();
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// A 2D context that writes down every call and every setting, in order.
function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (t, k) => (...a) => calls.push([k, ...a]),
    set: (t, k, v) => (calls.push(['=' + String(k), v]), true),
  });
  return { ctx, calls };
}
// The numbers of every drawImage call (where and how big), and every alpha set, in order.
const blits = (calls) => calls.filter((c) => c[0] === 'drawImage' || c[0] === '=globalAlpha').map((c) => (c[0] === 'drawImage' ? c.slice(2) : c[1]));

// ------------------------------------------------------------------- HUD orbs --

// Each orb at a fill, a moment, glowing or not; and its pixels' digest.
const ORBS = [['hp', 1, 0, false], ['hp', 0.5, 12.345, false], ['hp', 0, 1.7, false], ['fury', 0.2, 600.5, true], ['furyFull', 1, 3599.9, true], ['fury', 1.3, 33.3, false]];
const digest = (px) => createHash('sha256').update(px).digest('hex').slice(0, 16);

test('the HUD orbs paint what they painted: glass, liquid, waves, bubbles, sheen and glow', () =>
  game((g) => {
    fixture('orbs', ORBS.map(([orb, fill, t, glowing]) => {
      const o = g.hud[orb];
      o.shown = fill;
      o.render(fill, t, glowing);
      return digest(o.img.data);
    }));
    // And the liquid moves from frame to frame.
    const o = g.hud.hp, at = (t) => (o.render(0.5, t, false), digest(o.img.data));
    assert.notEqual(at(5), at(5 + 1 / 60));
  }));

// ------------------------------------------------------------- HUD edge arrows --

test('the HUD arrows at the screen edge point where they pointed, in the same order', () =>
  game((g, p) => {
    // A boss, chests and thieves off screen every way, and one of each on screen (no arrow); the
    // map's own shrines and crypts left out.
    g.shrines.length = 0;
    g.crypts.length = 0;
    g.spawnBoss('butcher', p.x + 900, p.y + 40);
    for (const [dx, dy] of [[-700, 0], [0, -500], [600, 600], [30, 20]]) {
      g.addPickup('chest', p.x + dx, p.y + dy);
      g.spawnEnemy('thief', p.x - dx, p.y + dy, { instant: true });
    }
    // Each arrow: where it stands, which way it points, its colour.
    const arrows = (t) => {
      const { ctx, calls } = recorder(), out = [];
      g.hud.drawIndicators(ctx, 480, 270, t);
      for (const c of calls) {
        if (c[0] === 'translate') out.push([c[1], c[2]]);
        else if (c[0] === 'rotate') out.at(-1).push(+c[1].toFixed(9));
        else if (c[0] === '=fillStyle' && c[1] !== '#181425') out.at(-1).push(c[1]);
      }
      return out;
    };
    fixture('arrows', [0, 1.7].map(arrows));
  }));

// ---------------------------------------------------------- monster headings --

// A little floor plan (1 a wall), the hero in its bottom-left corner, and its flow field: steps
// from him round the walls, by a plain breadth-first walk.
const PLAN = ['000000', '011100', '000100', '010000', '000000'];
function plan(hx, hy) {
  const W = PLAN[0].length, H = PLAN.length, flow = new Int16Array(W * H).fill(-1);
  const blocked = (tx, ty) => tx < 0 || ty < 0 || tx >= W || ty >= H || PLAN[ty][tx] === '1';
  const queue = [[hx, hy]];
  flow[hy * W + hx] = 0;
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (blocked(nx, ny) || flow[ny * W + nx] >= 0) continue;
      flow[ny * W + nx] = flow[y * W + x] + 1;
      queue.push([nx, ny]);
    }
  }
  const hero = { x: hx * 16 + 8, y: hy * 16 + 8 };
  return { W, H, flow, blocked, hero, g: { player: hero } };
}

test('world.steer and wander give the headings they gave', () => {
  // Out in the forest, straight at the target, whatever it is.
  const fsteer = Forest.prototype.steer;
  const forest = [[{ x: 0, y: 0 }, { x: 30, y: 40 }], [{ x: 5, y: 5 }, { x: 5, y: 5 }], [{ x: -12.5, y: 7 }, { x: 100, y: -3.25 }]].map(([e, t]) => [...fsteer.call(null, e, t)]);
  // Below ground, down the flow field round the walls, from every floor tile; straight at him
  // within two steps; and straight at anything else.
  const w = plan(0, 4), dsteer = Dungeon.prototype.steer, dungeon = [];
  for (let ty = 0; ty < w.H; ty++) {
    for (let tx = 0; tx < w.W; tx++) {
      if (w.blocked(tx, ty)) continue;
      const e = { x: tx * 16 + 11, y: ty * 16 + 6 };
      dungeon.push([...dsteer.call(w, e, w.hero)], [...dsteer.call(w, e, { x: 40, y: 40 })]);
    }
  }
  // A stroll on seeded dice, on a floor open only some ways.
  const ww = { free: (x, y) => x > -40 && y < 60, lineOfSight: () => true }, e = { x: 0, y: 0, data: {} };
  const random = Math.random, stroll = [];
  try {
    Math.random = mulberry32(100);
    for (let i = 0; i < 600; i++) {
      const d = Dungeon.prototype.wander.call(ww, e, 1 / 60);
      e.x += d[0] * 0.4;
      e.y += d[1] * 0.4;
      if (i % 100 === 99) stroll.push([e.x, e.y, e.data.wx, e.data.wy, e.data.wt]);
    }
  } finally {
    Math.random = random;
  }
  fixture('headings', { forest, dungeon, stroll });
});

// Every kind of monster that steers, charges or shoots, round the hero: for 3 s in the forest, and
// for 5 s in a crypt (where they stroll until they see him, then follow its flow field). With `fresh`
// every heading is copied as it comes: any code keeping a pair across another call (steer,
// wander, a charger's or a caster's) would move differently.
const KINDS = ['rat', 'skeleton', 'bat', 'slime', 'spider', 'ghost', 'wolf', 'orc', 'cultist', 'skeletonarcher', 'thief'];
function trace(where, fresh) {
  const proto = Enemy.prototype, charger = proto.charger, caster = proto.caster;
  return game((g, p) => {
    if (where === 'crypt') {
      g.world.syncShrines();
      g.enterCrypt(g.crypts.find((d) => d.key === '0,0'));
      for (let i = 0; i < 300 && !(g.inCrypt && g.state === 'play'); i++) g.update(1 / 60);
      assert.ok(g.inCrypt, 'in a crypt');
    }
    for (const e of g.enemies) if (!e.boss && !e.prop && !e.lord) e.dead = true;
    g.update(1 / 60);
    const w = g.world;
    if (fresh) {
      const steer = w.steer, wander = w.wander;
      w.steer = function (e, t, f) {
        return steer.call(this, e, t, f).slice();
      };
      if (wander) {
        w.wander = function (e, dt) {
          return wander.call(this, e, dt).slice();
        };
      }
      proto.charger = function (dt) {
        return charger.call(this, dt).slice();
      };
      proto.caster = function (dt) {
        return caster.call(this, dt).slice();
      };
    }
    try {
      KINDS.forEach((type, i) => {
        for (const R of [70, 140]) {
          const a = (i / KINDS.length) * TAU + R;
          const at = w.freeSpot(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R * 0.8);
          if (at) g.spawnEnemy(type, at.x, at.y, { instant: true, hpMul: 1e6 });
        }
      });
      const out = [];
      for (let i = 0, n = where === 'crypt' ? 5 * 60 : 3 * 60; i < n; i++) {
        // The hero strolls a little circle, so the thief runs and the chargers aim anew.
        input.bot = { x: Math.cos(i / 30) * 0.5, y: Math.sin(i / 30) * 0.5 };
        g.update(1 / 60);
        if (i % 30 === 29) for (const e of g.enemies) if (!e.prop) out.push(e.type, e.x, e.y, e.state, e.dead);
      }
      return out;
    } finally {
      proto.charger = charger;
      proto.caster = caster;
    }
  }, { crypts: where === 'crypt' });
}

test("a heading's pair is read at once: monsters move as they would with a fresh one each call", () => {
  for (const where of ['forest', 'crypt']) {
    const now = trace(where, false), copied = trace(where, true);
    assert.ok(now.length > 10 * 5 * 6, `${where}: monsters to follow`);
    assert.deepEqual(now, copied, where);
  }
});

// ------------------------------------------------------------ drawn rectangles --

test('a monster is drawn where it was, its glow over it, and a pooled one has no rectangle', () =>
  game((g, p) => {
    const c = g.cam;
    const sk = g.spawnEnemy('skeleton', p.x + 23.3, p.y + 11.7, { instant: true });
    const bat = g.spawnEnemy('bat', p.x - 31.1, p.y - 7.9, { instant: true });
    const rects = [];
    for (const [e, face] of [[sk, 1], [sk, -1], [bat, 1], [bat, -1]]) {
      e.face = face;
      e.flash = 0;
      e.shake = 0;
      e.life += 0.37;
      const { ctx, calls } = recorder();
      e.draw(ctx, c);
      const r = e._rect.slice(0, 4), at = r.map(Math.round), fr = e.spr.frames[e.frameIndex()];
      rects.push(r);
      assert.deepEqual(calls.at(-1), ['drawImage', fr.get(face < 0), ...at], `${e.type}: drawn at its rectangle`);
      const em = recorder();
      e.drawEmissive(em.ctx, c);
      if (fr.em) assert.deepEqual(em.calls.find((k) => k[0] === 'drawImage'), ['drawImage', face < 0 ? fr.emf : fr.em, ...at], `${e.type}: its glow over it`);
    }
    fixture('monsterRects', rects);
    sk.dead = true;
    g.update(1 / 60);
    assert.ok(!sk._rect, 'pooled: no rectangle');
  }));

test('a pickup is drawn where it was, with its shadow and glow, and has no rectangle off screen', () =>
  game((g, p) => {
    const c = g.cam;
    const gem = new Pickup(g, 'gem', p.x + 17.25, p.y - 9.5, 30, { pop: false });
    const coin = new Pickup(g, 'coin', p.x - 40.5, p.y + 20.25, 1, { pop: false });
    const rects = [];
    for (const pk of [gem, coin, gem]) {
      pk.t += 0.37;
      const { ctx, calls } = recorder();
      pk.draw(ctx, c);
      const r = [...pk._rect], frame = pk.sprite.frames[r[4]], drawn = calls.filter((q) => q[0] === 'drawImage');
      rects.push(r);
      assert.equal(drawn[0][1], shadowSprite(pk.kind === 'gem' ? 7.5 : 6), `${pk.kind}: its shadow`);
      assert.deepEqual(drawn[1], ['drawImage', frame.c, ...r.slice(0, 4)], `${pk.kind}: drawn at its rectangle`);
      const gl = recorder();
      pk.drawGlow(gl.ctx, c);
      assert.equal(gl.calls.find((q) => q[0] === 'drawImage')[1], glow(pk.glowColor), `${pk.kind}: its glow`);
      const em = recorder();
      pk.drawEmissive(em.ctx);
      if (frame.em) assert.deepEqual(em.calls.at(-1), ['drawImage', frame.em, ...r.slice(0, 4)]);
    }
    fixture('pickupRects', rects);
    gem.x += 5000;
    gem.draw(recorder().ctx, c);
    assert.equal(gem._rect, null, 'off screen: none');
  }));

// -------------------------------------------------------------- effects --

test('the Guardian Blades draw where they drew: blades, ghosts, glow and lights', () =>
  game((g) => {
    const out = [];
    for (const [block, ang, t] of [[0, 1.234, 1], [1, 5.9, 3.3], [0, -2.5, 5.9]]) {
      const w = { s: { amount: 5, area: 1.37, speed: 1.2, dur: 6, block, dmg: 1, tick: 0.3, kb: 1 }, src: 0 };
      const orbit = new Orbit(g, w);
      orbit.ang = ang;
      orbit.t = t;
      const { ctx, calls } = recorder(), lit = g.lighting.n;
      orbit.draw(ctx, g.cam);
      orbit.drawGlow(ctx, g.cam);
      assert.equal(calls.filter((c) => c[0] === 'drawImage').length, 5 * 3 + 5, 'five blades, two ghosts each, and five glows');
      out.push(blits(calls), g.lighting.n - lit);
    }
    fixture('orbit', out);
  }));

test('Arrow Storm drops its arrows on the foes on screen, and each strikes what it lands on', () => {
  const loosed = [];
  for (const dt of [1 / 60, 0.1]) {
    game((g, p) => {
      for (let i = 0; i < 40; i++) g.spawnEnemy(i % 3 ? 'skeleton' : 'zombie', p.x + rand(-250, 250), p.y + rand(-140, 140), { instant: true, hpMul: 1e6 });
      g.update(1 / 60);
      const fx = new ArrowRain(g, 2), seen = new Set();
      let struck = [];
      const hit = g.hitEnemy;
      g.hitEnemy = function (e, dmg, o) {
        struck.push(e);
        return hit.call(this, e, dmg, o);
      };
      let n = 0, hits = 0;
      for (let alive = true; alive; ) {
        const onScreen = g.enemiesOnScreen(), before = [...fx.drops];
        struck = [];
        alive = fx.update(dt);
        // Each new arrow falls on a foe on screen, give or take 4 px.
        for (const d of fx.drops) {
          if (seen.has(d)) continue;
          seen.add(d);
          n++;
          assert.ok(onScreen.some((e) => Math.abs(d.x - e.x) <= 4 && Math.abs(d.y - e.y) <= 4), 'on a foe on screen');
        }
        // Each one that lands strikes every foe it lands on, and nothing else.
        const landed = before.filter((d) => !fx.drops.includes(d));
        const under = new Set(landed.flatMap((d) => g.enemies.filter((e) => !e.dead && !e.prop && Math.hypot(e.x - d.x, e.y - d.y) <= 9 + e.r)));
        assert.deepEqual(new Set(struck), under);
        hits += struck.length;
        const { ctx, calls } = recorder();
        fx.draw(ctx, g.cam);
        assert.equal(calls.filter((c) => c[0] === 'drawImage').length, 2 * fx.drops.length, 'each arrow falling, and its shadow');
      }
      assert.ok(hits > 20, 'the storm strikes the crowd');
      loosed.push([n, dt]);
    }, { seed: 21 });
  }
  // One arrow every 0.035 s for its 2 s, however long the frames (but for the last frame's: none
  // is loosed once its time is up).
  for (const [n, dt] of loosed) assert.ok(n <= 2 / 0.035 + 1 && n >= (2 - dt) / 0.035 - 1, `${n} arrows in frames of ${dt} s`);
});

test('a burst without options is a burst with empty ones', () => {
  const a = new Particles(), b = new Particles();
  const random = Math.random;
  try {
    Math.random = mulberry32(9);
    a.burst(10, 20, 3, 12, [PC.w, PC.G], 50, 0.2, 1, P.FADE, {});
    Math.random = mulberry32(9);
    b.burst(10, 20, 3, 12, [PC.w, PC.G], 50, 0.2, 1, P.FADE);
  } finally {
    Math.random = random;
  }
  assert.equal(a.n, 12);
  for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'life', 'size', 'col', 'flags', 'drag', 'grav']) assert.deepEqual(a[k], b[k], k);
});
