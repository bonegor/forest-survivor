import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { SPR } from '../public/js/engine/sprites.js';
import blueprint from '../public/js/expansion/weapons/thornkeeper.js';
import behavior from '../public/js/expansion/weapons/thornkeeper-behavior.js';
import { Game, strikeClip } from '../public/js/game/game.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function combat(run) {
  WEAPONS[blueprint.id] = blueprint.weapon;
  WEAPONS[blueprint.weapon.evo.into] = blueprint.evolution;
  KINDS[blueprint.id] = behavior;
  const g = new Game({ hero: 'knight', mode: 's15', seed: 200,
    meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
  const p = g.player;
  p.hero = { ...p.hero, weapon: blueprint.id, sprite: 'thornkeeper' };
  p.crit = 0;
  const w = new Weapon(g, blueprint.id, 1);
  p.weapons = [w];
  w.cd = 0;
  run(g, p, w);
}

function foe(g, x, y, extra = {}) {
  const p = g.player;
  return g.spawnEnemy('zombie', p.x + x, p.y + y, { instant: true, hpMul: 100, ...extra });
}

function index(g) {
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
}

test('Briar Compass winds inward across a fixed point and spends at most five hits at rank one', () => combat((g, p, w) => {
  const centre = foe(g, 56, 0);
  const pack = Array.from({ length: 18 }, (_, i) => foe(g, 59 + i % 3, 16 + i % 6));
  const distant = foe(g, 106, 0);
  index(g);
  w.update(0);
  const cast = w.fx;
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(cast.x, centre.x);
  assert.equal(w.cd, w.s.cd);
  assert.equal(cast.spokes.length, 4);
  assert.equal(w.dmgDealt, 0, 'damage waits for the moving thorn heads');
  p.x -= 14;
  cast.update(0.26);
  assert.equal(cast.hit.size, 5);
  assert.equal([centre, ...pack].filter(e => e.hp < e.maxHp).length, 5);
  assert.equal(distant.hp, distant.maxHp);
  const dealt = w.dmgDealt;
  cast.update(0.05);
  w.update(0.12);
  assert.equal(w.dmgDealt, dealt);
  assert.equal(g.stats.damage, dealt);
  assert.equal(w.fx, cast, 'a sweep cannot bypass the cooldown');
}));

test('overlapping spokes cannot multiply lord damage, and evolution raises bounded crowd capacity', () => combat((g, p, w) => {
  const lord = foe(g, -58, 0, { lord: true });
  index(g);
  w.update(0);
  const cast = w.fx;
  assert.equal(p.heroAttack.ang, Math.PI);
  for (let i = 0; i < 24; i++) cast.update(1 / 60);
  assert.equal(cast.hit.size, 1);
  assert.ok(lord.maxHp - lord.hp >= 38 && lord.maxHp - lord.hp <= 48);
  assert.equal(lord.kx, 0);
  assert.equal(lord.stunT, 0);
  for (let rank = 1; rank < 8; rank++) w.levelUp();
  const before = w.s;
  assert.ok(w.evolve());
  assert.ok(w.s.dmg > before.dmg && w.s.cd < before.cd && w.s.area > before.area);
  p.amount = 20;
  w.recompute();
  w.cd = 0;
  w.update(0);
  assert.equal(w.fx.spokes.length, 8);
  assert.equal(w.fx.left, 12);
}));

test('crypt strike waits for the approved release and only sweeps unobstructed ground', () => combat((g, p, w) => {
  const front = foe(g, 48, 0), blocked = foe(g, 48, 11);
  const wallY = p.y + 8;
  g.inCrypt = {};
  g.world.solid = (_x, y) => y >= wallY;
  g.world.lineOfSight = (_x, y, _tx, ty) => y < wallY && ty < wallY;
  index(g);
  const delay = strikeClip(SPR.thornkeeper).delay;
  assert.equal(delay, 1 / 12);
  assert.ok(g.strike());
  g.cryptTime = delay - 0.01;
  w.update(0.01, true);
  assert.equal(w.fx, null);
  g.cryptTime = delay;
  w.update(0.01, true);
  assert.ok(w.fx.spokes.every(s => p.y + s.dy < wallY));
  w.fx.update(0.25);
  assert.ok(front.hp < front.maxHp);
  assert.equal(blocked.hp, blocked.maxHp);
}));

test('large fast Convergences reach the target without cancelling the preceding cast', () => combat((g, p, w) => {
  const target = foe(g, 80, 0);
  index(g);
  w.evolve();
  p.area = 3;
  p.cooldown = 0.35;
  p.addBuff('haste', 20);
  w.recompute();
  w.cd = 0;
  for (let frame = 0; frame < 180; frame++) {
    g.time += 1 / 60;
    w.update(1 / 60);
    g.effects = g.effects.filter(fx => fx.w !== w || fx.update(1 / 60));
    assert.ok((w.convergences?.length || 0) <= 6);
  }
  assert.ok(w.dmgDealt > 100 && target.hp < target.maxHp);
}));
