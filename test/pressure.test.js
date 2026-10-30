import test from 'node:test';
import assert from 'node:assert/strict';
import { pressureTable } from '../tools/pressure.mjs';
import { Game } from '../public/js/game/game.js';
import { ENEMIES } from '../public/js/data/enemies.js';
import { HORDE_RATE } from '../public/js/data/waves.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('the pressure table and live opening agree, with no invented Normal head start', () => {
  for (const diff of ['easy', 'medium', 'hard']) {
    const table = pressureTable({ diff, map: 'desert' });
    const g = new Game({ hero: 'knight', mode: 's15', map: 'desert', diff, settings: {}, meta: metaBonuses(defaultProfile()) });
    const sp = g.spawner;
    let actual = 0;
    g.spawnEnemy = type => { if (!ENEMIES[type].prop) actual++; return {}; };
    sp.joltT = sp.eliteT = sp.thiefT = Infinity;
    for (let step = 0; step < 3600; step++) {
      g.time = step / 60;
      sp.update(1 / 60);
    }
    const opening = table.rows[0];
    // The table integrates arrivals; the live head start is paid over several frames and whole
    // enemies leave a fractional debt. Three enemies covers that rounding, not an extra burst.
    assert.ok(Math.abs(actual - opening.steady - table.headStart) <= 3, `${diff}: ${actual} live, ${opening.steady + table.headStart} predicted`);
    assert.equal(opening.sent, table.headStart);
    assert.equal(opening.notes.includes('head start'), diff !== 'easy');
    if (diff === 'easy') assert.equal(table.headStart, 0);
    else {
      g.time = HORDE_RATE.delay;
      assert.equal(table.headStart, sp.initialOwed(g.phase));
    }
  }
});

test('pressure inputs fail clearly and Ranked reports its actual map and difficulty', () => {
  assert.throws(() => pressureTable({ map: 'constructor' }), /Unknown map/);
  assert.throws(() => pressureTable({ minutes: NaN }), /until/);
  assert.throws(() => pressureTable({ diff: 'easy', nightmare: true }), /Nightmare/);
  const ranked = pressureTable({ mode: 'ranked', diff: 'easy', map: 'desert', minutes: 1 });
  assert.equal(ranked.diff, 'hard');
  assert.equal(ranked.map, 'forest');
});
