import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { MAPS } from '../public/js/data/maps.js';
import { SPR } from '../public/js/engine/sprites.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('the opening horde drops blue gems on every map and difficulty, with base XP', () => {
  const random = Math.random;
  Math.random = mulberry32(30);
  try {
    for (const map of Object.keys(MAPS)) for (const diff of ['easy', 'medium', 'hard']) {
      const g = new Game({ hero: 'knight', mode: 's15', map, diff, crypts: false, meta: metaBonuses(defaultProfile()), settings: {} });
      // Use the real spawner so the difficulty and map multipliers are exercised.
      g.spawner.acc = 0;
      g.spawner.owed = 12;
      g.spawner.update(1 / 60);
      const foes = g.enemies.filter(e => !e.prop);
      assert.ok(foes.length > 0, `${map}/${diff}: opening foes arrived`);
      for (const e of foes) {
        g.pickups.length = 0;
        g.killEnemy(e);
        const gem = g.pickups.find(pk => pk.kind === 'gem');
        assert.ok(gem, `${map}/${diff}/${e.type}: left a gem`);
        assert.equal(gem.value, e.def.xp * g.map.foe.xp, 'base reward, with only the map adjustment');
        assert.equal(gem.rank, 0, `${map}/${diff}/${e.type}: blue, not green`);
        assert.equal(gem.sprite, SPR.gem1);
      }
    }
  } finally {
    Math.random = random;
  }
});

test('stronger monsters still drop green gems and collecting them pays their actual XP', () => {
  const g = new Game({ hero: 'knight', mode: 's15', diff: 'easy', crypts: false, meta: metaBonuses(defaultProfile()), settings: {} });
  const p = g.player;
  let collected = 0;
  const addXp = p.addXp;
  p.addXp = function (value) {
    collected += value;
    return addXp.call(this, value);
  };
  for (const [type, value] of [['cultist', 5], ['orc', 10]]) {
    g.pickups.length = 0;
    g.killEnemy(g.spawnEnemy(type, p.x + 50, p.y, { instant: true, xpMul: g.diff.xp }));
    const gem = g.pickups.find(pk => pk.kind === 'gem');
    assert.equal(gem.value, value);
    assert.equal(gem.rank, 1);
    assert.equal(gem.sprite, SPR.gem2);
    const before = collected;
    gem.collect();
    assert.equal(collected - before, value, 'the gem passes its reward to the player before growth bonuses');
    assert.ok(gem.dead);
  }
});
