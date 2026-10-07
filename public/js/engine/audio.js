// Procedural audio: every sound effect is synthesised with WebAudio, and the
// music is a tiny chiptune sequencer (see music.js). Nothing is downloaded.

import { SONGS } from './music.js';

const A = {
  ctx: null,
  master: null,
  sfxBus: null,
  musicBus: null,
  comp: null,
  noiseBuf: null,
  vol: { music: 0.55, sfx: 0.75 },
  last: new Map(),
  voices: new Map(),
  muted: false,
  song: null,
  songName: null,
  seq: null,
};

export function initAudio() {
  if (A.ctx) {
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  A.ctx = ctx;
  A.comp = ctx.createDynamicsCompressor();
  A.comp.threshold.value = -14;
  A.comp.knee.value = 12;
  A.comp.ratio.value = 4;
  A.comp.attack.value = 0.003;
  A.comp.release.value = 0.2;
  A.master = ctx.createGain();
  A.master.gain.value = 0.9;
  A.sfxBus = ctx.createGain();
  A.musicBus = ctx.createGain();
  A.sfxBus.connect(A.comp);
  A.musicBus.connect(A.comp);
  A.comp.connect(A.master);
  A.master.connect(ctx.destination);
  applyVolumes();
  const len = ctx.sampleRate * 1.5;
  A.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = A.noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  if (A.songName) startSong(A.songName);
}

export function setVolumes(music, sfx) {
  A.vol.music = music;
  A.vol.sfx = sfx;
  applyVolumes();
}

function applyVolumes() {
  if (!A.ctx) return;
  const t = A.ctx.currentTime;
  A.musicBus.gain.setTargetAtTime(A.muted ? 0 : A.vol.music * 0.5, t, 0.05);
  A.sfxBus.gain.setTargetAtTime(A.muted ? 0 : A.vol.sfx * 0.8, t, 0.05);
}

export function toggleMute() {
  A.muted = !A.muted;
  applyVolumes();
  return A.muted;
}

// ------------------------------------------------------------ primitives --

function env(g, t, vol, attack, dur, curve = 'exp') {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  else g.gain.linearRampToValueAtTime(0, t + dur);
}

function out(pan) {
  if (!pan || !A.ctx.createStereoPanner) return A.sfxBus;
  const p = A.ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(A.sfxBus);
  return p;
}

function tone(t, o) {
  const ctx = A.ctx;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(o.f0, t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.slide || o.dur));
  if (o.detune) osc.detune.value = o.detune;
  env(g, t, o.vol ?? 0.2, o.attack ?? 0.002, o.dur, o.curve);
  let node = osc;
  if (o.lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    node.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(o.dest || out(o.pan));
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
  return osc;
}

function noise(t, o) {
  const ctx = A.ctx;
  const src = ctx.createBufferSource();
  src.buffer = A.noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.filter || 'lowpass';
  f.frequency.setValueAtTime(o.f0 || 2000, t);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  env(g, t, o.vol ?? 0.2, o.attack ?? 0.002, o.dur, o.curve);
  src.connect(f);
  f.connect(g);
  g.connect(o.dest || out(o.pan));
  src.start(t, Math.random());
  src.stop(t + o.dur + 0.05);
}

const arp = (t, notes, step, o) => notes.forEach((f, i) => tone(t + i * step, { ...o, f0: f }));

// ------------------------------------------------------------------ sfx --

// [minInterval seconds, maxVoices]
const LIMITS = {
  hit: [0.035, 6], crit: [0.05, 4], slash: [0.05, 3], arrow: [0.04, 4], dagger: [0.03, 4], fireball: [0.08, 3],
  explode: [0.06, 4], zap: [0.06, 3], axe: [0.08, 3], shard: [0.1, 2], gem: [0.025, 5], coin: [0.04, 4],
  die: [0.03, 6], hurt: [0.15, 1], flask: [0.1, 2], burn: [0.15, 2], blade: [0.12, 2], aura: [0.3, 1],
  bigdie: [0.1, 2], wood: [0.05, 3], enemyshot: [0.12, 3], charge: [0.2, 2], ui: [0.03, 2], step: [0.2, 1],
};

const SFX = {
  hit: (t, o) => {
    tone(t, { type: 'square', f0: 260 * o.p, f1: 90, dur: 0.06, vol: 0.09, pan: o.pan });
    noise(t, { f0: 2400, f1: 500, dur: 0.05, vol: 0.12, pan: o.pan });
  },
  crit: (t, o) => {
    tone(t, { type: 'square', f0: 520 * o.p, f1: 140, dur: 0.09, vol: 0.12, pan: o.pan });
    tone(t, { type: 'triangle', f0: 1650 * o.p, f1: 1500, dur: 0.18, vol: 0.06, pan: o.pan });
    noise(t, { f0: 5000, f1: 900, dur: 0.07, vol: 0.14, pan: o.pan });
  },
  slash: (t, o) => {
    noise(t, { filter: 'bandpass', f0: 3200 * o.p, f1: 700, q: 1.6, dur: 0.16, vol: 0.32, attack: 0.01, pan: o.pan });
    tone(t, { type: 'sawtooth', f0: 700 * o.p, f1: 220, dur: 0.1, vol: 0.03, pan: o.pan });
  },
  arrow: (t, o) => {
    noise(t, { filter: 'highpass', f0: 3000, dur: 0.06, vol: 0.12, pan: o.pan });
    tone(t, { type: 'triangle', f0: 1100 * o.p, f1: 380, dur: 0.08, vol: 0.08, pan: o.pan });
  },
  dagger: (t, o) => {
    noise(t, { filter: 'bandpass', f0: 6000 * o.p, f1: 2500, q: 3, dur: 0.05, vol: 0.12, pan: o.pan });
  },
  fireball: (t, o) => {
    noise(t, { f0: 600 * o.p, f1: 2600, dur: 0.22, vol: 0.18, attack: 0.03, pan: o.pan });
    tone(t, { type: 'sawtooth', f0: 140, f1: 260, dur: 0.18, vol: 0.04, lp: 900, pan: o.pan });
  },
  explode: (t, o) => {
    noise(t, { f0: 1600 * o.p, f1: 120, dur: 0.5 * o.size, vol: 0.38, pan: o.pan });
    tone(t, { type: 'sine', f0: 110, f1: 38, dur: 0.35 * o.size, vol: 0.36, pan: o.pan });
  },
  bigexplode: (t) => {
    noise(t, { f0: 1200, f1: 60, dur: 1.1, vol: 0.5 });
    tone(t, { type: 'sine', f0: 90, f1: 28, dur: 0.9, vol: 0.5 });
    tone(t + 0.05, { type: 'square', f0: 70, f1: 30, dur: 0.5, vol: 0.12, lp: 400 });
  },
  zap: (t, o) => {
    for (let i = 0; i < 3; i++) tone(t + i * 0.025, { type: 'sawtooth', f0: (1800 + Math.random() * 900) * o.p, f1: 300, dur: 0.06, vol: 0.06, pan: o.pan });
    noise(t, { filter: 'highpass', f0: 2500, dur: 0.18, vol: 0.18, pan: o.pan });
    tone(t, { type: 'sine', f0: 90, f1: 50, dur: 0.15, vol: 0.18 });
  },
  axe: (t, o) => {
    noise(t, { filter: 'bandpass', f0: 900 * o.p, f1: 1800, q: 4, dur: 0.18, vol: 0.12, attack: 0.04, curve: 'lin', pan: o.pan });
  },
  shard: (t, o) => {
    for (let i = 0; i < 4; i++) tone(t + i * 0.018, { type: 'triangle', f0: (2400 + i * 420) * o.p, f1: 1800, dur: 0.12, vol: 0.05, pan: o.pan });
    noise(t, { filter: 'highpass', f0: 6000, dur: 0.12, vol: 0.08 });
  },
  freeze: (t) => {
    for (let i = 0; i < 6; i++) tone(t + i * 0.03, { type: 'sine', f0: 1800 + i * 300, f1: 2400 + i * 200, dur: 0.3, vol: 0.05 });
    noise(t, { filter: 'highpass', f0: 4000, f1: 9000, dur: 0.5, vol: 0.12 });
  },
  flask: (t, o) => {
    noise(t, { filter: 'highpass', f0: 3500, dur: 0.08, vol: 0.16, pan: o.pan });
    tone(t, { type: 'triangle', f0: 2600, f1: 3100, dur: 0.07, vol: 0.06, pan: o.pan });
    noise(t + 0.04, { f0: 500, f1: 1800, dur: 0.35, vol: 0.14, attack: 0.05, pan: o.pan });
  },
  burn: (t, o) => noise(t, { f0: 900, f1: 400, dur: 0.25, vol: 0.06, attack: 0.05, pan: o.pan }),
  blade: (t, o) => noise(t, { filter: 'bandpass', f0: 2600, f1: 4200, q: 6, dur: 0.22, vol: 0.06, attack: 0.05, pan: o.pan }),
  aura: (t) => tone(t, { type: 'sine', f0: 520, f1: 480, dur: 0.25, vol: 0.025 }),
  gem: (t, o) => {
    tone(t, { type: 'square', f0: 1046 * o.p, dur: 0.05, vol: 0.05 });
    tone(t + 0.035, { type: 'square', f0: 1568 * o.p, dur: 0.07, vol: 0.045 });
  },
  coin: (t) => {
    tone(t, { type: 'square', f0: 988, dur: 0.06, vol: 0.06 });
    tone(t + 0.06, { type: 'square', f0: 1319, dur: 0.16, vol: 0.06 });
  },
  die: (t, o) => {
    noise(t, { f0: 1800 * o.p, f1: 200, dur: 0.12, vol: 0.12, pan: o.pan });
    tone(t, { type: 'square', f0: 300 * o.p, f1: 60, dur: 0.1, vol: 0.05, pan: o.pan });
  },
  bones: (t, o) => {
    for (let i = 0; i < 3; i++) tone(t + i * 0.035, { type: 'square', f0: (700 + Math.random() * 500) * o.p, f1: 300, dur: 0.03, vol: 0.05, pan: o.pan });
  },
  goo: (t, o) => tone(t, { type: 'sine', f0: 380 * o.p, f1: 90, dur: 0.14, vol: 0.12, pan: o.pan }),
  wood: (t, o) => {
    noise(t, { filter: 'bandpass', f0: 600, f1: 300, q: 2, dur: 0.18, vol: 0.3, pan: o.pan });
    tone(t, { type: 'square', f0: 180, f1: 90, dur: 0.08, vol: 0.07, pan: o.pan });
  },
  bigdie: (t, o) => {
    noise(t, { f0: 1000, f1: 80, dur: 0.45, vol: 0.3, pan: o.pan });
    tone(t, { type: 'sawtooth', f0: 160, f1: 40, dur: 0.4, vol: 0.12, lp: 800, pan: o.pan });
  },
  hurt: (t) => {
    tone(t, { type: 'square', f0: 180, f1: 70, dur: 0.18, vol: 0.18 });
    noise(t, { f0: 1500, f1: 200, dur: 0.15, vol: 0.2 });
  },
  heal: (t) => arp(t, [523, 659, 784, 1046], 0.05, { type: 'triangle', dur: 0.18, vol: 0.08 }),
  levelup: (t) => {
    arp(t, [523, 659, 784, 1046, 1318], 0.07, { type: 'square', dur: 0.2, vol: 0.07 });
    arp(t, [262, 330, 392, 523], 0.07, { type: 'triangle', dur: 0.3, vol: 0.1 });
    tone(t + 0.35, { type: 'square', f0: 1568, dur: 0.45, vol: 0.05, attack: 0.01 });
  },
  pick: (t) => {
    tone(t, { type: 'square', f0: 784, dur: 0.06, vol: 0.06 });
    tone(t + 0.07, { type: 'square', f0: 1175, dur: 0.15, vol: 0.06 });
  },
  chest: (t) => {
    arp(t, [392, 494, 587, 784, 988, 1175, 1568], 0.06, { type: 'square', dur: 0.22, vol: 0.06 });
    noise(t, { filter: 'highpass', f0: 5000, f1: 10000, dur: 1, vol: 0.06, attack: 0.3, curve: 'lin' });
  },
  chestopen: (t) => {
    tone(t, { type: 'sawtooth', f0: 90, f1: 60, dur: 0.25, vol: 0.12, lp: 600 });
    arp(t + 0.1, [784, 988, 1175, 1568, 1976], 0.05, { type: 'triangle', dur: 0.4, vol: 0.08 });
  },
  shrine: (t) => {
    arp(t, [440, 554, 659, 880], 0.08, { type: 'triangle', dur: 0.6, vol: 0.08, attack: 0.04 });
    noise(t, { filter: 'bandpass', f0: 2000, f1: 6000, q: 2, dur: 1, vol: 0.06, attack: 0.3 });
  },
  boss: (t) => {
    tone(t, { type: 'sawtooth', f0: 110, f1: 55, dur: 1.4, vol: 0.2, lp: 700, attack: 0.05 });
    tone(t, { type: 'sawtooth', f0: 116, f1: 52, dur: 1.4, vol: 0.18, lp: 500, attack: 0.05 });
    noise(t, { f0: 500, f1: 120, dur: 1.4, vol: 0.25, attack: 0.1 });
  },
  bell: (t) => {
    for (const [f, v] of [[220, 0.2], [440, 0.1], [556, 0.06], [660, 0.05], [880, 0.03]]) {
      tone(t, { type: 'sine', f0: f, dur: 2.5, vol: v, attack: 0.005 });
    }
  },
  ult: (t) => {
    noise(t, { f0: 300, f1: 5000, dur: 0.6, vol: 0.3, attack: 0.15 });
    arp(t, [262, 392, 523, 784], 0.06, { type: 'sawtooth', dur: 0.5, vol: 0.06, lp: 2500 });
    tone(t, { type: 'sine', f0: 60, f1: 120, dur: 0.6, vol: 0.3 });
  },
  enemyshot: (t, o) => tone(t, { type: 'sawtooth', f0: 300, f1: 900, dur: 0.15, vol: 0.05, lp: 1800, pan: o.pan }),
  charge: (t, o) => tone(t, { type: 'sawtooth', f0: 90, f1: 240, dur: 0.35, vol: 0.08, lp: 900, pan: o.pan }),
  slam: (t) => {
    noise(t, { f0: 700, f1: 60, dur: 0.6, vol: 0.4 });
    tone(t, { type: 'sine', f0: 70, f1: 30, dur: 0.5, vol: 0.45 });
  },
  teleport: (t) => {
    tone(t, { type: 'sine', f0: 300, f1: 1800, dur: 0.3, vol: 0.08 });
    noise(t, { filter: 'bandpass', f0: 1000, f1: 5000, q: 3, dur: 0.3, vol: 0.1 });
  },
  relic: (t) => {
    arp(t, [523, 659, 784, 1046, 1318, 1568], 0.04, { type: 'triangle', dur: 0.9, vol: 0.08 });
    noise(t, { filter: 'highpass', f0: 3000, dur: 1.2, vol: 0.12, attack: 0.05 });
    tone(t, { type: 'sine', f0: 80, f1: 40, dur: 0.8, vol: 0.3 });
  },
  heartbeat: (t) => {
    tone(t, { type: 'sine', f0: 70, f1: 45, dur: 0.12, vol: 0.25 });
    tone(t + 0.18, { type: 'sine', f0: 62, f1: 40, dur: 0.14, vol: 0.2 });
  },
  ui: (t, o) => tone(t, { type: 'square', f0: 660 * o.p, dur: 0.04, vol: 0.04 }),
  select: (t) => {
    tone(t, { type: 'square', f0: 784, dur: 0.06, vol: 0.06 });
    tone(t + 0.06, { type: 'square', f0: 1046, dur: 0.12, vol: 0.06 });
  },
  back: (t) => tone(t, { type: 'square', f0: 440, f1: 330, dur: 0.1, vol: 0.05 }),
  deny: (t) => {
    tone(t, { type: 'square', f0: 200, dur: 0.08, vol: 0.06 });
    tone(t + 0.09, { type: 'square', f0: 150, dur: 0.14, vol: 0.06 });
  },
  step: (t) => noise(t, { f0: 400, f1: 200, dur: 0.05, vol: 0.05 }),
  descend: (t) => {
    arp(t, [392, 330, 262, 196, 131], 0.12, { type: 'triangle', dur: 0.5, vol: 0.1 });
    noise(t, { f0: 400, f1: 100, dur: 1.5, vol: 0.2, attack: 0.3 });
  },
};

export function sfx(name, opts = {}) {
  if (!A.ctx || A.muted || A.vol.sfx <= 0) return;
  const t = A.ctx.currentTime;
  const lim = LIMITS[name];
  if (lim) {
    const last = A.last.get(name) || 0;
    if (t - last < lim[0]) return;
    const v = A.voices.get(name) || 0;
    if (v >= lim[1]) return;
    A.voices.set(name, v + 1);
    setTimeout(() => A.voices.set(name, Math.max(0, (A.voices.get(name) || 1) - 1)), 160);
  }
  A.last.set(name, t);
  const fn = SFX[name];
  if (!fn) return;
  try {
    fn(t + 0.005, { p: opts.pitch ?? 1, pan: opts.pan ?? 0, size: opts.size ?? 1 });
  } catch {
    /* audio graph errors should never break the game */
  }
}

// ---------------------------------------------------------------- music --

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freqOf = (n) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(n);
  if (!m) return 0;
  return 440 * Math.pow(2, (NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
};

function parsePattern(str) {
  return str.trim().split(/\s+/);
}

const INSTRUMENTS = {
  lead: (t, f, len, v) => {
    tone(t, { type: 'square', f0: f, dur: len * 0.95, vol: 0.05 * v, attack: 0.01, curve: 'lin', dest: A.musicBus, lp: 3200 });
    tone(t, { type: 'square', f0: f * 1.004, dur: len * 0.9, vol: 0.025 * v, attack: 0.02, curve: 'lin', dest: A.musicBus, lp: 2200 });
  },
  pluck: (t, f, len, v) => tone(t, { type: 'square', f0: f, dur: Math.min(len, 0.25), vol: 0.045 * v, dest: A.musicBus, lp: 2600 }),
  bass: (t, f, len, v) => tone(t, { type: 'triangle', f0: f, dur: len * 0.9, vol: 0.2 * v, attack: 0.005, curve: 'lin', dest: A.musicBus }),
  pad: (t, f, len, v) => {
    tone(t, { type: 'sawtooth', f0: f, dur: len, vol: 0.022 * v, attack: len * 0.3, curve: 'lin', dest: A.musicBus, lp: 900 });
    tone(t, { type: 'sawtooth', f0: f * 1.006, dur: len, vol: 0.02 * v, attack: len * 0.35, curve: 'lin', dest: A.musicBus, lp: 700 });
  },
  bell: (t, f, len, v) => {
    tone(t, { type: 'sine', f0: f, dur: Math.max(0.6, len), vol: 0.06 * v, dest: A.musicBus });
    tone(t, { type: 'sine', f0: f * 2.01, dur: 0.4, vol: 0.02 * v, dest: A.musicBus });
  },
  organ: (t, f, len, v) => {
    tone(t, { type: 'triangle', f0: f, dur: len * 0.95, vol: 0.05 * v, attack: 0.02, curve: 'lin', dest: A.musicBus });
    tone(t, { type: 'triangle', f0: f * 2, dur: len * 0.95, vol: 0.025 * v, attack: 0.02, curve: 'lin', dest: A.musicBus });
    tone(t, { type: 'sine', f0: f * 3, dur: len * 0.95, vol: 0.012 * v, attack: 0.02, curve: 'lin', dest: A.musicBus });
  },
  kick: (t, f, len, v) => {
    tone(t, { type: 'sine', f0: 150, f1: 42, slide: 0.12, dur: 0.22, vol: 0.4 * v, dest: A.musicBus });
  },
  snare: (t, f, len, v) => {
    noise(t, { filter: 'highpass', f0: 1200, dur: 0.14, vol: 0.14 * v, dest: A.musicBus });
    tone(t, { type: 'triangle', f0: 220, f1: 140, dur: 0.07, vol: 0.08 * v, dest: A.musicBus });
  },
  hat: (t, f, len, v) => noise(t, { filter: 'highpass', f0: 7000, dur: 0.04, vol: 0.05 * v, dest: A.musicBus }),
  tom: (t, f, len, v) => tone(t, { type: 'sine', f0: 200, f1: 80, dur: 0.2, vol: 0.2 * v, dest: A.musicBus }),
};

function compile(song) {
  const tracks = song.tracks.map((tr) => {
    const steps = [];
    for (const pat of tr.seq) steps.push(...parsePattern(song.patterns[pat]));
    return { inst: tr.inst, vol: tr.vol ?? 1, steps, octave: tr.octave || 0 };
  });
  const length = Math.max(...tracks.map((t) => t.steps.length));
  return { ...song, tracks, length };
}

const compiled = new Map();

function startSong(name) {
  stopSongNodes();
  if (!A.ctx || !name || !SONGS[name]) return;
  if (!compiled.has(name)) compiled.set(name, compile(SONGS[name]));
  const song = compiled.get(name);
  const stepDur = 60 / song.bpm / 4;
  const seq = { song, step: 0, next: A.ctx.currentTime + 0.1, stepDur, timer: 0, stopped: false };
  A.seq = seq;
  const tick = () => {
    if (seq.stopped) return;
    while (seq.next < A.ctx.currentTime + 0.12) {
      const i = seq.step % song.length;
      for (const tr of song.tracks) {
        const tok = tr.steps[i % tr.steps.length];
        if (!tok || tok === '.' || tok === '-') continue;
        // Note length: count following '-' tokens.
        let len = 1;
        while (tr.steps[(i + len) % tr.steps.length] === '-' && len < 64) len++;
        const inst = INSTRUMENTS[tr.inst];
        if (!inst) continue;
        let f = 0;
        if (/^[A-G]/.test(tok)) {
          f = freqOf(tok);
          if (tr.octave) f *= Math.pow(2, tr.octave);
        }
        inst(seq.next, f, len * stepDur, tr.vol);
      }
      seq.step++;
      if (!song.loop && seq.step >= song.length) {
        seq.stopped = true;
        return;
      }
      seq.next += stepDur;
    }
    seq.timer = setTimeout(tick, 25);
  };
  tick();
}

function stopSongNodes() {
  if (A.seq) {
    A.seq.stopped = true;
    clearTimeout(A.seq.timer);
    A.seq = null;
  }
}

export function playMusic(name) {
  if (A.songName === name && A.seq && !A.seq.stopped) return;
  A.songName = name;
  if (A.ctx) {
    // Quick duck so the switch doesn't clash.
    const t = A.ctx.currentTime;
    A.musicBus.gain.cancelScheduledValues(t);
    A.musicBus.gain.setValueAtTime(0, t);
    A.musicBus.gain.linearRampToValueAtTime(A.muted ? 0 : A.vol.music * 0.5, t + 0.6);
    startSong(name);
  }
}

export function stopMusic() {
  A.songName = null;
  stopSongNodes();
}

export function playJingle(name) {
  if (!A.ctx || !SONGS[name]) return;
  stopSongNodes();
  A.songName = null;
  startSong(name);
}

export function audioReady() {
  return !!A.ctx;
}
