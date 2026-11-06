import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { SPR } from '../public/js/engine/sprites.js';
import { mulberry32 } from '../public/js/engine/util.js';
import definition from '../public/js/expansion/weapons/gravebinder.js';
import behavior from '../public/js/expansion/weapons/gravebinder-behavior.js';
import { Game, strikeClip } from '../public/js/game/game.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function combat(run) {
  const random = Math.random;
  Math.random = mulberry32(1641);
  WEAPONS[definition.id] = definition.weapon;
  WEAPONS[definition.weapon.evo.into] = definition.evolution;
  KINDS[definition.id] = behavior;
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const p = g.player;
    p.hero = { ...p.hero, weapon: definition.id, sprite: 'gravebinder' };
    p.crit = 0;
    const w = new Weapon(g, definition.id, 1);
    p.weapons = [w];
    w.cd = 0;
    run(g, p, w);
  } finally {
    Math.random = random;
  }
}

const foe = (g, dx, dy, extras = {}) =>
  g.spawnEnemy('zombie', g.player.x + dx, g.player.y + dy, { instant: true, hpMul: 100, ...extras });
const refresh = g => g.grid.rebuild(g.enemies, g.player.x, g.player.y);

test('Carrion Tithe prioritizes a lord, feeds from two ordinary foes, and pays the lord once', () => combat((g, p, w) => {
  const lord = foe(g, 65, 0, { lord: true });
  const nearest = foe(g, 54, 0), second = foe(g, 61, -12), third = foe(g, 80, 8);
  const otherLord = foe(g, 74, 0, { lord: true });
  refresh(g);
  assert.equal(w.previewTarget(), lord);
  w.update(0);
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(w.cd, w.s.cd);
  assert.equal(lord.hp, lord.maxHp);
  assert.ok(nearest.hp < nearest.maxHp && second.hp < second.maxHp);
  assert.equal(third.hp, third.maxHp);
  assert.equal(otherLord.hp, otherLord.maxHp);
  const flight = w.fx;
  assert.equal(flight.fed, 2);
  assert.equal(flight.damage, w.s.dmg * 1.2);
  g.time = 0.17;
  assert.ok(flight.update());
  assert.equal(lord.hp, lord.maxHp);
  g.time = 0.18;
  assert.equal(flight.update(), false);
  assert.ok(lord.hp < lord.maxHp);
  assert.equal(lord.slowT, 0);
  const dealt = w.dmgDealt;
  w.update(0.18);
  assert.equal(flight.update(), false);
  assert.equal(w.dmgDealt, dealt);
  assert.equal(g.stats.damage, dealt);
}));

test('Ravenous Edict caps siphons and crowd amplification; a solitary lord yields no fuel', () => combat((g, p, w) => {
  const lord = foe(g, 62, 0, { lord: true });
  refresh(g);
  w.update(0);
  assert.equal(w.fx.fed, 0);
  assert.equal(w.fx.damage, w.s.dmg);
  const first = w.fx;
  for (let level = 1; level < 8; level++) w.levelUp();
  const rankEight = w.s;
  assert.ok(w.evolve());
  assert.equal(first.update(), false);
  assert.equal(lord.hp, lord.maxHp);
  assert.ok(w.s.dmg > rankEight.dmg && w.s.cd < rankEight.cd && w.s.area > rankEight.area);
  p.amount = 9;
  w.recompute();
  const crowd = Array.from({ length: 8 }, (_, i) => foe(g, 62 + (i - 3) * 4, 7));
  refresh(g);
  w.cd = 0;
  w.update(0);
  assert.equal(w.fx.fed, 6);
  assert.equal(w.fx.damage, w.s.dmg * 1.5);
  assert.equal(crowd.filter(e => e.hp < e.maxHp).length, 6);
}));

test('manual release uses the native Lich strike timing and cancels blocked or recycled targets', () => combat((g, p, w) => {
  g.inCrypt = {};
  const wall = p.x + 46;
  g.world.solid = x => x >= wall;
  g.world.lineOfSight = (x, _y, tx) => x < wall && tx < wall;
  const blocked = foe(g, 53, 0);
  refresh(g);
  assert.ok(g.strike());
  const { delay } = strikeClip(SPR.gravebinder);
  assert.equal(delay, 1 / 12);
  g.cryptTime = delay;
  w.update(delay, true);
  assert.equal(w.fx, null);
  assert.equal(blocked.hp, blocked.maxHp);

  const target = foe(g, 34, 0);
  refresh(g);
  w.cd = 0;
  assert.ok(g.strike());
  g.cryptTime = delay * 2 - 0.01;
  w.update(delay - 0.01, true);
  assert.equal(w.fx, null);
  g.cryptTime = delay * 2;
  w.update(0.01, true);
  const flight = w.fx;
  assert.equal(flight.target, target);
  assert.equal(flight.fed, 0, 'wall also prevents the siphon');
  target.id++;
  g.cryptTime += 0.2;
  assert.equal(flight.update(), false);
  assert.equal(target.hp, target.maxHp);
  assert.equal(blocked.hp, blocked.maxHp);
}));
