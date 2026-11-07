import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../public/js/engine/util.js';
import { WEAPONS } from '../public/js/data/weapons.js';
import { PASSIVES } from '../public/js/data/passives.js';
import { SLOTS, RARITIES, LEGENDARY, canEquipItem, gearBonuses, gearRanks, itemIcon, itemIdentified, itemLines,
  itemName, packGear, packItem, rarityOdds, rollItem, sameItem, sanitizeGear, sanitizeItem, weaponClass } from '../public/js/shared/items.js';

function findItem(slot, rarity, hero = 'knight') {
  for (let seed = 0; seed < 10000; seed++) {
    const item = rollItem(mulberry32(seed), { slot, hero, minute: 10, depth: 2 });
    if (item.rarity === rarity) return item;
  }
  throw new Error(`No ${rarity} ${slot} rolled`);
}

test('new crypt loot uses ordinary, blue enchanted or bright gold tiers and jewelry is always magical', () => {
  const counts = Array(RARITIES.length).fill(0), rng = mulberry32(728);
  for (let i = 0; i < 12000; i++) {
    const item = rollItem(rng, { minute: 8, depth: 2 });
    counts[item.rarity]++;
    assert.ok([0, 2, LEGENDARY].includes(item.rarity));
    assert.equal(item.identified, false);
    assert.deepEqual(sanitizeItem(item), item);
    assert.deepEqual(sanitizeGear(packGear({ [item.slot]: item })), { [item.slot]: item });
    if (item.slot === 'amulet' || item.slot === 'ring') assert.notEqual(item.rarity, 0);
    if (item.rarity === LEGENDARY) assert.ok(item.grant, 'every gold item has a skill rank bonus');
    else assert.equal(item.grant, undefined, 'skill rank bonuses belong to gold loot');
  }
  const odds = rarityOdds(8, 2);
  counts.forEach((count, tier) => assert.ok(Math.abs(count / 12000 - odds[tier]) < 0.02));
  assert.equal(RARITIES[2].color, '#0099db');
  assert.equal(RARITIES[LEGENDARY].color, '#fff154');
});

test('unidentified armor and weapons apply their visible base bonus while all magic remains hidden and dormant', () => {
  for (const slot of SLOTS) {
    const item = findItem(slot, LEGENDARY);
    const worn = { [slot]: item }, hidden = gearBonuses(worn, 'knight');
    assert.equal(itemIdentified(item), false);
    assert.match(itemName(item), /^Unidentified /);
    assert.ok(itemLines(item).every(line => !line.includes('+1 rank')));
    for (const [stat, value] of Object.entries(hidden)) {
      const base = item.base[stat] || 0;
      assert.equal(value, stat === 'armor' ? base : base / 100, `${slot} ${stat}: only the base applies`);
    }
    assert.deepEqual(gearRanks(worn), { allWeapons: false, allPassives: false, weapons: new Set(), passives: new Set() });
    const known = { ...item, identified: true };
    assert.ok(!itemName(known).startsWith('Unidentified '));
    assert.ok(itemLines(known).some(line => line.startsWith('+1 rank')));
    const ranks = gearRanks({ [slot]: known });
    assert.ok(ranks.allWeapons || ranks.allPassives || ranks.weapons.size || ranks.passives.size);
    assert.notDeepEqual(gearBonuses({ [slot]: known }), hidden);
  }
  for (const slot of ['helm', 'armor', 'gloves', 'boots', 'shield']) {
    const common = findItem(slot, 0);
    assert.deepEqual(common.stats, {});
    assert.equal(gearBonuses({ [slot]: common }).armor, common.base.armor);
  }
});

test('melee and ranged equipment remains class specific before and after identification', () => {
  const sword = findItem('weapon', 2, 'knight'), bow = findItem('weapon', 2, 'archer');
  assert.equal(sword.weaponType, 'melee');
  assert.equal(bow.weaponType, 'ranged');
  assert.equal(itemIcon(sword), 'g_weapon');
  assert.equal(itemIcon(bow), 'g_bow');
  assert.match(itemName(sword), /sword/i);
  assert.match(itemName(bow), /bow/i);
  for (const hero of ['knight', 'rogue', 'paladin', 'berserker', 'footman', 'templar', 'wraith', 'praetorian', 'seraph', 'swordbearer']) {
    assert.equal(weaponClass(hero), 'melee');
    assert.ok(canEquipItem(sword, hero));
    assert.equal(canEquipItem(bow, hero), false);
    assert.equal(gearBonuses({ weapon: bow }, hero).might, 0);
    assert.deepEqual(gearRanks({ weapon: { ...bow, identified: true } }, hero), gearRanks({}));
  }
  for (const hero of ['archer', 'witchhunter', 'mage', 'necromancer', 'druid', 'marksman', 'trailblazer', 'thornkeeper', 'gravebinder', 'arcanist', 'boltguard']) {
    assert.equal(weaponClass(hero), 'ranged');
    assert.ok(canEquipItem(bow, { id: hero }));
    assert.equal(canEquipItem(sword, hero), false);
  }
});

