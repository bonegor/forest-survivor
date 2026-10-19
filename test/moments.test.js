// The big beats get their own seconds (Game.moment): after a boss, a crypt lord or a revive no
// card, chest or gear screen opens until the beat has played out, then they come in order; a
// dropped chest is seen on the ground before it can be opened; flashes, shake and slow motion run
// out under the cards instead of freezing there; the HUD doesn't give a chest away before it is
// shown; and a fallen boss's bar holds, flashes and breaks up before the next one takes it.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { GameScreen } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile } from '../public/js/shared/profile.js';
import { rollItem } from '../public/js/shared/items.js';
import { MOMENT } from '../public/js/game/game.js';
import { CHEST_SETTLE } from '../public/js/game/pickups.js';
import { BAR_FALL } from '../public/js/game/hud.js';
import { GAME_SPEED } from '../public/js/data/difficulty.js';

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

// A seeded run on the game screen, as the browser plays it: an unkillable Knight standing still,
// no spawner. fn gets the game screen and the game.
function run(fn, seed = 3) {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(seed);
  input.bot = { x: 0, y: 0 };
  const app = {
    ui: new UI(), settings: { numbers: false }, devHold: false, choice: { hero: 'knight', mode: 's15', diff: 'medium' },
    store: { profile: defaultProfile(), submitRun: async () => ({ collected: 0, bonus: 0, total: 0, multiplier: 1 }) },
    go() {},
  };
  const gs = new GameScreen();
  try {
    gs.enter(app);
    const g = gs.game;
    g.player.devGod = true;
    g.spawner.update = () => {};
    return fn(gs, g);
  } finally {
    gs.leave();
    Math.random = random;
    input.bot = bot;
  }
}

const frame = (gs, n = 1) => {
  for (let i = 0; i < n; i++) {
    gs.frame(1 / 60);
    input.endFrame();
  }
};
const overlay = (gs) => gs.overlay?.constructor.name || null;

test('after a boss falls nothing opens for its beat; then the level-up, the chest and the gear, in that order', () =>
  run((gs, g) => {
    frame(gs, 10);
    const p = g.player;
    const boss = g.spawnBoss('boneking', p.x + 30, p.y);
    g.hitEnemy(boss, 1e9);
    assert.ok(g.momentT >= 1.2, 'a boss holds the screens back 1.2 s at least');
    assert.equal(g.momentKind, 'boss');
    // Everything waiting at once: a level, a chest, a piece of gear.
    g.pendingLevels = 1;
    g.chestQueue.push('elite');
    g.itemQueue.push(rollItem(mulberry32(4), { minute: 5 }));
    for (let f = 0; f < 72; f++) {
      frame(gs);
      assert.equal(overlay(gs), null, `nothing opens at ${((f + 1) / 60).toFixed(2)} s`);
    }
    frame(gs, 12);
    assert.equal(overlay(gs), 'LevelUpOverlay', 'the level-up first');
    // The boss's own gem may bring a level or two more: every one of them before the chest.
    while (overlay(gs) === 'LevelUpOverlay') {
      gs.overlay.choose(0);
      frame(gs, 2);
    }
    assert.equal(overlay(gs), 'ChestOverlay', 'then the chest');
    gs.overlay.t = 99; // seen to the end
    frame(gs, 2);
    input.virtual.add('back');
    frame(gs, 2);
    assert.equal(overlay(gs), 'ItemOverlay', 'then the gear');
  }));

test('a crypt lord and a revive hold the screens back too', () =>
  run((gs, g) => {
    frame(gs, 5);
    const p = g.player;
    const lord = g.spawner.spawnLord(p.x + 30, p.y);
    g.hitEnemy(lord, 1e9);
    assert.equal(g.momentKind, 'lord');
    assert.ok(Math.abs(g.momentT - MOMENT.lord) < 1e-9 && MOMENT.lord >= 0.9);
    g.momentT = 0;
    g.revive();
    assert.equal(g.momentKind, 'revive');
    assert.ok(g.momentT >= 1);
    g.pendingLevels = 1;
    frame(gs, 59);
    assert.equal(overlay(gs), null);
    frame(gs, 10);
    assert.equal(overlay(gs), 'LevelUpOverlay');
  }));

