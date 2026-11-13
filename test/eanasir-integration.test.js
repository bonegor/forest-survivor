import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { EnemyShot } from '../public/js/game/projectiles.js';
import { COPPER_IDS, COPPER_EVOLUTIONS, GOOD_COPPER_ID, isCopper } from '../public/js/data/copper.js';
import { HEROES, SHARED_WEAPONS } from '../public/js/data/heroes.js';
import { input } from '../public/js/engine/input.js';
import { textMask } from '../public/js/engine/font.js';
import * as P from '../public/js/shared/profile.js';

const game = (hero = 'knight') => {
  const profile = P.defaultProfile();
  const g = new Game({ hero, mode: 's15', diff: 'easy', meta: P.metaBonuses(profile), open: P.openFor(profile, hero), settings: {}, headless: true });
  g.spawner.update = () => {};
  g.enemies.length = 0;
  return g;
};
function enter(g) {
  const d = { key: '2,0', depth: 1, x: g.player.x, y: g.player.y };
  g.enterCrypt(d);
  g.travelGo();
  g.state = 'play';
  return d;
}
function curse(g) {
  const p = g.player;
  p.invuln = 0;
  const s = new EnemyShot(g, p.x - 10, p.y, 0, 100, 1, 'pqc', { swept: true });
  assert.equal(s.update(0.15), false);
}

test('six landed curses replace weakest weapons, fill missing slots, and retain rank and unique hit channels', () => {
  const g = game(), p = g.player;
  p.weapons[0].level = 6; p.weapons[0].recompute();
  const axe = g.addWeapon('axe', 2), blades = g.addWeapon('blades', 4);
  enter(g);
  const hp = p.hp;
  curse(g);
  assert.equal(p.weapons[1].baseId, 'pqc1');
  assert.equal(p.weapons[1].level, 2);
  assert.equal(p.weapons[1].src, axe.src);
  curse(g);
  assert.equal(p.weapons[2].baseId, 'pqc2');
  assert.equal(p.weapons[2].src, blades.src);
  curse(g);
  assert.equal(p.weapons[0].baseId, 'pqc3');
  for (let i = 0; i < 3; i++) curse(g);
  assert.equal(p.weapons.length, 6);
  assert.equal(p.weapons.filter(isCopper).length, 6);
  assert.equal(new Set(p.weapons.map(w => w.src)).size, 6);
  assert.ok(p.hp > 0 && p.hp < hp);
  assert.equal(g.infestCopper(), false);
  assert.equal(g.maxWeapons, 6);
  assert.equal(g.upgradePool().some(c => c.type === 'weapon' && !isCopper(c.id)), false);
  assert.equal(g.weaponOpen('sword'), false);
});

test('curse removes old attacks, pools and minions and survives leaving or fainting in the crypt', () => {
  for (const faint of [false, true]) {
    const g = game(), p = g.player;
    enter(g);
    const old = p.weapons[0], fx = { w: old, persistent: true };
    old.fx = fx; g.effects.push(fx); g.minions.push({ w: old });
    assert.equal(g.infestCopper(), true);
    assert.equal(fx.dead, true);
    assert.ok(!g.effects.some(e => e.w === old));
    assert.ok(!g.minions.some(e => e.w === old));
    const copper = p.weapons[0];
    if (faint) { g.faint(); g.wake(); }
    else { g.leaveCrypt(); g.travelGo(); }
    assert.equal(g.inCrypt, null);
    assert.equal(p.weapons[0], copper);
    assert.equal(g.weaponOpen('sword'), false);
  }
});

test('copper auto-fires in a crypt without the strike key, and does not hit through walls', () => {
  const g = game(), p = g.player, bot = input.bot;
  enter(g);
  for (const e of g.enemies) e.dead = true;
  g.infestCopper();
  const w = p.weapons[0];
  const e = g.spawnEnemy('skeleton', p.x + 28, p.y, { instant: true, hpMul: 1000, always: true });
  e.spd = 0;
  const hp = e.hp;
  try {
    input.bot = { x: 0, y: 0 };
    for (let i = 0; i < 75; i++) g.update(1 / 60);
    assert.ok(e.hp < hp, 'automatic copper hit with no manual strike');
    const before = e.hp;
    g.world.lineOfSight = () => false;
    g.hitEnemy(e, 100, { w });
    assert.equal(e.hp, before);
  } finally { input.bot = bot; }
});

