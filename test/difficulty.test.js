// Normal and Veteran, and armor. The user: "Armor upgrade - make them somehow more effective ...
// It should never go to completely zero ideally", then "add both, but make it so that it has a
// much bigger effect than right now, especially against late game units. Maybe 10% + min 1
// damage (but just denote that as armor +1). There should be some decay as well to how far armor
// can go. Like it can only stop 95% damage?", and "let us have veteran + normal. Veteran is the current setup and normal is that all the monsters have
// their damage cause reduced by 50% and the number of ranged monsters spawn + wolver + any other
// monsters that lunges is reduced to 1/3 ... And ALL current damage effects vs heroes are halved."
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { isFew } from '../public/js/game/spawner.js';
import { armored } from '../public/js/game/player.js';
import { NORMAL, VETERAN } from '../public/js/data/difficulty.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses, sanitizeCheckpoint } from '../public/js/shared/profile.js';

function game(o = {}, seed = 7) {
  const oldRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, ...o });
    g.update(1 / 60); // the first frame builds what a blow looks up (the grid)
    return g;
  } finally {
    Math.random = oldRandom;
  }
}

test('a run plays the rules chosen for it; a saved run its own; Ranked and the bots Veteran', () => {
  assert.equal(game({ diff: 'medium' }).diff, NORMAL);
  assert.equal(game({ diff: 'hard' }).diff, VETERAN);
  assert.equal(game().diff, VETERAN, 'no choice: the game as it was tuned');
  assert.equal(game({ mode: 'ranked', diff: 'medium' }).diff, VETERAN);
  assert.equal(game({ diff: 'hard', checkpoint: sanitizeCheckpoint({ mode: 's15', diff: 'medium', hero: 'archer', weapons: [['bow', 1]] }) }).diff, NORMAL);
  assert.equal(game({ diff: 'medium' }).diffId, 'medium', 'what the run reports');
});

test('on Normal every blow the hero takes is half what Veteran deals, armor and all', () => {
  for (const [armor, amount] of [[0, 10], [0, 3], [3, 7], [12, 40], [0, 0.2]]) {
    const taken = {};
    for (const diff of ['hard', 'medium']) {
      const g = game({ diff }), p = g.player;
      p.armor = armor;
      taken[diff] = p.hurt(amount);
    }
    const vet = armored(amount * VETERAN.dmg, armor);
    assert.equal(taken.hard, Math.max(1, Math.round(vet)), `Veteran, ${amount} against ${armor} armor`);
    assert.equal(taken.medium, Math.max(1, Math.round(vet / 2)), `Normal, ${amount} against ${armor} armor`);
  }
  // What a monster, its shots and a boss's blasts do all goes through Player.hurt.
  const g = game({ diff: 'medium' }), p = g.player, foe = g.spawnEnemy('skeleton', p.x + 3, p.y, { instant: true });
  const before = p.hp;
  for (let i = 0; i < 20 && p.hp === before; i++) g.update(1 / 60);
  assert.equal(before - p.hp, Math.round((foe.dmg * g.dmgScale * VETERAN.dmg) / 2), 'a skeleton\'s blow, halved');
});

test('each point of armor takes a tenth off what is left of a blow, or 1 if that is more, never past 95%', () => {
  const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a}, not ${b}`);
  near(armored(100, 0), 100, 'no armor');
  near(armored(100, 1), 90, 'a point takes a tenth');
  near(armored(100, 5), 100 * 0.9 ** 5, 'five: a tenth of what is left, five times (41% in all)');
  near(armored(100, 10), 100 * 0.9 ** 10, 'ten: 65% in all, each point adding less');
  near(armored(8, 1), 7, 'a small blow loses 1 a point, more than its tenth');
  near(armored(13, 5), 13 * 0.9 ** 5, 'past the point where a tenth is more');
  near(armored(13, 10), 3, 'a small blow against much armor: a point each');
  near(armored(100, 40), 5, 'never more than 95% of a blow');
  near(armored(13, 20), 13 * 0.05, 'nor of a small one');
  // In play: what is left is rounded, never below 1, and halved again on Normal.
  const g = game(), p = g.player;
  p.armor = 5;
  assert.equal(p.hurt(30), Math.round(30 * VETERAN.dmg * 0.9 ** 5), 'a late blow loses 41% to five points');
  p.invuln = 0;
  p.buffs.set('protection', { t: 9, max: 9 });
  p.ult = { type: 'whirlwind', t: 3 };
  p.armor = 1000;
  assert.equal(p.hurt(0.01), 1, 'a blow always lands');
});

test('an Armory rank of Armor shows as +1 armor, and is one point of it', () => {
  for (const rank of [0, 1, 5]) {
    const prof = { ...defaultProfile(), up: { armor: rank } };
    const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(prof), settings: { numbers: false } });
    assert.equal(g.player.armor, rank);
  }
});

test('on Normal a third as many of the monsters that shoot or lunge come, and the horde is as big', () => {
  assert.deepEqual(['cultist', 'wolf', 'orc', 'hellhound', 'skeleton', 'imp', 'spider', 'bat'].filter(isFew), ['cultist', 'wolf', 'orc', 'hellhound']);
  const share = (diff, phase) => {
    const g = game({ diff });
    const oldRandom = Math.random;
    Math.random = mulberry32(11);
    try {
      let n = 0;
      const N = 40000;
      for (let i = 0; i < N; i++) if (isFew(g.spawner.pickType(phase))) n++;
      return n / N;
    } finally {
      Math.random = oldRandom;
    }
  };
  // Minutes 4½, 9½, 12½ and 20 (the night's phase runs 1.4 to the minute until 15, then 0.9).
  for (const phase of [6.3, 13.3, 17.5, 25.5]) {
    const vet = share('hard', phase), normal = share('medium', phase);
    assert.ok(vet > 0.1, `phase ${phase}: some come on Veteran (${vet})`);
    assert.ok(Math.abs(normal / vet - 1 / 3) < 0.03, `phase ${phase}: a third as many on Normal (${normal} against ${vet})`);
  }
  // The packs of them too: the wolves at 9½ minutes, the hellhounds at 22½. Swarms of others stay.
  for (const [ev, few] of [[{ type: 'pack', enemy: 'wolf', count: 8 }, true], [{ type: 'pack', enemy: 'hellhound', count: 10 }, true], [{ type: 'pack', enemy: 'goblin', count: 18 }, false]]) {
    const n = {};
    for (const diff of ['hard', 'medium']) {
      const g = game({ diff });
      let k = 0;
      g.spawnEnemy = () => (k++, null);
      g.spawner.fire(ev, 10);
      n[diff] = k;
    }
    assert.equal(n.hard, Math.round(ev.count * VETERAN.horde));
    assert.equal(n.medium, few ? Math.round(ev.count * VETERAN.horde / 3) : n.hard, `${ev.enemy}: ${n.medium} against ${n.hard}`);
  }
});
