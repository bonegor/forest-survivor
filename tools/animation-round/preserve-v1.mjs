// Freeze the user's current version once. Never silently refresh that baseline.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sheets from '../../public/assets/heroes-approved/index.js';

const root = new URL('./variants/v1/', import.meta.url);
mkdirSync(root, { recursive: true });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestPath = new URL('manifest.json', root);
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const [file, sha256] of Object.entries(manifest.files)) {
    if (digest(readFileSync(new URL(file, root))) !== sha256) throw Error(`Preserved v1 changed: ${file}`);
  }
  console.log('Preserved v1 verified; existing snapshot retained.');
} else {
  const files = {};
  for (const name of [...Object.keys(sheets), 'index']) {
    const file = `${name}.js`, bytes = readFileSync(new URL(`../../public/assets/heroes-approved/${file}`, import.meta.url));
    const destination = new URL(file, root);
    if (existsSync(destination) && digest(readFileSync(destination)) !== digest(bytes)) throw Error(`Refusing to overwrite ${file}`);
    if (!existsSync(destination)) writeFileSync(destination, bytes, { flag: 'wx' });
    files[file] = digest(bytes);
  }
  writeFileSync(manifestPath, JSON.stringify({ version: 'v1', label: 'V1 · current walk', date: '2026-11-12', files }, null, 2) + '\n', { flag: 'wx' });
  console.log(`Preserved exact v1 sheets for ${Object.keys(sheets).length} heroes.`);
}
