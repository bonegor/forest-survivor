#!/usr/bin/env node
// Menu-music renderer: turns the composer's MIDI (tools/music/out/<id>.mid, written by
// build-midi.mjs from tools/music/songs/<id>.mjs) into seamless guitar loops for the audition
// page (public/debug/music/), as public/audio/music/menu/<id>-<renderer>.ogg plus candidates.json.
//
//   node tools/music/render.mjs [id...] [--only=sf,sf-steel,ks] [--keep-wav] [--q=5] [--test]
//
// Renderers: "sf" FluidSynth with the MuseScore General SoundFont, the song's own guitars;
// "sf-steel" the same with every guitar on Steel (GM 25); "ks" the plucked-string synth of
// render/pluck.mjs. Both give one dry stem per guitar, exactly one loop long with its own ring-out
// wrapped onto its start; render/mix.mjs balances them (the song's render.leadOverRhythmDb) and
// adds a hall (its render.reverb, e.g. "small hall, ~20% wet, 1.6 s"). The loop is then brought to
// -16 LUFS (static gain and a loop-aware limiter, true peak under -1.5 dBTP) and encoded as Ogg
// Vorbis. --test renders a built-in test tune to tools/music/out/test/.
// Toolchain paths: env FLUIDSYNTH, SOUNDFONT, FFMPEG (see tools/music/README.md).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseMidi, writeMidi, tempoMap, readNotes } from './render/smf.mjs';
import { readWav, wavF32 } from './render/wav.mjs';
import { renderPluck } from './render/pluck.mjs';
import { mixStems } from './render/mix.mjs';
import { limitLoop, peakDb, seamCheck, levelCheck, onsets, octaveBands } from './render/master.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'out');
const WINGET_FFMPEG = 'C:\\Users\\I\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const FFMPEG = process.env.FFMPEG || (fs.existsSync(WINGET_FFMPEG) ? WINGET_FFMPEG : 'ffmpeg');
const FLUIDSYNTH = process.env.FLUIDSYNTH || path.join(HERE, 'bin', 'fluidsynth', 'fluidsynth.exe');
const SOUNDFONT = process.env.SOUNDFONT || path.join(HERE, 'bin', 'MuseScore_General.sf3');

const SR = 44100;
const TAIL = 4; // seconds rendered past the loop end and wrapped onto its start
const TARGET_I = -16, TARGET_TP = -1.5; // LUFS, dBTP
const MAX_KB = 2560;
// The most the limiter may take off a peak (dB). A sparse, peaky piece that would need more to
// reach TARGET_I stays quieter instead, and its candidate's gain makes up the difference in game.
const MAX_LIMIT_DB = 3;
const SF_GAIN = 0.6;
// FluidSynth renders dry: the hall comes from the mixer, the same for every renderer.
const SF_OPTS = ['synth.chorus.active=0', 'synth.reverb.active=0', 'synth.dynamic-sample-loading=1'];
// Without a hint in the song: a small hall.
const DEFAULT_REVERB = { pct: 18, t60: 1.4 };
const RENDERERS = ['sf', 'sf-steel', 'ks'];
const GM = { 24: 'nylon', 25: 'steel', 26: 'jazz', 27: 'clean', 28: 'muted', 29: 'overdrive', 30: 'distortion', 31: 'harmonics' };

// ------------------------------------------------------------------ arguments --

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const flagVal = (name, d) => { const f = flag(name); return f && f.includes('=') ? f.slice(f.indexOf('=') + 1) : d; };
const TEST = !!flag('test'), KEEP = !!flag('keep-wav');
const ONLY = flag('only') ? flagVal('only').split(',').map((s) => s.trim()) : RENDERERS;
const Q0 = Number(flagVal('q', 5));
const IDS = args.filter((a) => !a.startsWith('--'));
for (const r of ONLY) if (!RENDERERS.includes(r)) die(`unknown renderer ${r} (sf, sf-steel, ks)`);

const PUBLISH = TEST ? path.join(OUT, 'test', 'menu') : path.join(ROOT, 'public', 'audio', 'music', 'menu');
const WORK = TEST ? path.join(OUT, 'test', 'work') : path.join(OUT, 'render');
fs.mkdirSync(PUBLISH, { recursive: true });
fs.mkdirSync(WORK, { recursive: true });

function die(msg) { console.error('render: ' + msg); process.exit(1); }
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

// -------------------------------------------------------------------- tools --

