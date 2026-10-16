// relax-s3 — "Moonlit Glade". G Lydian (the C# shimmer), B part in plain G major, 4/4, quarter = 84.
// Form A B A' — 8-bar phrases, 24 bars (68.6 s); looping, A' runs straight back into A as its varied repeat.
// One steel-string guitar, fingerpicked: the thumb on the strong beats (root, then the alternate bass), the
// fingers rolling slow broken chords (Gmaj7, A/G, Bm7, Em9) with the tune riding on top of them.
// Hook = bars 0-1: D5 B4 F#4 — falling down the Gmaj7 — then A4 B4 C#5, climbing onto the Lydian C# over A/G,
// which resolves up to D over Bm7. B swaps the C# for C natural (the same climb lands on C5 over Cmaj7),
// lifts to F#5 over D and settles on plain G; its last eighth (C#5) brings the Lydian back. The loop seam
// is the shimmer once more: C#5 over A/G leaning into the D5 that starts bar 0.

import { kit, finish, contour } from '../song.mjs';

const BPM = 84, TS = [4, 4], BARS = 24;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 45, hamMs: 95, strumMs: 26 });

// ── the tune: top voice, plucked with a / m above the arpeggio ────────────────────────────────
const A = K.bars('A', [
  [['D5', 1.5], ['B4', 0.5], ['F#4', 2]],                    // 0  Gmaj7  the hook: down the chord...
  [['A4', 1], ['B4', 1], ['C#5', 2]],                        // 1  A/G    ...and up onto the C#
  [['D5', 2], ['C#5', 1], ['B4', 1]],                        // 2  Bm7    C# resolves to D, then sighs
  [['A4', 1.5], ['G4', 0.5], ['F#4', 2]],                    // 3  Em9    open end on the 9th
  [['D5', 1.5], ['B4', 0.5], ['F#4', 2]],                    // 4  Gmaj7  hook again
  [['A4', 1], ['C#5', 1], ['E5', 2]],                        // 5  A      reaches higher (up the A chord)
  [['D5', 1], ['C#5', 1], ['A4', 2]],                        // 6  Dmaj7  D, then the C# as its 7th
  [['B4', 2], ['F#4', 1], ['A4', 0.5], ['B4', 0.5]],         // 7  Bm7    F# A B... (climb into B)
], { vel: 80 });

const B = K.bars('B', [
  [['C5', 2], ['B4', 0.5], ['C5', 0.5], ['E5', 1]],          // 8  Cmaj7  ...lands on C natural: plain major
  [['D5', 2], ['B4', 1], ['G4', 1]],                         // 9  G/B
  [['A4', 1], ['C5', 1], ['E5', 1.5], ['D5', 0.5]],          // 10 Am7    the lift, up the Am7
  [['F#5', 2], ['E5', 1], ['D5', 1]],                        // 11 D      the peak
  [['E5', 1.5], ['D5', 0.5], ['B4', 2]],                     // 12 Em7    the hook's fall, in G major
  [['C5', 1], ['D5', 1], ['E5', 2]],                         // 13 Cmaj7  the hook's climb, with C natural
  [['C5', 1.5], ['B4', 0.5], ['A4', 2]],                     // 14 Am7 D
  [['G4', 2], ['A4', 1], ['B4', 0.5], ['C#5', 0.5]],         // 15 G      settles; the C# returns on the way out
], { vel: 82 });

const A1 = K.bars("A'", [
  [['D5', 1.5], ['B4', 0.5], ['F#4', 2]],                    // 16 Gmaj7
  [['A4', 1], ['B4', 1], [['C#5', 'A4'], 2]],                // 17 A/G    the C# in thirds
  [['D5', 2, { ham: 'C#5' }], ['C#5', 1], ['B4', 1]],        // 18 Bm7
  [['A4', 1], ['B4', 0.5], ['A4', 0.5], ['F#4', 2]],         // 19 Em9
  [['D5', 1], ['C#5', 0.5], ['B4', 0.5], ['F#4', 2]],        // 20 Gmaj7  the fall, with the C# passing
  [['A4', 1], ['B4', 1], ['C#5', 1], ['E5', 1]],             // 21 A/G    climbs past the C#
  [['F#5', 2, { slide: 'E5' }], ['E5', 1], ['B4', 1]],       // 22 Em9    A's own small peak
  [['C#5', 2], ['B4', 1], ['C#5', 1]],                       // 23 A/G    the shimmer, leaning into bar 0's D5
], { vel: 76 });

const tune = K.melody(0, 0, [...A, ...B, ...A1]);
for (let b = 0; b < BARS; b += 4) K.arc(tune, b, b + 4, 6, { peak: 0.6 });
K.ramp(tune, [[0, 0], [8, 0], [11, 6], [12, 3], [15, -4], [16, -3], [21.5, 4], [23, -2], [24, -3]]);
contour(tune, 0.35, 4);
// bar 8: the melody note is the top string of the rolled Cmaj7 under it
for (const n of tune) if (n.bar === 8 && n.beat === 0) { n.beat = +(K.ms(4 * 26)).toFixed(6); n.dur = +(n.dur - n.beat).toFixed(6); }

