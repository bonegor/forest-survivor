// Bakes the sprite tuner's codes into the game:
//   node tools/bake-tune.mjs <file> [--out=public/js/art/tuned.js] [--dry]
// <file> holds what the tuner copied: its "Copy all changes" blob (JSON), or "FS tune …" codes, one
// a line ('-' reads them from stdin). Each code is applied to the sprite as the game ships it now
// (an earlier bake included), exactly as the tuner previewed it (public/js/art/tune.js), and the
// colours that gives are written to public/js/art/tuned.js as the sprite's palette override, with
// its rim and the codes baked so far. The art files are left as drawn: defs.js lays tuned.js over
// them, and engine/sprites.js (spriteBuffers) draws it, in the game and in tools/preview.mjs. A
// hero's menu pose cut from his sheet (archer_pose, …) takes his colours too, not the rim.
// --out bakes into another file instead (starting from the game's tunes if it isn't there yet),
// to look first: node tools/preview.mjs spider --tuned=<that file>. --dry only reports.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { ART, DRAWN, withTunes } from '../public/js/art/defs.js';
import { TUNED } from '../public/js/art/tuned.js';
import { parseTunes, colourSlots, tunedDef, tuneCode, meanLuma } from '../public/js/art/tune.js';
import { spriteBuffers } from '../public/js/engine/sprites.js';
import { hexPack } from '../public/js/engine/pixels.js';

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || d;
const file = args.find((a) => !a.startsWith('--'));
const DRY = args.includes('--dry');
const OUT = resolve(opt('out', fileURLToPath(new URL('../public/js/art/tuned.js', import.meta.url))));
if (!file) {
  console.error('usage: node tools/bake-tune.mjs <codes-or-json-file | -> [--out=file] [--dry]');
  process.exit(2);
}

const { tunes, bad } = parseTunes(readFileSync(file === '-' ? 0 : file, 'utf8'));
if (bad.length) {
  console.error(`Not tuner codes:\n  ${bad.join('\n  ')}`);
  process.exit(1);
}
const unknown = tunes.filter((t) => !ART[t.name]).map((t) => t.name);
if (unknown.length) {
  console.error(`No such sprite: ${[...new Set(unknown)].join(', ')}`);
  process.exit(1);
}
if (!tunes.length) {
  console.error('No "FS tune …" codes found.');
  process.exit(1);
}

// What a sprite's luma is measured on: its pixels, not its ink (when it has one) nor its rim.
function lumaOf(def, slots) {
  const ink = slots.find((s) => s.ink), { frames } = spriteBuffers(def), skip = new Set();
  if (ink) skip.add(hexPack(def.palette?.[ink.key] || ink.from));
  if (def.rim) skip.add(hexPack(def.rim));
  return Math.round(meanLuma(frames, skip));
}

// What is baked already: the tuned.js written to (the game's, or --out's if it is there yet), laid
// over the art as drawn. A bake to a new --out file starts from the game's.
const before = existsSync(OUT) ? (await import(`${pathToFileURL(OUT).href}?${Date.now()}`)).TUNED : TUNED;
const tuned = structuredClone(before), art = withTunes(DRAWN, before);
const defs = {};
for (const { name, tune } of tunes) {
  const def = defs[name] || art[name], slots = colourSlots(def), next = tunedDef(def, tune, slots);
  defs[name] = next;
  const code = tuneCode(name, tune), entry = { codes: [...(tuned[name]?.codes || []), code] };
  if (next.palette) entry.palette = next.palette;
  if (next.rim) entry.rim = next.rim;
  tuned[name] = entry;
  // The menu pose cut from a hero's sheet is drawn in the same colours.
  const pose = art[`${name}_pose`];
  if (pose && pose.gen && def.gen) {
    const own = new Set(slots.map((s) => s.key));
    if (colourSlots(pose).every((s) => own.has(s.key))) {
      tuned[`${name}_pose`] = { codes: entry.codes, ...(next.palette ? { palette: next.palette } : {}) };
    }
  }
  const changed = Object.keys(next.palette || {}).filter((k) => (def.palette || {})[k] !== next.palette[k]).length;
  console.log(`${name}: ${code}\n  ${changed} colour${changed === 1 ? '' : 's'} changed, rim ${next.rim || 'none'}, luma ${lumaOf(def, slots)} -> ${lumaOf(next, colourSlots(next))}`);
}

// tuned.js, as this tool writes it: sprites by name, a palette's colours a few to a line.
const HEADER = `// Colour tunes from the sprite tuner, written by tools/bake-tune.mjs: don't edit by hand, bake.
// Per sprite: \`palette\`, the colours it is drawn in instead (keyed by palette key as in
// palette.js, or for the heroes' sheets by their own '#rrggbb' colours); \`rim\`, a 1px ring outside
// its outline; \`codes\`, the tuner codes baked into it, oldest first. defs.js lays these over the
// art (withTunes) and engine/sprites.js draws them (spriteBuffers). Delete an entry to undo it.`;
const key = (k) => (/^[A-Za-z_$][\w$]*$|^\d$/.test(k) ? k : `'${k}'`);
function format(all) {
  const names = Object.keys(all).sort();
  if (!names.length) return `${HEADER}\nexport const TUNED = {};\n`;
  const out = [HEADER, 'export const TUNED = {'];
  for (const name of names) {
    const t = all[name];
    out.push(`  ${key(name)}: {`);
    out.push(`    codes: [${t.codes.map((c) => `'${c}'`).join(', ')}],`);
    if (t.palette) {
      const pairs = Object.entries(t.palette).map(([k, v]) => `${key(k)}: '${v}'`), lines = [];
      for (let i = 0; i < pairs.length; i += 6) lines.push(`      ${pairs.slice(i, i + 6).join(', ')},`);
      out.push('    palette: {', ...lines, '    },');
    }
    if (t.rim) out.push(`    rim: '${t.rim}',`);
    out.push('  },');
  }
  out.push('};', '');
  return out.join('\n');
}

const text = format(tuned);
if (DRY) {
  console.log(`\n(dry run: ${OUT} left as it is)`);
} else {
  writeFileSync(OUT, text);
  const back = (await import(`${pathToFileURL(OUT).href}?${Date.now()}`)).TUNED;
  if (!isDeepStrictEqual(back, tuned)) {
    console.error(`${OUT} does not read back as written`);
    process.exit(1);
  }
  console.log(`\nwrote ${OUT} (${Object.keys(tuned).length} tuned). Look: node tools/preview.mjs ${[...new Set(tunes.map((t) => t.name))].join(' ')}`);
}
