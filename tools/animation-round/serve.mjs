import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = resolve(root, 'tools/animation-round'), game = resolve(root, 'public');
// Optional exact pre-edit sheets for a new motion review; never serve arbitrary paths.
const previous = process.env.WALK_BASELINE && resolve(root, process.env.WALK_BASELINE);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json' };
const port = Number(process.env.ANIMATION_PORT || 3016);
http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const path = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname);
    const isPrevious = previous && path.startsWith('/previous/');
    const base = isPrevious ? previous : /^\/(js|assets|img)\//.test(path) ? game : source;
    const file = resolve(base, isPrevious ? path.slice('/previous/'.length) : path === '/' ? 'index.html' : path.slice(1));
    if (!file.startsWith(base + sep)) throw Error('Invalid path');
    const body = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Animation review: http://127.0.0.1:${port}`));
