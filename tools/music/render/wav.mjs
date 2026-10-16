// tools/music/render/wav.mjs — WAV reading (16/24/32-bit PCM, 32/64-bit float, plain or extensible) and
// 32-bit float writing.

export function readWav(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tag = (o) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV file');
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = tag(p), len = dv.getUint32(p + 4, true);
    if (id === 'fmt ') {
      let code = dv.getUint16(p + 8, true);
      if (code === 0xfffe) code = dv.getUint16(p + 8 + 24, true); // WAVE_FORMAT_EXTENSIBLE: the sub-format's first two bytes
      fmt = { code, ch: dv.getUint16(p + 10, true), sr: dv.getUint32(p + 12, true), bits: dv.getUint16(p + 22, true) };
    } else if (id === 'data') {
      // A file written while streaming may say 0 or too much; take what is there.
      data = { off: p + 8, len: Math.min(len || buf.length, buf.length - p - 8) };
      break;
    }
    p += 8 + len + (len & 1);
  }
  if (!fmt || !data) throw new Error('WAV without fmt or data');
  const { code, ch, sr, bits } = fmt, bps = bits / 8, frames = Math.floor(data.len / (bps * ch));
  const out = Array.from({ length: ch }, () => new Float32Array(frames));
  let o = data.off;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < ch; c++, o += bps) {
      let v;
      if (code === 3) v = bits === 64 ? dv.getFloat64(o, true) : dv.getFloat32(o, true);
      else if (bits === 16) v = dv.getInt16(o, true) / 32768;
      else if (bits === 24) v = (((buf[o + 2] << 24) | (buf[o + 1] << 16) | (buf[o] << 8)) >> 8) / 8388608;
      else if (bits === 32) v = dv.getInt32(o, true) / 2147483648;
      else if (bits === 8) v = (buf[o] - 128) / 128;
      else throw new Error('unsupported WAV: ' + bits + ' bits');
      out[c][i] = v;
    }
  }
  return { sr, channels: out };
}

export function wavF32(channels, sr) {
  const ch = channels.length, n = channels[0].length;
  const buf = Buffer.alloc(44 + n * ch * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * ch * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * ch * 4, 28); buf.writeUInt16LE(ch * 4, 32); buf.writeUInt16LE(32, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * ch * 4, 40);
  const f = new Float32Array(buf.buffer, buf.byteOffset + 44, n * ch);
  for (let i = 0, k = 0; i < n; i++) for (let c = 0; c < ch; c++) f[k++] = channels[c][i];
  return buf;
}
