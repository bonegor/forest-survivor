// relax-d3 — "Hearthward" (the long road home). G major, the B part through E minor and C, 4/4, quarter = 84.
// Form A A' B — 8-bar phrases, 24 bars, 68.6 s; the loop itself is the A'' (B walks home, the hook arrives).
// Two steel guitars, a slow travis duet. In A the thumb keeps a G–D pedal (6th and 4th strings) under
// Cadd9/G, G6 and Am7/G; in B the bass moves (Em7 C G D) while D and G ring on the top strings.
// Hook = bars 0-1 (B~ A G | E——— D): the B hammered up from a blue A#, falling home to G, then a sixth's
// leap to a long E that the tune walks down from. A' adds thirds and sixths, slides from below and a
// Mixolydian F (F/G); B turns the hook to E minor (E D B | G———), climbs to a B5 flicked up from A# like the
// hook, then walks home C → Cm6 → G/B → Am7 → D7; every phrase steps into the hook the same way (G A → A#~B).

import { kit, finish, contour } from '../song.mjs';

const BPM = 84, TS = [4, 4], BARS = 24;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 45, hamMs: 85, strumMs: 26 });

// ── lead: steel, the tune ──────────────────────────────────────────────────────────────────────
const blue = { ham: 'A#4', acc: 4 }; // the blue third, hammered up to B

const A = K.bars('A', [
  [['B4', 2, blue], ['A4', 1], ['G4', 1]],                                         // 0  G        the hook: home...
  [['E5', 3], ['D5', 1]],                                                          // 1  Cadd9/G  ...and a sixth's reach
  [['C5', 1.5], ['B4', 0.5], ['A4', 1], ['B4', 1]],                                // 2  G6       walks down
  [['A4', 3], ['G4', 0.5], ['A4', 0.5]],                                           // 3  Am7/G D/F#  half cadence
  [['B4', 1.5, blue], ['A4', 0.5], ['G4', 1], ['B4', 1]],                          // 4  G
  [['G5', 3], ['E5', 1]],                                                          // 5  Cadd9/G  reaches higher
  [['D5', 1.5], ['E5', 0.5], ['D5', 1], ['C5', 1]],                                // 6  Am7 D7
  [['B4', 2], ['A4', 1], ['G4', 0.5], ['A4', 0.5]],                                // 7  G
], { vel: 70 });

