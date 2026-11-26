import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, HERO_ORDER } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { heroVariants } from '../public/field-studio/art/hero-variants.js';
import { prepareSprites, proposalSprite } from '../public/field-studio/runtime.js';

test('every playable hero retains both collections, the game pose timing and the standing field size', () => {
  prepareSprites();
  const ids = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'];
  for (const hero of HERO_ORDER) {
    const looks = heroVariants(hero);
    assert.deepEqual(looks.map(look => look.id), ids, hero);
    assert.equal(new Set(looks.map(look => look.name)).size, ids.length, hero);
    const live = SPR[HEROES[hero].sprite], idle = live.idle?.[0] ?? 0;
    const original = live.frames[idle], height = original.box[3] - original.box[1];
    const silhouettes = new Set([original.buf.d.map(color => color >>> 24 > 63 ? 1 : 0).join('')]);
    for (const look of looks) {
      const proposal = proposalSprite(hero, look.id), posed = proposal.frames[idle];
      assert.equal(proposal.anchorY, live.anchorY);
      assert.equal(proposal.walk, live.walk);
      assert.equal(proposal.attack, live.attack);
      assert.equal(posed.w, original.w);
      assert.equal(posed.h, original.h);
      assert.ok(Math.abs(posed.box[3] - posed.box[1] - height) <= 2, hero + '/' + look.id + ' idle height');
      if (ids.indexOf(look.id) >= 4) {
        const mask = posed.buf.d.map(color => color >>> 24 > 63 ? 1 : 0).join('');
        assert.ok(!silhouettes.has(mask), hero + '/' + look.id + ' needs a distinct silhouette');
        silhouettes.add(mask);
        const fall = proposal.fall;
        assert.ok(fall.frames[fall.frameAt(5)].buf.d.some(color => color >>> 24), hero + '/' + look.id + ' retains fallen equipment');
      }
    }
    assert.equal(SPR[HEROES[hero].sprite], live);
  }
});
