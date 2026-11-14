import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES } from '../public/js/data/heroes.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';

function clearing(hero, run, evolved = false) {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(1443); input.bot = { x: 0, y: 0 };
  try {
    const g = new Game({ hero, mode: 's15', map: 'forest', diff: 'easy', meta: metaBonuses(defaultProfile()),
      settings: { numbers: false }, headless: true, crypts: false });
    const p = g.player;
    g.spawner.update = () => {}; g.enemies.length = 0;
    g.world.solid = () => false; g.world.lineOfSight = () => true;
    p.devGod = true; p.aim = 0; p.face = 1;
    if (evolved) for (const w of p.weapons) {
      w.level = 8; w.recompute(); g.addPassive(w.def.evo.with); assert.ok(w.evolve());
    }
    run(g, p);
  } finally { Math.random = random; input.bot = bot; }
}
const step = (g, seconds) => { for (let f = 0; f < seconds * 60; f++) g.update(1 / 60); };
const crate = (g, x = 14, y = 0) => g.spawnEnemy('crate', g.player.x + x, g.player.y + y, { instant: true, always: true });

for (const id of Object.keys(HEROES)) for (const evolved of [false, true]) {
  test(`${id} ${evolved ? 'evolved' : 'starter'}: the actual signature kit opens a nearby field crate without monsters`, () => clearing(id, (g, p) => {
    const box = crate(g);
    step(g, 6);
    assert.ok(box.dead, `${id}: visible weapon must break the box without another weapon or a monster`);
    assert.ok(p.weapons.some(w => w.dmgDealt > 0) || id === 'necromancer', 'normal weapon or summon owns the hit');
  }, evolved));
}

const fallbackHeroes = ['paladin', 'druid', 'berserker', 'witchhunter', 'eanasir', 'marksman', 'templar', 'trailblazer', 'thornkeeper', 'gravebinder', 'arcanist', 'boltguard'];
for (const id of fallbackHeroes) {
  test(`${id}: automatic object fallback cannot target a crate through a wall`, () => clearing(id, g => {
    const box = crate(g);
    g.world.lineOfSight = (_x, _y, tx) => tx < g.player.x + 10;
    step(g, 3);
    assert.ok(!box.dead); assert.equal(box.hp, box.maxHp);
  }));
}

test('Gravebinder pecks an isolated crate without gaining siphon fuel or striking it early', () => clearing('gravebinder', (g, p) => {
  const box = crate(g), w = g.mainWeapon();
  g.grid.rebuild(g.enemies, p.x, p.y); w.cd = 0; w.update(0);
  assert.equal(w.fx.target, box); assert.equal(w.fx.fed, 0); assert.equal(w.fx.damage, w.s.dmg);
  assert.equal(box.hp, box.maxHp, 'a crow must reach its target before dealing damage');
  step(g, .25); assert.ok(box.dead);
}));

test('Gravebinder still favors a strong creature and never takes siphon fuel from a nearby crate', () => clearing('gravebinder', (g, p) => {
  const box = crate(g, 14), lord = g.spawnEnemy('zombie', p.x + 25, p.y, { instant: true, always: true, lord: true, hpMul: 100 });
  const w = g.mainWeapon(); g.grid.rebuild(g.enemies, p.x, p.y); w.cd = 0; w.update(0);
  assert.equal(w.fx.target, lord); assert.equal(w.fx.fed, 0); assert.equal(w.fx.damage, w.s.dmg);
  assert.equal(box.hp, box.maxHp);
}));

test('object fallbacks stay local and do not make crates global combat targets', () => clearing('gravebinder', (g, p) => {
  const box = crate(g, 70), w = g.mainWeapon(); g.grid.rebuild(g.enemies, p.x, p.y);
  assert.equal(g.nearestEnemy(p.x, p.y, 152), null, 'the creature query remains creature-only');
  w.cd = 0; w.update(0); assert.equal(w.fx, null);
  step(g, 2); assert.ok(!box.dead);
}));
