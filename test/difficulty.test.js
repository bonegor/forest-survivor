// Normal and Veteran, and armor. The user: "Armor upgrade - make them somehow more effective ...
// It should never go to completely zero ideally", then "add both, but make it so that it has a
// much bigger effect than right now, especially against late game units. Maybe 10% + min 1
// damage (but just denote that as armor +1). There should be some decay as well to how far armor
// can go. Like it can only stop 95% damage?", and "let us have veteran + normal. Veteran is the current setup and normal is that all the monsters have
// their damage cause reduced by 50% and the number of ranged monsters spawn + wolver + any other
// monsters that lunges is reduced to 1/3 ... And ALL current damage effects vs heroes are halved."
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { isFew } from '../public/js/game/spawner.js';
import { armored } from '../public/js/game/player.js';
import { NORMAL, VETERAN, GAME_SPEED, HARDER, CROWD } from '../public/js/data/difficulty.js';
import { mulberry32, fmtTime } from '../public/js/engine/util.js';
import { targetCount } from '../public/js/data/waves.js';
import { defaultProfile, metaBonuses, runReward, DIFF_GOLD, HERO_UNLOCK_TIME } from '../public/js/shared/profile.js';

function game(o = {}, seed = 7) {
  const oldRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, ...o });
    g.update(1 / 60); // the first frame builds what a blow looks up (the grid)
    return g;
  } finally {
    Math.random = oldRandom;
  }
}

test('a run plays the rules chosen for it; Ranked and the bots Veteran', () => {
  assert.equal(game({ diff: 'medium' }).diff, NORMAL);
  assert.equal(game({ diff: 'hard' }).diff, VETERAN);
  assert.equal(game().diff, VETERAN, 'no choice: the game as it was tuned');
  assert.equal(game({ mode: 'ranked', diff: 'medium' }).diff, VETERAN);
  assert.equal(game({ diff: 'medium' }).diffId, 'medium', 'what the run reports');
});

test('on Normal every blow the hero takes is half what Veteran deals, armor and all', () => {
  for (const [armor, amount] of [[0, 10], [0, 3], [3, 7], [12, 40], [0, 0.2]]) {
    const taken = {};
    for (const diff of ['hard', 'medium']) {
      const g = game({ diff }), p = g.player;
      p.armor = armor;
      taken[diff] = p.hurt(amount);
    }
    const vet = armored(amount * VETERAN.dmg, armor);
    assert.equal(taken.hard, Math.max(1, Math.round(vet)), `Veteran, ${amount} against ${armor} armor`);
    assert.equal(taken.medium, Math.max(1, Math.round(vet / 2)), `Normal, ${amount} against ${armor} armor`);
  }
  // What a monster, its shots and a boss's blasts do all goes through Player.hurt.
  const g = game({ diff: 'medium' }), p = g.player, foe = g.spawnEnemy('skeleton', p.x + 3, p.y, { instant: true });
  const before = p.hp;
  for (let i = 0; i < 20 && p.hp === before; i++) g.update(1 / 60);
  assert.equal(before - p.hp, Math.round((foe.dmg * g.dmgScale * VETERAN.dmg) / 2), 'a skeleton\'s blow, halved');
});

