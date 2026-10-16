// relax-s1 — "Dawn Mist". D major over the open A and D strings (DADGAD-flavoured, in standard tuning), 3/4,
// quarter = 84. Form A A' B A'' — 8-bar phrases, 32 bars, 68.6 s. One nylon guitar, fingerstyle: the thumb rings
// the open A2/D3 drone (real DADGAD's low D2 lies under the guitar's E2, so A2 + D3 carry it), the tune sits on the
// top two strings with one or two inner notes between its notes, and natural harmonics chime at phrase ends.
// Hook = bars 0-1: F#4 A4 E5 | D5 — A4 — two rising leaps into the misty ninth, a sigh down to D and the open A;
// bars 2-3 answer it a step higher (G4 B4 F#5 | E5 — B4). A' ornaments it and turns through Em7 and A to land,
// deceptively, on Bm. B leaves the drone (Bm G D A | Bm G/D Em7 A7) and climbs the E string to a B5 harmonic over
// the open low E. A'' plays the hook as ringing harmonics over the drone, then a Bm-Em7-A7 turnaround leans
// A4 B4 A4 G4 into bar 0's F#4: the loop never cadences, it only comes home to the start of the tune.

import { kit, finish, contour } from '../song.mjs';

const BPM = 84, TS = [3, 4], BARS = 32;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 45, hamMs: 75, strumMs: 25 });
const NUM = TS[0];

// ── the tune, on the top two strings ───────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['F#4', 1], ['A4', 1], ['E5', 1]],                    // 0  D      the hook: two rising leaps...
  [['D5', 2], ['A4', 1]],                                // 1  D      ...and a sigh down to the open A
  [['G4', 1], ['B4', 1], ['F#5', 1]],                    // 2  G/D    the same a step higher
  [['E5', 2], ['B4', 1]],                                // 3  Em7/D
  [['F#4', 1], ['A4', 1], ['E5', 1]],                    // 4  D
  [['F#5', 2], ['D5', 1]],                               // 5  D6     the answer reaches F#
  [['E5', 1.5], ['D5', 0.5], ['B4', 1]],                 // 6  G/D
  [['A4', 2], ['G4', 1]],                                // 7  Dsus   G leans into bar 8's F# (+ harmonics)
], { vel: 86 });

const A1 = K.bars("A'", [
  [['F#4', 1], ['A4', 1], ['E5', 1, { ham: 'D5' }]],     // 8  D      hammer-on into the ninth
  [['D5', 1.5], ['B4', 0.5], ['A4', 1]],                 // 9  D
  [['G4', 1], ['B4', 1], ['F#5', 1, { cut: 'G5' }]],     // 10 G/D
  [['E5', 2], ['D5', 0.5], ['B4', 0.5]],                 // 11 Em7/D  (+ 12th-fret harmonics G4 B4)
  [['F#4', 1], ['A4', 1], ['E5', 1]],                    // 12 D
  [['F#5', 2, { ham: 'E5' }], ['D5', 1]],                // 13 D6
  [['G5', 1.5], ['F#5', 0.5], ['D5', 1]],                // 14 Em7    open low E, the first step off the drone
  [['E5', 2], ['C#5', 1]],                               // 15 A      C# rises to B's D
], { vel: 82 });

const B = K.bars('B', [
  [['D5', 1.5], ['C#5', 0.5], ['B4', 1]],                // 16 Bm     off the drone
  [['A4', 2], ['G4', 1]],                                // 17 G
  [['A4', 1], ['D5', 1], ['F#5', 1]],                    // 18 D      the hook's climb
  [['E5', 2], ['C#5', 1]],                               // 19 A
  [['B4', 1], ['C#5', 0.5], ['D5', 1.5]],                // 20 Bm     bar 16 turned upward, climbing...
  [['E5', 1], ['F#5', 1], ['G5', 0.5], ['A5', 0.5]],     // 21 G/D    ...up the E string
  [['B5', 2], ['F#5', 1]],                               // 22 Em7    7th-fret harmonics over the open low E: the peak
  [['G5', 1], ['E5', 1], ['C#5', 0.5], ['A4', 0.5]],     // 23 A7     falling back to the hook
], { vel: 84 });

