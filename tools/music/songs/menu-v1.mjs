// menu-v1 — "The Greenwood Jig". D Mixolydian (D major with a flat 7th, C natural), 6/8, dotted quarter = 100.
// Form A A' B B' A(air) A'' — 8-bar phrases, 48 bars. Bright fingerstyle jig over open D/A drones (Dsus2 shimmer);
// hook = bars 0-1 (D—A D E F# | G—E C—E); B lifts to G and Bm and peaks on a held A5; the air is a soft, sparse pass.

import { kit, finish, contour } from '../song.mjs';

const BPM = 100, TS = [6, 8], BARS = 48;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 40, hamMs: 70, strumMs: 22 });

// ── lead: nylon, the tune ──────────────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['D5', 2], ['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1]],                 // 0  D   the hook
  [['G5', 2], ['E5', 1], ['C5', 2], ['E5', 1]],                             // 1  C   ...the flat 7th answers
  [['D5', 1], ['F#5', 1], ['A5', 1], ['F#5', 2], ['D5', 1]],                // 2  D
  [['E5', 1], ['D5', 1], ['C5', 1], ['B4', 2], ['A4', 1]],                  // 3  C G
  [['D5', 2], ['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1]],                 // 4  D
  [['G5', 2], ['E5', 1], ['C5', 2], ['E5', 1]],                             // 5  C
  [['G5', 1], ['F#5', 1], ['E5', 1], ['D5', 1], ['C5', 1], ['A4', 1]],      // 6  Em Am
  [['D5', 3], ['A4', 1], ['B4', 1], ['C5', 1]],                             // 7  D   pickup A-B-C up to D
], { vel: 76 });

