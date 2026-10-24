import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../public/js/shared/profile.js';
import { PROGRESS } from '../public/js/shared/progress.js';
import { shortNeed, codexSummary } from '../public/js/ui/menu-copy.js';

test('each exclusion rank doubles the lifetime kill milestone, with exact boundaries', () => {
  for (let rank = 1; rank <= 12; rank++) {
    const threshold = 10 * 2 ** (rank - 1);
    assert.equal(P.exclusionState({ kills: threshold - 1 }).level, rank - 1);
    assert.equal(P.exclusionState({ kills: threshold }).level, rank);
    assert.equal(P.exclusionState({ kills: threshold }).next, threshold * 2);
  }
  assert.equal(P.exclusionState({ kills: 1e12 }).level, P.exclusionState({ kills: 1e12 }).max);
});

test('exclusion slots are enforced and including a weapon frees a slot', () => {
  let p = P.defaultProfile();
  assert.equal(P.setHome(p, 'axe', true).ok, false);
  p.kills = 10;
  p = P.setHome(p, 'axe', true).profile;
  assert.equal(P.setHome(p, 'blades', true).ok, false);
  assert.equal(P.setHome(p, 'axe', true).ok, true);
  p = P.setHome(p, 'axe', false).profile;
  assert.equal(P.setHome(p, 'blades', true).ok, true);
  p.kills = 20;
  p = P.setHome(p, 'axe', true).profile;
  p = P.setHome(p, 'blades', true).profile;
  assert.equal(p.home.length, 2);
  assert.equal(P.setHome(p, 'glaive', true).ok, false);
  assert.equal(P.setHome(p, 'sword', true).ok, false);
  const overBudget = { ...p, home: ['axe', 'blades', 'glaive', 'caltrops'] };
  assert.equal(P.sanitizeProfile(overBudget).home.length, 2);
  assert.equal(P.openFor(overBudget, 'knight').weapons.length, 2);
});

test('kills accumulate across runs; rank thresholds are totals, not extra kills', () => {
  const run = { mode: 's15', diff: 'easy', hero: 'knight', victory: false, time: 10, realTime: 10, gold: 0, kills: 5, level: 1, floor: 1 };
  let p = P.defaultProfile();
  for (let i = 1; i <= 8; i++) {
    const result = P.applyRun(p, run);
    assert.ok(result.ok);
    p = result.profile;
    assert.equal(p.kills, i * 5);
    assert.equal(P.exclusionState(p).level, i < 2 ? 0 : i < 4 ? 1 : i < 8 ? 2 : 3);
  }
  const entry = P.exclusionEntry(p);
  assert.equal(entry.next, 80);
  assert.equal(entry.level, 3);
  assert.equal(entry.need, 'Slay 80 monsters in total');
});

test('Codex conditions are instructions and never use slash shorthand', () => {
  const needs = P.progressList(P.defaultProfile()).map(e => codexSummary(e));
  for (const text of needs) assert.ok(!text.includes('/'), text);
  assert.equal(shortNeed(P.needText({ need: 'bosses', at: 1 })), 'Slay 1 boss');
  assert.equal(P.needText({ need: 'bosses', at: 3 }), 'Slay 3 bosses in one run');
  assert.equal(P.needText({ need: 'level', at: 30 }), 'Reach level 30');
  assert.equal(shortNeed(P.needText({ need: 'gold', at: 500 })), 'Collect 500 gold in a run');
  assert.ok(PROGRESS.exclusionFirst === 10);
});

test('the server rejects exclusions before the milestone and enforces the saved slot limit', async () => {
  const { createServer } = await import('../server.js');
  const server = createServer({ secret: 'exclusion-test-'.padEnd(40, 'x'), devKey: '' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let cookie = '';
  const post = async (path, body) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
      method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    for (const value of res.headers.getSetCookie()) cookie = value.split(';')[0];
    return { status: res.status, data: await res.json() };
  };
  try {
    assert.equal((await post('home', { id: 'axe', on: true })).status, 400);
    await post('run', { mode: 's15', diff: 'easy', hero: 'knight', time: 10, kills: 10, level: 1, gold: 0 });
    const result = await post('home', { id: 'axe', on: true });
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.profile.home, ['axe']);
    assert.equal((await post('home', { id: 'blades', on: true })).status, 400);
    assert.equal((await post('home', { id: 'axe', on: false })).status, 200);
    assert.equal((await post('home', { id: 'blades', on: true })).status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
