// The itch.io release (tools/build-itch.mjs) and the save it needs. On itch.io the game plays in a
// frame of another site's, where browsers block or partition cookies, so without the server the
// save and the settings are kept in localStorage (engine/storage.js saveBox), moving across from a
// cookie of before; the release is the game without the developer panel, the bots, the unlisted
// pages or the music candidates, and with its RELEASE switch on (engine/build.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { buildItch, releaseFiles, zipFiles, crc32 } from '../tools/build-itch.mjs';

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
globalThis.location = { search: '', hostname: 'html-classic.itch.zone', protocol: 'https:' };
const { saveBox, loadSettings, saveSettings } = await import('../public/js/engine/storage.js');

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('without the server the save is kept in localStorage, a cookie of before moving across once', () => {
  jar.clear();
  const ls = (globalThis.localStorage = fakeStorage());
  try {
    jar.set('fs_lprofile', 'OLD');
    assert.equal(saveBox.read('fs_lprofile'), 'OLD', 'the cookie save is read');
    assert.equal(ls.m.get('fs_lprofile'), 'OLD', 'and moved across');
    assert.equal(jar.has('fs_lprofile'), false, 'its cookie gone');
    saveBox.write('fs_lprofile', 'NEW');
    assert.equal(saveBox.read('fs_lprofile'), 'NEW');
    assert.equal(jar.size, 0, 'no cookie written');
    saveBox.write('fs_lprofile', null);
    assert.equal(saveBox.read('fs_lprofile'), null, 'a reset clears it');
    // The settings alike.
    saveSettings({ ...loadSettings(), diff: 'hard' });
    assert.equal(loadSettings().diff, 'hard');
    assert.ok(ls.m.has('fs_settings') && !jar.has('fs_settings'));
  } finally {
    delete globalThis.localStorage;
  }
});

test('where localStorage can\'t be used the save stays in a cookie', () => {
  jar.clear();
  saveBox.write('fs_lprofile', 'A');
  assert.equal(jar.get('fs_lprofile'), 'A', 'no localStorage at all');
  globalThis.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  try {
    saveBox.write('fs_lprofile', 'B');
    assert.equal(jar.get('fs_lprofile'), 'B', 'storage refused');
    assert.equal(saveBox.read('fs_lprofile'), 'B');
  } finally {
    delete globalThis.localStorage;
  }
});

test('the release holds the game and its music, not the developer\'s tools, the unlisted pages or the candidates', () => {
  const files = releaseFiles();
  const tracks = JSON.parse(readFileSync(new URL('../public/audio/music/tracks.json', import.meta.url), 'utf8'));
  for (const e of Object.values(tracks)) assert.ok(files.includes('audio/music/' + (typeof e === 'string' ? e : e.file)), JSON.stringify(e));
  for (const f of ['index.html', 'favicon.svg', 'js/main.js', 'js/engine/build.js', 'audio/music/CREDITS.md', 'audio/sfx/CREDITS.md', 'audio/sfx/rain.ogg', 'assets/ui/CREDITS.md', 'assets/art/vfx.js', 'assets/art/VFX-CREDITS.md']) assert.ok(files.includes(f), f);
  for (const f of files) {
    assert.ok(/^(index\.html|favicon\.svg|js\/|assets\/|audio\/(music|sfx)\/)/.test(f), `${f}: only the game's own folders`);
    assert.ok(!/^js\/(dev|bots)\//.test(f) && !/^audio\/music\/menu\//.test(f), `${f}: left out`);
  }
  assert.ok(files.length <= 1000, 'within itch.io\'s 1,000 files');
});

test('the build switches the copy to RELEASE: no debug address there, every import in it', async () => {
  const out = mkdtempSync(join(tmpdir(), 'fs-itch-'));
  try {
    const r = buildItch({ out, zip: null, noindex: true });
    assert.ok(r.modules > 50, 'the imports were followed');
    assert.match(readFileSync(join(out, 'js/engine/build.js'), 'utf8'), /^export const RELEASE = true;$/m);
    assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /<meta name="robots" content="noindex">/);
    assert.match(readFileSync(new URL('../public/js/engine/build.js', import.meta.url), 'utf8'), /^export const RELEASE = false;$/m, 'the repository\'s own untouched');
    assert.ok(!existsSync(join(out, 'js/dev')));
    // The debug address does nothing in the release.
    const { DEBUG_FLAG } = await import('../public/js/engine/debugflag.js');
    globalThis.location = { search: '?' + DEBUG_FLAG, hostname: 'html-classic.itch.zone', protocol: 'https:' };
    const rel = await import(pathToFileURL(join(out, 'js/engine/storage.js')).href);
    assert.equal(rel.DEBUG, false);
    assert.equal((await rel.store.devStatus()).enabled, false);
    globalThis.fetch = () => assert.fail('a release never asks for the server');
    jar.clear();
    await rel.store.init();
    assert.equal(rel.store.mode, 'local');
  } finally {
    globalThis.location = { search: '', hostname: 'html-classic.itch.zone', protocol: 'https:' };
    rmSync(out, { recursive: true, force: true });
  }
});

