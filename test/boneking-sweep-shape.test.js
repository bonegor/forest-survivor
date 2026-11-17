import { deepEqual, equal } from 'node:assert/strict';
import test from 'node:test';
import { boneKingSweep, sweepHitsPlayer } from '../public/js/game/boneking-sweep.js';

test('Bone King sword sweep translates and mirrors exactly with the warning', () => {
  const right = boneKingSweep(0, 0, 1);
  const left = boneKingSweep(100, 200, -1);
  deepEqual(left, right.map(([x, y]) => [100 - x, 200 + y]));
  deepEqual(boneKingSweep(100, 200, 1, 2), right.map(([x, y]) => [100 + 2 * x, 200 + 2 * y]));
});

test('Bone King sword sweep hits the visible side and leaves its hollow safe', () => {
  for (const face of [1, -1]) {
    const points = boneKingSweep(100, 100, face);
    const hits = (dx, dy) => sweepHitsPlayer(points, { x: 100 + dx, y: 100 + dy });
    equal(hits(30 * face, 0), true, 'body in the crescent');
    equal(hits(30 * -face, 0), false, 'behind the boss');
    equal(hits(5 * face, -16), false, 'under the hollow of the arc');
    equal(hits(55 * face, 0), false, 'beyond the outside edge');
  }
});

test('Bone King sweep contacts the hero above the feet and reaches the bottom blade tip', () => {
  const points = boneKingSweep(0, 0, 1);
  equal(sweepHitsPlayer(points, { x: 29, y: -26 }), true, 'upper sweep touches the body');
  equal(sweepHitsPlayer(points, { x: 44, y: 43 }), true, 'blade tip touches the body');
  equal(sweepHitsPlayer(points, { x: 44, y: 53 }), false, 'hero is below the tip');
});