const A1 = K.bars("A'", [
  [['D5', 2, { cut: 'E5' }], ['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1]],
  [['G5', 2, { ham: 'F#5' }], ['E5', 1], ['C5', 1], ['D5', 1], ['E5', 1]],
  [['D5', 1], ['F#5', 1], ['A5', 1], ['F#5', 1, { pull: 'G5' }], ['E5', 1], ['D5', 1]],
  [['E5', 1], ['D5', 1], ['C5', 1], ['B4', 2, { ham: 'A4' }], ['A4', 1]],
  [['D5', 2, { cut: 'E5' }], ['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1]],
  [['G5', 2], ['E5', 1], ['C5', 2, { ham: 'B4' }], ['E5', 1]],
  [['G5', 1], ['F#5', 1], ['E5', 1], ['D5', 1 / 3], ['E5', 1 / 3], ['D5', 1 / 3], ['C5', 1], ['A4', 1]],
  [['D5', 2], ['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1]],                 // 15 D   the hook head runs up into B
], { vel: 79 });

const B = K.bars('B', [
  [['G5', 2], ['A5', 1], ['G5', 1], ['F#5', 1], ['E5', 1]],                 // 16 G
  [['F#5', 2], ['D5', 1], ['A4', 2], ['D5', 1]],                            // 17 D
  [['E5', 2], ['G5', 1], ['E5', 1], ['D5', 1], ['C5', 1]],                  // 18 C
  [['D5', 2], ['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1]],                 // 19 D   hook head again
  [['G5', 2], ['D5', 1], ['B4', 1], ['D5', 1], ['G5', 1]],                  // 20 G
  [['F#5', 2], ['A5', 1], ['F#5', 1], ['E5', 1], ['D5', 1]],                // 21 Bm
  [['E5', 2], ['B4', 1], ['E5', 1], ['F#5', 1], ['G5', 1]],                 // 22 Em
  [['A5', 3], [null, 1], ['E5', 1], ['F#5', 1]],                            // 23 A   half cadence, the peak
], { vel: 83 });

const B1 = K.bars("B'", [
  [[['G5', 'B4'], 2], ['A5', 1], ['G5', 1], ['F#5', 1], ['E5', 1]],
  [[['F#5', 'A4'], 2], ['D5', 1], ['A4', 2, { ham: 'G4' }], ['D5', 1]],
  [[['E5', 'C5'], 2], ['G5', 1], ['E5', 1], ['D5', 1], ['C5', 1]],
  [['D5', 2, { cut: 'E5' }], ['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1]],
  [['G5', 2, { ham: 'F#5' }], ['D5', 1], ['B4', 1], ['D5', 1], ['G5', 1]],
  [[['F#5', 'D5'], 2], ['A5', 1], ['F#5', 1], ['E5', 1], ['D5', 1]],
  [[['E5', 'C5'], 2], ['G5', 1], ['E5', 1], ['D5', 1], ['C5', 1]],          // 30 C   the Mixolydian cadence
  [[['D5', 'A4'], 3], ['A4', 1], ['B4', 1], ['C5', 1]],                     // 31 D
], { vel: 87 });

const AIR = K.bars('A (air)', [
  [['D5', 2], ['A4', 1], ['D5', 3]],
  [['G5', 2], ['E5', 1], ['C5', 3]],
  [['F#5', 3], [null, 3]],                                                  // 34 D   (+ harmonics chime below)
  [['E5', 1], ['D5', 1], ['C5', 1], ['B4', 3]],
  [['D5', 2], ['A4', 1], ['D5', 3]],
  [['G5', 2], ['E5', 1], ['C5', 3]],
  [['E5', 3], ['C5', 2], ['A4', 1]],
  [['D5', 3], ['A4', 1], ['B4', 1], ['C5', 1]],
], { vel: 67 });

const A3 = K.bars("A''", [
  [[['D5', 'A4'], 2], ['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1]],
  [[['G5', 'E5'], 2], ['E5', 1], ['C5', 2, { ham: 'B4' }], ['E5', 1]],
  [['D5', 1], ['F#5', 1], ['A5', 1], ['F#5', 2, { pull: 'G5' }], ['D5', 1]],
  [['E5', 1], ['D5', 1], ['C5', 1], ['B4', 2, { ham: 'A4' }], ['A4', 1]],
  [['D5', 2, { cut: 'E5' }], ['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1]],
  [[['G5', 'E5'], 2], ['E5', 1], ['C5', 2], ['E5', 1]],
  [['G5', 1], ['F#5', 1], ['E5', 1], ['D5', 1 / 3], ['E5', 1 / 3], ['D5', 1 / 3], ['C5', 1], ['A4', 1]],
  [['D5', 3], ['A4', 1], ['B4', 1], ['C5', 1]],                             // 47 D   pickup back into bar 0
], { vel: 79 });

const lead = K.melody(0, 0, [...A, ...A1, ...B, ...B1, ...AIR, ...A3]);
lead.push(...K.chord(34, 3, ['A4', 'D5', 'F#5'], 3, 64, { staggerMs: 14 })); // 7th-fret harmonics on D-G-B
for (let b = 0; b < BARS; b += 4) K.arc(lead, b, b + 4, 6, { peak: 0.6 });
contour(lead, 0.35, 4);

// ── rhythm: steel, fingerpicked, thumb on the dotted-quarter beats ─────────────────────────────
// b root, a alternate bass, m 3rd string, u 2nd string, t/x 1st-string (or colour) notes; open strings ring.
const V = {
  Ds: { b: 50, a: 45, m: 57, u: 62, t: 64, x: 66, all: [50, 57, 62, 64] },                 // Dsus2 xx0230 → D
  D: { b: 50, a: 45, m: 57, u: 62, t: 66, x: 64, w1: 47, w2: 48, all: [50, 57, 62, 66] },   // xx0232
  Dg: { b: 50, a: 45, m: 57, u: 62, t: 66, x: 64, w2: 42, all: [50, 57, 62, 66] },          // D, thumb walks to G
  C: { b: 48, a: 43, m: 55, u: 60, t: 64, x: 62, all: [48, 52, 55, 60, 64] },               // x32010 / Cadd9
  G: { b: 43, a: 50, m: 55, u: 59, t: 67, x: 62, all: [43, 47, 50, 55, 59, 67] },           // 320003
  Em: { b: 40, a: 47, m: 55, u: 59, t: 64, x: 62, all: [40, 47, 52, 55, 59, 64] },          // 022000
  Am: { b: 45, a: 40, m: 57, u: 60, t: 64, x: 59, all: [45, 52, 57, 60, 64] },              // x02210
  Bm: { b: 47, a: 42, m: 57, u: 62, t: 66, x: 59, all: [47, 50, 57, 62, 66] },              // x20232 (Bm7)
  A: { b: 45, a: 40, m: 57, u: 61, t: 64, x: 59, all: [45, 52, 57, 61, 64] },               // x02220
};
const P = {
  arp: [[0, 'b', 3, 8], [1, 'm', 2, -6], [2, 't', 1, -3], [3, 'a', 3, 4], [4, 'm', 2, -6], [5, 'x', 1, -2]],
  arp2: [[0, 'b+t', 3, 8], [1, 'm', 1, -6], [2, 'u', 1, -4], [3, 'a', 3, 4], [4, 'm', 1, -6], [5, 'x', 1, -2]],
  brush: [[0, 'b', 3, 8], [1, 'm', 1, -8], [2, 'U3', 1, -6], [3, 'a', 3, 4], [4, 'm', 1, -8], [5, 'U3', 1, -6]],
  strum: [[0, 'D', 2, 6], [2, 'U3', 1, -8], [3, 'a', 3, 2], [3, 'D3', 2, -4], [5, 'U3', 1, -8]],
  air: [[0, 'b', 3, 4], [2, 'm+t', 3, -8], [3, 'a', 3, -2], [5, 'x', 1, -10]],
  walk: [[0, 'b', 3, 6], [1, 'm', 2, -6], [2, 't', 1, -3], [3, 'a', 1, 2], [4, 'w1', 1, 0], [5, 'w2', 1, 3]], // A-B-C → D
  walkdown: [[0, 'b', 3, 6], [1, 'm', 2, -6], [2, 't', 1, -3], [3, 'a', 2, 2], [5, 'w2', 1, 3]],             // A — F# → G
};
const progA = 'Ds | C | D | C G | Ds | C | Em Am | D!walk';
const cfg = (vel) => ({ voicings: V, patterns: P, vel });
const rhythm = [
  ...K.comp(0, progA, 'arp', cfg(68)),
  ...K.comp(8, 'Ds | C | D | C G | Ds | C | Em Am | Dg!walkdown', 'arp2', cfg(71)),
  ...K.comp(16, 'G | D | C | D | G | Bm | Em | A', 'brush', cfg(73)),
  ...K.comp(24, 'G | D | C | D | G | Bm | C | D!walk', 'strum', cfg(77)),
  ...K.comp(32, progA, 'air', cfg(62)),
  ...K.comp(40, progA, 'arp2', cfg(70)),
];
for (let b = 0; b < BARS; b += 8) K.arc(rhythm, b, b + 8, 5);

export default finish({
  id: 'menu-v1',
  title: 'The Greenwood Jig',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'D Mixolydian',
  description: 'Bright fingerstyle jig in D Mixolydian over open-string drones; a hummable hook with the flat-7th C, a lifting B part, a soft sparse "air" pass, then home.',
  sections: [
    { bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' },
    { bar: 24, name: "B'" }, { bar: 32, name: 'A (air)' }, { bar: 40, name: "A''" },
  ],
  render: { forward: 'Lead (nylon)', leadOverRhythmDb: 3, reverb: 'small hall, ~20% wet, 1.6 s', note: 'let open D/A strings ring; bar 34 beat 3 is a soft harmonics chime' },
  tracks: [
    { name: 'Lead (nylon)', role: 'lead', program: 24, channel: 0, pan: 88, volume: 100, reverb: 40, notes: lead },
    { name: 'Rhythm (steel)', role: 'rhythm', program: 25, channel: 1, pan: 40, volume: 86, reverb: 36, notes: rhythm },
  ],
}, { humanize: { ms: 6, vel: 3 } });
