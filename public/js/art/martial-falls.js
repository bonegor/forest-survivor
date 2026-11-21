import { fromRows } from '../engine/pixels.js';
import {
  SOUL_RELEASE, appendDecay, blank, cut, departingSoul, easeBetween, fallFrameAt, mix, paint, segment, turn,
} from './original-fall.js';

const GROUND = 56;
const TIMES = Array.from({ length: 35 }, (_, i) => [i / 32]);

const at = (buf, x, y) => buf.d[y * buf.w + x];

function pixels(buf, samples, rows) {
  const palette = Object.fromEntries(Object.entries(samples).map(([k, [x, y]]) => [k, at(buf, x, y)]));
  return fromRows(rows, palette);
}

function lineArt(light, edge, middle, wide) {
  return fromRows(wide ? ['.ee.', 'emle', 'emle', 'emle', 'emle', '.ee.']
    : ['.m.', 'elm', 'elm', 'elm', 'elm', '.e.'], { l: light, e: edge, m: middle });
}

function palmArt(light, edge, middle) {
  return fromRows(['.em..', 'emll.', 'emmlm', '.eeee'], { l: light, e: edge, m: middle });
}

const rectangular = (x0, x1, count) => Array.from({ length: count }, () => [x0, x1]);

function paladinParts(buf) {
  const upper = cut(buf, 24, [
    ...rectangular(30, 44, 12), [30,42], [30,42], [30,42], [30,42], [32,41],
    [31,41], [31,41], [31,41], [31,41], [30,41], [30,41], [30,41], [30,41],
    [31,41], [31,40],
  ]);
  const sword = pixels(buf, {
    e: [28,45], m: [26,47], l: [27,46], w: [25,47], f: [23,50],
    g: [24,49], a: [27,42], h: [27,44], d: [28,43],
  }, [
    '.....aa...........',
    '....ahgmmmmmmmm...',
    'eddhggmllwwwwllgf.',
    'eddhggllwwwwwgffff',
    '....ahgmmmmmgggf..',
    '.....aa...........',
  ]);
  const shield = cut(buf, 34, [
    [44,46], [43,47], [43,48], [42,48], [42,48], [41,48], [43,48],
    [43,48], [43,48], [43,48], [43,48], [43,47], [43,48], [44,47], [44,47], [44,47],
  ]);
  return {
    upper, pivot: [6, 20],
    arm: lineArt(at(buf, 35, 36), at(buf, 35, 39), at(buf, 33, 40), true),
    cuff: lineArt(at(buf, 27, 42), at(buf, 27, 41), at(buf, 28, 43), true),
    palm: palmArt(at(buf, 27, 42), at(buf, 27, 41), at(buf, 28, 43)),
    leg: lineArt(at(buf, 33, 48), at(buf, 36, 48), at(buf, 32, 49), true),
    shin: lineArt(at(buf, 32, 54), at(buf, 33, 55), at(buf, 32, 52), true),
    boots: [cut(buf, 52, rectangular(28, 34, 5)), cut(buf, 52, rectangular(39, 47, 5))],
    bootPivots: [[4, 2], [3, 2]],
    gear: [
      { art: sword, grip: [4, 2.5], tip: [17, 3],
        track: [[0,30,42,142], [.17,28,41,116], [.30,27,40,99], [.40,26,41,81]],
        land: [.49, 25, 81, 67] },
      { art: shield, grip: [3, 7], tip: [3, 15],
        track: [[0,45,41,0], [.18,44,42,-10], [.34,46,43,9], [.49,50,47,31], [.54,52,48,51]],
        land: [.75, 63, 73, 72] },
    ],
  };
}

