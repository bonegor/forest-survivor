// The HUD keeps out of its own way. The markers at the screen's edge stand clear of a boss's bar
// and name, a dungeon's lines at the top, the orbs in the bottom corners and what is over them,
// wherever the thing they point at is; each shows an icon of what it points at. The ultimate's
// name stays on the screen, over the fury orb. The pause screen shows the clock the HUD showed.
// Only the three elites nearest the hero are named, and a boss's words come after the names and
// the markers, below its own name at the top.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { GameScreen, PauseOverlay } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { HEROES } from '../public/js/data/heroes.js';
import { textCanvas, textWidth, GLYPH_H } from '../public/js/engine/font.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32, fmtTime, fmtNum } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

// A 1080p screen, as in the other tests of what is drawn.
view.pxW = 1920;
view.pxH = 1080;

// A seeded run of an unkillable hero, standing still, with no spawner and no weapons.
function game(fn, { hero = 'knight', mode = 's15', seed = 7 } = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode, meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    g.player.devGod = true;
    g.spawner.update = () => {};
    g.player.weapons.length = 0;
    g.syncCam();
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// A 2D context that writes down every call (and every setting), in order, and does nothing.
function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (t, k) => (...a) => calls.push([k, ...a]),
    set: (t, k, v) => (calls.push(['=' + String(k), v]), true),
  });
  return { ctx, calls };
}

const hit = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
// What a line of text drawn at (x, y) covers, outline and all, by its alignment.
function textBox(str, x, y, align = 'left') {
  const w = textWidth(str);
  const x0 = align === 'center' ? Math.round(x - w / 2) : align === 'right' ? x - w : x;
  return [x0 - 1, y - 1, w + 2, GLYPH_H + 2];
}

// The edge markers drawn in one frame: what each covers, arrow and icon, and the icons.
function markers(g, W, H, t = 0.3) {
  const { ctx, calls } = recorder();
  g.hud.drawIndicators(ctx, W, H, t);
  const boxes = [], icons = [];
  for (const c of calls) {
    // The arrow: a triangle at most 6.4 px from where it is put.
    if (c[0] === 'translate') boxes.push([c[1] - 7, c[2] - 7, 14, 14]);
    else if (c[0] === 'drawImage') {
      boxes.push([c[2], c[3], c[1].width, c[1].height]);
      icons.push(c[1]);
    }
  }
  return { boxes, icons, arrows: calls.filter((c) => c[0] === 'translate').length };
}

// Chests all round the screen, off it: a sweep of every direction, far and just off the edge,
// and many at random.
function chestsAround(g, W, H, n = 1500) {
  const cam = g.cam, z = cam.S / view.S, rnd = mulberry32(99);
  const at = (sx, sy) => g.pickups.push({ kind: 'chest', x: cam.x + sx / z, y: cam.y + sy / z });
  for (let d = 0; d < 360; d += 0.5) {
    const a = (d * Math.PI) / 180;
    for (const r of [0.55, 0.62, 3]) at(W / 2 + Math.cos(a) * W * r, H / 2 + Math.sin(a) * W * r);
  }
  for (let i = 0; i < n; i++) {
    const sx = -600 + rnd() * (W + 1200), sy = -400 + rnd() * (H + 800);
    if (sx > 8 && sy > 8 && sx < W - 8 && sy < H - 8) continue;
    at(sx, sy);
  }
}

// What the markers keep off, as the HUD draws it.
function keepOff(g, W, H) {
  const out = {
    'the health orb': [0, H - 52, 52, 52],
    'the fury orb': [W - 52, H - 52, 52, 52],
  };
  const b = g.boss;
  if (b && !b.dead) {
    const y = g.mode === 'dungeon' || g.inCrypt ? 48 : 40, w = Math.min(220, W - 120);
    const label = b.lord ? `${b.name.toUpperCase()}, LORD OF THE CRYPT` : `${b.def.name.toUpperCase()}, ${b.def.title.toUpperCase()}`;
    out["the boss's bar"] = [Math.floor(W / 2 - w / 2) - 2, y - 2, w + 4, 10];
    out["the boss's name"] = textBox(label, W / 2, y + 9, 'center');
  }
  const p = g.player;
  if (p.ult || p.fury >= 100) out["the ultimate's name"] = textBox(p.hero.ultName.toUpperCase(), W - 4, H - 52 - 11, 'right');
  if (g.mode === 'dungeon') {
    out['the floor line'] = textBox(`FLOOR ${g.floor} · ${g.floorName.toUpperCase()}`, W / 2, 10, 'center');
    if (g.objective) out['the seal line'] = textBox(g.objective, W / 2, 21, 'center');
    out['the clock'] = textBox(fmtTime(g.time), W / 2, 32, 'center');
    out['the minimap'] = [W - g.world.W - 6, 34, g.world.W + 4, g.world.H + 4];
  }
  return out;
}

