import { HERO_ART } from '../../js/art/heroes.js';
import { weapons } from './model-weapons.js';

const tau=Math.PI*2;
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const cache=new WeakMap(), timelines=new Map(), deaths=new Map();
const actionTypes={archer:'bow',trailblazer:'bow',witchhunter:'crossbow',marksman:'crossbow',boltguard:'crossbow',mage:'cast',arcanist:'cast',druid:'cast',thornkeeper:'cast',necromancer:'cast',gravebinder:'cast',eanasir:'whip'};
const robeHeroes=new Set(['mage','arcanist','druid','thornkeeper','necromancer','gravebinder','eanasir']);
const lightHeroes=new Set(['archer','trailblazer','witchhunter','marksman','boltguard','berserker']);

function shape(rows) {
  if(typeof rows==='string')rows=rows.split('/');
  let known=cache.get(rows);
  if(known)return known;
  const pts=[],w=Math.max(...rows.map(row=>row.length));
  for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++) {
    const key=rows[y][x];if(key!=='.'&&key!==' ')pts.push([x,y,key]);
  }
  known={pts,w,h:rows.length};cache.set(rows,known);return known;
}
function pixel(b,x,y,c) {
  x=Math.round(x);y=Math.round(y);
  if(x>=0&&x<b.w&&y>=0&&y<b.h)b.d[y*b.w+x]=c;
}
function cloth(b,rows,cx,y,p,skew=0,wave=0) {
  if(!rows)return;
  const s=shape(rows),left=Math.round(cx-s.w/2);
  for(const [x,py,k] of s.pts){
    const u=py/Math.max(1,s.h-1),shift=skew*u+wave*u*u;
    pixel(b,left+x+shift,y+py,p[k]??p.k);
  }
}
function segment(b,p,start,end,width,rim,fill,glint) {
  const dx=end[0]-start[0],dy=end[1]-start[1],n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
  for(let t=0;t<=n;t++) {
    const x=Math.round(start[0]+dx*t/n),y=Math.round(start[1]+dy*t/n);
    for(let j=-1;j<=1;j++)for(let k=-1;k<=width;k++)if(!(j!==0&&(k===-1||k===width)))pixel(b,x+k,y+j,p[rim]);
    for(let k=0;k<width;k++)pixel(b,x+k,y,p[k===0&&t<n*.7?glint:fill]);
  }
}
function footprint(b,x,y,p,far) {
  for(let k=0;k<5;k++)pixel(b,x+k-1,y,p[far?'k':'s']);
  for(let k=0;k<4;k++)pixel(b,x+k-1,y-1,p[far?'s':'m']);
  pixel(b,x+1,y-1,p[far?'t':'h']);
}
function transform(b,src,pivot,x,y,ang,decay=0) {
  const cos=Math.cos(ang),sin=Math.sin(ang),[ax,ay]=pivot;
  const bounds=[[0,0],[src.w,0],[0,src.h],[src.w,src.h]].map(([u,v])=>[x+(u-ax)*cos-(v-ay)*sin,y+(u-ax)*sin+(v-ay)*cos]);
  const x0=clamp(Math.floor(Math.min(...bounds.map(pt=>pt[0]))),0,b.w),y0=clamp(Math.floor(Math.min(...bounds.map(pt=>pt[1]))),0,b.h);
  const x1=clamp(Math.ceil(Math.max(...bounds.map(pt=>pt[0]))),0,b.w),y1=clamp(Math.ceil(Math.max(...bounds.map(pt=>pt[1]))),0,b.h);
  for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++) {
    const dx=xx+.5-x,dy=yy+.5-y,sx=Math.floor(ax+dx*cos+dy*sin),sy=Math.floor(ay+dy*cos-dx*sin);
    if(sx<0||sx>=src.w||sy<0||sy>=src.h)continue;
    const c=src.d[sy*src.w+sx];if(!c)continue;
    if(decay>0) {
      const dither=((sx*19+sy*31+(sx^sy)*7)%59)/59;
      if(dither<decay)continue;
    }
    b.d[yy*b.w+xx]=c;
  }
}
const itemCache=new WeakMap();
function heldPart(which,p) {
  if(!which)return null;
  const part=typeof which==='string'?weapons[which]:which;
  if(!part)throw Error('Unknown field weapon '+which);
  let group=itemCache.get(p);if(!group)itemCache.set(p,group=new WeakMap());
  if(group.has(part))return group.get(part);
  const sh=shape(part.rows),src={w:sh.w,h:sh.h,d:new Uint32Array(sh.w*sh.h)};
  for(const [x,y,key] of sh.pts)src.d[y*sh.w+x]=p[key]??p.k;
  const result={src,grip:part.grip};group.set(part,result);return result;
}
function handItem(b,which,p,x,y,turn=0) {
  const item=heldPart(which,p);if(item)transform(b,item.src,item.grip,x,y,turn);
}
function rotatedExtent(frame,pivot,angle) {
  const co=Math.cos(angle),si=Math.sin(angle),half=(Math.abs(co)+Math.abs(si))*.5;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(let i=0;i<frame.d.length;i++)if(frame.d[i]>>>24) {
    const x=i%frame.w+.5-pivot[0],y=Math.floor(i/frame.w)+.5-pivot[1];
    const dx=co*x-si*y,dy=si*x+co*y;
    x0=Math.min(x0,dx-half);x1=Math.max(x1,dx+half);
    y0=Math.min(y0,dy-half);y1=Math.max(y1,dy+half);
  }
  return {x0,y0,x1,y1};
}
function fitGrip(point,shape,box) {
  point[0]=clamp(point[0],box.left-shape.x0,box.right-shape.x1);
  point[1]=clamp(point[1],box.top-shape.y0,box.bottom-shape.y1);
  return point;
}
function clipMap(id) {
  if(timelines.has(id))return timelines.get(id);
  const s=HERO_ART[id], result=new Map(), norm=(n,total)=>n/Math.max(1,total-1);
  for(const [i,k] of (s.idle||[0]).entries())result.set(k,{idle:i/(s.idle?.length||1),walk:null,cast:null});
  for(const [i,k] of (s.walk||[]).entries())result.set(k,{idle:0,walk:i/s.walk.length,cast:null});
  const hit=norm(s.attackRelease??Math.floor(s.attack.length/2),s.attack.length);
  for(const [i,k] of (s.attack||[]).entries())if(!result.has(k))result.set(k,{idle:0,walk:null,cast:norm(i,s.attack.length),hit});
  for(const [i,row] of (s.attackWalk||[]).entries())for(const [step,k] of row.entries())if(!result.has(k))result.set(k,{idle:0,walk:step/row.length,cast:norm(i,s.attack.length),hit});
  timelines.set(id,result);return result;
}
function gearMotion(id,pose,type) {
  const t=pose.cast,hit=clamp(pose.hit??.48,.15,.85);
  if(t==null)return {reach:0,lift:0,tilt:0};
  const progress=t/hit;
  if(type==='cast'||type==='bow'||type==='crossbow') {
    const brace= t<hit ? Math.sin(progress*Math.PI/2):1-(t-hit)/(1-hit);
    return {reach:brace*3,lift:-brace*3,tilt: (type==='cast'?.29:-.17)*brace};
  }
  const tilt= t<hit*.55 ? -.2-(t/(hit*.55))*1.05 : t<hit ? -1.25+((t/hit-.55)/.45)*2.32 : 1.07*(1-(t-hit)/(1-hit));
  return {reach:Math.cos(tilt)*3+(t>=hit?2:0),lift:-Math.max(0,-tilt)*6,tilt};
}
function drawRig(id,design,p,frame,pose,showItems=true,limits=null) {
  const out={w:frame.w,h:frame.h,d:new Uint32Array(frame.d.length)};
  const ground=HERO_ART[id].anchorY-1,center=Math.round(frame.w/2);
  const walk=pose.walk!=null,ph=(walk?pose.walk:pose.idle)*tau,cast=pose.cast!=null;
  const floating=design.hovering??(id==='rogue'||id==='wraith'),armour=!robeHeroes.has(id)&&!lightHeroes.has(id)&&!floating;
  const step=walk?Math.sin(ph):0,lift=walk?Math.cos(ph):0;
  const stance=design.stance||'tall',span=stance==='wide'?4:stance==='low'?3:2;
  const sh=shape(design.head),body=shape(design.body);
  const [bx,by]=design.bodyOffset||[0,0], [hx,hy]=design.headOffset||[0,0];
  const bob=floating?-4+Math.round(Math.sin(ph)*1.6):walk?Math.round(Math.cos(ph*2)*.8):Math.round(Math.sin(ph)*.55);
  const hipY=ground-(floating?2:7)+bob+(stance==='low'?1:0),waistX=center+bx+(stance==='forward'?1:0);
  const top=hipY-body.h+3+by,neckX=waistX+(stance==='forward'?2:0),breath=walk?0:Math.round(Math.cos(ph)*.5);
  const cloakSwing=walk?-1.5+Math.sin(ph+.7)*1.0:Math.sin(ph)*.65;
  if(design.cloak)cloth(out,design.cloak,waistX-2,top+1,p,-1,cloakSwing);
  if(!floating) {
    for(const far of [true,false]) {
      const side=far?-1:1,offset=walk?step*side*3.35:0;
      const raised=walk?Math.max(0,lift*side)*2.4:0;
      const foot=[waistX+span*side+offset,ground-Math.round(raised)],hip=[waistX+side*2,hipY];
      const knee=[(hip[0]+foot[0])/2+raised*.8+1,(hip[1]+foot[1])/2-1];
      segment(out,p,hip,knee,2,'k',far?'d':'s',far?'s':armour?'m':'t');
      segment(out,p,knee,[foot[0],foot[1]-2],2,'k',far?'d':'s',far?'s':armour?'h':'m');
      footprint(out,foot[0],foot[1],p,far);
    }
  }
  const type=design.action||actionTypes[id]||'slash',a=gearMotion(id,pose,type);
  const shoulderY=top+2,nearShoulder=[waistX+3,shoulderY],farShoulder=[waistX-4,shoulderY];
  const farHand=[waistX-(design.offhand?Math.max(6,Math.round(body.w*.46)):5)+(walk?step:0),top+8+breath];
  const nearHand=[waistX+(type==='cast'?5:6)+a.reach+(walk?-step:0),top+7+breath+a.lift];
  const angle=a.tilt+(walk?step*.05:0);
  if(limits&&showItems) {
    const item=heldPart(design.weapon,p);
    if(item)fitGrip(nearHand,rotatedExtent(item.src,item.grip,angle),limits);
  }
  segment(out,p,farShoulder,[farHand[0]-2,farHand[1]-2],2,'k','d',armour?'m':'c');
  segment(out,p,[farHand[0]-2,farHand[1]-2],farHand,2,'k','s',armour?'h':'f');
  cloth(out,design.body,waistX,top,p,walk?step*.7:0,floating?Math.sin(ph+.8)*1.3:0);
  if(showItems && design.offhand)handItem(out,design.offhand,p,farHand[0],farHand[1],walk?step*.06:0);
  cloth(out,design.head,neckX+hx+(cast?a.reach*.26:0),top-sh.h+3+hy,p);
  const elbow=[waistX+5+a.reach*.5,top+6+Math.max(0,a.lift)*.5];
  segment(out,p,nearShoulder,elbow,2,'k','d',armour?'m':'c');
  segment(out,p,elbow,nearHand,2,'k',armour?'s':'t',armour?'h':'F');
  if(showItems) {
    handItem(out,design.weapon,p,nearHand[0],nearHand[1],angle);
    pixel(out,nearHand[0],nearHand[1],p[armour?'h':'F']);
    pixel(out,nearHand[0]+1,nearHand[1],p[armour?'m':'f']);
    if(type==='bow') {
      const pull=cast?Math.max(0,1-Math.abs((pose.cast-(pose.hit??.5))/.35)):0;
      const x=nearHand[0]-2-pull*5,y=nearHand[1];
      segment(out,p,[nearHand[0]-3,nearHand[1]-7],[x,y],1,'k','s','m');
      segment(out,p,[x,y],[nearHand[0]-3,nearHand[1]+7],1,'k','s','m');
      if(pull>.15)for(let i=0;i<10;i++)pixel(out,x+i,y,p[i===9?'H':'t']);
    }
  }
  return out;
}
const sizes=new WeakMap();
function extents(frame) {
  const {w,h,d}=frame;
  let left=w,right=-1,top=h,bottom=-1;
  for(let i=0;i<d.length;i++)if(d[i]>>>24){
    const x=i%w,y=Math.floor(i/w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  return {left,right,top,bottom};
}
function fieldSize(id,design,p) {
  const cached=sizes.get(design);if(cached)return cached;
  const source=HERO_ART[id],reference=source.gen()[source.idle[0]];
  const original=extents(reference), idle=extents(drawRig(id,design,p,reference,{idle:0,walk:null,cast:null}));
  const scale=(original.bottom-original.top+1)/(idle.bottom-idle.top+1);
  const floating=design.hovering??(id==='rogue'||id==='wraith');
  const modelFoot=idle.bottom+1,targetFoot=floating?Math.min(original.bottom+1,source.anchorY-2):original.bottom+1;
  const result={scale,modelFoot,targetFoot};
  sizes.set(design,result);return result;
}
function sized(id,design,p,source,fallen=false) {
  const {scale,modelFoot,targetFoot}=fieldSize(id,design,p);
  const {w,h}=source, out={w,h,d:new Uint32Array(w*h)}, box=extents(source);
  // A single fit per costume: the idle, crouch, reaching weapon and fall all
  // keep their natural amplitude. Sample complete source texels without any
  // smoothing, bilinear blur, or pose-specific refitting.
  const cx=w/2, sy=fallen?HERO_ART[id].anchorY:modelFoot, ty=fallen?(HERO_ART[id].fall?.anchorY??HERO_ART[id].anchorY):targetFoot;
  const x0=Math.max(0,Math.floor(cx+(box.left-cx)*scale)),x1=Math.min(w,Math.ceil(cx+(box.right+1-cx)*scale));
  const y0=Math.max(0,Math.floor(ty+(box.top-sy)*scale)),y1=Math.min(h,Math.ceil(ty+(box.bottom+1-sy)*scale));
  for(let y=y0;y<y1;y++){
    const row=Math.floor(sy+(y+.5-ty)/scale)*w;
    for(let x=x0;x<x1;x++)out.d[y*w+x]=source.d[row+Math.floor(cx+(x+.5-cx)/scale)];
  }
  return out;
}
export function redrawFrame(id,design,p,frame,index) {
  const size=fieldSize(id,design,p);
  const limits=modelLimits(frame,size,size.modelFoot,size.targetFoot);
  return sized(id,design,p,drawRig(id,design,p,frame,clipMap(id).get(index)||{idle:0,walk:null,cast:null},true,limits));
}
function modelLimits(frame,size,modelFoot,targetFoot) {
  const {w,h}=frame,s=size.scale;
  // Leave one complete native texel beyond the fitted item. The final
  // nearest-neighbour enlargement can magnify a half-pixel rounding choice.
  const margin=1+Math.ceil(s);
  return {left:w/2+(margin-w/2)/s,right:w/2+(w/2-margin)/s,
    top:modelFoot+(margin-targetFoot)/s,bottom:modelFoot+(h-margin-targetFoot)/s};
}
function restingAngle(item) {
  if(item.restAngle!==undefined)return item.restAngle;
  const {src,grip}=item;
  let longest=-1,angle=0;
  for(let i=0;i<src.d.length;i++)if(src.d[i]>>>24){
    const x=i%src.w+.5-grip[0],y=Math.floor(i/src.w)+.5-grip[1],d=x*x+y*y;
    if(d>longest){longest=d;angle=-Math.atan2(y,x);}
  }
  if(angle>Math.PI/2)angle-=Math.PI;else if(angle< -Math.PI/2)angle+=Math.PI;
  return item.restAngle=angle;
}
function landItem(out,which,p,x,y,drop,ground,limits,shield=false) {
  const item=heldPart(which,p);if(!item)return;
  const angle=(shield?1.40:restingAngle(item))*drop,box=rotatedExtent(item.src,item.grip,angle);
  const restY=ground+1-box.y1, point=fitGrip([x,y+(restY-y)*drop],box,{...limits,bottom:ground+1});
  transform(out,item.src,item.grip,point[0],point[1],angle);
}
function fallTimes(id) {
  if(deaths.has(id))return deaths.get(id);
  const fall=HERO_ART[id].fall, result=new Map();
  for(let n=0;n<1200;n++){const t=n/120,i=fall.frameAt(t);if(!result.has(i))result.set(i,t);}
  deaths.set(id,result);return result;
}
export function redrawFall(id,design,p,frame,index) {
  const source=HERO_ART[id],fall=source.fall,release=fall.wisp?.release??1.45;
  const t=fallTimes(id).get(index)??10,ground=source.anchorY-1, cx=frame.w/2, out={w:frame.w,h:frame.h,d:new Uint32Array(frame.d.length)};
  const tilt=clamp((t-.24)/Math.min(1.08,release*.72)),drop=clamp((t-.38)/.59);
  const fade=clamp((t-release-.08)/1.06),stumble=clamp(t/.3);
  const size=fieldSize(id,design,p);
  const limits=modelLimits(frame,size,source.anchorY,fall.anchorY??source.anchorY);
  if(fade<1){
    const body=drawRig(id,design,p,frame,{idle:stumble*.2,walk:tilt<.9?stumble*.5:null,cast:null},false);
    const angle=tilt*1.46-.12*Math.sin(stumble*Math.PI),pivot=[cx,ground];
    const point=fitGrip([cx+stumble*2,ground+1],rotatedExtent(body,pivot,angle),{...limits,bottom:ground+1});
    transform(out,body,pivot,point[0],point[1],angle,fade);
  }
  landItem(out,design.weapon,p,cx+5-drop*17,ground-14,drop,ground,limits);
  if(design.offhand)landItem(out,design.offhand,p,cx-5+drop*24,ground-13,drop,ground,limits,true);
  return sized(id,design,p,out,true);
}
