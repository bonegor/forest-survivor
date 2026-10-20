// An ending that tells the story (order 1, item 5): the blow that fells the hero is named (a
// monster by its name, a champion by its own, a boss with its title, a shot as its shooter's), the
// results say it, and the hero's fall plays out (the music stops, the world drains, he falls,
// "Slain by …") before the results come; a revive is unchanged. The results tick in, stamp the
// records the run broke, and count the gold; what the Armory's next rank costs is told.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, DEATH } from '../public/js/game/game.js';
import { EnemyShot } from '../public/js/game/projectiles.js';
import { shotName } from '../public/js/game/names.js';
import { armoryLine } from '../public/js/ui/gamescreen.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, seed = 8) {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(seed);
  input.bot = { x: 0, y: 0 };
  try {
    const g = new Game({ hero: 'knight', mode: 's15', diff: 'medium', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = bot;
    Math.random = random;
  }
}

test('a blow by contact is named after the foe: a monster, a champion by its own name, a boss with its title', () => {
  game((g, p) => {
    const e = g.spawnEnemy('zombie', p.x + 3, p.y, { instant: true });
    p.hp = 1;
    for (let i = 0; i < 60 && !p.dead; i++) g.update(1 / 60);
    assert.ok(p.dead, 'felled by its touch');
    assert.equal(g.stats.killedBy, 'Ghoul');
    assert.equal(e.def.name, 'Ghoul');
  });
  game((g, p) => {
    g.spawner.spawnElite(g.phase);
    const e = g.enemies.find((x) => x.elite);
    p.hurt(1e9, e);
    assert.equal(g.stats.killedBy, e.name, 'a champion: its own name');
    assert.match(e.name, /^[A-Z][a-z]+ the [A-Z]/);
  });
  game((g, p) => {
    const b = g.spawnBoss('boneking', p.x + 20, p.y);
    b.cdT = 0; // the slam at once
    p.hp = 1;
    for (let i = 0; i < 240 && !p.dead; i++) g.update(1 / 60);
    assert.ok(p.dead);
    assert.equal(g.stats.killedBy, 'King Ossarian, The Bone King', 'a boss: name and title, by touch or by its slam');
  });
});

test("a shot is named as its shooter's", () =>
  game((g, p) => {
    const c = g.spawnEnemy('cultist', p.x + 60, p.y, { instant: true });
    assert.equal(shotName(c, 'darkbolt'), "Cultist's bolt");
    g.eshots.push(new EnemyShot(g, p.x, p.y - 2, 0, 1, 1e9, 'darkbolt', { by: shotName(c, 'darkbolt') }));
    p.invuln = 0;
    g.update(1 / 60);
    assert.ok(p.dead);
    assert.equal(g.stats.killedBy, "Cultist's bolt");
    const boss = g.spawnBoss('lich', p.x + 90, p.y);
    assert.equal(shotName(boss, 'skullbolt'), "Malgrath's skull", 'a boss by its name alone');
  }));

test('the fall plays out before the results: silence, the world drained, the hero tipped over, then the results', () =>
  game((g, p) => {
    p.hurt(1e9);
    assert.equal(g.state, 'dying');
    let t = 0;
    while (g.state === 'dying' && t < 5) {
      g.update(1 / 60);
      t += 1 / 60;
    }
    assert.equal(g.state, 'over');
    assert.ok(t >= DEATH.end - 0.02 && t <= 3, `the results after ${t.toFixed(2)} s, at most 3`);
    assert.ok(DEATH.drain <= 1 && DEATH.name < DEATH.end, 'drained within a second, the name before the results');
  }));

test('a revive is as it was: no fall, no name', () =>
  game((g, p) => {
    p.revivals = 1;
    p.hurt(1e9);
    assert.ok(!p.dead && g.state === 'play');
    assert.equal(g.stats.killedBy, null);
  }));

test('the results tell what the gold buys at the Armory', () => {
  const p = defaultProfile();
  p.gold = 0;
  assert.equal(armoryLine(p), '+100 gold to Magnetism I', 'the cheapest rank, and how far it is');
  p.gold = 260;
  assert.equal(armoryLine(p), '14 Armory ranks affordable'); // Exile (250) among them
});
