// Minimal PNG encoder and decoder for the art tools.
import zlib from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// buf: { w, h, d: Uint32Array } packed RGBA (little-endian)
export function writePng(file, buf, bg = null) {
  const { w, h } = buf;
  const bytes = Buffer.from(buf.d.buffer, buf.d.byteOffset, buf.d.byteLength);
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4, di = y * (w * 4 + 1) + 1 + x * 4;
      let r = bytes[si], g = bytes[si + 1], b = bytes[si + 2], a = bytes[si + 3];
      if (bg && a < 255) {
        const t = a / 255;
        r = Math.round(r * t + bg[0] * (1 - t));
        g = Math.round(g * t + bg[1] * (1 - t));
        b = Math.round(b * t + bg[2] * (1 - t));
        a = 255;
      }
      raw[di] = r; raw[di + 1] = g; raw[di + 2] = b; raw[di + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(file, png);
}

// Minimal PNG decoder: 8-bit RGB or RGBA, not interlaced. Returns the same
// { w, h, d } packed buffer the encoder takes.
export function readPng(file) {
  const b = readFileSync(file);
  let p = 8, w = 0, h = 0, type = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), name = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (name === 'IHDR') {
      w = d.readUInt32BE(0);
      h = d.readUInt32BE(4);
      type = d[9];
      if (d[8] !== 8 || (type !== 2 && type !== 6) || d[12]) throw new Error(`${file}: only 8-bit RGB/RGBA, non-interlaced PNGs are supported`);
    }
    if (name === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  const out = { w, h, d: new Uint32Array(w * h) };
  for (let y = 0; y < h; y++) {
    const row = y * (stride + 1), filter = raw[row];
    for (let x = 0; x < stride; x++) {
      const v = raw[row + 1 + x], a = x >= bpp ? cur[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let r = v;
      if (filter === 1) r = v + a;
      else if (filter === 2) r = v + up;
      else if (filter === 3) r = v + ((a + up) >> 1);
      else if (filter === 4) {
        const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c);
        r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c);
      }
      cur[x] = r & 255;
    }
    for (let x = 0; x < w; x++) {
      const i = x * bpp;
      out.d[y * w + x] = ((bpp === 4 ? cur[i + 3] : 255) << 24 | cur[i + 2] << 16 | cur[i + 1] << 8 | cur[i]) >>> 0;
    }
    prev.set(cur);
  }
  return out;
}
