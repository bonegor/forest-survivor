// Level-ups and chests once the build is maxed. The owner: "once user has leveled up all it can
// and has no choice, boxes should still give the remaining upgrades; additionally, for the
// remaining upgrades the user should have an option to 'always pick' — e.g. either pick gold, or
// select 'always pick gold' and that would make level-up seamless". Chests and level-ups draw from
// one pool; with it empty a level-up shows the three fillers, each with an ALWAYS toggle, and a run
// with an auto-pick levels up with no screen and no pause (the pause menu asks again).
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, FILLERS, isFiller } from '../public/js/game/game.js';
import { GameScreen, LevelUpOverlay, ChestOverlay, PauseOverlay } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';
import { view } from '../public/js/engine/view.js';
import { input } from '../public/js/engine/input.js';
import { xpFor } from '../public/js/game/player.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses, sanitizeCheckpoint } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });

// A seeded run behind a game screen of its own, as the browser has (no title screen, no server).
function screen(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed ?? 21);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, ...o });
    g.player.devGod = true;
    const gs = new GameScreen();
    gs.app = { ui: new UI(), settings: {}, devHold: false, store: { saveCheckpoint() {} } };
    gs.game = g;
    gs.overlay = null;
    gs.autosaveT = 60;
    gs.frame(1 / 60);
    return fn(g, gs, g.player);
  } finally {
    input.bot = oldBot;
    input.endFrame();
    input.held.clear();
    Math.random = oldRandom;
  }
}

// The developer panel's way to the top: 150 levels, each taking the first card.
function maxOut(g) {
  const p = g.player;
  for (let i = 0; i < 150; i++) {
    p.level++;
    p.xpNext = xpFor(p.level);
    g.applyChoice(g.levelChoices(g.choiceCount())[0]);
  }
  p.recompute();
  assert.equal(g.upgradePool().length, 0, 'the whole build is maxed');
  assert.equal(p.weapons.length, 6);
  assert.equal(p.passives.size, 6);
}

// Levels gained as gems would bring them.
const levelUp = (p, n) => {
  for (let i = 0; i < n; i++) p.addXp((p.xpNext - p.xp) / p.growth / 1.1 + 0.01);
};

const ids = (gs) => gs.app.ui.items.map((it) => it.id);

test('a maxed build is offered the three fillers, even on a four-card level-up, and no reroll', () => {
  screen((g, gs, p) => {
    maxOut(g);
    assert.deepEqual(g.levelChoices(4).map((c) => c.type), FILLERS, 'three cards, no copy for a fourth');
    g.choiceCount = () => 4;
    g.state = 'levelup';
    g.pendingLevels = 1;
    const lv = new LevelUpOverlay(gs);
    assert.equal(lv.choices.length, 3);
    assert.ok(lv.fillersOnly && lv.choices.every(isFiller));
    const rerolls = p.rerolls;
    assert.ok(rerolls > 0);
    lv.draw(ctx, 480, 270, 0.5);
    input.justDown.add('KeyR');
    lv.draw(ctx, 480, 270, 0.1);
    input.endFrame();
    assert.ok(!ids(gs).includes('reroll'), 'no reroll button');
    assert.deepEqual(ids(gs).filter((id) => id.startsWith('a')), ['a0', 'a1', 'a2'], 'an ALWAYS under each card');
    assert.equal(p.rerolls, rerolls, 'R spends nothing on fillers');
  });
  // With upgrades left there is no ALWAYS, and the reroll is there.
  screen((g, gs) => {
    g.state = 'levelup';
    g.pendingLevels = 1;
    const lv = new LevelUpOverlay(gs);
    lv.draw(ctx, 480, 270, 0.5);
    assert.ok(!lv.fillersOnly);
    assert.ok(ids(gs).includes('reroll'));
    assert.ok(!ids(gs).some((id) => id.startsWith('a')));
  });
});

