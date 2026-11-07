import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { HEROES } from '../public/js/data/heroes.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { PASSIVES } from '../public/js/data/passives.js';
import { applyRun, defaultProfile, encodeState, decodeState, FEAT, gearRevision, HERO_ORDER, metaBonuses,
  packProfile, sanitizeProfile, transferItem, transferQuote } from '../public/js/shared/profile.js';
import { itemPrice, POOLS, packGear, sanitizeGear, sanitizeItem, statRange } from '../public/js/shared/items.js';
import { packSpoils, unpackSpoils } from '../public/js/shared/spoils.js';
import { saveBox } from '../public/js/engine/storage.js';
import { input } from '../public/js/engine/input.js';
import { PauseOverlay } from '../public/js/ui/gamescreen.js';
import { UI } from '../public/js/ui/ui.js';

function item(slot, rarity, grant, power = 'echo', seed = 1) {
  const count = [1, 2, 3, 3, 4][rarity];
  const stats = Object.fromEntries(POOLS[slot].slice(0, count).map(id => [id, statRange(id, rarity)[0]]));
  return { slot, rarity, stats, power: rarity === 4 ? power : null, seed, ...(grant && { grant }) };
}

function action(profile, slot, from = 'knight', to = 'archer') {
  return { from, to, slot, expected: profile.gear[from]?.[slot],
    fromRev: gearRevision(profile, from), toRev: gearRevision(profile, to) };
}

test('Quartermaster transfers worn items at ten times sale price with atomic validation', () => {
  for (const rarity of [0, 1, 2, 3, 4]) {
    const ring = item('ring', rarity);
    const p = sanitizeProfile({ v: 4, heroes: ['knight', 'archer'], gold: 7500, gear: { knight: { ring } } });
    assert.equal(transferItem(p, action(p, 'ring')).ok, false, 'achievement required');
    p.feats.knight = FEAT.dungeon;
    assert.equal(transferItem(p, action(p, 'ring', 'knight', 'knight')).ok, false);
    assert.equal(transferItem(p, action(p, 'ring', 'knight', 'mage')).ok, false);
    assert.equal(transferQuote({ ...p, gold: itemPrice(ring) * 10 - 1 }, 'knight', 'archer', 'ring').error, 'Insufficient gold');
    assert.equal(transferItem({ ...p, gear: { ...p.gear, archer: { ring } } }, action(p, 'ring')).ok, false, 'recipient slot occupied');
    if (rarity === 4) {
      const gear = { ...p.gear, archer: { helm: item('helm', 4) } };
      assert.equal(transferItem({ ...p, gear }, action(p, 'ring')).ok, false, 'duplicate legendary power');
    }
    const attempt = action(p, 'ring'), r = transferItem(p, attempt);
    assert.equal(r.cost, itemPrice(ring) * 10);
    assert.equal(r.profile.gold, p.gold - r.cost);
    assert.deepEqual(r.profile.gear, { archer: { ring } });
    assert.deepEqual(p.gear, { knight: { ring } });
    const roundTrip = sanitizeProfile(decodeState(encodeState(packProfile(r.profile))));
    assert.deepEqual(roundTrip.gear, r.profile.gear);
    assert.equal(gearRevision(roundTrip, 'knight'), 1);
    assert.deepEqual(transferItem(roundTrip, attempt).profile, roundTrip, 'retry cannot charge again');
  }
});

