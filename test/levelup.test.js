// The level-up screen as a reward (order 2 item 5): a card that completes an evolution is told
// (Game.completesEvolution, both ways it can), and the cards flip up before any can be taken; a
// press during the flips is kept and taken when they end, never early.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, MILESTONES } from '../public/js/game/game.js';
import { GameScreen, LevelUpOverlay, cardsReadyAt } from '../public/js/ui/gamescreen.js';
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
    assert.ok(Math.abs(lv.readyAt - 0.45) < 1e-9, 'four cards are up by 0.45 s');
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

test('no card can be taken before the flips end; a key pressed during them is taken when they do', () => {
  screen((g, gs, p) => {
    gainLevel(p);
    const lv = openScreen(gs);
    assert.ok(lv.t < 0.1, 'just opened');
    input.justDown.add('Digit1');
    gs.frame(1 / 60);
    input.endFrame();
    assert.equal(g.pendingLevels, 1, 'not taken during the flips');
    assert.equal(lv.pending, 0, 'but kept');
    const ready = cardsReadyAt(lv.choices.length);
    while (lv.t < ready - 1 / 60 - 1e-9) {
      gs.frame(1 / 60);
      assert.equal(g.pendingLevels, 1, `still waiting at ${lv.t.toFixed(3)} s`);
    }
    for (let f = 0; f < 3 && g.pendingLevels; f++) gs.frame(1 / 60);
    assert.equal(g.pendingLevels, 0, 'taken once the last card is up');
    assert.ok(lv.t >= ready && lv.t < ready + 0.05, `taken at ${lv.t.toFixed(3)} s, the flips over at ${ready.toFixed(3)} s`);
  });
});

test('a click on a card during the flips is kept, not lost and not early', () => {
  screen((g, gs, p) => {
    gainLevel(p);
    const lv = openScreen(gs);
    // Where the second card stands once up (drawn on a spare screen past the flips, then reset).
    const spare = new LevelUpOverlay(gs);
    spare.choices = lv.choices;
    spare.draw(ctx, 480, 270, 1);
    const card = gs.app.ui.items.find((it) => it.id === 'c1');
    assert.ok(card);
    Object.assign(input.mouse, { x: card.x + card.w / 2, y: card.y + card.h / 2, clicked: true });
    gs.frame(1 / 60);
    input.endFrame();
    assert.equal(g.pendingLevels, 1);
    assert.equal(lv.pending, 1);
    for (let f = 0; f < 40 && g.pendingLevels; f++) gs.frame(1 / 60);
    assert.equal(g.pendingLevels, 0);
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
