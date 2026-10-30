import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { MusicMenu } from '../public/js/ui/music-menu.js';
import { OptionsScreen } from '../public/js/ui/screens.js';
import { PauseOverlay } from '../public/js/ui/gamescreen.js';
import { Game } from '../public/js/game/game.js';
import { PrologueScreen } from '../public/js/ui/prologue.js';
import { COMBAT_MUSIC } from '../public/js/engine/combat-music.js';
import { loadSettings } from '../public/js/engine/storage.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { UI } from '../public/js/ui/ui.js';
import { input } from '../public/js/engine/input.js';
import { view } from '../public/js/engine/view.js';

const kept = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key) => kept.get(key) ?? null,
  setItem: (key, value) => kept.set(key, String(value)), removeItem: (key) => kept.delete(key),
} });
const ctx = document.createElement('canvas').getContext('2d');
function reset(W = 480, H = 270) {
  kept.clear(); input.endFrame(); input.held.clear();
  Object.assign(input.mouse, { x: -1, y: -1, down: false, moved: false, clicked: false });
  Object.assign(input.pad, { buttons: [], prev: [], nav: null });
  Object.assign(view, { ctx, uctx: ctx, W, H, S: 1, pxW: W, pxH: H });
}
function app() {
  return { ui: new UI(), settings: loadSettings(), scene: { draw() {} }, visits: [],
    choice: { hero: 'knight', mode: 's15', diff: 'easy' },
    store: { profile: defaultProfile() }, applySettings() {}, toggleFullscreen() {},
    go(name) { this.visits.push(name); } };
}
function audio() {
  const events = []; let playing = null;
  return { events, preview(id) { events.push(['preview', id]); playing = { id, playing: true }; },
    stop() { events.push(['stop']); playing = null; }, state: () => playing,
    choose(id) { events.push(['choose', id]); return id; } };
}
function harness(draw, W = 480, H = 270) {
  let result;
  const frame = (dt = .2) => { result = draw(ctx, W, H, dt); input.endFrame(); return result; };
  return { frame, result: () => result,
    press(key) { input.justDown.add(key); return frame(); },
    click(rect) { Object.assign(input.mouse, { x: rect.x + 2, y: rect.y + 2, clicked: true, moved: false }); return frame(); } };
}
const item = (a, id) => {
  const row = a.ui.items.find((entry) => entry.id === id);
  assert.ok(row, id); return row;
};
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test('music browsing previews focus without saving, confirmation saves before staying open, and Escape stops', () => {
  reset(); const a = app(), sound = audio();
  a.settings.combatMusic = 'neon-motor'; a.ui.noSpace = true;
  const menu = new MusicMenu(a, sound), h = harness(menu.draw.bind(menu));
  h.frame();
  assert.equal(a.ui.focusId, 'soundtrack_neon-motor');
  assert.deepEqual(sound.events, [['preview', 'neon-motor']]);
  h.press('ArrowDown');
  assert.equal(a.ui.focusId, 'soundtrack_breakbeat-circuit');
  assert.equal(a.settings.combatMusic, 'neon-motor');
  assert.equal(loadSettings().combatMusic, 'clockwork-charge', 'a preview does not save settings');
  h.press('Enter');
  assert.equal(h.result(), null, 'confirmation keeps the music browser open');
  assert.equal(a.settings.combatMusic, 'breakbeat-circuit');
  assert.equal(loadSettings().combatMusic, 'breakbeat-circuit');
  assert.deepEqual(sound.events.slice(-2), [['preview', 'breakbeat-circuit'], ['choose', 'breakbeat-circuit']],
    'the excerpt begins before the full track choice changes');
  assert.equal(a.ui.noSpace, false);
  h.press('Escape');
  assert.equal(h.result(), 'close');
  assert.deepEqual(sound.events.at(-1), ['stop']);
  assert.equal(a.ui.noSpace, true, 'the introductory road gets its input rule back');
});

test('gamepad browsing and touch-style selection work for the last soundtrack; DONE consumes the tap', () => {
  reset(); const a = app(), sound = audio(), menu = new MusicMenu(a, sound), h = harness(menu.draw.bind(menu));
  h.frame();
  input.pad.nav = 'down'; h.frame(); input.pad.nav = null;
  assert.equal(a.ui.focusId, 'soundtrack_lantern-guard');
  input.pad.buttons = [true]; input.pad.prev = [false]; h.frame();
  input.pad.buttons = []; input.pad.prev = [];
  assert.equal(a.settings.combatMusic, 'lantern-guard');
  h.click(item(a, 'soundtrack_breakbeat-circuit'));
  assert.equal(a.settings.combatMusic, 'breakbeat-circuit');
  assert.equal(h.result(), null);
  h.click(item(a, 'music_done'));
  assert.equal(h.result(), 'close');
  assert.equal(input.mouse.clicked, false);
  assert.equal(a.ui.fired, true);
});

