// The Daily Night (G5 of the 21 November 2026 gameplay review; data/daily.js): one Survival night a
// day, the same for everyone (its map, Veteran, two oaths and its seed), the first try counted and
// kept with the days played in a row, and its result a line to paste.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { PROGRESS } from '../public/js/shared/progress.js';
import { OATH_IDS } from '../public/js/data/oaths.js';
import { dailyKey, dailyNight, dailyDate, dailyLine, recordDaily } from '../public/js/data/daily.js';

test("a day's night is the same for everyone that day, and the days differ", () => {
  assert.equal(dailyKey(Date.UTC(2026, 10, 21, 23, 59)), '2026-11-21', 'by the date in UTC');
  const a = dailyNight('2026-11-21'), b = dailyNight('2026-11-21');
  assert.deepEqual(a, b);
  assert.ok(PROGRESS.mapLadder.includes(a.map));
  assert.equal(a.diff, 'medium');
  assert.equal(a.oaths.length, 2);
  assert.ok(a.oaths.every((id) => OATH_IDS.includes(id)) && a.oaths[0] !== a.oaths[1]);
  assert.ok(Number.isInteger(a.seed) && a.seed >= 0);
  const maps = new Set(), seeds = new Set();
  for (let d = 1; d <= 30; d++) {
    const n = dailyNight(`2026-12-${String(d).padStart(2, '0')}`);
    maps.add(n.map);
    seeds.add(n.seed);
  }
  assert.ok(maps.size >= 3, 'the maps change from day to day');
  assert.equal(seeds.size, 30);
  assert.equal(dailyDate('2026-11-21'), '21 Nov 2026');
});

test('the first try a day counts, with the days played in a row; the rest are practice', () => {
  const settings = {};
  const run = (key, o = {}) => recordDaily(settings, { daily: key, hero: 'knight', map: 'frozen', oaths: ['iron', 'dark'], time: 400, bosses: 1, kills: 900, ...o });
  assert.equal(recordDaily(settings, { daily: null }), null, 'not a daily night');
  assert.deepEqual(run('2026-11-21'), { counted: true, streak: 1 });
  assert.deepEqual(run('2026-11-21', { victory: true, time: 900 }), { counted: false });
  assert.equal(settings.daily.time, 400, 'the first stands');
  assert.deepEqual(run('2026-11-22'), { counted: true, streak: 2 });
  assert.deepEqual(run('2026-11-24'), { counted: true, streak: 1 }, 'a day missed starts again');
  const line = dailyLine(settings.daily, 'The Frostfell', 'Sir Aldric');
  assert.equal(line, 'Forest Survivor · Daily 24 Nov 2026 · The Frostfell · Oaths 3 · Sir Aldric · fell at 6:40 · 1 boss · 900 kills');
});

test("a daily night plays on its own seed and says which day it is; any other on a seed rolled", () => {
  const make = (o) => {
    const old = Math.random, bot = input.bot;
    Math.random = mulberry32(5);
    try {
      input.bot = { x: 0, y: 0 };
      return new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    } finally {
      input.bot = bot;
      Math.random = old;
    }
  };
  const night = dailyNight('2026-11-21');
  const plain = make({ map: night.map }), daily = make({ seed: night.seed, daily: night.key, map: night.map, oaths: night.oaths, diff: night.diff });
  assert.equal(daily.seed, night.seed);
  assert.notEqual(plain.seed, night.seed);
  assert.equal(daily.daily, '2026-11-21');
  assert.equal(plain.daily, null);
  assert.deepEqual(daily.oath.ids, night.oaths);
});
