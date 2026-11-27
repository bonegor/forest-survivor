import { AXE_RECORDINGS } from './weapon-sounds.js';

const root = new URL('../../audio/sfx/library/', import.meta.url);
const standalone = new Set(Object.values(AXE_RECORDINGS));
let catalog;
const banks = new Map(), sounds = new Map();

export function weaponRecordingCatalog() {
  return catalog ??= fetch(new URL('index.json', root)).then(async response => {
    if (!response.ok) throw new Error('Could not load the weapon recording catalog.');
    const entries = await response.json();
    return new Map(entries.map(entry => [entry.id, entry]));
  }).catch(error => { catalog = null; throw error; });
}

function cached(map, id, limit, load) {
  if (map.has(id)) {
    const value = map.get(id);
    map.delete(id); map.set(id, value);
    return value;
  }
  if (map.size >= limit) map.delete(map.keys().next().value);
  const promise = load().then(value => { promise.ready = value; return value; })
    .catch(error => { if (map.get(id) === promise) map.delete(id); throw error; });
  map.set(id, promise);
  return promise;
}

async function fetchBytes(path) {
  const response = await fetch(new URL(path, root));
  if (!response.ok) throw new Error('Could not load the weapon recording from ' + path);
  return response.arrayBuffer();
}

async function recordingBytes(id) {
  // Default attacks also ship as small files so the first throw can load
  // straight from its Ogg, before the player has ever opened the sound lab.
  if (standalone.has(id)) return fetchBytes(id);
  const clip = (await weaponRecordingCatalog()).get(id);
  if (!clip) throw new Error('This weapon recording is unavailable.');
  const bytes = await cached(banks, clip.bank, 4, () => fetchBytes(`bank-${clip.bank}.bin`));
  return bytes.slice(clip.offset, clip.offset + clip.bytes);
}

export function loadWeaponRecording(ctx, id) {
  return cached(sounds, id, 20, async () => {
    const buffer = await ctx.decodeAudioData(await recordingBytes(id));
    // Trim leading digital silence for responsive releases, retaining the source in the bank.
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    let start = 0, peak = 0;
    while (start < buffer.length - 1 && channels.every(ch => Math.abs(ch[start]) < 0.004)) start++;
    const end = Math.min(buffer.length, start + Math.ceil(1.2 * buffer.sampleRate));
    for (const ch of channels) for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(ch[i]));
    return { buffer, offset: start / buffer.sampleRate, gain: Math.min(2, 0.40 / Math.max(0.01, peak)) };
  });
}

export function playWeaponRecording(ctx, output, sound, time, rate) {
  const source = ctx.createBufferSource(), gain = ctx.createGain();
  source.buffer = sound.buffer;
  source.playbackRate.value = rate;
  const length = Math.min(1.2, (sound.buffer.duration - sound.offset) / rate);
  const end = time + length;
  gain.gain.setValueAtTime(sound.gain, time);
  gain.gain.setValueAtTime(sound.gain, Math.max(time, end - 0.055));
  gain.gain.linearRampToValueAtTime(0, end);
  source.connect(gain); gain.connect(output);
  source.onended = () => { source.disconnect(); gain.disconnect(); };
  source.start(time, sound.offset);
  source.stop(end);
}
