// menu-v4 — "The Mossy Tankard". E Dorian (E minor with a raised 6th, C#), 2/4 polka, quarter = 112.
// Form A A' B B' A(stop-time) A'' — 8-bar phrases, 48 bars. Nylon rhythm bounces root/fifth bass against short
// off-beat chops; steel lead plays a cheeky, staccato tune. Hook = bar 0 (B C# E, B C# E) answered by a run and a
// cheeky rest; Em/D shuttles, B lifts to G and A major (the Dorian IV); the stop-time pass drops the tune an octave.

import { kit, finish, contour } from '../song.mjs';

const BPM = 112, TS = [2, 4], BARS = 48;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 35, hamMs: 55, strumMs: 12 });

// ── lead: steel, the tune ──────────────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['B4', 0.25], ['C#5', 0.25], ['E5', 0.5], ['B4', 0.25], ['C#5', 0.25], ['E5', 0.5]],   // 0  Em   the hook
  [['G5', 0.25], ['F#5', 0.25], ['E5', 0.25], ['D5', 0.25], ['E5', 0.5], [null, 0.5]],    // 1  D Em ...and a cheeky rest
  [['A4', 0.25], ['B4', 0.25], ['D5', 0.5], ['A4', 0.25], ['B4', 0.25], ['D5', 0.5]],     // 2  D    the hook a step down
  [['F#5', 0.25], ['E5', 0.25], ['D5', 0.25], ['C#5', 0.25], ['D5', 0.5], [null, 0.5]],   // 3  A D
  [['B4', 0.25], ['C#5', 0.25], ['E5', 0.5], ['B4', 0.25], ['C#5', 0.25], ['E5', 0.5]],   // 4  Em
  [['G5', 0.5], ['D5', 0.25], ['B4', 0.25], ['G4', 0.5], ['B4', 0.5]],                    // 5  G
  [['A4', 0.25], ['B4', 0.25], ['C#5', 0.25], ['D5', 0.25], ['E5', 0.5], ['A5', 0.5]],    // 6  A    up the Dorian scale, octave hop
  [['F#5', 0.25], ['G5', 0.25], ['F#5', 0.25], ['D5', 0.25], ['E5', 0.5], [null, 0.5]],   // 7  D Em
], { vel: 80 });

const A1 = K.bars("A'", [
  [['B4', 0.25], ['C#5', 0.25], ['E5', 0.5, { cut: 'F#5' }], ['B4', 0.25], ['C#5', 0.25], ['E5', 0.5]],
  [['G5', 0.25], ['F#5', 0.25], ['E5', 0.25], ['D5', 0.25], ['E5', 0.5], [null, 0.5]],
  [['A4', 0.25], ['B4', 0.25], ['D5', 0.5, { cut: 'E5' }], ['A4', 0.25], ['B4', 0.25], ['D5', 0.5]],
  [['F#5', 0.25], ['E5', 0.25], ['D5', 0.25], ['C#5', 0.25], ['D5', 0.5], [null, 0.5]],
  [['E5', 0.25], ['F#5', 0.25], ['G5', 0.5], ['E5', 0.25], ['F#5', 0.25], ['G5', 0.5]],   // 12 Em   the hook a third higher
  [['D5', 0.5], ['G5', 0.25], ['D5', 0.25], ['B4', 0.5], ['D5', 0.5]],                    // 13 G
  [['C#5', 0.25], ['D5', 0.25], ['E5', 0.25], ['F#5', 0.25], ['G5', 0.25], ['F#5', 0.25], ['E5', 0.5]], // 14 A
  [['F#5', 0.5], ['D5', 0.5], ['A4', 0.5], ['G4', 0.25], ['A4', 0.25]],                   // 15 D    G-A pickup into B
], { vel: 82 });

