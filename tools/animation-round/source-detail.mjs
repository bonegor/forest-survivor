// Recover the original, coherent character model at two source pixels per world
// pixel. The face is never replaced or enlarged relative to its body. All raw
// attacks retain their authored source geometry; the connected gait keeps the
// exact same logical joints, foot contacts and timing as the native-density rig.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readPng} from '../png.mjs';
import {buildGroundedWalk,GROUNDED_MODELS} from './grounded-walk.mjs';
const D=2,W=160,H=128,cache=new Map();
const sourceHeroes=new Set(['archer','berserker']);
function read(path) {if(!cache.has(path))cache.set(path,readPng(path));return cache.get(path);}
const quant=(v,step=4)=>Math.min(255,Math.round(v/step)*step);
// Area filtering preserves the original pixel-art planes without repeated
// nearest-neighbour decimation losing a brow, chin or diagonal leather strap.
export function reduceSource(image,rect,pivot,scale) {
 const d=new Uint32Array(W*H),[rx,ry,rw,rh]=rect,s=scale*D;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
  const left=(x-80)/s+pivot[0],top=(y-112)/s+pivot[1],right=left+1/s,bottom=top+1/s;
  let red=0,green=0,blue=0,alpha=0;
  for(let yy=Math.max(0,Math.floor(top));yy<Math.min(rh,Math.ceil(bottom));yy++)for(let xx=Math.max(0,Math.floor(left));xx<Math.min(rw,Math.ceil(right));xx++) {
   const c=image.d[(yy+ry)*image.w+xx+rx],a=(c>>>24)*Math.max(0,Math.min(xx+1,right)-Math.max(xx,left))*Math.max(0,Math.min(yy+1,bottom)-Math.max(yy,top));
   alpha+=a;red+=(c&255)*a;green+=(c>>>8&255)*a;blue+=(c>>>16&255)*a;
  }
  const a=quant(alpha*s*s,16);if(a<32)continue;
  d[y*W+x]=(a<<24|quant(blue/alpha)<<16|quant(green/alpha)<<8|quant(red/alpha))>>>0;
 }
 return {w:W,h:H,d};
}
function warp(frame,field) {
 const d=new Uint32Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
  let sx=x,sy=y;
  for(let n=0;n<3;n++){const [dx,dy]=field(sx/D,sy/D);sx=x-dx*D;sy=y-dy*D;}
  const xx=Math.round(sx),yy=Math.round(sy);if(xx>=0&&xx<W&&yy>=0&&yy<H)d[y*W+x]=frame.d[yy*W+xx];
 }
 return {w:W,h:H,d};
}
function movingAttack(attack,lower,id,attackStep) {
 const d=lower.d.slice(),seam=48*D;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
  const p=y*W+x,c=attack.d[p];
  if(y<seam){d[p]=c;continue;}
  if(id==='berserker') {
   const r=c&255,g=c>>>8&255,b=c>>>16&255;
   const metal=Math.max(r,g,b)>100&&Math.max(r,g,b)-Math.min(r,g,b)<85&&b>=r*.7&&b>=g*.8;
   if((x/D<32||x/D>44)&&metal&&c>>>24>=128)d[p]=c;
  }
  // The final Ranger pose settles the bow back into its original lowered guard.
  // Its bow tip is outside the leg tracks and belongs to this active equipment.
  if(id==='archer'&&attackStep===4&&x/D>=43&&x/D<48&&y/D<52&&c>>>24>=128)d[p]=c;
 }
 return {w:W,h:H,d};
}
export function sourceDetail(id,{base,frames,idle,walk,attack,attackWalk,idleField,version='v1'}) {
 if(!sourceHeroes.has(id)||version!=='v1')return null;
 const folder='tools/animation-round/baseline/detail-models/'+id;
 const metadata=JSON.parse(readFileSync(folder+'/metadata.json','utf8')),config=GROUNDED_MODELS[id];
 const sourcePath='tools/animation-round/baseline/grounded-models/'+config.source,source=read(sourcePath);
 const standing=reduceSource(source,[0,0,source.w,source.h],config.pivot,config.scale);
 const canonical=[standing,...metadata.rawFrameSources.map((file,i)=>reduceSource(read(folder+'/'+file),metadata.rawFrameRects[i],metadata.rawPivots[i],metadata.rawFrameScales[i]))];
 if(canonical.length!==base.frames.length)throw Error(id+' canonical source frame count changed');
 const detailed=Array(frames.length);canonical.forEach((frame,i)=>detailed[i]=frame);
 idle.forEach((index,i)=>detailed[index]=warp(standing,idleField(i)));
 const gait=buildGroundedWalk(id,base.palette,standing,{version,density:D});
 walk.forEach((index,i)=>detailed[index]=gait.frames[i]);
 attackWalk.forEach((row,a)=>row.forEach((index,step)=>detailed[index]=movingAttack(detailed[attack[a]],gait.lowerFrames[step],id,a)));
 if(detailed.includes(undefined))throw Error(id+' source detail has an unassigned frame');
 return {frames:detailed,gait,metadata:{w:W,h:H,anchorY:112,hires:D,
  clarityRevision:'source-model-detail-2026-11-14',claritySource:'tools/animation-round/source-detail.mjs',
  sourceModelSha256:createHash('sha256').update(readFileSync(sourcePath)).digest('hex'),
  motionNotes:'Original face, anatomy, hair, cloth and equipment at 2× source density; sixteen connected logical gait phases and original authored attacks. World footprint and all impact timings preserved.'}};
}
