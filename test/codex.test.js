// The progression's screens (shared/progress.js): the Codex's tiles fit a desktop, a laptop and a
// phone held upright, scrolled where a tab runs over; the results' UNLOCKED rows keep inside the
// panel and the nearest locks are the furthest along; the HUD draws the slots and the ultimate a
// run hasn't opened locked.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { CodexScreen, codexLayout, codexTab, CODEX_TILE, menuEntries } from '../public/js/ui/screens.js';
import { chipRows } from '../public/js/ui/gamescreen.js';
import { codexEntries, codexRecord, nearestLocks } from '../public/js/ui/ladder.js';
import { UI } from '../public/js/ui/ui.js';
import { buildSprites, SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { MAX_WEAPONS, MAX_RELICS } from '../public/js/data/weapons.js';
import { defaultProfile, metaBonuses, openFor, openEverything, HERO_ORDER } from '../public/js/shared/profile.js';

if (!SPR.i_might) buildSprites();
const ctx = document.createElement('canvas').getContext('2d');
// 1280 x 720, 1920 x 1080 and a 390 x 844 phone at three device pixels, in the UI's pixels.
const SIZES = [[640, 360], [480, 270], [293, 633]];

const everything = () => {
  const p = openEverything(defaultProfile());
  p.heroes = [...HERO_ORDER];
  return p;
};

test('the Codex: every tab\'s tiles on the screen at every size, scrolling where they run over', () => {
  const prof = everything();
  for (const [W, H] of SIZES) {
    for (const type of ['weapon', 'relic', 'ult']) {
      const n = codexTab(prof, type).length, L = codexLayout(W, H, n);
      assert.ok(L.x0 >= 4 && L.x0 + L.cols * L.cw + (L.cols - 1) * CODEX_TILE.gap <= W - 4, `${W}x${H} ${type}: within the sides`);
      assert.ok(L.y0 + L.view <= H - CODEX_TILE.foot, `${W}x${H} ${type}: above the foot`);
      assert.ok(L.total * L.step - CODEX_TILE.gap - L.most <= L.view, `${W}x${H} ${type}: scrolled to the end, the last row in sight`);
      assert.equal(L.most > 0, L.total > L.rows, `${W}x${H} ${type}: it scrolls only where it runs over`);
      assert.ok(L.cw >= CODEX_TILE.min || L.cols === 1, `${W}x${H} ${type}: tiles wide enough for their lines`);
      if (W >= 480) assert.equal(L.cols, 4, `${W}x${H} ${type}: four to a row`);
    }
  }
});

test("the Codex's tabs hold every category; a tile of another tab in focus shows its tab, scrolled to it", () => {
  for (const prof of [defaultProfile(), everything()]) {
    for (const [W, H] of SIZES) {
      const app = { ui: new UI(), scene: { draw() {} }, store: { profile: prof }, go() {} };
      const s = new CodexScreen();
      s.enter(app);
      s.draw(ctx, W, H, 1 / 60);
      const entries = menuEntries(prof), ults = codexTab(prof, 'ult'), L = codexLayout(W, H, ults.length);
      assert.deepEqual([...new Set(entries.map(e => e.type))], ['feature', 'weapon', 'relic', 'ult']);
      assert.equal(s.tab, 'weapon');
      assert.equal(codexTab(prof, 'weapon').at(-1).id, 'exclusions', 'the exclusion slots after the weapons');
      assert.ok(app.ui.items.some(i => i.id === 'cx_feature_exclusions'));
      assert.ok(['ct_weapon', 'ct_relic', 'ct_ult'].every(id => app.ui.items.some(i => i.id === id)), 'the three tabs');
      assert.ok(!app.ui.items.some(i => i.id.startsWith('cx_relic_')), 'one tab at a time');
      assert.ok(app.ui.items.some(i => i.id === 'back'));
      for (const it of app.ui.items) {
        assert.ok(it.x >= 0 && it.x + it.w <= W);
        assert.ok(it.y >= 0 && (it.id.startsWith('cx_') ? it.y < H : it.y + it.h <= H));
      }
      const last = ults.at(-1);
      app.ui.focusId = `cx_${last.type}_${last.id}`;
      for (let i = 0; i < 90; i++) s.draw(ctx, W, H, 1 / 60);
      assert.equal(s.tab, 'ult');
      assert.equal(s.want, L.most);
      const tile = app.ui.items.find(i => i.id === `cx_${last.type}_${last.id}`);
      assert.ok(tile && tile.y >= L.y0 && tile.y + tile.h <= L.y0 + L.view);
    }
  }
});

test('the locks nearest to opening come furthest along first, each told in its own measure', () => {
  const p = defaultProfile();
  p.best.time = 44;
  p.best.level = 5;
  const near = nearestLocks(p, 2);
  assert.equal(near.length, 2);
  assert.ok(near.every((e) => !e.open));
  assert.ok(near[0].progress >= near[1].progress);
  assert.equal(near[0].id, 'frost', 'Survive 1:00, at 0:44');
  assert.match(codexRecord(near[0]), /0:44 best$/);
  assert.equal(codexRecord({ ...near[0], open: true }), '', 'nothing told of one open');
});

test('the results\' UNLOCKED rows keep within the panel', () => {
  const list = codexEntries(everything()).filter((e) => !e.start);
  for (const w of [277, 324]) {
    const rows = chipRows(list, w);
    assert.equal(rows.flat().filter((c) => c.e).length, list.length, 'every one in a row');
    for (const row of rows) assert.ok(row.reduce((s, c) => s + c.w, 0) + 10 * (row.length - 1) <= w, 'no row wider than the panel');
  }
  assert.deepEqual(chipRows([], 300), [], 'nothing opened: no rows');
});

test('the HUD draws the slots a run hasn\'t opened and a shut ultimate locked', () => {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(3);
  try {
    input.bot = { x: 0, y: 0 };
    const prof = defaultProfile();
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(prof), open: openFor(prof, 'knight'), settings: { numbers: false } });
    g.player.devGod = true;
    g.spawner.update = () => {};
    g.update(1 / 60);
    let locked = 0;
    const slot = g.hud.lockedSlot.bind(g.hud);
    g.hud.lockedSlot = (...a) => {
      locked++;
      slot(...a);
    };
    g.hud.draw(ctx, 480, 270, 1);
    assert.equal(locked, MAX_WEAPONS - g.maxWeapons + MAX_RELICS - g.maxRelics, 'each slot past the run\'s locked');
    assert.ok(locked > 0, 'a new player has fewer than six of each');
    assert.ok(g.player.ultLocked, 'his ultimate shut');
    const before = g.hud.comets?.length || 0;
    g.hud.comet(g.player.x + 40, g.player.y, 0);
    assert.equal(g.hud.comets?.length || 0, before, 'no fury comet flies to a locked orb');
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
});

