// relax-d4 — "Embers Beneath the Oaks". E major, 6/8 slow rock, dotted quarter = 58.
// Form A A' B A'' — 8-bar phrases, 32 bars (66 s). Two nylon guitars, a campfire lullaby. The rhythm guitar rocks
// E ↔ A/E (and Bsus4 → B7) over the open low-E drone with a rolling p-i-m-a-m-i arpeggio; the lead sings a plain,
// tender tune that leans on suspensions. Hook = bars 0-1 (E5—B4 G#5~ | ~G#5 F#5 E5——): a falling 4th, then a rising
// 6th held over the bar line, so the G# hangs against the A chord and sighs down to E. B goes to C#m and A and
// climbs the same gesture a step at a time (G#5, A5, B5); A'' comes back hushed and re-harmonised (C#m7 under the
// answer, a wistful Am/E) and ends E5 → D#5 over Bsus4 → B7, so bar 31 rolls straight back into bar 0.

import { kit, finish, contour, pitch } from '../song.mjs';

const BPM = 58, TS = [6, 8], BARS = 32;
const K = kit({ bpm: BPM, timeSig: TS, cutMs: 45, hamMs: 80, strumMs: 26 });
const N = K.num;

/** ['~', d] holds the previous note (or double stop) on across the bar line: a tie. */
const tie = (items) => items.reduce((out, it) => {
  if (it[0] !== '~') out.push(it);
  else { const p = out[out.length - 1]; out[out.length - 1] = [p[0], p[1] + it[1], ...p.slice(2)]; }
  return out;
}, []);

// ── lead: nylon, the lullaby ───────────────────────────────────────────────────────────────────
const A = K.bars('A', [
  [['E5', 2], ['B4', 1], ['G#5', 3]],                      // 0  E      the hook: down a 4th, up a 6th...
  [['~', 2], ['F#5', 1], ['E5', 3]],                       // 1  A/E    ...G# held against A, sighing to E
  [['C#5', 2], ['B4', 1], ['G#4', 2], ['B4', 1]],          // 2  E
  [['E5', 3], ['D#5', 3]],                                 // 3  Bsus4 B7   4-3
  [['E5', 2], ['B4', 1], ['G#5', 3]],                      // 4  E
  [['~', 2], ['F#5', 1], ['E5', 3]],                       // 5  A/E
  [['A5', 2], ['G#5', 1], ['F#5', 3]],                     // 6  F#m7 B7
  [['~', 1], ['E5', 4], ['B4', 1]],                        // 7  E      9-8, then the pickup
], { vel: 70 });

const A1 = K.bars("A'", [
  [['E5', 2], ['B4', 1], ['G#5', 3, { ham: 'F#5' }]],      // 8  Eadd9
  [['~', 2], ['F#5', 1], ['E5', 2], ['C#5', 1]],           // 9  A/E
  [['G#4', 2], ['B4', 1], ['E5', 2], ['F#5', 1]],          // 10 E      the answer climbs this time
  [['~', 2], ['E5', 1], ['D#5', 3]],                       // 11 Bsus4 B7
  [['E5', 2], ['B4', 1], ['G#5', 3]],                      // 12 Eadd9
  [['~', 1], ['F#5', 1], ['E5', 1], ['C#5', 3]],           // 13 A/E    a quicker sigh, down to C#...
  [['A5', 2], ['G#5', 1], ['F#5', 3]],                     // 14 F#m7 B7   ...and a rising 6th up to A
  [['~', 1], ['E5', 2], ['B4', 3]],                        // 15 E E/G#  the bass walks up into C#m
], { vel: 67 });

const B = K.bars('B', [
  [['G#4', 1, { acc: -6 }], ['C#5', 1, { acc: 2 }], ['E5', 1, { acc: 2 }], ['G#5', 3]], // 16 C#m7   the hook's leap, filled in
  [['~', 2], ['F#5', 1], ['E5', 3]],                       // 17 A      the same sigh over A
  [['A4', 1, { acc: -6 }], ['C#5', 1, { acc: 2 }], ['E5', 1, { acc: 2 }], ['A5', 3]],   // 18 F#m7   a step higher
  [['~', 2], ['G#5', 1], ['F#5', 3]],                      // 19 Bsus4 B7
  [['B4', 1, { acc: -6 }], ['E5', 1, { acc: 2 }], ['G#5', 1, { acc: 2 }], ['B5', 3, { cut: 'A5', acc: -3 }]], // 20 C#m7   and higher: the peak
  [['~', 2], ['A5', 1], ['E5', 3]],                        // 21 A      9-8
  [['F#5', 2, { acc: -4 }], ['E5', 1], ['C#5', 2, { acc: -2 }], ['E5', 1]], // 22 F#m7   settling
  [['~', 3], ['D#5', 2], ['B4', 1]],                       // 23 Bsus4 B7   tied 4-3, pickup home
], { vel: 72 });

