// relax-d2 — "The Lantern Waltz". D Mixolydian (D major with a flat 7th, C natural), 3/4, quarter = 84.
// Form A A' B A'' — 8-bar phrases, 32 bars, 68.6 s. Steel rhythm guitar: a soft bass-chord-chord waltz whose D chords
// lean on the flat-7th C (D → D7 inside the bar); in B it rolls its chords like a harp over a bass climbing G-A-B-C.
// Nylon lead, a swaying tune. Hook = bars 0-1 (D5—F#5 | E5—G5): the lantern swings up a third, then again a step
// higher over the C chord; B lifts to G and Am, peaks on B5, and C → D brings it home; A'' sings the hook in thirds.

import { kit, finish, contour } from '../song.mjs';

const BPM = 84, TS = [3, 4], BARS = 32;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 45, hamMs: 75, strumMs: 25 });

// ── lead: nylon, the tune ──────────────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['D5', 2], ['F#5', 1]],                                  // 0  D    the hook: the lantern swings up a third...
  [['E5', 2], ['G5', 1]],                                   // 1  C    ...and again, a step higher, over the flat-7th chord
  [['F#5', 2], ['A5', 1]],                                  // 2  D    ...and once more
  [['G5', 1.5], ['F#5', 0.5], ['E5', 1]],                   // 3  Em7  then drifts back
  [['D5', 2], ['F#5', 1]],                                  // 4  D    the hook again
  [['E5', 2], ['G5', 1]],                                   // 5  C
  [['A5', 1.5], ['G5', 0.5], ['E5', 1]],                    // 6  Am7
  [['D5', 2], ['B4', 0.5], ['C5', 0.5]],                    // 7  D    B-C: the flat 7 leans back into the hook
], { vel: 66 });

const A1 = K.bars("A'", [
  [['D5', 1.5, { cut: 'E5' }], ['E5', 0.5], ['F#5', 1]],    // 8  D    the hook, filled in
  [['E5', 1.5], ['F#5', 0.5], ['G5', 1]],                   // 9  C
  [['A5', 2, { cut: 'B5' }], ['F#5', 1]],                   // 10 D    now it swings the other way
  [['G5', 2], ['E5', 1]],                                   // 11 Em7
  [['D5', 1.5], ['E5', 0.5], ['F#5', 1]],                   // 12 D
  [['E5', 1.5], ['F#5', 0.5], ['G5', 1]],                   // 13 C
  [['A5', 1.5], ['G5', 0.5], ['E5', 1]],                    // 14 Am7
  [['F#5', 1.5], ['E5', 0.5], ['C5', 1]],                   // 15 D7   the flat 7 falls to B: into G
], { vel: 69 });

const B = K.bars('B', [
  [['B4', 2], ['D5', 1]],                                   // 16 G    the hook lifted into G...
  [['C5', 2], ['E5', 1]],                                   // 17 Am   ...and Am, over a climbing bass
  [['D5', 1.5], ['E5', 0.5], ['G5', 1]],                    // 18 G/B  the swing widens
  [['E5', 1.5], ['G5', 0.5], ['A5', 1]],                    // 19 C
  [['B5', 2, { acc: 5 }], ['A5', 0.5], ['G5', 0.5]],        // 20 G    the peak
  [['A5', 2], ['E5', 1]],                                   // 21 Am7
  [['G5', 1.5, { ham: 'F#5' }], ['E5', 0.5], ['D5', 1]],    // 22 G/B
  [['C5', 2], ['B4', 0.5], ['C5', 0.5]],                    // 23 C    C → D: home
], { vel: 72 });

