import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
await mod('tools/headless.mjs');
const {Game} = await mod('public/js/game/game.js');
const {findPath, HOLE_AWAY} = await mod('public/js/game/dungeon.js');
const {input} = await mod('public/js/engine/input.js');
const {mulberry32} = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

const T = 16;
const step = (g, n) => { for (let i = 0; i < n; i++) g.update(1/60); };
function gameCase(fn, mode = 's15', seed = 4242) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    return fn(new Game({hero:'knight', mode, meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}}));
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
// Up the steps of the first crypt east of the start (as test/crypts.test.js does).
function enterCrypt(g) {
  const p = g.player;
  step(g, 2);
  p.x = 2774; p.y = -200;
  g.world.syncShrines();
  const door = g.crypts.find(d => d.key === '2,0');
  for (const e of g.enemies) e.dead = true;
  p.x = door.x; p.y = door.y + 10; p.invuln = 999;
  input.bot = {x:0, y:-1};
  for (let i = 0; i < 120 && !g.inCrypt; i++) step(g, 1);
  input.bot = {x:0, y:0};
  step(g, 60);
  for (const e of g.enemies) if (!e.lord && !e.prop) e.dead = true;
  return door;
}
// Fells every lord of the crypt but the one in its farthest room, and returns that one: the last.
function lastLord(g) {
  const last = g.world.guardian;
  for (const e of g.enemies.filter(e => e.lord && e !== last)) g.hitEnemy(e, 1e9, {});
  step(g, 2);
  return last;
}

// The cost of the shortest walk by Dijkstra over every tile, as a check on A*.
function dijkstra(W, H, blocked, from, to) {
  const cost = new Float64Array(W * H).fill(Infinity), done = new Uint8Array(W * H);
  cost[from] = 0;
  for (;;) {
    let i = -1;
    for (let k = 0; k < W * H; k++) if (!done[k] && cost[k] < Infinity && (i < 0 || cost[k] < cost[i])) i = k;
    if (i < 0) return Infinity;
    if (i === to) return cost[i];
    done[i] = 1;
    const x = i % W, y = Math.floor(i / W);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= W || ny >= H || blocked(nx, ny)) continue;
      if (dx && dy && (blocked(x + dx, y) || blocked(x, y + dy))) continue;
      const c = cost[i] + (dx && dy ? Math.SQRT2 : 1);
      if (c < cost[ny * W + nx]) cost[ny * W + nx] = c;
    }
  }
}
const length = (W, path) => path.slice(1).reduce((s, i, k) => s + Math.hypot((i % W) - (path[k] % W), Math.floor(i / W) - Math.floor(path[k] / W)), 0);

test('A* finds a shortest walk, never through a wall or across its corner', () => {
  const rng = mulberry32(3);
  for (let n = 0; n < 60; n++) {
    const W = 6 + Math.floor(rng() * 14), H = 5 + Math.floor(rng() * 12);
    const wall = new Uint8Array(W * H).map(() => (rng() < 0.3 ? 1 : 0));
    const blocked = (x, y) => x < 0 || y < 0 || x >= W || y >= H || wall[y * W + x] === 1;
    const free = [...wall.keys()].filter(i => !wall[i]);
    if (free.length < 2) continue;
    const from = free[Math.floor(rng() * free.length)], to = free[Math.floor(rng() * free.length)];
    const path = findPath(W, H, blocked, from, to), best = dijkstra(W, H, blocked, from, to);
    if (best === Infinity) {
      assert.equal(path, null, 'no walk, no path');
      continue;
    }
    assert.equal(path[0], from);
    assert.equal(path.at(-1), to);
    assert.ok(Math.abs(length(W, path) - best) < 1e-9, `as short as can be (${length(W, path)} vs ${best})`);
    for (let k = 1; k < path.length; k++) {
      const x0 = path[k - 1] % W, y0 = Math.floor(path[k - 1] / W), x1 = path[k] % W, y1 = Math.floor(path[k] / W);
      assert.ok(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) === 1, 'one step at a time');
      assert.ok(!blocked(x1, y1), 'never on a wall');
      if (x1 !== x0 && y1 !== y0) assert.ok(!blocked(x1, y0) && !blocked(x0, y1), 'never across a corner');
    }
  }
});

