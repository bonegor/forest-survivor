// An event told in the forest just before the hero goes down into a crypt (Ranked at 4:58, the bats
// of phase 7 two seconds off) waits with the forest: no edge arrow in the crypt toward rock where
// nothing is, and it comes, arrow and all, once he is back up.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const step = (g, n = 1) => {
  for (let i = 0; i < n; i++) g.update(1 / 60);
};

test('an event told before the crypt waits in the forest, its arrow too', () => {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(5);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'berserker', mode: 'ranked', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    g.player.devGod = true;
    step(g, 2);
    g.world.syncShrines();
    g.setTime(296);
    for (let i = 0; i < 600 && !g.warnings.length; i++) step(g);
    assert.ok(g.warnings.some((w) => w.from), 'the swarm told, its side marked');
    const told = g.warnings.slice();
    g.enterCrypt(g.crypts[0]);
    step(g, 100); // the journey down
    assert.ok(g.inCrypt, 'in the crypt');
    step(g, 600);
    assert.deepEqual(g.warnings, [], 'no warning, nor its edge arrow, below');
    g.leaveCrypt();
    step(g, 100);
    assert.equal(g.inCrypt, null, 'back in the forest');
    assert.ok(told.every((w) => g.warnings.includes(w)), 'the warning back with the forest');
    step(g, 300);
    assert.deepEqual(g.warnings, [], 'and its event come');
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
});
