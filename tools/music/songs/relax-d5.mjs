// relax-d5 — "Mist on the Barrows". B minor (Aeolian); its raised 6th, G#, only at the cadences. 4/4, quarter = 66.
// Form A A' B A'' in 4-bar phrases (16 slow beats each, as long as 8 bars at double time), B stretched to 6 bars by a
// deceptive turn: 18 bars, 65.5 s. A nylon guitar rolls low, ringing arpeggios (Bm9, Gmaj7, Em7, F#m7); a steel lead
// sings high and sparse, long notes and rests. Hook = bars 0-1 (B4 F#5— E5 D5 | E5— D5 B4—): an open fifth up, a
// slow fall home. Each cadence rolls E(add9) and its G# climbs to A in both guitars (G#4 A4 → B4 at the loop point).
// B lifts the hook a third into D and G, peaks on B5, slips onto G instead of home, and Em7 brightens to E on the
// way back.

import { kit, finish, contour } from '../song.mjs';

const BPM = 66, TS = [4, 4], BARS = 18;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 45, hamMs: 80, strumMs: 26 });

// ── lead: steel, the tune ──────────────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['B4', 1], ['F#5', 2, { acc: 4 }], ['E5', 0.5], ['D5', 0.5]],       // 0  Bm9    the hook: an open fifth up...
  [['E5', 1.5], ['D5', 0.5], ['B4', 1.5], [null, 0.5]],                // 1  Gmaj7  ...and a slow fall home
  [['G5', 1.5], ['F#5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['D5', 1]],   // 2  Em7    the answer reaches up, turns
  [['C#5', 2.5], [null, 1.5]],                                         // 3  F#m7   open half close, then mist
], { vel: 66 });

const A1 = K.bars("A'", [
  [['B4', 1], ['F#5', 2, { slide: 'E5', acc: 6 }], ['E5', 0.5], ['D5', 0.5]], // 4  Bm9  slid into the fifth
  [['E5', 1.5], ['D5', 0.5], ['B4', 1], ['D5', 1]],                    // 5  Gmaj7
  [['F#5', 1], ['A5', 1.5], ['G5', 0.5], ['F#5', 1]],                  // 6  D      the answer climbs higher
  [['E5', 1, { acc: -4 }], ['C#5', 1], ['G#4', 1], ['B4', 0.5], ['C#5', 0.5]], // 7  F#m7 E(add9)  the G#, up into D
], { vel: 70 });

const B = K.bars('B', [
  [['D5', 1], [['A5', 'D5'], 2], ['G5', 0.5], ['F#5', 0.5]],           // 8  D      the hook lifted a third, its fifth as a chord
  [['G5', 1.5], ['F#5', 0.5], ['D5', 1.5], [null, 0.5]],               // 9  G
  [['E5', 1, { acc: -6 }], ['F#5', 1, { acc: -1 }], ['A5', 2, { acc: 1 }]], // 10 D/F#  climbing
  [['B5', 1.5, { acc: 2 }], ['A5', 0.5], ['G5', 1], ['E5', 1]],        // 11 Em7 A  the peak; A wants home...
], { vel: 72 });

const B2 = K.bars("B (tail)", [
  [['D5', 2.5], [null, 1.5]],                                          // 12 Gmaj7  ...but slips onto G: mist
  [['E5', 1], ['D5', 0.5], ['B4', 0.5], ['G#4', 1], ['A4', 1]],        // 13 Em7 E(add9)  G turns G#, rising home
], { vel: 67 });

const A2 = K.bars("A''", [
  [['B4', 1], [['F#5', 'D5'], 2, { acc: 4 }], ['E5', 0.5], ['D5', 0.5]], // 14 Bm7    the hook in thirds, warmer
  [['E5', 1.5], ['D5', 0.5], ['B4', 1.5], [null, 0.5]],                // 15 Gmaj7
  [['G5', 2], ['F#5', 1], ['E5', 1]],                                  // 16 Em7
  [['C#5', 1.5], ['B4', 0.5], ['G#4', 1], ['A4', 1]],                  // 17 F#m7 E(add9) → the hook (bar 0)
], { vel: 64 });

const lead = K.melody(0, 0, [...A, ...A1, ...B, ...B2, ...A2]);
K.arc(lead, 0, 4, 6, { peak: 0.35 });
K.arc(lead, 4, 8, 7, { peak: 0.55 });
K.arc(lead, 8, 12, 9, { peak: 0.8 });   // the climb to bar 11's B5
K.arc(lead, 14, 18, 5, { peak: 0.35 });
contour(lead, 0.35, 4);

