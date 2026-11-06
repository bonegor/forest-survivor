import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { mulberry32 } from '../public/js/engine/util.js';
import blueprint from '../public/js/expansion/weapons/wraith.js';
import behavior from '../public/js/expansion/weapons/wraith-behavior.js';
import { Game } from '../public/js/game/game.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function combat(run) {
  const random = Math.random;
  Math.random = mulberry32(91524);
  WEAPONS[blueprint.id] = blueprint.weapon;
  WEAPONS[blueprint.weapon.evo.into] = blueprint.evolution;
  KINDS[blueprint.id] = behavior;
  try {
    const game = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const p = game.player;
    p.hero = { ...p.hero, weapon: blueprint.id };
    p.crit = 0;
    const w = new Weapon(game, blueprint.id, 1);
    p.weapons = [w];
    w.cd = 0;
    run(game, p, w);
  } finally {
    Math.random = random;
  }
}

function foe(g, dx, dy = 0, extra = {}) {
  const p = g.player;
  return g.spawnEnemy('zombie', p.x + dx, p.y + dy, { instant: true, hpMul: 100, ...extra });
}

function refresh(g) {
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
}

test('Aftercut can defend the previous cast’s position while its owner cuts elsewhere', () => combat((g, p, w) => {
  const lead = foe(g, 18), origin = p.x;
  refresh(g);
  w.update(0);
  assert.equal(w.cd, w.s.cd);
  assert.equal(p.heroAttack.weapon, w);
  assert.ok(lead.hp < lead.maxHp);
  const previous = w.fx, straggler = foe(g, 23, 3), behindShade = foe(g, -22);
  p.x += 58;
  const next = foe(g, 18);
  refresh(g);
  w.update(w.s.cd - 0.01);
  assert.equal(next.hp, next.maxHp);
  previous.update(w.s.cd - 0.01);
  w.update(0.02);
  assert.ok(next.hp < next.maxHp);
  assert.ok(straggler.hp < straggler.maxHp);
  assert.equal(behindShade.hp, behindShade.maxHp);
  assert.equal(previous.x, origin);
  assert.equal(previous.update(0), false);
  assert.equal(w.fx.x, p.x);
  assert.equal(w.dmgDealt, g.stats.damage);
}));

test('a cast damages a solitary lord once and respects separate capped crowd budgets', () => combat((g, p, w) => {
  const lord = foe(g, 16, 0, { lord: true });
  refresh(g);
  w.update(0);
  const one = lord.hp;
  w.update(w.s.cd);
  assert.ok(one - lord.hp >= w.s.dmg * 0.89);
  assert.ok(one - lord.hp < w.s.dmg * 1.12, 'the shade cannot double-hit a lord');
  assert.equal(lord.stunT, 0);
  assert.equal(lord.slowT, 0);

  const oldCrowd = [-8, -4, 4, 8].map(y => foe(g, 24, y));
  p.x += 57;
  const newCrowd = [-9, -5, 0, 5, 9].map(y => foe(g, 20, y));
  refresh(g);
  w.update(w.s.cd);
  assert.equal(newCrowd.filter(e => e.hp < e.maxHp).length, 3);
  assert.ok(oldCrowd.filter(e => e.hp < e.maxHp).length <= 2);
}));

test('crypt blows honor their release and walls, and evolution clears the prior shade', () => combat((g, p, w) => {
  const clear = foe(g, 17), blocked = foe(g, 27), boundary = p.x + 23;
  g.inCrypt = {};
  g.world.solid = x => x >= boundary;
  g.world.lineOfSight = (x, _y, tx) => x < boundary && tx < boundary;
  refresh(g);
  const delay = 2 / 12;
  p.strike(0, g.clock);
  w.strike(0, delay, clear);
  g.cryptTime = delay - 0.01;
  w.update(delay - 0.01, true);
  assert.equal(clear.hp, clear.maxHp);
  g.cryptTime = delay;
  w.update(0.01, true);
  assert.ok(clear.hp < clear.maxHp);
  assert.equal(blocked.hp, blocked.maxHp);
  const prior = w.fx;
  while (!w.maxed) w.levelUp();
  const capped = w.s;
  assert.ok(w.evolve());
  assert.equal(prior.update(0), false);
  assert.ok(w.s.dmg > capped.dmg && w.s.cd < capped.cd && w.s.echo > capped.echo);
}));
