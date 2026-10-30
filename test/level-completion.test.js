import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { GameScreen } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { Driver } from '../public/js/bots/driver.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { MAPS, MAP_LADDER } from '../public/js/data/maps.js';
import { ENEMIES, CRYPT_LORD } from '../public/js/data/enemies.js';
import { defaultProfile, metaBonuses, applyRun } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });
const step = (g, seconds) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60); };
const make = (o = {}) => {
  const g = new Game({ hero: 'knight', mode: 's15', diff: 'easy', map: 'forest', meta: metaBonuses(defaultProfile()), crypts: false, settings: {}, ...o });
  g.spawner.update = () => {};
  g.player.weapons.length = 0;
  return g;
};
const complete = g => {
  g.time = g.duration;
  const id = g.map.bosses.at(-1).id;
  g.killEnemy(g.spawnBoss(id, g.player.x + 100, g.player.y));
  g.update(1 / 60);
};

test('Survival requires the timer and the map’s final boss, in either order', () => {
  for (const map of Object.keys(MAPS)) {
    const g = make({ map });
    g.player.devGod = true;
    const final = g.spawnBoss(g.map.bosses.at(-1).id, g.player.x + 120, g.player.y, { sleeping: true });
    g.time = g.duration + 1;
    assert.equal(g.victory('survival'), false, `${map}: timer alone is insufficient`);
    step(g, 0.1);
    assert.equal(g.state, 'play');
    assert.equal(final.dead, false);
    g.killEnemy(final);
    step(g, 0.1);
    assert.equal(g.state, 'dawn');
    assert.equal(g.levelComplete, true);
    assert.equal(g.runReport().time, 900, 'overtime does not extend the survival-time reward');

    const early = make({ map });
    early.player.devGod = true;
    early.time = 800;
    early.killEnemy(early.spawnBoss(early.map.bosses.at(-1).id, early.player.x + 120, early.player.y));
    step(early, 0.1);
    assert.equal(early.state, 'play', `${map}: boss alone is insufficient`);
    early.time = early.duration;
    step(early, 0.1);
    assert.equal(early.levelComplete, true);
  }
  assert.equal(MAP_LADDER.at(-1).bosses.at(-1).id, 'demonlord');
});

test('an earlier boss cannot satisfy the final-boss objective and overtime remains dangerous', () => {
  const g = make();
  g.killEnemy(g.spawnBoss('boneking', g.player.x + 100, g.player.y));
  g.time = g.duration;
  step(g, 0.1);
  assert.equal(g.levelComplete, false);
  assert.equal(g.finalBossDefeated, false);
  assert.equal(g.phase, 21, 'Survival does not enter Ranked’s post-night curve');
  g.player.invuln = 0;
  assert.ok(g.player.hurt(1) > 0, 'the fight continues until the boss is slain');
});

test('completion takes priority over entering a crypt on the same frame', () => {
  const g = make(), p = g.player;
  g.time = g.duration;
  g.finalBossDefeated = true;
  g.cryptsOpen = true;
  g.crypts = [{ x: p.x, y: p.y - 4, push: 1, t: 0 }];
  let entered = false;
  g.enterCrypt = () => { entered = true; g.state = 'travel'; };
  p.vy = -20;
  input.bot = { x: 0, y: -1 };
  try { g.update(1 / 60); } finally { input.bot = null; }
  assert.equal(entered, false);
  assert.equal(g.state, 'dawn');
});

test('completion stays safe and open for loot until the player deliberately finishes', () => {
  const g = make();
  g.player.devGod = true;
  complete(g);
  g.pickups.length = 0;
  step(g, 6);
  assert.equal(g.state, 'cleared');
  assert.equal(g.result, null);
  const time = g.time, x = g.player.x;
  const coin = g.addPickup('coin', g.player.x, g.player.y, 7, { pop: false });
  input.bot = { x: 1, y: 0 };
  try { step(g, 20); } finally { input.bot = null; }
  assert.ok(g.player.x > x, 'the player can walk around');
  assert.ok(coin.dead && g.gold >= 7, 'loot can still be collected');
  assert.equal(g.time, time, 'safe collection earns no extra survival time');
  assert.equal(g.result, null, 'there is no automatic results countdown');
  g.player.devGod = false;
  assert.equal(g.player.hurt(1e9), 0, 'a completed level cannot be lost');
  assert.equal(g.finishLevel(), true);
  assert.equal(g.result.victory, true);
});

test('an unspawned final boss is retried after the timer, without more regular hordes', () => {
  const g = new Game({ hero: 'knight', mode: 's15', map: 'forest', diff: 'easy', meta: metaBonuses(defaultProfile()), settings: {} });
  g.time = g.duration;
  g.spawner.bossIdx = g.map.bosses.length - 1;
  const spawn = g.world.spawnPoint;
  g.world.spawnPoint = () => null;
  g.spawner.update(1 / 60);
  assert.equal(g.spawner.bossIdx, 2);
  g.world.spawnPoint = () => ({ x: g.player.x + 150, y: g.player.y });
  g.spawner.update(1 / 60);
  assert.equal(g.spawner.bossIdx, 3);
  assert.equal(g.enemies.filter(e => !e.prop).length, 1);
  assert.equal(g.boss.type, 'lich');
  g.world.spawnPoint = spawn;
  const jumped = new Game({ hero: 'knight', mode: 's15', map: 'forest', diff: 'easy', meta: metaBonuses(defaultProfile()), settings: {} });
  jumped.setTime(jumped.duration);
  assert.equal(jumped.spawner.bossIdx, 2, 'a clock jump preserves the required final arrival');
});

