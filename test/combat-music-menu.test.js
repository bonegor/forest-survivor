// Exercise the actual pre-run dropdown together with trial selection and saved settings.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { protocol: 'http:', hostname: 'localhost', search: '' };
const kept = new Map(), cookies = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key) => kept.get(key) ?? null,
  setItem: (key, value) => kept.set(key, String(value)),
  removeItem: (key) => kept.delete(key),
} });
await import('../tools/headless.mjs');
Object.defineProperty(document, 'cookie', {
  configurable: true,
  get: () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
  set: (line) => {
    const [pair, ...attrs] = line.split(';'), equal = pair.indexOf('='), key = pair.slice(0, equal).trim();
    if (attrs.some((value) => value.trim() === 'Max-Age=0')) cookies.delete(key);
    else cookies.set(key, pair.slice(equal + 1));
  },
});
const { ModeScreen } = await import('../public/js/ui/screens.js');
const { UI } = await import('../public/js/ui/ui.js');
const { view } = await import('../public/js/engine/view.js');
const { input } = await import('../public/js/engine/input.js');
const { loadSettings, saveSettings } = await import('../public/js/engine/storage.js');
const { defaultProfile } = await import('../public/js/shared/profile.js');
const { COMBAT_MUSIC } = await import('../public/js/engine/combat-music.js');

const ctx = document.createElement('canvas').getContext('2d');
const frame = ({ screen, W, H }) => { screen.draw(ctx, W, H, 1 / 60); input.endFrame(); };
const idle = (harness, frames = 12) => { for (let i = 0; i < frames; i++) frame(harness); };
const item = ({ app }, id) => {
  const found = app.ui.items.find((entry) => entry.id === id);
  assert.ok(found, `the menu has ${id}`);
  return found;
};
const click = (harness, rect) => {
  Object.assign(input.mouse, { x: rect.x + 3, y: rect.y + 3, clicked: true, moved: false });
  frame(harness);
  frame(harness);
};
const press = (harness, key) => { input.justDown.add(key); frame(harness); frame(harness); };
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function trial({ W = 480, H = 270, settings = {}, reset = true } = {}) {
  if (reset) { kept.clear(); cookies.clear(); }
  input.endFrame(); input.held.clear(); input.device = 'kb';
  Object.assign(input.mouse, { x: -1, y: -1, down: false, clicked: false, moved: false });
  Object.assign(input.pad, { buttons: [], prev: [], nav: null });
  Object.assign(view, { ctx, uctx: ctx, W, H, S: 1, pxW: W, pxH: H });
  const app = {
    ui: new UI(), store: { profile: defaultProfile() }, settings: { ...loadSettings(), ...settings },
    scene: { draw() {} }, choice: { hero: 'knight', mode: 's15', diff: 'easy', nightmare: false },
    started: 0, went: [],
    startRun() { this.started++; this.startedMusic = this.settings.combatMusic; },
    go(name) { this.went.push(name); },
  };
  const screen = new ModeScreen(); screen.enter(app);
  const harness = { screen, app, W, H };
  idle(harness, 20);
  return harness;
}

function openPicker(harness) {
  click(harness, item(harness, 'combat_music'));
  idle(harness);
  assert.equal(harness.screen.musicPicker.open, true);
  assert.deepEqual(harness.app.ui.items.map((entry) => entry.id), COMBAT_MUSIC.map((track) => 'music_' + track.id));
}

test('the actual trial dropdown defaults to Clockwork and persists Spark Rush without starting a run', () => {
  const h = trial(), choice = { ...h.app.choice };
  assert.equal(h.app.settings.combatMusic, 'clockwork-charge');
  openPicker(h);
  assert.equal(h.app.ui.focusId, 'music_clockwork-charge');
  click(h, item(h, 'music_spark-rush'));
  assert.equal(h.screen.musicPicker.open, false);
  assert.equal(h.app.settings.combatMusic, 'spark-rush');
  assert.equal(loadSettings().combatMusic, 'spark-rush');
  assert.equal(h.app.started, 0);
  assert.deepEqual(h.app.choice, choice);
  assert.deepEqual(h.app.went, []);
  const next = trial({ reset: false });
  assert.equal(next.app.settings.combatMusic, 'spark-rush', 're-entering the menu restores the saved choice');
  openPicker(next);
  assert.equal(next.app.ui.focusId, 'music_spark-rush');
});

test('the picker is reachable left from BEGIN', () => {
  const h = trial();
  h.app.ui.focusId = 'begin'; h.app.ui.focusSource = 'keys';
  press(h, 'ArrowLeft');
  assert.equal(h.app.ui.focusId, 'combat_music');
  assert.equal(h.app.started, 0);
});