function assertClear(g, W, H, what) {
  const { boxes, icons, arrows } = markers(g, W, H);
  assert.ok(arrows > 500, `${what}: many markers (${arrows})`);
  assert.equal(icons.length, arrows, `${what}: each marker has its icon`);
  for (const [name, r] of Object.entries(keepOff(g, W, H))) {
    const bad = boxes.find((b) => hit(b, r));
    assert.ok(!bad, `${what}: a marker at ${bad} is on ${name} (${r})`);
  }
}

test('the edge markers keep off the boss bar and name and the orbs, wherever what they point at is', () => {
  for (const W of [480, 427]) {
    const H = 270;
    game((g, p) => {
      g.shrines.length = 0;
      g.crypts.length = 0;
      g.spawnBoss('butcher', p.x + 900, p.y + 40);
      p.fury = 100;
      p.buffs.set('fury', { t: 20, max: 30 });
      p.buffs.set('haste', { t: 10, max: 30 });
      chestsAround(g, W, H);
      assertClear(g, W, H, `a boss in the forest, ${W} wide`);
    });
  }
});

test('in a dungeon they keep below its floor and seal lines and the boss, and off the minimap', () =>
  game((g, p) => {
    const W = 480, H = 270;
    g.spawnBoss('butcher', p.x + 900, p.y + 40);
    g.objective = 'Break the seal: slay foes, strike it (42%)';
    p.ult = { t: 1 };
    g.pickups.length = 0;
    chestsAround(g, W, H);
    assertClear(g, W, H, 'a boss in the dungeon');
  }, { mode: 'dungeon' }));

test('with no boss up they still keep off the orbs', () =>
  game((g) => {
    const W = 480, H = 270;
    g.shrines.length = 0;
    g.crypts.length = 0;
    chestsAround(g, W, H);
    assertClear(g, W, H, 'no boss');
  }));

// What the combo at the right edge covers as drawn at rest (Hud.drawCombo): its count, its word
// and its timer.
function comboBoxes(g, W, H) {
  const { ctx, calls } = recorder();
  g.hud.lastCombo = g.combo;
  g.hud.comboScale = 1;
  g.hud.drawCombo(ctx, W, H, 0.3);
  return calls
    .filter((c) => c[0] === 'drawImage' || c[0] === 'fillRect')
    .map((c) => (c[0] === 'fillRect' ? c.slice(1, 5) : [c[2], c[3], c[4] ?? c[1].width, c[5] ?? c[1].height]));
}

test('they keep off the combo at the right edge while it is up, and stand there when it is not', () =>
  game((g) => {
    const W = 480, H = 270;
    g.shrines.length = 0;
    g.crypts.length = 0;
    chestsAround(g, W, H);
    g.combo = 0;
    const free = markers(g, W, H).boxes;
    for (const n of [12, 381, 4000]) {
      g.combo = n;
      g.comboT = 2;
      const combo = comboBoxes(g, W, H);
      assert.ok(combo.length >= 3, `a combo of ${n} is drawn`);
      assert.ok(free.some((b) => combo.some((r) => hit(b, r))), 'with no combo up the markers stand where it goes');
      const bad = markers(g, W, H).boxes.find((b) => combo.some((r) => hit(b, r)));
      assert.ok(!bad, `a combo of ${n}: a marker at ${bad} is on it`);
    }
  }));

test('each kind of marker has its own icon, so that colour is not all that tells them apart', () =>
  game((g, p) => {
    const W = 480, H = 270;
    g.shrines.length = 0;
    g.crypts.length = 0;
    g.spawnBoss('butcher', p.x + 900, p.y);
    // A Shrine of Fury is the boss's red; a Shrine of Fortune, a chest's gold; the thief, nearly.
    g.shrines.push({ x: p.x - 900, y: p.y, type: 'fury', used: false }, { x: p.x, y: p.y - 700, type: 'fortune', used: false });
    g.addPickup('chest', p.x, p.y + 700);
    g.spawnEnemy('thief', p.x + 900, p.y + 500, { instant: true });
    const { icons, arrows } = markers(g, W, H);
    assert.equal(arrows, 5);
    assert.equal(new Set(icons).size, 5, 'five icons, all different');
  }));