const A2 = K.bars("A''", [
  [[['D5', 'B4'], 2], [['F#5', 'D5'], 1]],                  // 24 D    the hook in thirds
  [[['E5', 'C5'], 2], [['G5', 'E5'], 1]],                   // 25 C
  [['A5', 2], ['F#5', 0.5], ['E5', 0.5]],                   // 26 D
  [['G5', 1.5], ['E5', 0.5], ['B4', 1]],                    // 27 Em7
  [['D5', 2, { cut: 'E5' }], ['F#5', 1]],                   // 28 D    as at first
  [['E5', 2], ['G5', 1]],                                   // 29 C
  [['A5', 1.5], ['G5', 0.5], ['E5', 1]],                    // 30 Am7
  [['D5', 2], ['B4', 0.5], ['C5', 0.5]],                    // 31 D    → bar 0
], { vel: 65 });

const lead = K.melody(0, 0, [...A, ...A1, ...B, ...A2]);
for (const b of [0, 4, 8, 12, 24, 28]) K.arc(lead, b, b + 4, 6, { peak: 0.6 });
K.ramp(lead, [[16, 0], [20, 8], [21, 4], [23, 2], [24, 0]]); // B swells into the B5, then eases home
contour(lead, 0.35, 4);

// ── rhythm: steel, thumb and fingers — a soft bass-chord-chord waltz ───────────────────────────
// The three treble strings brushed on beats 2 and 3 (low → high); every shape in open position.
const V = {
  D: ['A3', 'D4', 'F#4'],        // xx0232
  D7: ['A3', 'C4', 'F#4'],       // xx0212   the flat 7th on the B string
  C: ['G3', 'C4', 'E4'],         // x32010
  Cadd9: ['G3', 'D4', 'E4'],     // x32030
  G: ['G3', 'D4', 'G4'],         // 320033
  GB: ['G3', 'D4', 'G4'],        // x20033   G/B
  Am: ['A3', 'C4', 'E4'],        // x02210
  Am7: ['G3', 'C4', 'E4'],       // x02010
  Em7: ['G3', 'D4', 'E4'],       // xx2030 / 022030
  Em: ['G3', 'B3', 'E4'],        // xx2000 / 022000
};
const R = [];

/** Bass on 1, a brush on 2, a brush on 3 (c2 may move an inner voice: D → D7, C → Cadd9).
 *  lilt: beat 3 adds an up-brush on its "and"; thin: beat 3 is only a light up-brush (the lead is moving);
 *  walk: the thumb steps to this bass note on beat 3, into the next bar. */
function waltz(bar, bass, c1, c2, v, { walk, lilt, thin } = {}) {
  R.push(...K.note(bar, 0, bass, walk ? 2 : 3, v + 9));
  const first = K.chord(bar, 1, V[c1], 1, v);
  if (thin && V[c2][0] === V[c1][0]) first[0].dur = 2; // thin: the lowest string rings on under the up-brush
  R.push(...first);
  if (thin) R.push(...K.chord(bar, 2, V[c2].slice(1), 1, v - 6, { strum: 'up', staggerMs: 18 }));
  else {
    R.push(...K.chord(bar, 2, V[c2], 1, v - 3));
    if (lilt) R.push(...K.chord(bar, 2.5, V[c2].slice(1), 0.5, v - 8, { strum: 'up', staggerMs: 18 }));
  }
  if (walk) R.push(...K.note(bar, 2, walk, 1, v + 5));
}

/** B: bass on 1, the chord rolled slowly on 2 like a harp and left ringing, then the inner strings again. */
function harp(bar, bass, c, v) {
  const [i, m, a] = V[c];
  R.push(...K.note(bar, 0, bass, 3, v + 9));
  R.push(...K.chord(bar, 1, [i, m, a], 2, v, { staggerMs: 60, velStep: 1 }));
  R.push(...K.note(bar, 2, m, 1, v - 4));
  R.push(...K.note(bar, 2.5, i, 0.5, v - 7));
}

/** A'' opening: bass on 1, two-string pinches on 2 and 3, leaving room for the hook in thirds. */
function pinch(bar, bass, c1, c2, v) {
  R.push(...K.note(bar, 0, bass, 3, v + 9));
  R.push(...K.chord(bar, 1, [V[c1][0], V[c1][2]], 1, v, { staggerMs: 12 }));
  R.push(...K.chord(bar, 2, V[c2].slice(0, 2), 1, v - 4, { staggerMs: 12 }));
}

