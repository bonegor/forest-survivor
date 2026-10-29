// Exercise the music player through its public API. Media time is controlled independently
// from the scheduler, as it is when an HTMLAudioElement reaches an exact Ogg loop seam.
import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT_MUSIC, DEFAULT_COMBAT_MUSIC, normalizeCombatMusic } from '../public/js/engine/combat-music.js';

let instance = 0;

async function player(t, options = {}) {
  const originals = new Map();
  const replace = (name, value) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  };
  t.after(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });

  let ms = 0, nextTimer = 0;
  const timers = new Map();
  const schedule = (fn, delay, repeat = 0) => {
    const id = ++nextTimer;
    timers.set(id, { fn, due: ms + delay, repeat });
    return id;
  };
  replace('setTimeout', (fn, delay = 0) => schedule(fn, delay));
  replace('clearTimeout', (id) => timers.delete(id));
  replace('setInterval', (fn, delay) => schedule(fn, delay, delay));
  replace('clearInterval', (id) => timers.delete(id));
  const tick = (elapsed) => {
    const end = ms + elapsed;
    for (;;) {
      const pending = [...timers].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!pending) break;
      const [id, timer] = pending;
      ms = timer.due;
      if (timer.repeat) timer.due += timer.repeat;
      else timers.delete(id);
      timer.fn();
    }
    ms = end;
  };

  class Param {
    constructor() { this.value = 1; this.events = []; }
    cancelScheduledValues(time) { this.events.push(['cancel', time]); }
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
    linearRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]); }
    setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
  }
  const node = () => ({ connections: [], connect(target) { this.connections.push(target); }, disconnect() {} });
  let context;
  class Context {
    constructor() { context = this; this.sampleRate = 10; this.state = 'running'; this.destination = node(); this.resumes = 0; this.gains = []; this.mediaSources = []; }
    get currentTime() { return ms / 1000; }
    createGain() { const gain = { ...node(), gain: new Param() }; this.gains.push(gain); return gain; }
    createDynamicsCompressor() {
      return { ...node(), ...Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map((name) => [name, { value: 0 }])) };
    }
    createBuffer(channels, frames) { return { getChannelData: () => new Float32Array(frames) }; }
    createMediaElementSource(el) { const source = node(); this.mediaSources.push({ el, source }); return source; }
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
  }
  const media = [];
  class Media {
    constructor(src) {
      this.src = src; this.loop = false; this.paused = true; this.ended = false;
      this.duration = 132.631587; this.time = 0; this.seeks = []; this.plays = 0; this.pauses = 0;
      this.listeners = new Map();
      media.push(this);
    }
    get currentTime() { return this.time; }
    set currentTime(value) { this.time = value; this.seeks.push(value); if (value < this.duration) this.ended = false; }
    addEventListener(name, fn) { this.listeners.set(name, fn); }
    emit(name) { this.listeners.get(name)?.(); }
    play() {
      this.plays++; this.paused = false;
      if (this.src.includes('/previews/')) {
        if (options.previewPlay === 'reject') return Promise.reject(new Error('Blocked or missing preview'));
        if (options.previewPlay === 'deferred') return new Promise((resolve, reject) => {
          this.begin = () => { this.paused = false; resolve(); };
          this.fail = reject;
        });
      }
      return Promise.resolve();
    }
    pause() { this.pauses++; this.paused = true; }
    load() {}
  }
  const listeners = new Map();
  const doc = { hidden: false, addEventListener: (name, fn) => listeners.set(name, fn) };
  const manifest = {
    title: { file: 'sunroom-circuit.ogg', gapless: true },
    results: { file: 'stillwater-echo-guitar.ogg', gapless: true },
    forest: { file: 'wildfire-run.ogg', gapless: true },
    legacy: 'legacy-dungeon.mp3',
    victory: 'stillwater-echo-guitar.ogg',
    ...options.manifest,
  };
  replace('window', { AudioContext: Context });
  replace('document', doc);
  replace('Audio', Media);
  replace('location', { search: '' });
  const response = { ok: true, json: async () => manifest };
  let releaseManifest;
  const pending = options.deferManifest ? new Promise((resolve) => { releaseManifest = () => resolve(response); }) : Promise.resolve(response);
  replace('fetch', (url) => url.endsWith('tracks.json') ? pending : Promise.resolve({ ok: false }));
  const api = await import(`../public/js/engine/audio.js?music-playback-test=${++instance}`);
  await new Promise(setImmediate); // settle manifest fetch before any playback request
  if (options.init !== false) api.initAudio();
  return { api, tick, context, doc, media, wake: () => listeners.get('visibilitychange')?.(),
    finishManifest: async () => { releaseManifest?.(); await new Promise(setImmediate); } };
}