test('a run started before a transfer settles new loot without restoring or selling the transferred gear', () => {
  const moved = item('ring', 2, 'passive:might');
  const newRing = item('ring', 3, 'weapon:raise', 'echo', 2);
  const newBoots = item('boots', 1, null, 'echo', 3);
  const p = sanitizeProfile({ v: 4, heroes: ['knight', 'archer'], feats: { knight: FEAT.dungeon },
    gold: 2000, gear: { knight: { ring: moved } } });
  const t = transferItem(p, action(p, 'ring')).profile;
  const run = { runId: '0123456789abcdefabcdef01', runFrom: p.runs, mode: 's15', hero: 'knight', diff: 'medium',
    time: 180, gold: itemPrice(moved), found: 2, gearRev: 0, gearStart: p.gear.knight, gear: { ring: newRing, boots: newBoots },
    spoils: packSpoils([{ item: newRing, state: 'worn' }, { item: newBoots, state: 'worn' }]) };
  const r = applyRun(t, run);
  assert.ok(r.ok && r.reward.gearConflict);
  assert.equal(r.reward.collected, itemPrice(newRing), 'one canonical sale for the conflicting newly earned drop');
  assert.deepEqual(r.profile.gear, { knight: { boots: newBoots }, archer: { ring: moved } });
  assert.deepEqual(unpackSpoils(r.profile.lastRun.spoils).map(e => e.state), ['sold', 'worn']);
  assert.deepEqual(applyRun(r.profile, run).profile, r.profile);
});

test('rank affixes validate rarity, preserve old encodings and round-trip each grant type', () => {
  const gear = {
    helm: item('helm', 4, 'weapons'),
    armor: item('armor', 4, 'passives'),
    ring: item('ring', 2, 'weapon:raise'),
    boots: item('boots', 3, 'passive:might'),
  };
  assert.deepEqual(sanitizeGear(packGear(gear)), gear);
  assert.equal(sanitizeItem(item('ring', 1, 'weapon:raise')), null);
  assert.equal(sanitizeItem(item('ring', 2, 'weapons')), null);
  assert.equal(sanitizeItem(item('ring', 4, 'passive:phoenix')), null);
  assert.equal(sanitizeItem(item('ring', 4, 'weapon:excalibur')), null);
  assert.deepEqual(sanitizeGear({ ring: [0, 1, -1, 0, 1] }), { ring: item('ring', 0) });
});

test('all-weapon gear boosts both Necromancer signatures temporarily while preserving learned ranks and evolutions', () => {
  const gear = { helm: item('helm', 4, 'weapons'), ring: item('ring', 2, 'weapon:raise') };
  const g = new Game({ hero: 'necromancer', mode: 's15', meta: metaBonuses(defaultProfile()), gear, headless: true });
  const p = g.player, [raise, miasma] = p.weapons;
  assert.deepEqual([raise.level, miasma.level, raise.effectiveRank(), miasma.effectiveRank()], [1, 1, 2, 2]);
  assert.equal(raise.s.dmg, WEAPONS.raise.base.dmg + (WEAPONS.raise.levels[0].dmg || 0));
  raise.level = MAX_WEAPON_LEVEL - 1;
  p.recompute();
  g.addPassive(raise.def.evo.with);
  assert.equal(raise.effectiveRank(), MAX_WEAPON_LEVEL);
  assert.ok(!g.evolvable().includes(raise), 'gear cannot qualify for evolution');
  raise.levelUp();
  assert.ok(g.evolvable().includes(raise));
  raise.evolve();
  assert.equal(raise.s.dmg, raise.def.base.dmg);
  g.sellWorn('helm');
  assert.equal(miasma.effectiveRank(), 1);
  assert.equal(raise.effectiveRank(), MAX_WEAPON_LEVEL);
  assert.equal(p.gearWeapons.length, 0, 'an evolved weapon already owns its base family');
});

test('specific grants live outside the learned slots, apply once, and remove their spawned combat effects', () => {
  const gear = { ring: item('ring', 2, 'weapon:raise'), boots: item('boots', 3, 'passive:might'),
    helm: item('helm', 4, 'passives'), armor: item('armor', 3, 'passive:might') };
  const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), gear, headless: true });
  const p = g.player, [bonus] = p.gearWeapons;
  assert.deepEqual(p.weapons.map(w => w.id), ['sword']);
  assert.equal(bonus.id, 'raise');
  assert.equal(p.passives.size, 0);
  assert.equal(p.passiveSum('might'), PASSIVES.might.stat.might);
  assert.ok(!g.upgradePool().some(c => c.id === 'might' || c.id === 'raise'));
  bonus.cd = 0;
  bonus.update(0);
  assert.ok(g.minions.some(m => m.w === bonus));
  g.sellWorn('ring');
  assert.equal(p.gearWeapons.length, 0);
  assert.ok(!g.minions.some(m => m.w === bonus));
  assert.ok(!g.effects.some(effect => effect.w === bonus));
  g.sellWorn('armor');
  g.sellWorn('boots');
  assert.equal(p.passiveSum('might'), 0);
  g.addPassive('might', 1);
  assert.equal(p.effectivePassiveRank('might'), 2);
  g.addPassive('might', PASSIVES.might.max);
  assert.equal(p.effectivePassiveRank('might'), PASSIVES.might.max);
  assert.ok(g.upgradePool().every(c => c.id !== 'might'));
});

