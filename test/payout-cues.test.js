// How the game's payouts tell themselves (28 October 2026), presentation only: a rare find out of a
// broken box pops out in a beam of its own light with a chime, the rarest with a sting and its
// name; a run of coins climbs in pitch as soul gems do; a champion's chest lands with a thud and a
// glint (a boss's and a lord's land inside their own beat). The odds and the amounts are untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, PROP_LOOT, PROP_HOLD, BOX_FIND } from '../public/js/game/game.js';
import { Beam } from '../public/js/game/effects.js';
import { COIN_COMBO } from '../public/js/game/pickups.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

// A seeded run: an unkillable Knight standing still, his weapons put away.
function game(fn, seed = 4) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(seed);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    Math.random = oldRandom;
    input.bot = oldBot;
  }
}

const FIND = { elixir: 2, relic: 2, map: 2, skull: 2, frostrune: 1, wildcap: 1, ward: 1, mirror: 1 };

test('the rare finds tell themselves as they pop out; the odds are untouched', () => {
  for (const d of PROP_LOOT) {
    assert.equal(d.find, FIND[d.kind], `${d.kind}: find ${FIND[d.kind]}`);
    if (d.find) assert.ok(d.lucky, `${d.kind}: a rare find is lucky`);
  }
  for (const kind of ['potion', 'fury', 'coins', 'goldpile', 'magnet']) assert.ok(PROP_LOOT.some((d) => d.kind === kind && !d.find), `${kind}: no find`);
  const sum = PROP_LOOT.reduce((s, d) => s + d.w, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `the weights still sum to 1 (${sum})`);
  assert.ok(BOX_FIND[2].tag && !BOX_FIND[1].tag, 'only the rarest show their name');
  assert.ok(BOX_FIND[2].h > BOX_FIND[1].h, 'and stand in the taller beam');
});

test('what a box held carries its find, no more and no less', () =>
  game((g, p) => {
    let held = 0;
    for (let i = 0; i < 80; i++) {
      const box = g.spawnEnemy('crate', p.x, p.y, { instant: true });
      g.pickups.length = 0;
      g.breakProp(box, 0);
      for (const pk of g.pickups) {
        held++;
        assert.equal(pk.opts.find, PROP_LOOT.find((d) => d.kind === pk.kind)?.find, `${pk.kind}: its find`);
      }
    }
    assert.ok(held > 0, 'some boxes held something');
  }));

// A pickup held as a broken box holds it, PROP_HOLD, then popping out over 30 frames.
function popOut(g, p, kind, find) {
  g.effects.length = 0;
  g.numbers.clear();
  const pk = g.addPickup(kind, p.x + 60, p.y, 1, { hold: PROP_HOLD, box: true, find, toss: [10, 0] });
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  return { pk, beam: g.effects.some((e) => e instanceof Beam && e.color === pk.glowColor), named: (s) => g.numbers.list.some((n) => n.str === s) };
}

test('a Holy Relic pops out in a beam of its light with its name; a Ward Bubble with a beam; a potion as ever', () =>
  game((g, p) => {
    const relic = popOut(g, p, 'relic', 2);
    assert.ok(relic.beam, 'the relic: a beam in its glow');
    assert.ok(relic.named('Holy Relic'), 'the relic: its name over where it lands');
    assert.ok(!relic.pk.dead, 'not taken from where it lies');
    const ward = popOut(g, p, 'ward', 1);
    assert.ok(ward.beam, 'the Ward Bubble: a beam');
    assert.ok(!g.numbers.list.some((n) => /[A-Za-z]/.test(n.str)), 'the Ward Bubble: no name');
    const potion = popOut(g, p, 'potion', undefined);
    assert.ok(!potion.beam, 'a potion: no beam');
  }));

test("a run of coins climbs in pitch to its cap, and starts again after a pause", () =>
  game((g, p) => {
    for (let i = 0; i < 20; i++) g.addPickup('coin', p.x, p.y, 1, { pop: false }).collect();
    assert.equal(g.coinCombo, COIN_COMBO.cap, 'capped');
    for (let i = 0; i < 30; i++) g.update(1 / 60);
    g.addPickup('coin', p.x, p.y, 1, { pop: false }).collect();
    assert.equal(g.coinCombo, 0, 'a pause: from the bottom again');
  }));

test("a champion's chest lands, once, where it fell, and waits there; a boss's lands in its own beat", () =>
  game((g, p) => {
    const c = g.addPickup('chest', p.x + 80, p.y, 0, { kind: 'elite' });
    const boss = g.addPickup('chest', p.x - 80, p.y, 0, { kind: 'boss' });
    for (let i = 0; i < 120 && !c.landed; i++) g.update(1 / 60);
    assert.ok(c.landed, 'it landed');
    assert.ok(!c.dead, 'and waits to be opened');
    const at = c.landedAt;
    for (let i = 0; i < 30; i++) g.update(1 / 60);
    assert.equal(c.landedAt, at, 'its bounce lands no second time');
    for (let i = 0; i < 60; i++) g.update(1 / 60);
    assert.ok(boss.z === 0 && !boss.landed, "a boss's chest is down, with no thud of its own over its beat");
  }));
