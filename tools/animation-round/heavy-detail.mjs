import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { unpack } from './build.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
const tag=process.argv[2]||'before';
const root=`output/heavy-hero-art-2026-11-14/${tag}`;mkdirSync(root,{recursive:true});
for(const id of ['berserker','paladin']) {
 const data=(await import(`../../public/assets/heroes-approved/${id}.js`)).default;
 const list=[data.idle[0],data.walk[0],...data.attack];
 const c=createCanvas(320*5,280*Math.ceil(list.length/5)),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#45454f';ctx.fillRect(0,0,c.width,c.height);
 list.forEach((index,n)=>{const f=unpack(data,data.frames[index]),a=createCanvas(80,64);a.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.d.buffer),80,64),0,0);
 const x=n%5*320,y=Math.floor(n/5)*280;ctx.drawImage(a,20,16,40,40,x,y,320,320);ctx.fillStyle='#eee';ctx.font='15px sans-serif';ctx.fillText(`${id} ${index}`,x+5,y+18);});
 writeFileSync(`${root}/${id}-details.png`,c.toBuffer('image/png'));
}
