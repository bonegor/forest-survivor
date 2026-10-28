// Exercise the music player through its public API. Media time is controlled independently
// from the scheduler, as it is when an HTMLAudioElement reaches an exact Ogg loop seam.
import test from 'node:test';
import assert from 'node:assert/strict';

let instance = 0;

async function player(t) {
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
    setTargetAtTime(value, time, constant) { this.events.push(['target', value, time, constant]); }
  }
  const node = () => ({ connect() {}, disconnect() {} });
  let context;
  class Context {
    constructor() { context = this; this.sampleRate = 10; this.state = 'running'; this.destination = node(); this.resumes = 0; }
    get currentTime() { return ms / 1000; }
    createGain() { return { ...node(), gain: new Param() }; }
    createDynamicsCompressor() {
      return { ...node(), ...Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map((name) => [name, { value: 0 }])) };
    }
    createBuffer(channels, frames) { return { getChannelData: () => new Float32Array(frames) }; }
    createMediaElementSource() { return node(); }
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
  }
  class Media {
    constructor(src) {
      this.src = src; this.loop = false; this.paused = true; this.ended = false;
      this.duration = 132.631587; this.time = 0; this.seeks = []; this.plays = 0; this.pauses = 0;
      this.listeners = new Map();
    }
    get currentTime() { return this.time; }
    set currentTime(value) { this.time = value; this.seeks.push(value); if (value < this.duration) this.ended = false; }
    addEventListener(name, fn) { this.listeners.set(name, fn); }
    emit(name) { this.listeners.get(name)?.(); }
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
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
  };
  replace('window', { AudioContext: Context });
  replace('document', doc);
  replace('Audio', Media);
  replace('location', { search: '' });
  replace('fetch', async (url) => url.endsWith('tracks.json')
    ? { ok: true, json: async () => manifest }
    : { ok: false });
  const api = await import(`../public/js/engine/audio.js?music-playback-test=${++instance}`);
  await new Promise(setImmediate); // settle manifest fetch before any playback request
  api.initAudio();
  return { api, tick, context, doc, wake: () => listeners.get('visibilitychange')?.() };
}

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
