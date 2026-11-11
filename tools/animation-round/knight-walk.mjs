// One approved Knight model, articulated through a complete planted-foot gait.
// The source-resolution texture is retained locally so rebuilds need no art workspace.
import { readPng } from '../png.mjs';

export const KNIGHT_WALK = { frames: 16, cycleSeconds: .54, support: .4, reach: 6.8, lift: 3.0 };
const SCALE=.0975579444478966, PIVOT=[134.65923566878982,320.312101910828];
const source=readPng(new URL('./baseline/knight-walk-model.png',import.meta.url));
const TAU=Math.PI*2;
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>(t=clamp(t),t*t*(3-2*t));
const mix=(a,b,t)=>a+(b-a)*t;
const inside=(x,y,poly)=>{
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
};
const distance=(x,y,a,b)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1));
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
};
const owns=(x,y,poly,pad=0)=>inside(x,y,poly)||poly.some((a,i)=>distance(x,y,a,poly[(i+1)%poly.length])<=pad);

// Original equipment ownership: sword, gauntlet, shield and hanging tabard.
const protection=[
  [[72,207],[86,208],[195,252],[195,267],[178,270],[65,229]],
  [[65,183],[84,187],[76,209],[70,234],[54,240],[46,231],[49,212],[57,194]],
  [[179,97],[203,102],[226,123],[232,172],[224,225],[202,257],[182,270],[168,251],[160,220],[157,154],[160,115]],
  [[84,187],[143,189],[153,206],[166,231],[157,244],[121,234],[82,215],[72,207]],
];
const legs=[
  {name:'far',hip:[139,232],knee:[146,274],ankle:[153,305],
   polygon:[[130,230],[151,233],[165,251],[175,279],[181,299],[205,307],[211,325],[127,325],[124,305],[121,282],[117,254]],
   targetHip:40.4,offset:.5},
  {name:'near',hip:[93,230],knee:[65,273],ankle:[49,305],
   polygon:[[89,223],[106,234],[99,255],[80,277],[71,300],[75,323],[14,324],[14,303],[28,279],[42,251],[64,233]],
   targetHip:37.2,offset:0},
];

function masked(test) {
  const d=source.d.slice();
  for(let y=0;y<source.h;y++)for(let x=0;x<source.w;x++)if(!test(x+.5,y+.5))d[y*source.w+x]=0;
  return {...source,d};
}
const foreground=masked((x,y)=>(y<225&&!legs.some(l=>owns(x,y,l.polygon,2)))||protection.some(p=>owns(x,y,p,3)));
for(const leg of legs) leg.texture=masked((x,y)=>owns(x,y,leg.polygon,3)&&!protection.some(p=>inside(x,y,p)));
const nativeForeground=new Uint32Array(80*64);
for(let y=0;y<64;y++)for(let x=0;x<80;x++) {
  const sx=Math.floor((x+.5-40)/SCALE+PIVOT[0]),sy=Math.floor((y+.5-56)/SCALE+PIVOT[1]);
  if(sx>=0&&sx<source.w&&sy>=0&&sy<source.h)nativeForeground[y*80+x]=foreground.d[sy*source.w+sx];
}

// Forward support is linear in body space, so a grounded sole sweeps backward.
// The returning foot clears the floor and passes the support shin before reaching.
export function knightFoot(phase) {
  const t=((phase%1)+1)%1,p=KNIGHT_WALK;
  if(t<p.support)return {x:mix(p.reach,-p.reach,t/p.support),lift:0,support:true};
  const u=(t-p.support)/(1-p.support);
  return {x:mix(-p.reach,p.reach,smooth(u)),lift:Math.sin(Math.PI*u)*p.lift,support:false};
}