const B = K.bars('B', [
  [['B4', 0.25], ['D5', 0.25], ['G5', 1], ['F#5', 0.25], ['E5', 0.25]],                   // 16 G
  [['F#5', 0.5], ['D5', 0.5], ['A4', 0.5], ['D5', 0.5]],                                  // 17 D
  [['C#5', 0.25], ['E5', 0.25], ['A5', 1], ['G5', 0.25], ['F#5', 0.25]],                  // 18 A    the lift: Dorian IV
  [['G5', 0.5], ['E5', 0.5], ['B4', 0.5], ['E5', 0.5]],                                   // 19 Em
  [['B4', 0.25], ['D5', 0.25], ['G5', 1], ['F#5', 0.25], ['E5', 0.25]],                   // 20 G
  [['F#5', 0.25], ['G5', 0.25], ['F#5', 0.25], ['E5', 0.25], ['D5', 0.5], ['B4', 0.5]],   // 21 Bm
  [['A4', 0.25], ['C#5', 0.25], ['E5', 0.5], ['A5', 0.5], ['E5', 0.5]],                   // 22 A
  [['F#5', 0.25], ['E5', 0.25], ['D5', 0.25], ['A4', 0.25], ['D5', 0.5], [null, 0.5]],    // 23 D
], { vel: 84 });

const B1 = K.bars("B'", [
  [['B4', 0.25], ['D5', 0.25], [['G5', 'B4'], 1], ['F#5', 0.25], ['E5', 0.25]],
  [[['F#5', 'A4'], 0.5], ['D5', 0.5], ['A4', 0.5], ['D5', 0.5]],
  [['C#5', 0.25], ['E5', 0.25], [['A5', 'C#5'], 1], ['G5', 0.25], ['F#5', 0.25]],
  [['G5', 0.5, { cut: 'A5' }], ['E5', 0.5], ['B4', 0.5], ['E5', 0.5]],
  [['B4', 0.25], ['D5', 0.25], [['G5', 'D5'], 1], ['F#5', 0.25], ['E5', 0.25]],
  [['F#5', 0.25], ['G5', 0.25], ['F#5', 0.25], ['E5', 0.25], [['D5', 'B4'], 0.5], ['B4', 0.5]],
  [['A4', 0.25], ['C#5', 0.25], ['E5', 0.5], [['A5', 'E5'], 0.5], ['G5', 0.5]],
  [['F#5', 0.25], ['E5', 0.25], ['D5', 0.25], ['A4', 0.25], ['D5', 0.5], [null, 0.5]],    // 31 D    rest, then the hook
], { vel: 87 });

const A3 = K.bars("A''", [
  [['B4', 0.25], ['C#5', 0.25], ['E5', 0.5, { cut: 'F#5' }], ['B4', 0.25], ['C#5', 0.25], [['E5', 'B4'], 0.5]],
  [['G5', 0.25], ['F#5', 0.25], ['E5', 0.25], ['D5', 0.25], ['E5', 0.5], [null, 0.5]],
  [['A4', 0.25], ['B4', 0.25], ['D5', 0.5, { cut: 'E5' }], ['A4', 0.25], ['B4', 0.25], [['D5', 'A4'], 0.5]],
  [['F#5', 0.25], ['E5', 0.25], ['D5', 0.25], ['C#5', 0.25], ['D5', 0.5], [null, 0.5]],
  [['E5', 0.25], ['F#5', 0.25], ['G5', 0.5], ['E5', 0.25], ['F#5', 0.25], ['G5', 0.5]],
  [['D5', 0.5], ['G5', 0.25], ['D5', 0.25], ['B4', 0.5], ['D5', 0.5]],
  [['A4', 0.25], ['B4', 0.25], ['C#5', 0.25], ['D5', 0.25], ['E5', 0.5], [['A5', 'C#5'], 0.5]],
  [['F#5', 0.25], ['G5', 0.25], ['F#5', 0.25], ['D5', 0.25], ['E5', 0.5], [null, 0.25], ['A4', 0.25, { stac: true }]], // 47 D Em → A4 pickup → bar 0
], { vel: 83 });

