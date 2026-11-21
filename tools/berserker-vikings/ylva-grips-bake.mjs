// Build the three closed-grip studies against the original native sprite.
// Only changed scanline spans are stored; the face, boots and gait stay on
// the same registration as the baseline approved for this comparison.
import { writeFileSync } from 'node:fs';
import { loadWolfCostume } from './ylva-bake.mjs';
import baseline from './ylva.js';
import { hexPack } from '../../public/js/engine/pixels.js';

const {clips,colors}=loadWolfCostume('ylva-grips.px.js');
const forward=process.argv.includes('--forward');
if(forward) loadWolfCostume('ylva-forward.px.js');
const names=forward?[['forward','Forward guard']]:[['low','Low ready'],['high','High guard'],['split','Split guard']];
const palette=baseline.palette.slice();
const ids=new Map(palette.map((color,i)=>[color,i]));
const shared=baseline.frames.map(encoded=>Buffer.from(encoded,'base64'));

function delta(frame,base) {
  const bytes=[];
  for (let y=0;y<baseline.h;y++) {
    const at=y*baseline.w;
    for (let x=0;x<baseline.w;) {
      if (frame[at+x]===base[at+x]) { x++; continue; }
      const start=x++;
      while (x<baseline.w && frame[at+x]!==base[at+x]) x++;
      bytes.push(y,start,x-start,...frame.subarray(at+start,at+x));
    }
  }
  return Buffer.from(bytes).toString('base64');
}

const options=names.map(([id,name])=>{
  const {box,draw}=clips['ylva-'+id];
  const deltas=Array.from({length:box.frames},(_,frame)=>{
    const image=Buffer.alloc(box.w*box.h);
    draw({frame,px(x,y,key) {
      if(!colors[key]) throw new Error('Unknown pixel '+key);
      const color=hexPack(colors[key]);
      if(!ids.has(color)) { ids.set(color,palette.length); palette.push(color); }
      image[y*box.w+x]=ids.get(color);
    }});
    return delta(image,shared[frame]);
  });
  return {id,name,deltas};
});
if(palette.length>256) throw new Error('Grip sprites exceed one-byte palette');

const source=`// Generated with node tools/berserker-vikings/ylva-grips-bake.mjs${forward?' --forward':''}.
import baseline from './ylva.js';
const palette=${JSON.stringify(palette)};
const options=${JSON.stringify(options)};
const base=baseline.frames.map(encoded=>Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)));

// Expand native paint into the game's world buffer when this option is used.
function makeSprite({id,name,deltas}) {
  let worldFrames;
  return {
    id,name,pick:'review:ylva-'+id,w:baseline.w,h:baseline.h,
    anchorY:baseline.anchorY,fitW:baseline.fitW,fitH:baseline.fitH,hires:baseline.hires,
    idle:baseline.idle,walk:baseline.walk,attack:baseline.attack,attackWalk:baseline.attackWalk,
    attackFps:baseline.attackFps,attackRelease:baseline.attackRelease,
    idleRate:baseline.idleRate,motionRate:baseline.motionRate,selfBob:true,outline:false,
    gen() {
      return worldFrames??=deltas.map((encoded,i)=>{
        const indices=base[i].slice(),raw=atob(encoded);
        for(let p=0;p<raw.length;) {
          const row=raw.charCodeAt(p++),left=raw.charCodeAt(p++),length=raw.charCodeAt(p++);
          const at=row*baseline.w+left;
          for(let x=0;x<length;x++) indices[at+x]=raw.charCodeAt(p++);
        }
        return {w:baseline.w,h:baseline.h,d:Uint32Array.from(indices,k=>palette[k])};
      });
    },
  };
}
${forward?'export const ylvaForward=makeSprite(options[0]);':'export const ylvaGrips=options.map(makeSprite);'}
`;
writeFileSync(new URL(forward?'ylva-forward.js':'ylva-grips.js',import.meta.url),source);
console.log('Baked',options.length,'Ylva grips with',shared.length,'poses each');
