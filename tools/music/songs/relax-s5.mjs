// relax-s5 — "Meadow at Noon". C major, 2/2 (cut time), half note = 66.
// Form A A' B A'' — 8-bar phrases, 32 bars, 58.2 s. One steel-string guitar, travis style: the thumb rocks
// C3-E3-G2-E3 (root and fifth on the half-note beats, a light, palm-damped E3 between them) while the fingers
// sing a plain diatonic tune made of thirds and sixths, with a few off-beat fills.
// Hook = bars 0-1 (G4— E4 C4 | A4—— G4): down the C triad, then a sixth up to the sunny added sixth.
// A' sings it in parallel sixths and thirds. B climbs the neck in a sequence of rising sixths over Am and F
// (E-C, F-D, then G-E over C, the peak) while the thumb slows to the half notes on open strings. A'' pushes the
// tune off the beat, retells the hook in Am and F, and a G7 walk-up (B3 D4 E4 F4 over G2 A2 B2) rolls back
// into bar 0.

import { kit, finish, contour } from '../song.mjs';

const BPM = 66, TS = [2, 2], BARS = 32;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 40, hamMs: 70, strumMs: 25 });
const NUM = TS[0];
const at = (n) => n.bar * NUM + n.beat;
const PO = { acc: -6 }; // a pull-off: the left hand sounds it, softer than a plucked note

// ── the tune (the unit is the half note: q = 0.5, e = 0.25) ─────────────────────────────────────
const A = K.bars('A', [
  [['G4', 1], ['E4', 0.5], ['C4', 0.5]],                    // 0  C     the hook: down the C triad...
  [['A4', 1.5], ['G4', 0.5]],                               // 1  C     ...and a sixth up to the sunny A
  [['F4', 1], ['A3', 0.5], ['C4', 0.5]],                    // 2  F     the sixth turned over
  [['D4', 0.75], ['E4', 0.25], ['D4', 1]],                  // 3  G7    half close
  [['G4', 1], ['E4', 0.5], ['C4', 0.5]],                    // 4  C
  [['A4', 1.5], ['G4', 0.5]],                               // 5  Am    the same notes, a shade of Am7
  [['F4', 0.75], ['E4', 0.25, PO], ['D4', 0.5], ['B3', 0.5]], // 6 Dm7 G7
  [['C4', 1], ['E4', 0.5], ['F4', 0.5]],                    // 7  C     E-F lead up into the G again
]);

const A1 = K.bars("A'", [
  [[['G4', 'B3'], 1], [['E4', 'G3'], 0.5], ['C4', 0.5]],                                   // 8  C    in sixths
  [[['A4', 'C4'], 1.5], [['G4', 'B3'], 0.5]],                                              // 9  C
  [[['F4', 'A3'], 1], ['A3', 0.5], ['C4', 0.5]],                                           // 10 F
  [[['G4', 'B3'], 0.75], [['F4', 'A3'], 0.25], [['D4', 'B3'], 1]],                         // 11 G7   sixths walking down
  [[['G4', 'E4'], 1], [['E4', 'C4'], 0.5], [['C4', 'A3'], 0.5]],                           // 12 C    now in thirds
  [[['A4', 'C4'], 1.5], [['G4', 'E4'], 0.5]],                                              // 13 Am
  [[['F4', 'A3'], 0.75], [['E4', 'G3'], 0.25], [['D4', 'B3'], 0.5], [['B3', 'G3'], 0.5]],  // 14 Dm7 G7
  [['C4', 0.5], [['E4', 'C4'], 0.5], [['D4', 'B3'], 1]],                                   // 15 C G/B   bass C-B → A
]);

const B = K.bars('B', [
  [['E4', 0.5, { acc: -4 }], ['C5', 1.5, { acc: 5 }]],      // 16 Am    the sixth again, minor now (5th position)
  [['B4', 0.75], ['A4', 0.25, PO], ['E4', 1]],              // 17 Am
  [['F4', 0.5, { acc: -4 }], ['D5', 1.5, { acc: 5 }]],      // 18 F     a step higher (8th-position barre)
  [['C5', 0.75], ['A4', 0.25], ['F4', 1]],                  // 19 F
  [['G4', 0.5, { acc: -5 }], ['E5', 1.5, { acc: 8 }]],      // 20 C     and higher: the peak
  [['D5', 0.75, { acc: -3 }], ['C5', 0.25, PO], ['A4', 1]], // 21 Am
  [['C5', 0.5], ['A4', 0.5], ['F4', 0.5], ['E4', 0.5]],     // 22 Dm7   down the chord, back to 1st position
  [['D4', 1], ['E4', 0.5], ['F4', 0.5]],                    // 23 G7    walk-up below → A''
]);

