import sheets from '../../assets/heroes-approved/index.js';
import { moveFor } from '../data/difficulty.js';
import { HEROES } from '../data/heroes.js';
import { clamp } from '../engine/util.js';

// Packing trims transparent margins only; world frames are reconstructed on the original pivot.
function unpack(data, [x, y, w, h, encoded], box) {
  const pixels = new Uint32Array(box.w * box.h);
  const raw = atob(encoded), n = data.indexBytes;
  for (let iy = 0; iy < h; iy++) {
    for (let ix = 0; ix < w; ix++) {
      const index = (iy * w + ix) * n;
      const color = raw.charCodeAt(index) | (n === 2 ? raw.charCodeAt(index + 1) << 8 : 0);
      pixels[(iy + y - box.y) * box.w + ix + x - box.x] = data.palette[color];
    }
  }
  return { w: box.w, h: box.h, d: pixels };
}

export const APPROVED_HERO_ART = {};

// The existing signatures keep their manual strike latency. Their new frames
// count back from the original impact time at the approved clip's cadence.
const manualDelay = {
  knight: 2 / 10, archer: 2 / 14, mage: 2 / 12, rogue: 0, necromancer: 2 / 12,
  paladin: 2 / 13, druid: 2 / 12, berserker: 2 / 12, witchhunter: 2 / 12,
};

for (const [id, data] of Object.entries(sheets)) {
  const { w, h, anchorY, idle, walk, attack, attackRelease, attackFps, walkFps, idleFps, floating } = data;
  const normalSpeed = clamp(moveFor('s15', 'easy') * (HEROES[id]?.stats.speed || 1), 0.6, 1.6);
  let worldFrames, portraitFrames;
  APPROVED_HERO_ART[id] = {
    gen: () => (worldFrames ??= data.frames.map(frame => unpack(data, frame, { x: 0, y: 0, w, h }))),
    anchorY, idle, walk, attack, attackRelease, attackFps, floating, manualDelay: manualDelay[id],
    motionRate: walkFps / (7 * 1.4 * normalSpeed),
    idleRate: idleFps / 1.6,
    selfBob: true, outline: false,
  };
  const standing = idle.map(i => data.frames[i]);
  const x = Math.min(...standing.map(f => f[0])), y = Math.min(...standing.map(f => f[1]));
  const right = Math.max(...standing.map(f => f[0] + f[2])), bottom = Math.max(...standing.map(f => f[1] + f[3]));
  const box = { x, y, w: right - x, h: bottom - y };
  APPROVED_HERO_ART[id + '_pose'] = {
    gen: () => (portraitFrames ??= standing.map(frame => unpack(data, frame, box))),
    outline: false, fps: idleFps,
  };
}
