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
  // The owner's (21 October 2026): the sword swings in front of him, seeking no foe; one on the
  // other side takes his turning round.
  test(`walking ${direction===1?'right':'left'}, the sword swings ahead of him, not at the nearer foe behind`, () => gameCase((g,p,w) => {
    walk(p, direction);
    const {rear,front} = targets(g, direction);
    const rearHp = rear.hp, frontHp = front.hp;
    w.cd = 0;
    w.update(0); // the sword queue and the Slash, as in play
    assert.ok(front.hp < frontHp, 'the foe ahead takes the blow');
    assert.equal(rear.hp, rearHp, 'the nearer foe behind him does not');
    assert.ok(g.stats.damage > 0 && w.dmgDealt > 0, 'real damage accounting remains intact');
    const ang = direction === 1 ? 0 : Math.PI;
    assert.equal(g.effects.at(-1).ang, ang, 'the slash goes the way he walks');
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

test('a level-two sword slashes ahead, then behind, without flipping a walking hero', () => gameCase((g,p,w) => {
  walk(p, 1);
  w.levelUp(); // Real Longsword upgrade adds its second, opposite slash.
  assert.equal(w.s.amount, 2);
  const {rear,front} = targets(g, 1);
  const rearHp = rear.hp, frontHp = front.hp;
  w.cd = 0;
  w.update(0);
  assert.equal(w.queue, 1);
  assert.ok(front.hp < frontHp, 'the first slash goes ahead');
  assert.equal(rear.hp, rearHp);
  assert.equal(g.effects.at(-1).ang, 0);
  const frontAfterFirst = front.hp;
  const flips = [displayedFlip(g)];
  p.update(.11);
  rear.x = p.x - 24; // it keeps up with him as he walks on
  g.grid.rebuild(g.enemies, p.x, p.y);
  flips.push(displayedFlip(g));
  w.update(.11);
  flips.push(displayedFlip(g));
  assert.equal(w.queue, 0);
  assert.ok(rear.hp < rearHp, 'the second slash goes behind him');
  assert.equal(front.hp, frontAfterFirst, 'the second slash goes opposite the first');
  assert.equal(g.effects.at(-1).ang, Math.PI);
  assert.equal(p.swingAng, Math.PI);
  assert.equal(p.swingT, .14);
  assert.deepEqual(flips, [false,false,false], 'the alternating attack angles must not alter the walk-facing silhouette');
}));

test('a standing hero with a level-two sword keeps facing ahead through both slashes, at a foe behind him and away', () => gameCase((g,p,w) => {
  input.bot = {x:0,y:0};
  p.update(1/60);
  assert.equal(p.face, 1);
  w.levelUp(); // the second slash, opposite the first
  assert.equal(w.s.amount, 2);
  const foe = g.spawnEnemy('bat', p.x - 24, p.y, {instant:true, hpMul:1000});
  g.grid.rebuild(g.enemies, p.x, p.y);
  w.cd = 0;
  w.update(0);
  assert.equal(g.effects.at(-1).ang, 0, 'the first slash goes ahead, the way he faces');
  assert.equal(foe.hp, foe.maxHp, 'missing the foe behind him');
  assert.equal(p.face, 1, 'without turning him');
  w.update(.11);
  assert.equal(w.queue, 0);
  assert.equal(g.effects.at(-1).ang, Math.PI, 'the second slash goes behind him');
  assert.ok(foe.hp < foe.maxHp, 'and hits it');
  assert.equal(p.face, 1);
  assert.equal(displayedFlip(g), false);
}));

test('a swing at nothing leaves a standing hero facing as he was', () => gameCase((g,p,w) => {
  input.bot = {x:0,y:0};
  p.update(1/60);
  g.grid.rebuild(g.enemies, p.x, p.y);
  assert.equal(g.nearestEnemy(p.x, p.y, 34 * w.s.area + 26), null, 'no foe in reach');
  p.aim = 0; p.face = -1; // he walked right, then struck a foe on his left by hand (Game.strike), now gone
  w.levelUp();
  w.cd = 0;
  const flips = [];
  w.update(0);
  flips.push(displayedFlip(g));
  w.update(.11);
  flips.push(displayedFlip(g));
  assert.deepEqual(g.effects.slice(-2).map(s => s.ang), [0, Math.PI], 'both slashes still swing');
  assert.equal(p.face, -1);
  assert.deepEqual(flips, [true, true], 'he never turns, not even for one slash');
}));

test('a standing hero is not turned by his sword, which strikes ahead, not at the nearer foe behind him', () => gameCase((g,p,w) => {
  input.bot = {x:0,y:0};
  p.update(1/60);
  assert.equal(p.moving, false);
  const {rear,front} = targets(g, 1);
  const rearHp = rear.hp, frontHp = front.hp;
  w.cd = 0;
  w.update(0);
  assert.ok(front.hp < frontHp);
  assert.equal(rear.hp, rearHp);
  assert.equal(p.face, 1);
  assert.equal(displayedFlip(g), false);
  assert.equal(p.swingAng, 0);
  assert.equal(p.swingT, .14);
  p.update(1/60);
  assert.equal(p.face, 1);
  assert.equal(displayedFlip(g), false);
}));

// The user's call: "when hero is just standing, looking to the right, it then decides and turns to
// the left instead.... should just stay put". Every hero stands among foes on both sides, his
// weapons at work (the knight's and the ranger's at level 2: two slashes, two arrows a volley),
// facing first one way, then the other.
for (const hero of ['knight', 'archer', 'mage', 'rogue', 'necromancer']) {
  for (const face of [1, -1]) test(`a standing ${hero} facing ${face === 1 ? 'right' : 'left'} never turns, whatever his weapons hit`, () => {
    const oldRandom = Math.random, oldBot = input.bot;
    Math.random = mulberry32(739);
    try {
      input.bot = {x:face, y:0};
      const g = new Game({hero, mode:'s15', meta:metaBonuses(defaultProfile()), settings:{numbers:false}, crypts:false});
      g.spawner.update = () => {};
      const p = g.player, w = p.weapons[0];
      p.devGod = true;
      if (hero === 'knight' || hero === 'archer') w.levelUp();
      for (let i = 0; i < 10; i++) p.update(1/60);
      assert.equal(p.face, face);
      input.bot = {x:0, y:0};
      for (const [dx, dy] of [[-30, 0], [32, 0], [-60, 20], [70, -15]]) {
        const e = g.spawnEnemy('slime', p.x + dx, p.y + dy, {instant:true, hpMul:1e6});
        e.dormant = true; // stays put, so only the hero's own attacks are at work
      }
      g.grid.rebuild(g.enemies, p.x, p.y);
      const flips = new Set(), hp = g.enemies.reduce((s, e) => s + e.hp, 0);
      for (let i = 0; i < 10*60; i++) {
        g.update(1/60);
        flips.add(displayedFlip(g));
      }
      assert.equal(p.moving, false);
      assert.ok(g.enemies.reduce((s, e) => s + e.hp, 0) < hp, 'his weapons were at work');
      assert.deepEqual([...flips], [face < 0], 'he stays as he faced');
    } finally {
      input.bot = oldBot;
      Math.random = oldRandom;
    }
  });
}
