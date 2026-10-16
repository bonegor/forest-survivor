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
const shown = (g) => { g.drawPlayer(context, g.cam); return SPR[g.player.hero.sprite].frames.indexOf(g.player._rect[4]); };
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

// The user: "in the dungeons, every hero should have available only its main weapon, make it so -
// knight has sword, ranger has the bow, etc", and "the other weapons dont fire in there, and the
// player uses left x or rhight shift.....but maybe also leftshift".
const OWN = { archer: 'arrow', mage: 'fireball', rogue: 'dagger', necromancer: 'minion' };
const made = (g, what) => (what === 'minion' ? g.minions.filter((m) => !m.dead).length : g.projectiles.filter((pr) => pr.kind === what).length);

for (const [hero, what] of Object.entries(OWN)) {
  test(`in a crypt the ${hero} has their own weapon alone, and it waits for the player`, () => gameCase((g, p) => {
    g.addWeapon('axe');
    g.addWeapon('aura');
    g.addWeapon('lightning');
    step(g, 120);
    assert.ok(g.effects.some((e) => e.persistent && e.w?.id === 'aura'), 'outside, the aura is out');
    enterStartCrypt(g, p);
    assert.ok(g.caveStrike);
    assert.ok(!g.effects.some((e) => e.persistent && !e.dead), 'the aura is left outside');
    const w = g.mainWeapon();
    assert.equal(w.id, p.hero.weapon);
    const foe = g.spawnEnemy('zombie', p.x - 40, p.y, { instant: true, hpMul: 1e6 });
    foe.spd = 0;
    for (const m of g.minions) m.dead = true;
    for (const pr of g.projectiles) pr.dead = true;
    step(g);
    const hits = new Set();
    const hit = g.hitEnemy.bind(g);
    g.hitEnemy = (e, d, o) => { if (o?.w) hits.add(o.w.id); return hit(e, d, o); };
    for (let i = 0; i < 180; i++) {
      step(g);
      assert.equal(made(g, what), 0, 'nothing until the player strikes');
      assert.equal(g.projectiles.length, 0, 'and the axe stays quiet');
    }
    assert.deepEqual([...hits].filter((id) => id !== w.id), [], 'nor does the lightning strike');
    w.cd = 0;
    press(g, 'ShiftLeft');
    assert.notEqual(p.strikeAt, null, 'left Shift strikes');
    assert.equal(p.face, -1, 'standing, the hero turns to the foe');
    const spr = SPR[p.hero.sprite], clip = strikeClip(spr);
    let left = null, frame = -1;
    for (let i = 0; i < 60 && left === null; i++) {
      step(g);
      if (made(g, what)) {
        left = g.clock - p.strikeAt;
        frame = shown(g);
      }
    }
    assert.notEqual(left, null, 'it fires');
    if (clip) {
      assert.ok(Math.abs(left - clip.delay) < 2 / 60, `on the blow frame, ${clip.delay}s in, not ${left}`);
      assert.equal(frame, spr.attack[clip.hit], 'as the sprite strikes');
    } else assert.ok(left < 2 / 60, `at once, with no attack to play (${left})`);
    if (what !== 'minion') {
      const shot = g.projectiles.find((pr) => pr.kind === what);
      assert.ok(shot.vx < 0 && Math.abs(shot.vy) < Math.abs(shot.vx), 'at the foe');
    }
    step(g, 60);
    assert.ok(!g.projectiles.some((pr) => pr.kind === 'axe'), 'the axe still waits outside');
    assert.ok(![...hits].some((id) => id !== w.id), `only the ${w.def.name} has struck (${[...hits]})`);
  }, hero));
}

test('the ranger shoots a foe 200 px off, one behind her too, and on the move shows only a shot ahead', () => gameCase((g, p) => {
  enterStartCrypt(g, p);
  const w = g.mainWeapon(), spr = SPR.archer, clip = strikeClip(spr);
  assert.equal(clip.hit, spr.attackRelease, 'the arrow leaves on the release');
  const foe = g.spawnEnemy('zombie', p.x + 200, p.y, { instant: true, hpMul: 1e6 });
  foe.spd = 0;
  step(g);
  w.cd = 0;
  press(g, 'KeyX');
  step(g, 12);
  const arrow = g.projectiles.find((pr) => pr.kind === 'arrow');
  assert.ok(arrow && arrow.vx > 0 && Math.abs(arrow.vy) < arrow.vx * 0.2, 'straight at the foe 200 px off');
  // Walking right with the foe behind her: the arrow flies back at it, and she walks on.
  for (const pr of g.projectiles) pr.dead = true;
  foe.x = p.x - 60;
  foe.y = p.y;
  input.bot = { x: 1, y: 0 };
  step(g, 3);
  w.cd = 0;
  press(g, 'KeyX');
  let back = null;
  for (let i = 0; i < 20; i++) {
    step(g);
    assert.equal(p.face, 1, 'she keeps facing the way she walks');
    const fr = shown(g);
    assert.ok(!spr.attack.includes(fr) && !spr.attackWalk.flat().includes(fr), 'no shot ahead is shown');
    back ||= g.projectiles.find((pr) => pr.kind === 'arrow');
  }
  input.bot = { x: 0, y: 0 };
  assert.ok(back && back.vx < 0, 'the arrow flies behind her');
}, 'archer'));
