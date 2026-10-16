// A run is never saved while it lasts. The owner: "we should not have continue at all; progress
// is only saved after the run is done by either death, quitting, or winning and returning to
// menu". So no run cookie is written during a run, on the game server or on static hosting; one
// a player still has from before is deleted when the game loads; and the server has no endpoint
// for one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + '/' + file).href);
const RUN_COOKIES = ['fs_run', 'fs_lrun', 'fs_drun'];
const SECRET = 'test-secret-'.padEnd(40, 'x');

// The browser, as far as the save needs one: an address (not the debug one) and a cookie jar.
// Cookies the page can see (document.cookie) and the server's HttpOnly ones are kept apart, and
// every cookie ever set (not deleted) is listed in `written`.
globalThis.location = { protocol: 'http:', hostname: 'localhost', search: '' };
const jar = { page: new Map(), http: new Map() };
const written = [];
function setCookie(where, line) {
  const [pair, ...attrs] = line.split(';');
  const i = pair.indexOf('=');
  const name = pair.slice(0, i).trim(), value = pair.slice(i + 1);
  if (attrs.some((a) => a.trim() === 'Max-Age=0')) return jar[where].delete(name);
  jar[where].set(name, value);
  written.push(name);
}
const cookieLine = (...maps) => maps.flatMap((m) => [...m]).map(([k, v]) => `${k}=${v}`).join('; ');

// The game's browser/canvas substitutes; the game, the store, the server and the profile rules stay real.
await mod('tools/headless.mjs');
Object.defineProperty(document, 'cookie', {
  configurable: true,
  get: () => cookieLine(jar.page),
  set: (line) => setCookie('page', line),
});
const { createServer } = await mod('server.js');
const { store, unlockEverything } = await mod('public/js/engine/storage.js');
const { GameScreen } = await mod('public/js/ui/gamescreen.js');
const { UI } = await mod('public/js/ui/ui.js');
const { view } = await mod('public/js/engine/view.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

const ctx = document.createElement('canvas').getContext('2d');
Object.assign(view, { ctx, uctx: ctx, W: 480, H: 270, S: 1, pxW: 480, pxH: 270 });
const realFetch = globalThis.fetch;

// The game served by the game server (its /api answers, with cookies as a browser sends them),
// or as plain static files (no /api at all: every call is a 404).
async function hosting(kind, fn) {
  jar.page.clear();
  jar.http.clear();
  written.length = 0;
  if (kind === 'static') {
    globalThis.fetch = async () => new Response('Not found', { status: 404 });
    try {
      return await fn();
    } finally {
      globalThis.fetch = realFetch;
    }
  }
  const server = createServer({ secret: SECRET, devOpen: true });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = async (url, o = {}) => {
    const res = await realFetch(base + url, { ...o, headers: { ...o.headers, cookie: cookieLine(jar.page, jar.http) } });
    for (const line of res.headers.getSetCookie()) setCookie('http', line);
    return res;
  };
  try {
    return await fn(base);
  } finally {
    globalThis.fetch = realFetch;
    await new Promise((r) => server.close(r));
  }
}

// A run as the player has it: the game screen over the store, played for `seconds`, then the
// hero falls and the results screen reports the run. No horde comes, and level-ups, chests and
// gear are waved through. The game once saved the run as it began, at each Dungeon floor and every
// minute; that code is gone, so a few seconds and a floor down are enough to show nothing is
// written until the run ends.
async function playRun(mode, seconds) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(5);
  input.bot = { x: 0, y: 0 };
  const gs = new GameScreen();
  try {
    gs.enter({ ui: new UI(), settings: { numbers: false }, devHold: false, store, choice: { hero: 'knight', mode, diff: 'medium' } });
    const g = gs.game, p = g.player;
    g.spawner.update = () => {};
    p.devGod = true;
    const dt = 1 / 30;
    for (let t = 0; t < seconds; t += dt) {
      gs.frame(dt);
      if (gs.overlay) {
        gs.overlay = null;
        g.pendingLevels = 0;
        g.chestQueue.length = 0;
        g.itemQueue.length = 0;
        g.state = 'play';
      }
      if (mode === 'dungeon' && g.floor === 1 && t > 2) g.enterFloor(2); // down the stairs
    }
    if (mode === 'dungeon') assert.equal(g.floor, 2);
    p.devGod = false;
    p.invuln = 0;
    p.revivals = 0;
    p.hurt(1e9);
    for (let i = 0; i < 1000 && !gs.overlay; i++) gs.frame(dt);
    const results = gs.overlay;
    assert.equal(g.state, 'over', 'the hero fell, and the results are up');
    for (let i = 0; i < 200 && !results.reward; i++) await new Promise((r) => setTimeout(r, 5));
    assert.ok(results.reward, 'the run was reported');
    return results.reward;
  } finally {
    gs.leave();
    input.bot = oldBot;
    input.endFrame();
    Math.random = oldRandom;
  }
}