const A2 = K.bars("A''", [
  [['E5', 2, { cut: 'F#5' }], ['B4', 1], [['G#5', 'B4'], 3]], // 24 E      hushed return, in sixths
  [['~', 2], [['F#5', 'A4'], 1], ['E5', 3]],               // 25 A/E
  [['C#5', 2], ['B4', 1], ['G#4', 2], ['B4', 1]],          // 26 C#m7   the answer, re-harmonised
  [['E5', 3], ['D#5', 3]],                                 // 27 A B7
  [['E5', 2], ['B4', 1], ['G#5', 3, { slide: 'F#5' }]],    // 28 E
  [['~', 2], ['F#5', 1], ['E5', 3]],                       // 29 A/E Am/E   the wistful minor iv under E
  [['A5', 2], ['G#5', 1], ['F#5', 2], ['E5', 1]],          // 30 F#m7
  [['~', 3], ['D#5', 2], ['B4', 1]],                       // 31 Bsus4 B7   → bar 0, never a final cadence
], { vel: 68 });

const lead = K.melody(0, 0, tie([...A, ...A1, ...B, ...A2]));
K.ramp(lead, [[0, 0], [6, 3], [7.5, -1], [8, -2], [14, 2], [15.5, -2], [16, -2], [19, 1], [20.6, 8], [21.5, 4], [22.5, 1], [23.5, -1], [24, -3], [27.5, -3], [29, 0], [31, 3], [32, 1]]);
for (let b = 0; b < BARS; b += 2) K.arc(lead, b, b + 2, 4, { peak: 0.3 });
contour(lead, 0.3, 4);

// ── rhythm: nylon, fingerpicked; one note per string, open-position shapes ─────────────────────
// strings low → high: E A D G B e. null = not played (damped when the chord comes).
const SH = {
  E: [40, 47, 52, 56, 59, 64],          // 022100
  Eadd9: [40, 47, 54, 56, 59, 64],      // 024100
  AE: [40, 45, 52, 57, 61, 64],         // 002220  A/E, the low E keeps droning
  AmE: [40, 45, 52, 57, 60, 64],        // 002210  Am/E
  Bs: [null, 47, 52, 57, 59, 66],       // x22202  B7sus4
  B7: [null, 47, 51, 57, 59, 66],       // x21202
  Cm7: [null, 49, 52, 56, 59, 64],      // x42100  C#m7
  A: [null, 45, 52, 57, 61, 64],        // x02220
  Fm7: [42, 45, 52, 57, 61, 64],        // 202220  F#m7, open A
  EGs: [44, null, 52, 56, 59, 64],      // 4x2100  E/G#
};
const BASS = { E: [0, 1], Eadd9: [0, 1], AE: [0, 1], AmE: [0, 1], Bs: [1, 2], B7: [1, 2], Cm7: [1, 2], A: [1, 2], Fm7: [0, 1], EGs: [0, 2] };
// [beat, who, velAdd, { ring, staggerMs }] — who: 'b' bass, 'a' alternate bass, 0..5 a string,
// { s, p } a given note on string s, 'R' a rolled chord (bass + D, G, B strings).
const PAT = {
  rock: [[0, 'b', 6], [1, 3, -4], [2, 4, -3], [3, 5, -1], [4, 4, -5], [5, 3, -6]],               // p i m a m i
  rockA: [[0, 'b', 6], [1, 3, -4], [2, 4, -3], [3, 'a', 2], [3, 5, -3], [4, 4, -5], [5, 3, -6]],
  sus: [[0, 'b', 6], [1, 2, -2], [2, 4, -4], [3, 2, 0], [3, 5, -3], [4, 3, -5], [5, 4, -6]],     // D string: E → D#
  split: [[0, 'b', 6], [1, 3, -4], [2, 4, -3], [3, 'b', 3], [3, 5, -3], [4, 3, -5], [5, 4, -6]],
  pinch: [[0, 'b', 6], [0, 5, -2], [1, 3, -5], [2, 4, -4], [3, 'a', 2], [4, 2, -6], [5, 4, -5]],
  pinchSplit: [[0, 'b', 6], [0, 5, -2], [1, 3, -5], [2, 4, -4], [3, 'b', 3], [4, 2, -6], [5, 4, -5]],
  walk: [[0, 'b', 6], [0, 5, -2], [1, 3, -5], [2, 4, -4], [3, 'b', 3], [4, 3, -6], [5, { s: 1, p: 'B2' }, 1]],
  run: [[0, 'R', 4], [3, 'a', 1], [3, 5, -2], [4, 4, -5], [5, 3, -6]],                           // the lead runs: room
  flow: [[0, 'b', 6], [1, 3, -3], [2, 4, -2], [3, 'a', 2], [3, 5, -2], [4, 4, -4], [5, 3, -5]],
  air: [[0, 'b', 4], [1, 3, -4], [2, 4, -3], [3, 5, -2], [5, 4, -5]],
  airSplit: [[0, 'b', 4], [1, 3, -4], [2, 4, -3], [3, 'b', 2], [3, 5, -2], [5, 2, -4]],
};

