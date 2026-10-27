// Procedural audio: every sound effect is synthesised with WebAudio. Music
// plays only from the files listed in audio/music/tracks.json (title, forest,
// crypt, boss, victory, gameover, and a piece per Dungeon Run floor),
// crossfading from one to the next. A piece is listed as its file, or as
// { "file": ..., "gain": ... } to play it louder or softer. A piece with no
// file is silent.

// Pieces that play once instead of looping.
const ONCE = new Set(['victory', 'gameover']);
import { DEBUG_FLAG } from './debugflag.js';
import { RELEASE } from './build.js';

const MUSIC_DIR = 'audio/music/';
// Recorded music is mastered loud; this keeps it level with the sound effects.
const FILE_LEVEL = 0.55;
// A loop plays on two players in turn: the next starts just past the MP3 encoder's
// near-silent lead-in and the two overlap for XF seconds, so the seam never gaps.
const XF = 0.06, LEAD_IN = 0.03;

// The music ducks under the biggest beats (the reward ladder's T4 and T5: an evolution, an Epic or
// Legendary piece, a boss slain, a revive, a record, an unlock): DUCK.db for DUCK.secs, back
// smoothly. The stingers that do it:
export const DUCK = { db: -8, secs: 1.2, down: 0.08, up: 0.4 };
export const DUCKED = new Set(['evolve', 'epic', 'legendary', 'bossslain', 'revive', 'record', 'unlock']);

const A = {
  ctx: null,
  master: null,
  sfxBus: null,
  musicBus: null,
  duck: null, // between the music and the mix: what duckMusic lowers
  comp: null,
  noiseBuf: null,
  vol: { music: 0.55, sfx: 0.75 },
  last: new Map(),
  voices: new Map(),
  muted: false,
  songName: null,
  files: null, // piece -> file name, from tracks.json
  tracks: new Map(), // piece -> { el, gain } once a file has played
  after: null, // the piece that starts once the jingle playing now has ended (playAfterJingle)
};

// The list of music files; a piece asked for before it arrives starts once it does.
if (typeof fetch === 'function' && typeof document !== 'undefined' && typeof Audio === 'function') {
  fetch(MUSIC_DIR + 'tracks.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : {}))
    .then((list) => {
      A.files = list && typeof list === 'object' ? list : {};
      menuOverride();
      if (A.ctx && A.songName && A.files[A.songName]) startPiece(A.songName);
    })
    .catch(() => (A.files = {}));
}

// Debug only (the debug flag): the music audition page (an unlisted page, see the owner's link list) can pick one of the menu-music
// candidates in audio/music/menu/ to play as the title piece, so it is heard on the real menus.
// It keeps the choice in localStorage as { file, gain }.
function menuOverride() {
  try {
    if (RELEASE || !new URLSearchParams(location.search).has(DEBUG_FLAG)) return;
    const pick = JSON.parse(localStorage.getItem('fs_menu_music') || 'null');
    if (!pick || !/^(found\/)?[\w.-]+\.(ogg|mp3|wav)$/.test(pick.file)) return;
    A.files.title = { file: 'menu/' + pick.file, gain: pick.gain > 0 ? pick.gain : 1 };
  } catch {
    // no localStorage, or a stale value: the listed title piece plays
  }
}

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
  A.duck = ctx.createGain();
  A.musicBus.connect(A.duck);
  A.duck.connect(A.comp);
  A.comp.connect(A.master);
  A.master.connect(ctx.destination);
  applyVolumes();
  const len = ctx.sampleRate * 1.5;
  A.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = A.noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  loadSamples();
  if (A.songName) startPiece(A.songName);
}

// ------------------------------------------------------------- samples --

