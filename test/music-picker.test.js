import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { UI } from '../public/js/ui/ui.js';
import { CombatMusicPicker } from '../public/js/ui/music-picker.js';
import { COMBAT_MUSIC } from '../public/js/engine/combat-music.js';
import { input } from '../public/js/engine/input.js';

const ctx = document.createElement('canvas').getContext('2d');

function pickerAt(rect = { x: 126, y: 206, w: 228, h: 13 }, W = 480, H = 270) {
  input.endFrame();
  input.pad.buttons = []; input.pad.prev = []; input.pad.nav = null;
  Object.assign(input.mouse, { x: -1, y: -1 });
  const picker = new CombatMusicPicker(), ui = new UI(), choices = [];
  let selected = 'clockwork-charge';
  const frame = (dt = 0.2) => {
    ui.begin(dt);
    picker.draw(ctx, ui, rect, selected);
    if (picker.open) {
      ui.items = [];
      picker.drawMenu(ctx, ui, W, H, selected, (value) => { choices.push(value); selected = value; });
    }
    ui.end();
    input.endFrame();
  };
  const press = (key) => { input.justDown.add(key); frame(); };
  const click = (it) => { Object.assign(input.mouse, { x: it.x + 2, y: it.y + 2, clicked: true }); frame(); };
  frame();
  return { picker, ui, frame, press, click, choices, selected: () => selected };
}

test('music dropdown opens on Enter, keeps hover/browsing separate from selection, and returns focus after selection', () => {
  const p = pickerAt();
  p.ui.focusId = 'combat_music';
  p.press('Enter');
  assert.equal(p.picker.open, true);
  assert.deepEqual(p.choices, []);
  p.frame();
  assert.equal(p.ui.focusId, 'music_clockwork-charge');
  p.press('ArrowDown');
  assert.equal(p.ui.focusId, 'music_lantern-guard');
  assert.equal(p.selected(), 'clockwork-charge');
  p.press('Enter');
  assert.deepEqual(p.choices, ['lantern-guard']);
  assert.equal(p.picker.open, false);
  p.frame();
  assert.equal(p.ui.focusId, 'combat_music');
});

test('pointer and touch-style taps choose exactly one track, never the opening click', () => {
  const p = pickerAt();
  p.click(p.ui.items.find((it) => it.id === 'combat_music'));
  assert.equal(p.picker.open, true);
  assert.deepEqual(p.choices, []);
  p.frame();
  const target = p.ui.items.find((it) => it.id === 'music_spark-rush');
  Object.assign(input.mouse, { x: target.x + 3, y: target.y + 3, moved: true });
  p.frame();
  assert.deepEqual(p.choices, [], 'hover only focuses the option');
  p.click(target);
  assert.deepEqual(p.choices, ['spark-rush']);
  assert.equal(input.mouse.clicked, false);
});

test('Escape and an outside click close without changing the selected track or passing a click through', () => {
  for (const action of ['escape', 'outside']) {
    const p = pickerAt();
    p.ui.focusId = 'combat_music';
    p.press('Enter'); p.frame();
    if (action === 'escape') p.press('Escape');
    else p.click({ x: 1, y: 1 });
    assert.equal(p.picker.open, false, action);
    assert.deepEqual(p.choices, [], action);
    assert.equal(p.selected(), 'clockwork-charge');
    assert.equal(input.mouse.clicked, false);
    p.frame();
    assert.equal(p.ui.focusId, 'combat_music');
  }
});

test('gamepad navigation stays within the menu and A confirms the focused track', () => {
  const p = pickerAt();
  p.ui.focusId = 'combat_music';
  p.press('Enter'); p.frame();
  input.pad.nav = 'up'; p.frame(); input.pad.nav = null;
  assert.equal(p.ui.focusId, 'music_spark-rush', 'up wraps to the final option');
  input.pad.buttons = [true]; input.pad.prev = [false]; p.frame();
  input.pad.buttons = []; input.pad.prev = [];
  assert.deepEqual(p.choices, ['spark-rush']);
});

test('dropdown stays inside short landscape and narrow portrait viewports and opens above a low control', () => {
  for (const [W, H] of [[427, 240], [293, 633]]) {
    const rect = { x: W - 155, y: H - 27, w: 144, h: 13 };
    const p = pickerAt(rect, W, H);
    p.ui.focusId = 'combat_music'; p.press('Enter'); p.frame();
    const bounds = p.picker.menuBounds(W, H);
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.w <= W && bounds.y + bounds.h <= H, `${W}x${H}`);
    assert.ok(bounds.y + bounds.h <= rect.y, 'opens above the control');
    assert.equal(p.ui.items.length, COMBAT_MUSIC.length);
    assert.ok(p.ui.items.every((it) => it.x >= bounds.x && it.y >= bounds.y && it.x + it.w <= bounds.x + bounds.w && it.y + it.h <= bounds.y + bounds.h));
  }
});
