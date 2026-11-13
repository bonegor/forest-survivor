import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { WEAPON_SOUND_STYLES, WEAPON_SOUND_NAMES, normalizeWeaponSoundStyle, weaponSoundRecipe } from '../public/js/engine/weapon-sounds.js';
import { MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { makeWeaponPreview, PREVIEW_WEAPONS, PREVIEW_SECONDS } from '../public/sound-lab/preview.js';

test('sound choices preserve the original default and leave non-weapon audio untouched', () => {
  assert.equal(normalizeWeaponSoundStyle(null), 'current');
  assert.equal(normalizeWeaponSoundStyle('bad value'), 'current');
  for (const style of WEAPON_SOUND_STYLES) {
    assert.equal(normalizeWeaponSoundStyle(style.id), style.id);
    for (const name of ['hit', 'crit', 'explode', 'rain', 'evolve', 'bossslain']) assert.deepEqual(weaponSoundRecipe(name, style.id), []);
  }
  for (const name of WEAPON_SOUND_NAMES) assert.deepEqual(weaponSoundRecipe(name, 'current'), []);
});

test('all three alternatives have finite short envelopes and distinct axe voices', () => {
  const axes = new Set();
  for (const style of WEAPON_SOUND_STYLES.slice(1)) {
    axes.add(JSON.stringify(weaponSoundRecipe('axe', style.id)));
    for (const name of WEAPON_SOUND_NAMES) for (const pitch of [0.5, 1, 1.6, NaN]) {
      const layers = weaponSoundRecipe(name, style.id, { pitch });
      assert.ok(layers.length >= 2);
      for (const layer of layers) {
        for (const field of ['f0', 'f1', 'dur', 'attack', 'vol']) assert.ok(Number.isFinite(layer[field]), `${style.id}/${name}/${field}`);
        assert.ok(layer.dur < 0.25 && layer.dur > layer.attack);
        assert.ok(layer.f0 > 0 && layer.f1 > 0 && layer.vol > 0 && layer.vol < 0.2);
      }
    }
  }
  assert.equal(axes.size, 3);
});

test('the audition uses real axe volleys: one at level 1 and three at maximum', () => {
  const captures = [];
  for (const level of [1, MAX_WEAPON_LEVEL]) {
    const { game: g, weapon: w } = makeWeaponPreview('axe', level, { headless: true });
    const times = [], push = g.projectiles.push.bind(g.projectiles);
    g.projectiles.push = (...shots) => { for (const shot of shots) if (shot.w === w) times.push(g.clock); return push(...shots); };
    for (let i = 0; i < PREVIEW_SECONDS * 60; i++) g.update(1 / 60);
    assert.equal(g.state, 'play');
    assert.equal(g.kills, 0);
    assert.equal(w.level, level);
    assert.equal(g.player.weapons.length, 1);
    assert.equal(g.player.passives.size, 0);
    captures.push(times);
  }
  assert.ok(captures[0].length >= 5, 'several complete real attack cycles');
  assert.equal(captures[1].length, captures[0].length * 3);
  assert.ok(captures[1][1] - captures[1][0] >= 0.08 && captures[1][1] - captures[1][0] <= 0.12, 'the real 100ms volley spacing is retained');
  assert.ok(captures[0][1] - captures[0][0] >= 1.25, 'the real cooldown is retained');
});

test('every offered preview runs its real weapon at both levels without a save', () => {
  for (const choice of PREVIEW_WEAPONS) for (const level of [1, MAX_WEAPON_LEVEL]) {
    const { game: g, weapon: w } = makeWeaponPreview(choice.id, level, { headless: true });
    for (let i = 0; i < 180; i++) g.update(1 / 60);
    assert.equal(g.state, 'play', `${choice.id}/${level}`);
    assert.equal(w.level, level);
    assert.equal(g.player.weapons.length, 1);
    assert.equal(g.player.hero.id, choice.hero);
  }
});