// The recorded sounds (audio/sfx/, credited in its CREDITS.md): the weather's thunder and rain,
// the hero's steps on wet ground, and the weapons' blows. Fetched and decoded once the sound
// starts; until a file is in, or if it never comes, its sound falls back to the synthesised one or
// stays quiet.
const SFX_DIR = 'audio/sfx/';
const SAMPLES = {
  thunder: ['thunder-2.ogg', 'thunder-3.ogg', 'thunder-4.ogg', 'thunder-5.ogg', 'thunder-6.ogg'],
  bigthunder: ['thunder-1.ogg'],
  rain: ['rain.ogg'],
  wetstep: ['step-wet-1.ogg', 'step-wet-2.ogg', 'step-wet-3.ogg', 'step-wet-4.ogg', 'step-wet-5.ogg', 'step-wet-6.ogg'],
  slash: ['sword-slash.ogg'],
  hit: ['hit.ogg'],
  crit: ['crit.ogg'],
  arrow: ['bow.ogg'],
  axe: ['axe-throw.ogg'],
  dagger: ['dagger.ogg'],
  fireball: ['fireball.ogg'],
  explode: ['explosion.ogg'],
  zap: ['lightning.ogg'],
  flask: ['flask.ogg'],
  shard: ['frost.ogg'],
  blade: ['blades.ogg'],
  whoosh: ['scythe.ogg'],
  wood: ['wood-snap.ogg'],
};
// The sounds whose recording, once in, plays instead of their synthesised self (the weapons'). The
// files are levelled alike (peak 100 ms loudness, K-weighted, at -16 dB) and play at RECORDED.vol,
// the level they were picked at. A recording follows the game's pitch at RECORDED.pitch of its
// spread, so a high or low call doesn't turn it into a chipmunk or a growl, and a bigger blast
// (`size`) plays deeper.
const RECORDED = { names: new Set(['slash', 'hit', 'crit', 'arrow', 'axe', 'dagger', 'fireball', 'explode', 'zap', 'flask', 'shard', 'blade', 'whoosh', 'wood']), vol: 0.55, pitch: 0.4 };
const BUFS = new Map(); // file -> AudioBuffer

function loadSamples() {
  if (typeof fetch !== 'function') return;
  for (const file of new Set(Object.values(SAMPLES).flat())) {
    fetch(SFX_DIR + file)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(file))))
      .then((data) => new Promise((ok, fail) => A.ctx.decodeAudioData(data, ok, fail)))
      .then((buf) => BUFS.set(file, buf))
      .catch(() => {});
  }
}

// One of the sample's files, at random among those in.
function sampleBuf(name) {
  const bufs = (SAMPLES[name] || []).map((f) => BUFS.get(f)).filter(Boolean);
  return bufs.length ? bufs[Math.floor(Math.random() * bufs.length)] : null;
}

// A sample played once: false if none of its files is in yet. `echo` sends it through a few
// repeats, each softer and darker than the last, as off the hills around.
function sample(t, name, o = {}) {
  const buf = sampleBuf(name);
  if (!buf) return false;
  const ctx = A.ctx, src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf;
  src.playbackRate.value = o.rate ?? 1;
  g.gain.value = o.vol ?? 0.5;
  src.connect(g);
  const dest = out(o.pan);
  g.connect(dest);
  if (o.echo) {
    const d = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
    d.delayTime.value = o.echo.delay;
    fb.gain.value = o.echo.feedback;
    lp.type = 'lowpass';
    lp.frequency.value = o.echo.lp;
    wet.gain.value = o.echo.wet;
    g.connect(d);
    d.connect(lp);
    lp.connect(fb);
    fb.connect(d);
    lp.connect(wet);
    wet.connect(out(-(o.pan || 0) * 0.6));
    // The loop dies away by itself; cut it once it has, so it holds nothing.
    const left = buf.duration / (o.rate ?? 1) + o.echo.delay * 14;
    setTimeout(() => {
      try {
        fb.disconnect();
      } catch {
        /* already gone */
      }
    }, left * 1000);
  }
  src.start(t);
  return true;
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
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
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
  g.connect(out(o.pan));
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
  g.connect(out(o.pan));
  src.start(t, Math.random());
  src.stop(t + o.dur + 0.05);
}

const arp = (t, notes, step, o) => notes.forEach((f, i) => tone(t + i * step, { ...o, f0: f }));

// ------------------------------------------------------------------ sfx --

// [minInterval seconds, maxVoices]
const LIMITS = {
  hit: [0.035, 6], crit: [0.05, 4], slash: [0.05, 3], whoosh: [0.3, 1], reap: [0.08, 2], arrow: [0.04, 4], dagger: [0.03, 4], fireball: [0.08, 3],
  explode: [0.06, 4], zap: [0.06, 3], axe: [0.08, 3], shard: [0.1, 2], gem: [0.025, 5], coin: [0.04, 4],
  die: [0.03, 6], hurt: [0.15, 1], flask: [0.1, 2], burn: [0.15, 2], blade: [0.12, 2], aura: [0.3, 1],
  bigdie: [0.1, 2], wood: [0.05, 3], enemyshot: [0.12, 3], charge: [0.2, 2], ui: [0.03, 2], step: [0.2, 1],
  furyready: [1, 1], tally: [0.05, 2], thunk: [0.3, 1], chestshake: [0.15, 1], reveal: [0.05, 2], evolve: [1, 1], gear: [0.08, 2], epic: [1, 1], legendary: [1, 1], milestone: [1, 1],
  rumble: [1, 1], thunder: [0.8, 2], bigthunder: [4, 1], wetstep: [0.15, 2], lordsting: [0.5, 1], heartbeat: [0.3, 1], warnswarm: [1, 1], warnring: [1, 1], warnpack: [1, 1],
  levelup: [0.15, 1], chest: [0.3, 1], bossslain: [1, 1], lordslain: [0.6, 1], revive: [1, 1], record: [1, 1], unlock: [1, 1],
};

