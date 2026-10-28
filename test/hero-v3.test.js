import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game, strikeClip } from '../public/js/game/game.js';
import { HeroShowcase } from '../public/js/ui/hero-showcase.js';
import { HEROES, heroLook } from '../public/js/data/heroes.js';
import { SPR } from '../public/js/engine/sprites.js';
import { bounds } from '../public/js/engine/pixels.js';
import { input } from '../public/js/engine/input.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const ctx = document.createElement('canvas').getContext('2d');
const settingsFor = id => ({ diff: 'easy', numbers: false, skins: { [id]: 'v3' } });

// Compare silhouettes at their world anchor, rather than canvas coordinates:
// larger transparent canvases and palette-only replacements must not pass.
function silhouette(spr, index) {
  const f = spr.frames[index], points = new Set();
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (f.buf.d[y * f.w + x] >>> 24) points.add(`${x - f.w / 2},${y - spr.anchorY}`);
  }
  return points;
}

test('every V3 hero changes the native silhouette, including its resting pose', () => {
  for (const h of Object.values(HEROES)) {
    const look = heroLook(h.id, { [h.id]: 'v3' }), original = SPR[h.sprite], next = SPR[look.sprite];
    assert.notEqual(look.sprite, h.sprite, h.id);
    const a = silhouette(original, original.idle[0]), b = silhouette(next, next.idle[0]);
    const changed = [...a].filter(p => !b.has(p)).length + [...b].filter(p => !a.has(p)).length;
    assert.ok(changed >= 20 && changed / Math.max(a.size, b.size) >= 0.05,
      `${h.id}: a structural redraw, not a recolour or transparent padding (${changed} pixels)`);
    assert.ok(SPR[look.pose]?.frames.some(f => f.buf.d.some(c => c >>> 24)), `${h.id}: visible matching menu pose`);
  }
});

test('V3 selection demonstrations draw complete idle, walk and attack cycles in both directions without clipping', () => {
  const box = { x: 12, y: 16, w: 220, h: 200 };
  for (const h of Object.values(HEROES)) {
    const profile = defaultProfile(), snapshot = JSON.stringify(profile), settings = settingsFor(h.id);
    const show = new HeroShowcase(h.id, profile, settings), p = show.game.player, spr = SPR[p.hero.sprite];
    const seen = new Map();
    // Two continuous loops cover animation phases that straddle a demonstration transition.
    for (let t = 0; t < 24 * 60; t++) {
      show.update(1 / 60);show.draw(ctx, box, false, settings);
      const [x, y, , , frame, flip] = p._rect, b = bounds(frame.buf), S = show.geometry.scale;
      const index = spr.frames.indexOf(frame);
      assert.ok(index >= 0, `${h.id}: uses its own V3 frame`);
      const key = `${show.action.kind}:${p.face}`;
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key).add(index);
      const left = flip ? frame.w - 1 - b.x1 : b.x0;
      const right = flip ? frame.w - b.x0 : b.x1 + 1;
      assert.ok(x + left * S >= box.x && x + right * S <= box.x + box.w, `${h.id}: horizontal clipping at ${t}`);
      assert.ok(y + b.y0 * S >= box.y && y + (b.y1 + 1) * S <= box.y + box.h, `${h.id}: vertical clipping at ${t}`);
    }
    for (const face of [-1, 1]) for (const kind of ['idle', 'walk', 'attack']) {
      assert.ok(seen.has(`${kind}:${face}`), `${h.id}: ${kind}, facing ${face}`);
      for (const index of spr[kind] || []) {
        assert.ok(seen.get(`${kind}:${face}`).has(index), `${h.id}: ${kind} frame ${index}, facing ${face}`);
      }
    }
    assert.equal(JSON.stringify(profile), snapshot, `${h.id}: preview never changes progress`);
  }
});

