// The horde has bodies (the user's call, 15 October 2026: "monsters feel no bump between one
// another... they go through everything"): foes bump into one another and into props, tree
// trunks stop them as they stop the hero, and the hero's blows throw them a third as far.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game, KNOCKBACK } = await mod('public/js/game/game.js');
const { jostle } = await mod('public/js/game/crowd.js');
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
// Pairs of foes standing more than halfway into one another.
function deepPairs(list) {
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < (a.r + b.r) / 2) n++;
    }
  }
  return n;
}

test('a horde closing on a standing hero stands round him in a crowd, not in one heap on him', () =>
  game((g, p) => {
    const kinds = ['skeleton', 'zombie', 'rat', 'goblin', 'wolf', 'slime', 'cultist', 'orc'];
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      g.spawnEnemy(kinds[i % kinds.length], p.x + Math.cos(a) * (60 + (i % 5) * 9), p.y + Math.sin(a) * (45 + (i % 5) * 7), { instant: true });
    }
    run(g, 4);
    const foes = g.enemies.filter((e) => !e.dead);
    assert.equal(foes.length, 80);
    // Over the next 2 s, how many of the 3160 pairs stand more than halfway into one another, and
    // how many reach him. They all used to: about 513 such pairs a frame, all 80 heaped on him.
    let deep = 0, close = 0;
    for (let i = 0; i < 120; i++) {
      g.update(1 / 60);
      deep += deepPairs(foes) / 120;
      close += foes.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < 20).length / 120;
    }
    assert.ok(deep < 4, `hardly two stand in one another: ${deep.toFixed(2)} pairs a frame`);
    assert.ok(close < 24, `only the front rank reaches him: ${close.toFixed(1)} within 20 px`);
    assert.ok(close > 4, `but it does reach him: ${close.toFixed(1)} within 20 px`);
  }));

test('the lighter foe gives way the more; a lord, a barrel and a Wraith do not budge', () =>
  game((g, p) => {
    const rat = g.spawnEnemy('rat', p.x + 100, p.y, { instant: true });
    const zombie = g.spawnEnemy('zombie', p.x + 104, p.y, { instant: true });
    jostle([rat, zombie], p.x, p.y);
    const ratMoved = p.x + 100 - rat.x, zombieMoved = zombie.x - (p.x + 104);
    assert.ok(Math.abs(Math.hypot(zombie.x - rat.x, zombie.y - rat.y) - (rat.r + zombie.r)) < 1e-9, 'they part until they just touch');
    assert.ok(Math.abs(ratMoved / zombieMoved - 1.4 / 0.6) < 1e-6, `a rat (0.6) gives way 1.4/0.6 as far as a ghoul (1.4): ${(ratMoved / zombieMoved).toFixed(3)}`);
    for (const [type, still] of [['boneking', true], ['barrel', true], ['ghost', false]]) {
      const big = g.spawnEnemy(type, p.x - 120, p.y + 60, { instant: true });
      const sk = g.spawnEnemy('skeleton', big.x + 2, big.y + 1, { instant: true });
      const [bx, by, sx, sy] = [big.x, big.y, sk.x, sk.y];
      jostle([big, sk], p.x, p.y);
      assert.deepEqual([big.x, big.y], [bx, by], `${type} stays put`);
      if (still) assert.ok(Math.hypot(sk.x - big.x, sk.y - big.y) >= big.r + sk.r - 1e-9, `a skeleton is pushed off the ${type}`);
      else assert.deepEqual([sk.x, sk.y], [sx, sy], 'a skeleton and a Wraith pass through one another');
      big.dead = sk.dead = true;
    }
  }));

test('a tree trunk stops a monster as it stops the hero, and it goes round to him', () =>
  game((g, p) => {
    // A tree near the start, the hero 40 px to its right, a skeleton 24 px to its left: it
    // walks dead straight at the trunk.
    let tree = null;
    for (let r = 1; r < 6 && !tree; r++) {
      for (let cy = -r; cy <= r && !tree; cy++) {
        for (let cx = -r; cx <= r && !tree; cx++) tree = g.world.chunk(Math.floor(p.x / 256) + cx, Math.floor(p.y / 256) + cy).trunks[0] || null;
      }
    }
    assert.ok(tree, 'there is a tree near the start');
    p.x = tree.x + 40;
    p.y = tree.y;
    g.snapCam();
    const sk = g.spawnEnemy('skeleton', tree.x - 24, tree.y, { instant: true });
    const rx = tree.trunk + sk.r, ry = rx * 0.65;
    let deepest = Infinity, reached = null;
    for (let i = 0; i < 6 * 60 && reached === null; i++) {
      g.update(1 / 60);
      deepest = Math.min(deepest, ((sk.x - tree.x) / rx) ** 2 + ((sk.y - tree.y) / ry) ** 2);
      if (Math.hypot(sk.x - p.x, sk.y - p.y) < sk.r + p.r + 1) reached = i / 60;
    }
    assert.ok(deepest > 0.98, `it never stands in the trunk (${deepest.toFixed(3)} of the way out at the deepest)`);
    assert.ok(reached !== null && reached < 4, `it reaches the hero round the tree, in ${reached} s`);
  }));

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
