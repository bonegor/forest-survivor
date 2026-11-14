import { createRequire } from 'node:module';
import { writeFileSync,mkdirSync } from 'node:fs';
import { unpack } from './build.mjs';
import baseline from './baseline/index.js';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const out='output/hero-round2-2026-11-14/hero-art';mkdirSync(out,{recursive:true});
for(const id of ['archer','berserker']) {
 const current=(await import('../hero-round2-review/before/'+id+'.js')).default;
 const candidate=(await import('../../public/assets/heroes-approved/'+id+'.js')).default;
 const panel=createCanvas(960,530),p=panel.getContext('2d');p.fillStyle='#192123';p.fillRect(0,0,960,530);p.fillStyle='#eee8d3';p.font='17px sans-serif';p.fillText(id==='archer'?'RANGER — same original character proportions':'BERSERKER — restored source anatomy and face',22,27);
 const frames=[unpack(baseline[id],baseline[id].frames[0]),unpack(current,current.frames[0])];
 frames.push(unpack(candidate,candidate.frames[0]));
 const canvases=frames.map(f=>{const c=createCanvas(f.w,f.h);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.d.buffer),f.w,f.h),0,0);return c;});
 for(let i=0;i<3;i++) {p.fillText(['Original low density','Rejected retouch','Source detail ×2'][i],22+i*320,64);p.imageSmoothingEnabled=false;p.drawImage(canvases[i],22+i*320,78,280,224);p.fillText('S1',22+i*320,338);p.drawImage(canvases[i],22+i*320,350,80,64);p.fillText('S2',120+i*320,338);p.drawImage(canvases[i],120+i*320,350,160,128);}
 writeFileSync(out+'/'+id+'-threeway.png',panel.toBuffer('image/png'));
}
