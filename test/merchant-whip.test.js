import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { WHIP_EVOLUTION, GOOD_COPPER_ID, HIGH_COPPER_ID } from '../public/js/data/copper.js';
import { MerchantLash } from '../public/js/game/merchant-whip.js';
import { CopperRecall } from '../public/js/game/weapons-copper.js';
import { SPR } from '../public/js/engine/sprites.js';

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

test('one whip seal pays only the next private-stock disc and expires on a recycled enemy', () => {
  const g = arena(), player = g.player, whip = g.mainWeapon();
  const near = foe(g, 18, 0), far = foe(g, 37, 0), stock = player.weapons[1];
  player.crit = 0;
  whip.cd = 0;
  whip.update(0);
  assert.equal(g.copperSeal.foe, far);
  const fire = w => {
    w.cd = 0;
    w.update(0);
    const pr = g.projectiles.at(-1);
    for (let i = 0; i < 30; i++) if (!pr.update(1 / 60)) break;
  };
  const curse = g.addWeapon('pqc1');
  fire(curse);
  assert.equal(g.projectiles.at(-1).sprite, SPR.copper_disc);
  assert.equal(g.copperSeal.foe, far);
  const values = [];
  const hit = g.hitEnemy.bind(g);
  g.hitEnemy = (e, damage, options) => {
    if (e === far && options.w === stock) values.push(damage);
    return hit(e, damage, options);
  };
  const hp = far.hp, nearHp = near.hp;
  fire(stock);
  assert.equal(g.projectiles.at(-1).sprite, SPR.merchant_stock_disc);
  assert.ok(near.hp < nearHp);
  assert.ok(far.hp < hp);
  assert.equal(g.copperSeal, null);
  const plain = far.hp;
  fire(stock);
  assert.ok(far.hp < plain);
  assert.deepEqual(values, [stock.s.dmg * 1.5, stock.s.dmg]);
  whip.cd = 0;
  whip.update(0);
  const stale = g.copperSeal;
  far.id += 1000;
  assert.equal(stale.update(), false);
  assert.equal(g.copperSeal, null);
});

test('Liquidation recalls three copper bands to the original cast site and pulls each visible foe once per band', () => {
  const g = arena(), p = g.player;
  const near = foe(g, 39, 0), rim = foe(g, 97, 0);
  const beyond = foe(g, 174, 0), blocked = foe(g, -49, 0);
  const castX = p.x, castY = p.y;
  g.world.lineOfSight = (x, y, targetX) => targetX >= castX;
  const strikes = [];
  const hit = g.hitEnemy.bind(g);
  g.hitEnemy = (e, damage, options) => {
    strikes.push([e, options]);
    return hit(e, damage, options);
  };
  assert.equal(p.hero.ult, 'liquidation');
  g.startUlt(p.hero.ult);
  const bands = g.effects.filter(fx => fx instanceof CopperRecall);
  assert.equal(bands.length, 3);
  p.x += 30; p.y += 20;
  assert.deepEqual(bands.map(b => [b.x, b.y]), Array(3).fill([castX, castY]));
  for (const band of bands) {
    for (let tick = 0; tick < 150 && band.update(1 / 60); tick++) {}
  }
  assert.deepEqual(strikes.map(([e]) => e), [rim, near, rim, near, rim, near]);
  assert.ok(strikes.every(([, options]) => options.ult && options.kx === -1 && options.ky === 0));
  assert.ok(g.ultRun.dmg > 0);
  assert.equal(beyond.hp, beyond.maxHp);
  assert.equal(blocked.hp, blocked.maxHp);
  g.clearTransient();
  assert.equal(p.ult, null);
  assert.ok(!g.effects.some(fx => fx instanceof CopperRecall));
});
