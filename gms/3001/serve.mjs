// Sprite Lab: the one place to compare every hero and monster sprite for Forest Survivor, in
// the game itself, and to pick which ones it uses.
//
// Serves this folder (the lab, its sprite catalogues and sheets under sprites/, the music
// scout under music/), and the game's public folder read-only under /game/ (the lab runs the
// real game). Keeps the picks, and the versions saved from the colour bar:
//   GET  /api/picks     { hero: { knight: id, ... }, monster: { rat: id, ... } }
//   POST /api/picks     { kind: 'hero' | 'monster', role, id }  (id null: the game's own sprite again)
//   POST /api/versions  { as: 'hero' | 'monster', role, root, png, entry }  a recoloured sprite:
//                       its sheet goes to sprites/lab/sheets/, its entry to sprites/lab/versions.json
//                       (named "<root> · tweak <n>"); answers with the entry
// Saves are taken as JSON only (Content-Type: application/json), which a page on another site
// can't send here.
//
// The packs, the music and the saves live in a private checkout next to the game's,
// ../forest-survivor-assets (or LAB_ASSETS), laid out like this folder: its files win over this
// folder's, the picks and new versions are written there, and each save is committed and pushed,
// after pulling what was saved elsewhere (LAB_GIT=0: its git is left alone). Versions saved here
// before stay listed. Without the checkout, everything stays in this folder.
// Only on this machine (localhost). node serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = normalize(fileURLToPath(new URL('.', import.meta.url)));
const game = normalize(join(here, '..', '..', 'public') + sep);
const port = Number(process.argv[2]) || 3001;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
};

// The private checkout (see above), if there is one.
const checkout = resolve(process.env.LAB_ASSETS || join(here, '..', '..', '..', 'forest-survivor-assets')) + sep;
const assets = existsSync(checkout) ? checkout : null;

// The picks, read afresh for every call (a pull may have changed them) and written back whole,
// through a temporary file, one change at a time.
const PICKS = join(assets || here, 'picks.json');
const readPicks = () =>
  readFile(PICKS, 'utf8')
    .then((s) => ({ hero: {}, monster: {}, ...JSON.parse(s) }))
    .catch((e) => {
      if (e.code !== 'ENOENT') console.error(`picks.json could not be read (${e.message}); starting afresh`);
      return { hero: {}, monster: {} };
    });
let writing = Promise.resolve();
function changePicks(change) {
  const done = writing.then(async () => {
    const picks = await readPicks();
    change(picks);
    await writeFile(PICKS + '.tmp', JSON.stringify(picks, null, 1));
    await rename(PICKS + '.tmp', PICKS);
    return picks;
  });
  writing = done.catch((e) => console.error('saving picks', e.message));
  return done;
}

function body(req, limit) {
  return new Promise((resolve, reject) => {
    const parts = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > limit) {
        reject(new Error('too large'));
        req.destroy();
      } else parts.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(parts)));
    req.on('error', reject);
  });
}
// The versions saved from the colour bar, one at a time: into the checkout if there is one.
const LAB = join(here, 'sprites', 'lab');
const SAVES = assets ? join(assets, 'sprites', 'lab') : LAB;
const VERSIONS = join(SAVES, 'versions.json');
const readVersions = (file) => readFile(file, 'utf8').then(JSON.parse).catch(() => ({ entries: [] }));
// Every version: this folder's (saved before the checkout) and the checkout's.
async function allVersions() {
  const saved = (await readVersions(VERSIONS)).entries;
  if (!assets) return saved;
  const ids = new Set(saved.map((x) => x.id));
  return [...(await readVersions(join(LAB, 'versions.json'))).entries.filter((x) => !ids.has(x.id)), ...saved];
}
const ROWS = ['right', 'left', 'glow', 'glowLeft'];
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sprite';
const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const num = (x, lo, hi) => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;
const text = (x, n = 200) => (typeof x === 'string' ? x.slice(0, n) : null);
let versioning = Promise.resolve();

