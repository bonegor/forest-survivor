import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_HERO_ART } from '../public/js/art/approved-heroes.js';
import { HOODED_RANGER_ART, HOODED_RANGER_POSE } from '../public/js/art/ranger-hood.js';
import { packedPalette } from '../public/js/art/palette.js';
import { bounds } from '../public/js/engine/pixels.js';

test('the fitted hood covers the ear and clears the eyes, quiver and draw hand in every pose', () => {
  const base = APPROVED_HERO_ART.archer;
  const source = base.gen();
  const original = source.map(frame => frame.d.slice());
  const hooded = HOODED_RANGER_ART.gen();
  assert.equal(hooded.length, source.length);
  const aiming = new Set([...base.attack.slice(0, 3), ...base.attackWalk.slice(0, 3).flat()]);
  const palette = packedPalette();
  const hair = new Set(['k', 'm', 'b', 'O', 'd', 'B'].map(key => palette[key]));
  const cloth = new Set(['1', '2', '3', '4'].map(key => palette[key]));
  for (const [i, after] of hooded.entries()) {
    const { d, w } = source[i];
    assert.deepEqual(d, original[i], 'bareheaded art is still independently selectable');
    let crown = 23;
    while (crown < 36 && !d[crown * w + 39]) crown++;
    assert.ok(crown < 36);
    assert.equal(after.d[(crown - 1) * w + 35], palette['3'], 'the swept crown tracks the head');
    for (const [x, y] of [[39, crown + 6], [42, crown + 6], [40, crown + 7]]) {
      assert.equal(after.d[y * w + x], d[y * w + x], 'eye and cheek are visible beneath the hood');
    }
    for (let j = 0; j < d.length; j++) {
      const x = j % w, y = Math.floor(j / w);
      const foreground = aiming.has(i) && (d[j] === palette.D || (y >= 37 && x < 37) || y >= 38);
      // The pointed ear and its root sit just behind the near eye.
      const ear = (y === crown + 6 && x >= 35 && x <= 38) ||
        (y === crown + 7 && x >= 36 && x <= 38);
      if (ear && !foreground) assert.ok(cloth.has(after.d[j]), 'ear is tucked inside the hood in pose ' + i);
      // Keep the visible fletching behind the ear and the whole nape and collar.
      const behindEar = x < 32 || (y >= crown + 8 && x < 33);
      if (behindEar || y > crown + 8 || x > 45 || foreground) assert.equal(after.d[j], d[j]);
      if (after.d[j] !== d[j] && d[j] && !ear) assert.ok(hair.has(d[j]), 'cloth outside the ear follows the hair');
    }
  }
});

test('cropped hooded poses register to a common box over the entire idle sequence', () => {
  const frames = HOODED_RANGER_ART.gen();
  const idle = HOODED_RANGER_ART.idle.map(i => frames[i]);
  const boxes = idle.map(bounds);
  const left = Math.min(...boxes.map(b => b.x0)), top = Math.min(...boxes.map(b => b.y0));
  const poses = HOODED_RANGER_POSE.gen();
  assert.equal(poses.length, idle.length);
  for (const [i, pose] of poses.entries()) {
    assert.equal(pose.w, Math.max(...boxes.map(b => b.x1)) - left + 1);
    assert.equal(pose.h, Math.max(...boxes.map(b => b.y1)) - top + 1);
    for (let y = 0; y < pose.h; y++) {
      const start = (top + y) * idle[i].w + left;
      assert.deepEqual(pose.d.subarray(y * pose.w, (y + 1) * pose.w), idle[i].d.subarray(start, start + pose.w));
    }
  }
});
