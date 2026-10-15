import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
// The game's browser/canvas substitutes; weapons, hits and monster movement stay real.
await mod('tools/headless.mjs');
const {Game} = await mod('public/js/game/game.js');
const {HOLD, HOLD_EVERY, SRC} = await mod('public/js/game/enemies.js');
const {mulberry32} = await mod('public/js/engine/util.js');
const {defaultProfile, metaBonuses} = await mod('public/js/shared/profile.js');

function gameCase(fn) {
  const oldRandom = Math.random;
  Math.random = mulberry32(911);
  try {
    const g = new Game({hero:'knight', mode:'s15', meta:metaBonuses(defaultProfile()), settings:{numbers:false}});
    return fn(g, g.player, g.player.weapons[0]);
  } finally {
    Math.random = oldRandom;
  }
}

// A champion like the ones the spawner names ("Dreadhide the Defiler"), and a plain monster.
const champion = (g, type, x, y) => g.spawnEnemy(type, x, y, {instant:true, elite:true, hpMul:1000});
const plain = (g, type, x, y) => g.spawnEnemy(type, x, y, {instant:true, hpMul:1000});
const run = (e, seconds) => { for (let t = 0; t < seconds - 1e-9; t += 1/60) e.update(1/60); };

test('a sword blow shoves a plain monster but only stops a champion for a moment', () => gameCase((g,p,w) => {
  const c = champion(g, 'skeleton', p.x + 27, p.y - 3);
  const m = plain(g, 'skeleton', p.x + 27, p.y + 3);
  g.grid.rebuild(g.enemies, p.x, p.y);
  const cHp = c.hp, mHp = m.hp;
  w.cd = 0;
  w.update(0); // The Longsword's real swing at the closest foe.
  assert.ok(c.hp < cHp && m.hp < mHp, 'the swing hits both');
  assert.ok(m.kx > 0, 'the plain skeleton is shoved away from the hero');
  assert.equal(c.kx, 0);
  assert.equal(c.ky, 0);
  assert.equal(c.holdT, HOLD);
  const x0 = c.x, y0 = c.y;
  run(c, HOLD);
  assert.equal(c.x, x0, 'held in place for the whole hold');
  assert.equal(c.y, y0);
  run(c, 0.1);
  assert.ok(c.x < x0 - 2, 'then walks on toward the hero');
}));

test('a stream of blows cannot pin a champion', () => gameCase((g,p) => {
  const c = champion(g, 'orc', p.x + 90, p.y);
  const blow = () => g.hitEnemy(c, 1, {kb:1.3, kx:1, ky:0});
  blow();
  assert.equal(c.holdT, HOLD);
  run(c, 0.3);
  blow();
  assert.ok(c.holdT <= 0, 'a blow soon after the last hold does not stop it again');
  run(c, HOLD_EVERY - 0.3);
  blow();
  assert.equal(c.holdT, HOLD, 'once the moment has passed, a blow stops it again');
  assert.equal(c.kx, 0);
}));

test('burns, shoves and a charge under way leave a champion alone', () => gameCase((g,p) => {
  const c = champion(g, 'skeleton', p.x + 90, p.y);
  const m = plain(g, 'skeleton', p.x + 90, p.y + 12);
  g.hitEnemy(c, 1, {type:'fire', kb:0, src:SRC.BURN});
  assert.equal(c.holdT, 0, 'damage over time does not stop it');
  g.grid.rebuild(g.enemies, p.x, p.y);
  g.pushback(p.x + 70, p.y, 50, 160); // The shove a level-up or a hit on the hero gives.
  assert.ok(m.kx > 0, 'plain monsters are still shoved');
  assert.equal(c.kx, 0);
  assert.equal(c.ky, 0);
  const wolf = champion(g, 'wolf', p.x - 90, p.y);
  wolf.state = 'dash';
  g.hitEnemy(wolf, 1, {kb:1.3, kx:-1, ky:0});
  assert.equal(wolf.holdT, 0);
  assert.equal(wolf.kx, 0);
}));
