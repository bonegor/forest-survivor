// The ultimate as a moment (ultimate.js): the press spends the fury once and the
// world stops for the launch; the live count is the ultimate's own kills; the receipt comes once per
// ultimate; a fury orb's comet changes nothing of the fury, only the look.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { ULT_LAUNCH, compact } from '../public/js/game/ultimate.js';
import { ULT_DURATION } from '../public/js/game/player.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, hero = 'knight') {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(17);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.player.devGod = true;
    g.spawner.update = () => {};
    g.player.weapons.length = 0;
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    input.endFrame();
    Math.random = oldRandom;
  }
}
const run = (g, secs) => {
  for (let i = 0; i < Math.round(secs * 60); i++) g.update(1 / 60);
};
const press = (g) => {
  input.justDown.add('Space');
  g.update(1 / 60);
  input.endFrame();
};

test('the press spends the fury once; the world stops for the launch, then the ultimate begins', () =>
  game((g, p) => {
    p.fury = 100;
    const foe = g.spawnEnemy('skeleton', p.x + 80, p.y, { instant: true });
    run(g, 1 / 60);
    press(g);
    assert.equal(p.fury, 0, 'spent at once');
    assert.ok(g.ultLaunch && !p.ult, 'the launch first');
    const fx = foe.x;
    p.fury = 100; // a second press during the launch takes nothing more
    press(g);
    assert.equal(p.fury, 100, 'not doubled');
    run(g, ULT_LAUNCH.stop - 0.05);
    assert.equal(foe.x, fx, 'the world stood still');
    run(g, 0.1);
    assert.ok(p.ult && p.ult.type === 'whirlwind', 'then the ultimate');
  }));

test('the live count is the ultimate’s own kills, and its receipt comes once', () =>
  game((g, p) => {
    p.fury = 100;
    press(g);
    run(g, ULT_LAUNCH.stop + 0.05);
    assert.ok(g.ultRun);
    const a = g.spawnEnemy('skeleton', p.x + 300, p.y, { instant: true });
    const b = g.spawnEnemy('skeleton', p.x + 320, p.y, { instant: true });
    g.hitEnemy(a, 1e6, { ult: true });
    g.hitEnemy(b, 1e6, { w: { dmgDealt: 0, kills: 0 } }); // a weapon's blow, not the ultimate's
    assert.equal(g.ultRun.kills, 1);
    assert.ok(g.ultRun.dmg > 0);
    const before = g.receipts || 0;
    run(g, ULT_DURATION.whirlwind + 0.2);
    assert.equal(g.receipts - before, 1, 'one receipt');
    assert.ok(g.banners.some((bn) => /^WHIRLWIND · \d+ slain · .+ damage$/.test(bn.title)), g.banners.map((bn) => bn.title).join('|'));
    run(g, 2);
    assert.equal(g.receipts - before, 1, 'and no more');
    assert.ok(g.stats.bestUlt && g.stats.bestUlt.kills >= 1);
  }));

test('every hero’s ultimate launches and leaves its receipt (the Army when its knights are gone)', () => {
  for (const hero of ['knight', 'archer', 'mage', 'rogue', 'necromancer']) {
    game((g, p) => {
      p.fury = 100;
      press(g);
      run(g, 16);
      assert.equal(g.receipts, 1, hero);
      assert.equal(g.ultLaunch, null);
    }, hero);
  }
});

test('a fury orb’s comet changes nothing of the fury: it is his at once, the orb catches up', () =>
  game((g, p) => {
    p.fury = 20;
    const orb = g.addPickup('fury', p.x + 300, p.y, 1);
    orb.collect();
    assert.equal(p.fury, 60, 'at once');
    assert.equal(g.hud.shownFury(), 20, 'the orb shows it when the comet lands');
    g.hud.comets[0].t = 1; // landed
    g.hud.comets.splice(0, 1);
    assert.equal(g.hud.shownFury(), 60);
  }));

test('damage reads short', () => {
  assert.equal(compact(980), '980');
  assert.equal(compact(12400), '12.4K');
  assert.equal(compact(143000), '143K');
  assert.equal(compact(1240), '1.2K');
  assert.equal(compact(2500000), '2.5M');
});
