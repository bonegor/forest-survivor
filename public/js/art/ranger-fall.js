import { fromRows } from '../engine/pixels.js';
import { packedPalette } from './palette.js';
import { SOUL_RELEASE, appendDecay, blank, cut, departingSoul, fallFrameAt, paint, segment, turn } from './hero-fall.js';

// Seconds, hip, torso tilt, near knee and ankle, far knee and ankle,
// bow tip and tilt, and the hand she throws out to break the fall.
const release = .38;
const contact = .59;
const poses = [
  [0,      38,45,   0, 34,50,33,54, 40,50,41,54, 43,50,   0],
  [.10,    37,45,  -8, 33,50,33,54, 41,49,42,54, 44,50,  -5],
  [.16,    36,46, -12, 32,51,31,54, 42,48,43,51, 44,50, -10],
  [.22,    37,46,  -6, 33,51,31,54, 43,49,46,51, 44,51,  -5],
  [.28,    38,46,   5, 34,51,31,54, 43,50,48,54, 45,52,   0],
  [.33,    39,47,  15, 35,52,30,54, 45,51,48,54, 47,52,   6],
  [release,40,48,  24, 36,52,30,54, 45,52,48,54, 49,52,  12, 47,45],
  [.43,    40,49,  33, 36,53,29,54, 46,53,48,54, 51,52,  19, 49,47],
  [.48,    41,49,  44, 36,54,29,54, 46,53,47,54, 53,53,  24, 51,49],
  [.53,    41,50,  56, 36,54,28,54, 46,54,47,54, 54,54,  28, 54,52],
  [contact,42,51,  69, 36,54,28,54, 45,54,47,54, 55,57,  35, 56,55],
  [.64,    43,52,  82, 36,54,28,54, 45,54,46,54, 55,57,  29, 56,55],
  [.69,    43,52,  92, 36,54,28,54, 45,54,46,54, 55,57,  31, 57,55],
  [.75,    42,51,  85, 36,54,28,54, 45,54,46,54, 55,57,  30, 57,55],
  [.83,    42,52,  91, 36,54,28,54, 45,54,46,54, 55,57,  31, 56,55],
  [.94,    42,52,  92, 36,54,28,54, 45,54,46,54, 55,57,  31, 56,55],
];

// Preserve the full live head, hair, quiver and mantle. Split the lower rows
// at the belt and the bow grip so the long hem can fall across the knees.
function separateBody(standing) {
  const torso = cut(standing, 18, [
    ...Array(16).fill([24, 50]), ...Array(7).fill([24, 43]),
    [24,43],[24,44],[24,44],[24,45],[24,44],[24,42],
    [24,32],[24,31],[24,30],
  ]);
  return {
    torso,
    nearThigh: cut(standing, 46, [[33,38],[32,37],[32,36],[32,36],[32,35]]),
    nearShin: cut(standing, 49, [[32,35],[32,35],[32,35],[32,34],[31,34]]),
    nearBoot: cut(standing, 53, [[31,34],[31,34],[31,34]]),
    farThigh: cut(standing, 46, [[39,42],[39,42],[39,42],[39,42],[39,42]]),
    farShin: cut(standing, 49, [[39,42],[39,42],[39,42],[39,42],[40,42]]),
    farBoot: cut(standing, 53, [[40,42],[39,44],[39,44]]),
  };
}

// Uninterrupted string and wooden limbs behind the hand in the living sprite.
const pal = packedPalette();
const bow = fromRows([
  '  bm', '  DBm', '  D Bm', '  D  Bm', ' D   dm', ' D   Bm',
  ' D   Bm', ' D   bm', ' D   Im', ' D  mbm', ' D  Bm',
  ' D  dm', ' D Bm', ' D Bm', ' Ddm', ' Bm', 'bm',
], pal);
const bracingArm = fromRows([' mk', 'm2k', 'm2k', 'm3k', 'mSk', 'msk', ' kk'], pal);

function drawBow(out, x, y, angle) {
  // The lower nock drives through the turf and stays hidden as the stave rocks.
  paint({ ...out, h: 56 }, bow, [0, 16], [x, y], angle);
}

function fallPose(standing, parts, pose) {
  const [time, x, y, tilt, nx, ny, ax, ay, fx, fy, bx, by, bowX, bowY, bowTilt, hx, hy] = pose;
  const out = blank(standing.w, standing.h);
  segment(out, parts.farThigh, [x + 2, y + 1], [fx, fy]);
  segment(out, parts.farShin, [fx, fy], [bx, by]);
  paint(out, parts.farBoot, [2, 1], [bx, by], time >= .43 ? -Math.min(58, (time - .43) * 260) : 0);
  segment(out, parts.nearThigh, [x - 2, y + 1], [nx, ny]);
  segment(out, parts.nearShin, [nx, ny], [ax, ay]);
  paint(out, parts.nearBoot, [2, 1], [ax, ay], Math.min(68, (time - .16) * 150));
  const body = { ...out, h: 57 };
  paint(body, parts.torso, [14, 27], [x, y], tilt);
  if (time >= release) {
    const shoulder = turn([0, -10], tilt, [x, y]);
    segment(body, bracingArm, shoulder, [hx, hy - 1]);
  }
  drawBow(out, bowX, bowY, bowTilt);
  return out;
}

export function rangerFall(ranger) {
  let frames;
  return {
    anchorY: ranger.anchorY,
    outline: false,
    frameAt: seconds => fallFrameAt(poses, seconds),
    wisp: { ...departingSoul, offsetX: 13, offsetY: -5 },
    cues: [{ time: SOUL_RELEASE, sound: 'souldepart' }],
    gen() {
      if (frames) return frames;
      const standing = ranger.gen()[ranger.idle[0]];
      const parts = separateBody(standing);
      frames = poses.map((pose, i) => i ? fallPose(standing, parts, pose) : standing);
      const remains = blank(standing.w, standing.h);
      drawBow(remains, ...poses.at(-1).slice(12, 15));
      appendDecay(frames, remains);
      return frames;
    },
  };
}
