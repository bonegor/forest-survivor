// The horde over the hero's weapons (horde-over.js): the owner's (27 October 2026) "monsters and
// enemies, they should be above weapons". What shows of the monsters is kept aside before the
// weapons' shots and blasts are drawn, and again before their glows, and put back over them each
// time; a tree in front of a monster cuts it out of what is kept, and the hero is left out (he
// goes over everything, hero-mark.test.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { maskHorde, maskBosses } from '../public/js/game/horde-over.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

// An unkillable Knight standing still, unarmed, with no spawner, in the middle of the night.
function game(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(7);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.setTime(420);
    g.syncCam();
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// A skeleton standing still to the hero's right, on the screen.
function skeleton(g, p) {
  const foe = g.spawnEnemy('skeleton', p.x + 30, p.y, { instant: true, aware: true });
  foe.ai = () => [0, 0, 0];
  return foe;
}

// A 2D context that writes down every call and every setting, in order.
function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (t, k) => (...a) => calls.push([k, ...a]),
    set: (t, k, v) => (calls.push(['=' + String(k), v]), true),
  });
  return { ctx, calls };
}

// One frame with a weapon's effect about: every picture drawn ({ img, a }), and 'shot' and 'glow'
// where the effect draws its body and its glow.
function frame(g) {
  const ctx = document.createElement('canvas').getContext('2d'), drawn = [];
  ctx.drawImage = (img, ...a) => drawn.push({ img, a });
  const fx = { update: () => true, draw: () => drawn.push('shot'), drawGlow: () => drawn.push('glow') };
  g.effects.push(fx);
  g.draw(ctx);
  g.effects.splice(g.effects.indexOf(fx), 1);
  return drawn;
}

// The monsters put back: the canvas they were kept in, drawn whole at the screen's corner.
const isPut = (d) => typeof d === 'object' && typeof d.img === 'object' && d.a.length === 2 && d.a[0] === 0 && d.a[1] === 0;

test('a weapon\'s shots and glows go under the monsters; with no monster about nothing is kept', () => {
  game((g, p) => {
    for (const e of g.enemies) if (!e.prop) e.dead = true;
    assert.ok(!frame(g).some(isPut), 'no monster: nothing kept or put back');
    skeleton(g, p);
    const drawn = frame(g), shot = drawn.indexOf('shot'), glow = drawn.indexOf('glow');
    const puts = drawn.map((d, i) => (isPut(d) ? i : -1)).filter((i) => i >= 0);
    assert.equal(puts.length, 2, 'put back twice');
    assert.ok(shot >= 0 && shot < puts[0] && puts[0] < glow && glow < puts[1], 'over the shots, then over the glows');
    assert.equal(drawn[puts[0]].img, drawn[puts[1]].img, 'the one canvas they are kept in');
  });
});

test('the mask: each monster as drawn, cut by what stands in front of it; the hero and what stands behind cut nothing', () => {
  game((g, p) => {
    const foe = skeleton(g, p);
    g.draw(document.createElement('canvas').getContext('2d'));
    const fr = SPR.shrine.frames[0];
    const behind = { x: foe.x, y: foe.y - 5, _rect: [5, 6, 7, 8, fr] }, tree = { x: foe.x, y: foe.y + 5, _rect: [1, 2, 3, 4, fr] };
    const { ctx, calls } = recorder();
    assert.ok(maskHorde(g.cam, [behind, foe, p, tree], p, ctx), 'a monster shows');
    const r = foe._rect.slice(0, 4).map((v) => Math.round(v));
    assert.deepEqual(calls.filter((c) => c[0] === 'drawImage'), [['drawImage', foe._img, ...r], ['drawImage', fr.c, 1, 2, 3, 4]], 'the foe, then the tree in front of it; nothing of what stands behind it, nor of the hero');
    const ops = calls.filter((c) => c[0] === '=globalCompositeOperation').map((c) => c[1]);
    assert.ok(ops.lastIndexOf('destination-out') > ops.indexOf('source-over'), 'the tree cuts its shape out');
    const none = recorder();
    assert.equal(maskBosses(g.cam, [], false, none.ctx), false, 'no boss: still none');
    assert.equal(none.calls.length, 0, 'and nothing drawn');
  });
});