const A2 = K.bars("A''", [
  [['F#4', 1], ['A4', 1], ['E5', 1]],                    // 24 D      from A4 on: harmonics, let ring
  [['D5', 2], ['A4', 1]],                                // 25 D
  [['G4', 1], ['B4', 1], ['F#5', 1]],                    // 26 G/D
  [['E5', 2], ['B4', 1]],                                // 27 Em7/D
  [['F#4', 1], ['A4', 1], ['E5', 1]],                    // 28 D      fretted again
  [['F#5', 2], ['D5', 1]],                               // 29 Bm     the turnaround: B2...
  [['E5', 1.5], ['D5', 0.5], ['B4', 1]],                 // 30 Em7    ...E2...
  [['A4', 1], ['B4', 0.5], ['A4', 0.5], ['G4', 1]],      // 31 A7sus4 ...A2, and G4 / C#4 lean into bar 0
], { vel: 81 });

const tune = K.melody(0, 0, [...A, ...A1, ...B, ...A2]);

// Bars 24-27, from A4 on, are harmonics: natural ones at the 7th and 12th frets of the treble strings, and A4
// (whose natural harmonics sit on the droning A and D strings) as a harp harmonic over a fretted A3. Each rings on
// until the next-but-one note, so two of them always overlap above the drone.
const at = (n) => n.bar * NUM + n.beat;
{
  const h = tune.filter((n) => n.bar >= 24 && n.bar < 28).sort((a, b) => at(a) - at(b));
  h.forEach((n, i) => { n.dur = (h[i + 2] ? at(h[i + 2]) : 28 * NUM) - at(n); });
}

for (let b = 0; b < BARS; b += 4) K.arc(tune, b, b + 4, 6, { peak: 0.55 });
K.ramp(tune, [[0, 0], [16, 0], [22, 5], [23.9, 2], [24, -6], [27.99, -6], [28, 0], [32, 3]]);
contour(tune, 0.3, 4);

// ── under the tune: the thumb's bass and the one or two inner notes between tune notes ─────────
// [beat, pitch, dur, vel] per bar; the drone pinches and the harmonics are added below. Played well under the
// tune: in the sampled nylon a ringing low string carries far more energy than a treble note, so the thumb stays
// near 52-58 and the inner fingers near 50 while the tune sings at 80-100 (rendered, the tune then leads by
// 5-16 dB above 500 Hz and the drone owns the bass).
const U = {
  0: [[0.5, 'A3', 1, 51], [2.5, 'B3', 0.5, 50]],
  1: [[0, 'D3', 3, 54], [1, 'A3', 1, 51], [1.5, 'E4', 1.5, 50]],
  2: [[0, 'D3', 3, 54], [0.5, 'B3', 1, 51], [1.5, 'G3', 1.5, 50]],
  3: [[0, 'D3', 3, 53], [1, 'G3', 1, 50], [1.5, 'E4', 1.5, 50]],
  4: [[0, 'D3', 2, 55], [0.5, 'A3', 1, 51], [1.5, 'D4', 1, 50], [2, 'A2', 1, 51]],
  5: [[0, 'D3', 3, 54], [0.5, 'A3', 1, 51], [1.5, 'B3', 1.5, 51]],
  6: [[0, 'D3', 3, 54], [0.5, 'B3', 1, 50], [1, 'G3', 1, 50]],
  7: [[0, 'D3', 3, 52]],
  8: [[0.5, 'A3', 1, 50], [1.5, 'D4', 0.5, 50]],
  9: [[0, 'D3', 3, 52], [1, 'A3', 1, 50], [2.5, 'E4', 0.5, 50]],
  10: [[0, 'D3', 3, 52], [0.5, 'B3', 1, 50], [1.5, 'G3', 1.5, 50]],
  11: [[0, 'D3', 3, 52]],
  12: [[0, 'D3', 2, 53], [0.5, 'A3', 1, 50], [1.5, 'D4', 1, 50], [2, 'A2', 1, 50]],
  13: [[0, 'D3', 3, 52], [0.5, 'B3', 1, 50], [1.5, 'A3', 1.5, 50]],
  14: [[0, 'E2', 3, 54], [0.5, 'G3', 1, 50], [1, 'B3', 1, 50]],
  15: [[0, 'A2', 3, 54], [0.5, 'C#4', 1, 51], [1.5, 'E4', 1, 50]],
  16: [[0, 'B2', 3, 57], [0.5, 'F#3', 1, 52], [1.5, 'D4', 1, 51]],
  17: [[0, 'G2', 3, 56], [0.5, 'B3', 1, 51], [1.5, 'D4', 1, 51]],
  18: [[0, 'D3', 2, 56], [0.5, 'A3', 1, 51], [1.5, 'E4', 1, 50], [2, 'A2', 1, 52]],
  19: [[0, 'A2', 2, 56], [0.5, 'C#4', 1, 51], [1, 'E4', 1, 50], [2, 'E3', 1, 52]],
  20: [[0, 'B2', 2, 57], [0.5, 'D4', 1, 52], [1.5, 'F#4', 0.5, 51], [2, 'F#3', 1, 52], [2.5, 'B3', 0.5, 50]],
  21: [[0, 'D3', 3, 57], [0.5, 'G3', 1, 52], [1.5, 'B3', 1, 52]],
  22: [[0, 'E2', 2, 58], [0.5, 'G3', 1, 52], [1.5, 'D4', 1, 51], [2, 'B2', 1, 53]],
  23: [[0, 'A2', 3, 56], [0.5, 'C#4', 1, 51], [1.5, 'G3', 1, 51]],
  26: [[0, 'D3', 6, 50], [0.5, 'G3', 1.5, 50]],
  28: [[0, 'D3', 3, 53], [0.5, 'A3', 1, 50], [1.5, 'D4', 1, 50]],
  29: [[0, 'B2', 3, 54], [0.5, 'F#3', 1, 51], [1.5, 'B3', 1, 50]],
  30: [[0, 'E2', 3, 53], [0.5, 'G3', 1, 50], [1, 'B3', 1, 50], [2.5, 'D4', 0.5, 50]],
  31: [[0, 'A2', 3, 53], [0.5, 'E4', 1, 50], [1.5, 'D4', 1, 50], [2.5, 'C#4', 0.5, 51]],
};
const under = [];
for (const [bar, items] of Object.entries(U)) for (const [beat, p, dur, vel] of items) under.push(...K.note(Number(bar), beat, p, dur, vel));

