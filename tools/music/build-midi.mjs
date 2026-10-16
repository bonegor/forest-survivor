// tools/music/build-midi.mjs — validate the menu tunes and write them as MIDI.
//
//   node tools/music/build-midi.mjs            every song in tools/music/songs/
//   node tools/music/build-midi.mjs menu-v2    just these ids
//
// Writes tools/music/out/<id>.mid and tools/music/out/songs.json, then reads every .mid back and checks
// it (track count, event count, notes balanced, every track exactly bars × beats × ticks-per-beat long).
// Exits 1 if any song has validation errors or fails the read-back.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeMidi, parseMidi, timing, PPQ } from './midi.mjs';
import { validate, durationSeconds, barSeconds, bpmUnit, noteName } from './song.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const songsDir = join(here, 'songs');
const outDir = join(here, 'out');
const want = process.argv.slice(2);
const GM = { 24: 'Acoustic Guitar (nylon)', 25: 'Acoustic Guitar (steel)' };

/** Reads the written file back and proves the writer right. Returns a short summary or throws. */
function selfCheck(song, buf) {
  const m = parseMidi(buf);
  const t = timing(song);
  const fail = (msg) => { throw new Error(`self-check: ${msg}`); };
  if (m.format !== 1) fail(`format ${m.format}, expected 1`);
  if (m.division !== PPQ) fail(`division ${m.division}, expected ${PPQ}`);
  if (m.tracks.length !== song.tracks.length + 1) fail(`${m.tracks.length} tracks, expected ${song.tracks.length + 1}`);
  const expectTicks = song.bars * song.timeSig[0] * t.tpu;
  m.tracks.forEach((tr, i) => { if (tr.endTick !== expectTicks) fail(`track ${i} ends at tick ${tr.endTick}, expected ${expectTicks}`); });
  const c = m.tracks[0].events;
  const tempo = c.find((e) => e.kind === 'meta' && e.type === 0x51);
  const us = tempo && (tempo.data[0] << 16) | (tempo.data[1] << 8) | tempo.data[2];
  if (us !== t.usPerQuarter) fail(`tempo ${us} µs/quarter, expected ${t.usPerQuarter}`);
  const ts = c.find((e) => e.kind === 'meta' && e.type === 0x58);
  if (!ts || ts.data[0] !== t.num || 2 ** ts.data[1] !== t.den) fail('time signature meta missing or wrong');
  const expectCond = 3 + (song.keySig ? 1 : 0) + (song.sections?.length ?? 0) + 1;
  if (c.length !== expectCond) fail(`conductor has ${c.length} events, expected ${expectCond}`);
  let events = c.length;
  song.tracks.forEach((st, i) => {
    const evs = m.tracks[i + 1].events;
    events += evs.length;
    const expect = 1 + 1 + 2 + (st.reverb != null ? 1 : 0) + 2 * st.notes.length + 1;
    if (evs.length !== expect) fail(`${st.name}: ${evs.length} events, expected ${expect}`);
    const prog = evs.find((e) => e.kind === 'program');
    if (!prog || prog.data[0] !== st.program || prog.channel !== st.channel) fail(`${st.name}: program change wrong`);
    const open = new Map();
    let ons = 0;
    for (const e of evs) {
      if (e.kind === 'on') { ons++; if (open.get(e.data[0])) fail(`${st.name}: ${noteName(e.data[0])} re-struck at tick ${e.tick} before its note-off`); open.set(e.data[0], 1); }
      if (e.kind === 'off') { if (!open.get(e.data[0])) fail(`${st.name}: stray note-off at tick ${e.tick}`); open.set(e.data[0], 0); }
    }
    if (ons !== st.notes.length) fail(`${st.name}: ${ons} note-ons, expected ${st.notes.length}`);
    if ([...open.values()].some(Boolean)) fail(`${st.name}: a note is never released`);
  });
  return { tracks: m.tracks.length, events, ticks: expectTicks };
}

const files = readdirSync(songsDir).filter((f) => f.endsWith('.mjs')).sort();
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'songs.json');
const previous = want.length && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : [];
const built = [];
let failed = false;
const seen = new Set();

for (const f of files) {
  const song = (await import(pathToFileURL(join(songsDir, f)).href)).default;
  if (want.length && !want.includes(song.id)) continue;
  seen.add(song.id);
  const secs = durationSeconds(song);
  console.log(`\n${song.id}  "${song.title}"  ${song.key}, ${song.timeSig.join('/')}, ${song.bpm} bpm (${bpmUnit(song.timeSig)}), ${song.bars} bars, ${secs.toFixed(1)} s`);
  const rep = validate(song);
  for (const w of rep.warnings) console.log(`  warn  ${w}`);
  for (const e of rep.errors) console.log(`  ERROR ${e}`);
  if (!rep.ok) { failed = true; console.log('  not written'); continue; }
  const file = join(outDir, `${song.id}.mid`);
  const info = writeMidi(song, file);
  try {
    const chk = selfCheck(song, readFileSync(file));
    console.log(`  wrote out/${song.id}.mid  ${info.bytes} bytes; read back: ${chk.tracks} tracks, ${chk.events} events, ${chk.ticks} ticks ✓`);
  } catch (e) {
    failed = true;
    console.log(`  ERROR ${e.message}`);
    continue;
  }
  for (const tr of song.tracks) {
    const ps = tr.notes.map((n) => n.pitch), vs = tr.notes.map((n) => n.vel);
    console.log(`  ${tr.name.padEnd(22)} prog ${tr.program}  ch ${tr.channel + 1}  pan ${tr.pan}  ${String(tr.notes.length).padStart(4)} notes  ${noteName(Math.min(...ps))}..${noteName(Math.max(...ps))}  vel ${Math.min(...vs)}..${Math.max(...vs)}`);
  }
  built.push({
    id: song.id,
    title: song.title,
    file: `${song.id}.mid`,
    key: song.key,
    bpm: song.bpm,
    bpmUnit: bpmUnit(song.timeSig),
    timeSig: song.timeSig,
    bars: song.bars,
    barSeconds: +barSeconds(song).toFixed(4),
    durationSeconds: +secs.toFixed(3),
    loop: true,
    description: song.description,
    sections: song.sections ?? [],
    render: song.render ?? null,
    programs: song.tracks.map((t) => t.program),
    tracks: song.tracks.map((t) => ({
      name: t.name, role: t.role, program: t.program, programName: GM[t.program] ?? `GM ${t.program}`,
      channel: t.channel, pan: t.pan, volume: t.volume, reverb: t.reverb ?? null, notes: t.notes.length,
      range: [Math.min(...t.notes.map((n) => n.pitch)), Math.max(...t.notes.map((n) => n.pitch))],
    })),
  });
}

for (const id of want) if (!seen.has(id)) { console.log(`\nno song with id "${id}"`); failed = true; }
const manifest = [...previous.filter((s) => !built.some((b) => b.id === s.id)), ...built].sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n${built.length} song(s) written; manifest out/songs.json lists ${manifest.length}.`);
process.exit(failed ? 1 : 0);
