// Each class has a signature weapon of its own, and every other weapon is shared by all. The
// owner, 16 October 2026: "we can't make a rip-off of another class's weapon available to
// others". The Necromancer starts with both of his; relics stay shared; the bow fires straight,
// the Shadow Blade seeks the nearest foe and cuts through all; an evolution beats its weapon at
// level 8 on every stat.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Pool, Aura } from '../public/js/game/effects.js';
import { HEROES, startWeapons, SHARED_WEAPONS, weaponsFor } from '../public/js/data/heroes.js';
import { WEAPONS, MAX_WEAPON_LEVEL, statsAt } from '../public/js/data/weapons.js';
import { PASSIVES } from '../public/js/data/passives.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const step = (g, n = 1) => { for (let i = 0; i < n; i++) g.update(1 / 60); };

// A seeded game with no horde of its own: only the foes a test brings.
function gameCase(hero, fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(17);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.spawner.update = () => {};
    g.player.devGod = true;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

const foe = (g, dx, dy, o = {}) => g.spawnEnemy('zombie', g.player.x + dx, g.player.y + dy, { instant: true, hpMul: 1e5, ...o });
const held = (p) => p.weapons.map((w) => [w.id, w.level]);

const SIGNATURES = {
  knight: ['sword'], archer: ['bow'], mage: ['fireball'], rogue: ['daggers'], necromancer: ['raise', 'miasma'],
  paladin: ['smite'], druid: ['roots'], berserker: ['twinaxes'], witchhunter: ['crossbow'],
};

test('each class has its signature weapon, and every other weapon is shared by all', () => {
  for (const [id, h] of Object.entries(HEROES)) {
    assert.deepEqual(h.unique, SIGNATURES[id], id);
    assert.ok(h.unique.includes(h.weapon), `${id}: the weapon he strikes with in a crypt is his own`);
    for (const w of startWeapons(h)) assert.ok(h.unique.includes(w), `${id} starts with ${w}, his own`);
    assert.deepEqual(weaponsFor(h), [...h.unique, ...SHARED_WEAPONS], `${id}: his own and the shared`);
  }
  assert.deepEqual([...SHARED_WEAPONS].sort(), ['arcane', 'aura', 'axe', 'blades', 'caltrops', 'flask', 'frost', 'glaive', 'lightning', 'thorns', 'wisps']);
  for (const gone of ['bonespear', 'clone', 'grasp', 'spinelance', 'twinshadows', 'gravehands']) assert.equal(WEAPONS[gone], undefined, `${gone} is out of the game`);
});

test('the Necromancer starts with Raise Dead and Miasma, both at level 1; the others with their one weapon', () => {
  for (const id of Object.keys(HEROES)) {
    gameCase(id, (g, p) => {
      const want = id === 'necromancer' ? ['raise', 'miasma'] : [HEROES[id].weapon];
      assert.deepEqual(held(p), want.map((w) => [w, 1]), id);
      assert.equal(g.mainWeapon().id, HEROES[id].weapon, `${id}: the weapon he strikes with in a crypt`);
    });
  }
});

test("every class's signature is offered to it alone, and the shared weapons reach every class", () => {
  for (const id of Object.keys(HEROES)) {
    gameCase(id, (g, p) => {
      p.weapons.length = 0; // holding nothing, he may be offered anything that is his to find
      const offered = new Set();
      for (let i = 0; i < 600; i++) for (const c of g.levelChoices(4)) if (c.type === 'weapon' && c.isNew) offered.add(c.id);
      assert.deepEqual([...offered].sort(), [...weaponsFor(p.hero)].sort(), id);
    });
  }
});

test('the bow looses its arrows straight the way the hero faces, whatever foes are about', () => {
  gameCase('archer', (g, p) => {
    const w = p.weapons[0];
    for (let i = 0; i < 6; i++) w.levelUp(); // three arrows
    assert.equal(w.s.amount, 3);
    for (const [dx, dy] of [[-40, 0], [0, 50], [70, -30]]) foe(g, dx, dy).dormant = true;
    g.grid.rebuild(g.enemies, p.x, p.y);
    p.aim = 2;
    w.cd = 0;
    w.update(0);
    w.update(0.2);
    const arrows = g.projectiles.filter((pr) => pr.kind === 'arrow');
    assert.equal(arrows.length, 3);
    assert.ok(Math.abs(arrows[0].ang - 2) < 1e-9, 'the first along his aim');
    for (const a of arrows) assert.ok(Math.abs(a.ang - 2) <= 0.06 + 1e-9, `one tight volley (${a.ang})`);
  });
});

test('the Shadow Blade seeks a foe behind a hero walking away, spins, and cuts through everything', () => {
  gameCase('rogue', (g, p) => {
    input.bot = { x: 1, y: 0 };
    step(g, 20);
    assert.equal(p.aim, 0, 'walking right');
    for (const pr of g.projectiles) pr.dead = true;
    g.projectiles.length = 0;
    const f = foe(g, -90, 0);
    f.dormant = true;
    f.spd = 0;
    g.grid.rebuild(g.enemies, p.x, p.y);
    const w = p.weapons[0];
    assert.equal(w.def.name, 'Shadow Blade');
    w.cd = 0;
    w.update(0);
    const blade = g.projectiles.find((pr) => pr.kind === 'dagger');
    assert.ok(blade && Math.cos(blade.ang) < -0.95, 'thrown back at the foe');
    assert.ok(blade.pierce >= 99, 'through all in its path');
    assert.ok(blade.spin !== 0, 'spinning');
    const rot = blade.rot;
    blade.update(1 / 60);
    assert.notEqual(blade.rot, rot, 'it turns as it flies');
  });
});

test('Miasma lays a trail of pools that sink away as the Necromancer walks, none while he stands; its cloud poisons all the while', () => {
  gameCase('necromancer', (g, p) => {
    const w = p.weapons.find((x) => x.id === 'miasma');
    const pools = () => g.effects.filter((e) => e instanceof Pool && e.w === w);
    step(g, 120);
    assert.equal(pools().length, 0, 'standing, no trail');
    assert.ok(g.effects.some((e) => e instanceof Aura && e.w === w), 'but the cloud is about him');
    const f = foe(g, 12, 0);
    f.spd = 0;
    const hp = f.hp;
    step(g, 60);
    assert.ok(f.hp < hp, 'the cloud hurts a foe that comes close');
    assert.ok(f.dotT > 0 && f.dotType === 'poison', 'and leaves it poisoned');
    f.dead = true;
    input.bot = { x: 1, y: 0 };
    step(g, 60);
    const trail = pools();
    assert.ok(trail.length >= 5, `walking, a trail (${trail.length} pools)`);
    const first = trail[0];
    assert.ok(first.r < first.R, 'each sinks into the ground as it fades');
    step(g, Math.ceil(w.s.dur * 60));
    assert.ok(!g.effects.includes(first), 'and is gone in its time');
  });
});

test('a second chest rolled before the first is shown never evolves the same weapon twice', () => {
  gameCase('knight', (g, p) => {
    const w = p.weapons[0];
    w.level = MAX_WEAPON_LEVEL;
    w.recompute();
    g.addPassive('might');
    const a = g.rollChest('boss');
    assert.deepEqual(a.items.filter((it) => it.type === 'evolve').map((it) => it.id), ['excalibur']);
    assert.equal(w.id, 'excalibur', 'evolved as the chest was rolled');
    const b = g.rollChest('boss');
    assert.ok(!b.items.some((it) => it.type === 'evolve'), 'nothing left to evolve');
    assert.equal(w.evolve(), false, 'an evolution evolves no further');
    assert.equal(w.id, 'excalibur');
  });
});

// The newer weapons, and their evolutions, at work in a real game: a ring of tough foes about a
// hero who walks a small circle (so what is thrown behind him or left in his steps meets them).
// The shared ones in the hands of a hero whose class has nothing like them.
const AT_WORK = {
  necromancer: ['miasma', 'pestilence'],
  knight: ['arcane', 'prismatic', 'caltrops', 'razorfield'],
  rogue: ['daggers', 'shadowstrike'],
  archer: ['bow', 'stormstring'],
};
for (const [hero, ids] of Object.entries(AT_WORK)) {
  for (const id of ids) {
    test(`${WEAPONS[id].name} fires in a headless game and deals damage`, () => {
      gameCase(hero, (g, p) => {
        p.weapons.length = 0;
        const w = g.addWeapon(id);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          foe(g, Math.cos(a) * 45, Math.sin(a) * 40).spd = 6;
        }
        for (let i = 0; i < 240; i++) {
          const a = i / 30;
          input.bot = { x: Math.cos(a), y: Math.sin(a) };
          step(g);
        }
        assert.ok(w.dmgDealt > 0, `${id} dealt ${w.dmgDealt}`);
      });
    });
  }
}