// the thumb brushing both open bass strings, A2 then D3, at the head of each A
const drone = (bar, dur, vel) => under.push(...K.chord(bar, 0, ['A2', 'D3'], dur, vel, { staggerMs: 16 }));
drone(0, 3, 56);
drone(8, 3, 54);
drone(24, 6, 52);   // rings through bar 25 under the harmonics

for (let b = 0; b < BARS; b += 8) K.arc(under, b, b + 8, 2, { peak: 0.6 });
K.ramp(under, [[0, 0], [16, 0], [22, 3], [24, 0]]);

// natural harmonics, plucked a hair apart: soft bells, but above the inner notes
const chime = (bar, beat, ps, dur, vel) => under.push(...K.chord(bar, beat, ps, dur, vel, { staggerMs: 28 }));
chime(7, 1, ['D5', 'F#5'], 2, 64);     // 7th fret, G and B strings
chime(11, 1, ['G4', 'B4'], 1.5, 62);   // 12th fret, G and B strings
chime(27, 1, ['G4'], 2, 62);           // 12th fret, G string

export default finish({
  id: 'relax-s1',
  title: 'Dawn Mist',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'D major',
  description: 'A slow, wistful 3/4 air for one nylon guitar over ringing open A and D strings: a rising-leap hook on the top strings, a B part that leaves the drone for Bm and G and climbs to a high harmonic, and a misty return played in harmonics.',
  sections: [{ bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' }, { bar: 24, name: "A''" }],
  render: {
    forward: 'Guitar (nylon)',
    leadOverRhythmDb: 0,
    reverb: 'misty hall, ~26% wet, 2.6 s',
    note: 'solo fingerstyle, the tune well over the thumb and inner notes as written; let the open A/D bass ring; harmonics bell-like: soft chimes in bars 7, 11 and 27, the hook in harmonics in bars 24-27, the B5/F#5 peak of bar 22 bright',
  },
  tracks: [
    { name: 'Guitar (nylon)', role: 'lead', program: 24, channel: 0, pan: 64, volume: 100, reverb: 60, notes: [...tune, ...under] },
  ],
}, { humanize: { ms: 7, vel: 3 }, velLo: 50, velHi: 105 });