test('a dropped chest lies on the ground before it can be opened, even under the hero', () =>
  run((gs, g) => {
    assert.ok(CHEST_SETTLE / GAME_SPEED >= 0.8, 'at least 0.8 s of real time');
    const p = g.player;
    const chest = g.addPickup('chest', p.x, p.y, 0, { kind: 'elite', pop: false });
    const frames = Math.floor(CHEST_SETTLE * 60) - 1;
    for (let f = 0; f < frames; f++) chest.update(1 / 60);
    assert.ok(!chest.dead, 'still on the ground');
    assert.equal(g.chestQueue.length, 0);
    for (let f = 0; f < 3; f++) chest.update(1 / 60);
    assert.ok(chest.dead, 'then it opens');
    assert.equal(g.chestQueue.length, 1);
  }));

test('flashes, shake and slow motion run out under the cards, and the slow motion never comes back', () =>
  run((gs, g) => {
    frame(gs, 5);
    for (const open of ['level-up', 'chest']) {
      if (open === 'level-up') g.pendingLevels = 1;
      else g.chestQueue.push('elite');
      frame(gs);
      assert.equal(overlay(gs), open === 'level-up' ? 'LevelUpOverlay' : 'ChestOverlay');
      Object.assign(g, { whiteFlash: 0.6, hurtFlash: 0.35, trauma: 1, slowT: 1.1, timeScale: 0.35 });
      frame(gs, 80);
      assert.equal(g.state, open === 'level-up' ? 'levelup' : 'chest', 'still under the cards');
      assert.equal(g.whiteFlash, 0);
      assert.equal(g.hurtFlash, 0);
      assert.equal(g.trauma, 0);
      assert.equal(g.timeScale, 1, 'the slow motion ran out');
      if (open === 'level-up') gs.overlay.choose(0);
      else {
        gs.overlay.t = 99;
        frame(gs, 2);
        input.virtual.add('back');
      }
      frame(gs, 2);
      assert.equal(overlay(gs), null);
      assert.equal(g.timeScale, 1);
    }
  }));

test('the HUD shows the build as it was until the chest reveals each thing, the gold last', () =>
  run((gs, g) => {
    frame(gs, 5);
    const sword = g.player.weapons[0];
    while (sword.level < 8) sword.levelUp();
    g.addPassive('might', 1);
    const gold = g.gold;
    g.chestQueue.push('elite');
    frame(gs);
    const o = gs.overlay, hud = g.hud;
    assert.equal(overlay(gs), 'ChestOverlay');
    assert.equal(sword.def.icon, 'i_excalibur', 'given at once');
    assert.equal(hud.held.weapons[0].icon, 'i_sword', 'shown as it was');
    assert.equal(hud.held.weapons[0].w, sword);
    assert.equal(hud.held.gold, gold, 'the gold not yet counted');
    assert.ok(g.gold > gold);
    while (o.revealed < 1) frame(gs);
    assert.equal(hud.held.weapons[0].icon, 'i_excalibur', 'revealed: the evolved sword');
    assert.equal(hud.held.gold, gold);
    while (!o.goldShown) frame(gs);
    assert.equal(hud.held, null, 'all shown: the HUD shows the build as it is');
  }));

test("a fallen boss's bar holds, flashes and breaks up before the next boss still fighting takes it", () =>
  run((gs, g) => {
    const p = g.player;
    const first = g.spawnBoss('boneking', p.x + 30, p.y);
    const second = g.spawnBoss('butcher', p.x - 60, p.y);
    g.boss = first;
    // Its bar slams in after its name card (order 2 item 8, ARRIVAL.slamAt + slam): then it falls.
    frame(gs, 75);
    g.hitEnemy(first, 1e9);
    assert.equal(g.boss, second, 'the next boss is the one fighting');
    frame(gs);
    const hud = g.hud;
    assert.ok(hud.fall, 'the fallen one keeps the bar');
    const top = hud.topLines();
    const total = BAR_FALL.hold + BAR_FALL.flash + BAR_FALL.drop;
    frame(gs, Math.floor(total * 60) - 3);
    assert.ok(hud.fall, 'still breaking up');
    assert.equal(hud.topLines(), top);
    frame(gs, 6);
    assert.equal(hud.fall, null);
    assert.equal(hud.barE, second, 'then the next boss has the bar');
  }));