const combatManifest = Object.fromEntries(COMBAT_MUSIC.map((track) => [track.piece, { file: track.file, gapless: true }]));

test('combat music settings accept only the eight published choices and default to Clockwork Charge', () => {
  assert.equal(COMBAT_MUSIC.length, 8);
  assert.equal(DEFAULT_COMBAT_MUSIC, 'clockwork-charge');
  for (const track of COMBAT_MUSIC) assert.equal(normalizeCombatMusic(track.id), track.id);
  for (const stale of [undefined, null, '', 'old-song', '__proto__', { id: 'spark-rush' }]) {
    assert.equal(normalizeCombatMusic(stale), DEFAULT_COMBAT_MUSIC);
  }
});

test('a selected long recording streams alone and continues through bosses and dungeon floors', async (t) => {
  const { api, tick, media } = await player(t, { manifest: combatManifest });
  assert.equal(media.length, 0, 'the catalog does not preload the long recordings');
  api.playMusic('forest');
  const state = api.musicState(), track = state.tracks.get('combat-clockwork-charge');
  assert.equal(state.combatMusic, DEFAULT_COMBAT_MUSIC);
  assert.equal(state.piece, 'combat-clockwork-charge');
  assert.equal(track.voices.length, 1);
  const el = track.voices[0].el;
  el.duration = 900;
  el.currentTime = 147;
  assert.equal(el.src, 'audio/music/combat/clockwork-charge-15m.mp3');
  assert.equal(el.preload, 'metadata');
  assert.equal(el.loop, true);
  const seeks = el.seeks.length;
  api.playMusic('boss');
  api.cutToMusic('boss', .4);
  api.playMusic('dungeon-crypt');
  api.playMusic('dungeon-catacombs');
  api.playMusic('dungeon-inferno');
  api.playMusic('crypt');
  api.playMusic('forest');
  tick(2000);
  assert.equal(media.length, 1);
  assert.equal(el.currentTime, 147);
  assert.equal(el.seeks.length, seeks);
  assert.equal(el.plays, 1, 'a combat cue transition must not restart the 15-minute performance');
  assert.equal(track.playing, true);
});

test('choosing music in a menu leaves the menu playing, and changing an active choice crossfades', async (t) => {
  const { api, tick, media } = await player(t, { manifest: combatManifest });
  api.playMusic('title');
  const title = api.musicState().tracks.get('title');
  title.voices[0].el.currentTime = 30;
  assert.equal(api.setCombatMusic('lantern-guard'), 'lantern-guard');
  assert.equal(api.musicState().piece, 'title');
  assert.equal(title.voices[0].el.currentTime, 30);
  assert.equal(media.length, 1);
  api.playMusic('forest');
  const lantern = api.musicState().tracks.get('combat-lantern-guard');
  assert.equal(lantern.voices[0].el.src, 'audio/music/combat/lantern-guard-v2-15m.mp3');
  api.setCombatMusic('spark-rush');
  const spark = api.musicState().tracks.get('combat-spark-rush');
  assert.equal(api.musicState().piece, 'combat-spark-rush');
  assert.equal(spark.voices[0].el.src, 'audio/music/combat/spark-rush-15m.mp3');
  tick(950);
  assert.equal(lantern.voices[0].el.paused, true);
  assert.equal(spark.voices[0].el.paused, false);
  assert.equal(api.setCombatMusic('stale-choice'), DEFAULT_COMBAT_MUSIC);
  assert.equal(api.musicState().piece, 'combat-clockwork-charge');
  api.playMusic('results');
  assert.equal(api.musicState().piece, 'results');
});

