// The menu-music tools (tools/music/): the song format and validate(), the MIDI writer (midi.mjs) and
// reader (render/smf.mjs), the shared DSP (render/dsp.mjs) and the manifest writer. MIDI and synth-side
// code only: nothing here needs FluidSynth or ffmpeg.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { kit, finish, validate, durationSeconds, unitSeconds, start, fretsOf, topNote } from '../tools/music/song.mjs';
import { buildMidi, writeMidi, encodeMidi, PPQ } from '../tools/music/midi.mjs';
import { parseMidi, readNotes, tempoMap, isNoteOn } from '../tools/music/render/smf.mjs';
import { fft, biquad, highpass4, lowShelf, mulberry32, hashString } from '../tools/music/render/dsp.mjs';
import { updateJson, readJson } from '../tools/music/render/manifest.mjs';
import { NYLON, STEEL } from '../tools/music/render/pluck.mjs';
import { song as testTune } from '../tools/music/render/test-song.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const songsDir = path.join(root, 'tools/music/songs');
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'music-tools-'));

// A small two-guitar song in 4/4, written the way the real ones are.
function smallSong(over = {}) {
  const K = kit({ bpm: 90, timeSig: [4, 4] });
  const lead = K.melody(0, 0, [['E5', 2], ['D5', 1], ['C5', 1], ['B4', 2], ['A4', 2], ['G4', 3], ['B4', 1]]);
  const rhythm = [...K.chord(0, 0, ['A2', 'E3', 'A3', 'C4'], 4, 70), ...K.chord(1, 0, ['C3', 'G3', 'C4', 'E4'], 2, 68), ...K.chord(1, 2, ['G2', 'D3', 'G3', 'B3'], 2, 66, { strum: 'up' }), ...K.note(2, 0, 'A2', 4, 70)];
  return finish({
    id: 'tiny', title: 'Tiny', bpm: 90, timeSig: [4, 4], bars: 3, key: 'A minor', description: 'a test',
    sections: [{ bar: 0, name: 'A' }, { bar: 2, name: 'B' }],
    tracks: [
      { name: 'Lead (steel)', role: 'lead', program: 25, channel: 0, pan: 86, volume: 100, reverb: 40, notes: lead },
      { name: 'Rhythm (nylon)', role: 'rhythm', program: 24, channel: 1, pan: 42, volume: 88, notes: rhythm },
    ],
    ...over,
  });
}
const clone = (s) => structuredClone(s);

// ── MIDI ───────────────────────────────────────────────────────────────────────────────────────