test('crypt lords have a telegraphed, faster spread attack below half health', () => {
  const g = make(), p = g.player;
  const lord = g.spawner.spawnLord(p.x + 120, p.y);
  assert.equal(lord.maxHp, ENEMIES.skeletonarcher.hp * g.diff.health * CRYPT_LORD.health);
  lord.sleeping = false;
  lord.state = 'move';
  lord.cdT = 0;
  lord.caster(0);
  assert.equal(lord.state, 'wind');
  assert.equal(g.eshots.length, 0, 'the first shot waits for its wind-up');
  lord.caster(ENEMIES.skeletonarcher.shot.wind);
  assert.equal(g.eshots.length, 1);
  assert.equal(g.eshots[0].dmg, ENEMIES.skeletonarcher.shot.dmg * CRYPT_LORD.damage);
  g.eshots.length = 0;
  lord.hp = lord.maxHp * 0.49;
  lord.cdT = 0;
  lord.caster(0);
  assert.equal(lord.lordEnraged, true);
  assert.equal(g.eshots.length, 0, 'the spread is telegraphed too');
  lord.caster(ENEMIES.skeletonarcher.shot.wind);
  assert.equal(g.eshots.length, 3);
  assert.equal(new Set(g.eshots.map(s => s.vy)).size, 3, 'the arrows spread rather than stack');
  assert.ok(lord.cdT <= ENEMIES.skeletonarcher.shot.cd * 1.2 * CRYPT_LORD.cooldown);
  const caster = g.spawnEnemy('cultist', p.x + 120, p.y, { instant: true });
  caster.hp *= 0.1;
  caster.state = 'wind';
  caster.stateT = 0;
  const before = g.eshots.length;
  caster.caster(0);
  assert.equal(g.eshots.length - before, 1, 'ordinary casters keep their original attack');
});

test('the headless driver collects clear rewards and finishes without a frozen-clock loop', () => {
  const g = make();
  g.player.devGod = true;
  complete(g);
  const driver = new Driver(g, { bot: 'idle', hz: 60 });
  driver.run(1);
  assert.equal(g.state, 'over');
  assert.equal(g.result.victory, true);
  assert.ok(g.result.gold > 0 && g.stats.chests > 0, 'the final boss chest was opened');
});

test('Dungeon victory also waits for deliberate departure, and Ranked never completes', () => {
  const dungeon = make({ mode: 'dungeon' });
  dungeon.player.devGod = true;
  dungeon.victory('dungeon');
  step(dungeon, 6);
  assert.equal(dungeon.state, 'cleared');
  assert.equal(dungeon.result, null);
  assert.equal(dungeon.finishLevel(), true);
  const ranked = make({ mode: 'ranked' });
  ranked.time = 901;
  ranked.finalBossDefeated = true;
  step(ranked, 0.1);
  assert.equal(ranked.state, 'play');
  assert.equal(ranked.levelComplete, false);
});

test('reward screens return to collection, and finishing supports keyboard and touch without Space', async () => {
  const profile = defaultProfile(), reports = [];
  const app = { choice: { hero: 'knight', mode: 's15', diff: 'easy', map: 'desert' }, settings: {}, ui: new UI(), store: { profile, submitRun: async r => { reports.push(r); return applyRun(profile, r).reward; } } };
  const gs = new GameScreen();
  gs.enter(app);
  const g = gs.game;
  g.hints = null;
  g.spawner.update = () => {};
  g.player.devGod = true;
  complete(g);
  g.pickups.length = 0;
  step(g, 6);
  g.player.addXp(g.player.xpNext);
  g.momentT = 0;
  gs.frame(1 / 60);
  assert.equal(g.state, 'levelup');
  gs.overlay.choose(0);
  gs.overlay = null;
  assert.equal(g.state, 'cleared');
  const oldDevice = input.device;
  try {
    input.device = 'touch';
    gs.frame(1 / 60);
    app.ui.lockT = 0;
    input.justDown.add('Space');
    gs.frame(1 / 60);
    input.endFrame();
    assert.equal(g.state, 'cleared', 'a combat key never exits the level');
    assert.equal(gs.pause(), true);
    app.ui.lockT = 0;
    input.virtual.add('pause');
    gs.frame(1 / 60);
    input.endFrame();
    assert.equal(g.state, 'cleared', 'pause resumes safe collection');
    const r = gs.finishRect;
    assert.equal(gs.regions(r.x + r.w / 2, r.y + r.h / 2), 'finish-level');
    input.virtual.add('finish-level');
    gs.frame(1 / 60);
    input.endFrame();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(g.state, 'over');
    assert.equal(reports.length, 1);
    assert.equal(reports[0].victory, true);
  } finally {
    input.device = oldDevice;
    input.endFrame();
  }
});

test('Enter and gamepad A finish only after the completion prompt is ready', () => {
  for (const device of ['kb', 'pad']) {
    const profile = defaultProfile();
    const app = { choice: { hero: 'knight', mode: 's15', diff: 'easy' }, settings: {}, ui: new UI(), store: { profile, submitRun: async r => applyRun(profile, r).reward } };
    const gs = new GameScreen();
    gs.enter(app);
    const g = gs.game;
    g.hints = null;
    g.spawner.update = () => {};
    g.player.devGod = true;
    complete(g);
    g.pickups.length = 0;
    step(g, 6);
    const oldDevice = input.device, buttons = input.pad.buttons, prev = input.pad.prev;
    try {
      input.device = device;
      gs.frame(1 / 60);
      app.ui.lockT = 0;
      if (device === 'kb') input.justDown.add('Enter');
      else { input.pad.buttons = [true]; input.pad.prev = [false]; }
      gs.frame(1 / 60);
      assert.equal(g.state, 'over', device);
      assert.equal(g.result.victory, true);
    } finally {
      input.device = oldDevice;
      input.pad.buttons = buttons;
      input.pad.prev = prev;
      input.endFrame();
    }
  }
});
