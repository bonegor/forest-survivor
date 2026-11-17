import { pointSegGap, segBoxGap } from './hitbox.js';
import { HERO_BODY } from './projectiles.js';

// The crescent and blade in floating Bone King frame 20, traced in world pixels
// from his feet. The concave inner edge follows the open part of the crescent.
const SWEEP = [
  [5, -69], [11, -65], [20, -62], [28, -55], [34, -46],
  [38, -34], [41, -26], [42, -17], [40, -7], [39, 10],
  [44, 18], [45, 20], [42, 20], [38, 17], [30, 10],
  [20, 0], [14, -6], [13, -14], [14, -19], [18, -26],
  [20, -37], [19, -48], [15, -58], [10, -64],
];

export function boneKingSweep(x, y, face, scale = 1) {
  const direction = face < 0 ? -1 : 1;
  return SWEEP.map(([dx, dy]) => [x + dx * direction * scale, y + dy * scale]);
}

export function sweepHitsPlayer(points, player) {
  const { x, y } = player;
  const { top, foot, r } = HERO_BODY;
  const high = y - top;
  const low = y - foot;
  const middle = (high + low) / 2;
  let inside = false;

  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    // An upright capsule is a box with round caps, as used by aimed enemy shots.
    if (segBoxGap(ax, ay, bx, by, x - r, high, x + r, low) === 0 ||
        pointSegGap(x, high, ax, ay, bx, by) <= r ||
        pointSegGap(x, low, ax, ay, bx, by) <= r) return true;
    if ((ay > middle) !== (by > middle) && x < ax + (bx - ax) * (middle - ay) / (by - ay)) {
      inside = !inside;
    }
  }

  // An upright capsule completely inside the shape never crosses its edges.
  return inside;
}