// Every pickup on open floor that the hero can walk to.
function allReachable(g) {
  const w = g.world, p = g.player;
  w.updateFlow(true);
  for (const pk of g.pickups) {
    if (pk.dead) continue;
    const tx = Math.floor(pk.x / T), ty = Math.floor(pk.y / T);
    assert.ok(w.free(pk.x, pk.y), `${pk.kind} at ${Math.round(pk.x)},${Math.round(pk.y)} is not in a wall`);
    assert.ok(w.flow[ty * w.W + tx] >= 0, `${pk.kind} can be walked to`);
  }
}
// The open tiles of a room that touch its wall: where a boss falling sends its drops at the wall.
function byTheWall(w, room) {
  const out = [];
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) {
    if (w.blocked(x, y)) continue;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => w.isWall(x + dx, y + dy));
    if (dirs.length) out.push({x, y, dirs});
  }
  return out;
}

test('a crypt lord felled against a wall drops nothing into it', () => gameCase((g) => {
  enterCrypt(g);
  const w = g.world, p = g.player, room = w.guardRoom;
  // The hero waits by the stairs, far from the drops, so nothing is pulled to him.
  p.x = w.exit.x; p.y = w.exit.y - 20;
  const spots = byTheWall(w, room);
  assert.ok(spots.length > 8, 'a room has walls');
  // Its own lords first: each one set by the wall then falls as the last, and drops gear, a
  // chest or both (side by side).
  for (const e of g.enemies.filter(e => e.lord)) g.hitEnemy(e, 1e9, {});
  step(g, 2);
  const kinds = new Set();
  for (const s of spots.filter((_, i) => i % 3 === 0)) {
    for (const pk of g.pickups) pk.dead = true;
    const [dx, dy] = s.dirs[0];
    // As close to the wall as a lord can stand.
    const lord = g.spawner.spawnLord(s.x * T + T / 2 + dx * 6, s.y * T + T / 2 + dy * 6);
    g.hitEnemy(lord, 1e9, {});
    step(g, 150);
    const drops = g.pickups.filter(pk => !pk.dead && (pk.kind === 'item' || pk.kind === 'chest'));
    assert.ok(drops.length, 'gear or a chest dropped');
    for (const pk of drops) kinds.add(pk.kind);
    allReachable(g);
  }
  assert.deepEqual([...kinds].sort(), ['chest', 'item'], 'gear and chests alike');
}));

test('a Dungeon guardian felled against a wall drops nothing into it', () => gameCase((g) => {
  const w = g.world, p = g.player, gd = w.guardian;
  w.sealed = false;
  gd.sealed = false;
  p.x = w.start.x; p.y = w.start.y;
  const spots = byTheWall(w, w.guardRoom), s = spots[Math.floor(spots.length / 2)], [dx, dy] = s.dirs[0];
  gd.x = s.x * T + T / 2 + dx * 6;
  gd.y = s.y * T + T / 2 + dy * 6;
  g.hitEnemy(gd, 1e9, {});
  step(g, 150);
  assert.ok(g.pickups.some(pk => !pk.dead && pk.kind === 'chest'), 'its chest dropped');
  allReachable(g);
  assert.ok(w.stairs, 'the stairs down open');
}, 'dungeon'));

// How many tiles' walk from (x, y) to (x2, y2) in a crypt.
const walk = (w, x, y, x2, y2) => w.bfs(Math.floor(x / T), Math.floor(y / T), new Int16Array(w.W * w.H))[Math.floor(y2 / T) * w.W + Math.floor(x2 / T)];

