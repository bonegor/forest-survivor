// The level-up screen as a reward (order 2 item 5): a card that completes an evolution is told
// (Game.completesEvolution, both ways it can), and the cards flip up before any can be taken. The
// owner (2026-10-20): in its first moments (LEVELUP_DELAY) the focus moves but nothing is taken; a
// press then is dropped, never kept for later.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, MILESTONES, CARD_WEIGHT, SIGNATURE_PITY } from '../public/js/game/game.js';
import { GameScreen, LevelUpOverlay, PauseOverlay, cardsReadyAt, LEVELUP_DELAY, cardChange } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { sanitizeProfile, metaBonuses, openFor } from '../public/js/shared/profile.js';
import { PASSIVES } from '../public/js/data/passives.js';

// A save from before progression (21 October 2026): six weapon and relic slots, two rerolls and
// banishes, as these tests were written for.
const before = () => sanitizeProfile({ v: 3 });

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

function screen(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(5);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(before()), settings: { numbers: false }, ...o });
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
    assert.equal(lv.readyAt, LEVELUP_DELAY, 'but none can be taken in its first moments');
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

// The cards taken, by index, as the screen takes them.
function picks(lv) {
  const picked = [], choose = lv.choose;
  lv.choose = function (i, a) {
    picked.push(i);
    return choose.call(this, i, a);
  };
  return picked;
}

test('in its first moments the focus moves (arrows, a number) but no card is taken, and a press then is dropped', () => {
  screen((g, gs, p) => {
    gainLevel(p);
    const lv = openScreen(gs), ui = gs.app.ui, picked = picks(lv);
    assert.ok(lv.t < 0.1, 'just opened');
    assert.equal(LEVELUP_DELAY, 0.75);
    const choices = lv.choices, rerolls = p.rerolls, banishes = p.banishes;
    press(gs, ['ArrowRight']);
    assert.equal(ui.focusId, 'c1', 'right moves the focus at once, the cards still flipping');
    press(gs, ['ArrowLeft']);
    assert.equal(ui.focusId, 'c0', 'and left back');
    press(gs, ['Digit3']);
    assert.equal(ui.focusId, 'c2', "a card's number only moves the focus there");
    press(gs, ['Enter']);
    press(gs, ['KeyR']);
    press(gs, ['KeyB']);
    assert.ok(lv.heldCard(2) && lv.busy());
    assert.equal(g.pendingLevels, 1, 'nothing taken');
    assert.equal(lv.choices, choices, 'no reroll');
    assert.equal(p.rerolls, rerolls);
    assert.equal(p.banishes, banishes, 'no banish');
    assert.equal(g.banished.size, 0);
    while (lv.t < LEVELUP_DELAY + 0.05) {
      gs.frame(1 / 60);
      assert.equal(g.pendingLevels, 1, `the early presses stay dropped at ${lv.t.toFixed(3)} s`);
    }
    assert.ok(!lv.heldCard(2) && !lv.busy());
    assert.equal(ui.focusId, 'c2', 'the focus kept');
    press(gs, ['Enter']);
    assert.deepEqual(picked, [2], 'Enter takes the card in focus once the moment is past');
    assert.equal(g.pendingLevels, 0);
  });
});

