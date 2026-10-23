// Veteran and Elite, and armor. The user: "Armor upgrade - make them somehow more effective ...
// It should never go to completely zero ideally", then "add both, but make it so that it has a
// much bigger effect than right now, especially against late game units. Maybe 10% + min 1
// damage (but just denote that as armor +1). There should be some decay as well to how far armor
// can go. Like it can only stop 95% damage?", and "let us have veteran + normal. Elite is the current setup and normal is that all the monsters have
// their damage cause reduced by 50% and the number of ranged monsters spawn + wolver + any other
// monsters that lunges is reduced to 1/3 ... And ALL current damage effects vs heroes are halved."
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { isFew, minuteMore, WAVE, waveAt } from '../public/js/game/spawner.js';
import { armored, BASE_SPEED } from '../public/js/game/player.js';
import { NORMAL, VETERAN, ELITE, GAME_SPEED, HARDER, CROWD, VETERAN_CROWD, ELITE_CROWD, moveFor } from '../public/js/data/difficulty.js';
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

test('a run plays the rules chosen for it; Ranked and the bots Elite', () => {
  assert.equal(game({ diff: 'medium' }).diff, VETERAN);
  assert.equal(game({ diff: 'hard' }).diff, ELITE);
  assert.equal(game().diff, ELITE, 'no choice: the game as it was tuned');
  assert.equal(game({ mode: 'ranked', diff: 'medium' }).diff, ELITE);
  assert.equal(game({ diff: 'medium' }).diffId, 'medium', 'what the run reports');
});

