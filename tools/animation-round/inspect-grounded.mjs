import { createRequire } from 'node:module';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import source from './baseline/index.js';
import { buildGroundedWalk,GROUNDED_MODELS } from './grounded-walk.mjs';
import { writePng } from '../png.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const out=resolve(process.argv[2]||'output/animation-round/grounded-drawing/current');
mkdirSync(out,{recursive:true});
const unpack=(data,i)=>{
  const [x,y,w,h,s]=data.frames[i],raw=Buffer.from(s,'base64'),d=new Uint32Array(80*64);
  for(let iy=0;iy<h;iy++)for(let ix=0;ix<w;ix++)d[(y+iy)*80+x+ix]=data.palette[raw.readUIntLE((iy*w+ix)*data.indexBytes,data.indexBytes)];
  return {w:80,h:64,d};
};
for(const id of Object.keys(GROUNDED_MODELS)) {
  const s=source[id],result=buildGroundedWalk(id,s.palette,unpack(s,s.idle[0])),frames=[...result.frames,result.frames[0]];
  const c=createCanvas(9*240,2*216),ctx=c.getContext('2d');
  ctx.fillStyle='#d8d2b7';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;ctx.font='12px sans-serif';
  for(let i=0;i<frames.length;i++) {
    const f=frames[i],p=createCanvas(80,64),pc=p.getContext('2d');pc.putImageData(new ImageData(new Uint8ClampedArray(f.d.buffer),80,64),0,0);
    const x=i%9*240,y=Math.floor(i/9)*216;ctx.drawImage(p,10,12,60,48,x,y+20,240,192);
    ctx.fillStyle='#272827';ctx.fillText(`${id} ${i%16}`,x+8,y+16);
  }
  writeFileSync(resolve(out,id+'-walk.png'),c.toBuffer('image/png'));
  writeFileSync(resolve(out,id+'-poses.json'),JSON.stringify({fps:result.fps,motion:result.motion,poses:result.poses},null,2));
  for(let i=0;i<16;i++)writePng(resolve(out,id+'-'+String(i).padStart(2,'0')+'.png'),result.frames[i]);
  console.log(id,result.fps.toFixed(2)+' fps');
}
