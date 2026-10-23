import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { ELITE } from '../public/js/data/difficulty.js';

const step = (g, n = 1) => { for (let i = 0; i < n; i++) g.update(1 / 60); };

function gameCase(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(7);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// Walk the hero up the steps of the crypt by the start; its packs stay asleep, and unless kept
// are taken away, its lords left alone.
function enterStartCrypt(g, p, keep = false) {
  step(g, 2);
  g.world.syncShrines();
  const door = g.crypts.find((d) => d.key === '0,0');
  for (const e of g.enemies) e.dead = true;
  p.x = door.x;
  p.y = door.y + 10;
  p.invuln = 99;
  input.bot = { x: 0, y: -1 };
  for (let i = 0; i < 120 && !g.inCrypt; i++) step(g);
  input.bot = { x: 0, y: 0 };
  step(g, 60);
  if (!keep) for (const e of g.enemies) if (!e.lord) e.dead = true;
  return door;
}

test('a crypt is ten rooms or so, its lords boss-sized Skeleton Archers, each in a room of its own with its guard', () => gameCase((g, p) => {
  enterStartCrypt(g, p, true);
  const w = g.world, T = 16;
  assert.deepEqual([w.W, w.H], [70, 56]);
  assert.ok(w.rooms.length >= 7 && w.rooms.length <= 12, `${w.rooms.length} rooms`);
  const roomOf = (e) => w.rooms.find((r) => Math.floor(e.x / T) >= r.x && Math.floor(e.x / T) < r.x + r.w && Math.floor(e.y / T) >= r.y && Math.floor(e.y / T) < r.y + r.h);
  const lords = g.enemies.filter((e) => e.lord);
  assert.equal(lords.length, 2, 'two at dusk');
  assert.ok(lords.includes(w.guardian) && roomOf(w.guardian) === w.guardRoom, 'one in the farthest room');
  assert.equal(new Set(lords.map(roomOf)).size, 2, 'each in a room of its own');
  for (const lord of lords) {
    assert.equal(lord.type, 'skeletonarcher');
    assert.ok(lord.lord && lord.elite && lord.sleeping && lord.name);
    assert.equal(lord.maxHp, 600 * ELITE.health, "its own 600, and the owner's +20% of 20 October 2026");
    assert.notEqual(lord.mod.id, 'stone', 'never Stoneskin');
    assert.equal(lord.scale, 1, 'drawn at its own size');
    const guard = g.enemies.filter((e) => e.dormant && e.pack === lord.pack);
    assert.ok(guard.length && guard.every((e) => roomOf(e) === roomOf(lord)), 'its guard asleep about it');
  }
  assert.ok(SPR.skeletonarcher.h >= SPR.lich.h, 'as big as a boss');
  // Struck, a lord wakes, and its guard with it; the other sleeps on until its own guard wakes.
  const lord = w.guardian, other = lords.find((l) => l !== lord);
  g.hitEnemy(lord, 1, {});
  step(g);
  assert.ok(!lord.sleeping && g.enemies.every((e) => e.pack !== lord.pack || e.dead || (!e.dormant && e.aware)), 'struck, it wakes its guard');
  assert.ok(other.sleeping && g.enemies.some((e) => e.dormant && e.pack === other.pack), 'the other sleeps on');
  g.wakePack(g.enemies.find((e) => e.dormant && e.pack === other.pack));
  step(g);
  assert.ok(!other.sleeping, 'and wakes with its guard');
}));

// Eight strikes at its own 600; the owner's +20% to every monster's health (20 October 2026)
// makes it 720 on Elite, about ten.
test('it lasts about ten strikes of a fully grown sword', () => gameCase((g, p) => {
  enterStartCrypt(g, p);
  const w = g.mainWeapon(), lord = g.world.guardian;
  while (w.level < 8) w.levelUp();
  p.crit = 0;
  p.devGod = true;
  lord.ai = () => [0, 0, 0];
  let strikes = 0;
  while (!lord.dead && strikes < 30) {
    lord.x = p.x + 20;
    lord.y = p.y;
    lord.state = 'move';
    step(g);
    w.cd = 0;
    if (g.strike()) strikes++;
    for (let i = 0; i < 40 && !lord.dead; i++) {
      lord.x = p.x + 20;
      lord.y = p.y;
      step(g);
    }
  }
  assert.ok(lord.dead, 'it falls');
  assert.ok(strikes >= 9 && strikes <= 11, `${strikes} strikes`);
}));

test('awake, it draws its bow and shoots arrows at the hero', () => gameCase((g, p) => {
  enterStartCrypt(g, p);
  const lord = g.world.guardian;
  p.devGod = true;
  lord.x = p.x + 120;
  lord.y = p.y;
  lord.cdT = 0;
  g.bossIntro(lord);
  let aimed = false, shot = null;
  for (let i = 0; i < 180 && !shot; i++) {
    step(g);
    aimed ||= lord.frameIndex() === SPR.skeletonarcher.attack[0];
    shot = g.eshots.find((s) => s.kind === 'arrow');
  }
  assert.ok(aimed, 'the drawing frame shows as it aims');
  assert.ok(shot, 'an arrow flies');
  assert.ok(shot.vx < 0, 'toward the hero');
  assert.ok(SPR.skeletonarcher.walk.includes(lord.frameIndex()), 'then it walks again');
}));

test('felled in a crypt the hero faints, wakes outside, and cannot go back in', () => gameCase((g, p) => {
  const door = enterStartCrypt(g, p);
  p.invuln = 0;
  p.revivals = 0;
  p.hurt(p.hp + 999);
  assert.equal(g.state, 'faint', 'he faints');
  assert.ok(!p.dead);
  for (let i = 0; i < 300 && g.state !== 'play'; i++) step(g);
  assert.equal(g.state, 'play', 'and the run goes on');
  assert.equal(g.inCrypt, null, 'outside');
  assert.ok(Math.abs(p.x - door.x) < 2 && p.y > door.y, 'by its door');
  assert.equal(p.hp, Math.round(p.maxHp * 0.5), 'at half his health');
  assert.ok(door.sealed && g.lost.has('0,0') && !g.cleared.has('0,0'), 'shut, not cleared');
  // Up the steps again: the door stays shut.
  p.x = door.x;
  p.y = door.y + 10;
  input.bot = { x: 0, y: -1 };
  step(g, 120);
  input.bot = { x: 0, y: 0 };
  assert.equal(g.inCrypt, null, 'it will not open');
  g.finish(false);
  assert.equal(g.result.crypts, 0, 'not counted as cleared');
}));

test('a crypt is no place to heal or to spend a Second Wind', () => gameCase((g, p) => {
  p.hp = Math.round(p.maxHp * 0.1);
  enterStartCrypt(g, p);
  const low = p.hp;
  p.invuln = 0;
  p.revivals = 1;
  p.hurt(p.hp + 999);
  assert.equal(g.state, 'faint', 'he faints rather than rising again');
  assert.equal(p.revivals, 1, 'the Second Wind is kept for the forest');
  for (let i = 0; i < 300 && g.state !== 'play'; i++) step(g);
  assert.ok(p.hp <= Math.round(low) && p.hp < p.maxHp * 0.5, 'and wakes with no more health than he went in with');
}));

test('a Holy Relic or a Frost Rune is no way past a crypt lord', () => gameCase((g, p) => {
  enterStartCrypt(g, p);
  const lord = g.enemies.find((e) => e.lord);
  p.x = lord.x - 40;
  p.y = lord.y;
  g.snapCam();
  step(g);
  g.holyNova();
  assert.ok(!lord.dead && lord.hp < lord.maxHp, 'it takes a heavy blow, not its death');
  g.freezeAll(5);
  assert.ok(!(lord.freezeT > 0) && lord.slowT > 0, 'slowed, not frozen');
}));

test('in the forest a death still ends the run', () => gameCase((g, p) => {
  step(g, 2);
  p.revivals = 0;
  p.hurt(p.hp + 999);
  assert.ok(p.dead);
  assert.equal(g.state, 'dying');
}));
