// menu-v3 — "The Wanderer's Road". G major, B part in E minor, 4/4, quarter = 100.
// Form A A' B A'' — 8-bar phrases, 32 bars. Two steel guitars: a steady travis pattern (alternating thumb bass,
// pinches on the off-beats) under an ambling, syncopated pentatonic tune. Hook = bars 0-1 (G A B D—B | E G E D C);
// B turns to E minor and climbs via C and D to A5; every A ends G → D7 so the loop rolls straight back in.

import { kit, finish, contour } from '../song.mjs';

const BPM = 100, TS = [4, 4], BARS = 32;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 40, hamMs: 65, strumMs: 22 });

// ── lead: steel, the tune ──────────────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['G4', 0.5], ['A4', 0.5], ['B4', 1], ['D5', 1.5], ['B4', 0.5]],          // 0  G    the hook
  [['E5', 1], ['G5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 1]],              // 1  C    ...pushed off the beat
  [['D5', 1.5], ['B4', 0.5], ['G4', 1], ['B4', 1]],                         // 2  G
  [['A4', 1.5], ['B4', 0.5], ['A4', 2]],                                    // 3  D    half cadence
  [['G4', 0.5], ['A4', 0.5], ['B4', 1], ['D5', 1.5], ['B4', 0.5]],          // 4  G
  [['E5', 1], ['G5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 1]],              // 5  C
  [['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['C5', 1]],              // 6  C D7
  [['B4', 2], [null, 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 0.5]],          // 7  G D7 a little turn back to G
], { vel: 76 });

const A1 = K.bars("A'", [
  [['G4', 0.5], ['A4', 0.5], ['B4', 1, { ham: 'A4' }], ['D5', 1.5], ['B4', 0.5]],
  [[['E5', 'C5'], 1], ['G5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 1]],
  [['D5', 1.5, { slide: 'C#5' }], ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1]],
  [['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['F#4', 0.5], ['D4', 1], [null, 1]],
  [['G4', 0.5], ['A4', 0.5], ['B4', 1], ['D5', 1.5], ['B4', 0.5]],
  [['E5', 1], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 1]],              // 13 C    reaches up to A
  [['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['C5', 1]],
  [['B4', 2], ['D5', 0.5], ['E5', 0.5], ['F#5', 1]],                        // 15 G D  runs up into B
], { vel: 78 });

const B = K.bars('B', [
  [['G5', 1.5], ['F#5', 0.5], ['E5', 1], ['B4', 1]],                        // 16 Em
  [['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 2]],                         // 17 C
  [['D5', 1.5], ['E5', 0.5], ['D5', 1], ['B4', 1]],                         // 18 G
  [['A4', 0.5], ['B4', 0.5], ['D5', 1], ['F#5', 2]],                        // 19 D
  [['G5', 1.5], ['F#5', 0.5], ['E5', 1], ['B4', 1]],                        // 20 Em
  [['C5', 0.5], ['D5', 0.5], ['E5', 1], ['A5', 2]],                         // 21 C    the lift
  [['G5', 1], ['E5', 1], ['F#5', 1], ['D5', 1]],                            // 22 Am7 D
  [['A4', 1.5], ['B4', 0.5], ['C5', 1], ['A4', 1]],                         // 23 D7   home to G
], { vel: 81 });

const A2 = K.bars("A''", [
  [['G4', 0.5], ['A4', 0.5], ['B4', 1], ['D5', 1.5, { cut: 'E5' }], ['B4', 0.5]],
  [['E5', 1], ['G5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 1]],
  [['D5', 1.5], ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1]],
  [['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['F#4', 0.5], ['D4', 1], [null, 1]],
  [['G4', 0.5], ['A4', 0.5], ['B4', 1], [['D5', 'B4'], 1.5], ['B4', 0.5]],
  [['E5', 1], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 1]],
  [[['E5', 'C5'], 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['C5', 1]],
  [['B4', 2], [null, 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 0.5]],          // 31 G D7 → bar 0
], { vel: 78 });

const lead = K.melody(0, 0, [...A, ...A1, ...B, ...A2]);
for (let b = 0; b < BARS; b += 4) K.arc(lead, b, b + 4, 6, { peak: 0.55 });
contour(lead, 0.3, 4);

// ── rhythm: steel, travis picking — thumb b/a/c/a on the beats, fingers m/u/t between ───────────
const V = {
  G: { b: 43, a: 50, c: 47, m: 55, u: 59, t: 67 },     // 320003
  C: { b: 48, a: 52, c: 43, m: 55, u: 60, t: 64 },     // x32010, thumb C-E-G-E
  Cadd9: { b: 48, a: 52, c: 43, m: 55, u: 62, t: 67 }, // x32033
  D: { b: 50, a: 57, c: 45, m: 57, u: 62, t: 66 },     // xx0232, thumb D-A-A-A
  D7: { b: 50, a: 57, c: 45, m: 57, u: 60, t: 66 },    // xx0212
  Em: { b: 40, a: 52, c: 47, m: 55, u: 59, t: 64 },    // 022000
  Am7: { b: 45, a: 52, c: 40, m: 55, u: 60, t: 64 },   // x02010
};
const P = {
  travis: [[0, 'b', 0.9, 8], [0, 't', 1.5, 2], [1, 'a', 0.9, 0], [1.5, 'u', 1, -6], [2, 'c', 0.9, 4], [2.5, 't', 1, -4], [3, 'a', 0.9, -1], [3.5, 'u', 0.5, -7]],
  travis2: [[0, 'b', 0.9, 8], [0, 't', 1, 2], [0.5, 'm', 0.5, -9], [1, 'a', 0.9, 0], [1.5, 'u', 1, -5], [2, 'c', 0.9, 4], [2, 't', 1, -1],
    [2.5, 'm', 0.5, -9], [3, 'a', 0.9, -1], [3.5, 'u', 0.5, -6]],
};
const cfg = (vel) => ({ voicings: V, patterns: P, vel });
const rhythm = [
  ...K.comp(0, 'G | C | G | D | G | C | C D7 | G D7', 'travis', cfg(66)),
  ...K.comp(8, 'G | Cadd9 | G | D | G | C | C D7 | G D', 'travis', cfg(68)),
  ...K.comp(16, 'Em | C | G | D | Em | C | Am7 D | D7', 'travis2', cfg(72)),
  ...K.comp(24, 'G | C | G | D | G | Cadd9 | C D7 | G D7', 'travis', cfg(68)),
];
for (let b = 0; b < BARS; b += 8) K.arc(rhythm, b, b + 8, 5);

export default finish({
  id: 'menu-v3',
  title: "The Wanderer's Road",
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'G major (B part in E minor)',
  description: "Ambling 4/4 travis-picked wanderer's tune for two steel guitars: alternating thumb bass, a cheerful syncopated pentatonic melody, an E-minor B part that climbs to A5, and a G→D7 turnaround into the loop.",
  sections: [{ bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' }, { bar: 24, name: "A''" }],
  render: { forward: 'Lead (steel)', leadOverRhythmDb: 2, reverb: 'small room, ~15% wet, 1.0 s', note: 'two steels: keep the travis bass slightly palm-muted (short), pinches bright' },
  tracks: [
    { name: 'Lead (steel)', role: 'lead', program: 25, channel: 0, pan: 88, volume: 98, reverb: 30, notes: lead },
    { name: 'Rhythm (steel)', role: 'rhythm', program: 25, channel: 1, pan: 40, volume: 88, reverb: 28, notes: rhythm },
  ],
}, { humanize: { ms: 6, vel: 3 } });