async function saveVersion(r) {
  if (!['hero', 'monster'].includes(r.as) || typeof r.role !== 'string' || !/^[a-z]{2,20}$/.test(r.role)) throw new Error('bad part');
  const root = text(r.root, 80)?.trim();
  if (!root) throw new Error('no name');
  if (typeof r.png !== 'string' || !r.png.startsWith('data:image/png;base64,')) throw new Error('no picture');
  const png = Buffer.from(r.png.slice(22), 'base64');
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('not a PNG');
  const e = r.entry || {};
  if (!int(e.w, 1, 512) || !int(e.h, 1, 512) || !int(e.frames, 1, 400)) throw new Error('bad frame size');
  if (!Array.isArray(e.rows) || !e.rows.length || e.rows[0] !== 'right' || !e.rows.every((x) => ROWS.includes(x))) throw new Error('bad rows');
  const list = (a) => (a == null ? null : Array.isArray(a) && a.length <= 400 && a.every((i) => int(i, 0, e.frames - 1)) ? a : undefined);
  const lists = { walk: list(e.walk), idle: list(e.idle), attack: list(e.attack) };
  if (Object.values(lists).includes(undefined)) throw new Error('bad frame lists');
  const adjust = {};
  for (const [k, v] of Object.entries(r.adjust || {})) if (/^[a-z]{1,12}$/.test(k) && num(v, -360, 360)) adjust[k] = v;

  const saved = versioning.then(async () => {
    const mine = await readFile(VERSIONS, 'utf8').then(JSON.parse).catch(async () => ({ about: (await readVersions(join(LAB, 'versions.json'))).about, entries: [] }));
    const all = await allVersions();
    const taken = new Set((await readFile(join(LAB, 'catalog.json'), 'utf8').then(JSON.parse).catch(() => ({ entries: [] }))).entries.map((x) => x.id));
    for (const x of all) taken.add(x.id);
    let n = 1 + Math.max(0, ...all.filter((x) => x.as === r.as && x.role === r.role && x.root === root).map((x) => x.n || 0));
    while (taken.has(`${slug(root)}-tweak-${n}`)) n++;
    const id = `${slug(root)}-tweak-${n}`, sheet = `sheets/${id}.png`;
    const entry = {
      as: r.as, role: r.role, id, n, root, name: `${root} · tweak ${n}`, made: new Date().toISOString(),
      from: text(r.from), fromName: text(r.fromName), adjust,
      by: text(r.by), licence: text(r.licence), restricted: !!r.restricted,
      w: e.w, h: e.h, frames: e.frames, rows: e.rows, ...lists,
      attackFps: num(e.attackFps, 0, 120) ? e.attackFps : 0, motionRate: num(e.motionRate, 0, 20) ? e.motionRate : 1, idleRate: num(e.idleRate, 0, 50) ? e.idleRate : 4,
      anchorY: int(e.anchorY, 0, 512) ? e.anchorY : e.h - 1, selfBob: !!e.selfBob, floating: !!e.floating,
      fitW: int(e.fitW, 1, 512) ? e.fitW : e.w, fitH: int(e.fitH, 1, 512) ? e.fitH : e.h, animFps: num(e.animFps, 0, 60) ? e.animFps : null,
      sheet,
    };
    await mkdir(join(SAVES, 'sheets'), { recursive: true });
    await writeFile(join(SAVES, sheet), png);
    mine.entries.push(entry);
    await writeFile(VERSIONS + '.tmp', JSON.stringify(mine, null, 1));
    await rename(VERSIONS + '.tmp', VERSIONS);
    return entry;
  });
  versioning = saved.catch(() => {});
  return saved;
}

// Each save into the checkout is committed a moment after the last change, then pushed after
// pulling what was saved elsewhere. A save that couldn't go goes with the next one, or when the
// lab next starts.
const tracked = assets && process.env.LAB_GIT !== '0' && existsSync(join(assets, '.git'));
const git = (...args) =>
  new Promise((resolve, reject) =>
    execFile('git', ['-C', assets, ...args], { timeout: 120e3, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' } }, (e, out, err) =>
      e ? reject(new Error(String(err || e.message).trim().split('\n').pop())) : resolve(out),
    ),
  );
let notes = [], timer = null, syncing = Promise.resolve();
function share(note) {
  if (!tracked) return;
  notes.push(note.replace(/\s+/g, ' '));
  clearTimeout(timer);
  timer = setTimeout(() => {
    const message = notes.length === 1 ? notes[0] : `${notes.length} saves from the Sprite Lab\n\n${notes.map((x) => `- ${x}`).join('\n')}`;
    notes = [];
    syncing = syncing.then(() => sync(message));
  }, 2000);
}
async function sync(message) {
  try {
    await writing;
    await versioning;
    const paths = ['picks.json', 'sprites/lab'].filter((p) => existsSync(join(assets, p)));
    if (paths.length) await git('add', '-A', '--', ...paths);
    if ((await git('diff', '--cached', '--name-only')).trim()) {
      const who = (await git('config', 'user.email').catch(() => '')).trim() ? [] : ['-c', 'user.name=Sprite Lab', '-c', 'user.email=sprite-lab@localhost'];
      await git(...who, 'commit', '-q', '-m', message);
    }
    // What was saved elsewhere meanwhile comes in under these saves; where both changed the same
    // lines, these win (in a rebase, "theirs" are the commits being replayed).
    await git('pull', '--rebase', '--autostash', '-X', 'theirs', '-q').catch(async (e) => {
      await git('rebase', '--abort').catch(() => {});
      throw e;
    });
    if ((await git('rev-list', '--count', '@{u}..')).trim() !== '0') {
      await git('push', '-q');
      console.log(`Saved to GitHub: ${message.split('\n')[0]}`);
    }
  } catch (e) {
    console.error(`The saves couldn't go to GitHub (${e.message}); they're kept here and go with the next save.`);
  }
}
if (tracked) syncing = sync('Saves from the Sprite Lab that were never committed');

const json = (res, code, v) => res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(v));

