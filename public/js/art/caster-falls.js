import { fromRows } from '../engine/pixels.js';
import {
  SOUL_RELEASE, appendDecay, blank, departingSoul, easeBetween, fallFrameAt, mix, paint, segment, turn,
} from './hero-fall.js';

// Seconds, belt displacement, chest tilt, hem tilt and length, then the
// rear knee and ankle and the front knee and ankle, measured from the belt's x.
// A trailing knee takes the weight while the chest is still nearly upright.
// The leading knee comes down as the two hands extend to meet the ground.
const staggers = {
  mage: [
    [0,      0, 0,   0,  0, 1,   -5,49, -7,53,   5,49,  6,53],
    [.12,   -1, 0, -11, -4, 1,   -7,49, -8,53,   6,48,  8,51],
    [.23,   -2, 1,  -9,  3,.91,  -7,51,-10,53,   8,48, 10,52],
    [.34,   -1, 5,   4, 16,.64,  -6,54,-11,53,   8,48, 11,53],
    [.44,    0, 5,  10, 22,.62,  -6,54,-11,53,   8,49, 11,53],
    [.55,    1, 6,  26, 31,.62,  -6,54,-11,53,   8,51, 11,53],
    [.64,    2, 5,  43, 44,.69,  -6,54,-11,53,   7,54, 10,53],
    [.73,    2, 5,  51, 56,.74,  -6,54,-11,53,   7,54, 10,53],
    [.83,    4, 7,  78, 70,.88,  -6,54,-11,53,   4,54,  0,53],
    [.92,    4, 7,  89, 77,.96,  -7,54,-12,53,   1,54, -4,53],
    [1.0,    4, 7,  91, 79,.98,  -8,54,-13,53,   0,54, -5,53],
  ],
  necromancer: [
    [0,      0, 0,   0,  0, 1,   -3,49, -3,53,   6,49,  7,53],
    [.12,    1, 1,   7,  2, 1,   -4,49, -5,53,   6,48,  8,51],
    [.22,    0, 1,  -7, -2,.92,  -4,51, -7,53,   8,48, 10,52],
    [.33,    0, 5,   5, 12,.64,  -4,54, -9,53,   8,48, 10,53],
    [.45,    0, 5,   9, 19,.62,  -4,54, -9,53,   8,49, 10,53],
    [.54,    1, 6,  24, 28,.65,  -4,54, -9,53,   8,50, 10,53],
    [.65,    2, 6,  42, 37,.68,  -4,54, -9,53,   7,53, 10,53],
    [.74,    3, 5,  51, 48,.73,  -4,54, -9,53,   7,54,  9,53],
    [.83,    5, 7,  76, 61,.87,  -5,54,-10,53,   4,54,  0,53],
    [.92,    5, 6,  88, 74,.95,  -6,54,-11,53,   1,54, -4,53],
    [1.0,    5, 6,  91, 77,.96,  -7,54,-12,53,   0,54, -6,53],
  ],
  druid: [
    [0,      0, 0,   0,  0, 1,   -5,49, -6,53,   4,49,  4,53],
    [.12,   -1, 0,  -8, -2, 1,   -6,49, -7,53,   5,48,  6,51],
    [.23,   -2, 1,  -7,  4,.91,  -6,51, -8,53,   7,48,  9,52],
    [.35,   -1, 4,   7, 14,.65,  -5,54,-10,53,   8,49, 10,53],
    [.45,    0, 5,  13, 21,.61,  -5,54,-10,53,   8,49, 10,53],
    [.54,    1, 6,  28, 32,.63,  -5,54,-10,53,   8,51, 10,53],
    [.64,    2, 5,  45, 43,.70,  -5,54,-10,53,   7,54,  9,53],
    [.73,    3, 5,  53, 52,.76,  -5,54,-10,53,   7,54,  9,53],
    [.82,    4, 7,  76, 63,.88,  -5,54,-11,53,   4,54,  0,53],
    [.92,    4, 7,  88, 73,.95,  -7,54,-12,53,   1,54, -4,53],
    [1.0,    4, 7,  90, 75,.96,  -8,54,-12,53,   0,54, -5,53],
  ],
};

