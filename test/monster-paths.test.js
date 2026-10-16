// Where monsters may go. The user: "The rule was that they dont bump into anything and I just
// observe it bump into a box for pickups. They cannot bump into anything, apart from, obviously,
// in the dungeon where there is no space. There they need to follow the hero on vision." Asked,
// they chose: in dungeons too monsters pass through one another (walls alone stop them), and a
// monster there chases the hero once it has seen him, round corners too. Then they chose to keep
// that to the crypts: a Dungeon Run floor's horde hunts the hero from anywhere, as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { SIGHT } = await mod('public/js/game/dungeon.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// A hero who can't die, standing still, unarmed, with no spawner: only what a test puts there.
function game(mode, fn, seed = 11, crypts = false) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode, meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts });
    g.spawner.update = () => {};
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.update(1 / 60);
    for (const e of g.enemies) if (!e.boss && !e.prop) e.dead = true;
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const run = (g, seconds) => {
  for (let i = 0; i < seconds * 60; i++) g.update(1 / 60);
};

test('in the forest monsters pass through one another, a crate and a tree trunk', () =>
  game('s15', (g, p) => {
    // Two on one spot, walking the same way: nothing pushes them apart.
    const a = g.spawnEnemy('zombie', p.x + 90, p.y, { instant: true }), b = g.spawnEnemy('zombie', p.x + 90, p.y, { instant: true });
    run(g, 0.5);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.5, 'still one on the other');
    // A crate on the way: the skeleton walks through it.
    const crate = g.spawnEnemy('crate', p.x - 40, p.y, { instant: true });
    const sk = g.spawnEnemy('skeleton', p.x - 70, p.y, { instant: true });
    let through = false;
    for (let i = 0; i < 120; i++) {
      g.update(1 / 60);
      through ||= Math.hypot(sk.x - crate.x, sk.y - crate.y) < 1.5;
    }
    assert.ok(through, 'it went right through the crate');
    // A tree trunk on the way: straight through it too.
    let tree = null;
    for (let cy = -2; cy <= 2 && !tree; cy++) for (let cx = -2; cx <= 2 && !tree; cx++) tree = g.world.chunk(Math.floor(p.x / 256) + cx, Math.floor(p.y / 256) + cy).trunks[0] || null;
    assert.ok(tree, 'a tree near the start');
    p.x = tree.x + 50;
    p.y = tree.y;
    for (const e of g.enemies) if (!e.prop) e.dead = true;
    g.update(1 / 60);
    const w = g.spawnEnemy('skeleton', tree.x - 30, tree.y, { instant: true });
    let inTrunk = false;
    for (let i = 0; i < 180; i++) {
      g.update(1 / 60);
      inTrunk ||= Math.hypot(w.x - tree.x, w.y - tree.y) < 1.5;
    }
    assert.ok(inTrunk, 'it walked through the trunk');
    // The hero alone still stands off a trunk.
    p.x = tree.x;
    p.y = tree.y;
    g.world.collide(p);
    assert.ok(Math.hypot(p.x - tree.x, p.y - tree.y) > tree.trunk, 'the hero is stopped');
  }));

// Floor tiles, by walk from the hero (the flow field), that he can't see from where he stands.
function spotAway(g, p, near, far) {
  const w = g.world, T = 16;
  for (let i = 0; i < w.flow.length; i++) {
    const d = w.flow[i];
    if (d < near || d > far) continue;
    const x = (i % w.W) * T + T / 2, y = Math.floor(i / w.W) * T + T / 2;
    if (!w.lineOfSight(x, y, p.x, p.y)) return { x, y };
  }
  return null;
}
const walk = (g, e) => g.world.flow[Math.floor(e.y / 16) * g.world.W + Math.floor(e.x / 16)];

// The hero in the crypt by the start, its sleeping packs gone: only what a test puts there.
function crypt(fn) {
  return game('s15', (g, p) => {
    g.world.syncShrines();
    g.enterCrypt(g.crypts.find((d) => d.key === '0,0'));
    for (let i = 0; i < 300 && !(g.inCrypt && g.state === 'play'); i++) g.update(1 / 60);
    assert.ok(g.inCrypt && g.world.vision, 'in a crypt');
    for (const e of g.enemies) if (!e.boss && !e.prop && !e.lord) e.dead = true;
    g.update(1 / 60);
    return fn(g, p);
  }, 11, true);
}

