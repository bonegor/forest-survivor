import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { createServer } from '../server.js';
import { encodeState, UPGRADES, PROGRESS } from '../public/js/shared/profile.js';

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

// A GET sent exactly as written: fetch would tidy the path (drop the "/." that makes the server
// read "//evil.com" as a path) before it left.
const rawGet = (base, path) => new Promise((resolve, reject) => {
  const { hostname, port } = new URL(base);
  http.get({ hostname, port, path }, (res) => {
    res.resume();
    resolve(res);
  }).on('error', reject);
});

test('a folder asked for without its slash goes on to its index on this site, query and all', async () => {
  await withServer(async (base) => {
    // "//evil.com/..": a path that names a folder (js) on the way, and would send the browser off-site.
    for (const path of ['/.//evil.com/..%2Fjs', '/.///evil.com/..%2Fjs', '//evil.com/..%2Fjs']) {
      const res = await rawGet(base, path);
      if (res.statusCode !== 301) continue;
      const to = res.headers.location;
      assert.match(to, /^\/[^/\\]/, `${path} -> ${to}: a path on this site`);
      assert.equal(new URL(to, base).origin, base, path);
    }
    const res = await rawGet(base, '/.//evil.com/..%2Fjs');
    assert.equal(res.statusCode, 301, 'the folder is found');
    assert.equal(res.headers.location, '/evil.com/..%2Fjs/');
    const bare = await fetch(base + '/cm2mqvquqkf?x=1', { redirect: 'manual' });
    assert.equal(bare.status, 301);
    assert.equal(bare.headers.get('location'), '/cm2mqvquqkf/?x=1', 'the query string comes along');
  });
});

test('a JSON body that is not an object is the client\'s mistake: 400, nothing logged', async () => {
  const logged = [];
  const error = console.error;
  console.error = (...a) => logged.push(a);
  try {
    await withServer(async (base) => {
      const c = client(base);
      for (const route of ['/api/run', '/api/buy', '/api/refund', '/api/reset']) {
        for (const body of [null, 42, [], ['might'], 'might', true]) {
          const res = await c.post(route, body);
          assert.equal(res.status, 400, `${route} ${JSON.stringify(body)}`);
          assert.equal((await res.json()).error, 'Expected a JSON object');
        }
      }
      assert.equal((await c.post('/api/buy', {})).status, 400, 'an empty object is still checked as one');
    });
    await withServer(async (base) => {
      assert.equal((await client(base).post('/api/dev/login', null)).status, 400);
    }, { devKey: 'open-sesame' });
  } finally {
    console.error = error;
  }
  assert.deepEqual(logged, [], 'no stack trace in the log');
});

test('the page carries the server\'s content security policy for static hosts', async () => {
  // GitHub Pages sends no headers of ours, so index.html repeats the policy in a meta tag:
  // all of it but frame-ancestors, which browsers ignore there.
  await withServer(async (base) => {
    const res = await fetch(base + '/');
    const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(await res.text())?.[1];
    assert.ok(meta, 'index.html has a policy');
    const rules = (s) => s.split(';').map((r) => r.trim()).filter((r) => r && !r.startsWith('frame-ancestors')).sort();
    assert.deepEqual(rules(meta), rules(res.headers.get('content-security-policy')));
  });
});

test('music streams whole or in byte ranges, exactly the bytes asked for', async () => {
  const { readFileSync } = await import('node:fs');
  const file = readFileSync(new URL('../public/audio/music/crypt.mp3', import.meta.url));
  await withServer(async (base) => {
    const url = base + '/audio/music/crypt.mp3';
    const whole = await fetch(url);
    assert.equal(whole.status, 200);
    assert.equal(whole.headers.get('accept-ranges'), 'bytes');
    assert.ok(Buffer.from(await whole.arrayBuffer()).equals(file));
    const part = await fetch(url, { headers: { range: 'bytes=1000-1999' } });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), `bytes 1000-1999/${file.length}`);
    assert.ok(Buffer.from(await part.arrayBuffer()).equals(file.subarray(1000, 2000)));
    const tail = await fetch(url, { headers: { range: 'bytes=-500' } });
    assert.ok(Buffer.from(await tail.arrayBuffer()).equals(file.subarray(file.length - 500)));
    const open = await fetch(url, { headers: { range: `bytes=${file.length - 10}-` } });
    assert.equal((await open.arrayBuffer()).byteLength, 10);
    const past = await fetch(url, { headers: { range: `bytes=${file.length}-` } });
    assert.equal(past.status, 416);
    await past.arrayBuffer();
    const head = await fetch(url, { method: 'HEAD' });
    assert.equal(Number(head.headers.get('content-length')), file.length);
  });
});

