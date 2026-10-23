#!/usr/bin/env node
// Builds the release of the game for itch.io: a copy of public/ with only what a player needs, its
// engine/build.js switched to RELEASE (no debug address, no developer panel, never asks for the
// game's server; the save in the browser's storage), zipped to upload as an HTML game.
//   node tools/build-itch.mjs [--out=dist/itch] [--zip=dist/forest-survivor-itch.zip] [--no-zip] [--noindex]
// --noindex marks the page for search engines to leave out: the unlisted copy on gamevibe.si
// that the Pages workflow builds, to play what ships before it is uploaded.
//
// What goes in (releaseFiles): the page and its icon, the game's code without the developer panel
// (js/dev) and the bots (js/bots), the art (assets/), and of the music only the pieces
// audio/music/tracks.json plays, with their credits and licences. Not the menu-music candidates,
// the unlisted pages, nor anything else in public/. Every module the game imports must be in the
// copy, or the build fails (checkImports).
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, dirname, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const LEAVE_OUT = ['js/dev/', 'js/bots/'];
const MUSIC = 'audio/music/';
// itch.io's limits for a game played in the browser.
const ITCH_FILES = 1000, ITCH_BYTES = 500 * 1024 * 1024, ITCH_FILE_BYTES = 200 * 1024 * 1024;

// Every file under dir (relative to pub), as posix paths.
function walk(pub, dir) {
  const out = [];
  for (const name of readdirSync(join(pub, dir))) {
    const rel = posix.join(dir, name);
    if (statSync(join(pub, rel)).isDirectory()) out.push(...walk(pub, rel));
    else out.push(rel);
  }
  return out;
}

export function releaseFiles(pub = PUBLIC) {
  const tracks = JSON.parse(readFileSync(join(pub, MUSIC, 'tracks.json'), 'utf8'));
  const music = Object.values(tracks).map((e) => MUSIC + (typeof e === 'string' ? e : e.file));
  for (const f of music) if (!existsSync(join(pub, f))) throw new Error(`tracks.json lists ${f}, which isn't there`);
  const files = [
    'index.html',
    'favicon.svg',
    ...walk(pub, 'js').filter((f) => !LEAVE_OUT.some((d) => f.startsWith(d))),
    ...walk(pub, 'assets'),
    MUSIC + 'tracks.json',
    MUSIC + 'CREDITS.md',
    ...walk(pub, MUSIC + 'licences'),
    ...music,
  ];
  return [...new Set(files)].sort();
}

// The modules js/main.js imports, and theirs, all the way down (static imports only: the
// developer panel and the bots come by import(), only where a release never goes).
function checkImports(out) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const abs = join(out, file);
    if (!existsSync(abs)) throw new Error(`the release leaves out ${file}, which the game imports`);
    const src = readFileSync(abs, 'utf8');
    for (const m of src.matchAll(/^\s*(?:import|export)\s(?:[^'"`;]*?\sfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/gm)) {
      visit(posix.normalize(posix.join(posix.dirname(file), m[1])));
    }
  };
  visit('js/main.js');
  return seen.size;
}

export function buildItch({ out = join(ROOT, 'dist/itch'), zip = join(ROOT, 'dist/forest-survivor-itch.zip'), noindex = false, pub = PUBLIC } = {}) {
  const files = releaseFiles(pub);
  rmSync(out, { recursive: true, force: true });
  let bytes = 0;
  const entries = [];
  for (const f of files) {
    let data = readFileSync(join(pub, f));
    if (f === 'js/engine/build.js') {
      const src = data.toString('utf8');
      if (!/^export const RELEASE = false;$/m.test(src)) throw new Error('js/engine/build.js has no "export const RELEASE = false;" to switch');
      data = Buffer.from(src.replace(/^export const RELEASE = false;$/m, 'export const RELEASE = true;'));
    }
    if (f === 'index.html' && noindex) {
      data = Buffer.from(data.toString('utf8').replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta name="robots" content="noindex">'));
    }
    if (data.length > ITCH_FILE_BYTES) throw new Error(`${f} is over itch.io's 200 MB a file`);
    bytes += data.length;
    mkdirSync(dirname(join(out, f)), { recursive: true });
    writeFileSync(join(out, f), data);
    entries.push({ name: f, data });
  }
  if (files.length > ITCH_FILES) throw new Error(`${files.length} files: itch.io takes at most ${ITCH_FILES}`);
  if (bytes > ITCH_BYTES) throw new Error(`${(bytes / 2 ** 20).toFixed(0)} MB: itch.io takes at most 500 MB`);
  const modules = checkImports(out);
  let zipBytes = 0;
  if (zip) {
    const z = zipFiles(entries);
    mkdirSync(dirname(zip), { recursive: true });
    writeFileSync(zip, z);
    zipBytes = z.length;
  }
  return { files: files.length, bytes, modules, zipBytes, out, zip };
}

// ---------------------------------------------------------------- zip --
// A plain zip, no dependencies: each file deflated (or stored, where deflating saves nothing, as
// for the music), every date the same, so the same game always makes the same zip.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const DOS_DATE = (1 << 5) | 1; // 1 January 1980, midnight
export function zipFiles(entries) {
  const parts = [], central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4); // version needed
    head.writeUInt16LE(0x0800, 6); // names in UTF-8
    head.writeUInt16LE(stored ? 0 : 8, 8);
    head.writeUInt16LE(0, 10);
    head.writeUInt16LE(DOS_DATE, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBuf.length, 26);
    head.writeUInt16LE(0, 28);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4); // made by
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(stored ? 0 : 8, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    parts.push(head, nameBuf, body);
    central.push(dir, nameBuf);
    offset += head.length + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k, d) => {
    const a = args.find((x) => x.startsWith(`--${k}=`));
    return a ? a.slice(k.length + 3) : d;
  };
  const r = buildItch({
    out: resolve(opt('out', join(ROOT, 'dist/itch'))),
    zip: args.includes('--no-zip') ? null : resolve(opt('zip', join(ROOT, 'dist/forest-survivor-itch.zip'))),
    noindex: args.includes('--noindex'),
  });
  const mb = (n) => (n / 2 ** 20).toFixed(1) + ' MB';
  console.log(`Release: ${r.files} files, ${mb(r.bytes)}, ${r.modules} modules checked → ${relative(process.cwd(), r.out) || '.'}`);
  if (r.zip) console.log(`Zip: ${relative(process.cwd(), r.zip)} (${mb(r.zipBytes)}), to upload to itch.io as an HTML game`);
}
