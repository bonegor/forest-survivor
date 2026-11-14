import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {unpack} from './build.mjs';
const require=createRequire(import.meta.url),{createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const root='output/hero-round2-2026-11-14/hero-art';
for(const id of ['archer','berserker']) {
 const data=(await import(pathToFileURL(resolve('public/assets/heroes-approved/'+id+'.js')))).default;
 const list=[['Rest',0],...data.idle.filter((_,i)=>i%4===0).map((n,i)=>['Idle '+i*4,n]),...data.walk.filter((_,i)=>i%2===0).map((n,i)=>['Walk '+i*2,n]),...data.attack.map((n,i)=>['Attack '+i,n]),...data.attackWalk.filter((_,i)=>i%2===0).flatMap((row,a)=>row.filter((_,i)=>i%4===0).map((n,i)=>['Moving '+a*2+'/'+i*4,n]))];
 const cols=8,cw=240,ch=250,c=createCanvas(cols*cw,Math.ceil(list.length/cols)*ch),ctx=c.getContext('2d');ctx.fillStyle='#1a2426';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#e7e1cd';ctx.font='17px sans-serif';ctx.imageSmoothingEnabled=false;
 list.forEach(([label,n],i)=>{const f=unpack(data,data.frames[n]),s=createCanvas(f.w,f.h);s.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.d.buffer),f.w,f.h),0,0);const x=i%cols*cw,y=Math.floor(i/cols)*ch;ctx.fillText(label,x+10,y+22);ctx.drawImage(s,40,34,80,80,x+20,y+30,200,200);});
 writeFileSync(root+'/'+id+'-all-states.png',c.toBuffer('image/png'));
}
