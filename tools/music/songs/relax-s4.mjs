// relax-s4 — "Air from the Hollow Hill". E minor (Aeolian; the raised 6th, C#, in passing), 6/8, dotted quarter = 60.
// Form A A' B A'' — 8-bar phrases, 32 bars = 64 s. A Celtic slow air for one nylon guitar, fingerstyle: the thumb
// takes the bass on both dotted-quarter beats (open E and B under Em, open D and A under D), the fingers play the
// air and add an open-string note or two where it holds. Hook = bars 0-1 (E——— B E— | G— F# D———).
// A' adds cuts, slides and a flowing arpeggio and turns towards G; B lifts to G and D (the hook's rocking fifth a
// third higher), peaks on a held A5 and lets A major's C# lead to D; A'' begins as a low echo of the hook over a
// rolled open Em, answered by harmonics bells, climbs back in sixths, and its last bar (D: A——— B C# D) rises
// straight into bar 0.

import { kit, finish, contour, pitch, start } from '../song.mjs';

const BPM = 60, TS = [6, 8], BARS = 32, NUM = TS[0];
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 42, hamMs: 75, strumMs: 24 });
const EPS = 1e-6;

// ── the air ────────────────────────────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['E5', 3], ['B4', 1], ['E5', 2]],                                  // 0  Em    the hook: the tonic rocks on its fifth...
  [['G5', 2], ['F#5', 1], ['D5', 3]],                                 // 1  C D   ...lifts to the third, sighs down to D
  [['E5', 3], ['B4', 1], ['E5', 1], ['F#5', 1]],                      // 2  Em
  [['G5', 2], ['E5', 1], ['F#5', 3]],                                 // 3  G D   half close
  [['E5', 2], ['D5', 1], ['C5', 3]],                                  // 4  C     falling thirds...
  [['D5', 2], ['B4', 1], ['G4', 3]],                                  // 5  G
  [['A4', 2], ['B4', 1], ['C5', 2], ['D5', 1]],                       // 6  Am    ...and a climb back
  [['E5', 3, { cut: 'F#5' }], ['B4', 1], ['C#5', 1], ['D5', 1]],      // 7  Em    home; B C# D leads on
], { vel: 72 });

const A1 = K.bars("A'", [
  [['E5', 3, { cut: 'G5' }], ['B4', 1], ['E5', 2]],                   // 8  Em
  [['G5', 2], ['F#5', 1], ['D5', 3, { slide: 'C#5' }]],               // 9  C D
  [['E5', 3, { cut: 'F#5' }], ['B4', 1], ['E5', 1], ['F#5', 1]],      // 10 Em
  [['G5', 1], ['F#5', 1], ['G5', 1], ['A5', 3]],                      // 11 G D   the half close reaches A this time
  [['E5', 2], ['D5', 1], ['C5', 3]],                                  // 12 C
  [['D5', 2], ['C5', 1 / 3], ['B4', 1 / 3], ['A4', 1 / 3], ['G4', 3]], // 13 G     a quick run down
  [['A4', 2, { cut: 'B4' }], ['B4', 1], ['C5', 2], ['B4', 1]],        // 14 Am
  [[['A4', 'F#4'], 3], ['D5', 1], ['E5', 1], ['F#5', 1]],             // 15 D     D E F# runs up into G
], { vel: 71 });

const B = K.bars('B', [
  [['G5', 3], ['D5', 1], ['G5', 2, { cut: 'A5' }]],                   // 16 G     the hook's rocking fifth, a third higher
  [[['A5', 'F#5'], 2], ['G5', 1], ['F#5', 2], ['D5', 1]],             // 17 D
  [['E5', 3], ['C5', 1], ['E5', 2, { cut: 'F#5' }]],                  // 18 C
  [[['F#5', 'D5'], 2], ['E5', 1], ['D5', 3, { slide: 'C#5' }]],       // 19 D     half close
  [['B4', 2], ['D5', 1], ['G5', 3]],                                  // 20 G     climbing...
  [['A5', 3], ['F#5', 1], ['E5', 1], ['D5', 1]],                      // 21 D     ...to the peak
  [['E5', 2], ['G5', 1], ['E5', 2], ['C#5', 1]],                      // 22 C A   C# over A major
  [['D5', 3, { cut: 'E5' }], ['B4', 1], ['A4', 1], ['F#4', 1]],       // 23 D     and down into the echo
], { vel: 75 });