test('ALWAYS on a filler sets the auto-pick, and the levels after it come with no screen', () => {
  for (const [type, i] of [['bless', 0], ['heal', 1], ['gold', 2]]) {
    screen((g, gs, p) => {
      maxOut(g);
      levelUp(p, 1);
      gs.frame(1 / 60);
      assert.equal(g.state, 'levelup');
      assert.ok(gs.overlay instanceof LevelUpOverlay);
      // Tick the card's ALWAYS (a click on the toggle), then take the card.
      const lv = gs.overlay;
      lv.draw(ctx, 480, 270, 0.5);
      const box = gs.app.ui.items.find((it) => it.id === 'a' + i);
      Object.assign(input.mouse, { x: box.x + 2, y: box.y + 2, clicked: true });
      gs.app.ui.lockT = 0;
      gs.frame(1 / 60);
      input.endFrame();
      assert.equal(lv.always, i, 'ticked');
      input.justDown.add(['Digit1', 'Digit2', 'Digit3'][i]);
      gs.frame(1 / 60);
      input.endFrame();
      assert.equal(g.autoPick, type);
      assert.equal(gs.overlay, null);
      assert.equal(g.state, 'play');
      // Then, playing on: a burst of levels, and one more later. No screen, no pause.
      const before = { bless: p.blessings, gold: g.gold, stats: g.stats.gold, level: p.level };
      p.hp = 1;
      const states = new Set(), seen = [];
      const lines = () => g.numbers.list.filter((n) => n.font === 'normal' && !seen.includes(n)).map((n) => (seen.push(n), n.str));
      // One line over the hero for the burst of three, one for the level after (shown with
      // damage numbers off too).
      const want = {
        bless: [`Blessing ×${before.bless + 3}`, `Blessing ×${before.bless + 4}`],
        heal: ['+100% health', '+35% health'],
        gold: [/^\+\d+ gold$/, /^\+\d+ gold$/],
      }[type];
      levelUp(p, 3);
      for (let f = 0; f < 120; f++) {
        if (f === 60) levelUp(p, 1);
        gs.frame(1 / 60);
        states.add(g.state);
        assert.ok(!(gs.overlay instanceof LevelUpOverlay), 'no level-up screen');
        const said = lines();
        if (f !== 0 && f !== 60) assert.equal(said.length, 0, `frame ${f}: ${said}`);
        else {
          assert.equal(said.length, 1, `frame ${f}: ${said}`);
          const w = want[f ? 1 : 0];
          if (typeof w === 'string') assert.equal(said[0], w);
          else assert.match(said[0], w);
        }
      }
      assert.ok(!states.has('levelup'), [...states].join());
      assert.equal(p.level, before.level + 4);
      assert.equal(g.pendingLevels, 0);
      if (type === 'bless') assert.equal(p.blessings, before.bless + 4);
      if (type === 'heal') assert.ok(p.hp > p.maxHp * 0.5, `healed: ${p.hp} of ${p.maxHp}`);
      if (type === 'gold') {
        assert.ok(g.gold >= before.gold + 4 * 30, `gold: ${before.gold} → ${g.gold}`);
        assert.ok(g.stats.gold - before.stats >= 4 * 30, 'and counted as gold found');
      }
    });
  }
});

test('Shift and the card\'s number take it for good; the pause menu asks again', () => {
  screen((g, gs, p) => {
    maxOut(g);
    levelUp(p, 2);
    gs.frame(1 / 60);
    assert.ok(gs.overlay instanceof LevelUpOverlay);
    gs.overlay.draw(ctx, 480, 270, 0.5);
    gs.app.ui.lockT = 0;
    input.held.add('ShiftLeft');
    input.justDown.add('Digit3');
    gs.frame(1 / 60);
    input.endFrame();
    input.held.clear();
    assert.equal(g.autoPick, 'gold');
    assert.equal(gs.overlay, null, 'the second level waiting went the same way');
    assert.equal(g.pendingLevels, 0);
    const text = g.numbers.list.find((n) => n.font === 'normal');
    assert.match(text?.str || '', /^\+\d+ gold$/, 'one line over the hero says what it gave');
    // Pause: "Level-ups: always Gold", and ASK AGAIN clears it.
    g.state = 'paused';
    const pause = new PauseOverlay(gs);
    gs.app.ui.lockT = 0;
    pause.draw(ctx, 480, 270, 0.1);
    const ask = gs.app.ui.items.find((it) => it.id === 'ask');
    assert.ok(ask, 'the pause menu offers to ask again');
    Object.assign(input.mouse, { x: ask.x + 2, y: ask.y + 2, clicked: true });
    pause.draw(ctx, 480, 270, 0.1);
    input.endFrame();
    assert.equal(g.autoPick, null);
    pause.draw(ctx, 480, 270, 0.1);
    assert.ok(!ids(gs).includes('ask'));
    // And the next level-up is a screen again.
    g.state = 'play';
    gs.overlay = null;
    levelUp(p, 1);
    gs.frame(1 / 60);
    assert.equal(g.state, 'levelup');
  });
});

