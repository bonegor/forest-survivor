// The debug address. The user: "in the game, unlock everything under the address that has
// appended "/debug" or something similar", and "on the debug, we also need that I can freely
// edit the upgrade screen".
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import * as P from '../public/js/shared/profile.js';

// The browser as the published game sees it at gamevibe.si/?<the debug flag>: its cookies in a jar, and
// no game server (nor should it be asked).
const jar = new Map();
globalThis.document = {
  get cookie() {
    return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  },
  set cookie(s) {
    const pair = s.split(';')[0], i = pair.indexOf('=');
    if (/Max-Age=0\b/.test(s)) jar.delete(pair.slice(0, i));
    else jar.set(pair.slice(0, i), pair.slice(i + 1));
  },
};
const { DEBUG_FLAG } = await import('../public/js/engine/debugflag.js');
globalThis.location = { search: '?' + DEBUG_FLAG, hostname: 'gamevibe.si', protocol: 'https:' };
const realFetch = globalThis.fetch;
// The player's own save, as the plain address keeps it: one hero, no Armory.
const own = P.encodeState(P.packProfile({ ...P.defaultProfile(), gold: 40, up: { might: 1 } }));
jar.set('fs_lprofile', own);
const { store, DEBUG } = await import('../public/js/engine/storage.js');

test('the debug folder forwards to the game with the debug flag, on the server as on GitHub Pages', async () => {
  const server = createServer({ secret: 'test-secret-'.padEnd(40, 'x'), devKey: '' });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const bare = await realFetch(base + '/cm2mqvquqkf', { redirect: 'manual' });
    assert.equal(bare.status, 301);
    assert.equal(bare.headers.get('location'), '/cm2mqvquqkf/');
    const page = await realFetch(base + '/cm2mqvquqkf/');
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(`<meta http-equiv="refresh" content="0; url=../?${DEBUG_FLAG}">`), 'forwards with the flag');
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.ok(!/<script/.test(html), 'no script for the policy to block');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('at the debug flag every hero and mode is open, in a save of its own', async () => {
  assert.equal(DEBUG, true);
  globalThis.fetch = () => assert.fail('the debug save never asks a server');
  try {
    await store.init();
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(store.mode, 'local');
  const p = store.profile;
  assert.deepEqual(p.heroes, P.HERO_ORDER, 'every hero');
  for (const hero of P.HERO_ORDER) for (const mode of P.MODES) assert.ok(P.canPlay(p, mode, hero), `${hero} in ${mode}`);
  assert.equal(p.gold, 0, 'not the player\'s own save');
  // Every weapon, relic and ultimate open (shared/progress.js), and all six slots of each.
  assert.deepEqual(p.up, { arsenal: 3, reliquary: 3, phoenix: 1 });
  const open = P.openFor(p, 'knight');
  const all = (type) => P.progressList(p).filter((l) => l.type === type).length;
  assert.ok(open.ult && open.weapons.length === all('weapon') && open.relics.length === all('relic') && all('weapon') === 23 && all('relic') === 22, 'everything open');
  assert.ok(P.progressList(p).every((l) => l.open));
  // A run played there is kept there, its unlocks with it.
  const reward = await store.submitRun({ mode: 'ranked', diff: 'hard', hero: 'necromancer', victory: false, time: 120, realTime: 120, kills: 50, level: 6, floor: 1, gold: 30 });
  assert.ok(reward.total > 0, 'the run counts');
  assert.ok(jar.has('fs_dprofile'));
  assert.equal(jar.get('fs_lprofile'), own, 'the player\'s own save is untouched');
  await store.init();
  assert.ok(store.profile.gold > 0 && P.canPlay(store.profile, 'dungeon', 'rogue'), 'and read back');
  // Starting afresh there starts afresh with everything open still.
  await store.reset();
  assert.deepEqual(store.profile.heroes, P.HERO_ORDER);
  assert.equal(jar.get('fs_lprofile'), own);
});

test('at the debug flag the Armory is set freely, at no cost', async () => {
  await store.init();
  const gold = store.profile.gold;
  assert.ok(store.setUpgrades({ might: 8, echo: 1, revival: 2 }));
  // (Arsenal and Reliquary full from the start there: storage.js unlockEverything.)
  const slots = { arsenal: 3, reliquary: 3, phoenix: 1 };
  assert.deepEqual(store.profile.up, { ...slots, might: 8, echo: 1, revival: 2 });
  assert.equal(store.profile.gold, gold, 'no gold spent');
  assert.ok(store.setUpgrades({ might: 3, echo: 0, armor: 99, nonsense: 4 }));
  assert.deepEqual(store.profile.up, { ...slots, might: 3, revival: 2, armor: 5 }, 'any rank, within each upgrade\'s');
  await store.init();
  assert.deepEqual(store.profile.up, { ...slots, might: 3, revival: 2, armor: 5 }, 'kept in the debug save');
  assert.equal(P.metaBonuses(store.profile).revival, 2, 'and the runs get them');
  assert.equal(jar.get('fs_lprofile'), own);
});

// The token is typed out in the pages that link to the debug game: the owner's link list, the
// menu-music audition, the weapons reference and the forwarding folder. Each must carry today's.
test('every page that links to the debug game links with the debug flag', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const pub = new URL('../public/', import.meta.url);
  const PAGES = ['nb5hzpva1bhd', 'j1mcxslbbgsw', 'bvbu8zapqun8', 'cm2mqvquqkf'];
  const dirs = (await readdir(pub, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const dir of PAGES) assert.ok(dirs.includes(dir), `${dir}/ is there`);
  for (const dir of dirs) {
    const html = await readFile(new URL(`${dir}/index.html`, pub), 'utf8').catch(() => '');
    const flags = [...html.matchAll(/\.\.\/\?([\w-]+)/g)].map((m) => m[1]);
    if (PAGES.includes(dir)) assert.ok(flags.length, `${dir} links to the debug game`);
    for (const flag of flags) assert.equal(flag, DEBUG_FLAG, `${dir}'s link to the debug game`);
  }
});
