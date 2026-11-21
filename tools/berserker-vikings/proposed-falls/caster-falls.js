import { armFromSheet } from './fall-limbs.js';
import { fromRows } from '../../../public/js/engine/pixels.js';
import {
  BRACE_START, BRACE_END, SOUL_RELEASE, appendDecay, blank, departingSoul, easeBetween,
  fallFrameAt, mix, paint, segment, sinkingSoul, turn,
} from '../../../public/js/art/hero-fall.js';

// Belt position, chest and skirt angles, skirt length, then knee and ankle
// coordinates relative to the standing belt's x. Each fall has its own support.
const staggers = {
  // His back gives first. The robe gathers beneath the hip; the knees and
  // boots stay out in front even after his head rolls back onto the ground.
  mage: [
    [0,    0,0,   0,  0,1,   -5,49,-7,53,  5,49,6,53],
    [.20,  0,0,  -6,  0,1,   -6,49,-7,53,  5,49,6,53],
    [.43, -1,2,  -9, -8,.86, -4,49,-7,53,  7,48,8,53],
    [.67, -1,5,  -6,-29,.80, -1,50,-3,54,  8,48,10,54],
    [.86, -2,7,  -9,-56,.82,  1,49, 5,54,  8,48,13,54],
    [BRACE_START,-2,9,-15,-76,.85, 1,49, 7,54,  8,48,14,54],
    [BRACE_END,  -2,9,-15,-76,.85, 1,49, 7,54,  8,48,14,54],
    [1.35,-3,9, -33,-82,.89,  1,49, 7,54,  8,48,14,54],
    [1.46,-4,9, -54,-88,.94,  1,49, 7,54,  7,49,14,54],
    [1.57,-5,9, -73,-93,.98,  1,50, 8,54,  7,50,14,54],
    [1.67,-5,9, -86,-96,1.0,  1,51, 8,54,  7,50,14,54],
  ],
  // He hugs the book rather than reaching for the floor. The robe pools as
  // both shins disappear underneath; his head and shoulders bow over its spine.
  necromancer: [
    [0,    0,0,  0,  0,1,   -3,49,-3,53,  6,49,7,53],
    [.22,  0,1,  4,  1,.94, -3,49,-4,53,  5,49,7,53],
    [.44,  0,3, 10,  3,.79, -4,51,-6,53,  5,51,6,53],
    [.67, -1,5, 19,  5,.61, -4,53,-7,53,  5,52,4,53],
    [.85, -1,7, 28,  6,.50, -4,54,-8,53,  5,54,1,53],
    [BRACE_START,-1,8,39,9,.45, -4,54,-9,53,  5,54,0,53],
    [BRACE_END,  -1,8,39,9,.45, -4,54,-9,53,  5,54,0,53],
    [1.37, 0,8, 55, 12,.46, -4,54,-9,53,  5,54,0,53],
    [1.50, 1,8, 72, 18,.47, -4,54,-9,53,  5,54,0,53],
    [1.65, 2,8, 88, 24,.49, -4,54,-9,53,  5,54,0,53],
  ],
  // He draws the forward boot inward, then takes the weight on the folded
  // sleeve and hip. His leaf mantle rolls over the shoulder like a blanket.
  druid: [
    [0,    0,0,  0,  0,1,   -5,49,-6,53,  4,49,4,53],
    [.18, -1,0, -4, -2,.99, -5,49,-6,53,  4,48,5,52],
    [.41,  0,2,  9, -5,.89, -5,51,-6,53,  5,47,7,51],
    [.60,  0,4, 21, -8,.70, -4,52,-7,53,  6,47,7,52],
    [.80,  1,6, 43,-13,.55, -3,54,-6,53,  6,48,6,53],
    [BRACE_START,2,7,61,-17,.50, -2,54,-6,53,  7,49,5,53],
    [BRACE_END,  2,7,61,-17,.50, -2,54,-6,53,  7,49,5,53],
    [1.35, 2,8, 70,-20,.48, -2,54,-6,53,  7,49,5,53],
    [1.48, 3,8, 81,-24,.48, -1,54,-5,53,  8,50,5,53],
    [1.62, 3,8, 96,-29,.49,  0,54,-5,53,  8,50,5,53],
  ],
};