function berserkerParts(buf) {
  const upper = cut(buf, 26, [
    ...rectangular(33, 41, 8), [30,41], [29,42], [28,43], [28,43], [28,43],
    [31,42], [31,41], [32,41], [32,41], [32,41], [32,41], [32,42],
    [32,43], [32,43], [32,42], [32,42],
  ]);
  const axe = pixels(buf, {
    e: [24,41], d: [25,42], m: [24,43], L: [24,44], w: [23,44],
    b: [36,47], h: [38,44], g: [37,45],
  }, [
    '..................',
    '...........edm....',
    '...........edL....',
    'bbbbbbbbbbbeed....',
    'bghghghghghddde...',
    'bbbbbbbbbbbmLLe...',
    '..........mmLLde..',
    '.........mmLwLde..',
    '.........LwwLLde..',
    '..........wwde....',
  ]);
  return {
    upper, pivot: [9, 20],
    arm: lineArt(at(buf, 36, 38), at(buf, 35, 42), at(buf, 34, 39), true),
    cuff: lineArt(at(buf, 46, 44), at(buf, 47, 45), at(buf, 46, 45), true),
    palm: palmArt(at(buf, 46, 44), at(buf, 47, 45), at(buf, 46, 45)),
    leg: lineArt(at(buf, 34, 48), at(buf, 33, 49), at(buf, 35, 49), true),
    shin: lineArt(at(buf, 33, 51), at(buf, 30, 52), at(buf, 33, 53), true),
    boots: [cut(buf, 51, rectangular(29, 34, 5)), cut(buf, 51, rectangular(39, 46, 5))],
    bootPivots: [[3, 2], [2, 2]],
    gear: [
      { art: axe, grip: [4, 4], tip: [15, 8],
        track: [[0,29,44,162], [.17,27,43,145], [.35,25,41,110], [.45,24,43,85]],
        land: [.57, 23, 91, 101] },
      { art: axe, grip: [4, 4], tip: [15, 8],
        track: [[0,46,44,6], [.17,44,43,-16], [.30,46,44,9], [.46,49,45,36], [.51,51,45,52]],
        land: [.67, 65, 69, 84] },
    ],
  };
}

function witchHunterParts(buf) {
  const upper = cut(buf, 25, [
    ...rectangular(28, 47, 10), [31,42], [30,42], [30,40], [30,40], [29,39],
    [29,37], [29,36], [30,36], [30,35], [29,34], [29,35], [29,37], [29,38], [28,38],
  ]);
  const crossbow = pixels(buf, {
    e: [47,40], d: [49,42], m: [43,42], l: [44,42], s: [46,42], S: [44,40], w: [46,40],
  }, [
    '.........sw.......',
    '.........SSs......',
    '.........s.sS.....',
    '.........s..wS....',
    '.ddddddssssssSSd..',
    'deemmmllmmmmmmSSe.',
    'demmlmmllmmmdSSwdS',
    'edddmmmmmdedsSde..',
    '.e..dddde..wS.....',
    '.........ssS......',
    '.........sS.......',
  ]);
  return {
    upper, pivot: [10, 22],
    arm: lineArt(at(buf, 33, 40), at(buf, 31, 43), at(buf, 30, 39), true),
    cuff: lineArt(at(buf, 45, 42), at(buf, 42, 46), at(buf, 43, 43), true),
    palm: palmArt(at(buf, 45, 42), at(buf, 42, 46), at(buf, 43, 43)),
    leg: lineArt(at(buf, 34, 47), at(buf, 36, 50), at(buf, 34, 49), true),
    shin: lineArt(at(buf, 32, 54), at(buf, 30, 53), at(buf, 32, 52), true),
    boots: [cut(buf, 51, rectangular(29, 35, 6)), cut(buf, 51, rectangular(39, 46, 6))],
    bootPivots: [[3, 2], [2, 2]],
    gear: [
      { art: crossbow, grip: [6, 6], tip: [17, 6],
        track: [[0,41,42,0], [.14,41,42,-15], [.29,43,43,3], [.42,47,44,39], [.50,52,44,54]],
        land: [.67, 67, 78, 103] },
    ],
    twoHanded: true,
  };
}

function tween(rows, t) {
  const next = rows.findIndex(row => row[0] > t);
  if (next < 0) return rows.at(-1).slice(1);
  const from = rows[Math.max(0, next - 1)], to = rows[next];
  const k = next === 0 ? 0 : (t - from[0]) / (to[0] - from[0]);
  return from.slice(1).map((n, i) => mix(n, to[i + 1], k));
}

function onImpact(item, row, angle) {
  const [, x] = item.land;
  const [gx, gy] = item.grip, [tx, ty] = item.tip;
  return [...turn([gx - tx, gy - ty], angle, [x, row]), angle];
}

function gearPose(item, t) {
  const [contact, , angle, rest] = item.land;
  const end = item.track.at(-1)[0];
  if (t <= end) return tween(item.track, t);
  const impact = onImpact(item, GROUND + .8, angle);
  if (t < contact) return tween([item.track.at(-1), [contact, ...impact]], t);
  const rock = t - contact;
  return onImpact(item, GROUND + 1.9, tween([
    [0, angle], [.05, rest + (rest - angle) * .44], [.1, rest - (rest - angle) * .20], [.17, rest],
  ], rock)[0]);
}

