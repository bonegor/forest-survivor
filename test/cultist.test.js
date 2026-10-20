import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
await mod('tools/headless.mjs');
const {Game} = await mod('public/js/game/game.js');
const {POCKETS} = await mod('public/js/data/waves.js');
const {mulberry32} = await mod('public/js/engine/util.js');
const P = await mod('public/js/shared/profile.js');

// How many times its sprite's size a monster is drawn at.
function drawnScale(g, e) {
  let k = 0;
  e.draw({globalAlpha: 1, drawImage(img, x, y, w) { k = w / (img.width * g.cam.S); }}, g.cam);
  return k;
}

test('the red-robed Cultist is drawn half again its size, its body with it, and walks a tenth slower', () => {
  const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
  const p = g.player;
  const cultist = g.spawnEnemy('cultist', p.x + 80, p.y, {instant: true});
  const skeleton = g.spawnEnemy('skeleton', p.x - 80, p.y, {instant: true});
  const champion = g.spawnEnemy('cultist', p.x, p.y + 80, {instant: true, elite: true});
  assert.ok(Math.abs(drawnScale(g, cultist) - 1.5) < 0.05, `drawn at ${drawnScale(g, cultist).toFixed(2)}`);
  assert.ok(Math.abs(drawnScale(g, skeleton) - 1) < 0.05, 'other monsters as they were');
  assert.ok(Math.abs(drawnScale(g, champion) - 1.5 * 1.35) < 0.05, 'a Cultist champion bigger still');
  assert.equal(cultist.r, skeleton.r * 1.5, "blows land on all of it: a skeleton's body, half again as big");
  // A tenth slower than the slow class it walks in (enemies.js hordePace).
  assert.ok(Math.abs(cultist.spd - 70 * 1.067 * 0.7 * 0.9) < 1e-9, `a tenth slower than its class (${cultist.spd})`);
});

test("a Cultist's dark bolt flies 15% slower than it did and is drawn half again as big", () => {
  const oldRandom = Math.random;
  Math.random = mulberry32(3);
  try {
    const g = new Game({hero:'knight', mode:'s15', meta:P.metaBonuses(P.defaultProfile()), settings:{numbers:false}});
    const p = g.player;
    const cultist = g.spawnEnemy('cultist', p.x + 90, p.y, {instant: true});
    cultist.cdT = 0;
    for (let i = 0; i < 120 && !g.eshots.length; i++) cultist.update(1/60);
    const bolt = g.eshots.find(s => s.kind === 'darkbolt');
    assert.ok(bolt, 'it casts at the hero');
    assert.ok(Math.abs(Math.hypot(bolt.vx, bolt.vy) - 72 * 0.85) < 1e-9, `${Math.hypot(bolt.vx, bolt.vy)} px/s`);
    assert.ok(Math.abs(drawnScale(g, bolt) - 1.25 * 1.5) < 0.05, `drawn at ${drawnScale(g, bolt).toFixed(2)} times its sprite`);
  } finally {
    Math.random = oldRandom;
  }
});

test('the 15-minute night sends few Cultists: never more than one monster in twenty', () => {
  for (const pocket of POCKETS.filter(pk => pk.minutes[0] < 15)) {
    const all = Object.values(pocket.spawn).reduce((s, w) => s + w, 0);
    const share = (pocket.spawn.cultist || 0) / all;
    assert.ok(share <= 1 / 20, `minutes ${pocket.minutes.join('-')}: ${(share * 100).toFixed(1)}%`);
  }
});
