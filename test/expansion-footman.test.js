import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { mulberry32 } from '../public/js/engine/util.js';
import blueprint from '../public/js/expansion/weapons/footman.js';
import behavior from '../public/js/expansion/weapons/footman-behavior.js';
import { Game } from '../public/js/game/game.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function combat(run) {
  const oldRandom = Math.random;
  Math.random = mulberry32(880);
  // The real Game, hitboxes, enemies and Weapon clock, isolated from the rest of the new roster.
  WEAPONS[blueprint.id] = blueprint.weapon;
  WEAPONS[blueprint.weapon.evo.into] = blueprint.evolution;
  KINDS[blueprint.id] = behavior;
  try {
    const game = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const player = game.player;
    player.hero = { ...player.hero, weapon: blueprint.id };
    const weapon = new Weapon(game, blueprint.id, 1);
    player.weapons = [weapon];
    weapon.cd = 0;
    run(game, player, weapon);
  } finally {
    Math.random = oldRandom;
  }
}

function foe(g, dx, dy, extra = {}) {
  return g.spawnEnemy('zombie', g.player.x + dx, g.player.y + dy, { instant: true, hpMul: 100, ...extra });
}

function tickEffects(g, dt) {
  g.effects = g.effects.filter((effect) => effect.update(dt));
}

test('Linebreaker drives the first hit through a bounded rank after its impact delay', () => combat((g, p, w) => {
  const lead = foe(g, 19, 0), rear = foe(g, -12, 0), beside = foe(g, 20, 26);
  const rank = [[28, 0], [32, 2], [36, 0], [42, 0], [44, -1]].map(([x, y]) => foe(g, x, y));
  g.grid.rebuild(g.enemies, p.x, p.y);
  w.update(0);
  assert.ok(lead.hp < lead.maxHp);
  assert.equal(lead.stunT, w.s.dur);
  assert.equal(w.cd, w.s.cd);
  assert.equal(p.heroAttack.weapon, w);
  assert.ok(rank.every((e) => e.hp === e.maxHp));
  const leadAfterCut = lead.hp;
  tickEffects(g, 0.08);
  assert.ok(rank.every((e) => e.hp === e.maxHp));
  tickEffects(g, 0.04);
  assert.deepEqual(rank.map((e) => e.hp < e.maxHp), [true, true, true, false, false]);
  assert.equal(lead.hp, leadAfterCut);
  assert.equal(rear.hp, rear.maxHp);
  assert.equal(beside.hp, beside.maxHp);
  const recorded = w.dmgDealt;
  tickEffects(g, 0.07);
  w.update(0.5);
  assert.equal(w.dmgDealt, recorded, 'the shock does not repeat and the weapon is still on cooldown');
  assert.equal(g.stats.damage, recorded);
}));

test('Iron Advance has a stronger single hit and a crypt lord never gets stun-locked', () => combat((g, p, w) => {
  const lord = foe(g, -21, 0, { lord: true });
  p.face = -1;
  g.grid.rebuild(g.enemies, p.x, p.y);
  for (let rank = 1; rank < 8; rank++) w.levelUp();
  const capped = w.s;
  assert.ok(w.evolve());
  assert.equal(g.mainWeapon(), w);
  assert.ok(w.s.dmg > capped.dmg && w.s.cd < capped.cd && w.s.amount > capped.amount);
  w.cd = 0;
  w.update(0);
  const hp = lord.hp;
  assert.ok(hp < lord.maxHp);
  assert.equal(p.face, -1);
  assert.equal(lord.stunT, 0);
  assert.equal(lord.rootT, 0);
  assert.equal(lord.slowT, 0);
  tickEffects(g, 0.3);
  assert.equal(lord.hp, hp);
}));

test('a crypt strike waits for its release and stops at a wall', () => combat((g, p, w) => {
  const f = foe(g, 24, 0), blocked = foe(g, 40, 0);
  g.inCrypt = {};
  g.world.lineOfSight = (_x, _y, x) => x < blocked.x;
  g.grid.rebuild(g.enemies, p.x, p.y);
  w.update(0, true);
  assert.equal(f.hp, f.maxHp);
  p.strike(0, g.clock);
  w.strike(0, 0.2, f);
  g.cryptTime = 0.19;
  w.update(0.19, true);
  assert.equal(f.hp, f.maxHp);
  g.cryptTime = 0.2;
  w.update(0.01, true);
  assert.ok(f.hp < f.maxHp);
  tickEffects(g, 0.15);
  assert.equal(blocked.hp, blocked.maxHp);
}));
