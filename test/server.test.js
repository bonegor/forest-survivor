import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from '../server.js';
import { encodeState } from '../public/js/shared/profile.js';

const SECRET = 'test-secret-'.padEnd(40, 'x');

async function withServer(fn, opts = {}) {
  const server = createServer({ secret: SECRET, devKey: '', ...opts });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

// A minimal cookie jar so requests behave like a browser.
function client(base) {
  const jar = {};
  const store = (res) => {
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(';');
      const [k, v] = pair.split('=');
      if (attrs.some((a) => a.trim() === 'Max-Age=0')) delete jar[k];
      else jar[k] = v;
    }
  };
  const cookie = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  return {
    jar,
    async get(path) {
      const res = await fetch(base + path, { headers: { cookie: cookie() } });
      store(res);
      return res;
    },
    async post(path, body) {
      const res = await fetch(base + path, {
        method: 'POST',
        headers: { cookie: cookie(), 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      store(res);
      return res;
    },
  };
}

test('serves the game shell and blocks path traversal', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /<canvas/);
    const js = await fetch(base + '/js/shared/profile.js');
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /javascript/);
    const bad = await fetch(base + '/..%2fserver.js');
    assert.ok([403, 404].includes(bad.status));
    const missing = await fetch(base + '/nope.js');
    assert.equal(missing.status, 404);
  });
});

test('profile lives in an encrypted cookie and survives round trips', async () => {
  await withServer(async (base) => {
    const c = client(base);
    let res = await c.get('/api/state');
    let data = await res.json();
    assert.equal(data.profile.gold, 0);
    assert.equal(data.checkpoint, null);

    res = await c.post('/api/run', { mode: 's15', diff: 'medium', victory: true, time: 900, gold: 300, kills: 2000, level: 35 });
    data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.profile.gold, 300 + 300);
    assert.ok(c.jar.fs_profile, 'profile cookie set');
    assert.match(c.jar.fs_profile, /^e1\.[A-Za-z0-9_-]+$/);
    const raw = Buffer.from(c.jar.fs_profile.slice(3), 'base64url').toString('latin1');
    assert.doesNotMatch(raw, /gold|"wins"/, 'contents are not readable');

    res = await c.get('/api/state');
    data = await res.json();
    assert.equal(data.profile.gold, 600);
    assert.equal(data.profile.wins.s15[1], 1);

    res = await c.post('/api/buy', { id: 'might' });
    data = await res.json();
    assert.equal(data.profile.up.might, 1);
    assert.equal(data.profile.gold, 450);
  });
});

test('a tampered save is reported as unreadable, kept until the player starts fresh', async () => {
  await withServer(async (base) => {
    const c = client(base);
    await c.post('/api/run', { mode: 's15', diff: 'easy', victory: false, time: 300, gold: 100, kills: 10 });
    let data = await (await c.get('/api/state')).json();
    assert.equal(data.unreadable, undefined, 'a healthy save is not flagged');
    // Flip one byte of the ciphertext.
    const buf = Buffer.from(c.jar.fs_profile.slice(3), 'base64url');
    buf[20] ^= 1;
    const tampered = 'e1.' + buf.toString('base64url');
    c.jar.fs_profile = tampered;
    data = await (await c.get('/api/state')).json();
    assert.equal(data.profile.gold, 0, 'nothing is read from it');
    assert.deepEqual(data.unreadable, { profile: true, run: false });
    assert.equal(c.jar.fs_profile, tampered, 'the cookie is left alone until the player decides');
    data = await (await c.post('/api/reset', {})).json();
    assert.equal(data.profile.gold, 0);
    data = await (await c.get('/api/state')).json();
    assert.equal(data.unreadable, undefined, 'starting fresh replaces the bad save');
  });
});

test('saves from a server with a different key are unreadable, not silently wiped', async () => {
  let cookie;
  await withServer(async (base) => {
    const c = client(base);
    await c.post('/api/run', { mode: 's15', diff: 'easy', victory: false, time: 300, gold: 100, kills: 10 });
    cookie = c.jar.fs_profile;
  });
  await withServer(async (base) => {
    const c = client(base);
    c.jar.fs_profile = cookie;
    const data = await (await c.get('/api/state')).json();
    assert.deepEqual(data.unreadable, { profile: true, run: false });
  }, { secret: 'another-secret-'.padEnd(40, 'y') });
});

test('a profile cookie cannot pose as a saved run', async () => {
  await withServer(async (base) => {
    const c = client(base);
    await c.post('/api/run', { mode: 's15', diff: 'easy', victory: false, time: 300, gold: 100, kills: 10 });
    c.jar.fs_run = c.jar.fs_profile;
    const data = await (await c.get('/api/state')).json();
    assert.equal(data.checkpoint, null);
    assert.deepEqual(data.unreadable, { profile: false, run: true });
  });
});

