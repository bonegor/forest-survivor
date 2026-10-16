// The plucked-string guitar synth of the menu-music renderer: extended Karplus-Strong, no
// samples, no dependencies. Each note is a string loop (a delay line, a one-pole loss filter
// designed per note for its decay time at the fundamental and at a high partial, and an
// allpass for exact tuning) excited by a pluck: noise and an ideal plucked-string pulse, low-
// passed by velocity and combed at the pick position. A second, quieter loop a fraction of a
// cent sharp with a longer decay stands for the string's other polarisation (a slow beat and a
// two-stage decay). Notes are given to the six strings of a guitar in standard tuning; a note
// on a busy string damps the one ringing there, a note-off damps quickly instead of cutting.
// Each guitar track then gets body resonances and its pan; render/mix.mjs balances and
// reverberates the stems.
//
// The loop is rendered in its steady state: the song twice over, from a string allocation that
// has already run several times round, and the second copy kept, so the end of the loop rings
// into its start exactly as it does when it repeats.

const TAU = 2 * Math.PI;
const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4

// Tuned by octave bands against MuseScore General's guitars on a test tune: within about 7 dB
// from 125 Hz to 8 kHz, a little brighter than its (very dark) nylon.
export const NYLON = {
  name: 'nylon', t60Base: 4.0, t60Exp: 0.6, t60Hi: 0.2, t60Rel: 0.25, pick: 0.17, excLo: 600, excHi: 2500,
  attackMs: 1.2, pol2: 0.28, strumMs: 4, maxFret: 19, level: 1, hp: 85, shelf: [150, -6], lp: 3500, knock: 3, click: 0,
  body: [[98, 4, 0.25], [200, 3.5, 0.35], [410, 2.5, 0.18]],
};
export const STEEL = {
  name: 'steel', t60Base: 5.5, t60Exp: 0.55, t60Hi: 0.75, t60Rel: 0.3, pick: 0.13, excLo: 1500, excHi: 5000,
  attackMs: 0.4, pol2: 0.3, strumMs: 6, maxFret: 20, level: 0.85, hp: 80, shelf: [150, -4], lp: 9000, knock: 8, click: 3,
  body: [[105, 4, 0.3], [220, 3.5, 0.28], [460, 2.5, 0.14]],
};
// General MIDI guitars; anything else is played as nylon (and reported).
export function guitarFor(program) {
  if (program === 24) return NYLON;
  if (program === 25) return STEEL;
  if (program === 26) return { ...STEEL, name: 'jazz', t60Hi: 0.4, excHi: 4000, pick: 0.2, level: 0.9 };
  if (program >= 27 && program <= 31) return { ...STEEL, name: 'electric' };
  return null;
}

// ------------------------------------------------------------------ helpers --

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// One string loop: delay M, one-pole loss b0/(1 - a z^-1), allpass C, for pitch f0 and the
// 60 dB decay times t0 (at the fundamental) and t1 (at a high partial).
export function designLoop(f0, t0, t1, sr) {
  const w0 = (TAU * f0) / sr;
  const w1 = (TAU * Math.min(Math.max(2500, 2.5 * f0), 0.45 * sr)) / sr;
  const G0 = Math.pow(10, -3 / (t0 * f0)), G1 = Math.pow(10, -3 / (t1 * f0));
  const r2 = (G1 / G0) ** 2, c0 = Math.cos(w0), c1 = Math.cos(w1);
  const B = (2 * (c0 - r2 * c1)) / (r2 - 1);
  const a = clamp((-B - Math.sqrt(Math.max(0, B * B - 4))) / 2, 0, 0.97);
  const g = (G0 * Math.sqrt(1 - 2 * a * c0 + a * a)) / (1 - a);
  const lossDelay = Math.atan2(a * Math.sin(w0), 1 - a * c0) / w0;
  const rest = sr / f0 - lossDelay;
  const M = Math.max(2, Math.floor(rest - 0.618));
  const d = rest - M;
  // Allpass coefficient whose phase delay at w0 is exactly d (bisection; it falls as C rises).
  const apDelay = (C) => -(Math.atan2(-Math.sin(w0), C + Math.cos(w0)) - Math.atan2(-C * Math.sin(w0), 1 + C * Math.cos(w0))) / w0;
  let lo = -0.8, hi = 0.95;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (apDelay(m) > d) lo = m; else hi = m; }
  return { M, a, b0: g * (1 - a), C: (lo + hi) / 2, G0, f0 };
}

