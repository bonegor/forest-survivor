// Production animation regressions for the single approved roster.
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
const heroes = Object.values(HEROES);
const proposals = heroes.map(h => ({ h, skin: 'selected' }));
const settingsFor = (id, skin) => ({ diff: 'easy', numbers: false, skins: { [id]: skin } });

test('all selected heroes draw complete idle, walk and attack cycles in both directions without clipping', () => {
  const box = { x: 12, y: 16, w: 220, h: 200 };
  for (const { h, skin } of proposals) {
    const label = `${h.id}/${skin}`, profile = defaultProfile(), snapshot = JSON.stringify(profile), settings = settingsFor(h.id, skin);
    const show = new HeroShowcase(h.id, profile, settings), p = show.game.player, spr = SPR[p.hero.sprite], seen = new Map();
    // Continuous production clocks cover transitions and complete loop boundaries.
    for (let t = 0; t < 24 * 60; t++) {
      show.update(1 / 60);show.draw(ctx, box, false, settings);
      const [x, y, , , frame, flip] = p._rect, b = bounds(frame.buf), S = show.geometry.scale;
      const index = spr.frames.indexOf(frame), key = `${show.action.kind}:${p.face}`;
      assert.ok(index >= 0, `${label}: uses its selected frame`);
      assert.equal(flip, p.face < 0, label + ': frame mirrors with facing');
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key).add(index);
      const left = flip ? frame.w - 1 - b.x1 : b.x0, right = flip ? frame.w - b.x0 : b.x1 + 1;
      assert.ok(x + left * S >= box.x && x + right * S <= box.x + box.w, `${label}: horizontal clipping at ${t}`);
      assert.ok(y + b.y0 * S >= box.y && y + (b.y1 + 1) * S <= box.y + box.h, `${label}: vertical clipping at ${t}`);
    }
    for (const face of [-1, 1]) for (const kind of ['idle', 'walk', 'attack']) {
      assert.ok(seen.has(`${kind}:${face}`), `${label}: ${kind}, facing ${face}`);
      for (const index of spr[kind] || []) assert.ok(seen.get(`${kind}:${face}`).has(index), `${label}: ${kind} frame ${index}, facing ${face}`);
    }
    assert.equal(JSON.stringify(profile), snapshot, label + ': preview never changes progress');
  }
});

test('selected sprites preserve stats, weapons, movement, animation cadence and strike damage timing', () => {
  const profile = defaultProfile();profile.up = { vitality: 2, might: 2, armor: 1 };
  const meta = metaBonuses(profile);
  for (const { h, skin } of proposals) {
    const label = `${h.id}/${skin}`, options = { hero: h.id, mode: 's15', diff: 'easy', meta, crypts: false };
    const original = new Game({ ...options, settings: settingsFor(h.id, 'original') }), next = new Game({ ...options, settings: settingsFor(h.id, skin) });
    const a = SPR[original.player.hero.sprite], b = SPR[next.player.hero.sprite];
    assert.equal(next.player.hero.sprite, h.id);
    assert.deepEqual(next.player.derived(), original.player.derived(), label + ': combat stats');
    assert.equal(next.player.moveSpeed, original.player.moveSpeed, label + ': movement speed');
    assert.equal(strikeClip(b)?.delay, strikeClip(a)?.delay, label + ': strike damage timing');
    for (const key of ['idle', 'walk', 'attack', 'attackFps', 'attackRelease', 'attackWalk', 'motionRate', 'idleRate']) assert.deepEqual(b[key], a[key], `${label}: ${key}`);
    assert.deepEqual(next.player.weapons.map(w => [w.id, w.level, w.s]), original.player.weapons.map(w => [w.id, w.level, w.s]), label + ': weapons');
    next.drawPlayer(ctx, next.cam);
    assert.ok(b.frames.includes(next.player._rect[4]), label + ': real run draws selected model');
  }
});

test('Justicar keeps its eighteen authored attacks, with Smite at the legacy manual timing', () => {
  const spr = SPR[heroLook('paladin', { paladin: 'selected' }).sprite];
  assert.deepEqual([spr.attack.length, spr.attackRelease, spr.attackFps], [18, 8, 24]);
  assert.equal(strikeClip(spr).delay, 2 / 13);
});

test('the selected Ranger shoots without breaking her running gait in either direction', () => {
  const previous = input.bot;
  try {
    for (const skin of ['selected']) for (const face of [-1, 1]) {
      input.bot = { x: face, y: 0 };
      const g = new Game({ hero: 'archer', mode: 's15', meta: metaBonuses(defaultProfile()), settings: settingsFor('archer', skin), crypts: false });
      g.spawner.update = () => {};g.player.devGod = true;
      const p = g.player, spr = SPR[p.hero.sprite], bow = p.weapons.find(w => w.def.kind === 'bow');
      const target = g.spawnEnemy('skeleton', p.x + face * 100, p.y, { instant: true, always: true, hpMul: 1000 }); target.speed = 0;
      p.aim = face < 0 ? Math.PI : 0;p.face = face;bow.cd = 0.35;
      let released = false;
      for (let i = 0; i < 50; i++) {
        const count = g.projectiles.length;
        g.update(1 / 60);g.drawPlayer(ctx, g.cam);
        assert.equal(p._rect[5], face < 0);
        if (g.projectiles.length > count && !released) {
          released = true;
          assert.ok(Math.abs(g.clock - 0.35) <= 1 / 60 + 1e-9, 'sprite must not delay bow cooldown');
          assert.ok(spr.attackWalk[spr.attackRelease].includes(spr.frames.indexOf(p._rect[4])), `${skin}: the bow releases over the current gait phase`);
          assert.ok(Math.cos(g.projectiles[0].ang) * face > 0, 'projectile preserves facing');
        }
      }
      assert.ok(released, skin + ': Ranger actually fires');
    }
  } finally { input.bot = previous; }
});

test('the selected Shadow hover at rest and moving without footstep dust', () => {
  const previous = input.bot;
  try {
    input.bot = { x: 1, y: 0 };
    for (const id of ['rogue', 'wraith']) {
      const skin = 'selected';
      const g = new Game({ hero: id, mode: 's15', meta: metaBonuses(defaultProfile()), settings: settingsFor(id, skin), crypts: false });
      const p = g.player, spr = SPR[p.hero.sprite];
      assert.ok(spr.floating && spr.idle.length > 1 && spr.walk.length > 1 && spr.attack.length > 1);
      assert.equal(spr.anchorY, 56, 'keep the reviewed hover registration, including the trailing aura');
      g.world.collide = () => {};
      let emitted = 0;g.particles.emit = () => { emitted++; };
      p.stepT = 0;
      const x = p.x;
      for (let t = 0; t < 120; t++) p.update(1 / 60);
      assert.ok(p.x > x + 50, skin + ': actually moves');
      assert.equal(emitted, 0, skin + ': no footstep dust');
      assert.equal(p.stepT, 0, skin + ': no footstep clock or step sound is triggered');
    }
    // Positive control: the same movement still produces footsteps for a walker.
    const g = new Game({ hero: 'knight', mode: 's15', meta: metaBonuses(defaultProfile()), settings: {}, crypts: false });
    g.world.collide = () => {};
    let emitted = 0;g.particles.emit = () => { emitted++; };
    g.player.stepT = 0;
    for (let t = 0; t < 120; t++) g.player.update(1 / 60);
    assert.ok(emitted > 0, 'walking Knight still makes footsteps');
  } finally { input.bot = previous; }
});