for (const [W, H] of [[480, 270], [427, 240], [293, 633], [320, 180], [180, 320]]) {
  test(`all eight soundtrack rows and DONE fit ${W}x${H}`, () => {
    reset(W, H); const a = app(), menu = new MusicMenu(a, audio()), h = harness(menu.draw.bind(menu), W, H);
    h.frame();
    const rows = a.ui.items;
    assert.equal(rows.filter((row) => row.id.startsWith('soundtrack_')).length, COMBAT_MUSIC.length);
    for (const [i, row] of rows.entries()) {
      assert.ok(row.x >= 0 && row.y >= 0 && row.x + row.w <= W && row.y + row.h <= H, row.id);
      for (const other of rows.slice(i + 1)) assert.equal(overlaps(row, other), false, row.id + '/' + other.id);
    }
    menu.close();
  });
}

test('Options exposes a keyboard-reachable music browser and its compact controls remain separate', () => {
  for (const [W, H] of [[480, 270], [427, 240], [293, 633]]) {
    for (const embedded of [false, true]) {
      reset(W, H); const a = app(), options = new OptionsScreen(); options.enter(a);
      const h = harness((c, w, height, dt) => options.draw(c, w, height, dt, embedded), W, H);
      h.frame(.3);
      for (const [i, control] of a.ui.items.entries()) {
        assert.ok(control.y >= 0 && control.y + control.h <= H, control.id);
        for (const other of a.ui.items.slice(i + 1)) assert.equal(overlaps(control, other), false, `${W}x${H} ${control.id}/${other.id}`);
      }
      h.press('ArrowDown'); assert.equal(a.ui.focusId, 'o_tracks');
      h.press('Enter'); assert.ok(options.musicMenu);
      options.musicMenu.audio = audio(); h.frame();
      h.press('Escape'); assert.equal(options.musicMenu, null);
      assert.deepEqual(a.visits, [], 'Escape closes just the music browser');
      h.frame(); assert.equal(a.ui.focusId, 'o_tracks');
    }
  }
});

for (const completed of [false, true]) test(`Pause MUSIC keeps ${completed ? 'loot collection' : 'the run'} paused through selection and back, and only RESUME continues it`, () => {
  reset(); const a = app(); a.settings.combatMusic = 'neon-motor';
  const g = new Game({ hero: 'knight', mode: 's15', diff: 'easy', meta: metaBonuses(a.store.profile), settings: a.settings, headless: true });
  Object.assign(g, { state: 'paused', time: 120, kills: 5, gold: 3, levelComplete: completed });
  const pause = new PauseOverlay({ app: a, game: g });
  const h = harness(pause.draw.bind(pause)); h.frame();
  h.click(item(a, 'music')); assert.ok(pause.musicMenu);
  pause.musicMenu.audio = audio(); h.frame();
  assert.equal(a.ui.focusId, 'soundtrack_neon-motor');
  h.click(item(a, 'soundtrack_steel-tread'));
  assert.equal(g.state, 'paused');
  assert.equal(a.settings.combatMusic, 'steel-tread');
  assert.equal(loadSettings().combatMusic, 'steel-tread');
  h.press('Escape');
  assert.equal(pause.musicMenu, null);
  assert.equal(g.state, 'paused');
  assert.equal(h.result(), null);
  h.frame(); assert.equal(a.ui.focusId, 'music');
  h.press('Escape');
  assert.equal(h.result(), 'close');
  assert.equal(g.state, completed ? 'cleared' : 'play');
});

test('the first journey offers MUSIC and Escape from it does not unpause or advance the road', () => {
  reset(); const a = app(), screen = new PrologueScreen(); screen.enter(a);
  screen.game.headless = true; screen.paused = true; screen.game.state = 'paused';
  a.ui.lockT = 0;
  const h = harness((c, W, H, dt) => screen.frame(dt));
  try {
    h.frame(); h.click(item(a, 'road_music')); assert.ok(screen.musicMenu);
    screen.musicMenu.audio = audio(); h.frame();
    h.click(item(a, 'soundtrack_bootheel-loop'));
    assert.equal(a.settings.combatMusic, 'bootheel-loop');
    assert.equal(screen.paused, true);
    assert.equal(screen.game.time, 0);
    h.press('Escape');
    assert.equal(screen.musicMenu, null);
    assert.equal(screen.paused, true);
    assert.equal(screen.game.state, 'paused');
    assert.equal(screen.game.time, 0);
    h.frame(); h.press('Escape');
    assert.equal(screen.paused, false);
    assert.equal(screen.game.state, 'play');
  } finally { screen.leave(); }
});
