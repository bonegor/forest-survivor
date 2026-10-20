// How the hero is found in play (game.js HERO_MARK): a ring on the ground in his colour and, when
// something stands in front of him, his ring and a ghost of him over the scene. No line round
// him: the owner's (20 October 2026) "hero has an outline that is too bright. Undo that bright
// outline, we dont need it because the hero is visible since its always in center", for every
// hero, covered or not.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, HERO_MARK } from '../public/js/game/game.js';
import { HEROES } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

// An unkillable hero standing still, unarmed, with no spawner, in the middle of the night.
function game(hero, fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(7);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero, mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    g.player.weapons.length = 0;
    g.setTime(420);
    g.syncCam();
    return fn(g, g.player);
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// One frame, every picture drawn written down with the alpha it was drawn at.
function frame(g) {
  const ctx = document.createElement('canvas').getContext('2d'), drawn = [];
  ctx.globalAlpha = 1;
  ctx.drawImage = (img, ...a) => drawn.push({ img, a, alpha: ctx.globalAlpha });
  g.draw(ctx);
  return drawn;
}

// Whether anything was drawn round the hero's sprite: a picture over his rectangle grown on every
// side (an outline's), or a line built from his frames.
function lined(g, p, drawn) {
  const [X, Y, w, h] = p._rect;
  const round = drawn.some(({ a }) => a.length === 4 && a[0] < X && a[1] < Y && a[0] + a[2] > X + w && a[1] + a[3] > Y + h && a[2] - w < 6 * g.cam.S);
  const built = SPR[p.hero.sprite].frames.some((fr) => [...fr.variants.keys()].some((k) => k.startsWith('heroline')));
  return round || built;
}

test('the marks are a ring and a ghost; no line', () => {
  assert.deepEqual(Object.keys(HERO_MARK).sort(), ['ghost', 'hurt', 'low', 'rx', 'ry']);
  assert.equal(Game.prototype.drawHeroLine, undefined, 'no outline left to draw');
});

test('no hero is drawn with a line round him at night, in the open or with a foe in front of him', () => {
  for (const hero of Object.keys(HEROES)) {
    game(hero, (g, p) => {
      const open = frame(g);
      assert.ok(!g.heroCovered, `${hero}: nothing in front of him`);
      assert.ok(!lined(g, p, open), `${hero}: no line round him`);
      // A skeleton just in front of him, drawn over him: his ring and ghost go over it, no line.
      const foe = g.spawnEnemy('skeleton', p.x + 2, p.y + 5, { instant: true, aware: true });
      foe.ai = () => [0, 0, 0];
      const covered = frame(g);
      assert.ok(g.heroCovered, `${hero}: covered`);
      const [, , , , fr, flip] = p._rect;
      assert.ok(covered.some((d) => d.img === fr.get(flip) && d.alpha === HERO_MARK.ghost), `${hero}: a ghost of him over the foe`);
      assert.ok(!lined(g, p, covered), `${hero}: no line round him, covered`);
    });
  }
});
