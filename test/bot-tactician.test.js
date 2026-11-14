import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { TACTICIAN } from '../public/js/bots/tactician.js';
import { tacticalScore } from '../public/js/bots/picks.js';
import { Driver } from '../public/js/bots/driver.js';
import { Game } from '../public/js/game/game.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('tactical build reserves the final relic slot for an owned weapon evolution', () => {
  const view = { hero: 'eanasir', me: { hpFrac: 1, weapons: [
    { id: 'merchantwhip', level: 8 }, { id: 'goodcopper', level: 8 },
  ], passives: { might: 1, area: 1, cooldown: 1, armor: 1, regen: 1 } } };
  const card = id => ({ type: 'passive', id, isNew: true });
  assert.ok(tacticalScore(card('vitality'), view) > 12, 'leaves room for Phoenix Heart');
  assert.ok(tacticalScore(card('phoenix'), view) < 1, 'takes the Heart when the game offers it');
  view.me.relicSlots = 3;
  view.me.passives = { might: 1, armor: 1 };
  assert.ok(tacticalScore(card('regen'), view) > 12, 'also reserves correctly on a three-slot profile');
});

test('tactical redraws spend only existing player resources', () => {
  const g = new Game({ hero: 'knight', mode: 's15', diff: 'easy', meta: metaBonuses(defaultProfile()), crypts: false, headless: true });
  const d = new Driver(g, { bot: 'idle', pick: 'tactical' });
  const junk = { type: 'weapon', id: 'bell', isNew: true, level: 1 };
  g.player.banishes = 1;
  g.player.rerolls = 2;
  let banned = 0, redraws = 0, rerolls = 0;
  g.banish = () => { banned++; return true; };
  g.redrawCard = () => { redraws++; return { ...junk }; };
  g.levelChoices = () => { rerolls++; return [{ ...junk }]; };
  d.planCards([{ ...junk }]);
  assert.equal(banned, 1);
  assert.equal(redraws, 1);
  assert.equal(rerolls, 2);
  assert.equal(g.player.banishes, 0);
  assert.equal(g.player.rerolls, 0);
  d.planCards([{ ...junk }]);
  assert.equal(rerolls, 2, 'no free retries when exhausted');
  d.detach();
});

test('two-starter heroes can select the same three shared supports as other heroes', () => {
  const v = { hero: 'eanasir', me: { weapons: [
    { id: 'merchantwhip' }, { id: 'goodcopper' }, { id: 'blades' }, { id: 'lightning' },
  ], passives: {}, hpFrac: 1 } };
  assert.ok(tacticalScore({ type: 'weapon', id: 'aura', isNew: true }, v) < 2);
});

test('tactician avoids a solid wall even with loot behind it', () => {
  const tick = TACTICIAN.make({ ult: 1 });
  const v = { t: 0, hero: 'mage', me: { x: 0, y: 0, r: 5, speed: 40, hpFrac: 1, weapons: [], ultReady: true },
    enemies: () => [], shots: () => [], hazards: () => [],
    pickups: () => [{ kind: 'chest', dx: 50, dy: 0, d: 50 }], world: { solid: (x) => x > 8 } };
  const step = tick(v);
  assert.ok(step.x < .2, `walks along the wall, not into it: ${step.x}`);
  assert.equal(step.ult, true);
});
