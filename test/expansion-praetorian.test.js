import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { WEAPONS } from '../public/js/data/weapons.js';
import { SPR } from '../public/js/engine/sprites.js';
import { mulberry32 } from '../public/js/engine/util.js';
import blueprint from '../public/js/expansion/weapons/praetorian.js';
import behavior from '../public/js/expansion/weapons/praetorian-behavior.js';
import { Game, strikeClip } from '../public/js/game/game.js';
import { EnemyShot } from '../public/js/game/projectiles.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function combat(run) {
  const random = Math.random;
  Math.random = mulberry32(642);
  WEAPONS[blueprint.id] = blueprint.weapon;
  WEAPONS[blueprint.weapon.evo.into] = blueprint.evolution;
  KINDS[blueprint.id] = behavior;
  try {
    const game = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const p = game.player;
    p.hero = { ...p.hero, sprite: 'praetorian', weapon: blueprint.id };
    const weapon = new Weapon(game, blueprint.id, 1);
    p.weapons = [weapon];
    weapon.cd = 0;
    game.world.lineOfSight = () => true;
    game.world.solid = () => false;
    Math.random = () => 0.5;
    run(game, p, weapon);
  } finally {
    Math.random = random;
  }
}

function foe(g, dx, dy, extra = {}) {
  return g.spawnEnemy('zombie', g.player.x + dx, g.player.y + dy, { instant: true, hpMul: 100, ...extra });
}

function shot(g, dx, dy, ang = Math.PI) {
  const p = g.player, bolt = new EnemyShot(g, p.x + dx, p.y + dy, ang, 130, 10, 'darkbolt');
  g.eshots.push(bolt);
  return bolt;
}

test('Shieldward Blade cuts only its limited front rank and blocks a late incoming bolt', () => combat((g, p, w) => {
  const front = [17, 22, 26, 30].map(x => foe(g, x, 0));
  const rear = foe(g, -12, 0), flank = foe(g, 19, 27);
  const behind = shot(g, -20, 0, 0), departing = shot(g, 18, 0, 0);
  const first = shot(g, 35, 0), second = shot(g, 36, 0);
  g.grid.rebuild(g.enemies, p.x, p.y);
  w.update(0);
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(w.cd, w.s.cd);
  assert.deepEqual(front.map(e => e.hp < e.maxHp), [true, true, false, false]);
  assert.equal(rear.hp, rear.maxHp);
  assert.equal(flank.hp, flank.maxHp);
  assert.ok(!first.dead && !second.dead, 'both shots are outside the shield when the stroke lands');
  first.update(0.1);
  second.update(0.1);
  g.time += 0.1;
  w.update(0.1);
  assert.ok(first.dead && !second.dead, 'rank one blocks a single shot during the guard');
  assert.ok(!behind.dead && !departing.dead);
  const hp = p.hp;
  first.update(0.15);
  assert.equal(p.hp, hp, 'the blocked shot cannot hurt the hero');
}));

test('one parry arms only the next cut and never multihits a lord', () => combat((g, p, w) => {
  const lord = foe(g, 22, 0, { lord: true });
  const first = shot(g, 20, 0), second = shot(g, 23, 0);
  g.grid.rebuild(g.enemies, p.x, p.y);
  w.update(0);
  assert.ok(first.dead && !second.dead);
  assert.equal(w.dmgDealt, 43);
  g.eshots.length = 0;
  g.time = w.s.cd;
  w.update(w.s.cd);
  assert.equal(w.dmgDealt, 43 + Math.round(43 * 1.28));
  g.time += w.s.cd;
  w.update(w.s.cd);
  assert.equal(w.dmgDealt, 86 + Math.round(43 * 1.28));
  assert.equal(lord.maxHp - lord.hp, w.dmgDealt);
  assert.equal(lord.stunT, 0);
  assert.equal(lord.slowT, 0);
}));

test('crypt release respects the approved clip, stone walls and guard recovery at high haste', () => combat((g, p, w) => {
  g.inCrypt = {};
  const front = foe(g, 20, 0), blocked = foe(g, 24, 11);
  const wallY = p.y + 8;
  g.world.lineOfSight = (_x, _y, _tx, y) => y < wallY;
  const visibleShot = shot(g, 23, 0), hiddenShot = shot(g, 15, 10);
  g.grid.rebuild(g.enemies, p.x, p.y);
  const clip = strikeClip(SPR.praetorian);
  assert.equal(clip.hit, 8);
  assert.equal(clip.delay, 2 / 24);
  assert.ok(g.strike());
  g.cryptTime = clip.delay - 0.001;
  w.update(g.cryptTime, true);
  assert.equal(front.hp, front.maxHp);
  assert.ok(!visibleShot.dead);
  g.cryptTime = clip.delay;
  w.update(0.001, true);
  assert.ok(front.hp < front.maxHp && visibleShot.dead);
  assert.equal(blocked.hp, blocked.maxHp);
  assert.ok(!hiddenShot.dead);

  for (let rank = 1; rank < 8; rank++) w.levelUp();
  const capped = w.s;
  assert.ok(w.evolve());
  assert.ok(w.s.dmg > capped.dmg && w.s.cd < capped.cd && w.s.guard > capped.guard);
  g.inCrypt = null;
  g.eshots.length = 0;
  p.cooldown = 0.35;
  p.addBuff('haste', 2);
  w.recompute();
  const second = shot(g, 20, 0);
  g.time += 0.5;
  w.update(0.5);
  assert.ok(!second.dead, 'fast weapon releases do not reopen the guard early');
  g.time += 0.23;
  w.update(0.23);
  assert.ok(second.dead, 'a fresh guard can block after recovery');
}));