// Time, pelvis displacement and body pitch, rear knee and ankle, lead knee
// and ankle, rear and lead wrist. Limb x positions are relative to the starting hip.
// Keep the dropped knee still while the other foot bears weight. Then pin the
// wrists as the hips tip forward and the bent arms fold under the torso.
const shieldStumble = [
  [0,    0, 0,  0, -5,51,-6,53,   4,51, 4,53,  -6,42, 9,41],
  [.10, -1, 0,-10, -6,51,-7,53,   4,50, 5,52,  -7,41, 8,42],
  [.20, -1, 1, -6, -6,51,-8,53,   5,48, 7,49,  -8,40, 9,43],
  [.29,  0, 3,  5, -5,53,-9,53,   7,47, 9,52,  -8,41,10,44],
  [.37,  1, 5, 10, -3,54,-9,53,   8,47,10,53,  -6,44,13,46],
  [.46,  1, 5, 15, -3,54,-9,53,   8,47,10,53,   4,47,15,48],
  [.54,  2, 5, 28, -3,54,-9,53,   9,49,10,53,  11,52,18,50],
  [.61,  3, 5, 40, -3,54,-9,53,   7,51,10,53,  14,55,20,53],
  [.67,  4, 5, 49, -3,54,-9,53,   5,54, 8,53,  14,55,22,55],
  [.73,  5, 5, 64, -4,55,-10,53,  2,54, 3,54,  14,55,22,55],
  [.80,  6, 5, 90, -5,55,-12,53, -1,53,-3,54,  14,55,22,55],
  [.88,  6, 5, 94, -5,55,-12,53, -2,53,-4,54,  14,55,22,55],
];

// The Berserker keeps the lead leg further out as both axes pull free.
const axeStumble = [
  [0,    0, 0,  0, -4,50,-5,53,   4,50, 4,53,  -8,44, 9,44],
  [.11, -1,-1,-11, -5,50,-6,53,   4,50, 5,53,  -9,43, 8,43],
  [.22, -2, 0, -7, -6,50,-7,51,   6,49, 7,52, -11,42, 9,44],
  [.31, -1, 2,  4, -5,52,-9,53,   8,48, 9,53, -11,42,11,44],
  [.40,  0, 4, 13, -3,54,-10,53,  9,48,11,53,  -9,45,13,45],
  [.48,  1, 4, 24, -3,54,-10,53,  9,49,11,53,   4,49,15,49],
  [.55,  2, 4, 35, -3,54,-10,53,  8,50,11,53,  11,52,18,52],
  [.62,  3, 4, 46, -3,54,-10,53,  7,53,10,53,  13,55,20,55],
  [.68,  4, 4, 53, -3,54,-10,53,  5,54, 8,53,  13,55,20,55],
  [.75,  5, 4, 69, -5,55,-11,53,  2,54, 2,53,  13,55,20,55],
  [.83,  6, 4, 89, -6,54,-12,53, -1,53,-4,53,  13,55,20,55],
  [.90,  6, 4, 94, -6,54,-12,53, -2,53,-5,53,  13,55,20,55],
];

// The Hunter lets go with both hands and catches herself with a wider brace.
const hunterStumble = [
  [0,    0, 0,  0, -4,50,-6,53,   3,50, 3,53,   0,42, 3,42],
  [.11, -1,-1, -8, -4,49,-6,53,   3,49, 4,53,  -1,42, 3,42],
  [.21, -2, 0,-10, -5,50,-7,53,   5,48, 7,50,   0,42, 4,42],
  [.31, -1, 1,  3, -5,52,-9,53,   7,48, 9,52,   2,43, 6,43],
  [.41,  0, 3, 13, -3,54,-10,53,  8,48,10,53,   6,44, 9,44],
  [.50,  1, 3, 20, -3,54,-10,53,  8,48,10,53,   9,46,12,45],
  [.57,  2, 3, 32, -3,54,-10,53,  8,49,10,53,  10,52,17,50],
  [.64,  3, 3, 43, -3,54,-10,53,  7,52,10,53,  12,55,20,54],
  [.70,  4, 3, 51, -3,54,-10,53,  4,54, 8,53,  12,55,21,55],
  [.76,  5, 3, 64, -4,55,-11,53,  2,54, 3,53,  12,55,21,55],
  [.84,  6, 3, 87, -5,55,-12,53, -1,53,-3,53,  12,55,21,55],
  [.92,  6, 3, 93, -5,55,-12,53, -2,53,-4,53,  12,55,21,55],
];

