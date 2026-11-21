// Reactions (G1 of the 21 November 2026 gameplay review; data/reactions.js, game/reactions.js):
// a heavy blow shatters a frozen foe, fire scalds a frozen one and makes a poisoned one combust,
// a held or slowed foe is exposed to crits, and burns, poison and bleeding each keep a slot of
// their own on a foe.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { REACT, EXPOSED, HEAVY, reactionOf, cardReaction, reactionLine } from '../public/js/data/reactions.js';
import { exposed } from '../public/js/game/reactions.js';

// A seeded game with no horde of its own; once it stands, every die at its middle: no crit (the
// Knight's 5%, and a held foe's 25% more, under 0.5) and every blow at its own strength
// (rand(0.9, 1.1) = 1).
function gameCase(fn, hero = 'knight') {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(17);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    Math.random = () => 0.5;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

const foe = (g, dx, dy = 0) => {
  const e = g.spawnEnemy('zombie', g.player.x + dx, g.player.y + dy, { instant: true, hpMul: 1e5 });
  e.spd = 0;
  return e;
};
const rebuild = (g) => g.grid.rebuild(g.enemies, g.player.x, g.player.y);

test('a heavy blow strikes a frozen foe half again as hard and marks it to shatter; any other blow does not', () => gameCase((g) => {
  const sword = g.addWeapon('sword'), glaive = g.addWeapon('glaive');
  const a = foe(g, 60), b = foe(g, -60);
  rebuild(g);
  const plain = g.hitEnemy(a, 100, { w: sword, kb: 0 });
  b.freezeT = 3;
  const frozen = g.hitEnemy(b, 100, { w: sword, kb: 0 });
  assert.equal(frozen, Math.round(plain * REACT.shatter.mul), 'Shatter: x1.5');
  assert.equal(b.shatterOnDeath, true, 'and it bursts if it dies still frozen');
  const c = foe(g, 0, 60);
  c.freezeT = 3;
  assert.equal(g.hitEnemy(c, 100, { w: glaive, kb: 0 }), plain, 'the Moonglaive is no heavy blow');
  assert.ok(!c.shatterOnDeath);
  assert.ok(HEAVY.has('excalibur') && HEAVY.has('footman_iron_advance'), 'evolutions are heavy too');
}));

test('fire on a frozen foe scalds it: twice the blow, half of it splashed about, and the ice gone', () => gameCase((g) => {
  const fireball = g.addWeapon('fireball');
  const a = foe(g, 60), near = foe(g, 70), far = foe(g, 160);
  rebuild(g);
  const plain = g.hitEnemy(foe(g, 0, -80), 100, { w: fireball, type: 'fire', kb: 0 });
  a.freezeT = 3;
  near.freezeT = 3;
  rebuild(g);
  const nearHp = near.hp, farHp = far.hp;
  const d = g.hitEnemy(a, 100, { w: fireball, type: 'fire', kb: 0 });
  assert.equal(d, Math.round(plain * REACT.scald.mul), 'Scald: x2');
  assert.equal(a.freezeT, 0, 'the scalded foe is free');
  assert.equal(nearHp - near.hp, Math.max(1, Math.round(d * REACT.scald.share)), 'half the blow on one beside it');
  assert.ok(near.freezeT > 0, 'a splash sets nothing more off: the one beside it stays frozen');
  assert.equal(far.hp, farHp, 'none past its reach');
  assert.ok(a.reactT > g.clock, 'and it rests before it reacts again');
}));

test('fire on a poisoned foe makes it combust: the poison burnt up at once and splashed with a share of the blow', () => gameCase((g) => {
  const fireball = g.addWeapon('fireball');
  const a = foe(g, 60), near = foe(g, 75);
  rebuild(g);
  a.addDot('poison', 10, 1.5, null);
  const hp0 = a.hp, nearHp = near.hp;
  const left = 10 * 1.5 * REACT.combust.poison;
  const d = g.hitEnemy(a, 100, { w: fireball, type: 'fire', kb: 0 });
  assert.equal(a.dots.poison.t, 0, 'its poison is spent');
  assert.equal(hp0 - a.hp, d + Math.round(left), 'the blow, and the poison it had left half again');
  assert.equal(nearHp - near.hp, Math.round(d * REACT.combust.share + left), 'the one beside it: a share of the blow and that poison');
  // Poisoned again at once, it doesn't combust again until it has rested.
  a.addDot('poison', 10, 1.5, null);
  g.hitEnemy(a, 100, { w: fireball, type: 'fire', kb: 0 });
  assert.ok(a.dots.poison.t > 0, 'a foe reacts once a second at most');
}));

test('a burn, a poison and a bleed each keep a slot of their own; the strongest is the one told', () => gameCase((g) => {
  const a = foe(g, 60);
  a.addDot('poison', 4, 2);
  a.addDot('fire', 9, 3);
  a.addDot('bleed', 2, 1);
  assert.ok(a.dots.poison.t > 0 && a.dots.fire.t > 0 && a.dots.bleed.t > 0, 'none puts out another');
  assert.equal(a.dotType, 'fire');
  assert.equal(a.dotDps, 9);
  assert.equal(a.dotT, 3);
  const hp = a.hp;
  for (let i = 0; i < 31; i++) a.update(1 / 60);
  assert.equal(hp - a.hp, 1 + 5 + 2, 'each ticks for itself: half a second of each');
}));

test('a held foe is exposed to crits, a slowed one by a share as deep as its slow, a free one not at all', () => gameCase((g) => {
  const a = foe(g, 60);
  assert.equal(exposed(a), 0);
  a.slowT = 1;
  a.slowF = 0.4;
  assert.ok(Math.abs(exposed(a) - EXPOSED.held * 0.4) < 1e-9);
  a.rootT = 1;
  assert.equal(exposed(a), EXPOSED.held);
}));

test('the cards and the Codex tell what reacts with what', () => {
  assert.equal(reactionOf('frost', 'sword'), 'shatter');
  assert.equal(reactionOf('sword', 'frost'), 'shatter', 'either way round');
  assert.equal(reactionOf('flask', 'rime'), 'scald');
  assert.equal(reactionOf('ember', 'miasma'), 'combust');
  assert.equal(reactionOf('sword', 'axe'), null);
  assert.equal(cardReaction('frost', [{ id: 'sword', name: 'Longsword' }]).text, 'Shatter: Longsword');
  assert.equal(cardReaction('glaive', [{ id: 'sword', name: 'Longsword' }]), null);
  assert.match(reactionLine('frost'), /Shatter/);
  assert.equal(reactionLine('glaive'), '');
});
