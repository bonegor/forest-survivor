import { readPng } from '../png.mjs';
import { buildTextureWalk, GROUNDED_MODELS } from './grounded-walk.mjs';
import { groundedV2Config } from './grounded-walk-v2.mjs';

// Attach the thighs under the belt and reuse Lyra's original trouser and boot
// textures. Both feet stay close to their own hip tracks on the passing poses.
const rig = groundedV2Config(GROUNDED_MODELS.archer);
const source = new URL('./baseline/grounded-models/' + rig.source, import.meta.url);
const reach = 6.25;
// With sixteen sampled poses, frames 0–7 plant one foot and 8–15 the other.
// The shorter support sweep covers the same world distance per second.
const support = 0.44;
const motion = {
  ...rig.motion,
  reach,
  support,
  lift: 1.35,
  roll: 0.045,
  bodyBobPixels: undefined, // carry the shoulders a pixel with the loaded hip
  hipCompression: 0,
  cycleSeconds: 2 * reach / (support * rig.motion.groundSpeed),
};
const ranger = {
  ...rig,
  motion,
  legs: rig.legs.map(leg => ({ ...leg, trackOffset: Math.sign(leg.trackOffset) * 0.35 })),
};
let texture;

export function buildRangerWalk(palette, standing, { density = 1 } = {}) {
  texture ??= readPng(source);
  return buildTextureWalk(ranger, texture, palette, standing, null, { density });
}
