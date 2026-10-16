// Mastering and listening-by-numbers for the menu-music renderer: a loop-aware peak limiter
// (the loop is treated as a circle, so the seam sees the same gain on both sides), and the
// checks run on every candidate: the seam, RMS over 2-second windows, the two channels, note
// onsets and octave-band balance.

const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

// Gain, then a look-ahead peak limiter at `ceiling` (linear sample peak), all circular.
// The gain is the running minimum of what each sample needs over the look-ahead, released
// exponentially and smoothed by a moving average as long as the look-ahead, which keeps every
// sample under the ceiling without delaying the signal.
export function limitLoop(chans, gain, ceiling, sr, { lookMs = 5, relMs = 120 } = {}) {
  const n = chans[0].length, W = Math.max(1, Math.round((lookMs / 1000) * sr));
  const req = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let p = 0;
    for (const c of chans) { const v = Math.abs(c[i]) * gain; if (v > p) p = v; }
    req[i] = p > ceiling ? ceiling / p : 1;
  }
  // sliding minimum of req over [i, i+W) on the circle (monotonic deque over 2n)
  const gmin = new Float64Array(n), dq = new Int32Array(n + W + 1);
  let h = 0, t = 0;
  for (let j = 0; j < n + W; j++) {
    const v = req[j % n];
    while (t > h && req[dq[t - 1] % n] >= v) t--;
    dq[t++] = j;
    const i = j - W + 1;
    if (i >= 0) {
      while (dq[h] < i) h++;
      if (i < n) gmin[i] = req[dq[h] % n];
    }
  }
  // release, twice round so the start knows the end
  const rel = 1 - Math.exp(-1 / ((relMs / 1000) * sr));
  const r = new Float64Array(n);
  let g = 1;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) { g = Math.min(gmin[i], g + (1 - g) * rel); r[i] = g; }
  // moving average over the W samples ending at i (circular)
  const out = chans.map(() => new Float32Array(n));
  let sum = 0;
  for (let k = n - W + 1; k <= n; k++) sum += r[((k % n) + n) % n];
  let minG = 1, limited = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) sum += r[i] - r[(i - W + n) % n];
    const gi = sum / W;
    if (gi < minG) minG = gi;
    if (gi < 0.9999) limited++;
    for (let c = 0; c < chans.length; c++) out[c][i] = chans[c][i] * gain * gi;
  }
  return { channels: out, maxReductionDb: -dB(minG), limitedPct: (100 * limited) / n };
}

export function peakDb(chans) {
  let p = 0;
  for (const c of chans) for (let i = 0; i < c.length; i++) { const v = Math.abs(c[i]); if (v > p) p = v; }
  return dB(p);
}

