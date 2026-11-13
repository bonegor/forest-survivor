// Complete chronological gaits drawn from the approved model's own leg textures.
// Character identity/equipment are native pixels; only the connected limbs articulate.
import { readFileSync } from 'node:fs';
import { readPng } from '../png.mjs';
import { groundedV2Config } from './grounded-walk-v2.mjs';

export const GROUNDED_MODELS = JSON.parse(readFileSync(new URL('./baseline/grounded-models/models.json', import.meta.url), 'utf8'));
const TAU=Math.PI*2,clamp=t=>Math.max(0,Math.min(1,t)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>(t=clamp(t),t*t*(3-2*t));
const cache=new Map();
function inside(x,y,poly) {
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
function distance(x,y,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1));
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
}
const owns=(x,y,poly,pad=0)=>inside(x,y,poly)||poly.some((a,i)=>distance(x,y,a,poly[(i+1)%poly.length])<=pad);

// A stance sole moves backwards at constant speed. The lifted return is one
// continuous arc, with its knee following before the boot reaches contact.
export function groundedFoot(phase,motion) {
  const t=((phase%1)+1)%1,{support,reach,lift}=motion;
  if(t<support)return {x:mix(reach,-reach,t/support),lift:0,support:true,phase:t};
  const u=(t-support)/(1-support);
  return {x:mix(-reach,reach,smooth(u)),lift:Math.sin(Math.PI*u)*lift,support:false,phase:t};
}

