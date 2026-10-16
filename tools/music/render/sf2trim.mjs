// A copy of an SF2 SoundFont whose samples start at their attack: some recorded fonts (FreePats'
// Spanish classical guitar) keep 0-35 ms of near-silence before each pluck, different for every
// sample, which plays as loose timing. Only the sample headers change (each sample's start moves
// to just before the first point reaching `threshold` of its early peak, back to a zero
// crossing), so the copy is the same sounds with the dead air skipped. 16-bit SF2 only (not SF3).

import fs from 'node:fs';

export function trimSf2(src, dst, { threshold = 0.03, keepMs = 1.5, scanMs = 300 } = {}) {
  const buf = Buffer.from(fs.readFileSync(src));
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'sfbk') throw new Error(`${src}: not a SoundFont`);
  let p = 12, smpl = null, shdr = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('latin1', p, p + 4), len = buf.readUInt32LE(p + 4);
    if (id === 'LIST') {
      for (let q = p + 12; q < p + 8 + len;) {
        const sid = buf.toString('latin1', q, q + 4), sl = buf.readUInt32LE(q + 4);
        if (sid === 'smpl') smpl = { off: q + 8, len: sl };
        if (sid === 'shdr') shdr = { off: q + 8, len: sl };
        q += 8 + sl + (sl & 1);
      }
    }
    p += 8 + len + (len & 1);
  }
  if (!smpl || !shdr) throw new Error(`${src}: no smpl or shdr chunk`);
  const x = (i) => buf.readInt16LE(smpl.off + 2 * i);
  const moved = [];
  for (let o = shdr.off; o + 46 <= shdr.off + shdr.len - 46; o += 46) { // the last record is EOS
    const name = buf.toString('latin1', o, o + 20).replace(/\0.*$/s, '');
    const start = buf.readUInt32LE(o + 20), end = buf.readUInt32LE(o + 24), loop = buf.readUInt32LE(o + 28), sr = buf.readUInt32LE(o + 36);
    const type = buf.readUInt16LE(o + 44);
    if (type & 0x8000 || type & 0x0002 || type & 0x0004 || type & 0x0008 || 2 * end > smpl.len) continue; // ROM or linked stereo: leave alone
    const lim = Math.min(end, start + Math.round((scanMs / 1000) * sr));
    let pk = 0;
    for (let i = start; i < lim; i++) pk = Math.max(pk, Math.abs(x(i)));
    if (!pk) continue;
    let first = start;
    while (first < lim && Math.abs(x(first)) < threshold * pk) first++;
    let s = Math.max(start, first - Math.round((keepMs / 1000) * sr));
    for (let k = 0, back = Math.round(0.002 * sr); k < back && s > start && x(s - 1) * x(s) > 0; k++) s--;
    // a dummy loop right at the start (an unlooped sample) moves along; a real loop stays put
    const dummy = loop >= start && loop - start <= 16;
    if (s <= start || s >= end - 64 || (!dummy && s >= loop - 8)) continue;
    buf.writeUInt32LE(s, o + 20);
    if (dummy) buf.writeUInt32LE(s + (loop - start), o + 28);
    moved.push({ name, ms: +(((s - start) / sr) * 1000).toFixed(1) });
  }
  fs.writeFileSync(dst, buf);
  return moved;
}
