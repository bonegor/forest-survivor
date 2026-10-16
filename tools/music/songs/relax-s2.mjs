// relax-s2 — "The Old Oak". A Dorian (A minor with a raised 6th, F#), 4/4, quarter = 64.
// Form A A' B B' in 4-bar phrases (16 slow beats each, as long as 8 bars at double time): 16 bars, 60.0 s.
// The loop itself is the return: B' walks the bass E-F#-G back up into A. An A'' inside the loop would put
// three A's in a row (A'' A A'), so the folk-tune AABB shape is the one that wears well when it repeats.
// One nylon guitar, fingerstyle, one player. In A the thumb walks A-G-F#-E and back (Am, Am/G, D/F#, Em,
// D/F#, G, Am) in first position, and the tune sits low and warm on the top three strings, above one or two
// inner notes. Hook = bars 0-1 (A3. B3 C4 E4 | F#4— E4 D4): up from the root to the Dorian F#, held over D/F#,
// then a sigh down; bars 2-3 fall home (E4. D4 C4 B3 | A3— C4 B3), with C over G as a 4-3 suspension.
// A' reaches a third higher (A4 over Em, flicked in with a cut, resolving to G4), then runs D-E-F# up into B.
// B moves up the neck (a rolled C barre at the 3rd fret, then 7th position over open D/A/E basses) and lifts
// to C and G: the hook's own rhythm in G-major light (G4. A4 B4 D5 | E5— D5 B4), a half cadence on D with the F#
// held. B' climbs a scale to the peak: a rolled D at the 14th fret over the open D, F#5 on top, the hook's
// Dorian F# an octave up. It then brings the hook's answer back an octave high (E5. D5 C5 B4), and bar 15
// drops to first position for the walk back into bar 0.
// Levels: the tune is played harder the higher it goes and the thumb stays under it; checked as BS.1770
// loudness on the three renders (sampled nylon, sampled steel, the plucked synth). Velocities 50..105.

import { kit, finish, pitch } from '../song.mjs';

const BPM = 64, TS = [4, 4], BARS = 16;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 45, hamMs: 75, strumMs: 24 });

// ── the tune (fingers i-m-a on the top strings) ────────────────────────────────────────────────
const A = K.bars('A', [
  [['A3', 1.5], ['B3', 0.5], ['C4', 1], ['E4', 1]],                       // 0  Am  Am/G   the hook climbs...
  [['F#4', 2, 80], ['E4', 1], ['D4', 1]],                                 // 1  D/F# Em    ...to the Dorian F#
  [['E4', 1.5], ['D4', 0.5], ['C4', 1], ['B3', 1]],                       // 2  D/F# G     C over G: 4-3
  [['A3', 2], ['C4', 1], ['B3', 1]],                                      // 3  Am  Am/E   home, turning back
], { vel: 75 });

const A1 = K.bars("A'", [
  [['A3', 1.5], ['B3', 0.5], ['C4', 0.5], ['D4', 0.5], ['E4', 1]],        // 4  Am  Am/G   (softer: the echo)
  [['F#4', 2, 77], ['A4', 1, 76, { cut: 'B4' }], ['G4', 1]],              // 5  D/F# Em    A (cut from B) over Em: 4-3
  [['F#4', 1.5], ['E4', 0.5], ['D4', 1], ['B3', 1]],                      // 6  D/F# G
  [['A3', 2], ['D4', 1, 74], ['E4', 0.5, 76], ['F#4', 0.5, 78]],          // 7  Am  G/B    runs up into B
], { vel: 72 });

const B = K.bars('B', [
  [['G4', 1.5], ['A4', 0.5], ['B4', 1], ['D5', 1]],                       // 8  C (rolled)  the lift
  [['E5', 2, 80], ['D5', 1], ['B4', 1]],                                 // 9  D           E5 = the 9th
  [['D5', 1.5], ['C5', 0.5], ['B4', 1], ['A4', 1]],                       // 10 G/B G/D
  [['G4', 1], ['A4', 1], ['F#4', 2, 79]],                                 // 11 C   D       half cadence, F# held
], { vel: 80 });

const B1 = K.bars("B'", [
  [['G4', 1.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5], ['D5', 1]],        // 12 C           a scale up...
  [['F#5', 2, 80], ['E5', 1], ['D5', 1]],                                 // 13 D (rolled)  ...to the peak
  [['E5', 1.5, 80, { cut: 'F#5' }], ['D5', 0.5], ['C5', 1], ['B4', 1]],   // 14 Em  G/D     the hook's answer, high
  [['G4', 2, 76], ['F#4', 1, 72], ['E4', 1, 71]],                         // 15 Em  D/F# G  walking home → bar 0
], { vel: 81 });

