import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
await mod('tools/headless.mjs');
const {Game, PROP_LOOT} = await mod('public/js/game/game.js');
const {PROP_SITES} = await mod('public/js/data/waves.js');
const {Dungeon} = await mod('public/js/game/dungeon.js');
const {ENEMIES} = await mod('public/js/data/enemies.js');
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

// The user: "one third of boxes have potions, one third has rage powerup, one tenth has a magnet,
// and the rest have gold" (or the rarer finds), box by box.
test('at plain luck a third of boxes hold a potion, a third a fury orb, a tenth a Scroll of Gathering, the rest gold or a rare find', () => {
  const n = 30000, c = breakProps(1, n);
  const share = kind => PROP_LOOT.find(d => d.kind === kind).w;
  const near = (got, want, what) => assert.ok(Math.abs(got / n - want) < 0.01, `${what}: ${(got / n).toFixed(4)} vs ${want.toFixed(4)}`);
  near(c.potion, 1 / 3, 'potions');
  near(c.fury, 1 / 3, 'fury orbs');
  near(c.magnet, 1 / 10, 'Scrolls of Gathering');
  near((c.coin || 0) + (c.goldpile || 0), 0.2, 'gold, the most of what is left');
  near((c.elixir || 0) + (c.frostrune || 0) + (c.relic || 0), 1 / 30, 'elixirs, Frost Runes and Holy Relics');
  for (const kind of ['elixir', 'frostrune', 'relic']) near(c[kind], share(kind), kind);
  assert.ok(c.relic < c.elixir && c.relic < c.frostrune, 'the Holy Relic the rarest');
  const held = Object.values(c).reduce((s, v) => s + v, 0);
  assert.equal(held, n, 'every box holds one thing, never nothing');
  assert.ok(Math.abs(PROP_LOOT.reduce((s, d) => s + d.w, 0) - 1) < 1e-9, 'the weights are the odds at luck 1');
  assert.deepEqual(PROP_LOOT.filter(d => !d.lucky).map(d => d.kind).sort(), ['coins', 'fury', 'goldpile', 'potion'], 'luck favours the rare treasures, not the staples');
});

test('the horde leaves soul gems and now and then a coin or a fury orb; champions a chest and gold, no potion', () => {
  const oldRandom = Math.random;
  Math.random = mulberry32(9);
  try {
    const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
    const p = g.player;
    p.luck = 3; // lucky enough that any rare drop would show
    const kills = (type, o, n) => {
      const counts = {};
      for (let i = 0; i < n; i++) {
        g.pickups.length = 0;
        g.killEnemy(g.spawnEnemy(type, p.x + 60, p.y, {instant: true, ...o}));
        for (const e of g.enemies) g.enemyPool.put(e);
        g.enemies.length = 0;
        for (const pk of g.pickups) counts[pk.kind] = (counts[pk.kind] || 0) + 1;
      }
      return counts;
    };
    const horde = kills('bat', {}, 4000);
    assert.deepEqual(Object.keys(horde).sort(), ['coin', 'fury', 'gem'], JSON.stringify(horde));
    assert.ok(horde.coin > 4000 * 0.014 * 3 * 0.7 && horde.coin < 4000 * 0.014 * 3 * 1.3, 'coins as often as before');
    assert.ok(horde.fury > 4000 * 0.002 * 3 * 0.5 && horde.fury < 4000 * 0.002 * 3 * 1.5, 'fury orbs as often as before');
    const champions = kills('skeleton', {elite: true}, 300);
    assert.deepEqual(Object.keys(champions).sort(), ['chest', 'gem', 'goldpile'], JSON.stringify(champions));
  } finally {
    Math.random = oldRandom;
  }
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
  const {MAX_WEAPON_LEVEL} = await mod('public/js/data/weapons.js');
  const {PASSIVES, PASSIVE_IDS} = await mod('public/js/data/passives.js');
  const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
  const p = g.player;
  // All six slots full of his weapons: no new one can be offered.
  const {weaponsFor} = await mod('public/js/data/heroes.js');
  for (const id of weaponsFor(p.hero)) if (p.weapons.length < 6 && !g.ownsWeapon(id)) g.addWeapon(id, MAX_WEAPON_LEVEL);
  for (const w of p.weapons) { w.level = MAX_WEAPON_LEVEL; w.recompute(); }
  for (const id of PASSIVE_IDS.slice(0, 6)) g.addPassive(id, PASSIVES[id].max);
  p.weapons[0].level = MAX_WEAPON_LEVEL - 1;
  const cards = g.levelChoices(3);
  assert.deepEqual(cards.map(c => c.type), ['weapon', 'bless', 'heal'], 'one upgrade left, and two to fill');
  p.weapons[0].level = MAX_WEAPON_LEVEL;
  assert.deepEqual(g.levelChoices(3).map(c => c.type), ['bless', 'heal', 'gold'], 'the whole build maxed');
});

