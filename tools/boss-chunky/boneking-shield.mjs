import originalBosses from '../../public/assets/art/bosses.js';
import { hexPack } from '../../public/js/engine/pixels.js';

export const padding = 12;
const width = 22;
const crest = [
  '..ggggg..',
  '.ggggggg.',
  'ggggggggg',
  'ggddgddgg',
  'ggddgddgg',
  '.gggdggg.',
  '..ggdgg..',
  '...gdg...',
  '...ggg...',
];
const profile = [
  [6,15], [4,17], [2,19], [1,20], [0,21], [0,21], [0,21], [0,21],
  [0,21], [0,21], [0,21], [0,21], [0,21], [1,20], [1,20], [2,19],
  [2,19], [3,18], [3,18], [4,17], [5,16], [5,16], [6,15], [7,14],
  [8,13], [8,13], [9,12], [10,11], [10,11],
];
const gripX = 8;
const gripY = 16;
const grips = [
  [26,49,-5], [26,49,-4], [26,49,-2], [27,49,1], [27,50,3], [26,50,0], [26,49,-2],
  [26,49,-5], [25,50,-9], [24,50,-12], [24,51,-12], [26,49,-5],
  [30,50,10], [31,51,13], [31,52,15],
  [26,49,-5], [26,48,-6], [26,47,-7], [26,46,-7], [26,45,-7],
  [26,51,-3], [26,52,-3],
  [26,49,-5], [21,41,-15], [18,37,-23], [18,37,-24], [18,37,-24],
  [34,38,16], [41,38,14],
];
const paints = {
  ink: '#191e30',
  blueDark: '#1e294a',
  blue: '#31537d',
  blueLight: '#407295',
  steel: '#657eaa',
  steelLight: '#b8d0e9',
  brass: '#8e6439',
  gold: '#deb357',
  gleam: '#ffeb9d',
  crestDark: '#403b45',
  flashEdge: '#c8783a',
  flashGold: '#ffe38e',
  flashLight: '#fff4ce',
  boneFacet: '#9c91a1',
  boneLight: '#ffedc9',
};
const browAndJaw = [
  [37,21,'boneFacet'], [44,21,'boneFacet'],
  [38,22,'ink'], [39,22,'ink'], [43,22,'ink'], [44,22,'ink'],
  [40,23,'ink'], [42,23,'ink'], [41,23,'boneLight'],
  [37,25,'boneFacet'], [45,25,'boneFacet'],
  [38,26,'boneLight'], [44,26,'boneFacet'],
  [39,27,'boneLight'], [43,27,'boneFacet'],
  [39,28,'boneFacet'], [40,28,'boneLight'], [42,28,'boneLight'],
  [43,29,'boneFacet'],
];
const shoulderEdges = [[26,27], [27,28], [28,28], [29,29], [50,28], [51,27]];
const swordPoint = [
  [76,71,'1957777C1'],
  [77,72,'1957777C1'],
  [78,74,'19577C1'],
  [79,75,'19577C1'],
  [80,77,'1957C1'],
  [81,79,'195C1'],
  [82,80,'19C1'],
  [83,82,'191'],
  [84,83,'11'],
];
const sweepPoint = [
  [-4,45,'K'],
  [-3,46,'5K'],
  [-2,46,'C5K'],
  [-1,47,'C59K'],
  [0,48,'C559K'],
  [1,50,'CC559K'],
  [2,51,'CC5559K'],
  [3,52,'CCC559KK'],
];

function inShield(x, y) {
  const span = profile[y];
  return span && x >= span[0] && x <= span[1];
}

function shieldPaint(x, y, flash) {
  const outer = !inShield(x - 1, y) || !inShield(x + 1, y) ||
    !inShield(x, y - 1) || !inShield(x, y + 1);
  const bevel = !inShield(x - 2, y) || !inShield(x + 2, y) ||
    !inShield(x, y - 2) || !inShield(x, y + 2);
  const emblem = crest[y - 8]?.[x - 6];
  if (flash) {
    if (outer || emblem === 'd') return 'flashEdge';
    if (bevel || emblem === 'g') return 'flashLight';
    return 'flashGold';
  }
  if (outer) return 'ink';
  if (emblem === 'd') return 'crestDark';
  if (emblem === 'g') return y <= 10 ? 'gleam' : 'gold';
  if (bevel) {
    if (y < 6 || (x < 5 && y < 11)) return x < 13 ? 'steelLight' : 'steel';
    return x < 11 ? 'steel' : 'blueDark';
  }
  if ((y === 6 && (x === 5 || x === 16)) || (y === 21 && x === 10)) return 'gold';
  if (x < 8 && y < 9) return 'blueLight';
  return x + Math.max(0, y - 16) < 14 ? 'blue' : 'blueDark';
}

export function padFrame(pixels, w, h, stride) {
  const padded = Buffer.alloc(stride * (h + 2 * padding));
  for (let y = 0; y < h; y++) {
    pixels.copy(padded, (y + padding) * stride + padding, y * w, (y + 1) * w);
  }
  return padded;
}

