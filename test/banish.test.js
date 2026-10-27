// BANISH on the level-up screen. The owner (2026-10-20): "have buyable upgrades for banish, reroll,
// etc. We can lose having upgrade skip entirely, only banish and reroll". The card in focus is gone
// for the run: never offered again at a level-up or in a chest, and its place is drawn anew. One a
// run for each rank of the Armory's Exile, as Insight is to REROLL (two free ones too until
// progression, 21 October 2026, which a save from before keeps as Exile ranks); never on a filler.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, isFiller } from '../public/js/game/game.js';
import { GameScreen, LevelUpOverlay, LEVELUP_DELAY, BANISH_GO, BANISH_HOLD, FLIP } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import * as P from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

// A save from before progression (21 October 2026): six slots of each, two banishes and rerolls.
const before = () => P.sanitizeProfile({ v: 3 });

function screen(fn, profile = before()) {
  const oldRandom = Math.random, oldBot = input.bot, oldDevice = input.device;
  Math.random = mulberry32(9);
  try {
    input.bot = { x: 0, y: 0 };
    input.device = 'kb';
    const g = new Game({ hero: 'knight', mode: 's15', meta: P.metaBonuses(profile), settings: { numbers: false } });
    g.player.devGod = true;
    const gs = new GameScreen();
    gs.app = { ui: new UI(), settings: {}, devHold: false, store: {} };
    gs.game = g;
    gs.overlay = null;
    gs.frame(1 / 60);
    return fn(g, gs, g.player);
  } finally {
    input.bot = oldBot;
    input.device = oldDevice;
    input.endFrame();
    input.held.clear();
    Object.assign(input.mouse, { down: false, clicked: false, moved: false, x: -1, y: -1 });
    Math.random = oldRandom;
  }
}

// The level-up screen open and past its first moments.
function openScreen(gs, p) {
  p.addXp((p.xpNext - p.xp) / p.growth / 1.1 + 0.01);
  for (let f = 0; f < 30 && !gs.overlay; f++) gs.frame(1 / 60);
  const lv = gs.overlay;
  assert.ok(lv instanceof LevelUpOverlay);
  while (lv.t < LEVELUP_DELAY + 0.05) gs.frame(1 / 60);
  return lv;
}
// One frame with these keys pressed (and the mouse clicked there, if given).
function press(gs, codes, at) {
  for (const c of codes) input.justDown.add(c);
  if (at) Object.assign(input.mouse, at, { clicked: true });
  gs.frame(1 / 60);
  input.endFrame();
}
const centre = (gs, id) => {
  const it = gs.app.ui.items.find((x) => x.id === id);
  assert.ok(it, id);
  return { x: it.x + it.w / 2, y: it.y + it.h / 2 };
};
const key = (c) => `${c.type}:${c.id}`;
const weapon = (id, level = 1, isNew = true) => ({ type: 'weapon', id, level, isNew });

test('a banish a run for each rank of the Armory\'s Exile (max 5, 250 gold a rank), none without', () => {
  const up = P.UPGRADES.find((u) => u.id === 'banish');
  assert.deepEqual([up.name, up.max, up.cost], ['Exile', 5, 250]);
  screen((g, gs, p) => assert.equal(p.banishes, 0), P.defaultProfile());
  screen((g, gs, p) => assert.equal(p.banishes, 2), before());
  const prof = P.defaultProfile();
  prof.up.banish = 3;
  screen((g, gs, p) => assert.equal(p.banishes, 3), prof);
});

test('Exile is bought, refunded and read back as any Armory upgrade; an old save without it has none', () => {
  let prof = P.defaultProfile();
  prof.gold = 1000;
  let r = P.buyUpgrade(prof, 'banish');
  assert.ok(r.ok);
  r = P.buyUpgrade(r.profile, 'banish');
  assert.ok(r.ok);
  assert.equal(r.profile.up.banish, 2);
  assert.equal(r.profile.gold, 1000 - 125 - 500, 'the first rank at half price');
  const back = P.sanitizeProfile(P.decodeState(P.encodeState(P.packProfile(r.profile))));
  assert.equal(back.up.banish, 2, 'through the cookie and back');
  assert.equal(P.metaBonuses(back).banish, 2);
  assert.equal(P.sanitizeProfile({ up: { banish: 99 } }).up.banish, 5, 'clamped to its max');
  const old = P.sanitizeProfile({ gold: 5, up: { reroll: 2 } });
  assert.equal(old.up.banish, undefined, 'an old save reads as before');
  assert.equal(P.metaBonuses(old).banish, 0);
  assert.equal(P.refundUpgrades(r.profile).refunded, 625, 'refunded with the rest');
});

