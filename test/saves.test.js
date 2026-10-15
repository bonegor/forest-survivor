import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
// The game's browser/canvas substitutes; the game, saves and profile rules stay real.
await mod('tools/headless.mjs');
const {Game} = await mod('public/js/game/game.js');
const {input} = await mod('public/js/engine/input.js');
const {mulberry32} = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// A run as the game screen starts it, from a profile and maybe a saved run.
function play(profile, checkpoint, fn, mode = 's15') {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(99);
  try {
    const hero = checkpoint?.hero || 'knight';
    const g = new Game({hero, mode: checkpoint?.mode || mode, meta: P.metaBonuses(profile), gear: profile.gear[hero], settings: {numbers: false}, checkpoint});
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const step = (g, n) => { for (let i = 0; i < n; i++) g.update(1/60); };
// The game closed mid-run, then Continue: the save goes through the server's rules both ways.
const saveAndContinue = (profile, g, fn) => play(profile, P.sanitizeCheckpoint(g.checkpoint()), fn);

test('a saved run keeps the gear its crypts dropped and the time spent in them', () => {
  const profile = P.defaultProfile();
  const ring = {slot:'ring', rarity:3, stats:{crit:4, luck:10, greed:15}, power:null, seed:9};
  const saved = play(profile, null, (g) => {
    step(g, 30);
    g.time = 240;
    g.cryptTime = 95;
    g.itemsFound = 1; // the lord of a crypt dropped the ring
    g.wearItem(ring);
    return g;
  });
  const result = saveAndContinue(profile, saved, (g) => {
    assert.equal(g.itemsFound, 1);
    assert.equal(g.cryptTime, 95);
    assert.deepEqual(g.gear, {ring});
    step(g, 30);
    g.finish(false);
    return g.result;
  });
  assert.equal(result.found, 1);
  assert.ok(result.realTime >= 240 + 95, 'the time in crypts still counts');
  const r = P.applyRun(profile, result);
  assert.ok(r.ok);
  assert.deepEqual(r.profile.gear, {knight: {ring}}, 'the ring is kept after Continue, the Knight\'s own');
});

test('a run saved before these fields existed still loads', () => {
  const profile = P.defaultProfile();
  const cp = play(profile, null, (g) => g.checkpoint());
  delete cp.found;
  delete cp.cryptTime;
  play(profile, P.sanitizeCheckpoint(cp), (g) => {
    assert.equal(g.itemsFound, 0);
    assert.equal(g.cryptTime, 0);
  });
});

test('a boss still fighting and the shrines already used come back with the run', () => {
  const profile = P.defaultProfile();
  const saved = play(profile, null, (g, p) => {
    step(g, 2);
    g.time = 271;
    step(g, 2);
    const boss = g.enemies.find(e => e.boss && !e.dead);
    assert.ok(boss, 'the first boss is out');
    boss.hp = boss.maxHp * 0.4;
    p.x = 2774; p.y = -200; // out to the first crossroads, by its shrine
    g.world.syncShrines();
    const shrine = g.shrines.find(s => s.key);
    g.useShrine(shrine);
    return {g, key: shrine.key};
  });
  saveAndContinue(profile, saved.g, (g, p) => {
    assert.equal(g.spawner.bossIdx, 1, 'the next boss is still the second');
    const boss = g.enemies.find(e => e.boss && !e.dead);
    assert.ok(boss && boss.type === 'boneking', 'the boss is back');
    assert.ok(Math.abs(boss.hp / boss.maxHp - 0.4) < 0.01, 'as hurt as it was');
    assert.ok(g.boss === boss, 'on the bar');
    p.x = 2774; p.y = -200;
    g.world.syncShrines();
    assert.ok(g.shrines.find(s => s.key === saved.key).used, 'the shrine stays spent');
    step(g, 2);
    assert.equal(g.enemies.filter(e => e.boss && !e.dead).length, 1, 'and no second copy of it');
  });
});

test('the run\'s save goes the moment the hero falls', () => play(P.defaultProfile(), null, (g, p) => {
  let lost = 0;
  g.onRunLost = () => lost++;
  step(g, 2);
  p.invuln = 0;
  p.hurt(1e9);
  step(g, 2);
  assert.equal(g.state, 'dying');
  assert.equal(lost, 1);
}));

test('the longest run\'s save still fits its cookie, keeping the latest crypts', () => {
  const keys = n => Array.from({length: n}, (_, i) => `-${400 + i},-${400 + i}`);
  const cp = P.sanitizeCheckpoint({mode:'ranked', diff:'hard', hero:'knight', time:14000, cleared:keys(80), lost:keys(80), shrines:keys(60),
    bosses:[['boneking', 0.5]], gear:{}, weapons:[], passives:[]});
  assert.ok(JSON.stringify(cp).length <= 2900);
  assert.equal(cp.cleared.at(-1), '-479,-479', 'the newest cleared crypt is kept');
  assert.equal(cp.shrines.at(-1), '-459,-459');
});

test('a forged run report is held to what its mode allows', () => {
  const p = P.defaultProfile();
  const forged = {mode:'s15', hero:'knight', victory:true, time:900, kills:1e6, level:999, floor:1, gold:1e9, realTime:14400, found:721};
  const r = P.applyRun(p, forged);
  assert.ok(r.ok);
  // Two hours at most for the night with its crypts, and a find every 45 seconds at most.
  const cap = Math.round((100 + 7200 * 12 + (7200 / 45 + 1) * 750) * 1.5) + 500;
  assert.ok(r.reward.total <= cap, `paid ${r.reward.total}, at most ${cap}`);
  assert.equal(P.sanitizeRun({...forged, mode:'dungeon'}).found, 0, 'the Dungeon has no crypts, so nothing is found in it');
});
