import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { loadSettings } from '../public/js/engine/storage.js';
import { input } from '../public/js/engine/input.js';
import { view } from '../public/js/engine/view.js';
import { defaultProfile } from '../public/js/shared/profile.js';
import { GameScreen } from '../public/js/ui/gamescreen.js';
import { TitleScreen } from '../public/js/ui/screens.js';
import { UI } from '../public/js/ui/ui.js';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
Object.assign(view, { ui: canvas, ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });
const saved = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
  removeItem: key => saved.delete(key),
} });

function titleApp(settings = {}, runs = 0) {
  return {
    ui: new UI(), audioUnlocked: true, scene: { draw() {} }, settings,
    choice: { hero: 'mage', mode: 'dungeon', diff: 'hard', nightmare: true, map: 'hell' },
    store: { profile: { ...defaultProfile(), runs } },
    visits: [],
    go(name) { this.screenName = name; this.visits.push(name); },
    startRun() {
      if (this.store.pendingRun) return this.go('spoils');
      this.go('game');
      this.battle = new GameScreen();
      this.battle.enter(this);
    },
  };
}

function pressPlay(app) {
  const title = new TitleScreen();
  title.enter(app);
  title.draw(ctx, view.W, view.H, 0.4);
  assert.equal(app.ui.focusId, 'play');
  assert.ok(!app.ui.items.some(item => item.id === 'prologue'), 'the title menu has no intro replay');
  input.justDown.add('Enter');
  try { title.draw(ctx, view.W, view.H, 1 / 60); }
  finally { input.endFrame(); }
}

test('Begin Adventure enters a fresh Normal Sunscorch battle and remembers starting it', () => {
  const app = titleApp();
  try {
    pressPlay(app);
    assert.deepEqual(app.visits, ['game']);
    const game = app.battle.game;
    assert.equal(game.player.id, 'knight');
    assert.equal(game.mode, 's15');
    assert.equal(game.map.id, 'desert');
    assert.equal(game.diffId, 'easy');
    assert.equal(game.nightmare, false);
    assert.equal(game.time, 0);
    assert.equal(game.player.level, 1);
    assert.equal(game.player.hp, game.player.maxHp);
    assert.equal(game.gold, 0);
    assert.equal(game.stats.gold, 0);
    assert.equal(app.store.profile.runs, 0);
    assert.equal(app.store.profile.gold, 0);
    assert.equal(app.settings.firstRunStarted, true);
    assert.equal(app.settings.map, 'desert');
    assert.ok(game.hints, 'the first battle has its normal gameplay hints');
    for (let frame = 0; frame < 180; frame++) game.update(1 / 60);
    assert.ok(game.enemies.some(e => e.type === 'scarab'), 'the Sunscorch horde is active');

    const reloaded = titleApp(loadSettings());
    assert.equal(reloaded.settings.firstRunStarted, true);
    assert.equal(reloaded.settings.map, 'desert');
    pressPlay(reloaded);
    assert.deepEqual(reloaded.visits, ['hero'], 'reloading before banking the first run opens hero selection');
  } finally {
    app.battle?.leave();
  }
});

test('pending spoils leave the first battle available after collection', () => {
  const app = titleApp();
  app.store.pendingRun = { id: 'pending' };
  pressPlay(app);
  assert.deepEqual(app.visits, ['spoils']);
  assert.ok(!app.settings.firstRunStarted);
  app.store.pendingRun = null;
  try {
    pressPlay(app);
    assert.deepEqual(app.visits, ['spoils', 'game']);
    assert.equal(app.settings.firstRunStarted, true);
  } finally {
    app.battle?.leave();
  }
});

test('Start Run opens hero selection for returning players and legacy saves', () => {
  for (const app of [titleApp({ map: 'frozen' }, 1), titleApp({ prologueDone: true, map: 'frozen' })]) {
    pressPlay(app);
    assert.deepEqual(app.visits, ['hero']);
    assert.equal(app.battle, undefined);
    assert.equal(app.settings.map, 'frozen');
    assert.equal(app.choice.hero, 'mage');
  }
});
