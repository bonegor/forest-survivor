import { APPROVED_HERO_ART } from './approved-heroes.js';
import { packedPalette } from './palette.js';
import { bounds, cloneBuf, makeBuf } from '../engine/pixels.js';

const ranger = APPROVED_HERO_ART.archer;
const ink = packedPalette();

// A fitted forester's hood. The little swept point is at the crown, above
// the quiver. The turned brim meets a short side panel over the ear.
const hood = [
  [35, '34'],
  [35, '4322334'],
  [36, '43222234'],
  [35, '4322222114'],
  [34, '432222113334'],
  [33, '4322114'],
  [32, '4322134'],
  [32, '4322234'],
  [32, '4332234'],
  [33, '43334'],
];

function raiseHood(frame, aiming) {
  const out = cloneBuf(frame);
  let crown = 23;
  while (crown < 36 && !frame.d[crown * frame.w + 39]) crown++;
  if (crown === 36) throw new Error('Missing Ranger hood anchor');
  for (const [row, [left, stitches]] of hood.entries()) {
    const y = crown - 1 + row;
    for (let column = 0; column < stitches.length; column++) {
      const x = left + column, i = y * frame.w + x;
      // The draw hand passes under the chin and the taut string crosses it.
      if (aiming && (frame.d[i] === ink.D || (y >= 37 && x < 37) || y >= 38)) continue;
      out.d[i] = ink[stitches[column]];
    }
  }
  return out;
}

let raised;
export const HOODED_RANGER_ART = {
  ...ranger,
  gen() {
    if (!raised) {
      const aiming = new Set([...ranger.attack.slice(0, 3), ...ranger.attackWalk.slice(0, 3).flat()]);
      raised = ranger.gen().map((frame, i) => raiseHood(frame, aiming.has(i)));
    }
    return raised;
  },
};

let poses;
export const HOODED_RANGER_POSE = {
  ...APPROVED_HERO_ART.archer_pose,
  gen() {
    if (!poses) {
      const world = HOODED_RANGER_ART.gen();
      const idle = ranger.idle.map(i => world[i]);
      const boxes = idle.map(bounds);
      const left = Math.min(...boxes.map(b => b.x0)), top = Math.min(...boxes.map(b => b.y0));
      const w = Math.max(...boxes.map(b => b.x1)) - left + 1;
      const h = Math.max(...boxes.map(b => b.y1)) - top + 1;
      poses = idle.map(frame => {
        const pose = makeBuf(w, h);
        for (let y = 0; y < h; y++) {
          const i = (top + y) * frame.w + left;
          pose.d.set(frame.d.subarray(i, i + w), y * w);
        }
        return pose;
      });
    }
    return poses;
  },
};
