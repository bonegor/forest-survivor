// Fusions (G2 of the 21 November 2026 gameplay review; data/fusions.js): two evolved weapons of a
// recipe become one at a chest, freeing a slot; both go on as its parts, each striking harder and
// carrying its partner's mark, and neither is ever offered again.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { heroStats } from '../public/js/game/weapons.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { SHARED_WEAPONS } from '../public/js/data/heroes.js';
import { FUSION, FUSION_WEAPONS, FUSION_IDS, fusionOf } from '../public/js/data/fusions.js';
import { evolveLines } from '../public/js/game/chests.js';

function gameCase(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(77);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, maxWeapons: 6 });
    g.spawner.update = () => {};
    g.player.devGod = true;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

test('each fusion is two evolutions of shared weapons, either way round, and no pool offers it', () => {
  for (const id of FUSION_IDS) {
    const d = FUSION_WEAPONS[id];
    assert.equal(WEAPONS[id], d, `${id} is among the weapons`);
    assert.ok(d.evolved && d.fusion && !SHARED_WEAPONS.includes(id));
    for (const part of d.of) assert.ok(WEAPONS[part]?.evolved, `${id}: ${part} is an evolution`);
    assert.equal(fusionOf(d.of[0], d.of[1]), id);
    assert.equal(fusionOf(d.of[1], d.of[0]), id);
  }
  assert.equal(fusionOf('excalibur', 'hellfire'), null);
  assert.deepEqual(evolveLines('frozenheart', 'steamvent').slice(0, 2), ['Frozen Heart + Hellfire', 'Each strikes 25% harder']);
});

test('a chest fuses Frozen Heart and Hellfire into Steamvent: one slot, both parts, each marked by the other', () => gameCase((g, p) => {
  const fh = g.addWeapon('frozenheart'), hf = g.addWeapon('hellfire');
  fh.dmgDealt = 100;
  hf.dmgDealt = 50;
  const before = p.weapons.length;
  assert.deepEqual(g.fusable().slice(2), ['steamvent']);
  const roll = g.rollChest('boss');
  assert.equal(roll.items[0].type, 'evolve');
  assert.ok(roll.items[0].fusion && roll.items[0].id === 'steamvent');
  const f = p.weapons.find((w) => w.id === 'steamvent');
  assert.ok(f && f.parts.length === 2, 'Steamvent, with its two parts');
  assert.ok(p.weapons.length <= before - 1 + roll.items.length, 'a slot freed');
  assert.ok(!p.weapons.includes(fh) && !p.weapons.includes(hf));
  assert.equal(f.dmgDealt, 150, 'what they dealt is its');
  assert.equal(fh.infuse, 'burn', "Frozen Heart's blows burn");
  assert.equal(hf.infuse, 'freeze', "Hellfire's freeze");
  assert.ok(g.ownsWeapon('frost') && g.ownsWeapon('flask') && g.ownsWeapon('frozenheart'), 'neither is offered again');
  assert.equal(g.fusable(), null, 'and the fusion fuses no further');
  const plain = heroStats(WEAPONS.frozenheart, MAX_WEAPON_LEVEL, p).dmg;
  assert.ok(Math.abs(fh.s.dmg - plain * FUSION.dmg) < 1e-6, 'each part strikes a quarter harder');
}));

test("a part's blow carries its partner's mark, and an Overcharge on the fusion is its parts'", () => gameCase((g, p) => {
  const fh = g.addWeapon('frozenheart'), hf = g.addWeapon('hellfire');
  const f = g.fuse(fh, hf, 'steamvent');
  const e = g.spawnEnemy('zombie', p.x + 80, p.y, { instant: true, hpMul: 1e5 });
  g.hitEnemy(e, 50, { w: fh, kb: 0 });
  assert.ok(e.dots.fire.t > 0, "Frozen Heart's blow set it burning");
  const dealt = f.dmgDealt;
  g.hitEnemy(e, 50, { w: hf, type: 'fire', kb: 0 });
  assert.ok(f.dmgDealt > dealt, 'a part counts for the fusion');
  const dmg = fh.s.dmg;
  f.over = 2;
  f.recompute();
  assert.equal(fh.over, 2);
  assert.ok(fh.s.dmg > dmg, 'the Overcharge reaches its parts');
}));
