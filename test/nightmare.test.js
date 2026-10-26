// Nightmare (the user's, 16 October 2026): a box to tick on the trial screen that doubles the
// number of monsters (three times since 21 October 2026): the steady horde and the timed swarms, rings and packs, in Survival and on a
// Dungeon Run, each monster as strong as ever. Since 21 October 2026 an Elite's modifier: its box
// hangs under Elite and is shut on Veteran, and a Veteran run is never one.
// Never in Ranked, which keeps one best time per hero. It is remembered with the settings, the run
// report says so, and its gold is paid x1.5 on top of the difficulty's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The browser, as far as the settings need one: an address (not the debug one) and a cookie jar.
globalThis.location = { protocol: 'http:', hostname: 'localhost', search: '' };
const jar = new Map();
const { playGame } = await import('../tools/headless.mjs');
Object.defineProperty(document, 'cookie', {
  configurable: true,
  get: () => [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
  set: (line) => {
    const [pair, ...attrs] = line.split(';');
    const i = pair.indexOf('='), name = pair.slice(0, i).trim();
    if (attrs.some((a) => a.trim() === 'Max-Age=0')) jar.delete(name);
    else jar.set(name, pair.slice(i + 1));
  },
});
const { Game } = await import('../public/js/game/game.js');
const { lateMore, isFew, minuteMore, RING } = await import('../public/js/game/spawner.js');
const { VETERAN, ELITE, NIGHTMARE, GAME_SPEED } = await import('../public/js/data/difficulty.js');
const { EVENTS } = await import('../public/js/data/waves.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
const { defaultProfile, metaBonuses, applyRun, sanitizeRun, DIFF_GOLD, NIGHTMARE_GOLD } = await import('../public/js/shared/profile.js');
const { loadSettings, saveSettings, unlockEverything } = await import('../public/js/engine/storage.js');
const { ModeScreen } = await import('../public/js/ui/screens.js');
const { GameScreen } = await import('../public/js/ui/gamescreen.js');
const { UI } = await import('../public/js/ui/ui.js');
const { view } = await import('../public/js/engine/view.js');
const { input } = await import('../public/js/engine/input.js');

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

function game(o = {}, seed = 7) {
  const oldRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, ...o });
    g.update(1 / 60);
    return g;
  } finally {
    Math.random = oldRandom;
  }
}

// How many monsters an event sends, without spawning them.
function sent(g, ev, phase) {
  let n = 0;
  g.spawnEnemy = () => (n++, null);
  const oldRandom = Math.random;
  Math.random = mulberry32(3);
  try {
    g.spawner.fire(ev, phase);
  } finally {
    Math.random = oldRandom;
    delete g.spawnEnemy;
  }
  return n;
}

test('a Nightmare triples the steady horde and the timed swarms, rings and packs, on Elite; Veteran is never one', () => {
  const phases = [1, 6.3, 12.6, 13.3, 17.5, 20];
  for (const mode of ['s15', 'dungeon']) {
    const calm = game({ diff: 'medium', mode }), ticked = game({ diff: 'medium', mode, nightmare: true });
    assert.equal(ticked.nightmare, false, `${mode}: a Veteran run is never a Nightmare`);
  }
  for (const diff of ['hard']) {
    const rules = diff === 'medium' ? VETERAN : ELITE;
    for (const mode of ['s15', 'dungeon']) {
      const calm = game({ diff, mode }), dread = game({ diff, mode, nightmare: true });
      assert.equal(calm.nightmare, false, 'off unless chosen');
      assert.equal(dread.nightmare, true);
      assert.equal(dread.diff, rules, 'the difficulty as chosen');
      for (const ph of phases) {
        // Each one as strong as ever.
        assert.equal(dread.spawner.stats(ph).hpMul, calm.spawner.stats(ph).hpMul);
      }
    }
    // Every event of the night, of every kind, at its own time (Veteran's late 30% too, and the
    // 5% a minute the horde grows, minuteMore).
    const calm = game({ diff }), dread = game({ diff, nightmare: true });
    const kinds = new Set();
    for (const ev of EVENTS) {
      const n = ev.count * (ev.type === 'ring' ? RING.more : 1) * rules.horde * (isFew(ev.enemy) ? rules.few : 1) * lateMore(rules, ev.at) * minuteMore(ev.at);
      assert.equal(sent(calm, ev, ev.at), Math.max(1, Math.round(n)), `${diff}: ${ev.type} of ${ev.enemy} at ${ev.at}, as it was`);
      assert.equal(sent(dread, ev, ev.at), Math.max(1, Math.round(n * 3)), `${diff}: ${ev.type} of ${ev.enemy} at ${ev.at}, three times over`);
      kinds.add(ev.type);
    }
    assert.deepEqual([...kinds].sort(), ['pack', 'ring', 'swarm']);
  }
  assert.equal(NIGHTMARE.more, 3);
});

