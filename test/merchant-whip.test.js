import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { WHIP_EVOLUTION, GOOD_COPPER_ID, HIGH_COPPER_ID } from '../public/js/data/copper.js';
import { MerchantLash } from '../public/js/game/merchant-whip.js';

function arena() {
  const g = new Game({ hero: 'eanasir', mode: 's15', diff: 'easy', headless: true,
    meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
  g.spawner.update = () => {}; g.world.solid = () => false; g.world.lineOfSight = () => true;
  g.enemies.length = 0; g.player.devGod = true;
  return g;
}
function foe(g, x, y, type = 'zombie') {
  const p = g.player, e = g.spawnEnemy(type, p.x + x, p.y + y, { instant: true, hpMul: 1000, xpMul: 0 });
  e.spd = 0; e.dormant = false;
  g.grid.rebuild(g.enemies, p.x, p.y);
  return e;
}

for (const evolved of [false, true]) test(`${evolved ? 'evolved' : 'base'} Whip hits along its drawn lash, including boxes, only once per cast`, () => {
  const g = arena(), w = g.mainWeapon();
  if (evolved) { g.addPassive('might'); w.evolve(); assert.equal(w.id, WHIP_EVOLUTION); }
  const near = foe(g, 22, 0), farther = foe(g, 42, 0), crate = foe(g, 28, 0, 'crate'), outside = foe(g, 0, 65);
  const hp = [near, farther, crate, outside].map(e => e.hp);
  w.cd = 0; w.update(0);
  const lash = g.effects.find(e => e instanceof MerchantLash);
  assert.ok(lash); assert.ok(near.hp < hp[0]); assert.ok(farther.hp < hp[1]); assert.ok(crate.hp < hp[2]);
  assert.equal(outside.hp, hp[3]);
  const after = near.hp; lash.update(.02); assert.equal(near.hp, after);
  const original = structuredClone(lash.points); g.player.x += 70;
  lash.update(.02); assert.deepEqual(lash.points, original, 'landed lash remains anchored');
});

test('Whip selects a visible target instead of wasting a cast on a closer foe behind a wall', () => {
  const g = arena(), blocked = foe(g, 20, 0), visible = foe(g, -35, 0), w = g.mainWeapon();
  g.world.lineOfSight = (x, y, ex) => ex < g.player.x;
  const hp = [blocked.hp, visible.hp];
  w.cd = 0; w.update(0);
  assert.equal(blocked.hp, hp[0]); assert.ok(visible.hp < hp[1]);
});

test('in a real crypt the Whip waits for input while private copper still fires automatically', () => {
  const g = arena(), p = g.player;
  g.enterCrypt({ key: 'merchant-test', depth: 1, x: p.x, y: p.y }); g.travelGo(); g.state = 'play';
  g.enemies.length = 0; g.world.solid = () => false; g.world.lineOfSight = () => true;
  const target = foe(g, 32, 0), w = g.mainWeapon(), copper = p.weapons.find(w => w.id === GOOD_COPPER_ID);
  w.cd = copper.cd = 0;
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  assert.ok(copper.dmgDealt > 0, 'copper deals damage without a strike');
  assert.equal(w.dmgDealt, 0, 'the manual lash waits');
  assert.ok(g.strike());
  for (let i = 0; i < 20; i++) g.update(1 / 60);
  assert.ok(w.dmgDealt > 0, 'input lands the Whip at its release frame');
  assert.ok(target.hp < target.maxHp);
});

test('High Quality Copper launches three fast piercing discs and damages foes', () => {
  const g = arena(); g.player.weapons.length = 0;
  const w = g.addWeapon(HIGH_COPPER_ID), e = foe(g, 60, 0);
  w.cd = 0;
  for (let i = 0; i < 20; i++) { w.update(1 / 60); for (const pr of g.projectiles) pr.update(1 / 60); }
  assert.equal(g.projectiles.length, 3);
  assert.ok(g.projectiles.every(pr => pr.w === w && pr.vx > 300));
  assert.ok(w.dmgDealt > 0); assert.ok(e.hp < e.maxHp);
});
