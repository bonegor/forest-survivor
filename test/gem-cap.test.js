// At most 380 soul gems lie about. Past that, a new gem takes over the XP of the one lying farthest
// from the hero, so the XP comes to where he fights. It used to pile into the oldest gem, minutes
// behind him in the forest, and levels froze for minutes (review, 16 October 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { Driver } = await mod('public/js/bots/driver.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

const liveGems = (g) => g.pickups.filter((pk) => pk.kind === 'gem' && !pk.dead);
const sum = (gems) => gems.reduce((s, pk) => s + pk.value, 0);
// The gem sizes of pickups.js: gold from 100 XP, red from 25, green from 5.
const rankOf = (v) => (v >= 100 ? 3 : v >= 25 ? 2 : v >= 5 ? 1 : 0);

// A seeded run, on Normal unless o.diff says ('hard', Veteran: a Nightmare needs it); `xp` counts
// what the gems dropped and what the hero picked up.
function play(o, fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed);
  try {
    const g = new Game({ hero: o.hero, mode: 's15', diff: o.diff || 'medium', nightmare: !!o.nightmare, meta: P.metaBonuses(P.sanitizeProfile({ up: o.up || {} })), settings: { numbers: false }, crypts: false });
    const xp = { dropped: 0, collected: 0 };
    const drop = g.dropGem, add = g.player.addXp;
    g.dropGem = function (x, y, v) {
      xp.dropped += v;
      return drop.call(this, x, y, v);
    };
    g.player.addXp = function (v) {
      xp.collected += v;
      return add.call(this, v);
    };
    const d = o.bot ? new Driver(g, { bot: o.bot, rng: mulberry32(Math.imul(o.seed, 0x9e3779b1) ^ 0x5bd1e995) }) : null;
    return fn(g, g.player, xp, d);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

test("past the cap, the farthest gem's XP drops where the hero fights", () =>
  play({ hero: 'knight', seed: 3 }, (g, p, xp) => {
    g.spawner.update = () => {};
    p.devGod = true;
    p.weapons.length = 0;
    g.pickups.length = 0;
    // 400 one-XP gems in a row 1500 px and more east of him, each new one farther out.
    for (let i = 0; i < 400; i++) g.dropGem(p.x + 1500 + i * 4, p.y, 1);
    let gems = liveGems(g);
    assert.equal(gems.length, 380, 'no more than 380 lie about');
    assert.equal(sum(gems), 400, 'and not one XP is lost');
    const dist = (pk) => Math.hypot(pk.x - p.x, pk.y - p.y);
    const far = gems.reduce((a, b) => (dist(b) > dist(a) ? b : a));
    assert.ok(far.value > 1, 'the farthest has taken over the XP of those beyond it');
    // A skeleton slain at his side.
    const e = g.spawnEnemy('skeleton', p.x + 20, p.y, { instant: true });
    g.killEnemy(e);
    gems = liveGems(g);
    assert.equal(gems.length, 380);
    assert.ok(!gems.includes(far), 'the farthest gem is gone');
    const near = gems.filter((pk) => dist(pk) < 80);
    assert.equal(near.length, 1, 'one gem by the hero');
    const [gem] = near;
    assert.equal(gem.value, far.value + e.xp, 'holding its XP and the kill’s');
    assert.equal(gem.rank, rankOf(gem.value), 'shown as the gem its XP makes it');
    assert.equal(sum(gems), 400 + e.xp);
    // His magnet takes it as before...
    for (let i = 0; i < 60; i++) g.update(1 / 60);
    assert.ok(gem.dead && xp.collected === gem.value, `picked up (${xp.collected} XP)`);
    // ...and a Scroll of Gathering still brings in every gem, however far.
    g.magnetAll = 2.5;
    for (let i = 0; i < 8 * 60; i++) g.update(1 / 60);
    assert.equal(liveGems(g).length, 0, 'every gem gathered');
    assert.equal(xp.collected, 400 + e.xp, 'and with them all the XP');
  }));

// Two seeded bot nights past the cap, four minutes of a Nightmare each (the cap is reached from
// about 2:15 to 3:15, the monsters walking at the game's speed): the gems' invariants hold, whatever
// the balance. The hero can't fall (devGod), so only the gems are on trial.
test('four minutes of a Nightmare past the cap: no XP lost, never over 380 gems lying, no gem hoarding', () => {
  for (const o of [{ hero: 'knight', bot: 'autopilot', seed: 2 }, { hero: 'necromancer', bot: 'gems', seed: 1 }]) {
    // The Armory full, so the hero kills fast enough on Veteran to fill the ground with gems.
    const up = Object.fromEntries(P.UPGRADES.map((u) => [u.id, u.max]));
    play({ ...o, diff: 'hard', nightmare: true, up }, (g, p, xp, d) => {
      assert.equal(g.nightmare, true, 'a Nightmare (Veteran only)');
      p.devGod = true;
      let folds = 0, most = 0, richest = 0;
      const drop = g.dropGem;
      g.dropGem = function (x, y, v) {
        if (liveGems(this).length >= 380) folds++;
        return drop.call(this, x, y, v);
      };
      for (let t = 1; t <= 240; t++) {
        d.run(t - g.time);
        const gems = liveGems(g);
        most = Math.max(most, gems.filter((pk) => !pk.pulled).length);
        for (const pk of gems) richest = Math.max(richest, pk.value);
      }
      assert.ok(folds > 0, `${o.hero}: the cap was reached`);
      assert.ok(most <= 380, `${o.hero}: at most 380 gems lay about unpulled (${most})`);
      assert.ok(Math.abs(xp.collected + sum(liveGems(g)) - xp.dropped) < 1e-6 * xp.dropped, `${o.hero}: no XP is lost: picked up or still lying about`);
      // The oldest gem used to grow past 1 000 XP while he fought elsewhere.
      assert.ok(richest <= 300, `${o.hero}: the richest gem held ${richest} XP`);
    });
  }
});
