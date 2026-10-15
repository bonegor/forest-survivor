import test from 'node:test';
import assert from 'node:assert/strict';
import { store, onThisMachine } from '../public/js/engine/storage.js';

test('the published static game has no developer mode; on this machine it has', async () => {
  for (const host of ['localhost', 'game.localhost', '127.0.0.1', '127.1.2.3', '[::1]']) assert.ok(onThisMachine(host), host);
  for (const host of ['bonegor.github.io', 'play.example.com', '192.168.1.20', 'localhost.example.com', '127.0.0.1.example.com', 'evil-localhost', '']) {
    assert.ok(!onThisMachine(host), host);
  }
  // Static hosting (no game server): the save is a client cookie, and the panel opens only here.
  store.mode = 'local';
  try {
    globalThis.location = { hostname: 'bonegor.github.io' };
    assert.deepEqual(await store.devStatus(), { enabled: false, open: false, authed: false, local: true });
    globalThis.location = { hostname: 'localhost' };
    assert.deepEqual(await store.devStatus(), { enabled: true, open: true, authed: true, local: true });
  } finally {
    delete globalThis.location;
  }
});
