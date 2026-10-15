import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const mod = file => import(pathToFileURL(root + '/' + file).href);
await mod('tools/headless.mjs');
const {Game} = await mod('public/js/game/game.js');
const {POCKETS} = await mod('public/js/data/waves.js');
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
  assert.equal(cultist.spd, 27, 'a tenth slower than the 30 px/s it had');
});

test('the 15-minute night sends few Cultists: never more than one monster in twenty', () => {
  for (const pocket of POCKETS.filter(pk => pk.minutes[0] < 15)) {
    const all = Object.values(pocket.spawn).reduce((s, w) => s + w, 0);
    const share = (pocket.spawn.cultist || 0) / all;
    assert.ok(share <= 1 / 20, `minutes ${pocket.minutes.join('-')}: ${(share * 100).toFixed(1)}%`);
  }
});
