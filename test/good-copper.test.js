import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES, startWeapons, weaponsFor } from '../public/js/data/heroes.js';
import { COPPER_IDS, COPPER_EVOLUTIONS, GOOD_COPPER_ID } from '../public/js/data/copper.js';
import { MAX_WEAPON_LEVEL, RANDOM_EVOLUTION, WEAPONS } from '../public/js/data/weapons.js';
import { heldBuild, revealOn } from '../public/js/game/hud.js';
import * as P from '../public/js/shared/profile.js';

const game = (hero = 'eanasir') => new Game({ hero, mode: 's15', diff: 'easy', headless: true,
  meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false });
const max = (w) => { w.level = MAX_WEAPON_LEVEL; w.recompute(); return w; };
function withRoll(roll, fn) {
  const random = Math.random;
  Math.random = () => roll;
  try { return fn(); } finally { Math.random = random; }
}

test('Ea-nāṣir owns one good copper signature with its complete requested name', () => {
  const h = HEROES.eanasir, g = game(), name = 'good quality copper (not for sale)';
  assert.equal(WEAPONS[GOOD_COPPER_ID].name, name);
  assert.equal(h.weapon, GOOD_COPPER_ID);
  assert.deepEqual(h.unique, [GOOD_COPPER_ID]);
  assert.deepEqual(startWeapons(h), [GOOD_COPPER_ID]);
  assert.deepEqual(g.player.weapons.map((w) => [w.id, w.level]), [[GOOD_COPPER_ID, 1]]);
  assert.equal(g.mainWeapon().def.name, name);
  assert.equal(g.maxWeapons, game('knight').maxWeapons);
  for (const hero of Object.values(HEROES)) {
    assert.equal(weaponsFor(hero).includes(GOOD_COPPER_ID), hero.id === 'eanasir', hero.id);
    assert.ok(COPPER_IDS.every((id) => !weaponsFor(hero).includes(id)), 'poor copper is acquired only through the curse');
  }
});

test('good copper pairs with Spellbook and also accepts the Phoenix wildcard', () => {
  const g = game(), w = max(g.mainWeapon());
  assert.deepEqual(g.evolvable(), []);
  assert.equal(w.evolve(), false);
  assert.deepEqual(g.evoState(GOOD_COPPER_ID), { relic: 'cooldown', state: 'open' });
  assert.equal(g.completesEvolution({ type: 'weapon', id: GOOD_COPPER_ID, level: MAX_WEAPON_LEVEL, isNew: false }), null);
  assert.equal(g.completesEvolution({ type: 'passive', id: 'cooldown', isNew: true }), RANDOM_EVOLUTION);
  g.addPassive('cooldown');
  assert.deepEqual(g.evolvable(), [w]);
  assert.deepEqual(g.evoState(GOOD_COPPER_ID), { relic: 'cooldown', state: 'owned' });
  assert.equal(g.completesEvolution({ type: 'weapon', id: GOOD_COPPER_ID, level: MAX_WEAPON_LEVEL, isNew: false }), RANDOM_EVOLUTION);
  assert.equal(w.evolve(), true, 'the named Spellbook partner evolves it');

  const fallback = game(), copper = max(fallback.mainWeapon());
  assert.equal(fallback.completesEvolution({ type: 'passive', id: 'phoenix', isNew: true }), RANDOM_EVOLUTION);
  fallback.addPassive('phoenix');
  assert.deepEqual(fallback.evolvable(), [copper]);
  assert.deepEqual(fallback.evoState(GOOD_COPPER_ID), { relic: 'phoenix', state: 'owned' });
  assert.equal(fallback.completesEvolution({ type: 'weapon', id: GOOD_COPPER_ID, level: MAX_WEAPON_LEVEL, isNew: false }), RANDOM_EVOLUTION);
  assert.equal(copper.evolve(), true, 'Phoenix keeps its global wildcard behaviour');
  assert.ok(COPPER_EVOLUTIONS.includes(copper.id));
});