// The seam of the loop played back to back: the sample step and the second difference across
// it, against the same measures everywhere inside the loop.
export function seamCheck(chans) {
  const n = chans[0].length, d1 = new Float32Array(n - 1), d2 = new Float32Array(n - 2);
  for (let i = 0; i < n - 1; i++) { let m = 0; for (const c of chans) m = Math.max(m, Math.abs(c[i + 1] - c[i])); d1[i] = m; }
  for (let i = 1; i < n - 1; i++) { let m = 0; for (const c of chans) m = Math.max(m, Math.abs(c[i + 1] - 2 * c[i] + c[i - 1])); d2[i - 1] = m; }
  let jump = 0, curv = 0;
  for (const c of chans) {
    jump = Math.max(jump, Math.abs(c[0] - c[n - 1]));
    curv = Math.max(curv, Math.abs(c[0] - 2 * c[n - 1] + c[n - 2]), Math.abs(c[1] - 2 * c[0] + c[n - 1]));
  }
  const s1 = d1.sort(), s2 = d2.sort();
  const q = (s, p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const p999 = q(s1, 0.999), c999 = q(s2, 0.999);
  return {
    jump, curv, p50: q(s1, 0.5), p99: q(s1, 0.99), p999, max: s1[s1.length - 1],
    jumpVsP99: jump / q(s1, 0.99), curvVsP99: curv / q(s2, 0.99),
    ok: jump <= p999 && curv <= c999,
  };
}

// RMS of each channel in 2-second windows (dBFS), the quietest window, the L/R balance and correlation.
export function levelCheck(chans, sr, win = 2) {
  const n = chans[0].length, w = Math.round(win * sr), rows = [];
  for (let s = 0; s + w / 2 <= n; s += w) {
    const e = Math.min(n, s + w);
    rows.push(chans.map((c) => { let x = 0; for (let i = s; i < e; i++) x += c[i] * c[i]; return dB(Math.sqrt(x / (e - s))); }));
  }
  const [L, R] = chans;
  let sl = 0, sr2 = 0, slr = 0;
  for (let i = 0; i < n; i++) { sl += L[i] * L[i]; sr2 += R[i] * R[i]; slr += L[i] * R[i]; }
  const minRow = rows.reduce((m, r, i) => (Math.max(...r) < Math.max(...rows[m]) ? i : m), 0);
  return {
    windows: rows.map((r) => r.map((x) => +x.toFixed(1))),
    quietest: { at: minRow * win, l: +rows[minRow][0].toFixed(1), r: +rows[minRow][1].toFixed(1) },
    loudest: +Math.max(...rows.flat()).toFixed(1),
    balanceDb: +(10 * Math.log10(sl / sr2)).toFixed(2),
    correlation: +(slr / Math.sqrt(sl * sr2)).toFixed(3),
  };
}

// Note onsets in one channel by spectral flux: 2048-point frames every 10 ms, the summed rise of
// log magnitudes from 100 Hz to 8 kHz, peaks above a moving median, at least 50 ms apart.
export function onsets(ch, sr) {
  const N = 2048, hop = Math.round(0.01 * sr), k0 = Math.floor((100 * N) / sr), k1 = Math.ceil((8000 * N) / sr);
  const win = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const re = new Float64Array(N), im = new Float64Array(N);
  let prev = null;
  const flux = [];
  for (let s = 0; s + N <= ch.length; s += hop) {
    for (let i = 0; i < N; i++) { re[i] = ch[s + i] * win[i]; im[i] = 0; }
    fft(re, im);
    const mag = new Float64Array(k1 - k0);
    for (let k = k0; k < k1; k++) mag[k - k0] = Math.log(1 + 1000 * Math.hypot(re[k], im[k]));
    let f = 0;
    if (prev) for (let k = 0; k < mag.length; k++) { const d = mag[k] - prev[k]; if (d > 0) f += d; }
    flux.push(f);
    prev = mag;
  }
  const mean = flux.reduce((x, y) => x + y, 0) / flux.length;
  let count = 0, last = -100;
  for (let t = 1; t < flux.length - 1; t++) {
    const lo = Math.max(0, t - 15), hi = Math.min(flux.length, t + 16);
    const med = Float64Array.from(flux.slice(lo, hi)).sort()[(hi - lo) >> 1];
    let peak = true;
    for (let u = Math.max(0, t - 3); u <= Math.min(flux.length - 1, t + 3); u++) if (flux[u] > flux[t]) peak = false;
    if (peak && flux[t] > 1.5 * med + 0.1 * mean && t - last >= 5) { count++; last = t; }
  }
  return count;
}

// Octave-band levels (dB re the total) of the mono sum, from an averaged 8192-point spectrum.
export function octaveBands(chans, sr) {
  const N = 8192, n = chans[0].length, centres = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const pw = new Float64Array(N / 2), re = new Float64Array(N), im = new Float64Array(N);
  let frames = 0;
  for (let s = 0; s + N <= n; s += N / 2) {
    for (let i = 0; i < N; i++) { re[i] = 0.5 * (chans[0][s + i] + chans[1][s + i]) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)); im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) pw[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  const total = pw.reduce((a, b) => a + b, 0), bands = {};
  for (const c of centres) {
    const lo = c / Math.SQRT2, hi = c * Math.SQRT2;
    let e = 0;
    for (let k = Math.ceil((lo * N) / sr); k <= Math.min(N / 2 - 1, Math.floor((hi * N) / sr)); k++) e += pw[k];
    bands[c] = +(10 * Math.log10(e / total + 1e-12)).toFixed(1);
  }
  return bands;
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
