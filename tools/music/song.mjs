// tools/music/song.mjs — the menu-music song format, the helpers the songs are written with, and validate().
// Zero dependencies.
//
// A song (one seamless loop: bar `bars` is bar 0 again):
//   { id, title, bpm, timeSig: [num, den], bars, key, description, sections?: [{ bar, name }],
//     tracks: [{ name, role: 'lead' | 'rhythm', program, channel, pan, volume, reverb?, notes }] }
// A note: { bar, beat, pitch, dur, vel }
//   beat  0-based position inside the bar in units of the time signature's denominator note
//         (6/8: eighths, so beat 3 is the 4th eighth; 3/4, 4/4, 2/4: quarters). Floats are fine.
//   dur   same units.   pitch  MIDI note number (C4 = 60, E2 = 40, the guitar's low E).   vel  1..127.
// bpm counts the FELT beat: the dotted quarter in compound metres (6/8, 9/8, 12/8), otherwise the
// denominator note (3/4, 4/4, 2/4 → quarters). unitSeconds(song) converts.
//
// Pitches may be written as numbers or names ('F#5', 'Bb3', 'C4').

const EPS = 1e-6;
const r6 = (x) => Math.round(x * 1e6) / 1e6;

// ── pitches ────────────────────────────────────────────────────────────────────────────────────
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function pitch(x) {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  const m = /^([A-Ga-g])([#b]*)(-?\d)$/.exec(String(x).trim());
  if (!m) throw new Error(`bad pitch ${JSON.stringify(x)}`);
  let n = STEP[m[1].toUpperCase()];
  for (const c of m[2]) n += c === '#' ? 1 : -1;
  return n + (Number(m[3]) + 1) * 12;
}
export const noteName = (n) => NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);

// ── time ───────────────────────────────────────────────────────────────────────────────────────
export const isCompound = ([num, den]) => den === 8 && num % 3 === 0 && num > 3;
export const pulseUnits = (ts) => (isCompound(ts) ? 3 : 1);
export const bpmUnit = (ts) => (isCompound(ts) ? 'dotted quarter' : ({ 2: 'half', 4: 'quarter', 8: 'eighth', 16: 'sixteenth' })[ts[1]] ?? `1/${ts[1]}`);
const unitSecondsOf = (bpm, ts) => (isCompound(ts) ? 60 / bpm / 3 : 60 / bpm);
export const unitSeconds = (song) => unitSecondsOf(song.bpm, song.timeSig);
export const barSeconds = (song) => unitSeconds(song) * song.timeSig[0];
export const durationSeconds = (song) => barSeconds(song) * song.bars;

/** Absolute position of a note in units from the start of the song. */
export const start = (n, num) => n.bar * num + n.beat;
function place(abs, num) {
  abs = r6(abs);
  const bar = Math.floor(abs / num + EPS);
  return { bar, beat: Math.max(0, r6(abs - bar * num)) };
}
function needNum(o) {
  if (!o || !Number.isFinite(o.num)) throw new Error('helper needs opts.num (beats per bar) — or use kit()');
  return o.num;
}
function mk(abs, p, dur, vel, num) {
  return { ...place(abs, num), pitch: pitch(p), dur: r6(dur), vel: Math.round(vel) };
}
/** Re-express notes so every beat is inside its bar (0 <= beat < num). */
export const normalize = (notes, num) => notes.map((n) => ({ ...n, ...place(start(n, num), num) }));

// ── building blocks ────────────────────────────────────────────────────────────────────────────
export function note(bar, beat, p, dur, vel = 80, opts) {
  return [mk(bar * needNum(opts) + beat, p, dur, vel, opts.num)];
}

/** A strummed (or plucked) chord. Down = low→high, up = high→low; each string `stagger` units later,
 *  all strings stop together. Up-strums lose a little more velocity per string than down-strums. */
export function chord(bar, beat, pitches, dur, vel = 80, opts = {}) {
  const num = needNum(opts);
  const { strum = 'down', stagger = 0.1, velStep } = opts;
  const ps = pitches.map(pitch).sort((a, b) => a - b);
  const order = strum === 'up' ? [...ps].reverse() : ps;
  const step = strum === 'none' ? 0 : stagger;
  const vs = velStep ?? (strum === 'up' ? 3 : strum === 'none' ? 0 : 2);
  return order.map((p, i) => mk(bar * num + beat + i * step, p, Math.max(dur - i * step, dur * 0.5), vel - i * vs, num));
}

/** A broken chord: pitches in the given order, one every `step` units, each lasting `dur`. */
export function arp(bar, beat, pitches, step, dur, vel = 75, opts = {}) {
  const num = needNum(opts);
  return pitches.map((p, i) => mk(bar * num + beat + i * step, p, dur, vel - i * (opts.velStep ?? 0), num));
}

function metricAccent(abs, ts) {
  const [num] = ts;
  const b = r6(((abs % num) + num) % num);
  const on = (x, m) => Math.abs(x / m - Math.round(x / m)) < 1e-4;
  if (b < 1e-4) return 6;
  if (isCompound(ts)) {
    const inGroup = r6(b % 3);
    if (inGroup < 1e-4) return 3;
    if (Math.abs(inGroup - 1) < 1e-4) return -4;
    if (Math.abs(inGroup - 2) < 1e-4) return -1;
    return -3;
  }
  if (num === 4 && on(b, 2)) return 4;
  if (on(b, 1)) return 2;
  if (on(b, 0.5)) return -1;
  return -3;
}

/** A melodic line, notes one after another from (bar, beat).
 *  seq items: [pitch | [pitch, pitch] (double stop) | null (rest), dur, vel?, ornament?]
 *  ornaments: { cut: 'E5' }  grace flicked in just before the beat (shortens the previous note)
 *             { ham: 'D5' }  hammer-on: grace on the beat, main note a hair later and softer
 *             { pull: 'G5' } pull-off, same timing as ham     { slide: 'C#5' } likewise
 *             { stac: true } staccato (sounds half the written length)   { acc: +n } extra accent
 *             { g: units }   override the grace length */
export function melody(bar, beat, seq, opts = {}) {
  const num = needNum(opts);
  const { timeSig = [num, 4], vel = 78, cut = 0.1, ham = 0.15, accent = true } = opts;
  let pos = bar * num + beat;
  const out = [];
  let prev = [];
  for (const item of seq) {
    let [p, dur, v, orn] = item;
    if (v && typeof v === 'object') { orn = v; v = undefined; }
    orn = orn || {};
    if (!(dur > 0)) throw new Error(`melody: bad duration in ${JSON.stringify(item)}`);
    if (p == null) { pos += dur; prev = []; continue; }
    const base = (v ?? vel) + (accent ? metricAccent(pos, timeSig) : 0) + (orn.acc || 0);
    const ps = (Array.isArray(p) ? p : [p]).map(pitch).sort((a, b) => b - a); // top voice first
    let at = pos, len = dur, mainVel = base;
    if (orn.cut != null) {
      const g = orn.g ?? cut;
      if (pos - g < 0) throw new Error('melody: a cut before the very start of the song');
      for (const q of prev) {
        const s = start(q, num);
        if (s + q.dur > pos - g) q.dur = r6(Math.max(0.02, pos - g - s));
      }
      out.push(mk(pos - g, orn.cut, g, base - 14, num));
    }
    const gp = orn.ham ?? orn.pull ?? orn.slide;
    if (gp != null) {
      const g = orn.g ?? ham;
      out.push(mk(pos, gp, g, base, num));
      at = pos + g; len = dur - g; mainVel = base - 9;
    }
    const sound = orn.stac ? len * 0.5 : len;
    prev = ps.map((q, i) => mk(at, q, sound, mainVel - i * 9, num));
    out.push(...prev);
    pos += dur;
  }
  return out;
}

// ── accompaniment from a chord chart ───────────────────────────────────────────────────────────
// voicing: { b: root bass, a: alternate bass, c: second alternate, m/u/t: 3rd/2nd/1st-string notes,
//            x: colour note, n: [upper notes, low→high] for '1'..'4', all: every string of the shape }
// pattern: [[beat, roles, dur, velAdd?, { ring }?], ...] — roles 'b', 'a', 'b+t' (pinch), '2' (n[1]),
//   'D' / 'D3' (down-strum all / top 3 strings), 'U' / 'U3' (up-strum top 4 / top 3).
// prog: 'D | C G | Em@0 D@2 | %' — one token list per bar, chords share the bar evenly unless given
//   '@beat'; '%' repeats the previous chord; 'D!walk' plays that bar with pattern 'walk'.
// Ringing notes are cut at the next chord change unless { ring: true }. A thumb note that falls on a
// chord change plays the new chord's root.
const FALLBACK = { c: 'a', x: 'u', m: 'u', u: 'm', t: 'u' };
function role(v, key) {
  if (/^\d+$/.test(key)) {
    if (!v.n?.length) throw new Error('voicing has no n[] for numbered roles');
    return v.n[(Number(key) - 1) % v.n.length];
  }
  let k = key, guard = 0;
  while (v[k] == null && FALLBACK[k] && guard++ < 4) k = FALLBACK[k];
  if (v[k] == null) throw new Error(`voicing has no role "${key}"`);
  return v[k];
}
const allOf = (v) => v.all ?? [...new Set([v.b, ...(v.n ?? []), v.m, v.u, v.t].filter((x) => x != null && x >= v.b))].sort((a, b) => a - b);

export function comp(startBar, prog, pat, opts = {}) {
  const num = needNum(opts);
  const { voicings, patterns = {}, vel = 70, stagger = 0.1 } = opts;
  const out = [];
  let last = null;
  prog.split('|').map((s) => s.trim()).forEach((tok, i) => {
    const bar = startBar + i;
    const [chords, pname] = tok.split('!').map((s) => s.trim());
    const p = pname ? patterns[pname] : typeof pat === 'string' ? patterns[pat] : pat;
    if (!p) throw new Error(`comp: no pattern ${pname ?? pat}`);
    const toks = chords.split(/\s+/).filter(Boolean);
    const segs = toks.map((t, k) => {
      let [name, at] = t.split('@');
      if (name === '%') name = last;
      return { name, from: at != null ? Number(at) : (num * k) / toks.length };
    });
    segs.forEach((s, k) => (s.to = k + 1 < segs.length ? segs[k + 1].from : num));
    last = segs.at(-1).name;
    for (const [beat, roles, dur, va = 0, o = {}] of p) {
      const seg = segs.find((s) => beat >= s.from - EPS && beat < s.to - EPS);
      const v = voicings[seg.name];
      if (!v) throw new Error(`comp: no voicing "${seg.name}" (bar ${bar})`);
      const len = o.ring ? dur : Math.min(dur, seg.to - beat);
      const fresh = seg.from > EPS && Math.abs(seg.from - beat) < EPS;
      const vv = vel + va;
      const sm = /^([DU])(\d*)$/.exec(roles);
      if (sm) {
        const all = allOf(v);
        const n = sm[2] ? Number(sm[2]) : sm[1] === 'U' ? 4 : all.length;
        out.push(...chord(bar, beat, all.slice(-n), len, vv, { num, strum: sm[1] === 'D' ? 'down' : 'up', stagger }));
      } else {
        roles.split('+').forEach((r, k) => {
          const key = fresh && (r === 'a' || r === 'c') ? 'b' : r;
          out.push(mk(bar * num + beat, role(v, key), len, vv - (k ? 4 : 0), num));
        });
      }
    }
  });
  return out;
}

// ── transforming notes ─────────────────────────────────────────────────────────────────────────
export const transpose = (notes, semis) => notes.map((n) => ({ ...n, pitch: n.pitch + semis }));
export const shiftBars = (notes, bars) => notes.map((n) => ({ ...n, bar: n.bar + bars }));
export const scaleVel = (notes, k = 1, add = 0) => notes.map((n) => ({ ...n, vel: Math.round(n.vel * k + add) }));

/** Copy the notes that start in bars [fromBar, fromBar + count) to toBar, optionally re-shaped. */
export function repeatBars(notes, fromBar, count, toBar, opts = {}) {
  const num = needNum(opts);
  const { velScale = 1, velAdd = 0, transpose: tr = 0, filter } = opts;
  const lo = fromBar * num - EPS, hi = (fromBar + count) * num - EPS;
  return notes
    .filter((n) => { const s = start(n, num); return s >= lo && s < hi && (!filter || filter(n)); })
    .map((n) => ({ ...mk(start(n, num) + (toBar - fromBar) * num, n.pitch + tr, n.dur, n.vel * velScale + velAdd, num) }));
}

/** Phrase shaping: add a rise-and-fall of `amp` velocity over bars [fromBar, toBar), peaking at `peak`. */
export function arc(notes, fromBar, toBar, amp, opts = {}) {
  const num = needNum(opts);
  const peak = opts.peak ?? 0.65;
  const lo = fromBar * num, span = (toBar - fromBar) * num;
  for (const n of notes) {
    const x = (start(n, num) - lo) / span;
    if (x < -EPS || x >= 1 - EPS) continue;
    n.vel = Math.round(n.vel + amp * (x < peak ? x / peak : (1 - x) / (1 - peak)));
  }
  return notes;
}

/** Piecewise-linear velocity offset: points [[bar, add], ...] (bars may be fractional). */
export function ramp(notes, points, opts = {}) {
  const num = needNum(opts);
  for (const n of notes) {
    const b = start(n, num) / num;
    let add;
    if (b <= points[0][0]) add = points[0][1];
    else if (b >= points.at(-1)[0]) add = points.at(-1)[1];
    else for (let i = 1; i < points.length; i++) {
      if (b <= points[i][0]) { const [b0, v0] = points[i - 1], [b1, v1] = points[i]; add = v0 + ((v1 - v0) * (b - b0)) / (b1 - b0); break; }
    }
    n.vel = Math.round(n.vel + add);
  }
  return notes;
}

/** Higher notes a touch louder: (pitch - centre) * amount, at most ±limit. */
export function contour(notes, amount = 0.4, limit = 5) {
  const centre = notes.reduce((s, n) => s + n.pitch, 0) / Math.max(1, notes.length);
  for (const n of notes) n.vel = Math.round(n.vel + Math.max(-limit, Math.min(limit, (n.pitch - centre) * amount)));
  return notes;
}

function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Deterministic, tiny timing (units) and velocity wobble; never moves a note before 0. */
export function humanize(notes, opts = {}) {
  const num = needNum(opts);
  const { seed = 1, time = 0, vel = 0 } = opts;
  const rnd = rng(seed);
  return notes.map((n) => {
    const dt = (rnd() + rnd() - 1) * time, dv = Math.round((rnd() + rnd() - 1) * vel);
    const s = start(n, num);
    return { ...mk(s < EPS ? 0 : Math.max(0, s + dt), n.pitch, n.dur, n.vel + dv, num) };
  });
}

/** Sort; when the same pitch is struck again while still ringing, stop the earlier one there;
 *  cut everything at `end` units (the loop point). With `edge` (units), a note that would outlast a
 *  later onset by less than `edge` stops at that onset instead (the hand moving on, not a jitter overlap). */
export function tidy(notes, opts = {}) {
  const num = needNum(opts);
  const end = opts.end ?? Infinity;
  const edge = opts.edge ?? 0;
  const ns = notes
    .map((n) => ({ ...n, _s: start(n, num) }))
    .filter((n) => n._s < end - 1e-3 && n.dur > 0)
    .sort((a, b) => a._s - b._s || a.pitch - b.pitch || b.vel - a.vel);
  if (edge > 0) {
    const onsets = [...new Set(ns.map((n) => r6(n._s)))].sort((a, b) => a - b);
    for (const n of ns) {
      const e = n._s + n.dur;
      let lo = 0, hi = onsets.length; // first onset > e - edge
      while (lo < hi) { const mid = (lo + hi) >> 1; if (onsets[mid] > e - edge) hi = mid; else lo = mid + 1; }
      if (lo < onsets.length && onsets[lo] < e - EPS && onsets[lo] > n._s + EPS) n.dur = r6(onsets[lo] - n._s);
    }
  }
  const out = [];
  const lastBy = new Map();
  for (const n of ns) {
    const p = lastBy.get(n.pitch);
    if (p && p._s + p.dur > n._s + EPS) {
      if (n._s - p._s < 0.02) continue; // a duplicate strike — keep the first (loudest)
      p.dur = r6(n._s - p._s);
    }
    n.dur = r6(Math.min(n.dur, end - n._s));
    lastBy.set(n.pitch, n);
    out.push(n);
  }
  return out.map(({ _s, ...n }) => ({ ...n, ...place(_s, num) }));
}

export const clampVel = (notes, lo = 55, hi = 110) => notes.map((n) => ({ ...n, vel: Math.max(lo, Math.min(hi, Math.round(n.vel))) }));

/** Final pass for a song: humanize (ms / velocity), tidy, cut at the loop point, clamp velocities. */
export function finish(song, opts = {}) {
  const [num] = song.timeSig;
  const us = unitSeconds(song);
  const end = song.bars * num;
  const h = opts.humanize ?? { ms: 6, vel: 3 };
  song.tracks.forEach((t, i) => {
    let ns = t.notes;
    if (h && (h.ms || h.vel)) ns = humanize(ns, { num, seed: 1000 + 17 * i + (h.seed ?? 0), time: (h.ms ?? 0) / 1000 / us, vel: h.vel ?? 0 });
    ns = tidy(ns, { num, end, edge: 0.03 / us });
    t.notes = clampVel(ns, opts.velLo ?? 55, opts.velHi ?? 110);
  });
  return song;
}

/** Helpers bound to one song's metre and tempo, with grace lengths and strum staggers in ms. */
export function kit({ bpm, timeSig, cutMs = 40, hamMs = 70, strumMs = 25 }) {
  const [num] = timeSig;
  const us = unitSecondsOf(bpm, timeSig);
  const ms = (x) => x / 1000 / us;
  const o = { num };
  return {
    num, unit: us, ms,
    note: (bar, beat, p, dur, vel) => note(bar, beat, p, dur, vel, o),
    chord: (bar, beat, ps, dur, vel, x = {}) => chord(bar, beat, ps, dur, vel, { ...x, num, stagger: ms(x.staggerMs ?? strumMs) }),
    arp: (bar, beat, ps, step, dur, vel, x = {}) => arp(bar, beat, ps, step, dur, vel, { ...x, num }),
    melody: (bar, beat, seq, x = {}) => melody(bar, beat, seq, { cut: ms(cutMs), ham: ms(hamMs), ...x, num, timeSig }),
    comp: (bar, prog, pat, x = {}) => comp(bar, prog, pat, { ...x, num, stagger: ms(x.strumMs ?? strumMs) }),
    repeatBars: (ns, from, count, to, x = {}) => repeatBars(ns, from, count, to, { ...x, num }),
    arc: (ns, from, to, amp, x = {}) => arc(ns, from, to, amp, { ...x, num }),
    ramp: (ns, points) => ramp(ns, points, o),
    /** Bars of melody: [[...bar0 items], [...bar1 items], ...]. Checks each bar adds up to a full bar;
     *  fills in `vel` where an item has none. Returns the flat item list for melody(). */
    bars(name, bars, { vel } = {}) {
      return bars.flatMap((items, i) => {
        const sum = items.reduce((s, it) => s + it[1], 0);
        if (Math.abs(sum - num) > 1e-4) throw new Error(`${name}: bar ${i} lasts ${r6(sum)} units, not ${num}`);
        if (vel == null) return items;
        return items.map((it) => {
          if (it[0] == null) return it;
          const orn = it[2] && typeof it[2] === 'object' ? it[2] : it[3];
          const v = typeof it[2] === 'number' ? it[2] : vel;
          return orn ? [it[0], it[1], v, orn] : [it[0], it[1], v];
        });
      });
    },
  };
}

// ── validation ─────────────────────────────────────────────────────────────────────────────────
const STRINGS = [40, 45, 50, 55, 59, 64];
const MAX_FRET = 20;
function stringFit(pitches) {
  const ps = [...pitches].sort((a, b) => b - a);
  const used = Array(6).fill(false);
  let best = Infinity;
  const frets = [];
  const go = (i) => {
    if (best === 0) return;
    if (i === ps.length) {
      const fr = frets.filter((f) => f > 0);
      best = Math.min(best, fr.length ? Math.max(...fr) - Math.min(...fr) : 0);
      return;
    }
    for (let s = 0; s < 6; s++) {
      const f = ps[i] - STRINGS[s];
      if (used[s] || f < 0 || f > MAX_FRET) continue;
      used[s] = true; frets.push(f); go(i + 1); frets.pop(); used[s] = false;
    }
  };
  go(0);
  return best; // Infinity = cannot be placed on six strings at once
}

/** Checks a song. Returns { ok, errors: [], warnings: [] } — errors break the build, warnings are borderline. */
export function validate(song) {
  const errors = [], warnings = [];
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);
  for (const k of ['id', 'title', 'bpm', 'timeSig', 'bars', 'key', 'description', 'tracks']) if (song[k] == null) E(`missing "${k}"`);
  if (errors.length) return { ok: false, errors, warnings };
  const [num, den] = song.timeSig;
  if (!(Number.isInteger(num) && num > 0 && [2, 4, 8, 16].includes(den))) E(`bad timeSig ${song.timeSig}`);
  if (!(song.bpm >= 40 && song.bpm <= 240)) E(`bpm ${song.bpm} out of 40..240`);
  else if (song.bpm < 88 || song.bpm > 136) W(`bpm ${song.bpm} is outside the brief's ~92..132`);
  if (!Number.isInteger(song.bars) || song.bars < 1) E(`bad bar count ${song.bars}`);
  else if (song.bars < 32 || song.bars > 48) W(`${song.bars} bars (brief: 32..48)`);
  const secs = durationSeconds(song);
  if (secs < 50 || secs > 110) W(`loop lasts ${secs.toFixed(1)} s (brief: about 60..100)`);
  const end = song.bars * num;
  const us = unitSeconds(song);
  const chans = new Set();
  for (const t of song.tracks) {
    const tag = `[${t.name}]`;
    const lead = t.role === 'lead' || /lead|melody/i.test(t.name);
    if (!Number.isInteger(t.channel) || t.channel < 0 || t.channel > 15) E(`${tag} bad channel ${t.channel}`);
    else if (t.channel === 9) W(`${tag} channel 10 (index 9) is the GM drum channel`);
    if (chans.has(t.channel)) W(`${tag} shares channel ${t.channel} with another track`);
    chans.add(t.channel);
    for (const k of ['program', 'pan', 'volume']) if (!(Number.isInteger(t[k]) && t[k] >= 0 && t[k] <= 127)) E(`${tag} bad ${k} ${t[k]}`);
    if (!t.notes?.length) { E(`${tag} has no notes`); continue; }
    const hi = lead ? 84 : 76, soft = lead ? [55, 83] : [40, 72];
    let outSoft = 0, velOut = 0;
    const ns = t.notes.map((n) => ({ ...n, s: start(n, num) })).sort((a, b) => a.s - b.s);
    for (const n of ns) {
      const at = `${tag} bar ${n.bar} beat ${r6(n.beat)} ${Number.isFinite(n.pitch) ? noteName(n.pitch) : n.pitch}`;
      if (![n.bar, n.beat, n.pitch, n.dur, n.vel].every(Number.isFinite)) { E(`${at}: non-numeric field`); continue; }
      if (!Number.isInteger(n.bar) || n.bar < 0) E(`${at}: bar must be a whole number >= 0`);
      if (n.beat < 0) E(`${at}: negative beat`);
      else if (n.beat >= num + EPS) W(`${at}: beat ${n.beat} is past the end of its bar (not normalised)`);
      if (n.s >= end - EPS) E(`${at}: starts at/after the loop end (bar ${song.bars})`);
      if (!(n.dur > 0)) E(`${at}: duration must be > 0`);
      if (n.s + n.dur > end + 2 + EPS) E(`${at}: rings ${r6(n.s + n.dur - end)} beats past the loop end (max 2)`);
      if (!Number.isInteger(n.pitch) || n.pitch < 40) E(`${at}: below the guitar's low E (40)`);
      else if (n.pitch > hi) E(`${at}: above ${hi} for a ${lead ? 'lead' : 'rhythm'} track`);
      else if (n.pitch < soft[0] || n.pitch > soft[1]) outSoft++;
      if (!Number.isInteger(n.vel) || n.vel < 1 || n.vel > 127) E(`${at}: velocity ${n.vel} not in 1..127`);
      else if (n.vel < 55 || n.vel > 110) velOut++;
    }
    if (outSoft / ns.length > 0.12) W(`${tag} ${outSoft} notes (${Math.round((100 * outSoft) / ns.length)}%) outside the comfortable ${soft[0]}..${soft[1]}`);
    if (velOut) W(`${tag} ${velOut} velocities outside 55..110`);
    // identical pitches overlapping
    const lastEnd = new Map();
    for (const n of ns) {
      const e = lastEnd.get(n.pitch);
      if (e != null && e > n.s + 1e-4) E(`${tag} bar ${n.bar} beat ${r6(n.beat)}: ${noteName(n.pitch)} struck again while still ringing`);
      lastEnd.set(n.pitch, Math.max(e ?? -Infinity, n.s + n.dur));
    }
    // polyphony and fretboard, checked at every onset
    let over6 = 0, unplace = 0, wide = 0;
    const exU = [], exW = [];
    const group = 0.08 / us; // notes starting within 80 ms are one gesture (a strum, a pinch)
    for (let i = 0; i < ns.length; i++) {
      if (i && ns[i].s - ns[i - 1].s < 1e-6) continue;
      const t0 = ns[i].s;
      const sounding = ns.filter((n) => n.s <= t0 + EPS && n.s + n.dur > t0 + EPS);
      if (sounding.length > 6) { over6++; if (over6 <= 3) E(`${tag} bar ${ns[i].bar} beat ${r6(ns[i].beat)}: ${sounding.length} notes sounding at once (max 6)`); continue; }
      if (stringFit(sounding.map((n) => n.pitch)) === Infinity) { unplace++; if (exU.length < 3) exU.push(`bar ${ns[i].bar} beat ${r6(ns[i].beat)} [${sounding.map((n) => noteName(n.pitch)).join(' ')}]`); }
      const gest = ns.filter((n) => n.s >= t0 - EPS && n.s < t0 + group);
      if (gest.length >= 3 && stringFit(gest.map((n) => n.pitch)) > 4) { wide++; if (exW.length < 3) exW.push(`bar ${ns[i].bar} beat ${r6(ns[i].beat)} [${gest.map((n) => noteName(n.pitch)).join(' ')}]`); }
    }
    if (over6 > 3) E(`${tag} ...and ${over6 - 3} more instants with more than 6 notes`);
    if (unplace) W(`${tag} ${unplace} instants where the ringing notes can't all sit on six strings (the hand would damp some): ${exU.join(', ')}`);
    if (wide) W(`${tag} ${wide} chords spanning more than 4 frets: ${exW.join(', ')}`);
  }
  // the loop
  const all = song.tracks.flatMap((t) => t.notes ?? []);
  const lastBar = song.bars - 1;
  if (!all.some((n) => n.bar === lastBar)) E(`the last bar (${lastBar}) is empty — the loop would stall`);
  if (!all.some((n) => n.bar === 0 && n.beat < 1e-3)) W('nothing starts on the very first beat');
  const lead = song.tracks.find((t) => t.role === 'lead');
  if (lead && !lead.notes.some((n) => n.bar === lastBar && n.beat >= num / 2)) W('the lead is silent in the second half of the last bar — no pickup back into bar 0');
  const longTail = all.filter((n) => n.bar === lastBar && n.beat + n.dur >= num - 1e-3 && n.dur >= num);
  if (longTail.length >= 3) W(`${longTail.length} notes in the last bar ring through it — may sound like an ending`);
  return { ok: errors.length === 0, errors, warnings };
}
