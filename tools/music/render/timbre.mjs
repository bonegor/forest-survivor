// Brightness and attack by numbers, for comparing guitars without listening (render.mjs puts
// them in out/render/report.json and, for the listening set, in guitars.json). A "clanky" guitar
// has a hard, bright attack, so besides the overall brightness this looks at the first 30 ms of
// each note:
//   centroidHz  spectral centroid of the whole signal (averaged power spectrum, 40 Hz-16 kHz)
//   hfPct       share of the energy above 3 kHz (a 4th-order Butterworth high-pass), in %
//   atkHfPct    the same share inside the attack windows (3 ms before to 27 ms after each attack)
//   atkCrestDb  peak over RMS inside the attack window (dB): how spiky the pluck is
//   atkBodyDb   RMS of the attack window over the RMS of the 270 ms after it (dB): how far the
//               pluck stands out of the note's body
//   delayMs     from the MIDI note-on to the attack (the 1 ms envelope halfway up its rise within
//               80 ms), median and spread (10th to 90th percentile): a sample with silence at its
//               start plays late
// The attack numbers are medians over the given onsets (seconds), which should be notes at least
// ~80 ms from the one before, so each window holds one pluck.

const TAU = 2 * Math.PI;

function biquad(x, [b0, b1, b2, a0, a1, a2]) {
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y;
    x[i] = y;
  }
}
function highpass(x, f, sr) {
  const out = Float64Array.from(x);
  for (const Q of [0.5412, 1.3066]) {
    const w = (TAU * f) / sr, al = Math.sin(w) / (2 * Q), cw = Math.cos(w);
    biquad(out, [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al]);
  }
  return out;
}

const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2; };
const db = (x) => 10 * Math.log10(x + 1e-30);

export function timbre(chans, sr, onsetSec = []) {
  const n = chans[0].length, mono = new Float64Array(n);
  for (const c of chans) for (let i = 0; i < n; i++) mono[i] += c[i] / chans.length;
  const hp = highpass(mono, 3000, sr);
  let eAll = 0, eHi = 0;
  for (let i = 0; i < n; i++) { eAll += mono[i] * mono[i]; eHi += hp[i] * hp[i]; }

  // centroid
  const N = 4096, re = new Float64Array(N), im = new Float64Array(N), pw = new Float64Array(N / 2);
  for (let s = 0; s + N <= n; s += N / 2) {
    for (let i = 0; i < N; i++) { re[i] = mono[s + i] * (0.5 - 0.5 * Math.cos((TAU * i) / N)); im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) pw[k] += re[k] * re[k] + im[k] * im[k];
  }
  let num = 0, den = 0;
  for (let k = Math.ceil((40 * N) / sr); k <= Math.floor((16000 * N) / sr); k++) { const f = (k * sr) / N; num += f * pw[k]; den += pw[k]; }

  // attacks: found on a 1 ms RMS envelope, then measured from 3 ms before to 27 ms after
  const W = Math.max(1, Math.round(0.001 * sr)), env = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += mono[i] * mono[i]; if (i >= W) acc -= mono[i - W] * mono[i - W]; env[i] = Math.sqrt(Math.max(0, acc) / W); }
  const pre = Math.round(0.003 * sr), A = Math.round(0.03 * sr), B = Math.round(0.3 * sr);
  const look0 = Math.round(0.002 * sr), look1 = Math.round(0.08 * sr);
  const crest = [], body = [], atkHf = [], delay = [];
  for (const t of onsetSec) {
    const t0 = Math.round(t * sr);
    if (t0 - look0 < 0 || t0 + look1 + B > n) continue;
    const e0 = env[t0 - look0];
    let M = 0;
    for (let i = t0 - look0; i < t0 + look1; i++) if (env[i] > M) M = env[i];
    if (M <= e0 * 1.05) continue; // no rise: masked by what was ringing
    let a = t0 - look0;
    while (env[a] - e0 < 0.5 * (M - e0)) a++;
    a -= W >> 1; // the envelope lags by half its window
    delay.push(((a - t0) / sr) * 1000);
    const s0 = a - pre, s1 = s0 + A, s2 = s0 + B;
    let pk = 0, ea = 0, eh = 0, eb = 0;
    for (let i = s0; i < s1; i++) { const v = Math.abs(mono[i]); if (v > pk) pk = v; ea += mono[i] * mono[i]; eh += hp[i] * hp[i]; }
    for (let i = s1; i < s2; i++) eb += mono[i] * mono[i];
    if (ea <= 0) continue;
    const rmsA = Math.sqrt(ea / (s1 - s0)), rmsB = Math.sqrt(eb / (s2 - s1));
    crest.push(20 * Math.log10(pk / rmsA));
    body.push(20 * Math.log10(rmsA / (rmsB + 1e-12)));
    atkHf.push((100 * eh) / ea);
  }
  const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
  return {
    centroidHz: Math.round(num / den),
    hfPct: +((100 * eHi) / eAll).toFixed(2),
    hfDb: +db(eHi / eAll).toFixed(1),
    atkHfPct: +median(atkHf).toFixed(2),
    atkCrestDb: +median(crest).toFixed(2),
    atkBodyDb: +median(body).toFixed(2),
    delayMs: +median(delay).toFixed(1),
    delaySpreadMs: +(pct(delay, 0.9) - pct(delay, 0.1)).toFixed(1),
    attacks: crest.length,
  };
}

// Onset times worth measuring: the notes' starts, at least `gap` seconds after the previous
// start (on any channel listed), within [0, until).
export function attackTimes(notes, chans, until, gap = 0.08) {
  const out = [];
  let last = -Infinity;
  for (const nt of notes) {
    if (!chans.includes(nt.ch) || nt.start >= until) continue;
    if (nt.start - last >= gap) out.push(nt.start);
    last = nt.start;
  }
  return out;
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
