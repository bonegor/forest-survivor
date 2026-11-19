import { fromRows } from '../engine/pixels.js';
import { packedPalette } from './palette.js';
import { SOUL_RELEASE, appendDecay, blank, cut, departingSoul, fallFrameAt, paint, segment } from './hero-fall.js';

// Seconds, hip, torso tilt, near knee and ankle, far knee and ankle, then
// lower bow tip and bow tilt. Positive angles pitch the upper body forward.
const contact = 0.55;
const poses = [
  [0,      38,45,   0, 34,50,33,54, 40,50,41,54, 43,50,   0],
  [.10,    37,45,  -7, 33,50,33,54, 40,49,42,54, 43,50,  -7],
  [.17,    36,46, -13, 32,51,32,54, 40,49,43,54, 43,50, -13],
  [.24,    36,47,  -7, 32,52,31,54, 40,50,43,54, 44,52,  -9],
  [.31,    36,48,   3, 32,53,30,54, 41,50,44,54, 46,51,  -3],
  [.37,    36,49,  12, 33,53,29,54, 42,51,44,54, 48,50,   3],
  [.43,    36,50,  21, 33,54,28,54, 42,52,45,54, 50,51,  10],
  [.49,    36,50,  33, 33,54,28,54, 42,52,45,54, 52,53,  18],
  [contact,37,51,  46, 33,54,28,54, 43,53,46,54, 53,55,  25],
  [.60,    37,51,  61, 33,54,28,54, 43,53,46,54, 53,57,  33],
  [.66,    38,51,  74, 33,54,28,54, 43,53,46,54, 53,57,  29],
  [.73,    38,50,  87, 33,54,28,54, 43,54,46,54, 53,57,  27],
  [.79,    38,50,  80, 33,54,28,54, 43,54,46,54, 53,57,  28],
  [.86,    38,50,  85, 33,54,28,54, 43,54,46,54, 53,57,  28],
  [.94,    38,50,  87, 33,54,28,54, 43,54,46,54, 53,57,  28],
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
const bow = fromRows([
  '  bm', '  DBm', '  D Bm', '  D  Bm', ' D   dm', ' D   Bm',
  ' D   Bm', ' D   bm', ' D   Im', ' D  mbm', ' D  Bm',
  ' D  dm', ' D Bm', ' D Bm', ' Ddm', ' Bm', 'bm',
], packedPalette());

function drawBow(out, x, y, angle) {
  // The lower nock drives through the turf and stays hidden as the stave rocks.
  paint({ ...out, h: 56 }, bow, [0, 16], [x, y], angle);
}

function fallPose(standing, parts, pose) {
  const [, x, y, tilt, nx, ny, ax, ay, fx, fy, bx, by, bowX, bowY, bowTilt] = pose;
  const out = blank(standing.w, standing.h);
  segment(out, parts.farThigh, [x + 2, y + 1], [fx, fy]);
  segment(out, parts.farShin, [fx, fy], [bx, by]);
  paint(out, parts.farBoot, [2, 1], [bx, by]);
  segment(out, parts.nearThigh, [x - 2, y + 1], [nx, ny]);
  segment(out, parts.nearShin, [nx, ny], [ax, ay]);
  paint(out, parts.nearBoot, [2, 1], [ax, ay]);
  paint(out, parts.torso, [14, 27], [x, y], tilt);
  drawBow(out, bowX, bowY, bowTilt);
  return out;
}

export function rangerFall(ranger) {
  let frames;
  return {
    anchorY: ranger.anchorY,
    outline: false,
    frameAt: seconds => fallFrameAt(poses, seconds),
    wisp: departingSoul,
    cues: [{ time: SOUL_RELEASE, sound: 'souldepart' }],
    gen() {
      if (frames) return frames;
      const standing = ranger.gen()[ranger.idle[0]];
      const parts = separateBody(standing);
      frames = poses.map((pose, i) => i ? fallPose(standing, parts, pose) : standing);
      const remains = blank(standing.w, standing.h);
      drawBow(remains, ...poses.at(-1).slice(-3));
      appendDecay(frames, remains);
      return frames;
    },
  };
}
