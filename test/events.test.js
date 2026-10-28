// The night's events announced (events.js): each scripted swarm, ring and pack is
// told about two seconds before it comes, in its own words and from its side, and comes from that
// side; a record passed mid-run is told once, never in the first minute.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, DAWN_BURN } from '../public/js/game/game.js';
import { EVENTS, SWARM_BATCH, LAST_STAND, kindsBy, SURVIVAL_BOSSES } from '../public/js/data/waves.js';
import { minuteMore, RING } from '../public/js/game/spawner.js';
import { ELITE } from '../public/js/data/difficulty.js';
import { ENEMIES } from '../public/js/data/enemies.js';
import { WARN, sideWord, eventWords } from '../public/js/game/events.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

function game(fn, o = {}) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(o.seed ?? 31);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false, ...o });
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.update(1 / 60);
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// The night's events up to 15:00, each watched from 4 s before its time: when it was told, when it
// came, and where its monsters stood relative to the hero against the side it was told from.
test('every event of the night is told about 2 s before it comes, and comes from the side it was told', () => {
  const night = EVENTS.filter((e) => e.at <= 21);
  for (const ev of night) {
    game((g, p) => {
      const t = (ev.at / 1.4) * 60;
      g.setTime(t - 4 * g.pace);
      // Its place in the run's own list, every swarm a batch (data/waves.js batchEvents): its first.
      const idx = g.spawner.events.findIndex((e) => e.at === ev.at && e.type === ev.type && e.enemy === ev.enemy);
      for (const e of g.enemies) e.dead = true;
      let toldAt = null, cameAt = null, told = null;
      const titles = [], banner = g.banner.bind(g);
      g.banner = (title, ...rest) => {
        titles.push(title);
        return banner(title, ...rest);
      };
      const before = new Set();
      for (let f = 0; f < 6 * 60 && cameAt === null; f++) {
        for (const e of g.enemies) before.add(e);
        g.update(1 / 60);
        if (toldAt === null && g.warnings.length) {
          toldAt = g.time;
          told = g.warnings[0];
        }
        if (g.spawner.eventIdx > idx) cameAt = g.time;
      }
      assert.ok(toldAt !== null && cameAt !== null, `${ev.type} of ${ev.enemy}: told and came`);
      const lead = (cameAt - toldAt) / g.pace;
      assert.ok(lead >= WARN.lead - 0.15 && lead <= WARN.lead + 0.15, `${ev.type} of ${ev.enemy}: told ${lead.toFixed(2)} s before`);
      const [title] = eventWords(told.ev, told.from ? sideWord(told.from) : '');
      assert.ok(titles.includes(title), `its banner: ${title}`);
      if (ev.type === 'ring') return;
      // Where they came from: the newcomers' mean offset points the way it was told.
      const fresh = g.enemies.filter((e) => !before.has(e) && e.type === ev.enemy && !e.dead);
      assert.ok(fresh.length > 0, `${ev.enemy}s came`);
      const mx = fresh.reduce((s, e) => s + e.x - p.x, 0) / fresh.length, my = fresh.reduce((s, e) => s + e.y - p.y, 0) / fresh.length;
      const [fx, fy] = told.from;
      const cos = (mx * fx + my * fy) / (Math.hypot(mx, my) * Math.hypot(fx, fy));
      assert.ok(cos > 0.7, `${ev.type} of ${ev.enemy} came from the side it was told (cos ${cos.toFixed(2)})`);
    });
  }
});

test('the side words', () => {
  assert.equal(sideWord([0, 100]), 'south');
  assert.equal(sideWord([-100, 0]), 'west');
  assert.equal(sideWord([70, -70]), 'north-east');
  assert.deepEqual(eventWords({ type: 'swarm', enemy: 'imp' }, 'south'), ['Imps from the south!', '']);
  assert.deepEqual(eventWords({ type: 'ring', enemy: 'skeleton' }), ['The dead rise around you!', '']);
});

