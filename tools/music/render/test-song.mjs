// tools/music/render/test-song.mjs — a short tune for `node tools/music/render.mjs --test`, written like a
// real song (song.mjs's helpers and finish(), checked by validate(), written by midi.mjs), so the whole
// pipeline can be tried before (or without) the real tunes in tools/music/songs/.
//
// A minor, 6/8 at a dotted quarter of 75 (an eighth every 0.27 s), 8 bars, 12.8 s: nylon arpeggios under
// a steel melody in dotted quarters whose last note is held to the loop point.

import { kit, finish } from '../song.mjs';

const BPM = 75, TS = [6, 8], BARS = 8;
const K = kit({ bpm: BPM, timeSig: TS });

// one bar each: the bass, then up and back down the chord
const ARPS = {
  Am: [45, 52, 57, 60, 57, 52], F: [41, 48, 53, 57, 53, 48], C: [48, 55, 60, 64, 60, 55], G: [43, 50, 55, 59, 55, 50],
  Dm: [50, 57, 62, 65, 62, 57], E: [40, 47, 52, 56, 52, 47], E7: [40, 47, 50, 56, 50, 47],
};
const PROG = ['Am', 'F', 'C', 'G', 'Am', 'Dm', 'E', 'E7'];
// [pitch, eighths]; the last note runs past the loop point and finish() cuts it there
const MEL = [[76, 3], [72, 3], [69, 3], [72, 3], [67, 3], [76, 3], [74, 6], [72, 3], [76, 3], [77, 3], [74, 3], [71, 3], [68, 3], [71, 3], [76, 6]];

// the bass rings through its bar, the five notes over it last a quarter each
const arpeggio = PROG.flatMap((ch, bar) => ARPS[ch].flatMap((p, beat) => K.note(bar, beat, p, beat === 0 ? 6 : 2, beat === 0 ? 84 : 62 + ((beat * 7) % 11))));
const melody = K.melody(0, 0, MEL.map(([p, dur], i) => [p, dur, 80 + (i % 3) * 6]), { accent: false });

export const song = finish({
  id: 'zz-test',
  title: 'Pipeline test',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'A minor',
  description: 'A test tune for the renderer: nylon arpeggios under a steel melody, its last note held to the loop point.',
  sections: [{ bar: 0, name: 'A' }, { bar: 4, name: "A'" }],
  // the structured form of the hall (songs may also write it as text, "small hall, ~18% wet, 1.4 s")
  render: { leadOverRhythmDb: 3, reverb: { wetPct: 18, t60: 1.4 } },
  tracks: [
    { name: 'Arpeggio (nylon)', role: 'rhythm', program: 24, channel: 0, pan: 42, volume: 100, reverb: 40, notes: arpeggio },
    { name: 'Melody (steel)', role: 'lead', program: 25, channel: 1, pan: 86, volume: 96, reverb: 36, notes: melody },
  ],
}, { humanize: false });

export default song;