// A'': two notes pushed an eighth early (travis anticipations), so these go by phrase, not by bar.
const A2 = [
  ['G4', 1, { ham: 'F4' }], ['E4', 0.5], ['C4', 0.25], ['A4', 1.75, { slide: 'G4', acc: 9 }], ['G4', 0.5], // 24-25 C C
  ['F4', 1], ['A3', 0.5], ['C4', 0.5],                                                                       // 26 F
  ['D4', 0.75, { ham: 'C4' }], ['E4', 0.25], ['D4', 1],                                                      // 27 G7
  ['E4', 1], ['C4', 0.5], ['A3', 0.25], ['F4', 1.75, { acc: 5 }], ['E4', 0.5],                               // 28-29 Am F  the hook in Am
  ['F4', 0.75], ['E4', 0.25, PO], ['D4', 0.5], ['C4', 0.5],                                                  // 30 Dm7
  ['B3', 0.5], ['D4', 0.5], ['E4', 0.5], ['F4', 0.5],                                                        // 31 G7   → G4 at bar 0
];
const a2len = A2.reduce((s, it) => s + it[1], 0);
if (Math.abs(a2len - 8 * NUM) > 1e-6) throw new Error(`A'': lasts ${a2len} units, not ${8 * NUM}`);

const tune = [
  ...K.melody(0, 0, A, { vel: 74 }),
  ...K.melody(8, 0, A1, { vel: 71 }),
  ...K.melody(16, 0, B, { vel: 74 }),
  ...K.melody(24, 0, A2, { vel: 69 }),
];
for (const b of [0, 4, 8, 12, 24, 28]) K.arc(tune, b, b + 4, 6, { peak: 0.55 });
K.arc(tune, 16, 24, 8, { peak: 0.53 });                     // B swells to the E5 in bar 20
contour(tune, 0.3, 4);

// ── the thumb ───────────────────────────────────────────────────────────────────────────────────
// One chord per bar, or two (a half each). Plain names: four quarters [root, between, alternate, between]
// in open position. '+': up the neck, thumb on the half notes only, on open strings where it can be.
const CHART = [
  'C', 'C', 'F', 'G7', 'C', 'Am', 'Dm7 G7', 'C',                  // A
  'C', 'C', 'F', 'G7', 'C', 'Am', 'Dm7 G7', 'C GB',               // A'
  'Am+', 'Am+', 'F+', 'F+', 'C+', 'Am+', 'Dm7+', 'G7w',           // B
  'C', 'C', 'F', 'G7', 'Am', 'F', 'Dm7', 'G7w',                   // A''
];
const TH = {
  C: [48, 52, 43, 52],          // C3 E3 G2 E3   x32010, the ring finger hops between the 5th and 6th strings
  F: [41, 53, 48, 53],          // F2 F3 C3 F3   thumb-over F, 1x3211
  G7: [43, 50, 47, 50],         // G2 D3 B2 D3   320001
  Am: [45, 52, 40, 52],         // A2 E3 E2 E3   x02210
  Dm7: [50, 45, 50, 45],        // D3 A2 D3 A2   xx0211
  GB: [47, 50],                 // B2 D3         G/B, x20003
  G7w: [43, 50, 45, 47],        // G2 D3 A2 B2   → C3: the walk-up
  'Am+': [45, null, 40, null],  // A2 . E2 .     open strings; the hand is up at the 5th-10th frets
  'F+': [53, null, 48, null],   // F3 . C3 .     A-shape barre at the 8th fret
  'C+': [48, null, 55, null],   // C3 . G3 .     E-shape barre at the 8th fret
  'Dm7+': [50, null, 45, null], // D3 . A2 .     open strings, xx0565
};
const chordsOf = (bar) => {
  const names = CHART[bar].split(' ');
  return names.map((name, k) => ({ name, from: bar * NUM + (NUM * k) / names.length, to: bar * NUM + (NUM * (k + 1)) / names.length }));
};
// section feel: [strong vel, between vel, between dur]
const FEEL = (bar) => (bar < 8 ? [64, 57, 0.3] : bar < 16 ? [62, 56, 0.25] : bar < 24 ? [65, 57, 0.3] : [61, 56, 0.3]);

const thumb = [];
for (let bar = 0; bar < BARS; bar++) {
  const [sv, wv, wd] = FEEL(bar);
  for (const c of chordsOf(bar)) {
    const pat = TH[c.name];
    for (let i = 0; i < pat.length && c.from + i * 0.5 < c.to - 1e-6; i++) {
      if (pat[i] == null) continue;
      const t = c.from + i * 0.5, s = t - bar * NUM;
      const strong = i % 2 === 0, walk = c.name === 'G7w' && i >= 2;
      const dur = walk ? 0.48 : strong ? Math.min(c.name.endsWith('+') ? 1 : 0.95, c.to - t) : wd;
      const vel = walk ? sv - 2 + i : strong ? sv + (s === 0 ? 2 : 0) : wv;
      thumb.push(...K.note(bar, s, pat[i], dur, vel));
    }
  }
}

