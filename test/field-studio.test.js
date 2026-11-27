import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, HERO_ORDER } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { heroVariants } from '../public/field-studio/art/hero-variants.js';
import { GEM_FAMILIES } from '../public/field-studio/art/crystals.js';
import { collectionForLink, collectionOptions } from '../public/field-studio/collections.js';
import { prepareSprites, proposalSprite } from '../public/field-studio/runtime.js';

test('studio and trial links open the right collection for heroes and crystals', () => {
  for (const crystals of [false, true]) {
    const options = crystals ? GEM_FAMILIES.filter(f => f.id !== 'original') : heroVariants('mage');
    const route = params => collectionForLink(new URLSearchParams(params), options, crystals);
    assert.equal(route({}), crystals ? 'new' : 'first');
    assert.equal(route({ look: 'original' }), crystals ? 'new' : 'first');
    for (const [index, option] of options.entries()) {
      const set = index < 4 ? 'first' : 'new';
      assert.equal(route({ look: option.id }), set);
      assert.equal(route({ set, look: option.id }), set);
      assert.ok(collectionOptions(options, set).includes(option));
    }
    assert.equal(route({ set: 'first', look: options[7].id }), 'first');
    assert.equal(route({ set: 'new', look: options[0].id }), 'new');
  }
});

test('every playable hero offers two collections at the game pose timing and field size', () => {
  prepareSprites();
  const ids = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'];
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
      assert.ok(Math.abs(posed.box[3] - posed.box[1] - height) <= 2, hero + '/' + look.id + ' idle height');
      const fallen = proposal.fall, fallenSource = live.fall;
      const gear = fallen.frames[fallen.frameAt(5)].buf.d;
      if (ids.indexOf(look.id) < 4) {
        const sourceGear = fallenSource.frames[fallenSource.frameAt(5)].buf.d;
        assert.deepEqual(gear.map(color => color >>> 24), sourceGear.map(color => color >>> 24));
      } else {
        const shape = mask(posed);
        assert.ok(!silhouettes.has(shape), hero + '/' + look.id + ' needs a distinct silhouette');
        silhouettes.add(shape);
        assert.ok(gear.some(color => color >>> 24), hero + '/' + look.id + ' retains fallen equipment');
      }
    }
    assert.equal(SPR[HEROES[hero].sprite], live);
  }
});
