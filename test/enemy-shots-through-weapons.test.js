import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Orbit, Whirl } from '../public/js/game/effects.js';
import { EnemyShot } from '../public/js/game/projectiles.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function arena() {
  const g = new Game({ hero: 'knight', mode: 's15', headless: true,
    meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
  g.player.weapons.length = 0;
  g.world.solid = () => false;
  g.player.invuln = 0;
  g.player.dodge = 0;
  return g;
}

for (const id of ['blades', 'aegis', 'whirlwind-ultimate']) {
  test(`a Cultist bolt crosses ${id} and can still hit the Knight`, () => {
    const g = arena(), p = g.player;
    const w = id === 'whirlwind-ultimate' ? null : g.addWeapon(id);
    const effect = w ? new Orbit(g, w) : new Whirl(g, 3.5);
    effect.ang = 0;
    const radius = w ? 34 * w.s.area : 46 * p.area;
    const shot = new EnemyShot(g, p.x + radius, p.y, Math.PI, 100, 20, 'darkbolt');
    g.eshots.push(shot);
    effect.update(0); // The bolt is exactly on the leading blade's collision point.
    assert.equal(shot.dead, false, 'contact with the weapon never destroys the bolt');
    const hp = p.hp;
    for (let i = 0; i < 90 && !shot.dead; i++) {
      g.time += 1 / 60;
      shot.update(1 / 60);
      effect.update(1 / 60);
    }
    assert.ok(p.hp < hp, 'the missile reaches and damages the hero');
    assert.ok(shot.dead, 'it expires on the real player hit');
  });
}
