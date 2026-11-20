import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_HERO_ART } from '../public/js/art/approved-heroes.js';
import { HERO_ART } from '../public/js/art/heroes.js';
import { packedPalette } from '../public/js/art/palette.js';
import { bounds } from '../public/js/engine/pixels.js';

function nearIris(frame) {
  for (let y = 32; y <= 35; y++) {
    for (let x = 36; x <= 42; x++) {
      const color = frame.d[y * frame.w + x];
      const red = color & 255, green = color >>> 8 & 255, blue = color >>> 16 & 255;
      if ((color >>> 24) > 220 && blue >= green + 20 && green >= red + 20) return { x, y };
    }
  }
  assert.fail('missing near blue iris in the source sheet');
}

test('Trail keeps her face, bow, body and gait beneath the fitted hood', () => {
  const base = APPROVED_HERO_ART.trailblazer;
  const source = base.gen();
  const hooded = HERO_ART.trailblazer.gen();
  const palette = packedPalette();
  const cloth = new Set(['1', '2', '3', '4'].map(key => palette[key]));
  assert.equal(hooded.length, source.length);
  for (const key of ['idle', 'walk', 'attack', 'attackWalk', 'attackRelease', 'attackFps', 'motionRate', 'idleRate', 'anchorY']) {
    assert.deepEqual(HERO_ART.trailblazer[key], base[key], key);
  }
  for (const [index, frame] of source.entries()) {
    const after = hooded[index];
    assert.deepEqual([after.w, after.h], [frame.w, frame.h]);
    const eye = nearIris(frame);
    const ink = (dx, dy) => after.d[(eye.y + dy) * frame.w + eye.x + dx];
    // Viewed from the side, the ear sits behind the iris. Below it the
    // back seam steps in toward the neck instead of rounding over the quiver.
    for (const dy of [-1, 0]) assert.ok(cloth.has(ink(-3, dy)), 'ear covered in frame ' + index);
    for (const [dy, back] of [[0, -5], [1, -4], [2, -3]]) {
      assert.ok(cloth.has(ink(back, dy)), 'continuous cloth to the nape in frame ' + index);
      assert.ok(!cloth.has(ink(back - 1, dy)), 'rear fold follows the head in frame ' + index);
    }
    for (let i = 0; i < frame.d.length; i++) {
      if (frame.d[i] === after.d[i]) continue;
      const dx = i % frame.w - eye.x, dy = Math.floor(i / frame.w) - eye.y;
      assert.ok(dx >= -7 && dx <= 6 && dy >= -8 && dy <= 2, 'body or bow changed in frame ' + index);
      assert.ok(dy < 0 || dx < 0, 'iris or cheek covered in frame ' + index);
      if (dy >= -1 && dx < -5) {
        const color = frame.d[i];
        assert.ok((color & 255) <= (color >>> 16 & 255) + 8, 'rear fletching covered in frame ' + index);
      }
    }
  }
});

test('the hooded selection poses reproduce the world idle frames on a shared crop', () => {
  const trail = HERO_ART.trailblazer;
  const frames = trail.gen();
  const idle = trail.idle.map(i => frames[i]);
  const boxes = idle.map(bounds);
  const left = Math.min(...boxes.map(b => b.x0)), top = Math.min(...boxes.map(b => b.y0));
  const width = Math.max(...boxes.map(b => b.x1)) - left + 1;
  const height = Math.max(...boxes.map(b => b.y1)) - top + 1;
  const poses = HERO_ART.trailblazer_pose.gen();
  assert.equal(poses.length, idle.length);
  for (const [i, pose] of poses.entries()) {
    assert.deepEqual([pose.w, pose.h], [width, height]);
    for (let y = 0; y < pose.h; y++) {
      const start = (top + y) * idle[i].w + left;
      assert.deepEqual(pose.d.subarray(y * pose.w, (y + 1) * pose.w), idle[i].d.subarray(start, start + pose.w));
    }
  }
});
