import { packedPalette } from '../../public/js/art/palette.js';

const ink = packedPalette();

// Lyra, facing right. Parts are registered to the original crown, shoulders,
// bow hand and hips. Spaces expose the layer beneath. Each mark is a world pixel.
const head = [
  '    mmbbmm',
  '   mbOOddOb',
  '  mbOOddOOOb',
  ' mbOOddOObBbm',
  ' bOOdOObStsB',
  ' bOOOObSBmbS',
  ' bBtSbOStTEB',
  ' mbStbbSsstsB',
  '  mbbObBSssb',
  '  mbbObbBtm',
  '     mbmb3',
];

const looseHair = [
  '     mbOOOb',
  '    mbOOOOb',
  '   mbOOdObm',
  '  mbOOdOOb ',
  ' mbOOdOObm ',
  'mbOOdOObm  ',
  'mbOOOObm   ',
  'mbOObbm    ',
  ' mbbmm     ',
  '  mbm      ',
];

const quiver = [
  ' C T  ',
  'mCDC  ',
  'bDCm  ',
  'mBBb  ',
  ' mbBm ',
  '  mbb ',
];

const mantle = [
  '     m332m   ',
  '   m3221123m ',
  '  m32112223m ',
  '  3222223mm  ',
  '   33m3m     ',
];

const jerkin = [
  ' bBBBb  ',
  ' bDBBbb ',
  ' mbDBBb ',
  ' mbbDBm ',
  ' bbbBDm ',
  'mbbmbbb ',
  'bmbTtbm ',
  ' bbBBbm ',
  ' 223m22m',
  ' 234m32m',
];

const wrist = [
  '  m22m',
  '  m1tB',
  '  btsB',
  ' mbBbm',
  ' bBBB ',
  ' mbbm ',
  ' mtSm ',
  ' bssB ',
  '  BBm ',
];

const cloakTip = [
  '     322m',
  '    3213m',
  '   32123 ',
  '  32123  ',
  ' 32123m  ',
  'm3223m   ',
  'm323m    ',
  ' m34     ',
];

// The upper limb stands a pixel clear of the cheek. The resting string
// is almost straight, with a narrow wedge of air under either limb.
const loweredBow = [
  '   Bm',
  '   Ddb',
  '   D Bm',
  '  D  dBm',
  '  D   Bm',
  '  D   tB',
  '  D   Bm',
  '  D  dBm',
  ' D  mbbm',
  ' D btsbm',
  ' D Bstbm',
  ' D BsBb',
  ' D  Bm',
  ' D dBm',
  ' DBBm',
  ' Bbm',
  ' bm',
];

// Only the intermediate tones lift. The dark hems, outer hair and gaps
// between equipment retain their contrast in a brightly lit clearing.
const baseLight = new Map(Object.entries({
  J: 'h', I: 'b', '2': '1', '3': '2', '4': '3', S: 't',
}).map(([from, to]) => [ink[from], ink[to]]));

const cloakColors = new Set([ink['1'], ink['2'], ink['3'], ink['4']]);
const bowColors = new Set([ink.D, ink.O, ink.I]);

// Trace the two resting soles in the authored standing shots. Moving shots
// instead use the same ankle and knee targets as the corresponding walk pose.
function restingLegs(frame) {
  const soles = [];
  const groundRow = 55 * frame.w;
  for (let x = 20; x < 58; x++) {
    if (!frame.d[groundRow + x]) continue;
    const start = x;
    while (x < 58 && frame.d[groundRow + x + 1]) x++;
    soles.push((start + x) / 2);
  }
  return soles.map((sole, i) => {
    const near = i === 0;
    const ankle = sole - (near ? 0 : 0.8);
    const hip = near ? 37 : 41;
    return { name: near ? 'near' : 'far', ankle: [ankle, 54], knee: [(ankle + hip) / 2, 50] };
  }).reverse();
}