test('Space (the ultimate) never picks a card, in its first moments or after; Enter does once it is up', () => {
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

test('in its first moments the mouse over a card, or a click or tap on it, focuses it and takes nothing', () => {
  screen((g, gs, p) => {
    gainLevel(p);
    const lv = openScreen(gs), ui = gs.app.ui, picked = picks(lv);
    gs.frame(1 / 60);
    const rect = (id) => ui.items.find((it) => it.id === id);
    assert.ok(rect('c1') && rect('c2'), 'the cards are there to focus, held as they are');
    const centre = (id) => ({ x: rect(id).x + rect(id).w / 2, y: rect(id).y + rect(id).h / 2 });
    Object.assign(input.mouse, centre('c2'), { moved: true });
    gs.frame(1 / 60);
    input.endFrame();
    assert.equal(ui.focusId, 'c2', 'the mouse over a card focuses it');
    press(gs, [], centre('c1'));
    assert.equal(ui.focusId, 'c1', 'a click focuses the card');
    assert.equal(g.pendingLevels, 1, 'and takes nothing');
    while (lv.t < LEVELUP_DELAY + 0.1) gs.frame(1 / 60);
    assert.equal(g.pendingLevels, 1, 'nor is it kept for later');
    press(gs, [], centre('c1'));
    assert.deepEqual(picked, [1], 'a click after it takes the card');
  });
});

test("the next screen of a chain, and a reroll, wait only for their flips: browsing on, presses dropped", () => {
  screen((g, gs, p) => {
    gainLevel(p);
    gainLevel(p);
    const lv = openScreen(gs), ui = gs.app.ui;
    assert.equal(g.pendingLevels, 2);
    while (lv.t < LEVELUP_DELAY + 0.05) gs.frame(1 / 60);
    press(gs, ['Digit1']);
    assert.equal(g.pendingLevels, 1, 'the first level taken');
    assert.ok(gs.overlay === lv, 'the next level on the same screen');
    assert.ok(Math.abs(lv.readyAt - cardsReadyAt(lv.choices.length)) < 1e-9, 'held for its flips alone');
    assert.ok(lv.heldCard(0));
    press(gs, ['ArrowRight']);
    assert.equal(ui.focusId, 'c1', 'the focus moves while they flip');
    press(gs, ['Enter']);
    assert.equal(g.pendingLevels, 1, 'a press during them is dropped');
    while (lv.t < lv.readyAt + 0.02) gs.frame(1 / 60);
    const rerolls = p.rerolls;
    press(gs, ['KeyR']);
    assert.equal(p.rerolls, rerolls - 1, 'R rerolls once it is up');
    assert.ok(Math.abs(lv.readyAt - cardsReadyAt(lv.choices.length)) < 1e-9 && lv.t < lv.readyAt, 'the new cards held for their flips');
    press(gs, ['KeyR']);
    assert.equal(p.rerolls, rerolls - 1, 'R again during them is dropped');
    while (lv.t < lv.readyAt + 0.02) gs.frame(1 / 60);
    press(gs, ['Enter']);
    assert.equal(g.pendingLevels, 0);
  });
});

test('while held the screen draws its cards greyed, the focus framed in grey, and no BANISH or REROLL to press', () => {
  screen((g, gs, p) => {
    gainLevel(p);
    const lv = openScreen(gs), ui = gs.app.ui;
    while (lv.t < 0.5) gs.frame(1 / 60);
    // (The world drains to grey the same way when the hero falls, so only the screen is watched.)
    let ops = [];
    const comp = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), 'globalCompositeOperation');
    const spy = { set(v) { ops.push(v); }, get() { return 'source-over'; }, configurable: true };
    Object.defineProperty(ctx, 'globalCompositeOperation', spy);
    try {
      lv.draw(ctx, 480, 270, 1 / 60);
      assert.equal(ops.filter((o) => o === 'saturation').length, lv.choices.length, 'each card drained of its colours');
      assert.ok(!ui.items.some((it) => it.id === 'banish' || it.id === 'reroll'), 'the buttons only drawn, greyed');
      while (lv.t < LEVELUP_DELAY + 0.05) gs.frame(1 / 60);
      ops = [];
      lv.draw(ctx, 480, 270, 1 / 60);
      assert.ok(!ops.includes('saturation'), 'past it, in their colours');
      assert.ok(ui.items.some((it) => it.id === 'banish') && ui.items.some((it) => it.id === 'reroll'), 'and the buttons are buttons');
    } finally {
      delete ctx.globalCompositeOperation;
      if (comp) Object.defineProperty(Object.getPrototypeOf(ctx), 'globalCompositeOperation', comp);
    }
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

// The owner's (27 October 2026): a weapon's relic is not told until a run before has made its
// evolution; then whether it is owned, may still come, or is blocked this run.
const known = (evos) => ({ open: { ...openFor(before(), 'knight'), evos } });

test('an evolution not yet made keeps its relic unknown: no name, and no gold back on its new relic', () => {
  screen((g, gs, p) => {
    assert.equal(g.evoKnown('sword'), false);
    assert.deepEqual(g.evoState('sword'), { state: 'unknown' });
    toLevel(sword(p), 8);
    g.levelChoices = () => [relicCard('might'), levelCard('axe', 2)];
    g.state = 'levelup';
    g.pendingLevels = 1;
    const lv = new LevelUpOverlay(gs);
    assert.deepEqual(lv.completes, [null, null], 'a gold back would name the relic');
    assert.deepEqual(lv.backs, ['relic', 'plain']);
    lv.draw(ctx, 480, 270, 0.6); // its hint drawn as a relic yet unknown (no throw)
    // A Phoenix Heart held evolves any: owned, known or not.
    g.addPassive('phoenix', 1);
    assert.deepEqual(g.evoState('sword'), { relic: 'phoenix', state: 'owned' });
  }, known([]));
  screen((g, gs, p) => {
    toLevel(sword(p), 8);
    g.levelChoices = () => [relicCard('might')];
    g.state = 'levelup';
    g.pendingLevels = 1;
    assert.deepEqual(new LevelUpOverlay(gs).completes, ['excalibur'], 'once known, told');
  }, known(['excalibur']));
});

test('a known evolution says its relic is owned, may come, or is blocked this run', () => {
  screen((g, gs, p) => {
    assert.deepEqual(g.evoState('sword'), { relic: 'might', state: 'open' });
    g.addWeapon('axe');
    assert.deepEqual(g.evoState('axe'), { relic: 'area', state: 'locked' }, "Giant's Belt not yet opened");
    g.banish({ type: 'passive', id: 'might' });
    assert.deepEqual(g.evoState('sword'), { relic: 'might', state: 'banished' });
    g.banished.clear();
    g.maxRelics = 1;
    g.addPassive('armor', 1);
    assert.deepEqual(g.evoState('sword'), { relic: 'might', state: 'full' });
    g.maxRelics = 6;
    g.addPassive('might', 1);
    assert.deepEqual(g.evoState('sword'), { relic: 'might', state: 'owned' });
    // The pause screen shows them after each weapon (no throw).
    g.state = 'paused';
    gs.app.ui.lockT = 0;
    new PauseOverlay(gs).draw(ctx, 480, 270, 0.1);
  }, known(['excalibur', 'whirlwind']));
  // With no profile's open (the tests, the bots) every evolution is known.
  screen((g) => assert.equal(g.evoKnown('sword'), true));
});

test('the hero\'s own signature weighs 6, and a new relic that partners a weapon he holds two and a half times its weight', () => {
  screen((g, gs, p) => {
    const pool = g.upgradePool(), of = (type, id) => pool.find((c) => c.type === type && c.id === id);
    assert.equal(of('weapon', 'sword').weight, CARD_WEIGHT.signature);
    assert.equal(of('weapon', 'axe').weight, CARD_WEIGHT.fresh);
    assert.ok(Math.abs(of('passive', 'might').weight - (PASSIVES.might.weight || 1) * CARD_WEIGHT.freshRelic * CARD_WEIGHT.partner) < 1e-9, 'the Longsword\'s partner');
    assert.ok(Math.abs(of('passive', 'regen').weight - (PASSIVES.regen.weight || 1) * CARD_WEIGHT.freshRelic) < 1e-9, 'a relic of no weapon he holds');
    sword(p).evolve();
    assert.ok(Math.abs(g.upgradePool().find((c) => c.id === 'might').weight - (PASSIVES.might.weight || 1) * CARD_WEIGHT.freshRelic) < 1e-9, 'evolved: no partner more');
  });
});

test('after two level-up screens without his signature the next offers it, and a reroll is the same screen', () => {
  screen((g, gs, p) => {
    assert.equal(SIGNATURE_PITY, 2);
    g.drawUpgrades = (n, pool) => pool.filter((c) => c.id !== 'sword').slice(0, n); // a draw that never takes it
    const has = (cards) => cards.some((c) => c.id === 'sword');
    g.pendingLevels = 1;
    p.level = 2;
    assert.ok(!has(g.levelChoices(3)));
    p.level = 3;
    assert.ok(!has(g.levelChoices(3)));
    assert.ok(!has(g.levelChoices(3)), 'a reroll of the second screen is still the second');
    p.level = 4;
    const third = g.levelChoices(3);
    assert.ok(has(third), 'the third screen offers it for certain');
    assert.equal(third.length, 3);
    assert.ok(has(g.levelChoices(3)), 'and its reroll too');
    p.level = 5;
    assert.ok(!has(g.levelChoices(3)), 'then the count starts over');
  });
});

test('an upgrade card says its change in numbers, as this hero has it', () => {
  screen((g, gs, p) => {
    assert.equal(cardChange(g, levelCard('sword', 3)), 'Damage 42 → {44} (+5%)');
    assert.equal(cardChange(g, relicCard('regen')), 'Health a second 0.3 → {0.9}', "the Knight's regeneration twice");
    assert.equal(cardChange(g, relicCard('phoenix')), null, 'nothing to measure');
    assert.equal(cardChange(g, { type: 'weapon', id: 'axe', level: 1, isNew: true }), null, 'a NEW weapon');
    assert.equal(cardChange(g, g.filler('bless')), null, 'a filler');
    assert.equal(p.passives.size, 0, 'and nothing is changed');
  });
});