test('on Veteran every blow the hero takes is half what Elite deals, armor and all', () => {
  for (const [armor, amount] of [[0, 10], [0, 3], [3, 7], [12, 40], [0, 0.2]]) {
    const taken = {};
    for (const diff of ['hard', 'medium']) {
      const g = game({ diff }), p = g.player;
      p.armor = armor;
      taken[diff] = p.hurt(amount);
    }
    const vet = armored(amount * ELITE.dmg, armor);
    assert.equal(taken.hard, Math.max(1, Math.round(vet)), `Elite, ${amount} against ${armor} armor`);
    assert.equal(taken.medium, Math.max(1, Math.round(vet / 2)), `Veteran, ${amount} against ${armor} armor`);
  }
  // What a monster, its shots and a boss's blasts do all goes through Player.hurt.
  const g = game({ diff: 'medium' }), p = g.player, foe = g.spawnEnemy('skeleton', p.x + 3, p.y, { instant: true });
  const before = p.hp;
  for (let i = 0; i < 20 && p.hp === before; i++) g.update(1 / 60);
  assert.equal(before - p.hp, Math.round((foe.dmg * g.dmgScale * ELITE.dmg) / 2), 'a skeleton\'s blow, halved');
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
  // In play: what is left is rounded, never below 1, and halved again on Veteran.
  const g = game(), p = g.player;
  p.maxHp = p.hp = 500; // enough to take both blows
  p.armor = 5;
  assert.equal(p.hurt(30), Math.round(30 * ELITE.dmg * 0.9 ** 5), 'a late blow loses 41% to five points');
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

test('on Veteran a third as many of the monsters that shoot or lunge come, in a horde half the size of Elite\'s', () => {
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
    assert.ok(vet > 0.1, `phase ${phase}: some come on Elite (${vet})`);
    assert.ok(Math.abs(normal / vet - 1 / 3) < 0.03, `phase ${phase}: a third as many on Veteran (${normal} against ${vet})`);
  }
  // The packs of them too: the wolves at 9½ minutes, the hellhounds at 22½, a third of Veteran's
  // half-size pack. Swarms of others are just Veteran's half. (Fired at phase 10, both grown by the
  // same minute's 5%s, minuteMore.)
  for (const [ev, few] of [[{ type: 'pack', enemy: 'wolf', count: 8 }, true], [{ type: 'pack', enemy: 'hellhound', count: 10 }, true], [{ type: 'pack', enemy: 'goblin', count: 18 }, false]]) {
    const n = {};
    for (const diff of ['hard', 'medium']) {
      const g = game({ diff });
      let k = 0;
      g.spawnEnemy = () => (k++, null);
      g.spawner.fire(ev, 10);
      n[diff] = k;
    }
    assert.equal(n.hard, Math.round(ev.count * ELITE.horde * minuteMore(10)));
    assert.equal(n.medium, Math.round(ev.count * VETERAN.horde * (few ? 1 / 3 : 1) * minuteMore(10)),`${ev.enemy}: ${n.medium} against ${n.hard}`);
    assert.ok(Math.abs(VETERAN.horde / ELITE.horde - 1 / 2) < 1e-9, 'Veteran\'s swarms, rings and packs half Elite\'s');
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

// The user (16 October 2026): "Veteran: monster health -70%".
test('on Veteran every monster has 70% less health than on Elite: the horde, champions, the thief, bosses and the crypts\' lords', () => {
  const tenth = (n, v, what) => assert.ok(Math.abs(n / v - 0.3) < 1e-9, `${what}: ${n} on Veteran, ${v} on Elite`);
  const hp = { hard: healths('hard'), medium: healths('medium') };
  for (const k of Object.keys(hp.hard)) tenth(hp.medium[k], hp.hard[k], k);
  assert.equal(hp.hard.floor, game({ mode: 'dungeon' }).world.guardian.maxHp, 'a floor\'s own guardian as counted');
  assert.equal(hp.hard.lord, 600 * HARDER, 'a lord on Elite: its own 600, and the last round\'s +20%');
  assert.ok(Math.abs(VETERAN.health / ELITE.health - 0.3) < 1e-12);
});

// The owner (20 October 2026): "difficulty is too easy. Increase monster health and damage by 20%."
test('the round of 20 October 2026: every monster on both difficulties has 20% more health and hits 20% harder', () => {
  const near = (a, b, what) => assert.ok(Math.abs(a / b - 1) < 1e-9, `${what}: ${a} against ${b}`);
  assert.equal(HARDER, 1.2);
  // On top of the rounds before it (difficulty.js TOUGHER, DEADLIER).
  near(ELITE.hp, 1.9 * 1.1 ** 3 * 1.2 * 1.1 ** 2 * 1.2, 'Elite\'s health');
  near(ELITE.dmg, 1.65 * 1.1 ** 2 * 1.2 * 1.1 * 1.2 * 1.1 ** 2 * 1.2, 'Elite\'s damage');
  near(VETERAN.hp, ELITE.hp * 0.3, 'Veteran\'s health: Elite\'s, 70% less');
  assert.equal(VETERAN.dmg, ELITE.dmg, 'Veteran\'s damage: Elite\'s (halved after armor: hurt)');
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
test('on Veteran 30% more monsters come from minute 9 of the night on, not before, and never on Elite', () => {
  // Veteran's horde is half Elite's (difficulty.js VETERAN_CROWD), so against Elite it is a half
  // until 9:00 and 1.3 halves after.
  const phaseAt = (secs) => (secs / 60) * 1.4; // the 15-minute night's clock
  const before = phaseAt(8 * 60 + 59), after = phaseAt(9 * 60 + 1);
  const vet = game({ diff: 'hard' }), normal = game({ diff: 'medium' });
  const ratio = (phase, a = normal, b = vet) => a.spawner.target(phase) / b.spawner.target(phase);
  assert.ok(Math.abs(ratio(phaseAt(30)) - 0.5) < 1e-9 && Math.abs(ratio(before) - 0.5) < 1e-9, 'half the horde until 9:00');
  for (const secs of [9 * 60 + 1, 11 * 60, 14 * 60 + 59]) {
    assert.ok(Math.abs(ratio(phaseAt(secs)) - 0.5 * 1.3) < 1e-9, `30% more at ${secs} s: ${ratio(phaseAt(secs))}`);
  }
  for (const phase of [before, after, 20]) {
    assert.ok(Math.abs(vet.spawner.target(phase) - targetCount(phase) * ELITE.spawn * minuteMore(phase)) < 1e-9, 'Elite as it was, but for the minute\'s growth');
  }
  // The timed swarms, rings and packs too.
  const pack = (g, phase) => asks(g, () => g.spawner.fire({ type: 'pack', enemy: 'goblin', count: 18 }, phase)).length;
  assert.equal(pack(normal, before), Math.round(18 * VETERAN.horde * minuteMore(before)));
  assert.equal(pack(vet, after), Math.round(18 * ELITE.horde * minuteMore(after)));
  assert.equal(pack(normal, after), Math.round(18 * VETERAN.horde * 1.3 * minuteMore(after)));
  // A Dungeon Run floor's clock maps onto the night's: the Infernal Depths are all past minute 9.
  const dn = game({ diff: 'medium', mode: 'dungeon' }), dv = game({ diff: 'hard', mode: 'dungeon' });
  assert.ok(Math.abs(ratio(5, dn, dv) - 0.5) < 1e-9, 'the first floor half Elite\'s');
  assert.ok(Math.abs(ratio(17, dn, dv) - 0.5 * 1.3) < 1e-9, 'the third 30% more');
  assert.equal(game({ diff: 'medium', mode: 'ranked' }).diff.late, null, 'Ranked is Elite');
});

// A Holy Relic purges the horde on screen, but bosses, crypt lords and champions only take a
// heavy blow. On Veteran they have 70% less health, so the blow is 70% lighter too: a flat 200
// would all but fell a crypt lord (216), there and in every crypt with a relic among its boxes.
test('a Holy Relic leaves a crypt lord standing, the same share of it gone on Veteran as on Elite', () => {
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
  assert.ok(share.hard > 0.25, `a heavy blow on Elite as before: ${share.hard}`);
  // (A blow lands as a whole number, so the shares differ by the rounding alone.)
  assert.ok(Math.abs(share.medium - share.hard) < 0.01, `the same share on Veteran: ${share.medium} against ${share.hard}`);
});

test('the gold a difficulty pays is the profile\'s alone, and its card says so', () => {
  for (const d of [VETERAN, ELITE]) {
    assert.equal(d.gold, undefined, `${d.name} keeps no gold of its own`);
    assert.ok(d.desc.endsWith(`Gold x${DIFF_GOLD[d.id]}.`), d.desc);
    const run = { mode: 's15', diff: d.id, victory: false, gold: 100 };
    assert.equal(runReward(run).collected, Math.round(100 * DIFF_GOLD[d.id]));
  }
});

// The user (16 October 2026): the general game speed 20% up, on the 10% it was; then (20 October
// 2026) "let the game be 15% faster". Then (21 October 2026): "the clock was never to have been
// sped up. It was always about just hero / monsters being faster. 15 minutes should be 15 minutes".
test('the night is 15:00 of real time; the hero and the monsters walk about 52% faster than drawn', () => {
  assert.ok(Math.abs(GAME_SPEED - 1.518) < 1e-9);
  assert.ok(Math.abs(GAME_SPEED / (1.1 * 1.2) - 1.15) < 1e-9, '15% faster than the 1.32 it was');
  // A real second of frames moves a run's clock on one second, whoever plays it.
  const g = game(), t0 = g.time;
  assert.equal(g.pace, 1, 'the clock keeps real time');
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  assert.ok(Math.abs(g.time - t0 - 1) < 1e-9, `${g.time - t0} s on the clock`);
  assert.equal(g.duration, 15 * 60, 'the 15-minute night is 15 minutes');
  assert.equal(fmtTime(HERO_UNLOCK_TIME), '05:00', 'the next hero at 5:00 of real time');
  // Only walking is faster: the hero's speed is his base times GAME_SPEED on Elite.
  assert.equal(g.move, GAME_SPEED);
  const p = g.player;
  assert.ok(Math.abs(p.moveSpeed - BASE_SPEED * p.speedMul * GAME_SPEED) < 1e-9, `the hero walks ${p.moveSpeed.toFixed(1)} px/s`);
});

// The owner (21 October 2026): "reduce the speed on normal by 20%" ("just the normal"): how fast
// the hero and the monsters move, the clock as it is.
test('on Veteran the hero and the monsters walk 20% slower than on Elite; Elite and Ranked at the game\'s speed', () => {
  assert.equal(moveFor('s15', 'hard'), GAME_SPEED);
  assert.equal(moveFor('dungeon', 'hard'), GAME_SPEED);
  assert.ok(Math.abs(moveFor('s15', 'medium') - GAME_SPEED * 0.8) < 1e-12);
  assert.ok(Math.abs(moveFor('dungeon', 'medium') - GAME_SPEED * 0.8) < 1e-12);
  assert.equal(moveFor('ranked', 'medium'), GAME_SPEED, 'Ranked is always Elite');
  const n = game({ diff: 'medium' }), v = game({ diff: 'hard' });
  assert.ok(Math.abs(n.move - GAME_SPEED * 0.8) < 1e-12 && v.move === GAME_SPEED, 'a run walks at its difficulty\'s speed');
  assert.ok(Math.abs(n.player.moveSpeed / v.player.moveSpeed - 0.8) < 1e-9, 'the same hero 20% slower on Veteran');
  assert.equal(n.pace, 1, 'a Veteran night keeps real time too');
  assert.equal(game({ mode: 'ranked', diff: 'medium' }).move, GAME_SPEED);
});

// The owner (20 October 2026): "the thing is even a bit too easy. Double the amount of monsters".
// Then again: "double the number of monsters on all difficulties". Then (21 October 2026): "Reduce
// the numbers of monsters on normal by 3 times what it is rn. Then veteran is double". Then, the
// same day: "Double the amount of monsters on all difficulties".
test('the horde is two thirds of those four times on Veteran and four thirds on Elite: the steady horde and the swarms, rings and packs', () => {
  assert.equal(CROWD, 4);
  assert.ok(Math.abs(VETERAN_CROWD - 2 / 3) < 1e-12 && Math.abs(ELITE_CROWD - 4 / 3) < 1e-12);
  const MORE = 1.1 * 1.1 * 1.2;
  for (const [d, share] of [[ELITE, 4 / 3], [VETERAN, 2 / 3]]) {
    assert.ok(Math.abs(d.spawn - 1.15 * MORE * 4 * share) < 1e-9, `${d.name}'s steady horde`);
    assert.ok(Math.abs(d.horde - MORE * 4 * share) < 1e-9, `${d.name}'s swarms, rings and packs`);
  }
});

// The owner (21 October 2026): "for every minute passed, increase the monster generation by 5%".
test('the horde grows by 5% of its first size every minute of the night: the steady horde and the timed swarms alike', () => {
  const phaseAt = (secs) => (secs / 60) * 1.4; // the 15-minute night's clock
  assert.equal(minuteMore(0), 1);
  assert.ok(Math.abs(minuteMore(phaseAt(10 * 60)) - 1.5) < 1e-9, 'half again at 10:00');
  assert.ok(Math.abs(minuteMore(phaseAt(15 * 60)) - 1.75) < 1e-9, '1.75 times at 15:00');
  const g = game({ diff: 'hard' });
  for (const secs of [0, 5 * 60, 10 * 60, 15 * 60]) {
    const ph = phaseAt(secs);
    assert.ok(Math.abs(g.spawner.target(ph) - targetCount(ph) * ELITE.spawn * minuteMore(ph)) < 1e-9, `the steady horde at ${secs} s`);
  }
  const pack = (phase) => asks(g, () => g.spawner.fire({ type: 'pack', enemy: 'goblin', count: 18 }, phase)).length;
  assert.equal(pack(phaseAt(10 * 60)), Math.round(18 * ELITE.horde * 1.5), 'a pack at 10:00 half again as big');
});

// "make it more wave like, the generation of monsters, like it is too constant", then "not full on
// waves, just occasionally ... base line, + wave every once in a while" (21 October 2026).
test('the steady horde keeps its size, and every so often a wave swells it for a while, up to 1.6 times', () => {
  assert.deepEqual(WAVE, { first: 45, every: 75, length: 15, peak: 0.6 });
  // The base line: before the first wave and between waves, exactly the horde's size.
  for (const t of [0, 20, 44.9, 45 + 15 + 0.1, 100, 119.9, 45 + 75 + 15 + 1, 300 - 1e-6]) assert.equal(waveAt(t), 1, `no wave at ${t} s`);
  // Never below it, at most 1.6 times it, at its height mid-wave.
  let hi = 0, lo = Infinity;
  for (let t = 0; t < 900; t += 0.05) {
    hi = Math.max(hi, waveAt(t));
    lo = Math.min(lo, waveAt(t));
  }
  assert.ok(lo === 1 && hi <= 1.6 + 1e-9 && hi > 1.599, `from ${lo} to ${hi}`);
  for (const t of [52.5, 127.5, 202.5]) assert.ok(Math.abs(waveAt(t) - 1.6) < 1e-9, `the height of a wave at ${t} s`);
  assert.ok(waveAt(48) > 1 && waveAt(48) < 1.6 && waveAt(57) > 1 && waveAt(57) < 1.6, 'rising and falling about it');
  // What the spawner keeps up at a time is the horde's size at that phase times the wave then.
  const g = game({ diff: 'hard' }), ph = 10;
  const kept = (t) => ((g.time = t), g.spawner.waveTarget(ph));
  const base = g.spawner.target(ph);
  assert.ok(Math.abs(kept(30) - base) < 1e-9, 'before the first wave');
  assert.ok(Math.abs(kept(52.5) - base * 1.6) < 1e-9, 'at the height of a wave');
  assert.ok(Math.abs(kept(90) - base) < 1e-9, 'between waves');
  // And the steady horde really fills up to it: with a fifth more than the base line alive, nothing
  // comes between waves, but a wave sends more.
  const fill = (t) => {
    const h = game({ diff: 'hard' }, 3);
    h.time = t;
    h.hostileCount = Math.ceil(h.spawner.target(h.phase) * 1.2);
    let n = 0;
    h.spawnEnemy = () => (n++, null);
    h.spawner.acc = 0;
    h.spawner.update(1 / 60);
    return n;
  };
  assert.equal(fill(90), 0, 'none between waves');
  assert.ok(fill(52.5) > 0, 'more in a wave');
});

// The owner (21 October 2026): "on normal, reduce the speed of monsters by 10%".
test('on Veteran every monster walks 10% slower than the same monster on a run at the monsters\' full pace; Elite unchanged', () => {
  assert.equal(VETERAN.foePace, 0.9);
  assert.ok(ELITE.foePace === undefined || ELITE.foePace === 1, 'Elite at full pace');
  for (const diff of ['medium', 'hard']) {
    for (const type of ['skeleton', 'bat', 'boneking']) {
      const step = (foePace) => {
        const g = game({ diff });
        if (foePace !== undefined) g.diff = { ...g.diff, foePace };
        g.enemies.length = 0;
        const p = g.player;
        // The same dice for both (a bat flutters at random).
        const oldRandom = Math.random;
        Math.random = mulberry32(5);
        try {
          const e = g.spawnEnemy(type, p.x + 200, p.y, { instant: true, aware: true });
          assert.ok(e, `${type} spawned`);
          const x0 = e.x, y0 = e.y;
          e.update(1 / 60);
          return Math.hypot(e.x - x0, e.y - y0);
        } finally {
          Math.random = oldRandom;
        }
      };
      const full = step(1), as = step();
      assert.ok(full > 0, `${type} walks`);
      const want = diff === 'medium' ? 0.9 : 1;
      assert.ok(Math.abs(as / full - want) < 1e-6, `${diff} ${type}: ${as} against ${full}`);
    }
  }
});

// The owner (20 October 2026): four classes of speed; bats and rats as fast as a Knight with no
// upgrades on Veteran; on a Nightmare the fastest 5% past a Knight with every rank of Swiftness.
test('the horde walks in four classes: the swift at the bare Knight’s pace, a Nightmare’s 5% past a fully swift Knight', async () => {
  const { hordePace, PACE_OF, NIGHTMARE_PACE } = await import('../public/js/game/enemies.js');
  const { ENEMIES } = await import('../public/js/data/enemies.js');
  const { HEROES } = await import('../public/js/data/heroes.js');
  const knight = 70 * HEROES.knight.stats.speed;
  assert.ok(Math.abs(hordePace('bat') - knight) < 1e-9 && hordePace('rat') === hordePace('bat'), 'bats and rats at the Knight’s pace');
  assert.ok(Math.abs(hordePace('bat') * NIGHTMARE_PACE - knight * 1.15 * 1.05) < 1e-9, 'a Nightmare’s 5% past three ranks of Swiftness');
  const order = ['bat', 'wolf', 'skeleton', 'zombie'].map((id) => hordePace(id));
  for (let i = 1; i < order.length; i++) assert.ok(order[i] < order[i - 1], 'each class slower than the last');
  assert.ok(Math.abs(hordePace('cultist') - hordePace('zombie') * 0.9) < 1e-9, 'the Cultist a tenth slower than its class');
  for (const [id, d] of Object.entries(ENEMIES)) {
    if (!(d.boss || d.prop || d.ai === 'flee' || d.ai === 'static' || !d.spd)) assert.ok(PACE_OF[id], `${id} has a class`);
  }
  for (const id of ['boneking', 'lich', 'thief']) assert.equal(hordePace(id), ENEMIES[id].spd);
  assert.equal(hordePace('skeletonarcher', { lord: true }), ENEMIES.skeletonarcher.spd);
  assert.ok(hordePace('thief') * ELITE.speed <= 0.8 * 70 + 1e-9, 'the thief a fifth slower than the slowest hero');
});

// The owner (23 October 2026): Veteran becomes Elite, Normal becomes Veteran, "and there's a new,
// easier mode called normal ... half as many monsters as we do right now ... running 30% slower".
test('Normal is Veteran with half the horde, everyone walking 30% slower', () => {
  assert.equal(game({ diff: 'easy' }).diff, NORMAL);
  assert.ok(Math.abs(NORMAL.spawn / VETERAN.spawn - 0.5) < 1e-12, 'half the steady horde');
  assert.ok(Math.abs(NORMAL.horde / VETERAN.horde - 0.5) < 1e-12, 'half the swarms, rings and packs');
  for (const k of ['hp', 'dmg', 'hurt', 'few', 'health', 'late', 'foePace', 'speed']) assert.equal(NORMAL[k], VETERAN[k], k);
  assert.ok(Math.abs(moveFor('s15', 'easy') - moveFor('s15', 'medium') * 0.7) < 1e-12);
  const n = game({ diff: 'easy' }), v = game({ diff: 'medium' });
  assert.ok(Math.abs(n.player.moveSpeed / v.player.moveSpeed - 0.7) < 1e-9, 'the same hero 30% slower');
  assert.equal(n.pace, 1, 'the clock in real time');
  assert.equal(moveFor('ranked', 'easy'), GAME_SPEED, 'Ranked is always Elite');
  assert.deepEqual([NORMAL.name, VETERAN.name, ELITE.name], ['Normal', 'Veteran', 'Elite']);
});
