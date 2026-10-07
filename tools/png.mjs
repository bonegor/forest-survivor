// Minimal PNG encoder for the art preview tool.
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';

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
