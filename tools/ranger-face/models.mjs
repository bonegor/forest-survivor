import ranger from './original.js';
import { packedPalette } from '../../public/js/art/palette.js';

// Head insets on Lyra's native grid. The left tip is her ear, which points
// back through the auburn hair. Spaces leave the original artwork visible.
// A dot cuts a pixel of background beside the nose or under the chin.
// The brown upper lid sits one row above the green iris. In three-quarter
// view the far eye tucks into the shadow of the front lock of hair.
const faces = {
  profile: [
    '     dOObbb ',
    '    OObSttSb',
    ' tBOOStSbmbm',
    '  tsBtsTTEs.',
    '   bbStsssSb',
    '    mbBSsSb.',
    '     bBBtm. ',
  ],
  'three-quarter': [
    '     ddOObb ',
    '    OObBtsSb',
    ' stBOSBmtSBb',
    '  StBsTeSt3b',
    '   bBSsstsSm',
    '    mbStssbm',
    '     mbBSm. ',
  ],
};

const master = packedPalette();
// From the back of the hair at x29 through the chin and front hairline
// at x44. The tips of the quiver and the bow sit outside this cut.
const hairlineBottom = [35, 35, 34, 34, 34, 35, 35, 35, 35, 36, 36, 36, 36, 35, 35, 34];
const drawnBow = new Set([ranger.attack[1], ...ranger.attackWalk[1]]);
const aiming = new Set([...ranger.attack.slice(0, 3), ...ranger.attackWalk.slice(0, 3).flat()]);
const cache = new Map();
export function getFaceSheet(id) {
  if (!Object.hasOwn(faces, id)) throw new Error(`Unknown Ranger face: ${id}`);
  if (cache.has(id)) return cache.get(id);
  const palette = ranger.palette.slice();
  const stringIndex = palette.indexOf(master.D);
  const inset = faces[id].map(line => Array.from(line, key => {
    if (key === ' ') return null;
    if (key === '.') return 0;
    if (!Object.hasOwn(master, key)) throw new Error(`Unknown Ranger color: ${key}`);
    const color = master[key], index = palette.indexOf(color);
    return index >= 0 ? index : palette.push(color) - 1;
  }));
  const frames = ranger.frames.map(([left, top, width, height, encoded], frame) => {
    const pixels = Buffer.from(encoded, 'base64');
    const offset = (x, y) => (y - top) * width + x - left;
    // The crown follows the walk bob, idle breath and crouch at full draw.
    let crown = top;
    while (crown < top + height && !pixels[offset(39, crown)]) crown++;
    if (crown === top + height) throw new Error('Missing Ranger head');
    // Profile keeps her eye level with the horizon as her shoulders rise.
    // Carry the whole hairline down to the collar on the high walk poses.
    if (id === 'profile' && ranger.walk.includes(frame) && crown === 27) {
      for (const [column, bottom] of hairlineBottom.entries()) {
        const x = 29 + column;
        for (let y = bottom + 1; y > crown; y--) pixels[offset(x, y)] = pixels[offset(x, y - 1)];
        pixels[offset(x, crown)] = 0;
      }
      crown++;
    }
    for (const [row, line] of inset.entries()) {
      for (const [column, index] of line.entries()) {
        if (index === null) continue;
        const x = 33 + column, y = crown + 3 + row;
        // In the three lowered aiming poses, the hand and shaft pass under
        // the jaw on row 37 and the raised arm covers the neck below.
        if (aiming.has(frame) && (y > 37 || (y === 37 && (x < 38 || x > 41)))) continue;
        const i = offset(x, y);
        // The nocked string crosses the cheek, in front of the head.
        if (drawnBow.has(frame) && pixels[i] === stringIndex) continue;
        pixels[i] = index;
      }
    }
    return [left, top, width, height, pixels.toString('base64')];
  });
  const data = { ...ranger, palette, frames };
  cache.set(id, data);
  return data;
}