const A2 = K.bars("A''", [
  [['E4', 3, 68], ['B3', 1, 64], ['E4', 2, 64]],                      // 24 Em    the hook, low, on top of a rolled open Em
  [['G4', 2, 66], ['F#4', 1, 62], ['D4', 1, 62], [null, 2]],          // 25 C D   answered by harmonics bells (A4 D5 F#5)
  [[['E5', 'G4'], 3], ['B4', 1], ['E5', 1], ['F#5', 1]],              // 26 Em    back up, in sixths
  [['G5', 2], ['E5', 1], ['F#5', 3, { cut: 'G5' }]],                  // 27 G D
  [['G5', 2], ['E5', 1], ['C5', 3]],                                  // 28 C     reaching up once more
  [['D5', 1], ['C5', 1], ['B4', 1], ['G4', 3]],                       // 29 G
  [['A4', 2, { cut: 'B4' }], ['B4', 1], ['C5', 2], ['B4', 1]],        // 30 Am
  [['A4', 3], ['B4', 1], ['C#5', 1], ['D5', 1]],                      // 31 D     the turn: A——— B C# D rises into bar 0
], { vel: 69 });

const mel = K.melody(0, 0, [...A, ...A1, ...B, ...A2]);

// ── the thumb and the fingers ──────────────────────────────────────────────────────────────────
// b: the thumb on beat 0 (and on beat 3 when the chord changes), a: the thumb's other bass on beat 3; each bass
// rings a little into the next one. n: the fingers' notes in order of preference, taken only where the air holds,
// at least a minor third below it, and not doubling the air's own note an octave down when another will do.
const V = {
  Em: { b: 'E2', a: 'B2', n: ['G3', 'B3', 'E4'] },   // open E, open G, B and E strings
  C: { b: 'C3', a: 'G2', n: ['G3', 'E4', 'C4'] },
  D: { b: 'D3', a: 'A2', n: ['A3', 'F#4', 'D4'] },   // open D and A
  G: { b: 'G2', a: 'D3', n: ['B3', 'D4', 'G3'] },
  Am: { b: 'A2', a: 'E2', n: ['C4', 'E4', 'A3'] },
  A: { b: 'A2', a: 'E2', n: ['C#4', 'E4', 'A3'] },
};
const VB = { ...V, G: { ...V.G, n: ['D4', 'G4', 'B3'] }, D: { ...V.D, n: ['F#4', 'A4', 'D4'] }, C: { ...V.C, n: ['E4', 'G4', 'C4'] } }; // B: brighter

const at = (bar, beat) => bar * NUM + beat;
const ringing = (notes, t) => notes.filter((n) => { const s = start(n, NUM); return s <= t + EPS && s + n.dur > t + EPS; });
const airStarts = (t) => mel.some((n) => n.dur > 0.3 && Math.abs(start(n, NUM) - t) < 0.05);
const BASS_RING = 3.5;

/** One bar per chord token: chords (one, or two split at the half bar) and density — 1: one finger note in each gap
 *  of the air, 2: every free eighth. Never more than four notes ringing; a finger never re-strikes a ringing pitch. */
function accompany(bar0, prog, dens, Vs, bv, iv) {
  const out = [];
  prog.split('|').map((s) => s.trim().split(/\s+/)).forEach((cs, i) => {
    const bar = bar0 + i, half = cs.length === 1 ? [cs[0], cs[0]] : cs;
    for (let h = 0; h < 2; h++) {
      const v = Vs[half[h]], s = 3 * h;
      out.push(...K.note(bar, s, h === 0 || half[1] !== half[0] ? v.b : v.a, BASS_RING, bv + (h ? 0 : 4)));
      const free = [1, 2].filter((k) => !airStarts(at(bar, s + k)));
      const ks = dens[i] >= 2 ? free : dens[i] === 1 ? (h ? free.slice(-1) : free.slice(0, 1)) : [];
      for (const k of ks) {
        const t = at(bar, s + k), air = ringing(mel, t), ring = [...air, ...ringing(out, t)];
        if (ring.length >= 4) continue;
        const low = Math.min(...air.map((n) => n.pitch));
        const airPc = new Set(air.map((n) => n.pitch % 12));
        const order = (k === 1 ? [0, 1, 2] : [1, 0, 2]).map((j) => pitch(v.n[j]));
        const p = [...order.filter((q) => !airPc.has(q % 12)), ...order.filter((q) => airPc.has(q % 12))]
          .find((q) => q <= low - 3 && !ring.some((n) => n.pitch === q));
        if (p != null) out.push(...K.note(bar, s + k, p, 3 - k, iv - (k === 2 ? 2 : 0)));
      }
    }
  });
  return out;
}