// A: the plain lantern waltz; bass D C D E | D C-B A D (+ A on the last beat)
waltz(0, 'D3', 'D', 'D', 64);
waltz(1, 'C3', 'C', 'Cadd9', 64);
waltz(2, 'D3', 'D', 'D7', 65);
waltz(3, 'E3', 'Em7', 'Em', 64);
waltz(4, 'D3', 'D', 'D', 64);
waltz(5, 'C3', 'C', 'Cadd9', 64, { walk: 'B2' });
waltz(6, 'A2', 'Am7', 'Am', 65);
waltz(7, 'D3', 'D', 'D7', 64, { walk: 'A2' });
// A': thinner under the moving tune, a lilt under the held notes; D7 walks F# into G
waltz(8, 'D3', 'D', 'D', 66, { thin: true });
waltz(9, 'C3', 'C', 'Cadd9', 66, { thin: true, walk: 'B2' });
waltz(10, 'A2', 'D', 'D7', 67, { lilt: true });
waltz(11, 'E3', 'Em7', 'Em', 67, { lilt: true });
waltz(12, 'D3', 'D', 'D', 67, { thin: true });
waltz(13, 'G2', 'C', 'Cadd9', 67, { thin: true });
waltz(14, 'A2', 'Am7', 'Am', 68, { thin: true });
waltz(15, 'D3', 'D7', 'D7', 68, { walk: 'F#2' });
// B: G Am G/B C, twice; the bass climbs G-A-B-C, then C → D
harp(16, 'G2', 'G', 67);
harp(17, 'A2', 'Am', 68);
harp(18, 'B2', 'GB', 69);
harp(19, 'C3', 'C', 70);
harp(20, 'G2', 'G', 71);
harp(21, 'A2', 'Am7', 69);
harp(22, 'B2', 'GB', 67);
harp(23, 'C3', 'C', 65);
// A'': pinches under the thirds, then the plain waltz again, so bar 31 → 0 is bar 7 → 8
pinch(24, 'D3', 'D', 'D', 63);
pinch(25, 'C3', 'C', 'Cadd9', 63);
pinch(26, 'A2', 'D', 'D7', 63);
pinch(27, 'E2', 'Em7', 'Em', 63);
waltz(28, 'D3', 'D', 'D', 63);
waltz(29, 'C3', 'C', 'Cadd9', 63, { walk: 'B2' });
waltz(30, 'A2', 'Am7', 'Am', 64);
waltz(31, 'D3', 'D', 'D7', 64, { walk: 'A2' });
for (let b = 0; b < BARS; b += 8) K.arc(R, b, b + 8, 4, { peak: 0.6 });

export default finish({
  id: 'relax-d2',
  title: 'The Lantern Waltz',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'D Mixolydian',
  description: 'A slow, swaying 3/4 waltz in D Mixolydian: a soft steel bass-chord-chord waltz leaning on the flat-7th C under a nylon tune that swings up in thirds, a B part that lifts to G and Am over a climbing bass and harp-like rolls, then C → D home.',
  sections: [{ bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' }, { bar: 24, name: "A''" }],
  render: {
    forward: 'Lead (nylon)',
    leadOverRhythmDb: 3.5,
    reverb: 'warm hall, ~25% wet, 2.2 s',
    note: "keep the steel soft and round (thumb and fingers, no pick); the B rolls should ring like a harp; A'' plays the hook in thirds",
  },
  tracks: [
    { name: 'Lead (nylon)', role: 'lead', program: 24, channel: 0, pan: 86, volume: 100, reverb: 52, notes: lead },
    { name: 'Rhythm (steel)', role: 'rhythm', program: 25, channel: 1, pan: 40, volume: 84, reverb: 46, notes: R },
  ],
}, { humanize: { ms: 7, vel: 3 } });
