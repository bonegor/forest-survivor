// Sprites baked by tools/bake-art.mjs from the Creative Commons library (public/assets/art):
// their frames packed as palette indices, read back here as pixel buffers.

// One baked sprite's frames as { w, h, d } buffers (packed RGBA, as the engine's).
export function bakedBuffers(data) {
  // Run-length coded (rle: 1, tools/vfx/bake.mjs, 28 October 2026: the weapons' effects, mostly
  // clear): a byte under 128 is one pixel of that colour; one of 128 or more, a run of (byte - 126)
  // pixels of the colour in the next byte.
  if (data.rle) {
    return data.frames.map((encoded) => {
      const bytes = atob(encoded), d = new Uint32Array(data.w * data.h);
      for (let k = 0, i = 0; k < bytes.length; k++) {
        const b = bytes.charCodeAt(k);
        if (b < 128) d[i++] = data.palette[b];
        else {
          d.fill(data.palette[bytes.charCodeAt(++k)], i, i + b - 126);
          i += b - 126;
        }
      }
      return { w: data.w, h: data.h, d };
    });
  }
  // Palette indices are one byte per pixel, or two (little-endian) past 256 colours.
  const n = data.indexBytes || 1;
  return data.frames.map((encoded) => {
    const bytes = atob(encoded), d = new Uint32Array(data.w * data.h);
    for (let i = 0; i < d.length; i++) d[i] = data.palette[n === 2 ? bytes.charCodeAt(2 * i) | (bytes.charCodeAt(2 * i + 1) << 8) : bytes.charCodeAt(i)];
    return { w: data.w, h: data.h, d };
  });
}

// A sprite definition (art/defs.js) for one: its frames made when SPR is built, with no outline
// of the engine's (the packs draw their own) unless more says so. The baked meta (anchorY, idle,
// fps ...) and then more are laid over it.
export function bakedDef(data, more = {}) {
  let frames;
  const { w, h, palette, frames: _f, indexBytes, ...meta } = data;
  return { gen: () => (frames ??= bakedBuffers(data)), outline: false, ...meta, ...more };
}
