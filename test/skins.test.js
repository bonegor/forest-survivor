// Appearance preferences keep the same hero, equipment and run progression.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('every selected hero has a complete default sprite and matching pose', () => {
  for (const h of Object.values(HEROES)) {
    assert.ok(SPR[h.sprite] && SPR[h.pose], `${h.id}: its sprite and pose`);
  }
  const p = SPR[HEROES.paladin.sprite];
  assert.ok(p.idle.length > 1 && p.walk.length > 1 && p.attack.length > 1 && p.attackWalk.length === p.attack.length, 'the approved Justicar has independent idle, walk, attack and moving attack clips');
  assert.equal(SPR.paladin_d, undefined, 'her Style D is gone');
});

test('the Ranger hood carries through a run, its fall and its final planted bow', () => {
  const settings = { skins: { archer: 'hooded' } };
  const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(defaultProfile()), settings, crypts: false });
  const { hero } = g.player;
  assert.equal(hero.id, 'archer');
  assert.equal(hero.sprite, 'archer_hooded');
  assert.equal(hero.pose, 'archer_hooded_pose');
  const ranger = SPR.archer, hood = SPR[hero.sprite];
  assert.deepEqual(hood.fall.frames[0].buf, hood.frames[hood.idle[0]].buf);
  const landed = hood.fall.frameAt(0.94);
  assert.notDeepEqual(hood.fall.frames[landed].buf.d, ranger.fall.frames[landed].buf.d);
  assert.deepEqual(hood.fall.frames.at(-1).buf, ranger.fall.frames.at(-1).buf);
  assert.deepEqual(hood.fall.cues, ranger.fall.cues);
  assert.deepEqual(hood.walk, ranger.walk);
  assert.deepEqual(hood.attackWalk, ranger.attackWalk);
  assert.equal(hood.motionRate, ranger.motionRate);
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
    assert.equal(g.player.hero.sprite, 'paladin', 'a retired look resolves to the approved Justicar');
    for (let i = 0; i < 120; i++) g.update(1 / 60); // swings and walks in it without trouble
    assert.ok(!g.player.dead);
  } finally {
    input.bot = oldBot;
  }
});