function knee(hip,ankle,upper,lower,support,motion) {
  const dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],d=Math.max(.01,Math.hypot(dx,dy));
  // The pelvis stays in the approved character. Small extra reach comes from
  // extending the knee, not stretching the whole torso or moving a detached boot.
  const reach=Math.max(1,d/(upper+lower-.05));upper*=reach;lower*=reach;
  const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const bend=motion?.version==='v2'?(support?motion.kneeSupport:motion.kneeReturn):(support?.62:1);
  const deflection=motion?.version==='v2'?Math.min(height*bend,motion.kneeLimit):height*bend;
  return [hip[0]+dx/d*along+dy/d*deflection,hip[1]+dy/d*along-dx/d*deflection];
}
function bone(p,a,b,c,d,scale) {
  const ax=b[0]-a[0],ay=b[1]-a[1],al=Math.hypot(ax,ay),bx=d[0]-c[0],by=d[1]-c[1],bl=Math.hypot(bx,by);
  const px=p[0]-a[0],py=p[1]-a[1],along=(px*ax+py*ay)/(al*al),cross=(-px*ay+py*ax)/al*scale;
  return [c[0]+bx*along-by/bl*cross,c[1]+by*along+bx/bl*cross];
}
function vertex(p,leg,target,scale) {
  const u=bone(p,leg.hip,leg.knee,target.hip,target.knee,scale),v=bone(p,leg.knee,leg.ankle,target.knee,target.ankle,scale);
  const blend=smooth((p[1]-leg.knee[1]+10)/20),foot=smooth((p[1]-leg.ankle[1]+7)/14);
  const q=[mix(u[0],v[0],blend),mix(u[1],v[1],blend)];
  const x=(p[0]-leg.ankle[0])*scale*leg.footSign*.85,y=(p[1]-leg.ankle[1])*scale;
  const cs=Math.cos(target.roll),sn=Math.sin(target.roll);
  return [mix(q[0],target.ankle[0]+x*cs-y*sn,foot),mix(q[1],target.ankle[1]+x*sn+y*cs,foot)];
}
function triangle(out,texture,uv,pts) {
  const [a,b,c]=pts,det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(det)<1e-8)return;
  const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(79,Math.ceil(Math.max(a[0],b[0],c[0])));
  const y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(63,Math.ceil(Math.max(a[1],b[1],c[1])));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
    const px=x+.5,py=y+.5,u=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/det;
    const v=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/det,w=1-u-v;
    if(Math.min(u,v,w)<-1e-7)continue;
    const sx=Math.floor(uv[0][0]*u+uv[1][0]*v+uv[2][0]*w),sy=Math.floor(uv[0][1]*u+uv[1][1]*v+uv[2][1]*w);
    if(sx<0||sx>=texture.w||sy<0||sy>=texture.h)continue;
    const color=texture.d[sy*texture.w+sx];if(color>>>24>=128)out[y*80+x]=color;
  }
}
function renderLeg(out,leg,target,scale) {
  // The original still hides parts of each thigh behind equipment. Draw the
  // complete connected material underneath first, then preserve its visible
  // original texture. Newly exposed joints must not inherit a sword-shaped hole.
  const outline=leg.material.outline;
  const segment=(a,b,wa,wb,color)=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
    for(let y=Math.max(0,Math.floor(Math.min(a[1],b[1])-wa-1));y<=Math.min(63,Math.ceil(Math.max(a[1],b[1])+wb+1));y++)
      for(let x=Math.max(0,Math.floor(Math.min(a[0],b[0])-wa-1));x<=Math.min(79,Math.ceil(Math.max(a[0],b[0])+wb+1));x++) {
        const t=clamp(((x+.5-a[0])*dx+(y+.5-a[1])*dy)/(len||1)),r=mix(wa,wb,t);
        const dist=Math.hypot(x+.5-a[0]-t*dx,y+.5-a[1]-t*dy);
        if(dist<=r)out[y*80+x]=dist>r-.65?outline:color;
      }
  };
  segment(target.hip,target.knee,1.45,1.35,leg.material.thigh);
  segment(target.knee,target.ankle,1.3,1.15,leg.material.shin);
  // A boot is a solid heel-to-toe form, not a separate texture fragment below
  // a subpixel ankle. Keep a level sole through support and roll the return.
  const boot=[[-1.15,-.7],[1.05,-.7],[1.25,Math.max(.5,leg.soleDepth-.8)],[2.65,Math.max(.6,leg.soleDepth-.6)],[2.65,leg.soleDepth],[-1.15,leg.soleDepth]];
  const cs=Math.cos(target.roll),sn=Math.sin(target.roll),poly=boot.map(([x,y])=>[target.ankle[0]+x*cs-y*sn,target.ankle[1]+x*sn+y*cs]);
  for(let y=Math.max(0,Math.floor(target.ankle[1]-2));y<=Math.min(63,Math.ceil(target.ankle[1]+leg.soleDepth+1));y++)
    for(let x=Math.max(0,Math.floor(target.ankle[0]-3));x<=Math.min(79,Math.ceil(target.ankle[0]+4));x++)
      if(inside(x+.5,y+.5,poly))out[y*80+x]=y+.5>target.ankle[1]+leg.soleDepth-.7?outline:leg.material.boot;
  const grid=5,x0=Math.min(...leg.polygon.map(p=>p[0]))-3,x1=Math.max(...leg.polygon.map(p=>p[0]))+3;
  const y0=Math.min(...leg.polygon.map(p=>p[1]))-3,y1=Math.max(...leg.polygon.map(p=>p[1]))+3;
  for(let y=y0;y<y1;y+=grid)for(let x=x0;x<x1;x+=grid) {
    const uv=[[x,y],[x+grid,y],[x+grid,y+grid],[x,y+grid]],pts=uv.map(p=>vertex(p,leg,target,scale));
    triangle(out,leg.texture,[uv[0],uv[1],uv[2]],[pts[0],pts[1],pts[2]]);
    triangle(out,leg.texture,[uv[0],uv[2],uv[3]],[pts[0],pts[2],pts[3]]);
  }
  // Every stance shares the registered floor. Rounded joint contours and a
  // returning toe's rotation must never punch a stray pixel through that plane.
  out.fill(0,56*80);
}
function paletteMapper(palette) {
  const known=new Set(palette),memo=new Map(),solid=palette.filter(c=>c>>>24>=128);
  return color=>{
    if(!(color>>>24))return 0;if(known.has(color))return color;if(memo.has(color))return memo.get(color);
    let best=solid[0],score=Infinity;
    for(const q of solid) {
      if(color>>>24>=200&&q>>>24<200)continue;
      const d=((color&255)-(q&255))**2+((color>>>8&255)-(q>>>8&255))**2+((color>>>16&255)-(q>>>16&255))**2+((color>>>24)-(q>>>24))**2;
      if(d<score){best=q;score=d;}
    }
    memo.set(color,best);return best;
  };
}
function removeOutlineCrumbs(d) {
  const seen=new Uint8Array(d.length);
  for(let p=0;p<d.length;p++) {
    if(seen[p]||d[p]>>>24<128)continue;
    const q=[p];seen[p]=1;let top=64,bright=0;
    for(let i=0;i<q.length;i++) {
      const n=q[i],x=n%80,y=Math.floor(n/80),c=d[n];top=Math.min(top,y);bright=Math.max(bright,c&255,c>>>8&255,c>>>16&255);
      for(let yy=Math.max(0,y-1);yy<=Math.min(63,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(79,x+1);xx++) {
        const k=yy*80+xx;if(seen[k]||d[k]>>>24<128)continue;seen[k]=1;q.push(k);
      }
    }
    if(top>=44&&q.length<=2&&bright<112)for(const n of q)d[n]=0;
  }
}
function over(c,b) {
  const a=(c>>>24)/255;if(!a)return b;if(a===1||!(b>>>24))return c;
  const ba=(b>>>24)/255,outA=a+ba*(1-a),channel=n=>Math.round((((c>>>n)&255)*a+((b>>>n)&255)*ba*(1-a))/outA);
  return (Math.round(outA*255)<<24|channel(16)<<16|channel(8)<<8|channel(0))>>>0;
}
function prepare(config,source,foregroundImage) {
  const lowerPoints=config.clear.flat(),bounds={
    x0:Math.min(...lowerPoints.map(p=>p[0]))-8,x1:Math.max(...lowerPoints.map(p=>p[0]))+8,
    y0:Math.min(...lowerPoints.map(p=>p[1]))-2,
  };
  const protect=(x,y)=>config.protect.some(p=>owns(x,y,p,1.5));
  const foreground=(x,y)=>{
    if(foregroundImage)return !!(foregroundImage.d[Math.floor(y)*foregroundImage.w+Math.floor(x)]>>>24);
    if(config.foreground)return config.foreground.some(p=>owns(x,y,p,1));
    return !(x>=bounds.x0&&x<=bounds.x1&&y>=bounds.y0)||protect(x,y);
  };
  const legs=config.legs.map(spec=>{
    const d=source.d.slice();let maxY=0,soleX=0,soleN=0;
    for(let y=0;y<source.h;y++)for(let x=0;x<source.w;x++) {
      const p=y*source.w+x;
      if(!owns(x+.5,y+.5,spec.polygon,2)||protect(x+.5,y+.5)||(config.foreground&&foreground(x+.5,y+.5)))d[p]=0;
      if(d[p]>>>24>=128)maxY=Math.max(maxY,y);
    }
    for(let y=Math.max(0,maxY-4);y<=maxY;y++)for(let x=0;x<source.w;x++)if(d[y*source.w+x]>>>24>=128){soleX+=x;soleN++;}
    const sample=(a,b,t)=>{
      const sx=Math.round(mix(a[0],b[0],t)),sy=Math.round(mix(a[1],b[1],t));
      for(let r=0;r<20;r++)for(let yy=sy-r;yy<=sy+r;yy++)for(let xx=sx-r;xx<=sx+r;xx++) {
        if(xx<0||xx>=source.w||yy<0||yy>=source.h)continue;
        const c=d[yy*source.w+xx];if(c>>>24>=220)return c;
      }
      return 0xff322a31;
    };
    const material={thigh:sample(spec.hip,spec.knee,.5),shin:sample(spec.knee,spec.ankle,.65),boot:sample(spec.knee,spec.ankle,1),outline:0xff281e29};
    return {...spec,material,texture:{...source,d},soleDepth:(maxY-spec.ankle[1]+.5)*config.scale,
      footSign:soleX/soleN<spec.ankle[0]?-.9:1,
      upper:Math.hypot(spec.knee[0]-spec.hip[0],spec.knee[1]-spec.hip[1])*config.scale,
      lower:Math.hypot(spec.ankle[0]-spec.knee[0],spec.ankle[1]-spec.knee[1])*config.scale};
  });
  return {foreground,legs};
}

export function buildTextureWalk(config,source,palette,standing,foregroundImage) {
  if(standing.w!==80||standing.h!==64)throw Error('Grounded walks require the registered 80×64 native canvas.');
  const prepared=prepare(config,source,foregroundImage),remap=paletteMapper(palette),m=config.motion;
  const foreground=new Uint32Array(80*64);
  for(let y=0;y<64;y++)for(let x=0;x<80;x++) {
    const sx=(x+.5-40)/config.scale+config.pivot[0],sy=(y+.5-56)/config.scale+config.pivot[1];
    if(y<44||(sx>=0&&sx<source.w&&sy>=0&&sy<source.h&&prepared.foreground(sx,sy)))foreground[y*80+x]=standing.d[y*80+x];
  }
  // Native export edges sometimes contain an isolated old boot/greave pixel
  // just outside the high-resolution mask. Only clean the extracted resting
  // foreground, never the newly drawn walking boots or connected equipment.
  const seen=new Uint8Array(foreground.length);
  for(let p=0;p<foreground.length;p++) {
    if(seen[p]||foreground[p]>>>24<128)continue;
    const todo=[p];seen[p]=1;let top=64;
    for(let i=0;i<todo.length;i++) {
      const n=todo[i],x=n%80,y=Math.floor(n/80);top=Math.min(top,y);
      for(let yy=Math.max(0,y-1);yy<=Math.min(63,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(79,x+1);xx++) {
        const q=yy*80+xx;if(seen[q]||foreground[q]>>>24<128)continue;seen[q]=1;todo.push(q);
      }
    }
    if(top>=44&&todo.length<=8)for(const n of todo)foreground[n]=0;
  }
  // Keep the original garment in moving attacks as well as ordinary travel.
  // Ownership is explicit: cape/tabard/coat polygons are distinct from the
  // resting blade, shield and bow that the attack compositor replaces.
  const garment=new Uint32Array(80*64),garmentMask=new Uint8Array(80*64),occluded=[];
  const garmentIndices=config.garmentIndices||[],cloth=garmentIndices.map(i=>config.protect[i]);
  const equipment=config.protect.filter((_,i)=>!garmentIndices.includes(i));
  for(let y=44;y<56;y++)for(let x=0;x<80;x++) {
    const p=y*80+x,sx=(x+.5-40)/config.scale+config.pivot[0],sy=(y+.5-56)/config.scale+config.pivot[1];
    const owned=config.garmentNativeMaxX!=null?x<=config.garmentNativeMaxX:cloth.some(poly=>owns(sx,sy,poly,1));
    if(!owned||!(foreground[p]>>>24))continue;
    garmentMask[p]=1;
    if(equipment.some(poly=>owns(sx,sy,poly,1)))occluded.push(p);
    else garment[p]=foreground[p];
  }
  // Continue genuine cloth behind the resting equipment from its nearest
  // visible material. Removing the resting sword must not cut a tabard notch.
  for(const p of occluded) {
    const x=p%80,y=Math.floor(p/80);let best=0,score=Infinity;
    for(let yy=Math.max(44,y-4);yy<Math.min(56,y+5);yy++)for(let xx=Math.max(0,x-8);xx<Math.min(80,x+9);xx++) {
      const q=yy*80+xx;if(!garmentMask[q]||garment[q]>>>24<200)continue;
      const distance=(xx-x)**2+(yy-y)**2*2;if(distance<score){best=garment[q];score=distance;}
    }
    garment[p]=best;
  }
  const frames=[],lowerFrames=[],poses=[];
  const centerX=prepared.legs.reduce((v,l)=>v+40+(l.hip[0]-config.pivot[0])*config.scale,0)/prepared.legs.length;
  for(let i=0;i<m.frames;i++) {
    const phase=i/m.frames,wave=.5+.5*Math.cos(TAU*phase*2),bob=m.bob*wave;
    // Native one-pixel compression spans contact and loading, including 15→0.
    // Rounding a 0.55px sinusoid made the heavy models jab for just one frame.
    const shift=m.bodyBobPixels??Math.round((.65+m.bob*.25)*wave),d=new Uint32Array(80*64),targets=[];
    for(const leg of [...prepared.legs].reverse()) {
      const foot=groundedFoot(phase+leg.offset,m),hip=[40+(leg.hip[0]-config.pivot[0])*config.scale,56+(leg.hip[1]-config.pivot[1])*config.scale+shift+(m.hipCompression||0)*wave];
      const ankle=[centerX+foot.x+(leg.trackOffset||0),55.5-leg.soleDepth-foot.lift];
      const target={hip,ankle,knee:knee(hip,ankle,leg.upper,leg.lower,foot.support,m),roll:foot.support?0:-(m.roll??.14)*Math.sin(Math.PI*(foot.phase-m.support)/(1-m.support))};
      if(m.version==='v2') {
        target.restLength=leg.upper+leg.lower;
        target.extension=Math.hypot(ankle[0]-hip[0],ankle[1]-hip[1])/target.restLength;
      }
      renderLeg(d,leg,target,config.scale);targets.push({name:leg.name,...target,...foot});
    }
    const lower=d.slice();
    for(let y=44;y<56;y++)for(let x=0;x<80;x++) {
      const sy=y-shift;if(sy<44)continue;
      lower[y*80+x]=over(garment[sy*80+x],lower[y*80+x]);
    }
    // Equipment, face and upper armour translate together and never stretch.
    for(let y=0;y<64;y++)for(let x=0;x<80;x++) {
      const sy=y-shift;if(sy<0)continue;
      // Real alpha-over: an antialiased sword edge cannot erase the shin.
      const p=y*80+x;d[p]=over(foreground[sy*80+x],d[p]);
    }
    for(let p=0;p<d.length;p++){d[p]=remap(d[p]);lower[p]=remap(lower[p]);}
    removeOutlineCrumbs(d);removeOutlineCrumbs(lower);
    frames.push({w:80,h:64,d});lowerFrames.push({w:80,h:64,d:lower,equipmentFree:true,hips:targets.map(({name,hip})=>({name,hip}))});poses.push({phase,bob:shift,legs:targets});
  }
  return {frames,lowerFrames,poses,fps:m.frames/m.cycleSeconds,motion:m};
}

export function buildGroundedWalk(id,palette,standing,{version='v1'}={}) {
  const base=GROUNDED_MODELS[id];if(!base)return null;
  if(version!=='v1'&&version!=='v2')throw Error('Unknown grounded walk version: '+version);
  const config=version==='v2'?groundedV2Config(base):base;
  if(!cache.has(id))cache.set(id,{source:readPng(new URL('./baseline/grounded-models/'+config.source,import.meta.url)),foreground:config.foregroundImage?readPng(new URL('./baseline/grounded-models/'+config.foregroundImage,import.meta.url)):null});
  const {source,foreground}=cache.get(id);
  return buildTextureWalk(config,source,palette,standing,foreground);
}
