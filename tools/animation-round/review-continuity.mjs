// Independent full-combination review, not an art generation step.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import sheets from '../../public/assets/heroes-approved/index.js';
import {unpack} from './build.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const alphaThreshold=Number(process.env.REVIEW_ALPHA||1);
const root=process.env.REVIEW_OUT||'output/animation-round/critical-pass';mkdirSync(root,{recursive:true});
function components(b){
 const seen=new Uint8Array(b.d.length),out=[];
 for(let i=0;i<b.d.length;i++){
  if(seen[i]||(b.d[i]>>>24)<alphaThreshold)continue;
  const todo=[i],pixels=[];seen[i]=1;
  while(todo.length){let p=todo.pop(),x=p%b.w,y=Math.floor(p/b.w);pixels.push([x,y]);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*b.w+xx;if(xx<0||yy<0||xx>=b.w||yy>=b.h||seen[q]||(b.d[q]>>>24)<alphaThreshold)continue;seen[q]=1;todo.push(q);}
  }
  out.push({size:pixels.length,box:[Math.min(...pixels.map(p=>p[0])),Math.min(...pixels.map(p=>p[1])),Math.max(...pixels.map(p=>p[0])),Math.max(...pixels.map(p=>p[1]))]});
 }
 return out.sort((a,b)=>b.size-a.size);
}
const report={},suspects=[];
const idleBoards=[];
let heroNumber=0;
for(const [id,data] of Object.entries(sheets)){
 const buffers=data.frames.map(frame=>unpack(data,frame));
 const boardIndex=Math.floor(heroNumber/3),slot=heroNumber%3;
 if(!idleBoards[boardIndex]){const c=createCanvas(1280,3*312);const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#26313a';ctx.fillRect(0,0,c.width,c.height);idleBoards[boardIndex]=c;}
 const ic=idleBoards[boardIndex].getContext('2d');ic.fillStyle='#e7dfc7';ic.font='15px sans-serif';ic.fillText(`${id}: complete idle cycle, 16 phases`,8,slot*312+17);
 data.idle.forEach((index,k)=>{const b=buffers[index],tile=createCanvas(b.w,b.h);tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(b.d.buffer),b.w,b.h),0,0);const x=k%8*160,y=slot*312+24+Math.floor(k/8)*144;ic.drawImage(tile,x,y,160,128);ic.fillStyle='#7c8791';ic.font='11px sans-serif';ic.fillText(String(k),x+4,y+139);});
 heroNumber++;
 const clips={idle:data.idle.map((index,k)=>({index,k})),walk:data.walk.map((index,k)=>({index,k})),attack:data.attack.map((index,k)=>({index,k})),moving:(data.attackWalk||[]).flatMap((row,k)=>row.map((index,step)=>({index,k,step})))};
 report[id]={};
 for(const [motion,list] of Object.entries(clips)){
  report[id][motion]=list.map(pose=>{const cc=components(buffers[pose.index]);const low=cc.slice(1).filter(c=>c.box[1]>=46);if(low.length)suspects.push({id,motion,...pose,low});return{...pose,components:cc};});
 }
 const low=Object.entries(report[id]).flatMap(([motion,poses])=>poses.filter(p=>p.components.slice(1).some(c=>c.box[1]>=46)).map(p=>({motion,...p})));
 if(low.length){
  const c=createCanvas(240*8,220*Math.ceil(low.length/8)),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#26313a';ctx.fillRect(0,0,c.width,c.height);
  for(let n=0;n<low.length;n++){const p=low[n],b=buffers[p.index],tile=createCanvas(b.w,b.h);tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(b.d.buffer),b.w,b.h),0,0);const x=n%8*240,y=Math.floor(n/8)*220;ctx.drawImage(tile,x,y,b.w*3,b.h*3);ctx.fillStyle='#e7dfc7';ctx.font='13px sans-serif';ctx.fillText(`${id} ${p.motion} ${p.k}/${p.step??'-'}`,x+6,y+211);}
  writeFileSync(`${root}/${id}-lower-islands.png`,c.toBuffer('image/png'));
  const worst=low.filter(p=>p.motion==='moving').sort((a,b)=>Math.max(...b.components.slice(1).map(c=>c.size))-Math.max(...a.components.slice(1).map(c=>c.size)))[0];
  if(worst){
   const focus=createCanvas(320*3,288),fc=focus.getContext('2d');fc.imageSmoothingEnabled=false;fc.fillStyle='#26313a';fc.fillRect(0,0,focus.width,focus.height);
   const states=[['walk',data.walk[worst.step]],['attack',data.attack[worst.k]],['moving',worst.index]];
   states.forEach(([name,index],n)=>{const b=buffers[index],tile=createCanvas(b.w,b.h);tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(b.d.buffer),b.w,b.h),0,0);fc.drawImage(tile,n*320,0,320,256);fc.fillStyle='#e7dfc7';fc.font='15px sans-serif';fc.fillText(`${id} ${name} attack${worst.k}/gait${worst.step}`,n*320+6,277);});
   fc.strokeStyle='#f06c72';fc.lineWidth=1;for(const comp of worst.components.slice(1)){const[x0,y0,x1,y1]=comp.box;fc.strokeRect(640+x0*4-2,y0*4-2,(x1-x0+1)*4+4,(y1-y0+1)*4+4);}
   writeFileSync(`${root}/${id}-focus.png`,focus.toBuffer('image/png'));
  }
 }
}
writeFileSync(`${root}/components.json`,JSON.stringify(report,null,2));
writeFileSync(`${root}/lower-islands.json`,JSON.stringify(suspects,null,2));
idleBoards.forEach((c,n)=>writeFileSync(`${root}/complete-idles-${n+1}.png`,c.toBuffer('image/png')));
console.log(JSON.stringify(Object.fromEntries(Object.keys(sheets).map(id=>[id,suspects.filter(s=>s.id===id).reduce((out,s)=>{out[s.motion]=(out[s.motion]||0)+1;return out;},{})])),null,2));
