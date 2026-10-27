// A first minute that breathes (order 1, item 4). Going into a crypt is meant: no direction held
// from the spawn walks into one, and a crypt's steps must be pushed up for half a second while its
// prompt fills; stepping off starts over. The XP curve stays the game's own (the side version's
// slower opening was not taken). The first run's hints come once each, and a second run shows none.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, CRYPT_PUSH } from '../public/js/game/game.js';
import { xpFor } from '../public/js/game/player.js';
import { GameScreen } from '../public/js/ui/gamescreen.js';
import { Hints } from '../public/js/game/hints.js';
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

// A seeded Knight on Veteran, unkillable: the clock in real time, he walks at Veteran's speed (moveFor).
function game(fn, seed = 4) {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(seed);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', diff: 'medium', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    g.player.devGod = true;
    return fn(g, g.player);
  } finally {
    input.bot = bot;
    Math.random = random;
  }
}
const real = (g, secs) => {
  for (let i = 0; i < Math.round(secs * 60); i++) g.update(1 / 60);
};

test('no direction held from where the hero starts walks him into a crypt in 6 s', () => {
  for (const [x, y] of [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]) {
    game((g) => {
      const l = Math.hypot(x, y);
      input.bot = { x: x / l, y: y / l };
      for (let i = 0; i < 360; i++) {
        g.update(1 / 60);
        assert.ok(g.state === 'play' && !g.inCrypt, `holding ${x},${y}: still outside at ${(i / 60).toFixed(1)} s`);
      }
    });
  }
});

test("a crypt's steps must be pushed up for half a second, its prompt filling; stepping off starts over", () =>
  game((g, p) => {
    real(g, 0.2);
    const door = g.crypts.find((d) => d.key === '0,0');
    for (const e of g.enemies) e.dead = true;
    g.spawner.update = () => {};
    p.x = door.x;
    p.y = door.y + 6;
    input.bot = { x: 0, y: -1 };
    real(g, 0.3);
    assert.equal(g.cryptDoor, door, 'on its steps: the prompt is up');
    const k = g.doorInfo(door).k;
    assert.ok(k > 0 && k < 1, `it fills (${k.toFixed(2)})`);
    assert.ok(p.y > door.y - 6, 'the crypt walls stop him at its door');
    assert.equal(CRYPT_PUSH, 0.5, 'half a second (the clock is real time)');
    // Off the steps and back: it starts over.
    input.bot = { x: 1, y: 0 };
    real(g, 0.3);
    assert.equal(g.cryptDoor, null);
    assert.equal(door.push, 0);
    p.x = door.x;
    p.y = door.y + 2;
    input.bot = { x: 0, y: -1 };
    real(g, 0.3);
    assert.equal(g.state, 'play', 'not yet');
    real(g, 0.3);
    assert.equal(g.state, 'travel', 'pushed long enough: in he goes');
  }));

test("XP: the game's own curve, 5, 15 ... 185 below level 20, and as it was from there", () => {
  for (let l = 1; l < 20; l++) assert.equal(xpFor(l), 5 + (l - 1) * 10, `level ${l}`);
  for (const [l, xp] of [[20, 200], [21, 218], [39, 542], [40, 560], [41, 615], [100, 3860], [120, 5760]]) assert.equal(xpFor(l), xp, `level ${l}`);
});