// The pluck: one period of noise and of an ideal plucked-string pulse (a rectangle with the
// pick position as its duty), each low-passed by velocity, combed at the pick position and
// brought to unit RMS, mixed half and half. The pick position is a fraction of the sounding
// length, so it grows up the neck: high frets sound rounder, as on a real guitar.
function excitation(M, f0, v, pick, P, rnd, sr) {
  const fc = Math.max(3 * f0, P.excLo * Math.pow(P.excHi / P.excLo, Math.pow(v, 1.2)));
  const al = 1 - Math.exp((-TAU * fc) / sr);
  const P0 = Math.max(1, Math.round(pick * M));
  const shape = (src) => {
    // two one-pole low-passes, round the period twice so they start settled
    const lp = new Float64Array(M);
    let y = 0, y2 = 0;
    for (let r = 0; r < 2; r++) for (let i = 0; i < M; i++) { y += al * (src[i] - y); y2 += al * (y - y2); lp[i] = y2; }
    const e = new Float64Array(M);
    for (let i = 0; i < M; i++) e[i] = lp[i] - lp[(i - P0 + M) % M];
    let mean = 0; for (let i = 0; i < M; i++) mean += e[i]; mean /= M;
    let ss = 0; for (let i = 0; i < M; i++) { e[i] -= mean; ss += e[i] * e[i]; }
    const k = ss > 0 ? 1 / Math.sqrt(ss / M) : 0;
    for (let i = 0; i < M; i++) e[i] *= k;
    return e;
  };
  const noise = new Float64Array(M), pulse = new Float64Array(M);
  for (let i = 0; i < M; i++) { noise[i] = rnd() * 2 - 1; pulse[i] = i < P0 ? 1 : 0; }
  const a = shape(noise), b = shape(pulse), e = new Float64Array(M);
  for (let i = 0; i < M; i++) e[i] = 0.5 * a[i] + 0.5 * b[i];
  return e;
}

// One note, both polarisations, added into buf from sample s0 until it has died away (or bufEnd).
export function renderNote(buf, s0, bufEnd, nt, P, sr) {
  const { f0, v, amp, offAt, stealAt, rnd, pick } = nt;
  const t0 = P.t60Base * Math.pow(82.4 / f0, P.t60Exp);
  const t1 = Math.min(P.t60Hi * (0.75 + 0.5 * v), 0.7 * t0);
  const A = designLoop(f0, t0, t1, sr);
  const B = designLoop(f0 * Math.pow(2, 0.4 / 1200), 1.5 * t0, Math.min(1.5 * t1, 0.7 * 1.5 * t0), sr);
  const exc = excitation(A.M, f0, v, pick, P, rnd, sr);
  const lineA = new Float64Array(A.M), lineB = new Float64Array(B.M);
  for (let i = 0; i < A.M; i++) lineA[i] = exc[i] * amp;
  for (let i = 0; i < B.M; i++) lineB[i] = exc[i % A.M] * amp * P.pol2;
  // Damping on note-off (or when the string is plucked again): every partial's loop gain
  // falls to that of a short decay, eased in over a few milliseconds.
  const relK = (t, L) => Math.min(1, Math.pow(10, -3 / (t * f0)) / L.G0);
  const ease = Math.exp(-1 / (0.004 * sr));
  const attack = Math.max(1, Math.round((P.attackMs / 1000) * sr));
  const thr = amp * 1e-4;
  let ia = 0, ib = 0, lpa = 0, lpb = 0, za = 0, zb = 0;
  let b0a = A.b0, b0b = B.b0, tga = A.b0, tgb = B.b0, peak = 0;
  const aa = A.a, Ca = A.C, Ma = A.M, ab = B.a, Cb = B.C, Mb = B.M;
  const end = Math.min(bufEnd, s0 + Math.round(16 * sr));
  for (let n = s0; n < end; n++) {
    if (n === offAt) { tga = Math.min(tga, A.b0 * relK(P.t60Rel, A)); tgb = Math.min(tgb, B.b0 * relK(P.t60Rel, B)); }
    if (n === stealAt) { tga = Math.min(tga, A.b0 * relK(0.035, A)); tgb = Math.min(tgb, B.b0 * relK(0.035, B)); }
    b0a = tga + (b0a - tga) * ease;
    b0b = tgb + (b0b - tgb) * ease;
    const xa = lineA[ia], xb = lineB[ib];
    lpa = b0a * xa + aa * lpa;
    const ya = Ca * lpa + za; za = lpa - Ca * ya;
    lineA[ia] = ya; if (++ia === Ma) ia = 0;
    lpb = b0b * xb + ab * lpb;
    const yb = Cb * lpb + zb; zb = lpb - Cb * yb;
    lineB[ib] = yb; if (++ib === Mb) ib = 0;
    let y = xa + xb;
    const k = n - s0;
    if (k < attack) y *= 0.5 - 0.5 * Math.cos((Math.PI * k) / attack);
    if (n >= 0) buf[n] += y;
    const ay = y < 0 ? -y : y;
    if (ay > peak) peak = ay;
    if ((k & 511) === 511) { if (peak < thr && k > 4 * Ma) break; peak = 0; }
  }
}

