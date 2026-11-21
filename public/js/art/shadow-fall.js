import { fromRows, hexPack } from '../engine/pixels.js';
import { SOUL_RELEASE, appendDecay, blank, cut, fallFrameAt, paint, segment, sinkingSoul, turn } from './original-fall.js';
import { packedPalette } from './palette.js';

// Hip and torso angle, rear and forward folds of the hem, then the wrists.
// Shadow's cloak bunches into a kneel as his hover fails. The palms stay put
// while his shoulders sink and his elbows give way.
const poses = [
  [0,    42,44,   0,  36,49,43,50, 36,41,54,40],
  [.12,  41,44, -10,  35,49,43,50, 35,40,52,41],
  [.18,  40,45, -12,  35,50,44,50, 34,42,52,42],
  [.24,  40,47,  -5,  36,52,46,50, 35,44,51,44],
  [.30,  41,48,   5,  37,54,47,50, 37,45,51,45],
  [.36,  41,49,  10,  37,54,47,49, 39,47,52,46],
  [.41,  41,48,  12,  37,54,47,49, 41,47,54,46],
  [.46,  42,48,  24,  37,54,47,50, 44,48,56,47],
  [.52,  43,49,  39,  37,54,47,51, 48,51,60,51],
  [.58,  44,49,  49,  37,54,47,52, 52,54,62,54],
  [.64,  44,50,  55,  37,54,47,53, 52,54,62,54],
  [.70,  45,51,  70,  38,54,46,54, 52,54,62,54],
  [.78,  45,52,  87,  38,54,45,54, 52,54,62,54],
  [.86,  45,52,  91,  38,54,45,54, 52,54,62,54],
  [.94,  45,52,  92,  38,54,45,54, 52,54,62,54],
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
const cloth = {
  k: hexPack('#110521'), q: hexPack('#1f213c'), n: hexPack('#363b50'),
  N: hexPack('#575a75'), g: hexPack('#a099ae'),
};
const sleeve = fromRows([' knk', 'kNNnk', 'kNnnk', 'knnqk', ' kqk'], cloth);
const bracer = fromRows([' knk', 'knNnk', 'knNnk', ' kqk'], cloth);
const palm = fromRows([' knk', 'knNnk', 'knNggk', ' kkkkk'], cloth);
const foldedCloth = fromRows([' kqqk', 'kqnnqk', 'knNNnqk', 'kqnnnqk', ' kqqnk', '  kkk'], cloth);

// After the knives leave the hands, these points follow their tips. Only the
// pivot turns at impact, so neither blade slides along the ground as it settles.
const drops = [
  [[58,31,49], [31,40,-24]],
  [[57,29,63], [29,37,-48]],
  [[58,33,84], [28,37,-72]],
  [[62,37,110], [27,40,-106]],
  [[65,43,133], [27,44,-128]],
  [[67,50,148], [28,49,-142]],
  [[69,57,152], [28,54,-149]],
  [[69,57,160], [28,57,-149]],
  [[69,57,156], [28,57,-159]],
  [[69,57,156], [28,57,-154]],
  [[69,57,156], [28,57,-154]],
  [[69,57,156], [28,57,-154]],
];

function splitCloak(standing) {
  return {
    figure: cut(standing, 24, [
      ...Array(11).fill([37,55]), ...Array(4).fill([40,53]),
      [41,53], [41,53], [40,53], [40,51], [40,51], [39,50], [39,49], [39,48],
    ]),
    mantle: cut(standing, 32, [
      [39,43], [39,44], [38,45], [32,45], [29,44], [27,43], [26,43],
      [25,43], [25,42], [24,42], [24,41], [24,40], [24,29], [24,27],
    ]),
    hem: cut(standing, 42, [
      [38,50], [36,50], [36,50], [35,50], [34,50], [34,48], [34,48],
      [34,48], [35,47], [36,46], [36,44], [36,44], [36,41], [36,38],
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
  const [, x, y, tilt, nx, ny, fx, fy, rx, ry, hx, hy] = poses[index];
  const hip = [x, y];
  const out = blank(standing.w, standing.h);
  const body = { ...out, h: 56 };
  const arm = (offset, wrist, bend) => {
    const shoulder = turn(offset, tilt, hip);
    const elbow = [(shoulder[0] + wrist[0]) / 2 - bend, (shoulder[1] + wrist[1]) / 2 + 2];
    segment(body, sleeve, shoulder, elbow);
    segment(body, bracer, elbow, wrist);
    paint(body, palm, [2, 1], wrist, wrist[1] >= 53 ? 0 : 36);
  };
  paint(body, parts.hem, [4, 2], hip, Math.min(72, tilt + 14), 1 - Math.min(.45, (y - 44) / 16));
  if (index >= 3) {
    segment(body, foldedCloth, [x + 2, y], [fx, fy]);
    segment(body, foldedCloth, [fx, fy], [fx + 1, Math.min(54, fy + 4)]);
    segment(body, foldedCloth, [x - 2, y], [nx, ny]);
    segment(body, foldedCloth, [nx, ny], [nx - 5, 54]);
  }
  paint(body, parts.mantle, [17, 4], turn([-1, -8], tilt, hip), 8 - tilt * .19);
  if (index >= 3) arm([-1, -9], [rx, ry], 1);
  paint(body, parts.figure, [7, 20], hip, tilt);
  arm([5, -7], [hx, hy], 2);
  if (index < 3) {
    paint(out, dagger, [2, 10], [hx, hy], tilt + 53);
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
    wisp: { ...sinkingSoul, offsetX: 17, offsetY: -5 },
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