function boots(frame, d, legs, aiming) {
  const { w, d: source } = frame;
  for (let y = 48; y < 56; y++) {
    for (let x = 24; x < 54; x++) {
      const i = y * w + x;
      const color = source[i];
      if (!color || (x < 35 && y < 51 && cloakColors.has(color))) continue;
      if (!aiming && x >= 43 && y <= 50 && bowColors.has(color)) continue;

      let selected;
      let closest = Infinity;
      for (const leg of legs) {
        const [kx, ky] = leg.knee;
        const [ax, ay] = leg.ankle;
        const t = Math.max(0, Math.min(1, (y + 0.5 - ky) / (ay - ky)));
        const distance = Math.abs(x + 0.5 - (kx + (ax - kx) * t));
        // Where calves cross, the lit near boot covers the far boot.
        if (distance < closest || (leg.name === 'near' && distance < 1.5)) {
          closest = distance;
          selected = leg;
        }
      }
      if (!selected) continue;

      const near = selected.name === 'near';
      const knee = selected.knee[1];
      const ankle = selected.ankle[1];
      if (!source[i + w]) d[i] = ink.m;
      else if (y < knee - 1) d[i] = near ? ink.a : ink.V;
      else if (y < knee + 0.6) d[i] = near ? ink.B : ink.H;
      else if (y < knee + 1.6) d[i] = near ? ink.b : ink.I;
      else if (!source[i + 1]) d[i] = near ? ink.m : ink.h;
      else if (y > ankle - 0.1 || !source[i - 2]) d[i] = near ? ink.B : ink.I;
      else d[i] = near ? ink.b : ink.m;
    }
  }
  for (const leg of legs) {
    const x = Math.round(leg.knee[0]) - 1;
    const y = Math.round(leg.knee[1]);
    // A turned-over cuff adds width to each boot and keeps the joint visible
    // when the supporting leg passes behind the other one.
    const near = leg.name === 'near';
    for (let dx = -1; dx <= 1; dx++) d[y * w + x + dx] = near ? ink.B : ink.H;
    d[(y + 1) * w + x] = near ? ink.b : ink.I;
  }
}

export function drawRangerModel(frame, { attackStep = -1, pose, idleStep = -1 } = {}) {
  const { w, h, d: source } = frame;
  const d = source.slice();
  const p = (x, y) => y * w + x;
  const stamp = (x0, y0, rows) => {
    for (const [j, row] of rows.entries()) {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== ' ') d[p(x0 + i, y0 + j)] = ink[row[i]];
      }
    }
  };
  let crown = 20;
  while (crown < 36 && !source[p(39, crown)]) crown++;
  if (crown === 36) throw new Error('Missing registered Ranger crown');
  const aiming = attackStep >= 0 && attackStep < 3;
  const dy = crown - (aiming ? 30 : 27);
  const clothLifts = pose ? pose.phase >= 0.625 && pose.phase < 0.875 : idleStep >= 6 && idleStep <= 10;
  const cloth = clothLifts ? -1 : 0;

  for (let i = 0; i < d.length; i++) d[i] = baseLight.get(d[i]) ?? d[i];
  boots(frame, d, pose?.legs ?? restingLegs(frame), aiming);

  // The resting and raised shoulders occupy different rows, but share the
  // same olive cloth, cross-body harness, buckle and long rear cape.
  if (!aiming) {
    stamp(27 + cloth, 41 + dy, cloakTip);
    stamp(36, 37 + dy, jerkin);
    stamp(32, 36 + dy, mantle);
    stamp(32, 39 + dy, wrist);
  } else {
    stamp(29 + cloth, 42 + dy, cloakTip);
    stamp(36, 39 + dy, jerkin);
    stamp(31, 38 + dy, mantle);
  }

  // Keep the forehead behind the swept fringe. The small lit cheek ends
  // above the collar, with the eyelid tucked into the near temple.
  for (let y = crown - 2; y <= crown + 8; y++) {
    for (let x = 28; x <= 44; x++) {
      if (y < crown + 7 || x >= 35) d[p(x, y)] = 0;
    }
  }
  const hairY = crown + (aiming ? -1 : 1);
  stamp(29 + cloth, hairY + 1, looseHair);
  stamp(29 + cloth, hairY + 6, quiver);
  stamp(32, crown - (aiming ? 2 : 0), head);

  // Use the authored hands and equipment silhouettes. Keep the nocked arrow
  // and string in front of the cheek and retain the true draw/release pose.
  if (aiming) {
    for (let y = 27; y < 47; y++) {
      for (let x = 28; x < 57; x++) {
        const i = p(x, y);
        const color = source[i];
        const bow = x >= 45;
        const string = attackStep === 1 && color === ink.D && x >= 38 && y <= 42;
        const rearHand = y >= 37 && y <= 40 && x >= 30 && x < 38;
        const shaft = y >= 37 && y <= 40 && x >= 40;
        if (!color || !(bow || string || rearHand || shaft)) continue;
        d[i] = baseLight.get(color) ?? color;
        if (bow && (color === ink.O || color === ink.B)) d[i] = ink.d;
      }
    }
  } else {
    for (let y = 32 + dy; y <= 50 + dy; y++) {
      for (let x = 43; x <= 51; x++) {
        const i = p(x, y);
        const color = source[i];
        if ((x >= 45 && y <= 47 + dy && color) || color === ink.D || color === ink.O) d[i] = 0;
      }
    }
    stamp(43, 34 + dy, loweredBow);
    stamp(41, 39 + dy, [
      '2m',
      ' bBm',
      '  bBbm',
      '   bbBbm',
      '    mbtsB',
      '      sSB',
    ]);
  }
  return { w, h, d };
}