// The user: "Triple the current spawn" of pickup spots, and "the box sites have 2-5 boxes".
test('the forest puts down three times the breakable sites it did, each of 2 to 5 boxes', () => {
  const oldRandom = Math.random;
  Math.random = mulberry32(21);
  try {
    const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
    const sizes = [], kinds = [];
    let site = null;
    // Nothing really spawns (the horde neither): each site's boxes are only counted.
    g.spawnEnemy = (type) => {
      if (site && ENEMIES[type].prop) site.push(type);
      return null;
    };
    const spawnProps = g.spawner.spawnProps.bind(g.spawner);
    g.spawner.spawnProps = () => {
      site = [];
      spawnProps();
      sizes.push(site.length);
      kinds.push(site);
      site = null;
    };
    const minutes = 20;
    for (let i = 0; i < minutes * 600; i++) g.spawner.update(0.1);
    const old = (minutes * 60) / 21; // a site every 16-26 seconds, as it was
    assert.ok(Math.abs(sizes.length / (3 * old) - 1) < 0.1, `${sizes.length} sites in ${minutes} minutes, against ${old.toFixed(0)} before`);
    assert.ok(sizes.every(n => n >= 2 && n <= 5), `sizes ${[...new Set(sizes)].sort()}`);
    assert.deepEqual([...new Set(sizes)].sort(), [2, 3, 4, 5], 'every size turns up');
    const mean = sizes.reduce((s, n) => s + n, 0) / sizes.length;
    assert.ok(Math.abs(mean - 3.5) < 0.2, `${mean.toFixed(2)} boxes a site`);
    assert.ok(kinds.every(k => k.filter(t => t === 'lantern').length <= 1), 'at most one lantern a site');
    assert.ok(kinds.some(k => k.includes('lantern') && k.length > 1), 'a lantern stands among boxes');
    assert.equal(PROP_SITES.most, 45, 'and up to 45 stand about the hero (it was 10)');
  } finally {
    Math.random = oldRandom;
  }
});

