import { bounds, makeBuf } from '../engine/pixels.js';

// Crop an animated menu portrait to one shared box so breathing never moves its pivot.
export function idlePose(sprite) {
  let poses;
  return {
    fps: sprite.idleRate * 1.6, hires: sprite.hires || 1, outline: false,
    gen() {
      if (poses) return poses;
      const frames = sprite.gen();
      const idle = sprite.idle.map(i => frames[i]);
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
      return poses;
    },
  };
}
