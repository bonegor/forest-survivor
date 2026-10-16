// tools/music/midi.mjs — a zero-dependency Standard MIDI File writer (and a small reader for self-checks).
//
// writeMidi(song, filePath) writes format 1, PPQ 480:
//   track 0  conductor: song title, time signature, tempo, optional key signature, section markers
//   track n  one per song track: name, program change, CC7 volume, CC10 pan, CC91 reverb (if given), notes
// Every track ends exactly at the loop point (bars × beats-per-bar × ticks-per-beat). Notes that would
// ring past it are cut there; a renderer should let them (and the reverb) decay into the next pass.
// No running status. At equal ticks: meta, program, controllers, note-offs, then note-ons.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { unitSeconds, isCompound, start } from './song.mjs';

export const PPQ = 480;

export function vlq(n) {
  if (!Number.isInteger(n) || n < 0 || n > 0x0fffffff) throw new RangeError(`variable-length quantity out of range: ${n}`);
  const out = [n & 0x7f];
  while ((n >>>= 7) > 0) out.unshift((n & 0x7f) | 0x80);
  return out;
}
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n) => [(n >>> 8) & 255, n & 255];
const text = (s) => [...Buffer.from(String(s), 'utf8')];
const meta = (type, data) => [0xff, type, ...vlq(data.length), ...data];

/** Ticks and tempo for a song. */
export function timing(song) {
  const [num, den] = song.timeSig;
  const tpu = (PPQ * 4) / den; // ticks per beat unit (the denominator note)
  if (!Number.isInteger(tpu)) throw new Error(`time signature denominator ${den} gives fractional ticks`);
  const usPerQuarter = Math.round(unitSeconds(song) * (den / 4) * 1e6);
  return { num, den, tpu, barTicks: num * tpu, endTick: song.bars * num * tpu, usPerQuarter };
}

function chunk(events, endTick) {
  events.sort((a, b) => a.tick - b.tick || a.order - b.order || a.seq - b.seq);
  const body = [];
  let last = 0;
  for (const e of events) {
    body.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  body.push(...vlq(endTick - last), 0xff, 0x2f, 0x00);
  return { bytes: Buffer.from([...text('MTrk'), ...be32(body.length), ...body]), events: events.length + 1 };
}

/** Builds the file in memory: { bytes, info: { endTick, tracks: [{ name, events, notes }] } }. */
export function buildMidi(song) {
  const t = timing(song);
  const { num, den, tpu, endTick } = t;
  let seq = 0;
  const ev = (list, tick, order, bytes) => list.push({ tick, order, seq: seq++, bytes });

  const cond = [];
  ev(cond, 0, 0, meta(0x03, text(song.title)));
  const clocks = isCompound(song.timeSig) ? 36 : (24 * 4) / den;
  ev(cond, 0, 0, meta(0x58, [num, Math.log2(den), clocks, 8]));
  ev(cond, 0, 0, meta(0x51, [(t.usPerQuarter >> 16) & 255, (t.usPerQuarter >> 8) & 255, t.usPerQuarter & 255]));
  if (song.keySig) ev(cond, 0, 0, meta(0x59, [song.keySig[0] & 255, song.keySig[1] ? 1 : 0]));
  for (const s of song.sections ?? []) ev(cond, s.bar * num * tpu, 0, meta(0x06, text(s.name)));
  const chunks = [chunk(cond, endTick)];
  const info = { endTick, tracks: [{ name: 'conductor', events: chunks[0].events, notes: 0 }] };

  for (const tr of song.tracks) {
    const ch = tr.channel & 15;
    const list = [];
    ev(list, 0, 0, meta(0x03, text(tr.name)));
    ev(list, 0, 1, [0xc0 | ch, tr.program & 127]);
    ev(list, 0, 2, [0xb0 | ch, 7, tr.volume & 127]);
    ev(list, 0, 2, [0xb0 | ch, 10, tr.pan & 127]);
    if (tr.reverb != null) ev(list, 0, 2, [0xb0 | ch, 91, tr.reverb & 127]);
    for (const n of tr.notes) {
      const s = start(n, num);
      const on = Math.min(Math.round(s * tpu), endTick - 1);
      const off = Math.max(on + 1, Math.min(Math.round((s + n.dur) * tpu), endTick));
      ev(list, on, 4, [0x90 | ch, n.pitch & 127, Math.max(1, Math.min(127, n.vel))]);
      ev(list, off, 3, [0x80 | ch, n.pitch & 127, 64]);
    }
    const c = chunk(list, endTick);
    chunks.push(c);
    info.tracks.push({ name: tr.name, events: c.events, notes: tr.notes.length });
  }
  const header = Buffer.from([...text('MThd'), ...be32(6), ...be16(1), ...be16(chunks.length), ...be16(PPQ)]);
  return { bytes: Buffer.concat([header, ...chunks.map((c) => c.bytes)]), info };
}

export function writeMidi(song, filePath) {
  const { bytes, info } = buildMidi(song);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, bytes);
  return { ...info, bytes: bytes.length };
}

/** Reads a Standard MIDI File back (running status supported): { format, division, tracks: [{ events, endTick }] }.
 *  Events: { tick, kind: 'meta'|'on'|'off'|'cc'|'program'|'other'|'sysex', type?, data, channel? } */
export function parseMidi(buf) {
  let p = 0;
  const id = () => buf.toString('latin1', p, (p += 4));
  const u32 = () => { const v = buf.readUInt32BE(p); p += 4; return v; };
  const u16 = () => { const v = buf.readUInt16BE(p); p += 2; return v; };
  const rv = () => { let v = 0, b; do { b = buf[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  if (id() !== 'MThd') throw new Error('not a MIDI file (no MThd)');
  const hlen = u32();
  const format = u16(), ntrks = u16(), division = u16();
  p = 8 + hlen;
  const tracks = [];
  while (p < buf.length) {
    const cid = id(), len = u32(), end = p + len;
    if (end > buf.length) throw new Error(`chunk ${cid} runs past the end of the file`);
    if (cid !== 'MTrk') { p = end; continue; }
    let tick = 0, status = 0, sawEnd = false;
    const events = [];
    while (p < end) {
      tick += rv();
      if (buf[p] & 0x80) status = buf[p++];
      else if (!status) throw new Error(`data byte without status at ${p}`);
      if (status === 0xff) {
        const type = buf[p++], l = rv();
        events.push({ tick, kind: 'meta', type, data: buf.subarray(p, p + l) });
        p += l; status = 0;
        if (type === 0x2f) sawEnd = true;
      } else if (status === 0xf0 || status === 0xf7) {
        const l = rv(); events.push({ tick, kind: 'sysex', data: buf.subarray(p, p + l) }); p += l; status = 0;
      } else {
        const hi = status & 0xf0, nd = hi === 0xc0 || hi === 0xd0 ? 1 : 2;
        const data = [...buf.subarray(p, p + nd)]; p += nd;
        const kind = hi === 0x90 ? (data[1] > 0 ? 'on' : 'off') : hi === 0x80 ? 'off' : hi === 0xb0 ? 'cc' : hi === 0xc0 ? 'program' : 'other';
        events.push({ tick, kind, channel: status & 15, data });
      }
    }
    if (p !== end) throw new Error('track chunk length mismatch');
    if (!sawEnd) throw new Error('track without End of Track');
    tracks.push({ events, endTick: tick });
  }
  if (tracks.length !== ntrks) throw new Error(`header says ${ntrks} tracks, found ${tracks.length}`);
  return { format, division, tracks };
}