test("the first run's hints come once each, and a second run shows none", () => {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(6);
  input.bot = { x: 0, y: 0 };
  const settings = { numbers: false };
  let saved = 0;
  const app = {
    ui: new UI(), settings, devHold: false, choice: { hero: 'knight', mode: 's15', diff: 'medium' },
    // The Knight's ultimate open (shared/progress.js), so his orb fills and its hint comes.
    store: { profile: { ...defaultProfile(), uu: 1 }, submitRun: async () => ({ collected: 0, bonus: 0, total: 0, multiplier: 1 }) },
    go() {},
  };
  const frames = (gs, n) => {
    for (let i = 0; i < n; i++) {
      gs.frame(1 / 60);
      input.endFrame();
    }
  };
  const said = (g) => g.banners.map((b) => b.title);
  // A hint counts as said once its banner has played out in full (hints.js, 27 October 2026).
  const playOut = (g, title) => {
    const b = g.banners.find((x) => x.title === title);
    b.t = b.dur;
    g.hints.update();
  };
  try {
    let gs = new GameScreen();
    gs.enter(app);
    let g = gs.game;
    g.player.devGod = true;
    g.hints.save = () => saved++;
    frames(gs, 150);
    assert.ok(said(g).includes('WASD or arrows to move'), 'how to move, a moment in');
    assert.ok(!settings.hints?.move, 'not counted before it has played out');
    playOut(g, 'WASD or arrows to move');
    assert.equal(settings.hints.move, 1);
    assert.equal(saved, 0, 'nothing written while the run lasts');
    // The first level-up screen closes: the weapons' hint.
    g.pendingLevels = 1;
    frames(gs, 2);
    gs.overlay.choose(0);
    frames(gs, 2);
    assert.ok(said(g).includes('Your weapons strike by themselves'));
    playOut(g, 'Your weapons strike by themselves');
    assert.equal(settings.hints.levelup, 1, "a card taken from the first level-up screen: its footer's said");
    g.player.addFury(100);
    frames(gs, 2);
    assert.ok(said(g).includes('Fury full: SPACE'));
    playOut(g, 'Fury full: SPACE');
    g.finish(false);
    assert.equal(saved, 1, 'the run over: remembered, once');
    assert.ok(settings.hints.move && settings.hints.weapons && settings.hints.fury, 'what has played out counts as said');
    assert.ok(!settings.hints.crypt, 'a hint never shown comes in a later run');
    gs.leave();
    // A second run: none of them.
    gs = new GameScreen();
    gs.enter(app);
    g = gs.game;
    g.player.devGod = true;
    frames(gs, 150);
    g.pendingLevels = 1;
    frames(gs, 2);
    gs.overlay.choose(0);
    g.player.addFury(100);
    frames(gs, 4);
    for (const t of ['WASD or arrows to move', 'Your weapons strike by themselves', 'Fury full: SPACE', 'A crypt']) assert.ok(!said(g).includes(t), `no "${t}"`);
    gs.leave();
  } finally {
    Math.random = random;
    input.bot = bot;
  }
});

// The first soul gem has its hint, and the first level-up screen a footer that tells what a card is
// (hints.js, 27 October 2026). A player whose first run ended before then (settings.hintsDone)
// counts both as said.
test("the first gem's hint and the first level-up screen's footer", () => {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(6);
  input.bot = { x: 0, y: 0 };
  const settings = { numbers: false, hints: {} };
  const app = {
    ui: new UI(), settings, devHold: false, choice: { hero: 'knight', mode: 's15', diff: 'medium' },
    store: { profile: defaultProfile(), submitRun: async () => ({ collected: 0, bonus: 0, total: 0, multiplier: 1 }) },
    go() {},
  };
  const frames = (gs, n) => {
    for (let i = 0; i < n; i++) {
      gs.frame(1 / 60);
      input.endFrame();
    }
  };
  try {
    const gs = new GameScreen();
    gs.enter(app);
    const g = gs.game;
    g.player.devGod = true;
    g.hints.save = () => {};
    g.hints.gemTaken = true;
    frames(gs, 150); // past the opening's first moments, as the hints above wait for
    assert.ok(g.banners.some((b) => b.title === 'A soul gem'), 'the first gem picked up');
    g.pendingLevels = 1;
    frames(gs, 2);
    const overlay = gs.overlay;
    assert.equal(overlay.teach, true, 'the first level-up screen teaches');
    overlay.choose(0);
    assert.equal(settings.hints.levelup, 1);
    gs.leave();
  } finally {
    Math.random = random;
    input.bot = bot;
  }
  const g = { hints: null };
  assert.ok(new Hints(g, { hintsDone: true }, () => {}).said('gem'), 'a first run from before knew it');
  assert.ok(!new Hints(g, { hintsDone: true }, () => {}).said('crypt'), 'but not one it never saw');
});
