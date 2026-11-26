import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/headless.mjs';
import { buildSprites, SPR } from '../public/js/engine/sprites.js';
import { HEROES } from '../public/js/data/heroes.js';
import approved from '../public/assets/heroes-approved/index.js';

const opaque = (f) => f.buf.d.some((c) => c >>> 24);

test('every hero is drawn: frames of one size, animations that list them, feet in the frame, a menu pose', () => {
  buildSprites();
  for (const h of Object.values(HEROES)) {
    const s = SPR[h.sprite];
    assert.ok(s && s.frames.length, `${h.id} has a sprite`);
    assert.ok(s.frames.every((f) => f.w === s.w && f.h === s.h), `${h.id}: every frame ${s.w}x${s.h}`);
    for (const k of ['idle', 'walk', 'attack']) {
      for (const i of s[k] || []) assert.ok(Number.isInteger(i) && i >= 0 && i < s.frames.length && opaque(s.frames[i]), `${h.id}: ${k} frame ${i} is drawn`);
    }
    assert.ok(s.anchorY > 0 && s.anchorY < s.h, `${h.id}: feet inside the frame`);
    const pose = SPR[h.pose];
    assert.ok(pose && pose.frames.length && pose.frames.every(opaque), `${h.id}: a menu pose`);
  }
});

test('the approved sheets carry all indexed clips, exact dimensions and release timing', () => {
  buildSprites();
  for (const [id, data] of Object.entries(approved)) {
    const owner = id === 'knight' ? 'sentinel' : id;
    const spr = SPR[owner];
    for (const key of ['w', 'h', 'anchorY', 'idle', 'walk', 'attack', 'attackRelease', 'attackFps', 'floating']) {
      assert.deepEqual(spr[key], data[key], `${id}: ${key}`);
    }
    assert.equal(spr.frames.length, data.frames.length);
    if (!spr.floating) assert.deepEqual(spr.attackWalk, data.attackWalk, `${owner}: moving attacks reach the engine`);
    assert.equal(SPR[owner + '_pose'].fps, data.idleFps);
  }
  for (const id of Object.keys(HEROES)) {
    const spr = SPR[id];
    assert.ok(spr.idle.length >= 4, `${id}: a complete quiet idle loop`);
    assert.ok(new Set(spr.idle.map(i => [...spr.frames[i].buf.d].join(','))).size >= 3, `${id}: visible idle motion`);
    assert.ok(!spr.idle.some(i => spr.walk.includes(i) || spr.attack.includes(i)), `${id}: idle is separate from walking and attacking`);
    if (!spr.floating) {
      assert.equal(spr.attackWalk.length, spr.attack.length, `${id}: each authored attack has a moving clip`);
      for (const row of spr.attackWalk) {
        assert.equal(row.length, spr.walk.length, `${id}: moving attacks cover the full gait`);
        for (const frame of row) assert.ok(opaque(spr.frames[frame]), `${id}: authored moving attack is drawn`);
      }
    }
  }
});

test('every grounded walk and moving attack keeps substantive lower limbs and weapon pieces connected', () => {
  buildSprites();
  const failures = [];
  for (const id of Object.keys(HEROES)) {
    const spr = SPR[id];
    if (spr.floating) continue;
    const clips = [
      ...spr.walk.map((frame, gait) => ({ frame, label: `walk ${gait}` })),
      ...(spr.attackWalk || []).flatMap((row, attack) => row.map((frame, gait) => ({ frame, label: `attack ${attack}, gait ${gait}` }))),
    ];
    for (const { frame, label } of clips) {
        const { w, h, d } = spr.frames[frame].buf;
        const seen = new Uint8Array(d.length), parts = [];
        // Eight-neighbour connectivity respects diagonal one-pixel blades and
        // knees. A substantive part has at least three pixels at alpha>=128:
        // faint export fringe cannot masquerade as a load-bearing thigh, while
        // isolated 1-2px antialiased edges are left to visual review.
        for (let start = 0; start < d.length; start++) {
          if (seen[start] || (d[start] >>> 24) < 128) continue;
          const todo = [start];
          let pixels = 0, top = h, left = w;
          seen[start] = 1;
          while (todo.length) {
            const p = todo.pop(), x = p % w, y = Math.floor(p / w);
            pixels++; top = Math.min(top, y); left = Math.min(left, x);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx, yy = y + dy, next = yy * w + xx;
              if (xx < 0 || xx >= w || yy < 0 || yy >= h || seen[next] || (d[next] >>> 24) < 128) continue;
              seen[next] = 1; todo.push(next);
            }
          }
          parts.push({ pixels, top, left });
        }
        parts.sort((a, b) => b.pixels - a.pixels);
        // The Plumed Knight's last attack pose has three separate glints ahead
        // of the sword tip. They travel with the painted arc above the boots.
        const slashTrail = id === 'knight' && spr.attackWalk.at(-1).includes(frame);
        const detached = parts.slice(1).filter(p => p.top >= spr.anchorY - 10 && p.pixels >= 3 &&
          !(slashTrail && p.left >= 54));
        if (detached.length) failures.push({ hero: id, clip: label, detached });
    }
  }
  assert.deepEqual(failures, [], 'all lower anatomy/equipment defects across all poses are reported together');
});