test('a song round-trips through writeMidi and the reader: tracks, events, ticks, tempo, notes', () => {
  const dir = tmpDir();
  try {
    for (const song of [smallSong(), testTune]) {
      const [num, den] = song.timeSig;
      const file = path.join(dir, `${song.id}.mid`);
      const info = writeMidi(song, file);
      const m = parseMidi(fs.readFileSync(file));
      assert.equal(m.format, 1);
      assert.equal(m.division, PPQ);
      assert.equal(m.tracks.length, song.tracks.length + 1, 'a conductor track and one per song track');
      // every track ends (End of Track) at the loop point: bars × beats a bar × ticks a beat
      const ticks = song.bars * num * ((PPQ * 4) / den);
      for (const evs of m.tracks) assert.deepEqual([evs.at(-1).kind, evs.at(-1).type, evs.at(-1).tick], ['meta', 0x2f, ticks]);
      assert.equal(info.endTick, ticks);
      // conductor: title, time signature, tempo, the sections, End of Track
      assert.equal(m.tracks[0].length, 3 + song.sections.length + 1);
      const tempo = m.tracks[0].find((e) => e.type === 0x51).data;
      assert.equal((tempo[0] << 16) | (tempo[1] << 8) | tempo[2], Math.round(unitSeconds(song) * (den / 4) * 1e6));
      assert.ok(Math.abs(tempoMap(m).toSec(ticks) - durationSeconds(song)) < 1e-3, 'the MIDI lasts as long as the song says');
      // each track: name, program, volume, pan, reverb (if given), a note-on and note-off per note, End of Track
      song.tracks.forEach((tr, i) => {
        const evs = m.tracks[i + 1];
        assert.equal(evs.length, 4 + (tr.reverb != null ? 1 : 0) + 2 * tr.notes.length + 1, tr.name);
        assert.equal(evs.filter(isNoteOn).length, tr.notes.length);
        assert.equal(info.tracks[i + 1].events, evs.length);
      });
      // the notes come back with their pitches, velocities and times
      const { notes, programs } = readNotes(m);
      assert.deepEqual([...programs], song.tracks.map((t) => [t.channel, t.program]));
      const tpu = (PPQ * 4) / den;
      const want = song.tracks.flatMap((t) => t.notes.map((n) => [t.channel, n.pitch, n.vel, Math.min(Math.round(start(n, num) * tpu), ticks - 1)]));
      const got = notes.map((n) => [n.ch, n.pitch, n.vel, n.startTick]);
      const key = (a) => a.join(',');
      assert.deepEqual(got.map(key).sort(), want.map(key).sort());
      // what the reader read, the encoder writes back byte for byte
      assert.deepEqual(encodeMidi(m), fs.readFileSync(file));
      // a file cut short is refused, not half read
      assert.throws(() => parseMidi(fs.readFileSync(file).subarray(0, -5)));
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a section past the loop end is refused with its own message, not a VLQ error', () => {
  const s = smallSong();
  s.sections.push({ bar: s.bars, name: 'Coda' });
  assert.throws(() => buildMidi(s), /section "Coda": bar 3 is not a whole bar in 0\.\.2/);
});

// ── validate() ─────────────────────────────────────────────────────────────────────────────────

test('validate() flags sections outside the loop, fractional sections and notes out of range', () => {
  const ok = validate(smallSong());
  assert.ok(ok.ok, ok.errors.join('; '));
  assert.deepEqual(ok.warnings, []);

  const errs = (mutate) => { const s = clone(smallSong()); mutate(s); return validate(s).errors.join('\n'); };
  assert.match(errs((s) => s.sections.push({ bar: 3, name: 'Coda' })), /section "Coda": bar 3 must be a whole number in 0\.\.2/);
  assert.match(errs((s) => s.sections.push({ bar: 1.5, name: 'Half' })), /section "Half": bar 1\.5/);
  assert.match(errs((s) => s.sections.push({ bar: -1, name: 'Before' })), /section "Before"/);
  assert.match(errs((s) => (s.tracks[0].notes[0].pitch = 90)), /above C6 \(84\) for a lead track \(20 frets\)/);
  assert.match(errs((s) => (s.tracks[1].notes[0].pitch = 39)), /below the guitar's low E \(40\)/);
  assert.match(errs((s) => (s.tracks[1].notes.at(-1).pitch = 80)), /above E5 \(76\) for a rhythm track/);
  // the neck: C6 is on a steel-string's 20th fret, past a classical guitar's 19
  assert.deepEqual([topNote(24), topNote(25), fretsOf(24), fretsOf(25)], [83, 84, 19, 20]);
  assert.equal(errs((s) => (s.tracks[0].notes[0].pitch = 84)), '');
  assert.match(errs((s) => { s.tracks[0].program = 24; s.tracks[0].notes[0].pitch = 84; }), /above B5 \(83\) for a lead track \(19 frets\)/);
  // ...and the plucked synth's strings agree
  assert.deepEqual([NYLON.maxFret, STEEL.maxFret], [fretsOf(24), fretsOf(25)]);
});

test('the brief is the song\'s own: no ranges, no warnings; outside its ranges, a warning', () => {
  const slow = smallSong({ bpm: 60 });
  assert.deepEqual(validate(slow).warnings, []);
  const briefed = smallSong({ bpm: 60, brief: { bpm: [88, 136], bars: [32, 48], seconds: [50, 110] } });
  const w = validate(briefed).warnings.join('\n');
  assert.match(w, /bpm 60 is outside the brief's 88\.\.136/);
  assert.match(w, /3 bars \(brief: 32\.\.48\)/);
  assert.match(w, /loop lasts 12\.0 s \(brief: 50\.\.110\)/);
  assert.match(validate(smallSong({ brief: { bpm: 100 } })).errors.join(), /brief\.bpm must be \[lo, hi\]/);
});

test('every song validates, named by its file, without the old brief\'s noise', async () => {
  const files = fs.readdirSync(songsDir).filter((f) => f.endsWith('.mjs'));
  assert.ok(files.length >= 15);
  for (const f of files) {
    const song = (await import(pathToFileURL(path.join(songsDir, f)).href)).default;
    assert.equal(song.id, path.basename(f, '.mjs'), `${f}: render.mjs loads a song by its id`);
    const rep = validate(song);
    assert.ok(rep.ok, `${song.id}: ${rep.errors.join('; ')}`);
    if (!song.brief) for (const w of rep.warnings) assert.doesNotMatch(w, /brief/, `${song.id}: ${w}`);
    if (song.tracks.length === 1) for (const w of rep.warnings) assert.doesNotMatch(w, /comfortable/, `${song.id} (one guitar): ${w}`);
    // the velocities finish() was told to keep to are not warned about
    for (const w of rep.warnings) assert.doesNotMatch(w, /velocities outside/, `${song.id}: ${w}`);
  }
});

test('the --test tune is a real song: it validates and builds', () => {
  const rep = validate(testTune);
  assert.ok(rep.ok, rep.errors.join('; '));
  assert.deepEqual(rep.warnings, []);
  assert.equal(durationSeconds(testTune), 12.8);
  assert.deepEqual(buildMidi(testTune).info.tracks.map((t) => t.name), ['conductor', 'Arpeggio (nylon)', 'Melody (steel)']);
});

test('durationSeconds counts the felt beat: a dotted quarter in 6/8, the denominator otherwise', () => {
  const at = (bpm, timeSig, bars) => durationSeconds({ bpm, timeSig, bars });
  assert.equal(at(60, [6, 8], 4), 8); // two dotted quarters a bar, one a second
  assert.equal(at(60, [4, 4], 4), 16);
  assert.equal(at(120, [3, 4], 8), 12);
  assert.equal(at(60, [2, 2], 2), 4);
  assert.equal(at(75, [6, 8], 8), 12.8);
  // the same tempo read in quarters would make a 6/8 bar last 3 s, not 2
  assert.notEqual(at(60, [6, 8], 1), (6 * (60 / 60) * 4) / 8);
});

// ── the shared DSP, against the copies it replaced ─────────────────────────────────────────────

const TAU = 2 * Math.PI;
// render/master.mjs and render/timbre.mjs each had this FFT
function oldFft(re, im) {
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
// render/pluck.mjs and render/timbre.mjs: one biquad
function oldBiquad(x, [b0, b1, b2, a0, a1, a2]) {
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y;
    x[i] = y;
  }
}
// render/mix.mjs: its own biquad, coefficients already normalised
function oldMixBiquad(x, b0, b1, b2, a1, a2) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y;
    x[i] = y;
  }
}
// render/timbre.mjs's high-pass
function oldHighpass(x, f, sr) {
  const out = Float64Array.from(x);
  for (const Q of [0.5412, 1.3066]) {
    const w = (TAU * f) / sr, al = Math.sin(w) / (2 * Q), cw = Math.cos(w);
    oldBiquad(out, [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al]);
  }
  return out;
}
// render/pluck.mjs's body tone: that high-pass, an RBJ low shelf, a one-pole low-pass
function oldTone(x, hpHz, [shelfHz, shelfDb], lpHz, sr) {
  for (const Q of [0.5412, 1.3066]) {
    const w = (TAU * hpHz) / sr, al = Math.sin(w) / (2 * Q), cw = Math.cos(w);
    oldBiquad(x, [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al]);
  }
  {
    const A = Math.pow(10, shelfDb / 40), w = (TAU * shelfHz) / sr, cw = Math.cos(w), al = Math.sin(w) / Math.SQRT2, sa = 2 * Math.sqrt(A) * al;
    oldBiquad(x, [A * (A + 1 - (A - 1) * cw + sa), 2 * A * (A - 1 - (A + 1) * cw), A * (A + 1 - (A - 1) * cw - sa),
      A + 1 + (A - 1) * cw + sa, -2 * (A - 1 + (A + 1) * cw), A + 1 + (A - 1) * cw - sa]);
  }
  const lpA = 1 - Math.exp((-TAU * lpHz) / sr);
  let z = 0;
  for (let i = 0; i < x.length; i++) { z += lpA * (x[i] - z); x[i] = z; }
}
// render/pluck.mjs's random numbers (signed state) and song.mjs's (unsigned), both mulberry32
function oldPluckRng(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function oldSongRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const oldHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

function noise(n, seed = 7) {
  const r = oldSongRng(seed), x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = r() * 2 - 1 + (i % 97 === 0 ? 0.8 : 0); // with a few clicks
  return x;
}
function assertSame(a, b, what) {
  assert.equal(a.length, b.length, what);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) assert.fail(`${what}: sample ${i} is ${b[i]}, was ${a[i]}`);
}

test('the shared FFT gives what the two removed copies gave, bit for bit', () => {
  for (const n of [2, 8, 1024, 4096]) {
    const re0 = noise(n, n), im0 = noise(n, n + 1);
    const re1 = Float64Array.from(re0), im1 = Float64Array.from(im0);
    oldFft(re0, im0);
    fft(re1, im1);
    assertSame(re0, re1, `re, n = ${n}`);
    assertSame(im0, im1, `im, n = ${n}`);
  }
});

test('the shared filters give what the removed copies gave, bit for bit', () => {
  const sr = 44100, x = noise(20000);
  // timbre's high-pass (on a copy) and pluck's body tone (in place)
  assertSame(oldHighpass(x, 3000, sr), highpass4(Float64Array.from(x), 3000, sr), 'high-pass 3 kHz');
  for (const [hp, shelf, lp] of [[85, [150, -6], 3500], [80, [150, -4], 9000], [80, [150, -3.5], 9000]]) {
    const a = Float64Array.from(x), b = Float64Array.from(x);
    oldTone(a, hp, shelf, lp, sr);
    highpass4(b, hp, sr);
    lowShelf(b, shelf[0], shelf[1], sr);
    const lpA = 1 - Math.exp((-TAU * lp) / sr);
    let z = 0;
    for (let i = 0; i < b.length; i++) { z += lpA * (b[i] - z); b[i] = z; }
    assertSame(a, b, `body tone ${hp} Hz / ${shelf} / ${lp} Hz`);
  }
  // mix's K-weighting sections: normalised coefficients, a0 = 1
  const c = [0.98, -1.93, 0.95, -1.9, 0.91];
  const a = Float64Array.from(x), b = Float64Array.from(x);
  oldMixBiquad(a, ...c);
  biquad(b, [c[0], c[1], c[2], 1, c[3], c[4]]);
  assertSame(a, b, 'K-weighting biquad');
});

test('the game\'s mulberry32 is the random sequence both music copies drew', () => {
  for (const seed of [1, 1000, 1017, 0xdeadbeef, hashString('relax-s2:0:12'), hashString('zz-test:1:3') ^ 0x5bd1e995]) {
    const u = mulberry32(seed), p = oldPluckRng(seed), s = oldSongRng(seed);
    for (let i = 0; i < 200; i++) { const v = u(); assert.equal(v, p(), `pluck, seed ${seed}`); assert.equal(v, s(), `song, seed ${seed}`); }
  }
  for (const s of ['', 'song:0:0', 'menu-v1:1:244']) assert.equal(hashString(s), oldHash(s));
});

// ── manifests ──────────────────────────────────────────────────────────────────────────────────

test('the manifest writer keeps both renders\' entries when two runs interleave', () => {
  const dir = tmpDir();
  try {
    const file = path.join(dir, 'candidates.json');
    const add = (entry) => (cur) => ({ candidates: [...(cur?.candidates || []).filter((c) => c.id !== entry.id), entry] });
    // run B read the list before run A wrote it
    const staleB = readJson(file);
    assert.equal(staleB, null);
    updateJson(file, add({ id: 'a' })); // run A finishes
    // writing B's stale copy over it would lose A
    const clobbered = add({ id: 'b' })(staleB);
    assert.deepEqual(clobbered.candidates.map((c) => c.id), ['b']);
    // the writer merges with the file as it is now
    updateJson(file, add({ id: 'b' }));
    assert.deepEqual(readJson(file).candidates.map((c) => c.id), ['a', 'b']);
    // another run writes while this one is merging: merged again, nobody lost
    let first = true;
    updateJson(file, (cur) => {
      if (first) { first = false; fs.writeFileSync(file, JSON.stringify(add({ id: 'c' })(readJson(file)))); }
      return add({ id: 'd' })(cur);
    });
    assert.deepEqual(readJson(file).candidates.map((c) => c.id), ['a', 'b', 'c', 'd']);
    assert.deepEqual(fs.readdirSync(dir), ['candidates.json'], 'no temporary files left');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