// ── the fingers' fills ──────────────────────────────────────────────────────────────────────────
// Open position, on the off-beat eighths: a chord tone on an inner string, a major third or more under the
// tune. At 0.75 and 1.25 only while the tune holds a note (it started half a beat or more before); 1.75 leads
// into the next bar. Never where the tune plays, never the note the tune strikes next, never a fifth voice;
// the index and middle fingers take turns; cut at the chord change, or where the tune drops under it.
const FILL = { C: [60, 55], F: [60, 57], G7: [59, 55], Am: [60, 57], Dm7: [60, 57], GB: [55], G7w: [59, 55] };
const sounding = (ns, t) => ns.filter((n) => at(n) <= t + 1e-6 && at(n) + n.dur > t + 1e-3);
const fills = [];
function autoFill(bar, slots, vel, dur) {
  let prev = null;
  for (const s of slots) {
    const t = bar * NUM + s;
    if (tune.some((n) => Math.abs(at(n) - t) < 0.13)) continue;
    const mel = sounding(tune, t);
    if (!mel.length) continue;
    if (s < 1.5 && Math.max(...mel.map(at)) > t - 0.5 + 1e-6) continue;   // the tune is moving: leave the gap
    const ring = sounding([...tune, ...thumb, ...fills], t);
    if (ring.length >= 4) continue;
    const ch = chordsOf(bar).find((c) => t >= c.from - 1e-6 && t < c.to - 1e-6);
    const ref = Math.min(...mel.map((n) => n.pitch));
    const ok = FILL[ch.name].filter((q) => q <= ref - 4 && !ring.some((n) => n.pitch === q)
      && !tune.some((n) => n.pitch === q && at(n) > t && at(n) < t + 0.6));
    const p = ok.find((q) => q !== prev) ?? ok[0];
    if (p == null) continue;
    const under = tune.find((n) => at(n) > t + 1e-6 && at(n) < t + dur && n.pitch <= p + 2); // the tune drops below
    fills.push(...K.note(bar, s, p, Math.min(t + dur, ch.to, under ? at(under) : Infinity) - t, vel));
    prev = p;
  }
}
// Up the neck in B: written out, small arpeggios under the long notes, cut at the bar line.
const BFILL = {
  16: [[0.75, 'A3'], [1.25, 'C4'], [1.75, 'E4']],   // 5th position, Am
  17: [[0.5, 'C4'], [1.25, 'A3'], [1.75, 'C4']],
  18: [[0.75, 'C4'], [1.25, 'F4'], [1.75, 'A4']],   // 8th position, F
  19: [[0.5, 'C4'], [1.25, 'A3'], [1.75, 'C4']],
  20: [[0.75, 'C4'], [1.25, 'E4'], [1.75, 'G4']],   // 8th position, C
  21: [[0.5, 'A3'], [1.25, 'E4'], [1.75, 'C4']],    // 7th position, Am over the open A
  22: [[0.75, 'D4'], [1.25, 'A3'], [1.75, 'C4']],   // 5th position, Dm7 over the open D
};
for (let bar = 0; bar < BARS; bar++) {
  if (BFILL[bar]) {
    BFILL[bar].forEach(([s, p], k) => fills.push(...K.note(bar, s, p, Math.min(0.75, NUM - s), 62 + 2 * k)));
  } else if (bar < 8) autoFill(bar, [0.75, 1.25, 1.75], 61, 0.5);
  else if (bar < 16) autoFill(bar, [0.75, 1.75], 59, 0.45);
  else if (bar < 24) autoFill(bar, [0.75, 1.75], 60, 0.5);
  else autoFill(bar, [0.75, 1.75], 58, 0.5);
}

// accompaniment follows the B swell, a little
const acc = K.ramp([...thumb, ...fills], [[16, 0], [20.5, 5], [23, 1], [24, -1], [31, -1], [32, 1]]);

export default finish({
  id: 'relax-s5',
  title: 'Meadow at Noon',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'C major',
  description: 'A sunny, contented C-major pastorale in cut time for one steel-string guitar: a travis thumb rocking between C and G under a plain tune of thirds and sixths, a B part that climbs the neck through Am and F to a high E, and a G7 walk-up that rolls straight back in.',
  sections: [{ bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' }, { bar: 24, name: "A''" }],
  render: {
    forward: 'Guitar (steel)',
    leadOverRhythmDb: 0,
    reverb: 'warm hall, ~22% wet, 2.0 s',
    note: "solo steel-string; the thumb's in-between notes are short, palm-damped thumps, the roots ring; B (bars 16-23) sits high on the neck and should bloom a little",
  },
  tracks: [
    { name: 'Guitar (steel)', role: 'lead', program: 25, channel: 0, pan: 64, volume: 100, reverb: 48, notes: [...tune, ...acc] },
  ],
}, { humanize: { ms: 6, vel: 3 } });
