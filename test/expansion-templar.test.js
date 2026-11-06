import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { mulberry32 } from '../public/js/engine/util.js';
import blueprint from '../public/js/expansion/weapons/templar.js';
import behavior from '../public/js/expansion/weapons/templar-behavior.js';
import { Game } from '../public/js/game/game.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function combat(run) {
  const random = Math.random;
  Math.random = mulberry32(1388);
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
    Math.random = random;
  }
}

function foe(g, dx, dy, extra = {}) {
  const p = g.player;
  return g.spawnEnemy('zombie', p.x + dx, p.y + dy, { instant: true, hpMul: 100, ...extra });
}

function refresh(g) {
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
}

test('Votive Edge pays a bounded charge per body across the transverse line', () => combat((g, p, w) => {
  const lead = foe(g, 24, 0), rear = foe(g, -12, 0), beyond = foe(g, 42, 0);
  const flank = [-18, -12, -6, 6, 12, 18].map(dy => foe(g, 24, dy));
  refresh(g);
  w.update(0);
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(w.cd, w.s.cd);
  assert.ok(lead.hp < lead.maxHp);
  assert.equal(lead.slowT, 0.7);
  assert.deepEqual(flank.map(e => e.hp < e.maxHp), [false, true, true, true, true, false]);
  assert.equal(rear.hp, rear.maxHp);
  assert.equal(beyond.hp, beyond.maxHp);
  const dealt = w.dmgDealt;
  w.fx.update(0.25);
  w.update(0.25);
  assert.equal(w.dmgDealt, dealt);
  assert.equal(g.stats.damage, dealt);
}));

test('the ward holds its world position, catches an entrant, and only hits a lord once', () => combat((g, p, w) => {
  const lord = foe(g, -24, 0, { lord: true });
  const straggler = foe(g, -44, 8);
  p.face = -1;
  refresh(g);
  w.update(0);
  assert.equal(p.face, -1);
  assert.ok(lord.hp < lord.maxHp);
  assert.equal(lord.slowT, 0);
  assert.equal(lord.stunT, 0);
  assert.equal(straggler.hp, straggler.maxHp);
  const afterFirst = lord.hp;
  p.x += 20;
  straggler.x += 20;
  refresh(g);
  w.fx.update(0.45);
  assert.ok(straggler.hp < straggler.maxHp);
  assert.equal(lord.hp, afterFirst);
  const ward = w.fx;
  assert.equal(ward.update(0.5), false);
  assert.equal(w.fx, null);
}));

test('crypt wards wait for the sword release and the line stops at stone', () => combat((g, p, w) => {
  const wallY = p.y + 8;
  const front = foe(g, 24, 0), blocked = foe(g, 24, 12);
  g.inCrypt = {};
  g.world.solid = (_x, y) => y >= wallY;
  g.world.lineOfSight = (_x, y, _tx, ty) => y < wallY && ty < wallY;
  refresh(g);
  p.strike(0, g.clock);
  w.strike(0, 0.167, front);
  g.cryptTime = 0.15;
  w.update(0.15, true);
  assert.equal(front.hp, front.maxHp);
  assert.equal(w.fx, null);
  g.cryptTime = 0.167;
  w.update(0.017, true);
  assert.ok(front.hp < front.maxHp);
  assert.ok(w.fx.a[1] < wallY);
  assert.equal(blocked.hp, blocked.maxHp);
  const ward = w.fx;
  for (let rank = 1; rank < 8; rank++) w.levelUp();
  const capped = w.s;
  assert.ok(w.evolve());
  assert.equal(ward.update(0), false, 'evolution removes the prior ward');
  assert.ok(w.s.dmg > capped.dmg && w.s.cd < capped.cd && w.s.area > capped.area && w.s.amount > capped.amount);
}));
