import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const frames = (g, n) => { for (let i = 0; i < n; i++) g.update(1 / 60); };

for (const exit of ['stairs', 'faint']) {
  test(`living forest bosses stay intact while a crypt is fought and left by ${exit}`, () => {
    const random = Math.random, bot = input.bot;
    Math.random = mulberry32(4242);
    input.bot = { x: 0, y: 0 };
    try {
      const g = new Game({ hero: 'knight', mode: 's15', headless: true,
        meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
      const p = g.player;
      g.spawner.update = () => {};
      p.devGod = true;
      p.weapons[0].cd = 999;
      const bosses = [g.spawnBoss('boneking', p.x + 100, p.y, { sleeping: true }),
        g.spawnBoss('butcher', p.x - 100, p.y, { sleeping: true })];
      // A nearly defeated boss must not turn into a kill merely by changing world.
      bosses[0].hp = 1;
      bosses[1].hp = 37;
      for (const boss of bosses) { boss.sleeping = false; boss.aware = true; }
      g.boss = bosses[1];
      const forest = g.enemies, identity = bosses.map(e => [e.id, e.type, e.hp]);
      const door = { key: '2,0', depth: 1, x: p.x, y: p.y };
      g.enterCrypt(door);
      frames(g, 110);
      assert.ok(g.inCrypt);
      assert.equal(g.forestState.enemies, forest);
      assert.equal(g.forestState.boss, bosses[1]);
      assert.ok(!g.enemies.some(e => bosses.includes(e)), 'the outside bosses are not in the crypt simulation');
      const night = g.time;

      const lord = g.enemies.find(e => e.lord);
      assert.ok(lord);
      g.hitEnemy(lord, 1e9);
      frames(g, 180);
      // Reuse crypt enemy-pool entries; they must never reuse a living forest boss.
      for (let i = 0; i < 12; i++) g.spawnEnemy('zombie', p.x + 200 + i * 10, p.y, { instant: true, always: true, dormant: true });
      assert.equal(g.time, night, 'the night remains paused below');
      assert.deepEqual(bosses.map(e => [e.id, e.type, e.hp]), identity);
      assert.ok(bosses.every(e => !e.dead && e.g === g));
      assert.equal(g.stats.bossLog.filter(entry => entry.kill !== undefined && !entry.id.startsWith('lord ')).length, 0, 'no outside boss kill was recorded');

      g.state = 'play';
      if (exit === 'faint') g.faint();
      else g.leaveCrypt();
      frames(g, 240);
      assert.equal(g.inCrypt, null);
      assert.equal(g.enemies, forest);
      assert.equal(g.boss, bosses[1]);
      assert.deepEqual(bosses.map(e => [e.id, e.type, e.hp]), identity);
      assert.ok(bosses.every(e => !e.dead && g.enemies.includes(e)), 'both bosses are alive after returning');
    } finally {
      Math.random = random;
      input.bot = bot;
    }
  });
}