function run(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { maxBuffer: 1 << 30, ...opts });
  if (r.error) die(`${path.basename(cmd)} failed to start: ${r.error.message}`);
  if (r.status !== 0) die(`${path.basename(cmd)} exited ${r.status}: ${String(r.stderr).slice(-800)}`);
  return r;
}

// Integrated loudness, loudness range and true peak, by ffmpeg's EBU R128 meter.
function ebur(file) {
  const r = run(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const s = String(r.stderr), sum = s.slice(s.lastIndexOf('Summary:'));
  const num = (re) => { const m = sum.match(re); return m ? Number(m[1]) : NaN; };
  return { I: num(/I:\s+(-?[\d.]+|-inf) LUFS/), LRA: num(/LRA:\s+([\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

function encodeOgg(wav, ogg, q, meta) {
  run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', String(q), '-ar', String(SR), '-ac', '2',
    '-metadata', `title=${meta.title}`, '-metadata', 'album=Forest Survivor menu-music candidates', '-metadata', `comment=${meta.comment}`, ogg]);
}

function decode(file) {
  const r = run(FFMPEG, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(SR), 'pipe:1']);
  const b = r.stdout, f = new Float32Array(b.length / 4);
  for (let i = 0; i < f.length; i++) f[i] = b.readFloatLE(i * 4);
  const n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return [L, R];
}

// ------------------------------------------------------------------- songs --

async function loadSongs() {
  if (TEST) {
    const { song, songToMidi } = await import('./render/test-song.mjs');
    const mid = path.join(OUT, 'test', `${song.id}.mid`);
    fs.writeFileSync(mid, songToMidi(song));
    return [{ meta: song, mid }];
  }
  let list = [];
  const listPath = path.join(OUT, 'songs.json');
  if (fs.existsSync(listPath)) {
    const j = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    list = Array.isArray(j) ? j : Array.isArray(j.songs) ? j.songs : Object.values(j);
  } else if (fs.existsSync(path.join(HERE, 'songs'))) {
    list = fs.readdirSync(path.join(HERE, 'songs')).filter((f) => f.endsWith('.mjs')).map((f) => ({ id: f.slice(0, -4) }));
  }
  if (IDS.length) list = IDS.map((id) => list.find((s) => s.id === id) || { id });
  const songs = [];
  for (const entry of list) {
    const meta = { ...entry };
    const modPath = path.join(HERE, 'songs', `${entry.id}.mjs`);
    if (fs.existsSync(modPath)) {
      const mod = await import(pathToFileURL(modPath).href);
      const s = mod.default || mod.song || mod;
      for (const k of ['id', 'title', 'bpm', 'timeSig', 'bars', 'key', 'description', 'render']) if (s[k] !== undefined) meta[k] = s[k];
      if (Array.isArray(s.tracks)) meta.tracks = s.tracks.map((t) => ({ name: t.name, role: t.role, channel: t.channel, program: t.program }));
    }
    const mid = path.join(OUT, `${entry.id}.mid`);
    if (!fs.existsSync(mid)) { console.warn(`render: ${rel(mid)} is missing (run node tools/music/build-midi.mjs), ${entry.id} skipped`); continue; }
    songs.push({ meta, mid });
  }
  return songs;
}

// The song's render hints: lead over rhythm in dB, and the hall ("~20% wet, 1.6 s"). "x% wet" is
// read as a mix knob: wet against dry is x : (100 - x) in level.
function hintsOf(meta) {
  const r = meta.render || {}, text = String(r.reverb || '');
  const pct = Number((text.match(/(\d+(?:\.\d+)?)\s*%/) || [])[1] || DEFAULT_REVERB.pct);
  const t60 = Number((text.match(/(\d+(?:\.\d+)?)\s*s\b/) || [])[1] || DEFAULT_REVERB.t60);
  const roles = new Map((meta.tracks || []).filter((t) => Number.isInteger(t.channel)).map((t) => [t.channel, t.role]));
  return { leadOverRhythmDb: Number.isFinite(r.leadOverRhythmDb) ? r.leadOverRhythmDb : null, t60, pct, wetDb: 20 * Math.log10(pct / (100 - pct)), roles };
}

const sigOf = (ts) => (Array.isArray(ts) ? ts : String(ts || '4/4').split('/').map(Number));

// ------------------------------------------------------------ MIDI checks --

// What a guitarist (or the renderer) would trip over. Places are 0-based bar and beat, as in the songs.
function midiChecks(midi, notes, problems, loopSec, programs, sig) {
  const [num, den] = sig, unit = (midi.division * 4) / den, bar = num * unit;
  const at = (tick) => `bar ${Math.floor(tick / bar)} beat ${+((tick % bar) / unit).toFixed(2)}`;
  const out = [], chName = (ch) => `ch${ch + 1} (${GM[programs.get(ch)] || 'program ' + programs.get(ch)})`;
  const chans = [...new Set(notes.map((n) => n.ch))];
  for (const ch of chans) {
    const cn = notes.filter((n) => n.ch === ch), prog = programs.get(ch);
    const top = prog === 24 ? 83 : 86;
    const low = cn.filter((n) => n.pitch < 40), high = cn.filter((n) => n.pitch > top);
    if (low.length) out.push(`${chName(ch)}: ${low.length} note(s) below E2 (40), e.g. pitch ${low[0].pitch} at ${at(low[0].startTick)}`);
    if (high.length) out.push(`${chName(ch)}: ${high.length} note(s) above ${top === 83 ? 'B5 (83, 19th fret)' : 'D6 (86)'}, e.g. pitch ${high[0].pitch} at ${at(high[0].startTick)}`);
    // simultaneous notes, by MIDI on/off
    const ev = cn.flatMap((n) => [[n.startTick, 1], [n.endTick, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let cur = 0, max = 0, maxAt = 0, over = 0;
    for (const [t, d] of ev) { cur += d; if (cur > max) { max = cur; maxAt = t; } if (d > 0 && cur > 6) over++; }
    if (max > 6) out.push(`${chName(ch)}: up to ${max} notes held at once (${over} note-ons over 6), first at ${at(maxAt)}`);
    // the same pitch still held when the loop comes round
    const loopTick = Math.round(tempoMap(midi).toTick(loopSec));
    for (const n of cn) {
      if (n.endTick <= loopTick) continue;
      const clash = cn.find((m) => m.pitch === n.pitch && m.startTick < n.endTick - loopTick);
      if (clash) out.push(`${chName(ch)}: pitch ${n.pitch} from ${at(n.startTick)} is still held when the loop restarts and meets the same pitch at ${at(clash.startTick)}`);
    }
    const late = cn.filter((n) => n.startTick >= loopTick);
    if (late.length) out.push(`${chName(ch)}: ${late.length} note(s) start after the loop end (${at(late[0].startTick)}), they only ring into the start`);
  }
  const overlaps = problems.filter((p) => p.kind === 'overlap');
  if (overlaps.length) out.push(`${overlaps.length} overlapping identical pitch(es) on one channel (MIDI re-strike cuts the first), e.g. ${overlaps.slice(0, 4).map((p) => `ch${p.ch + 1} pitch ${p.pitch} at ${at(p.tick)}`).join('; ')}`);
  const bends = problems.filter((p) => p.kind === 'pitchbend');
  if (bends.length) out.push(`${bends.length} pitch-bend event(s): FluidSynth plays them, the plucked synth ignores them`);
  for (const p of problems.filter((p) => p.kind === 'unterminated')) out.push(`ch${p.ch + 1} pitch ${p.pitch} at ${at(p.tick)} has no note-off`);
  return out;
}

// ------------------------------------------------------------- renderers --

// FluidSynth, dry, one channel at a time: a copy of the MIDI with only that channel's events, its
// guitar forced to steel if asked, and a silent controller TAIL seconds after the loop so the
// ring-out is rendered; then everything past the loop end is wrapped back onto its start.
function renderSF(song, midi, loopSec, tag, steel) {
  const { toTick } = tempoMap(midi);
  const endTick = Math.ceil(toTick(loopSec + TAIL));
  const chans = [...new Set(midi.tracks.flatMap((evs) => evs.filter((e) => e.kind === 'ch').map((e) => e.status & 15)))].sort((x, y) => x - y);
  const N = Math.round(loopSec * SR), stems = [], info = { renderedSec: 0, stemPeakDb: -Infinity, tailLeftDb: -Infinity };
  for (const ch of chans) {
    const m = structuredClone(midi);
    for (const evs of m.tracks) for (let i = evs.length - 1; i >= 0; i--) {
      const e = evs[i];
      if (e.kind !== 'ch') continue;
      if ((e.status & 15) !== ch) evs.splice(i, 1);
      else if (steel && (e.status & 0xf0) === 0xc0 && e.data[0] >= 24 && e.data[0] <= 31) e.data[0] = 25;
    }
    m.tracks[0].push({ tick: endTick, kind: 'ch', status: 0xb0 | ch, data: [3, 0] }); // CC3: undefined, silent
    const base = path.join(WORK, `${song.meta.id}-${tag}-ch${ch + 1}`);
    fs.writeFileSync(base + '.mid', writeMidi(m));
    run(FLUIDSYNTH, ['-ni', '-q', '-F', base + '.wav', '-r', String(SR), '-O', 'float', '-T', 'wav', '-g', String(SF_GAIN),
      ...SF_OPTS.flatMap((o) => ['-o', o]), SOUNDFONT, base + '.mid']);
    const w = readWav(fs.readFileSync(base + '.wav'));
    if (w.sr !== SR) die(`FluidSynth wrote ${w.sr} Hz`);
    if (!KEEP) { fs.rmSync(base + '.wav'); fs.rmSync(base + '.mid'); }
    const s = w.channels, len = s[0].length;
    const out = s.map((c) => {
      const o = new Float32Array(N);
      for (let k = 0; k * N < len; k++) for (let i = 0, j = k * N; i < N && j < len; i++, j++) o[i] += c[j];
      return o;
    });
    // how much was still sounding when FluidSynth stopped (should be far below the peak)
    const tail = peakDb(s.map((c) => c.subarray(Math.max(0, len - Math.round(0.1 * SR))))) - peakDb(s);
    info.renderedSec = Math.max(info.renderedSec, +(len / SR).toFixed(2));
    info.stemPeakDb = Math.max(info.stemPeakDb, +peakDb(s).toFixed(1));
    info.tailLeftDb = Math.max(info.tailLeftDb, Number.isFinite(tail) ? +tail.toFixed(1) : -200);
    const cc91 = midi.tracks.flatMap((evs) => evs).find((e) => e.kind === 'ch' && e.status === (0xb0 | ch) && e.data[0] === 91);
    stems.push({ ch, send: (cc91 ? cc91.data[1] : 40) / 127, channels: out });
  }
  return { stems, info };
}

function renderKS(song, notesInfo, loopSec) {
  const t0 = Date.now();
  const r = renderPluck({ ...notesInfo, loopSec, sr: SR, seed: song.meta.id });
  for (const w of r.warn) console.warn(`render: ${song.meta.id} ks: ${w}`);
  return { stems: r.stems, info: { ...r.stats, ms: Date.now() - t0 } };
}

// Stems -> the song's balance and hall -> one stereo loop.
function mixdown(rendered, hints) {
  for (const s of rendered.stems) s.role = hints.roles.get(s.ch);
  const m = mixStems(rendered.stems, SR, { leadOverRhythmDb: hints.leadOverRhythmDb, t60: hints.t60, wetDb: hints.wetDb });
  return { channels: m.channels, info: { ...rendered.info, mix: m.info, rawPeakDb: +peakDb(m.channels).toFixed(1) } };
}

// ------------------------------------------------------- master and check --

function finish(song, tag, raw, loopSec, onsetsWanted) {
  const id = `${song.meta.id}-${tag}`;
  const rawWav = path.join(WORK, `${id}.raw.wav`), mWav = path.join(WORK, `${id}.wav`), ogg = path.join(PUBLISH, `${id}.ogg`);
  fs.writeFileSync(rawWav, wavF32(raw.channels, SR));
  const before = ebur(rawWav);
  let gain = Math.pow(10, (TARGET_I - before.I) / 20), ceilDb = -2.0, q = Q0, lim, after, kb, capped = false;
  for (let it = 0; it < 10; it++) {
    lim = limitLoop(raw.channels, gain, Math.pow(10, ceilDb / 20), SR);
    if (lim.maxReductionDb > MAX_LIMIT_DB + 0.05) { gain *= Math.pow(10, (MAX_LIMIT_DB - lim.maxReductionDb) / 20); capped = true; continue; }
    fs.writeFileSync(mWav, wavF32(lim.channels, SR));
    encodeOgg(mWav, ogg, q, { title: `${song.meta.title} (${tag})`, comment: 'tools/music/render.mjs' });
    kb = Math.round(fs.statSync(ogg).size / 1024);
    after = ebur(ogg);
    if (kb > MAX_KB && q > 1) { q--; continue; }
    if (after.TP > TARGET_TP) { ceilDb -= after.TP - TARGET_TP + 0.1; continue; }
    if (!capped && Math.abs(after.I - TARGET_I) > 0.3) { gain *= Math.pow(10, (TARGET_I - after.I) / 20); continue; }
    break;
  }
  if (!after) die(`${id}: the mastering did not settle`);
  const dec = decode(ogg), N = raw.channels[0].length;
  const seam = seamCheck(dec), seamPre = seamCheck(lim.channels), lv = levelCheck(dec, SR);
  // what the codec changed, at the two ends against the whole loop
  const err = (a, b) => { let e = 0, n = 0; for (let c = 0; c < 2; c++) for (let i = a; i < b; i++) { const d = dec[c][i] - lim.channels[c][i]; e += d * d; n++; } return 10 * Math.log10(e / n + 1e-30); };
  const codec = dec[0].length === N ? { startDb: +err(0, 2048).toFixed(1), endDb: +err(N - 2048, N).toFixed(1), wholeDb: +err(0, N).toFixed(1) } : null;
  if (KEEP) fs.writeFileSync(path.join(WORK, `${id}-x3.wav`), wavF32(dec.map((c) => { const o = new Float32Array(c.length * 3); o.set(c); o.set(c, c.length); o.set(c, 2 * c.length); return o; }), SR));
  else { fs.rmSync(rawWav); fs.rmSync(mWav); }
  return {
    id, file: `${id}.ogg`, kb, q, seconds: +(dec[0].length / SR).toFixed(3), samples: dec[0].length, expectSamples: N,
    before: { I: before.I, TP: before.TP, LRA: before.LRA, peak: +peakDb(raw.channels).toFixed(2) },
    after: { I: after.I, TP: after.TP, LRA: after.LRA, peak: +peakDb(dec).toFixed(2) },
    gameGain: after.I < TARGET_I - 0.5 ? +Math.pow(10, (TARGET_I - after.I) / 20).toFixed(2) : 1,
    limiter: { capped, gainDb: +(20 * Math.log10(gain)).toFixed(2), ceilingDb: +ceilDb.toFixed(2), maxReductionDb: +lim.maxReductionDb.toFixed(2), limitedPct: +lim.limitedPct.toFixed(2) },
    seamPre: { jumpVsP99: +seamPre.jumpVsP99.toFixed(2), curvVsP99: +seamPre.curvVsP99.toFixed(2), ok: seamPre.ok },
    codecErr: codec,
    seam: { jump: +seam.jump.toExponential(2), p50: +seam.p50.toExponential(2), p99: +seam.p99.toExponential(2), p999: +seam.p999.toExponential(2), max: +seam.max.toExponential(2), jumpVsP99: +seam.jumpVsP99.toFixed(2), curvVsP99: +seam.curvVsP99.toFixed(2), ok: seam.ok },
    levels: lv,
    onsets: { left: onsets(dec[0], SR), right: onsets(dec[1], SR), midiAttacks: onsetsWanted },
    bands: octaveBands(dec, SR),
    render: raw.info,
  };
}

// ------------------------------------------------------------------- main --

const songs = await loadSongs();
if (!songs.length) die('no songs to render: compose tools/music/songs/<id>.mjs and run node tools/music/build-midi.mjs first (or try --test)');

const results = [], issues = {};
for (const song of songs) {
  const midi = parseMidi(fs.readFileSync(song.mid));
  const sig = sigOf(song.meta.timeSig);
  const ticksLoop = song.meta.bars * sig[0] * (4 / sig[1]) * midi.division;
  const tm = tempoMap(midi);
  const loopSec = tm.toSec(ticksLoop);
  // songs.json knows the beat unit of its bpm (a dotted quarter in 6/8); without it, quarters
  const metaSec = song.meta.durationSeconds ?? (song.meta.bars * sig[0] * (60 / song.meta.bpm) * 4) / sig[1];
  if (Math.abs(loopSec - metaSec) > 0.002) console.warn(`render: ${song.meta.id}: loop is ${fmt(loopSec, 3)} s in the MIDI but ${fmt(metaSec, 3)} s by bars/bpm; the MIDI wins`);
  const nInfo = readNotes(midi);
  const hints = hintsOf(song.meta);
  issues[song.meta.id] = midiChecks(midi, nInfo.notes, nInfo.problems, loopSec, nInfo.programs, sig);
  // distinct attack times (50 ms apart) a listener could count, for the onset check
  let attacks = 0, lastT = -1;
  for (const n of nInfo.notes) if (n.start < loopSec && n.start - lastT > 0.05) { attacks++; lastT = n.start; }
  const guitarProgs = [...new Set([...nInfo.programs.values()].filter((p) => p >= 24 && p <= 31))];
  const allSteel = guitarProgs.every((p) => p === 25);
  console.log(`\n${song.meta.id}: "${song.meta.title}", ${song.meta.bars} bars of ${sig.join('/')} at ${song.meta.bpm} BPM = ${fmt(loopSec, 3)} s, ${nInfo.notes.length} notes, programs ${[...nInfo.programs].map(([c, p]) => `ch${c + 1}:${p}`).join(' ')}`);
  console.log(`  mix: lead over rhythm ${hints.leadOverRhythmDb ?? 'as written'} dB, hall ${hints.t60} s at ${hints.pct}% wet (${fmt(hints.wetDb)} dB)`);

  for (const tag of RENDERERS) {
    if (!ONLY.includes(tag)) continue;
    if (tag === 'sf-steel' && allSteel) { console.log('  sf-steel skipped: every guitar is already steel'); continue; }
    const t0 = Date.now();
    const raw = mixdown(tag === 'ks' ? renderKS(song, nInfo, loopSec) : renderSF(song, midi, loopSec, tag, tag === 'sf-steel'), hints);
    const r = finish(song, tag, raw, loopSec, attacks);
    r.tune = song.meta.id; r.tag = tag; r.secs = ((Date.now() - t0) / 1000).toFixed(1);
    r.label = tag === 'ks' ? 'Plucked-string synth' : tag === 'sf-steel' ? 'SoundFont all steel' : 'SoundFont ' + (guitarProgs.map((p) => GM[p]).join('+') || 'guitar');
    r.meta = song.meta; r.loopSec = loopSec;
    results.push(r);
    console.log(`  ${r.file.padEnd(28)} ${fmt(r.seconds, 2)} s  ${String(r.kb).padStart(5)} KB (q${r.q})  ` +
      `before ${fmt(r.before.I)} LUFS/${fmt(r.before.TP)} dBTP  after ${fmt(r.after.I)} LUFS/${fmt(r.after.TP)} dBTP  ` +
      `limiter -${fmt(r.limiter.maxReductionDb)} dB on ${fmt(r.limiter.limitedPct, 2)}%${r.limiter.capped ? ` (capped: gain ${r.gameGain})` : ''}  seam ${r.seam.ok ? 'ok' : 'CHECK'} (step ${fmt(r.seam.jumpVsP99, 2)}x p99)  ` +
      `quietest 2 s ${fmt(r.levels.quietest.l)}/${fmt(r.levels.quietest.r)} dBFS  onsets ${r.onsets.left}/${r.onsets.right} of ${attacks}  (${r.secs} s)`);
  }
  for (const i of issues[song.meta.id]) console.log('  MIDI: ' + i);
}

// candidates.json: the ones just made replace their namesakes, the rest stay if their files do.
const manPath = path.join(PUBLISH, 'candidates.json');
let old = [];
try { old = JSON.parse(fs.readFileSync(manPath, 'utf8')).candidates || []; } catch { old = []; }
const made = results.map((r) => ({
  id: r.id, tune: r.tune, title: r.meta.title, renderer: r.label, file: r.file, key: r.meta.key || '',
  timeSig: sigOf(r.meta.timeSig).join('/'), bpm: r.meta.bpm, bars: r.meta.bars, seconds: +r.loopSec.toFixed(1), kb: r.kb, gain: r.gameGain,
  description: r.meta.description || '',
}));
const keep = old.filter((c) => !made.some((m) => m.id === c.id) && fs.existsSync(path.join(PUBLISH, c.file)));
const order = songs.map((s) => s.meta.id);
const all = [...keep, ...made].sort((a, b) => {
  const ta = order.indexOf(a.tune), tb = order.indexOf(b.tune);
  return (ta < 0 ? 1e9 : ta) - (tb < 0 ? 1e9 : tb) || a.tune.localeCompare(b.tune) || RENDERERS.indexOf(a.id.slice(a.tune.length + 1)) - RENDERERS.indexOf(b.id.slice(b.tune.length + 1));
});
fs.writeFileSync(manPath, JSON.stringify({ candidates: all }, null, 2) + '\n');
fs.writeFileSync(path.join(WORK, 'report.json'), JSON.stringify({ results: results.map(({ meta, ...r }) => r), issues }, null, 2));
console.log(`\n${all.length} candidate(s) in ${rel(manPath)}; full numbers in ${rel(path.join(WORK, 'report.json'))}`);
