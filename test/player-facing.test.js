import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
// This installs the game's established browser/canvas substitutes and builds
// real sprites; all player, weapon, hit detection and input code remain real.
await mod('tools/headless.mjs');
const {Game} = await mod('public/js/game/game.js');
const {input} = await mod('public/js/engine/input.js');
const {mulberry32} = await mod('public/js/engine/util.js');
const {defaultProfile, metaBonuses} = await mod('public/js/shared/profile.js');

function gameCase(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(739);
  try {
    const g = new Game({hero:'knight', mode:'s15', meta:metaBonuses(defaultProfile()), settings:{numbers:false}});
    return fn(g, g.player, g.player.weapons[0]);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

function walk(p, direction) {
  input.bot = {x:direction, y:0};
  // Warm the real movement damping; moving/face are derived from input.
  for (let i = 0; i < 10; i++) p.update(1/60);
  assert.equal(p.moving, true);
  assert.equal(p.face, direction);
}

function targets(g, direction) {
  const p = g.player;
  const rear = g.spawnEnemy('bat', p.x - direction*24, p.y, {instant:true, hpMul:1000});
  const front = g.spawnEnemy('bat', p.x + direction*27, p.y, {instant:true, hpMul:1000});
  g.grid.rebuild(g.enemies, p.x, p.y);
  return {rear, front};
}

function displayedFlip(g) {
  // Exercise the real drawing path; _rect records the frame and flip actually
  // sent to drawImage, including the distinction between attack and walk art.
  let draws = 0;
  g.drawPlayer({globalAlpha:1, drawImage(){draws++;}}, g.cam);
  assert.equal(draws, 1);
  return g.player._rect[5];
}

for (const direction of [1, -1]) {
  test(`walking ${direction===1?'right':'left'} keeps its displayed facing when the sword hits behind`, () => gameCase((g,p,w) => {
    walk(p, direction);
    const {rear,front} = targets(g, direction);
    const rearHp = rear.hp, frontHp = front.hp;
    w.cd = 0;
    w.update(0); // Actual closest-enemy targeting, sword queue and Slash.
    assert.ok(rear.hp < rearHp, 'the rear enemy must still take sword damage');
    assert.equal(front.hp, frontHp, 'the opposite enemy must not receive this slash');
    assert.ok(g.stats.damage > 0 && w.dmgDealt > 0, 'real damage accounting remains intact');
    const ang = direction === 1 ? Math.PI : 0;
    assert.equal(g.effects.at(-1).ang, ang, 'slash still attacks the rear target');
    assert.equal(p.swingAng, ang, 'lunge still follows the actual attack angle');
    assert.equal(p.swingT, .14, 'attack animation still starts normally');
    const flips = [displayedFlip(g)];
    p.update(1/60);
    flips.push(displayedFlip(g));
    assert.ok(p.swingT > 0 && p.swingT < .14, 'attack timer advances during movement');
    assert.equal(p.swingAng, ang, 'movement must not overwrite attack direction');
    assert.deepEqual(flips, [direction < 0, direction < 0], 'no one-frame turn toward the rear attack and back');
  }));
}

test('a level-two alternating sword volley damages both sides without flipping a walking hero', () => gameCase((g,p,w) => {
  walk(p, 1);
  w.levelUp(); // Real Longsword upgrade adds its second, opposite slash.
  assert.equal(w.s.amount, 2);
  const {rear,front} = targets(g, 1);
  const rearHp = rear.hp, frontHp = front.hp;
  w.cd = 0;
  w.update(0);
  assert.equal(w.queue, 1);
  assert.ok(rear.hp < rearHp);
  assert.equal(front.hp, frontHp);
  assert.equal(g.effects.at(-1).ang, Math.PI);
  const rearAfterFirst = rear.hp;
  const flips = [displayedFlip(g)];
  p.update(.11);
  g.grid.rebuild(g.enemies, p.x, p.y);
  flips.push(displayedFlip(g));
  w.update(.11);
  flips.push(displayedFlip(g));
  assert.equal(w.queue, 0);
  assert.ok(front.hp < frontHp, 'the alternate slash still hits in front');
  assert.equal(rear.hp, rearAfterFirst, 'the second slash remains directed opposite the first');
  assert.equal(g.effects.at(-1).ang, Math.PI*2);
  assert.equal(p.swingAng, Math.PI*2);
  assert.equal(p.swingT, .14);
  assert.deepEqual(flips, [false,false,false], 'the alternating attack angles must not alter the walk-facing silhouette');
}));

test('a stationary hero still turns toward the sword target and retains the attack direction', () => gameCase((g,p,w) => {
  input.bot = {x:0,y:0};
  p.update(1/60);
  assert.equal(p.moving, false);
  const {rear,front} = targets(g, 1);
  const rearHp = rear.hp, frontHp = front.hp;
  w.cd = 0;
  w.update(0);
  assert.ok(rear.hp < rearHp);
  assert.equal(front.hp, frontHp);
  assert.equal(p.face, -1);
  assert.equal(displayedFlip(g), true);
  assert.equal(p.swingAng, Math.PI);
  assert.equal(p.swingT, .14);
  p.update(1/60);
  assert.equal(p.face, -1);
  assert.equal(displayedFlip(g), true);
}));