const head = K.melody(0, 0, [...A, ...A1, ...B, ...B1]);                  // bars 0-31
const stop = [
  ...K.repeatBars(head, 0, 4, 32, { transpose: -12, velAdd: -3 }),        // 32-35 the hook an octave down, stop-time
  ...K.repeatBars(head, 4, 4, 36, { velAdd: -1 }),                        // 36-39 back up, band back in
];
const tail = K.melody(40, 0, A3);
let lead = [...head, ...stop, ...tail];
lead = lead.map((n) => (Math.abs(n.dur - 0.5) < 1e-6 ? { ...n, dur: 0.36 } : n)); // bouncy, detached eighths
for (let b = 0; b < BARS; b += 4) K.arc(lead, b, b + 4, 5, { peak: 0.55 });
contour(lead, 0.3, 4);

// ── rhythm: nylon, oom-pah — bass on the beat (root, then fifth), short chops on the off-beats ───
const V = {
  Em: { b: 40, a: 47, all: [40, 47, 52, 55, 59, 64] },   // 022000, chops G3 B3 E4
  D: { b: 50, a: 45, all: [50, 57, 62, 66] },            // xx0232
  A: { b: 45, a: 40, all: [45, 52, 57, 61, 64] },        // x02220
  G: { b: 43, a: 50, all: [43, 47, 50, 55, 59, 67] },    // 320003
  Bm: { b: 47, a: 42, all: [47, 54, 59, 62, 66] },       // x24432
};
const P = {
  polka: [[0, 'b', 0.45, 8], [0.5, 'D3', 0.28, -8], [1, 'a', 0.45, 3], [1.5, 'D3', 0.28, -10]],
  polka2: [[0, 'b', 0.45, 8], [0.5, 'D3', 0.25, -8], [0.75, 'U3', 0.2, -14], [1, 'a', 0.45, 3], [1.5, 'D3', 0.25, -10], [1.75, 'U3', 0.2, -15]],
  stop: [[0, 'D', 0.3, 6], [1, 'b', 0.4, -2], [1.5, 'a', 0.4, -4]],
};
const cfg = (vel) => ({ voicings: V, patterns: P, vel });
const rhythm = [
  ...K.comp(0, 'Em | D Em | D | A D | Em | G | A | D Em', 'polka', cfg(70)),
  ...K.comp(8, 'Em | D Em | D | A D | Em | G | A | D', 'polka', cfg(72)),
  ...K.comp(16, 'G | D | A | Em | G | Bm | A | D', 'polka2', cfg(74)),
  ...K.comp(24, 'G | D | A | Em | G | Bm | A | D', 'polka2', cfg(77)),
  ...K.comp(32, 'Em | D Em | D | A D', 'stop', cfg(72)),
  ...K.comp(36, 'Em | G | A | D Em', 'polka', cfg(72)),
  ...K.comp(40, 'Em | D Em | D | A D | Em | G | A | D Em', 'polka', cfg(74)),
];
for (let b = 0; b < BARS; b += 8) K.arc(rhythm, b, b + 8, 4);

export default finish({
  id: 'menu-v4',
  title: 'The Mossy Tankard',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'E Dorian',
  description: 'Cheeky 2/4 tavern-in-the-woods polka in E Dorian: bouncing root/fifth bass and off-beat chops on nylon, a staccato steel-string tune with rests and octave hops, a B part lifting to G and A major, and a stop-time pass.',
  sections: [
    { bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' },
    { bar: 24, name: "B'" }, { bar: 32, name: 'A (stop-time)' }, { bar: 40, name: "A''" },
  ],
  render: { forward: 'Lead (steel)', leadOverRhythmDb: 3, reverb: 'small wooden room, ~12% wet, 0.8 s', note: 'chops are short on purpose; keep the bass round and dry so it bounces' },
  tracks: [
    { name: 'Lead (steel)', role: 'lead', program: 25, channel: 0, pan: 88, volume: 98, reverb: 24, notes: lead },
    { name: 'Rhythm (nylon)', role: 'rhythm', program: 24, channel: 1, pan: 40, volume: 90, reverb: 20, notes: rhythm },
  ],
}, { humanize: { ms: 5, vel: 3 } });