const sheetRig = {
  mage: {
    belt: [42, 44], rearBoot: [35, 53], foreBoot: [48, 53],
    seams: [[34, 53], [35, 53], [32, 48]],
    sleeve: [[50, 40], [33, 40], [49, 42]],
    skin: [[35, 37], [35, 39]],
    reach: [7, -5], rearGrip: true, hands: [12, 19],
    grip: [35, 38], tip: [34, 50], release: .33, contact: .55, plantX: 27, slant: -25,
    soul: [16, -6],
  },
  necromancer: {
    belt: [39, 44], rearBoot: [36, 53], foreBoot: [46, 53],
    seams: [[42, 44], [42, 45], [43, 46]],
    sleeve: [[39, 41], [41, 41], [42, 41]],
    skin: [[44, 41], [43, 40]],
    reach: [-4, -3], hands: [13, 21],
    grip: [44, 40], tip: [51, 44], release: .28, contact: .53, plantX: 67, slant: 41,
    soul: [15, -6],
  },
  druid: {
    belt: [40, 44], rearBoot: [34, 53], foreBoot: [44, 53],
    seams: [[45, 53], [43, 53], [44, 54]],
    sleeve: [[45, 44], [42, 41], [48, 43]],
    skin: [[46, 41], [47, 41]],
    reach: [-3, -4], hands: [13, 20],
    grip: [48, 40], tip: [49, 55], release: .42, contact: .59, plantX: 61, slant: 13,
    soul: [14, -6],
  },
};

function valueAt(keys, elapsed) {
  const next = keys.findIndex(([time]) => time > elapsed);
  if (next === -1) return keys.at(-1);
  const before = keys[Math.max(0, next - 1)], after = keys[next];
  const t = (elapsed - before[0]) / (after[0] - before[0]);
  return before.map((value, index) => mix(value, after[index], t));
}

// Cut the on-sheet equipment separately. Where a hand hides the shaft,
// extend its existing wood and border through the grip.
function timberPixels(id, x, y) {
  if (id === 'mage') {
    if (y <= 28) return x >= 29 && x <= 36;
    if (y <= 31) return x >= 33 && x <= 35;
    if (y <= 36) return x >= 34 && x <= 35;
    if (y <= 40) return false;
    if (y <= 42) return x === 34;
    return y <= 50 && x >= 33 && x <= 34;
  }
  if (y <= 30) return x >= 44 && (y < 30 || x >= 47);
  if (y <= 38) return x >= 47 && x <= 50;
  if (y <= 42) return false;
  if (y <= 46) return x >= 47 && x <= 49;
  return y <= 55 && x >= 48 && x <= 50;
}

function bookPixels(x, y) {
  if (y >= 35 && y <= 38) return x >= 43;
  if (y === 39 || y === 41) return x >= 45;
  if (y === 40) return x >= 46;
  return y >= 42 && y <= 44 && x >= 44;
}

function tome(standing) {
  // The binding and its gold edges continue beneath the caster's fingers.
  const sample = (x, y) => standing.d[y * standing.w + x];
  return {
    x: 43, y: 35,
    buf: fromRows([
      '.kkkkkkk', 'kgggLLBk', 'kTpcccBk', 'kTcccpBk', 'kTcgcpBk',
      'kTcccpBk', 'kTcccpBk', 'kTgccpBk', 'kgggLBBk', '.kkkkkkk',
    ], {
      k: sample(45, 35), g: sample(45, 36), L: sample(46, 36),
      B: sample(49, 38), T: sample(43, 37), c: sample(46, 38), p: sample(47, 38),
    }),
  };
}

function layer(standing, x, y, w, h, owns) {
  const buf = blank(w, h);
  for (let iy = 0; iy < h; iy++) {
    for (let ix = 0; ix < w; ix++) {
      if (owns(x + ix, y + iy)) buf.d[iy * w + ix] = standing.d[(y + iy) * standing.w + x + ix];
    }
  }
  return { x, y, buf };
}

function timber(id, standing, owns) {
  const mage = id === 'mage';
  const x = mage ? 29 : 44, y = mage ? 17 : 19;
  const part = layer(standing, x, y, mage ? 8 : 13, mage ? 34 : 37, owns);
  const put = (ix, iy, pixel) => { part.buf.d[(iy - y) * part.buf.w + ix - x] = pixel; };
  const start = mage ? 37 : 39, end = mage ? 42 : 43;
  for (let row = start; row < end; row++) {
    const shaft = mage ? (row < 39 ? 35 : 34) : 48;
    const shade = standing.d[(mage ? 44 : 43) * standing.w + shaft - 1];
    const wood = standing.d[(mage ? (shaft === 35 ? 36 : 44) : 44) * standing.w + shaft];
    put(shaft - 1, row, shade);
    put(shaft, row, wood);
    if (!mage) put(shaft + 1, row, standing.d[44 * standing.w + 49]);
  }
  return part;
}