// What an evolution has over its weapon at level 8: every stat the weapon has, strictly better
// (a lower cooldown or tick, else more). Two things count as no better yet no worse: piercing
// at 99 (through all, which there is no beating), and a stat neither uses (0 at both).
const LOWER = new Set(['cd', 'tick']);
test('every evolution beats its weapon at level 8 on every stat', () => {
  const into = new Set();
  for (const [id, d] of Object.entries(WEAPONS)) {
    if (d.evolved) continue;
    assert.equal(d.levels.length, MAX_WEAPON_LEVEL - 1, `${id}: seven levels`);
    for (const lv of d.levels) assert.equal(typeof lv.text, 'string', `${id}: every level has its card text`);
    const e = WEAPONS[d.evo.into];
    assert.ok(e && e.evolved, `${id} evolves into ${d.evo.into}, an evolution`);
    assert.ok(PASSIVES[d.evo.with], `${id} evolves with a relic`);
    assert.ok(!into.has(d.evo.into), `${d.evo.into} is one weapon's evolution`);
    into.add(d.evo.into);
    const l8 = statsAt(d, MAX_WEAPON_LEVEL);
    for (const [k, v] of Object.entries(l8)) {
      // One that lasts for good (eternal) outlasts any duration.
      const ev = e.base[k] ?? (k === 'cd' ? 1 : k === 'dur' && e.base.eternal ? Infinity : undefined);
      assert.notEqual(ev, undefined, `${d.evo.into} has ${k}`);
      if (k === 'pierce' && v >= 99 && ev >= 99) continue;
      if (v === 0 && ev === 0) continue;
      const better = LOWER.has(k) ? ev < v - 1e-9 : ev > v + 1e-9;
      assert.ok(better, `${d.evo.into} ${k} ${ev} against ${id} at level 8: ${+v.toFixed(3)}`);
    }
  }
  for (const [id, d] of Object.entries(WEAPONS)) if (d.evolved) assert.ok(into.has(id), `${id} is some weapon's evolution`);
});

