// Pack complete, unchanged source recordings into small independently fetched banks.
// Deployment serves these directly. The game's startup never preloads this library.
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(process.argv[2] || '../forest-survivor-assets/cc-music');
const dest = fileURLToPath(new URL('../public/audio/sfx/library/', import.meta.url));
const categories = new Set(['weapons-melee', 'weapons-ranged', 'magic', 'impacts', 'explosions']);
// The source files the Banshee Bell's tolls under "misc", for example, and the
// copper and chain sounds under "pickups-items". Include short matching foley.
const foley = /\b(?:bells?|chimes?|coins?|chains?|glass|metal|bottles?|orb|gems?|potion|skeleton|bones?|ghost|wind ?gust|gust of wind|tornado|thunder|lightning|twigs?|branch|whip|crystal|whoosh)\b/i;
const distributable = new Set(['public-domain', 'CC0-1.0', 'CC-BY-3.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0']);
const catalog = JSON.parse(readFileSync(join(source, 'catalog.json'), 'utf8'));
const clips = [];
let buffers = [], bytes = 0, bank = 0;
mkdirSync(dest, { recursive: true });
function flush() {
  if (bytes) writeFileSync(join(dest, `bank-${bank++}.bin`), Buffer.concat(buffers));
  buffers = []; bytes = 0;
}
for (const entry of catalog) {
  if (!categories.has(entry.category) && !(entry.path.startsWith('sfx/') && entry.category !== 'voices' &&
      entry.duration <= 10 && foley.test(entry.title))) continue;
  if (!distributable.has(entry.license) || !entry.artist || !entry.source?.file)
    throw new Error(`Review rights and credit before packing ${entry.path}`);
  const data = readFileSync(join(source, entry.path));
  if (bytes && bytes + data.length > 768 * 1024) flush();
  const { path, title, category, artist, copyright, license, license_url, duration, tags, changes, origin } = entry;
  clips.push({ id: path.slice(4), title, category: categories.has(category) ? category : 'foley', tags, duration, bank, offset: bytes, bytes: data.length,
    artist, copyright, license, licenseUrl: license_url, changes, origin, source: entry.source });
  buffers.push(data); bytes += data.length;
}
flush();
writeFileSync(join(dest, 'index.json'), JSON.stringify(clips));
for (const path of readdirSync(join(source, 'LICENSES'))) {
  if (distributable.has(path.replace(/\.txt$/, ''))) copyFileSync(join(source, 'LICENSES', path), join(dest, basename(path)));
}
console.log(`${clips.length} credited recordings in ${bank} banks`);
