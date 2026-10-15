import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, strikeClip } from '../public/js/game/game.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { cryptsNear, start } from '../public/js/game/darkwood.js';
import { Slash } from '../public/js/game/effects.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const context = { globalAlpha: 1, drawImage() {} };
const step = (g, n = 1) => { for (let i = 0; i < n; i++) g.update(1 / 60); };
const shown = (g) => { g.drawPlayer(context, g.cam); return SPR.knight.frames.indexOf(g.player._rect[4]); };
const slashes = (g) => g.effects.filter((e) => e instanceof Slash).length;
// One frame with a key pressed, as the browser's keydown and the frame's end leave it.
function press(g, code) {
  input.held.add(code);
  input.justDown.add(code);
  step(g);
  input.justDown.clear();
  input.held.delete(code);
}

function gameCase(fn, hero = 'knight') {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(99);
  try {
    const g = new Game({ hero, mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    g.player.devGod = true;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    input.held.clear();
    input.justDown.clear();
    Math.random = oldRandom;
  }
}

// Walk the hero up the steps of the crypt by the start.
function enterStartCrypt(g, p) {
  step(g, 2);
  g.world.syncShrines();
  const door = g.crypts.find((d) => d.key === '0,0');
  for (const e of g.enemies) e.dead = true;
  p.x = door.x;
  p.y = door.y + 10;
  input.bot = { x: 0, y: -1 };
  for (let i = 0; i < 120 && !g.inCrypt; i++) step(g);
  input.bot = { x: 0, y: 0 };
  step(g, 60);
  for (const e of g.enemies) e.dormant = true;
  return door;
}

test('a crypt stands by the start, a few steps north of the hero', () => {
  const s = start(), d = cryptsNear(s.x, s.y, 200).find((c) => c.key === '0,0');
  assert.ok(d, 'the start has a crypt');
  assert.ok(d.y < s.y && Math.hypot(d.x - s.x, d.y - s.y) < 120, 'north of the hero, a few steps away');
  gameCase((g, p) => {
    enterStartCrypt(g, p);
    assert.equal(g.inCrypt?.key, '0,0', 'walking up its steps goes in');
    assert.equal(g.inCrypt.depth, 1, 'as deep as the first ring');
  });
});

test('in a crypt the knight has his sword alone, and it waits for the player', () => gameCase((g, p) => {
  g.addWeapon('bow');
  g.addWeapon('blades');
  g.addWeapon('aura');
  step(g, 120);
  assert.ok(g.effects.some((e) => e.persistent && e.w?.id === 'aura'), 'outside, the aura is out');
  enterStartCrypt(g, p);
  assert.ok(g.caveStrike);
  assert.ok(!g.effects.some((e) => e.persistent && !e.dead), 'the blades and the aura are left outside');
  g.spawnEnemy('skeleton', p.x + 16, p.y, { instant: true });
  for (let i = 0; i < 180; i++) {
    step(g);
    assert.equal(slashes(g), 0, 'no swing unless the player strikes');
    assert.equal(g.projectiles.length, 0, 'the bow stays quiet');
  }
  for (const code of ['KeyX', 'ShiftLeft', 'ShiftRight']) {
    input.held.add(code);
    assert.ok(input.down('strike'), code + ' strikes');
    input.held.delete(code);
  }
  input.held.add('ControlLeft');
  assert.ok(!input.down('strike'), 'not Ctrl, which closes the tab with W');
  input.held.delete('ControlLeft');
}));

test('a strike plays the attack, and the blade lands on its blow frame', () => gameCase((g, p) => {
  enterStartCrypt(g, p);
  const spr = SPR.knight, clip = strikeClip(spr), w = g.mainWeapon();
  assert.deepEqual([clip.from, clip.hit], [1, 3], 'two frames of wind-up, then the sweep');
  const foe = g.spawnEnemy('skeleton', p.x - 18, p.y, { instant: true });
  foe.dormant = true;
  step(g);
  w.cd = 0;
  press(g, 'KeyX');
  const at = p.strikeAt;
  assert.notEqual(at, null, 'the key strikes');
  assert.equal(p.face, -1, 'standing, he turns to the foe');
  assert.equal(shown(g), spr.attack[clip.from], 'the swing starts as the key goes down');
  assert.equal(slashes(g), 0, 'the blade has not landed yet');
  let landed = null;
  for (let i = 0; i < 60 && landed === null; i++) {
    step(g);
    if (slashes(g)) landed = g.clock - at;
    else assert.ok(spr.attack.slice(0, clip.hit).includes(shown(g)), 'winding up');
  }
  assert.ok(Math.abs(landed - clip.delay) < 2 / 60, `the slash lands ${clip.delay}s in, not ${landed}`);
  assert.equal(shown(g), spr.attack[clip.hit], 'as the sprite sweeps');
  assert.ok(Math.abs(Math.cos(g.effects.find((e) => e instanceof Slash).ang) + 1) < 0.2, 'at the foe');

  press(g, 'KeyX');
  assert.equal(p.strikeAt, at, 'not again before the sword is ready');
  input.held.add('KeyX');
  for (let i = 0; i < 120 && p.strikeAt === at; i++) step(g);
  input.held.delete('KeyX');
  assert.ok(Math.abs(p.strikeAt - at - w.s.cd) < 3 / 60, 'held, it strikes again as the sword readies');
  step(g, 60);
  assert.ok(!spr.attack.includes(shown(g)), 'and then he stands');
}));

test('back in the forest every weapon fights by itself again, and he only walks', () => gameCase((g, p) => {
  g.addWeapon('bow');
  g.addWeapon('aura');
  enterStartCrypt(g, p);
  g.leaveCrypt(false);
  for (let i = 0; i < 120 && g.inCrypt; i++) step(g);
  assert.equal(g.inCrypt, null);
  g.mainWeapon().cd = 0;
  let swung = false, shot = false;
  for (let i = 0; i < 150; i++) {
    step(g);
    swung ||= slashes(g) > 0;
    shot ||= g.projectiles.some((pr) => pr.kind === 'arrow');
    assert.ok(!SPR.knight.attack.includes(shown(g)), 'no attack frames outside');
  }
  assert.ok(swung, 'the sword swings by itself');
  assert.ok(shot, 'the bow is back');
  assert.ok(g.effects.some((e) => e.persistent && e.w?.id === 'aura'), 'and the aura');
}));

test('other heroes fight in the crypts as they always have', () => gameCase((g, p) => {
  enterStartCrypt(g, p);
  assert.equal(g.caveStrike, false);
  let fired = false;
  for (let i = 0; i < 120 && !fired; i++) {
    step(g);
    fired = g.projectiles.length > 0;
  }
  assert.ok(fired, 'the ranger\'s bow fires by itself below');
}, 'archer'));
