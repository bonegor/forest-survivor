// Standard MIDI File reading and writing for the menu-music renderer (tools/music/render.mjs):
// enough to copy a song's MIDI with its programs changed and a silent tail added for FluidSynth,
// and to read its notes for the plucked-string synth. No dependencies.

// ------------------------------------------------------------------ reading --

export function parseMidi(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let p = 0;
  const u32 = () => ((b[p++] << 24) | (b[p++] << 16) | (b[p++] << 8) | b[p++]) >>> 0;
  const u16 = () => (b[p++] << 8) | b[p++];
  const str = (n) => String.fromCharCode(...b.subarray(p, (p += n)));
  if (str(4) !== 'MThd') throw new Error('not a MIDI file');
  const hlen = u32();
  const format = u16(), ntracks = u16(), division = u16();
  p = 8 + hlen;
  if (division & 0x8000) throw new Error('SMPTE time division is not supported');
  const tracks = [];
  for (let t = 0; t < ntracks && p < b.length; t++) {
    const id = str(4), len = u32(), end = p + len;
    if (id !== 'MTrk') { p = end; t--; continue; }
    const ev = [];
    let tick = 0, running = 0;
    const vlq = () => { let v = 0, c; do { c = b[p++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80); return v; };
    while (p < end) {
      tick += vlq();
      let st = b[p];
      if (st & 0x80) p++; else st = running; // running status
      if (st === 0xff) {
        const type = b[p++], n = vlq();
        ev.push({ tick, kind: 'meta', type, data: Array.from(b.subarray(p, p + n)) });
        p += n;
      } else if (st === 0xf0 || st === 0xf7) {
        const n = vlq();
        ev.push({ tick, kind: 'sysex', status: st, data: Array.from(b.subarray(p, p + n)) });
        p += n;
      } else {
        running = st;
        const hi = st & 0xf0, n = hi === 0xc0 || hi === 0xd0 ? 1 : 2;
        ev.push({ tick, kind: 'ch', status: st, data: Array.from(b.subarray(p, p + n)) });
        p += n;
      }
    }
    p = end;
    tracks.push(ev);
  }
  return { format, division, tracks };
}

// ------------------------------------------------------------------ writing --

export function writeMidi({ format = 1, division, tracks }) {
  const out = [];
  const u32 = (v) => out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
  const u16 = (v) => out.push((v >>> 8) & 255, v & 255);
  const vlq = (v, arr) => {
    const bytes = [v & 0x7f];
    while ((v >>>= 7)) bytes.unshift((v & 0x7f) | 0x80);
    arr.push(...bytes);
  };
  out.push(...'MThd'.split('').map((c) => c.charCodeAt(0)));
  u32(6); u16(tracks.length > 1 ? 1 : format); u16(tracks.length); u16(division);
  for (const evs of tracks) {
    const body = [];
    // Stable sort by tick; at one tick note-offs go before note-ons, so a repeated note is struck again.
    const order = (e) => (e.kind === 'meta' ? 0 : e.kind === 'ch' && isNoteOff(e) ? 1 : 2);
    const sorted = evs.filter((e) => !(e.kind === 'meta' && e.type === 0x2f))
      .map((e, i) => [e, i]).sort((x, y) => x[0].tick - y[0].tick || order(x[0]) - order(y[0]) || x[1] - y[1]).map((x) => x[0]);
    const endTick = evs.reduce((m, e) => Math.max(m, e.tick), 0);
    let last = 0;
    for (const e of sorted) {
      vlq(e.tick - last, body); last = e.tick;
      if (e.kind === 'meta') { body.push(0xff, e.type); vlq(e.data.length, body); body.push(...e.data); }
      else if (e.kind === 'sysex') { body.push(e.status); vlq(e.data.length, body); body.push(...e.data); }
      else body.push(e.status, ...e.data);
    }
    vlq(endTick - last, body); body.push(0xff, 0x2f, 0x00);
    out.push(...'MTrk'.split('').map((c) => c.charCodeAt(0)));
    u32(body.length);
    for (let i = 0; i < body.length; i += 8192) out.push(...body.slice(i, i + 8192));
  }
  return Buffer.from(out);
}

export const isNoteOn = (e) => e.kind === 'ch' && (e.status & 0xf0) === 0x90 && e.data[1] > 0;
export const isNoteOff = (e) => e.kind === 'ch' && ((e.status & 0xf0) === 0x80 || ((e.status & 0xf0) === 0x90 && e.data[1] === 0));

// -------------------------------------------------------------------- time --

// Seconds at a tick, through every tempo change in any track (default 120 BPM).
export function tempoMap(midi) {
  const changes = [];
  for (const evs of midi.tracks) for (const e of evs) if (e.kind === 'meta' && e.type === 0x51) changes.push({ tick: e.tick, us: (e.data[0] << 16) | (e.data[1] << 8) | e.data[2] });
  changes.sort((a, b) => a.tick - b.tick);
  const segs = [{ tick: 0, sec: 0, us: 500000 }];
  for (const c of changes) {
    const s = segs[segs.length - 1];
    const sec = s.sec + ((c.tick - s.tick) * s.us) / 1e6 / midi.division;
    if (c.tick === s.tick) s.us = c.us; else segs.push({ tick: c.tick, sec, us: c.us });
  }
  const toSec = (tick) => {
    let s = segs[0];
    for (const g of segs) if (g.tick <= tick) s = g; else break;
    return s.sec + ((tick - s.tick) * s.us) / 1e6 / midi.division;
  };
  const toTick = (sec) => {
    let s = segs[0];
    for (const g of segs) if (g.sec <= sec) s = g; else break;
    return s.tick + ((sec - s.sec) * 1e6 * midi.division) / s.us;
  };
  return { toSec, toTick, tempos: segs.map((s) => 60e6 / s.us) };
}

// --------------------------------------------------------------- the notes --

// Notes per channel with their times, and each channel's program and controller changes.
export function readNotes(midi) {
  const { toSec } = tempoMap(midi);
  const notes = [], ctrl = [], programs = new Map(), problems = [];
  const open = new Map(); // ch*128+pitch -> [note]
  for (let t = 0; t < midi.tracks.length; t++) {
    for (const e of midi.tracks[t]) {
      if (e.kind !== 'ch') continue;
      const ch = e.status & 15, hi = e.status & 0xf0;
      if (isNoteOn(e)) {
        const k = ch * 128 + e.data[0];
        const n = { track: t, ch, pitch: e.data[0], vel: e.data[1], startTick: e.tick, endTick: null };
        const stack = open.get(k) || [];
        if (stack.length) problems.push({ kind: 'overlap', ch, pitch: n.pitch, tick: e.tick });
        stack.push(n); open.set(k, stack);
        notes.push(n);
      } else if (isNoteOff(e)) {
        const stack = open.get(ch * 128 + e.data[0]);
        if (stack && stack.length) stack.shift().endTick = e.tick; // first in, first out
      } else if (hi === 0xc0) {
        if (!programs.has(ch)) programs.set(ch, e.data[0]);
      } else if (hi === 0xb0) {
        ctrl.push({ tick: e.tick, sec: toSec(e.tick), ch, cc: e.data[0], value: e.data[1] });
      } else if (hi === 0xe0) {
        problems.push({ kind: 'pitchbend', ch, tick: e.tick });
      }
    }
  }
  for (const n of notes) {
    if (n.endTick === null) { problems.push({ kind: 'unterminated', ch: n.ch, pitch: n.pitch, tick: n.startTick }); n.endTick = n.startTick + midi.division; }
    n.start = toSec(n.startTick);
    n.end = toSec(n.endTick);
  }
  notes.sort((a, b) => a.start - b.start || a.ch - b.ch || a.pitch - b.pitch);
  ctrl.sort((a, b) => a.tick - b.tick);
  return { notes, ctrl, programs, problems };
}

// The value of a controller on a channel at a tick (the last change at or before it).
export function ccAt(ctrl, ch, cc, tick, dflt) {
  let v = dflt;
  for (const c of ctrl) { if (c.tick > tick) break; if (c.ch === ch && c.cc === cc) v = c.value; }
  return v;
}
