// Release contract between the pre-run choices, playback manifest and approved recordings.
// Hash one recording at a time: this needs neither a decoder nor the installed instruments.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMBAT_MUSIC, DEFAULT_COMBAT_MUSIC } from '../public/js/engine/combat-music.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const music = join(root, 'public/audio/music');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const playback = json(join(music, 'tracks.json'));
const approved = json(join(music, 'combat/manifest.json'));
const suites = json(join(root, 'tools/music/handmade-fight/suite-report.json'));
const grooves = json(join(root, 'tools/music/handmade-fight/repeating-grooves/render-report.json'));
const previews = json(join(music, 'combat/previews/manifest.json'));
const selections = [
  ['clockwork-charge', 'clockwork-long', 'combat/clockwork-charge-15m.mp3'],
  ['lantern-guard', 'lantern-guard-v2', 'combat/lantern-guard-v2-15m.mp3'],
  ['spark-rush', 'spark-rush-long', 'combat/spark-rush-15m.mp3'],
  ['dusty-trail-stampede', 'dusty-trail', 'combat/dusty-trail-stampede-15m.mp3'],
  ['steel-tread', 'steel-tread', 'combat/steel-tread-v2-15m.mp3'],
  ['bootheel-loop', 'bootheel-loop', 'combat/bootheel-loop-v2-15m.mp3'],
  ['neon-motor', 'neon-motor', 'combat/neon-motor-v2-15m.mp3'],
  ['breakbeat-circuit', 'breakbeat-circuit', 'combat/breakbeat-circuit-v2-15m.mp3'],
];

function sourcePath(reference) {
  assert.equal(typeof reference, 'string');
  assert.equal(isAbsolute(reference), false, reference);
  assert.ok(!reference.split(/[\\/]/).includes('..'), reference);
  return join(root, reference);
}

async function sha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

test('the eight music choices resolve to the published full-length playback files', () => {
  assert.deepEqual(COMBAT_MUSIC.map((track) => track.id), selections.map(([id]) => id));
  assert.equal(new Set(approved.tracks.map((track) => track.id)).size, selections.length);
  assert.equal(approved.tracks.length, selections.length);
  assert.equal(DEFAULT_COMBAT_MUSIC, 'clockwork-charge');
  assert.equal(approved.default, DEFAULT_COMBAT_MUSIC);
  for (const [id, , file] of selections) {
    const choice = COMBAT_MUSIC.find((track) => track.id === id);
    const recording = approved.tracks.find((track) => track.id === id);
    assert.ok(recording, id);
    assert.equal(choice.piece, 'combat-' + id);
    assert.equal(choice.file, file);
    assert.equal(choice.seconds, 900);
    assert.equal(recording.piece, choice.piece);
    assert.equal('combat/' + recording.file, file);
    assert.equal(recording.title, choice.name);
    assert.equal(choice.genre, recording.genre);
    assert.ok(choice.genre.length > 0);
    assert.deepEqual(playback[choice.piece], { file, gapless: true, gain: recording.playback_gain });
    assert.ok(recording.playback_gain > 0 && recording.playback_gain <= 1);
  }
});

