// relax-d1 — "Two Voices by the Brook". A minor (natural / Aeolian; a Dorian F# only at the B part's lift), 4/4,
// quarter = 72. Form A A' B A'' in 20 slow bars (66.7 s): A + A' are one 8-bar period (4 + 4), B is 8 bars (call
// and answer, then the lift), A'' is 4 bars that hand the tune to the low voice. Two nylon guitars in call and
// response: the second guitar ripples in soft p-i-m-a arpeggios (the brook) and answers the lead a tenth below;
// the lead sings long notes with small ornaments. Hook = bars 0-1 (A B C E— | F—. E C—): a rise to a long E, then
// the Aeolian sigh F-E over Fmaj7; bars 2-3 sequence it a third up. B turns to C major: the lead calls with the
// hook's contour turned over (G— E C | D—. E G—) and the second guitar answers the same phrase a tenth below; the
// lead climbs over F and G to D/F# (the one bright Dorian chord) and sighs back through Em(add9). In A'' the low
// voice sings the hook itself; the lead answers with the sequence and steps down C-B into bar 0.

import { kit, finish, contour } from '../song.mjs';

const BPM = 72, TS = [4, 4], BARS = 20;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 45, hamMs: 85, strumMs: 25 });

// ── lead: nylon, the singing voice ─────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['A4', 1], ['B4', 0.5], ['C5', 0.5], ['E5', 2]],                        // 0  Am     the hook: a rise to a long E...
  [['F5', 1.5], ['E5', 0.5], ['C5', 2]],                                   // 1  Fmaj7  ...and the sigh F-E
  [['C5', 1], ['D5', 0.5], ['E5', 0.5], ['G5', 2]],                        // 2  C      the same a third up
  [['A5', 1.5, { ham: 'G5' }], ['G5', 0.5], ['E5', 2]],                    // 3  Em
], { vel: 66 });

const A1 = K.bars("A'", [
  [['A4', 1], ['B4', 0.5], ['C5', 0.5], ['E5', 2, { ham: 'D5' }]],         // 4  Am
  [['F5', 1.5, { cut: 'G5' }], ['E5', 0.5], ['C5', 2]],                    // 5  Fmaj7  (the second guitar echoes F-E-C as D-C-A)
  [['D5', 1], ['E5', 0.5], ['F5', 0.5], ['A5', 2, { ham: 'G5' }]],         // 6  Dm7    the hook climbs on D
  [['G5', 1.5], ['F5', 0.5], ['D5', 1], ['E5', 0.5], ['F5', 0.5]],         // 7  G7     runs up into B
], { vel: 70 });

const B1 = K.bars('B (call)', [
  [['G5', 2, { cut: 'A5' }], ['E5', 1], ['C5', 1]],                        // 8  C      the call: the hook turned over
  [['D5', 1.5], ['E5', 0.5], ['G5', 2]],                                   // 9  G/B    ...ending high, a question
  [[null, 4]],                                                             // 10 Am     the second guitar answers
  [[null, 4]],                                                             // 11 G6
], { vel: 73 });

const B2 = K.bars('B (lift)', [
  [['A4', 1], ['C5', 0.5], ['E5', 0.5], ['A5', 2, { ham: 'G5' }]],         // 12 Fmaj7  back in, an octave wide
  [['G5', 1.5, 72], ['E5', 0.5], ['B4', 2]],                               // 13 G
  [['D5', 0.5], ['E5', 0.5], ['F#5', 1], ['A5', 2, { cut: 'B5', acc: 3 }]], // 14 D/F#   the lift: the Dorian F#
  [['G5', 1.5, 72], ['F#5', 0.5], ['E5', 2]],                              // 15 Em9    sighs back; the E rings on
], { vel: 77 });

const A2 = K.bars("A''", [
  [[null, 4]],                                                             // 16 Am     the low voice sings the hook
  [[null, 4]],                                                             // 17 Fmaj7
  [['C5', 1], ['D5', 0.5], ['E5', 0.5], [['G5', 'E5'], 2]],                // 18 C      the lead answers with the sequence
  [['A5', 1.5, { ham: 'G5' }], ['G5', 0.5], ['E5', 1], ['C5', 0.5], ['B4', 0.5]], // 19 Em  steps down C-B into bar 0
], { vel: 69 });