test('a banished weapon or relic is never offered again, at a level-up or in a chest; a filler is never banished', () => {
  screen((g, gs, p) => {
    assert.equal(g.banish({ type: 'bless' }), false);
    assert.equal(g.banish(g.filler('gold')), false);
    assert.ok(g.banish(weapon('axe')));
    assert.ok(g.banish({ type: 'passive', id: 'might', level: 1, isNew: true }));
    assert.ok(g.banish(weapon('sword', 2, false)), 'his own weapon too: it grows no more by cards');
    const out = new Set(['weapon:axe', 'passive:might', 'weapon:sword']);
    assert.ok(!g.upgradePool().some((c) => out.has(key(c))));
    for (let i = 0; i < 300; i++) for (const c of g.levelChoices(4)) assert.ok(!out.has(key(c)), `${key(c)} offered`);
    g.evolvable = () => [];
    for (let i = 0; i < 100; i++) for (const c of g.rollChest('boss').items) assert.ok(!out.has(key(c)), `${key(c)} in a chest`);
  });
});

test('B banishes the card in focus: it drops away and a card drawn anew flips up in its place', () => {
  screen((g, gs, p) => {
    const lv = openScreen(gs, p), ui = gs.app.ui;
    press(gs, ['ArrowRight']);
    assert.equal(ui.focusId, 'c1');
    const was = lv.choices[1], others = [lv.choices[0], lv.choices[2]];
    assert.ok(!isFiller(was));
    press(gs, ['KeyB']);
    assert.equal(p.banishes, 1, 'one spent');
    assert.ok(g.banished.has(key(was)), 'out of the run');
    assert.notEqual(key(lv.choices[1]), key(was), 'a new card in its place');
    assert.ok(!others.some((c) => key(c) === key(lv.choices[1])), 'not one already on the screen');
    assert.deepEqual([lv.choices[0], lv.choices[2]], others, 'the others stay');
    assert.equal(g.pendingLevels, 1, 'and no card taken');
    assert.ok(lv.heldCard(1) && !lv.heldCard(0), 'the new one held till it is up, the others not');
    press(gs, ['Enter']);
    assert.equal(g.pendingLevels, 1, 'a press on it before then is dropped');
    while (lv.t < lv.flips[1] + FLIP.dur + 0.02) gs.frame(1 / 60);
    assert.ok(lv.flips[1] - lv.gone.t >= BANISH_GO - 1e-9);
    press(gs, ['Enter']);
    assert.equal(g.pendingLevels, 0, 'then it can be taken');
  });
});

test('no banish on a filler card, nor on a maxed build\'s screen of fillers, nor in the first moments', () => {
  screen((g, gs, p) => {
    const levelChoices = g.levelChoices;
    g.levelChoices = () => {
      g.levelChoices = levelChoices;
      return [weapon('axe'), g.filler('bless'), g.filler('heal')];
    };
    const lv = openScreen(gs, p), ui = gs.app.ui;
    press(gs, ['ArrowRight']);
    assert.equal(ui.focusId, 'c1');
    press(gs, ['KeyB']);
    assert.equal(p.banishes, 2, 'a filler is not banished');
    assert.equal(g.banished.size, 0);
    assert.equal(lv.choices[1].type, 'bless');
    // In the screen's first moments B is dropped, as a pick is.
    lv.t = 0.1;
    lv.readyAt = LEVELUP_DELAY;
    press(gs, ['ArrowLeft', 'KeyB']);
    assert.equal(p.banishes, 2, 'not in its first moments');
  });
  screen((g, gs, p) => {
    g.upgradePool = () => [];
    const lv = openScreen(gs, p), ui = gs.app.ui;
    assert.ok(lv.fillersOnly);
    assert.ok(!ui.items.some((it) => it.id === 'banish'), 'no BANISH on the fillers\' screen');
    press(gs, ['KeyB']);
    assert.equal(p.banishes, 2);
  });
});

test('the BANISH button arms the screen: the card clicked next is banished, not taken; again, or Esc, and it is not', () => {
  screen((g, gs, p) => {
    const lv = openScreen(gs, p), ui = gs.app.ui;
    press(gs, [], centre(gs, 'banish'));
    assert.ok(lv.banishing, 'armed');
    gs.frame(1 / 60);
    const was = lv.choices[2];
    press(gs, [], centre(gs, 'c2'));
    assert.ok(g.banished.has(key(was)), 'the card clicked is banished');
    assert.equal(g.pendingLevels, 1, 'not taken');
    assert.ok(!lv.banishing, 'one card, then no longer armed');
    while (lv.busy()) gs.frame(1 / 60);
    press(gs, [], centre(gs, 'banish'));
    assert.ok(lv.banishing);
    press(gs, ['Escape']);
    assert.ok(!lv.banishing, 'Esc lets it go');
    press(gs, [], centre(gs, 'banish'));
    press(gs, [], centre(gs, 'banish'));
    assert.ok(!lv.banishing, 'so does the button again');
    assert.equal(p.banishes, 1);
    press(gs, [], centre(gs, 'c0'));
    assert.equal(g.pendingLevels, 0, 'a click takes a card again');
  });
});

