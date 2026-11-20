import { fromRows } from '../engine/pixels.js';
import {
  SOUL_RELEASE, appendDecay, blank, departingSoul, fallFrameAt, mix, paint, segment, turn,
} from './hero-fall.js';

// Times, displacement at the belt, chest and hem angles, hem compression,
// then the displacement (x/y) and rotation of each boot. The moving foot
// catches briefly before the knees give way and the upper body lands.
const staggers = {
  mage: [
    [0,      0, 0,   0,   0, 1,     0, 0,  0,  0, 0,   0],
    [.12,   -1, 0, -10,  -3, 1,    -1,-1, -4,  0, 0,   0],
    [.22,   -3, 1, -17,  -4, .95,  -3, 0,  0,  1,-1,  -9],
    [.31,   -3, 2,  -9,   3, .88,  -3, 0,  4,  3, 0,   0],
    [.40,   -2, 3,   8,  10, .79,  -4, 0, 12,  3, 0,   0],
    [.50,   -1, 5,  24,  21, .70,  -5, 0, 20,  3, 0,  -5],
    [.60,    0, 6,  46,  32, .62,  -6, 0, 36,  2, 0, -12],
    [.71,    2, 5,  72,  46, .72,  -3, 0, 50,  0, 0, -22],
    [.80,    3, 5,  88,  62, .93,   0, 0, 60, -2, 0, -35],
    [.88,    3, 4,  81,  60, .91,   0, 0, 60, -3, 0, -38],
    [1.0,    3, 5,  88,  62, .93,   0, 0, 62, -3, 0, -38],
  ],
  necromancer: [
    [0,      0, 0,   0,   0, 1,     0, 0,  0,  0, 0,   0],
    [.12,    1, 1,   9,   2, 1,     0, 0,  0,  1,-2,   8],
    [.22,    2, 2,  15,   7, .96,  -1,-1, -8,  4, 0,   0],
    [.32,    2, 4,   4,   8, .86,  -3, 0,  0,  4, 0,   0],
    [.42,    1, 5, -14,   0, .78,  -3, 0,  0,  4, 0,  -7],
    [.53,    1, 6, -32, -17, .72,  -2, 0,  8,  5, 0, -20],
    [.64,    0, 6, -56, -33, .69,  -1, 0, 20,  5, 1, -32],
    [.75,   -1, 5, -83, -45, .71,   0, 0, 33,  5, 1, -49],
    [.82,   -2, 5, -91, -61, .79,   1, 1, 51,  5, 1, -54],
    [.90,   -2, 4, -82, -60, .80,   3, 2, 55,  4, 1, -58],
    [1.0,   -2, 5, -90, -65, .81,   4, 2, 58,  4, 1, -62],
  ],
  druid: [
    [0,      0, 0,   0,   0, 1,     0, 0,   0,  0, 0,   0],
    [.12,   -1, 0,  -7,  -1, 1,    -2, 0,  -2,  0, 0,   0],
    [.22,   -2, 1,  -9,  -4, .97,  -3, 0,  -8,  2,-2,  -7],
    [.32,   -1, 2,   4,   3, .92,  -3, 0,   0,  4, 0,   0],
    [.42,    0, 3,  16,  12, .79,  -4, 0,  16,  4, 0,   0],
    [.51,    1, 5,  28,  23, .71,  -5, 0,  24,  5, 0,   0],
    [.60,    2, 5,  42,  39, .70,  -6, 0,  41,  4, 0,  -8],
    [.70,    3, 4,  59,  50, .80,  -4, 0,  50,  3, 0, -15],
    [.80,    4, 4,  84,  63, .91,  -1, 0,  57,  0, 0, -33],
    [.87,    4, 3,  76,  61, .90,   0, 0,  62, -1, 0, -40],
    [1.0,    4, 4,  83,  64, .91,   0, 0,  68, -2, 0, -43],
  ],
};