test('the Codex scrolls: the wheel a row, the keys bring the focused tile into view; Consecration leads the second line', () => {
  const prof = everything();
  const entries = menuEntries(prof);
  const weapons = entries.filter((e) => e.type === 'weapon');
  const starts = weapons.filter((e) => e.start).length;
  assert.equal(starts, 4, "four open from the start: a line of four on a 1280-wide screen");
  assert.equal(weapons[starts].id, 'aura', 'Consecration first on the second line');
  const [W, H] = [480, 270]; // 1920 x 1080: the relics run over
  const app = { ui: new UI(), scene: { draw() {} }, store: { profile: prof }, go() {} };
  const s = new CodexScreen();
  s.enter(app);
  app.ui.lockT = 0;
  const relics = codexTab(prof, 'relic');
  app.ui.focusId = `cx_relic_${relics[0].id}`;
  const L = codexLayout(W, H, relics.length);
  assert.ok(L.most > 0, 'every relic is more than a screen');
  const frame = () => {
    s.draw(ctx, W, H, 1 / 60);
    input.mouse.wheel = 0;
  };
  input.mouse.x = input.mouse.y = -1;
  frame();
  input.mouse.wheel = 1;
  for (let i = 0; i < 60; i++) frame();
  assert.equal(s.scroll, L.step, 'a notch, a row');
  // The last tile focused (as the keys would): scrolled to it.
  const last = relics.at(-1);
  app.ui.focusId = `cx_${last.type}_${last.id}`;
  for (let i = 0; i < 60; i++) frame();
  assert.equal(s.scroll, L.most, 'down to the end');
  const tile = app.ui.items.find((it) => it.id === `cx_${last.type}_${last.id}`);
  assert.ok(tile && tile.y >= L.y0 && tile.y + tile.h <= L.y0 + L.view, 'the last tile in full view');
  // A drag down with the mouse: back to the top, and lifting is no click.
  input.mouse.x = W / 2;
  input.mouse.y = L.y0 + 10;
  input.mouse.down = true;
  frame();
  input.mouse.y = L.y0 + 10 + L.most;
  frame();
  input.mouse.down = false;
  input.mouse.clicked = true;
  frame();
  assert.equal(s.scroll, 0, 'dragged back to the top');
  assert.equal(input.mouse.clicked, false, 'the drag is no click');
  input.mouse.x = input.mouse.y = -1;
});
