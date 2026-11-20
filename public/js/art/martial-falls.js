import { fromRows } from '../engine/pixels.js';
import {
  SOUL_RELEASE, appendDecay, blank, cut, departingSoul, fallFrameAt, mix, paint, segment, turn,
} from './hero-fall.js';

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
    leg: lineArt(at(buf, 33, 48), at(buf, 36, 48), at(buf, 32, 49), true),
    shin: lineArt(at(buf, 32, 54), at(buf, 33, 55), at(buf, 32, 52), true),
    boots: [cut(buf, 52, rectangular(28, 34, 5)), cut(buf, 52, rectangular(39, 47, 5))],
    bootPivots: [[4, 2], [3, 2]],
    gear: [
      { art: sword, grip: [4, 2.5], tip: [17, 3],
        track: [[0,30,42,142], [.17,28,41,116], [.30,27,40,99], [.40,26,41,81]],
        land: [.49, 25, 81, 67] },
      { art: shield, grip: [3, 7], tip: [3, 15],
        track: [[0,45,41,0], [.18,44,42,-10], [.34,46,43,9], [.56,49,46,31], [.66,51,50,51]],
        land: [.75, 54, 74, 70] },
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
        land: [.64, 61, 55, 66] },
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
    leg: lineArt(at(buf, 34, 47), at(buf, 36, 50), at(buf, 34, 49), true),
    shin: lineArt(at(buf, 32, 54), at(buf, 30, 53), at(buf, 32, 52), true),
    boots: [cut(buf, 51, rectangular(29, 35, 6)), cut(buf, 51, rectangular(39, 46, 6))],
    bootPivots: [[3, 2], [2, 2]],
    gear: [
      { art: crossbow, grip: [6, 6], tip: [17, 6],
        track: [[0,41,42,0], [.14,41,42,-15], [.29,43,43,3], [.42,47,44,39], [.50,50,44,54]],
        land: [.66, 62, 75, 107] },
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

// Pelvis and body angle, then each knee and ankle. The lead foot makes a
// short catching step before the trailing knee folds under the falling torso.
const shieldStumble = [
  [0,    0,  0,  0, -5,51,-6,53,   4,51, 4,53],
  [.10, -1,  0,-10, -6,51,-7,53,   4,50, 5,52],
  [.21, -1,  1, -6, -6,51,-8,53,   5,50, 7,49],
  [.30,  0,  2,  8, -6,52,-9,53,   6,51, 9,52],
  [.39,  1,  3, 20, -5,53,-9,53,   7,51,10,53],
  [.49,  2,  4, 35, -4,54,-9,53,   7,52,10,53],
  [.60,  3,  5, 53, -3,55,-9,54,   7,53,10,53],
  [.70,  4,  7, 71, -2,55,-8,54,   7,55, 9,53],
  [.79,  5,  7, 83, -2,55,-8,54,   6,55, 8,53],
  [.86,  5,  7, 76, -2,55,-8,54,   6,55, 8,53],
  [.93,  5,  7, 83, -2,55,-8,54,   6,55, 8,53],
];

// The axe wielder loses his rear footing first, then folds hard over the
// planted foot. The hunter tries to catch herself in a split stance.
const axeStumble = [
  [0,    0,  0,  0, -4,50,-5,53,   4,50, 4,53],
  [.12, -1, -1,-11, -5,50,-6,53,   4,50, 5,53],
  [.24, -2,  1, -7, -6,50,-7,51,   5,51, 6,53],
  [.34, -1,  2,  9, -6,51,-9,53,   6,52, 8,53],
  [.45,  0,  4, 24, -5,53,-9,54,   6,53, 9,53],
  [.55,  2,  5, 45, -4,54,-9,54,   6,54, 9,53],
  [.66,  4,  6, 63, -3,55,-9,54,   6,55, 9,53],
  [.76,  5,  6, 83, -3,55,-9,54,   6,55, 9,53],
  [.82,  5,  6, 79, -3,55,-9,54,   6,55, 9,53],
  [.90,  5,  6, 85, -3,55,-9,54,   6,55, 9,53],
];
const hunterStumble = [
  [0,    0,  0,  0, -4,50,-6,53,   3,50, 3,53],
  [.12, -1, -1, -8, -4,49,-6,53,   3,49, 4,53],
  [.21, -2,  0,-10, -5,50,-7,53,   4,48, 7,50],
  [.32, -1,  1,  5, -6,51,-9,53,   5,51, 9,52],
  [.43,  1,  2, 18, -6,52,-10,53,  6,51,10,53],
  [.54,  2,  3, 31, -5,54,-10,54,  6,52,10,53],
  [.67,  3,  5, 50, -4,54,-10,54,  7,53, 9,53],
  [.77,  4,  5, 72, -4,55,-10,54,  6,54, 9,53],
  [.87,  5,  5, 87, -3,55,-10,54,  6,55, 9,53],
  [.96,  5,  5, 83, -3,55,-10,54,  6,55, 9,53],
];

function drawLeg(out, parts, hip, knee, foot, index, tilt) {
  segment(out, parts.leg, hip, knee);
  segment(out, parts.shin, knee, foot);
  paint(out, parts.boots[index], parts.bootPivots[index], foot, tilt);
}

function drawArm(out, parts, shoulder, hand, brace) {
  const elbow = [mix(shoulder[0], hand[0], .46) - brace, mix(shoulder[1], hand[1], .46) + 2];
  segment(out, parts.arm, shoulder, elbow);
  segment(out, parts.cuff, elbow, hand);
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
  const [x, y, angle, kx, ky, ax, ay, fx, fy, bx, by] = tween(body.motion, t);
  const hip = [body.x + x, body.y + y];
  const gear = parts.gear.map(item => gearPose(item, t));
  const hand = (index, shoulder, reach, gripOffset = 0) => {
    const item = parts.gear[index];
    const letGo = item.track.at(-1)[0];
    const grip = t <= letGo ? gear[index] : item.track.at(-1).slice(1);
    const open = Math.max(0, Math.min(1, (t - letGo) / .15));
    return [mix(grip[0] + gripOffset, shoulder[0] + reach, open), mix(grip[1], Math.min(54, shoulder[1] + 7), open)];
  };
  const rearShoulder = turn([-4, -7], angle, hip);
  const frontShoulder = turn([3, -8], angle, hip);
  const rearHand = hand(0, rearShoulder, parts.twoHanded ? -2 : -4, parts.twoHanded ? -3 : 0);
  const frontHand = hand(parts.twoHanded ? 0 : 1, frontShoulder, 4);

  drawArm(clip, parts, rearShoulder, rearHand, 1.7);
  drawLeg(clip, parts, [hip[0] - 2, hip[1]], [body.x + kx, ky], [body.x + ax, ay], 0, -Math.max(0, angle - 18) * .7);
  drawLeg(clip, parts, [hip[0] + 2, hip[1]], [body.x + fx, fy], [body.x + bx, by], 1, Math.max(0, angle - 50) * .32);
  paint(clip, parts.upper, parts.pivot, hip, angle);
  drawArm(clip, parts, frontShoulder, frontHand, 1);
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
