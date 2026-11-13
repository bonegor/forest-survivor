import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Weapon } from '../public/js/game/weapons.js';
import { CopperCrown, CopperFurnace } from '../public/js/game/weapons-copper.js';
import { COPPER_IDS, COPPER_EVOLUTIONS, isCopper } from '../public/js/data/copper.js';
import { MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function arena() {
  const g = new Game({ hero: 'knight', mode: 's15', map: 'forest', headless: true,
    meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
  g.player.weapons.length = 0;
  g.spawner.update = () => {};
  g.player.devGod = true;
  g.world.solid = () => false;
  return g;
}

function foe(g, x, y) {
  const p = g.player;
  const e = g.spawnEnemy('zombie', p.x + x, p.y + y, { instant: true, hpMul: 1000 });
  e.spd = 0;
  e.dormant = false;
  g.grid.rebuild(g.enemies, p.x, p.y);
  return e;
}

function advance(g, seconds) {
  for (let t = 0; t < seconds; t += 1 / 60) {
    g.time += 1 / 60;
    for (const w of g.player.weapons) w.update(1 / 60);
    g.projectiles = g.projectiles.filter((pr) => pr.update(1 / 60));
    g.effects = g.effects.filter((fx) => fx.update(1 / 60));
  }
}

test('all six copper slots fire independently at the nearest foe, including behind the hero', () => {
  const g = arena(), p = g.player;
  p.face = 1;
  p.aim = 0;
  const near = foe(g, -45, 0), far = foe(g, 120, 0);
  for (const id of COPPER_IDS) g.addWeapon(id).cd = 0;
  for (const w of p.weapons) w.update(0);
  assert.equal(g.projectiles.length, 6);
  assert.equal(new Set(g.projectiles.map((pr) => pr.w.src)).size, 6, 'separate hit channels');
  assert.ok(g.projectiles.every((pr) => pr.vx < 0), 'all seek the nearer enemy behind');
  const hp = near.hp, other = far.hp;
  advance(g, 0.4);
  assert.ok(near.hp < hp, 'discs really damage their target');
  assert.equal(far.hp, other);
  assert.equal(p.face, 1, 'automatic copper throws do not turn the hero');
});

test('each copper slot requires the Phoenix and evolves independently into its own form', () => {
  const g = arena(), p = g.player;
  const weapons = COPPER_IDS.map((id) => g.addWeapon(id));
  for (const w of weapons) {
    w.level = MAX_WEAPON_LEVEL;
    w.recompute();
    assert.equal(w.evolve(), false, 'direct evolution cannot bypass Phoenix');
  }
  g.addPassive('phoenix');
  for (let i = 0; i < weapons.length; i++) {
    assert.equal(weapons[i].evolve(), true);
    assert.equal(weapons[i].id, COPPER_EVOLUTIONS[i]);
    assert.equal(weapons[i].baseId, COPPER_IDS[i]);
    assert.ok(isCopper(weapons[i]) && isCopper(weapons[i].id));
  }
  assert.equal(new Set(weapons.map((w) => w.def.kind)).size, 6, 'six different fighting styles');
  assert.ok(p.passives.has('phoenix'), 'evolving never spends the Heart');
});

for (const id of COPPER_EVOLUTIONS) {
  test(`${id} deals damage in the real weapon and projectile simulation`, () => {
    const g = arena();
    const w = g.addWeapon(id);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      foe(g, Math.cos(a) * 44, Math.sin(a) * 44);
    }
    advance(g, 3);
    assert.ok(w.dmgDealt > 0, `${id}: ${w.dmgDealt} damage`);
    if (id === 'copper_furnace') assert.ok(w.fx instanceof CopperFurnace);
    if (id === 'copper_crown') assert.ok(w.fx instanceof CopperCrown);
  });
}

test('the returning copper cuts a foe again on its way back', () => {
  const g = arena(), p = g.player, e = foe(g, 55, 0), w = new Weapon(g, 'copper_return', 1);
  w.s.amount = 1;
  p.weapons.push(w);
  w.cd = 0;
  w.update(0);
  const shot = g.projectiles[0], before = e.hp;
  w.cd = 99;
  advance(g, 0.3);
  const outward = e.hp;
  assert.ok(outward < before, 'outward hit');
  advance(g, 0.9);
  assert.ok(e.hp < outward, 'return hit');
  assert.ok(shot.t > shot.out, 'the returning phase ran');
});

test('the copper arc chains once per foe, and Foundry Burst damages nearby targets', () => {
  const g = arena();
  const enemies = [foe(g, 45, 0), foe(g, 60, 10), foe(g, 70, -12)];
  const hp = enemies.map((e) => e.hp);
  const w = g.addWeapon('copper_arc');
  w.cd = 0;
  w.update(0);
  assert.ok(enemies.every((e, i) => e.hp < hp[i]), 'the conductive arc reaches each foe');
  assert.equal(g.effects.filter((fx) => fx.style === 'chain').length, 3);

  g.player.weapons.length = 0;
  g.projectiles.length = 0;
  const blast = g.addWeapon('copper_foundry');
  blast.s.amount = 1;
  blast.cd = 0;
  blast.update(0);
  const health = enemies.map((e) => e.hp);
  advance(g, 0.35);
  assert.ok(enemies.every((e, i) => e.hp < health[i]), 'one disc burns the clustered foes');
});