test('the zip holds each file whole: deflated or stored, with its CRC', () => {
  const text = Buffer.from('forest '.repeat(200)), noise = Buffer.from(Array.from({ length: 64 }, (_, i) => (i * 97 + 13) & 255));
  const z = zipFiles([{ name: 'a/text.txt', data: text }, { name: 'noise.bin', data: noise }]);
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926, 'the standard check value');
  const end = z.length - 22;
  assert.equal(z.readUInt32LE(end), 0x06054b50);
  assert.equal(z.readUInt16LE(end + 10), 2);
  let at = z.readUInt32LE(end + 16);
  const got = {};
  for (let i = 0; i < 2; i++) {
    assert.equal(z.readUInt32LE(at), 0x02014b50);
    const method = z.readUInt16LE(at + 10), crc = z.readUInt32LE(at + 16), size = z.readUInt32LE(at + 20), nameLen = z.readUInt16LE(at + 28), off = z.readUInt32LE(at + 42);
    const name = z.toString('utf8', at + 46, at + 46 + nameLen);
    const local = off + 30 + z.readUInt16LE(off + 26);
    const body = z.subarray(local, local + size);
    const data = method === 8 ? zlib.inflateRawSync(body) : body;
    assert.equal(crc32(data), crc, name);
    got[name] = { method, data };
    at += 46 + nameLen;
  }
  assert.equal(got['a/text.txt'].method, 8, 'text deflated');
  assert.deepEqual(got['a/text.txt'].data, text);
  assert.equal(got['noise.bin'].method, 0, 'what doesn\'t shrink stored');
  assert.deepEqual(Buffer.from(got['noise.bin'].data), noise);
});

test('two tabs share one save: each change starts from what the other left; no answer is no purchase', async () => {
  jar.clear();
  globalThis.localStorage = fakeStorage();
  const { store } = await import('../public/js/engine/storage.js');
  const P = await import('../public/js/shared/profile.js');
  const fetch0 = globalThis.fetch;
  try {
    store.mode = 'local';
    store.profile = P.sanitizeProfile({ ...P.defaultProfile(), gold: 1000 });
    store.saveLocal();
    saveBox.write('fs_lprofile', P.encodeState(P.packProfile({ ...P.defaultProfile(), gold: 5000 }))); // the other tab
    assert.ok(await store.buy('might'));
    assert.equal(store.profile.gold, 5000 - P.upgradeCost('might', 0));
    store.mode = 'server';
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    assert.equal(await store.buy('might'), false);
    assert.equal(await store.setHome('bow', true), false);
  } finally {
    store.mode = 'local';
    globalThis.fetch = fetch0;
    delete globalThis.localStorage;
  }
});