test('the country selection streams its own file and survives combat cue changes', async (t) => {
  const { api, tick, media } = await player(t, { manifest: combatManifest });
  api.setCombatMusic('dusty-trail-stampede');
  api.playMusic('forest');
  const state = api.musicState(), track = state.tracks.get('combat-dusty-trail-stampede');
  assert.equal(state.combatMusic, 'dusty-trail-stampede');
  assert.equal(track.voices.length, 1);
  const el = track.voices[0].el;
  el.duration = 900;
  el.currentTime = 287;
  assert.equal(el.src, 'audio/music/combat/dusty-trail-stampede-15m.mp3');
  assert.equal(el.loop, true);
  api.cutToMusic('boss', .4);
  api.playMusic('dungeon-crypt');
  tick(2000);
  assert.equal(media.length, 1);
  assert.equal(el.currentTime, 287);
  assert.equal(el.plays, 1);
  assert.equal(track.playing, true);
});

test('a choice made before audio unlock and a late manifest starts only the chosen combat file', async (t) => {
  const { api, media, finishManifest } = await player(t, { manifest: combatManifest, deferManifest: true, init: false });
  api.setCombatMusic('spark-rush');
  api.playMusic('forest');
  assert.equal(media.length, 0);
  await finishManifest();
  assert.equal(api.musicState().piece, 'combat-spark-rush');
  assert.equal(media.length, 0, 'manifest arrival must not unlock audio itself');
  api.initAudio();
  assert.equal(media.length, 1);
  assert.equal(media[0].src, 'audio/music/combat/spark-rush-15m.mp3');
  assert.equal(media[0].plays, 1);
});

test('a late manifest recovers the selected music for a waiting run', async (t) => {
  const { api, media, finishManifest } = await player(t, { manifest: combatManifest, deferManifest: true });
  api.setCombatMusic('lantern-guard');
  api.playMusic('dungeon-crypt');
  assert.equal(media.length, 0);
  await finishManifest();
  assert.equal(media.length, 1);
  assert.equal(api.musicState().piece, 'combat-lantern-guard');
  api.stopMusic();
  assert.equal(api.musicState().requestedPiece, null);
});

test('a late manifest cannot revive music stopped before it arrived', async (t) => {
  const { api, media, finishManifest } = await player(t, { manifest: combatManifest, deferManifest: true });
  api.playMusic('forest');
  api.stopMusic();
  await finishManifest();
  assert.equal(media.length, 0);
  assert.equal(api.musicState().piece, null);
  assert.equal(api.musicState().requestedPiece, null);
});

test('a queued combat cue uses the latest choice after a victory jingle', async (t) => {
  const { api } = await player(t, { manifest: combatManifest });
  api.playJingle('victory');
  const victory = api.musicState().tracks.get('victory');
  api.playAfterJingle('forest');
  api.setCombatMusic('lantern-guard');
  assert.equal(api.musicState().piece, null);
  assert.equal(api.musicState().after, 'forest');
  victory.voices[0].el.ended = true;
  victory.voices[0].el.emit('ended');
  assert.equal(api.musicState().piece, 'combat-lantern-guard');
});

test('an exact Ogg uses one native looping player and preserves its opening beat at every timer tick', async (t) => {
  const { api, tick } = await player(t);
  api.playMusic('forest');
  const track = api.musicState().tracks.get('forest');
  assert.equal(track.voices.length, 1);
  const el = track.voices[0].el;
  assert.equal(el.loop, true);
  assert.equal(el.currentTime, 0);
  assert.equal(el.plays, 1);
  assert.equal(el.src, 'audio/music/wildfire-run.ogg');
  for (const remaining of [.09, .03, .001]) {
    el.currentTime = el.duration - remaining;
    const seeks = el.seeks.length;
    tick(100);
    assert.equal(el.currentTime, el.duration - remaining, 'the legacy timer must not shorten the exact loop');
    assert.equal(el.seeks.length, seeks, 'there is no seek into an encoder lead-in');
    assert.equal(el.plays, 1);
  }
});

