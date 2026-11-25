import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const review = dirname(fileURLToPath(import.meta.url));
const game = resolve(review, '../../public');
const port = Number(process.env.RANGER_FACE_PORT || 3001);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end();
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const play = path.match(/^\/play\/(current|remake)(\/.*)?$/);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Ranger-Review', 'remake');
    if (/^\/play\/(profile|three-quarter)\/?$/.test(path)) return res.writeHead(302, { Location: '/' }).end();
    if (play && !play[2]) return res.writeHead(302, { Location: path + '/' }).end();
    let file;
    if (path === '/original/assets/heroes-approved/index.js') {
      res.setHeader('Content-Type', types['.js']);
      return res.end("import archer from '/original.js'; export default {archer};");
    }
    if (path === '/original/js/art/approved-heroes.js') {
      file = resolve(game, 'js/art/approved-heroes.js');
    } else if (path.startsWith('/original/js/')) {
      return res.writeHead(302, { Location: '/game/' + path.slice(10) }).end();
    } else if (play && play[1] === 'current' && play[2] === '/assets/heroes-approved/archer.js') {
      file = resolve(review, 'original.js');
    } else if (play && play[2] === '/play.js') {
      file = resolve(review, 'play.js');
    } else if (play || path.startsWith('/game/') || /^\/(assets|img|audio)\//.test(path)) {
      const resource = play ? (play[2] === '/' ? 'index.html' : play[2].slice(1)) : path.slice(path.startsWith('/game/') ? 6 : 1);
      file = resolve(game, resource);
      if (!file.startsWith(game + sep)) return res.writeHead(404).end();
    } else if (['/', '/review.js', '/index.html', '/original.js'].includes(path)) {
      file = resolve(review, path === '/' ? 'index.html' : path.slice(1));
    } else return res.writeHead(404).end();
    const body = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    if (play && file === resolve(game, 'index.html')) {
      return res.end(body.toString().replace('src="js/main.js"', 'src="play.js"'));
    }
    res.end(body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
    if (error.code !== 'ENOENT') console.error(error);
  }
}).listen(port, '127.0.0.1', () => console.log(`Ranger review at http://127.0.0.1:${port}/`));
