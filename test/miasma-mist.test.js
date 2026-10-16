// Miasma is drawn as a mist. The owner, 16 October 2026: "right now it's circles. Make it look like
// a mist that slowly fades, but is only partly see-through, like a real cloud." How it looks is for
// the eye; pinned here is what the eye can't check: a puff has no hard edge, the cloud and its whole
// trail are laid on the ground in one piece however many pools there are, drawing them takes
// nothing from the game's dice, and the trail still hurts and sinks away exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { Game } from '../public/js/game/game.js';
import { Pool, Aura, mistPuff } from '../public/js/game/effects.js';
import { MAX_WEAPON_LEVEL } from '../public/js/data/weapons.js';
import { input } from '../public/js/engine/input.js';
import { mulberry32 } from '../public/js/engine/util.js';
import { defaultProfile, metaBonuses } from '../public/js/shared/profile.js';

const step = (g, n = 1) => { for (let i = 0; i < n; i++) g.update(1 / 60); };

// A seeded Necromancer with no horde of his own.
function necro(fn) {
  const oldRandom = Math.random, oldBot = input.bot;
  Math.random = mulberry32(23);
  try {
    input.bot = { x: 0, y: 0 };
    const g = new Game({ hero: 'necromancer', mode: 's15', meta: metaBonuses(defaultProfile()), settings: { numbers: false }, crypts: false });
    g.spawner.update = () => {};
    g.player.devGod = true;
    return fn(g, g.player, g.player.weapons.find((w) => w.def.kind === 'miasma'));
  } finally {
    input.bot = oldBot;
    Math.random = oldRandom;
  }
}

// A canvas that only counts what is drawn on it.
function counter() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (t, k) => (k === 'drawImage' ? (...a) => calls.push(a) : k in t ? t[k] : () => {}),
    set: (t, k, v) => ((t[k] = v), true),
  });
  return { ctx, calls };
}

test('a puff of mist is thickest in the middle, never solid, and thins in dithered steps to nothing at its rim: no disc edge; a body puff is darker beneath, a wisp lit on top', () => {
  for (const r of [8, 16, 30]) {
    for (let v = 0; v < 4; v++) {
      const { w, h, data } = mistPuff(r, v, 0);
      const a = (x, y) => data[(y * w + x) * 4 + 3];
      assert.equal(a(w >> 1, h >> 1), 192, 'three quarters thick in the middle, so overlapping puffs build up');
      const steps = new Set();
      for (let i = 3; i < data.length; i += 4) steps.add(data[i]);
      assert.deepEqual([...steps].sort((x, y) => x - y), [0, 64, 128, 192], 'three steps of alpha, and clear');
      // From the outside in, along every row, the first pixel drawn is a thin one.
      for (let y = 0; y < h; y++) {
        let x = 0;
        while (x < w && !a(x, y)) x++;
        if (x < w) assert.ok(a(x, y) <= 128, `r ${r} v ${v}: row ${y} starts thin, not solid (${a(x, y)})`);
      }
      // Down the middle, top and bottom: a body puff (tones 0) darker beneath, a wisp (tones 1) light on top.
      const ends = (k) => {
        const p = mistPuff(r, v, k), col = [];
        for (let y = 0; y < p.h; y++) if (p.data[(y * p.w + (p.w >> 1)) * 4 + 3]) col.push((y * p.w + (p.w >> 1)) * 4);
        const rgb = (i) => '#' + [0, 1, 2].map((c) => p.data[i + c].toString(16).padStart(2, '0')).join('');
        return [rgb(col[0]), rgb(col[col.length - 1])];
      };
      assert.equal(ends(0)[1], '#265c42', 'the body darker beneath');
      assert.equal(ends(1)[0], '#c4f08e', 'a wisp lit on top');
    }
  }
});

test('the cloud and its whole trail are laid on the ground as one mist, once a frame, and glow once', () => {
  necro((g, p, w) => {
    input.bot = { x: 1, y: 0 };
    step(g, 90);
    const mine = g.effects.filter((e) => e.w === w);
    assert.ok(mine.some((e) => e instanceof Aura) && mine.filter((e) => e instanceof Pool).length >= 8, `a cloud and a trail (${mine.length})`);
    assert.ok(mine.every((e) => e.mist), 'all of it mist');
    const { ctx, calls } = counter();
    for (const e of mine) e.drawGround(ctx, g.cam);
    assert.equal(calls.length, 1, `laid on the ground in one piece, for ${mine.length} pieces`);
    calls.length = 0;
    for (const e of mine) e.drawGlow(ctx, g.cam);
    assert.equal(calls.length, 1, 'and glowing in one');
  });
});

test('drawing the mist takes nothing from the game\'s dice, so a seeded run plays the same', () => {
  necro((g, p, w) => {
    input.bot = { x: 1, y: 0 };
    step(g, 60);
    const { ctx } = counter();
    const random = Math.random;
    let n = 0;
    Math.random = () => (n++, random());
    try {
      const pool = new Pool(g, w, p.x, p.y, 12, 2.5, 1, 0.4, 'poison', false, { decay: true, sparse: true, kb: 0 });
      const all = [...g.effects.filter((e) => e.w === w), pool];
      for (const e of all) e.drawGround(ctx, g.cam);
      for (const e of all) e.drawGlow(ctx, g.cam);
    } finally {
      Math.random = random;
    }
    assert.equal(n, 0, 'no throw of the dice to make or draw it');
  });
});

test('the trail still hurts and sinks away as it did: reach R(1 - t/dur), gone in its time; Pestilence is the same mist', () => {
  necro((g, p, w) => {
    const f = g.spawnEnemy('zombie', p.x + 80, p.y, { instant: true, hpMul: 1e5 });
    f.spd = 0;
    const hp = f.hp;
    const pool = new Pool(g, w, f.x, f.y, 12, 2.5, 3, 0.4, 'poison', false, { decay: true, sparse: true, kb: 0, dot: 2 });
    g.effects.push(pool);
    g.grid.rebuild(g.enemies, p.x, p.y);
    for (let i = 0; i < 60; i++) pool.update(1 / 60);
    assert.ok(Math.abs(pool.r - 12 * (1 - pool.t / 2.5)) < 1e-9, 'its reach shrinks as before');
    assert.ok(f.hp < hp && f.dotType === 'poison', 'and it hurts and poisons what stands in it');
    while (pool.update(1 / 60));
    assert.ok(Math.abs(pool.t - 2.5) < 1 / 60, 'gone in its time');
    w.level = MAX_WEAPON_LEVEL;
    assert.ok(w.evolve());
    step(g, 2);
    const cloud = g.effects.find((e) => e instanceof Aura && e.w === w && !e.dead);
    assert.ok(cloud && cloud.mist, 'Pestilence\'s cloud is a mist');
    w.onKill(g.spawnEnemy('zombie', p.x, p.y + 50, { instant: true }));
    assert.ok(g.effects.some((e) => e instanceof Pool && e.w === w && e.mist && e.R > 12), 'and so is the pool a foe bursts into');
  });
});
