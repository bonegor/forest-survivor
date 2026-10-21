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
const {THIEF, heroPace} = await mod('public/js/game/enemies.js');
const {EnemyShot} = await mod('public/js/game/projectiles.js');
const P = await mod('public/js/shared/profile.js');

function gameCase(fn, mode = 's15', hero = 'knight') {
  const oldRandom = Math.random;
  Math.random = mulberry32(31);
  try {
    return fn(new Game({hero, mode, meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}}));
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

// The owner's (21 October 2026): it runs from the hero at 80% of his base pace, and once far
// enough wanders about, running again only when he comes too close.
test('a Gilded Thief runs from a near hero at 80% of his base pace, and strolls about once far from him', () => {
  for (const hero of Object.keys(HEROES)) gameCase((g) => {
    step(g, 2);
    const p = g.player;
    p.devGod = true;
    for (const w of p.weapons) w.update = () => {};
    g.spawner.update = () => {};
    const base = heroPace(g);
    assert.ok(Math.abs(base - 70 * (HEROES[hero].stats.speed || 1) * g.move) < 1e-9, `${hero}: his class's pace at the run's walking speed`);
    const t = g.spawnEnemy('thief', p.x + 60, p.y, { instant: true, sent: true });
    // Near: it runs, at 80% of his pace.
    let x = t.x, y = t.y;
    step(g, 30);
    const run = Math.hypot(t.x - x, t.y - y) * 2;
    assert.ok(t.fleeing && Math.abs(run / (THIEF.run * base) - 1) < 0.1, `${hero}: it runs at ${run.toFixed(1)} px/s against ${(THIEF.run * base).toFixed(1)}`);
    assert.ok(THIEF.run * base < p.moveSpeed, `${hero}: slower than him, so he can run it down`);
    // Far: it strolls, at a walk, this way and that.
    t.x = p.x + THIEF.safe + 80;
    t.y = p.y;
    step(g, 2);
    assert.equal(t.fleeing, false, `${hero}: far enough, it stops running`);
    const heads = new Set();
    for (let s = 0; s < 8; s++) {
      x = t.x;
      y = t.y;
      step(g, 30);
      const walk = Math.hypot(t.x - x, t.y - y) * 2;
      assert.ok(walk <= THIEF.walk * base * 1.1, `${hero}: a stroll, ${walk.toFixed(1)} px/s`);
      heads.add(Math.round(Math.atan2(t.y - y, t.x - x) * 2));
    }
    assert.ok(heads.size >= 2, `${hero}: this way and that (${heads.size} headings)`);
    // Near again: it runs again.
    t.x = p.x + 80;
    t.y = p.y;
    step(g, 2);
    assert.equal(t.fleeing, true, `${hero}: too close, it runs again`);
  }, 's15', hero);
});

test('a hero who sets off five seconds late still reaches a Gilded Thief; one who lets it be loses it', () => {
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
  // Left alone it soon strolls about nearby, and is gone when its 20 seconds are up.
  assert.ok(never.escaped, `left alone it gets away: ${JSON.stringify(never)}`);
});

test('the Bone King rings 11 bones round him (15 when wounded), fans five every 3.75 s', () => gameCase((g) => {
  step(g, 2);
  const p = g.player;
  p.devGod = true;
  for (const w of p.weapons) w.update = () => {};
  const king = g.spawnBoss('boneking', p.x + 100, p.y);
  let bones = 0;
  const push = g.eshots.push.bind(g.eshots);
  g.eshots.push = (...shots) => {
    for (const s of shots) if (s.kind === 'bone') bones++;
    return push(...shots);
  };
  const thrown = (setup, seconds) => { bones = 0; setup(); step(g, seconds * 60); return bones; };
  king.cd2 = 99; // no summoning
  king.cd3 = 99;
  assert.equal(thrown(() => { king.cdT = 0; }, 2.5), 11, 'the ring after a slam: a third more than 8');
  king.hp = king.maxHp * 0.4;
  assert.equal(thrown(() => { king.cdT = 0; }, 2.5), 15, 'below half health: a third more than 11');
  assert.equal(thrown(() => { king.cdT = 99; king.cd3 = 0; }, 15), 4 * 5, 'the aimed fan of five: four in 15 s, not five');
  // How big a bone is drawn: test/bone-shot.test.js.
}));

test('a bone that is drawn crossing the hero hurts; one drawn clear of him does not', () => gameCase((g) => {
  step(g, 2);
  const p = g.player;
  // A bone flying sideways past the hero, its ground track `dy` from his feet, standing still.
  const pass = (dy, spinAt) => {
    p.hp = p.maxHp;
    p.invuln = 0;
    const b = new EnemyShot(g, p.x - 120, p.y + dy, 0, 100, 10, 'bone');
    b.rot = spinAt;
    b.look = {...b.look, spin: 1e-9}; // barely turning: it stays at the turn the test gives it
    for (let i = 0; i < 160 && b.update(1/60); i++);
    return p.hp < p.maxHp;
  };
  // Drawn 8 px up and 19 px long, a bone on a track 14 px behind his feet sweeps his chest;
  // under the old rule (3 px from the feet) it flew through him.
  assert.ok(pass(-14, 0), 'flat, across the chest');
  assert.ok(pass(-14, Math.PI / 2), 'upright, across the chest');
  assert.ok(pass(0, 0), 'through his legs');
  assert.ok(!pass(-44, 0), 'well above his head');
  assert.ok(!pass(22, 0), 'well below his feet');
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

// The owner (20 October 2026): "Make the lich king bigger by 50%".
test('the Lich is drawn half again his size, struck over as much more of him, his shots and words where his body is', () => gameCase((g) => {
  step(g, 2);
  const p = g.player, S = g.cam.S;
  const lich = g.spawnBoss('lich', p.x + 80, p.y, {sleeping: true}), fr = lich.spr.frames[0];
  assert.equal(lich.scale, 1.5);
  assert.equal(lich.r, 15, 'his body to strike: the 10 it was, half again');
  assert.equal(lich.h, fr.h * 1.5, 'as tall as he is drawn');
  const ctx = document.createElement('canvas').getContext('2d');
  lich.draw(ctx, g.cam);
  const [, Y, w, h] = lich._rect;
  assert.ok(Math.abs(w - fr.w * 1.5 * S) < 1e-9 && Math.abs(h - fr.h * 1.5 * S) < 1e-9, `drawn ${w / S} x ${h / S}, half again his frame's ${fr.w} x ${fr.h}`);
  // Over his head (his name, his words) is at the top of him as drawn, his flight and bob within 3 px.
  const top = Y / S + g.cam.y, over = lich.y - lich.h - 6;
  assert.ok(Math.abs(over - top) <= 3, `over his head at ${over.toFixed(1)}, his top at ${top.toFixed(1)}`);
  // A ring of his skulls leaves his chest, as much higher as he is bigger: 15 px up, not 10.
  const before = g.eshots.length;
  lich.state = 'move';
  lich.cdT = 0;
  lich.ai(lich, 1/60);
  const shots = g.eshots.slice(before);
  assert.ok(shots.length >= 12, `${shots.length} skulls`);
  assert.ok(shots.every((s) => Math.abs(s.y - (lich.y - 15)) < 1e-9 && Math.abs(s.x - lich.x) < 1e-9), 'from his chest');
  assert.ok(lich.y - 15 > top && lich.y - 15 < lich.y, 'his chest within his drawn body');
}));
