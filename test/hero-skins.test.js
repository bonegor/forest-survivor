import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { SPR } from '../public/js/engine/sprites.js';
import { HEROES, heroLook } from '../public/js/data/heroes.js';

const warriors = new Set(['paladin', 'berserker']);
const approved = { knight: 'knight', archer: 'archer_v4b', mage: 'mage_v4a', rogue: 'rogue_v4a',
  necromancer: 'necromancer_v4a', paladin: 'paladin_v4a', druid: 'druid_v4a', berserker: 'berserker_v4a', witchhunter: 'witchhunter' };

test('active roster keeps each requested baseline and two proposals; Plumed Knight stays alone', () => {
  for (const h of Object.values(HEROES)) {
    assert.equal(h.sprite, approved[h.id], h.id + ': approved default sprite');
    if (h.id === 'knight') assert.equal(h.skins, undefined, 'no alternatives to the accepted Plumed Knight');
    else {
      assert.deepEqual(h.skins.map(s => s.id), [warriors.has(h.id) ? 'v3' : 'original', 'v4a', 'v4b'], h.id);
      assert.equal(h.skins[0].sprite, h.id);
      assert.equal(h.skins[0].pose, h.id + '_pose');
      for (const skin of h.skins.slice(1)) {
        const look = heroLook(h.id, { [h.id]: skin.id });
        assert.equal(look.skin, skin.id);
        assert.equal(look.sprite, skin.sprite);
        assert.equal(look.pose, skin.pose);
        assert.equal(look.stats, h.stats);
        assert.ok(SPR[look.sprite]?.frames.length && SPR[look.pose]?.frames.length, skin.sprite + ': model and matching menu pose');
      }
    }
    for (const saved of [undefined, 'refined', 'removed-skin']) {
      assert.equal(heroLook(h.id, { [h.id]: saved }), h, `${h.id}: missing or retired ${saved} resolves to approved default`);
    }
    for (const skin of h.skins || []) assert.equal(heroLook(h.id, { [h.id]: skin.id }).sprite, skin.sprite, h.id + ': explicit choice overrides default');
    assert.equal(heroLook(h.id), h);
    assert.equal(SPR[h.id + '_refined'], undefined, h.id + ': no retired recolour in active art');
    assert.equal(SPR[h.id + '_v3'], undefined, h.id + ': no orphan V3 alternative');
  }
});

test('all baselines are pixel-identical to their selected sources, including V3 warriors and Plumed Knight', async () => {
  for (const h of Object.values(HEROES)) {
    const path = h.id === 'knight' ? 'knight-plumed/recoloured' : `${warriors.has(h.id) ? 'heroes-v3' : 'heroes'}/${h.id}`;
    const data = (await import(`../public/assets/${path}.js`)).default, spr = SPR[h.id];
    assert.deepEqual([spr.w, spr.h, spr.frames.length], [data.w, data.h, data.frames.length], h.id);
    // Decode independently of sheet()/buildSprite(): wrong imports, recolouring,
    // added outlines and reordered frames must not masquerade as retained art.
    for (const [index, encoded] of data.frames.entries()) {
      const bytes = Buffer.from(encoded, 'base64'), expected = new Uint32Array(data.w * data.h);
      for (let p = 0; p < expected.length; p++) expected[p] = data.palette[data.indexBytes === 2 ? bytes.readUInt16LE(p * 2) : bytes[p]];
      assert.deepEqual(spr.frames[index].buf.d, expected, `${h.id}: source frame ${index}`);
    }
    const animations = data.animations || data;
    for (const key of ['idle', 'walk', 'attack']) assert.deepEqual(spr[key], animations[key] || null, `${h.id}: ${key} order`);
    assert.equal(spr.anchorY, data.footLine ?? data.anchorY, h.id + ': world anchor');
  }
});