function separate(id, standing, rig) {
  const ownsWeapon = id === 'necromancer' ? bookPixels : (x, y) => timberPixels(id, x, y);
  const [bx, by] = rig.belt;
  const sample = ([x, y]) => standing.d[y * standing.w + x];
  // Keep the source sheet's magenta registration pixel out of moving pieces.
  const paintBody = (x, y) => !ownsWeapon(x, y) && sample([x, y]) !== 0xffff00ff;
  const chest = (x, y) => {
    if (!paintBody(x, y)) return false;
    if (id === 'mage') return x >= 36 && x <= (y < 30 ? 50 : y < 36 ? 48 : 47);
    return y < 39 || x <= bx + 4;
  };
  const front = rig.foreBoot[0];
  const boot = (cx, cy) => layer(standing, cx - 5, cy - 1, 11, 5,
    (x, y) => paintBody(x, y) && (cx < front ? x < bx : x >= bx));
  const [edge, shadow, light] = rig.seams.map(sample);
  const [cuff, dark, cloth] = rig.sleeve.map(sample);
  const [skin, glint] = rig.skin.map(sample);
  return {
    torso: layer(standing, 24, 17, 32, by - 15, chest),
    hem: layer(standing, 25, by - 1, 28, 55 - by, paintBody),
    rearBoot: boot(...rig.rearBoot),
    foreBoot: boot(...rig.foreBoot),
    thigh: fromRows(['.kkl.', 'ksllk', 'ksllk', 'kslkk', '.kkk.'], { k: edge, s: shadow, l: light }),
    shin: fromRows(['.kl.', 'kslk', 'kslk', 'kssk', '.kk.'], { k: edge, s: shadow, l: light }),
    sleeve: fromRows(['.kkk.', 'kdllk', 'kdllk', 'kddlk', '.kkk.'], { k: cuff, d: dark, l: cloth }),
    forearm: fromRows(['.kl.', 'kdll', 'kdll', 'kddk', '.kk.'], { k: cuff, d: dark, l: cloth }),
    hand: fromRows(['.k..', 'kssk', 'kshk', 'kkkk'], { k: cuff, s: skin, h: glint }),
    palm: fromRows(['.kk..', 'kshsk', 'kkkkk'], { k: cuff, s: skin, h: glint }),
    weapon: id === 'necromancer' ? tome(standing) : timber(id, standing, ownsWeapon),
  };
}

function paintLayer(out, part, pivot, world, angle, length = 1, width = 1) {
  paint(out, part.buf, [pivot[0] - part.x, pivot[1] - part.y], world, angle, length, width);
}

function drawLeg(out, parts, boot, pivot, joint, knee, ankle, angle) {
  segment(out, parts.thigh, joint, knee);
  segment(out, parts.shin, knee, ankle);
  paintLayer(out, boot, pivot, ankle, angle);
}

function drawArm(out, parts, shoulder, hand, elapsed, near) {
  const catchStart = near ? .62 : .66;
  const contact = easeBetween(elapsed, catchStart - .08, catchStart);
  const elbowFold = easeBetween(elapsed, .74, .91);
  const elbow = [
    mix(shoulder[0], hand[0], near ? .50 : .42) - (1 + elbowFold * 5),
    mix(shoulder[1], hand[1], .50) + 1 - 2.5 * contact,
  ];
  segment(out, parts.sleeve, shoulder, elbow);
  segment(out, parts.forearm, elbow, hand);
  if (contact < .75) paint(out, parts.hand, [1.5, 1.5], hand, -28 * contact);
  else paint(out, parts.palm, [1.5, 1], hand);
}

function weaponHand(rig, keys, elapsed) {
  const { belt, grip, release } = rig;
  const [, dx, dy, lean] = valueAt(keys, Math.min(elapsed, release));
  return turn([grip[0] - belt[0], grip[1] - belt[1]], lean, [belt[0] + dx, belt[1] + dy]);
}