test('Ranked is never a Nightmare, and the HUD says NIGHTMARE beside the clock without trouble', () => {
  const ranked = game({ mode: 'ranked', nightmare: true }), plain = game({ mode: 'ranked' });
  assert.equal(ranked.nightmare, false);
  const ev = { type: 'pack', enemy: 'goblin', count: 18 };
  assert.equal(sent(ranked, ev, 25), sent(plain, ev, 25));
  assert.equal(game({ nightmare: 'yes' }).nightmare, false, 'only a choice made');
  for (const mode of ['s15', 'dungeon', 'ranked']) game({ mode, nightmare: true }).hud.draw(ctx, 480, 270, 1);
});

test('the Nightmare box is remembered with the settings, off at first', () => {
  jar.clear();
  assert.equal(loadSettings().nightmare, false, 'off at first');
  jar.set('fs_settings', encodeURIComponent(JSON.stringify({ music: 0.3, diff: 'hard' })));
  assert.equal(loadSettings().nightmare, false, 'settings saved before there was a box');
  saveSettings({ ...loadSettings(), nightmare: true });
  assert.equal(loadSettings().nightmare, true);
  assert.equal(loadSettings().diff, 'hard', 'with the difficulty');
  assert.equal(loadSettings().music, 0.3);
});

test('a Nightmare report says so; its gold is paid x1.5 on top, its win and victory bonus are the difficulty\'s', () => {
  assert.equal(NIGHTMARE_GOLD, 1.5);
  for (const diff of ['hard']) {
    const base = { mode: 's15', diff, hero: 'knight', victory: true, time: 900, gold: 200, kills: 3000, level: 40 };
    const calm = applyRun(defaultProfile(), base), dread = applyRun(defaultProfile(), { ...base, nightmare: true });
    assert.equal(calm.run.nightmare, false);
    assert.equal(dread.run.nightmare, true);
    assert.equal(dread.reward.multiplier, DIFF_GOLD[diff] * 1.5);
    assert.equal(dread.reward.collected, Math.round(200 * DIFF_GOLD[diff] * 1.5));
    assert.equal(dread.reward.bonus, calm.reward.bonus, 'the victory bonus as the difficulty pays it');
    assert.deepEqual(dread.profile.wins, calm.profile.wins, 'a win on its difficulty');
  }
  // Only a run that says it was one; never in Ranked.
  for (const nightmare of [undefined, 'true', 1, null]) assert.equal(sanitizeRun({ mode: 's15', nightmare }).nightmare, false, String(nightmare));
  assert.equal(sanitizeRun({ mode: 'ranked', nightmare: true }).nightmare, false);
  assert.equal(sanitizeRun({ mode: 's15', diff: 'medium', nightmare: true }).nightmare, false, 'never on Veteran');
  assert.equal(applyRun(defaultProfile(), { mode: 's15', diff: 'medium', hero: 'knight', time: 900, gold: 200, nightmare: true }).reward.multiplier, DIFF_GOLD.medium, 'nor paid as one');
  // Three times the monsters, so up to three times the kills a run of its length could make.
  assert.equal(sanitizeRun({ mode: 's15', time: 900, kills: 1e9 }).kills, 50 + 900 * 240);
  assert.equal(sanitizeRun({ mode: 's15', diff: 'hard', time: 900, kills: 1e9, nightmare: true }).kills, 50 + 900 * 240 * 3);
});

const frame = (s) => {
  s.draw(ctx, view.W, view.H, 1 / 60);
  input.endFrame();
};
const item = (app, id) => app.ui.items.find((i) => i.id === id);
const click = (s, it) => {
  Object.assign(input.mouse, { x: it.x + 3, y: it.y + 3, clicked: true });
  frame(s);
};