// RBJ band-pass (0 dB peak) of src, times gain, added into dst.
function bandAdd(src, dst, f, Q, gain, sr) {
  const w = (TAU * f) / sr, al = Math.sin(w) / (2 * Q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = (-2 * Math.cos(w)) / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < src.length; i++) {
    const x = src[i], y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    dst[i] += gain * y;
  }
}

// The body's radiation: a 4th-order Butterworth high-pass and a low shelf (a guitar radiates
// its lowest fundamentals weakly), then a one-pole low-pass, in place.
function biquad(x, [b0, b1, b2, a0, a1, a2]) {
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y;
    x[i] = y;
  }
}
function tone(x, hpHz, [shelfHz, shelfDb], lpHz, sr) {
  for (const Q of [0.5412, 1.3066]) {
    const w = (TAU * hpHz) / sr, al = Math.sin(w) / (2 * Q), cw = Math.cos(w);
    biquad(x, [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al]);
  }
  { // RBJ low shelf, slope 1
    const A = Math.pow(10, shelfDb / 40), w = (TAU * shelfHz) / sr, cw = Math.cos(w), al = Math.sin(w) / Math.SQRT2, sa = 2 * Math.sqrt(A) * al;
    biquad(x, [A * (A + 1 - (A - 1) * cw + sa), 2 * A * (A - 1 - (A + 1) * cw), A * (A + 1 - (A - 1) * cw - sa),
      A + 1 + (A - 1) * cw + sa, -2 * (A - 1 + (A + 1) * cw), A + 1 + (A - 1) * cw - sa]);
  }
  const lpA = 1 - Math.exp((-TAU * lpHz) / sr);
  let z = 0;
  for (let i = 0; i < x.length; i++) { z += lpA * (x[i] - z); x[i] = z; }
}

// ------------------------------------------------------------------- render --

