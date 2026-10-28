// The results screen reports a run as it was played. Its difficulty goes with the report, so a
// Veteran run is paid and recorded as Veteran (a report without one was taken for Elite, ×1.5);
// the results screen leads back to camp only; and a run the store didn't take says so, rather
// than counting up "+0 GOLD".
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { GameScreen, woundLines, WOUND_TIPS, heroGoalBar, goldSteps } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { textWidth } from '../public/js/engine/font.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, applyRun, metaBonuses } from '../public/js/shared/profile.js';
import { Game } from '../public/js/game/game.js';
import { musicState, playMusic } from '../public/js/engine/audio.js';

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

test('a death keeps echo-guitar results music until leaving the results', async () => {
  const gs = await playToResults(makeApp({ hero: 'knight', mode: 's15', diff: 'medium' }));
  assert.equal(musicState().piece, 'results');
  for (let f = 0; f < 180; f++) frame(gs);
  assert.equal(musicState().piece, 'results', 'the tally does not switch back to the title');
});

test('winning starts results music at dawn and keeps it on the results screen', async () => {
  const app = makeApp({ hero: 'knight', mode: 's15', diff: 'medium' });
  app.startRun();
  const gs = app.screen;
  playMusic('boss');
  gs.game.victory('survival');
  assert.equal(musicState().piece, 'results');
  gs.game.finish(true);
  frame(gs);
  await new Promise((r) => setImmediate(r));
  assert.ok(gs.overlay?.res?.victory);
  assert.equal(musicState().piece, 'results');
});

test('quitting a living run returns to menu music', async () => {
  const app = makeApp({ hero: 'knight', mode: 's15', diff: 'medium' });
  app.startRun();
  playMusic('forest');
  app.screen.game.finish(false);
  frame(app.screen);
  await new Promise((r) => setImmediate(r));
  assert.equal(musicState().piece, 'title');
});

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
  // Its longest kill streak goes with it, for the record; the gold found is one (28 October 2026).
  assert.equal(app.sent[0].combo, gs.game.stats.maxCombo);
  assert.deepEqual(gs.overlay.rows.find(([k]) => k === 'Gold found'), ['Gold found', '120', true], 'the first gold on record');
  // And an Elite one as Elite.
  const vet = makeApp({ hero: 'knight', mode: 's15', diff: 'hard' });
  const vs = await playToResults(vet);
  assert.equal(vet.sent[0].diff, 'hard');
  assert.equal(vs.overlay.reward.multiplier, 1.5);
  assert.equal(vet.store.profile.gold, 180 + vs.overlay.reward.wage);
});