test('each point of armor takes a tenth off what is left of a blow, or 1 if that is more, never past 95%', () => {
  const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a}, not ${b}`);
  near(armored(100, 0), 100, 'no armor');
  near(armored(100, 1), 90, 'a point takes a tenth');
  near(armored(100, 5), 100 * 0.9 ** 5, 'five: a tenth of what is left, five times (41% in all)');
  near(armored(100, 10), 100 * 0.9 ** 10, 'ten: 65% in all, each point adding less');
  near(armored(8, 1), 7, 'a small blow loses 1 a point, more than its tenth');
  near(armored(13, 5), 13 * 0.9 ** 5, 'past the point where a tenth is more');
  near(armored(13, 10), 3, 'a small blow against much armor: a point each');
  near(armored(100, 40), 5, 'never more than 95% of a blow');
  near(armored(13, 20), 13 * 0.05, 'nor of a small one');
  // In play: what is left is rounded, never below 1, and halved again on Normal.
  const g = game(), p = g.player;
  p.armor = 5;
  assert.equal(p.hurt(30), Math.round(30 * VETERAN.dmg * 0.9 ** 5), 'a late blow loses 41% to five points');
  p.invuln = 0;
  p.buffs.set('protection', { t: 9, max: 9 });
  p.ult = { type: 'whirlwind', t: 3 };
  p.armor = 1000;
  assert.equal(p.hurt(0.01), 1, 'a blow always lands');
});

test('an Armory rank of Armor shows as +1 armor, and is one point of it', () => {
  for (const rank of [0, 1, 5]) {
    const prof = { ...defaultProfile(), up: { armor: rank } };
    const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(prof), settings: { numbers: false } });
    assert.equal(g.player.armor, rank);
  }
});

test('on Normal a third as many of the monsters that shoot or lunge come, and the horde is as big', () => {
  assert.deepEqual(['cultist', 'wolf', 'orc', 'hellhound', 'skeleton', 'imp', 'spider', 'bat'].filter(isFew), ['cultist', 'wolf', 'orc', 'hellhound']);
  const share = (diff, phase) => {
    const g = game({ diff });
    const oldRandom = Math.random;
    Math.random = mulberry32(11);
    try {
      let n = 0;
      const N = 40000;
      for (let i = 0; i < N; i++) if (isFew(g.spawner.pickType(phase))) n++;
      return n / N;
    } finally {
      Math.random = oldRandom;
    }
  };
  // Minutes 4½, 9½, 12½ and 20 (the night's phase runs 1.4 to the minute until 15, then 0.9).
  for (const phase of [6.3, 13.3, 17.5, 25.5]) {
    const vet = share('hard', phase), normal = share('medium', phase);
    assert.ok(vet > 0.1, `phase ${phase}: some come on Veteran (${vet})`);
    assert.ok(Math.abs(normal / vet - 1 / 3) < 0.03, `phase ${phase}: a third as many on Normal (${normal} against ${vet})`);
  }
  // The packs of them too: the wolves at 9½ minutes, the hellhounds at 22½. Swarms of others stay.
  for (const [ev, few] of [[{ type: 'pack', enemy: 'wolf', count: 8 }, true], [{ type: 'pack', enemy: 'hellhound', count: 10 }, true], [{ type: 'pack', enemy: 'goblin', count: 18 }, false]]) {
    const n = {};
    for (const diff of ['hard', 'medium']) {
      const g = game({ diff });
      let k = 0;
      g.spawnEnemy = () => (k++, null);
      g.spawner.fire(ev, 10);
      n[diff] = k;
    }
    assert.equal(n.hard, Math.round(ev.count * VETERAN.horde));
    assert.equal(n.medium, few ? Math.round(ev.count * VETERAN.horde / 3) : n.hard, `${ev.enemy}: ${n.medium} against ${n.hard}`);
  }
});

// What a spawn asks for, without spawning it.
function asks(g, fn) {
  const got = [];
  g.spawnEnemy = (type, x, y, o = {}) => (got.push({ type, ...o }), null);
  fn();
  return got;
}

// Every monster's health as a run on diff gives it, by the way it comes: the horde early and late,
// a pack, a champion (Stoneskin aside), the thief, a boss's summons, a boss, a crypt's lord and a
// Dungeon Run floor's guardian. less: the difficulty's health (hp and health) that many times
// smaller, as a round of tuning found it.
function healths(diff, less = 1) {
  const weaker = (g) => {
    if (less !== 1) g.diff = { ...g.diff, hp: g.diff.hp / less, health: g.diff.health / less };
    return g;
  };
  const g = weaker(game({ diff })), p = g.player, s = g.spawner;
  const elite = asks(g, () => s.spawnElite(10))[0];
  const hp = {
    horde: s.stats(10).hpMul,
    late: s.stats(25).hpMul,
    pack: asks(g, () => s.fire({ type: 'pack', enemy: 'goblin', count: 5 }, 10))[0].hpMul,
    champion: elite.hpMul / (elite.mod.id === 'stone' ? 1.4 : 1),
    thief: asks(g, () => s.spawnThief(10))[0].hpMul,
    summoned: asks(g, () => g.summonRing('skeleton', 1, 40))[0].hpMul,
  };
  delete g.spawnEnemy; // back to the game's own
  hp.boss = g.spawnBoss('boneking', p.x + 80, p.y, { sleeping: true }).maxHp;
  hp.lord = s.spawnLord(p.x - 80, p.y).maxHp;
  const d = weaker(game({ diff, mode: 'dungeon' }));
  hp.floor = d.spawnBoss(d.world.info.guardian, d.player.x + 80, d.player.y, { sleeping: true }).maxHp;
  return hp;
}

// The user (16 October 2026): "Normal: monster health -70%".
test('on Normal every monster has 70% less health than on Veteran: the horde, champions, the thief, bosses and the crypts\' lords', () => {
  const tenth = (n, v, what) => assert.ok(Math.abs(n / v - 0.3) < 1e-9, `${what}: ${n} on Normal, ${v} on Veteran`);
  const hp = { hard: healths('hard'), medium: healths('medium') };
  for (const k of Object.keys(hp.hard)) tenth(hp.medium[k], hp.hard[k], k);
  assert.equal(hp.hard.floor, game({ mode: 'dungeon' }).world.guardian.maxHp, 'a floor\'s own guardian as counted');
  assert.equal(hp.hard.lord, 600 * HARDER, 'a lord on Veteran: its own 600, and the last round\'s +20%');
  assert.ok(Math.abs(NORMAL.health / VETERAN.health - 0.3) < 1e-12);
});

// The owner (20 October 2026): "difficulty is too easy. Increase monster health and damage by 20%."
test('the round of 20 October 2026: every monster on both difficulties has 20% more health and hits 20% harder', () => {
  const near = (a, b, what) => assert.ok(Math.abs(a / b - 1) < 1e-9, `${what}: ${a} against ${b}`);
  assert.equal(HARDER, 1.2);
  // On top of the rounds before it (difficulty.js TOUGHER, DEADLIER).
  near(VETERAN.hp, 1.9 * 1.1 ** 3 * 1.2 * 1.1 ** 2 * 1.2, 'Veteran\'s health');
  near(VETERAN.dmg, 1.65 * 1.1 ** 2 * 1.2 * 1.1 * 1.2 * 1.1 ** 2 * 1.2, 'Veteran\'s damage');
  near(NORMAL.hp, VETERAN.hp * 0.3, 'Normal\'s health: Veteran\'s, 70% less');
  assert.equal(NORMAL.dmg, VETERAN.dmg, 'Normal\'s damage: Veteran\'s (halved after armor: hurt)');
  // However a monster comes, its health takes it.
  for (const diff of ['hard', 'medium']) {
    const now = healths(diff), before = healths(diff, HARDER);
    for (const k of Object.keys(now)) near(now[k] / before[k], HARDER, `${diff}, ${k}`);
  }
  // Every blow the hero takes (a monster's, its shots', a boss's) goes through Player.hurt.
  for (const diff of ['hard', 'medium']) {
    const blow = (less) => {
      const g = game({ diff });
      if (less) g.diff = { ...g.diff, dmg: g.diff.dmg / HARDER };
      return g.player.hurt(1000);
    };
    assert.ok(Math.abs(blow(false) / blow(true) - HARDER) < 0.001, `${diff}: a blow 20% harder`);
  }
});

// The user: "in the last 6 minutes 30% more of the same monsters, but they each have 70% less health".
test('on Normal 30% more monsters come from minute 9 of the night on, not before, and never on Veteran', () => {
  const phaseAt = (secs) => (secs / 60) * 1.4; // the 15-minute night's clock
  const before = phaseAt(8 * 60 + 59), after = phaseAt(9 * 60 + 1);
  const vet = game({ diff: 'hard' }), normal = game({ diff: 'medium' });
  const ratio = (phase, a = normal, b = vet) => a.spawner.target(phase) / b.spawner.target(phase);
  assert.ok(Math.abs(ratio(phaseAt(30)) - 1) < 1e-9 && Math.abs(ratio(before) - 1) < 1e-9, 'the same horde until 9:00');
  for (const secs of [9 * 60 + 1, 11 * 60, 14 * 60 + 59]) {
    assert.ok(Math.abs(ratio(phaseAt(secs)) - 1.3) < 1e-9, `30% more at ${secs} s: ${ratio(phaseAt(secs))}`);
  }
  for (const phase of [before, after, 20]) {
    assert.ok(Math.abs(vet.spawner.target(phase) - targetCount(phase) * VETERAN.spawn) < 1e-9, 'Veteran as it was');
  }
  // The timed swarms, rings and packs too.
  const pack = (g, phase) => asks(g, () => g.spawner.fire({ type: 'pack', enemy: 'goblin', count: 18 }, phase)).length;
  assert.equal(pack(normal, before), pack(vet, before));
  assert.equal(pack(vet, after), Math.round(18 * VETERAN.horde));
  assert.equal(pack(normal, after), Math.round(18 * VETERAN.horde * 1.3));
  // A Dungeon Run floor's clock maps onto the night's: the Infernal Depths are all past minute 9.
  const dn = game({ diff: 'medium', mode: 'dungeon' }), dv = game({ diff: 'hard', mode: 'dungeon' });
  assert.ok(Math.abs(ratio(5, dn, dv) - 1) < 1e-9, 'the first floor as on Veteran');
  assert.ok(Math.abs(ratio(17, dn, dv) - 1.3) < 1e-9, 'the third 30% more');
  assert.equal(game({ diff: 'medium', mode: 'ranked' }).diff.late, null, 'Ranked is Veteran');
});

// A Holy Relic purges the horde on screen, but bosses, crypt lords and champions only take a
// heavy blow. On Normal they have 70% less health, so the blow is 70% lighter too: a flat 200
// would all but fell a crypt lord (216), there and in every crypt with a relic among its boxes.
test('a Holy Relic leaves a crypt lord standing, the same share of it gone on Normal as on Veteran', () => {
  const share = {};
  for (const diff of ['medium', 'hard']) {
    const g = game({ diff }), p = g.player;
    for (const e of g.enemies) e.dead = true;
    const lord = g.spawner.spawnLord(p.x + 40, p.y);
    lord.spawnT = 0;
    const oldRandom = Math.random;
    Math.random = mulberry32(11);
    try {
      g.holyNova();
    } finally {
      Math.random = oldRandom;
    }
    assert.ok(!lord.dead && lord.hp > 0, `${diff}: the lord stands (${lord.hp} of ${lord.maxHp})`);
    share[diff] = 1 - lord.hp / lord.maxHp;
  }
  assert.ok(share.hard > 0.25, `a heavy blow on Veteran as before: ${share.hard}`);
  // (A blow lands as a whole number, so the shares differ by the rounding alone.)
  assert.ok(Math.abs(share.medium - share.hard) < 0.01, `the same share on Normal: ${share.medium} against ${share.hard}`);
});

test('the gold a difficulty pays is the profile\'s alone, and its card says so', () => {
  for (const d of [NORMAL, VETERAN]) {
    assert.equal(d.gold, undefined, `${d.name} keeps no gold of its own`);
    assert.ok(d.desc.endsWith(`Gold x${DIFF_GOLD[d.id]}.`), d.desc);
    const run = { mode: 's15', diff: d.id, victory: false, gold: 100 };
    assert.equal(runReward(run).collected, Math.round(100 * DIFF_GOLD[d.id]));
  }
});

// The user (16 October 2026): the general game speed 20% up, on the 10% faster than real time it was;
// then (20 October 2026) "let the game be 15% faster".
test('a run goes about 52% faster than real time: the night in about 9:53, the next hero at about 3:18', () => {
  assert.ok(Math.abs(GAME_SPEED - 1.518) < 1e-9);
  assert.ok(Math.abs(GAME_SPEED / (1.1 * 1.2) - 1.15) < 1e-9, '15% faster than the 1.32 it was');
  assert.equal(fmtTime(15 * 60 / GAME_SPEED + 0.5), '09:53', 'the 15-minute night in real time');
  assert.equal(fmtTime(HERO_UNLOCK_TIME / GAME_SPEED + 0.5), '03:18', 'the 5:00 that brings in the next hero');
  // A real second of frames moves a run's clock on GAME_SPEED seconds; the bots keep the game's own pace.
  for (const pace of [GAME_SPEED, undefined]) {
    const g = game({ pace }), t0 = g.time;
    for (let i = 0; i < 60; i++) g.update(1 / 60);
    assert.ok(Math.abs(g.time - t0 - (pace || 1)) < 1e-9, `pace ${pace}: ${g.time - t0} s on the clock`);
  }
});

// The owner (20 October 2026): "the thing is even a bit too easy. Double the amount of monsters".
// Then again: "double the number of monsters on all difficulties".
test('the horde is four times what it was on both difficulties: the steady horde and the swarms, rings and packs', () => {
  assert.equal(CROWD, 4);
  const MORE = 1.1 * 1.1 * 1.2;
  for (const d of [VETERAN, NORMAL]) {
    assert.ok(Math.abs(d.spawn - 1.15 * MORE * 4) < 1e-9, `${d.name}'s steady horde`);
    assert.ok(Math.abs(d.horde - MORE * 4) < 1e-9, `${d.name}'s swarms, rings and packs`);
  }
});

