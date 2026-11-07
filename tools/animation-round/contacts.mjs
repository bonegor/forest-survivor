import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import sheets from '../../public/assets/heroes-approved/index.js';
import {unpack} from './build.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require(process.env.CANVAS_MODULE||'C:/Users/I/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
for(const [id,b] of Object.entries(sheets)) {
  const rows=[b.idle.filter((_,i)=>i%2===0),b.walk,b.attack,b.attackWalk?.[b.attackRelease]||b.attack];
  const c=createCanvas(8*240,rows.reduce((n,row)=>n+Math.ceil(row.length/8),0)*216),ctx=c.getContext('2d');
  ctx.fillStyle='#283039';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
  let rowOffset=0;
  rows.forEach((list,j)=>{
    list.forEach((k,i)=>{
      const f=unpack(b,b.frames[k]),a=createCanvas(80,64);
      a.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.d.buffer),80,64),0,0);
      const x=i%8*240,y=(Math.floor(i/8)+rowOffset)*216;
      ctx.drawImage(a,x,y,240,192);ctx.fillStyle='#e4dbbf';ctx.font='14px sans-serif';ctx.fillText(`${id}: ${['idle','walk','attack','moving release'][j]} ${i}`,x+6,y+208);
    });
    rowOffset+=Math.ceil(list.length/8);
  });
  writeFileSync(`tools/animation-round/generated/${id}-contact.png`,c.toBuffer('image/png'));
}
