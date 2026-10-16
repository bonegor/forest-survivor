// menu-v2 — "Hollow Oak Lullaby". A Dorian (A minor with a raised 6th, F#), 3/4, quarter = 92.
// Form A A' B B' A'' — 8-bar phrases, 40 bars. Two nylon guitars: flowing, ringing eighth-note arpeggios under a
// wistful, warm waltz tune. Hook = bars 0-1 (E—A | D E F#) leaning on the Dorian F# over a bright D chord;
// B lifts to C and G (relative major) in falling thirds, then climbs an Am arpeggio to A5. Soft harmonics chimes.

import { kit, finish, contour } from '../song.mjs';

const BPM = 92, TS = [3, 4], BARS = 40;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 45, hamMs: 80, strumMs: 30 });

// ── lead: nylon, the tune ──────────────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['E5', 2], ['A4', 1]],                       // 0  Am   the hook: a falling fifth...
  [['D5', 1], ['E5', 1], ['F#5', 1]],           // 1  D    ...climbing to the Dorian F#
  [['E5', 2], ['C5', 1]],                       // 2  Am
  [['D5', 2], ['B4', 1]],                       // 3  G
  [['E5', 2], ['A4', 1]],                       // 4  Am
  [['D5', 1], ['F#5', 1], ['A5', 1]],           // 5  D    the answer reaches higher
  [['G5', 1.5], ['F#5', 0.5], ['E5', 1]],       // 6  Em
  [['C5', 1], ['B4', 1], ['A4', 1]],            // 7  Am   settles; bar 0 picks it up again
], { vel: 68 });

const A1 = K.bars("A'", [
  [['E5', 2, { ham: 'D5' }], ['A4', 1]],
  [['D5', 1], ['E5', 1], ['F#5', 1]],           // 9  D/F#
  [['E5', 1.5], ['D5', 0.5], ['C5', 1]],
  [['D5', 1.5], ['C5', 0.5], ['B4', 1]],
  [['E5', 2], ['A4', 0.5], ['B4', 0.5]],
  [['D5', 0.5], ['E5', 0.5], ['F#5', 1], ['A5', 1]],
  [['G5', 2], ['B4', 1]],                       // 14 Em
  [['D5', 1], ['E5', 1], ['F#5', 1]],           // 15 D    runs up into B (+ chime)
], { vel: 71 });

const B = K.bars('B', [
  [['G5', 2], ['E5', 1]],                       // 16 C    falling thirds over a falling bass C-B-A
  [['D5', 2], ['B4', 1]],                       // 17 G/B
  [['C5', 1], ['E5', 1], ['A5', 1]],            // 18 Am   the lift
  [['F#5', 1.5], ['E5', 0.5], ['D5', 1]],       // 19 D
  [['G5', 2], ['E5', 1]],                       // 20 C
  [['D5', 1], ['E5', 1], ['G5', 1]],            // 21 G
  [['A5', 2], ['F#5', 1]],                      // 22 D    the peak
  [['E5', 2], ['F#5', 1]],                      // 23 Em   (+ chime)
], { vel: 74 });

const B1 = K.bars("B'", [
  [[['G5', 'C5'], 2], ['E5', 1]],
  [[['D5', 'B4'], 2], ['G4', 1]],
  [['C5', 1], ['E5', 1], ['A5', 1]],
  [['F#5', 1.5, { ham: 'E5' }], ['E5', 0.5], ['D5', 1]],
  [['G5', 1], ['E5', 1], ['C5', 1]],
  [['D5', 1], ['B4', 1], ['G4', 1]],
  [['A4', 1], ['D5', 1], ['F#5', 1]],
  [['G5', 1], ['F#5', 1], ['D5', 1]],           // 31 G    down into the last A (+ chime)
], { vel: 77 });

const A2 = K.bars("A''", [
  [['E5', 2], ['A4', 1]],                       // 32 Am(add9)
  [['D5', 1], ['E5', 1], ['F#5', 1]],
  [['E5', 2], ['C5', 1]],
  [['D5', 2], ['E5', 1]],
  [['A5', 2], ['E5', 1]],                       // 36 the hook once more, an octave up
  [['F#5', 1.5], ['E5', 0.5], ['D5', 1]],
  [['G5', 1.5], ['F#5', 0.5], ['E5', 1]],
  [['C5', 1], ['B4', 1], ['A4', 1]],            // 39 Am   → bar 0
], { vel: 66 });

