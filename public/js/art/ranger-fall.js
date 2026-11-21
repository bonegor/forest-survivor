import { fromRows } from '../engine/pixels.js';
import { packedPalette } from './palette.js';
import { SOUL_RELEASE, appendDecay, blank, cut, departingSoul, fallFrameAt, paint, segment, turn } from './hero-fall.js';

// Lyra catches herself low on the bow. The front knee folds under the
// quiver before the bow hand lets go and the shoulder rolls down beside it.
// Seconds, hip, upper-body angle, back knee/ankle, forward knee/ankle, nock and bow angle.
const poses = [
  [0,    38,45,  0, 34,50,33,54, 40,50,41,54, 43,50, 0],
  [.13,  37,45, -4, 34,50,32,54, 41,49,42,54, 42,50, 0],
  [.23,  37,46,  0, 33,51,32,54, 42,49,43,54, 42,51, 1],
  [.34,  38,46,  6, 33,52,31,54, 43,49,44,54, 42,52, 2],
  [.45,  38,47, 12, 33,53,31,54, 44,50,44,54, 43,53, 3],
  [.54,  39,47, 18, 33,54,30,54, 45,50,44,54, 44,55, 6],
  [.64,  39,47, 25, 33,54,30,54, 45,51,43,54, 45,56, 8],
  [.73,  39,48, 32, 33,54,30,54, 45,52,41,54, 45,56,11],
  [.82,  39,48, 36, 33,54,30,54, 44,53,39,54, 45,56,14],
  [.94,  39,48, 39, 33,54,30,54, 43,54,38,54, 45,56,16],
  [1.05, 39,48, 41, 33,54,30,54, 43,54,38,54, 45,56,18],
  [1.25, 39,49, 44, 34,54,30,54, 43,54,38,54, 45,56,20],
  [1.32, 39,49, 50, 34,54,31,54, 43,54,38,54, 45,56,28],
  [1.39, 39,50, 59, 35,54,31,54, 43,54,38,54, 45,56,37],
  [1.46, 38,51, 69, 35,54,31,54, 42,54,38,54, 45,56,46],
  [1.54, 37,52, 80, 35,54,31,54, 42,54,38,54, 45,56,54],
  [1.63, 37,52, 88, 35,54,31,54, 41,54,38,54, 45,56,57],
];

// Split the trailing mantle off the torso so it pools as the chest comes down.
function separateBody(standing) {
  return {
    face: cut(standing,27,[
      ...Array(7).fill([32,45]),[34,44],[34,44],[35,43],
    ]),
    torso: cut(standing,36,[
      ...Array(5).fill([32,43]),[33,41],[34,41],[34,41],[34,42],
      [35,42],[35,42],[35,41],[36,41],
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
const sleeve = fromRows([' mk', 'm2k', 'm3k', ' mk'], pal);
const bracer = fromRows([' mk', 'mBk', 'mSk', ' mk'], pal);
const glove = fromRows(['mk ', 'mSk', ' kk'], pal);

function drawBow(out, x, y, angle) {
  paint({ ...out, h: 56 }, bow, [0, 16], [x, y], angle);
}

function bowArm(out, shoulder, grip) {
  // Two native forearm-length links stay bent around the stave.
  const dx=grip[0]-shoulder[0], dy=grip[1]-shoulder[1];
  const distance=Math.hypot(dx,dy), reach=Math.min(distance,8.4);
  const ux=dx/distance, uy=dy/distance;
  const bend=Math.sqrt(Math.max(0,4.2**2-(reach/2)**2));
  const wrist=[shoulder[0]+ux*reach,shoulder[1]+uy*reach];
  const elbow=[shoulder[0]+ux*reach/2-uy*bend,shoulder[1]+uy*reach/2+ux*bend];
  segment(out,sleeve,shoulder,elbow);
  segment(out,bracer,elbow,wrist);
  paint(out,glove,[1,1],wrist);
}

function fallPose(standing, parts, pose) {
  const [time, x, y, tilt, nx, ny, ax, ay, fx, fy, bx, by, bowX, bowY, bowTilt] = pose;
  const out = blank(standing.w, standing.h);
  const body = { ...out, h: 56 };
  const hip = [x, y];
  segment(body, parts.farThigh, [x + 2, y], [fx, fy]);
  segment(body, parts.farShin, [fx, fy], [bx, by]);
  paint(body, parts.farBoot, [2, 1], [bx, by], -Math.max(0, tilt - 50));
  segment(body, parts.nearThigh, [x - 2, y], [nx, ny]);
  segment(body, parts.nearShin, [nx, ny], [ax, ay]);
  paint(body, parts.nearBoot, [2, 1], [ax, ay], Math.min(64, Math.max(0, (ny - 50) * 16)));
  const cloakSwing = Math.min(65, tilt * .75);
  paint(body, parts.mantle, [6, 5], turn([-4, -6], tilt, hip), cloakSwing);
  paint(body, parts.torso, [6, 9], hip, tilt);
  const neck=turn([0,-8],tilt,hip);
  // She turns her cheek toward the turf instead of pitching face first.
  paint(body,parts.face,[6,10],neck,tilt-Math.max(0,tilt-45)*.55);
  drawBow(out, bowX, bowY, bowTilt);
  const shoulder=turn([3,-7],tilt,hip);
  // The knuckles slide down the grip as the nock meets the turf. On
  // release the short forearm turns back against the quiver strap.
  const nock=turn([5,-10],bowTilt,[bowX,bowY]);
  const cuff=turn([3,-5],tilt,hip);
  const slip=Math.min(1,Math.max(0,(time-1.25)/.20));
  bowArm(body,shoulder,[nock[0]+(cuff[0]-nock[0])*slip,nock[1]+(cuff[1]-nock[1])*slip]);
  if (slip===1) drawBow(out,bowX,bowY,bowTilt);
  return out;
}

export function rangerFall(ranger) {
  let frames;
  return {
    anchorY: ranger.anchorY,
    outline: false,
    frameAt: seconds => fallFrameAt(poses, seconds),
    wisp: { ...departingSoul, offsetX: 5, offsetY: -5 },
    cues: [{ time: SOUL_RELEASE, sound: 'souldepart' }],
    gen() {
      if (frames) return frames;
      const standing = ranger.gen()[ranger.idle[0]];
      const parts = separateBody(standing);
      frames = poses.map((pose, i) => i ? fallPose(standing, parts, pose) : standing);
      const remains = blank(standing.w, standing.h);
      drawBow(remains, ...poses.at(-1).slice(12, 15));
      appendDecay(frames, remains, ranger.anchorY - 1);
      return frames;
    },
  };
}
