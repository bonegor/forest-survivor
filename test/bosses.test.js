import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
await mod('tools/headless.mjs');
const {Game} = await mod('public/js/game/game.js');
const {mulberry32} = await mod('public/js/engine/util.js');
const {musicState} = await mod('public/js/engine/audio.js');
const {SURVIVAL_BOSSES} = await mod('public/js/data/waves.js');
const {HEROES} = await mod('public/js/data/heroes.js');
const {input} = await mod('public/js/engine/input.js');
const {thiefPace} = await mod('public/js/game/enemies.js');
const P = await mod('public/js/shared/profile.js');

function gameCase(fn, mode = 's15') {
  const oldRandom = Math.random;
  Math.random = mulberry32(31);
  try {
    return fn(new Game({hero:'knight', mode, meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}}));
  } finally {
    Math.random = oldRandom;
  }
}
const step = (g, n) => { for (let i = 0; i < n; i++) g.update(1/60); };

test('a boss arrives on time even when the horde is at its cap', () => gameCase((g) => {
  step(g, 2);
  const p = g.player;
  while (g.enemies.length <= 900) g.spawnEnemy('bat', p.x + 300, p.y + 300, {instant: true});
  const first = SURVIVAL_BOSSES.s15[0];
  g.time = first.at + 0.1;
  step(g, 1);
  assert.ok(g.enemies.some(e => e.type === first.id && !e.dead), 'the boss is in the forest');
  assert.equal(g.spawner.bossIdx, 1);
  assert.ok(g.spawnEnemy('bat', p.x + 300, p.y, {instant: true}) === null, 'the cap still holds for the horde');
}));

test('with two bosses up, felling one keeps the other on the bar and the boss music on', () => gameCase((g) => {
  step(g, 2);
  const p = g.player;
  const older = g.spawnBoss('boneking', p.x + 120, p.y);
  const newer = g.spawnBoss('butcher', p.x - 120, p.y);
  assert.ok(g.boss === newer, 'the newest boss is on the bar');
  assert.equal(musicState().piece, 'boss');
  g.hitEnemy(newer, 1e9, {});
  step(g, 2);
  // (Identity checks: a failing equal() on an enemy would print the whole game.)
  assert.ok(g.boss === older, 'the bar goes to the boss still fighting');
  assert.equal(musicState().piece, 'boss');
  g.hitEnemy(older, 1e9, {});
  step(g, 2);
  assert.ok(g.boss === null, 'no boss left');
  assert.equal(musicState().piece, 'forest', 'the forest music once the last has fallen');
}));

test('a Gilded Thief runs a fifth slower than the slowest hero, so any hero can catch it', () => {
  const heroes = Object.keys(HEROES);
  const speeds = heroes.map(hero => new Game({hero, mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}}).player.moveSpeed);
  const slowest = Math.min(...speeds);
  gameCase((g) => {
    step(g, 2);
    g.spawner.spawnThief(g.phase);
    const thief = g.enemies.find(e => e.type === 'thief' && !e.dead);
    assert.ok(thief, 'a thief appears');
    const sp = thief.spd * g.diff.speed;
    assert.ok(Math.abs(sp / slowest - 0.8) < 0.01, `${sp.toFixed(1)} px/s against the slowest hero's ${slowest.toFixed(1)}`);
  });
});

test('a hero who sets off five seconds late still reaches a Gilded Thief; one who lets it be loses it', () => {
  assert.deepEqual([50, 100, 140, 180, 400].map(thiefPace), [1, 1, 0.5, 0.3, 0.3], 'flat out near, a jog far ahead');
  // The slowest hero, standing `delay` seconds, then running straight at it; no blows, only the chase.
  const chase = (delay) => {
    const oldRandom = Math.random, oldBot = input.bot;
    Math.random = mulberry32(5);
    try {
      const g = new Game({hero:'mage', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}, crypts:false});
      g.spawner.update = () => {};
      const p = g.player;
      p.devGod = true;
      for (const w of p.weapons) w.update = () => {};
      g.spawner.spawnThief(g.phase);
      const t = g.enemies.find(e => e.type === 'thief');
      for (let i = 0; i < 25 * 60 && !t.dead; i++) {
        const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
        if (d < 60) return {reached: i / 60};
        input.bot = i / 60 < delay ? {x:0, y:0} : {x: dx / d, y: dy / d};
        g.update(1/60);
      }
      return {escaped: t.dead, far: Math.round(Math.hypot(t.x - p.x, t.y - p.y))};
    } finally {
      Math.random = oldRandom;
      input.bot = oldBot;
    }
  };
  const late = chase(5);
  assert.ok(late.reached < 14, `within reach in time: ${JSON.stringify(late)}`);
  const never = chase(Infinity);
  assert.ok(never.escaped && never.far > 300, `left alone it gets away: ${JSON.stringify(never)}`);
});

test('the Bone King throws a fifth fewer bones, each drawn a fifth bigger', () => gameCase((g) => {
  step(g, 2);
  const p = g.player;
  p.devGod = true;
  for (const w of p.weapons) w.update = () => {};
  const king = g.spawnBoss('boneking', p.x + 100, p.y);
  let bones = 0;
  const push = g.eshots.push.bind(g.eshots);
  g.eshots.push = (...shots) => { bones += shots.filter(s => s.kind === 'bone').length; return push(...shots); };
  const thrown = (setup, seconds) => { bones = 0; setup(); step(g, seconds * 60); return bones; };
  king.cd2 = 99; // no summoning
  king.cd3 = 99;
  assert.equal(thrown(() => { king.cdT = 0; }, 2.5), 8, 'the ring after a slam: 8 bones, not 10');
  king.hp = king.maxHp * 0.4;
  assert.equal(thrown(() => { king.cdT = 0; }, 2.5), 11, 'below half health: 11, not 14');
  assert.equal(thrown(() => { king.cdT = 99; king.cd3 = 0; }, 15), 4 * 5, 'the aimed fan of five: four in 15 s, not five');
  // Drawn a fifth bigger than the 2.5 times its sprite it was.
  const bone = g.eshots.find(s => s.kind === 'bone');
  let k = 0;
  bone.draw({globalAlpha: 1, drawImage(img, x, y, w) { k = w / (img.width * g.cam.S); }}, g.cam);
  assert.ok(Math.abs(k - 2.5 * 1.2) < 0.05, `drawn at ${k.toFixed(2)} times its sprite`);
}));

test("a boss's blow costs the hero health but never shoves him", () => gameCase((g) => {
  step(g, 2);
  const p = g.player;
  p.invuln = 0;
  const king = g.spawnEnemy('boneking', p.x + 8, p.y, {instant: true});
  const x = p.x, y = p.y, hp = p.hp;
  king.update(1/60);
  assert.ok(p.hp < hp, 'the blow lands');
  for (let i = 0; i < 60; i++) p.update(1/60);
  assert.deepEqual([p.x, p.y], [x, y], 'the hero stays where he stood');
}));
