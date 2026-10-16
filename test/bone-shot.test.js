// The Bone King's bones (visual review, 16 October 2026). A 9 x 3 sprite drawn three times over
// made 33 px slabs, and a ring of 11 or 15 left from one point, stacking for a third of a second
// into a black-and-white checkerboard under a 60 px gold glow. Now a sprite of its own size,
// drawn only the quarter bigger every foe's shot is, and each ring bone sets off out along its
// own line.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { SPR } from '../public/js/engine/sprites.js';
import { PROJECTILE_ART } from '../public/js/art/items.js';
import { EnemyShot } from '../public/js/game/projectiles.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

// A Knight standing still, unarmed and unhurt, with no spawner.
function game(fn) {
  const oldRandom = Math.random;
  Math.random = mulberry32(11);
  try {
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.update(1 / 60);
    g.player.weapons.length = 0;
    g.player.devGod = true;
    return fn(g, g.player);
  } finally {
    Math.random = oldRandom;
  }
}
const run = (g, frames) => {
  for (let i = 0; i < frames; i++) g.update(1 / 60);
};

test('the bone is a sprite of its own size: 15 x 6 (17 x 8 outlined), with embers at the knobs', () => {
  const rows = PROJECTILE_ART.bone.frames[0];
  assert.equal(rows.length, 6);
  assert.ok(rows.every((r) => r.length === 15), 'every row 15 px');
  assert.ok(rows.some((r) => /[yY]/.test(r)), 'an ember in it, so it reads as a foe’s');
  const f = SPR.bone.frames[0];
  assert.deepEqual([f.w, f.h], [17, 8]);
});

test('a bone is drawn at no more than a quarter over its sprite, about 19 px long, in a small glow', () =>
  game((g, p) => {
    const b = new EnemyShot(g, p.x + 60, p.y, 0.7, 85, 10, 'bone');
    const S = g.cam.S;
    let k = 0, glowPx = 0;
    b.draw({ drawImage(img, x, y, w) { k = w / (img.width * S); } }, g.cam);
    assert.ok(k <= 1.25 + 0.01, `drawn at ${k.toFixed(3)} times its sprite`);
    const long = 15 * k;
    assert.ok(long >= 15 && long <= 20, `the bone ${long.toFixed(1)} px long (it was 27, 33 outlined)`);
    b.drawGlow({ drawImage(img, x, y, w) { glowPx = w / S; } }, g.cam);
    assert.ok(glowPx > 0 && glowPx <= 36, `a glow ${glowPx} px across (it was 60)`);
  }));

test('the ring after his slam: every bone sets off out along its own line, 10 px or more from the next, none from his centre', () =>
  game((g, p) => {
    const king = g.spawnBoss('boneking', p.x + 100, p.y);
    king.spawnT = 0;
    king.cd2 = 99; // no summoning
    king.cd3 = 99; // no aimed fan
    let thrown = [];
    const push = g.eshots.push.bind(g.eshots);
    g.eshots.push = (...shots) => {
      for (const s of shots) if (s.kind === 'bone') thrown.push({ x: s.x, y: s.y, ang: s.ang, cx: king.x, cy: king.y - 10 });
      return push(...shots);
    };
    for (const [n, wounded] of [[11, false], [15, true]]) {
      if (wounded) king.hp = king.maxHp * 0.4;
      thrown = [];
      king.cdT = 0;
      run(g, 150);
      assert.equal(thrown.length, n, `a ring of ${n}`);
      let nearest = Infinity;
      for (const [i, s] of thrown.entries()) {
        const d = Math.hypot(s.x - s.cx, s.y - s.cy);
        assert.ok(d >= 10, `bone ${i} sets off ${d.toFixed(1)} px from his centre`);
        const off = Math.atan2(s.y - s.cy, s.x - s.cx) - s.ang;
        assert.ok(Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) < 1e-6, `bone ${i} out along its own line`);
        for (const t of thrown.slice(i + 1)) nearest = Math.min(nearest, Math.hypot(s.x - t.x, s.y - t.y));
      }
      assert.ok(nearest >= 10, `the ring of ${n}: the nearest two bones ${nearest.toFixed(1)} px apart`);
    }
  }));
