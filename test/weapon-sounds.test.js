import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../tools/headless.mjs';
import { WEAPON_SOUND_KEY, WEAPON_SOUND_STYLES, WEAPON_SOUND_NAMES, normalizeWeaponSoundStyle, resolveWeaponSound, weaponSoundRecipe } from '../public/js/engine/weapon-sounds.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { makeWeaponPreview, PREVIEW_WEAPONS, PREVIEW_SECONDS } from '../public/sound-lab/preview.js';

const knifeDraw = 'clip:weapons-melee/lugaru/knifedraw.ogg';
const katanaHit = 'clip:weapons-melee/teeworlds/wp-ninja-hit-01.ogg';

test('Throwing Axe and Whirlwind use the selected recordings from the shipped catalog', () => {
  const library = new URL('../public/audio/sfx/library/', import.meta.url);
  const catalog = JSON.parse(readFileSync(new URL('index.json', library), 'utf8'));
  for (const [choice, title, game] of [[knifeDraw, 'Knife Draw', 'Lugaru HD'], [katanaHit, 'Katana hit 1', 'Teeworlds']]) {
    const clip = catalog.find(entry => 'clip:' + entry.id === choice);
    assert.equal(clip?.title, title);
    assert.equal(clip.source.game, game);
    const bank = readFileSync(new URL(`bank-${clip.bank}.bin`, library));
    assert.deepEqual(readFileSync(new URL(clip.id, library)), bank.subarray(clip.offset, clip.offset + clip.bytes));
  }
  assert.equal(resolveWeaponSound('current', 'axe'), knifeDraw);
  assert.equal(resolveWeaponSound('current', 'axe', 'whirlwind'), katanaHit);
});

test('manual styles and custom recordings take precedence over both axe defaults', () => {
  const choices = ['tempered', 'heavy', 'arcade', 'clip:weapons-melee/teeworlds/wp-ninja-hit-02.ogg'];
  for (const choice of choices) {
    assert.equal(resolveWeaponSound(choice, 'axe'), choice);
    assert.equal(resolveWeaponSound(choice, 'axe', 'whirlwind'), choice);
  }
});

test('real attack cues select axe defaults at level one, maximum and evolution and preserve dagger and fusion audio', () => {
  const stages = [
    // Weapon preference, preview stage, emitted cue, firing form, expected selection.
    ['axe', 1, 'axe', 'axe', knifeDraw],
    ['axe', MAX_WEAPON_LEVEL, 'axe', 'axe', knifeDraw],
    ['axe', 'whirlwind', 'axe', 'whirlwind', katanaHit],
    ['daggers', 1, 'dagger', 'daggers', 'current'],
    ['daggers', 'shadowstrike', 'dagger', 'shadowstrike', 'current'],
    ['glaive', 1, 'axe', 'glaive', 'current'],
    ['stormglaive', 'stormglaive', 'axe', 'lodestar', 'current'],
  ];
  for (const [weapon, stage, cue, form, expected] of stages) {
    const { game } = makeWeaponPreview(weapon, stage, { headless: true });
    let attack;
    game.onWeaponCue = (owner, name, formId) => {
      if (name === cue) attack = [owner, formId, resolveWeaponSound('current', owner, formId)];
    };
    for (let i = 0; !attack && i < PREVIEW_SECONDS * 60; i++) game.update(1 / 60);
    assert.deepEqual(attack, [weapon, form, expected], `${weapon}/${stage} · ${cue}`);
  }
});

test('demo and full builds keep separate weapon sound preferences on the same origin', async t => {
  const fullKey = 'fs_weapon_sound_style_v1';
  assert.equal(WEAPON_SOUND_KEY, fullKey);
  const preferences = new Map([[fullKey, 'heavy']]);
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  t.after(() => {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => preferences.get(key) ?? null,
      setItem: (key, value) => preferences.set(key, value),
    },
  });

  const demoBuild = 'data:text/javascript,' + encodeURIComponent('export const DEMO = true;');
  const source = readFileSync(new URL('../public/js/engine/weapon-sounds.js', import.meta.url), 'utf8')
    .replace("'./build.js'", JSON.stringify(demoBuild));
  const demo = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  assert.equal(demo.weaponSoundStyle(), 'current');
  assert.equal(demo.applyWeaponSoundStyle('arcade'), true);
  assert.equal(preferences.get(demo.WEAPON_SOUND_KEY), 'arcade');
  assert.equal(preferences.get(fullKey), 'heavy');
});

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

test('every shipped weapon, evolution and fusion plays real attack cues in an isolated practice run', () => {
  const covered = new Set();
  for (const choice of PREVIEW_WEAPONS) for (const level of choice.group === 'Fusions' ? choice.forms : [1, MAX_WEAPON_LEVEL, ...choice.forms]) {
    const { game: g, weapon: w } = makeWeaponPreview(choice.id, level, { headless: true });
    covered.add(w.id);
    const cues = [];
    g.onWeaponCue = (id, name) => cues.push([id, name]);
    for (let i = 0; i < PREVIEW_SECONDS * 60; i++) g.update(1 / 60);
    assert.ok(cues.length, `${choice.id}/${level}: a playable weapon cue`);
    assert.ok(cues.every(([id]) => id === choice.id), `${choice.id}/${level}: isolated sound`);
    assert.equal(g.state, 'play', `${choice.id}/${level}`);
    assert.equal(w.level, typeof level === 'string' ? MAX_WEAPON_LEVEL : level);
    assert.equal(g.player.weapons.length, 1);
    assert.equal(g.player.hero.id, choice.hero);
  }
  assert.deepEqual(covered, new Set(Object.keys(WEAPONS)));
});
