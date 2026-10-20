// The four heroes of 20 October 2026 (the owner: "all four"): the Paladin, the Druid, the
// Berserker and the Witch Hunter, each with one signature weapon of their own and its evolution,
// a perk and an ultimate. Their art is still being drawn: art/fallbacks.js stands in for it.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Pillar, Burrow, Grip, Chop, Sanctum, Overgrowth, Frenzy, Purge, FRENZY, SANCTUM, PURGE, wicked, silverBolt } from '../public/js/game/effects.js';
import { LEAP, leapSpot } from '../public/js/game/weapons.js';
import { KILL_HEAL, GROVE } from '../public/js/game/player.js';
import { HEROES } from '../public/js/data/heroes.js';
import { WEAPONS, BRAND_TIME } from '../public/js/data/weapons.js';
import { buildSprites, SPR } from '../public/js/engine/sprites.js';
import { ART_FALLBACKS } from '../public/js/art/fallbacks.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const step = (g, n = 1) => { for (let i = 0; i < n; i++) g.update(1 / 60); };

// A seeded game with no horde of its own: only the foes a test brings.
function gameCase(hero, fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(23);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.spawner.update = () => {};
    g.player.devGod = true;
    for (const e of g.enemies) e.dead = true;
    step(g);
    return fn(g, g.player, g.player.weapons[0]);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
// A tough foe that stands still (dormant: it never wakes to walk), dx, dy from the hero.
const foe = (g, dx, dy, o = {}, type = 'zombie') => {
  const e = g.spawnEnemy(type, g.player.x + dx, g.player.y + dy, { instant: true, hpMul: 1e5, ...o });
  e.spd = 0;
  return e;
};
// What a blow of 100 takes off a foe, with the dice held still (no crit, no spread).
function blow(g, e, o = {}) {
  const r = Math.random;
  Math.random = () => 0.5;
  try {
    const hp = e.hp;
    g.hitEnemy(e, 100, { noCrit: true, ...o });
    return hp - e.hp;
  } finally {
    Math.random = r;
  }
}
// The weapon fires now, at the foes as they stand (the grid that finds them rebuilt first).
const fire = (g, w) => {
  g.grid.rebuild(g.enemies, g.player.x, g.player.y);
  w.cd = 0;
  w.update(1 / 60);
};

test('the four stand after the Necromancer, each with a signature of his own that evolves', () => {
  buildSprites();
  const want = { paladin: ['smite', 'judgement', 'sanctum'], druid: ['roots', 'worldroot', 'overgrowth'], berserker: ['twinaxes', 'bloodstorm', 'frenzy'], witchhunter: ['crossbow', 'purifier', 'purge'] };
  for (const [id, [sig, evo, ult]] of Object.entries(want)) {
    const h = HEROES[id];
    assert.deepEqual(h.unique, [sig], id);
    assert.equal(h.weapon, sig);
    assert.equal(WEAPONS[sig].evo.into, evo);
    assert.equal(h.ult, ult);
    assert.ok(h.perk && h.ultName && h.ultDesc, `${id}: a perk and an ultimate, named and told`);
    // Until their art is in, the stand-ins draw them (one place: art/fallbacks.js).
    for (const name of [h.sprite, h.pose, WEAPONS[sig].icon, WEAPONS[evo].icon]) assert.ok(SPR[name], `${id}: ${name} is drawn`);
  }
  for (const name of Object.keys(ART_FALLBACKS)) assert.ok(SPR[name], `${name} has a sprite or its stand-in`);
  // None is slower than the slowest of the five, whom the Gilded Thief is measured by.
  for (const id of Object.keys(want)) assert.ok((HEROES[id].stats.speed || 1) >= 1, id);
});

// ------------------------------------------------------------------ Paladin --

test('Smite strikes the mightiest foe in reach, splashes round it and brands all it burns', () =>
  gameCase('paladin', (g, p, w) => {
    const near = foe(g, 30, 0);
    const champ = foe(g, -110, 0, { elite: true });
    const by = foe(g, -110 + 12, 6);
    const hp = [near.hp, champ.hp, by.hp];
    fire(g, w);
    assert.equal(g.effects.find((e) => e instanceof Pillar).target, champ, 'the champion, not the nearer zombie');
    step(g, 3);
    assert.equal(near.hp, hp[0], 'the zombie far from it untouched');
    assert.ok(champ.hp < hp[1] && by.hp < hp[2], 'the champion struck, and the one beside it');
    assert.ok(hp[1] - champ.hp > hp[2] - by.hp, 'the splash a little less');
    for (const e of [champ, by]) {
      assert.ok(e.brandT > BRAND_TIME - 0.2 && Math.abs(e.brandK - w.s.brand) < 1e-9, 'branded');
    }
    // Branded, every blow does 15% more, anyone's.
    const plain = foe(g, 200, 0);
    assert.ok(Math.abs(blow(g, by) / blow(g, plain) - 1.15) < 0.02, 'a sixth more, near enough');
    w.update = () => {}; // no pillar more
    step(g, Math.ceil(BRAND_TIME * 60) + 2);
    assert.ok(Math.abs(blow(g, by) / blow(g, plain) - 1) < 0.02, 'and gone in its time');
  }));

test('Judgement drops five pillars on the mightiest, and its brand burns deeper', () =>
  gameCase('paladin', (g, p, w) => {
    const foes = [];
    for (let i = 0; i < 7; i++) foes.push(foe(g, -60 + i * 20, 40, { hpMul: 1e5 * (i + 1) }));
    w.evolve();
    assert.equal(w.id, 'judgement');
    fire(g, w);
    const pillars = g.effects.filter((e) => e instanceof Pillar);
    assert.equal(pillars.length, 5);
    assert.deepEqual(new Set(pillars.map((pl) => pl.target)), new Set(foes.slice(2)), 'the five with the most health');
    step(g, 30);
    assert.ok(foes[6].brandK === 0.25);
  }));

test('Devotion: 140 health, every heal half as much again, and kills heal a little, a share a second at most', () =>
  gameCase('paladin', (g, p) => {
    assert.equal(p.maxHp, 140);
    p.hp = 50;
    p.heal(10, true);
    assert.equal(p.hp, 65, 'a heal of 10 heals 15');
    p.hp = 50;
    step(g, 90); // the second's allowance fills
    const before = p.hp;
    for (let i = 0; i < 40; i++) g.killEnemy(foe(g, 50, 0, { hpMul: 1 }));
    const healed = p.hp - before;
    assert.ok(healed > 0, 'kills heal');
    assert.ok(healed <= p.maxHp * KILL_HEAL.most * p.healMul + 1, `but forty at once no more than a second's share (${healed.toFixed(2)})`);
  }));

test('Sanctum stuns and burns the foes in its dome and heals her each second; a boss is only slowed', () =>
  gameCase('paladin', (g, p) => {
    for (const w of p.weapons) w.update = () => {};
    const inside = foe(g, 30, 0, { hpMul: 1 });
    inside.hp = inside.maxHp = 1e5;
    const outside = foe(g, 160, 0);
    const boss = g.spawnBoss('butcher', p.x - 40, p.y);
    boss.maxHp = boss.hp = 1e7;
    p.hp = 40;
    g.startUlt('sanctum');
    assert.ok(g.effects.some((e) => e instanceof Sanctum));
    step(g, 75);
    assert.ok(inside.hp < inside.maxHp && inside.stunT > 0 && inside.rootT > 0, 'stunned and burning');
    assert.equal(outside.hp, outside.maxHp, 'the dome ends where it ends');
    assert.ok(boss.hp < boss.maxHp && !(boss.stunT > 0) && !(boss.rootT > 0) && boss.slowF >= 0.5, 'the boss burns, slowed');
    assert.ok(p.hp >= 40 + 2 * p.maxHp * SANCTUM.heal * p.healMul - 1, `she heals (${p.hp.toFixed(1)})`);
  }));

// -------------------------------------------------------------------- Druid --

test('Snaring Roots tunnel under the foes on the way, burst up round their foe and hold it; a boss is only slowed', () =>
  gameCase('druid', (g, p, w) => {
    const target = foe(g, 100, 0);
    const between = foe(g, 50, 0);
    target.spd = 30;
    target.dormant = false;
    target.aware = true;
    g.grid.rebuild(g.enemies, p.x, p.y);
    w.strike(0, 0, target); // struck at by hand: the far one, past the near one
    w.update(1 / 60);
    const b = g.effects.find((e) => e instanceof Burrow);
    assert.equal(b.target, target);
    step(g, 40);
    assert.equal(between.hp, between.maxHp, 'nothing on its way is struck');
    assert.ok(target.hp < target.maxHp, 'its foe is');
    assert.ok(target.rootT > 0.3, 'and held');
    const at = target.x;
    step(g, 20);
    assert.equal(target.x, at, 'it cannot move');
    const boss = g.spawnBoss('butcher', p.x - 60, p.y);
    w.strike(Math.PI, 0, boss);
    step(g, 40);
    assert.ok(!(boss.rootT > 0) && boss.slowT > 0 && boss.slowF >= 0.5, 'a boss is slowed, not held');
    assert.ok(g.effects.some((e) => e instanceof Grip));
  }));

test('World Root sends three roots, holds longer, and the Hourglass holds longer still', () =>
  gameCase('druid', (g, p, w) => {
    for (let i = 0; i < 3; i++) foe(g, 70, -60 + i * 60);
    w.evolve();
    fire(g, w);
    assert.equal(g.effects.filter((e) => e instanceof Burrow).length, 3);
    step(g, 40);
    const grips = g.effects.filter((e) => e instanceof Grip);
    assert.equal(grips.length, 3);
    assert.ok(Math.abs(grips[0].dur - 2.2) < 1e-9);
    g.addPassive('duration');
    for (const e of g.enemies) e.rootT = 0;
    fire(g, w);
    step(g, 40);
    assert.ok(g.effects.some((e) => e instanceof Grip && e.dur > 2.2 * 1.1), 'held longer');
  }));

test('Grove Warden: a quarter more damage with a tree near, none in a crypt; he regenerates', () =>
  gameCase('druid', (g, p) => {
    assert.ok(p.regen > 0);
    const e = foe(g, 200, 0);
    g.world.treeNear = () => false;
    step(g, 20);
    const bare = blow(g, e);
    g.world.treeNear = () => true;
    step(g, 20);
    assert.ok(p.inGrove);
    assert.ok(Math.abs(blow(g, e) / bare - 1.25) < 0.02, 'a quarter more by the trees');
    g.inCrypt = { key: 'x' };
    step(g, 20);
    assert.equal(p.inGrove, false, 'no grove below ground');
    g.inCrypt = null;
    // The forest itself: by a tree's foot there is one; far out in a clearing, none.
    delete g.world.treeNear;
    let tree = null;
    g.world.trunksNear(p.x, p.y, (t) => { if (!tree && t.spr) tree = t; }, 400);
    assert.ok(tree, 'a tree near the start');
    assert.ok(g.world.treeNear(tree.x + 20, tree.y, GROVE.near));
    assert.ok(!g.world.treeNear(tree.x + 20, tree.y, 10));
  }));

test('Overgrowth roots every foe on the screen and strikes it; one that comes on after is caught too', () =>
  gameCase('druid', (g, p) => {
    for (const w of p.weapons) w.update = () => {};
    const a = foe(g, 120, 40), b = foe(g, -150, -60);
    g.startUlt('overgrowth');
    step(g, 2);
    for (const e of [a, b]) assert.ok(e.rootT > 2.5 && e.hp < e.maxHp, 'held for the ultimate, and struck');
    const late = foe(g, 60, 0);
    step(g, 40);
    assert.ok(late.rootT > 1 && late.hp < late.maxHp, 'the latecomer too');
    assert.ok(g.ultRun.kills >= 0 && g.ultRun.dmg > 0, 'its blows are its own');
  }));

// ---------------------------------------------------------------- Berserker --

test('the Twin Axes leap on a foe ahead and chop all round where he lands; he never turns', () =>
  gameCase('berserker', (g, p, w) => {
    p.face = 1;
    const ahead = foe(g, 50, 0);
    const x0 = p.x;
    fire(g, w);
    assert.ok(p.leap, 'he leaps');
    assert.ok(p.untouchable, 'and nothing touches him in the air');
    step(g, 12);
    assert.equal(p.leap, null, 'a short, quick leap');
    assert.ok(p.x > x0 + 25 && p.x < ahead.x - ahead.r - p.r, `he lands just short of it (${(p.x - x0).toFixed(1)} px)`);
    assert.ok(ahead.hp < ahead.maxHp, 'and chops it');
    assert.ok(g.effects.some((e) => e instanceof Chop) || ahead.hp < ahead.maxHp);
    assert.equal(p.face, 1);
  }));

test('the Twin Axes never leap back against the way he walks, nor behind him standing', () =>
  gameCase('berserker', (g, p, w) => {
    input.bot = { x: -1, y: 0 };
    step(g, 10);
    const behind = foe(g, 50, 0);
    fire(g, w);
    assert.equal(p.leap, null, 'walking away, no leap back');
    assert.equal(behind.hp, behind.maxHp);
    input.bot = { x: 0, y: 0 };
    step(g, 10);
    assert.equal(p.face, -1);
    fire(g, w);
    assert.equal(p.leap, null, 'standing, none behind him');
  }));

test('a leap never crosses what the hero cannot walk through: it lands short of it, or not at all', () =>
  gameCase('berserker', (g, p) => {
    const t = { x: p.x + 60, y: p.y, r: 6 };
    g.world.open = (x) => x < p.x + 22;
    const to = leapSpot(g, p, t);
    assert.ok(to && to.x <= p.x + 22 && to.x > p.x + LEAP.near, `short of the wall (${(to.x - p.x).toFixed(1)})`);
    g.world.open = (x) => x < p.x + 8;
    assert.equal(leapSpot(g, p, t), null, 'no room: no leap');
    // A real trunk in the forest: the leap stops before it.
    delete g.world.open;
    let tree = null;
    g.world.trunksNear(p.x, p.y, (k) => { if (!tree && k.spr) tree = k; }, 400);
    p.x = tree.x - 30;
    p.y = tree.y;
    const spot = leapSpot(g, p, { x: tree.x + 25, y: tree.y, r: 6 });
    assert.ok(!spot || spot.x < tree.x - tree.trunk - p.r + 1, 'not into the trunk');
    if (spot) assert.ok(g.world.open(spot.x, spot.y, p.r));
  }));

test('Bloodrage: the lower his health, the harder and faster he strikes', () =>
  gameCase('berserker', (g, p, w) => {
    const e = foe(g, 200, 0);
    const full = blow(g, e);
    assert.equal(w.haste, 1);
    p.hp = p.maxHp * 0.25;
    assert.ok(Math.abs(blow(g, e) / full - (1 + 0.6 * 0.75)) < 0.02, 'three quarters gone: +45%');
    assert.ok(Math.abs(w.haste - (1 + 0.3 * 0.75)) < 1e-9, 'and +22.5% faster');
    assert.ok(p.moveSpeed > 70 * 1.14);
  }));

test('Bloodstorm chops twice where he lands, and its kills heal him a little', () =>
  gameCase('berserker', (g, p, w) => {
    w.evolve();
    assert.equal(w.id, 'bloodstorm');
    p.hp = p.maxHp * 0.5;
    step(g, 90);
    for (let i = 0; i < 8; i++) foe(g, Math.cos(i) * 20, Math.sin(i) * 16, { hpMul: 0.01 });
    const tough = foe(g, 0, 22);
    const hp = p.hp;
    p.face = 1;
    fire(g, w);
    step(g, 30);
    assert.ok(g.enemies.filter((e) => !e.dead).length <= 1, 'the small ones fall');
    assert.ok(tough.maxHp - tough.hp > w.s.dmg * 1.5, 'the tough one struck twice');
    assert.ok(p.hp > hp, 'his kills heal him');
  }));

test('Red Frenzy chops round him without rest, every kill heals 3%, and his weapons strike twice as fast', () =>
  gameCase('berserker', (g, p, w) => {
    const tough = foe(g, 25, 0);
    g.startUlt('frenzy');
    assert.ok(g.effects.some((e) => e instanceof Frenzy));
    assert.equal(w.haste, FRENZY.haste);
    step(g, 30);
    assert.ok(tough.hp < tough.maxHp);
    assert.ok(g.ultRun.dmg > 0, 'its chops are its own blows');
    p.hp = p.maxHp / 2;
    const hp = p.hp;
    g.killEnemy(foe(g, 300, 0, { hpMul: 1 }));
    assert.ok(Math.abs(p.hp - hp - p.maxHp * FRENZY.heal) < 1e-6, '3% a kill');
  }));

// ------------------------------------------------------------- Witch Hunter --

test('the Silver Crossbow aims at the wicked before the nearer horde, pierces, and bites deeper into them', () =>
  gameCase('witchhunter', (g, p, w) => {
    const zombie = foe(g, 40, 0);
    const cultist = foe(g, -150, 0, {}, 'cultist');
    assert.ok(wicked(cultist) && !wicked(zombie));
    fire(g, w);
    step(g);
    const bolt = g.projectiles.find((pr) => pr.kind === 'bolt');
    assert.ok(bolt && Math.cos(bolt.ang) < -0.99, 'at the cultist, behind her');
    assert.equal(bolt.pierce, 2);
    // The bane: half as much again on the wicked.
    const r = Math.random;
    Math.random = () => 0.5;
    try {
      for (const pr of g.projectiles) pr.dead = true;
      const a = foe(g, 0, 60, {}, 'cultist'), b = foe(g, 0, -60);
      silverBolt(g, w, p.x, p.y, Math.PI / 2, { dmg: 20, pierce: 0, kb: 0, bane: 0.5 });
      silverBolt(g, w, p.x, p.y, -Math.PI / 2, { dmg: 20, pierce: 0, kb: 0, bane: 0.5 });
      step(g, 20);
      assert.ok(Math.abs((a.maxHp - a.hp) / (b.maxHp - b.hp) - 1.5) < 0.05, 'half as much again');
    } finally {
      Math.random = r;
    }
  }));

test('the Silver Crossbow waits for a foe; struck by hand, it looses anyway', () =>
  gameCase('witchhunter', (g, p, w) => {
    fire(g, w);
    step(g, 10);
    assert.equal(g.projectiles.length, 0, 'no foe, no bolt');
    w.strike(0, 0, null);
    step(g, 2);
    assert.equal(g.projectiles.filter((pr) => pr.kind === 'bolt').length, 1);
  }));

test('the Purifier looses a burst of three, and each bolt bursts in silver light', () =>
  gameCase('witchhunter', (g, p, w) => {
    const a = foe(g, 80, 0), by = foe(g, 92, 10);
    w.evolve();
    fire(g, w);
    step(g, 30);
    assert.ok(g.projectiles.length === 0 || g.projectiles.every((pr) => pr.kind === 'bolt'));
    assert.ok(a.hp < a.maxHp && by.hp < by.maxHp, 'the burst reaches the one beside');
  }));

test('Inquisition: a third more on champions, lords and bosses, and keener crits', () =>
  gameCase('witchhunter', (g, p) => {
    assert.ok(Math.abs(p.crit - 0.15) < 1e-9);
    const plain = foe(g, 200, 0), champ = foe(g, -200, 0, { elite: true });
    assert.ok(Math.abs(blow(g, champ) / blow(g, plain) - 1.3) < 0.02);
  }));

test('Purge slows every foe on the screen by half, and her bolts fly three at once, bursting', () =>
  gameCase('witchhunter', (g, p, w) => {
    const a = foe(g, 100, 0), b = foe(g, -120, 50);
    g.startUlt('purge');
    assert.ok(g.effects.some((e) => e instanceof Purge));
    step(g, 3);
    for (const e of [a, b]) assert.ok(e.slowT > 0 && e.slowF >= PURGE.slow);
    assert.ok(w.haste >= PURGE.haste);
    for (const pr of g.projectiles) pr.dead = true;
    step(g);
    g.projectiles.length = 0;
    fire(g, w);
    step(g);
    const mine = g.projectiles.filter((pr) => pr.w === w);
    assert.equal(mine.length, 3, 'three at once');
    assert.ok(mine.every((pr) => pr.onHit), 'each one bursts');
    step(g, 60);
    assert.ok(g.ultRun.dmg > 0, 'and those are the ultimate\'s blows');
  }));
