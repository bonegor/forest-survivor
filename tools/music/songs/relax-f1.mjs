// relax-f1 — "Light Through the Rowan". E minor (Aeolian, with a Lydian F# over C and one Dorian A major), 4/4, quarter = 64.
// Form A A' B A'' — 4-bar phrases, 16 bars, 60 s. Two nylon guitars: a slow eighth-note arpeggio, thumb on 1 and 3
// ringing two beats, the open B and high E strings left ringing through every chord, under a singing tune.
// Hook = bars 0-1 (E5 — F# G | A . D E —): a rising step, then a falling fifth that settles. A' climbs to B5 on a
// Cmaj7 and comes home in a warm sixth with a breath. B is the hook a tone lower in the relative major (D — E F# |
// G . F# E —), its window a Lydian F# held over Cmaj7. A'' brings the hook home over a slowly rolled A(add9) — the
// Dorian C# — and a Bm11 that leans back into bar 0 on an A–B pickup.

import { kit, finish, contour } from '../song.mjs';

const BPM = 64, TS = [4, 4], BARS = 16;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 50, hamMs: 90, strumMs: 36 });

// ── lead: nylon, the tune ──────────────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['E5', 2], ['F#5', 1], ['G5', 1]],                                 // 0  Em(add9)   the hook: a rising step...
  [['A5', 1.5], ['D5', 0.5], ['E5', 2]],                              // 1  Asus2      ...a falling fifth, settling on E
  [['G5', 1.5], ['E5', 0.5], ['D5', 2]],                              // 2  Cmaj7      the echo a tone lower; D, the 9th, left hanging
  [['B4', 1], ['D5', 1], ['F#5', 2]],                                 // 3  Bm11       a question, climbing the chord
], { vel: 70 });

const A1 = K.bars("A'", [
  [['E5', 2, { ham: 'D5' }], ['F#5', 1], ['G5', 1]],                  // 4  Em(add9)
  [['B5', 1.5], ['E5', 0.5], ['G5', 2]],                              // 5  Cmaj7      the peak: B5 over Cmaj7, the falling fifth from the top
  [['A5', 1], ['G5', 1], ['F#5', 1], ['D5', 1]],                      // 6  Asus2 Bm11 down the scale
  [[['E5', 'G4'], 2], [null, 2]],                                     // 7  Em(add9) Dsus2  home, in a warm sixth; then a breath (+ chime)
], { vel: 74 });

const B = K.bars('B', [
  [['D5', 2], ['E5', 1], ['F#5', 1]],                                 // 8  G6/maj7    the hook a tone lower, in the relative major
  [['G5', 1.5], ['F#5', 0.5], ['E5', 2]],                             // 9  D/F#       G leans on the D chord and gives way; E rings as the 9th
  [['F#5', 2], ['E5', 1], ['D5', 1]],                                 // 10 Cmaj7#11   the Lydian F#, plucked clear — the window
  [['C5', 1.5], ['B4', 0.5], ['A4', 1], ['B4', 1]],                   // 11 Am7 Bm11   down to A4; the A–B pickup climbs back into E
], { vel: 66 });

const A2 = K.bars("A''", [
  [['E5', 2, { ham: 'D5' }], ['F#5', 1], ['G5', 1]],                  // 12 Em(add9)
  [['A5', 1.5], ['C#5', 0.5], ['E5', 2]],                             // 13 A(add9)    the hook's second bar with the Dorian C#
  [['G5', 1.5], ['E5', 0.5], ['D5', 1.5], ['E5', 0.5]],               // 14 Cmaj7      the echo, now climbing out: D . E → F#
  [['F#5', 1.5], ['D5', 0.5], ['B4', 1], ['A4', 0.5], ['B4', 0.5]],   // 15 Bm11       falls, then the A–B pickup into bar 0
], { vel: 70 });

const lead = K.melody(0, 0, [...A, ...A1, ...B, ...A2]);
// phrase dynamics: each two-bar sub-phrase swells and eases; the whole rises to bar 5 and sinks into the loop
for (let b = 0; b < BARS; b += 2) K.arc(lead, b, b + 2, 5, { peak: 0.45 });
K.ramp(lead, [[0, -2], [1, 2], [2, 0], [3, -3], [4, -2], [4.5, 2], [5, 12], [5.5, 10], [6, 3], [7, -6], [7.8, -9], [8, -6], [9, -3], [10, 4], [11, -3], [12, 0], [13, 3], [14, 1], [15, -3], [15.9, -4]]);
contour(lead, 0.3, 4);