test('pause opens the separate gear rank details through the normal button', () => {
  const gear = { ring: item('ring', 2, 'weapon:raise') };
  const game = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), gear, headless: true });
  const app = { ui: new UI(), settings: {} };
  const pause = new PauseOverlay({ app, game });
  const ctx = document.createElement('canvas').getContext('2d');
  try {
    pause.draw(ctx, 480, 270, 0.3);
    const button = app.ui.items.find(entry => entry.id === 'rank_gear');
    assert.ok(button);
    Object.assign(input.mouse, { x: button.x + 2, y: button.y + 2, clicked: true });
    pause.draw(ctx, 480, 270, 0.3);
    assert.equal(pause.rankGear.title, 'Worn rank grants');
    assert.ok(pause.rankGear.lines[0].includes(WEAPONS.raise.name));
    input.endFrame();
    pause.draw(ctx, 480, 270, 0.3);
  } finally {
    input.endFrame();
  }
});

test('legacy roster bits, ultimate bits and equipped slots retain their original hero identities', () => {
  const legacy = ['knight', 'archer', 'mage', 'rogue', 'necromancer', 'paladin', 'druid', 'berserker', 'witchhunter'];
  assert.deepEqual(HERO_ORDER.slice(0, legacy.length), legacy);
  assert.equal(HERO_ORDER.length, 21);
  assert.equal(Object.keys(HEROES).length, 21);
  const ring = item('ring', 2);
  const old = sanitizeProfile({ v: 4, heroes: 511, uu: 511, bt: '0.0.0.0.0.0.0.0.8c',
    gear: { witchhunter: packGear({ ring }) } });
  assert.deepEqual(old.heroes, [...legacy, 'footman']);
  assert.equal(old.uu, 511);
  assert.deepEqual(old.gear.witchhunter, { ring });
  assert.equal(old.bt.witchhunter, 300);
});

test('static cookie fallback reads expanded profiles and removes all chunks after migration', () => {
  const jar = new Map(), name = 'fs_expansion_cookie_test';
  const doc = globalThis.document, originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(doc, 'cookie', {
    configurable: true,
    get: () => [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
    set(line) {
      const [pair] = line.split(';');
      const i = pair.indexOf('='), key = pair.slice(0, i);
      assert.ok(line.length < 4096);
      if (line.includes('Max-Age=0;') || line.endsWith('Max-Age=0')) jar.delete(key);
      else jar.set(key, pair.slice(i + 1));
    },
  });
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: null });
    const p = defaultProfile();
    p.heroes = [...HERO_ORDER];
    for (const h of HERO_ORDER) {
      p.gear[h] = Object.fromEntries(['helm', 'armor', 'gloves', 'boots', 'amulet', 'ring'].map(slot => [slot, item(slot, 4, 'weapons')]));
    }
    const encoded = encodeState(packProfile(p));
    assert.ok(encoded.length > 4096);
    saveBox.write(name, encoded);
    assert.equal(saveBox.read(name), encoded);
    assert.deepEqual(sanitizeProfile(decodeState(saveBox.read(name))).gear, p.gear);

    const local = new Map();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: key => local.get(key),
      setItem: (key, value) => local.set(key, value),
    } });
    assert.equal(saveBox.read(name), encoded);
    assert.equal(local.get(name), encoded);
    assert.equal(jar.size, 0);
  } finally {
    delete doc.cookie;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
  }
});