const lead = K.melody(0, 0, [...A, ...A1, ...B, ...B1, ...A2]);
for (let b = 0; b < BARS; b += 4) K.arc(lead, b, b + 4, 7, { peak: 0.6 });
contour(lead, 0.35, 4);

// ── rhythm: nylon, arpeggios (thumb b/a, fingers on n[0..3]) ───────────────────────────────────
const V = {
  Am: { b: 45, a: 40, n: [52, 57, 60, 64] },        // x02210
  Am9: { b: 45, a: 40, n: [52, 59, 60, 64] },       // x02410  Am(add9)
  D: { b: 50, a: 45, n: [57, 62, 66] },             // xx0232
  DF: { b: 42, a: 45, n: [50, 57, 62, 66] },        // 2x0232  D/F#
  G: { b: 43, a: 47, n: [50, 55, 59, 67] },         // 320003
  GB: { b: 47, a: 43, n: [50, 55, 59, 67] },        // x20003  G/B
  C: { b: 48, a: 43, n: [52, 55, 60, 64] },         // x32010
  Em: { b: 40, a: 47, n: [52, 55, 59, 64] },        // 022000
};
const P = {
  arp: [[0, 'b', 3, 6], [0.5, '1', 2, -6], [1, '2', 1.5, -4], [1.5, '3', 1.5, -3], [2, '4', 1, -2], [2.5, '2', 0.5, -8]],
  lilt: [[0, 'b', 3, 6], [0.5, '2', 1, -7], [1, '3+4', 1, -4], [2, 'a', 1, -2], [2.5, '3+4', 0.5, -7]],
  ring: [[0, 'b', 3, 6], [0.5, '1', 2.5, -6], [1, '2', 2, -4], [1.5, '3', 1.5, -2], [2, '4', 1, -1], [2.5, '3', 0.5, -6]],
  chime: [[0, 'b', 3, 6], [0.5, '1', 1.5, -6], [1, '2', 1, -4], [1.5, '3', 0.5, -3]], // second half left to the chime
};
const cfg = (vel) => ({ voicings: V, patterns: P, vel });
const rhythm = [
  ...K.comp(0, 'Am | D | Am | G | Am | D | Em | Am', 'arp', cfg(60)),
  ...K.comp(8, 'Am | DF | Am | G | Am | D | Em | D!chime', 'arp', cfg(62)),
  ...K.comp(16, 'C | GB | Am | D | C | G | D | Em!chime', 'lilt', cfg(64)),
  ...K.comp(24, 'C | GB | Am | DF | C | GB | D | G!chime', 'ring', cfg(66)),
  ...K.comp(32, 'Am9 | D | Am | G | Am9 | D | Em | Am', 'arp', cfg(58)),
];
// harmonics chimes, stopped at the bar line: D-A-D (12th/7th frets), E-B-E for Em, D-G-B for G
rhythm.push(...K.chord(15, 2, [62, 69, 74], 1, 60, { staggerMs: 22 }));
rhythm.push(...K.chord(23, 2, [64, 71, 76], 1, 60, { staggerMs: 22 }));
rhythm.push(...K.chord(31, 2, [62, 67, 71], 1, 62, { staggerMs: 22 }));
for (let b = 0; b < BARS; b += 8) K.arc(rhythm, b, b + 8, 5);

export default finish({
  id: 'menu-v2',
  title: 'Hollow Oak Lullaby',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'A Dorian',
  description: 'Gentle 3/4 waltz-lullaby in A Dorian for two nylon guitars: ringing arpeggios, a wistful-but-warm tune built on the Dorian F#, a B part that lifts to C and G, and soft harmonics chimes.',
  sections: [{ bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' }, { bar: 24, name: "B'" }, { bar: 32, name: "A''" }],
  render: { forward: 'Lead (nylon)', leadOverRhythmDb: 4, reverb: 'warm hall, ~28% wet, 2.2 s', note: 'both nylon; keep the arpeggio soft and blurred, the chimes (bars 15, 23, 31 beat 3) bell-like' },
  tracks: [
    { name: 'Lead (nylon)', role: 'lead', program: 24, channel: 0, pan: 84, volume: 100, reverb: 56, notes: lead },
    { name: 'Rhythm (nylon)', role: 'rhythm', program: 24, channel: 1, pan: 44, volume: 84, reverb: 60, notes: rhythm },
  ],
}, { humanize: { ms: 8, vel: 3 } });