test('no run cookie is written while a run lasts, on the game server or on static hosting', async () => {
  for (const kind of ['server', 'static']) {
    await hosting(kind, async () => {
      await store.init();
      assert.equal(store.mode, kind === 'server' ? 'server' : 'local');
      // Every mode open (the Dungeon too), as the developer panel sets it.
      await store.devSaveProfile(unlockEverything(P.defaultProfile()));
      written.length = 0;
      for (const mode of ['s15', 'dungeon']) {
        const runs = store.profile.runs;
        const reward = await playRun(mode, 3);
        assert.ok(!reward.unsaved, `${kind}, ${mode}: the run's end was saved`);
        assert.equal(store.profile.runs, runs + 1, `${kind}, ${mode}: and counted`);
      }
      for (const name of RUN_COOKIES) assert.ok(!written.includes(name), `${kind}: ${name} was never written`);
      assert.deepEqual([...new Set(written)], [kind === 'server' ? 'fs_profile' : 'fs_lprofile'], `${kind}: only the profile, as each run ended`);
    });
  }
});

test('a run cookie left from before is deleted when the game loads', async () => {
  await hosting('server', async () => {
    jar.http.set('fs_run', 'e1.' + 'A'.repeat(80));
    jar.page.set('fs_lrun', P.encodeState({ mode: 's15', hero: 'knight' }));
    jar.page.set('fs_drun', 'junk');
    await store.init();
    assert.equal(store.mode, 'server');
    for (const name of RUN_COOKIES) assert.ok(!jar.page.has(name) && !jar.http.has(name), `${name} is gone`);
    assert.equal(store.unreadable, null, 'and nothing is flagged unreadable for it');
  });
  await hosting('static', async () => {
    jar.page.set('fs_lrun', P.encodeState({ mode: 's15', hero: 'knight' }));
    jar.page.set('fs_lprofile', P.encodeState(P.packProfile({ ...P.defaultProfile(), gold: 42 })));
    await store.init();
    assert.equal(store.mode, 'local');
    assert.ok(!jar.page.has('fs_lrun'), 'the static game\'s is gone too');
    assert.equal(store.profile.gold, 42, 'the profile stays');
    assert.equal(store.unreadable, null);
  });
});

test('the server has no run to give or take: /api/checkpoint is gone, /api/state holds no run', async () => {
  await hosting('server', async (base) => {
    for (const body of [{ checkpoint: { mode: 's15', diff: 'hard', hero: 'knight' } }, { checkpoint: null }]) {
      const res = await realFetch(base + '/api/checkpoint', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      assert.equal(res.status, 404, 'like any unknown endpoint');
      assert.equal(res.headers.getSetCookie().length, 0);
    }
    const res = await realFetch(base + '/api/state', { headers: { cookie: 'fs_run=e1.AAAA' } });
    const data = await res.json();
    assert.deepEqual(Object.keys(data).sort(), ['profile', 'server'], 'no run, no checkpoint, nothing unreadable');
    assert.deepEqual(res.headers.getSetCookie().map((c) => c.split(';')[0]), ['fs_run='], 'the stale one is deleted');
    assert.match(res.headers.getSetCookie()[0], /Max-Age=0/);
  });
});

test('a forged run report is held to what its mode allows', () => {
  const p = P.defaultProfile();
  const forged = { mode: 's15', diff: 'hard', hero: 'knight', victory: true, time: 900, kills: 1e6, level: 999, floor: 1, gold: 1e9, realTime: 14400, found: 721 };
  const r = P.applyRun(p, forged);
  assert.ok(r.ok);
  // Two hours at most for the night with its crypts, and a crypt every 45 seconds at most, each
  // with four lords at most, each of them dropping one find at most.
  const cap = Math.round((100 + 7200 * 12 + 4 * (7200 / 45 + 1) * 750) * 1.5) + 500;
  assert.ok(r.reward.total <= cap, `paid ${r.reward.total}, at most ${cap}`);
  assert.equal(P.sanitizeRun({ ...forged, mode: 'dungeon' }).found, 0, 'the Dungeon has no crypts, so nothing is found in it');
});