// ── rhythm: nylon, low ringing arpeggios (thumb b/a, fingers on n[0..3]) ───────────────────────
const V = {
  Bm9: { b: 47, a: 42, n: [50, 57, 61, 66] },                                 // 220222  F#2 B2 D3 A3 C#4 F#4
  Bm7: { b: 47, a: 42, n: [50, 57, 59, 66] },                                 // 220202  the open B for the C#
  Gmaj7: { b: 43, a: 47, n: [50, 55, 59, 66], all: [43, 47, 50, 55, 59, 66] }, // 320002
  Em7: { b: 40, a: 47, n: [52, 55, 62, 64] },                                 // 022030
  Fm7: { b: 42, a: 49, n: [52, 57, 61, 64] },                                 // 242220  F#m7, open E on top
  D: { b: 50, a: 45, n: [57, 62, 66] },                                       // x00232
  G: { b: 43, a: 50, n: [55, 59, 67] },                                       // 320003
  DF: { b: 42, a: 50, n: [57, 62, 66] },                                      // 2x0232  D/F#
  A: { b: 45, a: 40, n: [52, 57, 61, 64] },                                   // x02220
};
const P = {
  // a slow roll up from the thumb, left to ring; n[2] lifts on the fourth beat so the hook's passing D5 meets no C#4
  mist: [[0, 'b', 3, 6], [0.5, '1', 3.5, -3], [1, '2', 3, -2], [1.5, '3', 1.5, -1], [2, '4', 2, 0], [3, 'a', 1, -2]],
  // eighths, up and back; the second half rocks low (alternate bass, n[1], n[0]) under the lead
  flow: [[0, 'b', 2, 6], [0.5, '1', 1.5, -4], [1, '2', 1.5, -3], [1.5, '3', 1, -2], [2, 'a', 2, 2], [2.5, '2', 1.5, -4], [3, '1', 1, -4], [3.5, '2', 0.5, -5]],
  lift: [[0, 'b', 2, 6], [0.5, '1', 1.5, -4], [1, '2', 1.5, -3], [1.5, '3', 1.5, -1], [2, 'a', 2, 3], [2.5, '2', 1.5, -3], [3, '3', 1, -2], [3.5, '1', 0.5, -4]],
  bloom: [[0, 'D', 2, 4], [2, 'a', 2, 2], [2.5, '2', 1.5, -4], [3, '1', 1, -4], [3.5, '3', 0.5, -4]], // rolled chord, then a few notes
  half: [[0, 'b', 2, 6], [0.5, '1', 1.5, -4], [1, '2', 1, -3], [1.5, '3', 0.5, -2]],                  // third and fourth beats: the cadence
};

// The cadence: E(add9) (024100) rolled on the third beat, its G# hammered up to A on the fourth as the lead climbs G# A → B.
function cadence(bar, vel) {
  const st = K.ms(30), out = [];
  [40, 47, 54, 56, 59, 64].forEach((p, i) => {
    const at = 2 + i * st;
    out.push(...K.note(bar, at, p, (p === 56 ? 3 : 4) - at, vel - i + (p === 56 ? 3 : 0)));
  });
  out.push(...K.note(bar, 3, 57, 1, vel - 7)); // the hammer-on, G string fret 1 → 2
  return out;
}

const cfg = (vel, x = {}) => ({ voicings: V, patterns: P, vel, ...x });
const rhythm = [
  ...K.comp(0, 'Bm9 | Gmaj7 | Em7 | Fm7', 'mist', cfg(61)),
  ...K.comp(4, 'Bm9 | Gmaj7 | D | Fm7!half', 'flow', cfg(63)),
  ...cadence(7, 68),
  ...K.comp(8, 'D!bloom | G | DF | Em7 A', 'lift', cfg(66, { strumMs: 32 })),
  ...K.comp(12, 'Gmaj7!bloom | Em7!half', 'lift', cfg(63, { strumMs: 36 })),
  ...cadence(13, 66),
  ...K.comp(14, 'Bm7!bloom | Gmaj7 | Em7 | Fm7!half', 'mist', cfg(60, { strumMs: 32 })),
  ...cadence(17, 63),
];
K.arc(rhythm, 0, 4, 4);
K.arc(rhythm, 4, 8, 5);
K.arc(rhythm, 8, 14, 7, { peak: 0.55 });
K.arc(rhythm, 14, 18, 4, { peak: 0.5 });

export default finish({
  id: 'relax-d5',
  title: 'Mist on the Barrows',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'B Aeolian, G# at the cadences',
  description: 'Slow, hushed 4/4 air in B minor for nylon and steel: low ringing arpeggios under a sparse, high steel tune that leaps a fifth and sinks back, every cadence brightened by a G# rising to A, and a B part that lifts the hook into D and G.',
  sections: [{ bar: 0, name: 'A' }, { bar: 4, name: "A'" }, { bar: 8, name: 'B' }, { bar: 14, name: "A''" }],
  render: { forward: 'Lead (steel)', leadOverRhythmDb: 3, reverb: 'dark misty hall, ~30% wet, 2.6 s', note: 'steel lead distant and singing, nylon arpeggios soft and blurred; the rolled E(add9) chords (bars 7, 13, 17, third beat) should bloom, the G#-A hammer-ons stay quiet' },
  tracks: [
    { name: 'Lead (steel)', role: 'lead', program: 25, channel: 0, pan: 86, volume: 100, reverb: 66, notes: lead },
    { name: 'Rhythm (nylon)', role: 'rhythm', program: 24, channel: 1, pan: 42, volume: 86, reverb: 50, notes: rhythm },
  ],
}, { humanize: { ms: 8, vel: 3 }, velLo: 55, velHi: 104 });
