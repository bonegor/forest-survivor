import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../public/js/shared/profile.js';
import { PROGRESS } from '../public/js/shared/progress.js';
import { shortNeed, codexSummary } from '../public/js/ui/menu-copy.js';

test("each exclusion slot opens at its own milestone of kills counted as Veteran's, five at most", () => {
  const at = PROGRESS.exclusionAt;
  assert.equal(at.length, 5);
  at.forEach((t, i) => {
    assert.equal(P.exclusionState({ effort: t - 1 }).level, i);
    assert.equal(P.exclusionState({ effort: t }).level, i + 1);
    assert.equal(P.exclusionState({ effort: t }).next, at[i + 1] ?? null);
  });
  assert.equal(P.exclusionState({ effort: 1e12 }).level, 5);
  assert.equal(P.exclusionState({ effort: 1e12 }).max, 5);
});

test('exclusion slots are enforced and including a weapon frees a slot', () => {
  let p = P.defaultProfile();
  assert.equal(P.setHome(p, 'axe', true).ok, false);
  p.effort = 10;
  p = P.setHome(p, 'axe', true).profile;
  assert.equal(P.setHome(p, 'blades', true).ok, false);
  assert.equal(P.setHome(p, 'axe', true).ok, true);
  p = P.setHome(p, 'axe', false).profile;
  assert.equal(P.setHome(p, 'blades', true).ok, true);
  p.effort = 500;
  p = P.setHome(p, 'axe', true).profile;
  p = P.setHome(p, 'blades', true).profile;
  assert.equal(p.home.length, 2);
  assert.equal(P.setHome(p, 'glaive', true).ok, false);
  assert.equal(P.setHome(p, 'sword', true).ok, false);
  const overBudget = { ...p, home: ['axe', 'blades', 'glaive', 'caltrops'] };
  assert.equal(P.sanitizeProfile(overBudget).home.length, 2);
  assert.equal(P.openFor(overBudget, 'knight').weapons.length, 2);
  // A run always keeps one shared weapon: the last is never left at home.
  assert.equal(P.lastInPlay({ effort: 1e6, ul: 0, home: ['axe', 'blades', 'glaive'] }, 'caltrops'), true);
  assert.deepEqual(P.openFor({ effort: 1e6, ul: 0, home: ['axe', 'blades', 'glaive', 'caltrops'] }, 'knight').weapons, ['axe', 'blades', 'glaive', 'caltrops'], 'never none');
  assert.equal(P.lastInPlay(P.defaultProfile(), 'axe'), false);
  // Five slots (30,000 counted), and the Storm Call and the Thorns open with them (1,000 and 5,000).
  let q = { ...P.defaultProfile(), effort: 30000, home: ['axe', 'blades', 'glaive', 'lightning', 'thorns'] };
  assert.deepEqual(P.openFor(q, 'knight').weapons, ['caltrops']);
  assert.equal(P.setHome(q, 'caltrops', true).ok, false, 'the last stays in');
  q = P.setHome(q, 'thorns', false).profile;
  assert.equal(P.setHome(q, 'caltrops', true).ok, true, 'one more besides it, and it may go');
});

test('kills accumulate across runs; slot thresholds are totals, not extra kills', () => {
  const run = { mode: 's15', diff: 'medium', hero: 'knight', victory: false, time: 10, realTime: 10, gold: 0, kills: 100, level: 1, floor: 1 };
  let p = P.defaultProfile();
  for (let i = 1; i <= 8; i++) {
    const result = P.applyRun(p, run);
    assert.ok(result.ok);
    p = result.profile;
    assert.equal(p.kills, i * 100);
    assert.equal(p.effort, i * 100, "Veteran's kills count as they are");
    assert.equal(P.exclusionState(p).level, i < 5 ? 1 : 2);
  }
  const entry = P.exclusionEntry(p);
  assert.equal(entry.next, 3000);
  assert.equal(entry.level, 2);
  assert.equal(entry.need, 'Slay 3,000 monsters, counted as on Veteran');
});

// Normal now follows the live rate curve, including the tripled steady horde and soft cap.
// A legacy report without per-kill credit is valued at its end-of-run rate.
test("Normal kill milestones follow the current curve; Elite and Nightmare keep their credit", () => {
  const base = { mode: 's15', hero: 'knight', victory: false, time: 300, realTime: 300, gold: 0, level: 1, floor: 1 };
  let p = P.defaultProfile();
  for (const o of [{ diff: 'medium', kills: 600 }, { diff: 'easy', kills: 100 }, { diff: 'hard', kills: 600 }, { diff: 'hard', nightmare: true, kills: 600 }]) {
    const r = P.applyRun(p, { ...base, ...o });
    assert.ok(r.ok);
    p = r.profile;
  }
  assert.deepEqual([p.kills, p.effort], [1900, 1220]); // 600 + 220 for Normal's 100 at 5:00 + 300 + 100
  assert.equal(P.sanitizeProfile({ v: 4, kills: 4321 }).effort, 4321, 'a save from before starts from its kills');
});

test('Codex conditions are instructions and never use slash shorthand', () => {
  const needs = P.progressList(P.defaultProfile()).map(e => codexSummary(e));
  for (const text of needs) assert.ok(!text.includes('/'), text);
  assert.equal(shortNeed(P.needText({ need: 'bosses', at: 1 })), 'Slay 1 boss');
  assert.equal(P.needText({ need: 'bosses', at: 3 }), 'Slay 3 bosses in one run');
  assert.equal(P.needText({ need: 'level', at: 30 }), 'Reach level 30');
  assert.equal(shortNeed(P.needText({ need: 'gold', at: 500 })), 'Collect 500 gold in a run');
  assert.ok(PROGRESS.exclusionAt[0] === 10);
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
