import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import data from '../../public/assets/heroes-authored/eanasir.js';
import {unpack} from '../animation-round/build.mjs';
const require=createRequire(import.meta.url),{createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const cols=8,cw=200,ch=280,list=[...data.walk.map((n,i)=>['Walk '+i,n]),...data.attack.map((n,i)=>['Attack '+i,n]),...data.attackWalk.map((row,i)=>['Moving '+i+'/6',row[6]]),...data.idle.filter((n,i)=>i%4===0).map((n,i)=>['Idle '+i*4,n])];
const c=createCanvas(cols*cw,Math.ceil(list.length/cols)*ch),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#1d272b';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#ebe2cf';ctx.font='17px sans-serif';
list.forEach(([label,n],i)=>{const f=unpack(data,data.frames[n]),b=createCanvas(f.w,f.h);b.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.d.buffer),f.w,f.h),0,0);const x=i%cols*cw,y=Math.floor(i/cols)*ch;ctx.fillText(label,x+8,y+24);ctx.drawImage(b,36,18,96,100,x,y+30,192,200);});
writeFileSync('output/hero-round2-2026-11-14/eanasir-art/eanasir-motion-contacts.png',c.toBuffer('image/png'));