// One frame with a pad's button pressed (down now, up the frame before).
function padPress(gs, b) {
  const pad = input.pad, old = { buttons: pad.buttons, prev: pad.prev };
  pad.buttons = [];
  pad.buttons[b] = true;
  pad.prev = [];
  try {
    gs.frame(1 / 60);
  } finally {
    Object.assign(pad, old);
    input.endFrame();
  }
}

test("a pad's left-stick press only arms BANISH: A on a card then banishes it; the press again, or Esc, lets it go", () => {
  screen((g, gs, p) => {
    const lv = openScreen(gs, p), ui = gs.app.ui;
    press(gs, ['ArrowRight']);
    assert.equal(ui.focusId, 'c1');
    const was = lv.choices[1];
    padPress(gs, 10);
    assert.ok(lv.banishing, 'armed');
    assert.equal(p.banishes, 2, 'the press alone banishes nothing');
    assert.equal(g.banished.size, 0);
    padPress(gs, 0);
    assert.ok(g.banished.has(key(was)), 'A on the card in focus banishes it');
    assert.equal(g.pendingLevels, 1, 'not taken');
    assert.ok(!lv.banishing, 'one card, then no longer armed');
    while (lv.busy()) gs.frame(1 / 60);
    padPress(gs, 10);
    assert.ok(lv.banishing);
    padPress(gs, 10);
    assert.ok(!lv.banishing, 'the press again lets it go');
    padPress(gs, 10);
    press(gs, ['Escape']);
    assert.ok(!lv.banishing, 'so does Esc');
    assert.equal(p.banishes, 1);
    padPress(gs, 0);
    assert.equal(g.pendingLevels, 0, 'A takes a card again');
  });
});

test('on touch a finger held on a card banishes it, and its lift takes nothing; a tap still takes one', () => {
  screen((g, gs, p) => {
    const lv = openScreen(gs, p);
    input.device = 'touch';
    gs.frame(1 / 60);
    const was = lv.choices[0], at = centre(gs, 'c0');
    Object.assign(input.mouse, at, { down: true });
    for (let t = 0; t < BANISH_HOLD - 0.1; t += 1 / 60) gs.frame(1 / 60);
    assert.equal(g.banished.size, 0, 'not yet');
    for (let t = 0; t < 0.15; t += 1 / 60) gs.frame(1 / 60);
    assert.ok(g.banished.has(key(was)), 'held long enough: banished');
    assert.equal(p.banishes, 1);
    for (let t = 0; t < 0.5; t += 1 / 60) gs.frame(1 / 60);
    input.mouse.down = false;
    press(gs, [], at);
    assert.equal(g.pendingLevels, 1, 'the lift takes nothing');
    assert.equal(p.banishes, 1, 'and banishes no more');
    press(gs, [], at);
    assert.equal(g.pendingLevels, 0, 'a tap takes the card');
  });
});

test('on touch a finger that has banished, slid onto another card, neither banishes it nor takes it as it lifts', () => {
  screen((g, gs, p) => {
    const lv = openScreen(gs, p);
    input.device = 'touch';
    gs.frame(1 / 60);
    const next = lv.choices[1], at = centre(gs, 'c0'), on = centre(gs, 'c1');
    assert.ok(!isFiller(next));
    Object.assign(input.mouse, at, { down: true });
    for (let t = 0; t < BANISH_HOLD + 0.05; t += 1 / 60) gs.frame(1 / 60);
    assert.equal(p.banishes, 1, 'the first card banished');
    Object.assign(input.mouse, on);
    for (let t = 0; t < BANISH_HOLD + 0.2; t += 1 / 60) gs.frame(1 / 60);
    assert.equal(p.banishes, 1, 'one banish a touch');
    assert.ok(!g.banished.has(key(next)));
    input.mouse.down = false;
    press(gs, [], on);
    assert.equal(g.pendingLevels, 1, 'its lift takes nothing');
  });
});

test('B is BANISH and a pad\'s left-stick press arms it, and neither is anything else', () => {
  const actions = ['up', 'down', 'left', 'right', 'confirm', 'select', 'back', 'pause', 'ult', 'strike', 'map', 'reroll', 'always', 'one', 'two', 'three', 'four', 'five', 'fps', 'fullscreen'];
  input.justDown.add('KeyB');
  assert.ok(input.pressed('banish'));
  assert.deepEqual([...actions, 'banishArm'].filter((a) => input.pressed(a)), []);
  input.endFrame();
  const pad = input.pad, old = { buttons: pad.buttons, prev: pad.prev };
  pad.buttons = [];
  pad.buttons[10] = true;
  pad.prev = [];
  try {
    assert.ok(input.pressed('banishArm'));
    assert.deepEqual([...actions, 'banish'].filter((a) => input.pressed(a)), [], 'never the instant banish');
  } finally {
    Object.assign(pad, old);
  }
});
