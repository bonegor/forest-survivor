// The NEW marks (the review's C5, 28 October 2026): what this browser has been shown is kept in
// localStorage alone (engine/storage.js seenBox), first filled with all a save has open then, so a
// Codex entry is marked NEW only once it has opened (or, of the second circle, been revealed) since;
// a level-up card says FIRST FIND the first time a milestone's weapon or relic is offered. Without
// localStorage there are no marks at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { seenBox } from '../public/js/engine/storage.js';
import { seenKey, seenKeys, isNewEntry, codexEntries } from '../public/js/ui/ladder.js';
import { firstFind, offerKey } from '../public/js/ui/gamescreen.js';
import { defaultProfile } from '../public/js/shared/profile.js';

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}
// localStorage as given for fn, then as it was.
function withStorage(ls, fn) {
  const was = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true });
  try {
    fn();
  } finally {
    if (was) Object.defineProperty(globalThis, 'localStorage', was);
    else delete globalThis.localStorage;
  }
}

test('the seen list is filled once, added to, cleared, and kept nowhere without localStorage', () => {
  withStorage(fakeStorage(), () => {
    assert.equal(seenBox.read(), null, 'nothing yet');
    seenBox.start({ codex: ['w:frost'], offered: ['w:frost'] });
    assert.ok(seenBox.read().codex.has('w:frost'));
    seenBox.start({ codex: ['r:luck'], offered: [] });
    assert.ok(!seenBox.read().codex.has('r:luck'), 'filled once a browser');
    seenBox.add('offered', ['r:luck']);
    assert.ok(seenBox.read().offered.has('r:luck'));
    seenBox.clear();
    assert.equal(seenBox.read(), null, 'a fresh start starts it afresh');
    globalThis.localStorage.setItem('fs_seen', 'not json');
    assert.equal(seenBox.read(), null, 'what is not ours is no list');
  });
  withStorage(undefined, () => {
    seenBox.start({ codex: ['w:frost'], offered: [] });
    assert.equal(seenBox.read(), null, 'no marks at all');
  });
});

test('a Codex entry is new once it opens or is revealed, until looked at; never one open from the start', () => {
  const p = defaultProfile();
  const seen = { codex: new Set(seenKeys(p).codex), offered: new Set() };
  const frost = (q) => codexEntries(q).find((e) => e.type === 'weapon' && e.id === 'frost');
  assert.ok(!isNewEntry(frost(p), seen), 'still shut');
  p.best.time = 60; // Frost Nova's minute
  assert.ok(frost(p).open && isNewEntry(frost(p), seen), 'opened since');
  assert.ok(!isNewEntry(frost(p), null), 'no list, no mark');
  seen.codex.add(seenKey(frost(p)));
  assert.ok(!isNewEntry(frost(p), seen), 'looked at');
  assert.ok(codexEntries(p).filter((e) => e.start).every((e) => !isNewEntry(e, seen)));
  // The first night won reveals the second circle: a weapon of it still shut is new, and new again
  // once it opens.
  p.wins.s15[0] = 1;
  const lantern = codexEntries(p).find((e) => e.id === 'lantern');
  assert.ok(!lantern.open && !lantern.hidden && isNewEntry(lantern, seen), 'revealed');
  seen.codex.add(seenKey(lantern));
  p.best.time = 12 * 60;
  assert.ok(isNewEntry(codexEntries(p).find((e) => e.id === 'lantern'), seen), 'and opened');
});

test("a level-up card says FIRST FIND the first time a milestone's weapon or relic is offered", () => {
  const seen = { codex: new Set(), offered: new Set() };
  const frost = { type: 'weapon', id: 'frost', isNew: true };
  assert.equal(firstFind(frost, seen), true);
  assert.equal(firstFind({ type: 'passive', id: 'luck', isNew: true }, seen), true, 'a relic too');
  assert.equal(firstFind({ type: 'weapon', id: 'axe', isNew: true }, seen), false, 'open from the start');
  assert.equal(firstFind({ type: 'weapon', id: 'frost', level: 2 }, seen), false, 'a level of one held');
  assert.equal(firstFind(frost, null), false, 'no list');
  seen.offered.add(offerKey(frost));
  assert.equal(firstFind(frost, seen), false, 'offered before');
});
