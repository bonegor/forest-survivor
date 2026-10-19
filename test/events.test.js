// The night's events announced (events.js): each scripted swarm, ring and pack is
// told about two seconds before it comes, in its own words and from its side, and comes from that
// side; a record passed mid-run is told once, never in the first minute.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { EVENTS } from '../public/js/data/waves.js';
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
        if (g.spawner.eventIdx > EVENTS.indexOf(ev)) cameAt = g.time;
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
