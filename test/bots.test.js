import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { playGame } from '../tools/headless.mjs';
import { BOTS, botFrom, parseSpec } from '../public/js/bots/strategies.js';
import { PICKS } from '../public/js/bots/picks.js';

const strip = ({ ms, ...r }) => r; // wall time is all that may differ between replays

test('a seeded bot game replays exactly and reports its stats', () => {
  const play = (seed) => strip(playGame({ bot: 'kite', hero: 'knight', mode: 's15', seed, max: 45 }));
  const a = play(7);
  assert.deepEqual(play(7), a);
  assert.equal(a.outcome, 'alive');
  assert.equal(a.time, 45);
  assert.ok(Math.abs(a.ticks - 45 * 60) <= 1, 'fixed 60 Hz steps');
  assert.ok(a.kills > 0 && a.level > 1, 'it fought and levelled');
  assert.ok(a.damageTaken >= 0 && a.hits >= 0 && a.weapons[0].startsWith('sword:'));
  assert.notDeepEqual(play(8), a, 'another seed plays another game');
});

test('every strategy and level-up policy plays', () => {
  for (const bot of Object.keys(BOTS)) assert.equal(playGame({ bot, seed: 1, max: 8 }).time, 8, bot);
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
  const east = playGame({ bot: (v) => ({ x: 1, y: 0 }), label: 'east', seed: 1, max: 5 });
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
  const out = execFileSync(process.execPath, [cli, '--bot=idle,kite', '--runs=2', '--max=10', '--jobs=2'], { encoding: 'utf8' });
  assert.match(out, /^bot\s+won\s+died\s+alive\s+median/m);
  assert.match(out, /^idle\s+0\s+0\s+2\s+00:10/m);
  assert.match(out, /^kite\s+/m);
});
