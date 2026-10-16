// Every weapon belongs to one hero class. The owner, 16 October 2026: each class has a roster of
// four weapons, the Necromancer starting with two of his; relics stay shared; the bow fires
// straight, the Shadow Blade seeks the nearest foe and cuts through all; an evolution beats its
// weapon at level 8 on every stat.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Pool, Aura } from '../public/js/game/effects.js';
import { HEROES, startWeapons } from '../public/js/data/heroes.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { PASSIVES } from '../public/js/data/passives.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses, sanitizeCheckpoint } from '../public/js/shared/profile.js';

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

test('each hero has four weapons of his own, his own weapon and what he starts with among them', () => {
  const owner = new Map();
  for (const h of Object.values(HEROES)) {
    assert.equal(h.roster.length, 4, h.id);
    assert.ok(h.roster.includes(h.weapon), `${h.id}: his crypt weapon is his`);
    for (const id of startWeapons(h)) assert.ok(h.roster.includes(id), `${h.id} starts with ${id}, one of his`);
    const relics = h.roster.map((id) => WEAPONS[id].evo.with);
    assert.equal(new Set(relics).size, 4, `${h.id}: each weapon evolves with a relic of its own (${relics})`);
    for (const id of h.roster) {
      assert.ok(WEAPONS[id] && !WEAPONS[id].evolved, `${h.id}: ${id}`);
      assert.ok(!owner.has(id), `${id} belongs to ${owner.get(id)} and ${h.id}`);
      owner.set(id, h.id);
    }
  }
  for (const [id, d] of Object.entries(WEAPONS)) if (!d.evolved) assert.ok(owner.has(id), `${id} belongs to a hero`);
});

test('the Necromancer starts with Raise Dead and Miasma, both at level 1; the others with their one weapon', () => {
  for (const id of Object.keys(HEROES)) {
    gameCase(id, (g, p) => {
      const want = id === 'necromancer' ? ['raise', 'miasma'] : [HEROES[id].weapon];
      assert.deepEqual(p.weapons.map((w) => [w.id, w.level]), want.map((w) => [w, 1]), id);
      assert.equal(g.mainWeapon().id, HEROES[id].weapon, `${id}: the weapon he strikes with in a crypt`);
    });
  }
});

test("a level-up offers new weapons from the hero's own roster alone", () => {
  for (const id of Object.keys(HEROES)) {
    gameCase(id, (g, p) => {
      const offered = new Set();
      for (let i = 0; i < 400; i++) for (const c of g.levelChoices(4)) if (c.type === 'weapon' && c.isNew) offered.add(c.id);
      const others = p.hero.roster.filter((w) => !startWeapons(p.hero).includes(w));
      assert.deepEqual([...offered].sort(), others.sort(), id);
    });
  }
});

test('a weapon from outside the roster, from an older save, is kept and grows but is never offered new', () => {
  const cp = sanitizeCheckpoint({ mode: 's15', diff: 'hard', hero: 'knight', level: 10, hp: 50, weapons: [['sword', 2], ['bow', 3]] });
  gameCase('knight', (g, p) => {
    assert.deepEqual(p.weapons.map((w) => w.id), ['sword', 'bow']);
    const cards = [];
    for (let i = 0; i < 300; i++) cards.push(...g.levelChoices(4).filter((c) => c.type === 'weapon'));
    for (const c of cards) if (c.isNew) assert.ok(p.hero.roster.includes(c.id), `new: ${c.id}`);
    assert.ok(cards.some((c) => c.id === 'bow' && !c.isNew && c.level === 4), 'the bow is offered its next level');
    assert.ok(!cards.some((c) => c.isNew && !p.hero.roster.includes(c.id)), 'and nothing else from outside');
  }, { checkpoint: cp });
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

// Each newer weapon, and its evolution, at work in a real game: a ring of tough foes about a
// hero who walks a small circle (so what is thrown behind him or left in his steps meets them).
const AT_WORK = {
  necromancer: ['miasma', 'bonespear', 'grasp', 'pestilence', 'spinelance', 'gravehands'],
  mage: ['arcane', 'prismatic'],
  rogue: ['daggers', 'caltrops', 'clone', 'shadowstrike', 'razorfield', 'twinshadows'],
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
// at 99 (through all, which there is no beating), and a stat neither uses (0 at both). And a
// weapon whose evolution lasts for good (dur 999) may keep as many as it had: Twin Shadows' two
// shadows never fade, where level 8's two come and go.
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
    const l8 = { ...d.base };
    for (const lv of d.levels) for (const [k, v] of Object.entries(lv)) if (k !== 'text') l8[k] = (l8[k] || 0) + v;
    const forGood = (e.base.dur ?? 0) >= 999 && (l8.dur ?? 0) < 999;
    for (const [k, v] of Object.entries(l8)) {
      const ev = e.base[k] ?? (k === 'cd' ? 1 : undefined);
      assert.notEqual(ev, undefined, `${d.evo.into} has ${k}`);
      if (k === 'pierce' && v >= 99 && ev >= 99) continue;
      if (v === 0 && ev === 0) continue;
      if (k === 'amount' && forGood && ev >= v) continue;
      const better = LOWER.has(k) ? ev < v - 1e-9 : ev > v + 1e-9;
      assert.ok(better, `${d.evo.into} ${k} ${ev} against ${id} at level 8: ${+v.toFixed(3)}`);
    }
  }
  for (const [id, d] of Object.entries(WEAPONS)) if (d.evolved) assert.ok(into.has(id), `${id} is some weapon's evolution`);
});
