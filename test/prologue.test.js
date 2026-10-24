import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Prologue, ROAD, roadY, needsPrologue } from '../public/js/game/prologue.js';
import { PrologueScreen } from '../public/js/ui/prologue.js';
import { GameScreen } from '../public/js/ui/gamescreen.js';
import { TitleScreen } from '../public/js/ui/screens.js';
import { defaultProfile } from '../public/js/shared/profile.js';
import { input } from '../public/js/engine/input.js';
import { view } from '../public/js/engine/view.js';
import { UI } from '../public/js/ui/ui.js';

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });
const step = (g, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60); };
const withGame = (fn) => {
  const bot = input.bot;
  try { fn(new Prologue({ headless: true, settings: {} })); }
  finally { input.bot = bot; }
};
function makeApp() {
  return {
    ui: new UI(), settings: {}, choice: { hero: 'knight', mode: 's15', diff: 'easy' },
    store: { profile: defaultProfile(), submitRun() { throw new Error('A prologue must not submit a night result'); } },
    visits: [], go(name, params) { this.visits.push({ name, params }); },
  };
}

test('following the crooked road takes about 40 seconds, with more rats and no levels', () => withGame((g) => {
  const seen = new Set(), spawnYs = [];
  let elapsed = 0;
  while (!g.reached && elapsed < 44) {
    const x = Math.min(ROAD.length + 10, g.player.x + 40), y = roadY(x);
    const dx = x - g.player.x, dy = y - g.player.y, distance = Math.hypot(dx, dy) || 1;
    input.bot = { x: dx / distance, y: dy / distance };
    g.update(1 / 60);
    elapsed += 1 / 60;
    for (const e of g.enemies) if (!seen.has(e.id)) {
      seen.add(e.id);
      spawnYs.push(e.y);
      assert.ok(Math.abs(e.y - roadY(e.x)) < 35, 'mice spawn beside the curved road');
    }
  }
  assert.equal(g.reached, true);
  assert.ok(elapsed >= 39 && elapsed <= 43, `${elapsed.toFixed(2)} seconds along the bends`);
  assert.equal(seen.size, 16, 'six small packs, up from the original eleven mice');
  assert.ok(spawnYs.some((y) => y < -60) && spawnYs.some((y) => y > 60), 'encounters follow both turns');
  assert.equal(g.player.dead, false, 'the starter Knight can walk the road');
  assert.equal(g.encounters.size, ROAD.encounters.length);
  assert.ok(g.kills > 0, 'the actual automatic sword fought the road encounters');
  assert.equal(g.player.level, 1);
  assert.equal(g.player.xp, 0);
  assert.equal(g.pendingLevels, 0);
  assert.ok(g.enemies.every((e) => e.type === 'rat'));
  assert.ok(g.pickups.every((p) => ['coin', 'potion'].includes(p.kind)));
  assert.equal(g.shrines.length, 0);
  assert.equal(g.crypts.length, 0);
  assert.equal(g.boss, null);
  assert.equal(g.player.ultLocked, true);
}));

test('the guide returns a wandering player to the curved path on either side of its turns', () => {
  for (const [fraction, offset] of [[0.34, 130], [0.66, -130]]) withGame((g) => {
    g.player.x = ROAD.length * fraction;
    g.player.y = roadY(g.player.x) + offset;
    input.bot = { x: 0, y: 0 };
    step(g, 10);
    assert.ok(g.guideAlpha > 0.9);
    const target = g.guideTarget();
    assert.equal(target.y, roadY(target.x));
    assert.ok((target.y - g.player.y) * offset < 0, 'the reminder points back toward the actual road');
  });
});

test('waiting does not finish the journey, and the guide fades in then out on progress', () => withGame((g) => {
  input.bot = { x: 0, y: 0 };
  step(g, 7);
  assert.equal(g.guideAlpha, 0);
  step(g, 3);
  assert.ok(g.guideAlpha > 0.9);
  input.bot = { x: 1, y: 0 };
  step(g, 2);
  assert.ok(g.guideAlpha < 0.05);
  input.bot = { x: 0, y: 0 };
  step(g, 60);
  assert.equal(g.reached, false);
  assert.equal(g.state, 'play');
}));

