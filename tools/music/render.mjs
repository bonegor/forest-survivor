// tools/music/render.mjs — the menu-music renderer: turns the composer's MIDI (tools/music/out/<id>.mid,
// written by build-midi.mjs from tools/music/songs/<id>.mjs) into seamless guitar loops for the audition
// page (unlisted), as public/audio/music/menu/<id>-<renderer>.ogg plus candidates.json.
//
//   node tools/music/render.mjs [id...] [--only=sf,sf-steel,ks] [--guitar=<id>,...] [--keep-wav] [--q=5] [--max-kb=2560]
//        [--no-nylon-comp] [--replace] [--test]
//   node tools/music/render.mjs menu-v2 menu-v3 --guitar=listen --excerpt=20
//
// Renderers: "sf" FluidSynth with the MuseScore General SoundFont, the song's own guitars;
// "sf-steel" the same with every guitar on Steel (GM 25); "ks" the plucked-string synth of
// render/pluck.mjs. --guitar=<id> plays the song on a guitar of render/guitars.mjs instead (a
// SoundFont preset or a synth voice for the lead, another for the rest; "listen" is the listening
// set, "all" every one) into <id>-<guitar>.ogg. Every renderer gives one dry stem per guitar,
// exactly one loop long with its own ring-out wrapped onto its start; render/mix.mjs balances them
// (the song's render.leadOverRhythmDb) and adds a hall (its render.reverb, e.g. "small hall, ~20%
// wet, 1.6 s" or { wetPct: 20, t60: 1.6 }). The loop is then brought to -16 LUFS (static gain and a
// loop-aware limiter, true peak under -1.5 dBTP) and encoded as Ogg Vorbis, in the work folder, then
// moved into place. --test renders the test tune of render/test-song.mjs to tools/music/out/test/.
// --excerpt=<s> renders instead the first whole bars nearest <s> seconds of each song, let ring
// and faded, into public/audio/music/menu/guitars/<id>-<guitar>.ogg (q4 unless --q) and lists them
// in guitars.json there, for the audition page's "Guitar sounds" (default guitars: listen).
// Brightness and attack numbers (render/timbre.mjs) go to the report and to guitars.json.
// MuseScore General's nylon (bank 0, program 24) gets quieter up the neck at equal velocity (about
// -4 dB from B3, -8 dB at D5, -10 dB from E5), so its notes above B3 are played 0.6 velocity a
// semitone harder (up to 127), unless the song says render.nylonComp: false (or --no-nylon-comp);
// a number there is its own velocity per semitone.
// Toolchain paths: env FLUIDSYNTH, SOUNDFONT, FFMPEG (see tools/music/README.md).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encodeMidi, writeMidi } from './midi.mjs';
import { validate, durationSeconds, noteName, GM_GUITARS, OPEN_STRINGS, isGuitar, topNote } from './song.mjs';
import { parseMidi, tempoMap, readNotes, setPrograms, cutMidi, mapVelocities } from './render/smf.mjs';
import { readWav, wavF32 } from './render/wav.mjs';
import { renderPluck, KS_PRESETS } from './render/pluck.mjs';
import { mixStems } from './render/mix.mjs';
import { limitLoop, peakDb, seamCheck, levelCheck, onsets, octaveBands } from './render/master.mjs';
import { GUITARS, FONTS, guitarIds, fontsOf } from './render/guitars.mjs';
import { timbre, attackTimes } from './render/timbre.mjs';
import { trimSf2 } from './render/sf2trim.mjs';
import { updateJson } from './render/manifest.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'out');
const WINGET_FFMPEG = 'C:\\Users\\I\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const FFMPEG = process.env.FFMPEG || (fs.existsSync(WINGET_FFMPEG) ? WINGET_FFMPEG : 'ffmpeg');
const FLUIDSYNTH = process.env.FLUIDSYNTH || path.join(HERE, 'bin', 'fluidsynth', 'fluidsynth.exe');

const SR = 44100;
const TAIL = 4; // seconds rendered past the loop end and wrapped onto its start
const TARGET_I = -16, TARGET_TP = -1.5; // LUFS, dBTP
const NYLON_COMP = { above: 59, perSemitone: 0.6 }; // B3; velocity per semitone above it
// The most the limiter may take off a peak (dB). A sparse, peaky piece that would need more to
// reach TARGET_I stays quieter instead, and its candidate's gain makes up the difference in game.
const MAX_LIMIT_DB = 3;
const SF_GAIN = 0.6;
// FluidSynth renders dry: the hall comes from the mixer, the same for every renderer. Bank
// selects are read the GS way (CC0 is the bank), which render/guitars.mjs relies on.
const SF_OPTS = ['synth.chorus.active=0', 'synth.reverb.active=0', 'synth.dynamic-sample-loading=1', 'synth.midi-bank-select=gs'];
// Without a hint in the song: a small hall.
const DEFAULT_REVERB = { pct: 18, t60: 1.4 };
const RENDERERS = ['sf', 'sf-steel', 'ks'];
// An excerpt rings this long after its last bar, the last EX_FADE seconds faded out.
const EX_RING = 3, EX_FADE = 2.5;

