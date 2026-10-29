// A hero's looks (data/heroes.js skins), chosen on the hero screen and remembered with the
// settings. The approved defaults ship without a browser preference; retained
// baselines and both review options remain selectable.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('every hero has an original and optional look with complete sprites and poses', () => {
  for (const h of Object.values(HEROES)) {
    if (h.id === 'knight') assert.equal(h.skins, undefined);
    else assert.deepEqual(h.skins.map(s => s.id), [['paladin','berserker'].includes(h.id) ? 'v3' : 'original', 'v4a', 'v4b'], h.id);
    for (const skin of h.skins || []) assert.ok(SPR[skin.sprite] && SPR[skin.pose], `${h.id}: ${skin.id} art`);
    assert.ok(SPR[h.sprite] && SPR[h.pose], `${h.id}: its sprite and pose`);
  }
  const p = SPR[HEROES.paladin.sprite];
  assert.ok(p.frames.length === 22 && p.idle.length && p.walk.length && p.attack.length, 'the Paladin, idle, walk and attack');
  assert.equal(SPR.paladin_d, undefined, 'her Style D is gone');
});

test('heroLook leaves a hero as she is, whatever look the settings once chose', () => {
  assert.equal(heroLook('paladin', {}), HEROES.paladin);
  assert.equal(heroLook('paladin', { paladin: 'c' }), HEROES.paladin);
  assert.equal(heroLook('paladin', { paladin: 'd' }), HEROES.paladin, 'a look she no longer has');
  assert.equal(heroLook('knight', { knight: 'b' }), HEROES.knight);
});

test('a run remembered in a look that is gone is played in the hero\'s own', () => {
  const oldBot = input.bot;
  input.bot = { x: 0, y: 0 };
  try {
    const meta = metaBonuses(defaultProfile());
    const g = new Game({ hero: 'paladin', mode: 's15', meta, settings: { numbers: false, skins: { paladin: 'd' } }, crypts: false });
    assert.equal(g.player.hero.sprite, 'paladin_v4a', 'a retired look resolves to approved Iron Vow');
    for (let i = 0; i < 120; i++) g.update(1 / 60); // swings and walks in it without trouble
    assert.ok(!g.player.dead);
  } finally {
    input.bot = oldBot;
  }
});
