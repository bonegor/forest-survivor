import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {writeCapture} from '../write-capture.mjs';
import {resolve,extname,sep} from 'node:path';
const source=resolve('tools/hero-v2'), output=resolve('tools/out/hero-v2'), game=resolve('public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.gif':'image/gif','.json':'application/json'};
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://127.0.0.1:3012');
    if(req.method==='POST' && url.pathname==='/capture') {
      if(req.headers.origin!=='http://127.0.0.1:3012')throw Error('Local captures only');
      let body='';for await(const chunk of req){body+=chunk;if(body.length>8e6)throw Error('Capture too large');}
      const {name,data}=JSON.parse(body);
      await writeCapture(resolve(output,'captures'),name,data);
      res.end('ok');return;
    }
    const isGame=url.pathname.startsWith('/js/')||url.pathname.startsWith('/assets/')||url.pathname.startsWith('/img/');
    const base=isGame?game:url.pathname.startsWith('/out/')?output:source;
    const name=url.pathname==='/'?'index.html':url.pathname.replace(/^\/out\//,'/').slice(1);
    const file=resolve(base,name);
    if(!file.startsWith(base+sep))throw Error('Invalid path');
    res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store');res.end(await readFile(file));
  }catch(e){res.statusCode=404;res.end(String(e));}
}).listen(3012,'127.0.0.1',()=>console.log('V2 comparison: http://127.0.0.1:3012'));