test('results keep playing until title is requested, then fade and pause without a deferred jingle', async (t) => {
  const { api, tick, context } = await player(t);
  api.playMusic('results');
  const results = api.musicState().tracks.get('results');
  const el = results.voices[0].el;
  el.currentTime = 48;
  api.playMusic('results');
  tick(5000);
  assert.equal(el.currentTime, 48, 'reopening results does not restart its music');
  assert.equal(el.plays, 1);
  const transitionTime = context.currentTime;
  api.playMusic('title');
  const state = api.musicState(), title = state.tracks.get('title');
  assert.equal(state.piece, 'title');
  assert.equal(state.after, null);
  assert.equal(results.playing, false);
  assert.equal(title.playing, true);
  assert.equal(title.voices.length, 1);
  assert.equal(title.voices[0].el.loop, true);
  assert.equal(title.voices[0].el.currentTime, 0);
  assert.deepEqual(results.gain.gain.events.at(-1), ['ramp', 0, transitionTime + .9]);
  tick(949);
  assert.equal(el.paused, false, 'the old track remains available during its crossfade');
  tick(1);
  assert.equal(el.paused, true, 'the old player is stopped after its fade');
  assert.equal(title.voices[0].el.paused, false);
});

test('returning to a native track cancels its pending fade-stop', async (t) => {
  const { api, tick } = await player(t);
  api.playMusic('results');
  const results = api.musicState().tracks.get('results');
  api.playMusic('title');
  tick(500);
  api.playMusic('results');
  tick(500);
  assert.equal(results.playing, true);
  assert.equal(results.voices[0].el.paused, false, 'an obsolete results fade must not pause its new playback');
  tick(500);
  assert.equal(api.musicState().tracks.get('title').voices[0].el.paused, true);
});

test('native ended and visibility recovery restart at zero safely, but never revive stopped music', async (t) => {
  const { api, context, doc, wake } = await player(t);
  api.playMusic('results');
  const track = api.musicState().tracks.get('results'), el = track.voices[0].el;
  el.currentTime = el.duration; el.ended = true; el.paused = true;
  assert.doesNotThrow(() => el.emit('ended'));
  assert.equal(el.currentTime, 0);
  assert.equal(el.plays, 2);
  assert.equal(track.voices.length, 1);
  el.currentTime = 37; el.paused = true; context.state = 'suspended';
  doc.hidden = true; wake();
  assert.equal(context.resumes, 0, 'a hidden document stays suspended');
  doc.hidden = false; wake();
  assert.equal(context.resumes, 1);
  assert.equal(el.currentTime, 37, 'ordinary visibility recovery resumes the current phrase');
  assert.equal(el.plays, 3);
  el.currentTime = el.duration; el.ended = true; el.paused = true;
  assert.doesNotThrow(wake);
  assert.equal(el.currentTime, 0, 'an ended native player recovers from the exact start');
  assert.equal(el.plays, 4);
  api.stopMusic();
  el.currentTime = el.duration; el.ended = true; el.paused = true;
  el.emit('ended'); wake();
  assert.equal(el.plays, 4, 'stopped music cannot restart from an ended or visibility callback');
});

test('legacy MP3s retain two players and their lead-in crossfade, while jingles still play once', async (t) => {
  const { api, tick } = await player(t);
  api.playMusic('legacy');
  const track = api.musicState().tracks.get('legacy');
  assert.equal(track.voices.length, 2);
  const [a, b] = track.voices.map((v) => v.el);
  assert.equal(a.loop, false);
  assert.equal(b.loop, false);
  assert.equal(a.currentTime, 0);
  a.currentTime = a.duration - .08;
  tick(20);
  assert.equal(track.cur, 1);
  assert.equal(b.currentTime, .03);
  assert.equal(b.plays, 1);
  tick(120);
  assert.equal(a.paused, true);
  api.playJingle('victory');
  const jingle = api.musicState().tracks.get('victory');
  assert.equal(jingle.voices.length, 1);
  assert.equal(jingle.voices[0].el.loop, false);
  api.playAfterJingle('title');
  assert.equal(api.musicState().after, 'title');
  jingle.voices[0].el.ended = true;
  jingle.voices[0].el.emit('ended');
  assert.equal(api.musicState().piece, 'title');
  assert.equal(api.musicState().after, null);
});

