// Continuous source-texture locomotion for the six robed heroes and two spectres.
// Source ownership is retained beside the builder; no external art workspace is needed.
import { readFileSync } from 'node:fs';
import { readPng } from '../png.mjs';
const root=new URL('./baseline/robed-walk/',import.meta.url);
const models=JSON.parse(readFileSync(new URL('models.json',root),'utf8'));
const TAU=Math.PI*2, clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>(t=clamp(t),t*t*(3-2*t));
const mix=(a,b,t)=>a+(b-a)*t;
export const ROBED_WALK={
  mage:{frames:16,cycleSeconds:.50,speed:59.5056,lift:2.4,hem:1.0,lag:.65,note:'Measured robe-covered steps, connected ivory hem response and rigid lantern/grip.'},
  necromancer:{frames:16,cycleSeconds:.48,speed:59.5056,lift:2.2,hem:1.15,lag:.95,note:'Short deliberate steps beneath the feathered robe; book, crow and hood retain one model.'},
  druid:{frames:16,cycleSeconds:.44,speed:59.5056,lift:2.5,hem:.8,lag:.7,note:'Alternating full leather boot/calf ownership beneath a delayed leafy skirt; continuous staff.'},
  thornkeeper:{frames:16,cycleSeconds:.44,speed:59.5056,lift:2.3,hem:.85,lag:.85,exportSpecks:[[45,53]],note:'Compact woodland stride with delayed split coat and a stable staff grip.'},
  gravebinder:{frames:16,cycleSeconds:.46,speed:59.5056,lift:2.3,hem:1.0,lag:1.1,note:'Full original bone greave follows the boot under layered violet cloth; no detached kneecap.'},
  arcanist:{frames:16,cycleSeconds:.50,speed:59.5056,lift:2.6,hem:.9,lag:.8,note:'Hidden alternating boot support, weighted robe and intact staff; hat moves with the head.'},
  rogue:{frames:16,cycleSeconds:.92,float:true,lift:1.15,hem:1.6,lag:.85,note:'One stable travelling hood and dagger, with continuous trailing spectral cloth waves.'},
  wraith:{frames:16,cycleSeconds:1.25,float:true,lift:1.1,hem:1.45,lag:1.05,note:'Continuous hovering torso and delayed shroud; no stepping or last-to-first drop.'},
};
// Opt-in restrained pass. Shorter support travel also shortens the cycle, so
// planted soles cover exactly the same world distance rather than skating.
// Spectres intentionally retain their existing continuous hovering cycle.
export const ROBED_WALK_V2={
  mage:{...ROBED_WALK.mage,cycleSeconds:.40,lift:.9,roll:.03,hem:.78,hemLift:.72,bob:0,note:'Restrained short steps with one-pixel local hem transfer, low foot clearance and a steady lantern grip.'},
  necromancer:{...ROBED_WALK.necromancer,cycleSeconds:.39,lift:.8,roll:.025,hem:.45,hemLift:.2,bob:0,note:'Small measured boot returns under a quiet robe; stable book, crow and hood.'},
  druid:{...ROBED_WALK.druid,cycleSeconds:.37,lift:.95,roll:.03,hem:.4,hemLift:.18,bob:0,note:'Short low leather-boot steps under a stable leafy skirt and continuous staff.'},
  thornkeeper:{...ROBED_WALK.thornkeeper,cycleSeconds:.37,lift:.85,roll:.03,hem:.4,hemLift:.18,bob:0,note:'Restrained woodland gait with low boot clearance, quiet coat and stable staff.'},
  gravebinder:{...ROBED_WALK.gravebinder,cycleSeconds:.38,lift:.85,roll:.025,hem:.45,hemLift:.2,bob:0,note:'Small connected greave steps below quiet violet cloth; steady hood and staff.'},
  arcanist:{...ROBED_WALK.arcanist,cycleSeconds:.40,lift:1,roll:.03,hem:.78,hemLift:.72,bob:0,note:'Short low boot returns with one-pixel local hem transfer beneath a rigid hat, head and staff.'},
};
const inside=(poly,x,y)=>{let b=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],c=poly[j];if((a[1]>y)!==(c[1]>y)&&x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;};
const textureCache=new Map();
function textures(id){
  if(!textureCache.has(id))textureCache.set(id,models[id].layers.map(l=>readPng(new URL(l.file,root))));
  return textureCache.get(id);
}
function paletteMap(palette){
  const known=new Set(palette),cache=new Map(),solid=palette.filter(c=>c>>>24>=128);
  return c=>{
    if((c>>>24)<128)return 0;if(known.has(c))return c;if(cache.has(c))return cache.get(c);
    let best=solid[0],score=Infinity;
    for(const q of solid){const d=((c&255)-(q&255))**2+((c>>>8&255)-(q>>>8&255))**2+((c>>>16&255)-(q>>>16&255))**2+((c>>>24)-(q>>>24))**2;if(d<score){score=d;best=q;}}
    cache.set(c,best);return best;
  };
}
function sample(frame,x,y){x=Math.floor(x);y=Math.floor(y);return x>=0&&y>=0&&x<frame.w&&y<frame.h?frame.d[y*frame.w+x]:0;}
// Every planted sole travels backward at the normal gameplay speed. The return
// uses a continuous lifted arc; the second boot is exactly half a cycle apart.
export function robedFoot(phase,rig){
  const p=(phase%1+1)%1,reach=rig.speed*rig.cycleSeconds/4;
  if(p<.5)return {x:reach-4*reach*p,lift:0,support:true,roll:0};
  const t=(p-.5)*2;
  return {x:mix(-reach,reach,smooth(t)),lift:rig.lift*Math.sin(Math.PI*t),support:false,roll:(rig.roll??.13)*Math.sin(TAU*t)};
}
function warpNative(frame,field){
  const d=new Uint32Array(frame.d.length);
  for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++){
    let sx=x,sy=y;for(let n=0;n<4;n++){const [dx,dy]=field(sx,sy);sx=x-dx;sy=y-dy;}
    const xx=Math.round(sx),yy=Math.round(sy);if(xx>=0&&yy>=0&&xx<frame.w&&yy<frame.h)d[y*frame.w+x]=frame.d[yy*frame.w+xx];
  }return {...frame,d};
}
function floatWalk(id,rig,travel){
  const frames=[],poses=[];
  for(let i=0;i<rig.frames;i++){
    const phase=i/rig.frames,ph=phase*TAU,bob=-2-Math.round(rig.lift*(.5-.5*Math.cos(ph)));
    const frame=warpNative(travel,(x,y)=>{
      // Head, eye and dagger translate as one rigid mass. The delayed wave is
      // confined to trailing cloth behind the shoulder and below the chest.
      const tail=smooth((40-x)/17)*smooth((y-30)/9),hem=smooth((y-41)/13)*smooth((45-x)/13);
      return [tail*.65*Math.sin(ph-rig.lag)+(hem*.45)*Math.sin(ph*2-1.7),
        bob+tail*rig.hem*Math.sin(ph-(40-x)*.14)+hem*.65*Math.sin(ph-1.5)];
    });
    frames.push(frame);poses.push({phase,bob,kind:'hover'});
  }
  return {frames,lowerFrames:frames,fps:rig.frames/rig.cycleSeconds,poses,settings:rig};
}
export function buildRobedWalk(id,palette,standing,travel=standing,options={}){
  const rig=options.version==='v2'?(ROBED_WALK_V2[id]||ROBED_WALK[id]):ROBED_WALK[id];if(!rig)return null;
  if(rig.float)return floatWalk(id,rig,travel);
  const model=models[id],layers=textures(id),map=paletteMap(palette),{scale,pivot}=model;
  const native={w:80,h:64,d:new Uint32Array(80*64)},protectedPixels=new Uint8Array(80*64),staffPixels=new Uint8Array(80*64);
  const protection=model.garment?.protectPolygons||[];
  for(let y=0;y<64;y++)for(let x=0;x<80;x++){
    const sx=(x+.5-40)/scale+pivot[0],sy=(y+.5-56)/scale+pivot[1],p=y*80+x;
    // Preserve the accepted native colour/alpha everywhere foreground ownership
    // exists. Sampling source resolution is confined to the moving leg textures.
    if(sample(layers[0],sx,sy)>>>24>=16)native.d[p]=standing.d[p];
    if(protection.some(poly=>inside(poly,sx,sy)))protectedPixels[p]=1;
    // These source rectangles own the complete foreground shaft, never the
    // separately extracted legs. Remove it before layering moving boots.
    const staff= id==='necromancer'?null:id==='arcanist'?[[47,0],[67,0],[67,341],[47,341]]:model.protectedPolygons[0];
    if(staff&&inside(staff,sx,sy))staffPixels[p]=1;
  }
  // Reviewed source-export residue beside Thornkeeper's staff: a faint pixel
  // at alpha59, outside the staff/boots. Coloured foliage is untouched.
  for(const [x,y]of rig.exportSpecks||[])if((native.d[y*80+x]>>>24)<128)native.d[y*80+x]=0;
  const staffFree={...native,d:native.d.map((c,i)=>staffPixels[i]?0:c)};
  const frames=[],lowerFrames=[],poses=[];
  const centre=40+(model.centreX-pivot[0])*scale;
  for(let i=0;i<rig.frames;i++){
    const phase=i/rig.frames,ph=phase*TAU,motions=model.legs.map(l=>robedFoot(phase+l.phaseOffset,rig));
    // Compression after each contact, rising through the passing pose. Whole
    // upper body/equipment shares this one-pixel weight transfer.
    const bob=-Math.round(Math.sin(ph)**2*(rig.bob??.85)),d=new Uint32Array(80*64);
    for(const k of [1,0]){
      const motion=motions[k],leg=model.legs[k],source=layers[k+1],angle=motion.roll,cs=Math.cos(angle),sn=Math.sin(angle);
      const anchorX=centre+motion.x,anchorY=56+(model.floorY-pivot[1])*scale-motion.lift;
      for(let y=40;y<60;y++)for(let x=16;x<65;x++){
        const dx=x+.5-anchorX,dy=y+.5-anchorY;
        const sx=(dx*cs+dy*sn)/scale+leg.pivotX,sy=(-dx*sn+dy*cs)/scale+model.floorY;
        const c=map(sample(source,sx,sy));if(c)d[y*80+x]=c;
      }
    }
    const garment=model.garment,waist=56+(garment.startY-pivot[1])*scale;
    const hem=56+(garment.endY-pivot[1])*scale;
    const clothField=(x,y)=>{
      const p=Math.max(0,Math.min(5119,Math.round(y)*80+Math.round(x)));
      if(protectedPixels[p])return [0,bob];
      const vertical=smooth((y-waist)/(hem-waist)),side=Math.exp(-(((x-centre)/10)**2));
      // Local cloth displacement grows from its sewn waist and trails the legs.
      return [vertical*side*rig.hem*Math.sin(ph-rig.lag),
        bob-vertical*side*(rig.hemLift??.55)*(.5-.5*Math.cos(ph*2-rig.lag))];
    };
    const lower=d.slice(),fore=warpNative(native,clothField),lowerFore=warpNative(staffFree,clothField);
    for(let p=0;p<d.length;p++)if(fore.d[p])d[p]=fore.d[p];
    for(let p=0;p<lower.length;p++)if(lowerFore.d[p])lower[p]=lowerFore.d[p];
    frames.push({w:80,h:64,d});lowerFrames.push({w:80,h:64,d:lower,staffFree:true});
    poses.push({phase,bob,boots:motions,kind:'walk'});
  }
  return {frames,lowerFrames,fps:rig.frames/rig.cycleSeconds,poses,settings:rig};
}
