// A hero's looks (data/heroes.js skins), chosen on the hero screen and remembered with the
// settings. Since 27 October 2026 every hero has one look and no LOOK button: the Paladin's two
// (Style C and Style D) gave way to her holy crusader (lab paladin/knightstyle-e). The mechanism
// stays for looks to come; a look a player once chose and that is gone plays as the hero's own.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('every hero has one look, a full sprite and a pose of its own, and no LOOK to step through', () => {
  for (const h of Object.values(HEROES)) {
    assert.equal(h.skins, undefined, h.id);
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
    assert.equal(g.player.hero.sprite, 'paladin');
    for (let i = 0; i < 120; i++) g.update(1 / 60); // swings and walks in it without trouble
    assert.ok(!g.player.dead);
  } finally {
    input.bot = oldBot;
  }
});
