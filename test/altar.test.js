// Crypts that pay into the night (G8 of the 21 November 2026 gameplay review): a crypt's last lord
// leaves an altar offering a boon, a weapon's rank and a bargain; and some of its rooms have a row of
// spike plates that rise in turn, crossed by their timing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + '/' + file).href);
await mod('tools/headless.mjs');
const { Game, MAX_SKULLS } = await mod('public/js/game/game.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const { TRAP } = await mod('public/js/game/dungeon.js');
const { MAX_WEAPON_LEVEL } = await mod('public/js/data/weapons.js');
const P = await mod('public/js/shared/profile.js');

function gameCase(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(4242);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false } });
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const step = (g, n) => { for (let i = 0; i < n; i++) g.update(1 / 60); };
const ctx = document.createElement('canvas').getContext('2d');
// As test/crypts.test.js goes down the first crypt.
function enterFirstCrypt(g, p) {
  step(g, 2);
  p.x = 2774; p.y = -200;
  g.world.syncShrines();
  const door = g.crypts.find((d) => d.key === '2,0');
  for (const e of g.enemies) e.dead = true;
  g.draw(ctx);
  p.x = door.x; p.y = door.y + 10;
  input.bot = { x: 0, y: -1 };
  for (let i = 0; i < 120 && !g.inCrypt; i++) step(g, 1);
  input.bot = { x: 0, y: 0 };
  step(g, 60);
}

test("an altar offers a boon, the weakest weapon's rank and a bargain; each is given as it says", () => gameCase((g, p) => {
  const cards = g.altarCards();
  assert.deepEqual(cards.map((c) => c.kind), ['boon', 'rank', 'curse']);
  assert.equal(cards[1].id, 'sword');
  for (const c of cards) assert.ok(g.cardInfo(c).name && g.cardInfo(c).desc, c.kind);
  const lvl = p.weapons[0].level;
  g.takeCard(cards[1]);
  assert.equal(p.weapons[0].level, lvl + 1, 'the Whetstone raises it a level');
  const bless = p.blessings, skulls = g.skulls;
  g.takeCard(cards[2]);
  assert.equal(g.skulls, skulls + 1, 'the Dark Bargain: a Cursed Skull');
  assert.equal(p.blessings, bless + 3, 'and three Blessings of Valor');
  p.weapons[0].level = MAX_WEAPON_LEVEL;
  p.weapons[0].recompute();
  g.skulls = MAX_SKULLS;
  const late = g.altarCards();
  assert.deepEqual(late.slice(1).map((c) => c.kind), ['over', 'tithe'], 'all at their top: an Overcharge; the curse at its deepest: a tithe of blood');
  const hp = p.hp;
  g.takeCard(late[2]);
  assert.ok(p.hp < hp && p.blessings === bless + 6);
}));

test("a crypt's last lord leaves its altar on open floor; walked up to, it opens its choice", () => gameCase((g, p) => {
  enterFirstCrypt(g, p);
  assert.ok(g.inCrypt, 'down the crypt');
  const w = g.world;
  const lords = g.enemies.filter((e) => e.lord && !e.dead);
  assert.ok(lords.length >= 2);
  for (const e of lords) g.hitEnemy(e, 1e9, {});
  step(g, 3);
  const altar = g.pickups.find((pk) => pk.kind === 'altar' && !pk.dead);
  assert.ok(altar, 'the last one leaves its altar');
  assert.ok(w.free(altar.x, altar.y), 'on open floor');
  g.takeAltar();
  assert.equal(g.trophyQueue.at(-1).title, 'ALTAR');
}));

test('spike plates rise in turn, strike the hero standing on one, and spare one leaping', () => gameCase((g, p) => {
  enterFirstCrypt(g, p);
  const w = g.world;
  assert.ok(Array.isArray(w.traps));
  if (!w.traps.length) w.traps.push({ x: Math.floor(p.x / 16) * 16, y: Math.floor(p.y / 16) * 16, off: 0 });
  const t = w.traps[0];
  const turn = TRAP.warn + TRAP.up + TRAP.down;
  w.trapT = -t.off;
  assert.equal(w.trapState(t), 'warn');
  w.trapT = TRAP.warn + 0.01 - t.off;
  assert.equal(w.trapState(t), 'up');
  w.trapT = turn - 0.01 - t.off;
  assert.equal(w.trapState(t), 'down');
  const hits = [];
  p.hurt = (amount, src, by) => hits.push(by);
  p.x = t.x + 8;
  p.y = t.y + 8;
  w.trapT = TRAP.warn + 0.05 - t.off;
  w.trapHitT = 0;
  w.update(1 / 60);
  assert.deepEqual(hits, ['a spike trap']);
  w.update(1 / 60);
  assert.equal(hits.length, 1, 'once in its rest');
  w.trapHitT = 0;
  p.leap = { t: 0 };
  w.update(1 / 60);
  assert.equal(hits.length, 1, 'a leap carries him over');
  p.leap = null;
}));
