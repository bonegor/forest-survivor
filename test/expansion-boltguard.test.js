import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { SPR } from '../public/js/engine/sprites.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { Game, strikeClip } from '../public/js/game/game.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import data from '../public/js/expansion/weapons/boltguard.js';
import behavior from '../public/js/expansion/weapons/boltguard-behavior.js';

function encounter(run) {
  const random = Math.random;
  Math.random = mulberry32(78);
  WEAPONS[data.id] = data.weapon;
  WEAPONS[data.weapon.evo.into] = data.evolution;
  KINDS[data.id] = behavior;
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const p = g.player, w = new Weapon(g, data.id, 0);
    p.hero = { ...p.hero, weapon: data.id, sprite: 'boltguard' };
    p.weapons = [w];
    p.crit = 0;
    g.enemies.length = 0;
    g.world.solid = () => false;
    const strikes = [], hit = g.hitEnemy.bind(g);
    g.hitEnemy = (e, dmg, opts) => {
      strikes.push([e, dmg, opts.kb]);
      return hit(e, dmg, opts);
    };
    w.cd = 0;
    run(g, p, w, strikes);
  } finally {
    Math.random = random;
  }
}

function foe(g, x, y = 0, extra = {}) {
  return g.spawnEnemy('zombie', g.player.x + x, g.player.y + y, { instant: true, hpMul: 100, ...extra });
}

const index = g => g.grid.rebuild(g.enemies, g.player.x, g.player.y);
const bolts = g => g.effects.filter(e => e.kind === 'ratchetBolt');
const sweep = (g, dt) => { g.effects = g.effects.filter(e => e.update(dt)); };

test('Ratchet Crossbow orders a fast sweep front to back and spends exactly three impacts', () => encounter((g, p, w, strikes) => {
  const far = foe(g, 94), third = foe(g, 80), second = foe(g, 56), first = foe(g, 34);
  index(g);
  assert.equal(w.previewTarget(), first);
  w.update(0);
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(w.cd, 1.1);
  w.update(1);
  assert.equal(bolts(g).length, 1, 'the weapon waits for its cooldown');
  sweep(g, 0.35);
  assert.deepEqual(strikes.map(([e]) => e), [first, second, third]);
  assert.deepEqual(strikes.map(([, damage]) => Math.round(damage * 10)), [400, 448, 496]);
  assert.equal(far.hp, far.maxHp);
  assert.equal(w.dmgDealt, g.stats.damage);
  w.update(0.11);
  assert.equal(bolts(g).length, 1);
}));

test('Bastion Crank caps charge and Echo impacts, and a lord stops one bolt', () => encounter((g, p, w, strikes) => {
  for (let rank = 1; rank < 8; rank++) w.levelUp();
  const peak = w.s;
  p.amount = 10;
  assert.ok(w.evolve());
  assert.ok(w.s.dmg > peak.dmg && w.s.cd < peak.cd && w.s.crankCap > peak.crankCap);
  const line = Array.from({ length: 10 }, (_, i) => foe(g, 22 + 15 * i));
  index(g);
  w.update(0.21);
  sweep(g, 0.5);
  assert.deepEqual(strikes.map(([e]) => e), line.slice(0, 8));
  assert.deepEqual(strikes.slice(3).map(([, damage]) => damage), Array(5).fill(69 * 1.54));

  strikes.length = 0;
  g.enemies.length = 0;
  const lord = foe(g, 70, 0, { lord: true }), behind = foe(g, 105);
  index(g);
  w.update(w.s.cd + 0.001);
  sweep(g, 0.4);
  assert.deepEqual(strikes, [[lord, 69, 0]], 'no charge, stagger, or repeat hit against a lone lord');
  assert.equal(behind.hp, behind.maxHp, 'a bolt ends on a strong target');
}));

test('a crypt strike fires on the approved release and the bolt cannot tunnel through stone', () => encounter((g, p, w, strikes) => {
  const target = foe(g, 70), near = foe(g, 25);
  g.inCrypt = {};
  g.world.solid = x => x >= p.x + 38 && x <= p.x + 49;
  g.world.lineOfSight = (x0, _y0, x1) => Math.max(x0, x1) < p.x + 38 || Math.min(x0, x1) > p.x + 49;
  index(g);
  const { delay } = strikeClip(SPR.boltguard);
  assert.equal(delay, 1 / 8);
  w.update(0, true);
  assert.equal(bolts(g).length, 0);
  assert.ok(g.strike());
  g.cryptTime = delay - 0.01;
  w.update(0.01, true);
  assert.equal(bolts(g).length, 0);
  g.cryptTime = delay;
  w.update(0.01, true);
  assert.equal(bolts(g).length, 1);
  sweep(g, 0.4);
  assert.deepEqual(strikes.map(([e]) => e), [near]);
  assert.equal(target.hp, target.maxHp);
  assert.equal(bolts(g).length, 0);
}));
