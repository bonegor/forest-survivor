import { hexPack } from '../../public/js/engine/pixels.js';
import { paladinCrest } from './heavy-hero-clarity.mjs';
import { trailHeadRows } from './trail-head.mjs';

// Keep Sylva's brow, eye spacing and cheek at their native resolution. Only
// the two iris samples change material: lit chestnut and the deeper far eye.
const nearEye = hexPack('#996036'), farEye = hexPack('#62391f');
const face = [];
for (const { x: left, y, pixels } of trailHeadRows) {
  for (const [column, { hair, color }] of pixels.entries()) {
    if (hair) continue;
    const x = left + column;
    const iris = y === 34 && (x === 38 || x === 41);
    const paint = iris ? ((color & 0xff000000) | ((x === 38 ? nearEye : farEye) & 0xffffff)) >>> 0 : color;
    face.push({ dx: x - 37, dy: y - 28, paint });
  }
}

export function fitPaladinFace(frame, swordPixels) {
  const crest = paladinCrest(frame);
  const d = frame.d.slice();
  for (const { dx, dy, paint } of face) {
    const i = (crest.y + dy) * frame.w + crest.x + dx;
    if (!swordPixels?.has(i)) d[i] = paint;
  }
  return { ...frame, d };
}
