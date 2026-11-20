import { APPROVED_HERO_ART } from './approved-heroes.js';
import { packedPalette } from './palette.js';
import { bounds, cloneBuf, makeBuf } from '../engine/pixels.js';

const trail = APPROVED_HERO_ART.trailblazer;
const cloth = packedPalette();

// Relative to the near eye. The back folds inwards from the temple to the
// nape. Dots cut away the silver hair that used to fill that silhouette.
const hood = [
  [-3, '34'],
  [-5, '..432334'],
  [-6, '...43222334'],
  [-7, '...4322221134'],
  [-7, '..43222211334'],
  [-7, '..43221113334'],
  [-7, '..432214'],
  [-7, '..43234'],
  [-6, '.43234'],
  [-5, '.4334'],
  [-4, '.434'],
];

function eyePosition(frame) {
  // Sylva turns her head on the draw and lifts it on the passing footfall.
  // Her blue irises stay registered through both motions.
  for (let y = 32; y <= 35; y++) {
    for (let x = 37; x <= 39; x++) {
      const c = frame.d[y * frame.w + x];
      if ((c >>> 16 & 255) - (c & 255) > 48) return { x, y };
    }
  }
  throw new Error('Missing Trailblazer eye registration');
}

function fitHood(frame, drawing) {
  const { x, y } = eyePosition(frame);
  const out = cloneBuf(frame);
  for (const [row, [offset, stitches]] of hood.entries()) {
    const py = y - 8 + row;
    for (let k = 0; k < stitches.length; k++) {
      const px = x + offset + k, index = py * frame.w + px;
      const key = stitches[k];
      // The back fletch lies against the hair on the draw. Preserve its
      // warm feathers and shaft as the silver around them tucks inside.
      if (key === '.' && py >= y - 1) {
        const c = frame.d[index];
        if ((c & 255) > (c >>> 16 & 255) + 8) continue;
      }
      out.d[index] = key === '.' ? 0 : cloth[key];
    }
  }
  // The outer edge of the opening turns away as her gaze follows the arrow.
  const farTemple = drawing ? x + 3 : 42;
  out.d[(y - 2) * frame.w + farTemple] = cloth['3'];
  out.d[(y - 2) * frame.w + farTemple + 1] = cloth['4'];
  return out;
}

let world;
export const HOODED_TRAIL_ART = {
  ...trail,
  gen() {
    if (!world) {
      const draws = new Set([...trail.attack, ...trail.attackWalk.flat()]);
      world = trail.gen().map((frame, i) => fitHood(frame, draws.has(i)));
    }
    return world;
  },
};

let poses;
export const HOODED_TRAIL_POSE = {
  ...APPROVED_HERO_ART.trailblazer_pose,
  gen() {
    if (!poses) {
      const frames = HOODED_TRAIL_ART.gen();
      const idle = trail.idle.map(i => frames[i]);
      const boxes = idle.map(bounds);
      const left = Math.min(...boxes.map(b => b.x0)), top = Math.min(...boxes.map(b => b.y0));
      const w = Math.max(...boxes.map(b => b.x1)) - left + 1;
      const h = Math.max(...boxes.map(b => b.y1)) - top + 1;
      poses = idle.map(frame => {
        const pose = makeBuf(w, h);
        for (let y = 0; y < h; y++) {
          const start = (top + y) * frame.w + left;
          pose.d.set(frame.d.subarray(start, start + w), y * w);
        }
        return pose;
      });
    }
    return poses;
  },
};
