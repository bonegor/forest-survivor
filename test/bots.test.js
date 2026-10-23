import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { playGame } from '../tools/headless.mjs';
import { BOTS, botFrom, parseSpec } from '../public/js/bots/strategies.js';
import { PICKS } from '../public/js/bots/picks.js';

const strip = ({ ms, ...r }) => r; // wall time is all that may differ between replays

test('a seeded bot game replays exactly and reports its stats', () => {
  // Thirty times his health (a test buff), so a bare Knight outlives the 45 s (data/heroes.js: he loses
  // early now, his sword cuts only 45°, and since 23 October 2026 a blow can land every 0.22 s).
  const play = (seed) => strip(playGame({ bot: 'kite', hero: 'knight', mode: 's15', seed, max: 45, buff: { life: 2900 } }));
  // Seed 3 (3, then 8, then 2, until the weapons, the quicker sword, the crowd's push and the
  // emptier boxes of 22 October 2026 changed what the level-ups draw and when he cuts): with two thirds of the old horde on Elite (data/difficulty.js ELITE_CROWD), some seeds
  // keep the kiting Knight clear of the monsters all 45 s; this one fights.
  const a = play(3);
  assert.deepEqual(play(3), a);
  assert.equal(a.outcome, 'alive');
  assert.equal(a.time, 45);
  // Fixed 60 Hz steps; an ultimate's launch stops the world 0.2 s (ULT_LAUNCH.stop), 12 more steps each.
  const stops = (a.ticks - 45 * 60) / 12;
  assert.ok(a.ticks >= 45 * 60 - 1 && Math.abs(stops - Math.round(stops)) <= 0.1 && stops <= 4, `fixed 60 Hz steps (${a.ticks})`);
  assert.ok(a.kills > 0 && a.level > 1, 'it fought and levelled');
  assert.ok(a.damageTaken >= 0 && a.hits >= 0 && a.weapons[0].startsWith('sword:'));
  assert.notDeepEqual(play(5), a, 'another seed plays another game');
});

test('every strategy and level-up policy plays', () => {
  // Five times his health (a test buff): the monsters walk at the game's speed (moveFor), and a
  // bare Knight standing idle may fall inside the 8 s without it.
  for (const bot of Object.keys(BOTS)) assert.equal(playGame({ bot, seed: 1, max: 8, buff: { life: 400 } }).time, 8, bot);
  for (const pick of Object.keys(PICKS)) assert.ok(playGame({ bot: 'idle', pick, seed: 2, max: 20 }).level > 1, pick);
  assert.equal(playGame({ bot: 'autopilot', mode: 'dungeon', seed: 1, max: 8 }).floor, 1);
});

test('a death ends the run and names the killer', () => {
  const r = playGame({ bot: 'idle:ult=0', hero: 'rogue', seed: 1, max: 120 });
  assert.equal(r.outcome, 'dead');
  assert.ok(r.time < 120 && r.hp === 0);
  assert.equal(typeof r.cause, 'string');
});

test('strategies of your own, and their parameters', () => {
  // Five times his health (a test buff): walking into the first swarm, a bare Knight falls in under
  // 5 s since a blow can land every 0.22 s (23 October 2026).
  const east = playGame({ bot: (v) => ({ x: 1, y: 0 }), label: 'east', seed: 1, max: 5, buff: { life: 400 } });
  assert.equal(east.bot, 'east');
  assert.equal(east.time, 5);
  const picky = { params: { slot: 0 }, make: (o) => ({ tick: () => ({ x: 0, y: 0 }), pick: () => o.slot }) };
  assert.ok(playGame({ bot: picky, params: { slot: 1 }, seed: 3, max: 20 }).level > 1);
  assert.deepEqual(parseSpec('circle:r=60:dir=-1'), { name: 'circle', params: { r: 60, dir: -1 } });
  assert.deepEqual(parseSpec('C:\\bots\\mine.mjs:panic=40'), { name: 'C:\\bots\\mine.mjs', params: { panic: 40 } });
  assert.throws(() => botFrom('circle:radius=60'), /no parameter "radius"/);
  assert.throws(() => botFrom('nope'), /Unknown bot/);
});

test('the command line prints a comparison table', () => {
  const cli = fileURLToPath(new URL('../tools/bots.mjs', import.meta.url));
  // A test buff of five times the health keeps a bare Knight standing the 10 s.
  const out = execFileSync(process.execPath, [cli, '--bot=idle,kite', '--runs=2', '--max=10', '--jobs=2', '--buff=life:400'], { encoding: 'utf8' });
  assert.match(out, /buff life \+400%/);
  assert.match(out, /^bot\s+won\s+died\s+alive\s+median/m);
  assert.match(out, /^idle\s+0\s+0\s+2\s+00:10/m);
  assert.match(out, /^kite\s+/m);
});