// How a weapon's stats at a level were worked out, three ways, before data/weapons.js statsAt:
// the game's (Weapon.recompute: its defaults under the base, then the steps up to the level; an
// evolution's base alone), and the weapons page's and the test above's (the base and every
// step, for level 8).
const OLD_DEFAULTS = { dmg: 0, cd: 1, amount: 1, area: 1, speed: 1, dur: 1, pierce: 0, kb: 1, tick: 0.5, chains: 0, slow: 0, freeze: 0 };
function oldGame(def, level) {
  const b = { ...OLD_DEFAULTS, ...def.base };
  if (!def.evolved) {
    for (let i = 0; i < level - 1; i++) {
      for (const [k, v] of Object.entries(def.levels[i])) if (k !== 'text') b[k] = (b[k] || 0) + v;
    }
  }
  return b;
}
function oldTop(def) {
  const s = { ...def.base };
  for (const lv of def.levels) for (const [k, v] of Object.entries(lv)) if (k !== 'text') s[k] = (s[k] || 0) + v;
  return s;
}

test('statsAt gives every weapon at every level what the game, the weapons page and the tests worked out', () => {
  for (const [id, def] of Object.entries(WEAPONS)) {
    for (let lv = 1; lv <= MAX_WEAPON_LEVEL; lv++) assert.deepEqual(statsAt(def, lv, OLD_DEFAULTS), oldGame(def, lv), `${id} at level ${lv}`);
    if (!def.evolved) assert.deepEqual(statsAt(def, MAX_WEAPON_LEVEL), oldTop(def), `${id} at level ${MAX_WEAPON_LEVEL}`);
  }
  // And a weapon in play has them, where the hero's own multipliers don't come in.
  gameCase('knight', (g, p) => {
    for (const [id, def] of Object.entries(WEAPONS)) {
      for (const lv of [1, 4, MAX_WEAPON_LEVEL]) {
        p.weapons.length = 0;
        const w = g.addWeapon(id, lv), old = oldGame(def, def.evolved ? MAX_WEAPON_LEVEL : lv);
        for (const k of Object.keys(old)) {
          if (!['amount', 'area', 'cd', 'speed', 'dur', 'tick'].includes(k)) assert.equal(w.s[k], old[k], `${id} level ${lv}: ${k}`);
        }
      }
    }
  });
});