// The trial screen as the game shows it, past its lock.
function trialScreen(profile = defaultProfile(), choice = {}) {
  jar.clear();
  const app = {
    ui: new UI(), scene: { draw() {} }, store: { profile }, settings: loadSettings(),
    choice: { hero: 'knight', mode: 's15', diff: 'medium', nightmare: false, ...choice },
    go(name) {
      this.went = name;
    },
    startRun() {
      this.started = { ...this.choice };
    },
  };
  const s = new ModeScreen();
  s.enter(app);
  for (let i = 0; i < 20; i++) frame(s);
  return { s, app };
}

test('the trial screen puts the box under the difficulties, shut but on Elite; a click, Enter or the pad\'s A ticks it', () => {
  const { s, app } = trialScreen();
  let box = item(app, 'nightmare');
  const normal = item(app, 'd_easy'), mid = item(app, 'd_medium'), vet = item(app, 'd_hard');
  assert.ok(box && normal && mid && vet, 'the box and the three difficulties');
  assert.ok(normal.x < mid.x && mid.x < vet.x, 'Normal, Veteran, Elite, left to right');
  assert.ok(box.y >= vet.y + vet.h, 'on a line of its own, under them');
  assert.ok(Math.abs(box.x + box.w / 2 - view.W / 2) <= 1, 'centred under the row (23 October 2026)');
  assert.ok(Math.abs((normal.x + vet.x + vet.w) / 2 - view.W / 2) <= 1, 'the difficulties centred');
  // On Veteran it is shut: a click does nothing.
  assert.equal(box.disabled, true, 'shut on Veteran');
  click(s, box);
  assert.equal(app.choice.nightmare, false);
  // Elite opens it; a click.
  click(s, vet);
  assert.equal(app.choice.diff, 'hard');
  frame(s);
  box = item(app, 'nightmare');
  assert.equal(box.disabled, false, 'open on Elite');
  click(s, box);
  assert.equal(app.choice.nightmare, true);
  assert.equal(app.settings.nightmare, true);
  assert.equal(loadSettings().nightmare, true, 'saved with the settings');
  // The keyboard: down from Elite to the box, then Enter.
  app.ui.focusId = 'd_hard';
  input.justDown.add('ArrowDown');
  frame(s);
  assert.equal(app.ui.focusId, 'nightmare');
  input.justDown.add('Enter');
  frame(s);
  assert.equal(app.choice.nightmare, false);
  assert.equal(loadSettings().nightmare, false);
  // A gamepad's A.
  input.pad.buttons = [true];
  input.pad.prev = [];
  try {
    frame(s);
  } finally {
    input.pad.buttons = [];
  }
  assert.equal(app.choice.nightmare, true);
  assert.equal(app.choice.diff, 'hard', 'the difficulty untouched');
  // BEGIN plays it: the clock in real time, the hero and the monsters at the game's speed.
  click(s, item(app, 'begin'));
  assert.deepEqual(app.started, { hero: 'knight', mode: 's15', diff: 'hard', nightmare: true });
  const gs = new GameScreen();
  gs.enter({ ...app, devHold: false, store: { profile: defaultProfile(), submitRun: async () => ({ collected: 0, bonus: 0, total: 0, multiplier: 1 }) } });
  try {
    assert.equal(gs.game.nightmare, true);
    assert.equal(gs.game.pace, 1);
    assert.equal(gs.game.move, GAME_SPEED);
  } finally {
    gs.leave();
  }
});

// The owner's (23 October 2026): menus that "respect left, right, up, down". On the trial screen the
// trials and the difficulties are rows of choices: moving along one picks what it lands on, and up
// or down into one comes back to its choice.
test('moving along the trials or the difficulties picks them; up and down come back to the choice', () => {
  const { s, app } = trialScreen(unlockEverything(defaultProfile()), { diff: 'easy' });
  // The focus moves at the end of a frame; the row reads it, and picks, on the next.
  const press = (key) => {
    input.justDown.add(key);
    frame(s);
    frame(s);
  };
  app.ui.focusId = 'm_s15';
  press('ArrowRight');
  assert.deepEqual([app.ui.focusId, app.choice.mode], ['m_dungeon', 'dungeon']);
  press('ArrowDown');
  assert.equal(app.ui.focusId, 'd_easy', 'down onto the difficulty chosen');
  press('ArrowRight');
  press('ArrowRight');
  assert.deepEqual([app.ui.focusId, app.choice.diff], ['d_hard', 'hard']);
  press('ArrowDown');
  assert.equal(app.ui.focusId, 'nightmare');
  press('ArrowDown');
  assert.equal(app.ui.focusId, 'begin');
  press('ArrowUp');
  press('ArrowUp');
  assert.equal(app.ui.focusId, 'd_hard', 'up onto Elite, the one chosen, not the nearest');
  press('ArrowUp');
  assert.equal(app.ui.focusId, 'm_dungeon', 'up onto the trial chosen');
  assert.equal(app.choice.diff, 'hard', 'passing by changes nothing');
});

