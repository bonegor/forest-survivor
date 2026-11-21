// The map bosses' own (G3 of the 21 November 2026 gameplay review; game/boss-mechanics.js): beside
// his kit each map's last boss brings a thing of his map's, warned before it lands: Neferkhet's
// quicksand, Hrimgar's ice, Sylvaine's briars (and her daze in a loop of the Fae Thread), Belzakor's
// burning fault.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Telegraph } from '../public/js/game/effects.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';
import { ENEMIES } from '../public/js/data/enemies.js';
import { MECH, runMech, daze, bossPatchAt } from '../public/js/game/boss-mechanics.js';
import { SURFACE } from '../public/js/game/topology/terrain.js';

function fight(map, boss, fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(13);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'knight', mode: 's15', map, meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    const p = g.player;
    const e = g.spawnEnemy(boss, p.x + 140, p.y, { instant: true, always: true });
    e.aware = true;
    return fn(g, p, e);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}
// Its next mechanic, now, and the warnings it gives.
const cast = (g, e) => {
  const before = g.effects.filter((f) => f instanceof Telegraph).length;
  e.data.mechT = 0;
  runMech(e, 1 / 60);
  return g.effects.filter((f) => f instanceof Telegraph).slice(before);
};
const wait = (g, s) => { for (let i = 0; i < Math.ceil(s * 60); i++) g.update(1 / 60); };

test("each map's last boss has a mechanic of his map's own, the Darkwood's none", () => {
  assert.deepEqual(['pharaoh', 'frostgiant', 'thornqueen', 'pitlord'].map((id) => ENEMIES[id].mech), ['sands', 'rime', 'briars', 'fault']);
  for (const id of ['boneking', 'butcher', 'lich', 'demonlord']) assert.equal(ENEMIES[id].mech, undefined, id);
  for (const m of Object.values(MECH)) assert.ok(m.wind >= 1 && m.every[1] <= m.every[0], 'warned a second at least, and oftener in his second phase');
});

test("Neferkhet's sands open under the hero, warned, and slow him as the Sunscorch's quicksand", () => fight('desert', 'pharaoh', (g, p, e) => {
  const warned = cast(g, e);
  assert.equal(warned.length, MECH.sands.n);
  assert.ok(warned.some((t) => Math.hypot(t.o.x - p.x, t.o.y - p.y) < 1), 'one right under him');
  assert.equal(g.bossPatches.length, 0, 'nothing until the warning has run');
  p.devGod = true;
  wait(g, MECH.sands.wind + 0.05);
  assert.equal(g.bossPatches.length, MECH.sands.n);
  const t = warned.find((w) => Math.hypot(w.o.x - p.x, w.o.y - p.y) < 1);
  p.x = t.o.x;
  p.y = t.o.y;
  assert.equal(bossPatchAt(g, p.x, p.y).surface, SURFACE.QUICKSAND);
  p.groundUnder(g, false, 1 / 60);
  assert.ok(p.wade > 0.9, 'he wades in it');
  wait(g, MECH.sands.last);
  assert.equal(g.bossPatches.length, 0, 'and it is gone in its time');
}));

test("Hrimgar's stamp blasts where the hero stood and leaves ice he slides on", () => fight('frozen', 'frostgiant', (g, p, e) => {
  p.devGod = true;
  const [t] = cast(g, e);
  assert.ok(t && t.o.r === MECH.rime.R);
  wait(g, MECH.rime.wind + 0.05);
  assert.equal(g.bossPatches.length, 1);
  p.x = t.o.x;
  p.y = t.o.y;
  p.groundUnder(g, false, 1 / 60);
  assert.ok(p.onIce || p.slide, 'on the ice');
}));

test("Sylvaine's briars hurt the hero passing through; a loop of the Fae Thread round her dazes her", () => fight('meadow', 'thornqueen', (g, p, e) => {
  const lines = cast(g, e);
  assert.equal(lines.length, MECH.briars.n);
  assert.ok(lines.every((t) => t.o.shape === 'line'));
  wait(g, MECH.briars.wind + 0.05);
  const hurt = [];
  p.hurt = (amount) => hurt.push(amount);
  const l = lines[0].o;
  p.x = l.x + Math.cos(l.ang) * l.len / 2;
  p.y = l.y + Math.sin(l.ang) * l.len / 2;
  g.update(1 / 60);
  assert.ok(hurt.length >= 1, 'the thorns bite');
  daze(e);
  assert.equal(e.data.dazedT, MECH.briars.daze);
  const shots = g.eshots.length;
  assert.deepEqual(e.ai(e, 0.5), [0, 0, 0], 'dazed, she stands');
  assert.equal(g.eshots.length, shots, 'and casts nothing');
  assert.ok(e.data.dazedT < MECH.briars.daze);
}));

test("Belzakor's fault cracks along a line through the hero and burns him while he stands in it", () => fight('hell', 'pitlord', (g, p, e) => {
  const [t] = cast(g, e);
  assert.equal(t.o.shape, 'line');
  const mid = { x: t.o.x + Math.cos(t.o.ang) * t.o.len / 2, y: t.o.y + Math.sin(t.o.ang) * t.o.len / 2 };
  assert.ok(Math.hypot(mid.x - p.x, mid.y - p.y) < 1, 'through him');
  wait(g, MECH.fault.wind + 0.05);
  const hurt = [];
  p.hurt = (amount) => hurt.push(amount);
  p.x = mid.x;
  p.y = mid.y;
  for (let i = 0; i < 70; i++) g.update(1 / 60);
  assert.ok(hurt.length >= 2, 'burnt every half second');
}));