test('a V3 skin is used by a real run without changing derived stats, movement speed or starting weapons', () => {
  const profile = defaultProfile();profile.up = { vitality: 2, might: 2, armor: 1 };
  const meta = metaBonuses(profile);
  for (const h of Object.values(HEROES)) {
    const options = { hero: h.id, mode: 's15', diff: 'easy', meta, crypts: false };
    const original = new Game({ ...options, settings: {} });
    const next = new Game({ ...options, settings: settingsFor(h.id) });
    assert.equal(next.player.hero.skin, 'v3');
    assert.deepEqual(next.player.derived(), original.player.derived(), h.id + ': derived combat stats');
    assert.equal(next.player.moveSpeed, original.player.moveSpeed, h.id + ': movement speed');
    assert.equal(strikeClip(SPR[next.player.hero.sprite])?.delay, strikeClip(SPR[original.player.hero.sprite])?.delay, h.id + ': strike damage timing');
    assert.deepEqual(next.player.weapons.map(w => [w.id, w.level, w.s]), original.player.weapons.map(w => [w.id, w.level, w.s]), h.id + ': weapons');
    next.drawPlayer(ctx, next.cam);
    assert.ok(SPR[next.player.hero.sprite].frames.includes(next.player._rect[4]), h.id + ': real game draws V3');
  }
});

test('Paladin helmet stays joined through the neck in every idle, walk and smite pose', () => {
  // Each fixture locates the torso in that pose. Restrict the path to the neck:
  // a sword, cape or detached effect cannot disguise an empty row below the head.
  const anchors = [[0,0],[0,0],[0,0],[0,1],[0,1],[0,1],[0,0],[0,0],
    [1,1],[1,1],[1,0],[1,0],[1,1],[1,1],[1,0],[1,0],
    [0,0],[-1,0],[1,0],[2,1],[2,1],[1,0]];
  const frames = SPR.paladin_v3.frames;
  assert.equal(frames.length, anchors.length);
  for (const [i, [ux, by]] of anchors.entries()) {
    const { w, d } = frames[i].buf, start = (12 + by) * w + 23 + ux, end = (23 + by) * w + 23 + ux;
    assert.ok(d[start] >>> 24, `pose ${i}: helmet seed`);
    const seen = new Set([start]), todo = [start];
    while (todo.length) {
      const p = todo.pop();
      for (const q of [p-1,p+1,p-w,p+w]) {
        const x = q % w, y = Math.floor(q / w);
        if (x < 20+ux || x > 27+ux || y < 12+by || y > 23+by || !(d[q] >>> 24) || seen.has(q)) continue;
        seen.add(q);todo.push(q);
      }
    }
    assert.ok(seen.has(end), `pose ${i}: a continuous helmet-neck-chest connection`);
  }
});

test('V3 ranger preserves the real projectile release and its shooting-on-the-move poses', () => {
  const a = SPR.archer, b = SPR[heroLook('archer', { archer: 'v3' }).sprite];
  for (const key of ['attackRelease', 'attackFps', 'attackWalk', 'walk', 'motionRate']) assert.deepEqual(b[key], a[key], key);
  const previous = input.bot;
  try {
    for (const face of [-1, 1]) {
      input.bot = { x: face, y: 0 };
      const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(defaultProfile()), settings: settingsFor('archer'), crypts: false });
      g.spawner.update = () => {};g.player.devGod = true;
      const p = g.player, bow = p.weapons.find(w => w.def.kind === 'bow');
      p.aim = face < 0 ? Math.PI : 0;p.face = face;bow.cd = 0.35;
      let released = false;
      for (let i = 0; i < 50; i++) {
        const count = g.projectiles.length;
        g.update(1 / 60);g.drawPlayer(ctx, g.cam);
        assert.equal(p._rect[5], face < 0);
        if (g.projectiles.length > count && !released) {
          released = true;
          assert.ok(Math.abs(g.clock - 0.35) <= 1 / 60 + 1e-9, 'sprite must not delay the bow cooldown');
          const drawn = b.frames.indexOf(p._rect[4]);
          assert.ok(b.attackWalk[b.attackRelease].includes(drawn), 'actual projectile appears on the running release frame');
          assert.ok(Math.cos(g.projectiles[0].ang) * face > 0, 'projectile preserves its facing');
        }
      }
      assert.ok(released, 'the V3 ranger actually fires');
    }
  } finally { input.bot = previous; }
});

test('adding V3 leaves default and unknown saved skin choices on the original art', () => {
  for (const h of Object.values(HEROES)) {
    for (const choice of [undefined, {}, { [h.id]: 'original' }, { [h.id]: 'obsolete-look' }]) {
      assert.equal(heroLook(h.id, choice), h, h.id);
    }
  }
});
