import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { buildSprite, SPR } from '../public/js/engine/sprites.js';
import { Game } from '../public/js/game/game.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { showcaseBounds } from '../public/js/ui/hero-showcase.js';

// Equivalent art at two source densities: detail may change, world geometry may not.
function sprite(density) {
  const w = 8 * density, h = 12 * density, d = new Uint32Array(w * h);
  for (let y = 2 * density; y < 11 * density; y++) for (let x = density; x < 7 * density; x++) d[y * w + x] = 0xff998855;
  return buildSprite('density-fixture', { gen: () => [{ w, h, d }], hires: density,
    anchorY: 10 * density, idle: [0], walk: [0], selfBob: true, outline: false });
}

function compare(fn) {
  const original = SPR.knight;
  const g = new Game({ hero: 'knight', mode: 's15', headless: true, meta: metaBonuses(defaultProfile()), settings: {}, crypts: false });
  g.player.invuln = g.player.flash = 0;
  try { return fn(g, [sprite(1), sprite(2)]); } finally { SPR.knight = original; }
}

test('authored detail density preserves world placement, both facings and selection scale', () => compare((g, sprites) => {
  assert.deepEqual(showcaseBounds(sprites[0]), showcaseBounds(sprites[1]));
  for (const S of [1, 2.4, 3]) for (const face of [-1, 1]) {
    const rects = sprites.map(spr => {
      SPR.knight = spr; g.player.face = face;
      g.placePlayer({ x: g.player.x - 40, y: g.player.y - 40, S });
      return g.player._rect.slice(0, 4);
    });
    assert.deepEqual(rects[0], rects[1], `same world footprint at scale ${S}, face ${face}`);
  }
}));

test('quicksand removes the same world-height strip from ordinary and dense artwork', () => compare((g, sprites) => {
  const draws = [], ctx = { drawImage: (...args) => draws.push(args) }, cam = { x: 0, y: 0, S: 3 };
  g.player.sink = 2;
  for (const spr of sprites) { SPR.knight = spr; g.drawPlayer(ctx, cam); }
  assert.deepEqual(draws[0].slice(5), draws[1].slice(5), 'destination crop and ground baseline match');
  assert.equal(draws[0][4], 10); assert.equal(draws[1][4], 20, 'two world rows cut four dense source rows');
}));

test('falling keeps the same pivot and destination size for both sprite densities', () => compare((g, sprites) => {
  const ctx = document.createElement('canvas').getContext('2d'), draws = [];
  ctx.drawImage = (...args) => draws.push(args);
  g.deathT = .3;
  for (const spr of sprites) { SPR.knight = spr; g.drawFallen(ctx, { x: 0, y: 0, S: 3, pxW: 480, pxH: 300 }); }
  assert.deepEqual(draws[0].slice(1), draws[1].slice(1), 'same rotated body rectangle');
}));
