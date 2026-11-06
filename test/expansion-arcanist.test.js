import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { mulberry32 } from '../public/js/engine/util.js';
import behavior from '../public/js/expansion/weapons/arcanist-behavior.js';
import blueprint from '../public/js/expansion/weapons/arcanist.js';
import { Game } from '../public/js/game/game.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function combat(run) {
  const random = Math.random;
  Math.random = mulberry32(2173);
  WEAPONS[blueprint.id] = blueprint.weapon;
  WEAPONS[blueprint.weapon.evo.into] = blueprint.evolution;
  KINDS[blueprint.id] = behavior;
  try {
    const g = new Game({ hero: 'mage', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const p = g.player;
    p.hero = { ...p.hero, sprite: 'arcanist', weapon: blueprint.id };
    p.crit = 0;
    g.world.solid = () => false;
    g.world.lineOfSight = () => true;
    const w = new Weapon(g, blueprint.id, 1);
    p.weapons = [w];
    w.cd = 0;
    run(g, p, w);
  } finally {
    Math.random = random;
  }
}

function foe(g, distance, angle = 0, flags = {}) {
  const { x, y } = g.player;
  const e = g.spawnEnemy('zombie', x + Math.cos(angle) * distance, y + Math.sin(angle) * distance,
    { instant: true, hpMul: 100, ...flags });
  g.grid.rebuild(g.enemies, x, y);
  return e;
}

test('Meridian Pendulum records the release, damages a lord once, and reverses on cooldown', () => combat((g, p, w) => {
  w.update(0);
  assert.equal(g.effects.length, 0);
  assert.equal(w.cd, 0.2, 'no target leaves a short retry interval');
  const lord = foe(g, 78, 0, { lord: true });
  const behind = foe(g, 85, Math.PI);
  w.update(0.2);
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(p.heroAttack.at, g.clock);
  assert.equal(w.cd, w.s.cd);
  const first = g.effects.at(-1);
  assert.ok(first.arc > 0);
  first.update(0.05);
  assert.equal(lord.hp, lord.maxHp, 'the weight travels across the arc');
  first.update(0.14);
  assert.ok(lord.hp < lord.maxHp);
  assert.equal(lord.stunT, 0);
  assert.equal(behind.hp, behind.maxHp);
  const hp = lord.hp, dealt = w.dmgDealt;
  first.update(0.12);
  assert.equal(lord.hp, hp);
  assert.equal(w.dmgDealt, dealt);
  assert.equal(g.stats.damage, dealt);
  w.update(w.s.cd);
  assert.ok(g.effects.at(-1).arc < 0, 'the following cast reverses the sweep');
}));

test('the arc pays one charge per body and its evolution widens and hastens the sweep', () => combat((g, p, w) => {
  const enemies = [foe(g, 80), ...[-0.52, -0.36, -0.2, 0.2, 0.36, 0.52].map(a => foe(g, 81, a))];
  const distant = foe(g, 115);
  w.update(0);
  const sweep = g.effects.at(-1), origin = sweep.x;
  p.x += 12;
  sweep.update(0.3);
  assert.equal(sweep.x, origin, 'an attack keeps its casting position');
  assert.equal(enemies.filter(e => e.hp < e.maxHp).length, 4);
  assert.equal(sweep.hit.size, 4);
  assert.equal(distant.hp, distant.maxHp);
  for (let i = 1; i < 8; i++) w.levelUp();
  const capped = w.s;
  assert.ok(w.evolve());
  assert.ok(w.s.cd < capped.cd);
  for (const stat of ['dmg', 'area', 'speed', 'amount', 'sweep']) assert.ok(w.s[stat] > capped[stat], stat);
  p.amount = 99;
  w.recompute();
  w.cd = 0;
  w.update(0);
  assert.equal(g.effects.at(-1).charges, 10, 'Echo cannot make a sweep unbounded');
}));

test('a manual crypt sweep starts on the approved staff release and cannot strike through stone', () => combat((g, p, w) => {
  const face = foe(g, 55), blocked = foe(g, 55, 0.32);
  const wall = p.y + 10;
  g.inCrypt = {};
  g.world.solid = (_x, y) => y >= wall;
  g.world.lineOfSight = (_x, y, _tx, ty) => y < wall && ty < wall;
  assert.ok(g.strike());
  g.cryptTime = 0.08;
  w.update(0.08, true);
  assert.equal(g.effects.length, 0);
  g.cryptTime = 1 / 12;
  w.update(1 / 12 - 0.08, true);
  assert.equal(g.effects.length, 1);
  g.effects[0].update(0.3);
  assert.ok(face.hp < face.maxHp);
  assert.equal(blocked.hp, blocked.maxHp);
  assert.equal(p.face, 1);
}));
