// Damage numbers have a hierarchy, so the late night's blows never bury the hero or a boss: at
// most MAX alive; crits and the big ones are never pushed out by plain hits; plain hits on the
// horde show only while few are alive; nothing of the horde's is shown in the clear zone round the
// hero; a boss's, a lord's or a champion's hits add up in one number held over its head; and the
// DAMAGE NUMBERS option off shows none.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Numbers, MAX, PLAIN_MAX, CRIT_MAX, CLEAR, TIER } from '../public/js/game/numbers.js';

const fresh = () => {
  const n = new Numbers();
  n.hero = { x: 0, y: 0 }; // far from where the hits land unless a test puts them there
  return n;
};
const tier = (n, t) => n.list.filter((m) => m.tier === t).length;

test('a burst of 200 plain hits and 5 crits keeps the 5 crits, the plain ones capped, at most 40 in all', () => {
  const n = fresh();
  for (let i = 0; i < 200; i++) {
    n.add(300 + (i % 20) * 9, 300 + Math.floor(i / 20) * 9, 10 + i, 'normal');
    if (i % 40 === 20) n.add(300 + i, 280, 99, 'crit');
  }
  assert.equal(tier(n, TIER.crit), 5, 'every crit kept');
  assert.ok(tier(n, TIER.plain) <= PLAIN_MAX, 'plain hits only while there is room');
  assert.equal(n.plainN, tier(n, TIER.plain));
  assert.ok(n.list.length <= MAX);
  // Full of the big ones, a plain hit or a crit finds no room and pushes none out.
  const m = fresh();
  for (let i = 0; i < CRIT_MAX; i++) m.add(400 + i * 30, 400, 50, 'crit');
  for (let i = 0; m.list.length < MAX; i++) m.add(100 + i * 5, 600, 5, 'gold');
  const before = m.list.slice();
  m.add(700, 700, 1, 'normal');
  m.add(720, 700, 1, 'crit');
  assert.deepEqual(m.list, before, 'nothing pushed out, nothing added');
  // A big one at the cap takes the place of the oldest crit (none of the plain left).
  m.add(800, 800, 7, 'gold');
  assert.equal(m.list.length, MAX);
  assert.equal(tier(m, TIER.crit), CRIT_MAX - 1);
});

test("nothing of the horde's is shown in the clear zone round the hero; his own wounds and heals are", () => {
  const n = fresh();
  n.hero = { x: 100, y: 100 }; // his middle is 10 px up: (100, 90)
  n.add(100 + CLEAR - 3, 90, 5, 'normal');
  n.add(100, 90 - CLEAR + 4, 50, 'crit');
  assert.equal(n.list.length, 0);
  n.add(100 + CLEAR + 2, 90, 5, 'normal');
  assert.equal(n.list.length, 1, 'just outside it, shown');
  n.add(100, 82, 12, 'player');
  n.add(100, 82, 30, 'heal');
  assert.equal(n.list.length, 3);
});

test("a boss's hits add up in one number over its head that follows it; none of the horde's lands on its body", () => {
  const n = fresh();
  const boss = { boss: true, id: 7, x: 500, y: 500, h: 40, dead: false, spr: { w: 30 }, scale: 1 };
  n.bodies = [boss];
  n.add(boss.x, boss.y - 30, 100, 'normal', boss);
  n.add(boss.x, boss.y - 30, 250, 'crit', boss);
  n.add(boss.x, boss.y - 30, 50, 'fire', boss);
  assert.equal(n.list.length, 1, 'one number');
  const h = n.list[0];
  assert.equal(h.value, 400);
  assert.equal(h.style, 'held');
  assert.equal(h.y, boss.y - boss.h - 3, 'over its head, not on its body');
  boss.x = 540;
  n.update(1 / 60);
  assert.equal(h.x, 540, 'it follows');
  // A foe's hit born on the boss's body isn't shown.
  n.add(boss.x + 5, boss.y - 20, 9, 'normal');
  n.add(boss.x + 5, boss.y - 20, 90, 'crit');
  assert.equal(n.list.length, 1);
  // Past the window a new number starts.
  n.update(0.6);
  n.add(boss.x, boss.y, 10, 'normal', boss);
  assert.equal(n.list.length, 2);
});

test('with DAMAGE NUMBERS off there are none', () => {
  const n = fresh();
  n.enabled = false;
  n.add(300, 300, 5, 'normal');
  n.add(300, 300, 5, 'crit');
  n.add(300, 300, 5, 'player');
  assert.equal(n.list.length, 0);
});
