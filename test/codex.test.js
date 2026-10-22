// The progression's screens (shared/progress.js): the Codex's tiles fit a desktop, a laptop and a
// phone held upright, paged where a tab runs over; the results' UNLOCKED rows keep inside the
// panel and the nearest locks are the furthest along; the HUD draws the slots and the ultimate a
// run hasn't opened locked.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { CodexScreen, codexLayout, CODEX_TILE } from '../public/js/ui/screens.js';
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

test('the Codex: every tab\'s tiles on the screen at every size, on pages where they run over', () => {
  const all = codexEntries(everything());
  for (const [W, H] of SIZES) {
    for (const type of ['weapon', 'relic', 'ult']) {
      const n = all.filter((e) => e.type === type).length, L = codexLayout(W, H, n);
      assert.ok(L.x0 >= 4 && L.x0 + L.cols * L.cw + (L.cols - 1) * CODEX_TILE.gap <= W - 4, `${W}x${H} ${type}: within the sides`);
      assert.ok(L.y0 + L.rows * (L.ch + CODEX_TILE.gap) - CODEX_TILE.gap <= H - CODEX_TILE.foot, `${W}x${H} ${type}: above the foot`);
      assert.ok(L.pages * L.per >= n, `${W}x${H} ${type}: every tile on a page`);
      assert.ok(L.cw >= CODEX_TILE.min || L.cols === 1, `${W}x${H} ${type}: tiles wide enough for their lines`);
    }
  }
});

test('the Codex draws for a new player and for one with everything open, and turns its pages', () => {
  for (const prof of [defaultProfile(), everything()]) {
    for (const [W, H] of SIZES) {
      const app = { ui: new UI(), scene: { draw() {} }, store: { profile: prof }, go(name) { this.went = name; } };
      const s = new CodexScreen();
      s.enter(app);
      app.ui.lockT = 0;
      for (const type of ['weapon', 'relic', 'ult']) {
        s.tab = type;
        s.page = 0;
        s.draw(ctx, W, H, 1 / 60);
        const ids = app.ui.items.map((it) => it.id);
        assert.ok(['cx_weapon', 'cx_relic', 'cx_ult', 'back'].every((id) => ids.includes(id)), 'the tabs and BACK');
        const L = codexLayout(W, H, codexEntries(prof).filter((e) => e.type === type).length);
        assert.equal(ids.filter((id) => id.startsWith(`cx_${type}_`)).length, Math.min(L.per, codexEntries(prof).filter((e) => e.type === type).length), 'a page of tiles');
        assert.equal(ids.includes('cx_next'), L.pages > 1, 'the page arrows only where it runs over');
        for (const it of app.ui.items) assert.ok(it.x >= 0 && it.y >= 0 && it.x + it.w <= W && it.y + it.h <= H, `${it.id} on the screen at ${W}x${H}`);
      }
    }
  }
  // A new player: the weapons' shut tiles and the one ultimate of the one hero he has.
  const fresh = codexEntries(defaultProfile());
  assert.equal(fresh.filter((e) => e.type === 'ult').length, 1);
  assert.ok(fresh.some((e) => e.type === 'weapon' && !e.open));
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