// Level factors that keep the reward ladder in order as measured through the real chain (RMS over
// a sound's first 1.5 s): the evolution 2 dB over the boss chest's opening, a record 3 dB over a
// level-up, the boss's stir 3 dB under its fall; the swarm's and the pack's warnings within 3 dB
// of the ring's.
const LEVEL = { evolve: 1.6, chest3: 0.72, record: 1.8, rumble: 0.55, warnswarm: 5.5, warnpack: 4 };

// The recorded weather's levels (the files are levelled to about -18 LUFS, the rain -20, the steps
// peaking at -3 dBFS). The opening clap's echo: a repeat every `delay` seconds, each `feedback`
// as loud as the last and darker (`lp`), all of them `wet` under the clap.
const THUNDER = { vol: 0.5, big: 0.6, echo: { delay: 0.42, feedback: 0.42, lp: 1400, wet: 0.55 } };
const RAIN_LEVEL = 0.4;
const WET_STEP = 0.15;

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
  // Reaper's Scythe: a slow, soft whoosh of air as the blade goes round, and a hollow falling
  // two-note sigh for each foe it reaps.
  whoosh: (t, o) => {
    noise(t, { filter: 'bandpass', f0: 320 * o.p, f1: 1100 * o.p, q: 0.9, dur: 0.6, vol: 0.2, attack: 0.22, curve: 'lin', pan: o.pan });
    tone(t, { type: 'sine', f0: 120 * o.p, f1: 80, dur: 0.5, vol: 0.035, attack: 0.12 });
  },
  reap: (t, o) => {
    tone(t, { type: 'triangle', f0: 660 * o.p, f1: 330 * o.p, dur: 0.32, vol: 0.05, pan: o.pan });
    tone(t + 0.06, { type: 'sine', f0: 494 * o.p, f1: 247 * o.p, dur: 0.4, vol: 0.04, detune: 12, pan: o.pan });
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
  coin: (t, o) => {
    tone(t, { type: 'square', f0: 988 * o.p, dur: 0.06, vol: 0.06 });
    tone(t + 0.06, { type: 'square', f0: 1319 * o.p, dur: 0.16, vol: 0.06 });
  },
  // An evolution: the longest and brightest - a low swell, a rising major arpeggio over two octaves
  // and a shimmering high chord ringing out.
  evolve: (t) => {
    const k = LEVEL.evolve;
    tone(t, { type: 'sine', f0: 65, f1: 130, dur: 0.9, vol: 0.32 * k, attack: 0.05 });
    arp(t, [262, 330, 392, 523, 659, 784, 1046, 1318], 0.055, { type: 'square', dur: 0.3, vol: 0.06 * k });
    for (const [f, v] of [[1046, 0.07], [1318, 0.05], [1568, 0.05], [2093, 0.03]]) tone(t + 0.45, { type: 'triangle', f0: f, dur: 1.4, vol: v * k, attack: 0.01 });
    noise(t + 0.4, { filter: 'highpass', f0: 6000, f1: 11000, dur: 1.2, vol: 0.08 * k, attack: 0.05 });
  },
  // A piece of gear landing, by rarity (o.size): Common and Uncommon a soft clink; Rare a bright
  // ping; Epic a ringing chord; Legendary a deep thud under a struck bell chord.
  gear: (t, o) => {
    const r = o.size;
    if (r <= 1) {
      tone(t, { type: 'triangle', f0: 1200 + r * 200, dur: 0.08, vol: 0.06, pan: o.pan });
      return;
    }
    if (r === 2) {
      arp(t, [988, 1480], 0.06, { type: 'triangle', dur: 0.35, vol: 0.08, pan: o.pan });
      return;
    }
    if (r === 3) {
      for (const f of [523, 659, 988, 1319]) tone(t, { type: 'triangle', f0: f, dur: 0.9, vol: 0.06, attack: 0.005, pan: o.pan });
      noise(t, { filter: 'highpass', f0: 5000, dur: 0.5, vol: 0.06 });
      return;
    }
    tone(t, { type: 'sine', f0: 80, f1: 45, dur: 0.6, vol: 0.4 });
    for (const [f, v] of [[220, 0.14], [440, 0.08], [554, 0.06], [659, 0.06], [880, 0.04], [1319, 0.03]]) tone(t + 0.02, { type: 'sine', f0: f, dur: 2.2, vol: v, attack: 0.004 });
  },
  // The gear screen's Epic slam: a ringing chord over a thump.
  epic: (t) => {
    tone(t, { type: 'sine', f0: 110, f1: 55, dur: 0.4, vol: 0.3 });
    arp(t + 0.03, [392, 494, 587, 784], 0.03, { type: 'triangle', dur: 0.9, vol: 0.07 });
    noise(t, { filter: 'highpass', f0: 4000, dur: 0.6, vol: 0.07, attack: 0.02 });
  },
  // The gear screen's Legendary slam: a heavy hit, a choir-like chord swelling, a bell on top.
  legendary: (t) => {
    tone(t, { type: 'sine', f0: 70, f1: 35, dur: 0.7, vol: 0.45 });
    noise(t, { f0: 900, f1: 80, dur: 0.5, vol: 0.3 });
    for (const [f, v] of [[262, 0.08], [330, 0.06], [392, 0.06], [523, 0.05]]) tone(t + 0.05, { type: 'sawtooth', f0: f, dur: 1.6, vol: v * 0.6, attack: 0.25, lp: 1800 });
    for (const [f, v] of [[1046, 0.08], [2093, 0.04], [2637, 0.03]]) tone(t + 0.1, { type: 'sine', f0: f, dur: 2, vol: v, attack: 0.004 });
  },
  // A milestone level: a fanfare of three rising chords, a bell under the last.
  milestone: (t) => {
    [[392, 494, 587], [440, 554, 659], [523, 659, 784]].forEach((ch, i) => ch.forEach((f) => tone(t + i * 0.14, { type: 'square', f0: f, dur: 0.22 + i * 0.15, vol: 0.045 })));
    tone(t + 0.28, { type: 'sine', f0: 262, dur: 1.4, vol: 0.12, attack: 0.005 });
  },
  // A shut chest shaking: a wooden rattle, pitched up a step each set.
  chestshake: (t, o) => {
    for (let i = 0; i < 4; i++) noise(t + i * 0.05, { filter: 'bandpass', f0: 700 * o.p, f1: 450 * o.p, q: 3, dur: 0.05, vol: 0.18 });
    tone(t, { type: 'square', f0: 120 * o.p, f1: 90 * o.p, dur: 0.18, vol: 0.05, lp: 600 });
  },
  // One thing a chest shows: a bright note, its pitch the step on the chest's scale.
  reveal: (t, o) => {
    tone(t, { type: 'triangle', f0: 784 * o.p, dur: 0.22, vol: 0.09 });
    tone(t + 0.02, { type: 'square', f0: 1568 * o.p, dur: 0.12, vol: 0.03 });
  },
  // A results row ticking in: a soft wooden click.
  tally: (t, o) => {
    tone(t, { type: 'triangle', f0: 880 * o.p, f1: 660 * o.p, dur: 0.05, vol: 0.06 });
    noise(t, { filter: 'bandpass', f0: 2500, q: 3, dur: 0.03, vol: 0.05 });
  },
  // The gold count landing: a low, full thunk.
  thunk: (t) => {
    tone(t, { type: 'sine', f0: 140, f1: 55, dur: 0.3, vol: 0.32 });
    tone(t, { type: 'triangle', f0: 523, dur: 0.25, vol: 0.06 });
    tone(t + 0.02, { type: 'triangle', f0: 784, dur: 0.35, vol: 0.05 });
    noise(t, { f0: 900, f1: 120, dur: 0.18, vol: 0.18 });
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
  // A chest coming up, by tier (o.size 1 champion's, 2 lord's, 3 boss's): one family rising in size,
  // a wooden knock and a glitter of struck bells falling then climbing; the lord's adds a low horn
  // under it, the boss's a deep boom, a gong and a longer glitter. Not the level-up's square arpeggio.
  chest: (t, o) => {
    const n = Math.max(1, Math.min(3, o.size || 1));
    noise(t, { filter: 'lowpass', f0: 700, f1: 200, dur: 0.12, vol: 0.25 });
    tone(t, { type: 'sine', f0: 160, f1: 90, dur: 0.15, vol: 0.2 });
    const bells = [2093, 1760, 1568, 1319, 1568, 1760, 2093, 2637, 3136, 3520].slice(0, 5 + n * 2);
    bells.forEach((f, i) => tone(t + 0.08 + i * 0.055, { type: 'sine', f0: f, dur: 0.5 + n * 0.15, vol: 0.05, attack: 0.003 }));
    if (n >= 2) for (const f of [131, 196, 262]) tone(t + 0.05, { type: 'sawtooth', f0: f, dur: 0.6 + n * 0.3, vol: 0.05, attack: 0.12, lp: 900 });
    if (n >= 3) {
      tone(t, { type: 'sine', f0: 55, f1: 32, dur: 1.2, vol: 0.4 * LEVEL.chest3 });
      for (const [f, v] of [[110, 0.12], [163, 0.06], [231, 0.05], [349, 0.03]]) tone(t + 0.02, { type: 'sine', f0: f, dur: 2.2, vol: v * LEVEL.chest3, attack: 0.005 });
    }
    noise(t + 0.1, { filter: 'highpass', f0: 6000, f1: 11000, dur: 0.6 + n * 0.3, vol: 0.03 + n * 0.015, attack: 0.15, curve: 'lin' });
  },
  // A swarm coming: wings, a fluttering hiss rising.
  warnswarm: (t) => {
    const k = LEVEL.warnswarm;
    for (let i = 0; i < 8; i++) noise(t + i * 0.07, { filter: 'bandpass', f0: 1800 + i * 250, q: 3, dur: 0.06, vol: 0.09 * k });
    tone(t, { type: 'triangle', f0: 880, f1: 1320, dur: 0.6, vol: 0.04 * k });
  },
  // A ring closing: a bone rattle over two low drum beats.
  warnring: (t) => {
    for (const d of [0, 0.32]) tone(t + d, { type: 'sine', f0: 90, f1: 50, dur: 0.25, vol: 0.28 });
    for (let i = 0; i < 6; i++) noise(t + 0.05 + i * 0.05, { filter: 'highpass', f0: 2500, dur: 0.03, vol: 0.08 });
  },
  // A pack on the hunt: a howl, rising and falling.
  warnpack: (t) => {
    const k = LEVEL.warnpack;
    tone(t, { type: 'sawtooth', f0: 330, f1: 620, dur: 0.45, vol: 0.05 * k, lp: 1400, attack: 0.08 });
    tone(t + 0.45, { type: 'sawtooth', f0: 620, f1: 400, dur: 0.5, vol: 0.05 * k, lp: 1400 });
  },
  // Something stirs before a boss: a low rumble rising for 1.5 s.
  rumble: (t) => {
    noise(t, { filter: 'lowpass', f0: 120, f1: 420, dur: 1.6, vol: 0.32 * LEVEL.rumble, attack: 1.3, curve: 'lin' });
    tone(t, { type: 'sine', f0: 38, f1: 52, dur: 1.6, vol: 0.3 * LEVEL.rumble, attack: 1.2 });
  },
  // Thunder (game/weather.js): a recorded clap and roll, softer the smaller `size` (far off). Until
  // the recordings are in, synthesised: size 1 close by, a crack and a heavy roll; less, only a
  // soft late rumble.
  thunder: (t, o) => {
    const k = o.size;
    if (sample(t, 'thunder', { vol: THUNDER.vol * k, pan: o.pan, rate: 0.94 + Math.random() * 0.12 })) return;
    if (k > 0.6) noise(t, { filter: 'highpass', f0: 1800, f1: 500, dur: 0.3, vol: 0.22 * k, pan: o.pan });
    noise(t + 0.02, { filter: 'lowpass', f0: 250 + 700 * k, f1: 50, dur: 2.2 + 1.2 * (1 - k), vol: 0.42 * k, attack: 0.03 + 0.5 * (1 - k), pan: o.pan });
    tone(t, { type: 'sine', f0: 52, f1: 30, dur: 1.8, vol: 0.22 * k, attack: 0.05 + 0.4 * (1 - k) });
    noise(t + 0.7, { filter: 'lowpass', f0: 320, f1: 60, dur: 2.6, vol: 0.18 * k, attack: 0.4, curve: 'lin', pan: -o.pan * 0.5 });
  },
  // The thunder that opens a spell of rain: the biggest clap, echoing off the hills.
  bigthunder: (t, o) => {
    if (!sample(t, 'bigthunder', { vol: THUNDER.big, pan: o.pan, echo: THUNDER.echo })) SFX.thunder(t, o);
  },
  // A step on wet ground (game/player.js, while it rains): a squelch in the mud.
  wetstep: (t) => sample(t, 'wetstep', { vol: WET_STEP, rate: 0.9 + Math.random() * 0.2 }),
  // A crypt's lord waking: a short sting, two low stabs.
  lordsting: (t) => {
    tone(t, { type: 'sawtooth', f0: 147, dur: 0.18, vol: 0.12, lp: 1200 });
    tone(t, { type: 'sawtooth', f0: 156, dur: 0.18, vol: 0.1, lp: 1200 });
    tone(t + 0.2, { type: 'sawtooth', f0: 110, f1: 98, dur: 0.45, vol: 0.14, lp: 900 });
    noise(t, { filter: 'lowpass', f0: 500, f1: 100, dur: 0.3, vol: 0.15 });
  },
  // A boss slain: low and heavy - a falling boom, a long rumble - and a great bell struck over it.
  bossslain: (t) => {
    tone(t, { type: 'sine', f0: 70, f1: 28, dur: 1.4, vol: 0.5 });
    noise(t, { filter: 'lowpass', f0: 600, f1: 60, dur: 1.8, vol: 0.4, attack: 0.01 });
    for (const [f, v] of [[147, 0.2], [294, 0.1], [352, 0.07], [441, 0.06], [587, 0.04], [880, 0.025]]) tone(t + 0.18, { type: 'sine', f0: f, dur: 3.2, vol: v, attack: 0.004 });
  },
  // A crypt's lord slain: the same, smaller - a shorter boom and a smaller, higher bell.
  lordslain: (t) => {
    tone(t, { type: 'sine', f0: 95, f1: 45, dur: 0.7, vol: 0.38 });
    noise(t, { filter: 'lowpass', f0: 900, f1: 120, dur: 0.8, vol: 0.28 });
    for (const [f, v] of [[294, 0.12], [588, 0.06], [704, 0.04], [880, 0.03]]) tone(t + 0.12, { type: 'sine', f0: f, dur: 1.8, vol: v, attack: 0.004 });
  },
  // The hero rising again: a swell climbing from below into a bright held chord.
  revive: (t) => {
    tone(t, { type: 'sine', f0: 110, f1: 440, dur: 0.8, vol: 0.2, attack: 0.3 });
    noise(t, { filter: 'bandpass', f0: 400, f1: 6000, q: 1.5, dur: 0.9, vol: 0.12, attack: 0.6 });
    for (const [f, v] of [[440, 0.06], [554, 0.05], [659, 0.05], [880, 0.04]]) tone(t + 0.7, { type: 'sawtooth', f0: f, dur: 1.3, vol: v * 0.7, attack: 0.05, lp: 3000 });
  },
  // A new record, a personal best: a fanfare - three quick notes and a held chord, a bell on top.
  record: (t) => {
    const k = LEVEL.record;
    [[523, 0], [659, 0.11], [784, 0.22]].forEach(([f, d]) => tone(t + d, { type: 'square', f0: f, dur: 0.1, vol: 0.06 * k }));
    for (const f of [523, 659, 784, 1046]) tone(t + 0.36, { type: 'square', f0: f, dur: 0.9, vol: 0.035 * k, attack: 0.01 });
    tone(t + 0.36, { type: 'sine', f0: 2093, dur: 1.4, vol: 0.05 * k, attack: 0.003 });
  },
  // A hero unlocked: the bell, then a rising call answered.
  unlock: (t) => {
    for (const [f, v] of [[220, 0.18], [440, 0.09], [556, 0.06], [660, 0.05]]) tone(t, { type: 'sine', f0: f, dur: 2.4, vol: v, attack: 0.005 });
    arp(t + 0.3, [440, 554, 659, 880, 1109], 0.09, { type: 'triangle', dur: 0.5, vol: 0.07 });
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
  // The fury orb full: a bright two-note chime over a soft low swell and a shimmer, rising.
  furyready: (t) => {
    tone(t, { type: 'sine', f0: 220, f1: 440, dur: 0.5, vol: 0.12, attack: 0.04 });
    tone(t, { type: 'triangle', f0: 1046, dur: 0.35, vol: 0.09, attack: 0.004 });
    tone(t + 0.09, { type: 'triangle', f0: 1568, dur: 0.6, vol: 0.09, attack: 0.004 });
    tone(t + 0.09, { type: 'sine', f0: 3136, dur: 0.4, vol: 0.025, attack: 0.004 });
    noise(t + 0.05, { filter: 'highpass', f0: 5000, f1: 9000, dur: 0.5, vol: 0.05, attack: 0.08 });
  },
  // The ultimate's launch: a rising rush and a chord, a low hit under it.
  ult: (t) => {
    tone(t, { type: 'sine', f0: 75, f1: 38, dur: 0.35, vol: 0.4 });
    noise(t, { filter: 'lowpass', f0: 900, f1: 120, dur: 0.18, vol: 0.3 });
    noise(t, { f0: 300, f1: 5000, dur: 0.6, vol: 0.3, attack: 0.15 });
    arp(t + 0.05, [262, 392, 523, 784], 0.06, { type: 'sawtooth', dur: 0.5, vol: 0.06, lp: 2500 });
    tone(t + 0.15, { type: 'sine', f0: 60, f1: 120, dur: 0.6, vol: 0.25 });
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
    const o = { p: opts.pitch ?? 1, pan: opts.pan ?? 0, size: opts.size ?? 1 };
    const rate = (1 + (o.p - 1) * RECORDED.pitch) / Math.pow(o.size, 0.25);
    if (!(RECORDED.names.has(name) && sample(t + 0.005, name, { vol: RECORDED.vol, pan: o.pan, rate }))) fn(t + 0.005, o);
    if (DUCKED.has(name)) duckMusic();
  } catch {
    /* audio graph errors should never break the game */
  }
}

// The music lowered by `db` for `secs` (down in DUCK.down, back up over DUCK.up), from wherever
// it stands now, so a beat over a beat holds it down without a jump.
export function duckMusic(secs = DUCK.secs, db = DUCK.db) {
  if (!A.ctx || !A.duck) return;
  const g = A.duck.gain, now = A.ctx.currentTime, low = Math.pow(10, db / 20);
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(low, now + DUCK.down);
  g.setValueAtTime(low, now + Math.max(DUCK.down, secs - DUCK.up));
  g.linearRampToValueAtTime(1, now + secs);
}

// The weather's bed (game/weather.js): rain, the recorded shower looping under the sound effects'
// volume (a filtered hiss until the recording is in). Each call holds it where asked for a moment;
// called no more (a pause, the menus, the run's end), it fades out by itself.
const BED = { rain: null };
function bed(make, buf) {
  const ctx = A.ctx, src = ctx.createBufferSource();
  src.buffer = buf || A.noiseBuf;
  src.loop = true;
  const f = buf ? [] : make(ctx), g = ctx.createGain();
  g.gain.value = 0;
  if (f.length) {
    src.connect(f[0]);
    f[f.length - 1].connect(g);
  } else src.connect(g);
  g.connect(A.sfxBus);
  src.start(0, Math.random() * src.buffer.duration);
  return { g, f, src, sampled: !!buf };
}
function hold(param, v, now) {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.setTargetAtTime(v, now, 0.35);
  param.setTargetAtTime(0, now + 0.6, 0.3);
}
export function weatherBed(rain) {
  if (!A.ctx || !A.noiseBuf) return;
  try {
    const now = A.ctx.currentTime, shower = sampleBuf('rain');
    // The hiss gives way to the recording once it is in.
    if (BED.rain && !BED.rain.sampled && shower) {
      BED.rain.g.gain.setTargetAtTime(0, now, 0.3);
      BED.rain.src.stop(now + 2);
      BED.rain = null;
    }
    if (!BED.rain && rain > 0) {
      BED.rain = bed((ctx) => {
        const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 700;
        lp.type = 'lowpass';
        lp.frequency.value = 5500;
        hp.connect(lp);
        return [hp, lp];
      }, shower);
    }
    if (BED.rain) hold(BED.rain.g.gain, (BED.rain.sampled ? RAIN_LEVEL : 0.1) * rain, now);
  } catch {
    /* audio graph errors should never break the game */
  }
}

// The sounds' names, and those with a limit, for the tests.
export const soundNames = () => Object.keys(SFX);
export const limited = (name) => !!LIMITS[name];

// ---------------------------------------------------------------- music --

// A music file playing through the music bus, so volume and mute apply. `gain` fades the
// whole piece in and out; each of its players has its own gain for the loop seams.
function track(name) {
  let t = A.tracks.get(name);
  if (t) return t;
  const entry = A.files[name];
  const file = typeof entry === 'string' ? entry : entry.file;
  const level = FILE_LEVEL * (entry && entry.gain > 0 ? entry.gain : 1);
  const gain = A.ctx.createGain();
  gain.gain.value = 0;
  gain.connect(A.musicBus);
  t = { gain, level, once: ONCE.has(name), voices: [], cur: 0, playing: false, fadeTimer: 0 };
  for (let i = t.once ? 1 : 2; i > 0; i--) {
    const el = new Audio(MUSIC_DIR + file);
    el.preload = 'auto';
    const g = A.ctx.createGain();
    g.gain.value = level;
    A.ctx.createMediaElementSource(el).connect(g);
    g.connect(gain);
    // A player that fails (a dropped connection, say) fetches its file again, a few times at most.
    let tries = 0;
    el.addEventListener('error', () => {
      if (++tries > 3) return;
      setTimeout(() => {
        el.load();
        if (t.playing && t.voices[t.cur].el === el) el.play().catch(() => {});
      }, 1000 * tries);
    });
    el.addEventListener('ended', () => {
      if (!t.once) return;
      t.playing = false;
      // A piece waiting for this jingle to end starts now (playAfterJingle).
      if (A.after) {
        const next = A.after;
        A.after = null;
        playMusic(next);
      }
    });
    t.voices.push({ el, g });
  }
  A.tracks.set(name, t);
  if (!A.loopTimer) A.loopTimer = setInterval(turnLoops, 20);
  return t;
}

// Hand each playing loop to its other player just before the end.
function turnLoops() {
  if (!A.ctx) return;
  for (const t of A.tracks.values()) {
    if (!t.playing || t.once) continue;
    const a = t.voices[t.cur], el = a.el;
    if (el.paused || !el.duration || el.currentTime < el.duration - XF - 0.03) continue;
    const b = t.voices[1 - t.cur], now = A.ctx.currentTime;
    b.el.currentTime = LEAD_IN;
    b.el.play().catch(() => {});
    b.g.gain.cancelScheduledValues(now);
    b.g.gain.setValueAtTime(0, now);
    b.g.gain.linearRampToValueAtTime(t.level, now + XF);
    a.g.gain.cancelScheduledValues(now);
    a.g.gain.setValueAtTime(t.level, now);
    a.g.gain.linearRampToValueAtTime(0, now + XF);
    setTimeout(() => {
      if (t.voices[t.cur] !== a) a.el.pause();
    }, XF * 1000 + 60);
    t.cur = 1 - t.cur;
  }
}

function fadeFiles(except, secs) {
  const now = A.ctx.currentTime;
  for (const [n, t] of A.tracks) {
    if (n === except || !t.playing) continue;
    t.playing = false;
    t.gain.gain.cancelScheduledValues(now);
    t.gain.gain.setValueAtTime(t.gain.gain.value, now);
    t.gain.gain.linearRampToValueAtTime(0, now + secs);
    clearTimeout(t.fadeTimer);
    t.fadeTimer = setTimeout(() => {
      for (const v of t.voices) v.el.pause();
    }, secs * 1000 + 50);
  }
}

// Start a piece from its file; whatever played before fades out (over `fade` s; the new one comes
// in over the same, or at once when `slam`). A piece with no file is silence.
function startPiece(name, fade = 0.9, slam = false) {
  if (!A.ctx) return;
  if (!(A.files && A.files[name])) {
    fadeFiles(null, 0.6);
    return;
  }
  const t = track(name), now = A.ctx.currentTime;
  fadeFiles(name, fade);
  clearTimeout(t.fadeTimer);
  t.gain.gain.cancelScheduledValues(now);
  t.gain.gain.setValueAtTime(slam ? 1 : 0, now);
  if (!slam) t.gain.gain.linearRampToValueAtTime(1, now + fade);
  t.cur = 0;
  t.voices.forEach((v, i) => {
    v.g.gain.cancelScheduledValues(now);
    v.g.gain.setValueAtTime(i === 0 ? t.level : 0, now);
    if (i > 0) v.el.pause();
  });
  t.voices[0].el.currentTime = 0;
  t.voices[0].el.play().catch(() => {});
  t.playing = true;
}

const piecePlaying = (name) => A.songName === name && A.tracks.get(name) && A.tracks.get(name).playing;

// o.fade: seconds to cross over (0.9 by default; a boss's fall eases back over longer).
export function playMusic(name, o = {}) {
  A.after = null;
  clearTimeout(A.cutTimer);
  if (piecePlaying(name)) return;
  A.songName = name;
  startPiece(name, o.fade || 0.9);
}

// A boss's arrival: the music cut to silence for `gap` s, then the piece slams in at full.
export function cutToMusic(name, gap = 0.4) {
  A.after = null;
  A.songName = name;
  clearTimeout(A.cutTimer);
  if (!A.ctx) return;
  fadeFiles(null, 0.05);
  A.cutTimer = setTimeout(() => {
    if (A.songName === name) startPiece(name, 0.05, true);
  }, gap * 1000);
}

export function stopMusic() {
  A.songName = null;
  if (A.ctx) fadeFiles(null, 0.6);
}

export function playJingle(name) {
  if (!A.ctx || !(A.files && A.files[name])) return;
  A.songName = null;
  A.after = null;
  startPiece(name);
}

// A piece that waits for the jingle playing now (the victory's, say) to end, so the jingle is
// heard in full; at once if none is playing.
export function playAfterJingle(name) {
  const playing = [...A.tracks.values()].some((t) => t.once && t.playing && !t.voices[0].el.ended);
  if (!A.ctx || !playing) return playMusic(name);
  A.after = name;
}

// What the music is doing, for the developer panel and tests: the piece, and each file's players.
export function musicState() {
  return { piece: A.songName, after: A.after, files: A.files, tracks: A.tracks, duck: A.duck ? A.duck.gain.value : 1 };
}

export function audioReady() {
  return !!A.ctx;
}
