// Pure pixel-buffer helpers (no DOM), shared by the browser sprite builder and
// the Node preview tool. A buffer is { w, h, d: Uint32Array } holding packed
// little-endian RGBA, which matches ImageData's byte order.

export const pack = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
export const alphaOf = (c) => c >>> 24;
export const unpack = (c) => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24];

export function hexPack(hex, a = 255) {
  const v = parseInt(hex.slice(1), 16);
  return pack((v >> 16) & 255, (v >> 8) & 255, v & 255, a);
}

export const makeBuf = (w, h) => ({ w, h, d: new Uint32Array(w * h) });
export const cloneBuf = (b) => ({ w: b.w, h: b.h, d: b.d.slice() });

// rows: array of strings; pal: { char: packedColor }. '.' and ' ' are clear.
export function fromRows(rows, pal) {
  const h = rows.length;
  let w = 0;
  for (const r of rows) w = Math.max(w, r.length);
  const buf = makeBuf(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const c = pal[ch];
      buf.d[y * w + x] = c === undefined ? pack(255, 0, 255) : c;
    }
  }
  return buf;
}

// Grow by `pad` pixels on every side.
export function pad(buf, p = 1) {
  const out = makeBuf(buf.w + p * 2, buf.h + p * 2);
  for (let y = 0; y < buf.h; y++) {
    out.d.set(buf.d.subarray(y * buf.w, (y + 1) * buf.w), (y + p) * out.w + p);
  }
  return out;
}

// 1px outline around every opaque pixel (grows the buffer by 1px each side).
export function outline(buf, color, diagonal = false) {
  const out = pad(buf, 1);
  const { w, h } = out;
  const src = out.d.slice();
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 > 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (src[y * w + x] >>> 24) continue;
      let hit = solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1);
      if (!hit && diagonal) hit = solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1);
      if (hit) out.d[y * w + x] = color;
    }
  }
  return out;
}

export function flipX(buf) {
  const out = makeBuf(buf.w, buf.h);
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) out.d[y * buf.w + (buf.w - 1 - x)] = buf.d[y * buf.w + x];
  }
  return out;
}

export function silhouette(buf, color) {
  const out = makeBuf(buf.w, buf.h);
  for (let i = 0; i < buf.d.length; i++) if (buf.d[i] >>> 24) out.d[i] = color;
  return out;
}

// Blend every opaque pixel toward `color` by `t` (0..1).
export function tint(buf, color, t) {
  const [tr, tg, tb] = unpack(color);
  const out = makeBuf(buf.w, buf.h);
  for (let i = 0; i < buf.d.length; i++) {
    const c = buf.d[i];
    const a = c >>> 24;
    if (!a) continue;
    const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    out.d[i] = pack(r + (tr - r) * t, g + (tg - g) * t, b + (tb - b) * t, a);
  }
  return out;
}

// Keep only pixels whose color is in `colors` (a Set of packed colors).
export function keepColors(buf, colors) {
  const out = makeBuf(buf.w, buf.h);
  let any = false;
  for (let i = 0; i < buf.d.length; i++) {
    if (colors.has(buf.d[i])) {
      out.d[i] = buf.d[i];
      any = true;
    }
  }
  return any ? out : null;
}

// Nearest-neighbour rotation about the centre; output is a square that fits.
export function rotate(buf, angle) {
  const size = Math.ceil(Math.hypot(buf.w, buf.h)) | 1;
  const out = makeBuf(size, size);
  const cx = buf.w / 2, cy = buf.h / 2, oc = size / 2;
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - oc, dy = y + 0.5 - oc;
      const sx = Math.floor(dx * cos - dy * sin + cx);
      const sy = Math.floor(dx * sin + dy * cos + cy);
      if (sx >= 0 && sy >= 0 && sx < buf.w && sy < buf.h) out.d[y * size + x] = buf.d[sy * buf.w + sx];
    }
  }
  return out;
}

// EPX / Scale2x: doubles resolution while rounding off pixel staircases.
export function scale2x(buf) {
  const { w, h, d } = buf;
  const out = makeBuf(w * 2, h * 2);
  const at = (x, y) => d[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let p1 = P, p2 = P, p3 = P, p4 = P;
      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;
      const o = y * 2 * out.w + x * 2;
      out.d[o] = p1;
      out.d[o + 1] = p2;
      out.d[o + out.w] = p3;
      out.d[o + out.w + 1] = p4;
    }
  }
  return out;
}

// Integer nearest-neighbour upscale.
export function scaleN(buf, n) {
  const out = makeBuf(buf.w * n, buf.h * n);
  for (let y = 0; y < out.h; y++) {
    for (let x = 0; x < out.w; x++) out.d[y * out.w + x] = buf.d[Math.floor(y / n) * buf.w + Math.floor(x / n)];
  }
  return out;
}

// Copy src onto dst at (ox, oy), skipping transparent pixels.
export function blit(dst, src, ox, oy) {
  for (let y = 0; y < src.h; y++) {
    const ty = y + oy;
    if (ty < 0 || ty >= dst.h) continue;
    for (let x = 0; x < src.w; x++) {
      const tx = x + ox;
      if (tx < 0 || tx >= dst.w) continue;
      const c = src.d[y * src.w + x];
      if (c >>> 24) dst.d[ty * dst.w + tx] = c;
    }
  }
}

// Opaque pixels as a flat [x, y, color, ...] list (used for death bursts).
export function opaqueList(buf, step = 1) {
  const out = [];
  for (let y = 0; y < buf.h; y += step) {
    for (let x = 0; x < buf.w; x += step) {
      const c = buf.d[y * buf.w + x];
      if (c >>> 24) out.push(x, y, c);
    }
  }
  return out;
}

// Average opaque colour, handy for tinting debris.
export function bounds(buf) {
  let x0 = buf.w, y0 = buf.h, x1 = -1, y1 = -1;
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      if (buf.d[y * buf.w + x] >>> 24) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
