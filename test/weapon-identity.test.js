// Crossbow silhouettes are presentation-only: their shared collision envelope,
// damage, speed and pooled projectile state must stay exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Projectile } from '../public/js/game/projectiles.js';
import { SPR } from '../public/js/engine/sprites.js';
import { Game } from '../public/js/game/game.js';
import { Weapon, KINDS } from '../public/js/game/weapons.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('Splitpin and Ratchet draw distinct bolts without changing their collision sprite or state', () => {
  const drawings = [];
  for (const [kind, scale] of [['silverbolt', 1], ['splitpin', 1], ['splitpinShard', 0.65], ['ratchetBolt', 1.25]]) {
    const p = new Projectile();
    p.init({}, { kind, sprite: 'silverbolt', x: 30, y: 40, z: 11, ang: 0, speed: 285, life: 1, r: 2,
      dmg: 53, pierce: 3, kb: 1, scale });
    const before = [p.hl, p.hw, p.r, p.dmg, p.pierce, p.kb, p.vx, p.vy, p.life, p.t, p.sprite];
    const images = [];
    const random = Math.random;
    Math.random = () => { throw new Error('Drawing must not consume the combat random stream'); };
    try {
      p.draw({ drawImage(image) { images.push(image); } }, { x: 0, y: 0, S: 2, pxW: 480, pxH: 270 });
    } finally { Math.random = random; }
    assert.deepEqual([p.hl, p.hw, p.r, p.dmg, p.pierce, p.kb, p.vx, p.vy, p.life, p.t, p.sprite], before, kind);
    assert.equal(p.sprite, SPR.silverbolt, `${kind}: original collision shape retained`);
    assert.equal(images.length, 1, `${kind}: one silhouette, no extra layers`);
    drawings.push(images[0]);
  }
  assert.equal(new Set(drawings).size, 4, 'silver, forkhead, splinter and ratchet each have their own silhouette');
});

test('greatsword and rank-shock drawing cannot change combat state or consume its random stream', () => {
  for (const id of ['swordbearer_marchsteel', 'footman_linebreaker']) {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    const p = g.player, w = new Weapon(g, id, 1);
    p.face = 1;
    g.effects.length = 0;
    const enemy = g.spawnEnemy('zombie', p.x + 18, p.y, { instant: true, hpMul: 100 });
    g.grid.rebuild(g.enemies, p.x, p.y);
    KINDS[id].fire(w);
    const effects = g.effects.filter(fx => fx.draw);
    assert.ok(effects.length, `${id}: an actual attack produced visible effects`);
    for (const fx of effects) fx.update(id === 'footman_linebreaker' ? 0.12 : 0.04);
    const snapshot = () => [g.stats.damage, enemy.hp, w.cd, w.dmgDealt, ...effects.map(fx => fx.t)];
    const before = snapshot(), ctx = document.createElement('canvas').getContext('2d');
    ctx.globalAlpha = 1;
    const random = Math.random;
    Math.random = () => { throw new Error('Drawing must not consume the combat random stream'); };
    try {
      for (const fx of effects) fx.draw(ctx, { x: p.x - 80, y: p.y - 60, S: 2 });
    } finally { Math.random = random; }
    assert.deepEqual(snapshot(), before, id);
  }
});