test('a record passed mid-run is told once each, never in the first minute', () =>
  game((g, p) => {
    g.spawner.update = () => {};
    const told = [], banner = g.banner.bind(g);
    g.banner = (title, ...rest) => {
      if (title.startsWith('NEW RECORD')) told.push(title);
      return banner(title, ...rest);
    };
    const said = () => [...told];
    g.kills = 50;
    g.update(1 / 60);
    assert.deepEqual(said(), [], 'not in the first minute');
    g.setTime(61);
    g.update(1 / 60);
    assert.deepEqual(said(), ['NEW RECORD · KILLS']);
    g.kills = 500;
    g.update(1 / 60);
    assert.equal(said().length, 1, 'once');
    p.level = 6;
    g.update(1 / 60);
    g.setTime(100);
    g.update(1 / 60);
    assert.deepEqual(said().sort(), ['NEW RECORD · KILLS', 'NEW RECORD · LEVEL', 'NEW RECORD · TIME'].sort());
  }, { records: { kills: 40, level: 5, time: 90 } }));

test('no record to beat (a fresh profile): nothing told', () =>
  game((g) => {
    g.spawner.update = () => {};
    g.kills = 999;
    g.setTime(200);
    g.update(1 / 60);
    assert.equal(g.banners.filter((b) => b.title.startsWith('NEW RECORD')).length, 0);
  }, { records: { kills: 0, level: 0, time: 0 } }));

test('every swarm comes as a batch of 2 to 5, each three times as big, 7 s apart, each told before it which of the batch it is', () => {
  const sizes = new Set();
  for (let k = 0; k < 40; k++) {
    game((g) => {
      const swarms = g.spawner.events.filter((e) => e.type === 'swarm');
      for (const ev of EVENTS.filter((e) => e.type === 'swarm')) {
        const batch = swarms.filter((e) => e.enemy === ev.enemy && e.at >= ev.at && e.at < ev.at + 1);
        sizes.add(batch.length);
        assert.ok(batch.length >= SWARM_BATCH.min && batch.length <= SWARM_BATCH.max);
        batch.forEach((e, i) => {
          assert.equal(e.count, ev.count * 3);
          assert.equal(e.batch, i);
          assert.equal(e.of, batch.length);
          // 7 real seconds apart on the 15-minute night's clock (1.4 phase a minute).
          assert.ok(Math.abs(e.at - (ev.at + (i * 7 * 1.4) / 60)) < 1e-9);
        });
      }
    }, { seed: k + 1 });
  }
  assert.deepEqual([...sizes].sort(), [2, 3, 4, 5], 'every size comes');
  // In play: a batch's swarms each told about 2 s before they come.
  game((g) => {
    const ev = EVENTS.find((e) => e.type === 'swarm');
    g.setTime((ev.at / 1.4) * 60 - 4 * g.pace);
    const n = g.spawner.events.filter((e) => e.type === 'swarm' && e.at >= ev.at && e.at < ev.at + 1).length;
    let told = 0, came = 0, last = g.spawner.eventIdx;
    const seen = new Set();
    for (let f = 0; f < (4 + n * 7) * 60; f++) {
      g.update(1 / 60);
      for (const w of g.warnings) {
        if (seen.has(w.ev)) continue;
        seen.add(w.ev);
        told++;
        assert.ok(g.banners.some((b) => b.sub.endsWith(`${w.ev.batch + 1} of ${n}`)), 'its banner says which of the batch it is');
      }
      if (g.spawner.eventIdx > last) { came += g.spawner.eventIdx - last; last = g.spawner.eventIdx; }
    }
    assert.ok(told >= n && came >= n, `${n} swarms told (${told}) and come (${came})`);
  });
});

// The 27 October 2026 review (D14): the imp batch landed on the Butcher's heels (9:39) and the Wraith
// ring nine seconds before the Lich (12:51). They moved; the horde still comes at its rate under a
// boss (the owner's of 26 October 2026). The Bone King's bats at 5:00 are the closest, 30 s after him.
test('no timed event of the night comes less than 30 s from a night boss\'s arrival', () => {
  for (let seed = 1; seed <= 5; seed++) {
    game((g) => {
      for (const e of g.spawner.events.filter((x) => x.at <= 21)) {
        for (const b of SURVIVAL_BOSSES.s15) {
          const secs = (e.at / 1.4) * 60;
          assert.ok(Math.abs(secs - b.at) >= 30 - 1e-9, `${e.type} of ${e.enemy} at ${secs.toFixed(0)} s, ${b.id} at ${b.at} s`);
        }
      }
    }, { seed });
  }
});

