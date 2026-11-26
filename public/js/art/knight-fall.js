import { APPROVED_HERO_ART } from './approved-heroes.js';
import {
  SOUL_RELEASE, appendDecay, blank, cut, departingSoul, easeBetween, fallFrameAt,
  mix, paint, segment, turn,
} from './original-fall.js';

// The Sentinel inherits the original steel Knight's pivot and fall. The sword
// tip stays in the same patch of earth as the hand slips away and the shield lands.
export const KNIGHT_SHIELD_CONTACT = 0.76;
const restingShield = { x: 49, y: 54.5, angle: 68, width: 1.5 };
// time, pelvis x/y, cuirass and helmet angles, rear knee and ankle,
// forward knee and ankle, sword-hand x/y, sword angle, shield tip x/y and angle.
const poses = [
  [0,     36,43,   0,  0, 34,49,32,53, 40,49,41,53, 30,44, -66, 46,49,   0],
  [.09,   35,43, -11,-13, 32,49,31,53, 40,48,41,53, 29,43, -52, 45,48,  -5],
  [.15,   35,43,  -7, -8, 32,49,31,53, 41,48,42,53, 28,42, -34, 45,49,  -3],
  [.20,   35,44,  -3,  2, 32,50,30,53, 41,48,43,53, 27,42, -13, 46,50,  -1],
  [.245,  35,45,   1,  8, 32,51,29,53, 42,49,43,53, 26,42,   4, 46,51,  -4],
  [.29,   35,46,   3, 10, 33,52,29,53, 42,49,43,53, 26,42,   4, 46,52,  -3],
  [.35,   35,48,   4, 14, 34,53,29,53, 42,50,44,53, 26,42,   4, 46,53,   1],
  [.41,   35,49,   6, 17, 34,54,29,53, 42,50,44,53, 26,42,   4, 46,54,   4],
  [.48,   35,48,   5, 14, 34,54,29,53, 42,50,44,53, 26,42,   4, 46,53,   3],
  [.56,   35,49,  12, 24, 34,54,29,53, 42,51,44,53, 27,43,   4, 46,53,   8],
  [.62,   36,50,  25, 40, 34,54,29,53, 42,52,44,53, 30,46,   4, 46,53,  18],
  [.67,   37,51,  42, 58, 34,54,29,53, 43,52,45,53, 34,49,   7, 46,53,  34],
  [.715,  38,51,  59, 73, 35,54,29,53, 43,53,45,53, 37,51,   5, 46,54,  55],
  [KNIGHT_SHIELD_CONTACT, 39,51, 72, 86, 35,54,29,53, 43,53,45,53, 39,53,  3, 46,54,  78],
  [.805,  39,51,  65, 80, 35,54,29,53, 43,53,45,53, 39,52,   4, 46,54,  69],
  [.855,  39,51,  70, 86, 35,54,29,53, 43,53,45,53, 40,53,   4, 46,54,  77],
  [.92,   39,51,  72, 91, 35,54,29,53, 43,53,45,53, 40,53,   4, 46,54,  80],
];

export const knightFallFrame = seconds => fallFrameAt(poses, seconds);

function pieces(standing) {
  const sample = (x, y) => standing.d[y * standing.w + x];
  const colors = {
    '.': 0, '#': sample(38, 25), l: sample(34, 48), m: sample(35, 37),
    s: sample(35, 40), S: sample(38, 39), H: sample(30, 40), W: sample(38, 37),
    b: sample(33, 44), B: sample(32, 53), L: sample(43, 54), g: sample(31, 47),
  };
  const stamp = rows => ({
    w: rows[0].length, h: rows.length,
    d: Uint32Array.from(rows.join(''), key => colors[key]),
  });
  const helmet = cut(standing, 25, [
    [38,40],[37,41],[35,42],[34,43],[34,43],[34,43],[33,43],[32,42],[32,42],[32,42],[36,41],
  ]);
  const chest = cut(standing, 35, [
    [33,41],[33,41],[33,41],[33,41],[32,41],[32,41],[32,41],[32,41],[33,41],[34,41],[37,41],[39,41],
  ]);
  const shield = cut(standing, 34, [
    [43,47],[42,48],[42,48],[42,48],[42,48],[42,48],[42,48],[42,48],
    [42,48],[42,48],[43,48],[43,48],[43,47],[44,47],[44,46],[45,46],
  ]);
  const shoulder = cut(standing, 35, [[32,35],[31,35],[30,35],[30,34],[30,33]]);
  return {
    helmet, chest, shield, shoulder,
    thigh: stamp(['.llm.','#lms#','#mss#','#mSm#','#lmm#','.lm#.']),
    shin: stamp(['.lSl.','#SHS#','#mSm#','.BBB.','.BLB.','.BB#.']),
    boot: stamp(['.BB#..','.BLB#.','#BLLB#','######']),
    upperArm: stamp(['.mm.','#sS#','#mS#','#lm#','.l#.']),
    forearm: stamp(['.mm.','#SH#','#SH#','#ms#','.l#.']),
    glove: stamp(['.ml.','#SH#','#ms#','.##.']),
    sword: stamp([
      '..#b#..','..#B#..','..#L#..','..#b#..','.ggggg.','..#WS#.','..#WS#.',
      '..#HS#.','..#HS#.','..#HS#.','..#HS#.','..#HS#.','..#HS#.','..#Hs#.',
      '...Ss..','...S...','...s...',
    ]),
  };
}