const sheetRig = {
  mage: {
    belt: [42, 44], rearBoot: [35, 53], foreBoot: [48, 53],
    seams: [[34, 53], [35, 53], [32, 48]],
    sleeve: [[50, 40], [33, 40], [49, 42]],
    skin: [[35, 37], [35, 39]],
    arms: [[[-4,-8],[-5,-4],[-7,-6]], [[4,-7],[6,-2],[10,-5]]],
    // The staff slips through the rear hand. The free hand cradles its spark,
    // then folds into the lap. Angles belong to upper arm and forearm separately.
    armKeys: [[0,0,0,0,0],[.37,4,-8,8,-12],[.69,-24,-54,32,-50],
      [BRACE_START,-37,-72,48,-73],[BRACE_END,-37,-72,48,-73],[1.67,-23,-53,39,-83]],
    holding: 0,
    grip: [35, 38], tip: [34, 50], release: .38, contact: .74, plantX: 21, slant: -23,
    soul: [-12, -5],
  },
  necromancer: {
    belt: [39, 44], rearBoot: [36, 53], foreBoot: [46, 53],
    seams: [[42, 44], [42, 45], [43, 46]],
    sleeve: [[39, 41], [41, 41], [42, 41]],
    skin: [[44, 41], [43, 40]],
    arms: [[[-3,-8],[-5,-4],[-2,-3]], [[2,-8],[3,-4],[5,-4]]],
    armKeys: [[0,0,0,0,0],[.44,-8,-26,9,-24],[.76,-27,-59,22,-53],
      [BRACE_START,-33,-70,30,-72],[BRACE_END,-33,-70,30,-72],[1.65,-32,-78,40,-85]],
    holding: 1,
    grip: [44, 40], tip: [50, 44], release: .80, contact: 1.00, plantX: 49, slant: 67,
    soul: [5, -7],
  },
  druid: {
    belt: [40, 44], rearBoot: [34, 53], foreBoot: [44, 53],
    seams: [[45, 53], [43, 53], [44, 54]],
    sleeve: [[45, 44], [34, 40], [35, 44]],
    skin: [[48, 41], [47, 40]],
    arms: [[[-3,-8],[-5,-3],[-2,-3]], [[3,-7],[5,-2],[8,-4]]],
    armKeys: [[0,0,0,0,0],[.40,7,-7,-4,2],[.73,-8,-66,29,-55],
      [BRACE_START,-18,-95,49,-77],[BRACE_END,-18,-95,49,-77],[1.62,-24,-107,55,-89]],
    holding: 1,
    grip: [48, 40], tip: [49, 55], release: .50, contact: .79, plantX: 55, slant: 26,
    soul: [12, -5],
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
    spark: id === 'mage' ? layer(standing, 50, 31, 6, 8, (x,y) => y <= 37) : null,
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

function joints(rig, belt, lean, elapsed) {
  const [, rearUpper, rearFore, nearUpper, nearFore] = valueAt(rig.armKeys, elapsed);
  return [armFromSheet(rig.arms[0], belt, lean, rearUpper, rearFore),
    armFromSheet(rig.arms[1], belt, lean, nearUpper, nearFore)];
}

function drawArm(out, parts, [shoulder, elbow, wrist]) {
  segment(out, parts.sleeve, shoulder, elbow);
  segment(out, parts.forearm, elbow, wrist);
  paint(out, parts.hand, [1.5, 1.5], wrist);
}

function drawWeapon(out, weapon, rig, keys, elapsed) {
  const { grip, tip, release, contact, slant, plantX } = rig;
  const heldTime = Math.min(elapsed, release);
  const [, dx, dy, lean] = valueAt(keys, heldTime);
  const belt = [rig.belt[0] + dx, rig.belt[1] + dy];
  const hand = joints(rig, belt, lean, heldTime)[rig.holding][2];
  const heldAngle = lean * .72;
  if (elapsed < release) {
    paintLayer(out, weapon, grip, hand, heldAngle);
    return;
  }
  const [startX, startY] = turn([tip[0] - grip[0], tip[1] - grip[1]], heldAngle, hand);
  const flight = Math.min(1, (elapsed - release) / (contact - release));
  const restTip = out.h - .4;
  const impactAge = Math.max(0, elapsed - contact);
  const impact = Math.min(1, impactAge / Math.min(.16, BRACE_START - contact));
  // The tip stays pinned below the surface while the top rocks once on impact.
  const angle = mix(heldAngle, slant, flight) + Math.sign(slant) * 4 * Math.sin(impact * Math.PI * 2) * (1 - impact);
  const target = [mix(startX, plantX, flight), mix(startY, restTip, flight * flight)];
  paintLayer(out, weapon, tip, target, angle);
}

function drawFall(standing, parts, rig, keys, elapsed, ground) {
  const [, x, y, lean, hemAngle, hemLength, rkx, rky, rax, ray, fkx, fky, fax, fay] = valueAt(keys, elapsed);
  const out = blank(standing.w, standing.h);
  const visible = { ...out, h: ground + 1 };
  if (elapsed < rig.release) drawWeapon(visible, parts.weapon, rig, keys, elapsed);
  const [bx, by] = rig.belt;
  const belt = [bx + x, by + y];
  const flatten = easeBetween(elapsed, BRACE_END, 1.60);
  const [rearArm, foreArm] = joints(rig, belt, lean, elapsed);
  drawLeg(visible, parts, parts.rearBoot, rig.rearBoot, turn([-3, 1], hemAngle / 2, belt),
    [bx + rkx, rky], [bx + rax, ray], -55 * easeBetween(elapsed, .65, .92));

  drawLeg(visible, parts, parts.foreBoot, rig.foreBoot, turn([3, 1], hemAngle / 2, belt),
    [bx + fkx, fky], [bx + fax, fay], -62 * easeBetween(elapsed, .83, BRACE_START));
  paintLayer(visible, parts.hem, rig.belt, belt, hemAngle, hemLength, 1 - .29 * flatten);
  drawArm(visible, parts, rearArm);
  paintLayer(visible, parts.torso, rig.belt, belt, lean, 1, 1 - .14 * flatten);
  drawArm(visible, parts, foreArm);
  if (parts.spark && elapsed < .43) {
    const dim = 1 - easeBetween(elapsed, .12, .44);
    paintLayer(visible, parts.spark, [52,39], foreArm[2], lean, .45 + .55 * dim, dim);
  }
  if (elapsed >= rig.release) drawWeapon(visible, parts.weapon, rig, keys, elapsed);
  return out;
}

export function casterFall(id, sprite) {
  const rig = sheetRig[id], keys = staggers[id];
  const poses = Array.from({ length: Math.ceil(SOUL_RELEASE * 20) }, (_, index) => [index / 20]);
  // Show the first display tick after the held pose as well as the 20 Hz keys.
  poses.splice(Math.round(BRACE_END * 20) + 1, 0, [BRACE_END + 1 / 60]);
  const [offsetX, offsetY] = rig.soul;
  const soul = id === 'necromancer' ? sinkingSoul : departingSoul;
  let frames;
  return {
    anchorY: sprite.anchorY,
    outline: false,
    frameAt: elapsed => fallFrameAt(poses, elapsed),
    wisp: { ...soul, offsetX, offsetY },
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