// The user's call, 15 October 2026: "once they are finished, the boss is killed, the exit should not
// be back at the entrance ... make a hole in the wall someplace at least 5 tiles away from the hero
// and that is the exit ... still keep the path indicator to it".
test('the last lord falls, and the wall breaks open on a way out a short walk from the hero', () => gameCase((g) => {
  enterCrypt(g);
  const w = g.world, p = g.player, lord = lastLord(g);
  p.x = lord.x - 30; p.y = lord.y;
  assert.equal(w.exit, w.entrance, 'until then the way out is the stairs he came down');
  g.hitEnemy(lord, 1e9, {});
  step(g, 5);
  const hole = w.exit, tx = Math.floor(hole.x / T), ty = Math.floor(hole.y / T);
  assert.ok(hole.hole && hole !== w.entrance, 'a new way out');
  assert.ok(w.isWall(tx, ty - 1) && w.isWall(tx, ty - 2) && w.isWall(tx - 1, ty - 1) && w.isWall(tx + 1, ty - 1), 'broken into a solid wall');
  assert.ok(w.free(hole.x, hole.y), 'open floor before it');
  const near = walk(w, p.x, p.y, hole.x, hole.y), back = walk(w, p.x, p.y, w.entrance.x, w.entrance.y);
  assert.ok(near >= HOLE_AWAY, `at least ${HOLE_AWAY} tiles' walk away: ${near}`);
  assert.ok(near < back / 2, `far shorter than the walk back to the stairs: ${near} against ${back}`);
  assert.ok(g.banners.some(b => b.title === 'The wall breaks open'), 'and he is told');
  assert.ok(w.entrance && !w.entrance.hole, 'the stairs he came down are still there too');
  // Walking up to the hole leaves the crypt, sealed for good.
  p.x = hole.x; p.y = hole.y + 8;
  for (let i = 0; i < 240 && g.inCrypt; i++) step(g, 1);
  assert.equal(g.inCrypt, null, 'up through the hole, back in the forest');
  assert.ok(g.cleared.has('2,0'));
}));

test('wherever the last lord falls in a crypt, the wall breaks at least HOLE_AWAY tiles from the hero', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) gameCase((g) => {
    enterCrypt(g);
    const w = g.world, p = g.player, lord = lastLord(g);
    // The hero somewhere in each room in turn when the lord falls.
    const room = w.rooms[seed % w.rooms.length];
    p.x = room.cx * T + T / 2; p.y = room.cy * T + T / 2;
    if (!w.free(p.x, p.y)) return;
    g.hitEnemy(lord, 1e9, {});
    step(g, 3);
    assert.ok(w.exit.hole, `seed ${seed}: a hole`);
    const d = walk(w, p.x, p.y, w.exit.x, w.exit.y);
    assert.ok(d >= HOLE_AWAY && d < 40, `seed ${seed}: ${d} tiles' walk`);
    const path = w.way.path;
    assert.ok(Math.hypot(path.at(-1).x - w.exit.x, path.at(-1).y - w.exit.y) < 12, `seed ${seed}: the light runs to it`);
  }, 's15', seed);
});

test('the lit way out follows the hero to the hole', () => gameCase((g) => {
  enterCrypt(g);
  const w = g.world, p = g.player, lord = lastLord(g);
  p.x = lord.x - 30; p.y = lord.y;
  g.hitEnemy(lord, 1e9, {});
  step(g, 5);
  assert.equal(w.stairs, null);
  const first = w.way.path;
  assert.ok(first.length > 2 && first.every((pt, k) => k === 0 || pt.d > first[k - 1].d), 'from the hero to the hole, distances rising');
  // Somewhere else in the crypt: the light starts from there now.
  const room = w.rooms.find(r => r !== w.guardRoom && r !== w.startRoom);
  p.x = room.cx * T + T / 2; p.y = room.cy * T + T / 2;
  step(g, 2);
  const path = w.way.path;
  assert.ok(Math.hypot(path[0].x - p.x, path[0].y - p.y) < 12, 'it starts where he is');
  assert.ok(Math.hypot(path.at(-1).x - w.exit.x, path.at(-1).y - w.exit.y) < 12, 'and ends before the hole');
  assert.deepEqual(w.marker().slice(0, 2), [w.exit.x, w.exit.y], 'the HUD points to it');
  for (const pt of path) assert.ok(w.free(pt.x, pt.y) && w.seen[Math.floor(pt.y / T) * w.W + Math.floor(pt.x / T)], 'on open floor, and shown through the dark');
  const k = path.map(pt => w.wayGlow(pt));
  assert.ok(Math.max(...k) > 0.9 && Math.min(...k) < 0.5, 'pulses of light run along it');
}));