test('a dungeon room has a row of boxes along a wall that stays put', () => {
  const oldRandom = Math.random;
  Math.random = mulberry32(4);
  try {
    let rooms = 0, boxes = 0, lonely = 0;
    for (let k = 0; k < 4; k++) {
      const g = new Game({hero:'knight', mode:'dungeon', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
      const w = g.world, T = 16, props = g.enemies.filter(e => e.prop);
      const tiles = new Set(props.map(e => Math.floor(e.y / T) * w.W + Math.floor(e.x / T)));
      assert.equal(tiles.size, props.length, 'never two on one tile');
      for (const e of props) {
        const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T);
        const r = w.rooms.find(r => tx > r.x && tx < r.x + r.w - 1 && ty > r.y && ty < r.y + r.h - 1);
        assert.ok(r && (tx === r.x + 1 || tx === r.x + r.w - 2 || ty === r.y + 1 || ty === r.y + r.h - 2), 'hugging a wall of a room');
        if (![1, -1, w.W, -w.W].some(d => tiles.has(ty * w.W + tx + d))) lonely++;
      }
      rooms += w.rooms.length;
      boxes += props.length;
      // The hero walks off to the far end: what the rooms hold stays for him to find.
      const far = w.rooms.reduce((a, r) => (Math.hypot(r.cx * T - g.player.x, r.cy * T - g.player.y) > Math.hypot(a.cx * T - g.player.x, a.cy * T - g.player.y) ? r : a));
      g.player.x = far.cx * T + T / 2;
      g.player.y = far.cy * T + T / 2;
      w.updateFlow(true);
      assert.ok(props.some(e => w.tooFar(e, g.cam)), 'some are far behind him');
      g.relocate();
      assert.equal(g.enemies.filter(e => e.prop && !e.dead).length, props.length, 'none fade while he is away');
    }
    // One row of 2-5 a room, less where a wall or another box is: about three boxes a chamber.
    assert.ok(boxes / rooms >= 2 && boxes / rooms <= 5, `${(boxes / rooms).toFixed(1)} boxes a room`);
    assert.ok(lonely < boxes * 0.1, `${lonely} of ${boxes} boxes stand alone`);
  } finally {
    Math.random = oldRandom;
  }
});

// The user, 16 October 2026: "closer to 3 boxes per chamber". A crypt's chamber and a Dungeon Run
// floor's room alike hold one row of 2 to 5 boxes.
test('a crypt chamber and a dungeon room each hold one row of boxes, about three', () => {
  const oldRandom = Math.random, oldSites = Dungeon.prototype.propSites;
  const drawn = {crypt: [], floor: []};
  Math.random = mulberry32(8);
  Dungeon.prototype.propSites = function () {
    const n = oldSites.call(this);
    drawn[this.crypt ? 'crypt' : 'floor'].push(n);
    return n;
  };
  try {
    assert.deepEqual(PROP_SITES.crypt, [1, 1]);
    assert.deepEqual(PROP_SITES.room, [1, 1], 'the floors the same');
    const run = new Game({hero:'knight', mode:'dungeon', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
    assert.equal(drawn.floor.length, run.world.rooms.length, 'a floor draws for each room');
    assert.ok(drawn.floor.every(n => n === 1), `floor rows ${drawn.floor}`);
    let rooms = 0, boxes = 0, most = 0;
    const crypts = 6, T = 16;
    for (let k = 0; k < crypts; k++) {
      const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
      g.enemies.length = 0;
      const before = drawn.crypt.length;
      new Dungeon(g, 1, 1000 + k, {name:'Crypt of Tests', theme:['crypt', 'catacombs', 'inferno'][k % 3], lords:2 + (k % 3)});
      const w = g.world, props = g.enemies.filter(e => e.prop);
      assert.equal(drawn.crypt.length - before, w.rooms.length, 'a crypt draws for each chamber');
      for (const r of w.rooms) {
        const n = props.filter(e => {
          const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T);
          return tx > r.x && tx < r.x + r.w - 1 && ty > r.y && ty < r.y + r.h - 1;
        }).length;
        assert.ok(n <= PROP_SITES.boxes[1], `${n} boxes in a chamber`);
        most = Math.max(most, n);
      }
      rooms += w.rooms.length;
      boxes += props.length;
    }
    assert.ok(drawn.crypt.every(n => n === 1), `crypt rows ${drawn.crypt}`);
    // One row of 2-5: about three a chamber, less where a wall or another box is.
    assert.ok(boxes / rooms >= 2 && boxes / rooms <= 5, `${(boxes / rooms).toFixed(1)} boxes a chamber, ${most} at most`);
    assert.ok(boxes / crypts < 60, `${(boxes / crypts).toFixed(0)} boxes a crypt`);
  } finally {
    Math.random = oldRandom;
    Dungeon.prototype.propSites = oldSites;
  }
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

test("a hero's health never goes above its maximum", () => {
  const g = new Game({hero:'archer', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
  const p = g.player;
  p.hp = p.maxHp - 5;
  p.heal(1000);
  assert.equal(p.hp, p.maxHp, 'a potion at near full health');
  p.hp = p.maxHp - 1;
  p.healPool = 500;
  p.regen = 50;
  for (let i = 0; i < 120; i++) p.update(1/60);
  assert.ok(p.hp <= p.maxHp, `regeneration and a heal over time: ${p.hp} of ${p.maxHp}`);
  for (let i = 0; i < 3; i++) g.addPassive('vitality', 1);
  assert.ok(p.hp <= p.maxHp, `more maximum health: ${p.hp} of ${p.maxHp}`);
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