test("the ultimate's name stays on the screen, over the fury orb and flush with its right edge", () => {
  for (const hero of Object.keys(HEROES)) {
    for (const W of [480, 400]) {
      game((g, p) => {
        const H = 270, label = p.hero.ultName.toUpperCase();
        for (const [state, color] of [[() => (p.ult = { t: 1 }), '#f6757a'], [() => ((p.ult = null), (p.fury = 100)), null]]) {
          state();
          const { ctx, calls } = recorder();
          g.hud.drawOrbs(ctx, W, H, p, 0.1);
          // Full and waiting, the name blinks between two colours.
          const shown = color ? [textCanvas(label, color)] : [textCanvas(label, '#fee761'), textCanvas(label, '#f6757a')];
          const call = calls.find((c) => c[0] === 'drawImage' && shown.includes(c[1]));
          assert.ok(call, `${hero}: the name is drawn`);
          const right = call[2] + call[1].width - 1, bottom = call[3] + call[1].height - 1;
          assert.equal(right, W - 4, `${hero} ${W} wide: the name ends where the orb does`);
          assert.ok(call[2] >= 0, `${hero}: and starts on the screen`);
          assert.ok(bottom <= H - 52, `${hero}: above the orb`);
        }
      }, { hero });
    }
  }
});

test('the pause screen shows the clock the HUD shows: time left in a timed run, time so far else', () => {
  const ctx = document.createElement('canvas').getContext('2d');
  Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1 });
  for (const [mode, line] of [['s15', 'TIME LEFT 07:18'], ['ranked', 'TIME 07:42'], ['dungeon', 'TIME 07:42']]) {
    game((g, p) => {
      g.time = 7 * 60 + 42;
      // The HUD's clock.
      const hud = recorder();
      g.hud.drawTop(hud.ctx, 480, 0);
      const clock = line.slice(-5), big = textCanvas(clock, ['#ffffff', '#ffffff', '#c0cbdc'], '#181425'), small = textCanvas(clock, '#8b9bb4');
      assert.ok(hud.calls.some((c) => c[0] === 'drawImage' && (c[1] === big || c[1] === small)), `${mode}: the HUD shows ${clock}`);
      // The pause screen's line under the build.
      const gs = new GameScreen();
      gs.app = { ui: new UI(), settings: {}, devHold: false, store: {} };
      gs.game = g;
      g.state = 'paused';
      const pause = new PauseOverlay(gs);
      const rec = recorder();
      pause.draw(rec.ctx, 480, 270, 0.1);
      const stats = textCanvas(`${line} · LV ${p.level} · KILLS ${fmtNum(g.kills)} · GOLD ${fmtNum(g.gold)}`, '#feae34');
      assert.ok(rec.calls.some((c) => c[0] === 'drawImage' && c[1] === stats), `${mode}: the pause screen says ${line}`);
    }, { mode });
  }
});

test('only the three elites nearest the hero are named; a boss speaks over them and the markers, below its name', () =>
  game((g, p) => {
    const W = 480, H = 270;
    const elites = [];
    for (let i = 0; i < 6; i++) {
      const e = g.spawnEnemy('skeleton', p.x - 100 + i * 40, p.y + 30 + (i % 2) * 20, { instant: true });
      e.elite = true;
      e.mod = null;
      e.name = `ELITE NUMBER ${i}`;
      elites.push(e);
    }
    // The boss right at the top of the screen, saying something.
    const cam = g.cam, z = cam.S / view.S;
    const b = g.spawnBoss('butcher', p.x, cam.y + 30 / z);
    b.y += b.h + 6; // his head, not his feet, 30 HUD px down: he is as tall as the Bone King
    b.speech = { text: 'YOU WILL FEED THE FOREST!', t: 2 };
    // And a chest off the top of the screen: its marker stands where the words may.
    g.addPickup('chest', p.x, p.y - 700);
    const { ctx, calls } = recorder();
    g.hud.draw(ctx, W, H, 0.3);
    const near = elites.slice().sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y));
    const named = (e) => calls.findIndex((c) => c[0] === 'drawImage' && c[1] === textCanvas(e.name, '#feae34'));
    for (const e of near.slice(0, 3)) assert.ok(named(e) >= 0, `${e.name} (near) is named`);
    for (const e of near.slice(3)) assert.equal(named(e), -1, `${e.name} (further) is not`);
    // Each still shows its health: six full bars of red.
    assert.equal(calls.filter((c, i) => c[0] === 'fillRect' && c[3] === 26 && calls[i - 1][1] === '#e43b44').length, 6);
    // The bubble: its dark frame, after every name, and below the boss's name.
    const tw = textWidth(b.speech.text);
    const frame = calls.findIndex((c) => c[0] === 'fillRect' && c[3] === tw + 8 && c[4] === 13);
    assert.ok(frame > 0, 'the boss speaks');
    assert.ok(near.slice(0, 3).every((e) => named(e) < frame), 'after the names');
    const marker = calls.findLastIndex((c) => c[0] === 'translate');
    assert.ok(marker > 0 && marker < frame, 'and after the markers');
    const nameBottom = 40 + 9 + GLYPH_H + 1;
    assert.ok(calls[frame][2] >= nameBottom, `below the boss's name (${calls[frame][2]} >= ${nameBottom})`);
  }));
