// The one facing rule (public/js/game/facing.js), and the hero and monsters following it in
// the real game: left or right only; any leftward move faces left, any rightward one right;
// standing still or going straight up or down keeps the way it faced.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mod = (file) => import(pathToFileURL(root + file).href);
await mod('tools/headless.mjs');
const { faceAlong, faceAttack } = await mod('public/js/game/facing.js');
const { Game } = await mod('public/js/game/game.js');
const { input } = await mod('public/js/engine/input.js');
const { mulberry32 } = await mod('public/js/engine/util.js');
const { defaultProfile, metaBonuses } = await mod('public/js/shared/profile.js');

test('any leftward or rightward move turns; straight up or down, or standing, keeps', () => {
  for (const face of [-1, 1]) {
    assert.equal(faceAlong(face, 1, 0), 1);
    assert.equal(faceAlong(face, -1, 0), -1);
    assert.equal(faceAlong(face, 0.7, 0.7), 1, 'down and right');
    assert.equal(faceAlong(face, 0.7, -0.7), 1, 'up and right');
    assert.equal(faceAlong(face, -0.7, 0.7), -1, 'down and left');
    assert.equal(faceAlong(face, -0.7, -0.7), -1, 'up and left');
    assert.equal(faceAlong(face, 0, 1), face, 'straight down');
    assert.equal(faceAlong(face, 0, -1), face, 'straight up');
    assert.equal(faceAlong(face, 0, 0), face, 'standing still');
    assert.equal(faceAlong(face, 0.05, 1), face, 'a hair off straight down');
    assert.equal(faceAlong(face, 40, 0), 1, 'any scale');
  }
});

test('a blow begun standing turns toward it; one struck on the move does not', () => {
  assert.equal(faceAttack(1, false, -1, 0), -1);
  assert.equal(faceAttack(1, true, -1, 0), 1);
  assert.equal(faceAttack(-1, false, 0, 1), -1, 'a blow straight down keeps facing');
});

function game(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(4242);
  try {
    return fn(new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false } }));
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

test('the hero: diagonals turn him, straight up and down and standing keep his facing', () =>
  game((g) => {
    const p = g.player;
    const steer = (x, y, n = 12) => {
      input.bot = { x, y };
      for (let i = 0; i < n; i++) p.update(1 / 60);
    };
    steer(-0.7071, 0.7071);
    assert.equal(p.face, -1, 'down and left');
    steer(0, -1);
    assert.equal(p.face, -1, 'then straight up');
    steer(0, 1);
    assert.equal(p.face, -1, 'then straight down');
    steer(0, 0);
    assert.equal(p.face, -1, 'then standing');
    steer(0.7071, -0.7071);
    assert.equal(p.face, 1, 'up and right');
    steer(0, 1);
    assert.equal(p.face, 1, 'then straight down');
  }));

test('a monster faces the way it walks, keeps it going straight down, and is not turned by a knock', () =>
  game((g) => {
    const p = g.player;
    input.bot = { x: 0, y: 0 };
    // From the right it walks left; from straight above it walks straight down.
    const right = g.spawnEnemy('rat', p.x + 50, p.y, { instant: true });
    const above = g.spawnEnemy('rat', p.x, p.y - 50, { instant: true });
    above.face = -1;
    for (let i = 0; i < 6; i++) {
      right.update(1 / 60);
      above.update(1 / 60);
    }
    assert.equal(right.face, -1, 'walking left toward the hero');
    assert.ok(above.y > p.y - 50, 'it came down');
    assert.equal(above.face, -1, 'walking straight down keeps its facing');
    // A blow knocks it back to the right; it still faces the way it walks.
    right.kx = 400;
    right.update(1 / 60);
    assert.ok(right.kx > 0);
    assert.equal(right.face, -1, 'a knock back does not turn it');
    // Held still (a champion's stagger), it doesn't turn either, wherever the hero goes.
    right.holdT = 0.2;
    p.x = right.x + 40;
    right.update(1 / 60);
    assert.equal(right.face, -1, 'held still, it keeps facing');
  }));
