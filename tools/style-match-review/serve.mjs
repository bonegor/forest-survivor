// Disposable before/after review; the baseline is read from a fixed Git commit.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=resolve(root,'tools/style-match-review'),game=resolve(root,'public');
const baseline=process.env.STYLE_REVIEW_BASELINE||'6a7d8bb';
if(!/^[a-f0-9]{7,40}$/i.test(baseline))throw Error('STYLE_REVIEW_BASELINE must be a Git commit hash');
const previous={
 'archer.js':'public/assets/heroes-approved/archer.js',
 'berserker.js':'public/assets/heroes-approved/berserker.js',
 'eanasir.js':'public/assets/heroes-authored/eanasir.js',
};
const frozen=new Map(Object.entries(previous).map(([name,path])=>[name,execFileSync('git',['show',`${baseline}:${path}`],{cwd:root,maxBuffer:8*1024*1024})]));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.gif':'image/gif','.json':'application/json','.ogg':'audio/ogg'};
const port=Number(process.env.STYLE_REVIEW_PORT||3019);
http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  const path=decodeURIComponent(new URL(req.url,`http://127.0.0.1:${port}`).pathname);
  let body,type;
  if(path.startsWith('/before/')){
   body=frozen.get(path.slice(8));if(!body)throw Error('No baseline');type=types['.js'];
  }else{
   const base=/^\/(js|assets|img|audio)\//.test(path)?game:source;
   const file=resolve(base,path==='/'?'index.html':path.slice(1));
   if(!file.startsWith(base+sep))throw Error('Invalid path');
   body=await readFile(file);type=types[extname(file)]||'application/octet-stream';
  }
  res.setHeader('Content-Type',type);res.setHeader('Cache-Control','no-store');res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Hero style comparison: http://127.0.0.1:${port}`));
