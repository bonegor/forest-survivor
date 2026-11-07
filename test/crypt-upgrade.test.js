import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { ENEMIES, CRYPT_LORD, CRYPT_LORD_TYPES } from '../public/js/data/enemies.js';
import { EnemyShot } from '../public/js/game/projectiles.js';
import { SPR } from '../public/js/engine/sprites.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const game = (diff = 'easy') => new Game({ hero: 'knight', mode: 's15', diff, meta: metaBonuses(defaultProfile()), settings: {} });

for (const type of CRYPT_LORD_TYPES) {
  test(`${type}: tenfold current health, and movement at 90% of a basic Knight on Normal`, () => {
    const g = game(), p = g.player, lord = g.spawner.spawnLord(p.x + 240, p.y, type);
    assert.equal(lord.maxHp, 10 * (600 * g.diff.health * 2));
    assert.equal(lord.maxHp, 4320);
    lord.sleeping = false; lord.cdT = 999; lord.aware = true;
    g.world.steer = () => [-1, 0];
    const before = lord.x;
    lord.update(0.1);
    assert.ok(Math.abs((before - lord.x) / 0.1 - p.moveSpeed * 0.9) < 1e-9);
    p.meta.speed *= 2; p.recompute();
    const basicSpeed = p.moveSpeed / 2, x = lord.x;
    lord.update(0.1);
    assert.ok(Math.abs((x - lord.x) / 0.1 - basicSpeed * 0.9) < 1e-9, 'boss does not scale with hero upgrades');
  });

  test(`${type}: shorter telegraph/cooldown, double-speed shots, and an enraged spread`, () => {
    const g = game(), p = g.player, lord = g.spawner.spawnLord(p.x + 120, p.y, type), s = lord.def.shot;
    lord.sleeping = false; lord.cdT = 0;
    const random = Math.random; Math.random = () => 0.5;
    try {
      lord.caster(0);
      assert.equal(lord.state, 'wind');
      assert.equal(lord.stateT, 0.5 * 0.7);
      assert.equal(lord.frameIndex(), lord.spr.attack[0]);
      lord.caster(s.wind - 0.001);
      assert.equal(g.eshots.length, 0, 'cannot fire before shortened preparation ends');
      lord.caster(0.0011);
      assert.equal(g.eshots.length, 1);
      const shot = g.eshots[0];
      assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 340) < 1e-9);
      assert.equal(shot.kind, type === 'skeletonmage' ? 'cryptfireball' : 'arrow');
      assert.equal(shot.swept, true);
      assert.equal(lord.cdT, 1.7 * 0.7);
      if (type === 'skeletonmage') {
        assert.match(shot.by, /fireball$/);
        assert.equal(shot.look.sprite, 'fireball');
        assert.equal(shot.look.light, 'fire');
        assert.equal(shot.z, 18, 'fireball appears at the raised casting hand');
      }
      lord.hp = lord.maxHp * 0.49; lord.cdT = 0;
      lord.caster(0); lord.caster(s.wind);
      assert.equal(g.eshots.length, 4, 'three more projectiles in the enraged volley');
      assert.equal(lord.cdT, 1.7 * 0.7 * CRYPT_LORD.cooldown);
    } finally { Math.random = random; }
  });

  test(`${type}: fast shots cannot skip the hero or a wall during a long frame`, () => {
    const g = game(), p = g.player, kind = ENEMIES[type].shot.kind;
    const shot = new EnemyShot(g, p.x - 8.5, p.y, 0, 340, 10, kind, { swept: true });
    const hp = p.hp;
    assert.equal(shot.update(0.05), false);
    assert.ok(p.hp < hp, 'a direct crossing damages the player');
    const x = p.x + 200, wall = new EnemyShot(g, x, p.y, 0, 340, 10, kind, { swept: true });
    g.world.solid = px => px >= x + 8 && px <= x + 24;
    assert.equal(wall.update(0.1), false);
    assert.ok(wall.x <= x + 24, 'stops at the wall rather than landing beyond it');
  });
}

test('mage resting, walking, casting and mirrored frames are valid production sprites', () => {
  const g = game(), lord = g.spawner.spawnLord(g.player.x + 200, g.player.y, 'skeletonmage'), s = SPR.skeletonmage;
  assert.deepEqual([s.w, s.h], [SPR.skeletonarcher.w, SPR.skeletonarcher.h]);
  assert.equal(lord.frameIndex(), s.idle[0]);
  lord.sleeping = false;
  const seen = new Set();
  for (let i = 0; i < 60; i++) { lord.anim = i / 15; seen.add(lord.frameIndex()); }
  assert.deepEqual(seen, new Set(s.walk));
  lord.state = 'wind';
  assert.equal(lord.frameIndex(), s.attack[0]);
  for (const frame of s.frames) assert.ok(frame.get(false).width && frame.get(true).height);
});

test('ordinary casters keep their prior timing and projectile speed', () => {
  assert.equal(ENEMIES.cultist.shot.cd, 3.2);
  assert.equal(ENEMIES.cultist.shot.wind, 0.55);
  assert.equal(ENEMIES.cultist.shot.spd, 61.2);
});
