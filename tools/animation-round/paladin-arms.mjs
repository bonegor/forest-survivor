import { hexPack } from '../../public/js/engine/pixels.js';
import { paladinCrest } from './heavy-hero-clarity.mjs';

// Shoulder and glove are drawn at the same native scale as the cuirass.
// Burgundy continues the lock behind the pauldron. The bright edge belongs
// to the top of the steel plate, with a thin brass lip underneath.
const colors = Object.fromEntries(Object.entries({
  k: '#160d22', r: '#76192e', R: '#962438', d: '#42273b',
  p: '#725965', s: '#a68f8e', h: '#d9c6aa', w: '#f4e2b8',
  g: '#bf872e', b: '#775337',
}).map(([key, value]) => [key, hexPack(value)]));
colors['.'] = 0;

// In native coordinates, the hilt crosses the waist, comes up in front of
// the face, then extends forward on release. Pin the knuckles to the real
// rotating handle. The elbow stays under the plate and unfolds on the cut.
const strike = [
  // elbow x/y, grip x/y
  [33,40,30,41], [33,40,32,41], [33,40,35,41], [34,40,36,39],
  [34,39,37,36], [33,37,36,33], [31,35,33,31], [30,35,31,31],
  [35,38,38,36], [35,40,38,39], [35,40,36,41], [34,40,33,42],
  [34,40,32,42], [34,40,31,41], [33,40,30,41], [33,40,30,41],
  [33,40,30,41], [33,40,30,41],
];

export function fitPaladinArms(frame, attackStep, weapon) {
  const { w } = frame, d = frame.d.slice();
  const dy = paladinCrest(frame).y - 26;
  const dx = attackStep >= 8 && attackStep <= 13 ? 1 : 0;
  const [ex, ey, gx, gy] = strike[Math.max(0, attackStep)];
  const set = (x, y, key) => { d[(y + dy) * w + x] = colors[key]; };
  const row = (x, y, keys) => [...keys].forEach((key, i) => set(x + i, y, key));

  // Clear the high pointed cap, continuing the red hair down to the collar.
  // This row ends just before the cheek. Keep the far shoulder at the shield.
  row(29 + dx, 32, '...krR');
  row(29 + dx, 33, '...krRdk');
  row(29 + dx, 34, '....krdk');
  row(29 + dx, 35, '....dkpk');
  row(29 + dx, 36, '...khwsd');
  row(29 + dx, 37, '..kghspk');
  row(29 + dx, 38, '..kbgpk');
  row(29 + dx, 39, '..kkdd');
  row(29 + dx, 40, '....');

  // Clear the exposed edge of the old straight arm. Leave the guard, blade
  // and underlying tabard in place.
  for (let y = 36; y <= 40; y++) {
    for (let x = 26; x < 31 + dx; x++) set(x, y, '.');
  }

  // Short overlapping steel plates follow the angle between the joints.
  function sleeve(ax, ay, bx, by, lit, shade) {
    const length = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let i = 0; i <= length; i++) {
      const t = length ? i / length : 0;
      const x = Math.round(ax + (bx - ax) * t), y = Math.round(ay + (by - ay) * t);
      set(x - 1, y, 'k'); set(x, y, lit); set(x + 1, y, shade);
    }
  }
  sleeve(33 + dx, 38, ex, ey, 'p', 'd');
  sleeve(ex, ey, gx, gy, 's', 'p');
  const cuffX = Math.round((ex + gx) / 2), cuffY = Math.round((ey + gy) / 2);
  set(cuffX, cuffY, 'g');
  set(cuffX + 1, cuffY, 'p');
  // The small closed fist is deliberately darker than the crossguard.
  set(gx, gy - 1, 'w'); set(gx + 1, gy - 1, 's');
  set(gx - 1, gy, 'd'); set(gx, gy, 'h'); set(gx + 1, gy, 'p');
  set(gx, gy + 1, 'b');

  // Shield strap: the thumb and fingers emerge from behind the inboard rim.
  let rim = 43 + dx;
  for (let x = 41; x <= 46; x++) {
    const c = frame.d[(40 + dy) * w + x];
    if ((c & 255) > 190 && (c >>> 8 & 255) > 135) { rim = x; break; }
  }
  row(rim - 2, 38, 'pd');
  row(rim - 2, 39, 'sh');
  row(rim - 2, 40, 'db');

  // The mask contains both the sword and the old arm. From the knuckles
  // outwards the original handle, guard and blade stay in front of the glove.
  const vx = gx - (33 + dx), vy = gy - 36;
  for (const index of weapon) {
    // The resting weapon mask follows the one-pixel breathing/step offset.
    const j = attackStep < 0 ? index + dy * w : index;
    const x = j % w, y = Math.floor(j / w) - dy;
    if ((x - gx) * vx + (y - gy) * vy >= 3) d[j] = frame.d[j];
  }
  return { ...frame, d };
}