export function repairSweep(pixels, stride, number) {
  if (number !== 20 && number !== 21) return;
  const mark = (y, x, pattern) => {
    for (const [column, colour] of Array.from(pattern).entries()) {
      pixels[(y + padding) * stride + x + padding + column] = parseInt(colour, 36);
    }
  };
  // Complete the diagonal blade using the same steel facets as the shaft.
  for (let y = 76; y < 80; y++) mark(y, 71, '00000000');
  for (const [y,x,pattern] of swordPoint) mark(y, x, pattern);
  if (number === 21) return;

  // The source cel clipped the arc along its top and a long run of its
  // right edge. Taper the crest into a curved silhouette through both cuts.
  for (let y = 0; y < 4; y++) mark(y, 50, '0000000000');
  for (const [y,x,pattern] of sweepPoint) mark(y, x, pattern);
  for (let y = 34; y <= 62; y++) {
    const extension = y >= 44 && y <= 51 ? 3 : y >= 39 && y <= 56 ? 2 : 1;
    mark(y, 79, 'K'.repeat(extension));
    mark(y, 75, '9'.repeat(extension - 1));
  }
}

function addShield(pixels, original, w, stride, number, indices) {
  const [handX, handY, degrees] = grips[number];
  const angle = degrees * Math.PI / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const widthScale = number >= 27 ? 0.86 : 1;
  // Inverse nearest-neighbour sampling keeps the face solid while it turns
  // and foreshortens behind the raised blade at the end of the nova.
  for (let dy = -25; dy <= 25; dy++) {
    for (let dx = -25; dx <= 25; dx++) {
      const sx = Math.round((dx * c + dy * s) / widthScale + gripX);
      const sy = Math.round(-dx * s + dy * c + gripY);
      if (sx < 0 || sx >= width || !inShield(sx, sy)) continue;
      const px = handX + dx;
      const py = handY + dy;
      const old = px >= 0 && px < w ? original[py * w + px] : 0;
      // Keep the visible sword, crossguard and orb over the shield when the
      // pieces intersect in travel, windups and the crossed recovery pose.
      const crossedSword = number >= 27 && ((py >= 29 && py <= 32) ||
        (px >= (number === 28 ? 47 : 40) && py <= 35));
      const sideSword = number >= 12 && number <= 14 && px >= 46;
      const chargingOrb = number >= 23 && number <= 25 && px >= 35 && px <= 49 && py >= 30 && py <= 42;
      if (old && (crossedSword || sideSword || chargingOrb)) continue;
      pixels[(py + padding) * stride + px + padding] = indices[shieldPaint(sx, sy, number === 26)];
    }
  }
}

function eyeOffset(source, w) {
  let eyeX = w;
  let eyeY = w;
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== 10 && source[i] !== 11) continue;
    eyeX = Math.min(eyeX, i % w);
    eyeY = Math.min(eyeY, Math.floor(i / w));
  }
  return [eyeX - 38, eyeY - 23];
}

function polishTorso(pixels, source, rest, base, w, number, indices) {
  if (number === 26) {
    for (let y = 39; y <= 48; y++) {
      for (let x = 35; x <= 46; x++) {
        const i = y * w + x;
        if (pixels[i] === 2 || pixels[i] === 17) pixels[i] = 20;
      }
    }
    return;
  }
  const [dx, dy] = eyeOffset(source, w);
  // Cold cheek planes and low brows frame the original amber eyes. Material
  // ownership keeps every stroke below the sword and above the raised fist.
  for (const [x, y, shade] of browAndJaw) {
    const ref = y * w + x;
    const i = (y + dy) * w + x + dx;
    if (source[i] === rest[ref] && [8,13,14,17].includes(base[ref])) pixels[i] = indices[shade];
  }
  for (const [x, y] of shoulderEdges) {
    const ref = y * w + x;
    const i = (y + dy) * w + x + dx;
    if (source[i] === rest[ref] && [5,7,12,29].includes(base[ref])) pixels[i] = indices.steelLight;
  }
  for (let y = 37; y <= 51; y++) {
    for (let x = 36; x <= 46; x++) {
      const ref = y * w + x;
      const i = (y + dy) * w + x + dx;
      if (source[i] !== rest[ref] || ![2,3,4,6,23,24,25,27,28].includes(base[ref])) continue;
      // The chest keeps a narrow woven strip and a small brass clasp.
      // The large skull emblem belongs to the handheld shield.
      if (number >= 23 && number <= 25 && y + dy < 40) continue;
      const clasp = y === 39 && x >= 40 && x <= 42;
      pixels[i] = indices[clasp ? 'brass' : x < 41 ? 'blue' : 'blueDark'];
    }
  }
}

export default function paintFloatingBoneKingShield(data) {
  const { w, h } = data;
  const stride = w + 2 * padding;
  const entries = Object.entries(paints);
  const indices = Object.fromEntries(entries.map(([key], i) => [key, data.palette.length + i]));
  const palette = data.palette.concat(entries.map(([, colour]) => hexPack(colour) >>> 0));
  const source = originalBosses.boneking.frames.map(frame => Buffer.from(frame, 'base64'));
  const base = Buffer.from(data.frames[0], 'base64');
  const frames = data.frames.map((frame, number) => {
    const original = Buffer.from(frame, 'base64');
    const pixels = Buffer.from(original);
    polishTorso(pixels, source[number], source[0], base, w, number, indices);
    const padded = padFrame(pixels, w, h, stride);
    repairSweep(padded, stride, number);
    addShield(padded, original, w, stride, number, indices);
    return padded.toString('base64');
  });
  return { ...data, w: stride, h: h + 2 * padding, below: data.below + padding, palette, frames };
}
