// The hero's blows throw a foe a third as far as they did (the user's call, 15 October 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game, KNOCKBACK } = await mod('public/js/game/game.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// A knight who can't die, standing still, unarmed, with no spawner: only what a test puts there.
function game(fn, seed = 11) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    g.player.weapons.length = 0;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const run = (g, seconds) => {
  for (let i = 0; i < seconds * 60; i++) g.update(1 / 60);
};

test("the hero's blows throw a foe a third as far as they did", () =>
  game((g, p) => {
    assert.equal(KNOCKBACK, 75 / 3);
    const sk = g.spawnEnemy('skeleton', p.x + 30, p.y, { instant: true, hpMul: 1000 });
    g.update(1 / 60);
    sk.spd = 0; // only the blow moves it
    const x0 = sk.x;
    g.hitEnemy(sk, 1, { kb: 1, kx: 1, ky: 0 });
    assert.equal(sk.kx, 25, 'a blow of kb 1 on a skeleton (mass 1)');
    run(g, 2);
    assert.ok(sk.x - x0 > 2.5 && sk.x - x0 < 3.5, `thrown ${(sk.x - x0).toFixed(2)} px (it was 9)`);
  }));
