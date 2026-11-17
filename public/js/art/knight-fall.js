import { APPROVED_HERO_ART } from './approved-heroes.js';
import { packedPalette } from './palette.js';

// Each pose is drawn around Aldric's usual world pivot. The sword tip stays in
// the same patch of earth while his hand slips away; the shield lands later.
export const KNIGHT_SHIELD_CONTACT = 0.76;
const SOUL_RELEASE = 1.10;
const DECAY_STEP = .05;
const DECAY_FRAMES = 27; // The planted sword and fallen shield hold from 2.40 s.
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

export function knightFallFrame(seconds) {
  if (seconds >= SOUL_RELEASE) {
    const step = Math.floor((seconds - SOUL_RELEASE) / DECAY_STEP + 1e-9);
    return poses.length + Math.min(DECAY_FRAMES - 1, step);
  }
  const next = poses.findIndex(pose => pose[0] > seconds);
  return next < 0 ? poses.length - 1 : Math.max(0, next - 1);
}

const clamp01 = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
function easeBetween(t, start, end) {
  const u = clamp01((t - start) / (end - start));
  return u * u * (3 - 2 * u);
}
const blank = (w, h) => ({ w, h, d: new Uint32Array(w * h) });

const radians = degrees => degrees * Math.PI / 180;
function turn([x, y], angle, [cx, cy]) {
  const a = radians(angle);
  return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
}

// Cut on the original artist's seams. Pixel ranges are inclusive on each row.
function cut(source, y0, spans) {
  const x0 = Math.min(...spans.map(row => row[0]));
  const w = Math.max(...spans.map(row => row[1])) - x0 + 1;
  const d = new Uint32Array(w * spans.length);
  spans.forEach(([left, right], row) => {
    for (let x = left; x <= right; x++) d[row * w + x - x0] = source.d[(y0 + row) * source.w + x];
  });
  return { w, h: spans.length, d };
}

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

// Inverse sampling gives one crisp native pixel per texel with no gaps at a
// tilted edge. Only the small rectangle around each individual piece is drawn.
function paint(out, part, pivot, position, angle = 0, scaleY = 1, scaleX = 1) {
  const a = radians(angle), cs = Math.cos(a), sn = Math.sin(a);
  const reach = Math.ceil(Math.hypot(part.w, part.h * scaleY)) + 1;
  const [px, py] = position;
  for (let y = Math.max(0, Math.floor(py - reach)); y <= Math.min(out.h - 1, py + reach); y++) {
    for (let x = Math.max(0, Math.floor(px - reach)); x <= Math.min(out.w - 1, px + reach); x++) {
      const dx = x - px, dy = y - py;
      const sx = Math.round(pivot[0] + (cs * dx + sn * dy) / scaleX);
      const sy = Math.round(pivot[1] + (cs * dy - sn * dx) / scaleY);
      if (sx < 0 || sx >= part.w || sy < 0 || sy >= part.h) continue;
      const color = part.d[sy * part.w + sx];
      if (color >>> 24) out.d[y * out.w + x] = color;
    }
  }
}