async function api(req, res, path) {
  if (path === '/api/picks' && req.method === 'GET') return json(res, 200, await readPicks());
  if (req.method === 'POST' && !/^application\/json\s*(;|$)/i.test(req.headers['content-type'] || '')) return json(res, 415, { error: 'JSON only' });
  if (path === '/api/picks' && req.method === 'POST') {
    const r = JSON.parse(await body(req, 1 << 14));
    if (!['hero', 'monster'].includes(r.kind) || typeof r.role !== 'string' || !/^[a-z]{2,20}$/.test(r.role)) return json(res, 400, { error: 'bad pick' });
    if (r.id != null && !(typeof r.id === 'string' && r.id.length < 200)) return json(res, 400, { error: 'bad id' });
    const picks = await changePicks((p) => (r.id == null ? delete p[r.kind][r.role] : (p[r.kind][r.role] = r.id)));
    share(r.id == null ? `Pick for ${r.role}: the game's own` : `Pick for ${r.role}: ${r.id}`);
    return json(res, 200, picks);
  }
  if (path === '/api/versions' && req.method === 'POST') {
    try {
      const entry = await saveVersion(JSON.parse(await body(req, 32 << 20)));
      share(`Recolour: ${entry.name}`);
      return json(res, 200, entry);
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }
  return json(res, 404, { error: 'no such call' });
}

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(req.url.split('?')[0]);
    if (path.startsWith('/api/')) return await api(req, res, path);
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end();
    if (!path.endsWith('/') && !extname(path)) return res.writeHead(301, { Location: path + '/' }).end();
    if (path.endsWith('/')) path += 'index.html';
    if (path === '/sprites/lab/versions.json') return json(res, 200, { entries: await allVersions() });
    // From the checkout first, then this folder. Never a dot-file or dot-folder (the checkout's
    // .git), and the picks only through /api/picks.
    const [roots, rel] = path.startsWith('/game/') ? [[game], path.slice(6)] : [[assets, here].filter(Boolean), path];
    const type = TYPES[extname(rel).toLowerCase()];
    if (!type || rel.split(/[\\/]/).some((s) => s.startsWith('.')) || rel === '/picks.json') return res.writeHead(404).end('Not found');
    let data;
    for (const root of roots) {
      const file = normalize(join(root, rel));
      if (!file.startsWith(root)) return res.writeHead(404).end('Not found');
      if ((data = await readFile(file).catch((e) => (e.code === 'ENOENT' ? null : Promise.reject(e))))) break;
    }
    if (!data) return res.writeHead(404).end('Not found');
    const head = { 'Content-Type': type, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
    // Audio players (the music scout) seek with byte ranges.
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      const size = data.length;
      const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
      if (start > end || start >= size) return res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
      return res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 }).end(data.subarray(start, end + 1));
    }
    res.writeHead(200, head).end(data);
  } catch (e) {
    if (!res.headersSent) res.writeHead(e.code === 'ENOENT' ? 404 : 500).end(e.code === 'ENOENT' ? 'Not found' : String(e.message));
  }
}).listen(port, 'localhost', () => console.log(`Sprite Lab at http://localhost:${port}` + (assets ? `, with the packs and saves in ${assets}` : '')));
