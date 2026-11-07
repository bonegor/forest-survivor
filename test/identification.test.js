import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { gearBonuses, itemLines, itemName, itemPrice, packGear, rollItem } from '../public/js/shared/items.js';
import { acknowledgeReveal, applyRun, defaultProfile, gearRevision, identificationCost, manageInventory, MAX_STASH, packProfile, resolveSpoil, sanitizeProfile } from '../public/js/shared/profile.js';
import { makeRunId, packSpoils, unpackSpoils } from '../public/js/shared/spoils.js';

const find = (slot, hero = 'knight', seed = 49) => rollItem(mulberry32(seed), { slot, hero, minute: 100, depth: 4 });
function receipt(items) {
  const profile = defaultProfile();
  profile.gold = 1000;
  const id = makeRunId();
  const result = applyRun(profile, { mode: 's15', hero: 'knight', time: 300, found: items.length, sealedGear: true,
    spoils: packSpoils(items.map(item => ({ item, state: 'sealed' }))), runId: id, runFrom: 0 });
  assert.ok(result.ok);
  return { profile: result.profile, id };
}

test('identification spends 10 then 20 gold, survives packing, and retries never charge twice', () => {
  const items = [find('boots'), find('weapon')], saved = receipt(items), initial = saved.profile.gold;
  assert.match(itemName(items[0]), /^Unidentified /);
  const first = resolveSpoil(saved.profile, { id: saved.id, index: 0, action: 'identify', expectedCost: 10 });
  assert.ok(first.ok);
  assert.equal(first.profile.gold, initial - 10);
  assert.equal(identificationCost(first.profile), 20);
  const reloaded = sanitizeProfile(packProfile(first.profile));
  assert.deepEqual(resolveSpoil(reloaded, { id: saved.id, index: 0, action: 'identify', expectedCost: 10 }).profile, reloaded);
  const stale = resolveSpoil(reloaded, { id: saved.id, index: 1, action: 'identify', expectedCost: 10 });
  assert.equal(stale.ok, false);
  assert.equal(stale.profile.gold, initial - 10);
  const second = resolveSpoil(reloaded, { id: saved.id, index: 1, action: 'identify', expectedCost: 20 });
  assert.ok(second.ok);
  assert.equal(second.profile.gold, initial - 30);
  assert.equal(identificationCost(second.profile), 30);
  assert.equal(unpackSpoils(second.profile.lastRun.claims)[0].item.identified, true);
});

test('unknown gear can be equipped for its base bonus while magic remains hidden and dormant', () => {
  const item = find('boots'), saved = receipt([item]);
  const equipped = resolveSpoil(saved.profile, { id: saved.id, index: 0, action: 'equip', expectedGearRev: 0 });
  assert.ok(equipped.ok);
  const bonuses = gearBonuses(equipped.profile.gear.knight, 'knight');
  assert.equal(bonuses.armor, item.base.armor);
  for (const key of Object.keys(item.stats)) if (key !== 'armor') assert.equal(bonuses[key], 0);
  assert.ok(itemLines(item).every(line => !line.includes('+1 rank')));
  const p = equipped.profile, expected = p.gear.knight.boots;
  const identified = manageInventory(p, { hero: 'knight', source: 'gear', slot: 'boots', expected,
    expectedGearRev: gearRevision(p, 'knight'), expectedCost: 10, action: 'identify' });
  assert.ok(identified.ok);
  assert.equal(identified.profile.gear.knight.boots.identified, true);
  assert.notDeepEqual(gearBonuses(identified.profile.gear.knight, 'knight'), bonuses);
});