test('Ranked\'s trial card shows no box, and a Nightmare ticked before plays Ranked as Ranked', () => {
  const { app } = trialScreen(unlockEverything(defaultProfile()), { mode: 'ranked', nightmare: true });
  assert.equal(app.choice.mode, 'ranked');
  assert.equal(item(app, 'nightmare'), undefined);
  assert.equal(item(app, 'd_hard'), undefined);
  const g = game({ mode: 'ranked', diff: app.choice.diff, nightmare: app.choice.nightmare });
  assert.equal(g.nightmare, false);
  assert.equal(g.diff, ELITE);
});

test('the results report a Nightmare and pay it so', async () => {
  const sentRuns = [];
  const store = {
    profile: defaultProfile(),
    async submitRun(run) {
      sentRuns.push(run);
      const r = applyRun(this.profile, run);
      this.profile = r.profile;
      return r.reward;
    },
  };
  const app = { ui: new UI(), settings: { numbers: false }, devHold: false, store, choice: { hero: 'knight', mode: 's15', diff: 'hard', nightmare: true } };
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(5);
  input.bot = { x: 0, y: 0 };
  const gs = new GameScreen();
  const step = () => {
    gs.frame(1 / 60);
    input.endFrame();
  };
  try {
    gs.enter(app);
    for (let f = 0; f < 130; f++) step(); // past two seconds of real time: long enough for 120 gold (profile.js MAX_GOLD_PER_SEC)
    gs.game.gold = 120;
    gs.game.player.invuln = 0; // a blow just taken would shield him from this one
    gs.game.player.hurt(1e9);
    for (let f = 0; f < 900 && !(gs.game.state === 'over' && gs.overlay?.res); f++) step();
    await new Promise((r) => setImmediate(r));
  } finally {
    gs.leave();
    Math.random = random;
    input.bot = bot;
  }
  assert.equal(gs.overlay.res.nightmare, true);
  assert.equal(sentRuns[0].nightmare, true, 'the report carries it');
  assert.equal(gs.overlay.reward.multiplier, DIFF_GOLD.hard * 1.5, 'Elite\'s rate, a Nightmare x1.5 on top');
  assert.equal(store.profile.gold, Math.round(120 * DIFF_GOLD.hard * 1.5) + gs.overlay.reward.wage, 'and the wage for its time, at that rate');
});

test('the bots play a Nightmare with --nightmare on Elite, and refuse it on Veteran', () => {
  assert.equal(playGame({ bot: 'idle', seed: 1, max: 5, nightmare: true }).nightmare, true);
  assert.equal(playGame({ bot: 'idle', seed: 1, max: 5 }).nightmare, false);
  assert.equal(playGame({ bot: 'idle', seed: 1, max: 5, diff: 'medium', nightmare: true }).nightmare, false, 'never on Veteran');
  const cli = fileURLToPath(new URL('../tools/bots.mjs', import.meta.url));
  const out = execFileSync(process.execPath, [cli, '--bot=idle', '--runs=1', '--max=5', '--jobs=1', '--diff=elite', '--nightmare'], { encoding: 'utf8' });
  assert.match(out, /· Elite · Nightmare/);
  for (const diff of ['normal', 'veteran']) {
    assert.throws(() => execFileSync(process.execPath, [cli, '--bot=idle', '--runs=1', '--max=5', `--diff=${diff}`, '--nightmare'], { encoding: 'utf8', stdio: 'pipe' }));
  }
  assert.throws(() => execFileSync(process.execPath, [cli, '--nightmare=yes', '--max=1'], { encoding: 'utf8', stdio: 'pipe' }));
});