// ── arguments ──────────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const flagVal = (name, d) => { const f = flag(name); return f && f.includes('=') ? f.slice(f.indexOf('=') + 1) : d; };
const TEST = !!flag('test'), KEEP = !!flag('keep-wav');
const EXCERPT = flag('excerpt') ? Number(flagVal('excerpt', 20)) : 0;
if (flag('excerpt') && !(EXCERPT > 0)) die('--excerpt wants seconds, e.g. --excerpt=20');
const listOf = (name) => flagVal(name, '').split(',').map((s) => s.trim()).filter(Boolean);
let GUITAR_LIST;
try { GUITAR_LIST = guitarIds(flag('guitar') ? listOf('guitar') : EXCERPT ? ['listen'] : []); } catch (e) { die(e.message); }
const ONLY = flag('only') ? listOf('only') : GUITAR_LIST.length ? [] : RENDERERS;
for (const r of ONLY) if (!RENDERERS.includes(r)) die(`unknown renderer ${r} (sf, sf-steel, ks; other guitars go with --guitar=)`);
const TAGS = [...new Set([...ONLY, ...GUITAR_LIST])];
const Q0 = Number(flagVal('q', EXCERPT ? 4 : 5));
const MAX_KB = Number(flagVal('max-kb', 2560)); // over this the quality steps down
const NO_COMP = !!flag('no-nylon-comp');
const REPLACE = !!flag('replace'); // candidates.json: the songs rendered keep only this run's renderers
const IDS = args.filter((a) => !a.startsWith('--'));

const MENU = TEST ? path.join(OUT, 'test', 'menu') : path.join(ROOT, 'public', 'audio', 'music', 'menu');
const PUBLISH = EXCERPT ? path.join(MENU, 'guitars') : MENU;
const WORK = TEST ? path.join(OUT, 'test', 'work') : path.join(OUT, 'render');
fs.mkdirSync(PUBLISH, { recursive: true });
fs.mkdirSync(WORK, { recursive: true });

function die(msg) { console.error('render: ' + msg); process.exit(1); }
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

// ── tools ──────────────────────────────────────────────────────────────────────────────────────

// What each tool is, for the message when it cannot be found.
const TOOLS = new Map([[FFMPEG, { name: 'ffmpeg', env: 'FFMPEG' }], [FLUIDSYNTH, { name: 'FluidSynth', env: 'FLUIDSYNTH' }]]);

function run(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { maxBuffer: 1 << 30, ...opts });
  if (r.error?.code === 'ENOENT') {
    const t = TOOLS.get(cmd) || { name: path.basename(cmd), env: null };
    die(`${t.name} not found (${cmd}). Install it as tools/music/README.md says ("Toolchain")${t.env ? `, or point ${t.env} at it` : ''}.`);
  }
  if (r.error) die(`${path.basename(cmd)} failed to start: ${r.error.message}`);
  if (r.status !== 0) die(`${path.basename(cmd)} exited ${r.status}: ${String(r.stderr).slice(-800)}`);
  return r;
}