const lead = K.melody(0, 0, [...A, ...A1, ...B1, ...B2, ...A2]);
// the question (bar 9) and the sigh (bar 15) ring over the bar line while the other voice takes over
for (const n of lead) if ((n.bar === 9 || n.bar === 15) && Math.abs(n.beat - 2) < 1e-6) n.dur = 3;
for (let b = 0; b < BARS; b += 2) K.arc(lead, b, b + 2, 5, { peak: 0.55 });
K.ramp(lead, [[12, 0], [14.5, 4], [16, 0]]);
contour(lead, 0.3, 4);

// ── rhythm: nylon, the brook — p-i-m-a arpeggios, and a low second voice that answers ───────────
// b thumb root, a alternate bass, n[] the treble strings low→high ('1'..'4'); open position throughout.
const V = {
  Am: { b: 45, a: 40, n: [52, 57, 60, 64] },                  // x02210, thumb A / low E
  F7: { b: 41, a: 48, n: [53, 57, 60, 64] },                  // 133210  Fmaj7, open E on top
  C: { b: 48, a: 43, n: [52, 55, 60, 64] },                   // x32010, thumb C / G
  Em: { b: 40, a: 47, n: [52, 55, 59, 64] },                  // 022000
  Em9: { b: 40, a: 47, n: [52, 55, 59, 66] },                 // 022002  Em(add9): the F# lingers
  Dm7: { b: 50, a: 45, n: [57, 60, 65] },                     // xx0211
  G7: { b: 43, a: 50, w1: 45, w2: 47, n: [50, 55, 59, 65] },  // 320001, thumb walks G-A-B up to C
  GB: { b: 47, a: 50, n: [50, 55, 59, 67] },                  // x20003  G/B
  G: { b: 43, a: 50, n: [50, 55, 59, 67] },                   // 320003
  DF: { b: 42, a: 45, n: [50, 57, 62, 66] },                  // 200232  D/F#, the Dorian lift
};
const P = {
  // up the strings and back down, thumb on 1 and 3: the brook
  flow: [[0, 'b', 2.5, 6], [0.5, '1', 1.5, -4], [1, '2', 1.5, -2], [1.5, '3', 1.5, -1],
    [2, 'a', 2, 3], [2.5, '4', 1.5, 0], [3, '3', 1, -3], [3.5, '2', 0.5, -5]],
  // B: the thumb rings longer, the fingers start higher
  lift: [[0, 'b', 3, 6], [0.5, '2', 1.5, -4], [1, '3', 1.5, -2], [1.5, '4', 1.5, 0],
    [2, 'a', 2, 3], [2.5, '3', 1, -3], [3, '4', 1, -1], [3.5, '2', 0.5, -5]],
  // G7: the thumb walks G-A-B into the C of bar 8
  walk: [[0, 'b', 2, 6], [0.5, '1', 1.5, -4], [1, '2', 1.5, -2], [1.5, '3', 1.5, -1],
    [2, 'w1', 1, 3], [2.5, '4', 1.5, 0], [3, 'w2', 1, 4], [3.5, '3', 0.5, -4]],
  // bar 19: the fingers turn back down early, out of the way of the lead's C-B step into bar 0
  home: [[0, 'b', 2.5, 6], [0.5, '1', 1.5, -4], [1, '2', 1.5, -2], [1.5, '3', 1.5, -1],
    [2, 'a', 2, 3], [2.5, '4', 1, 0], [3, '2', 1, -3], [3.5, '1', 0.5, -5]],
};

