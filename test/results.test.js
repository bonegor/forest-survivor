// The results screen reports a run as it was played. Its difficulty goes with the report, so a
// Veteran run is paid and recorded as Veteran (a report without one was taken for Elite, ×1.5);
// the results screen leads back to camp only; and a run the store didn't take says so, rather
// than counting up "+0 GOLD".
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { GameScreen, woundLines, WOUND_TIPS } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, applyRun } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

// The game as the browser runs it, from the trial screen's choice: a store that pays as the
// static build's does (applyRun on the profile, a bare zero when it refuses) unless `pay` says
// otherwise, and keeps every report it was sent.
function makeApp(choice, pay) {
  const sent = [];
  const store = {
    profile: defaultProfile(),
    async submitRun(run) {
      sent.push(run);
      if (pay) return pay(run);
      const r = applyRun(this.profile, run);
      if (!r.ok) return { collected: 0, bonus: 0, total: 0, multiplier: 1 };
      this.profile = r.profile;
      return r.reward;
    },
  };
  return {
    ui: new UI(), settings: { numbers: false }, devHold: false, store, sent, choice: { ...choice }, screen: null,
    go(name) {
      this.screen?.leave();
      this.went = name;
    },
    startRun() {
      this.screen?.leave();
      this.screen = new GameScreen();
      this.screen.enter(this);
    },
  };
}

const frame = (gs) => {
  gs.frame(1 / 60);
  input.endFrame();
};

// Starts a seeded run, plays a few seconds standing still, then the hero (with `gold` found)
// falls; frames on until the results are up and the store has answered.
async function playToResults(app, { gold = 120, seed = 5 } = {}) {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(seed);
  input.bot = { x: 0, y: 0 };
  try {
    app.startRun();
    const gs = app.screen, g = gs.game;
    for (let f = 0; f < 130; f++) frame(gs); // past two seconds of real time: long enough for 120 gold (profile.js MAX_GOLD_PER_SEC)
    g.gold = gold;
    g.player.hurt(1e9);
    for (let f = 0; f < 900 && !(g.state === 'over' && gs.overlay?.res); f++) frame(gs);
    assert.equal(g.state, 'over');
    assert.ok(gs.overlay?.res, 'the results are up');
    await new Promise((r) => setImmediate(r));
    return gs;
  } finally {
    Math.random = random;
    input.bot = bot;
  }
}

// Clicks a widget the overlay drew last frame.
function click(gs, id) {
  const it = gs.app.ui.items.find((i) => i.id === id);
  assert.ok(it, `${id} is on screen`);
  Object.assign(input.mouse, { x: it.x + 2, y: it.y + 2, clicked: true });
  frame(gs);
}

test('a Veteran run is reported as Veteran, and paid ×1', async () => {
  const app = makeApp({ hero: 'knight', mode: 's15', diff: 'medium' });
  const gs = await playToResults(app);
  assert.equal(gs.game.diffId, 'medium');
  assert.equal(app.sent.length, 1);
  assert.equal(app.sent[0].diff, 'medium', 'the report carries the difficulty');
  assert.equal(app.sent[0].gold, 120);
  const reward = gs.overlay.reward;
  assert.equal(reward.multiplier, 1);
  assert.equal(reward.collected, 120);
  assert.equal(reward.total, 120 + reward.wage, 'and the wage for its time (shared/progress.js)');
  assert.ok(!reward.unsaved);
  assert.equal(app.store.profile.gold, reward.total);
  // And an Elite one as Elite.
  const vet = makeApp({ hero: 'knight', mode: 's15', diff: 'hard' });
  const vs = await playToResults(vet);
  assert.equal(vet.sent[0].diff, 'hard');
  assert.equal(vs.overlay.reward.multiplier, 1.5);
  assert.equal(vet.store.profile.gold, 180 + vs.overlay.reward.wage);
});

test("the results screen leads only back to camp: the hero screen, the run's hero ready, once the count has landed", async () => {
  const app = makeApp({ hero: 'knight', mode: 's15', diff: 'medium' });
  const gs = await playToResults(app);
  app.choice.hero = 'archer'; // whatever was chosen since, the run's hero comes back
  for (let f = 0; f < 150; f++) frame(gs);
  assert.ok(!gs.app.ui.items.some((i) => i.id === 'again'), 'no TRY AGAIN');
  assert.ok(gs.app.ui.items.some((i) => i.id === 'camp'), 'RETURN TO CAMP is there');
  assert.ok(!gs.overlay.landed, 'the gold still counting');
  click(gs, 'camp');
  assert.equal(app.went, undefined, 'a press before the count has landed only shows it all');
  assert.ok(gs.overlay.landed && gs.overlay.shown === gs.overlay.reward.total, 'all shown');
  for (let f = 0; f < 20; f++) frame(gs);
  click(gs, 'camp');
  assert.equal(app.went, 'hero', 'back to camp: the hero screen');
  assert.equal(app.choice.hero, 'knight', "with the run's hero focused");
  assert.equal(app.sent.length, 1, 'the run reported once');
});

test('a run the store pays nothing for says it was not saved, and a run with nothing to pay does not', async () => {
  // Refused (on static hosting: a bare zero, with no reason given).
  const refused = makeApp({ hero: 'knight', mode: 's15', diff: 'medium' }, () => ({ collected: 0, bonus: 0, total: 0, multiplier: 1 }));
  let gs = await playToResults(refused);
  assert.equal(gs.overlay.reward.unsaved, true, 'the "not saved" line instead of +0 GOLD');
  for (let f = 0; f < 90; f++) frame(gs);
  assert.equal(gs.overlay.shown, 0, 'no gold counted up');
  assert.ok(!gs.app.ui.items.some((i) => i.id === 'resubmit'), 'nothing to try again: the server is not down');
  gs.leave();
  // The game server down: the reason, and SAVE AGAIN.
  const down = makeApp({ hero: 'knight', mode: 's15', diff: 'medium' }, () => ({ collected: 0, bonus: 0, total: 0, multiplier: 1, unsaved: true, down: true, error: 'fetch failed' }));
  gs = await playToResults(down);
  for (let f = 0; f < 90; f++) frame(gs);
  assert.ok(gs.app.ui.items.some((i) => i.id === 'resubmit'));
  gs.leave();
  // A run that found no gold is paid nothing, and that is no refusal.
  const none = makeApp({ hero: 'knight', mode: 's15', diff: 'medium' });
  gs = await playToResults(none, { gold: 0 });
  assert.equal(gs.overlay.reward.total, gs.overlay.reward.wage, 'only the wage for its time');
  assert.ok(!gs.overlay.reward.unsaved);
  assert.equal(none.store.profile.runs, 1, 'recorded');
  gs.leave();
});

// A fall's results tell what dealt the hero's wounds, the three worst by their share, and one tip
// for the worst kind (27 October 2026); a win or a quit tells none.
test("a fall's results name what wounded the hero most, with a tip for the worst kind", () => {
  const stats = { damageTaken: 100, fromBoss: 15, fromMobs: 22, fromShots: 63, wounds: { "Cultist's bolt": 63, Wolf: 22, 'Bone King': 15 } };
  assert.deepEqual(woundLines({ died: true, stats }), [["Wounds: Cultist's bolt 63% · Wolf 22% · Bone King 15%", '#c0cbdc'], [WOUND_TIPS.shots, '#8b9bb4']]);
  assert.deepEqual(woundLines({ died: false, victory: true, stats }), [], 'a win');
  assert.deepEqual(woundLines({ died: false, stats }), [], 'a quit');
});