test('modern full-slot gear preserves base bonuses, identification and weapon class through every save encoding', () => {
  const gear = Object.fromEntries(SLOTS.map(slot => [slot, findItem(slot, LEGENDARY)]));
  assert.deepEqual(sanitizeGear(packGear(gear)), gear);
  const arrays = Object.fromEntries(Object.entries(gear).map(([slot, item]) => [slot, packItem(item)]));
  assert.deepEqual(sanitizeGear(arrays), gear);
  for (const item of Object.values(gear)) {
    assert.ok(sameItem(item, sanitizeItem(item)));
    assert.equal(sameItem(item, { ...item, identified: true }), false);
    assert.equal(sameItem(item, { ...item, base: {} }), Object.keys(item.base).length === 0);
  }
  const legacy = { slot: 'boots', rarity: 0, stats: { speed: 3 }, power: null, seed: 7 };
  assert.equal(packGear({ boots: legacy }), '|||0.7.-1.0.3');
  assert.deepEqual(sanitizeGear('|||0.7.-1.0.3'), { boots: legacy });
  assert.ok(itemIdentified(legacy));
  assert.ok(sameItem(legacy, { ...legacy, identified: true }));
  assert.equal(gearBonuses({ boots: legacy }).speed, 0.03);
});

test('compact gear preserves every skill grant and migrates the earlier unidentified metadata format', () => {
  const helm = findItem('helm', LEGENDARY);
  const grants = ['weapons', 'passives',
    ...Object.keys(WEAPONS).filter(id => !WEAPONS[id].evolved).map(id => 'weapon:' + id),
    ...Object.keys(PASSIVES).filter(id => !PASSIVES[id].stat.revivals).map(id => 'passive:' + id)];
  for (const grant of grants) {
    const item = { ...helm, grant };
    const packed = packGear({ helm: item });
    assert.match(packed, /^@[0-9a-z]+$/);
    assert.ok(packed.length <= 16, 'modern items fit a full roster in one encrypted cookie');
    assert.deepEqual(sanitizeGear(packed), { helm: item });
  }
  const sword = findItem('weapon', LEGENDARY);
  const oldNumbers = packItem(sword).filter(value => typeof value === 'number').map(value => value.toString(36)).join('.');
  const oldPacked = '||||||' + `${oldNumbers}~${sword.grant}~0.${sword.base.might.toString(36)}.m`;
  assert.deepEqual(sanitizeGear(oldPacked), { weapon: sword });
  assert.deepEqual(sanitizeGear(packGear(sanitizeGear(oldPacked))), { weapon: sword });
  for (const bad of ['@' + 'z'.repeat(20), '@' + 'z'.repeat(21), '@?', '@-1']) assert.deepEqual(sanitizeGear(bad), {});
});

test('item validation rejects forged base bonuses, common jewelry, classless weapons and non-gold skill bonuses', () => {
  const sword = findItem('weapon', LEGENDARY);
  assert.equal(sanitizeItem({ ...sword, base: { might: 1000 } }), null);
  assert.equal(sanitizeItem({ ...sword, base: { armor: 1 } }), null);
  assert.equal(sanitizeItem({ ...sword, weaponType: 'any' }), null);
  assert.equal(sanitizeItem({ ...sword, weaponType: undefined }), null);
  assert.equal(sanitizeItem({ ...sword, identified: 'yes' }), null);
  assert.equal(sanitizeItem({ ...sword, grant: undefined }), null);
  const blue = findItem('boots', 2);
  assert.equal(sanitizeItem({ ...blue, grant: 'weapon:sword' }), null);
  const common = findItem('boots', 0);
  assert.equal(sanitizeItem({ ...common, slot: 'ring', base: {} }), null);
});
