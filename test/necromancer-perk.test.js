// The Necromancer's Grave Pact: his minions last 30% longer (his stats.summonDur, 1.3), his
// skeletons and his Army of the Dead alike, on top of the Hourglass and the Armory's Endurance.
// His other effects (fire pools, the Aegis) last no longer than anyone's (found in review,
// 16 October 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { Game } = await mod('public/js/game/game.js');
const { Pool } = await mod('public/js/game/effects.js');
const { WEAPONS } = await mod('public/js/data/weapons.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// A hero who can't die, standing still, with no spawner.
function game(hero, fn, meta = P.metaBonuses(P.defaultProfile())) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(3);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta, settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a}, not ${b}`);
// The first skeleton his Raise Dead calls up, alone among his weapons.
function firstSkeleton(g, p) {
  p.weapons = p.weapons.filter((w) => w.id === 'raise');
  g.minions.length = 0;
  for (let i = 0; i < 600 && !g.minions.length; i++) g.update(1 / 60);
  assert.ok(g.minions.length > 0, 'he raised one');
  return g.minions[0];
}
// The first pool of burning oil his Firebomb Flask leaves, alone among his weapons.
function firstPool(g, p) {
  const w = g.addWeapon('flask');
  p.weapons = [w];
  g.spawnEnemy('skeleton', p.x + 60, p.y, { instant: true, hpMul: 1e6 });
  for (let i = 0; i < 600; i++) {
    g.update(1 / 60);
    const pool = g.effects.find((fx) => fx instanceof Pool && fx.w === w);
    if (pool) return pool;
  }
  assert.fail('no pool');
}

test('Grave Pact is a minions-only stat: the Necromancer’s effect duration stays 1', () => {
  game('necromancer', (g, p) => {
    near(p.summonDur, 1.3, 'his minions');
    near(p.duration, 1, 'his other effects');
  });
  game('knight', (g, p) => {
    near(p.summonDur, 1, 'the Knight’s minions');
    near(p.duration, 1, 'the Knight’s effects');
  });
});

test('a skeleton he raises lasts 9.1 s, not the base 7', () =>
  game('necromancer', (g, p) => {
    near(WEAPONS.raise.base.dur, 7, 'base');
    near(firstSkeleton(g, p).maxLife, 9.1, 'the skeleton’s lifetime');
  }));

test('his Army of the Dead stands 30% longer too', () =>
  game('necromancer', (g, p) => {
    g.update(1 / 60);
    g.minions.length = 0;
    g.startUlt('deadrise');
    const knights = g.minions.filter((m) => m.ult);
    assert.ok(knights.length > 0, 'the knights rose');
    for (const m of knights) near(m.maxLife, 11 * 1.3, 'a death knight’s lifetime');
  }));

test('his fire pools burn no longer than the Knight’s', () => {
  const base = WEAPONS.flask.base.dur;
  game('necromancer', (g, p) => near(firstPool(g, p).dur, base, 'the Necromancer’s pool'));
  game('knight', (g, p) => near(firstPool(g, p).dur, base, 'the Knight’s pool'));
});

test('the Hourglass and Endurance still stack on his minions, and on his pools alone', () => {
  const prof = P.defaultProfile();
  prof.up = { ...(prof.up || {}), endurance: 5 };
  const meta = P.metaBonuses(prof);
  near(meta.duration, 1.3, 'Endurance 5');
  const more = 1.3 * 1.24; // Endurance 5 and two Hourglasses
  game('necromancer', (g, p) => {
    p.passives.set('duration', 2);
    p.recompute();
    near(p.duration, more, 'his effects');
    near(firstSkeleton(g, p).maxLife, 7 * 1.3 * more, 'a skeleton');
  }, meta);
  game('necromancer', (g, p) => {
    p.passives.set('duration', 2);
    p.recompute();
    near(firstPool(g, p).dur, WEAPONS.flask.base.dur * more, 'a pool');
  }, meta);
});
