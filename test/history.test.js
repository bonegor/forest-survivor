// Learning from a run (G12 of the 21 November 2026 gameplay review; shared/history.js): a fall's last
// moments by who struck them, and the last runs kept for the Records' HISTORY.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { RECENT, HISTORY_MOST, lastMoments, momentsLine, recordRun, historyRow, loadHistory, saveHistory } from '../public/js/shared/history.js';

test('the last moments: the blows of the last seconds by who struck them, the hardest first', () => {
  const recent = [
    { t: 1, who: 'Wolf', dmg: 99 },
    { t: 8, who: 'Death Knight', dmg: 70 },
    { t: 9, who: "Cultist's bolt", dmg: 40 },
    { t: 9.5, who: 'Death Knight', dmg: 70 },
  ];
  const m = lastMoments(recent, 10);
  assert.deepEqual(m, [{ who: 'Death Knight', n: 2, dmg: 140 }, { who: "Cultist's bolt", n: 1, dmg: 40 }], 'the wolf too long ago');
  assert.equal(momentsLine(m), `Last ${RECENT} s: 2× Death Knight 140 · 1× Cultist's bolt 40`);
});

test('a blow taken is kept a few seconds, and the run tells its last moments', () => {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(3);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    const p = g.player;
    p.invuln = 0;
    p.hurt(5, null, 'a spike trap');
    assert.equal(p.recent.length, 1);
    assert.equal(p.recent[0].who, 'a spike trap');
    g.time += RECENT + 1;
    p.invuln = 0;
    p.hurt(5, null, 'a spike trap');
    assert.equal(p.recent.length, 1, 'the older one let go');
    g.finish(false);
    assert.deepEqual(g.result.lastBlows.map((b) => b.who), ['a spike trap']);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
});

test('the history keeps the last runs, the latest first, and tells each in a row', () => {
  let list = [];
  for (let i = 0; i < HISTORY_MOST + 3; i++) list = recordRun(list, { hero: 'knight', mode: 's15', map: 'frozen', time: 741, kills: i, level: 30, died: true, stats: { killedBy: 'a Death Knight' } }, Date.UTC(2026, 10, 21));
  assert.equal(list.length, HISTORY_MOST);
  assert.equal(list[0].k, HISTORY_MOST + 2, 'the latest first');
  assert.deepEqual(historyRow(list[0], 'Sir Aldric', 'The Frostfell'), ['21 Nov · Sir Aldric · The Frostfell · 12:21', `slain by a Death Knight · Lv 30 · ${HISTORY_MOST + 2} kills`]);
  list = recordRun(list, { hero: 'knight', mode: 'ranked', time: 60, victory: false, kills: 1, level: 2 });
  assert.equal(list[0].m, 'ranked');
  assert.equal(historyRow(list[0], 'x', 'Ranked')[1].startsWith('left'), true, 'a run left, not lost');
  // Kept in this browser alone, never in a cookie: read back as written, and nothing where storage fails.
  saveHistory(list);
  assert.deepEqual(loadHistory(), typeof globalThis.localStorage?.setItem === 'function' ? list : []);
});
