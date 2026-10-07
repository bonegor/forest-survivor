import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

async function withServer(fn) {
  const server = createServer({ secret: 'test-secret-'.padEnd(40, 'x') });
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

test('profile lives in a signed cookie and survives round trips', async () => {
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

test('tampered cookies are ignored', async () => {
  await withServer(async (base) => {
    const c = client(base);
    await c.post('/api/run', { mode: 's15', diff: 'easy', victory: false, time: 300, gold: 100, kills: 10 });
    const [body, sig] = c.jar.fs_profile.split('.');
    const forged = JSON.parse(Buffer.from(body, 'base64url').toString());
    forged.gold = 999999;
    c.jar.fs_profile = Buffer.from(JSON.stringify(forged)).toString('base64url') + '.' + sig;
    const data = await (await c.get('/api/state')).json();
    assert.equal(data.profile.gold, 0, 'forged profile falls back to a fresh one');
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

    await c.post('/api/run', { mode: 'dungeon', diff: 'hard', victory: false, time: 500, floor: 2 });
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