// notes/ctrl/programs as read by smf.readNotes; loopSec the exact loop length.
// Returns a stereo stem per channel, each exactly one loop (N samples) long, with its reverb
// send (CC91), and what happened on the way.
// With verify, a third copy is rendered and compared with the second: the difference is how far
// the kept loop is from repeating itself exactly (it should be rounding noise).
export function renderPluck({ notes, ctrl, programs, loopSec, sr = 44100, seed = 'song', verify = true }) {
  const N = Math.round(loopSec * sr), COPIES = verify ? 3 : 2, T = COPIES * N, warn = [], stems = [];
  const chans = [...new Set(notes.map((n) => n.ch))].sort((a, b) => a - b);
  const stats = { notes: 0, voices: 0, periodicMismatch: 0, guitars: {} };
  let repErr = 0, repPeak = 0;
  const ccAt = (ch, cc, sec, dflt) => { let v = dflt; for (const c of ctrl) { if (c.sec > sec + 1e-9) break; if (c.ch === ch && c.cc === cc) v = c.value; } return v; };

  for (const ch of chans) {
    if (ch === 9) { warn.push('channel 10 (drums) skipped'); continue; }
    const prog = programs.has(ch) ? programs.get(ch) : 0;
    let P = guitarFor(prog);
    if (!P) { warn.push(`channel ${ch + 1}: program ${prog} is not a guitar, played as nylon`); P = NYLON; }
    stats.guitars[ch + 1] = P.name;
    const cn = notes.filter((n) => n.ch === ch);
    stats.notes += cn.length;

    // Sustain pedal: a note released while it is down rings until it comes up.
    const pedal = ctrl.filter((c) => c.ch === ch && c.cc === 64);
    const pedalUp = (sec) => {
      let down = false, i = 0;
      for (; i < pedal.length && pedal[i].sec <= sec + 1e-9; i++) down = pedal[i].value >= 64;
      if (!down) return sec;
      for (; i < pedal.length; i++) if (pedal[i].value < 64) return pedal[i].sec;
      return sec + 2;
    };

    // Per-note life, the same in every repeat: timing jitter, detune, a strum across chords.
    const rndOf = (i) => mulberry32(hash(`${seed}:${ch}:${i}`));
    const base = cn.map((n, i) => {
      const r = rndOf(i);
      return { n, i, jitter: (r() - 0.5) * 0.003, cents: (r() - 0.5) * 6, noiseSeed: (r() * 4294967296) >>> 0, strum: 0 };
    });
    for (let i = 0; i < base.length;) {
      let j = i + 1;
      while (j < base.length && base[j].n.start - base[i].n.start < 0.012) j++;
      if (j - i >= 3) [...base.slice(i, j)].sort((a, b) => a.n.pitch - b.n.pitch).forEach((b, k) => (b.strum = (k * P.strumMs) / 1000));
      i = j;
    }

    // Strings, in the steady state: the allocation runs COPIES + 4 times round the loop and the
    // copies are taken from round 2 on, long after it has settled.
    const ROUNDS = COPIES + 4, inst = [];
    for (let k = 0; k < ROUNDS; k++) for (const b of base) {
      const start = b.n.start + b.jitter + b.strum + k * loopSec;
      inst.push({ b, k, start, off: pedalUp(b.n.end) + b.jitter + b.strum + k * loopSec, string: -1, steal: Infinity });
    }
    inst.sort((x, y) => x.start - y.start || x.b.n.pitch - y.b.n.pitch);
    const str = OPEN.map(() => ({ busy: -Infinity, cur: null }));
    let chordAt = -Infinity, used = new Set();
    for (const it of inst) {
      if (it.start - chordAt > 0.03) { chordAt = it.start; used = new Set(); }
      const p = it.b.n.pitch;
      const all = [0, 1, 2, 3, 4, 5];
      let cand = all.filter((s) => !used.has(s) && p >= OPEN[s] && p <= OPEN[s] + P.maxFret);
      if (!cand.length) cand = all.filter((s) => !used.has(s)).sort((x, y) => Math.abs(p - OPEN[x] - 6) - Math.abs(p - OPEN[y] - 6)).slice(0, 1);
      if (!cand.length) cand = all;
      const same = cand.find((s) => str[s].cur && str[s].cur.b.n.pitch === p && str[s].cur.off > it.start - 0.5);
      const free = cand.filter((s) => str[s].busy <= it.start).sort((x, y) => p - OPEN[x] - (p - OPEN[y]));
      const s = same !== undefined ? same : free.length ? free[0]
        : cand.sort((x, y) => (str[x].cur ? str[x].cur.start : 0) - (str[y].cur ? str[y].cur.start : 0))[0];
      if (str[s].cur) str[s].cur.steal = Math.min(str[s].cur.steal, it.start);
      str[s] = { busy: it.off, cur: it };
      it.string = s;
      used.add(s);
    }
    const byK = (k) => inst.filter((it) => it.k === k).sort((x, y) => x.b.i - y.b.i);
    const r2 = byK(2), r3 = byK(3);
    for (let i = 0; i < r2.length; i++) {
      const a = r2[i], b = r3[i];
      const da = a.steal === Infinity ? -1 : a.steal - a.start, db = b.steal === Infinity ? -1 : b.steal - b.start;
      if (a.string !== b.string || Math.abs(da - db) > 1e-6) stats.periodicMismatch++;
    }

    // Render rounds 2, 3 (and 4) as copies 0, 1 (and 2) of the loop into a mono track, with the
    // notes of the round after that jitter in before its start.
    // Times go to samples within their own round, then whole loops of N samples are added, so
    // every copy is the same to the sample.
    const mono = new Float64Array(T), knock = new Float64Array(T);
    const KN = Math.max(2, Math.round(0.0015 * sr));
    const at = (sec, k) => Math.round((sec - k * loopSec) * sr) + (k - 2) * N;
    for (const it of inst) {
      if (it.k < 2 || it.k > COPIES + 2) continue;
      const s0 = at(it.start, it.k);
      if (s0 >= T) continue;
      const n = it.b.n, v = n.vel / 127;
      const vol = (ccAt(ch, 7, n.start, 100) / 127) ** 2 * (ccAt(ch, 11, n.start, 127) / 127) ** 2;
      const amp = Math.pow(v, 1.8) * vol * P.level * 0.25;
      const fret = n.pitch - OPEN[it.string];
      // the pluck's knock on the top, heard only through the body resonances, and for a pick
      // its click: a few milliseconds of high-passed noise
      for (let i = 0; i < KN; i++) if (s0 + i >= 0 && s0 + i < T) knock[s0 + i] += amp * P.knock * Math.sin((Math.PI * i) / KN);
      if (P.click) {
        const cr = mulberry32(it.b.noiseSeed ^ 0x5bd1e995), CN = Math.round(0.004 * sr);
        const hpA = Math.exp((-TAU * 2500) / sr), lpA = 1 - Math.exp((-TAU * 7000) / sr);
        let hx = 0, hy = 0, ly = 0;
        for (let i = 0; i < CN; i++) {
          const x = (cr() * 2 - 1) * Math.exp(-i / (0.0008 * sr));
          hy = hpA * (hy + x - hx); hx = x; ly += lpA * (hy - ly);
          if (s0 + i >= 0 && s0 + i < T) mono[s0 + i] += amp * P.click * ly;
        }
      }
      renderNote(mono, s0, T, {
        f0: 440 * Math.pow(2, (n.pitch - 69) / 12 + it.b.cents / 1200), v, amp,
        pick: fret >= 0 ? clamp(P.pick * Math.pow(2, fret / 12), 0.05, 0.45) : P.pick,
        offAt: at(it.off, it.k),
        stealAt: it.steal === Infinity ? -1 : at(it.steal, it.k),
        rnd: mulberry32(it.b.noiseSeed),
      }, P, sr);
      stats.voices++;
    }

    // Body, then pan (first CC10 of the channel, constant power).
    const track = Float64Array.from(mono);
    for (let i = 0; i < T; i++) knock[i] += mono[i];
    for (const [f, Q, g] of P.body) bandAdd(knock, track, f, Q, g, sr);
    tone(track, P.hp, P.shelf, P.lp, sr);
    const pan = clamp((ccAt(ch, 10, 0, 64) - 64) / 63, -1, 1), th = ((pan + 1) * Math.PI) / 4;
    const gl = Math.cos(th), gr = Math.sin(th);
    const L = new Float32Array(N), R = new Float32Array(N);
    for (let i = 0; i < N; i++) { L[i] = track[N + i] * gl; R[i] = track[N + i] * gr; }
    if (verify) for (let i = 0; i < N; i++) {
      repErr = Math.max(repErr, Math.abs(track[2 * N + i] - track[N + i]));
      repPeak = Math.max(repPeak, Math.abs(track[N + i]));
    }
    stems.push({ ch, send: ccAt(ch, 91, 0, 40) / 127, channels: [L, R] });
  }
  if (verify) stats.repeatErrorDb = +(20 * Math.log10(repErr / repPeak + 1e-30)).toFixed(1);
  return { stems, N, warn, stats };
}