function drawPose(standing, parts, pose) {
  const [time, x, y, lean, bow, kx, ky, ax, ay, fx, fy, bx, by, hx, hy, blade, sx, sy, tilt] = pose;
  const out = { w: standing.w, h: standing.h, d: new Uint32Array(standing.w * standing.h) };
  const hip = [x, y];
  const leg = (root, knee, ankle, bootAngle) => {
    segment(out, parts.thigh, root, knee);
    segment(out, parts.shin, knee, ankle);
    paint(out, parts.boot, [2, 1], ankle, bootAngle);
  };
  leg([x + 3, y + 1], [fx, fy], [bx, by], 0);
  const tuck = Math.min(1, Math.max(0, (ky - 50) / 3));
  leg([x - 1, y + 1], [kx, ky], [ax + 2 * tuck, ay], Math.min(80, (ky - 49) * 16));

  paint(out, parts.chest, [4, 8], hip, lean);
  const shoulder = turn([-3, -6], lean, hip);
  const hand = [hx, hy];
  const bent = Math.max(0, Math.min(1, (time - .15) / .12, (.7 - time) / .12));
  const elbow = [(shoulder[0] + hx) / 2 - 1 + 2.5 * bent, (shoulder[1] + hy) / 2 + 1.5 + 2.5 * bent];
  segment(out, parts.upperArm, shoulder, elbow);
  segment(out, parts.forearm, elbow, hand);
  paint(out, parts.shoulder, [2.5, 2], shoulder, lean * .7);

  const released = time >= .56;
  const swordPivot = released ? [3, 16] : [3, 2];
  const swordPosition = released ? [25, 55.75] : hand;
  paint(out, parts.sword, swordPivot, swordPosition, blade);
  paint(out, parts.glove, [1.5, 1.5], hand, released ? lean : blade);
  // The helmet bends over the shield's near rim, then settles onto it.
  // Its brow keeps moving a few degrees after the shield checks the shoulder.
  paint(out, parts.helmet, [5.5, 9.5], turn([1.5, -7.5], lean, hip), bow);
  const foreshorten = Math.max(0, tilt - 35) / 45;
  // The pointed rim strikes first. The face opens toward the viewer during
  // the bounce and comes to rest alongside the helmet.
  const settle = easeBetween(time, KNIGHT_SHIELD_CONTACT, .92);
  const tip = [mix(sx + 3 * foreshorten, restingShield.x, settle), mix(sy + foreshorten, restingShield.y, settle)];
  paint(out, parts.shield, [3.5, 15], tip, mix(tilt, restingShield.angle, settle), 1,
    mix(1 - .4 * foreshorten, restingShield.width, settle));
  return out;
}

function fallenWeapons(out, parts) {
  paint(out, parts.sword, [3,16], [25,55.75], 4);
  paint(out, parts.shield, [3.5,15], [restingShield.x, restingShield.y], restingShield.angle, 1, restingShield.width);
}

let frames;
export const KNIGHT_FALL = {
  anchorY: APPROVED_HERO_ART.knight.anchorY,
  outline: false,
  frameAt: knightFallFrame,
  wisp: departingSoul,
  cues: [
    { time: KNIGHT_SHIELD_CONTACT, sound: 'shieldfall' },
    { time: SOUL_RELEASE, sound: 'souldepart' },
  ],
  gen() {
    if (!frames) {
      const knight = APPROVED_HERO_ART.knight;
      const standing = knight.gen()[knight.idle[0]];
      const parts = pieces(standing);
      frames = poses.map((pose, index) => index ? drawPose(standing, parts, pose) : standing);
      const landed = frames.at(-1);
      const landedWeapons = blank(landed.w, landed.h);
      fallenWeapons(landedWeapons, parts);
      appendDecay(frames, landedWeapons);
    }
    return frames;
  },
};
