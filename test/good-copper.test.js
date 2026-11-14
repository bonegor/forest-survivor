import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES, startWeapons, weaponsFor } from '../public/js/data/heroes.js';
import { COPPER_IDS, COPPER_EVOLUTIONS, GOOD_COPPER_ID, HIGH_COPPER_ID, WHIP_ID, WHIP_EVOLUTION, isCopper, isCursedCopper } from '../public/js/data/copper.js';
import { MAX_WEAPON_LEVEL, WEAPONS } from '../public/js/data/weapons.js';
import { heldBuild, revealOn } from '../public/js/game/hud.js';
import * as P from '../public/js/shared/profile.js';

const game = (hero = 'eanasir', profile = null) => new Game({ hero, mode: 's15', diff: 'easy', headless: true,
  meta: P.metaBonuses(profile || P.defaultProfile()), open: profile ? P.openFor(profile, hero) : undefined,
  settings: { numbers: false }, crypts: false });
const max = w => { w.level = MAX_WEAPON_LEVEL; w.recompute(); return w; };
const copper = g => g.player.weapons.find(w => w.baseId === GOOD_COPPER_ID);
const evolveWhip = g => {
  max(g.mainWeapon()); g.addPassive('might');
  return g.rollChest('boss').items.find(it => it.type === 'evolve');
};

test('Ea-nasir starts with exclusive manual Whip and automatic Medium Quality Copper', () => {
  const h = HEROES.eanasir, g = game();
  assert.equal(WEAPONS[GOOD_COPPER_ID].name, 'Medium Quality Copper');
  assert.equal(WEAPONS[HIGH_COPPER_ID].name, 'High Quality Copper (not for sale)');
  assert.equal(h.weapon, WHIP_ID);
  assert.deepEqual(h.unique, [WHIP_ID, GOOD_COPPER_ID]);
  assert.deepEqual(startWeapons(h), h.unique);
  assert.deepEqual(g.player.weapons.map(w => [w.id, w.level]), [[WHIP_ID, 1], [GOOD_COPPER_ID, 1]]);
  assert.equal(g.mainWeapon().id, WHIP_ID);
  for (const hero of Object.values(HEROES)) {
    for (const id of h.unique) assert.equal(weaponsFor(hero).includes(id), hero.id === 'eanasir', `${hero.id}: ${id}`);
    assert.ok(COPPER_IDS.every(id => !weaponsFor(hero).includes(id)));
  }
});

test('Phoenix waits for Whip evolution even with a locked profile or another evolved weapon', () => {
  const profile = P.sanitizeProfile({ ...P.defaultProfile(), heroes: ['knight', 'eanasir'] });
  const g = game('eanasir', profile);
  assert.ok(!g.relicOpen('phoenix')); assert.ok(!g.relicOffered('phoenix'));
  g.addWeapon('excalibur');
  assert.ok(!g.relicOffered('phoenix'));
  assert.ok(!g.upgradePool().some(c => c.type === 'passive' && c.id === 'phoenix'));
  const item = evolveWhip(g);
  assert.equal(item.from, WHIP_ID); assert.equal(item.id, WHIP_EVOLUTION);
  assert.ok(g.relicOpen('phoenix'), 'Whip opens Heart even without the profile purchase');
  assert.ok(g.relicOffered('phoenix'));
  assert.ok(g.upgradePool().some(c => c.type === 'passive' && c.id === 'phoenix'));
  g.addPassive('phoenix'); g.spendRelic('phoenix');
  assert.ok(!g.relicOffered('phoenix'), 'revival retains its five-level reoffer delay');
  g.player.level += 5; assert.ok(g.relicOffered('phoenix'));
});

test('Medium Copper requires Phoenix specifically and always forges High Quality Copper', () => {
  const g = game(), w = max(copper(g));
  for (const id of ['cooldown', 'might', 'area']) g.addPassive(id);
  assert.deepEqual(g.evolvable(), []); assert.equal(w.evolve(), false);
  assert.equal(g.completesEvolution({ type: 'passive', id: 'cooldown', isNew: true }), null);
  assert.equal(g.completesEvolution({ type: 'passive', id: 'phoenix', isNew: true }), HIGH_COPPER_ID);
  evolveWhip(g); g.addPassive('phoenix');
  assert.deepEqual(g.evolvable(), [w]);
  assert.deepEqual(g.evoState(GOOD_COPPER_ID), { relic: 'phoenix', state: 'owned' });
  assert.equal(w.evolve(), true);
  assert.equal(w.id, HIGH_COPPER_ID); assert.equal(w.baseId, GOOD_COPPER_ID);
  assert.ok(isCopper(w)); assert.ok(!isCursedCopper(w)); assert.ok(!isCursedCopper(w.id));
  assert.ok(g.ownsWeapon(GOOD_COPPER_ID));
  assert.ok(!g.upgradePool().some(c => c.id === GOOD_COPPER_ID && c.isNew));
  assert.equal(w.evolve(), false); assert.ok(g.player.passives.has('phoenix'));
});

test('chests reveal and save both new evolutions without claiming cursed copper', () => {
  const g = game(); evolveWhip(g); max(copper(g)); g.addPassive('phoenix');
  const held = heldBuild(g), item = g.rollChest('boss').items.find(it => it.type === 'evolve');
  assert.equal(item.from, GOOD_COPPER_ID); assert.equal(item.id, HIGH_COPPER_ID);
  assert.deepEqual(revealOn(held, item, g), { row: 'w', i: 1 });
  assert.equal(held.weapons[1].icon, WEAPONS[HIGH_COPPER_ID].icon);
  g.time = 900;
  const report = g.runReport(true, false);
  assert.ok(report.evos.includes(WHIP_EVOLUTION)); assert.ok(report.evos.includes(HIGH_COPPER_ID));
  assert.deepEqual(report.copperWeapons, []);
  const profile = P.sanitizeProfile({ ...P.defaultProfile(), heroes: ['knight', 'eanasir'] });
  const saved = P.applyRun(profile, report); assert.ok(saved.ok);
  const reloaded = P.sanitizeProfile(P.packProfile(saved.profile));
  assert.ok(P.knownEvos(reloaded).includes(WHIP_EVOLUTION)); assert.ok(P.knownEvos(reloaded).includes(HIGH_COPPER_ID));
});

test('six cursed copper slots retain their fixed Phoenix forms and victory challenge', () => {
  const g = game('knight'); g.inCrypt = { key: 'poor-copper-regression' };
  for (let i = 0; i < 6; i++) assert.equal(g.infestCopper(), true);
  for (const w of g.player.weapons) max(w);
  g.addPassive('cooldown'); assert.deepEqual(g.evolvable(), []);
  assert.ok(g.player.weapons.every(w => w.evolve() === false));
  g.addPassive('phoenix'); assert.equal(g.evolvable().length, 6);
  for (const w of g.player.weapons) assert.ok(w.evolve());
  assert.deepEqual(g.player.weapons.map(w => w.id), COPPER_EVOLUTIONS);
  g.inCrypt = null; g.time = 900;
  const saved = P.applyRun(P.defaultProfile(), g.runReport(true, false));
  assert.ok(saved.ok); assert.ok(saved.profile.heroes.includes('eanasir'));
});