// The owner (20 October 2026): "Speed up the slower monsters. General monster is only a little slower than hero."
test('the slow monsters of the horde close up on the hero, in their order; bosses, lords and the thief keep theirs', async () => {
  const { hordePace } = await import('../public/js/game/enemies.js');
  const { ENEMIES } = await import('../public/js/data/enemies.js');
  const walk = ['zombie', 'skeleton', 'goblin', 'wolf', 'hellhound'].map((id) => hordePace(ENEMIES[id]));
  for (let i = 1; i < walk.length; i++) assert.ok(walk[i] >= walk[i - 1], 'slow stays slower');
  for (const id of ['zombie', 'skeleton', 'ogre', 'slime']) {
    const v = hordePace(ENEMIES[id]) * VETERAN.speed;
    assert.ok(v > 0.8 * 70 && v < 70, `${id} a little slower than the slowest hero (${v})`);
  }
  assert.ok(Math.abs(hordePace(ENEMIES.cultist) - (46 + 0.25 * 30) * 0.9) < 1e-9, 'the Cultist a tenth slower than its kind');
  for (const id of ['boneking', 'lich', 'thief']) assert.equal(hordePace(ENEMIES[id]), ENEMIES[id].spd);
  assert.equal(hordePace(ENEMIES.skeletonarcher, { lord: true }), ENEMIES.skeletonarcher.spd);
});