// ── rhythm: nylon, fingerpicked arpeggios (thumb b/a on 1 and 3, fingers on n[0..3] low→high) ───
const V = {
  Em9: { b: 40, a: 47, n: [52, 55, 59, 66] },   // 022002  Em(add9): E B E G B F#
  As2: { b: 45, a: 40, n: [52, 57, 59, 64] },   // x02200  Asus2, the low E as its alternate bass (Asus2/E)
  C7: { b: 48, a: 43, n: [52, 55, 59, 64] },    // x32000  Cmaj7
  CL: { b: 48, a: 43, n: [52, 55, 59, 66] },    // x32002  Cmaj7#11, the F# on top
  Bm11: { b: 47, a: 42, n: [50, 57, 59, 64] },  // x20200  Bm11: B D A B E — the floating v
  Am7: { b: 45, a: 40, n: [52, 55, 60, 64] },   // x02010
  G6: { b: 43, a: 47, n: [50, 55, 59, 64] },    // 320000  G6, all open on top (the lead's F# makes it Gmaj7)
  DF: { b: 42, a: 45, n: [50, 57, 62, 66] },    // 200232  D/F#
  A9: { b: 45, a: 40, n: [52, 59, 61, 64] },    // x02420  A(add9): A E B C# E — the Dorian surprise
  Ds2: { b: 50, a: 45, n: [57, 62, 64] },       // x00230  Dsus2
};
const P = {
  // thumb on 1 and 3 ringing two beats, fingers climbing the chord in eighths; the open strings ring on
  flow: [[0, 'b', 2, 6], [0.5, '1', 1.5, -7], [1, '2', 1.5, -5], [1.5, '3', 1.5, -3], [2, 'a', 2, 2], [2.5, '2', 1.5, -6], [3, '3', 1, -4], [3.5, '4', 0.5, -2]],
  // the same, up to the top string and back down
  wave: [[0, 'b', 2, 6], [0.5, '1', 1.5, -7], [1, '2', 1.5, -5], [1.5, '3', 1.5, -3], [2, 'a', 2, 2], [2.5, '4', 1.5, -3], [3, '3', 1, -5], [3.5, '2', 0.5, -7]],
  // a slow roll of the whole shape on 1 (36 ms a string), then the second half of flow
  roll: [[0, 'D', 2, 1], [2, 'a', 2, 0], [2.5, '2', 1.5, -6], [3, '3', 1, -4], [3.5, '4', 0.5, -2]],
  // B part: the bass alone, ringing the whole bar — a pedal — with the fingers flowing up and back over it
  pedal: [[0, 'b', 4, 6], [0.5, '1', 1.5, -7], [1, '2', 1.5, -5], [1.5, '3', 1.5, -3], [2, '4', 1.5, -2], [2.5, '3', 1.5, -5], [3, '2', 1, -6], [3.5, '1', 0.5, -7]],
  // sparse, for the lean into bar 0: bass, one pinch, bass, two notes
  calm: [[0, 'b', 2, 6], [1, '2+4', 1.5, -5], [2, 'a', 2, 2], [3, '2', 1, -6], [3.5, '3', 0.5, -4]],
  // the breath in bar 7: bass, one pinch, the new bass — the second half left to a harmonics chime
  breath: [[0, 'b', 2, 6], [1, '2+4', 1.5, -5], [2, 'a', 2, 2]],
};
const cfg = (vel) => ({ voicings: V, patterns: P, vel });
const rhythm = [
  ...K.comp(0, 'Em9 | As2 | C7 | Bm11', 'flow', cfg(64)),
  ...K.comp(4, 'Em9 | C7!roll | As2 Bm11 | Em9 Ds2!breath', 'flow', cfg(68)),
  ...K.comp(8, 'G6 | DF | CL | Am7 Bm11!flow', 'pedal', cfg(60)),
  ...K.comp(12, 'Em9 | A9!roll | C7!wave | Bm11!calm', 'flow', cfg(64)),
];
// harmonics chime in the breath (bar 7, beat 3.5): D4 (12th fret, D string), A4 (5th fret, A string), E5 (12th fret, high E) — Dsus2
rhythm.push(...K.chord(7, 2.5, [62, 69, 76], 1.5, 58, { staggerMs: 30 }));
for (let b = 0; b < BARS; b += 4) K.arc(rhythm, b, b + 4, 4, { peak: 0.4 });
K.ramp(rhythm, [[0, 0], [4, 1], [5, 5], [6, 2], [7, -2], [8, -3], [10, 0], [11, -2], [12, 0], [13, 3], [14, 0], [15, -3], [15.9, -3]]);

export default finish({
  id: 'relax-f1',
  title: 'Light Through the Rowan',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'E minor',
  description: 'Slow, warm fingerstyle piece in E minor for two nylon guitars: a rising hook over Em(add9) and a floating Asus2, a climb to B5 on Cmaj7, a B part that opens into the relative major with a Lydian F# held over Cmaj7, and a rolled Dorian A(add9) on the way home.',
  sections: [{ bar: 0, name: 'A' }, { bar: 4, name: "A'" }, { bar: 8, name: 'B' }, { bar: 12, name: "A''" }],
  render: {
    forward: 'Lead (nylon)',
    leadOverRhythmDb: 5,
    reverb: 'warm hall, ~26% wet, 2.4 s',
    note: 'both nylon, unhurried; let the open B/E strings of the arpeggio blur into the hall; the rolled chords at bars 5 and 13 beat 1 are slow harp-like rolls, not strums; the lead a little forward and dry-ish so the tune stays clear',
  },
  tracks: [
    { name: 'Lead (nylon)', role: 'lead', program: 24, channel: 0, pan: 86, volume: 100, reverb: 48, notes: lead },
    { name: 'Rhythm (nylon)', role: 'rhythm', program: 24, channel: 1, pan: 42, volume: 84, reverb: 62, notes: rhythm },
  ],
}, { humanize: { ms: 9, vel: 3 } });
