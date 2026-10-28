// The Survival maps on the trial screen (the owner's, 28 October 2026: "the first one where we
// start is the desert map. From there on, we progress to the frozen map. From there on, we progress
// to our current forest map. And from there on, we progress to the demonic map"): a row of tabs
// under the trials while Survival is the trial chosen, each map open once a night is won on the one
// before it (shared/profile.js mo, mw). Moving along the row picks an open map and remembers it with
// the settings, the pointer's hover never does, a shut one says what opens it, and BEGIN plays the
// map the screen shows. The menu's backdrop draws each map's land behind it, the run reports its
// map, and the ladder's words name the maps.
import test from 'node:test';
import assert from 'node:assert/strict';

// The browser, as far as the settings need one: an address (not the debug one) and a cookie jar.
globalThis.location = { protocol: 'http:', hostname: 'localhost', search: '' };
const jar = new Map();
await import('../tools/headless.mjs');
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
const { ModeScreen, shownMap } = await import('../public/js/ui/screens.js');
const { GameScreen } = await import('../public/js/ui/gamescreen.js');
const { UI } = await import('../public/js/ui/ui.js');
const { unlockText, lockReason } = await import('../public/js/ui/ladder.js');
const { view } = await import('../public/js/engine/view.js');
const { input } = await import('../public/js/engine/input.js');
const { mulberry32 } = await import('../public/js/engine/util.js');
const { loadSettings, unlockEverything } = await import('../public/js/engine/storage.js');
const { defaultProfile, sanitizeProfile, applyRun } = await import('../public/js/shared/profile.js');
const { MAP_LADDER } = await import('../public/js/data/maps.js');
const { MenuScene } = await import('../public/js/ui/background.js');

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

const frame = (s, W = view.W, H = view.H) => {
  s.draw(ctx, W, H, 1 / 60);
  input.endFrame();
};
const item = (app, id) => app.ui.items.find((i) => i.id === id);
const click = (s, it) => {
  Object.assign(input.mouse, { x: it.x + 3, y: it.y + 3, clicked: true });
  frame(s);
};
// A key: the focus moves at the end of a frame; the row reads it, and picks, on the next.
const press = (s, key) => {
  input.justDown.add(key);
  frame(s);
  frame(s);
};
// A save with a night won on these maps, each on Normal.
const winning = (maps, p = defaultProfile()) => maps.reduce((q, map) => applyRun(q, { mode: 's15', map, diff: 'easy', hero: 'knight', victory: true, time: 900, gold: 0 }).profile, p);

