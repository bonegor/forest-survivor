// Touch in a run. While playing, a finger steers (the virtual stick), a second one strikes, and the
// pause button and the fury orb are buttons; with a screen up over the game (level-up, chest, gear,
// pause, results) a touch is only a tap on it, and fingers already down as it opened let go: the
// steering finger stops steering, and neither its lift nor a striking finger's is a click.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { GameScreen, LevelUpOverlay, PauseOverlay, LEVELUP_DELAY } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { input, initInput } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');
// The canvas fills a 480×270 page at scale 1: a touch's page position is its UI position.
const rect = () => ({ left: 0, top: 0, width: 480, height: 270 });
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270, canvas: { getBoundingClientRect: rect } });

// The input layer's own touch handlers, on a stand-in canvas (and a window for the keys).
const on = {};
const hadWindow = 'window' in globalThis;
if (!hadWindow) globalThis.window = { addEventListener() {} };
initInput({ addEventListener: (type, fn) => { on[type] = fn; }, focus() {} });
if (!hadWindow) delete globalThis.window;
const touch = (type, id, x, y) => on[type]({ preventDefault() {}, changedTouches: [{ identifier: id, clientX: x, clientY: y }] });

const frame = (gs) => {
  gs.frame(1 / 60);
  input.endFrame();
};
const levelUp = (p) => p.addXp((p.xpNext - p.xp) / p.growth / 1.1 + 0.01);
const centre = (gs, id) => {
  const it = gs.app.ui.items.find((i) => i.id === id);
  assert.ok(it, `${id} is on screen`);
  return [it.x + it.w / 2, it.y + it.h / 2];
};

// A Veteran run on a game screen of its own, as the trial screen starts one.
function run(fn) {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(3);
  input.bot = null;
  const gs = new GameScreen();
  try {
    const store = { profile: defaultProfile(), submitRun: async () => ({ collected: 0, bonus: 0, total: 0, multiplier: 1 }) };
    gs.enter({ ui: new UI(), settings: { numbers: false }, devHold: false, choice: { hero: 'knight', mode: 's15', diff: 'medium' }, store });
    gs.game.player.devGod = true;
    frame(gs);
    return fn(gs, gs.game, gs.game.player);
  } finally {
    gs.leave();
    input.releaseTouches();
    input.endFrame();
    input.bot = bot;
    Math.random = random;
  }
}

// Plays until the level-up screen is up (after the beam's lead-in, Game MOMENT.levelup) and, unless
// told not to, past its first moments (LEVELUP_DELAY), when no card can be taken.
function openLevelUp(gs, p, past = true) {
  levelUp(p);
  for (let f = 0; f < 30 && !gs.overlay; f++) frame(gs);
  assert.ok(gs.overlay instanceof LevelUpOverlay);
  while (past && gs.overlay.t < LEVELUP_DELAY + 0.05) frame(gs);
  return gs.overlay;
}

test('in play a finger steers, a second one strikes, and the pause button pauses', () => {
  run((gs, g) => {
    touch('touchstart', 1, 200, 150);
    assert.ok(input.stick.active, 'the finger is the stick');
    touch('touchmove', 1, 230, 150);
    assert.ok(input.axis().x > 0.9, 'dragged right, the hero walks right');
    touch('touchstart', 2, 100, 100);
    assert.ok(input.pressed('strike'), 'a second finger strikes');
    touch('touchend', 2, 100, 100);
    touch('touchend', 1, 230, 150);
    assert.ok(!input.stick.active);
    input.endFrame();
    touch('touchstart', 3, 240, 265);
    touch('touchend', 3, 240, 265);
    frame(gs);
    assert.equal(g.state, 'paused', 'the ⏸ button');
  });
});

