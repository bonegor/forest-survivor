import { fromRows } from '../engine/pixels.js';
import { packedPalette } from './palette.js';
import { SOUL_RELEASE, appendDecay, blank, cut, departingSoul, fallFrameAt, paint, segment, turn } from './hero-fall.js';

// Seconds, hip, torso tilt, rear knee and ankle, forward knee and ankle,
// bow nock and tilt, then the rear and forward wrists after release.
const release = .38;
const poses = [
  [0,      38,45,   0, 34,50,33,54, 40,50,41,54, 43,50,   0],
  [.10,    37,45,  -8, 33,50,33,54, 41,49,42,54, 44,50,  -5],
  [.16,    36,46, -12, 32,51,31,54, 42,48,43,51, 44,50, -10],
  [.22,    37,46,  -6, 33,51,31,54, 43,49,46,51, 44,51,  -5],
  [.28,    37,47,   4, 34,52,31,54, 43,48,47,54, 45,52,   0],
  [.33,    37,49,   9, 35,54,30,54, 44,48,47,54, 46,52,   6],
  [release,37,50,  12, 35,54,30,54, 44,49,47,54, 48,52,  12, 38,44, 50,46],
  [.43,    37,49,  11, 35,54,30,54, 44,48,47,54, 51,52,  19, 40,45, 49,46],
  [.48,    38,49,  19, 35,54,30,54, 44,49,47,54, 53,53,  24, 44,47, 50,46],
  [.53,    39,49,  31, 35,54,30,54, 44,50,47,54, 54,54,  28, 47,49, 53,48],
  [.58,    40,49,  44, 35,54,29,54, 44,51,47,54, 58,57,  35, 49,52, 56,53],
  [.63,    41,49,  49, 35,54,29,54, 44,52,47,54, 58,57,  29, 51,54, 57,54],
  [.69,    42,50,  57, 35,54,29,54, 43,53,46,54, 58,57,  31, 51,54, 57,54],
  [.75,    43,52,  79, 36,54,29,54, 41,54,45,54, 58,57,  31, 51,54, 57,54],
  [.83,    43,52,  88, 36,54,29,54, 40,54,44,54, 58,57,  31, 50,54, 57,54],
  [.94,    43,52,  91, 36,54,29,54, 40,54,44,54, 58,57,  31, 50,54, 57,54],
];

// Split the trailing mantle off the torso so it pools as the chest comes down.
function separateBody(standing) {
  return {
    torso: cut(standing, 27, [
      ...Array(7).fill([32, 45]), ...Array(7).fill([32, 43]),
      [33,41],[34,41],[34,41],[34,42],[35,42],[35,42],[35,41],[36,41],
    ]),
    mantle: cut(standing, 34, [
      ...Array(7).fill([27,34]), [28,35],[28,35],[27,35],[27,35],
      [27,36],[27,36],[28,36],[28,34],[28,32],
    ]),
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
const sleeve = fromRows([' m2k', 'm22k', 'm23k', 'm33k', ' mk'], pal);
const bracer = fromRows([' mk', 'mHk', 'mBk', 'mSk', ' mk'], pal);
const palm = fromRows([' mk', 'mSsk', 'mSTSsk', ' mkkkk'], pal);

function drawBow(out, x, y, angle) {
  // The lower nock drives through the turf and stays hidden as the stave rocks.
  paint({ ...out, h: 56 }, bow, [0, 16], [x, y], angle);
}

function fallPose(standing, parts, pose) {
  const [time, x, y, tilt, nx, ny, ax, ay, fx, fy, bx, by, bowX, bowY, bowTilt, rx, ry, hx, hy] = pose;
  const out = blank(standing.w, standing.h);
  const body = { ...out, h: 56 };
  const hip = [x, y];
  const arm = (offset, wrist, bend) => {
    const shoulder = turn(offset, tilt, hip);
    const elbow = [(shoulder[0] + wrist[0]) / 2 - bend, (shoulder[1] + wrist[1]) / 2 + 1];
    segment(body, sleeve, shoulder, elbow);
    segment(body, bracer, elbow, wrist);
    paint(body, palm, [2, 1], wrist, wrist[1] >= 53 ? 0 : 32);
  };

  segment(body, parts.farThigh, [x + 2, y], [fx, fy]);
  segment(body, parts.farShin, [fx, fy], [bx, by]);
  paint(body, parts.farBoot, [2, 1], [bx, by], -Math.max(0, tilt - 50));
  segment(body, parts.nearThigh, [x - 2, y], [nx, ny]);
  segment(body, parts.nearShin, [nx, ny], [ax, ay]);
  paint(body, parts.nearBoot, [2, 1], [ax, ay], Math.min(64, Math.max(0, (ny - 50) * 16)));
  const cloakSwing = Math.min(65, tilt * .75);
  paint(body, parts.mantle, [6, 5], turn([-4, -6], tilt, hip), cloakSwing);
  if (time >= release) arm([1, -9], [rx, ry], 1.5);
  paint(body, parts.torso, [6, 18], hip, tilt);
  arm([3, -7], time >= release ? [hx, hy] : turn([5, -7], bowTilt, [bowX, bowY]), 2);
  drawBow(out, bowX, bowY, bowTilt);
  return out;
}

export function rangerFall(ranger) {
  let frames;
  return {
    anchorY: ranger.anchorY,
    outline: false,
    frameAt: seconds => fallFrameAt(poses, seconds),
    wisp: { ...departingSoul, offsetX: 16, offsetY: -5 },
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
