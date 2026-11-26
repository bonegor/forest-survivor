import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { SPR } from '../public/js/engine/sprites.js';
import { bounds } from '../public/js/engine/pixels.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('the starter knight stumbles to the ground and leaves the sword and shield in place', () => {
  const knight = SPR.knight, fall = knight.fall;
  const at = time => fall.frames[fall.frameAt(time)].buf;
  const remains = fall.frames.at(-1).buf;
  const body = frame => ({ ...frame, d: frame.d.map((pixel, i) => remains.d[i] ? 0 : pixel) });
  const landed = at(fall.wisp.release - .01);
  assert.equal(fall.anchorY, knight.anchorY);
  assert.deepEqual(at(0).d, knight.frames[knight.idle[0]].buf.d);
  assert.ok(bounds(body(at(.35))).y0 < bounds(body(at(.60))).y0);
  assert.ok(bounds(body(landed)).y0 >= fall.anchorY - 12, 'the knight lies prone');

  const half = right => bounds({ ...remains, d: remains.d.map((p, i) =>
    (i % remains.w >= remains.w / 2) === right ? p : 0) });
  const sword = half(false), shield = half(true);
  assert.ok(sword.x1 - sword.x0 > 2 * (sword.y1 - sword.y0), 'the blade lies flat');
  assert.ok(shield.y1 - shield.y0 >= 5 && shield.x0 - sword.x1 > 16, 'two distinct items lie clear of the body');
  assert.ok(Math.abs(fall.anchorY - sword.y1) <= 1 && Math.abs(fall.anchorY - shield.y1) <= 1);
  const landedArea = body(landed).d.filter(Boolean).length;
  const fadingArea = body(at(fall.wisp.release + .8)).d.filter(Boolean).length;
  assert.ok(landedArea > fadingArea && fadingArea > 0);
  for (const { buf } of fall.frames.slice(fall.frameAt(fall.wisp.release - .01))) {
    assert.ok(remains.d.every((p, i) => !p || p === buf.d[i]), 'gear stays intact throughout the decay');
  }

  for (const face of [-1, 1]) {
    const g = new Game({ hero: 'knight', mode: 's15', diff: 'medium', settings: {}, meta: metaBonuses(defaultProfile()) });
    const ctx = document.createElement('canvas').getContext('2d');
    let shown;
    ctx.drawImage = image => { shown = image; };
    g.player.face = face;
    g.placePlayer(g.cam);
    g.player.hurt(1e9);
    assert.equal(g.state, 'dying');
    g.deathT = g.deathTiming.end - .25;
    g.drawFallen(ctx, g.cam);
    assert.equal(shown, fall.frames.at(-1).get(face < 0), 'only gear remains before Results');
  }
});
