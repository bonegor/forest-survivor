// Install the selected Low ready review frames verbatim and bake their
// authored fall. Importing this builder has no filesystem side effects.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ylvaGrips } from './ylva-grips.js';
import { loadWolfCostume } from './ylva-bake.mjs';
import { hexPack } from '../../public/js/engine/pixels.js';
import { HEROES } from '../../public/js/data/heroes.js';
import { moveFor } from '../../public/js/data/difficulty.js';

const worldFile = new URL('../../public/assets/heroes-approved/berserker.js',import.meta.url);
const fallFile = new URL('../../public/js/art/ylva-fall.js',import.meta.url);
const w=80,h=64,anchorY=56;

// Same transparent-margin format consumed by approved-heroes.js.
function pack(buffers) {
  const palette=[0],indices=new Map([[0,0]]);
  const frames=buffers.map(frame=>{
    let x0=frame.w,y0=frame.h,x1=-1,y1=-1;
    for(let y=0;y<frame.h;y++) for(let x=0;x<frame.w;x++) {
      if(!(frame.d[y*frame.w+x]>>>24)) continue;
      x0=Math.min(x0,x);x1=Math.max(x1,x);
      y0=Math.min(y0,y);y1=Math.max(y1,y);
    }
    if(x1<0) throw Error('Missing painted Ylva pose');
    const fw=x1-x0+1,fh=y1-y0+1;
    const pixels=Buffer.alloc(fw*fh);
    for(let y=0;y<fh;y++) for(let x=0;x<fw;x++) {
      const c=frame.d[(y+y0)*frame.w+x+x0];
      if(!indices.has(c)) {indices.set(c,palette.length);palette.push(c);}
      pixels[y*fw+x]=indices.get(c);
    }
    return [x0,y0,fw,fh,pixels.toString('base64')];
  });
  if(palette.length>256) throw Error('Ylva palette needs wider indices');
  return {palette,indexBytes:1,frames};
}

function fallModule(standing) {
  loadWolfCostume('ylva-grips.px.js');
  const {clips,colors}=loadWolfCostume('ylva-fall.px.js');
  const clip=clips['ylva-fall'];
  const poses=Array.from({length:clip.box.frames},(_,frame)=>{
    const d=new Uint32Array(w*h);
    if(frame<3) {
      for(let y=0;y<standing.h;y++) d.set(standing.d.subarray(y*standing.w,(y+1)*standing.w),(y+16)*w+16);
    } else {
      clip.draw({frame,px(x,y,key){
        if(!colors[key]) throw Error('Unknown Ylva fall color '+key);
        d[y*w+x]=hexPack(colors[key]);
      }});
    }
    return {w,h,d};
  });
  const {palette,frames}=pack(poses);
  return `// Ylva Wolf-Tooth. Authored in tools/berserker-vikings/ylva-fall.px.js.
// Rebuild with node tools/berserker-vikings/ylva-production.mjs.
import { appendDecay, departingSoul, fallFrameAt, SOUL_RELEASE } from './hero-fall.js';

const palette=${JSON.stringify(palette)};
const atlas=${JSON.stringify(frames)};
const w=${w},h=${h},anchorY=${anchorY};
const times=Array.from({length:atlas.length-1},(_,i)=>[i/20]);
function unpack([x,y,width,height,encoded]) {
  const raw=atob(encoded),d=new Uint32Array(w*h);
  for(let row=0;row<height;row++) for(let col=0;col<width;col++)
    d[(y+row)*w+x+col]=palette[raw.charCodeAt(row*width+col)];
  return {w,h,d};
}

let sequence;
export const ylvaFall={
  anchorY,outline:false,
  frameAt:seconds=>fallFrameAt(times,seconds),
  wisp:{...departingSoul,offsetX:8,offsetY:-7},
  cues:[{time:SOUL_RELEASE,sound:'souldepart'}],
  gen() {
    if(sequence) return sequence;
    const poses=atlas.map(unpack),axes=poses.pop();
    appendDecay(poses,axes,anchorY-1);
    poses[poses.length-1]=axes;
    return (sequence=poses);
  },
};
`;
}

export function buildYlvaProduction() {
  const selected=ylvaGrips[0];
  if(selected.id!=='low') throw Error('Expected the selected Low ready carry');
  const buffers=selected.gen(),hash=createHash('sha256');
  for(const frame of buffers) hash.update(new Uint8Array(frame.d.buffer,frame.d.byteOffset,frame.d.byteLength));
  const speed=Math.max(.6,Math.min(1.6,moveFor('s15','easy')*(HEROES.berserker.stats.speed||1)));
  const world={
    design:'ylva-wolf-tooth-low-ready',source:'tools/berserker-vikings/ylva-grips.px.js',
    sha256:hash.digest('hex'),w:selected.w,h:selected.h,anchorY:selected.anchorY,hires:1,
    idle:selected.idle,walk:selected.walk,attack:selected.attack,attackWalk:selected.attackWalk,
    attackRelease:selected.attackRelease,attackFps:selected.attackFps,
    walkFps:selected.motionRate*7*1.4*speed,idleFps:selected.idleRate*1.6,
    floating:false,manualDelay:2/12,motionSource:'tools/animation-round/ranger-walk.mjs',
    ...pack(buffers),
  };
  const fall=fallModule(buffers[selected.idle[0]]);
  writeFileSync(worldFile,'// Ylva Wolf-Tooth. Rebuild with node tools/berserker-vikings/ylva-production.mjs.\nexport default '+JSON.stringify(world)+';\n');
  writeFileSync(fallFile,fall);
  return world;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const world=buildYlvaProduction();
  console.log('Baked '+world.frames.length+' Ylva poses, a braced fall and the two grounded axes');
}
