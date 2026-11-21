// Run from any directory with node tools/berserker-vikings/serve.mjs [port].
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const review = fileURLToPath(new URL('.', import.meta.url));
const game = fileURLToPath(new URL('../../public/', import.meta.url));
const port = Number(process.argv[2] || 3001);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.json': 'application/json' };

createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    const base = resolve(/^\/(js|assets|img|audio|fonts)\//.test(path) ? game : review);
    const file = resolve(base, path === '/' ? 'index.html' : path.slice(1));
    if (!file.startsWith(base + sep) || !mime[extname(file)]) {
      res.writeHead(404).end();
      return;
    }
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => console.log(`Berserker review at http://127.0.0.1:${port}/`));