test('Phoenix is obtainable after losing the signature, and all six copper evolutions persist as known', () => {
  const g = game(), p = g.player;
  enter(g); g.infestCopper();
  assert.equal(g.signatureEvolved(), false);
  assert.ok(g.upgradePool().some(c => c.type === 'passive' && c.id === 'phoenix'));
  while (g.infestCopper()) {}
  for (const w of p.weapons) { w.level = 8; w.recompute(); }
  assert.equal(g.evolvable().length, 0);
  g.addPassive('might', 5);
  assert.equal(g.evolvable().length, 0);
  g.addPassive('phoenix');
  assert.equal(g.evolvable().length, 6);
  for (let i = 0; i < 6; i++) g.rollChest('lord');
  assert.ok(p.weapons.every(w => w.evolved && isCopper(w)));
  g.time = 900;
  const result = P.applyRun(P.defaultProfile(), g.runReport(true, false));
  assert.equal(result.ok, true);
  assert.ok(result.profile.heroes.includes('eanasir'));
  assert.ok(result.reward.unlocks.includes('hero:eanasir'));
  const saved = P.sanitizeProfile(P.packProfile(result.profile));
  assert.ok(saved.heroes.includes('eanasir'));
  assert.ok(COPPER_EVOLUTIONS.every(id => P.knownEvos(saved).includes(id)));
});

test('the hero unlock requires a complete distinct copper build on a legitimate win', () => {
  const report = { mode: 's15', hero: 'knight', time: 900, victory: true, copperWeapons: [...COPPER_IDS] };
  const unlocked = r => P.applyRun(P.defaultProfile(), r).profile.heroes.includes('eanasir');
  assert.equal(unlocked(report), true);
  for (const change of [
    { victory: false }, { time: 1 }, { mode: 'ranked' },
    { copperWeapons: COPPER_IDS.slice(0, 5) }, { copperWeapons: Array(6).fill('pqc1') },
    { copperWeapons: undefined, copperVictory: true },
  ]) assert.equal(unlocked({ ...report, ...change }), false, JSON.stringify(change));
  assert.equal(P.unlocksNext(P.defaultProfile(), P.HERO_ORDER.at(-2)), null);
  assert.equal(P.unlocksNext(P.defaultProfile(), 'eanasir'), null);
});

test('the merchant starts with one good copper weapon, normal slots, bonus gold, and no shared copper offers', () => {
  const g = game('eanasir'), knight = game();
  assert.deepEqual(g.player.weapons.map(w => w.id), [GOOD_COPPER_ID]);
  assert.equal(g.maxWeapons, knight.maxWeapons);
  assert.equal(g.maxWeapons, 3);
  assert.equal(g.player.greed, knight.player.greed * 1.25);
  const p = P.sanitizeProfile({ ...P.defaultProfile(), heroes: ['knight', 'eanasir'] });
  assert.equal(P.openFor(p, 'eanasir').ult, false);
  enter(g);
  assert.equal(g.infestCopper(), false);
  assert.ok(!g.enemies.some(e => e.type === 'eanasir'));
  assert.ok(!SHARED_WEAPONS.some(isCopper));
  assert.ok(HEROES.eanasir.unlock.includes('six'));
});

test('the bitmap name never substitutes question marks for transliteration accents', () => {
  for (const font of ['normal', 'bold', 'heading', 'title', 'gothic']) {
    assert.deepEqual(textMask('Ea-nāṣir', font), textMask('Ea-nasir', font));
  }
});

test('manual gestures leave copper autofire running even when the leading slot is an aura', () => {
  const g = game();
  enter(g); g.infestCopper(); g.addPassive('phoenix');
  const w = g.mainWeapon();
  w.level = 8; w.evolve();
  const cd = w.cd;
  assert.equal(g.strike(), true);
  assert.equal(w.handAt, null, 'continuous weapons never acquire a stuck manual release');
  assert.equal(w.cd, cd, 'manual gestures do not delay automatic attacks');
  assert.ok(g.boxBlowAt >= g.clock);
  assert.equal(g.strike(), false, 'the box gesture has its own cooldown');
  g.cryptTime += 0.6;
  assert.equal(g.strike(), true, 'boxes can be struck repeatedly after evolving');
});