test('stash persists unknown items and camp equip, replacement, identify and sell require the inspected item', () => {
  const first = find('weapon', 'knight', 2), second = find('weapon', 'knight', 3), saved = receipt([first, second]);
  const stashed = resolveSpoil(saved.profile, { id: saved.id, index: 0, action: 'stash' });
  assert.ok(stashed.ok);
  assert.deepEqual(resolveSpoil(stashed.profile, { id: saved.id, index: 0, action: 'stash' }).profile, stashed.profile);
  const both = resolveSpoil(stashed.profile, { id: saved.id, index: 1, action: 'stash' });
  assert.ok(acknowledgeReveal(both.profile, saved.id).ok);
  let p = sanitizeProfile(packProfile(both.profile));
  assert.deepEqual(p.stash, [first, second]);
  const equip = item => ({ hero: 'knight', source: 'stash', index: 0, expected: item, expectedGearRev: gearRevision(p, 'knight'), action: 'equip' });
  let r = manageInventory(p, equip(first));
  assert.ok(r.ok); p = r.profile;
  r = manageInventory(p, equip(second));
  assert.ok(r.ok); p = r.profile;
  assert.deepEqual(p.stash, [first]);
  assert.deepEqual(p.gear.knight.weapon, second);
  const sale = { hero: 'knight', source: 'stash', index: 0, expected: first, expectedGearRev: gearRevision(p, 'knight'), action: 'sell' };
  const sold = manageInventory(p, sale);
  assert.ok(sold.ok);
  assert.equal(sold.profile.gold, p.gold + itemPrice(first));
  assert.equal(manageInventory(sold.profile, sale).ok, false);
  assert.equal(sold.profile.stash.length, 0);
});

test('weapon style and inventory capacity reject invalid equipment without consuming loot', () => {
  const bow = find('weapon', 'archer'), sword = find('weapon', 'knight'), saved = receipt([bow, sword]);
  const rejected = resolveSpoil(saved.profile, { id: saved.id, index: 0, action: 'equip', expectedGearRev: 0 });
  assert.equal(rejected.ok, false);
  assert.equal(unpackSpoils(rejected.profile.lastRun.claims)[0].state, 'sealed');
  const p = saved.profile;
  p.stash = Array.from({ length: MAX_STASH }, (_, i) => ({ ...sword, seed: i }));
  assert.equal(resolveSpoil(p, { id: saved.id, index: 1, action: 'stash' }).ok, false);
  assert.equal(resolveSpoil(p, { id: saved.id, index: 1, action: 'equip', expectedGearRev: 0 }).ok, true, 'an empty equipped slot needs no inventory room');
});

test('legacy six-slot sealed spoils retain their item and state after adding weapon and shield slots', () => {
  const legacy = { slot: 'ring', rarity: 0, stats: { crit: 1 }, power: null, seed: 5 };
  const packed = packGear({ ring: legacy }).slice(5);
  assert.deepEqual(unpackSpoils('n' + packed), [{ item: legacy, state: 'sealed' }]);
  const modern = find('weapon');
  assert.deepEqual(unpackSpoils(packSpoils([{ item: modern, state: 'sealed' }]))[0].item, modern);
});

test('server inventory identifies and sells a persisted item once and rejects a replayed sale', async () => {
  const server = createServer({ secret: 'identification-test-secret'.padEnd(48, 'x'), devOpen: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`, item = find('boots');
  let cookie = '';
  const request = async (path, body) => {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
      headers: { cookie, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const header of response.headers.getSetCookie()) if (header.startsWith('fs_profile=')) cookie = header.split(';')[0];
    return { status: response.status, data: await response.json() };
  };
  try {
    const p = defaultProfile(); p.gold = 100; p.stash = [item];
    assert.equal((await request('/api/dev/profile', { profile: p })).status, 200);
    const decision = { hero: 'knight', source: 'stash', index: 0, expected: item, expectedGearRev: 0, expectedCost: 10, action: 'identify' };
    const identified = await request('/api/inventory', decision);
    assert.equal(identified.status, 200);
    assert.equal(identified.data.profile.gold, 90);
    assert.equal(identified.data.profile.stash[0].identified, true);
    const loaded = (await request('/api/state')).data.profile;
    assert.equal(identificationCost(loaded), 20);
    const sale = { ...decision, action: 'sell', expected: loaded.stash[0] };
    const sold = await request('/api/inventory', sale);
    assert.equal(sold.status, 200);
    assert.equal(sold.data.profile.gold, 90 + itemPrice(item));
    assert.equal((await request('/api/inventory', sale)).status, 400);
    assert.equal((await request('/api/state')).data.profile.gold, sold.data.profile.gold);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
