import { OUTLINE, packedPalette } from '../../public/js/art/palette.js';
import { hexPack } from '../../public/js/engine/pixels.js';

// Distinct from the engine's synthetic outline so a painted edge stays dark.
const INK = hexPack('#110e1b');
const DEEP_SHADE = hexPack('#20182c');
const palette = packedPalette();

// Specular steps are shared across the bosses. Each material keeps its hue
// and its original broad plane, with the bright tone reserved for the edge.
const bevels = new Map(Object.entries({
  K: '#4c5279', n: '#616f9d', N: '#92a4c6', g: '#c4d3eb', G: '#e9f0ff',
  m: '#69505d', a: '#866975', A: '#af9195', h: '#5c4255',
  b: '#aa6355', B: '#e69c72', S: '#eda887', s: '#ffe2bd', t: '#ffce9e',
  R: '#dd3f58', r: '#ff7885', O: '#ef7050', o: '#ffb54b', y: '#ffe477', Y: '#fff4a8',
  q: '#573765', p: '#9b5f9b', P: '#e583cb', j: '#c58ce7', i: '#ffacb4',
  E: '#439676', e: '#75c96b', L: '#b4e984', v: '#386e65',
  u: '#2384bf', U: '#51d9f8', c: '#a0f8ff', M: '#9ae4d9', X: '#e6fff9',
  H: '#aa8e5f', D: '#d4ba80', C: '#f2dda4', T: '#f9e8ce', Z: '#dbe8e6', z: '#fffcec',
}).map(([key, color]) => [palette[key], hexPack(color)]));

function separatesLitPlane(light, dark) {
  if (!dark || light === dark) return false;
  const r = (light & 255) - (dark & 255);
  const g = (light >>> 8 & 255) - (dark >>> 8 & 255);
  const b = (light >>> 16 & 255) - (dark >>> 16 & 255);
  const value = 2 * r + 5 * g + b;
  return value >= 185 || (value >= 85 && Math.abs(r) + Math.abs(g) + Math.abs(b) >= 118);
}

export function paintWorldGrid(frame) {
  const { w, h, d } = frame;
  const width = w / 2;
  const height = h / 2;
  const coverage = new Uint8Array(width * height);
  const colors = new Uint32Array(coverage.length);
  const output = new Uint32Array(d.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const origin = 2 * y * w + 2 * x;
      const pixels = [d[origin], d[origin + 1], d[origin + w], d[origin + w + 1]];
      let bestVotes = 0;
      for (const color of pixels) {
        if (!(color >>> 24)) continue;
        coverage[i]++;
        const votes = pixels.filter(pixel => pixel === color).length;
        if (votes <= bestVotes) continue;
        bestVotes = votes;
        colors[i] = color === OUTLINE ? DEEP_SHADE : color;
      }
    }
  }

  const at = (map, x, y) => x < 0 || x >= width || y < 0 || y >= height ? 0 : map[y * width + x];
  const around = (map, x, y) => [at(map, x - 1, y), at(map, x + 1, y), at(map, x, y - 1), at(map, x, y + 1)];
  const inside = coverage.map((count, i) => count >= 2 && around(coverage, i % width, Math.floor(i / width)).every(n => n >= 2));
  const edge = coverage.map((count, i) => {
    if (!count || inside[i]) return 0;
    const x = i % width;
    const y = Math.floor(i / width);
    if (around(inside, x, y).some(Boolean)) return 1;
    // Fill supported diagonal steps, leaving an isolated shaft or spike in
    // its painted color when it never borders the substantial silhouette.
    const support = around(coverage, x, y).filter(n => n >= 2).length;
    return count >= 2 && support >= 2 && (at(inside, x - 1, y - 1) || at(inside, x + 1, y - 1) ||
      at(inside, x - 1, y + 1) || at(inside, x + 1, y + 1));
  });

  function stepColor(x, y, i) {
    if (edge[i]) return INK;
    const color = colors[i];
    const bevel = bevels.get(color);
    if (!bevel || !inside[i]) return color;
    const top = at(edge, x, y - 1);
    const left = at(edge, x - 1, y);
    // A bright stroke is one cell inside the dark outline. Two connected
    // edge cells give it a readable step and avoid scattered highlights.
    const topStep = top && (at(edge, x - 1, y - 1) || at(edge, x + 1, y - 1));
    const leftStep = left && (at(edge, x - 1, y - 1) || at(edge, x - 1, y + 1));
    if (topStep || leftStep) return bevel;

    // Internal bevels follow a sustained top/left color break. The current
    // plane must also extend inwards so thin face details keep their paint.
    const north = at(colors, x, y - 1);
    const west = at(colors, x - 1, y);
    const topCut = color === at(colors, x, y + 1) && separatesLitPlane(color, north) &&
      ((color === at(colors, x - 1, y) && separatesLitPlane(color, at(colors, x - 1, y - 1))) ||
       (color === at(colors, x + 1, y) && separatesLitPlane(color, at(colors, x + 1, y - 1))));
    const leftCut = color === at(colors, x + 1, y) && separatesLitPlane(color, west) &&
      ((color === at(colors, x, y - 1) && separatesLitPlane(color, at(colors, x - 1, y - 1))) ||
       (color === at(colors, x, y + 1) && separatesLitPlane(color, at(colors, x - 1, y + 1))));
    return topCut || leftCut ? bevel : color;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!coverage[i]) continue;
      // The exact alpha under the paint still supplies the combat mask.
      const rgb = stepColor(x, y, i) & 0xffffff;
      const origin = 2 * y * w + 2 * x;
      for (const position of [origin, origin + 1, origin + w, origin + w + 1]) {
        const alpha = d[position] & 0xff000000;
        if (alpha) output[position] = alpha | rgb;
      }
    }
  }
  return { ...frame, d: output };
}
