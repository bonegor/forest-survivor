import { colours, poses } from '../../assets/knight-plumed/fall-poses.js';
import { blit } from '../engine/pixels.js';
import { KNIGHT_PLUMED } from './knight-plumed.js';
import { SOUL_RELEASE, appendDecay, blank, departingSoul, fallFrameAt, mix, paint } from './hero-fall.js';

function pixels(rows) {
  const width = Math.max(...rows.map(row => row.length));
  const buf = blank(width, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) buf.d[y * width + x] = colours[row[x]] || 0;
  });
  return buf;
}

const sword = pixels([
  '..Gg', '..rb', '..rb', '..gb', '.gGGg', '..MWm', '..MWm', '..MWm',
  '..MWm', '..MWm', '..MWm', '..MWm', '..MWB', '...M',
]);
const shield = pixels([
  '..Bmm', '.SmmMm', 'SmrrrmB', 'mrrbprmB', 'SrpmbrmB', 'SrpSmrmB',
  'BrrBprmB', '.SrrprmB', '.SrrprmB', '..SrrmB', '...SmB', '....B',
]);

// Seconds, pivot x/y, clockwise angle, projected length. The sword tip
// catches on the turf. The shield clears the falling head and rocks on its rim.
const drop = .60, shieldContact = 1.10;
const swordPath = [
  [drop, 44,46,-7,.74], [.70,43,46,-17,.84], [.80,42,46,-42,.96],
  [.90,40,46,-72,1], [1,38,45,-92,1], [1.10,36,45,-86,1], [1.20,35,45,-90,1],
];
const shieldPath = [
  [drop,48,41,0,.95], [.70,50,40,12,.95], [.80,54,38,25,1],
  [.90,58,37,45,1], [1,62,39,64,1], [shieldContact,65,43,85,1],
  [1.20,66,41,101,1], [1.30,66,43,96,1], [1.40,66,43,91,1],
];

function dropGear(out, piece, pivot, path, t) {
  const next = path.findIndex(([time]) => time > t);
  const a = next < 0 ? path.at(-1) : path[Math.max(0, next - 1)];
  const b = next < 0 ? a : path[next];
  const u = a === b ? 0 : (t - a[0]) / (b[0] - a[0]);
  const [x, y, tilt, length] = a.slice(1).map((v, i) => mix(v, b[i + 1], u));
  paint(out, piece, pivot, [x, y], tilt, length);
}

function equipment(out, t) {
  dropGear(out, sword, [3, 13], swordPath, t);
  dropGear(out, shield, [3, 6], shieldPath, t);
}

const bodyTimes = [.10,.20,.35,.50,drop,.70,.80,.90,1,1.10,1.20,1.30,1.40,1.55];
const samples = Array.from({ length: 32 }, (_, i) => [i / 20]);
let frames;
export const PLUMED_FALL = {
  anchorY: KNIGHT_PLUMED.anchorY, outline: false,
  frameAt: seconds => fallFrameAt(samples, seconds),
  wisp: { ...departingSoul, offsetX: 9, offsetY: -7 },
  cues: [{ time: shieldContact, sound: 'shieldfall' }, { time: SOUL_RELEASE, sound: 'souldepart' }],
  gen() {
    if (frames) return frames;
    const standing = KNIGHT_PLUMED.gen()[KNIGHT_PLUMED.idle[0]];
    const bodies = poses.map(([x, y, rows]) => [x, y, pixels(rows)]);
    frames = samples.map(([time]) => {
      const pose = bodyTimes.findLastIndex(start => time >= start);
      if (pose < 0) return standing;
      const out = blank(standing.w, standing.h);
      const [x, y, body] = bodies[pose];
      blit(out, body, x, y);
      if (time >= drop) equipment(out, time);
      return out;
    });
    const remains = blank(standing.w, standing.h);
    equipment(remains, SOUL_RELEASE);
    appendDecay(frames, remains, KNIGHT_PLUMED.anchorY);
    return frames;
  },
};