const tune = K.melody(0, 0, [...A, ...A1, ...B, ...B1]);
K.arc(tune, 0, 4, 5, { peak: 0.3 });   // swell into the F#, settle
K.arc(tune, 4, 8, 4, { peak: 0.45 });
K.arc(tune, 8, 12, 6, { peak: 0.3 });
K.arc(tune, 12, 16, 7, { peak: 0.28 }); // the peak on F#5, then down the neck
// A guitarist leans on treble melody notes, and the sampled nylon loses level fast going up the neck
// (against A3: about -4 dB from B3, -8 dB by D5, -10 dB by E5); so the tune is played harder the higher it is.
for (const n of tune) n.vel += n.pitch < 59 ? -4 : Math.min(12, Math.round(0.6 * (n.pitch - 59)));

// ── the accompaniment: [bar, beat, pitch, dur, role] — p = thumb (bass), i = a finger (inner note) ───
const ACC = [
  // A: the walk A G | F# E | F# G | A (E), first position
  [0, 0, 'A2', 2, 'p'], [0, 0.5, 'E3', 1.5, 'i'], [0, 2, 'G2', 2, 'p'], [0, 2.5, 'A3', 1.5, 'i'], [0, 3.5, 'E3', 0.5, 'i'],
  [1, 0, 'F#2', 2, 'p'], [1, 0.5, 'A3', 1.5, 'i'], [1, 1, 'D4', 1, 'i'], [1, 2, 'E2', 2, 'p'], [1, 2.5, 'G3', 1.5, 'i'], [1, 3.5, 'E3', 0.5, 'i'],
  [2, 0, 'F#2', 2, 'p'], [2, 0.5, 'A3', 1.5, 'i'], [2, 1, 'D3', 3, 'i'], [2, 2, 'G2', 2, 'p'], [2, 2.5, 'G3', 1.5, 'i'],
  [3, 0, 'A2', 2, 'p'], [3, 0.5, 'E3', 1.5, 'i'], [3, 2, 'E2', 2, 'p'], [3, 2.5, 'A3', 1, 'i'], [3, 3.5, 'G3', 0.5, 'i'],
  // A'
  [4, 0, 'A2', 2, 'p'], [4, 0.5, 'E3', 1.5, 'i'], [4, 2, 'G2', 2, 'p'], [4, 2, 'A3', 2, 'i'], [4, 3.5, 'E3', 0.5, 'i'],
  [5, 0, 'F#2', 1.9, 'p'], [5, 0.5, 'A3', 1.4, 'i'], [5, 1, 'D4', 0.9, 'i'], [5, 2, 'E2', 2, 'p'], [5, 2.5, 'B3', 1.5, 'i'], [5, 3.5, 'E3', 0.5, 'i'],
  [6, 0, 'F#2', 2, 'p'], [6, 0.5, 'A3', 1.5, 'i'], [6, 1, 'D3', 3, 'i'], [6, 2, 'G2', 2, 'p'], [6, 2.5, 'G3', 1.5, 'i'],
  [7, 0, 'A2', 2, 'p'], [7, 0.5, 'E3', 1.5, 'i'], [7, 2, 'B2', 2, 'p'], [7, 2.5, 'G3', 1.5, 'i'],          // thumb A → B → C
  // B: up the neck; bar 8 opens with a rolled C (below)
  [8, 2, 'E3', 2, 'p'], [8, 2.5, 'G3', 1.5, 'i'], [8, 3.5, 'G4', 0.5, 'i'],
  [9, 0, 'D3', 2, 'p'], [9, 0.5, 'A4', 1.5, 'i'], [9, 1, 'F#4', 1, 'i'], [9, 2, 'A2', 2, 'p'], [9, 2.5, 'F#4', 1, 'i'], [9, 3.5, 'D4', 0.5, 'i'],
  [10, 0, 'B2', 2, 'p'], [10, 0.5, 'G4', 1.5, 'i'], [10, 1, 'D4', 1, 'i'], [10, 2, 'D3', 2, 'p'], [10, 2.5, 'G3', 1.5, 'i'], [10, 3.5, 'B3', 0.5, 'i'],
  [11, 0, 'C3', 2, 'p'], [11, 0.5, 'E4', 1.5, 'i'], [11, 1.5, 'C4', 0.5, 'i'], [11, 2, 'D3', 2, 'p'], [11, 2.5, 'A3', 1.5, 'i'], [11, 3, 'D4', 1, 'i'],
  // B'
  [12, 0, 'C3', 2, 'p'], [12, 0.5, 'E4', 1.5, 'i'], [12, 1, 'C4', 1, 'i'], [12, 2, 'E3', 2, 'p'], [12, 3.5, 'G4', 0.5, 'i'],
  [13, 2, 'A2', 2, 'p'], [13, 2.5, 'A4', 1.5, 'i'], [13, 3.5, 'F#4', 0.5, 'i'],                            // bar 13 opens with a rolled D
  [14, 0, 'E2', 2, 'p'], [14, 0.5, 'G4', 1.5, 'i'], [14, 1, 'B3', 1, 'i'], [14, 2, 'D3', 2, 'p'], [14, 2.5, 'G4', 1.5, 'i'], [14, 3.5, 'G3', 0.5, 'i'],
  [15, 0, 'E2', 2, 'p'], [15, 0.5, 'B3', 1.5, 'i'], [15, 1, 'E3', 1, 'i'], [15, 2, 'F#2', 1, 'p'], [15, 2.5, 'A3', 0.5, 'i'], [15, 3, 'G2', 1, 'p'], [15, 3.5, 'B3', 0.5, 'i'],
];