test('the six equally sized random bins each produce a distinct evolution while retaining the good copper source', () => {
  const outcomes = [];
  for (let i = 0; i < COPPER_EVOLUTIONS.length; i++) {
    const g = game(), w = max(g.mainWeapon());
    g.addPassive('cooldown');
    // Cover both endpoints as well as the middle of the four interior bins.
    const roll = i === 0 ? 0 : i === 5 ? 1 - Number.EPSILON : (i + 0.5) / 6;
    assert.equal(withRoll(roll, () => w.evolve()), true);
    outcomes.push(w.id);
    assert.equal(w.id, COPPER_EVOLUTIONS[i]);
    assert.equal(w.baseId, GOOD_COPPER_ID);
    assert.equal(g.mainWeapon(), w);
    assert.ok(g.signatureEvolved(), 'every random form counts as his evolved signature');
    assert.ok(g.ownsWeapon(GOOD_COPPER_ID));
    assert.ok(!g.ownsWeapon(COPPER_IDS[i]), 'a good copper outcome is not ownership of a cursed source weapon');
    assert.ok(!g.upgradePool().some((c) => c.type === 'weapon' && c.id === GOOD_COPPER_ID && c.isNew), 'no second signature while its random form is held');
    assert.equal(w.evolve(), false, 'there is no second roll after evolving');
    assert.ok(g.player.passives.has('cooldown'), 'the Spellbook is retained');
    g.addWeapon('axe');
    assert.equal(g.removeWeapon(GOOD_COPPER_ID), true, 'removing by the original signature id finds any rolled form');
    assert.ok(!g.player.weapons.includes(w));
  }
  assert.deepEqual(outcomes, COPPER_EVOLUTIONS);
});

test('a real chest records and reveals its actual random form and remembers that form in the saved profile', () => {
  for (let i = 0; i < COPPER_EVOLUTIONS.length; i++) {
    const g = game(), w = max(g.mainWeapon());
    g.addPassive('cooldown');
    const held = heldBuild(g);
    const receipt = withRoll((i + 0.5) / 6, () => g.rollChest('boss'));
    const item = receipt.items.find((it) => it.type === 'evolve');
    assert.ok(item);
    assert.equal(item.from, GOOD_COPPER_ID, 'the ceremony identifies good copper, not a poor copper slot sharing this result');
    assert.equal(item.id, COPPER_EVOLUTIONS[i]);
    assert.equal(item.w, w);
    assert.equal(w.id, item.id);
    assert.deepEqual(revealOn(held, item, g), { row: 'w', i: 0 });
    assert.equal(held.weapons[0].icon, WEAPONS[item.id].icon, 'the revealed HUD icon is the actual outcome');
    assert.equal(held.weapons[0].evolved, true);
    g.time = 900;
    const report = g.runReport(true, false);
    assert.ok(report.evos.includes(item.id), 'the completed-run report carries the rolled evolution');
    assert.deepEqual(report.copperWeapons, [], 'good stock never becomes a cursed-slot claim after morphing');
    const profile = P.sanitizeProfile({ ...P.defaultProfile(), heroes: ['knight', 'eanasir'] });
    const saved = P.applyRun(profile, report);
    assert.equal(saved.ok, true);
    const reloaded = P.sanitizeProfile(P.packProfile(saved.profile));
    assert.ok(P.knownEvos(reloaded).includes(item.id), 'the specific rolled form survives saved-profile reload');
  }
});

test('Spellbook does not replace the Phoenix requirement for the six poor copper curse weapons', () => {
  const g = game('knight');
  g.inCrypt = { key: 'poor-copper-regression' };
  for (let i = 0; i < 6; i++) assert.equal(g.infestCopper(), true);
  for (const w of g.player.weapons) max(w);
  g.addPassive('cooldown');
  assert.deepEqual(g.evolvable(), []);
  assert.ok(g.player.weapons.every((w) => w.evolve() === false));
  g.addPassive('phoenix');
  assert.equal(g.evolvable().length, 6);
  for (let i = 0; i < 6; i++) assert.equal(g.player.weapons[i].evolve(), true);
  assert.deepEqual(g.player.weapons.map((w) => w.id), COPPER_EVOLUTIONS, 'poor copper keeps its fixed six outcomes');
  g.inCrypt = null;
  g.time = 900;
  const saved = P.applyRun(P.defaultProfile(), g.runReport(true, false));
  assert.equal(saved.ok, true);
  assert.ok(saved.profile.heroes.includes('eanasir'), 'the original six-slot victory challenge still unlocks the merchant');
});
