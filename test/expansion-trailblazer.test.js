import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { mulberry32 } from '../public/js/engine/util.js';
import data from '../public/js/expansion/weapons/trailblazer.js';
import behavior from '../public/js/expansion/weapons/trailblazer-behavior.js';
import { Game } from '../public/js/game/game.js';
import { releaseProjectile } from '../public/js/game/projectiles.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function encounter(run) {
  const random = Math.random;
  Math.random = mulberry32(506);
  WEAPONS[data.id] = data.weapon;
  WEAPONS[data.weapon.evo.into] = data.evolution;
  KINDS[data.id] = behavior;
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const p = g.player;
    g.enemies.length = 0;
    g.world.solid = () => false;
    p.hero = { ...p.hero, weapon: data.id };
    p.crit = 0;
    const w = new Weapon(g, data.id, 0);
    w.cd = 0;
    p.weapons = [w];
    run(g, p, w);
  } finally {
    Math.random = random;
  }
}

function foe(g, dx, dy, extra = {}) {
  return g.spawnEnemy('zombie', g.player.x + dx, g.player.y + dy, { instant: true, hpMul: 100, ...extra });
}

function fly(g, frames = 30) {
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
  for (let i = 0; i < frames; i++) {
    g.projectiles = g.projectiles.filter(arrow => {
      if (arrow.update(1 / 60)) return true;
      releaseProjectile(arrow);
      return false;
    });
  }
}

function effects(g, dt) {
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
  g.effects = g.effects.filter(effect => effect.update(dt));
}

test('Wayline Bow shoots once on cooldown and trips only the nearest three other contacts', () => encounter((g, p, w) => {
  const pin = foe(g, 94, 0);
  g.grid.rebuild(g.enemies, p.x, p.y);
  assert.equal(w.previewTarget(), pin);
  w.update(0);
  assert.equal(w.cd, w.s.cd);
  assert.equal(g.projectiles.length, 1);
  assert.equal(p.heroAttack.weapon, w);
  w.update(0.5);
  assert.equal(g.projectiles.length, 1);
  fly(g);
  assert.equal(g.effects.length, 1);
  const pinHp = pin.hp;
  assert.ok(pinHp < pin.maxHp);

  const contacts = [0, 1, 3, 4, 5].map((dy, i) => foe(g, 20 + 10 * i, dy));
  const outside = foe(g, 53, 30);
  effects(g, 0.05);
  assert.ok(contacts.every(e => e.hp === e.maxHp));
  effects(g, 0.04);
  assert.deepEqual(contacts.map(e => e.hp < e.maxHp), [true, true, true, false, false]);
  assert.equal(contacts[0].slowF, 0.2);
  assert.equal(pin.hp, pinHp);
  assert.equal(outside.hp, outside.maxHp);
  const total = w.dmgDealt;
  effects(g, 0.25);
  assert.equal(w.dmgDealt, total);
  assert.equal(w.dmgDealt, g.stats.damage);
}));

test('Runewire scales, caps Echo at seven contacts, and never multiplies boss damage', () => encounter((g, p, w) => {
  p.amount = 6;
  for (let rank = 1; rank < 8; rank++) w.levelUp();
  const rankEight = w.s;
  assert.ok(w.evolve());
  assert.ok(w.s.dmg > rankEight.dmg && w.s.cd < rankEight.cd && w.s.dur > rankEight.dur);
  const pin = foe(g, 112, 0, { lord: true });
  g.grid.rebuild(g.enemies, p.x, p.y);
  w.update(0.2);
  fly(g);
  assert.ok(pin.hp < pin.maxHp);
  const pinHp = pin.hp;
  const lord = foe(g, 47, 0, { lord: true });
  const contacts = Array.from({ length: 9 }, (_, i) => foe(g, 17 + i * 8, 3));
  effects(g, 0.08);
  assert.equal(contacts.filter(e => e.hp < e.maxHp).length, 7);
  assert.equal(lord.hp, lord.maxHp);
  assert.equal(lord.slowT, 0);
  assert.equal(pin.hp, pinHp);
}));

test('a crypt shot waits for the real release and a wall blocks the arrow and tripline', () => encounter((g, p, w) => {
  const blocked = foe(g, 103, 0);
  g.inCrypt = {};
  g.world.solid = x => x >= p.x + 40 && x <= p.x + 68;
  g.world.lineOfSight = (ax, _ay, bx) => Math.max(ax, bx) < p.x + 40 || Math.min(ax, bx) > p.x + 68;
  g.grid.rebuild(g.enemies, p.x, p.y);
  assert.equal(w.previewTarget(), null);
  w.update(0, true);
  assert.equal(g.projectiles.length, 0);
  p.strike(0, g.clock);
  w.strike(0, 0.17, blocked);
  g.cryptTime = 0.16;
  w.update(0.16, true);
  assert.equal(g.projectiles.length, 0);
  g.cryptTime = 0.17;
  w.update(0.01, true);
  assert.equal(g.projectiles.length, 1);
  fly(g);
  assert.equal(g.effects.length, 0);
  assert.equal(blocked.hp, blocked.maxHp);
}));