test('a preview plays only its short middle excerpt for ten seconds and restores the menu without restarting it', async (t) => {
  const { api, tick, media } = await player(t, { manifest: combatManifest });
  api.playMusic('title');
  const title = media[0]; title.currentTime = 72;
  api.previewCombatMusic('steel-tread');
  await Promise.resolve();
  const excerpt = media[1];
  assert.equal(excerpt.src, 'audio/music/combat/previews/steel-tread-10s.mp3');
  assert.equal(excerpt.loop, false);
  assert.equal(excerpt.currentTime, 0);
  assert.equal(media.length, 2, 'browsing does not load any full combat recordings');
  assert.deepEqual(api.combatMusicPreview(), { id: 'steel-tread', playing: true, seconds: 10, sourceStart: 445 });
  assert.equal(api.musicState().backgroundGain, 0);
  assert.equal(api.musicState().piece, 'title');
  tick(9999);
  assert.equal(excerpt.paused, false);
  tick(1);
  assert.equal(excerpt.paused, true);
  assert.equal(api.combatMusicPreview(), null);
  assert.equal(api.musicState().backgroundGain, 1);
  assert.equal(title.currentTime, 72);
  assert.equal(title.plays, 1);
});

test('confirmed combat choices wait for the preview to finish, then start the selected full recording', async (t) => {
  const { api, tick, media } = await player(t, { manifest: combatManifest });
  api.playMusic('forest');
  const old = media[0]; old.currentTime = 283;
  api.previewCombatMusic('bootheel-loop');
  api.setCombatMusic('bootheel-loop');
  await Promise.resolve();
  assert.equal(api.musicState().piece, 'combat-clockwork-charge');
  assert.equal(api.musicState().combatMusic, 'bootheel-loop');
  assert.equal(media.length, 2, 'there is no full-recording burst before the excerpt');
  tick(10000);
  assert.equal(api.musicState().piece, 'combat-bootheel-loop');
  assert.equal(media.length, 3);
  assert.equal(media[2].src, 'audio/music/combat/bootheel-loop-v2-15m.mp3');
  assert.equal(media[2].currentTime, 0);
  tick(300);
  assert.equal(old.paused, true);
});

test('browsing a different track without confirming it restores the existing combat recording and position', async (t) => {
  const { api, media } = await player(t, { manifest: combatManifest });
  api.playMusic('forest');
  const original = media[0]; original.currentTime = 164;
  api.previewCombatMusic('neon-motor');
  await Promise.resolve();
  api.stopCombatMusicPreview();
  assert.equal(api.musicState().combatMusic, 'clockwork-charge');
  assert.equal(api.musicState().piece, 'combat-clockwork-charge');
  assert.equal(original.currentTime, 164);
  assert.equal(original.plays, 1);
  assert.equal(api.musicState().backgroundGain, 1);
});

test('rapid previews replace each other and stale playing or ended callbacks cannot revive an old excerpt', async (t) => {
  const { api, tick, media } = await player(t, { previewPlay: 'deferred' });
  api.previewCombatMusic('steel-tread');
  const old = media[0];
  api.previewCombatMusic('neon-motor');
  const current = media[1];
  assert.equal(old.paused, true);
  old.begin(); old.emit('playing'); old.emit('ended');
  await Promise.resolve();
  assert.equal(old.paused, true);
  assert.equal(api.combatMusicPreview().id, 'neon-motor');
  assert.equal(api.musicState().backgroundGain, 0);
  current.begin(); await Promise.resolve();
  tick(5000);
  api.previewCombatMusic('neon-motor');
  assert.equal(media.length, 2, 'drawing the same focused option does not restart it');
  tick(5000);
  assert.equal(api.combatMusicPreview(), null);
  assert.equal(current.paused, true);
});

test('the ten-second limit starts with actual playback, not the initial loading request', async (t) => {
  const { api, tick, media } = await player(t, { previewPlay: 'deferred' });
  api.previewCombatMusic('lantern-guard');
  const excerpt = media[0];
  tick(4000);
  assert.equal(api.combatMusicPreview().playing, false);
  excerpt.begin(); await Promise.resolve();
  tick(9999);
  assert.equal(api.combatMusicPreview().playing, true);
  tick(1);
  assert.equal(api.combatMusicPreview(), null);
});