const sheetRig = {
  mage: {
    belt: [42, 44], rearBoot: [35, 53], foreBoot: [48, 53],
    seams: [[34, 53], [35, 53], [32, 48]],
    grip: [35, 38], tip: [34, 50], release: .33, contact: .55, plantX: 27, slant: -25,
    soul: [12, -7],
  },
  necromancer: {
    belt: [39, 44], rearBoot: [36, 53], foreBoot: [46, 53],
    seams: [[42, 44], [42, 45], [43, 46]],
    grip: [44, 40], tip: [51, 44], release: .28, contact: .53, plantX: 56, slant: 41,
    soul: [-15, -7],
  },
  druid: {
    belt: [40, 44], rearBoot: [34, 53], foreBoot: [44, 53],
    seams: [[45, 53], [43, 53], [44, 54]],
    grip: [48, 40], tip: [49, 55], release: .42, contact: .59, plantX: 54, slant: 25,
    soul: [14, -8],
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
  const paintBody = (x, y) => !ownsWeapon(x, y) && !(id === 'mage' && x >= 49 && y < 38);
  const [bx, by] = rig.belt;
  const front = rig.foreBoot[0];
  const boot = (cx, cy) => layer(standing, cx - 5, cy - 1, 11, 5,
    (x, y) => paintBody(x, y) && (cx < front ? x < bx : x >= bx));
  const [edge, shadow, light] = rig.seams.map(([x, y]) => standing.d[y * standing.w + x]);
  return {
    torso: layer(standing, 24, 17, 32, by - 15, paintBody),
    hem: layer(standing, 25, by - 1, 28, 55 - by, paintBody),
    rearBoot: boot(...rig.rearBoot),
    foreBoot: boot(...rig.foreBoot),
    trousers: fromRows(['.kk.', 'kslk', 'kssk', 'kslk', '.kk.'], { k: edge, s: shadow, l: light }),
    weapon: id === 'necromancer' ? tome(standing) : timber(id, standing, ownsWeapon),
  };
}

function paintLayer(out, part, pivot, world, angle, length = 1) {
  paint(out, part.buf, [pivot[0] - part.x, pivot[1] - part.y], world, angle, length);
}

function drawLeg(out, leg, boot, pivot, joint, ankle, angle, direction, lean) {
  const bend = Math.min(1, Math.abs(lean) / 50);
  const knee = [
    mix(joint[0], ankle[0], .48) + direction * bend * 1.2,
    mix(joint[1], ankle[1], .52) - bend * 2,
  ];
  segment(out, leg, joint, knee);
  segment(out, leg, knee, ankle);
  paintLayer(out, boot, pivot, ankle, angle);
}

function drawWeapon(out, weapon, rig, keys, elapsed) {
  const { belt, grip, tip, release, contact, slant, plantX } = rig;
  const [, dx, dy, lean] = valueAt(keys, Math.min(elapsed, release));
  const hand = turn([grip[0] - belt[0], grip[1] - belt[1]], lean, [belt[0] + dx, belt[1] + dy]);
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

function drawFall(standing, parts, rig, keys, elapsed, ground) {
  const [, x, y, lean, hemAngle, hemLength, rx, ry, ra, fx, fy, fa] = valueAt(keys, elapsed);
  const out = blank(standing.w, standing.h);
  const visible = { ...out, h: ground + 1 };
  if (elapsed < rig.release) drawWeapon(visible, parts.weapon, rig, keys, elapsed);
  const rear = rig.rearBoot, fore = rig.foreBoot;
  const belt = [rig.belt[0] + x, rig.belt[1] + y];
  drawLeg(visible, parts.trousers, parts.rearBoot, rear, turn([-3, 2], hemAngle / 2, belt),
    [rear[0] + rx, rear[1] + ry], ra, -1, lean);
  drawLeg(visible, parts.trousers, parts.foreBoot, fore, turn([3, 2], hemAngle / 2, belt),
    [fore[0] + fx, fore[1] + fy], fa, 1, lean);
  paintLayer(visible, parts.hem, rig.belt, belt, hemAngle, hemLength);
  paintLayer(visible, parts.torso, rig.belt, belt, lean);
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