const acc = [
  ...accompany(0, 'Em | C D | Em | G D | C | G | Am | Em', [1, 1, 1, 1, 1, 1, 1, 1], V, 64, 57),
  ...accompany(8, 'Em | C D | Em | G D | C | G | Am | D', [2, 2, 2, 2, 2, 2, 2, 1], V, 66, 58),
  ...accompany(16, 'G | D | C | D | G | D | C A | D', [2, 2, 2, 2, 2, 2, 1, 1], VB, 67, 59),
  ...accompany(26, 'Em | G D | C | G | Am | D', [1, 1, 2, 2, 1, 1], V, 63, 57),
];

// bar 24: a slow harp roll over the open Em shape, on strings damped at the bar line; the air's E4 (the open top
// string) arrives last, on top of it
for (const n of acc) { const s = start(n, NUM); if (s < at(24, 0) && s + n.dur > at(24, 0)) n.dur = at(24, 0) - s; }
const R = K.ms(26);
acc.push(
  ...K.note(24, 0, 'E2', 6, 68),
  ...K.note(24, R, 'B2', 2.75 - R, 62),
  ...K.note(24, 2 * R, 'E3', 2.75 - 2 * R, 60),
  ...K.note(24, 3 * R, 'G3', 6 - 3 * R, 58),
  ...K.note(24, 4 * R, 'B3', 2.75 - 4 * R, 58),
  ...K.note(24, 3, 'B2', 3, 61),
);
const e4 = mel.find((n) => n.bar === 24 && n.beat < EPS && n.pitch === pitch('E4'));
e4.beat = 5 * R; e4.dur = 3 - 5 * R;

// bar 25: C, then D over the open A — the D string stays free for the 7th-fret harmonics on D, G and B (A4 D5 F#5)
acc.push(
  ...K.note(25, 0, 'C3', 3, 64),
  ...K.note(25, 1, 'G3', 2, 56),
  ...K.note(25, 3, 'A2', 3, 62),
  ...K.chord(25, 4, ['A4', 'D5', 'F#5'], 2, 67, { staggerMs: 28 }),
);

// ── feel: the lilt (the third eighth of each beat a touch late), phrase shaping ─────────────────
const LILT = K.ms(18);
const cutBefore = (t) => mel.some((g) => g.dur < 0.3 && Math.abs(start(g, NUM) + g.dur - t) < 0.02);
const late = [...mel, ...acc].filter((n) => {
  const s = start(n, NUM);
  return n.dur > 0.3 && Math.abs((s % 3) - 2) < 1e-4 && !cutBefore(s);
});
for (const n of late) {
  const s = start(n, NUM);
  if (mel.includes(n)) for (const p of mel) if (p !== n && Math.abs(start(p, NUM) + p.dur - s) < 1e-4) p.dur += LILT;
  n.beat += LILT; n.dur -= LILT;
}

for (let b = 0; b < BARS; b += 4) K.arc(mel, b, b + 4, 6, { peak: b === 20 ? 0.32 : 0.6 }); // B's crest: the A5 in bar 21
K.ramp(mel, [[0, 0], [8, 0], [12, 1], [16, 2], [20, 4], [21, 7], [22.5, 3], [24, -2], [26, 0], [32, 0]]);
contour(mel, 0.3, 4);
for (let b = 0; b < BARS; b += 8) K.arc(acc, b, b + 8, 4);
K.ramp(acc, [[0, 0], [16, 2], [21.5, 4], [24, -1], [32, 0]]);

export default finish({
  id: 'relax-s4',
  title: 'Air from the Hollow Hill',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'E minor (Aeolian, C# in passing)',
  description: 'A Celtic slow air for one nylon guitar in a gentle 6/8: an ornamented, wistful tune over open E and B basses, a B part that lifts to G and D, and a low echo of the hook answered by harmonics bells.',
  sections: [{ bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' }, { bar: 24, name: "A''" }],
  render: {
    forward: 'Guitar (nylon)',
    leadOverRhythmDb: 0,
    reverb: 'warm hall, ~25% wet, 2.4 s',
    note: 'one nylon guitar, solo: let the open basses ring; bar 24 is a slow rolled open Em under the low echo, bar 25 beat 4 a soft harmonics chime (A4 D5 F#5)',
  },
  tracks: [
    { name: 'Guitar (nylon)', role: 'lead', program: 24, channel: 0, pan: 64, volume: 100, reverb: 52, notes: [...mel, ...acc] },
  ],
}, { humanize: { ms: 6, vel: 3 }, velLo: 55, velHi: 104 });