test('old signed cookies are accepted once and re-issued encrypted', async () => {
  await withServer(async (base) => {
    const c = client(base);
    const body = encodeState({ gold: 777, heroes: ['knight'] });
    c.jar.fs_profile = `${body}.${createHmac('sha256', SECRET).update(body).digest('base64url')}`;
    let data = await (await c.get('/api/state')).json();
    assert.equal(data.profile.gold, 777, 'progress carries over');
    assert.equal(data.unreadable, undefined);
    assert.match(c.jar.fs_profile, /^e1\./, 'upgraded to the encrypted format');
    data = await (await c.get('/api/state')).json();
    assert.equal(data.profile.gold, 777);
    // A forged old-format cookie is still rejected.
    c.jar.fs_profile = `${encodeState({ gold: 999999 })}.${'A'.repeat(43)}`;
    data = await (await c.get('/api/state')).json();
    assert.equal(data.profile.gold, 0);
    assert.deepEqual(data.unreadable, { profile: true, run: false });
  });
});

test('checkpoints are saved, cleared by a finished run, and validated', async () => {
  await withServer(async (base) => {
    const c = client(base);
    const cp = { mode: 'dungeon', diff: 'hard', hero: 'knight', floor: 2, seed: 5, time: 400, level: 10, xp: 3, hp: 90, weapons: [['sword', 4]] };
    let data = await (await c.post('/api/checkpoint', { checkpoint: cp })).json();
    assert.equal(data.checkpoint.floor, 2);
    data = await (await c.get('/api/state')).json();
    assert.equal(data.checkpoint.hero, 'knight');

    const bad = await c.post('/api/checkpoint', { checkpoint: { mode: 'lol' } });
    assert.equal(bad.status, 400);

    // A Dungeon run is refused while the Dungeon is locked, and leaves the save alone.
    assert.equal((await c.post('/api/run', { mode: 'dungeon', diff: 'hard', victory: false, time: 500, floor: 2 })).status, 400);
    data = await (await c.get('/api/state')).json();
    assert.equal(data.checkpoint.hero, 'knight');
    await c.post('/api/run', { mode: 's15', diff: 'hard', victory: false, time: 500 });
    data = await (await c.get('/api/state')).json();
    assert.equal(data.checkpoint, null);
  });
});

test('rejects non-JSON posts and unknown routes', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/api/buy', { method: 'POST', body: 'id=might', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    assert.equal(res.status, 415);
    const c = client(base);
    assert.equal((await c.post('/api/nope', {})).status, 404);
  });
});

test('developer mode is off unless the server enables it', async () => {
  await withServer(async (base) => {
    const c = client(base);
    assert.deepEqual(await (await c.get('/api/dev')).json(), { enabled: false, open: false, authed: false });
    assert.equal((await c.post('/api/dev/profile', { profile: { gold: 1e6 } })).status, 404);
    assert.equal((await c.post('/api/dev/login', { key: '' })).status, 404);
    assert.equal((await (await c.get('/api/state')).json()).profile.gold, 0);
  });
});

test('with DEV_KEY, the panel must log in before it can edit a save', async () => {
  await withServer(async (base) => {
    const c = client(base);
    assert.deepEqual(await (await c.get('/api/dev')).json(), { enabled: true, open: false, authed: false });
    assert.equal((await c.post('/api/dev/profile', { profile: { gold: 5 } })).status, 403);
    assert.equal((await c.post('/api/dev/login', { key: 'guess' })).status, 403);
    assert.equal(c.jar.fs_dev, undefined);
    assert.equal((await c.post('/api/dev/login', { key: 'open-sesame' })).status, 200);
    assert.match(c.jar.fs_dev, /^e1\./, 'the session is an encrypted cookie');
    assert.equal((await (await c.get('/api/dev')).json()).authed, true);
    const everything = { gold: 123456, heroes: ['knight', 'archer', 'mage', 'rogue', 'necromancer'], feats: { necromancer: 7 }, ranked: { mage: 1800 }, up: { might: 99 } };
    const data = await (await c.post('/api/dev/profile', { profile: everything })).json();
    assert.equal(data.profile.gold, 123456);
    assert.equal(data.profile.up.might, 5, 'still sanitized');
    const state = await (await c.get('/api/state')).json();
    assert.equal(state.profile.ranked.mage, 1800);
    assert.equal(state.profile.feats.necromancer, 7);
    await c.post('/api/dev/logout', {});
    assert.equal((await c.post('/api/dev/profile', { profile: {} })).status, 403);
    // Another browser without the session can't edit.
    assert.equal((await client(base).post('/api/dev/profile', { profile: { gold: 9 } })).status, 403);
  }, { devKey: 'open-sesame' });
});

test('npm run dev opens developer mode without a key', async () => {
  await withServer(async (base) => {
    const c = client(base);
    assert.deepEqual(await (await c.get('/api/dev')).json(), { enabled: true, open: true, authed: true });
    const data = await (await c.post('/api/dev/profile', { profile: { gold: 777 } })).json();
    assert.equal(data.profile.gold, 777);
  }, { devOpen: true });
});