test('Pestilence: a foe its poison kills bursts into a pool of its own; a boss does not', () => {
  gameCase('necromancer', (g, p) => {
    p.weapons.length = 0;
    const w = g.addWeapon('pestilence');
    const pools = () => g.effects.filter((e) => e instanceof Pool && e.w === w);
    // Out of its cloud's reach, and the hero stands still: no pool but what a death leaves.
    const f = foe(g, 70, 0, { hpMul: 1 });
    f.spd = 0;
    f.addDot('poison', 1e4, 1.5, w);
    step(g, 40);
    assert.ok(f.dead, 'the poison killed it');
    const burst = pools().filter((pl) => pl.x === f.x && pl.y === f.y);
    assert.equal(burst.length, 1, 'it burst into a pool where it fell');
    assert.ok(burst[0].decay, 'one that sinks away as the trail\'s do');
    const n = pools().length;
    const boss = g.spawnEnemy('boneking', p.x - 70, p.y, { instant: true, hpMul: 0.001 });
    g.hitEnemy(boss, 1e6, { w, type: 'poison', kb: 0, noCrit: true });
    assert.ok(boss.dead);
    assert.equal(pools().length, n, 'a boss leaves none');
    // Plain Miasma has no plague.
    p.weapons.length = 0;
    const m = g.addWeapon('miasma');
    const before = g.effects.length;
    m.onKill(foe(g, 0, 60));
    assert.equal(g.effects.length, before, 'Miasma\'s dead leave none');
  });
});

test('Miasma lays no pool across a jump (a crypt\'s door, the stairs): its trail goes on from where he lands', () => {
  gameCase('necromancer', (g, p) => {
    const w = p.weapons.find((x) => x.id === 'miasma');
    const pools = () => g.effects.filter((e) => e instanceof Pool && e.w === w);
    w.update(1 / 60); // it marks where he stands
    const n = pools().length;
    w.walked = 0;
    p.x += 120; // carried off
    w.update(1 / 60);
    assert.equal(pools().length, n, 'no pool for the gap');
    assert.equal(w.walked, 0, 'and none owed for it');
    p.x += 30; // a stride on from there
    w.update(1 / 60);
    assert.equal(pools().length, n + 1, 'walking on, the trail goes on');
  });
});

test('Aegis never goes out; Guardian Blades do, in their time', () => {
  gameCase('knight', (g, p) => {
    p.weapons.length = 0;
    const blades = g.addWeapon('blades');
    blades.cd = 0;
    step(g, 2);
    const orbit = blades.fx;
    assert.ok(orbit && !orbit.dead);
    step(g, Math.ceil(blades.s.dur * 60) + 2);
    assert.ok(orbit.dead, `gone after ${blades.s.dur} s`);
    p.weapons.length = 0;
    const aegis = g.addWeapon('aegis');
    aegis.cd = 0;
    step(g, 2);
    const ring = aegis.fx;
    assert.ok(ring && !ring.dead && ring.alpha === 1);
    ring.t = 1e5; // longer than any run
    step(g, 60);
    assert.ok(!ring.dead && aegis.fx === ring && ring.alpha === 1, 'still turning, as bright');
  });
});

test('Shadow Dance throws blades of its own: no weapon\'s, of a set strength', () => {
  gameCase('rogue', (g, p) => {
    p.weapons.length = 0;
    g.startUlt('shadowdance');
    step(g, 6);
    const blades = g.projectiles.filter((pr) => pr.kind === 'dagger');
    assert.ok(blades.length >= 4, `${blades.length} blades`);
    for (const b of blades) {
      assert.equal(b.w, null);
      assert.deepEqual([b.dmg, b.pierce, b.kb, b.crit, b.spin], [18, 2, 0.4, 0.35, 22]);
      assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - 300) < 1e-6, 'at 300 px/s');
    }
  });
});
