// A short test tune in the composer's song format (see tools/music/song.mjs), and a minimal
// converter to MIDI, so `node tools/music/render.mjs --test` can exercise the whole pipeline
// before (or without) the real tunes. The real tunes go through tools/music/build-midi.mjs.
import { writeMidi } from './smf.mjs';

const ARPS = {
  Am: [45, 52, 57, 60, 57, 52], F: [41, 48, 53, 57, 53, 48], C: [48, 55, 60, 64, 60, 55], G: [43, 50, 55, 59, 55, 50],
  Dm: [50, 57, 62, 65, 62, 57], E: [40, 47, 52, 56, 52, 47], E7: [40, 47, 50, 56, 50, 47],
};
const PROG = ['Am', 'F', 'C', 'G', 'Am', 'Dm', 'E', 'E7'];
const MEL = [[76, 3], [72, 3], [69, 3], [72, 3], [67, 3], [76, 3], [74, 6], [72, 3], [76, 3], [77, 3], [74, 3], [71, 3], [68, 3], [71, 3], [76, 6]];

export const song = {
  id: 'zz-test',
  title: 'Pipeline test',
  bpm: 112,
  timeSig: [6, 8],
  bars: 8,
  key: 'A minor',
  description: 'A test tune for the renderer: nylon arpeggios under a steel melody, its last note ringing over the loop end.',
  render: { leadOverRhythmDb: 3, reverb: 'small hall, ~18% wet, 1.4 s' },
  tracks: [
    {
      name: 'Arpeggio', role: 'rhythm', program: 24, channel: 0, pan: -0.35, volume: 100, reverb: 40,
      notes: PROG.flatMap((ch, bar) => ARPS[ch].map((pitch, beat) => ({ bar, beat, pitch, dur: beat === 0 ? 6 : 2, vel: beat === 0 ? 84 : 62 + ((beat * 7) % 11) }))),
    },
    {
      name: 'Melody', role: 'lead', program: 25, channel: 1, pan: 0.35, volume: 96, reverb: 36,
      notes: (() => { let t = 0; return MEL.map(([pitch, dur], i) => { const n = { bar: Math.floor(t / 6), beat: t % 6, pitch, dur, vel: 80 + (i % 3) * 6 }; t += dur; return n; }); })(),
    },
  ],
};

// Song (bar/beat in denominator notes) -> MIDI, PPQ 480. Pan -1..1 -> CC10, volume 0..127 -> CC7.
export function songToMidi(s) {
  const division = 480, [num, den] = s.timeSig, unit = (division * 4) / den;
  const us = Math.round(60e6 / s.bpm);
  const meta = [
    { tick: 0, kind: 'meta', type: 0x51, data: [(us >> 16) & 255, (us >> 8) & 255, us & 255] },
    { tick: 0, kind: 'meta', type: 0x58, data: [num, Math.log2(den), 24, 8] },
    { tick: s.bars * num * unit, kind: 'meta', type: 0x2f, data: [] },
  ];
  const tracks = [meta];
  for (const tr of s.tracks) {
    const ch = tr.channel, ev = [
      { tick: 0, kind: 'meta', type: 0x03, data: [...Buffer.from(tr.name)] },
      { tick: 0, kind: 'ch', status: 0xc0 | ch, data: [tr.program] },
      { tick: 0, kind: 'ch', status: 0xb0 | ch, data: [7, tr.volume] },
      { tick: 0, kind: 'ch', status: 0xb0 | ch, data: [10, Math.max(0, Math.min(127, Math.round(64 + tr.pan * 63)))] },
      { tick: 0, kind: 'ch', status: 0xb0 | ch, data: [91, tr.reverb ?? 40] },
    ];
    for (const n of tr.notes) {
      const t0 = Math.round((n.bar * num + n.beat) * unit), t1 = Math.round(t0 + n.dur * unit);
      ev.push({ tick: t0, kind: 'ch', status: 0x90 | ch, data: [n.pitch, n.vel] }, { tick: t1, kind: 'ch', status: 0x80 | ch, data: [n.pitch, 0] });
    }
    tracks.push(ev);
  }
  return writeMidi({ format: 1, division, tracks });
}
