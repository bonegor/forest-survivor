// The fury orb's charge (FURY in public/js/game/player.js). The owner, 16 October 2026: the
// ultimate "should not be permanently ready, pressing it should be a decision", and fury orbs from
// boxes stay a separate, generous source. A kill of the horde is worth less the faster the hero
// kills; blows on a boss, a lord or a champion charge it by the share of its health they take;
// the hero's own wounds charge it by the share of his health they take; an orb gives what it gave.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { FURY } = await mod('public/js/game/player.js');
const { HEROES } = await mod('public/js/data/heroes.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// A Knight on Normal, standing still, with no spawner: only what a test puts there.
function game(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(3);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', diff: 'medium', meta: P.metaBonuses(P.defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.spawner.update = () => {};
    g.update(1 / 60); // the first frame builds what a blow looks up (the grid)
    g.player.fury = 0;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const near = (got, want, eps, what) => assert.ok(Math.abs(got - want) <= eps, `${what}: ${got} vs ${want}`);
const bat = { boss: false, lord: false, elite: false };

test('a kill of the horde is worth less the faster the hero kills', () => {
  game((g, p) => {
    // At a given pace, kills a minute: what the next kill gives.
    const at = (kpm) => {
      p.recentKills = (kpm * FURY.window) / 60;
      p.fury = 0;
      p.furyKill(bat);
      return p.fury;
    };
    near(at(0), 0.75, 1e-9, 'a lone kill, as it always was');
    near(at(40), 0.375, 1e-9, 'at 40 kills a minute, half');
    near(at(400), 0.75 / 11, 1e-9, 'at 400 (the first minutes), an eleventh');
    near(at(4000), 0.75 / 101, 1e-9, 'at 4000 (the late night), a hundred-and-first');
    assert.ok(at(0) > at(40) && at(40) > at(400) && at(400) > at(4000), 'always less, the faster');
    // The kills of a minute, at a steady pace, fill no more than kill × pace (30) of the orb.
    for (const kpm of [400, 1000, 5000]) {
      p.recentKills = (kpm * FURY.window) / 60;
      let got = 0;
      for (let i = 0; i < kpm; i++) {
        p.fury = 0;
        p.furyKill(bat);
        got += p.fury;
        p.recentKills *= Math.exp(-60 / kpm / FURY.window); // what update() does between kills
      }
      assert.ok(got > 25 && got < FURY.kill * FURY.pace, `${kpm} kills a minute: ${got.toFixed(1)} of the orb`);
    }
    // The pace fades with time.
    p.recentKills = 10;
    p.update(FURY.window);
    near(p.recentKills, 10 / Math.E, 1e-9, 'a window on, a kill counts a third');
    // Bosses, lords and champions give what they gave, however fast the horde falls.
    p.recentKills = 1000;
    for (const [e, want] of [[{ boss: true }, 35], [{ lord: true, elite: true }, 25], [{ elite: true }, 8]]) {
      p.fury = 0;
      p.furyKill(e);
      assert.equal(p.fury, want);
    }
  });
});

test('a boss struck down to half its health gives about half an orb; the ultimate\'s blows give none', () => {
  game((g, p) => {
    const e = g.spawnEnemy('boneking', p.x + 80, p.y, { instant: true });
    const full = e.maxHp;
    while (e.hp > full / 2) g.hitEnemy(e, full / 40 / p.might);
    const took = (full - e.hp) / full;
    assert.ok(took >= 0.5 && took < 0.56, `took ${took}`);
    near(p.fury, 100 * took, 0.5, 'its share of a full orb');
    near(p.fury, 50, 6, 'about half an orb');
    const was = p.fury;
    g.hitEnemy(e, full / 40 / p.might, { ult: true });
    assert.equal(p.fury, was, 'the ultimate\'s own blow');
    // A champion: FURY.hit.champion over its whole health. The blow that fells it counts only
    // what health it had, then the kill its own.
    p.fury = 0;
    const c = g.spawnEnemy('skeleton', p.x - 80, p.y, { instant: true, elite: true });
    g.hitEnemy(c, c.maxHp * 10);
    near(p.fury, FURY.hit.champion + FURY.champion, 1e-6, 'a champion felled at a blow');
    // The horde's blows give nothing; its kills give their share.
    p.fury = 0;
    p.recentKills = 0;
    const s = g.spawnEnemy('skeleton', p.x, p.y + 80, { instant: true, hpMul: 100 });
    g.hitEnemy(s, 1);
    assert.equal(p.fury, 0);
  });
});

test('the hero losing half his health gets two fifths of the orb; nothing under god mode', () => {
  game((g, p) => {
    p.armor = 0;
    const raw = p.maxHp / 2 / g.diff.dmg / g.diff.hurt; // what lands as half his health on Normal
    const dmg = p.hurt(raw);
    near(dmg, p.maxHp / 2, 1, 'half his health');
    near(p.fury, (FURY.hurt * dmg) / p.maxHp, 1e-9, 'its share');
    near(p.fury, 40, 0.5, 'two fifths');
    p.invuln = 0;
    p.fury = 0;
    p.hurt(raw / 2);
    near(p.fury, 20, 0.5, 'a quarter of his health: a fifth');
    // God mode (the developer panel, the perf tool): no blow lands, no fury.
    p.invuln = 0;
    p.fury = 0;
    p.devGod = true;
    assert.equal(p.hurt(raw), 0);
    assert.equal(p.fury, 0);
  });
});

test('a fury orb still gives 40, and the orb never holds more than 100', () => {
  game((g, p) => {
    p.fury = 10;
    g.addPickup('fury', p.x, p.y).collect();
    assert.equal(p.fury, 50, 'an orb: 40');
    g.addPickup('fury', p.x, p.y).collect();
    g.addPickup('fury', p.x, p.y).collect();
    assert.equal(p.fury, 100, 'full, not 130');
    p.furyKill({ boss: true });
    p.furyKill(bat);
    const boss = g.spawnEnemy('boneking', p.x + 80, p.y, { instant: true });
    g.hitEnemy(boss, boss.maxHp / 2);
    p.armor = 0;
    p.hurt(p.maxHp * 0.9 / g.diff.dmg / g.diff.hurt);
    assert.equal(p.fury, 100, 'full stays full');
  });
});

// Every hero's ultimate at a boss standing beside him, a boss too strong to fall: its blows take
// their share of his health and charge nothing (Shadow Dance's blades are no weapon's: noFury).
test("no hero's ultimate charges the orb by its blows on a boss", () => {
  for (const [hero, h] of Object.entries(HEROES)) {
    game((g, p) => {
      p.devGod = true;
      for (const w of p.weapons) w.update = () => {};
      const boss = g.spawnBoss('butcher', p.x + 40, p.y);
      boss.update = () => true;
      boss.maxHp = boss.hp = boss.maxHp * 20;
      g.startUlt(h.ult);
      for (let i = 0; i < 4 * 60; i++) g.update(1 / 60);
      assert.ok(boss.hp < boss.maxHp && !boss.dead, `${hero}: ${h.ultName} strikes the boss`);
      assert.equal(p.fury, 0, `${hero}: ${h.ultName} charges nothing`);
    }, { hero });
  }
});

// The owner's rule: the horde drops its gems, the odd coin and fury orbs. However fast it falls,
// its fury orb's chance never thins below FURY.orbFloor of a lone kill's.
test("the horde still drops the odd fury orb however fast it falls, rarer than a lone kill's", () => {
  game((g, p) => {
    p.luck = 1;
    // Whether a kill whose loot roll comes up r drops a fury orb, at a pace of so many kills.
    const orbAt = (recentKills, r) => {
      g.pickups.length = 0;
      p.recentKills = recentKills;
      const e = g.spawnEnemy('skeleton', p.x + 60, p.y, { instant: true });
      const random = Math.random;
      Math.random = () => r;
      try {
        g.killEnemy(e);
      } finally {
        Math.random = random;
      }
      return g.pickups.some((pk) => pk.kind === 'fury');
    };
    const fast = (4000 * FURY.window) / 60; // 4000 kills a minute
    const lone = 0.014 + FURY.hordeOrb * 0.9, floor = 0.014 + FURY.hordeOrb * FURY.orbFloor * 0.9;
    assert.ok(orbAt(0, lone), 'a lone kill: its orb');
    assert.ok(!orbAt(fast, lone), 'at 4000 kills a minute, rarer');
    assert.ok(orbAt(fast, floor), 'but never gone');
    assert.ok(!orbAt(fast, 0.014 + FURY.hordeOrb * FURY.orbFloor * 1.1), 'and no likelier than the floor');
  });
});
