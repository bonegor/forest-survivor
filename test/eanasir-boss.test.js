import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Dungeon, cryptHasEaNasir } from '../public/js/game/dungeon.js';
import { EnemyShot } from '../public/js/game/projectiles.js';
import { MERCHANT, merchantAI } from '../public/js/game/eanasir-boss.js';
import { ENEMIES, EA_NASIR_CHANCE } from '../public/js/data/enemies.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { mulberry32 } from '../public/js/engine/util.js';

const rareSeed = Array.from({ length: 200 }, (_, i) => i).find(seed => cryptHasEaNasir(seed, 'knight'));
const normalSeed = Array.from({ length: 200 }, (_, i) => i).find(seed => !cryptHasEaNasir(seed, 'knight'));

function gameCase(fn) {
  const before = Math.random;
  Math.random = mulberry32(7);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: {}, headless: true });
    g.enemies = [];
    return fn(g, g.player);
  } finally {
    Math.random = before;
  }
}

test('Ea-nāṣir is a stable five-percent crypt roll, never rolled for himself', () => {
  assert.equal(EA_NASIR_CHANCE, 0.05);
  let count = 0;
  const before = Math.random;
  Math.random = () => { throw new Error('A crypt roll must not draw combat dice'); };
  try {
    for (let seed = 0; seed < 10000; seed++) {
      count += Number(cryptHasEaNasir(seed, 'knight'));
      assert.equal(cryptHasEaNasir(seed, 'eanasir'), false);
    }
    assert.equal(cryptHasEaNasir(rareSeed, 'knight'), true);
    assert.equal(cryptHasEaNasir(rareSeed, 'knight'), true);
  } finally { Math.random = before; }
  assert.ok(count > 425 && count < 575, `${count} rare crypts in 10000 seeds`);
});

test('a rare crypt replaces its lord group with one stronger merchant, and his fall clears it', () => gameCase((g, p) => {
  g.inCrypt = { key: 'merchant', hp: p.hp, minute: 0, depth: 1 };
  const world = new Dungeon(g, 1, rareSeed, { name: 'Copper Crypt', theme: 'crypt', lords: 4 });
  const lords = g.enemies.filter(e => e.lord);
  assert.equal(world.eanasir, true);
  assert.equal(world.lordCount, 1);
  assert.equal(lords.length, 1);
  const e = lords[0];
  assert.equal(e.type, 'eanasir');
  assert.equal(e.name, 'Ea-nāṣir');
  assert.equal(world.guardian, e);
  assert.ok(e.sleeping && e.elite && !e.mod);
  assert.equal(e.maxHp, ENEMIES.eanasir.hp * g.diff.health * g.map.foe.hp * 20);
  assert.ok(e.maxHp > ENEMIES.skeletonmage.hp * g.diff.health * g.map.foe.hp * 20);
  assert.ok(g.enemies.some(o => o.pack === e.pack && o.dormant));
  p.x = world.start.x;
  p.y = world.start.y;
  g.killEnemy(e);
  assert.equal(world.lordsLeft().length, 0);
  assert.ok(g.cleared.has('merchant'));
  assert.ok(world.way, 'his fall opens the same lit escape as the usual lord group');
}));

test('ordinary crypts retain their group and merchant heroes cannot meet themselves', () => gameCase((g, p) => {
  const normal = new Dungeon(g, 1, normalSeed, { name: 'Crypt', theme: 'crypt', lords: 3 });
  assert.equal(normal.lordCount, 3);
  assert.equal(g.enemies.some(e => e.type === 'eanasir'), false);
  g.enemies = [];
  p.hero = { ...p.hero, id: 'eanasir' };
  const self = new Dungeon(g, 1, rareSeed, { name: 'Crypt', theme: 'crypt', lords: 3 });
  assert.equal(self.eanasir, false);
  assert.equal(self.lordCount, 3);
  assert.equal(g.enemies.some(e => e.type === 'eanasir'), false);
}));

function merchant(g, p) {
  g.world.lineOfSight = () => true;
  g.world.steer = () => [1, 0];
  g.world.solid = () => false;
  const e = g.spawner.spawnLord(p.x + 110, p.y, 'eanasir');
  e.sleeping = false;
  e.cdT = e.cd2 = e.cd3 = 99;
  return e;
}

test('the merchant warns then casts magic and copper, and enrages to three magic bolts', () => gameCase((g, p) => {
  const e = merchant(g, p);
  e.cd2 = 0;
  merchantAI(e, 1 / 60);
  assert.equal(e.state, 'wind');
  assert.equal(g.eshots.length, 0);
  merchantAI(e, MERCHANT.magicWind + 0.01);
  assert.equal(g.eshots.length, 1);
  assert.equal(g.eshots[0].kind, 'cryptfireball');
  assert.ok(g.eshots[0].vx < 0);
  g.eshots = [];
  e.cd3 = 0;
  merchantAI(e, 1 / 60);
  assert.equal(e.data.attack, 'pqc');
  assert.match(e.speech.text, /COPPER/);
  merchantAI(e, MERCHANT.copperWind + 0.01);
  assert.equal(g.eshots.length, 1);
  assert.equal(g.eshots[0].kind, 'pqc');
  assert.equal(g.eshots[0].dmg, 1, 'six deliberate curse hits remain survivable');
  g.eshots = [];
  e.hp = e.maxHp / 2;
  e.cd2 = 0;
  merchantAI(e, 1 / 60);
  merchantAI(e, MERCHANT.magicWind + 0.01);
  assert.equal(g.eshots.length, 3);
}));

test('the whip is warned, locked to its lane, blocked by walls, and frozen with its caster', () => gameCase((g, p) => {
  const e = merchant(g, p);
  e.x = p.x - 40;
  let blows = 0;
  p.hurt = () => ++blows;
  const ready = () => { e.state = 'move'; e.cdT = 0; e.cd2 = e.cd3 = 99; merchantAI(e, 1 / 60); };
  ready();
  assert.equal(e.data.attack, 'whip');
  assert.equal(blows, 0);
  const warning = g.effects.at(-1);
  e.freezeT = 1;
  merchantAI(e, 2);
  assert.equal(warning.update(2), true);
  assert.equal(blows, 0);
  e.freezeT = 0;
  merchantAI(e, MERCHANT.whipWind + 0.01);
  assert.equal(blows, 1);
  ready();
  p.y += 40;
  merchantAI(e, MERCHANT.whipWind + 0.01);
  assert.equal(blows, 1, 'sidestepping avoids the locked lash');
  p.y -= 40;
  ready();
  g.world.lineOfSight = () => false;
  merchantAI(e, MERCHANT.whipWind + 0.01);
  assert.equal(blows, 1, 'a wall blocks the lash');
}));

test('PQC infests once per landed hit, never through walls, invulnerability, or dodge', () => gameCase((g, p) => {
  g.world.solid = () => false;
  let curses = 0;
  g.infestCopper = () => ++curses;
  const shot = () => new EnemyShot(g, p.x - 20, p.y, 0, 135, 1, 'pqc', { swept: true });
  p.invuln = 0;
  const landed = shot();
  assert.equal(landed.update(0.2), false);
  assert.equal(curses, 1);
  landed.update(0.2);
  assert.equal(curses, 1);
  p.invuln = 10;
  shot().update(0.2);
  assert.equal(curses, 1);
  p.invuln = 0;
  p.dodge = 1;
  shot().update(0.2);
  assert.equal(curses, 1);
  p.invuln = 0;
  p.dodge = 0;
  g.world.solid = () => true;
  shot().update(0.2);
  assert.equal(curses, 1);
}));
