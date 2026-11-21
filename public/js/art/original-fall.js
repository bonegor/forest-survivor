// The original fall sheets finish their physical poses before the 1.10s soul cue.
import { appendDecay as decay, departingSoul as rising, sinkingSoul as sinking, fallFrameAt as frameAt } from './hero-fall.js';
export { blank, cut, easeBetween, mix, paint, segment, turn } from './hero-fall.js';

export const SOUL_RELEASE = 1.10;
export const departingSoul = { ...rising, release: SOUL_RELEASE };
export const sinkingSoul = { ...sinking, release: SOUL_RELEASE };
export const fallFrameAt = (poses, seconds) => frameAt(poses, seconds, SOUL_RELEASE);
// These cues were painted against absolute time; preserve their native pixel rounding.
const originalDecay = { start: SOUL_RELEASE, head: 1.77, boots: 1.38, body: 1.49, headFade: 1.39, fade: 1.22 };
export const appendDecay = (frames, remains, groundY) => decay(frames, remains, groundY, originalDecay);
