import { packedPalette } from './palette.js';
import { bounds, makeBuf } from '../engine/pixels.js';

export const SOUL_RELEASE = 1.10;
const DECAY_STEP = .05;
const DECAY_FRAMES = 27;

export function fallFrameAt(poses, seconds) {
  if (seconds >= SOUL_RELEASE) {
    const step = Math.floor((seconds - SOUL_RELEASE) / DECAY_STEP + 1e-9);
    return poses.length + Math.min(DECAY_FRAMES - 1, step);
  }
  const next = poses.findIndex(pose => pose[0] > seconds);
  return next < 0 ? poses.length - 1 : Math.max(0, next - 1);
}

const clamp01 = value => Math.max(0, Math.min(1, value));
export const mix = (a, b, t) => a + (b - a) * t;
export function easeBetween(t, start, end) {
  const u = clamp01((t - start) / (end - start));
  return u * u * (3 - 2 * u);
}
export { makeBuf as blank };

const radians = degrees => degrees * Math.PI / 180;
export function turn([x, y], angle, [cx, cy]) {
  const a = radians(angle);
  return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
}

// Cut on the original artist's seams. Pixel ranges are inclusive on each row.
export function cut(source, y0, spans) {
  const x0 = Math.min(...spans.map(row => row[0]));
  const w = Math.max(...spans.map(row => row[1])) - x0 + 1;
  const d = new Uint32Array(w * spans.length);
  spans.forEach(([left, right], row) => {
    for (let x = left; x <= right; x++) d[row * w + x - x0] = source.d[(y0 + row) * source.w + x];
  });
  return { w, h: spans.length, d };
}

// Inverse sampling gives one crisp native pixel per texel with no gaps at a
// tilted edge. Only the small rectangle around each individual piece is drawn.
export function paint(out, part, pivot, position, angle = 0, scaleY = 1, scaleX = 1) {
  const a = radians(angle), cs = Math.cos(a), sn = Math.sin(a);
  const reach = Math.ceil(Math.hypot(part.w, part.h * scaleY)) + 1;
  const [px, py] = position;
  for (let y = Math.max(0, Math.floor(py - reach)); y <= Math.min(out.h - 1, py + reach); y++) {
    for (let x = Math.max(0, Math.floor(px - reach)); x <= Math.min(out.w - 1, px + reach); x++) {
      const dx = x - px, dy = y - py;
      const sx = Math.round(pivot[0] + (cs * dx + sn * dy) / scaleX);
      const sy = Math.round(pivot[1] + (cs * dy - sn * dx) / scaleY);
      if (sx < 0 || sx >= part.w || sy < 0 || sy >= part.h) continue;
      const color = part.d[sy * part.w + sx];
      if (color >>> 24) out.d[y * out.w + x] = color;
    }
  }
}

export function segment(out, part, from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const angle = Math.atan2(-dx, dy) * 180 / Math.PI;
  const scale = Math.max(1, Math.hypot(dx, dy)) / (part.h - 2);
  paint(out, part, [(part.w - 1) / 2, 1], from, angle, scale);
}

const pal = packedPalette();
const ash = [pal.h, pal.a, pal.A, pal.Z];
const brightness = color => ((color & 255) * 3 + (color >>> 8 & 255) * 6 + (color >>> 16 & 255)) / 10;
function shade(a, b, t) {
  const channel = shift => Math.round(mix(a >>> shift & 255, b >>> shift & 255, t));
  return ((a & 0xff000000) | channel(16) << 16 | channel(8) << 8 | channel(0)) >>> 0;
}