// The 27 October 2026 review (D15): after 11:00 the night brought nothing new, and dawn came flat.
test('Survival\'s night has its last stand at 14:00; Ranked and the Dungeon don\'t', () => {
  game((g) => {
    const stands = g.spawner.events.filter((e) => e.type === 'stand');
    assert.equal(stands.length, 1);
    assert.equal(stands[0].at, LAST_STAND.at);
    assert.ok(Math.abs((LAST_STAND.at / 1.4) * 60 - 14 * 60) < 1e-9, 'at 14:00');
  });
  for (const mode of ['ranked', 'dungeon']) game((g) => assert.equal(g.spawner.events.filter((e) => e.type === 'stand').length, 0, mode), { mode });
});

test('the last stand: every kind of the night in a ring, and a pack of champions, told in its own words', () => {
  game((g) => {
    const sp = g.spawner;
    g.setTime((LAST_STAND.at / 1.4) * 60 - 4 * g.pace);
    for (const e of g.enemies) e.dead = true;
    // Only the event comes meanwhile: no steady horde, jolt, champion or thief.
    sp.acc = Infinity;
    sp.joltT = Infinity;
    sp.eliteT = Infinity;
    sp.thiefT = Infinity;
    const titles = [], subs = [], banner = g.banner.bind(g);
    g.banner = (title, sub, ...rest) => {
      titles.push(title);
      subs.push(sub);
      return banner(title, sub, ...rest);
    };
    const asked = [], spawn = g.spawnEnemy.bind(g);
    g.spawnEnemy = (type, x, y, o = {}) => {
      if (!ENEMIES[type].prop) asked.push({ type, elite: !!o.elite });
      return spawn(type, x, y, o);
    };
    const idx = sp.events.findIndex((e) => e.type === 'stand');
    let warned = false;
    for (let f = 0; f < 6 * 60 && sp.eventIdx <= idx; f++) {
      g.update(1 / 60);
      if (g.warnings.some((w) => w.ev.type === 'stand')) warned = true;
    }
    assert.ok(sp.eventIdx > idx, 'it came');
    assert.ok(titles.includes('The last stand!'), 'in its own words');
    assert.ok(warned, 'told before, its ring on the ground (Hud.drawRingWarnings)');
    // On Elite (few 1) every kind comes, the shooters and chargers too.
    const ring = asked.filter((a) => !a.elite);
    assert.deepEqual(new Set(ring.map((a) => a.type)), new Set(kindsBy(14)), 'every kind the night has brought');
    assert.equal(kindsBy(14).length, 15);
    assert.equal(ring.length, Math.round(LAST_STAND.count * ELITE.horde * minuteMore(LAST_STAND.at)) * RING.more, 'as many as a ring of its count');
    assert.equal(asked.filter((a) => a.elite).length, LAST_STAND.champions, 'and its champions');
    assert.ok(!subs.some((s) => s && s.endsWith('champion')), 'without their names\' banners');
  });
});

test('the night\'s last batch is in before 14:50, none of it lost to dawn', () => {
  for (let seed = 1; seed <= 20; seed++) {
    game((g) => {
      for (const e of g.spawner.events) if (e.at <= 21) assert.ok(e.at < (14 + 50 / 60) * 1.4, `${e.type} of ${e.enemy} at phase ${e.at}`);
    }, { seed });
  }
});

test('at dawn a boss still standing burns away in sight, slowly: no kill, no loot', () => {
  game((g, p) => {
    const subs = [], banner = g.banner.bind(g);
    g.banner = (title, sub, ...rest) => {
      subs.push(sub);
      return banner(title, sub, ...rest);
    };
    const lich = g.spawnBoss('lich', p.x + 80, p.y, { sleeping: true });
    g.setTime(g.duration - 0.01);
    for (let f = 0; f < 60 && g.state !== 'dawn'; f++) g.update(1 / 60);
    assert.equal(g.state, 'dawn');
    assert.ok(subs.includes('The Lich burns in the sunrise'), 'the dawn says so');
    const kills = g.kills, pickups = g.pickups.length;
    for (let f = 0; f < 60; f++) g.update(1 / 60);
    assert.ok(!lich.dead && lich.alpha < 1, `still burning after a second (alpha ${lich.alpha})`);
    for (let f = 0; f < (DAWN_BURN.boss - 1 + 0.3) * 60; f++) g.update(1 / 60);
    assert.ok(lich.dead, 'burned away');
    assert.equal(g.kills, kills, 'not a kill');
    assert.ok(g.pickups.length <= pickups, 'and nothing dropped');
  });
});
