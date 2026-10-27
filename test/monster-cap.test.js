// The cap of monsters (the owner's, 16 October 2026: "recycle those far away, throw them out ...
// if they are far offscreen it makes sense"). Past HORDE_CAP.most (2,500 since 27 October 2026) a
// new monster comes in the place of the farthest that stands well off-screen (data/waves.js
// HORDE_CAP.far screen diagonals from the hero), which simply vanishes: no death, no drops, no
// kill, no XP. Never one on the screen, a boss, a crypt's lord, a champion, the thief, a boss's
// summons or a sleeping pack; if none is that far, the spawn is refused as before. The steady
// horde makes room for HORDE_CAP.perFrame a frame; what is sent at the hero (a ring, a swarm...)
// comes in full, in the place of any foe off the screen, and stops asking once none is left.
import test from 'node:test';
import assert from 'node:assert/strict';

await import('../tools/headless.mjs');
const { Game } = await import('../public/js/game/game.js');
const { HORDE_CAP } = await import('../public/js/data/waves.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
const { defaultProfile, metaBonuses } = await import('../public/js/shared/profile.js');
const { view } = await import('../public/js/engine/view.js');

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

// A night with no one in it yet, the camera on the hero.
function game() {
  const oldRandom = Math.random;
  Math.random = mulberry32(5);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    g.update(1 / 60);
    g.enemies.length = 0;
    g.propCount = 0;
    const c = g.cam, p = g.player;
    c.x = p.x - c.W / 2;
    c.y = p.y - c.H / 2;
    return g;
  } finally {
    Math.random = oldRandom;
  }
}

// How far off the hero is far enough (HORDE_CAP.far screen diagonals), in world px.
const farOf = (g) => Math.hypot(g.cam.W, g.cam.H) * HORDE_CAP.far;
// A spot on the screen, near the hero.
const near = (g, i) => ({ x: g.player.x + ((i * 37) % 160) - 80, y: g.player.y + ((i * 23) % 90) - 45 });
// Fills the night up to the cap (one past HORDE_CAP.most, where spawnEnemy starts making room)
// with skeletons on the screen, after the given foes.
function fill(g, foes = []) {
  const out = foes.map(([type, x, y, o]) => g.spawnEnemy(type, x, y, { instant: true, ...o }));
  for (let i = 0; g.enemies.length <= HORDE_CAP.most; i++) {
    const s = near(g, i);
    g.spawnEnemy('skeleton', s.x, s.y, { instant: true });
  }
  return out;
}
const live = (g) => g.enemies.filter((e) => !e.dead && !e.prop).length;
const onScreen = (g, e) => e.x > g.cam.x && e.x < g.cam.x + g.cam.W && e.y > g.cam.y && e.y < g.cam.y + g.cam.H;

test('the threshold is well off the screen: beyond its corners and where the horde comes in', () => {
  const g = game();
  const half = Math.hypot(g.cam.W, g.cam.H) / 2;
  assert.ok(farOf(g) > half + HORDE_CAP.edge, 'farther than any corner of the screen');
  assert.equal(HORDE_CAP.most, 2500);
  assert.ok(HORDE_CAP.perFrame > 0 && HORDE_CAP.perFrame <= 20);
});

test('at the cap a new monster takes the place of the farthest off-screen, never one on the screen', () => {
  const g = game(), p = g.player, F = farOf(g);
  const [a, b, edge] = fill(g, [
    ['skeleton', p.x + F * 1.2, p.y],
    ['zombie', p.x - F * 1.6, p.y + 10],
    ['skeleton', p.x, g.cam.y - HORDE_CAP.edge - 20], // off the screen, but not far
  ]);
  const shown = g.enemies.filter((e) => onScreen(g, e));
  assert.equal(shown.length, HORDE_CAP.most - 2);
  const before = live(g);

  const n1 = g.spawnEnemy('bat', p.x + 300, p.y, {});
  assert.ok(n1, 'the spawn comes');
  assert.ok(b.dead && !a.dead, 'the farthest went first');
  const n2 = g.spawnEnemy('bat', p.x + 300, p.y, {});
  assert.ok(n2 && a.dead, 'then the next farthest');
  assert.equal(g.spawnEnemy('bat', p.x + 300, p.y, {}), null, 'none far enough: refused');
  assert.ok(!edge.dead, 'one just off the screen stays for the steady horde');
  assert.ok(shown.every((e) => !e.dead), 'none on the screen ever goes');
  assert.equal(live(g), before, 'the horde stays at the cap');
  assert.equal(g.horde.recycled, 2);
});

test('a boss, a lord, a champion, the thief, summons and a sleeping pack are never recycled', () => {
  const g = game(), p = g.player, F = farOf(g);
  const kept = fill(g, [
    ['boneking', p.x + F * 2, p.y, { always: true }],
    ['skeletonarcher', p.x - F * 2, p.y, { elite: true, lord: true, sleeping: true }],
    ['orc', p.x, p.y + F * 2, { elite: true }],
    ['thief', p.x, p.y - F * 2],
    ['imp', p.x + F * 1.5, p.y + F * 1.5, { summoned: true }],
    ['zombie', p.x - F * 1.5, p.y - F * 1.5, { dormant: true, pack: 3 }],
    ['ghost', p.x + F * 1.5, p.y - F * 1.5, { sleeping: true }],
  ]);
  assert.equal(g.spawnEnemy('bat', p.x + 300, p.y, {}), null, 'the steady horde is refused');
  assert.equal(g.spawnEnemy('bat', p.x + 300, p.y, { sent: true }), null, 'and so is a ring with no one to take');
  assert.ok(kept.every((e) => !e.dead));
  assert.equal(g.horde.recycled, 0);
});

