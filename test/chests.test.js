// Chests by tier (order 2, item 2): the tease is always true (a beam for each thing inside, one
// orange exactly when it holds an evolution); things are shown least first, an evolution last, the
// draws themselves unchanged; each tier's screen keeps within its hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { chestTease, revealOrder, chestTimeline, CHEST_TIERS } from '../public/js/game/chests.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, seed) {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', diff: 'medium', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = bot;
    Math.random = random;
  }
}

test('the tease is always true: a beam for each thing inside, one orange exactly when it holds an evolution', () => {
  let evolutions = 0, plain = 0;
  for (let seed = 1; seed <= 40; seed++) {
    for (const kind of ['elite', 'lord', 'boss']) {
      game((g, p) => {
        if (seed % 2) {
          const w = p.weapons[0];
          while (w.level < 8) w.levelUp();
          g.addPassive('might', 1);
        }
        const roll = g.rollChest(kind), tease = chestTease(roll.items);
        const evolves = roll.items.some((it) => it.type === 'evolve');
        assert.equal(tease.beams, roll.items.length, `${kind} seed ${seed}: beams = things`);
        assert.equal(tease.orange, evolves, `${kind} seed ${seed}: orange exactly with an evolution`);
        evolves ? evolutions++ : plain++;
      }, seed);
    }
  }
  assert.ok(evolutions > 0 && plain > 0, 'both kinds of chest seen');
});

test('things are shown least first, an evolution last; what was drawn is all there', () => {
  const items = [
    { type: 'evolve', id: 'excalibur' },
    { type: 'weapon', id: 'axe', isNew: true, level: 1 },
    { type: 'passive', id: 'might', level: 3 },
    { type: 'weapon', id: 'axe', level: 2 },
    { type: 'bless', level: 4 },
    { type: 'passive', id: 'luck', isNew: true, level: 1 },
    { type: 'weapon', id: 'aura', level: 5 },
  ];
  const shown = revealOrder(items);
  assert.equal(shown.length, items.length);
  const label = (it) => (it.type === 'evolve' ? `evolve:${it.id}` : `${it.type}:${it.id || ''}:${it.isNew ? 'new' : it.level}`);
  assert.deepEqual(shown.map(label), [
    'bless::4', // a filler
    'passive:might:3', // a relic a rank up
    'weapon:aura:5', // a weapon a level up
    'passive:luck:new', // a NEW relic
    'weapon:axe:new', // a NEW weapon...
    'weapon:axe:2', // ...and its level up drawn after it, right after it
    'evolve:excalibur', // the evolution last
  ]);
  assert.equal(items[0].type, 'evolve', 'the draws keep their own order');
});

test("each tier's screen keeps within its hold, the gaps growing toward the last", () => {
  for (const [kind, T] of Object.entries(CHEST_TIERS)) {
    for (let n = 1; n <= 5; n++) {
      const tl = chestTimeline(kind, n);
      assert.ok(tl.end <= T.hold, `${kind}, ${n} things: ${tl.end.toFixed(2)} s ≤ ${T.hold}`);
      for (let i = 2; i < n; i++) assert.ok(tl.at[i] - tl.at[i - 1] >= tl.at[i - 1] - tl.at[i - 2] - 1e-9, 'gaps grow');
    }
  }
  assert.ok(CHEST_TIERS.boss.shakes === 3 && CHEST_TIERS.lord.shakes === 2 && CHEST_TIERS.elite.shakes === 1);
});

test('EVOLVE READY follows Game.evolvable exactly: L8 with its relic, or any L8 with the Phoenix Heart', () =>
  game((g, p) => {
    const sword = p.weapons[0];
    const same = () => {
      g.update(1 / 60);
      assert.deepEqual(g.evoReady, g.evolvable());
      return g.evoReady.length;
    };
    assert.equal(same(), 0, 'a fresh sword: not ready');
    while (sword.level < 8) sword.levelUp();
    assert.equal(same(), 0, 'L8 without its relic: not ready');
    g.addPassive('might', 1);
    assert.equal(same(), 1, 'L8 with Gauntlets of Might: ready');
    assert.equal(g.evoReady[0], sword);
    const axe = g.addWeapon('axe');
    while (axe.level < 8) axe.levelUp();
    assert.equal(same(), 1, 'the axe at L8 without its relic: only the sword');
    g.addPassive('phoenix', 1);
    assert.equal(same(), 2, 'the Phoenix Heart: any weapon at L8');
    g.rollChest('elite');
    assert.equal(same(), 1, 'one evolved, the other still waits');
  }, 3));
