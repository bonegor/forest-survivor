import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
await mod('tools/headless.mjs');
const {Game, PROP_LOOT} = await mod('public/js/game/game.js');
const {mulberry32} = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// Breaks n props with the hero's luck set to `luck`; counts what they leave by kind.
function breakProps(luck, n) {
  const oldRandom = Math.random;
  Math.random = mulberry32(5);
  try {
    const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
    g.player.luck = luck;
    const counts = {};
    for (let i = 0; i < n; i++) {
      g.pickups.length = 0;
      g.breakProp({x: g.player.x + 40, y: g.player.y, type: 'barrel'});
      const kinds = new Set(g.pickups.map(pk => pk.kind));
      for (const k of kinds) counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  } finally {
    Math.random = oldRandom;
  }
}

test('more luck makes every treasure from props likelier, never rarer', () => {
  const n = 20000, base = breakProps(1, n), lucky = breakProps(2.5, n);
  for (const kind of PROP_LOOT.filter(d => d.lucky).map(d => d.kind)) {
    assert.ok(base[kind] > 0, kind + ' drops at all');
    assert.ok(lucky[kind] > base[kind] * 1.5, `${kind}: ${base[kind]} at luck 1, ${lucky[kind]} at luck 2.5`);
  }
});

test('at plain luck props drop what they always did', () => {
  const n = 20000, c = breakProps(1, n);
  const share = kind => PROP_LOOT.find(d => d.kind === kind).w;
  for (const kind of ['potion', 'magnet', 'relic', 'elixir', 'goldpile']) {
    assert.ok(Math.abs(c[kind] / n - share(kind)) < 0.01, `${kind}: ${(c[kind] / n).toFixed(3)} vs ${share(kind)}`);
  }
  assert.ok(Math.abs(PROP_LOOT.reduce((s, d) => s + d.w, 0) - 1) < 1e-9, 'the weights are the odds at luck 1');
});

test('a legendary power counts once, however many pieces worn carry it', async () => {
  const I = await mod('public/js/shared/items.js');
  const legend = (slot, power) => ({slot, rarity: I.LEGENDARY, stats: {}, power, seed: 1});
  const one = I.gearBonuses({ring: legend('ring', 'undying')});
  const all = I.gearBonuses(Object.fromEntries(I.SLOTS.map(s => [s, legend(s, 'undying')])));
  assert.equal(one.revival, 1);
  assert.equal(all.revival, 1, 'six Undying pieces are still one revive');
  const mixed = I.gearBonuses({ring: legend('ring', 'echo'), helm: legend('helm', 'echo'), boots: legend('boots', 'wrath')});
  assert.equal(mixed.amount, 1);
  assert.ok(Math.abs(mixed.critMult - 0.4) < 1e-9);
  assert.ok(I.powerWorn({ring: legend('ring', 'echo')}, 'echo', 'helm'));
  assert.ok(!I.powerWorn({ring: legend('ring', 'echo')}, 'echo', 'ring'), 'not when it is the piece being replaced');
});

test('a level-up always offers a full choice, filled with the Blessing, a heal and gold', async () => {
  const {BASE_WEAPONS, MAX_WEAPON_LEVEL} = await mod('public/js/data/weapons.js');
  const {PASSIVES, PASSIVE_IDS} = await mod('public/js/data/passives.js');
  const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
  const p = g.player;
  for (const id of BASE_WEAPONS) if (p.weapons.length < 6 && !g.ownsWeapon(id)) g.addWeapon(id, MAX_WEAPON_LEVEL);
  for (const w of p.weapons) { w.level = MAX_WEAPON_LEVEL; w.recompute(); }
  for (const id of PASSIVE_IDS.slice(0, 6)) g.addPassive(id, PASSIVES[id].max);
  p.weapons[0].level = MAX_WEAPON_LEVEL - 1;
  const cards = g.levelChoices(3);
  assert.deepEqual(cards.map(c => c.type), ['weapon', 'bless', 'heal'], 'one upgrade left, and two to fill');
  p.weapons[0].level = MAX_WEAPON_LEVEL;
  assert.deepEqual(g.levelChoices(3).map(c => c.type), ['bless', 'heal', 'gold'], 'the whole build maxed');
});

test('props turn up all around a hero who stands still, not only to the east', () => {
  const oldRandom = Math.random;
  Math.random = mulberry32(12);
  try {
    const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
    const p = g.player;
    p.vx = p.vy = 0;
    const sides = {east: 0, west: 0};
    for (let i = 0; i < 60; i++) {
      g.spawner.spawnProps();
      for (const e of g.enemies.filter(e => e.prop)) sides[e.x > p.x ? 'east' : 'west']++;
      for (const e of g.enemies) g.enemyPool.put(e);
      g.enemies.length = 0;
    }
    assert.ok(sides.east + sides.west > 60, "props were placed");
    assert.ok(sides.west > sides.east * 0.4, `east ${sides.east}, west ${sides.west}`);
  } finally {
    Math.random = oldRandom;
  }
});

test('coins and potions left far behind in the forest fade, but not chests or gear', () => {
  const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
  const p = g.player;
  const far = (kind, o) => g.addPickup(kind, p.x + 3000, p.y, 1, o);
  const coin = far('coin'), potion = far('potion'), chest = far('chest', {kind: 'elite'});
  const item = far('item', {item: {slot:'ring', rarity:0, stats:{crit:2}, power:null, seed:1}});
  const near = g.addPickup('coin', p.x + 100, p.y, 1);
  g.relocate();
  assert.ok(coin.dead && potion.dead, 'far coins and potions go');
  assert.ok(!chest.dead && !item.dead && !near.dead, 'chests, gear and what is near stay');
});
