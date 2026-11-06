import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { HEROES } from '../public/js/data/heroes.js';
import { WEAPONS } from '../public/js/data/weapons.js';
import { input } from '../public/js/engine/input.js';
import { SPR } from '../public/js/engine/sprites.js';
import { mulberry32 } from '../public/js/engine/util.js';
import behavior from '../public/js/expansion/weapons/swordbearer-behavior.js';
import blueprint from '../public/js/expansion/weapons/swordbearer.js';
import { Game, strikeClip } from '../public/js/game/game.js';
import { KINDS, Weapon } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function combat(run) {
  const random = Math.random, previous = input.bot;
  Math.random = mulberry32(341);
  try {
    const g = new Game({
      hero: HEROES.swordbearer ? 'swordbearer' : 'knight', mode: 's15', move: 1,
      meta: metaBonuses(defaultProfile()), settings: { numbers: false },
    });
    const p = g.player;
    if (!HEROES.swordbearer) {
      WEAPONS[blueprint.id] = blueprint.weapon;
      WEAPONS[blueprint.weapon.evo.into] = blueprint.evolution;
      KINDS[blueprint.id] = behavior;
      p.hero = { ...p.hero, sprite: 'swordbearer', weapon: blueprint.id, stats: {} };
      p.weapons = [new Weapon(g, blueprint.id, 0)];
    }
    g.world.collide = () => {};
    g.world.lineOfSight = () => true;
    p.might = 1;
    Math.random = () => 0.5;
    input.bot = { x: 0, y: 0 };
    run(g, p, g.mainWeapon());
  } finally {
    Math.random = random;
    input.bot = previous;
  }
}

function move(g, p, w, frames, dx) {
  input.bot = { x: dx, y: 0 };
  w.cd = 999;
  for (let i = 0; i < frames; i++) {
    g.time += 1 / 60;
    p.update(1 / 60);
    w.update(1 / 60);
  }
}

function foe(g, dx, dy = 0, extra = {}) {
  const p = g.player;
  return g.spawnEnemy('zombie', p.x + dx, p.y + dy, { instant: true, hpMul: 100, ...extra });
}

test('actual stride powers one longer cut with a bounded crowd budget and heavier tip', () => combat((g, p, w) => {
  move(g, p, w, 42, 1);
  const front = [16, 24, 40, 46, 49, 53].map(x => foe(g, x));
  const back = foe(g, -16), side = foe(g, 21, 32);
  g.grid.rebuild(g.enemies, p.x, p.y);
  w.cd = 0;
  w.update(0);
  assert.equal(p.heroAttack.weapon, w);
  assert.equal(w.cd, w.s.cd);
  assert.equal(g.effects.at(-1).charged, true);
  assert.deepEqual(front.map(e => e.maxHp - e.hp), [44, 44, 54, 54, 0, 0]);
  assert.equal(back.hp, back.maxHp);
  assert.equal(side.hp, side.maxHp);
  w.update(0.2);
  assert.equal(w.dmgDealt, 196, 'no extra hits before the cooldown');
  g.time += w.s.cd;
  w.update(w.s.cd);
  assert.equal(g.effects.at(-1).charged, false);
  assert.deepEqual(front.map(e => e.maxHp - e.hp), [88, 88, 54, 54, 0, 0]);
}));

test('turning or running against a wall does not carry charge into the next cut', () => combat((g, p, w) => {
  move(g, p, w, 42, 1);
  move(g, p, w, 10, -1);
  const rear = foe(g, -18, 0, { lord: true });
  g.grid.rebuild(g.enemies, p.x, p.y);
  w.cd = 0;
  w.update(0);
  assert.equal(g.effects.at(-1).charged, false);
  assert.equal(rear.maxHp - rear.hp, 44);
  const { x, y } = p;
  g.world.collide = entity => Object.assign(entity, { x, y });
  move(g, p, w, 75, -1);
  w.cd = 0;
  w.update(0);
  assert.equal(g.effects.at(-1).charged, false);
  assert.equal(rear.maxHp - rear.hp, 88, 'the lord takes one ordinary hit per swing');
  assert.equal(rear.stunT, 0);
}));

test('crypt damage follows the approved release, respects a wall and scales through evolution', () => combat((g, p, w) => {
  g.inCrypt = {};
  const near = foe(g, 16), hidden = foe(g, 23);
  g.world.lineOfSight = (_x, _y, tx) => tx < p.x + 21;
  g.grid.rebuild(g.enemies, p.x, p.y);
  const clip = strikeClip(SPR.swordbearer);
  assert.equal(clip.hit, 8);
  assert.equal(clip.delay, 2 / 24);
  w.cd = 0;
  assert.ok(g.strike());
  g.cryptTime = clip.delay - 0.001;
  w.update(g.cryptTime, true);
  assert.equal(near.hp, near.maxHp);
  g.cryptTime = clip.delay;
  w.update(0.001, true);
  assert.equal(near.maxHp - near.hp, 44);
  assert.equal(hidden.hp, hidden.maxHp);
  for (let rank = 1; rank < 8; rank++) w.levelUp();
  const capped = w.s;
  assert.ok(w.evolve());
  assert.ok(w.s.dmg > capped.dmg && w.s.cd < capped.cd && w.s.stride > capped.stride);
  assert.ok(w.s.chargeReach > capped.chargeReach && w.s.edge > capped.edge);
}));
