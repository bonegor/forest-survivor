// tools/music/midi.mjs — the Standard MIDI File writer: a song to MIDI, and the one encoder every MIDI file goes
// through (render.mjs's edited copies too). Reading is render/smf.mjs's.
//
// writeMidi(song, filePath) writes format 1, PPQ 480:
//   track 0  conductor: song title, time signature, tempo, optional key signature, section markers
//   track n  one per song track: name, program change, CC7 volume, CC10 pan, CC91 reverb (if given), notes
// Every track ends exactly at the loop point (bars × beats-per-bar × ticks-per-beat). Notes that would
// ring past it are cut there; a renderer should let them (and the reverb) decay into the next pass.
// No running status. At equal ticks: meta events, then note-offs, then everything else in list order
// (program, controllers, note-ons).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { unitSeconds, isCompound, start } from './song.mjs';
import { isNoteOff } from './render/smf.mjs';

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

// ── encoding ───────────────────────────────────────────────────────────────────────────────────

/** Encodes event lists, in render/smf.mjs's form, as a Standard MIDI File (a Buffer):
 *  { format = 1, division = PPQ, tracks: [[event, ...], ...] }, events
 *  { tick, kind: 'meta', type, data } | { tick, kind: 'sysex', status, data } | { tick, kind: 'ch', status, data }.
 *  Each track ends (End of Track) at its latest event, any End of Track in the list included. */
export function encodeMidi({ format = 1, division = PPQ, tracks }) {
  const order = (e) => (e.kind === 'meta' ? 0 : isNoteOff(e) ? 1 : 2);
  const chunks = tracks.map((evs) => {
    const sorted = evs.filter((e) => !(e.kind === 'meta' && e.type === 0x2f))
      .map((e, i) => [e, i]).sort((x, y) => x[0].tick - y[0].tick || order(x[0]) - order(y[0]) || x[1] - y[1]).map((x) => x[0]);
    const endTick = evs.reduce((m, e) => Math.max(m, e.tick), 0);
    const body = [];
    let last = 0;
    for (const e of sorted) {
      body.push(...vlq(e.tick - last));
      last = e.tick;
      if (e.kind === 'meta') body.push(0xff, e.type, ...vlq(e.data.length), ...e.data);
      else if (e.kind === 'sysex') body.push(e.status, ...vlq(e.data.length), ...e.data);
      else body.push(e.status, ...e.data);
    }
    body.push(...vlq(endTick - last), 0xff, 0x2f, 0x00);
    return Buffer.concat([Buffer.from([...text('MTrk'), ...be32(body.length)]), Buffer.from(body)]);
  });
  const header = Buffer.from([...text('MThd'), ...be32(6), ...be16(tracks.length > 1 ? 1 : format), ...be16(tracks.length), ...be16(division)]);
  return Buffer.concat([header, ...chunks]);
}

// ── songs ──────────────────────────────────────────────────────────────────────────────────────

/** Ticks and tempo for a song. */
export function timing(song) {
  const [num, den] = song.timeSig;
  const tpu = (PPQ * 4) / den; // ticks per beat unit (the denominator note)
  if (!Number.isInteger(tpu)) throw new Error(`time signature denominator ${den} gives fractional ticks`);
  const usPerQuarter = Math.round(unitSeconds(song) * (den / 4) * 1e6);
  return { num, den, tpu, barTicks: num * tpu, endTick: song.bars * num * tpu, usPerQuarter };
}

/** A song as event lists for encodeMidi(): { format: 1, division: PPQ, tracks }. */
export function songEvents(song) {
  const t = timing(song);
  const { num, den, tpu, endTick } = t;
  const meta = (tick, type, data) => ({ tick, kind: 'meta', type, data });
  const msg = (tick, status, ...data) => ({ tick, kind: 'ch', status, data });

  const clocks = isCompound(song.timeSig) ? 36 : (24 * 4) / den;
  const cond = [
    meta(0, 0x03, text(song.title)),
    meta(0, 0x58, [num, Math.log2(den), clocks, 8]),
    meta(0, 0x51, [(t.usPerQuarter >> 16) & 255, (t.usPerQuarter >> 8) & 255, t.usPerQuarter & 255]),
  ];
  if (song.keySig) cond.push(meta(0, 0x59, [song.keySig[0] & 255, song.keySig[1] ? 1 : 0]));
  for (const s of song.sections ?? []) {
    if (!Number.isInteger(s.bar) || s.bar < 0 || s.bar >= song.bars) throw new RangeError(`section ${JSON.stringify(s.name)}: bar ${s.bar} is not a whole bar in 0..${song.bars - 1}`);
    cond.push(meta(s.bar * num * tpu, 0x06, text(s.name)));
  }
  cond.push(meta(endTick, 0x2f, []));
  const tracks = [cond];

  for (const tr of song.tracks) {
    const ch = tr.channel & 15;
    const evs = [
      meta(0, 0x03, text(tr.name)),
      msg(0, 0xc0 | ch, tr.program & 127),
      msg(0, 0xb0 | ch, 7, tr.volume & 127),
      msg(0, 0xb0 | ch, 10, tr.pan & 127),
    ];
    if (tr.reverb != null) evs.push(msg(0, 0xb0 | ch, 91, tr.reverb & 127));
    for (const n of tr.notes) {
      const s = start(n, num);
      const on = Math.min(Math.round(s * tpu), endTick - 1);
      const off = Math.max(on + 1, Math.min(Math.round((s + n.dur) * tpu), endTick));
      evs.push(msg(on, 0x90 | ch, n.pitch & 127, Math.max(1, Math.min(127, n.vel))), msg(off, 0x80 | ch, n.pitch & 127, 64));
    }
    evs.push(meta(endTick, 0x2f, []));
    tracks.push(evs);
  }
  return { format: 1, division: PPQ, tracks };
}

/** Builds the file in memory: { bytes, info: { endTick, tracks: [{ name, events, notes }] } }. */
export function buildMidi(song) {
  const { tracks } = songEvents(song);
  const names = ['conductor', ...song.tracks.map((tr) => tr.name)];
  const info = {
    endTick: timing(song).endTick,
    tracks: tracks.map((evs, i) => ({ name: names[i], events: evs.length, notes: i ? song.tracks[i - 1].notes.length : 0 })),
  };
  return { bytes: encodeMidi({ format: 1, division: PPQ, tracks }), info };
}

export function writeMidi(song, filePath) {
  const { bytes, info } = buildMidi(song);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, bytes);
  return { ...info, bytes: bytes.length };
}
