import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { RECRUITS } from '../public/js/expansion/roster.js';
import { SPR } from '../public/js/engine/sprites.js';
import { bounds } from '../public/js/engine/pixels.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { Game } from '../public/js/game/game.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

test('each recruit lands in the native field plane, releases a soul from the body, and leaves settled gear', () => {
  for (const { id } of RECRUITS) {
    const hero = SPR[id], fall = hero.fall, { wisp } = fall;
    const at = seconds => fall.frames[fall.frameAt(seconds)].buf;
    const gear = fall.frames.at(-1).buf;
    const bodyArea = frame => frame.d.reduce((n, pixel, i) => n + Number(!!pixel && !gear.d[i]), 0);
    const landed = at(1.75);
    assert.equal(fall.anchorY, hero.anchorY, id);
    assert.deepEqual(at(0).d, hero.frames[hero.idle[0]].buf.d, id + ' opens on the actual field hero');
    assert.equal(wisp.release, 1.85, id);
    assert.equal(fall.cues.at(-1).time, wisp.release, id);
    assert.equal(fall.cues.at(-1).sound, 'souldepart', id);
    assert.equal(!!wisp.sinks, ['wraith', 'gravebinder'].includes(id), id);

    const seen = new Set();
    for (let tick = 8; tick < 102; tick++) seen.add(fall.frameAt(tick / 60));
    assert.ok(seen.size >= 24, id + ' has a complete animated descent');
    for (const frame of fall.frames) {
      const box = bounds(frame.buf);
      assert.ok(box.x0 > 0 && box.x1 < frame.w - 1 && box.y0 > 0 && box.y1 <= fall.anchorY, id);
    }
    assert.equal(bounds(gear).y1, fall.anchorY, id + ' equipment rests on the turf');
    const body = bounds({ ...landed, d: landed.d.map((pixel, i) => gear.d[i] ? 0 : pixel) });
    assert.ok(body.y1 >= fall.anchorY - 1 && body.y0 >= fall.anchorY - 24, id + ' body is down');
    const source = (fall.anchorY + wisp.offsetY) * gear.w + gear.w / 2 + wisp.offsetX;
    assert.ok(landed.d[source] >>> 24 > 160 && !gear.d[source], id + ' soul comes from flesh or clothing');

    for (const { buf } of fall.frames.slice(fall.frameAt(1.75))) {
      assert.ok(gear.d.every((pixel, i) => !pixel || pixel === buf.d[i]), id + ' gear stays in place');
    }
    assert.ok(bodyArea(landed) > bodyArea(at(wisp.release + .80)), id + ' body decays');
    assert.ok(bodyArea(at(wisp.release + .80)) > bodyArea(gear), id);
    assert.deepEqual(at(3.50).d, gear.d, id + ' only equipment is left before Results');
  }
});

test('lethal damage plays each recruit fall and soul in the last displayed facing and completes the run', () => {
  const random = Math.random, bot = input.bot;
  input.bot = { x: 0, y: 0 };
  try {
    for (const { id } of RECRUITS) for (const face of [1, -1]) {
      Math.random = mulberry32(167);
      const g = new Game({ hero: id, mode: 's15', diff: 'medium', meta: metaBonuses(defaultProfile()),
        settings: { numbers: false }, crypts: false });
      g.spawner.update = () => {};
      g.update(1 / 60);
      const p = g.player, { fall } = SPR[p.hero.sprite], { wisp } = fall;
      const ctx = document.createElement('canvas').getContext('2d');
      let image;
      ctx.drawImage = canvas => { image = canvas; };
      p.face = face;
      g.placePlayer(g.cam);
      p.face = -face;
      p.hurt(9999, null, 'Ghoul');
      assert.equal(g.state, 'dying', id);
      for (const seconds of [.35, .92, 1.70, 3.48]) {
        g.deathT = seconds;
        g.drawFallen(ctx, g.cam);
        assert.equal(image, fall.frames[fall.frameAt(seconds)].get(face < 0), id);
      }
      g.deathT = wisp.release + .31;
      g.hud.drawDepartingSoul(ctx);
      assert.equal(image, wisp.frames[wisp.frameAt(.31)].get(face < 0), id);
      g.deathT = g.deathTiming.end - .04;
      for (let tick = 0; tick < 4; tick++) g.update(1 / 60);
      assert.equal(g.state, 'over', id);
      assert.equal(g.result.stats.killedBy, 'Ghoul', id);
      assert.equal(g.result.died, true, id);
    }
  } finally {
    input.bot = bot;
    Math.random = random;
  }
});

test('the shields, bows, staffs and paired knives keep the landing attitude of their own class', () => {
  const gear = id => SPR[id].fall.frames.at(-1).buf;
  const onSide = (id, left, right) => {
    const buf = gear(id);
    const box = bounds({ ...buf, d: buf.d.map((color, i) => {
      const x = i % buf.w;
      return x >= left && x <= right && color >>> 24 > 40 ? color : 0;
    }) });
    return { ...box, width: box.x1 - box.x0 + 1, height: box.y1 - box.y0 + 1 };
  };
  const tower = onSide('praetorian', 40, 79), round = onSide('footman', 40, 79);
  const buckler = onSide('swordbearer', 0, 38), sword = onSide('swordbearer', 39, 79);
  assert.ok(tower.height > 1.6 * tower.width && round.width >= round.height);
  assert.ok(buckler.width > buckler.height && sword.width > 2 * sword.height);
  const oathblade = onSide('templar', 0, 39);
  assert.ok(oathblade.height > 2 * oathblade.width);
  assert.ok(bounds(gear('seraph')).x0 >= 40, 'the mantle falls to the left of both golden pieces');
  const knife = onSide('wraith', 0, 39), otherKnife = onSide('wraith', 40, 79);
  assert.ok(otherKnife.x0 - knife.x1 >= 25 && knife.height < 12 && otherKnife.height < 12);
  assert.ok(bounds(gear('arcanist')).x1 < 40, 'the fire staff stands beyond his rear shoulder');
  assert.ok(bounds(gear('thornkeeper')).y0 < bounds(gear('gravebinder')).y0 - 5, 'the two staffs land at different angles');
  const marksman = onSide('marksman', 40, 79), boltguard = onSide('boltguard', 40, 79);
  assert.ok(marksman.width > marksman.height && boltguard.height > boltguard.width);
  assert.ok(bounds(gear('trailblazer')).x0 > 48, 'the hooded archer throws her bow clear');
});
