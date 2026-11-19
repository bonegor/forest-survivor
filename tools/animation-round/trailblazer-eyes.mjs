import { hexPack } from '../../public/js/engine/pixels.js';

const blues = [[80, '#244a80'], [110, '#3267a1'], [145, '#3c80bd'], [190, '#65a9dc'], [256, '#a9d4e9']]
  .map(([threshold, color]) => [threshold, hexPack(color)]);
// Coordinates in the retained Hunter sheet, before the animator moves the head.
// The face turns towards the bow in the middle of the eight draw poses.
const drawEyes = [[38,40], [38,40], [37,40], [37,39], [37,39], [38,40], [38,40], [38,40]];
const restingEyes = [38,41];
const restingRow = 34;

export function trailWalkPalette(palette, standing) {
  // The grounded rig maps the finished figure back to its source palette.
  return [...palette, ...restingEyes.map(x => standing.d[restingRow * standing.w + x])];
}

export function colorTrailEyes(frame, drawPose) {
  const row = drawPose < 0 ? restingRow : 33;
  for (const x of drawEyes[drawPose] ?? restingEyes) {
    const index = row * frame.w + x;
    const original = frame.d[index];
    const light = original >>> 8 & 255;
    const [, blue] = blues.find(([threshold]) => light < threshold);
    frame.d[index] = ((original & 0xff000000) | (blue & 0xffffff)) >>> 0;
  }
}

export function registerTrailIdleEyes(frame, standing) {
  // At the one-pixel breathing transition, nearest-neighbour sampling can
  // stretch one iris over two rows and skip the other. Move lid, iris and
  // cheek together, registering both to the front eye that stays in view.
  const { w, d } = frame;
  const front = restingEyes[1];
  const lifted = d[(restingRow - 1) * w + front] === standing.d[restingRow * w + front];
  const shift = lifted ? -1 : 0;
  for (const x of restingEyes) {
    for (let y = restingRow - 1; y <= restingRow + 1; y++) {
      d[(y + shift) * w + x] = standing.d[y * w + x];
    }
  }
}
