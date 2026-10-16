// tools/music/render/manifest.mjs — read-modify-write of the audition page's JSON lists
// (public/audio/music/menu/candidates.json, guitars/guitars.json) that holds up when another render
// writes the same file alongside: the file is re-read at the moment of writing (never a copy read
// when the run began), the new content goes to a temporary file renamed into place (a reader never
// sees half a file), and if the file changed while the update was being made, it is merged again.

import fs from 'node:fs';
import path from 'node:path';

const readText = (file) => { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } };

/** The JSON in `file`, or null when it is missing or not JSON. */
export function readJson(file) {
  const text = readText(file);
  if (text == null) return null;
  try { return JSON.parse(text); } catch { return null; }
}

/** Rewrites `file` as update(current), current being the file's JSON as it is now (null if missing
 *  or unreadable). Returns what was written. Up to `tries` rounds when the file keeps changing. */
export function updateJson(file, update, { tries = 5 } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let i = 1; ; i++) {
    const before = readText(file);
    let current = null;
    try { current = before == null ? null : JSON.parse(before); } catch { current = null; }
    const next = update(current);
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n');
    if (readText(file) === before || i >= tries) {
      fs.renameSync(tmp, file);
      return next;
    }
    fs.rmSync(tmp, { force: true }); // someone wrote it meanwhile: merge with theirs
  }
}