function joint(hip,ankle,a=5.15,b=4.75) {
  const dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],d=Math.hypot(dx,dy),r=Math.min(a+b-.01,d);
  const along=(a*a-b*b+r*r)/(2*r),height=Math.sqrt(Math.max(0,a*a-along*along));
  return [hip[0]+dx/d*along+dy/d*height,hip[1]+dy/d*along-dx/d*height];
}
function bone(p,a,b,c,d) {
  const ax=b[0]-a[0],ay=b[1]-a[1],al=Math.hypot(ax,ay),bx=d[0]-c[0],by=d[1]-c[1],bl=Math.hypot(bx,by);
  const px=p[0]-a[0],py=p[1]-a[1],along=(px*ax+py*ay)/(al*al),cross=(-px*ay+py*ax)/al*SCALE;
  return [c[0]+bx*along-by/bl*cross,c[1]+by*along+bx/bl*cross];
}
function vertex(p,leg,target) {
  const u=bone(p,leg.hip,leg.knee,target.hip,target.knee),v=bone(p,leg.knee,leg.ankle,target.knee,target.ankle);
  const t=smooth((p[1]-leg.knee[1]+9)/18),foot=smooth((p[1]-leg.ankle[1]+6)/12);
  const result=[mix(u[0],v[0],t),mix(u[1],v[1],t)];
  // Sole stays level during support, with a modest toe roll only in the return.
  const x=(p[0]-leg.ankle[0])*SCALE*(leg.name==='near'?-.72:.6),y=(p[1]-leg.ankle[1])*SCALE*.85,cs=Math.cos(target.roll),sn=Math.sin(target.roll);
  return [mix(result[0],target.ankle[0]+x*cs-y*sn,foot),mix(result[1],target.ankle[1]+x*sn+y*cs,foot)];
}
function triangle(out,texture,uv,pts) {
  const [a,b,c]=pts,det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(det)<1e-8)return;
  const left=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),right=Math.min(79,Math.ceil(Math.max(a[0],b[0],c[0])));
  const top=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),bottom=Math.min(63,Math.ceil(Math.max(a[1],b[1],c[1])));
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++) {
    const px=x+.5,py=y+.5,u=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/det;
    const v=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/det,w=1-u-v;
    if(Math.min(u,v,w)<-1e-7)continue;
    const sx=Math.floor(uv[0][0]*u+uv[1][0]*v+uv[2][0]*w),sy=Math.floor(uv[0][1]*u+uv[1][1]*v+uv[2][1]*w);
    if(sx<0||sx>=texture.w||sy<0||sy>=texture.h)continue;
    const color=texture.d[sy*texture.w+sx];if(color>>>24>=128)out[y*80+x]=color;
  }
}
function renderLeg(out,leg,target) {
  const grid=6,left=Math.min(...leg.polygon.map(p=>p[0]))-4,right=Math.max(...leg.polygon.map(p=>p[0]))+4;
  const top=Math.min(...leg.polygon.map(p=>p[1]))-4,bottom=Math.max(...leg.polygon.map(p=>p[1]))+4;
  for(let y=top;y<bottom;y+=grid)for(let x=left;x<right;x+=grid) {
    const uv=[[x,y],[x+grid,y],[x+grid,y+grid],[x,y+grid]],pts=uv.map(p=>vertex(p,leg,target));
    triangle(out,leg.texture,[uv[0],uv[1],uv[2]],[pts[0],pts[1],pts[2]]);
    triangle(out,leg.texture,[uv[0],uv[2],uv[3]],[pts[0],pts[2],pts[3]]);
  }
}
function paletteMap(palette) {
  const cache=new Map(),known=new Set(palette),solid=palette.filter(c=>c>>>24>=128);
  return color=>{
    if(!(color>>>24))return 0;
    if(known.has(color))return color;
    if(cache.has(color))return cache.get(color);
    let best=solid[0],score=Infinity;
    for(const q of solid) {
      if(color>>>24>=200&&q>>>24<200)continue;
      const d=((color&255)-(q&255))**2+((color>>>8&255)-(q>>>8&255))**2+((color>>>16&255)-(q>>>16&255))**2+((color>>>24)-(q>>>24))**2;
      if(d<score){best=q;score=d;}
    }
    cache.set(color,best);return best;
  };
}

export function buildKnightWalk(palette,standing) {
  if(!standing||standing.w!==80||standing.h!==64)throw Error('Knight gait requires the approved native standing frame.');
  const remap=paletteMap(palette),frames=[],lowerFrames=[],poses=[];
  // Use the actual approved native colours/alpha above the belt. The retained
  // source-resolution mask owns equipment below it; it never redraws the face.
  const foregroundPixels=standing.d.map((c,p)=>p<45*80||nativeForeground[p]?c:0);
  for(let i=0;i<KNIGHT_WALK.frames;i++) {
    const phase=i/KNIGHT_WALK.frames,bob=-.3-.6*Math.cos((phase-.35)*TAU*2);
    const d=new Uint32Array(80*64),pose=[];
    for(const leg of legs) {
      const f=knightFoot(phase+leg.offset),hip=[leg.targetHip,46.4+bob],ankle=[leg.targetHip+f.x,54.1-f.lift];
      const knee=f.support?[mix(hip[0],ankle[0],.52)+.35,mix(hip[1],ankle[1],.52)]:joint(hip,ankle);
      const target={hip,ankle,knee,roll:f.support?0:-.12*Math.sin(TAU*(phase+leg.offset))};
      renderLeg(d,leg,target);pose.push({leg:leg.name,...target,...f});
    }
    // Continue the actual charcoal mail under the belt, hidden by the tabard.
    const pelvis=source.d[213*source.w+111];
    for(let y=45;y<48;y++)for(let x=36;x<42;x++)if(!d[y*80+x])d[y*80+x]=pelvis;
    const lower=d.slice();
    for(let y=0;y<64;y++)for(let x=0;x<80;x++) {
      const yy=y-Math.round(bob);if(yy<0||yy>=64)continue;
      const c=foregroundPixels[yy*80+x];if(c>>>24)d[y*80+x]=c;
    }
    for(let p=0;p<d.length;p++){d[p]=remap(d[p]);lower[p]=remap(lower[p]);}
    frames.push({w:80,h:64,d});lowerFrames.push({w:80,h:64,d:lower});poses.push({phase,bob,legs:pose});
  }
  return {frames,lowerFrames,poses,fps:KNIGHT_WALK.frames/KNIGHT_WALK.cycleSeconds};
}
