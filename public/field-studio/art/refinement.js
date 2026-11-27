// The original animated drawings supply the anatomy, silhouette and lighting.
// Each small painted panel follows the patch of material sampled from the idle pose.
const compiled = new WeakMap();
const livingOffsets = [];
for (let y = -8; y <= 8; y++) for (let x = -9; x <= 9; x++) {
  livingOffsets.push([x, y, Math.abs(x) + Math.abs(y)]);
}
livingOffsets.sort((a, b) => a[2] - b[2]);

function rgb(value) {
  const n = Number.parseInt(value.replace(/^#/, ''), 16);
  return ((n & 255) << 16) | (n & 0xff00) | (n >>> 16);
}

function difference(a, b) {
  const alpha = Math.abs((a >>> 24) - (b >>> 24));
  if ((a >>> 24) < 32 || (b >>> 24) < 32) return alpha;
  return alpha + (Math.abs((a & 255) - (b & 255)) + 2 * Math.abs((a >>> 8 & 255) - (b >>> 8 & 255)) +
    Math.abs((a >>> 16 & 255) - (b >>> 16 & 255))) / 4;
}

function sample(frame, x, y) {
  return x < 0 || x >= frame.w || y < 0 || y >= frame.h ? 0 : frame.d[y * frame.w + x];
}

function compile(spec, idle) {
  let frames = compiled.get(spec);
  if (!frames) compiled.set(spec, frames = new WeakMap());
  if (frames.has(idle.d)) return frames.get(idle.d);
  const palette = Object.fromEntries(Object.entries(spec.palette).map(([key, value]) => [key, rgb(value)]));
  const dyes = new Map(Object.entries(spec.dyes || {}).map(([from, to]) => [rgb(from), rgb(to)]));
  const materials = (spec.materialDyes || []).map(({ from, to, tolerance }) => {
    const a = rgb(from), b = rgb(to);
    return { r: a & 255, g: a >>> 8 & 255, b: a >>> 16,
      dr: (b & 255) - (a & 255), dg: (b >>> 8 & 255) - (a >>> 8 & 255), db: (b >>> 16) - (a >>> 16),
      radiusSquared: tolerance * tolerance };
  });
  const patches = spec.patches.map(({ x, y, rows, mix = 1 }) => {
    const dots = [];
    rows.forEach((row, dy) => [...row].forEach((key, dx) => {
      if (!Object.hasOwn(palette, key)) return;
      const original = sample(idle, x + dx, y + dy);
      if ((original >>> 24) >= 96) dots.push({ x: x + dx, y: y + dy, colour: palette[key], original });
    }));
    const probes = [], w = Math.max(...rows.map(row => row.length)), h = rows.length;
    // A few samples of the original surface and its boundary distinguish a cuff
    // from a crossing blade. Compile them once per hero and original idle buffer.
    for (let dy = -1; dy <= h; dy += Math.max(1, Math.ceil((h + 2) / 5))) {
      for (let dx = -1; dx <= w; dx += Math.max(1, Math.ceil((w + 2) / 5))) {
        probes.push([x + dx, y + dy, sample(idle, x + dx, y + dy)]);
      }
    }
    return { dots, probes, mix };
  });
  const result = { dyes, materials, patches };
  frames.set(idle.d, result);
  return result;
}

function locate(frame, patch) {
  let best = 34, match = null;
  const n = patch.probes.length;
  for (const offset of livingOffsets) {
    const [dx, dy, distance] = offset;
    let score = distance * 0.38;
    for (const [x, y, original] of patch.probes) {
      score += difference(original, sample(frame, x + dx, y + dy)) / n;
      if (score >= best) break;
    }
    if (score < best) {
      best = score;
      match = offset;
      if (score === 0) break;
    }
  }
  return match;
}

function tint(base, dye, mix) {
  const blend = shift => Math.round((base >>> shift & 255) * (1 - mix) + (dye >>> shift & 255) * mix);
  return (base & 0xff000000) | blend(16) << 16 | blend(8) << 8 | blend(0);
}

// Sheet-painted cloth and metal use many neighbouring shades, especially during
// a strike or fall. Move nearby colours together without flattening their shading.
function materialColour(colour, materials) {
  const r = colour & 255, g = colour >>> 8 & 255, b = colour >>> 16;
  let best = 1, match;
  for (const material of materials) {
    const dr = r - material.r, dg = g - material.g, db = b - material.b;
    const distance = (dr * dr + dg * dg + db * db) / material.radiusSquared;
    if (distance < best) { best = distance; match = material; }
  }
  if (!match) return colour;
  const weight = 1 - Math.sqrt(best);
  const channel = (value, delta) => Math.min(255, Math.max(0, Math.round(value + delta * weight)));
  return channel(r, match.dr) | channel(g, match.dg) << 8 | channel(b, match.db) << 16;
}

export function refineFrame(spec, frame, idle) {
  const { dyes, materials, patches } = compile(spec, idle);
  const d = frame.d.slice();
  if (materials.length || dyes.size) for (let i = 0; i < d.length; i++) {
    const base = d[i];
    if (!(base >>> 24)) continue;
    const colour = base & 0xffffff;
    let dye = dyes.get(colour);
    if (dye === undefined && materials.length) {
      dye = materialColour(colour, materials);
      dyes.set(colour, dye);
    }
    if (dye !== undefined) d[i] = (base & 0xff000000) | dye;
  }
  for (const patch of patches) {
    const offset = frame.d === idle.d ? [0, 0] : locate(frame, patch);
    if (!offset) continue;
    for (const { x, y, colour, original } of patch.dots) {
      const fx = x + offset[0], fy = y + offset[1], base = sample(frame, fx, fy);
      if ((base >>> 24) < 96 || difference(base, original) > 53) continue;
      d[fy * frame.w + fx] = tint(base, colour, patch.mix);
    }
  }
  return { ...frame, d };
}

// Fallen poses keep exactly the original coverage, including the weapons left on the ground.
export const refineFallFrame = refineFrame;