function segment(out, part, from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const angle = Math.atan2(-dx, dy) * 180 / Math.PI;
  const scale = Math.max(1, Math.hypot(dx, dy)) / (part.h - 2);
  paint(out, part, [(part.w - 1) / 2, 1], from, angle, scale);
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

const pal = packedPalette();
const ash = [pal.h, pal.a, pal.A, pal.Z];
const brightness = color => ((color & 255) * 3 + (color >>> 8 & 255) * 6 + (color >>> 16 & 255)) / 10;
function shade(a, b, t) {
  const channel = shift => Math.round(mix(a >>> shift & 255, b >>> shift & 255, t));
  return ((a & 0xff000000) | channel(16) << 16 | channel(8) << 8 | channel(0)) >>> 0;
}

function fallenWeapons(out, parts) {
  paint(out, parts.sword, [3,16], [25,55.75], 4);
  paint(out, parts.shield, [3.5,15], [restingShield.x, restingShield.y], restingShield.angle, 1, restingShield.width);
}

// Cut the actual fallen figure into small, irregular pieces. The boot goes
// first, then the breastplate, with the still-visible helmet cracking last.
function sinkArmour(out, body, t) {
  for (let y = 0; y < body.h; y++) {
    for (let x = 0; x < body.w; x++) {
      const color = body.d[y * body.w + x];
      if (!(color >>> 24)) continue;
      const helm = x >= 47 && y <= 54;
      const cellX = Math.floor((x + Math.floor(y / 3) % 2) / 3);
      const cellY = Math.floor(y / 3);
      const seed = (cellX * 11 + cellY * 7) % 13;
      const start = (helm ? 1.77 : x < 38 ? 1.38 : 1.49) + seed * .014;
      const split = easeBetween(t, start, start + .18);
      const drop = easeBetween(t, start + .08, start + .46);
      const yy = y + Math.round(16 * drop);
      if (yy > 57) continue;
      const xx = x + Math.round(((seed % 5) - 2) * split);
      const light = brightness(color);
      const soil = ash[light > 176 ? 3 : light > 100 ? 2 : light > 44 ? 1 : 0];
      const tarnish = easeBetween(t, helm ? 1.39 : 1.22, start + .20);
      out.d[yy * out.w + xx] = tarnish ? shade(color, soil, tarnish) : color;
    }
  }
}

const wispFps = 20, bloomFrames = 8, curlFrames = 32;
const pearl = shade(pal.M, pal.X, .58);

// The leading tip has its own pivot. After unfurling, the ribbon continues
// to billow as it travels; the distance it flies is independent of this art.
function wispPose(index) {
  const out = blank(20, 26);
  const bloom = easeBetween(index, 0, bloomFrames);
  const phase = (index - bloomFrames) * 2 * Math.PI / curlFrames;
  const depth = Math.round(3 + (17 + 1.5 * Math.sin(phase)) * bloom);
  for (let i = 0; i <= depth; i++) {
    const along = i / depth;
    const curl = 2.5 * (Math.sin(phase + 5.5 * along) - Math.sin(phase));
    const center = 9.5 + curl * bloom;
    const fullness = Math.pow(Math.sin(Math.PI * along), .8);
    const radius = .5 + fullness * (.6 + (2.05 + .2 * Math.cos(phase)) * bloom);
    for (let x = Math.ceil(center - radius); x <= Math.floor(center + radius); x++) {
      const side = (x - center) / radius;
      const color = side < -.35 ? pal.X : side > .48 ? pal.M : pearl;
      const strength = (side > .48 ? .46 : .90) * (.42 + .58 * fullness);
      const alpha = Math.round(255 * strength * (.38 + .62 * bloom));
      out.d[(1 + i) * out.w + x] = ((alpha << 24) | (color & 0xffffff)) >>> 0;
    }
  }
  return out;
}

let wispFrames;
const wisp = {
  release: SOUL_RELEASE, duration: 1.5, offsetX: 5, offsetY: -8, anchorY: 1, outline: false,
  gen: () => (wispFrames ??= Array.from({ length: bloomFrames + curlFrames }, (_, i) => wispPose(i))),
  frameAt(age) {
    const frame = Math.max(0, Math.floor(age * wispFps + 1e-9));
    return frame < bloomFrames ? frame : bloomFrames + (frame - bloomFrames) % curlFrames;
  },
};

let frames;
export const KNIGHT_FALL = {
  anchorY: APPROVED_HERO_ART.knight.anchorY,
  outline: false,
  frameAt: knightFallFrame,
  wisp,
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
      const body = { ...landed, d: landed.d.map((color, i) => landedWeapons.d[i] ? 0 : color) };
      for (let i = 0; i < DECAY_FRAMES; i++) {
        const time = SOUL_RELEASE + DECAY_STEP * i;
        const out = blank(standing.w, standing.h);
        sinkArmour(out, body, time);
        for (let j = 0; j < out.d.length; j++) if (landedWeapons.d[j]) out.d[j] = landedWeapons.d[j];
        frames.push(out);
      }
    }
    return frames;
  },
};