test('shipped MP3 bytes and metadata match the exact approved listening versions', async () => {
  const credits = readFileSync(join(music, 'CREDITS.md'), 'utf8');
  for (const [id, kind, file] of selections) {
    const recording = approved.tracks.find((track) => track.id === id);
    const original = suites.tracks.find((track) => track.kind === kind) || grooves.tracks.find((track) => track.slug === kind);
    assert.ok(original, kind);
    assert.equal(recording.approved_version, original.listening_file);
    assert.equal(recording.sha256, original.mp3_sha256 || original.sha256);
    assert.equal(recording.seconds, 900);
    assert.equal(recording.samples, 39690000);
    assert.equal(recording.sample_rate, 44100);
    assert.equal(recording.samples, recording.seconds * recording.sample_rate);
    assert.equal(recording.seconds, original.seconds);
    assert.equal(recording.samples, original.samples);
    assert.equal(recording.bpm, original.bpm);
    assert.equal(recording.encoded_lufs, original.encoded.lufs);
    assert.equal(recording.encoded_true_peak_db, original.encoded.true_peak_db);
    assert.ok(Number.isFinite(recording.encoded_lufs));
    assert.ok(recording.encoded_true_peak_db < -0.5);
    assert.equal(statSync(join(music, file)).size, recording.bytes, id);
    assert.equal(await sha256(join(music, file)), recording.sha256, id);
    assert.equal(recording.composition_source, original.source);
    assert.equal(recording.score_source, original.midi);
    assert.ok(existsSync(sourcePath(recording.composition_source)), id + ' composition');
    assert.equal(readFileSync(sourcePath(recording.score_source)).subarray(0, 4).toString(), 'MThd', id + ' MIDI');
    assert.ok(credits.includes(file), id + ' credits');
  }
});

test('every music choice has a verified ten-second excerpt centred on its full recording', async () => {
  assert.deepEqual(previews.tracks.map((track) => track.id), COMBAT_MUSIC.map((track) => track.id));
  assert.equal(new Set(previews.tracks.map((track) => track.file)).size, selections.length);
  for (const choice of COMBAT_MUSIC) {
    const full = approved.tracks.find((track) => track.id === choice.id);
    const preview = previews.tracks.find((track) => track.id === choice.id);
    assert.equal(choice.preview, 'combat/previews/' + preview.file);
    assert.equal(choice.preview, 'combat/' + full.preview_file);
    assert.equal(choice.previewStart, 445);
    assert.equal(choice.previewStart, full.preview_start);
    assert.equal(choice.previewStart, preview.start_seconds);
    assert.equal(choice.previewSeconds, 10);
    assert.equal(choice.previewSeconds, full.preview_seconds);
    assert.equal(choice.previewSeconds, preview.seconds);
    assert.equal(preview.start_seconds, (full.seconds - preview.seconds) / 2);
    assert.equal(preview.source_file, choice.file);
    assert.equal(preview.source_sha256, full.sha256);
    assert.equal(preview.sample_rate, 44100);
    assert.equal(preview.samples, 441000);
    assert.equal(preview.samples, preview.seconds * preview.sample_rate);
    assert.equal(preview.channels, 2);
    assert.equal(preview.bit_rate, 256000);
    assert.ok(Number.isFinite(preview.encoded_lufs));
    assert.ok(preview.encoded_true_peak_db < -0.5);
    assert.match(preview.file, /^[a-z0-9-]+-10s\.mp3$/);
    assert.equal(statSync(join(music, choice.preview)).size, preview.bytes);
    assert.ok(preview.bytes < full.bytes / 50, 'browsing uses a small clip, not the full recording');
    assert.equal(await sha256(join(music, choice.preview)), preview.sha256);
  }
});

test('legacy combat cues use Clockwork while menu and ending cues keep their own music', () => {
  const defaultTrack = COMBAT_MUSIC.find((track) => track.id === DEFAULT_COMBAT_MUSIC);
  const combatCues = Object.keys(playback).filter((name) => ['forest', 'crypt', 'boss'].includes(name) || name.startsWith('dungeon-'));
  assert.ok(combatCues.length >= 6);
  for (const cue of combatCues) {
    assert.equal(playback[cue].file, defaultTrack.file, cue);
    assert.equal(playback[cue].gapless, true, cue);
    assert.equal(playback[cue].gain, playback[defaultTrack.piece].gain, cue);
  }
  assert.deepEqual(playback.title, { file: 'oath-at-the-gate.ogg', gapless: true });
  for (const cue of ['results', 'victory', 'gameover']) {
    assert.deepEqual(playback[cue], { file: 'embers-and-iron.ogg', gapless: true }, cue);
  }
});
