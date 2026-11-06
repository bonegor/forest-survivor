import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { createServer } from '../server.js';
import { store } from '../public/js/engine/storage.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { Game } from '../public/js/game/game.js';
import { rollItem, itemPrice } from '../public/js/shared/items.js';
import { acknowledgeReveal, applyRun, decodeState, defaultProfile, encodeState, metaBonuses, packProfile, resolveSpoil, sanitizeProfile } from '../public/js/shared/profile.js';
import { MAX_CLAIMS, makeRunId, packSpoils, unpackSpoils } from '../public/js/shared/spoils.js';
import { reelPosition, reelProgress } from '../public/js/ui/reward-reels.js';

const gear = [
  { slot: 'ring', rarity: 4, stats: { crit: 5, luck: 12, greed: 20, might: 9 }, power: 'undying', seed: 3, grant: 'weapon:sword' },
  rollItem(mulberry32(49), { slot: 'ring' }),
  rollItem(mulberry32(21), { slot: 'helm' }),
];

test('a fall reports replaced, worn and queued items in collection order; the existing payout settles them', () => {
  const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: {}, headless: true });
  g.time = 240;
  g.itemsFound = 3;
  for (const item of gear) g.queueItem(item);
  g.wearItem(g.itemQueue.shift());
  g.wearItem(g.itemQueue.shift());
  g.state = 'dying';
  g.finish(false);
  const res = g.runReport();
  assert.equal(res.died, true);
  assert.equal(res.gold, itemPrice(gear[0]) + itemPrice(gear[2]));
  assert.deepEqual(unpackSpoils(res.spoils), [
    { item: gear[0], state: 'sold' }, { item: gear[1], state: 'worn' }, { item: gear[2], state: 'sold' },
  ]);
  assert.deepEqual(unpackSpoils(res.spoils, 1), [{ item: gear[0], state: 'sold' }]);
});

test('the saved receipt survives reload, rejects old replays, and acknowledgment leaves the earned rewards in place', () => {
  const run = { mode: 's15', time: 300, hero: 'knight', gold: 16, found: 1, gear: { ring: gear[0] }, spoils: packSpoils([{ item: gear[0], state: 'worn' }]), runId: makeRunId(), runFrom: 0, gearRev: 0 };
  const p = defaultProfile(), saved = applyRun(p, run);
  assert.ok(saved.ok);
  assert.equal(saved.profile.gold, saved.reward.total);
  assert.equal(saved.profile.lastRun.pending, true);
  const reloaded = sanitizeProfile(decodeState(encodeState(packProfile(saved.profile))));
  assert.deepEqual(reloaded.lastRun, saved.profile.lastRun);
  const replay = applyRun(reloaded, run);
  assert.equal(replay.repeated, true);
  assert.deepEqual(replay.profile, reloaded);
  const ack = acknowledgeReveal(replay.profile, run.runId);
  assert.ok(ack.ok && !ack.profile.lastRun.pending);
  assert.equal(ack.profile.lastRun.spoils, '');
  assert.deepEqual(ack.profile.gear.knight.ring, gear[0]);
  assert.deepEqual(acknowledgeReveal(ack.profile, run.runId).profile, ack.profile);
  const next = applyRun(ack.profile, { ...run, spoils: '', runId: makeRunId(), runFrom: 1 });
  assert.ok(next.ok);
  assert.equal(applyRun(next.profile, run).ok, false);
  assert.equal(next.profile.runs, 2);
});

test('sealed pickups hide their rarity, keep current equipment in play, and settle exactly once after the run', () => {
  const p = defaultProfile();
  p.gear.knight = { ring: gear[1] };
  const g = new Game({ hero: 'knight', mode: 's15', gear: p.gear.knight, sealedGear: true, meta: metaBonuses(p), settings: {}, headless: true });
  const pickup = g.addPickup('item', g.player.x, g.player.y, 0, { item: gear[0], pop: false });
  assert.equal(pickup.sprite.name, 'crate');
  assert.equal(pickup.lightKey, null);
  pickup.collect();
  g.queueItem(gear[2]);
  g.itemsFound = 2;
  g.time = 240;
  assert.equal(g.itemQueue.length, 0);
  assert.deepEqual(g.gear.ring, gear[1]);
  g.finish(false);
  const id = makeRunId();
  const saved = applyRun(p, { ...g.runReport(), runId: id, runFrom: 0 });
  assert.ok(saved.ok);
  assert.equal(acknowledgeReveal(saved.profile, id).ok, false);
  assert.equal(unpackSpoils(saved.profile.lastRun.claims).length, 2);
  const equip = { id, index: 0, action: 'equip', expectedGearRev: 0 };
  assert.equal(resolveSpoil(saved.profile, { ...equip, expectedGearRev: 1 }).ok, false);
  const equipped = resolveSpoil(saved.profile, equip);
  assert.deepEqual(equipped.profile.gear.knight.ring, gear[0]);
  assert.equal(equipped.profile.gold, saved.profile.gold + itemPrice(gear[1]));
  const restored = sanitizeProfile(decodeState(encodeState(packProfile(equipped.profile))));
  assert.deepEqual(resolveSpoil(restored, equip).profile, restored, 'lost equip response can be retried');
  assert.equal(resolveSpoil(restored, { ...equip, action: 'sell' }).ok, false);
  const sale = { id, index: 1, action: 'sell' };
  const sold = resolveSpoil(restored, sale);
  assert.equal(sold.profile.gold, equipped.profile.gold + itemPrice(gear[2]));
  assert.deepEqual(resolveSpoil(sold.profile, sale).profile, sold.profile);
  assert.equal(acknowledgeReveal(sold.profile, id).profile.lastRun.pending, false);
});