test('keyboard arrows browse music without changing settings, and Enter confirms before beginning a run', () => {
  const h = trial(), choice = { ...h.app.choice };
  h.app.ui.focusId = 'combat_music'; h.app.ui.focusSource = 'keys';
  press(h, 'Enter'); idle(h);
  assert.equal(h.screen.musicPicker.open, true);
  assert.equal(h.app.ui.focusId, 'music_clockwork-charge');
  press(h, 'ArrowDown');
  assert.equal(h.app.ui.focusId, 'music_lantern-guard');
  press(h, 'ArrowDown');
  assert.equal(h.app.ui.focusId, 'music_spark-rush');
  assert.equal(h.app.settings.combatMusic, 'clockwork-charge');
  assert.equal(loadSettings().combatMusic, 'clockwork-charge');
  assert.deepEqual(h.app.choice, choice, 'browsing music cannot change trial, map or difficulty');
  assert.equal(h.app.started, 0);
  press(h, 'Enter');
  assert.equal(h.app.settings.combatMusic, 'spark-rush');
  assert.equal(loadSettings().combatMusic, 'spark-rush');
  assert.equal(h.screen.musicPicker.open, false);
  assert.equal(h.app.started, 0);
  idle(h);
  press(h, 'ArrowRight');
  assert.equal(h.app.ui.focusId, 'begin');
  press(h, 'Enter');
  assert.equal(h.app.started, 1);
  assert.equal(h.app.startedMusic, 'spark-rush');
});

test('Escape closes the music list without leaving the trial screen or changing its choice', () => {
  const h = trial(), choice = { ...h.app.choice };
  openPicker(h); press(h, 'ArrowDown');
  press(h, 'Escape');
  assert.equal(h.screen.musicPicker.open, false);
  assert.equal(h.app.ui.focusId, 'combat_music');
  assert.equal(h.app.settings.combatMusic, 'clockwork-charge');
  assert.deepEqual(h.app.choice, choice);
  assert.equal(h.app.started, 0);
  assert.deepEqual(h.app.went, []);
});

test('an outside click on BEGIN or BACK closes the list without clicking through it', () => {
  for (const target of ['begin', 'back']) {
    const h = trial(), rect = { ...item(h, target) }, choice = { ...h.app.choice };
    openPicker(h);
    const bounds = h.screen.musicPicker.menuBounds(h.W, h.H);
    const point = { x: rect.x + 3, y: rect.y + 3 };
    assert.ok(point.x < bounds.x || point.x >= bounds.x + bounds.w || point.y < bounds.y || point.y >= bounds.y + bounds.h);
    click(h, rect);
    assert.equal(h.screen.musicPicker.open, false, target);
    assert.equal(h.app.settings.combatMusic, 'clockwork-charge', target);
    assert.deepEqual(h.app.choice, choice, target);
    assert.equal(h.app.started, 0, target);
    assert.deepEqual(h.app.went, [], target);
  }
});

for (const [W, H] of [[480, 270], [427, 240], [293, 633]]) {
  test(`the pre-run picker, BEGIN and open choices fit ${W}x${H}`, () => {
    const h = trial({ W, H }), at = `${W}x${H}`;
    const music = item(h, 'combat_music'), begin = item(h, 'begin'), back = item(h, 'back');
    for (const control of [music, begin, back]) {
      assert.ok(control.x >= 0 && control.y >= 0 && control.x + control.w <= W && control.y + control.h <= H, `${at}: ${control.id} on screen`);
    }
    for (const control of h.app.ui.items.filter((entry) => entry.id !== 'combat_music')) {
      assert.equal(overlaps(music, control), false, `${at}: music ${JSON.stringify(music)} clear of ${JSON.stringify(control)}`);
    }
    assert.equal(overlaps(begin, back), false, `${at}: BEGIN clear of BACK`);
    openPicker(h);
    const bounds = h.screen.musicPicker.menuBounds(W, H);
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.w <= W && bounds.y + bounds.h <= H, `${at}: list on screen`);
    const rows = h.app.ui.items;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      assert.ok(row.x >= bounds.x && row.y >= bounds.y && row.x + row.w <= bounds.x + bounds.w && row.y + row.h <= bounds.y + bounds.h, `${at}: ${row.id} inside list`);
      for (const other of rows.slice(i + 1)) assert.equal(overlaps(row, other), false, `${at}: choice rows do not overlap`);
    }
  });
}

test('saved combat music normalizes missing or stale settings and preserves each valid choice', () => {
  kept.clear(); cookies.clear();
  assert.equal(loadSettings().combatMusic, 'clockwork-charge');
  for (const combatMusic of [undefined, null, '', 'old-soundtrack', '__proto__', { id: 'spark-rush' }]) {
    saveSettings({ music: .3, sfx: .6, combatMusic });
    const loaded = loadSettings();
    assert.equal(loaded.combatMusic, 'clockwork-charge');
    assert.equal(loaded.music, .3);
    assert.equal(loaded.sfx, .6);
  }
  for (const track of COMBAT_MUSIC) {
    saveSettings({ combatMusic: track.id });
    assert.equal(loadSettings().combatMusic, track.id);
  }
});