// Break up the fallen silhouette in small patches. Boots fade first and the head last.
function sinkBody(out, body, t, depth, groundY) {
  for (let y = 0; y < body.h; y++) {
    for (let x = 0; x < body.w; x++) {
      const color = body.d[y * body.w + x];
      if (!(color >>> 24)) continue;
      const head = x >= 47 && y <= 54;
      const cellX = Math.floor((x + Math.floor(y / 3) % 2) / 3);
      const cellY = Math.floor(y / 3);
      const seed = (cellX * 11 + cellY * 7) % 13;
      const start = (head ? 1.77 : x < 38 ? 1.38 : 1.49) + seed * .014;
      const split = easeBetween(t, start, start + .18);
      const drop = easeBetween(t, start + .08, start + .46);
      const yy = y + Math.round(depth * drop);
      if (yy > groundY) continue;
      const xx = x + Math.round(((seed % 5) - 2) * split);
      if (xx < 0 || xx >= out.w) continue;
      const light = brightness(color);
      const soil = ash[light > 176 ? 3 : light > 100 ? 2 : light > 44 ? 1 : 0];
      const tarnish = easeBetween(t, head ? 1.39 : 1.22, start + .20);
      out.d[yy * out.w + xx] = tarnish ? shade(color, soil, tarnish) : color;
    }
  }
}

const wispFps = 20, bloomFrames = 8, curlFrames = 32;
const sinkingTipY = 14;
const pearl = shade(pal.M, pal.X, .58);

// The leading tip has its own pivot. After unfurling, the ribbon continues
// to billow as it travels; the distance it flies is independent of this art.
function wispPose(index, sinks = false) {
  const tip = sinks ? sinkingTipY : 1;
  const out = makeBuf(20, sinks ? 16 : 26);
  const bloom = easeBetween(index, 0, bloomFrames);
  const phase = (index - bloomFrames) * 2 * Math.PI / curlFrames;
  const depth = Math.round(3 + ((sinks ? 8 : 17) + 1.5 * Math.sin(phase)) * bloom);
  for (let i = 0; i <= depth; i++) {
    const y = sinks ? tip - i : tip + i;
    const along = i / depth;
    const curl = 2.5 * (Math.sin(phase + 5.5 * along) - Math.sin(phase));
    const center = 9.5 + curl * bloom;
    const fullness = Math.pow(Math.sin(Math.PI * along), .8);
    const radius = .5 + fullness * (.6 + (2.05 + .2 * Math.cos(phase)) * bloom);
    for (let x = Math.ceil(center - radius); x <= Math.floor(center + radius); x++) {
      const side = (x - center) / radius;
      const color = side < -.35 ? pal.X : side > .48 ? pal.M : pearl;
      const strength = (side > .48 ? .46 : .90) * (.42 + .58 * fullness);
      const alpha = Math.round(255 * strength * (.38 + .62 * bloom));
      out.d[y * out.w + x] = ((alpha << 24) | (color & 0xffffff)) >>> 0;
    }
  }
  return out;
}

let wispFrames;
export const departingSoul = {
  release: SOUL_RELEASE, duration: 1.5, offsetX: 5, offsetY: -8, anchorY: 1, outline: false,
  gen: () => (wispFrames ??= Array.from({ length: bloomFrames + curlFrames }, (_, i) => wispPose(i))),
  frameAt(age) {
    const frame = Math.max(0, Math.floor(age * wispFps + 1e-9));
    return frame < bloomFrames ? frame : bloomFrames + (frame - bloomFrames) % curlFrames;
  },
};

let sinkingFrames;
export const sinkingSoul = {
  ...departingSoul, duration: 1.15, anchorY: sinkingTipY, sinks: true,
  gen: () => (sinkingFrames ??= Array.from({ length: bloomFrames + curlFrames }, (_, i) => wispPose(i, true))),
};

// The weapon layer is already in its resting place when the body starts to decay.
export function appendDecay(frames, remains, groundY = 57) {
  const landed = frames.at(-1);
  const body = { ...landed, d: landed.d.map((color, i) => remains.d[i] ? 0 : color) };
  const depth = Math.max(16, groundY + 1 - bounds(body).y0);
  for (let i = 0; i < DECAY_FRAMES; i++) {
    const out = makeBuf(body.w, body.h);
    sinkBody(out, body, SOUL_RELEASE + DECAY_STEP * i, depth, groundY);
    for (let j = 0; j < out.d.length; j++) if (remains.d[j]) out.d[j] = remains.d[j];
    frames.push(out);
  }
}