// The trial screen as the game shows it, past its lock; the menu's backdrop keeps what it was asked
// to draw (scene.drawn). settings: what the settings already hold.
function trialScreen(profile = defaultProfile(), choice = {}, settings = {}) {
  jar.clear();
  const app = {
    ui: new UI(), store: { profile }, settings: { ...loadSettings(), ...settings },
    scene: {
      draw(c, W, H, dt, o) {
        this.drawn = o;
      },
    },
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

test('a new save shows the desert, the only map open, under Survival; BEGIN plays it, nothing saved for it', () => {
  const { s, app } = trialScreen();
  const tabs = MAP_LADDER.map((m) => item(app, 'map_' + m.id));
  assert.ok(tabs.every(Boolean), 'a tab for each map, in the ladder\'s order');
  assert.deepEqual(tabs.map((t) => t.disabled), [false, true, true, true, true], 'the desert alone open');
  const card = item(app, 'm_s15'), diff = item(app, 'd_easy');
  assert.ok(tabs.every((t) => t.y >= card.y + card.h && t.y + t.h <= diff.y), 'between the trials and the difficulties');
  assert.ok(Math.abs((tabs[0].x + tabs[4].x + tabs[4].w) / 2 - view.W / 2) <= 1, 'centred');
  assert.equal(app.scene.drawn.biome, 'desert', "the menu's land behind it");
  assert.equal(s.desc, MAP_LADDER[0].desc, 'its own words under the trials');
  assert.equal(app.choice.map, undefined, 'nothing chosen for coming here');
  click(s, item(app, 'begin'));
  assert.deepEqual(app.started, { hero: 'knight', mode: 's15', diff: 'medium', nightmare: false, map: 'desert' });
  assert.equal(loadSettings().map, undefined, 'nor saved');
});

// The owner's (23 October 2026): menus that "respect left, right, up, down". The maps are a row of
// choices like the trials and the difficulties: moving along it picks what it lands on.
test('moving along the row picks an open map and remembers it; a shut one says what opens it; the hover picks nothing', () => {
  const p = winning(['desert']);
  const { s, app } = trialScreen(p);
  assert.equal(shownMap(p), 'frozen', 'the last open on the ladder, the Darkwood still shut');
  app.ui.focusId = 'm_s15';
  press(s, 'ArrowDown');
  assert.equal(app.ui.focusId, 'map_frozen', 'down onto the map shown');
  assert.equal(app.choice.map, undefined, 'landing on it is no new pick');
  press(s, 'ArrowLeft');
  assert.deepEqual([app.ui.focusId, app.choice.map, loadSettings().map], ['map_desert', 'desert', 'desert'], 'picked, and remembered');
  assert.equal(s.desc, MAP_LADDER[0].desc);
  press(s, 'ArrowRight');
  press(s, 'ArrowRight');
  assert.deepEqual([app.ui.focusId, app.choice.map, loadSettings().map], ['map_meadow', 'frozen', 'frozen'], 'a shut one is in focus, not picked');
  assert.equal(s.desc, 'To unlock: Survive the night in the Frostfell');
  input.justDown.add('Enter');
  frame(s);
  assert.equal(app.choice.map, 'frozen', 'nor taken with Enter');
  // The pointer's hover only shows a map.
  const desert = item(app, 'map_desert');
  Object.assign(input.mouse, { x: desert.x + 3, y: desert.y + 3, moved: true });
  frame(s);
  frame(s);
  assert.deepEqual([app.ui.focusId, app.choice.map], ['map_desert', 'frozen']);
  // Up comes back to the trial chosen; down, through the map chosen, to the difficulty chosen.
  press(s, 'ArrowUp');
  assert.equal(app.ui.focusId, 'm_s15');
  press(s, 'ArrowDown');
  assert.equal(app.ui.focusId, 'map_frozen');
  press(s, 'ArrowDown');
  assert.equal(app.ui.focusId, 'd_medium');
  assert.equal(app.choice.map, 'frozen', 'passing by changes nothing');
  // Along the trials, left and right go where they always have, never down onto the row's end tabs
  // (further out than the end trials' middles): past the last round to the first, past the first to
  // BACK in its corner (ui.js fallback), as before the maps.
  app.ui.focusId = 'm_ranked';
  press(s, 'ArrowRight');
  assert.equal(app.ui.focusId, 'm_s15');
  press(s, 'ArrowLeft');
  assert.equal(app.ui.focusId, 'back');
  assert.equal(app.choice.map, 'frozen', 'and no map picked on the way');
});

// Off the difficulties' ends too (the review of 28 October 2026): left from NORMAL and right from
// ELITE go up to the trial over them, as before the maps, never onto the row's end tabs (further out
// than the end difficulties' middles), whose focus would pick the Sunscorch or the Abyss.
test('left from NORMAL and right from ELITE pick no map', () => {
  const { s, app } = trialScreen(winning(['desert', 'frozen', 'meadow', 'forest']), { diff: 'easy', map: 'frozen' });
  assert.deepEqual(app.ui.items.filter((i) => i.id.startsWith('map_')).map((t) => t.disabled), [false, false, false, false, false], 'every map open, the Abyss too');
  app.ui.focusId = 'd_easy';
  press(s, 'ArrowLeft');
  assert.deepEqual([app.ui.focusId, app.choice.map, loadSettings().map], ['m_s15', 'frozen', undefined]);
  app.ui.focusId = 'd_hard';
  press(s, 'ArrowRight');
  assert.deepEqual([app.ui.focusId, app.choice.map, loadSettings().map], ['m_ranked', 'frozen', undefined]);
  assert.deepEqual([app.choice.mode, app.choice.diff], ['s15', 'hard'], 'Ranked still shut to this save: in focus, not chosen');
});

test('a map chosen that has shut since falls back to the one shown; the Dungeon and Ranked show no row', () => {
  // After a fresh start the Frostfell chosen before is shut: the desert in its place, nothing saved.
  const fresh = trialScreen(defaultProfile(), { map: 'frozen' });
  assert.equal(fresh.app.choice.map, 'desert');
  assert.equal(loadSettings().map, undefined);
  // A save from before the maps, nothing chosen: the Darkwood, where all its nights were spent; BEGIN
  // leaves the choice without one (a run without a map is the Darkwood's).
  const old = trialScreen(sanitizeProfile({ v: 4, runs: 5, heroes: ['knight'] }));
  assert.equal(old.app.scene.drawn.biome, 'forest');
  click(old.s, item(old.app, 'begin'));
  assert.equal(old.app.started.map, undefined);
  for (const mode of ['dungeon', 'ranked']) {
    const { app } = trialScreen(unlockEverything(defaultProfile()), { mode }, { rankedNote: true });
    assert.equal(app.choice.mode, mode);
    assert.ok(!app.ui.items.some((i) => i.id.startsWith('map_')), `${mode}: no map row`);
    assert.equal(app.scene.drawn.biome, undefined, `${mode}: the menu's own night`);
  }
});

// An 854 x 480 window is 427 x 240 (an itch.io embed), a 1366 x 768 laptop 456 x 256, a phone held
// upright about 293 x 633 (engine/view.js). Normal's notes are the longest.
test('the row, the difficulties and BEGIN fit a low window and a phone held upright, BEGIN clear of BACK', () => {
  for (const [W, H] of [[480, 270], [456, 256], [427, 240], [293, 633]]) {
    const { s, app } = trialScreen(winning(['desert']), { diff: 'easy' });
    frame(s, W, H);
    const at = `${W} x ${H}`;
    const tabs = app.ui.items.filter((i) => i.id.startsWith('map_')), card = item(app, 'm_s15'), diff = item(app, 'd_easy');
    const box = item(app, 'nightmare'), begin = item(app, 'begin'), back = item(app, 'back');
    assert.equal(tabs.length, 5, at);
    assert.ok(tabs.every((t) => t.x >= 0 && t.x + t.w <= W), `${at}: the row on the screen`);
    assert.ok(tabs.every((t) => t.y >= card.y + card.h && t.y + t.h <= diff.y), `${at}: between the trials and the difficulties`);
    assert.ok(box.y + box.h <= begin.y, `${at}: the box over BEGIN`);
    assert.ok(begin.y + begin.h <= H, `${at}: BEGIN on the screen`);
    assert.ok(begin.x >= back.x + back.w || begin.y + begin.h <= back.y, `${at}: BEGIN clear of BACK`);
  }
});

// BEGIN keeps one place as the trial or the difficulty changes (the review of 28 October 2026: under
// the map row it hopped up and down on a 1366 x 768 laptop, and in an 854 x 480 window the keys' line
// under it came and went with it, as that line is drawn only where BEGIN leaves it room).
test('BEGIN keeps one place whatever trial and difficulty are chosen', () => {
  for (const [W, H] of [[480, 270], [456, 256], [427, 240]]) {
    const ys = [];
    for (const choice of [{ diff: 'easy' }, { diff: 'medium' }, { diff: 'hard' }, { diff: 'hard', nightmare: true }, { mode: 'dungeon', diff: 'easy' }, { mode: 'ranked' }]) {
      const { s, app } = trialScreen(unlockEverything(defaultProfile()), choice, { rankedNote: true });
      frame(s, W, H);
      ys.push(item(app, 'begin').y);
    }
    assert.equal(new Set(ys).size, 1, `${W} x ${H}: ${ys}`);
  }
});

// The menu's backdrop itself (ui/background.js MenuScene; the screens above draw a stand-in): the
// title's Darkwood, its campfire and all, then each map's land as the row is moved along and back,
// at each of those sizes. Every rectangle and picture of it, painted once or drawn each frame, goes
// where numbers put it (one at NaN draws nothing and says nothing: on a narrow screen a strip or the
// sun would just be gone), each land is built once for its size and kept, and a land the scene
// doesn't know is the Darkwood's.
test("the menu's backdrop: each map's land at every size, drawn where numbers put it, built once", () => {
  const astray = [];
  const watched = (c) => {
    const g = c.getContext('2d');
    for (const [name, from] of [['fillRect', 0], ['drawImage', 1]]) {
      g[name] = (...a) => {
        if (!a.slice(from).every(Number.isFinite)) astray.push(`${name}(${a.slice(from).join(', ')})`);
      };
    }
    return c;
  };
  const make = document.createElement;
  document.createElement = (tag) => watched(make(tag));
  try {
    for (const [W, H] of [[480, 270], [456, 256], [427, 240], [293, 633]]) {
      const scene = new MenuScene(), screen = document.createElement('canvas').getContext('2d'), kept = new Map(), at = `${W} x ${H}`;
      for (let f = 0; f < 30; f++) scene.draw(screen, W, H, 1 / 60);
      assert.equal(scene.look, 'forest', `${at}: the title's Darkwood`);
      assert.deepEqual(astray.splice(0), [], `${at}: the title`);
      for (const m of [...MAP_LADDER, ...MAP_LADDER]) {
        for (let f = 0; f < 30; f++) scene.draw(screen, W, H, 1 / 60, { campfire: false, biome: m.id });
        const s = scene.s, o = s.orb, where = `${at}, ${m.id}`;
        assert.equal(scene.look, m.id, `${where}: its own land`);
        if (kept.has(m.id)) assert.equal(s, kept.get(m.id), `${where}: kept, not built again`);
        kept.set(m.id, s);
        for (const c of [s.sky, ...s.layers.map((L) => L.c)]) assert.ok(c.width === W && c.height === H, `${where}: a strip ${c.width} x ${c.height}`);
        for (const A of s.aurora ?? []) assert.equal(A.c.width, W, `${where}: the aurora`);
        assert.ok([o.x, o.y, o.r, o.R].every(Number.isFinite), `${where}: the sun or moon at ${o.x}, ${o.y}, r ${o.r}, its halo ${o.R}`);
        assert.ok(s.stars.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), `${where}: the stars`);
        assert.ok((s.motes ?? []).every((d) => Number.isFinite(d.x) && Number.isFinite(d.y)), `${where}: what drifts`);
        assert.deepEqual(astray.splice(0), [], `${where}: drawn where numbers put it`);
      }
      scene.draw(screen, W, H, 1 / 60, { campfire: false, biome: 'toString' });
      assert.equal(scene.look, 'forest', `${at}: the Darkwood for a land it doesn't know`);
    }
  } finally {
    document.createElement = make;
  }
});

test("the ladder's words: the results tell a map opened, the row what opens one still shut", () => {
  assert.equal(unlockText('map:frozen'), 'The Frostfell is open!');
  assert.equal(unlockText('map:hell'), 'The Abyss is open!');
  assert.equal(unlockText('map:nope'), '');
  const p = defaultProfile();
  assert.equal(lockReason(p, 's15', 'knight', 'frozen'), 'Survive the night in the Sunscorch');
  assert.equal(lockReason(p, 's15', 'knight', 'hell'), 'Survive the night in the Darkwood');
  assert.equal(lockReason(p, 's15', 'knight', 'desert'), '', 'the first is never shut');
  assert.equal(lockReason(p, 's15', 'knight'), '', 'nor Survival itself');
});

test('a run is played on the map chosen, and its report names it', async () => {
  const sent = [];
  const store = {
    profile: unlockEverything(defaultProfile()),
    async submitRun(run) {
      sent.push(run);
      const r = applyRun(this.profile, run);
      this.profile = r.profile;
      return r.reward;
    },
  };
  const app = { ui: new UI(), settings: { numbers: false }, devHold: false, store, choice: { hero: 'knight', mode: 's15', diff: 'medium', map: 'frozen' } };
  const random = Math.random, bot = input.bot;
  Math.random = mulberry32(3);
  input.bot = { x: 0, y: 0 };
  const gs = new GameScreen();
  try {
    gs.enter(app);
    assert.equal(gs.game.map.id, 'frozen');
    gs.game.finish(false); // Quit Run
    gs.frame(1 / 60);
    input.endFrame();
    await new Promise((r) => setImmediate(r));
  } finally {
    gs.leave();
    Math.random = random;
    input.bot = bot;
  }
  assert.equal(gs.overlay?.res?.map, 'frozen', 'the result');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].map, 'frozen', 'and the report');
  assert.ok(store.profile.runs === 1, 'taken');
});