// The second voice's own bars: [beat, pitch, dur, vel] — thumb, the sung line (louder), soft inner notes.
const play = (bar, list) => list.flatMap(([beat, p, dur, vel]) => K.note(bar, beat, p, dur, vel));
const R = {
  // 5  Fmaj7: arpeggio, then a quick echo of the lead's F-E-C a tenth below (D-C-A, pulled off the 2nd string)
  echo5: [[0, 'F2', 2.5, 66], [0.5, 'F3', 1.5, 56], [1, 'A3', 1, 57], [1.5, 'C4', 0.5, 56],
    [2, 'C3', 2, 61], [2, 'D4', 0.75, 75], [2.75, 'C4', 0.25, 68], [3, 'A3', 1.5, 71]],
  // 10 Am: the answer, the lead's call a tenth below: E— C A | B—. C E—
  ans10: [[0, 'A2', 2.5, 66], [0, 'E4', 2, 79], [0.5, 'E3', 1.5, 56], [1, 'A3', 1, 57],
    [2, 'E2', 2, 62], [2, 'C4', 1, 76], [2.5, 'E3', 1, 56], [3, 'A3', 1, 75], [3.5, 'E3', 0.5, 55]],
  // 11 G6 (320000): B hammered to C, then the open E rings
  ans11: [[0, 'G2', 2.5, 66], [0, 'B3', 1.5, 78], [0.5, 'D3', 1.5, 56], [1, 'G3', 1, 57], [1.5, 'C4', 0.5, 72],
    [2, 'B2', 2, 61], [2, 'E4', 2, 78], [2.5, 'G3', 1.5, 56], [3, 'B3', 1, 57], [3.5, 'D3', 0.5, 55]],
  // 16 Am: the low voice sings the hook (A B C E—)
  hook16: [[0, 'A2', 2.5, 66], [0, 'A3', 1, 77], [0.5, 'E3', 1.5, 56], [1, 'B3', 0.5, 72], [1.5, 'C4', 0.5, 74],
    [2, 'E2', 2, 62], [2, 'E4', 2, 80], [2.5, 'A3', 1, 56], [3, 'C4', 1, 57], [3.5, 'E3', 0.5, 55]],
  // 17 Fmaj7: ...and its sigh (F—. E C—)
  hook17: [[0, 'F2', 2.5, 66], [0, 'F4', 1.5, 80], [0.5, 'A3', 1.5, 56], [1, 'F3', 1, 56], [1.5, 'E4', 0.5, 72],
    [2, 'C3', 2, 61], [2, 'C4', 2, 77], [2.5, 'A3', 1, 56], [3, 'F3', 0.5, 55], [3.5, 'A3', 0.5, 55]],
};

const cfg = (vel) => ({ voicings: V, patterns: P, vel });
const rhythm = [
  ...K.comp(0, 'Am | F7 | C | Em', 'flow', cfg(58)),
  ...K.comp(4, 'Am', 'flow', cfg(59)),
  ...play(5, R.echo5),
  ...K.comp(6, 'Dm7 | G7!walk', 'flow', cfg(60)),
  ...K.comp(8, 'C | GB', 'lift', cfg(64)),
  ...play(10, R.ans10),
  ...play(11, R.ans11),
  ...K.comp(12, 'F7 | G', 'flow', cfg(63)),
  ...K.comp(14, 'DF', 'flow', cfg(67)),
  ...K.comp(15, 'Em9', 'flow', cfg(62)),
  ...play(16, R.hook16),
  ...play(17, R.hook17),
  ...K.comp(18, 'C | Em!home', 'flow', cfg(57)),
];
for (let b = 0; b < BARS; b += 4) K.arc(rhythm, b, b + 4, 4, { peak: 0.6 });

export default finish({
  id: 'relax-d1',
  title: 'Two Voices by the Brook',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'A minor (Aeolian; a Dorian F# at the lift)',
  description: 'A slow 4/4 duet for two nylon guitars in A minor: the lead sings a long-note air with small ornaments over a rippling brook of arpeggios, the second guitar answers its phrases a tenth below, the B part warms into C major and lifts on a single Dorian D/F#, and the low voice sings the hook before the lead steps back into the loop.',
  sections: [
    { bar: 0, name: 'A' }, { bar: 4, name: "A'" }, { bar: 8, name: 'B (call and answer)' },
    { bar: 12, name: 'B (lift)' }, { bar: 16, name: "A'' (low voice)" },
  ],
  render: {
    forward: 'Lead (nylon)', leadOverRhythmDb: 2.5, reverb: 'warm hall, ~26% wet, 2.4 s',
    note: 'both nylon; keep the arpeggios soft and blurred by the hall, but the second voice sings in bars 5, 10-11 and 16-17, so the lead sits only a little above it',
  },
  tracks: [
    { name: 'Lead (nylon)', role: 'lead', program: 24, channel: 0, pan: 86, volume: 100, reverb: 58, notes: lead },
    { name: 'Rhythm (nylon)', role: 'rhythm', program: 24, channel: 1, pan: 42, volume: 88, reverb: 62, notes: rhythm },
  ],
}, { humanize: { ms: 7, vel: 3 } });
