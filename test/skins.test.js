// A hero's looks (data/heroes.js skins), chosen on the hero screen and remembered with the
// settings: the Knight's own (Plumed) and Knight B, drawn with claude-pxl (22 October 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('the Knight has seven looks, each a full sprite of its own, with glow where it glows', () => {
  const skins = HEROES.knight.skins;
  assert.deepEqual(skins.map((s) => s.id), ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  assert.equal(new Set(skins.map((s) => s.sprite)).size, skins.length, 'each its own sprite');
  assert.equal(skins[0].sprite, HEROES.knight.sprite, 'the first is his own');
  for (const s of skins) {
    const spr = SPR[s.sprite];
    assert.ok(spr && spr.frames.length && spr.idle.length && spr.walk.length && spr.attack.length, s.id);
    assert.ok(SPR[s.pose], `${s.id}: a pose`);
    assert.equal(spr.frames.length, s.id === 'a' ? spr.frames.length : 22, `${s.id}: 22 frames`);
  }
});

test('heroLook swaps the sprite and pose for a chosen look, and leaves the hero as he is otherwise', () => {
  assert.equal(heroLook('knight', {}), HEROES.knight);
  assert.equal(heroLook('knight', { knight: 'a' }), HEROES.knight);
  assert.equal(heroLook('knight', { knight: 'nope' }), HEROES.knight);
  assert.equal(heroLook('mage', { mage: 'b' }), HEROES.mage, 'a hero with no looks');
  const b = heroLook('knight', { knight: 'b' });
  assert.equal(b.sprite, 'knight_b');
  assert.equal(b.pose, 'knight_b_pose');
  assert.equal(b.name, HEROES.knight.name);
  assert.deepEqual(b.unique, HEROES.knight.unique, 'the same hero, only his look');
});

test('a run is played in the look the settings remember', () => {
  const oldBot = input.bot;
  input.bot = { x: 0, y: 0 };
  try {
    const make = (skins) => new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false, skins }, crypts: false });
    assert.equal(make({ knight: 'b' }).player.hero.sprite, 'knight_b');
    assert.equal(make({}).player.hero.sprite, 'knight');
    const g = make({ knight: 'b' });
    for (let i = 0; i < 120; i++) g.update(1 / 60); // swings and walks in it without trouble
    assert.ok(!g.player.dead);
  } finally {
    input.bot = oldBot;
  }
});