const A1 = K.bars("A'", [
  [[['B4', 'G4'], 2, blue], ['A4', 1], ['G4', 1]],                                 // 8  G        in thirds
  [[['E5', 'G4'], 3], ['D5', 1, { slide: 'C#5' }]],                                // 9  Cadd9/G  a sixth
  [['E5', 1.5, { slide: 'D#5' }], ['D5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 1]], // 10 G6
  [['A4', 2], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 0.5]],                 // 11 Am7/G D/F#
  [['B4', 1.5, blue], ['A4', 0.5], ['G4', 1], ['E5', 1]],                          // 12 G
  [['A5', 2], ['G5', 1], ['F5', 1]],                                               // 13 F/G      the Mixolydian F
  [['E5', 1.5], ['D5', 0.5], ['C5', 1], ['A4', 1]],                                // 14 Am7 D7
  [['B4', 1.5], ['D5', 0.5], ['F#5', 1], ['D#5', 1]],                              // 15 G B7     leans into E minor
], { vel: 68 });

const B = K.bars('B', [
  [['E5', 2], ['D5', 1], ['B4', 1]],                                               // 16 Em7      the hook in E minor...
  [['G5', 3, { slide: 'F#5' }], ['E5', 1]],                                        // 17 Cadd9    ...and its leap
  [['D5', 2], ['B4', 1], ['D5', 1]],                                               // 18 G        (+ harmonics chime)
  [['E5', 2], ['F#5', 1], ['A5', 1]],                                              // 19 Dsus4 D
  [['B5', 3, { cut: 'A#5' }], ['A5', 0.5], ['G5', 0.5]],                           // 20 Em7      the peak
  [['A5', 2], ['G5', 1], ['Eb5', 1]],                                              // 21 Cadd9 Cm6  the borrowed minor iv
  [['D5', 2], ['C5', 1], ['B4', 1]],                                               // 22 G/B Am7
  [['A4', 3], ['G4', 0.5], ['A4', 0.5]],                                           // 23 D7sus4 D7 → bar 0
], { vel: 72 });

const lead = K.melody(0, 0, [...A, ...A1, ...B]);
for (const [from, peak] of [[0, 0.3], [4, 0.35], [8, 0.3], [12, 0.85]]) K.arc(lead, from, from + 4, 5, { peak });
K.arc(lead, 16, 24, 9, { peak: 0.5 });                                             // B swells to the B5 and back
K.ramp(lead, [[0, 0], [8, -2], [12, -1], [15.9, 3], [16, 0]]);
contour(lead, 0.3, 4);

// ── rhythm: steel, travis picking — thumb on every beat, fingers on the "and"s ─────────────────
// b root, a alternate bass, c bass on beat 3 (through A the thumb stays on G and D), m/u/t 3rd/2nd/1st strings.
const V = {
  G:    { b: 43, a: 50, c: 43, m: 55, u: 59, t: 67 },                                 // 320003
  C9G:  { b: 43, a: 50, c: 43, m: 55, u: 60, t: 64 },                                 // 3x0010  Cadd9/G
  G6:   { b: 43, a: 50, c: 43, m: 55, u: 59, t: 64 },                                 // 3x0000  G6 (Em7/G)
  Am7G: { b: 43, a: 50, c: 43, m: 57, u: 60, t: 64 },                                 // 3x0210  Am7/G
  FG:   { b: 43, a: 53, c: 43, m: 57, u: 60, t: 65 },                                 // 3x3211  F/G
  DF:   { b: 42, a: 50, c: 42, m: 57, u: 62, t: 66 },                                 // 2x0232  D/F#
  Am7:  { b: 45, a: 52, c: 45, m: 55, u: 60, t: 64 },                                 // x02010
  D7:   { b: 50, a: 42, c: 50, m: 57, u: 60, t: 66 },                                 // 2x0212  thumb D, then F# up to G
  D7a:  { b: 50, a: 45, c: 50, m: 57, u: 60, t: 66 },                                 // x00212  D7, thumb D-A
  B7:   { b: 47, a: 42, c: 47, m: 57, u: 59, t: 66 },                                 // 2x1202  B7, F# under it
  Em7:  { b: 40, a: 52, c: 47, m: 55, u: 62, t: 67, all: [40, 47, 52, 55, 62, 67] }, // 022033
  C9:   { b: 48, a: 52, c: 48, m: 55, u: 62, t: 67 },                                 // x32033  Cadd9
  Gd:   { b: 43, a: 50, c: 47, m: 55, u: 62, t: 67 },                                 // 320033
  Ds4:  { b: 50, a: 45, c: 50, m: 57, u: 62, t: 67 },                                 // x00233  Dsus4
  D:    { b: 50, a: 45, c: 50, m: 57, u: 62, t: 66 },                                 // x00232
  Cm6:  { b: 48, a: 51, c: 48, m: 57, u: 60, t: 67 },                                 // x31213  Cm6
  GB:   { b: 47, a: 50, c: 47, m: 55, u: 62, t: 67 },                                 // x20033  G/B
  Am7g: { b: 45, a: 52, c: 45, m: 55, u: 60, t: 67 },                                 // x02013  Am7, G on top
  D7s4: { b: 50, a: 45, c: 50, m: 57, u: 60, t: 67 },                                 // x00213  D7sus4
};
const P = {
  // root, alternate, root, alternate; one finger on the "and" of 2, a two-finger pinch on the "and" of 4
  walk: [[0, 'b+t', 2, 5], [1, 'a', 2, -1], [1.5, 'u', 1.5, -7], [2, 'c', 2, 2], [3, 'a', 1, -2], [3.5, 'm+u', 0.5, -6]],
  // the same, with the beat-3 bass stopped before the lead's pickup
  walkH: [[0, 'b+t', 2, 5], [1, 'a', 2, -1], [1.5, 'u', 1.5, -7], [2, 'c', 0.9, 2], [3, 'a', 1, -2], [3.5, 'm+u', 0.5, -6]],
  // fuller: a finger on every "and"
  roll: [[0, 'b+t', 2, 6], [0.5, 'm', 1, -8], [1, 'a', 2, -1], [1.5, 'u', 1.5, -6], [2, 'c', 2, 3], [2.5, 't', 1, -6], [3, 'a', 1, -2], [3.5, 'm+u', 0.5, -6]],
  // half cadence under the held lead note: no 1st-string note against the pickup
  half: [[0, 'b+t', 2, 6], [0.5, 'm', 1, -8], [1, 'a', 2, -1], [1.5, 'u', 1.5, -6], [2, 'c', 0.9, 3], [2.5, 'm', 1, -7], [3, 'a', 1, -2], [3.5, 'u', 0.5, -6]],
  // the last bar: root and 1st string pinched on the change to D7 (the F#), stopped before the pickup
  turn: [[0, 'b+t', 2, 6], [0.5, 'm', 1, -8], [1, 'a', 2, -1], [1.5, 'u', 1.5, -6], [2, 'c+t', 0.9, 3], [2.5, 'm', 1, -7], [3, 'a', 1, -2], [3.5, 'u', 0.5, -6]],
  // B: the top-string pinch (D and G) on the "and"s; liftS opens the phrase with a slow down-strum
  lift: [[0, 'b+t', 2, 7], [0.5, 'm', 1, -8], [1, 'a', 2, 0], [1.5, 'u+t', 1.5, -5], [2, 'c', 2, 3], [2.5, 'm', 1, -7], [3, 'a', 1, -1], [3.5, 'u+t', 0.5, -5]],
  liftS: [[0, 'D', 2, 3], [1, 'a', 2, 0], [1.5, 'u+t', 1.5, -5], [2, 'c', 2, 3], [2.5, 'm', 1, -7], [3, 'a', 1, -1], [3.5, 'u+t', 0.5, -5]],
  chime: [[0, 'b+t', 2, 6], [0.5, 'm', 1, -8], [1, 'a', 2, 0], [2, 'c', 2, 2], [3, 'a', 1, -2]], // fingers left to the chime
};
const cfg = (vel) => ({ voicings: V, patterns: P, vel });
const rhythm = [
  ...K.comp(0, 'G | C9G | G6 | Am7G@0 DF@2!half | G | C9G | Am7@0 D7@2 | G', 'walk', cfg(64)),
  ...K.comp(8, 'G | C9G | G6!walk | Am7G@0 DF@2!walkH | G | FG | Am7@0 D7@2 | G@0 B7@2', 'roll', cfg(64)),
  ...K.comp(16, 'Em7!liftS | C9 | Gd!chime | Ds4@0 D@2 | Em7!liftS | C9@0 Cm6@2 | GB@0 Am7g@2 | D7s4@0 D7a@2!turn', 'lift', cfg(65)),
];
// 12th-fret harmonics (D, G, B strings) while the lead rests on D5
rhythm.push(...K.chord(18, 1.5, ['D4', 'G4', 'B4'], 2.5, 63, { staggerMs: 20 }));
for (let b = 0; b < 16; b += 4) K.arc(rhythm, b, b + 4, 4, { peak: 0.6 });
K.arc(rhythm, 16, 24, 7, { peak: 0.5 });
K.ramp(rhythm, [[0, 0], [12, 0], [15.9, 3], [16, 1]]);

export default finish({
  id: 'relax-d3',
  title: 'Hearthward',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'G major (B part through E minor and C)',
  description: 'A slow 4/4 travis duet for two steel guitars: the thumb keeps a G–D pedal under a nostalgic, hummable tune that falls home from a blue A#→B hammer-on and leaps a sixth, a varied repeat with a Mixolydian F, and a B part that lifts through Em and C to a high B5 before walking home by way of Cm6 and D7.',
  sections: [{ bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' }],
  render: {
    forward: 'Lead (steel)',
    leadOverRhythmDb: 3,
    reverb: 'warm hall, ~22% wet, 2.0 s',
    note: 'two steels, fingerstyle: let the thumb ring (not palm-muted); in B the D/G pinches on the top strings shimmer; bar 18 beat 2.5 is a soft harmonics chime',
  },
  tracks: [
    { name: 'Lead (steel)', role: 'lead', program: 25, channel: 0, pan: 88, volume: 100, reverb: 46, notes: lead },
    { name: 'Rhythm (steel)', role: 'rhythm', program: 25, channel: 1, pan: 40, volume: 86, reverb: 42, notes: rhythm },
  ],
}, { humanize: { ms: 7, vel: 3 } });
