import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Dungeon } from '../public/js/game/dungeon.js';
import { spawnProjectile, releaseProjectile } from '../public/js/game/projectiles.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game() {
  const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(defaultProfile()), settings: {}, crypts: false });
  g.spawner.update = () => {};
  g.enemies = [];
  return g;
}

for (let direction = 0; direction < 8; direction++) test(`bow release ${direction}/8: its forward shaft hits ahead and never the touching foe behind`, () => {
  const g = game(), p = g.player, w = p.weapons[0], a = direction * Math.PI / 4;
  p.aim = a;
  const foes = [-4, 48].map(distance => g.spawnEnemy('skeleton', p.x + Math.cos(a) * distance, p.y + Math.sin(a) * distance, { instant: true, always: true, hpMul: 100 }));
  foes.forEach(e => { e.dormant = true; });
  g.grid.rebuild(g.enemies, p.x, p.y);
  const before = foes.map(e => e.hp);
  w.cd = 0; w.update(0);
  const arrow = g.projectiles[0];
  assert.ok(arrow, 'an actual bow volley fired');
  const forward = (arrow.x - p.x) * Math.cos(a) + (arrow.y - p.y + 1) * Math.sin(a);
  assert.ok(forward - arrow.hl > p.r, 'the shaft tail starts ahead of the hero body');
  for (let i = 0; i < 24 && !arrow.dead; i++) arrow.update(1 / 60);
  assert.equal(foes[0].hp, before[0], 'rear foe cannot steal the forward shot via the elevated body hitbox');
  assert.ok(foes[1].hp < before[1], 'forward foe still receives the normal arrow hit');
});

test('a forward bow muzzle cannot hop through the adjoining crypt wall', () => {
  const g = game(), p = g.player, w = p.weapons[0];
  g.inCrypt = { key: 'review', hp: p.hp, minute: 0, depth: 1 };
  const world = new Dungeon(g, 1, 1, { name: 'Crypt', theme: 'crypt', lords: 2 });
  let spot;
  for (let y = 2; y < world.H - 2 && !spot; y++) for (let x = 2; x < world.W - 2; x++) {
    if (world.tile(x, y) === 0 && world.tile(x + 1, y) === 1) { spot = [x * 16 + 8, y * 16 + 8]; break; }
  }
  assert.ok(spot);
  [p.x, p.y] = spot; p.aim = 0;
  w.cd = 0; w.update(0);
  assert.equal(g.projectiles.length, 0, 'a wall between the hero and the bow blocks release');
});

test('the evolved bow keeps its five-arrow fan and moves every shaft ahead', () => {
  const g = game(), p = g.player, w = p.weapons[0];
  w.evolve(); w.cd = 0; p.aim = 0; w.update(0); w.update(.2);
  assert.equal(g.projectiles.length, 5, 'every arrow in the evolved volley');
  assert.ok(g.projectiles.every(arrow => Math.cos(arrow.ang) > .98), 'the fan keeps its existing narrow spread');
  for (const arrow of g.projectiles) assert.ok((arrow.x - p.x) * Math.cos(arrow.ang) + (arrow.y - p.y + 1) * Math.sin(arrow.ang) > 17);
});

test('a pooled non-bow projectile does not inherit the previous arrow launch plane', () => {
  const g = game();
  const arrow = spawnProjectile(g, { kind: 'arrow', sprite: 'arrow', x: 0, y: 0, ang: 0, speed: 1, life: 1, forwardFrom: [0, 0] });
  releaseProjectile(arrow);
  const blade = spawnProjectile(g, { kind: 'dagger', sprite: 'arrow', x: 0, y: 0, ang: Math.PI, speed: 1, life: 1 });
  assert.equal(blade, arrow, 'the same pool instance was reused');
  assert.equal(blade.forwardFrom, null);
});