test('the auto-pick lasts the run: it survives a save and nothing else is kept', () => {
  screen((g) => {
    g.autoPick = 'heal';
    const cp = sanitizeCheckpoint(JSON.parse(JSON.stringify(g.checkpoint())));
    assert.equal(cp.auto, 'heal');
    const again = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, checkpoint: cp });
    assert.equal(again.autoPick, 'heal');
    assert.equal(sanitizeCheckpoint({ ...cp, auto: 'evolve' }).auto, null);
    assert.equal(sanitizeCheckpoint({ ...cp, auto: undefined }).auto, null, 'a save from before has none');
    const fresh = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } });
    assert.equal(fresh.autoPick, null, 'a new run asks again');
  });
});

test('a chest draws from the level-up pool: never gold alone while upgrades remain, new weapons while a slot is free', () => {
  screen((g, gs, p) => {
    let newWeapons = 0, newRelics = 0;
    for (let k = 0; k < 40; k++) {
      const left = g.upgradePool().length;
      const roll = g.rollChest(k % 3 ? 'elite' : 'boss');
      const real = roll.items.filter((it) => !isFiller(it));
      if (left) assert.ok(real.length >= 1, `chest ${k}: ${JSON.stringify(roll.items.map((it) => it.type))}`);
      for (const it of real) {
        if (it.type === 'weapon' && it.isNew) newWeapons++;
        if (it.type === 'passive' && it.isNew) newRelics++;
        // Given as rolled (the same weapon may grow twice in one chest).
        if (it.type === 'weapon') assert.ok(p.weapons.find((w) => w.id === it.id)?.level >= it.level, 'given as rolled');
      }
      assert.ok(p.weapons.length <= 6 && p.passives.size <= 6);
    }
    assert.ok(newWeapons >= 1, `new weapons from chests: ${newWeapons}`);
    assert.ok(newRelics >= 1, `new relics from chests: ${newRelics}`);
  });
});

test('a chest on a maxed build gives the auto-pick, else Blessings, and its screen shows them', () => {
  for (const auto of [null, 'bless', 'heal', 'gold']) {
    screen((g, gs, p) => {
      maxOut(g);
      for (const w of p.weapons) if (w.def.evo) w.evolve(); // nothing left to evolve either
      g.autoPick = auto;
      const bless = p.blessings;
      g.state = 'chest';
      const chest = new ChestOverlay(gs, 'boss');
      const items = chest.roll.items;
      assert.ok(items.length >= 3, 'a boss chest holds three or five');
      assert.deepEqual([...new Set(items.map((it) => it.type))], [auto || 'bless']);
      if (!auto || auto === 'bless') assert.equal(p.blessings, bless + items.length);
      for (let i = 0; i < 30; i++) chest.draw(ctx, 480, 270, 0.15);
      assert.equal(chest.revealed, items.length, 'every item shown');
    });
  }
});

test('a Purse of Gold grows with the night and the hero\'s greed, and counts as gold found', () => {
  screen((g, gs, p) => {
    assert.equal(g.filler('gold').value, 30, 'at dusk');
    g.time = 600; // phase 14
    assert.equal(g.filler('gold').value, Math.round(30 * 2.4));
    p.greed = 1.5;
    const purse = g.filler('gold');
    assert.equal(purse.value, Math.round(30 * 2.4 * 1.5));
    const gold = g.gold, found = g.stats.gold;
    g.applyChoice(purse);
    assert.equal(g.gold, gold + purse.value);
    assert.equal(g.stats.gold, found + purse.value);
  });
});
