import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { playGame } from '../tools/headless.mjs';
import { playCampaign, parseOrder, shop } from '../tools/campaign.mjs';
import * as P from '../public/js/shared/profile.js';

const strip = (c) => ({ ...c, runs: c.runs.map(({ ms, ...r }) => r) }); // wall time is all that may differ

test('a campaign plays from a fresh save, banks its runs and buys in the Armory, the same for a seed', () => {
  // Four runs: with the 45° sword (23 October 2026) three bank too little for a rank.
  const a = playCampaign({ hero: 'knight', bot: 'gems', diff: 'medium', runs: 4, seed: 1 }, playGame);
  assert.equal(a.runs.length, 4);
  assert.equal(a.won, 0, 'a bare Knight does not win his first nights');
  for (const r of a.runs) assert.ok(r.banked > 0 && r.wage > 0 && r.banked === r.collected + r.wage + r.bonus, `run ${r.run} banks`);
  // The gold banked is the gold spent plus the gold left: every rank at the game's price.
  const spent = Object.entries(a.profile.up).reduce((s, [id, n]) => s + Array.from({ length: n }, (_, k) => P.upgradeCost(id, k)).reduce((x, y) => x + y, 0), 0);
  assert.ok(spent > 0, 'it bought a rank');
  assert.equal(a.runs.reduce((s, r) => s + r.banked, 0), spent + a.profile.gold);
  assert.equal(a.profile.runs, 4);
  assert.deepEqual(strip(playCampaign({ hero: 'knight', bot: 'gems', diff: 'medium', runs: 4, seed: 1 }, playGame)), strip(a));
});

test('the Armory is bought by tiers, cheapest first, saving for the tier', () => {
  assert.deepEqual(parseOrder('vitality,armor/might'), [['vitality', 'armor'], ['might']]);
  assert.throws(() => parseOrder('nope'), /Unknown Armory upgrade/);
  const p = { ...P.defaultProfile(), gold: 400 };
  // Vitality's first rank (90) and Armor's (125), then Vitality's second (360) is out of reach:
  // the gold is saved for it, not spent on Might.
  const s = shop(p, parseOrder('vitality,armor/might'));
  assert.deepEqual(s.bought, ['vitality', 'armor']);
  assert.equal(s.profile.gold, 400 - 90 - 125);
  assert.deepEqual(shop({ ...P.defaultProfile(), gold: 400 }, parseOrder('might')).bought, ['might', 'might']);
});

test('the command line prints a campaign report', () => {
  const cli = fileURLToPath(new URL('../tools/campaign.mjs', import.meta.url));
  const out = execFileSync(process.execPath, [cli, '--runs=1', '--campaigns=2', '--max=20', '--jobs=2'], { encoding: 'utf8' });
  assert.match(out, /== knight · gems ==/);
  assert.match(out, /runs to the first win: not within 1/);
  assert.match(out, /^\s+banked\s+\d+/m);
});
