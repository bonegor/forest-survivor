// The leftovers: a boss slain while his name card is up ends it before "…is slain!" shows; first-run
// hints wait for a warning, the ultimate's cut-in or a name card; the chest's items at 2× where
// they fit.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { CARD_END } from '../public/js/game/arrival.js';
import { chestItemScale, chestLayout } from '../public/js/ui/gamescreen.js';
import { buildSprites, SPR } from '../public/js/engine/sprites.js';
import { textCanvas } from '../public/js/engine/font.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(5);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.spawner.update = () => {};
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const run = (g, s) => {
  for (let i = 0; i < Math.round(s * 60); i++) g.update(1 / 60);
};

test('a boss slain 1 s after he comes: his card goes first, then "…is slain!"', () =>
  game((g, p) => {
    const k = g.spawnBoss('boneking', p.x + 80, p.y);
    run(g, 1);
    assert.ok(g.card, 'the card is up');
    g.killEnemy(k);
    const slain = g.banners.find((b) => /is slain!/.test(b.title));
    assert.ok(slain, 'the banner is queued');
    run(g, CARD_END / 2);
    assert.ok(g.card, 'the card fading');
    assert.equal(slain.t, 0, 'the banner waits, not shown, not running down');
    run(g, CARD_END);
    assert.equal(g.card, null, 'the card gone within its fade');
    run(g, 0.1);
    assert.ok(slain.t > 0, 'then the banner');
  }));

test('a first-run hint waits for a warning, the ultimate’s cut-in and a name card', () =>
  game((g, p) => {
    const said = (id) => !!g.settings.hints?.[id];
    g.warnings.push({ ev: { type: 'swarm', enemy: 'bat' }, from: [100, 0], t: 0 });
    run(g, 3);
    assert.ok(!said('move'), 'not while a warning is up');
    g.warnings.length = 0;
    run(g, 0.1);
    assert.ok(said('move'), 'said once it has gone');
    const hint = g.banners.find((b) => b.hint);
    assert.ok(hint);
    const t0 = hint.t;
    g.ultLaunch = { type: 'whirlwind', t: 0, started: true };
    run(g, 0.3);
    assert.equal(hint.t, t0, 'held under a cut-in');
    g.ultLaunch = null;
    g.card = { name: 'X', title: 'Y', color: '#fff', t: 0, letterbox: true };
    run(g, 0.3);
    assert.equal(hint.t, t0, 'and under a name card');
  }, { hints: true, settings: { numbers: false, hints: {} } }));

test('the chest’s things at 2× where five fit, today’s size where they don’t', () => {
  assert.equal(chestItemScale(640, 5), 2, '1280×720');
  assert.equal(chestItemScale(960, 5), 2, '1920×1080');
  assert.equal(chestItemScale(270, 5), 1, 'a phone, portrait');
  assert.equal(chestItemScale(270, 2), 2, 'two fit at 2× on a phone');
});

// The screens the game is played on: 1280×720 (a 640×360 UI), 1920×1080 (480×270), a phone held
// upright (293×633) and sideways (633×293).
const SIZES = { '1280×720': [640, 360], '1920×1080': [480, 270], 'a phone upright': [293, 633], 'a phone sideways': [633, 293] };

test('a chest\'s things, its gold line and COLLECT all show, five things and one; at 2× wherever they fit', () => {
  buildSprites();
  const goldH = textCanvas('+999 GOLD', '#fee761', '#181425').height * 2;
  for (const [name, [W, H]] of Object.entries(SIZES)) {
    for (const [n, scale] of [[5, 1.5], [3, 1.5], [1, 1]]) {
      const L = chestLayout(W, H, n, scale);
      assert.ok(L.goldY + goldH <= H - 22, `${name}, ${n} things: the gold line (${L.goldY}-${L.goldY + goldH}) above COLLECT (${H - 22})`);
      assert.ok(L.cy - SPR.chest.frames[0].h * 1.5 * scale >= 0, `${name}, ${n} things: the chest on the screen`);
    }
  }
  assert.equal(chestLayout(633, 293, 5, 1.5).k, 2, 'a phone sideways keeps five things at 2× (the chest stands higher)');
  assert.equal(chestLayout(480, 270, 1, 1).k, 2, 'one thing at 2× at 1080p');
  assert.equal(chestLayout(480, 270, 5, 1.5).k, 1, 'five at 1× at 1080p, where 2× does not fit across');
});