// Integrated loudness, loudness range and true peak, by ffmpeg's EBU R128 meter.
function ebur(file) {
  const r = run(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const s = String(r.stderr), sum = s.slice(s.lastIndexOf('Summary:'));
  // "-inf" (silence) is -Infinity, not NaN; a value missing from the summary is NaN
  const num = (re) => { const m = sum.match(re); return !m ? NaN : m[1] === '-inf' ? -Infinity : Number(m[1]); };
  return { I: num(/I:\s+(-?[\d.]+|-inf) LUFS/), LRA: num(/LRA:\s+([\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

function encodeOgg(wav, ogg, q, meta) {
  run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', String(q), '-ar', String(SR), '-ac', '2',
    '-metadata', `title=${meta.title}`, '-metadata', `album=${meta.album || 'Forest Survivor menu-music candidates'}`, '-metadata', `comment=${meta.comment}`, ogg]);
}

function decode(file) {
  const r = run(FFMPEG, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(SR), 'pipe:1']);
  const b = r.stdout, f = new Float32Array(b.length / 4);
  for (let i = 0; i < f.length; i++) f[i] = b.readFloatLE(i * 4);
  const n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return [L, R];
}

// ── songs ──────────────────────────────────────────────────────────────────────────────────────

let SONG_ORDER = []; // every song id, in songs.json's order: the order of candidates.json

async function loadSongs() {
  if (TEST) { // built and checked like a real song
    const { song } = await import('./render/test-song.mjs');
    const rep = validate(song);
    for (const w of rep.warnings) console.warn(`render: ${song.id}: ${w}`);
    if (!rep.ok) die(`${song.id} (render/test-song.mjs) does not validate:\n  ${rep.errors.join('\n  ')}`);
    const mid = path.join(OUT, 'test', `${song.id}.mid`);
    writeMidi(song, mid);
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
  SONG_ORDER = list.map((s) => s.id);
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

// The song's render hints: lead over rhythm in dB, and the hall, as { wetPct: 20, t60: 1.6 } or as
// text ("small hall, ~20% wet, 1.6 s"). "x% wet" is read as a mix knob: wet against dry is
// x : (100 - x) in level.
function hintsOf(meta) {
  const r = meta.render || {};
  let pct, t60;
  if (r.reverb && typeof r.reverb === 'object') {
    ({ wetPct: pct = DEFAULT_REVERB.pct, t60 = DEFAULT_REVERB.t60 } = r.reverb);
    if (!(pct > 0 && pct < 100 && t60 > 0)) die(`${meta.id}: render.reverb wants { wetPct: 0 < x < 100, t60: seconds > 0 }`);
  } else {
    const text = String(r.reverb || '');
    pct = Number((text.match(/(\d+(?:\.\d+)?)\s*%/) || [])[1] || DEFAULT_REVERB.pct);
    t60 = Number((text.match(/(\d+(?:\.\d+)?)\s*s\b/) || [])[1] || DEFAULT_REVERB.t60);
  }
  const roles = new Map((meta.tracks || []).filter((t) => Number.isInteger(t.channel)).map((t) => [t.channel, t.role]));
  return { leadOverRhythmDb: Number.isFinite(r.leadOverRhythmDb) ? r.leadOverRhythmDb : null, t60, pct, wetDb: 20 * Math.log10(pct / (100 - pct)), roles };
}

const sigOf = (ts) => (Array.isArray(ts) ? ts : String(ts || '4/4').split('/').map(Number));

// ── MIDI checks ────────────────────────────────────────────────────────────────────────────────

// What a guitarist (or the renderer) would trip over. Places are 0-based bar and beat, as in the songs.
function midiChecks(midi, notes, problems, loopSec, programs, sig) {
  const [num, den] = sig, unit = (midi.division * 4) / den, bar = num * unit;
  const at = (tick) => `bar ${Math.floor(tick / bar)} beat ${+((tick % bar) / unit).toFixed(2)}`;
  const out = [], chName = (ch) => `ch${ch + 1} (${GM_GUITARS[programs.get(ch)]?.short || 'program ' + programs.get(ch)})`;
  const chans = [...new Set(notes.map((n) => n.ch))];
  for (const ch of chans) {
    const cn = notes.filter((n) => n.ch === ch), prog = programs.get(ch);
    const bottom = OPEN_STRINGS[0], top = topNote(prog);
    const low = cn.filter((n) => n.pitch < bottom), high = cn.filter((n) => n.pitch > top);
    if (low.length) out.push(`${chName(ch)}: ${low.length} note(s) below ${noteName(bottom)} (${bottom}), e.g. pitch ${low[0].pitch} at ${at(low[0].startTick)}`);
    if (high.length) out.push(`${chName(ch)}: ${high.length} note(s) above ${noteName(top)} (${top}, fret ${top - OPEN_STRINGS[5]}), e.g. pitch ${high[0].pitch} at ${at(high[0].startTick)}`);
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

// ── guitars ────────────────────────────────────────────────────────────────────────────────────

// The file FluidSynth loads for a font of render/guitars.mjs: the font itself, or for one marked
// `trim` a copy with its samples starting at their attack, made once (again if the font is newer).
const fontFiles = new Map();
function fontFile(id) {
  if (fontFiles.has(id)) return fontFiles.get(id);
  const font = FONTS[id];
  if (!font || !fs.existsSync(font.file)) die(`SoundFont ${font ? rel(font.file) : id} is missing (see tools/music/README.md, "Guitars")`);
  let file = font.file;
  if (font.trim) {
    file = path.join(HERE, 'bin', 'sf', 'cache', `${id}-trimmed.sf2`);
    if (!fs.existsSync(file) || fs.statSync(file).mtimeMs < fs.statSync(font.file).mtimeMs) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`; // renamed into place, so a render running alongside never reads half a file
      const moved = trimSf2(font.file, tmp, font.trim);
      fs.renameSync(tmp, file);
      const ms = moved.map((m) => m.ms).sort((a, b) => a - b);
      console.log(`render: ${rel(file)}: ${moved.length} sample start(s) moved to the attack, ${ms[0] ?? 0}-${ms[ms.length - 1] ?? 0} ms`);
    }
  }
  fontFiles.set(id, file);
  return file;
}

// Who plays each channel for a guitar of render/guitars.mjs: its lead part on the "lead" channel,
// its rhythm part on every other guitar channel (GM 24-31); other instruments keep their own
// voice on MuseScore General. The plain synth ("ks") plays every channel, as it always has.
function planFor(tag, midi, nInfo, hints) {
  const g = GUITARS[tag], plan = new Map();
  const allKs = [g.lead, g.rhythm].every((p) => p.engine === 'ks' && !p.preset);
  const chans = [...new Set(midi.tracks.flatMap((evs) => evs.filter((e) => e.kind === 'ch').map((e) => e.status & 15)))].sort((x, y) => x - y);
  for (const ch of chans) {
    const prog = nInfo.programs.get(ch), guitar = isGuitar(prog) && ch !== 9;
    if (allKs) plan.set(ch, g.lead);
    else if (!guitar) plan.set(ch, { engine: 'sf', font: 'musescore' });
    else plan.set(ch, hints.roles.get(ch) === 'lead' ? g.lead : g.rhythm);
  }
  return plan;
}

// FluidSynth, dry, one channel at a time: a copy of the MIDI with only that channel's events, its
// voice set by the plan (a SoundFont, and a bank and program unless it keeps the song's), and a
// silent controller TAIL seconds after the loop so the ring-out is rendered; then everything past
// the loop end is wrapped back onto its start.
function renderSF(song, midi, loopSec, tag, plan) {
  const nc = (song.meta.render || {}).nylonComp;
  const comp = NO_COMP || nc === false ? 0 : Number.isFinite(nc) ? nc : NYLON_COMP.perSemitone; // velocity per semitone
  const { toTick } = tempoMap(midi);
  const endTick = Math.ceil(toTick(loopSec + TAIL));
  const N = Math.round(loopSec * SR), stems = [], info = { renderedSec: 0, stemPeakDb: -Infinity, tailLeftDb: -Infinity };
  for (const [ch, part] of plan) {
    const sfFile = fontFile(part.font);
    const m = structuredClone(midi);
    for (const evs of m.tracks) for (let i = evs.length - 1; i >= 0; i--) {
      const e = evs[i];
      if (e.kind === 'ch' && (e.status & 15) !== ch) evs.splice(i, 1);
    }
    if (Number.isInteger(part.program)) setPrograms(m, new Map([[ch, { bank: part.bank ?? 0, program: part.program }]]));
    // MuseScore's nylon fades up the neck: its higher notes are played harder
    const firstProg = m.tracks.flatMap((evs) => evs).find((e) => e.kind === 'ch' && e.status === (0xc0 | ch));
    const prog = Number.isInteger(part.program) ? part.program : firstProg ? firstProg.data[0] : 0;
    if (comp && part.font === 'musescore' && (part.bank ?? 0) === 0 && prog === 24) {
      const r = mapVelocities(m, ch, (p, v) => (p > NYLON_COMP.above ? v + comp * (p - NYLON_COMP.above) : v));
      (info.nylonComp ||= {})[`ch${ch + 1}`] = r;
    }
    m.tracks[0].push({ tick: endTick, kind: 'ch', status: 0xb0 | ch, data: [3, 0] }); // CC3: undefined, silent
    const base = path.join(WORK, `${song.meta.id}-${tag}-ch${ch + 1}`);
    fs.writeFileSync(base + '.mid', encodeMidi(m));
    run(FLUIDSYNTH, ['-ni', '-q', '-F', base + '.wav', '-r', String(SR), '-O', 'float', '-T', 'wav', '-g', String(SF_GAIN),
      ...SF_OPTS.flatMap((o) => ['-o', o]), sfFile, base + '.mid']);
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

function renderKS(song, notesInfo, loopSec, plan) {
  const t0 = Date.now(), voices = new Map();
  for (const [ch, part] of plan) if (part.preset) voices.set(ch, KS_PRESETS[part.preset] || die(`unknown synth preset ${part.preset}`));
  const notes = notesInfo.notes.filter((n) => plan.has(n.ch));
  const r = renderPluck({ ...notesInfo, notes, loopSec, sr: SR, seed: song.meta.id, voices });
  for (const w of r.warn) console.warn(`render: ${song.meta.id} ks: ${w}`);
  return { stems: r.stems, info: { ...r.stats, ms: Date.now() - t0 } };
}

// Every channel of the plan through its engine; one dry stem each, trimmed by the part's gainDb.
function renderPlan(song, midi, nInfo, loopSec, tag, plan) {
  const sfPlan = new Map([...plan].filter(([, p]) => p.engine === 'sf')), ksPlan = new Map([...plan].filter(([, p]) => p.engine === 'ks'));
  const parts = [];
  if (sfPlan.size) parts.push(renderSF(song, midi, loopSec, tag, sfPlan));
  if (ksPlan.size) parts.push(renderKS(song, nInfo, loopSec, ksPlan));
  const stems = parts.flatMap((p) => p.stems).sort((a, b) => a.ch - b.ch);
  for (const s of stems) {
    const g = plan.get(s.ch)?.gainDb;
    if (g) { const k = Math.pow(10, g / 20); for (const c of s.channels) for (let i = 0; i < c.length; i++) c[i] *= k; }
  }
  for (const [ch, part] of plan) if (part.range) {
    const out = nInfo.notes.filter((n) => n.ch === ch && (n.pitch < part.range[0] || n.pitch > part.range[1]));
    if (out.length) console.warn(`render: ${song.meta.id} ${tag}: ch${ch + 1} has ${out.length} note(s) outside the voice's keys ${part.range.join('-')}, e.g. pitch ${out[0].pitch}`);
  }
  return { stems, info: parts.length === 1 ? parts[0].info : { sf: parts[0].info, ks: parts[1].info } };
}

// The dry stems' brightness and attack, per role ("lead", "rhythm").
function stemTimbre(stems, nInfo, hints, until) {
  const out = {};
  for (const role of ['lead', 'rhythm']) {
    const ss = stems.filter((s) => (hints.roles.get(s.ch) === 'lead' ? 'lead' : 'rhythm') === role);
    if (!ss.length) continue;
    const n = ss[0].channels[0].length, sum = [new Float32Array(n), new Float32Array(n)];
    for (const s of ss) for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) sum[c][i] += s.channels[c][i];
    out[role] = timbre(sum, SR, attackTimes(nInfo.notes, ss.map((s) => s.ch), until));
  }
  return out;
}

const labelOf = (tag, guitarProgs) => (tag === 'sf' ? 'MuseScore ' + (guitarProgs.map((p) => GM_GUITARS[p].short).join('+') || 'guitar') : GUITARS[tag].label);

// Stems -> the song's balance and hall -> one stereo loop.
function mixdown(rendered, hints) {
  for (const s of rendered.stems) s.role = hints.roles.get(s.ch);
  const m = mixStems(rendered.stems, SR, { leadOverRhythmDb: hints.leadOverRhythmDb, t60: hints.t60, wetDb: hints.wetDb });
  return { channels: m.channels, info: { ...rendered.info, mix: m.info, rawPeakDb: +peakDb(m.channels).toFixed(1) } };
}

// ── master and check ───────────────────────────────────────────────────────────────────────────

// Static gain to TARGET_I and the loop-aware limiter under a ceiling, encoded into the work folder
// and measured there by ffmpeg; round again until the true peak and loudness are on target (and the
// file is under maxKb, a quality step lower each time). At most 10 rounds: the last file encoded is
// kept, with a warning if it is off target. The numbers returned are those of that file.
function master(id, raw, { q, maxKb = Infinity, meta }) {
  const rawWav = path.join(WORK, `${id}.raw.wav`), mWav = path.join(WORK, `${id}.wav`), ogg = path.join(WORK, `${id}.ogg`);
  fs.writeFileSync(rawWav, wavF32(raw.channels, SR));
  const before = ebur(rawWav);
  if (!Number.isFinite(before.I)) die(`${id}: ffmpeg measures the mix at ${before.I} LUFS: it is silent (or the meter failed)`);
  let gain = Math.pow(10, (TARGET_I - before.I) / 20), ceilDb = -2.0, capped = false, settled = false, lim, after, kb, shipped;
  for (let it = 0; it < 10 && !settled; it++) {
    lim = limitLoop(raw.channels, gain, Math.pow(10, ceilDb / 20), SR);
    if (lim.maxReductionDb > MAX_LIMIT_DB + 0.05) { gain *= Math.pow(10, (MAX_LIMIT_DB - lim.maxReductionDb) / 20); capped = true; continue; }
    fs.writeFileSync(mWav, wavF32(lim.channels, SR));
    encodeOgg(mWav, ogg, q, meta);
    shipped = { lim, gain, ceilDb, q };
    kb = Math.round(fs.statSync(ogg).size / 1024);
    after = ebur(ogg);
    if (!Number.isFinite(after.I) || !Number.isFinite(after.TP)) die(`${id}: ffmpeg measures the encoded file at ${after.I} LUFS, ${after.TP} dBTP`);
    if (kb > maxKb && q > 1) { q--; continue; }
    if (after.TP > TARGET_TP) { ceilDb -= after.TP - TARGET_TP + 0.1; continue; }
    if (!capped && Math.abs(after.I - TARGET_I) > 0.3) { gain *= Math.pow(10, (TARGET_I - after.I) / 20); continue; }
    settled = true;
  }
  if (!after) die(`${id}: the mastering did not settle (the limiter never came under ${MAX_LIMIT_DB} dB)`);
  if (!settled) {
    const off = [after.TP > TARGET_TP && `true peak ${fmt(after.TP)} dBTP over ${TARGET_TP}`, !capped && Math.abs(after.I - TARGET_I) > 0.3 && `${fmt(after.I)} LUFS, not ${TARGET_I}`,
      kb > maxKb && `${kb} KB over ${maxKb}`].filter(Boolean);
    console.warn(`render: ${id}: the mastering did not settle in 10 rounds; kept the last file (${off.join('; ') || 'off target'})`);
  }
  return { rawWav, mWav, ogg, before, after, kb, capped, settled, ...shipped };
}

// The encoded file from the work folder into its place (public/...): a rename, so the tracked file
// is never half written.
function publish(src, dst) {
  try { fs.renameSync(src, dst); } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    const tmp = `${dst}.${process.pid}.tmp`;
    fs.copyFileSync(src, tmp); fs.renameSync(tmp, dst); fs.rmSync(src);
  }
}

function finish(song, tag, raw, loopSec, onsetsWanted) {
  const id = `${song.meta.id}-${tag}`;
  const { rawWav, mWav, ogg, before, after, kb, capped, settled, lim, gain, ceilDb, q } = master(id, raw, {
    q: Q0, maxKb: MAX_KB, meta: { title: `${song.meta.title} (${tag})`, comment: 'tools/music/render.mjs' },
  });
  const dec = decode(ogg), N = raw.channels[0].length;
  const seam = seamCheck(dec), seamPre = seamCheck(lim.channels), lv = levelCheck(dec, SR);
  // what the codec changed, at the two ends against the whole loop
  const err = (a, b) => { let e = 0, n = 0; for (let c = 0; c < 2; c++) for (let i = a; i < b; i++) { const d = dec[c][i] - lim.channels[c][i]; e += d * d; n++; } return 10 * Math.log10(e / n + 1e-30); };
  const codec = dec[0].length === N ? { startDb: +err(0, 2048).toFixed(1), endDb: +err(N - 2048, N).toFixed(1), wholeDb: +err(0, N).toFixed(1) } : null;
  if (KEEP) fs.writeFileSync(path.join(WORK, `${id}-x3.wav`), wavF32(dec.map((c) => { const o = new Float32Array(c.length * 3); o.set(c); o.set(c, c.length); o.set(c, 2 * c.length); return o; }), SR));
  else { fs.rmSync(rawWav); fs.rmSync(mWav); }
  publish(ogg, path.join(PUBLISH, `${id}.ogg`));
  return {
    id, file: `${id}.ogg`, kb, q, settled, seconds: +(dec[0].length / SR).toFixed(3), samples: dec[0].length, expectSamples: N,
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

// An excerpt: a 5 ms fade-in, the ring-out faded over its last EX_FADE seconds, then the same
// loudness and peak targets as a loop (the limiter treats it as a circle, harmlessly: both ends
// are quiet) and Ogg Vorbis at q (4 unless --q).
function finishExcerpt(song, tag, raw, exSec) {
  const id = `${song.meta.id}-${tag}`, n = raw.channels[0].length;
  const fi = Math.round(0.005 * SR), f0 = n - Math.round(EX_FADE * SR);
  for (const c of raw.channels) {
    for (let i = 0; i < fi; i++) c[i] *= i / fi;
    for (let i = Math.max(0, f0); i < n; i++) c[i] *= 0.5 + 0.5 * Math.cos((Math.PI * (i - f0)) / (n - f0));
  }
  const { rawWav, mWav, ogg, before, after, kb, capped, settled, lim, gain } = master(id, raw, {
    q: Q0, meta: { title: `${song.meta.title}, first ${fmt(exSec, 0)} s (${tag})`, album: 'Forest Survivor menu-music guitar sounds', comment: 'tools/music/render.mjs --excerpt' },
  });
  if (!KEEP) { fs.rmSync(rawWav); fs.rmSync(mWav); }
  publish(ogg, path.join(PUBLISH, `${id}.ogg`));
  return {
    id, file: `${id}.ogg`, kb, q: Q0, settled, seconds: +(n / SR).toFixed(2), excerptSec: +exSec.toFixed(2),
    before: { I: before.I, TP: before.TP }, after: { I: after.I, TP: after.TP, LRA: after.LRA },
    gameGain: after.I < TARGET_I - 0.5 ? +Math.pow(10, (TARGET_I - after.I) / 20).toFixed(2) : 1,
    limiter: { capped, gainDb: +(20 * Math.log10(gain)).toFixed(2), maxReductionDb: +lim.maxReductionDb.toFixed(2) },
    bands: octaveBands(lim.channels, SR),
    render: raw.info,
  };
}

// ── main ───────────────────────────────────────────────────────────────────────────────────────

const songs = await loadSongs();
if (!songs.length) die('no songs to render: compose tools/music/songs/<id>.mjs and run node tools/music/build-midi.mjs first (or try --test)');
for (const tag of TAGS) for (const f of fontsOf(tag)) {
  if (!fs.existsSync(f.file)) die(`${tag}: SoundFont ${rel(f.file)} is missing (see tools/music/README.md, "Guitars")`);
  if (f.auditionOnly && !EXCERPT) die(`${tag}: ${f.name} is for the listening set only (--excerpt), not for full renders`);
}
// the tools, before any rendering: ffmpeg always, FluidSynth when a SoundFont plays
run(FFMPEG, ['-hide_banner', '-version']);
if (TAGS.some((tag) => fontsOf(tag).length)) run(FLUIDSYNTH, ['--version']);

const results = [], issues = {};
for (const song of songs) {
  const full = parseMidi(fs.readFileSync(song.mid));
  const sig = sigOf(song.meta.timeSig);
  const barTicks = sig[0] * (4 / sig[1]) * full.division;
  const ticksLoop = song.meta.bars * barTicks;
  const tm = tempoMap(full);
  const loopSec = tm.toSec(ticksLoop);
  // songs.json has the length; without it, bars and bpm the way song.mjs counts them (a dotted quarter in 6/8)
  const metaSec = song.meta.durationSeconds ?? durationSeconds({ bpm: song.meta.bpm, timeSig: sig, bars: song.meta.bars });
  if (Math.abs(loopSec - metaSec) > 0.002) console.warn(`render: ${song.meta.id}: loop is ${fmt(loopSec, 3)} s in the MIDI but ${fmt(metaSec, 3)} s by bars/bpm; the MIDI wins`);
  // An excerpt plays a cut-down copy of the MIDI and rings EX_RING seconds past its last bar.
  let midi = full, renderSec = loopSec, ex = null;
  if (EXCERPT) {
    const bars = Math.max(1, Math.min(song.meta.bars, Math.round(EXCERPT / tm.toSec(barTicks))));
    ex = { bars, sec: tm.toSec(bars * barTicks) };
    midi = cutMidi(structuredClone(full), bars * barTicks);
    renderSec = ex.sec + EX_RING;
  }
  const nInfo = readNotes(midi);
  const hints = hintsOf(song.meta);
  if (!ex) issues[song.meta.id] = midiChecks(midi, nInfo.notes, nInfo.problems, loopSec, nInfo.programs, sig);
  // distinct attack times (50 ms apart) a listener could count, for the onset check
  let attacks = 0, lastT = -1;
  for (const n of nInfo.notes) if (n.start < loopSec && n.start - lastT > 0.05) { attacks++; lastT = n.start; }
  const guitarProgs = [...new Set([...nInfo.programs.values()].filter(isGuitar))];
  const allSteel = guitarProgs.every((p) => p === 25);
  console.log(`\n${song.meta.id}: "${song.meta.title}", ${song.meta.bars} bars of ${sig.join('/')} at ${song.meta.bpm} BPM = ${fmt(loopSec, 3)} s, ${nInfo.notes.length} notes, programs ${[...nInfo.programs].map(([c, p]) => `ch${c + 1}:${p}`).join(' ')}`);
  if (ex) console.log(`  excerpt: bars 0-${ex.bars - 1} = ${fmt(ex.sec, 2)} s, ringing on ${EX_RING} s`);
  console.log(`  mix: lead over rhythm ${hints.leadOverRhythmDb ?? 'as written'} dB, hall ${hints.t60} s at ${hints.pct}% wet (${fmt(hints.wetDb)} dB)`);

  for (const tag of TAGS) {
    if (tag === 'sf-steel' && allSteel && !ex) { console.log('  sf-steel skipped: every guitar is already steel'); continue; }
    const t0 = Date.now();
    const plan = planFor(tag, midi, nInfo, hints);
    const rendered = renderPlan(song, midi, nInfo, renderSec, tag, plan);
    const until = (ex ? ex.sec : loopSec) - 0.3;
    const tb = stemTimbre(rendered.stems, nInfo, hints, until);
    const raw = mixdown(rendered, hints);
    tb.mix = timbre(raw.channels, SR, attackTimes(nInfo.notes, [...plan.keys()], until));
    const r = ex ? finishExcerpt(song, tag, raw, ex.sec) : finish(song, tag, raw, loopSec, attacks);
    r.tune = song.meta.id; r.tag = tag; r.secs = ((Date.now() - t0) / 1000).toFixed(1);
    r.label = labelOf(tag, guitarProgs);
    r.timbre = tb;
    r.meta = song.meta; r.loopSec = loopSec;
    results.push(r);
    const tl = tb.lead || tb.rhythm, tx = (t) => (t ? `centroid ${String(t.centroidHz).padStart(4)} Hz, >3k ${fmt(t.hfPct)}%, attack >3k ${fmt(t.atkHfPct)}% crest ${fmt(t.atkCrestDb)} dB over body ${fmt(t.atkBodyDb)} dB` : '-');
    if (ex) console.log(`  ${r.file.padEnd(32)} ${fmt(r.seconds, 1)} s ${String(r.kb).padStart(4)} KB  ${fmt(r.after.I)} LUFS/${fmt(r.after.TP)} dBTP  lead: ${tx(tl)}  mix: centroid ${tb.mix.centroidHz} Hz, >3k ${fmt(tb.mix.hfPct)}%  (${r.secs} s)`);
    else console.log(`  ${r.file.padEnd(28)} ${fmt(r.seconds, 2)} s  ${String(r.kb).padStart(5)} KB (q${r.q})  ` +
      `before ${fmt(r.before.I)} LUFS/${fmt(r.before.TP)} dBTP  after ${fmt(r.after.I)} LUFS/${fmt(r.after.TP)} dBTP  ` +
      `limiter -${fmt(r.limiter.maxReductionDb)} dB on ${fmt(r.limiter.limitedPct, 2)}%${r.limiter.capped ? ` (capped: gain ${r.gameGain})` : ''}  seam ${r.seam.ok ? 'ok' : 'CHECK'} (step ${fmt(r.seam.jumpVsP99, 2)}x p99)  ` +
      `quietest 2 s ${fmt(r.levels.quietest.l)}/${fmt(r.levels.quietest.r)} dBFS  onsets ${r.onsets.left}/${r.onsets.right} of ${attacks}  lead: ${tx(tl)}  (${r.secs} s)`);
  }
  for (const i of issues[song.meta.id] || []) console.log('  MIDI: ' + i);
}

const ORDER = Object.keys(GUITARS);
const tagOrder = (tag) => { const i = ORDER.indexOf(tag); return i < 0 ? 1e9 : i; };
// the page lists the synth (ks) with its softer variants, after the SoundFonts
const LISTEN = [...ORDER.filter((k) => k !== 'ks' && k !== 'ks-warm' && k !== 'ks-steel-soft'), 'ks', 'ks-warm', 'ks-steel-soft'];
const listenOrder = (tag) => { const i = LISTEN.indexOf(tag); return i < 0 ? 1e9 : i; };

if (EXCERPT) {
  // guitars.json: one entry per guitar, its excerpt of each tune; the ones just made replace
  // their namesakes, the rest stay if their files do. Merged with the file as it is when written.
  const manPath = path.join(PUBLISH, 'guitars.json');
  const { guitars: all } = updateJson(manPath, (cur) => {
    const byId = new Map((cur?.guitars || []).map((g) => [g.id, g]));
    for (const r of results) {
      const g = GUITARS[r.tag];
      const prev = byId.get(r.tag) || {};
      byId.set(r.tag, {
        id: r.tag, label: g.label, source: g.source, licence: g.licence, credit: fontsOf(r.tag).map((f) => f.credit),
        files: { ...prev.files, [r.tune]: r.file },
        metrics: { ...prev.metrics, [r.tune]: { lead: r.timbre.lead, rhythm: r.timbre.rhythm, mix: r.timbre.mix } },
      });
    }
    const guitars = [...byId.values()].filter((g) => GUITARS[g.id]).map((g) => {
      const G = GUITARS[g.id];
      g = { id: g.id, label: G.label, source: G.source, licence: G.licence, credit: fontsOf(g.id).map((f) => f.credit), files: g.files, metrics: g.metrics };
      for (const [t, f] of Object.entries(g.files)) if (!fs.existsSync(path.join(PUBLISH, f))) { delete g.files[t]; if (g.metrics) delete g.metrics[t]; }
      return g;
    }).filter((g) => Object.keys(g.files).length).sort((a, b) => listenOrder(a.id) - listenOrder(b.id));
    const tunes = [...new Set(guitars.flatMap((g) => Object.keys(g.files)))];
    return { excerpt: `the first ~${EXCERPT} s (whole bars), let ring and faded`, tunes, guitars };
  });
  fs.writeFileSync(path.join(WORK, 'guitars-report.json'), JSON.stringify({ results: results.map(({ meta, ...r }) => r) }, null, 2));
  console.log(`\n${all.length} guitar(s) in ${rel(manPath)}; full numbers in ${rel(path.join(WORK, 'guitars-report.json'))}`);
} else {
  // candidates.json: the ones just made replace their namesakes, the rest stay if their files do.
  // Merged with the file as it is when written (another render may have added to it meanwhile).
  const manPath = path.join(PUBLISH, 'candidates.json');
  const made = results.map((r) => ({
    id: r.id, tune: r.tune, title: r.meta.title, renderer: r.label, file: r.file, key: r.meta.key || '',
    timeSig: sigOf(r.meta.timeSig).join('/'), bpm: r.meta.bpm, bars: r.meta.bars, seconds: +r.loopSec.toFixed(1), kb: r.kb, gain: r.gameGain,
    description: r.meta.description || '',
  }));
  const order = [...SONG_ORDER, ...songs.map((s) => s.meta.id).filter((id) => !SONG_ORDER.includes(id))];
  const { candidates: all } = updateJson(manPath, (cur) => {
    const keep = (cur?.candidates || []).filter((c) => !made.some((m) => m.id === c.id) && fs.existsSync(path.join(PUBLISH, c.file)) && !(REPLACE && songs.some((sg) => sg.meta.id === c.tune)));
    return {
      candidates: [...keep, ...made].sort((a, b) => {
        const ta = order.indexOf(a.tune), tb = order.indexOf(b.tune);
        return (ta < 0 ? 1e9 : ta) - (tb < 0 ? 1e9 : tb) || a.tune.localeCompare(b.tune) || tagOrder(a.id.slice(a.tune.length + 1)) - tagOrder(b.id.slice(b.tune.length + 1));
      }),
    };
  });
  fs.writeFileSync(path.join(WORK, 'report.json'), JSON.stringify({ results: results.map(({ meta, ...r }) => r), issues }, null, 2));
  console.log(`\n${all.length} candidate(s) in ${rel(manPath)}; full numbers in ${rel(path.join(WORK, 'report.json'))}`);
}
