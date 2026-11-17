import { PAL } from '../../public/js/art/palette.js';
import { hexPack } from '../../public/js/engine/pixels.js';

const MEMBRANE = 1;
const WING_RIB = 3;
const IRON = 7;
const BLACK_IRON = 8;
const STEEL = 9;
const WING_LIGHT = 10;
const WING_SHADE = 11;
const PLATE = 12;
const PLATE_EDGE = 13;
const CLOTH = 14;
const CLOTH_LIGHT = 15;
const WING_EDGE_LIGHT = 16;
const STEEL_SPECULAR = 17;
const ARMOR_SEAM = 18;
const WING_OUTLINE = 19;
const colours = [
  null, '#ad2841', PAL.d, '#421a32', PAL.Y, PAL.o, PAL.r,
  PAL.K, '#20182c', '#687ca7', '#dc4b57', '#6b2541',
  PAL.n, '#9cafd2', PAL.q, '#533955', '#f2787a', '#c8d9f3', '#281d36',
  '#261526',
];
const torsos = [
  [48, 52], [48, 52], [48, 51], [48, 50], [48, 51], [48, 52], [48, 52],
  [47, 56], [46, 58], [48, 53], [47, 52], [46, 52], [52, 54], [52, 54],
];
const leadingHands = [
  [65, 50], [67, 51], [68, 52], [68, 52], [68, 52], [67, 51], [65, 50],
  [69, 48], [69, 47], [77, 69], [72, 64], [68, 60], [65, 51], [65, 50],
];
const armour = [
  // The bright shoulder turns into the deeper vertical chest plate.
  [PLATE, [[-11,-9],[-5,-9],[-5,-6],[-8,-1],[-11,0],[-12,-4]]],
  [STEEL, [[-10,-8],[-5,-8],[-5,-6],[-8,-6],[-9,-3],[-11,-3],[-11,-6]]],
  [PLATE_EDGE, [[-10,-7],[-6,-7],[-7,-6],[-10,-6]]],
  [STEEL_SPECULAR, [[-10,-7],[-8,-7],[-8,-6],[-10,-6]]],
  [PLATE, [[-6,-5],[-3,-5],[-4,1],[-3,3],[1,5],[0,7],[-6,4],[-8,1]]],
  [ARMOR_SEAM, [[-7,-3],[-6,-3],[-6,2],[-3,5],[-5,5],[-8,2]]],
  [STEEL, [[-7,3],[-5,4],[-3,7],[-2,8],[-5,8],[-8,5]]],
  [PLATE, [[1,7],[5,5],[8,5],[8,7],[3,10],[-2,10]]],
  [STEEL, [[0,8],[3,7],[6,6],[7,6],[5,8],[2,9]]],
  [PLATE_EDGE, [[2,8],[5,7],[6,7],[4,8],[2,9]]],
  // A broad purple cloth panel hangs under the hard steel belt.
  [CLOTH, [[-9,9],[-4,11],[2,11],[2,15],[6,19],[1,23],[-5,21],[-8,23],[-11,19],[-10,13]]],
  [CLOTH_LIGHT, [[-8,11],[-5,12],[-3,13],[-4,19],[-7,20],[-9,18]]],
];

function inside(x, y, shape) {
  let result = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [ax, ay] = shape[j];
    const [bx, by] = shape[i];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) result = !result;
  }
  return result;
}

function paintWings(source, pixels, w, h) {
  const seen = new Uint8Array(source.length);
  for (let start = 0; start < source.length; start++) {
    if (source[start] !== MEMBRANE || seen[start]) continue;
    const region = [start];
    seen[start] = 1;
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (let i = 0; i < region.length; i++) {
      const p = region[i];
      const x = p % w;
      const y = Math.floor(p / w);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      const neighbours = [[x - 1,y],[x + 1,y],[x,y - 1],[x,y + 1]];
      for (const [nx, ny] of neighbours) {
        const q = ny * w + nx;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h || seen[q] || source[q] !== MEMBRANE) continue;
        seen[q] = 1;
        region.push(q);
      }
    }
    if (region.length < 14 || x1 - x0 < 4 || y1 - y0 < 4) continue;
    // The bigger light-facing sails catch one short, brighter upper fold.
    // Long undersides and the rib silhouette stay deep wine-red.
    for (const p of region) {
      const u = (p % w - x0) / (x1 - x0);
      const v = (Math.floor(p / w) - y0) / (y1 - y0);
      const light = v + u * 0.46;
      if (light < 0.28 && x0 < 48 && region.length >= 42) pixels[p] = WING_EDGE_LIGHT;
      else if (light < 0.60 && x0 < 48) pixels[p] = WING_LIGHT;
      else if (v + u * 0.22 > 0.99 || x0 >= 76) pixels[p] = WING_SHADE;
    }
  }
  // Replace isolated dark specks inside the sail while retaining rib chains.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (source[p] !== WING_RIB) continue;
      const neighbours = [p - w - 1,p - w,p - w + 1,p - 1,p + 1,p + w - 1,p + w,p + w + 1];
      if (neighbours.every(q => source[q] === MEMBRANE)) pixels[p] = pixels[p - w];
      // The highlight sits inside a dark outer rib, clear of the engine glow.
      if (neighbours.some(q => source[q] === 0) &&
          neighbours.some(q => source[q] === MEMBRANE)) pixels[p] = WING_OUTLINE;
    }
  }
}

export default function chunkyDemonLord(data) {
  const { w, h } = data;
  const palette = colours.map((color, i) => color ? hexPack(color) >>> 0 : data.palette[i]);
  const frames = data.frames.map((frame, number) => {
    const source = Buffer.from(frame, 'base64');
    const pixels = Buffer.from(source);
    paintWings(source, pixels, w, h);
    const [cx, cy] = torsos[number];
    for (const [color, shape] of armour) {
      const xs = shape.map(([x]) => x);
      const ys = shape.map(([,y]) => y);
      for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
        for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
          const px = cx + x;
          const py = cy + y;
          if (px < 0 || px >= w || py < 0 || py >= h) continue;
          const i = py * w + px;
          // The existing fire seal, glowing face, hands and wing marks stay
          // attached to their authored poses and above or beside the plates.
          if (![IRON, BLACK_IRON, STEEL].includes(source[i])) continue;
          if (inside(x + 0.5, y + 0.5, shape)) pixels[i] = color;
        }
      }
    }
    const [handX, handY] = leadingHands[number];
    // The gauntlet catches a short cool stroke under its existing ember tips.
    for (const [x, y, tone] of [[-1,1,STEEL], [0,1,PLATE_EDGE], [1,1,STEEL],
      [0,2,STEEL], [1,2,STEEL], [1,3,PLATE]]) {
      const i = (handY + y) * w + handX + x;
      if (source[i] === IRON || source[i] === BLACK_IRON) pixels[i] = tone;
    }
    return pixels.toString('base64');
  });
  return { ...data, palette, frames };
}