test('in a crypt a monster strolls until it sees the hero, then follows him round corners', () =>
  crypt((g, p) => {
    const w = g.world;
    const start = { x: p.x, y: p.y };
    const at = spotAway(g, p, 8, 30);
    assert.ok(at, 'a spot out of sight, a walk away');
    const foe = g.spawnEnemy('skeleton', at.x, at.y, { instant: true, hpMul: 1e6 });
    assert.equal(foe.aware, false, 'it has not seen him');
    // While it hasn't seen him it never asks the way to him.
    const steer = w.steer.bind(w);
    let asked = 0;
    w.steer = (e, t) => {
      if (e === foe && t === p) asked++;
      return steer(e, t);
    };
    const x0 = foe.x, y0 = foe.y;
    let moved = 0;
    for (let i = 0; i < 4 * 60 && !foe.aware; i++) {
      g.update(1 / 60);
      moved = Math.max(moved, Math.hypot(foe.x - x0, foe.y - y0));
    }
    assert.equal(foe.aware, false, 'out of sight, it stays unaware');
    assert.equal(asked, 0, 'and goes nowhere near him on purpose');
    assert.ok(moved > 4, `it strolls about (${moved.toFixed(1)} px)`);
    // The hero steps into its sight: it notices him within a moment.
    p.x = foe.x + 2;
    p.y = foe.y + 2;
    assert.ok(w.sees(foe, p), 'standing where it can see him');
    run(g, 0.4);
    assert.equal(foe.aware, true, 'it has seen him');
    // He goes back round the corner: it follows him there by the walk.
    p.x = start.x;
    p.y = start.y;
    g.update(1 / 60);
    assert.ok(!w.sees(foe, p), 'out of its sight again');
    const d0 = walk(g, foe);
    run(g, 3);
    assert.ok(asked > 0, 'it asks the way to him');
    assert.ok(walk(g, foe) < d0 - 3, `and comes round to him (${d0} tiles' walk, now ${walk(g, foe)})`);
    assert.equal(SIGHT, 160, 'it sees as far as the hero does');
  }));

test('in a crypt a monster struck knows where the hero is; what is sent at him knows anyway; monsters pass through one another', () =>
  crypt((g, p) => {
    const at = spotAway(g, p, 8, 30);
    const foe = g.spawnEnemy('skeleton', at.x, at.y, { instant: true, hpMul: 1e6 });
    g.update(1 / 60);
    assert.equal(foe.aware, false);
    g.hitEnemy(foe, 1, {});
    assert.equal(foe.aware, true, 'struck from afar, it knows');
    g.spawner.fire({ type: 'pack', enemy: 'goblin', count: 4 }, 3);
    const pack = g.enemies.filter((e) => e.type === 'goblin' && !e.dead);
    assert.ok(pack.length && pack.every((e) => e.aware), 'a pack sent at him knows where he is');
    // Two on one spot: nothing pushes them apart.
    const a = g.spawnEnemy('zombie', at.x, at.y, { instant: true, aware: true }), b = g.spawnEnemy('zombie', at.x, at.y, { instant: true, aware: true });
    run(g, 0.5);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.5, 'still one on the other');
  }));

// Then the user's choice on Dungeon Run: "Switch Dungeon Run back": its horde hunts the hero from
// anywhere, as it did, and crypts stay on sight.
test('on a Dungeon Run floor the horde hunts the hero from anywhere, round the walls', () =>
  game('dungeon', (g, p) => {
    assert.equal(g.world.vision, false);
    const at = spotAway(g, p, 14, 22);
    assert.ok(at, 'a spot out of sight, a walk away');
    const foe = g.spawnEnemy('skeleton', at.x, at.y, { instant: true, hpMul: 1e6 });
    g.update(1 / 60);
    assert.equal(foe.aware, true, 'it knows where he is without seeing him');
    assert.ok(!g.world.lineOfSight(foe.x, foe.y, p.x, p.y), 'out of sight');
    const d0 = walk(g, foe);
    run(g, 3);
    assert.ok(walk(g, foe) < d0 - 3, `it comes round to him (${d0} tiles' walk, now ${walk(g, foe)})`);
  }));
