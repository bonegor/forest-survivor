import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, HERO_ORDER } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { heroVariants } from '../public/field-studio/art/hero-variants.js';
import { refineFrame } from '../public/field-studio/art/refinement.js';
import { makeBuf, hexPack } from '../public/js/engine/pixels.js';
import { GEM_FAMILIES } from '../public/field-studio/art/crystals.js';
import { collectionForLink, collectionOptions } from '../public/field-studio/collections.js';
import { prepareSprites, proposalSprite } from '../public/field-studio/runtime.js';
import { FieldScene } from '../public/field-studio/field-scene.js';
import { Player } from '../public/js/game/player.js';

test('paused facing changes retain the selected gait and clips restart on their first pose', () => {
  const player = { moveSpeed: 70, anim: 0, idleAnim: 0, advanceAnimation: Player.prototype.advanceAnimation,
    strike(angle, time) { this.strikeAng = angle; this.strikeAt = time; } };
  const scene = Object.create(FieldScene.prototype);
  scene.game = { time: 12, player, pickups: [], deathTiming: { end: 4 } };
  scene.original = { attack: [3, 4, 5], attackFps: 10, motionRate: 1, idleRate: 4 };
  scene.advance(0, 'walk-strike', 1);
  assert.equal(player.walking, true);
  assert.equal(player.strikeAt, 12);
  scene.advance(scene.stepDuration(), 'walk-strike', 1);
  const gait = player.anim;
  assert.ok(gait > 0);
  scene.advance(0, 'walk-strike', -1);
  assert.equal(player.anim, gait);
  assert.equal(player.strikeAng, Math.PI);
  scene.advance(0, 'strike', -1);
  assert.equal(player.walking, false);
  assert.equal(player.anim, 0);
  assert.equal(player.strikeAt, scene.game.time);
  scene.advance(0, 'fall', -1);
  assert.equal(scene.game.deathT, 0);
  assert.equal(player.dead, true);
  scene.advance(0, 'idle', 1);
  assert.equal(player.dead, false);
});

test('refined stitching follows moving cloth and stays behind a crossing blade', () => {
  const cloth = hexPack('#34445a'), seam = hexPack('#927f69'), blade = hexPack('#d7e2ef');
  const piece = x => {
    const frame = makeBuf(16, 12);
    for (let y = 3; y < 8; y++) frame.d.fill(cloth, y * frame.w + x, y * frame.w + x + 5);
    return frame;
  };
  const idle = piece(3), moved = piece(6);
  const spec = { palette: { s: '927f69' }, patches: [{ x: 3, y: 3, rows: ['s....','.s...','..s..','...s.','....s'] }] };
  moved.d[5 * moved.w + 8] = blade;
  const dressed = refineFrame(spec, moved, idle);
  assert.equal(dressed.d[3 * moved.w + 6], seam);
  assert.equal(dressed.d[5 * moved.w + 8], blade);
  assert.equal(moved.d[3 * moved.w + 6], cloth);
  assert.deepEqual(dressed.d.map(c => c >>> 24), moved.d.map(c => c >>> 24));
});

test('cloth dyes preserve nearby shading, alpha, explicit colours and distant hues', () => {
  const frame = makeBuf(4, 1);
  frame.d.set([0x80606060, hexPack('#706060'), hexPack('#626060'), hexPack('#f0d090')]);
  const spec = { palette: {}, patches: [], dyes: { '626060': '788888' },
    materialDyes: [{ from: '606060', to: '406060', tolerance: 32 }] };
  const expected = [0x80606040, hexPack('#606060'), hexPack('#788888'), hexPack('#f0d090')];
  assert.deepEqual([...refineFrame(spec, frame, frame).d], expected);
  assert.deepEqual([...refineFrame(spec, frame, frame).d], expected);
});

