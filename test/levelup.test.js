// The level-up screen as a reward (order 2 item 5): a card that completes an evolution is told
// (Game.completesEvolution, both ways it can), and the cards flip up before any can be taken; a
// press during the flips is kept and taken when they end, never early.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, MILESTONES } from '../public/js/game/game.js';
import { GameScreen, LevelUpOverlay, cardsReadyAt, LEVELUP_DELAY } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

function screen(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(5);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    g.player.devGod = true;
    const gs = new GameScreen();
    gs.app = { ui: new UI(), settings: {}, devHold: false, store: {} };
    gs.game = g;
    gs.overlay = null;
    gs.frame(1 / 60);
    return fn(g, gs, g.player);
  } finally {
    input.bot = oldBot;
    input.endFrame();
    input.held.clear();
    Math.random = oldRandom;
  }
}

const sword = (p) => p.weapons.find((w) => w.id === 'sword');
const toLevel = (w, n) => {
  while (w.level < n) w.levelUp();
};
const levelCard = (id, level) => ({ type: 'weapon', id, level });
const relicCard = (id) => ({ type: 'passive', id, level: 1, isNew: true });

test('a level that tops a weapon with its relic held completes its evolution', () => {
  screen((g, gs, p) => {
    toLevel(sword(p), 7);
    assert.equal(g.completesEvolution(levelCard('sword', 8)), null, 'no Giant’s Might held yet');
    g.addPassive('might', 1);
    assert.equal(g.completesEvolution(levelCard('sword', 8)), 'excalibur');
    assert.equal(g.completesEvolution(levelCard('sword', 7)), null, 'a level short of the top completes nothing');
  });
  screen((g, gs, p) => {
    toLevel(sword(p), 7);
    g.addPassive('phoenix', 1);
    assert.equal(g.completesEvolution(levelCard('sword', 8)), 'excalibur', 'the Phoenix Heart pairs with any weapon');
  });
});

test('a new relic that pairs with a weapon already at the top completes its evolution', () => {
  screen((g, gs, p) => {
    toLevel(sword(p), 8);
    assert.equal(g.completesEvolution(relicCard('might')), 'excalibur');
    assert.equal(g.completesEvolution(relicCard('phoenix')), 'excalibur', 'the Phoenix Heart pairs with any');
    assert.equal(g.completesEvolution(relicCard('regen')), null, 'a relic of another weapon');
    sword(p).evolve();
    assert.equal(g.completesEvolution(relicCard('might')), null, 'nothing left to complete once evolved');
  });
});

test('a card that completes an evolution has the gold back; a NEW weapon the blue, a NEW relic the green', () => {
  screen((g, gs, p) => {
    toLevel(sword(p), 8);
    g.levelChoices = () => [relicCard('might'), { type: 'weapon', id: 'axe', level: 1, isNew: true }, relicCard('regen'), levelCard('sword', 8)];
    g.state = 'levelup';
    g.pendingLevels = 1;
    const lv = new LevelUpOverlay(gs);
    assert.deepEqual(lv.backs, ['gold', 'weapon', 'relic', 'plain']);
    assert.deepEqual(lv.completes, ['excalibur', null, null, null]);
    assert.ok(Math.abs(cardsReadyAt(4) - 0.45) < 1e-9, 'four cards are up by 0.45 s');
    assert.equal(lv.readyAt, LEVELUP_DELAY, 'but none can be taken in its first second');
    lv.draw(ctx, 480, 270, 0.6); // draws face up with its callout and LUCKY! (no throw)
  });
});

// Plays on until the level-up screen opens, after the beam's lead-in.
function openScreen(gs) {
  for (let f = 0; f < 30 && !gs.overlay; f++) gs.frame(1 / 60);
  assert.ok(gs.overlay instanceof LevelUpOverlay);
  return gs.overlay;
}
const gainLevel = (p) => p.addXp((p.xpNext - p.xp) / p.growth / 1.1 + 0.01);

// One frame with these keys pressed (and the mouse clicked, if given).
function press(gs, codes, mouse) {
  for (const c of codes) input.justDown.add(c);
  if (mouse) Object.assign(input.mouse, mouse, { clicked: true });
  gs.frame(1 / 60);
  input.endFrame();
}

test('for its first second no key picks a card, and a press then is dropped, not kept for later', () => {
  screen((g, gs, p) => {
    gainLevel(p);
    const lv = openScreen(gs);
    assert.ok(lv.t < 0.1, 'just opened');
    assert.equal(LEVELUP_DELAY, 1);
    press(gs, ['Digit1']);
    assert.equal(g.pendingLevels, 1, 'not taken in the first second');
    while (lv.t < LEVELUP_DELAY + 0.1) {
      gs.frame(1 / 60);
      assert.equal(g.pendingLevels, 1, `the early press stays dropped at ${lv.t.toFixed(3)} s`);
    }
    press(gs, ['Digit1']);
    assert.equal(g.pendingLevels, 0, 'a press after the first second takes the card');
  });
});

test('Space (the ultimate) never picks a card, before or after the first second; Enter does once it is up', () => {
  screen((g, gs, p) => {
    gainLevel(p);
    const lv = openScreen(gs);
    press(gs, ['Space']);
    while (lv.t < LEVELUP_DELAY + 0.1) press(gs, ['Space']);
    assert.equal(g.pendingLevels, 1, 'Space mashed all through picks nothing');
    press(gs, ['Enter']);
    assert.equal(g.pendingLevels, 0, 'Enter takes the focused card');
  });
});

test('a click on a card in the first second is dropped; one after it takes the card', () => {
  screen((g, gs, p) => {
    gainLevel(p);
    const lv = openScreen(gs);
    // Where the second card stands once up (drawn on a spare screen past the delay).
    const spare = new LevelUpOverlay(gs);
    spare.choices = lv.choices;
    spare.draw(ctx, 480, 270, LEVELUP_DELAY + 0.1);
    const card = gs.app.ui.items.find((it) => it.id === 'c1');
    assert.ok(card);
    const at = { x: card.x + card.w / 2, y: card.y + card.h / 2 };
    press(gs, [], at);
    assert.equal(g.pendingLevels, 1, 'not taken in the first second');
    while (lv.t < LEVELUP_DELAY + 0.1) gs.frame(1 / 60);
    assert.equal(g.pendingLevels, 1, 'and not kept for later');
    press(gs, [], at);
    assert.equal(g.pendingLevels, 0, 'a click after the first second takes it');
  });
});

test('a milestone level (10, 25, 50, 100) has its stamp on the screen, once', () => {
  assert.deepEqual(MILESTONES, [10, 25, 50, 100]);
  screen((g, gs, p) => {
    p.level = 10;
    g.state = 'levelup';
    g.pendingLevels = 1;
    const lv = new LevelUpOverlay(gs);
    lv.draw(ctx, 480, 270, 0.05);
    assert.ok(g.milestones.has(10), 'told on the screen');
    assert.equal(g.milestoneDue(10), false, 'once: the stinger never plays again for it');
    assert.equal(g.milestoneDue(11), false, 'not a milestone');
    assert.equal(g.milestoneDue(25), true);
  });
});