function drawWeapon(out, weapon, rig, keys, elapsed) {
  const { grip, tip, release, contact, slant, plantX } = rig;
  const [, , , lean] = valueAt(keys, Math.min(elapsed, release));
  const hand = weaponHand(rig, keys, elapsed);
  const heldAngle = lean * .72;
  if (elapsed < release) {
    paintLayer(out, weapon, grip, hand, heldAngle);
    return;
  }
  const [startX, startY] = turn([tip[0] - grip[0], tip[1] - grip[1]], heldAngle, hand);
  const flight = Math.min(1, (elapsed - release) / (contact - release));
  const restTip = out.h - .4;
  const impactAge = Math.max(0, elapsed - contact);
  const impact = Math.min(1, impactAge / .18);
  // The tip stays pinned below the surface while the top rocks once on impact.
  const angle = mix(heldAngle, slant, flight) + Math.sign(slant) * 11 * Math.sin(impact * Math.PI * 2) * (1 - impact);
  const target = [mix(startX, plantX, flight), mix(startY, restTip, flight * flight)];
  paintLayer(out, weapon, tip, target, angle);
}

function handsAt(rig, keys, belt, lean, elapsed, ground) {
  const weapon = weaponHand(rig, keys, elapsed);
  return rig.hands.map((reach, index) => {
    const holdsWeapon = index === (rig.rearGrip ? 0 : 1);
    const ready = holdsWeapon ? weapon : turn(rig.reach, lean, belt);
    const armReach = easeBetween(elapsed, holdsWeapon ? rig.release : .34, index === 0 ? .66 : .62);
    const buckle = easeBetween(elapsed, .75, .94);
    return [
      mix(ready[0], rig.belt[0] + reach - 2 * buckle, armReach),
      mix(ready[1], ground - 1, armReach),
    ];
  });
}

function drawFall(standing, parts, rig, keys, elapsed, ground) {
  const [, x, y, lean, hemAngle, hemLength, rkx, rky, rax, ray, fkx, fky, fax, fay] = valueAt(keys, elapsed);
  const out = blank(standing.w, standing.h);
  const visible = { ...out, h: ground + 1 };
  if (elapsed < rig.release) drawWeapon(visible, parts.weapon, rig, keys, elapsed);
  const [bx, by] = rig.belt;
  const belt = [bx + x, by + y];
  const flatten = easeBetween(elapsed, .74, .93);
  const [rearHand, foreHand] = handsAt(rig, keys, belt, lean, elapsed, ground);
  drawLeg(visible, parts, parts.rearBoot, rig.rearBoot, turn([-3, 1], hemAngle / 2, belt),
    [bx + rkx, rky], [bx + rax, ray], -55 * easeBetween(elapsed, .17, .43));
  paintLayer(visible, parts.hem, rig.belt, belt, hemAngle, hemLength, 1 - .29 * flatten);
  drawLeg(visible, parts, parts.foreBoot, rig.foreBoot, turn([3, 1], hemAngle / 2, belt),
    [bx + fkx, fky], [bx + fax, fay], -62 * easeBetween(elapsed, .70, .99));
  drawArm(visible, parts, turn([-4, -9], lean, belt), rearHand, elapsed, false);
  paintLayer(visible, parts.torso, rig.belt, belt, lean, 1, 1 - .14 * flatten);
  drawArm(visible, parts, turn([3, -9], lean, belt), foreHand, elapsed, true);
  if (elapsed >= rig.release) drawWeapon(visible, parts.weapon, rig, keys, elapsed);
  return out;
}

export function casterFall(id, sprite) {
  const rig = sheetRig[id], keys = staggers[id];
  const poses = Array.from({ length: 21 }, (_, index) => [index / 20]);
  const [offsetX, offsetY] = rig.soul;
  let frames;
  return {
    anchorY: sprite.anchorY,
    outline: false,
    frameAt: elapsed => fallFrameAt(poses, elapsed),
    wisp: { ...departingSoul, offsetX, offsetY },
    cues: [{ time: SOUL_RELEASE, sound: 'souldepart' }],
    gen() {
      if (frames) return frames;
      const standing = sprite.gen()[sprite.idle[0]];
      const ground = sprite.anchorY - 1;
      const parts = separate(id, standing, rig);
      frames = poses.map(([time], index) => index ? drawFall(standing, parts, rig, keys, time, ground) : standing);
      const remains = blank(standing.w, standing.h);
      drawWeapon({ ...remains, h: ground + 1 }, parts.weapon, rig, keys, poses.at(-1)[0]);
      appendDecay(frames, remains, ground);
      return frames;
    },
  };
}