test('only the first twelve sealed finds await decisions and any overflow sells for its exact item value', () => {
  const entries = Array.from({ length: MAX_CLAIMS + 2 }, (_, i) => ({ item: { ...gear[0], seed: i }, state: 'sealed' }));
  const run = { mode: 's15', time: 360, hero: 'knight', found: entries.length, sealedGear: true, spoils: packSpoils(entries), runId: makeRunId(), runFrom: 0 };
  const saved = applyRun(defaultProfile(), run);
  assert.equal(unpackSpoils(saved.profile.lastRun.claims).length, MAX_CLAIMS);
  assert.deepEqual(unpackSpoils(saved.profile.lastRun.spoils), entries.slice(MAX_CLAIMS).map(e => ({ ...e, state: 'sold' })));
  assert.equal(saved.reward.spoilsGold, itemPrice(gear[0]) * 2);
  assert.equal(saved.profile.gold, saved.reward.total + saved.reward.spoilsGold);
  assert.equal(applyRun(saved.profile, run).profile.gold, saved.profile.gold);
});

test('lost run and sale responses can be retried without a second payout', async () => {
  const server = createServer({ secret: 'expansion-spoils-test-secret'.padEnd(48, 'x'), devKey: '' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const previousFetch = globalThis.fetch, previousStorage = globalThis.localStorage;
  const previousState = { profile: store.profile, mode: store.mode, runOutbox: store.runOutbox, lastReward: store.lastReward };
  let cookie = '', drop = true, dropSale = true, runPosts = 0;
  const local = new Map();
  globalThis.localStorage = { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value), removeItem: key => local.delete(key) };
  globalThis.fetch = async (path, options = {}) => {
    const res = await previousFetch(url + path, { ...options, headers: { ...options.headers, cookie } });
    const profile = res.headers.getSetCookie().find(c => c.startsWith('fs_profile='));
    if (profile) cookie = profile.split(';')[0];
    if (path === '/api/run') {
      runPosts++;
      if (drop) {
        drop = false;
        await res.text();
        return new Response('partial response');
      }
    }
    if (path === '/api/spoils' && dropSale && JSON.parse(options.body).action === 'sell') {
      dropSale = false;
      await res.text();
      return new Response('partial response');
    }
    return res;
  };
  try {
    store.mode = 'server';
    store.profile = defaultProfile();
    store.runOutbox = null;
    const run = { mode: 's15', time: 280, hero: 'knight', gold: 25, found: 1, gear: {}, sealedGear: true, spoils: packSpoils([{ item: gear[2], state: 'sealed' }]), runId: makeRunId(), runFrom: 0 };
    assert.equal((await store.submitRun(run)).unsaved, true);
    store.runOutbox = null; // a fresh tab can reconstruct the exact request
    assert.deepEqual(store.pendingRun, run);
    const reward = await store.resumeRun();
    assert.equal(runPosts, 2);
    assert.equal(store.profile.runs, 1);
    assert.equal(store.profile.gold, reward.total);
    assert.equal(store.pendingReveal.claims, run.spoils);
    const sale = { id: run.runId, index: 0, action: 'sell' };
    assert.equal((await store.resolveSpoil(sale)).ok, false);
    assert.equal((await store.resolveSpoil(sale)).ok, true);
    assert.equal(store.profile.gold, reward.total + itemPrice(gear[2]));
    assert.equal(await store.acknowledgeReveal(run.runId), true);
    assert.equal(await store.acknowledgeReveal(run.runId), true);
    assert.equal(store.pendingReveal, null);
    assert.equal(local.size, 0);
    const state = await (await fetch('/api/state')).json();
    assert.equal(state.profile.lastRun.pending, false);
    assert.equal(state.profile.gold, reward.total + itemPrice(gear[2]));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
    Object.assign(store, previousState);
    await new Promise(resolve => server.close(resolve));
  }
});

test('reels wind down deterministically and end precisely on the settled symbol', () => {
  assert.equal(reelProgress(0.2, 0.4, 1), 0);
  assert.equal(reelProgress(2, 0.4, 1), 1);
  for (let seed = 0; seed < 8; seed++) {
    assert.ok(reelPosition(0, seed) >= 10);
    assert.ok(reelPosition(0.3, seed) > reelPosition(0.8, seed));
    assert.equal(reelPosition(1, seed), 0);
  }
});