test('studio and trial links open the right collection for heroes and crystals', () => {
  for (const crystals of [false, true]) {
    const options = crystals ? GEM_FAMILIES.filter(f => f.id !== 'original') : heroVariants('mage');
    const route = params => collectionForLink(new URLSearchParams(params), options, crystals);
    assert.equal(route({}), crystals ? 'new' : 'refined');
    assert.equal(route({ look: 'original' }), crystals ? 'new' : 'refined');
    assert.equal(route({ set: 'refined' }), crystals ? 'new' : 'refined');
    assert.equal(collectionOptions(options, 'refined').length, crystals ? 0 : 2);
    for (const [index, option] of options.entries()) {
      const set = index >= 8 ? 'refined' : index < 4 ? 'first' : 'new';
      assert.equal(route({ look: option.id }), set);
      assert.equal(route({ set, look: option.id }), set);
      assert.ok(collectionOptions(options, set).includes(option));
    }
    assert.equal(route({ set: 'first', look: options[7].id }), 'first');
    assert.equal(route({ set: 'new', look: options[0].id }), 'new');
  }
});

test('each hero offers eight earlier designs and two refinements at game size and timing', () => {
  prepareSprites();
  const ids = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'refined', 'reforged'];
  for (const hero of HERO_ORDER) {
    const looks = heroVariants(hero);
    assert.deepEqual(looks.map(look => look.id), ids, hero);
    assert.equal(new Set(looks.map(look => look.name)).size, ids.length, hero);
    const live = SPR[HEROES[hero].sprite], idle = live.idle?.[0] ?? 0;
    const original = live.frames[idle], height = original.box[3] - original.box[1];
    const mask = frame => frame.buf.d.map(color => color >>> 24 > 63 ? 1 : 0).join('');
    const silhouettes = new Set([mask(original)]);
    for (const look of looks) {
      const proposal = proposalSprite(hero, look.id), posed = proposal.frames[idle];
      assert.equal(proposal.anchorY, live.anchorY);
      assert.equal(proposal.walk, live.walk);
      assert.equal(proposal.attack, live.attack);
      assert.equal(posed.w, original.w);
      assert.equal(posed.h, original.h);
      const tolerance = look.id === 'reforged' ? Math.max(2, Math.round(height * 0.12)) : 2;
      assert.ok(Math.abs(posed.box[3] - posed.box[1] - height) <= tolerance, hero + '/' + look.id + ' idle height');
      const fallen = proposal.fall, fallenSource = live.fall;
      const gear = fallen.frames[fallen.frameAt(5)].buf.d;
      if (look.id === 'refined' || ids.indexOf(look.id) < 4) {
        const sourceGear = fallenSource.frames[fallenSource.frameAt(5)].buf.d;
        assert.deepEqual(gear.map(color => color >>> 24), sourceGear.map(color => color >>> 24));
        if (look.id === 'refined') {
          for (const index of new Set([idle, live.walk[0], live.attack[live.attackRelease ?? 0]])) {
            const before = live.frames[index].buf.d, after = proposal.frames[index].buf.d;
            assert.deepEqual(after.map(c => c >>> 24), before.map(c => c >>> 24), hero + ' pose coverage');
          }
          assert.notDeepEqual(posed.buf.d, original.buf.d, hero + ' has authored paint');
        }
      } else {
        const shape = mask(posed);
        assert.ok(!silhouettes.has(shape), hero + '/' + look.id + ' needs a distinct silhouette');
        silhouettes.add(shape);
        assert.ok(gear.some(color => color >>> 24), hero + '/' + look.id + ' retains fallen equipment');
        if (look.id === 'reforged') {
          assert.equal(proposal.idle, live.idle);
          assert.equal(proposal.attackWalk, live.attackWalk);
          assert.equal(proposal.attackRelease, live.attackRelease);
          assert.equal(fallen.frameAt, fallenSource.frameAt);
          assert.equal(fallen.wisp.frameAt, fallenSource.wisp.frameAt);
        }
      }
    }
    assert.equal(SPR[HEROES[hero].sprite], live);
  }
});

test('a new stationary strike retains foot contact or a hovering gap for its entire clip', () => {
  prepareSprites();
  for (const id of HERO_ORDER) {
    const sprite = proposalSprite(id, 'reforged');
    const poses = [...new Set([sprite.idle[0], ...sprite.attack])].map(index => sprite.frames[index].buf);
    const floor = sprite.anchorY - 1;
    const fixed = Array.from({ length: poses[0].w }, (_, x) => x)
      .filter(x => poses.every(pose => pose.d[floor * pose.w + x] >>> 24));
    if (sprite.floating) {
      assert.equal(fixed.length, 0, id + ' hovers');
    } else {
      assert.ok(fixed.length >= 2, id + ' needs a planted foot throughout its standing strike');
    }
  }
});
