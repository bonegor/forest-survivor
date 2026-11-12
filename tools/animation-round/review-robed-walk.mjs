import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import sheets from './baseline/index.js';
import {unpack} from './build.mjs';
import {buildRobedWalk,ROBED_WALK} from './robed-walk.mjs';
import {writePng} from '../png.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const version=process.env.ROBED_REVIEW_VERSION||'v1';
const root=process.env.ROBED_REVIEW_OUT||'output/animation-round/2026-11-12-robed-candidate';mkdirSync(root,{recursive:true});
const report={};
for(const id of Object.keys(ROBED_WALK)){
 const base=sheets[id],g=buildRobedWalk(id,base.palette,unpack(base,base.frames[0]),unpack(base,base.frames[base.walk[0]]),{version});
 const list=[...g.frames,g.frames[0]],c=createCanvas(4*192,28+Math.ceil(list.length/4)*216),ctx=c.getContext('2d');
 ctx.imageSmoothingEnabled=false;ctx.fillStyle='#bdb8a5';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#17202a';ctx.font='13px sans-serif';ctx.fillText(`${id}: ${g.frames.length} authored phases / ${g.settings.cycleSeconds}s cycle / repeat0`,8,18);
 const atlas={w:80*g.frames.length,h:64,d:new Uint32Array(80*g.frames.length*64)};
 list.forEach((frame,i)=>{
  const f=createCanvas(80,64);f.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(frame.d.buffer),80,64),0,0);
  const x=i%4*192,y=28+Math.floor(i/4)*216;ctx.drawImage(f,16,12,48,48,x,y,192,192);
  ctx.fillStyle='#6d6a60';ctx.fillRect(x+2,y+44*4,188,1);ctx.fillStyle='#17202a';ctx.fillText(i===g.frames.length?'return0':`phase ${i}`,x+7,y+208);
  if(i<g.frames.length){for(let y=0;y<64;y++)atlas.d.set(frame.d.subarray(y*80,(y+1)*80),y*atlas.w+i*80);writePng(`${root}/${id}-${String(i).padStart(2,'0')}.png`,frame);}
 });
 writeFileSync(`${root}/${id}-walk-detail-light.png`,c.toBuffer('image/png'));writePng(`${root}/${id}-atlas.png`,atlas);
 report[id]={fps:g.fps,settings:g.settings,poses:g.poses,unique:new Set(g.frames.map(f=>Buffer.from(f.d.buffer).toString('base64'))).size};
}
writeFileSync(`${root}/motion.json`,JSON.stringify(report,null,2)+'\n');console.log(root);
