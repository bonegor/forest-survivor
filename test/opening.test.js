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
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { GAME_SPEED } from '../public/js/data/difficulty.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

// A seeded Knight on Normal at the game's own pace, unkillable.
function game(fn, seed = 4) {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(seed);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', diff: 'medium', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, pace: GAME_SPEED });
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
    assert.ok(Math.abs(CRYPT_PUSH / GAME_SPEED - 0.5) < 0.01, 'half a second of real time');
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
    store: { profile: defaultProfile(), submitRun: async () => ({ collected: 0, bonus: 0, total: 0, multiplier: 1 }) },
    go() {},
  };
  const frames = (gs, n) => {
    for (let i = 0; i < n; i++) {
      gs.frame(1 / 60);
      input.endFrame();
    }
  };
  const said = (g) => g.banners.map((b) => b.title);
  try {
    let gs = new GameScreen();
    gs.enter(app);
    let g = gs.game;
    g.player.devGod = true;
    g.hints.save = () => saved++;
    frames(gs, 150);
    assert.ok(said(g).includes('WASD or arrows to move'), 'how to move, a moment in');
    assert.equal(saved, 0, 'nothing written while the run lasts');
    // The first level-up screen closes: the weapons' hint.
    g.pendingLevels = 1;
    frames(gs, 2);
    gs.overlay.choose(0);
    frames(gs, 2);
    assert.ok(said(g).includes('Your weapons strike by themselves'));
    g.player.addFury(100);
    frames(gs, 2);
    assert.ok(said(g).includes('Fury full: SPACE'));
    g.finish(false);
    assert.equal(saved, 1, 'the run over: remembered, once');
    assert.ok(settings.hintsDone && settings.hints.crypt, 'every hint counts as said');
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
