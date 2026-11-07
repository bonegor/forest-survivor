// Exhaustive readable pages for independent anatomy/equipment review.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sheets from '../../public/assets/heroes-approved/index.js';
import {unpack} from './build.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const tag=process.argv[2]||'matrix-final',ids=process.argv.slice(3);
const root=`output/animation-round/${tag}`;mkdirSync(root,{recursive:true});
const report={};
for(const [id,data] of Object.entries(sheets)){
 if(ids.length&&!ids.includes(id))continue;
 const frames=data.frames.map(frame=>{const b=unpack(data,frame),c=createCanvas(b.w,b.h);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(b.d.buffer),b.w,b.h),0,0);return c;});
 const rows=data.attackWalk||data.attack.map(index=>[index]);
 let poses=0;
 for(let start=0;start<rows.length;start+=4){
  const count=Math.min(4,rows.length-start),cols=data.attackWalk?8:1;
  const c=createCanvas(cols*160,32+count*148),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#26313a';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#e7dfc7';ctx.font='14px sans-serif';ctx.fillText(`${id} / attack ${start}–${start+count-1} × complete gait`,8,20);
  for(let row=0;row<count;row++)for(let step=0;step<rows[start+row].length;step++){
   const x=step*160,y=32+row*148,index=rows[start+row][step];
   ctx.fillStyle=step%2?'#24313c':'#293945';ctx.fillRect(x,y,160,148);ctx.drawImage(frames[index],x,y,160,128);ctx.fillStyle='#e7dfc7';ctx.font='12px sans-serif';ctx.fillText(`attack${start+row} gait${step}`,x+5,y+142);poses++;
  }
  writeFileSync(`${root}/${id}-${String(start).padStart(2,'0')}.png`,c.toBuffer('image/png'));
 }
 report[id]={attackPhases:data.attack.length,gaitPhases:data.walk.length,movingPoses:poses,floating:!!data.floating,sourceHash:createHash('sha256').update(JSON.stringify(data)).digest('hex')};
}
writeFileSync(`${root}/coverage.json`,JSON.stringify(report,null,2));console.log(root);
