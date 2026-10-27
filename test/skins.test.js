// A hero's looks (data/heroes.js skins), chosen on the hero screen and remembered with the
// settings. Since 27 October 2026 only the Paladin has two (Style C and Style D) until the user
// picks one; every other hero has one look and no LOOK button.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('the Paladin has two looks, each a full sprite of its own, and no other hero has any', () => {
  const skins = HEROES.paladin.skins;
  assert.deepEqual(skins.map((s) => s.id), ['c', 'd']);
  assert.equal(new Set(skins.map((s) => s.sprite)).size, skins.length, 'each its own sprite');
  assert.equal(skins[0].sprite, HEROES.paladin.sprite, 'the first is her own');
  for (const s of skins) {
    const spr = SPR[s.sprite];
    assert.ok(spr && spr.frames.length === 22 && spr.idle.length && spr.walk.length && spr.attack.length, s.id);
    assert.ok(SPR[s.pose], `${s.id}: a pose`);
  }
  for (const h of Object.values(HEROES)) if (h.id !== 'paladin') assert.equal(h.skins, undefined, h.id);
});

test('heroLook swaps the sprite and pose for a chosen look, and leaves the hero as she is otherwise', () => {
  assert.equal(heroLook('paladin', {}), HEROES.paladin);
  assert.equal(heroLook('paladin', { paladin: 'c' }), HEROES.paladin);
  assert.equal(heroLook('paladin', { paladin: 'nope' }), HEROES.paladin);
  assert.equal(heroLook('knight', { knight: 'b' }), HEROES.knight, 'a look he no longer has');
  const d = heroLook('paladin', { paladin: 'd' });
  assert.equal(d.sprite, 'paladin_d');
  assert.equal(d.pose, 'paladin_d_pose');
  assert.equal(d.name, HEROES.paladin.name);
  assert.deepEqual(d.unique, HEROES.paladin.unique, 'the same hero, only her look');
});

test('a run is played in the look the settings remember', () => {
  const oldBot = input.bot;
  input.bot = { x: 0, y: 0 };
  try {
    const meta = metaBonuses(defaultProfile());
    const make = (skins) => new Game({ hero: 'paladin', mode: 's15', meta, settings: { numbers: false, skins }, crypts: false });
    assert.equal(make({ paladin: 'd' }).player.hero.sprite, 'paladin_d');
    assert.equal(make({}).player.hero.sprite, 'paladin');
    const g = make({ paladin: 'd' });
    for (let i = 0; i < 120; i++) g.update(1 / 60); // swings and walks in it without trouble
    assert.ok(!g.player.dead);
  } finally {
    input.bot = oldBot;
  }
});