// ── the arpeggio: thumb b (root) / a (alternate bass), fingers on n[0..2] (roles '1'..'3') ─────
// Open-position shapes; every inner note stays under the tune.
const V = {
  'Gmaj7': { b: 43, a: 50, n: [50, 54, 59] },   // 3544xx: G2 | D3 F#3 B3, the maj7 inside the arpeggio, thumb to D3
  'A/G': { b: 43, a: 45, n: [52, 57, 61] },     // 3x222x: G2 | E3 A3 C#4, thumb up to open A2 (G-A-B into Bm7)
  'Bm7': { b: 47, a: 54, n: [57, 62, 66] },     // 7th-position barre 7-9-7-7-7: B2 | A3 D4 F#4, thumb to F#3
  'Em9': { b: 40, a: 47, n: [50, 55, 59] },     // 02x000: E2 | open D3 G3 B3 (the tune adds the F#), thumb to B2
  'A': { b: 45, a: 40, n: [52, 57, 61] },       // x0222x: A2 | E3 A3 C#4, thumb to E2
  'Dmaj7': { b: 50, a: 45, n: [57, 61, 66] },   // xx0222: D3 | A3 C#4 F#4, thumb to A2
  'Cmaj7': { b: 48, a: 52, n: [55, 59, 64] },   // 8th position over open G/B: C3 | G3 B3 E4, thumb to E3
  'G/B': { b: 47, a: 50, n: [55, 59, 62] },     // x20030: B2 | G3 B3 D4, thumb to D3
  'Am7': { b: 45, a: 40, n: [55, 60, 64] },     // x0x010: A2 | G3 C4 E4, thumb to E2
  'D': { b: 50, a: 45, n: [57, 62, 66] },       // xx0232: D3 | A3 D4 F#4, thumb to A2
  'Em7': { b: 40, a: 47, n: [55, 59, 62] },     // 022000-ish: E2 | G3 B3 D4, thumb to B2
  'G': { b: 43, a: 50, n: [55, 59, 62] },       // 3x0003-ish: G2 | G3 B3 D4, plain G
};
// [beat, roles, dur, velAdd]. Inner notes ring one beat, so thumb + two fingers + the tune = four at most.
const P = {
  flow: [[0, 'b', 2, 10], [0.5, '1', 1, -2], [1, '2', 1, 0], [1.5, '3', 1, 1], [2, 'a', 2, 6], [2.5, '2', 1, -2], [3, '3', 1, 0], [3.5, '2', 1, -4]],
  lift: [[0, 'b', 2, 10], [0.5, '1', 1, -2], [1, '2', 1, 0], [1.5, '3', 1, 2], [2, 'a', 2, 6], [2.5, '1', 1, -2], [3, '2', 1, 0], [3.5, '3', 1, 2]],
  roll: [[0, 'D', 2, 4], [2, 'a', 2, 6], [2.5, '1', 1, -2], [3, '2', 1, 0], [3.5, '3', 1, 2]],
  flow2: [[0, 'b', 2, 9], [0.5, '2', 1, -2], [1, '1', 1, -1], [1.5, '3', 1, 1], [2, 'a', 2, 5], [2.5, '2', 1, -2], [3, '3', 1, 0], [3.5, '1', 1, -3]],
  thirds: [[0, 'b', 2, 9], [0.5, '2', 1, -2], [1, '1', 1, -1], [1.5, '3', 1, 1], [2, 'a', 2, 5], [3, '1', 1, -3]], // room for the double stop
};
const cfg = (vel) => ({ voicings: V, patterns: P, vel });
const arps = [
  ...K.comp(0, 'Gmaj7 | A/G | Bm7 | Em9 | Gmaj7 | A | Dmaj7 | Bm7', 'flow', cfg(58)),
  ...K.comp(8, 'Cmaj7!roll | G/B | Am7 | D | Em7 | Cmaj7 | Am7 D | G', 'lift', cfg(60)),
  ...K.comp(16, 'Gmaj7 | A/G!thirds | Bm7 | Em9 | Gmaj7 | A/G | Em9 | A/G', 'flow2', cfg(56)),
];
for (let b = 0; b < BARS; b += 8) K.arc(arps, b, b + 8, 4, { peak: 0.6 });

export default finish({
  id: 'relax-s3',
  title: 'Moonlit Glade',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'G Lydian (B part in G major)',
  description: 'A slow fingerpicked steel-string piece in G Lydian, with a tune rising out of broken Gmaj7, A/G, Bm7 and Em9 chords onto the shimmering C#, a B part that lifts and settles into plain G major, and a seam that leans C# into D.',
  sections: [{ bar: 0, name: 'A' }, { bar: 8, name: 'B' }, { bar: 16, name: "A'" }],
  render: { forward: 'Guitar (steel)', leadOverRhythmDb: 0, reverb: 'warm hall, ~26% wet, 2.3 s', note: 'solo steel-string: keep the arpeggio soft and blurred under the tune; bar 8 opens with a slow rolled Cmaj7' },
  tracks: [
    { name: 'Guitar (steel)', role: 'lead', program: 25, channel: 0, pan: 64, volume: 100, reverb: 52, notes: [...tune, ...arps] },
  ],
}, { humanize: { ms: 7, vel: 3 }, velLo: 55, velHi: 104 });