test('preview failure and missing-media errors restore music, and obsolete failure callbacks do not stop a new preview', async (t) => {
  const { api, media } = await player(t, { previewPlay: 'deferred' });
  api.playMusic('title');
  api.previewCombatMusic('steel-tread');
  const old = media[1];
  api.previewCombatMusic('neon-motor');
  const current = media[2];
  old.fail(new Error('Late failed request')); await Promise.resolve();
  assert.equal(api.combatMusicPreview().id, 'neon-motor');
  current.emit('error');
  assert.equal(api.combatMusicPreview(), null);
  assert.equal(api.musicState().backgroundGain, 1);
  assert.equal(api.musicState().piece, 'title');
  assert.equal(media[0].plays, 1);
});

test('buffering does not consume the remaining preview, and playback resumes with only its remaining seconds', async (t) => {
  const { api, tick, media } = await player(t);
  api.previewCombatMusic('neon-motor'); await Promise.resolve();
  const excerpt = media[0];
  excerpt.currentTime = 4;
  tick(4000); excerpt.emit('waiting');
  tick(8000);
  assert.equal(api.combatMusicPreview().playing, false);
  excerpt.emit('playing');
  tick(5999);
  assert.equal(api.combatMusicPreview().playing, true);
  tick(1);
  assert.equal(api.combatMusicPreview(), null);
});

test('a request that never starts times out safely and its late play resolution stays silent', async (t) => {
  const { api, tick, media } = await player(t, { previewPlay: 'deferred' });
  api.previewCombatMusic('spark-rush');
  const excerpt = media[0];
  tick(15000);
  assert.equal(api.combatMusicPreview(), null);
  assert.equal(api.musicState().backgroundGain, 1);
  excerpt.begin(); await Promise.resolve();
  assert.equal(excerpt.paused, true);
});

test('previews share the music volume and mute bus while leaving sound effects alone', async (t) => {
  const { api, context, media } = await player(t);
  api.setVolumes(.4, .7);
  api.previewCombatMusic('steel-tread'); await Promise.resolve();
  const source = context.mediaSources.find((entry) => entry.el === media[0]).source;
  const gain = source.connections[0], musicBus = gain.connections[0];
  assert.equal(musicBus, context.gains[2]);
  assert.equal(musicBus.gain.value, .2);
  assert.equal(context.gains[1].gain.value, .7 * .8);
  api.toggleMute();
  assert.equal(musicBus.gain.value, 0);
  api.stopCombatMusicPreview();
  assert.equal(musicBus.gain.value, 0, 'ending a preview cannot undo mute');
  api.toggleMute();
  assert.equal(musicBus.gain.value, .2);
});

test('real game cues cancel previews immediately and no timer changes the new playback later', async (t) => {
  const { api, tick, media } = await player(t, { manifest: combatManifest });
  api.previewCombatMusic('steel-tread'); await Promise.resolve();
  api.setCombatMusic('steel-tread');
  api.playMusic('forest');
  assert.equal(api.combatMusicPreview(), null);
  assert.equal(media[0].paused, true);
  assert.equal(api.musicState().piece, 'combat-steel-tread');
  tick(12000);
  assert.equal(api.musicState().piece, 'combat-steel-tread');
  for (const action of [() => api.cutToMusic('boss'), () => api.playJingle('victory'), () => api.stopMusic()]) {
    api.previewCombatMusic('lantern-guard'); await Promise.resolve();
    action();
    assert.equal(api.combatMusicPreview(), null);
    assert.equal(api.musicState().backgroundGain, 1);
  }
});

test('preview before audio unlock and a late manifest never starts a full recording until audition ends', async (t) => {
  const { api, media, finishManifest } = await player(t, { manifest: combatManifest, deferManifest: true, init: false });
  api.playMusic('forest');
  api.previewCombatMusic('steel-tread');
  api.setCombatMusic('steel-tread');
  await Promise.resolve();
  assert.equal(media.length, 1);
  assert.equal(media[0].src, 'audio/music/combat/previews/steel-tread-10s.mp3');
  await finishManifest();
  api.initAudio();
  assert.equal(media.length, 1, 'manifest arrival/unlock leaves the preview in control');
  api.stopCombatMusicPreview();
  assert.equal(media.length, 2);
  assert.equal(api.musicState().piece, 'combat-steel-tread');
});