function drawLeg(out, parts, hip, knee, foot, index, tilt) {
  segment(out, parts.leg, hip, knee);
  segment(out, parts.shin, knee, foot);
  paint(out, parts.boots[index], parts.bootPivots[index], foot, tilt);
}

function drawArm(out, parts, shoulder, hand, open, bend) {
  const elbow = [
    mix(shoulder[0], hand[0], .46) - bend,
    mix(shoulder[1], hand[1], .46) + mix(2, -1, open),
  ];
  segment(out, parts.arm, shoulder, elbow);
  segment(out, parts.cuff, elbow, hand);
  if (open > .5) paint(out, parts.palm, [1, 1.5], hand, mix(22, 0, open));
}

function artFall(sprite, makeParts, body) {
  let frames;
  return {
    anchorY: sprite.anchorY,
    outline: false,
    frameAt: seconds => fallFrameAt(TIMES, seconds),
    wisp: { ...departingSoul, offsetX: body.x + 13 - 40, offsetY: -6 },
    cues: [...body.cues, { time: SOUL_RELEASE, sound: 'souldepart' }],
    gen() {
      if (frames) return frames;
      const standing = sprite.gen()[sprite.idle[0]];
      const parts = makeParts(standing);
      const poses = TIMES.map(([t], i) => i === 0 ? standing : drawFallFrame(standing, parts, body, t));
      const remains = blank(standing.w, standing.h);
      for (const item of parts.gear) drawGear(remains, item, gearPose(item, SOUL_RELEASE));
      appendDecay(poses, remains, GROUND);
      return (frames = poses);
    },
  };
}

function drawGear(out, item, [x, y, angle]) {
  paint({ ...out, h: GROUND + 1 }, item.art, item.grip, [x, y], angle);
}

function drawFallFrame(standing, parts, body, t) {
  const out = blank(standing.w, standing.h);
  const clip = { ...out, h: GROUND + 1 };
  const [x, y, angle, kx, ky, ax, ay, fx, fy, bx, by, rearX, rearY, frontX, frontY] = tween(body.motion, t);
  const hip = [body.x + x, body.y + y];
  const gear = parts.gear.map(item => gearPose(item, t));
  const hand = (index, targetX, targetY, gripOffset = 0) => {
    const item = parts.gear[index];
    const letGo = item.track.at(-1)[0];
    const grip = t <= letGo ? gear[index] : item.track.at(-1).slice(1);
    const open = easeBetween(t, letGo, letGo + .09);
    return {
      position: [mix(grip[0] + gripOffset, body.x + targetX, open), mix(grip[1], targetY, open)],
      open,
    };
  };
  const rearShoulder = turn([-4, -7], angle, hip);
  const frontShoulder = turn([3, -8], angle, hip);
  const rearHand = hand(0, rearX, rearY, parts.twoHanded ? -3 : 0);
  const frontHand = hand(parts.twoHanded ? 0 : 1, frontX, frontY);

  drawArm(clip, parts, rearShoulder, rearHand.position, rearHand.open, 2.2);
  drawLeg(clip, parts, [hip[0] - 2, hip[1]], [body.x + kx, ky], [body.x + ax, ay], 0, -Math.min(46, Math.max(0, ky - 51) * 12));
  drawLeg(clip, parts, [hip[0] + 2, hip[1]], [body.x + fx, fy], [body.x + bx, by], 1, Math.max(0, angle - 50) * .32);
  paint(clip, parts.upper, parts.pivot, hip, angle);
  drawArm(clip, parts, frontShoulder, frontHand.position, frontHand.open, 1.6);
  for (let i = 0; i < parts.gear.length; i++) drawGear(out, parts.gear[i], gear[i]);
  return out;
}

export const paladinFall = sprite => artFall(sprite, paladinParts, {
  x: 36, y: 44, motion: shieldStumble,
  cues: [{ time: .75, sound: 'shieldfall' }],
});

export const berserkerFall = sprite => artFall(sprite, berserkerParts, {
  x: 37, y: 46, motion: axeStumble, cues: [],
});

export const witchHunterFall = sprite => artFall(sprite, witchHunterParts, {
  x: 38, y: 47, motion: hunterStumble, cues: [],
});
