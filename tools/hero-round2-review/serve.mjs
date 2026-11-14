import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=resolve(root,'tools/hero-round2-review'),game=resolve(root,'public');
const previous={
  'archer.js':'tools/hero-round2-review/before/archer.js',
  'berserker.js':'tools/hero-round2-review/before/berserker.js',
  'eanasir-source.js':'tools/hero-round2-review/before/eanasir-source.js',
};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.gif':'image/gif','.json':'application/json','.ogg':'audio/ogg'};
const port=Number(process.env.HERO_ROUND2_PORT||3018);
http.createServer(async(req,res)=>{
  try {
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    const pathname=decodeURIComponent(new URL(req.url,`http://127.0.0.1:${port}`).pathname);
    let file;
    if(pathname.startsWith('/before/')){
      const name=pathname.slice(8);if(!Object.hasOwn(previous,name))throw Error('No baseline');
      file=resolve(root,previous[name]);
    }else{
      const base=/^\/(js|assets|img|audio)\//.test(pathname)?game:source;
      file=resolve(base,pathname==='/'?'index.html':pathname.slice(1));
      if(!file.startsWith(base+sep))throw Error('Invalid path');
    }
    const body=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Hero second-pass review: http://127.0.0.1:${port}`));
