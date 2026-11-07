import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { heroStats } from '../public/js/game/weapons.js';
import { releaseProjectile } from '../public/js/game/projectiles.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import data from '../public/js/expansion/weapons/marksman.js';
import behavior from '../public/js/expansion/weapons/marksman-behavior.js';

function encounter(def = data.weapon, level = 1, amount = 0) {
  const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
  const p = g.player;
  p.amount = amount;
  p.crit = 0;
  g.enemies.length = 0;
  g.world.solid = () => false;
  const w = { g, s: heroStats(def, level, p), reach: behavior.reach, dmgDealt: 0 };
  g.mainWeapon = () => w;
  const foe = (x, y) => g.spawnEnemy('zombie', p.x + x, p.y + y, { instant: true, hpMul: 100 });
  return { g, p, w, foe };
}

function fly(g, frames = 90) {
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
  for (let frame = 0; frame < frames; frame++) {
    let next = 0;
    for (const shot of g.projectiles) {
      if (shot.update(1 / 60)) g.projectiles[next++] = shot;
      else releaseProjectile(shot);
    }
    g.projectiles.length = next;
  }
}

test('Splitpin stops on the first body, then pierces across the crowd', () => {
  const { g, p, w, foe } = encounter();
  const impact = foe(46, 0), behind = foe(76, 0);
  const side = [foe(39, -22), foe(39, 22), foe(39, -46), foe(39, 46)];
  const hp = impact.hp;
  g.grid.rebuild(g.enemies, p.x, p.y);
  // These enemies simulate a denser rank directly across the bolt's path, after its aim is set.
  w.hand = true;
  w.handTarget = impact;
  behavior.fire(w);
  assert.equal(g.projectiles.length, 1);
  assert.equal(p.heroAttack.weapon, w);
  fly(g);
  assert.ok(hp - impact.hp >= 27 && hp - impact.hp <= 35, 'the primary takes exactly one full hit');
  assert.equal(behind.hp, behind.maxHp, 'the pin never pierces forward');
  for (const e of side) assert.ok(e.hp < e.maxHp, 'both splinters pierce a second foe');
});

test('Splinterline caps a packed fan at eight shards and one hit per nearby body', () => {
  const { g, p, w, foe } = encounter(data.evolution, 8, 5);
  const impact = foe(46, 0), neighbor = foe(41, 11);
  const hits = [];
  const hit = g.hitEnemy.bind(g);
  g.hitEnemy = (e, dmg, opts) => {
    hits.push([e, dmg]);
    return hit(e, dmg, opts);
  };
  g.grid.rebuild(g.enemies, p.x, p.y);
  w.hand = true;
  w.handTarget = impact;
  behavior.fire(w);
  for (let i = 0; i < 18 && g.projectiles[0].kind === 'splitpin'; i++) fly(g, 1);
  assert.equal(g.projectiles.filter((shot) => shot.kind === 'splitpinShard').length, 8);
  fly(g);
  assert.deepEqual(hits.filter(([e]) => e === impact), [[impact, 54]]);
  assert.deepEqual(hits.filter(([e]) => e === neighbor), [[neighbor, 54 * 0.48]]);
});

test('automatic fire waits for a target and a manual release can aim through empty space', () => {
  const { g, p, w, foe } = encounter();
  assert.equal(behavior.fire(w), false);
  const target = foe(0, -125);
  g.grid.rebuild(g.enemies, p.x, p.y);
  assert.equal(behavior.previewTarget(w), target);
  behavior.fire(w);
  assert.equal(g.projectiles.at(-1).ang, -Math.PI / 2);
  w.hand = true;
  p.strikeAng = Math.PI;
  behavior.fire(w);
  assert.equal(g.projectiles.at(-1).ang, Math.PI);
});