test('the camp blocks the west, while the woods above and below remain explorable', () => withGame((g) => {
  input.bot = { x: -1, y: 0 };
  step(g, 4);
  assert.ok(g.player.x >= ROAD.left);
  g.player.x = 500; g.player.y = 500;
  input.bot = { x: 0, y: 1 };
  step(g, 3);
  assert.ok(g.player.y > 600, 'no corridor walls hold the player to the road');
  assert.ok(g.guideTarget().y < g.player.y);
}));

test('passing the destination far from the path does not complete it', () => withGame((g) => {
  input.bot = { x: 0, y: 0 };
  g.player.x = ROAD.length + 100; g.player.y = 400;
  step(g, 10);
  assert.equal(g.reached, false);
  assert.deepEqual(g.guideTarget(), { x: ROAD.length, y: 0 });
  assert.ok(g.guideAlpha > 0.9);
  g.player.y = 0;
  step(g, 0.1);
  assert.equal(g.reached, true);
}));

test('rats drop gold and healing potions, without experience or other night rewards', () => withGame((g) => {
  for (let i = 0; i < 3; i++) {
    const e = g.spawnEnemy('rat', 60 + i * 15, 0, { instant: true });
    g.killEnemy(e);
  }
  assert.equal(g.kills, 3);
  assert.ok(g.pickups.filter((p) => p.kind === 'coin').length >= 3);
  assert.ok(g.pickups.some((p) => p.kind === 'potion'));
  assert.ok(g.pickups.every((p) => ['coin', 'potion'].includes(p.kind)));
  assert.equal(g.player.xp, 0);
}));

test('only a new player is routed through the prologue; existing saves and completed intros skip it', () => {
  const p = defaultProfile();
  assert.equal(needsPrologue(p, {}), true);
  assert.equal(needsPrologue({ ...p, runs: 1 }, {}), false);
  assert.equal(needsPrologue(p, { prologueDone: true }), false);
  const app = makeApp(), screen = new TitleScreen(); screen.app = app;
  screen.pick('play'); assert.equal(app.visits.at(-1).name, 'prologue');
  app.settings.prologueDone = true;
  screen.pick('play'); assert.equal(app.visits.at(-1).name, 'hero');
  screen.pick('prologue'); assert.deepEqual(app.visits.at(-1), { name: 'prologue', params: { replay: true } });
});

test('completion or skipping starts one fresh Knight night carrying only collected gold', () => {
  const app = makeApp(), screen = new PrologueScreen();
  screen.enter(app); screen.game.gold = 12;
  screen.finish(); screen.finish();
  assert.equal(app.settings.prologueDone, true);
  assert.deepEqual(app.choice, { hero: 'knight', mode: 's15', diff: 'easy', nightmare: false });
  assert.deepEqual(app.visits, [{ name: 'game', params: { prologueGold: 12 } }]);
  assert.equal(app.store.profile.runs, 0);
  assert.equal(app.store.profile.gold, 0);
  screen.leave();
  const night = new GameScreen(); night.enter(app, { prologueGold: 12 });
  assert.equal(night.game.gold, 12);
  assert.equal(night.game.stats.gold, 12);
  assert.equal(night.game.time, 0);
  assert.equal(night.game.player.level, 1);
  night.leave();
});

test('replaying returns to camp without changing progression or crediting gold', () => {
  const app = makeApp(), screen = new PrologueScreen();
  screen.enter(app, { replay: true }); screen.game.gold = 30;
  screen.finish();
  assert.deepEqual(app.visits, [{ name: 'title', params: undefined }]);
  assert.equal(app.settings.prologueDone, undefined);
  assert.equal(app.store.profile.gold, 0);
  screen.leave();
});

test('pause freezes the path and its reminder, and the screen draws at compact sizes', () => {
  const app = makeApp(), screen = new PrologueScreen(), bot = input.bot;
  screen.enter(app); input.bot = { x: 1, y: 0 };
  try {
    screen.game.headless = true;
    screen.paused = true; screen.game.state = 'paused';
    for (let i = 0; i < 60; i++) screen.frame(1 / 60);
    assert.equal(screen.game.time, 0);
    assert.equal(screen.game.guideIdle, 0);
    for (const [W, H] of [[320, 180], [180, 320]]) {
      screen.drawHud(ctx, W, H, 1 / 60);
      screen.drawPause(ctx, W, H, 1 / 60);
    }
  } finally { screen.leave(); input.bot = bot; }
});
