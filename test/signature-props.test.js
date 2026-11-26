import assert from 'node:assert/strict';
import test from 'node:test';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { KINDS } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { mulberry32 } from '../public/js/engine/util.js';

function scenario(hero, { crate = true, wall = false, onlyCrate = false } = {}) {
  const random = Math.random;
  Math.random = mulberry32(624);
  try {
    const g = new Game({ hero, mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    const p = g.player, w = g.mainWeapon();
    p.face = 1;
    p.aim = 0;
    g.world.solid = () => false;
    g.world.lineOfSight = (_x, _y, tx) => !wall || tx < p.x + 10;
    const aimed = ['templar', 'arcanist', 'thornkeeper'].includes(hero);
    const dx = aimed ? 30 : 13;
    const box = crate && g.spawnEnemy('crate', p.x + dx, p.y, { instant: true, always: true });
    const foes = onlyCrate ? [] : [30, 34, 38, 42, 46, 50, 54, 58].map(x =>
      g.spawnEnemy('zombie', p.x + x, p.y, { instant: true, always: true, hpMul: 1000 }));
    g.grid.rebuild(g.enemies, p.x, p.y);
    Math.random = () => 0.5;
    KINDS[w.def.kind].fire(w);
    for (let n = 0; n < 48; n++) {
      g.time += 1 / 60;
      g.effects = g.effects.filter(effect => effect.update(1 / 60));
    }
    return { broken: box?.dead ?? false, hits: foes.map(e => e.maxHp - e.hp), damage: w.dmgDealt };
  } finally {
    Math.random = random;
  }
}

for (const hero of ['praetorian', 'footman', 'templar', 'wraith', 'arcanist', 'thornkeeper', 'seraph', 'swordbearer', 'sentinel']) {
  test(`${hero}: the signature breaks a crate in its footprint without spending a monster hit`, () => {
    const without = scenario(hero, { crate: false }), withBox = scenario(hero);
    assert.ok(withBox.broken, 'the visible weapon must hit the crate');
    assert.deepEqual(withBox.hits, without.hits, 'a crate cannot displace a monster from the hit budget');
  });
  test(`${hero}: signature collateral does not break a crate through stone`, () => {
    assert.equal(scenario(hero, { wall: true }).broken, false);
  });
}

for (const hero of ['praetorian', 'footman', 'wraith', 'seraph', 'swordbearer', 'sentinel']) {
  test(`${hero}: facing a nearby crate breaks it even with no monsters around`, () => {
    assert.ok(scenario(hero, { onlyCrate: true }).broken);
  });
}
