import { packedPalette } from '../../public/js/art/palette.js';

const palette = packedPalette();

function contains(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

// Every painted plane follows its source texture island through the rig.
export function paintSource({ w, d, box: [left, top, right, bottom] }, base) {
  const underpaint = palette[base] & 0xffffff;
  const pixels = d.map(pixel => pixel >>> 24 ? (pixel & 0xff000000) | underpaint : pixel);

  function fill(key, points) {
    const color = palette[key] & 0xffffff;
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const i = y * w + x;
        if (d[i] >>> 24 && contains(points, x + .5, y + .5)) {
          pixels[i] = (d[i] & 0xff000000) | color;
        }
      }
    }
  }

  function block(key, x, y, width, height) {
    fill(key, [[x, y], [x + width, y], [x + width, y + height], [x, y + height]]);
  }

  return { pixels, fill, block };
}
