// How the hero is found in play (game.js HERO_MARK): a ring on the ground in his colour, drawn
// again over the scene when something stands in front of him, and he himself drawn last, over
// everything of the world: the owner's (27 October 2026) "Some attacks, like lighthouse seem to
// cover the hero. Hero must always be on top of everything". No line round him: the owner's
// (20 October 2026) "hero has an outline that is too bright. Undo that bright outline, we dont
// need it because the hero is visible since its always in center", for every hero, covered or not.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, HERO_MARK } from '../public/js/game/game.js';
import { Lantern } from '../public/js/game/weapons-light.js';
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

// One frame, every picture drawn written down with the alpha it was drawn at, and every shape
// filled or stroked or written among them ({ shape }), in the order drawn.
function frame(g) {
  const ctx = document.createElement('canvas').getContext('2d'), drawn = [];
  ctx.globalAlpha = 1;
  ctx.drawImage = (img, ...a) => drawn.push({ img, a, alpha: ctx.globalAlpha });
  for (const k of ['fill', 'fillRect', 'stroke', 'strokeRect', 'fillText', 'strokeText']) ctx[k] = () => drawn.push({ shape: k });
  g.draw(ctx);
  return drawn;
}

// Whether anything was drawn round the hero's sprite: a picture over his rectangle grown on every
// side (an outline's), or a line built from his frames.
function lined(g, p, drawn) {
  const [X, Y, w, h] = p._rect;
  const round = drawn.some(({ a }) => a && a.length === 4 && a[0] < X && a[1] < Y && a[0] + a[2] > X + w && a[1] + a[3] > Y + h && a[2] - w < 6 * g.cam.S);
  const built = SPR[p.hero.sprite].frames.some((fr) => [...fr.variants.keys()].some((k) => k.startsWith('heroline')));
  return round || built;
}

// What is drawn after the hero's own picture, but for his glowing parts: nothing should be.
function overHim(p, drawn) {
  const [, , , , fr, flip, img] = p._rect;
  const i = drawn.findLastIndex((d) => d.img === img);
  assert.ok(i >= 0, `${p.hero.id}: drawn`);
  assert.equal(drawn[i].alpha, 1, `${p.hero.id}: drawn whole`);
  return drawn.slice(i + 1).filter((d) => !(fr.em && d.img === (flip ? fr.emf : fr.em)));
}

test('the mark is a ring; no line', () => {
  assert.deepEqual(Object.keys(HERO_MARK).sort(), ['hurt', 'low', 'rx', 'ry']);
  assert.equal(Game.prototype.drawHeroLine, undefined, 'no outline left to draw');
});

test('every hero is drawn over everything, with no line round him: in the open, with a foe in front of him, in the Lantern\'s beam', () => {
  for (const hero of Object.keys(HEROES)) {
    game(hero, (g, p) => {
      const open = frame(g);
      assert.ok(!g.heroCovered, `${hero}: nothing in front of him`);
      assert.ok(!lined(g, p, open), `${hero}: no line round him`);
      assert.deepEqual(overHim(p, open), [], `${hero}: nothing over him in the open`);
      // A skeleton just in front of him: his ring goes over it, and he over all, with no line.
      const foe = g.spawnEnemy('skeleton', p.x + 2, p.y + 5, { instant: true, aware: true });
      foe.ai = () => [0, 0, 0];
      const covered = frame(g);
      assert.ok(g.heroCovered, `${hero}: covered`);
      assert.ok(!lined(g, p, covered), `${hero}: no line round him, covered`);
      assert.deepEqual(overHim(p, covered), [], `${hero}: nothing over him, the foe in front of him neither`);
      // The Lantern's beam, drawn in the glow over the scene, turning across him.
      g.effects.push(new Lantern(g, g.addWeapon('lantern')));
      assert.deepEqual(overHim(p, frame(g)), [], `${hero}: nothing over him, the Lantern's beam neither`);
    });
  }
});
