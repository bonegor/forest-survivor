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
// A whole frame, world and HUD, on the stub canvas: drawing must not throw either.
const ctx = document.createElement('canvas').getContext('2d');
const frame = g => { g.draw(ctx); g.hud.draw(ctx, 480, 270, g.clock); };

// Walk the hero up the steps of the first crypt east of the start.
function enterFirstCrypt(g, p) {
  step(g, 2);
  p.x = 2774; p.y = -200;
  g.world.syncShrines();
  const door = g.crypts.find(d => d.key === '2,0');
  for (const e of g.enemies) e.dead = true;
  frame(g);
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

test('a crypt stops the night, and its lord drops gear and lights the way out', () => gameCase((g, p) => {
  const door = enterFirstCrypt(g, p);
  assert.ok(g.inCrypt, 'walking up the steps goes in');
  assert.ok(g.enemies.some(e => e.dormant), 'packs sleep in the rooms');
  const lord = g.enemies.find(e => e.lord);
  assert.ok(lord && lord.sleeping && lord.elite && lord.name, 'a named lord waits');
  const t = g.time, c = g.clock;
  step(g, 120);
  assert.equal(g.time, t, 'the night clock stands still');
  assert.ok(g.clock > c + 1.9, 'animation keeps going');
  p.x = lord.x - 30; p.y = lord.y; // up to the lord, in the last room
  g.hitEnemy(lord, 1e9, {}); // wakes it with its intro, then fells it
  step(g, 5);
  frame(g);
  const drop = g.pickups.find(pk => pk.kind === 'item');
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
  assert.equal(g.result.found, 1);
  assert.deepEqual(g.result.gear, {[it.slot]: it});
}));

test('a felled lord stays felled, even when the hero leaves by the stairs he came down', () => gameCase((g, p) => {
  const door = enterFirstCrypt(g, p);
  const lord = g.enemies.find(e => e.lord);
  g.hitEnemy(lord, 1e9, {});
  step(g, 5);
  assert.ok(g.cleared.has('2,0'), 'cleared the moment the lord falls');
  assert.ok(P.sanitizeCheckpoint(g.checkpoint()).cleared.includes('2,0'), 'and so in a save made down there');
  g.leaveCrypt(false);
  step(g, 120);
  assert.equal(g.inCrypt, null, 'back in the forest');
  assert.ok(door.sealed, 'its door is shut for good');
}));

test('once in, the stairs up are barred until the lord falls', () => gameCase((g, p) => {
  enterFirstCrypt(g, p);
  const w = g.world, exit = w.exit, lord = g.enemies.find(e => e.lord);
  const offAndOn = () => {
    p.x = exit.x; p.y = exit.y - 30; step(g, 2);
    p.x = exit.x; p.y = exit.y + 4;
  };
  assert.equal(w.exitOpen, false, 'barred from the moment he comes down');
  offAndOn();
  step(g, 60);
  assert.ok(g.inCrypt && g.state === 'play', 'back onto the stairs, he stays below');
  assert.ok(g.banners.some(b => b.title === 'The way up is barred' && b.sub.includes(lord.name)), 'and is told why');
  frame(g);
  g.hitEnemy(lord, 1e9, {});
  step(g, 5);
  assert.equal(w.exitOpen, true, 'the lord fallen, the bars are gone');
  offAndOn();
  for (let i = 0; i < 240 && g.inCrypt; i++) step(g, 1);
  assert.equal(g.inCrypt, null, 'and the same steps lead out');
}));

// Blades, flasks and glaives strike the same foe again after a moment (hitT). That moment was
// counted on the night's clock, which stands still in a crypt: down there they struck each foe,
// its lord too, once and never again.
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
  const run = {mode:'s15', hero:'knight', victory:false, time:300, kills:100, level:10, floor:1};
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
  const cp = P.sanitizeCheckpoint({mode:'s15', diff:'hard', hero:'knight', gear:{ring}, cleared:['2,0', '-4,2', 'x']});
  assert.deepEqual(cp.gear, {ring});
  assert.deepEqual(cp.cleared, ['2,0', '-4,2']);
});
