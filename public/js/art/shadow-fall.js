import { fromRows } from '../engine/pixels.js';
import { SOUL_RELEASE, appendDecay, blank, cut, departingSoul, fallFrameAt, paint, turn } from './hero-fall.js';
import { packedPalette } from './palette.js';

// Shadow loses his hover, catches himself with his cloak trailing, then pitches forward.
// Each pose gives the body pivot and tilt, followed by the cloak's swing relative to it.
const poses = [
  [0,    42,44,   0,   0],
  [.12,  41,43, -12,  11],
  [.18,  40,45,  -9,  16],
  [.24,  41,47,  -1,  21],
  [.30,  42,49,  12,  21],
  [.36,  43,51,  28,  14],
  [.41,  44,52,  43,   6],
  [.46,  45,53,  58, -12],
  [.52,  45,53,  74, -25],
  [.58,  45,53,  87, -43],
  [.64,  45,52,  82, -37],
  [.70,  45,53,  91, -45],
  [.78,  45,53,  88, -42],
  [.86,  45,53,  92, -44],
  [.94,  45,53,  92, -44],
];

const pal = packedPalette();
const dagger = fromRows([
  '  G', ' Ggk', ' wGk', ' wGk', ' wGk', ' Ggk', ' Ggk', ' Ggk',
  'nNNnk', ' kkK', ' kgK', ' kNK', '  n',
], pal);
const offhand = fromRows([
  '  g', ' gNk', ' Ggk', ' Ggk', ' gNk', ' gNk',
  'nNNnk', ' kkK', ' knK', '  n',
], pal);

// After the knives leave the hands, these points follow their tips. Only the
// pivot turns at impact, so neither blade slides along the ground as it settles.
const drops = [
  [[58,31,49], [31,40,-24]],
  [[57,29,63], [29,37,-48]],
  [[58,33,84], [28,37,-72]],
  [[60,37,110], [27,40,-106]],
  [[62,43,133], [27,44,-128]],
  [[63,50,148], [28,49,-142]],
  [[63,57,152], [28,54,-149]],
  [[63,57,160], [28,57,-149]],
  [[63,57,156], [28,57,-159]],
  [[63,57,156], [28,57,-154]],
  [[63,57,156], [28,57,-154]],
  [[63,57,156], [28,57,-154]],
];

function splitCloak(standing) {
  return {
    figure: cut(standing, 24, [
      ...Array(11).fill([38, 55]), ...Array(8).fill([36, 56]),
      [36,55], [37,55], [38,52], [38,52], [37,51], [36,50], [35,50],
      [34,48], [35,48], [35,45], [35,41], [35,39],
    ]),
    mantle: cut(standing, 32, [
      [39,43], [39,44], [38,45], [32,45], [29,44], [27,43], [26,43],
      [25,43], [25,42], [24,42], [24,41], [24,40], [24,29], [24,27],
    ]),
  };
}

function drawDrops(out, index) {
  const surface = { ...out, h: 56 };
  const [[x, y, angle], [rearX, rearY, rearAngle]] = drops[index - 3];
  paint(surface, offhand, [2, 0], [rearX, rearY], rearAngle);
  paint(surface, dagger, [2, 0], [x, y], angle);
}

function drawPose(standing, parts, index) {
  const [, x, y, tilt, drag] = poses[index];
  const hip = [x, y];
  const out = blank(standing.w, standing.h);
  const ground = { ...out, h: 57 };
  paint(ground, parts.mantle, [17, 4], turn([-1, -8], tilt, hip), tilt + drag);
  paint(ground, parts.figure, [6, 20], hip, tilt);
  if (index < 3) {
    const hand = turn([12, -3], tilt, hip);
    paint(out, dagger, [2, 10], hand, tilt + 53);
  } else {
    drawDrops(out, index);
  }
  return out;
}

export function shadowFall(sprite) {
  let frames;
  return {
    anchorY: sprite.anchorY,
    outline: false,
    frameAt: seconds => fallFrameAt(poses, seconds),
    wisp: { ...departingSoul, offsetX: 13, offsetY: -5 },
    cues: [{ time: SOUL_RELEASE, sound: 'souldepart' }],
    gen() {
      if (frames) return frames;
      const standing = sprite.gen()[sprite.idle[0]];
      const parts = splitCloak(standing);
      frames = poses.map((_, index) => index ? drawPose(standing, parts, index) : standing);
      const remains = blank(standing.w, standing.h);
      drawDrops(remains, poses.length - 1);
      appendDecay(frames, remains, sprite.anchorY);
      return frames;
    },
  };
}
