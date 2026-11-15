// Disposable art comparison. Baseline modules are read from Git; no save or checkout changes.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const revision=process.env.BOSS_BASELINE_REF||'0791a0bfbdcd2bfefc75b1382ad3b7287cacfb95';
const port=Number(process.env.BOSS_POLISH_PORT||3022),cache=new Map();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.gif':'image/gif','.json':'application/json','.ogg':'audio/ogg'};
http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  const path=decodeURIComponent(new URL(req.url,`http://127.0.0.1:${port}`).pathname);
  let body,file;
  if(path.startsWith('/before/')){
   const relative=path.slice(8);
   if(!/^(js|assets|img|audio)\/[\w./-]+$/.test(relative)||relative.split('/').includes('..'))throw Error('Invalid baseline path');
   file=`public/${relative}`;
   if(!cache.has(file))cache.set(file,execFileSync('git',['show',`${revision}:${file}`],{cwd:root,maxBuffer:32*1024*1024,windowsHide:true,stdio:['ignore','pipe','ignore']}));
   body=cache.get(file);
  }else{
   const relative=path.startsWith('/after/')?`public/${path.slice(7)}`:/^\/(img|audio|assets)\//.test(path)?`public${path}`:path==='/boss-scene.js'?'tools/hero-round2-review/boss-scene.js':`tools/boss-polish/${path==='/'?'index.html':path.slice(1)}`;
   file=resolve(root,relative);
   if(!file.startsWith(root.endsWith(sep)?root:root+sep))throw Error('Invalid path');
   body=await readFile(file);
  }
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Boss comparison http://127.0.0.1:${port} (baseline ${revision.slice(0,8)})`));