/** 'E | AE | Bs B7@3' with one pattern per bar → [{ bar, segs: [{ name, from, to }], pat }]. */
function chart(startBar, prog, pats) {
  return prog.split('|').map((tok, i) => {
    const segs = tok.trim().split(/\s+/).map((t, k) => {
      const [name, at] = t.split('@');
      if (!SH[name]) throw new Error(`no shape ${name}`);
      if (k && at == null) throw new Error(`bar ${startBar + i}: second chord needs @beat`);
      return { name, from: k ? Number(at) : 0 };
    });
    segs.forEach((s, k) => (s.to = k + 1 < segs.length ? segs[k + 1].from : N));
    return { bar: startBar + i, segs, pat: pats[i] };
  });
}

/** Plucks per the patterns; every string rings until it is plucked again, its note changes with the
 *  chord (fretted differently or damped), or its `ring` (default one bar) runs out. */
function pick(bars, vel) {
  const plucks = [];
  for (const { bar, segs, pat } of bars) {
    if (!PAT[pat]) throw new Error(`no pattern ${pat}`);
    for (const [beat, who, va = 0, o = {}] of PAT[pat]) {
      const seg = segs.find((s) => beat >= s.from - 1e-9 && beat < s.to - 1e-9);
      const sh = SH[seg.name], [bs, as] = BASS[seg.name];
      const t = bar * N + beat;
      if (who === 'R') {
        [bs, 2, 3, 4].filter((s, i, a) => sh[s] != null && a.indexOf(s) === i)
          .forEach((s, i) => plucks.push({ t: t + i * K.ms(o.staggerMs ?? 28), s, p: sh[s], v: vel + va - 2 * i, ring: o.ring ?? N }));
        continue;
      }
      const s = who === 'b' ? bs : who === 'a' ? as : typeof who === 'object' ? who.s : who;
      const p = typeof who === 'object' ? pitch(who.p) : sh[s];
      if (p == null) throw new Error(`bar ${bar}: string ${s} is not in ${seg.name}`);
      plucks.push({ t, s, p, v: vel + va, ring: o.ring ?? N });
    }
  }
  const changes = bars.flatMap((b) => b.segs.map((s) => ({ at: b.bar * N + s.from, sh: SH[s.name] })));
  plucks.sort((a, b) => a.t - b.t);
  return plucks.map((pl, i) => {
    let end = pl.t + pl.ring;
    const again = plucks.slice(i + 1).find((q) => q.s === pl.s);
    if (again) end = Math.min(end, again.t);
    const chg = changes.find((c) => c.at > pl.t + 1e-9 && c.sh[pl.s] !== pl.p);
    if (chg) end = Math.min(end, chg.at);
    return K.note(0, pl.t, pl.p, end - pl.t, pl.v)[0];
  });
}

const bars = [
  ...chart(0, 'E | AE | E | Bs B7@3 | E | AE | Fm7 B7@3 | E',
    ['rock', 'rock', 'rock', 'sus', 'rock', 'rock', 'split', 'rockA']),
  ...chart(8, 'Eadd9 | AE | E | Bs B7@3 | Eadd9 | AE | Fm7 B7@3 | E EGs@3',
    ['pinch', 'pinch', 'pinch', 'sus', 'pinch', 'pinch', 'pinchSplit', 'walk']),
  ...chart(16, 'Cm7 | A | Fm7 | Bs B7@3 | Cm7 | A | Fm7 | Bs B7@3',
    ['run', 'flow', 'run', 'sus', 'run', 'flow', 'flow', 'sus']),
  ...chart(24, 'E | AE | Cm7 | A B7@3 | E | AE AmE@3 | Fm7 | Bs B7@3',
    ['air', 'air', 'air', 'airSplit', 'rock', 'rock', 'rockA', 'sus']),
];
const rhythm = pick(bars, 61);
K.ramp(rhythm, [[0, 0], [8, -1], [16, 1], [20.5, 5], [22, 3], [24, -2], [27.5, -2], [28.5, 0], [32, 0]]);
for (let b = 0; b < BARS; b += 4) K.arc(rhythm, b, b + 4, 3, { peak: 0.5 });

export default finish({
  id: 'relax-d4',
  title: 'Embers Beneath the Oaks',
  bpm: BPM,
  timeSig: TS,
  bars: BARS,
  key: 'E major',
  description: 'A campfire lullaby for two nylon guitars, rocking slowly in 6/8 between E and A over an open low-E drone, with a tender tune that hangs on suspensions, a B part that lifts through C#m and A to a high B, and a half cadence that rolls back into the start.',
  sections: [{ bar: 0, name: 'A' }, { bar: 8, name: "A'" }, { bar: 16, name: 'B' }, { bar: 24, name: "A''" }],
  render: {
    forward: 'Lead (nylon)', leadOverRhythmDb: 3, reverb: 'warm hall, ~25% wet, 2.2 s',
    note: 'both nylon, soft and close; let the low E drone and the open strings ring; the B section rolls its downbeat chords; the lead peaks once (B5, bar 20)',
  },
  tracks: [
    { name: 'Lead (nylon)', role: 'lead', program: 24, channel: 0, pan: 86, volume: 100, reverb: 54, notes: lead },
    { name: 'Rhythm (nylon)', role: 'rhythm', program: 24, channel: 1, pan: 40, volume: 86, reverb: 60, notes: rhythm },
  ],
}, { humanize: { ms: 7, vel: 3 } });
