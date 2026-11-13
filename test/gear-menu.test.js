import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { SpoilsReveal } from '../public/js/ui/reward-reels.js';
import { UI } from '../public/js/ui/ui.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { rollItem, itemPrice } from '../public/js/shared/items.js';
import { applyRun, defaultProfile, resolveSpoil } from '../public/js/shared/profile.js';
import { makeRunId, packSpoils, unpackSpoils } from '../public/js/shared/spoils.js';

const common = rollItem(mulberry32(1), { slot: 'boots' });
const magical = rollItem(mulberry32(49), { slot: 'ring' });
const ctx = document.createElement('canvas').getContext('2d');
function review(count = 12, W = 320, H = 240) {
  const items = Array.from({ length: count }, (_, i) => ({ ...(i % 2 ? common : magical), seed: i + 1 }));
  const saved = applyRun(defaultProfile(), { mode: 's15', hero: 'knight', time: 300, found: count,
    sealedGear: true, runId: makeRunId(), runFrom: 0, spoils: packSpoils(items.map(item => ({ item, state: 'sealed' }))) });
  assert.equal(saved.ok, true);
  const ui = new UI(), store = {
    profile: saved.profile, calls: [],
    get pendingReveal() { return this.profile.lastRun; },
    async resolveSpoil(decision) {
      this.calls.push(decision);
      const result = resolveSpoil(this.profile, decision);
      this.profile = result.profile;
      return result;
    },
  };
  const reveal = new SpoilsReveal({ ui, store }, store.pendingReveal);
  const draw = () => reveal.draw(ctx, W, H, 1);
  const press = async id => {
    draw(); ui.focus(id); input.justDown.add('Enter');
    try { draw(); } finally { input.justDown.clear(); }
    await Promise.resolve();
  };
  return { items, ui, store, reveal, draw, press };
}

test('gear decisions remain separated and on screen from short-wide to narrow-portrait layouts', async () => {
  for (const [W, H] of [[580, 216], [480, 270], [320, 240], [293, 633], [240, 210]]) {
    const r = review(12, W, H), visited = new Set(), before = JSON.stringify(r.store.profile);
    for (let page = 0; page < 12; page++) {
      r.draw();
      for (const control of r.ui.items) {
        assert.ok(control.x >= 0 && control.y >= 0 && control.x + control.w <= W && control.y + control.h <= H,
          `${W}x${H}: ${control.id} is inside the viewport`);
        if (control.id.startsWith('find_')) visited.add(Number(control.id.slice(5)));
      }
      for (const [i, a] of r.ui.items.entries()) for (const b of r.ui.items.slice(i + 1)) {
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.equal(overlap, false, `${W}x${H}: ${a.id} and ${b.id} remain separate targets`);
      }
      const next = r.ui.items.find(item => item.id === 'finds_next');
      if (!next || next.disabled) break;
      await r.press('finds_next');
    }
    assert.deepEqual([...visited].sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i));
    assert.equal(JSON.stringify(r.store.profile), before, 'browsing every page does not settle or sell loot');
  }
});

test('review and quick sale on later pages act on the shown find and retain pending magic', async () => {
  const r = review();
  await r.press('finds_next'); await r.press('finds_next');
  r.draw();
  assert.equal(r.reveal.overviewPage, 2);
  assert.ok(r.ui.items.some(item => item.id === 'find_4'));
  assert.ok(!r.ui.items.some(item => item.id === 'quick_sell_4'), 'magical finds require review');
  await r.press('find_4');
  assert.equal(r.reveal.claim, 4);
  assert.equal(r.store.calls.length, 0, 'review itself does not commit a decision');
  await r.press('claim_back');
  assert.equal(r.reveal.overviewPage, 2, 'return to the same page');
  const gold = r.store.profile.gold;
  await r.press('quick_sell_5');
  assert.equal(r.store.calls.length, 1);
  assert.equal(r.store.calls[0].index, 5);
  assert.equal(r.store.profile.gold, gold + itemPrice(r.items[5]));
  assert.deepEqual(unpackSpoils(r.store.pendingReveal.claims).map(item => item.state),
    Array.from({ length: 12 }, (_, i) => i === 5 ? 'sold' : 'sealed'));
});

test('a save in progress disables review, sale and paging so a repeated input cannot sell twice', async () => {
  const r = review();
  let finish;
  r.store.resolveSpoil = decision => new Promise(resolve => {
    r.store.calls.push(decision);
    finish = () => { const result = resolveSpoil(r.store.profile, decision); r.store.profile = result.profile; resolve(result); };
  });
  await r.press('quick_sell_1');
  assert.equal(r.reveal.saving, true);
  r.draw();
  assert.ok(r.ui.items.every(item => item.disabled));
  await r.press('quick_sell_1');
  assert.equal(r.store.calls.length, 1);
  finish(); await Promise.resolve(); await Promise.resolve();
  assert.equal(r.reveal.saving, false);
  r.draw();
  assert.ok(r.ui.items.some(item => !item.disabled));
});