test('with the level-up screen up, a tap takes the card tapped, and play has the stick back', () => {
  run((gs, g, p) => {
    const lv = openLevelUp(gs, p);
    assert.ok(!input.joystickEnabled && !input.touchRegions, 'no stick and no touch buttons under it');
    const picked = [], choose = lv.choose;
    lv.choose = function (i, a) {
      picked.push(i);
      return choose.call(this, i, a);
    };
    const [x, y] = centre(gs, 'c1');
    touch('touchstart', 1, x, y);
    assert.ok(!input.stick.active, 'the touch is no stick');
    touch('touchstart', 2, 20, 20);
    assert.ok(!input.pressed('strike'), 'nor is a second finger a strike');
    touch('touchend', 2, 20, 20);
    touch('touchend', 1, x, y);
    frame(gs);
    assert.deepEqual(picked, [1], 'the card tapped is taken');
    assert.ok(gs.overlay === null);
    assert.equal(g.state, 'play');
    assert.ok(input.joystickEnabled && input.touchRegions, 'in play again: the stick and the touch buttons');
    touch('touchstart', 3, x, y);
    assert.ok(input.stick.active, 'the same touch now steers');
    touch('touchend', 3, x, y);
  });
});

test("a tap on a card in the screen's first moments focuses it and takes nothing, now or later", () => {
  run((gs, g, p) => {
    const lv = openLevelUp(gs, p, false);
    frame(gs);
    assert.ok(lv.t < LEVELUP_DELAY);
    const [x, y] = centre(gs, 'c2');
    touch('touchstart', 1, x, y);
    touch('touchend', 1, x, y);
    frame(gs);
    assert.equal(gs.app.ui.focusId, 'c2', 'the card tapped is in focus');
    assert.equal(g.pendingLevels, 1, 'not taken');
    while (lv.t < LEVELUP_DELAY + 0.05) frame(gs);
    assert.equal(g.pendingLevels, 1, 'nor kept for later');
    touch('touchstart', 2, x, y);
    touch('touchend', 2, x, y);
    frame(gs);
    assert.equal(g.pendingLevels, 0, 'a tap after them takes it');
  });
});

test('REROLL, over the pause button, rerolls under the level-up screen rather than being the pause button', () => {
  run((gs, g, p) => {
    p.rerolls = 2;
    const lv = openLevelUp(gs, p);
    const before = lv.choices;
    const [x, y] = centre(gs, 'reroll');
    touch('touchstart', 1, x, y);
    assert.ok(!input.pressed('pause'));
    touch('touchend', 1, x, y);
    frame(gs);
    assert.equal(p.rerolls, 1, 'rerolled');
    assert.notEqual(lv.choices, before);
    assert.ok(gs.overlay === lv, 'still choosing');
    assert.equal(g.state, 'levelup');
  });
});

test('fingers down as a screen opens let go: no steering on, and their lift is no click', () => {
  run((gs, g, p) => {
    touch('touchstart', 1, 240, 150);
    touch('touchmove', 1, 250, 150);
    touch('touchstart', 2, 100, 100); // and a strike, held
    assert.ok(input.stick.active);
    const lv = openLevelUp(gs, p);
    assert.ok(!input.stick.active, 'the stick let go');
    assert.deepEqual(input.axis(), { x: 0, y: 0 });
    // Both fingers lift on a card, past the screen's lock.
    const [x, y] = centre(gs, 'c0');
    touch('touchmove', 1, x, y);
    touch('touchmove', 2, x, y);
    touch('touchend', 1, x, y);
    touch('touchend', 2, x, y);
    assert.ok(!input.mouse.clicked, 'no click from either');
    frame(gs);
    assert.ok(gs.overlay === lv, 'no card taken');
    assert.equal(g.pendingLevels, 1);
  });
});

test('a run left behind (focus lost, tab hidden) pauses under the PAUSED panel', () => {
  run((gs, g) => {
    input.away = true;
    frame(gs);
    assert.equal(g.state, 'paused');
    assert.ok(gs.overlay instanceof PauseOverlay);
  });
});