// The rows give way before the unlocked do (28 October 2026): on a screen too low for one row of
// them under the rows, Damage dealt is left out (never a record; each weapon's damage is beside it).
test('on a low screen the results leave out Damage dealt before the unlocked', async () => {
  const gs = await playToResults(makeApp({ hero: 'knight', mode: 's15', diff: 'medium' }));
  const o = gs.overlay, has = (k) => o.rows.some(([label]) => label === k);
  o.reward = { ...o.reward, unlocked: [{ type: 'weapon', id: 'axe', need: 'Survive 1:00 in one run' }] };
  o.skip();
  o.draw(ctx, 480, 600, 0);
  assert.ok(has('Damage dealt'), 'kept where there is room');
  o.draw(ctx, 427, 200, 0);
  o.draw(ctx, 427, 200, 0);
  assert.ok(!has('Damage dealt'), 'left out where there is none');
  assert.ok(has('Gold found') && has('Kills'), 'the rest stay');
  assert.equal(o.ticked, o.rows.length);
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

// A boss's slams and shots count with his touch, under his name alone and as a boss's, so one boss
// takes one place of the three and his tip comes for them (names.js bossOf, 27 October 2026).
test("a boss's every blow is one line of the wounds, and counts as a boss's", () => {
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(4);
  input.bot = { x: 0, y: 0 };
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.update(1 / 60);
    const p = g.player;
    p.maxHp = p.hp = 1e6;
    Object.assign(g.stats, { damageTaken: 0, fromBoss: 0, fromMobs: 0, fromShots: 0, wounds: {} });
    for (const [by, boss] of [['King Ossarian, The Bone King', 'King Ossarian'], ["King Ossarian's bone", 'King Ossarian'], ["Cultist's bolt", null]]) {
      p.invuln = 0;
      assert.ok(p.hurt(10, null, by, boss) > 0, by);
    }
    assert.deepEqual(Object.keys(g.stats.wounds).sort(), ["Cultist's bolt", 'King Ossarian'], 'his slam and his bone under his name');
    assert.equal(g.stats.fromBoss, g.stats.wounds['King Ossarian'], "a boss's, both");
    assert.equal(g.stats.fromShots, g.stats.wounds["Cultist's bolt"], "the horde's bolt a shot");
  } finally {
    Math.random = random;
    input.bot = bot;
  }
});

// The review's C4 (28 October 2026): where the next goal is a time with the hero just played, the
// NEXT line is the real distance, as a bar; a run that made it, another hero or another goal, none.
test("the results' NEXT line is the distance to the next hero, where it is this hero's time", () => {
  const goal = { type: 'survive', hero: 'knight', unlocks: 'archer', minutes: 5 };
  const bar = heroGoalBar(goal, { hero: 'knight', time: 271 });
  assert.equal(bar.text, '04:31 of 05:00 with the Knight · 29 s from the Ranger');
  assert.ok(Math.abs(bar.k - 271 / 300) < 1e-9);
  assert.match(heroGoalBar(goal, { hero: 'knight', time: 100 }).text, /03:20 from the Ranger$/, 'a minute or more told as a time');
  assert.equal(heroGoalBar(goal, { hero: 'archer', time: 271 }), null, 'another hero');
  assert.equal(heroGoalBar(goal, { hero: 'knight', time: 300 }), null, 'made it');
  assert.equal(heroGoalBar({ type: 'dungeon', hero: 'knight', unlocks: 'archer' }, { hero: 'knight', time: 271 }), null, 'another goal');
  // Its words in the longest form that fits the room (28 October 2026): the hero played goes first,
  // then the times; the hero the goal opens stays.
  const run = { hero: 'knight', time: 271 };
  assert.equal(heroGoalBar(goal, run, textWidth(bar.text)).text, bar.text, 'the whole where it fits');
  assert.equal(heroGoalBar(goal, run, textWidth(bar.text) - 1).text, '04:31 of 05:00 · 29 s from the Ranger');
  assert.equal(heroGoalBar(goal, run, 100).text, '29 s from the Ranger');
});

// The review's C11 (28 October 2026): the gold found counts up, then each step of the formula is
// stamped in, a beat apart, all in the span the single count took; a rate of ×1 or under is never a
// stamp (no step down), and nothing paid changes.
test("the results' gold comes as a cascade: the gold found, then the rate above ×1, the wage, a win's bonus", () => {
  const s = goldSteps({ gold: 340, multiplier: 1.5, collected: 510, wage: 450, bonus: 500, total: 1460 }, 2.5);
  assert.equal(s.countTo, 340);
  assert.deepEqual(s.stamps.map((st) => [st.key, st.to]), [['mult', 510], ['wage', 960], ['bonus', 1460]]);
  assert.ok(Math.abs(s.end - 2.5) < 1e-9, 'in the span the count took');
  assert.ok(s.count > 0 && s.stamps.every((st, i) => st.at > (i ? s.stamps[i - 1].at : s.count)), 'each in its turn');
  const normal = goldSteps({ gold: 340, multiplier: 0.75, collected: 255, wage: 100, bonus: 0, total: 355 }, 2);
  assert.equal(normal.countTo, 255, "Normal's gold counted at its rate");
  assert.ok(!normal.stamps.some((st) => st.key === 'mult'), 'never a step down');
  assert.equal(normal.stamps.at(-1).to, 355);
  assert.equal(goldSteps({ gold: 0, multiplier: 1, collected: 0, wage: 5, bonus: 0, total: 5 }, 1.5).count, 0, 'no gold found: only the wage');
});
