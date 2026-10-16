// tools/music/render/mix.mjs — the mixer shared by every renderer: guitar stems (one per MIDI
// channel, already panned, each exactly one loop long and periodic) are balanced so the lead sits
// the song's chosen number of dB over the rhythm (by BS.1770 loudness), summed, and sent to a stereo
// hall with the song's decay time and wet level. The hall runs round the loop twice and keeps the
// second pass, so its tail from the loop's end carries on into its start.

import { TAU, biquad } from './dsp.mjs';

// ── loudness ───────────────────────────────────────────────────────────────────────────────────

// BS.1770-4 integrated loudness (LUFS) of a stereo signal: K-weighting, 400 ms blocks with 75%
// overlap, absolute gate at -70 LUFS and relative gate 10 LU under the gated mean.
export function loudness(chans, sr) {
  const kw = chans.map((x) => kWeight(x, sr));
  const B = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), z = [];
  for (let s = 0; s + B <= kw[0].length; s += hop) {
    let e = 0;
    for (const c of kw) for (let i = s; i < s + B; i++) e += c[i] * c[i];
    z.push(e / B);
  }
  const lk = (e) => -0.691 + 10 * Math.log10(e);
  const abs = z.filter((e) => lk(e) > -70);
  if (!abs.length) return -Infinity;
  const relGate = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const rel = abs.filter((e) => lk(e) > relGate);
  return lk(rel.reduce((a, b) => a + b, 0) / rel.length);
}

function kWeight(x, sr) {
  const out = Float64Array.from(x);
  // stage 1: high shelf (+4 dB above ~1.7 kHz), stage 2: high-pass at 38 Hz; analog prototypes
  // through the bilinear transform, so any sample rate works
  let K = Math.tan((Math.PI * 1681.974450955533) / sr), Q = 0.7071752369554196;
  const Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Q + K * K;
  // (coefficients already divided by a0: the sections' a0 is 1)
  biquad(out, [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0]);
  K = Math.tan((Math.PI * 38.13547087602444) / sr); Q = 0.5003270373238773;
  a0 = 1 + K / Q + K * K;
  biquad(out, [1, -2, 1, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0]);
  return out;
}

// ── hall ───────────────────────────────────────────────────────────────────────────────────────

// A Freeverb-style hall: eight damped combs and four allpasses a side, the combs' feedback set
// for the decay time t60; a high-pass on the send keeps the bass dry, a short pre-delay keeps
// the attacks clear.
export function hall(inL, inR, sr, { t60 = 1.4, damp = 0.25, preMs = 12, hpHz = 180, width = 0.9 } = {}) {
  const n = inL.length, s = sr / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const pre = Math.round((preMs / 1000) * sr);
  const hpA = Math.exp((-TAU * hpHz) / sr);
  const mono = new Float64Array(n);
  let hx = 0, hy = 0;
  for (let i = 0; i < n; i++) {
    const x = 0.5 * (inL[i] + inR[i]);
    hy = hpA * (hy + x - hx); hx = x;
    if (i + pre < n) mono[i + pre] = hy;
  }
  const side = (spread) => {
    const out = new Float64Array(n);
    for (const c0 of combs) {
      const d = Math.round((c0 + spread) * s), fb = Math.pow(10, (-3 * d) / (t60 * sr));
      const line = new Float64Array(d);
      let j = 0, store = 0;
      for (let i = 0; i < n; i++) {
        const y = line[j];
        store = y * (1 - damp) + store * damp;
        line[j] = mono[i] * 0.015 + store * fb;
        if (++j === d) j = 0;
        out[i] += y;
      }
    }
    for (const a0 of aps) {
      const d = Math.round((a0 + spread) * s), line = new Float64Array(d);
      let j = 0;
      for (let i = 0; i < n; i++) {
        const b = line[j], x = out[i];
        out[i] = -x + b;
        line[j] = x + b * 0.5;
        if (++j === d) j = 0;
      }
    }
    return out;
  };
  const wl = side(0), wr = side(23);
  const w1 = width / 2 + 0.5, w2 = (1 - width) / 2;
  const L = new Float64Array(n), R = new Float64Array(n);
  for (let i = 0; i < n; i++) { L[i] = wl[i] * w1 + wr[i] * w2; R[i] = wr[i] * w1 + wl[i] * w2; }
  return [L, R];
}

// ── mix ────────────────────────────────────────────────────────────────────────────────────────

// stems: [{ ch, role ('lead' | 'rhythm' | undefined), send (0..1), channels: [L, R] }], all N long.
// leadOverRhythmDb: null to leave the stems as they are. wetDb: hall RMS against the dry mix.
export function mixStems(stems, sr, { leadOverRhythmDb = null, t60 = 1.4, wetDb = -13 } = {}) {
  const N = stems[0].channels[0].length, info = { stems: {} };
  const sumOf = (list) => [0, 1].map((c) => { const o = new Float64Array(N); for (const s of list) for (let i = 0; i < N; i++) o[i] += s.channels[c][i]; return o; });
  for (const s of stems) { s.gain = 1; info.stems[`ch${s.ch + 1}`] = { role: s.role || '-', lufs: +loudness(s.channels, sr).toFixed(1) }; }
  const leads = stems.filter((s) => s.role === 'lead'), rhythms = stems.filter((s) => s.role === 'rhythm');
  if (leadOverRhythmDb !== null && leads.length && rhythms.length) {
    const ll = loudness(sumOf(leads), sr), lr = loudness(sumOf(rhythms), sr);
    const g = Math.pow(10, (ll - lr - leadOverRhythmDb) / 20); // on the rhythm, the lead stays
    for (const s of rhythms) s.gain = g;
    info.leadOverRhythm = { before: +(ll - lr).toFixed(1), target: leadOverRhythmDb, rhythmGainDb: +(20 * Math.log10(g)).toFixed(1) };
  }
  const dry = [new Float64Array(N), new Float64Array(N)], send = [new Float64Array(2 * N), new Float64Array(2 * N)];
  for (const s of stems) for (let c = 0; c < 2; c++) {
    const x = s.channels[c], g = s.gain, gs = s.gain * (s.send ?? 0.3);
    for (let i = 0; i < N; i++) { dry[c][i] += g * x[i]; send[c][i] += gs * x[i]; }
  }
  for (const c of send) c.copyWithin(N, 0, N); // the loop twice over
  const [h2L, h2R] = hall(send[0], send[1], sr, { t60 });
  let sw = 0, sd = 0;
  for (let i = 0; i < N; i++) { sw += h2L[N + i] ** 2 + h2R[N + i] ** 2; sd += dry[0][i] ** 2 + dry[1][i] ** 2; }
  const k = sw > 0 ? Math.sqrt((sd / sw) * Math.pow(10, wetDb / 10)) : 0;
  const out = [new Float32Array(N), new Float32Array(N)];
  for (let i = 0; i < N; i++) { out[0][i] = dry[0][i] + k * h2L[N + i]; out[1][i] = dry[1][i] + k * h2R[N + i]; }
  info.hall = { t60, wetDb };
  return { channels: out, info };
}