test('profile lives in an encrypted cookie and survives round trips', async () => {
  await withServer(async (base) => {
    const c = client(base);
    let res = await c.get('/api/state');
    let data = await res.json();
    assert.equal(data.profile.gold, 0);
    assert.deepEqual(Object.keys(data).sort(), ['profile', 'server'], 'the profile, and no run');

    res = await c.post('/api/run', { mode: 's15', diff: 'hard', victory: true, time: 900, gold: 300, kills: 2000, level: 35 });
    data = await res.json();
    assert.equal(res.status, 200);
    // Veteran's gold rate and victory bonus, and the wage for 15 minutes at its rate (shared/progress.js).
    assert.equal(data.profile.gold, 300 * 1.5 + 200 * 2.5 + 900 * PROGRESS.wage * 1.5);
    assert.deepEqual(Object.keys(c.jar), ['fs_profile'], 'the profile is the one cookie');
    assert.ok(c.jar.fs_profile, 'profile cookie set');
    assert.match(c.jar.fs_profile, /^e1\.[A-Za-z0-9_-]+$/);
    const raw = Buffer.from(c.jar.fs_profile.slice(3), 'base64url').toString('latin1');
    assert.doesNotMatch(raw, /gold|"wins"/, 'contents are not readable');

    res = await c.get('/api/state');
    data = await res.json();
    const paid = 950 + 900 * PROGRESS.wage * 1.5;
    assert.equal(data.profile.gold, paid);
    assert.equal(data.profile.wins.s15[2], 1);

    res = await c.post('/api/buy', { id: 'might' });
    data = await res.json();
    assert.equal(data.profile.up.might, 1);
    assert.equal(data.profile.gold, paid - 75, 'the first rank at half price');
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
    assert.deepEqual(data.unreadable, { profile: true });
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
    assert.deepEqual(data.unreadable, { profile: true });
  }, { secret: 'another-secret-'.padEnd(40, 'y') });
});

test('a profile cookie cannot pose as a developer session', async () => {
  await withServer(async (base) => {
    const c = client(base);
    await c.post('/api/run', { mode: 's15', diff: 'easy', victory: false, time: 300, gold: 100, kills: 10 });
    c.jar.fs_dev = c.jar.fs_profile;
    assert.equal((await (await c.get('/api/dev')).json()).authed, false);
    assert.equal((await c.post('/api/dev/profile', { profile: { gold: 1e6 } })).status, 403);
  }, { devKey: 'open-sesame' });
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
    assert.deepEqual(data.unreadable, { profile: true });
  });
});

test('a run report is paid at its difficulty\'s rate, Normal when it names none', async () => {
  await withServer(async (base) => {
    const c = client(base);
    // A Dungeon run is refused while the Dungeon is locked, and leaves the save alone.
    assert.equal((await c.post('/api/run', { mode: 'dungeon', diff: 'hard', victory: false, time: 500, floor: 2 })).status, 400);
    assert.equal(c.jar.fs_profile, undefined);
    // No diff: Normal, gold as found and Normal's victory bonus (Veteran pays ×1.5 and ×2.5).
    let data = await (await c.post('/api/run', { mode: 's15', victory: true, time: 900, gold: 300, kills: 2000, level: 35 })).json();
    assert.deepEqual([data.reward.collected, data.reward.bonus, data.reward.multiplier], [300, 200 * 1.5, 1]);
    // And the wage for the time on the clock (shared/progress.js), at the same rate.
    const wage = (secs, rate) => Math.round(secs * PROGRESS.wage * rate);
    assert.equal(data.profile.gold, 600 + wage(900, 1));
    assert.equal(data.profile.wins.s15[1], 1, 'a Normal win');
    data = await (await c.post('/api/run', { mode: 's15', diff: 'medium', victory: false, time: 500, gold: 100 })).json();
    assert.equal(data.reward.total, 100 + wage(500, 1));
    data = await (await c.post('/api/run', { mode: 's15', diff: 'hard', victory: false, time: 500, gold: 100 })).json();
    assert.equal(data.reward.total, 150 + wage(500, 1.5));
    assert.equal(data.profile.gold, 600 + 100 + 150 + wage(900, 1) + wage(500, 1) + wage(500, 1.5));
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
    assert.equal(data.profile.up.might, UPGRADES.find((u) => u.id === 'might').max, 'still sanitized');
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

// All nine heroes (the four of 20 October 2026 too) in six legendaries each, every record at its
// most: the biggest profile there is, sealed by the server into its cookie, still a cookie a
// browser keeps (4 096 bytes, its name included), and read back whole.
test('a maximal save of all nine heroes fits the sealed cookie and reads back whole', async () => {
  const P = await import('../public/js/shared/profile.js');
  const I = await import('../public/js/shared/items.js');
  assert.equal(P.HERO_ORDER.length, 9);
  const p = P.defaultProfile();
  Object.assign(p, { gold: 1e9, runs: 1e7, kills: 1e12, heroes: [...P.HERO_ORDER] });
  p.best = { s15: 960, dungeon: 4, kills: 1e7, level: 999 };
  for (const m of P.WIN_MODES) p.wins[m] = [1e6, 1e6, 1e6];
  for (const u of P.UPGRADES) p.up[u.id] = u.max;
  const legend = (slot) => {
    const stats = {};
    for (const id of I.POOLS[slot].slice(-4)) stats[id] = I.statRange(id, I.LEGENDARY)[1];
    return { slot, rarity: I.LEGENDARY, stats, power: 'undying', seed: 999999 };
  };
  for (const h of P.HERO_ORDER) {
    p.feats[h] = 7;
    p.ranked[h] = 14400;
    p.gear[h] = Object.fromEntries(I.SLOTS.map((s) => [s, legend(s)]));
  }
  await withServer(async (base) => {
    const c = client(base);
    const res = await c.post('/api/dev/profile', { profile: p });
    assert.equal(res.status, 200);
    const line = res.headers.getSetCookie().find((s) => s.startsWith('fs_profile='));
    const pair = line.split(';')[0];
    assert.ok(pair.length <= 4096 - 256, `${pair.length} bytes, with room to spare under 4 096`);
    const back = await (await c.get('/api/state')).json();
    assert.deepEqual(back.profile, P.sanitizeProfile(p), 'every hero, every piece, read back');
  }, { devOpen: true });
});