// thumb a little stronger on the downbeat, the fingers' inner notes well under the tune;
// A' is the softer echo, B and B' fuller. The guitar is loud around D3-A#3 (where the inner notes of A
// live) and a little hollow on A2-C3, so those inner notes are eased and those bass notes leaned on.
const LEVEL = [
  { p: 58, i: 53 }, { p: 56, i: 51 }, { p: 60, i: 55 }, { p: 61, i: 56 },
];
const acc = ACC.map(([bar, beat, p, dur, role]) => {
  const L = LEVEL[Math.floor(bar / 4)], m = pitch(p);
  const v = role === 'p'
    ? L.p + (beat === 0 ? 4 : beat === 2 ? 1 : -2) + (m >= 44 && m <= 48 ? 4 : 0)
    : L.i + (beat % 1 ? 0 : -1) + (m >= 49 && m <= 58 ? -3 : 0);
  return K.note(bar, beat, p, dur, v)[0];
});

// rolled chords (24 ms a string, bass on the beat); the tune's note is the top string, so it is moved to the end
const roll = (bar, pitches, dur, vel) => pitches.map((p, k) => K.note(bar, K.ms(24 * k), p, dur - K.ms(24 * k), vel - 2 * k)[0]);
const topOfRoll = (bar, p, strings) => {
  const n = tune.find((x) => x.bar === bar && x.beat < 1e-6 && x.pitch === pitch(p));
  n.beat += K.ms(24 * strings); n.dur -= K.ms(24 * strings);
};
acc.push(...roll(8, ['C3', 'G3', 'C4', 'E4'], 1.5, 62));   // C, A-shape barre at the 3rd fret, G4 on top
acc[acc.length - 4].dur = 2;                              // the bass C3 rings to the half bar
topOfRoll(8, 'G4', 4);
acc.push(...roll(13, ['D3', 'A4', 'D5'], 2, 63));          // D up at the 14th fret over the open D: xx0 14 15 14
topOfRoll(13, 'F#5', 3);

K.arc(acc, 0, 4, 3, { peak: 0.3 });
K.arc(acc, 4, 8, 4, { peak: 0.85 });   // A' leans into B
K.arc(acc, 8, 12, 4, { peak: 0.3 });
K.arc(acc, 12, 16, 5, { peak: 0.28 });

export default finish({
  id: 'relax-s2',
  title: 'The Old Oak',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'A Dorian',
  description: 'A slow A Dorian ballad for one nylon guitar: the thumb walks A-G-F#-E and back under a low, long-breathed tune that climbs to the Dorian F#, then the B part lifts up the neck to C, D and G, peaks on a rolled D with a high F# and walks home.',
  sections: [{ bar: 0, name: 'A' }, { bar: 4, name: "A'" }, { bar: 8, name: 'B' }, { bar: 12, name: "B'" }],
  render: {
    forward: 'Guitar (nylon)', leadOverRhythmDb: 0, reverb: 'warm hall, ~25% wet, 2.2 s',
    note: 'one solo nylon guitar, close and intimate; the only strums are the soft rolled chords at bars 8 (C) and 13 (D, F#5 on top)',
    nylonComp: false,
  },
  tracks: [
    { name: 'Guitar (nylon)', role: 'lead', program: 24, channel: 0, pan: 64, volume: 100, reverb: 52, notes: [...tune, ...acc] },
  ],
}, { humanize: { ms: 7, vel: 3 }, velLo: 50, velHi: 105 });
