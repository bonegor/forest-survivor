import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
// The game's browser/canvas substitutes; the map, crypts, gear and saves stay real.
await mod('tools/headless.mjs');
const {Game} = await mod('public/js/game/game.js');
const {input} = await mod('public/js/engine/input.js');
const {mulberry32} = await mod('public/js/engine/util.js');
const {isCrypt, roadExists, cryptsNear} = await mod('public/js/game/darkwood.js');
const {Dungeon, cryptLords} = await mod('public/js/game/dungeon.js');
const P = await mod('public/js/shared/profile.js');
const I = await mod('public/js/shared/items.js');

function gameCase(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(4242);
  try {
    const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const step = (g, n) => { for (let i = 0; i < n; i++) g.update(1/60); };
// Every lord drops what row says ({item, chest}) while fn runs: the drop table made certain.
function dropsAlways(row, fn) {
  const table = I.LORD_DROPS.splice(0, I.LORD_DROPS.length, {odds:1, ...row});
  try {
    return fn();
  } finally {
    I.LORD_DROPS.splice(0, I.LORD_DROPS.length, ...table);
  }
}
// A whole frame, world and HUD, on the stub canvas: drawing must not throw either.
const ctx = document.createElement('canvas').getContext('2d');
const frame = g => { g.draw(ctx); g.hud.draw(ctx, 480, 270, g.clock); };

// Walk the hero up the steps of the first crypt east of the start, at the night's minute given.
function enterFirstCrypt(g, p, minute = 0) {
  step(g, 2);
  p.x = 2774; p.y = -200;
  g.world.syncShrines();
  const door = g.crypts.find(d => d.key === '2,0');
  for (const e of g.enemies) e.dead = true;
  frame(g);
  g.time = minute * 60;
  p.x = door.x; p.y = door.y + 10;
  input.bot = {x:0, y:-1};
  for (let i = 0; i < 120 && !g.inCrypt; i++) step(g, 1);
  input.bot = {x:0, y:0};
  step(g, 60);
  return door;
}

test('every walk from the start meets a crypt at the second crossroads', () => {
  const next = (i, j) => [[i+1,j+1,i,j,1],[i+1,j-1,i,j,-1],[i-1,j-1,i-1,j-1,1],[i-1,j+1,i-1,j+1,-1]]
    .filter(([,,a,b,s]) => roadExists(a, b, s)).map(([x,y]) => [x,y]);
  for (const [i, j] of next(0, 0)) {
    assert.equal(isCrypt(i, j), false, 'none at the first crossroads');
    for (const [a, b] of next(i, j)) assert.equal(isCrypt(a, b), !(a === 0 && b === 0), `crossroads ${a},${b}`);
  }
  assert.ok(cryptsNear(0, 0, 4400).length >= 4, 'the first ring of crypts is near the start');
});

// The user, 16 October 2026: "the crypt needs to be rethought, player can always exit, has 2-4
// bosses, each drop something. Make crypt bigger, once the last champion is killed the hole in
// wall opens".
test('a crypt stops the night; each of its lords drops something, and the last opens a way out', () => gameCase((g, p) => {
  const door = enterFirstCrypt(g, p);
  const w = g.world;
  assert.ok(g.inCrypt, 'walking up the steps goes in');
  assert.ok(g.enemies.some(e => e.dormant), 'packs sleep in the rooms');
  const lords = g.enemies.filter(e => e.lord);
  assert.equal(lords.length, 2, 'two lords at dusk');
  assert.ok(lords.every(l => l.sleeping && l.elite && l.name), 'named lords wait');
  assert.ok(g.banners.some(b => b.sub === 'Here the night stands still. Two lords sleep below'), 'and he is told how many');
  const t = g.time, c = g.clock;
  step(g, 120);
  assert.equal(g.time, t, 'the night clock stands still');
  assert.ok(g.clock > c + 1.9, 'animation keeps going');
  p.invuln = 999; // each lord's guard wakes with it
  const lord = w.guardian, first = lords.find(l => l !== lord), at = {x:first.x, y:first.y};
  g.hitEnemy(first, 1e9, {});
  step(g, 5);
  const firstDrops = g.pickups.filter(pk => (pk.kind === 'chest' || pk.kind === 'item') && Math.hypot(pk.x - at.x, pk.y - at.y) < 60);
  assert.ok(firstDrops.length, 'the first leaves a chest, gear or both');
  const firstGear = firstDrops.filter(pk => pk.kind === 'item').length;
  assert.equal(g.itemsFound, firstGear, 'every piece of gear counted');
  assert.ok(!w.way && w.exit === w.entrance && !g.cleared.has('2,0'), 'the wall holds while a lord stands');
  p.x = lord.x - 30; p.y = lord.y; // up to the last lord, in the farthest room
  const last = {x:lord.x, y:lord.y};
  // Wakes it with its intro, then fells it; this one drops gear (the drop table aside).
  dropsAlways({item:true, chest:false}, () => g.hitEnemy(lord, 1e9, {}));
  step(g, 5);
  frame(g);
  const drop = g.pickups.find(pk => pk.kind === 'item' && Math.hypot(pk.x - last.x, pk.y - last.y) < 60);
  assert.ok(drop, 'gear drops');
  assert.equal(g.world.stairs, null, 'no stairs down');
  assert.ok(g.world.way && g.world.way.path.length > 2 && g.world.exit.hole, 'the way out is lit, to a hole broken in the wall');
  p.x = drop.x; p.y = drop.y; step(g, 10);
  assert.equal(g.itemQueue.length, 1);
  const it = g.itemQueue.shift();
  assert.deepEqual(I.sanitizeItem(it), it, 'a drop is one the server accepts');
  g.wearItem(it);
  assert.equal(g.gear[it.slot], it);
  // Follow the light: it runs from where the hero stands to the hole the lord's fall broke.
  step(g, 1);
  const path = g.world.way.path, exit = g.world.exit;
  assert.ok(Math.hypot(path[0].x - p.x, path[0].y - p.y) < 12, 'from where he stands');
  assert.ok(Math.hypot(path.at(-1).x - exit.x, path.at(-1).y - exit.y) < 12, 'to the way out');
  for (const pt of path) {
    p.x = pt.x; p.y = pt.y + 4;
    step(g, 1);
    if (g.state !== 'play') break;
  }
  step(g, 120);
  assert.equal(g.inCrypt, null, 'back in the forest');
  frame(g);
  assert.ok(door.sealed && g.cleared.has('2,0'), 'the crypt is sealed for good');
  assert.ok(Math.abs(p.x - door.x) < 2 && p.y > door.y, 'out by its door');
  g.finish(false);
  assert.equal(g.result.crypts, 1);
  assert.equal(g.result.found, firstGear + 1);
  assert.deepEqual(g.result.gear, {[it.slot]: it});
}));

test('the crypt is cleared the moment its last lord falls, however the hero leaves', () => gameCase((g, p) => {
  const door = enterFirstCrypt(g, p);
  p.invuln = 999;
  for (const lord of g.enemies.filter(e => e.lord)) {
    assert.ok(!g.cleared.has('2,0'), 'not while a lord stands');
    g.hitEnemy(lord, 1e9, {});
    step(g, 5);
  }
  assert.ok(g.cleared.has('2,0'), 'cleared the moment the last lord falls');
  g.leaveCrypt();
  step(g, 120);
  assert.equal(g.inCrypt, null, 'back in the forest');
  assert.ok(door.sealed && !g.lost.has('2,0'), 'its door is shut for good');
}));

test('the stairs lead back up whenever the hero likes, its lords alive, and the crypt shuts behind him', () => gameCase((g, p) => {
  const door = enterFirstCrypt(g, p);
  const w = g.world, stairs = w.entrance;
  assert.ok(w.lordsLeft().length === 2 && w.lordsLeft().every(l => l.sleeping), 'its lords all asleep below');
  // Off them, then back onto them without walking up them, as a fight might cross them: he stays.
  p.x = stairs.x; p.y = stairs.y - 30; step(g, 2);
  p.x = stairs.x; p.y = stairs.y + 4; step(g, 30);
  assert.ok(g.inCrypt && g.state === 'play', 'standing on them, he stays below');
  frame(g);
  // Walking up them, he leaves.
  p.y = stairs.y + 12;
  input.bot = {x:0, y:-1};
  for (let i = 0; i < 240 && g.inCrypt; i++) step(g, 1);
  input.bot = {x:0, y:0};
  assert.equal(g.inCrypt, null, 'up the stairs, back in the forest');
  assert.ok(!g.banners.some(b => /barred/i.test(b.title)), 'never barred');
  assert.ok(door.sealed && g.lost.has('2,0') && !g.cleared.has('2,0'), 'the crypt shuts behind him, not cleared');
  assert.ok(g.banners.some(b => b.title === 'The crypt is sealed' && b.sub === 'Its lords sleep on below'), 'and he is told');
  p.x = door.x; p.y = door.y + 10;
  input.bot = {x:0, y:-1};
  step(g, 120);
  input.bot = {x:0, y:0};
  assert.equal(g.inCrypt, null, 'up its steps again, it will not open');
  g.finish(false);
  assert.equal(g.result.crypts, 0, 'not counted as cleared');
}));

test('two lords at dusk, three from minute 5, four from minute 10; one more three rings out', () => {
  assert.deepEqual([0, 4.9, 5, 9.9, 10, 15, 40].map(m => cryptLords(m, 1)), [2, 2, 3, 3, 4, 4, 4]);
  assert.deepEqual([0, 5, 10].map(m => cryptLords(m, 2)), [2, 3, 4], 'the second ring as the first');
  assert.deepEqual([0, 5, 10].map(m => cryptLords(m, 3)), [3, 4, 4], 'one more from the third, four at most');
  for (const [minute, n] of [[5, 3], [10, 4]]) gameCase((g, p) => {
    enterFirstCrypt(g, p, minute);
    assert.equal(Math.floor(g.inCrypt.minute), minute);
    assert.equal(g.enemies.filter(e => e.lord).length, n, `${n} lords at minute ${minute}`);
    assert.equal(g.world.lordCount, n);
  });
});

// The user, 16 October 2026: "50% both a gear item and a champion's chest, 25% item only, 25%
// chest only", for every lord in the crypt.
test('each lord drops gear, a chest or both, and the wall opens only when the last one falls', () => gameCase((g, p) => {
  enterFirstCrypt(g, p, 10);
  const w = g.world, lords = g.enemies.filter(e => e.lord);
  assert.equal(lords.length, 4);
  p.invuln = 999;
  let items = 0;
  for (const [k, lord] of lords.entries()) {
    const left = lords.length - 1 - k, at = {x:lord.x, y:lord.y};
    for (const pk of g.pickups) pk.dead = true;
    p.x = lord.x - 30; p.y = lord.y;
    g.hitEnemy(lord, 1e9, {});
    step(g, 5);
    const near = kind => g.pickups.some(pk => !pk.dead && pk.kind === kind && Math.hypot(pk.x - at.x, pk.y - at.y) < 60);
    assert.ok(near('coin') && near('goldpile'), `lord ${k + 1}: coins and gold`);
    assert.ok(near('chest') || near('item'), `lord ${k + 1}: a chest, gear or both`);
    if (near('item')) items++;
    const told = g.banners.find(b => b.title === `${lord.name} is slain!`);
    assert.ok(told && /^(A chest|\w+ \w+( and a chest)?) dropped/.test(told.sub), `he is told what dropped (${told?.sub})`);
    if (left) {
      assert.ok(!w.way && w.exit === w.entrance && !g.cleared.has('2,0'), `lord ${k + 1}: the wall holds, ${left} left`);
      assert.ok(told.sub.endsWith(left === 1 ? '. One lord remains' : `. ${['', '', 'Two', 'Three'][left]} lords remain`), 'and how many remain');
    } else {
      assert.ok(w.way && w.exit.hole, 'the last: the wall breaks open');
      assert.ok(g.cleared.has('2,0'));
      assert.ok(!/remain/.test(told.sub), 'none remain');
    }
  }
  assert.equal(g.itemsFound, items, 'every piece of gear counted, for the server');
}));

test('a lord drops gear and a chest half the time, gear alone a quarter, a chest alone a quarter', () => {
  const rows = I.LORD_DROPS;
  assert.ok(Math.abs(rows.reduce((s, d) => s + d.odds, 0) - 1) < 1e-9, 'the odds add up to 1');
  const share = (counts, n) => counts.map(c => c / n);
  // The table itself, over many seeded rolls.
  const rng = mulberry32(77), n = 20000, counts = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const d = I.lordDrop(rng());
    counts[d.item && d.chest ? 0 : d.item ? 1 : 2]++;
  }
  share(counts, n).forEach((s, i) => assert.ok(Math.abs(s - [0.5, 0.25, 0.25][i]) < 0.015, `rolls: ${share(counts, n)}`));
  // And lords felled in the game, each rolled afresh.
  gameCase((g, p) => {
    enterFirstCrypt(g, p, 10);
    const lord = g.enemies.find(e => e.lord);
    lord.dead = true; // as killEnemy leaves it; the other three stand, so the wall holds
    const kills = 800, seen = [0, 0, 0];
    for (let i = 0; i < kills; i++) {
      g.pickups.length = 0;
      g.effects.length = 0;
      g.lordDefeated(lord);
      const item = g.pickups.some(pk => pk.kind === 'item'), chest = g.pickups.some(pk => pk.kind === 'chest');
      assert.ok(item || chest, 'never nothing');
      seen[item && chest ? 0 : item ? 1 : 2]++;
    }
    share(seen, kills).forEach((s, i) => assert.ok(Math.abs(s - [0.5, 0.25, 0.25][i]) < 0.06, `kills: ${share(seen, kills)}`));
    assert.equal(g.itemsFound, seen[0] + seen[1], 'each piece counted');
    assert.ok(!g.world.way && !g.cleared.has('2,0'), 'and with lords standing, the wall held');
  });
});

test('a crypt of four lords, every one dropping gear: the run report keeps all four, and no more', () => gameCase((g, p) => {
  enterFirstCrypt(g, p, 10);
  const lords = g.enemies.filter(e => e.lord);
  assert.equal(lords.length, I.MAX_LORDS, 'as many lords as a crypt holds');
  p.invuln = 999;
  dropsAlways({item:true, chest:true}, () => {
    for (const lord of lords) {
      g.hitEnemy(lord, 1e9, {});
      step(g, 2);
    }
  });
  const found = g.pickups.filter(pk => pk.kind === 'item').map(pk => pk.opts.item);
  assert.equal(found.length, 4);
  assert.equal(g.itemsFound, 4);
  assert.ok(found.every(it => I.sanitizeItem(it)), 'every drop is one the server takes');
  g.finish(false);
  const res = g.result;
  assert.equal(res.found, 4);
  // The report as the results screen sends it, wearing four new pieces: one of each find, and
  // where two finds share a slot, another piece the rules could roll in a slot still bare.
  const gear = {};
  for (const it of found) gear[it.slot] = it;
  const roll = mulberry32(9);
  const bare = () => I.SLOTS.find(s => !gear[s]);
  while (Object.keys(gear).length < 4) gear[bare()] = I.rollItem(roll, {slot:bare()});
  const report = {mode:res.mode, diff:res.diff, hero:res.hero, victory:res.victory, time:res.time, gold:res.gold, kills:res.kills, level:res.level, floor:res.floor, gear, realTime:res.realTime, found:res.found};
  const kept = P.applyRun(P.defaultProfile(), report);
  assert.ok(kept.ok);
  assert.deepEqual(kept.profile.gear.knight, gear, 'all four new pieces kept');
  // One more new piece than the run found is one too many: the gear is refused, the run still paid.
  const extra = bare();
  const more = {...gear, [extra]: I.rollItem(roll, {slot:extra})};
  const refused = P.applyRun(P.defaultProfile(), {...report, gear:more});
  assert.ok(refused.ok);
  assert.equal(refused.profile.gear.knight, undefined, 'five new pieces from four lords are refused');
  // A run short enough for one crypt (the one by the start) finds four pieces at most, one from
  // each of its lords: all four are kept, a fifth claimed is not believed.
  const short = {...report, time:30, realTime:40};
  assert.equal(P.sanitizeRun({...short, found:5}).found, I.MAX_LORDS, 'four lords, four finds at most');
  assert.deepEqual(P.applyRun(P.defaultProfile(), short).profile.gear.knight, gear);
  assert.equal(P.applyRun(P.defaultProfile(), {...short, gear:more, found:5}).profile.gear.knight, undefined);
  // The next crypt's time, four more.
  assert.equal(P.sanitizeRun({...short, realTime:45, found:99}).found, 2 * I.MAX_LORDS);
}));

// A lord felled against a wall, or in a corner, leaves its gear and its chest apart, both on
// open floor: neither hides the other, and neither lies in the wall.
test('gear and a chest from a lord by a wall or in a corner lie apart, on open floor', () => gameCase((g, p) => {
  enterFirstCrypt(g, p, 10);
  const w = g.world, T = 16, lords = g.enemies.filter(e => e.lord);
  assert.equal(lords.length, 4);
  p.invuln = 999;
  // Where each lord is put, the nearest open tile to it with walls (1) beside it: to the east, to
  // the west, then a corner each way; and how far into the tile, toward those walls.
  const spots = [[1, 0], [-1, 0], [1, 1], [-1, -1]];
  const wall = (tx, ty) => w.tile(tx, ty) === 1;
  for (const [k, lord] of lords.entries()) {
    const [sx, sy] = spots[k], tx0 = Math.floor(lord.x / T), ty0 = Math.floor(lord.y / T);
    let at = null;
    for (let r = 0; r < 30 && !at; r++) {
      for (let dy = -r; dy <= r && !at; dy++) {
        for (let dx = -r; dx <= r && !at; dx++) {
          const tx = tx0 + dx, ty = ty0 + dy;
          if (w.tile(tx, ty) !== 0) continue;
          if ((sx && !wall(tx + sx, ty)) || (sy && !wall(tx, ty + sy))) continue;
          at = {x:tx * T + T / 2 + sx * 6, y:ty * T + T / 2 + sy * 6};
        }
      }
    }
    assert.ok(at, `lord ${k + 1}: a spot by a wall`);
    lord.x = at.x;
    lord.y = at.y;
    const before = new Set(g.pickups);
    dropsAlways({item:true, chest:true}, () => g.hitEnemy(lord, 1e9, {}));
    step(g, 3);
    const fresh = g.pickups.filter(pk => !before.has(pk));
    const gear = fresh.find(pk => pk.kind === 'item'), chest = fresh.find(pk => pk.kind === 'chest');
    assert.ok(gear && chest, `lord ${k + 1}: gear and a chest`);
    for (const pk of fresh) assert.ok(w.free(pk.x, pk.y), `lord ${k + 1}: the ${pk.kind} lies on open floor`);
    assert.ok(Math.hypot(gear.x - chest.x, gear.y - chest.y) >= 8, `lord ${k + 1}: gear and chest apart (${Math.hypot(gear.x - chest.x, gear.y - chest.y).toFixed(1)} px)`);
    for (const pk of [gear, chest]) assert.ok(Math.hypot(pk.x - at.x, pk.y - at.y) < 30, `lord ${k + 1}: the ${pk.kind} by where it fell`);
  }
}));

// The minimap's canvas, keeping the box it paints in.
function paintBox() {
  const box = {x0:Infinity, y0:Infinity, x1:-Infinity, y1:-Infinity, n:0};
  const rect = (x, y, w, h) => {
    box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y);
    box.x1 = Math.max(box.x1, x + w); box.y1 = Math.max(box.y1, y + h); box.n++;
  };
  return new Proxy({box}, {
    get: (t, k) => (k === 'fillRect' ? rect : k in t ? t[k] : () => ({width:0})),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}

test('a crypt is bigger, ten rooms or so, every room and every lord a walk from the stairs, its maps on screen', () => gameCase((g, p) => {
  step(g, 2);
  const T = 16, rooms = [];
  for (let seed = 1; seed <= 50; seed++) {
    g.enemies = [];
    const lords = 2 + (seed % 3), theme = ['crypt', 'catacombs', 'inferno'][seed % 3];
    const w = new Dungeon(g, 1, seed * 7919, {name:'Crypt of Tests', theme, lords});
    assert.deepEqual([w.W, w.H], [70, 56]);
    rooms.push(w.rooms.length);
    assert.ok(w.rooms.length >= lords + 2, `seed ${seed}: ${w.rooms.length} rooms for ${lords} lords`);
    const dist = w.bfs(w.startRoom.cx, w.startRoom.cy);
    const walk = (x, y) => dist[Math.floor(y / T) * w.W + Math.floor(x / T)];
    const inRoom = (e, r) => Math.floor(e.x / T) >= r.x && Math.floor(e.x / T) < r.x + r.w && Math.floor(e.y / T) >= r.y && Math.floor(e.y / T) < r.y + r.h;
    for (const r of w.rooms) {
      let open = false;
      for (let y = r.y; y < r.y + r.h && !open; y++) for (let x = r.x; x < r.x + r.w && !open; x++) open = dist[y * w.W + x] >= 0;
      assert.ok(open, `seed ${seed}: every room a walk from the stairs`);
    }
    assert.ok(walk(w.entrance.x, w.entrance.y) >= 0, `seed ${seed}: the stairs on open floor`);
    const L = g.enemies.filter(e => e.lord);
    assert.equal(L.length, lords, `seed ${seed}: ${lords} lords`);
    assert.equal(w.lordCount, lords);
    const homes = L.map(l => w.rooms.find(r => inRoom(l, r)));
    assert.equal(new Set(homes).size, lords, `seed ${seed}: each lord in a room of its own`);
    assert.ok(homes.every(r => r && r !== w.startRoom && w.lordRooms.includes(r)), `seed ${seed}: none by the stairs`);
    assert.ok(inRoom(w.guardian, w.guardRoom), `seed ${seed}: one in the farthest room`);
    L.forEach((l, k) => {
      assert.ok(walk(l.x, l.y) > 0, `seed ${seed}: every lord a walk from the stairs`);
      assert.ok(g.enemies.some(e => e.dormant && e.pack === l.pack && inRoom(e, homes[k])), `seed ${seed}: each with its guard asleep about it`);
    });
    // Both maps, the corner one and the whole one (Tab), fit a 480 x 270 screen with every tile seen.
    w.seen.fill(1);
    for (const big of [false, true]) {
      const c = paintBox();
      w.drawMinimap(c, 480, 270, big);
      const b = c.box;
      assert.ok(b.n > 100 && b.x0 >= 0 && b.y0 >= 0 && b.x1 <= 480 && b.y1 <= 270, `seed ${seed}: the ${big ? 'whole' : 'corner'} map on screen (${b.x0},${b.y0} to ${b.x1},${b.y1})`);
    }
  }
  const mean = rooms.reduce((a, b) => a + b) / rooms.length;
  assert.ok(mean >= 9, `about ten rooms (${mean.toFixed(1)}), not the five of old`);
}));

// Blades, flasks and glaives strike the same foe again after a moment (hitT), as do the pools a
// Meteor Storm leaves and a Necromancer's skeletons. That moment was counted on the night's clock,
// which stands still in a crypt: down there they struck each foe, its lord too, once and never
// again. Below only the hero's own weapon fights, struck by hand (Game.caveStrike), so here each
// is made his own and the strike key is held.
test('weapons that strike a foe again and again do so in a crypt as in the forest', () => {
  for (const weapon of ['blades', 'flask', 'glaive']) {
    const hits = {};
    for (const below of [false, true]) {
      const oldRandom = Math.random, oldBot = input.bot;
      Math.random = mulberry32(5);
      try {
        const g = new Game({hero:'archer', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
        const p = g.player;
        p.devGod = true;
        g.spawner.update = () => {};
        if (below) {
          enterFirstCrypt(g, p);
          assert.ok(g.inCrypt);
          for (const e of g.enemies) e.dead = true;
          step(g, 1);
        }
        p.weapons.length = 0;
        const w = g.addWeapon(weapon);
        p.hero = {...p.hero, weapon};
        if (below) input.held.add('KeyX');
        const spot = g.world.freeSpot(p.x + 30, p.y);
        const foe = g.spawnEnemy('zombie', spot.x, spot.y, {instant:true, hpMul:1e6});
        foe.spd = 0;
        let n = 0;
        const hit = g.hitEnemy.bind(g);
        g.hitEnemy = (e, d, o) => { if (e === foe && o.w === w) n++; return hit(e, d, o); };
        step(g, 360);
        hits[below ? 'crypt' : 'forest'] = n;
      } finally {
        input.bot = oldBot;
        input.held.delete('KeyX');
        Math.random = oldRandom;
      }
    }
    assert.ok(hits.forest >= 3, `${weapon}: strikes again in the forest (${hits.forest})`);
    assert.ok(hits.crypt >= hits.forest - 1, `${weapon}: as often in a crypt (${hits.crypt} against ${hits.forest})`);
  }
});

test('a Frost Rune wears off packs asleep in a crypt, not only the ones awake', () => gameCase((g, p) => {
  enterFirstCrypt(g, p);
  const sleepers = g.enemies.filter(e => e.dormant && !e.prop);
  assert.ok(sleepers.length > 5, 'packs sleep in the rooms');
  g.freezeAll(6);
  assert.ok(sleepers.every(e => e.freezeT > 0), 'the rune freezes them all');
  p.invuln = 999;
  step(g, 60 * 7);
  assert.ok(sleepers.every(e => !(e.freezeT > 0)), 'and seven seconds on, none is still frozen');
}));

test('gear adds to the hero, and selling what is worn takes it off', () => gameCase((g, p) => {
  const might = p.might, hp = p.maxHp;
  g.wearItem({slot:'gloves', rarity:1, stats:{might:7, crit:3}, power:null, seed:1});
  g.wearItem({slot:'armor', rarity:0, stats:{maxHp:10}, power:null, seed:2});
  assert.ok(Math.abs(p.might / might - 1.07) < 1e-9);
  assert.equal(p.maxHp, Math.round(hp * 1.1));
  const gold = g.gold;
  g.sellWorn('gloves');
  assert.equal(g.gold, gold + I.itemPrice({rarity:1}));
  assert.equal(p.might, might);
  const revives = p.revivals;
  g.wearItem({slot:'ring', rarity:4, stats:{crit:5, luck:12, greed:20, might:9}, power:'undying', seed:3});
  assert.equal(p.revivals, revives + 1, 'a legendary power counts at once');
}));

test('selling gear with health on it never leaves the hero above his most', () => gameCase((g, p) => {
  g.wearItem({slot:'armor', rarity:0, stats:{maxHp:10}, power:null, seed:2});
  p.hp = p.maxHp;
  g.sellWorn('armor');
  assert.equal(p.hp, p.maxHp, 'full, but no more than full');
}));

test('gear rolls only within its rarity, and nothing else passes the server', () => {
  const rng = mulberry32(7);
  for (let k = 0; k < 3000; k++) {
    const it = I.rollItem(rng, {minute: k % 16, depth: 1 + (k % 3)});
    assert.deepEqual(I.sanitizeItem(it), it);
    assert.ok(I.itemName(it).length > 3 && I.itemLines(it).length >= 1);
  }
  const good = {slot:'helm', rarity:2, stats:{maxHp:10, armor:1, regen:2}, power:null, seed:5};
  assert.ok(I.sanitizeItem(good));
  assert.equal(I.sanitizeItem({...good, stats:{maxHp:99, armor:1, regen:2}}), null, 'too strong a roll');
  assert.equal(I.sanitizeItem({...good, stats:{might:5, armor:1, regen:2}}), null, 'a stat the slot cannot roll');
  assert.equal(I.sanitizeItem({...good, stats:{maxHp:10}}), null, 'too few stats for its rarity');
  assert.equal(I.sanitizeItem({...good, power:'echo'}), null, 'only legendaries have powers');
  const early = I.rarityOdds(0), late = I.rarityOdds(14, 2);
  assert.ok(Math.abs(early.reduce((a, b) => a + b) - 1) < 1e-9);
  assert.ok(late[4] > early[4] * 5 && late[0] < early[0] / 2, 'the night and the far crypts give better gear');
});

test('the save keeps the gear worn at the end, never more new pieces than the run found', () => {
  const ring = {slot:'ring', rarity:3, stats:{crit:4, luck:10, greed:15}, power:null, seed:9};
  const helm = {slot:'helm', rarity:0, stats:{armor:1}, power:null, seed:4};
  const run = {mode:'s15', diff:'hard', hero:'knight', victory:false, time:300, kills:100, level:10, floor:1};
  let r = P.applyRun(P.defaultProfile(), {...run, gold:50, gear:{ring}, found:1, realTime:420});
  assert.deepEqual(r.profile.gear, {knight:{ring}});
  r = P.applyRun(r.profile, {...run, gold:50, found:0});
  assert.deepEqual(r.profile.gear, {knight:{ring}}, 'a client that sends no gear keeps it');
  r = P.applyRun(r.profile, {...run, gold:50, gear:{ring, helm}, found:0});
  assert.deepEqual(r.profile.gear, {knight:{ring}}, 'gear the run never found is refused');
  // Heroes don't share gear: the Ranger (unlocked by the Knight's five minutes) starts bare,
  // finds her own helm, and can't wear the Knight's ring without finding it.
  assert.ok(r.profile.heroes.includes('archer'));
  r = P.applyRun(r.profile, {...run, hero:'archer', gold:50, gear:{ring}, found:0});
  assert.deepEqual(r.profile.gear, {knight:{ring}}, 'the Knight\'s ring is not hers');
  r = P.applyRun(r.profile, {...run, hero:'archer', gold:50, gear:{helm}, found:1, realTime:420});
  assert.deepEqual(r.profile.gear, {knight:{ring}, archer:{helm}});
  // Sold on the way: the ring's price may be in the gold, beyond what the time allows.
  const cap = 100 + 300 * 12;
  r = P.applyRun(r.profile, {...run, gold:cap + I.itemPrice(ring), gear:{}, found:0});
  assert.deepEqual(r.profile.gear, {archer:{helm}});
  assert.equal(r.reward.collected, Math.round((cap + I.itemPrice(ring)) * 1.5));
  assert.deepEqual(I.sanitizeGear(I.packGear({ring, helm})), {ring, helm}, 'packed for the cookie, then read back');
  assert.deepEqual(I.sanitizeGear({ring:[3, 9, -1, 0, 4, 1, 99, 2, 15]}), {}, 'a packed item is checked like any other');
});