test('a recycled monster gives nothing: no kill, no XP, no drops', () => {
  const g = game(), p = g.player, F = farOf(g);
  const [far] = fill(g, [['skeleton', p.x + F * 1.5, p.y]]);
  let kills = 0;
  const kill = g.killEnemy;
  g.killEnemy = function (...a) {
    kills++;
    return kill.apply(this, a);
  };
  const before = { kills: g.kills, xp: p.xp, level: p.level, pickups: g.pickups.length, gold: g.gold };
  assert.ok(g.spawnEnemy('bat', p.x + 300, p.y, {}));
  assert.ok(far.dead, 'it is gone');
  assert.equal(kills, 0, 'not killed');
  assert.deepEqual({ kills: g.kills, xp: p.xp, level: p.level, pickups: g.pickups.length, gold: g.gold }, before);
});

// Boxes don't count toward the cap (Game.spawnProp): at the cap one still comes, and no monster
// makes room for it.
test("a box comes at the cap all the same, and takes no monster's place", () => {
  const g = game(), p = g.player, F = farOf(g);
  const [far] = fill(g, [['skeleton', p.x + F * 1.5, p.y]]);
  const n = live(g);
  assert.ok(n > HORDE_CAP.most, 'at the cap');
  const boxes = ['crate', 'barrel', 'urn'].map((type, i) => g.spawnProp(type, p.x + 200, p.y + i * 20));
  assert.ok(boxes.every((b) => b && b.prop && !b.dead), 'every box stands');
  assert.ok(!far.dead, 'the far monster stays');
  assert.equal(live(g), n, 'as many monsters as before');
  assert.equal(g.horde ? g.horde.recycled : 0, 0, 'none recycled');
});

test('when the whole cap stands within the threshold, the spawn is refused as before', () => {
  const g = game(), p = g.player, F = farOf(g);
  // Off the screen all round, but nearer than the threshold.
  const off = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    off.push(['skeleton', p.x + Math.cos(a) * F * 0.95, p.y + Math.sin(a) * F * 0.95]);
  }
  fill(g, off);
  const n = g.enemies.length;
  for (let i = 0; i < 5; i++) assert.equal(g.spawnEnemy('bat', p.x + 300, p.y, {}), null);
  assert.equal(g.enemies.length, n);
  assert.ok(g.enemies.every((e) => !e.dead));
});

test('the steady horde makes room for HORDE_CAP.perFrame a frame at most', () => {
  const g = game(), p = g.player, F = farOf(g);
  const far = [];
  for (let i = 0; i < HORDE_CAP.perFrame * 2 + 5; i++) far.push(['skeleton', p.x + F * 1.2 + i, p.y]);
  fill(g, far);
  let got = 0;
  for (let i = 0; i < far.length; i++) if (g.spawnEnemy('bat', p.x + 300, p.y, {})) got++;
  assert.equal(got, HORDE_CAP.perFrame, 'this frame');
  g.frame++;
  for (let i = 0; i < far.length; i++) if (g.spawnEnemy('bat', p.x + 300, p.y, {})) got++;
  assert.equal(got, HORDE_CAP.perFrame * 2, 'and as many the next');
  assert.ok(live(g) <= HORDE_CAP.most + 1);
});

test('a ring round the hero at the cap comes in full, in the place of foes off the screen', () => {
  const g = game(), p = g.player, F = farOf(g);
  // 600 off the screen (a ring is some 4.3 times its first size at 12:00: the horde doubled twice,
  // Elite's four thirds, and 5% more a minute, spawner.js minuteMore), a few far and most just past
  // its edge; the rest on it.
  const off = [];
  for (let i = 0; i < 600; i++) {
    const a = (i / 600) * Math.PI * 2, r = i % 10 ? F * 0.9 : F * 1.3;
    off.push(['skeleton', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r]);
  }
  fill(g, off);
  const shown = g.enemies.filter((e) => onScreen(g, e));
  let asked = 0, came = 0;
  const spawn = g.spawnEnemy;
  g.spawnEnemy = function (...a) {
    asked++;
    const e = spawn.apply(this, a);
    if (e) came++;
    return e;
  };
  // A ring brings three times its count since 26 October 2026 (spawner.js RING): 14 is about the old 40's.
  g.spawner.fire({ type: 'ring', enemy: 'zombie', count: 14 }, 12);
  assert.ok(asked > HORDE_CAP.perFrame, `a ring bigger than a frame's room (${asked})`);
  assert.equal(came, asked, 'every one of the ring came');
  assert.ok(shown.every((e) => !e.dead), 'none on the screen made room');
  assert.ok(live(g) <= HORDE_CAP.most + 1, 'the cap holds');
  // A boss's summons likewise.
  g.frame++;
  asked = came = 0;
  g.summonRing('skeleton', 12, 72);
  assert.equal(came, 12);
  assert.ok(live(g) <= HORDE_CAP.most + 1);
});

test('a ring at the cap with no one off the screen to take stops asking at the first refusal', () => {
  const g = game();
  fill(g);
  let asked = 0;
  const spawn = g.spawnEnemy;
  g.spawnEnemy = function (...a) {
    asked++;
    return spawn.apply(this, a);
  };
  g.spawner.fire({ type: 'ring', enemy: 'zombie', count: 14 }, 12);
  assert.equal(asked, 1, 'one refused, the rest never asked');
});
