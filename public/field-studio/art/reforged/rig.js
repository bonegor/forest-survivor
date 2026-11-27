import { HERO_ART } from '../../../js/art/heroes.js';
import { add, bounds, clamp, compose, lerp, line, makeBuf, matrix, mixPoint, modelFor, place, point, radians, stamp } from './rig-pixels.js';
import { clipPose, fallPose, fallTime, hinge, movement, sole } from './rig-motion.js';

const origin=[0,0];

function segment(out,tile,axis,start,end,length,view) {
  const dx=end[0]-start[0],dy=end[1]-start[1];
  const angle=Math.atan2(-dx,dy), stretch=Math.max(.05,Math.hypot(dx,dy)/length);
  stamp(out,tile,compose(view,place(start[0],start[1],[axis,0],angle,1,stretch)));
}
function drawLeg(out,limb,hip,foot,view) {
  if(!limb) return;
  const {axis,joint,end,upper,lower,tip}=limb, co=Math.cos(foot.angle),si=Math.sin(foot.angle);
  let low=-Infinity;
  for(let y=0;y<tip.h;y++)for(let x=0;x<tip.w;x++)if(tip.d[y*tip.w+x]>>>24) {
    low=Math.max(low,si*(x-axis)+co*y);
  }
  const ankle=[foot.x,foot.y-low], knee=hinge(hip,ankle,joint,end-joint,-1);
  segment(out,upper,axis,hip,knee,joint,view);
  segment(out,lower,axis,knee,ankle,end-joint,view);
  stamp(out,tip,compose(view,place(ankle[0],ankle[1],[axis,0],foot.angle)));
}
function armPose(limb,shoulder,grip,elbowSide,angleOffset) {
  const {joint,end,tip}=limb;
  const gripY=clamp((tip.h-1)*.45,0,2), dx=grip[0]-shoulder[0],dy=grip[1]-shoulder[1];
  const d=Math.max(1,Math.hypot(dx,dy));
  let wrist=[grip[0]-dx*gripY/d,grip[1]-dy*gripY/d], elbow;
  let angle;
  for(let n=0;n<2;n++) {
    elbow=hinge(shoulder,wrist,joint,end-joint,elbowSide);
    angle=Math.atan2(elbow[0]-wrist[0],wrist[1]-elbow[1])+angleOffset;
    wrist=[grip[0]+Math.sin(angle)*gripY,grip[1]-Math.cos(angle)*gripY];
  }
  return {limb,shoulder,wrist,elbow,angle,grip,gripY};
}
function armAndItem(out,arm,gear,view,items) {
  const {limb,shoulder,wrist,elbow,angle,grip,gripY}=arm;
  segment(out,limb.upper,limb.axis,shoulder,elbow,limb.joint,view);
  segment(out,limb.lower,limb.axis,elbow,wrist,limb.end-limb.joint,view);
  if(items && gear) stamp(out,gear.item.tile,compose(view,gear.transform));
  // The fingers wrap the actual grip after the wood or steel has been drawn.
  stamp(out,limb.tip,compose(view,place(grip[0],grip[1],[limb.axis,gripY],angle)));
}

function itemTransform(item,grip,angle) {
  return place(grip[0],grip[1],item.grip,angle);
}
function transformedBox(item,transform) {
  let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;
  for(let y=0;y<item.tile.h;y++)for(let x=0;x<item.tile.w;x++)if(item.tile.d[y*item.tile.w+x]>>>24) {
    const [xx,yy]=point(transform,[x,y]);
    l=Math.min(l,xx); t=Math.min(t,yy); r=Math.max(r,xx); b=Math.max(b,yy);
  }
  return {l,t,r,b};
}
function held(item,grip,angle,limits) {
  if(!item) return null;
  let transform=itemTransform(item,grip,angle);
  if(limits) {
    const box=transformedBox(item,transform);
    grip[0]+=Math.max(0,limits.l-box.l)-Math.max(0,box.r-limits.r);
    grip[1]+=Math.max(0,limits.t-box.t)-Math.max(0,box.b-limits.b);
    transform=itemTransform(item,grip,angle);
  }
  return {item,grip,angle,transform};
}
function layer(out,body,view,bodyTransform,move=origin,angle=0) {
  if(!body) return;
  const transform=matrix(body.at[0]+move[0],body.at[1]+move[1],angle);
  stamp(out,body.tile,compose(view,compose(bodyTransform,transform)));
}
function bowRig(model,bow,pose) {
  if(!bow?.item.tips) return null;
  const [upper,lower]=bow.item.tips.map(p=>point(bow.transform,p));
  const centre=mixPoint(upper,lower,.5), t=pose.clip.attack;
  let pull=0;
  if(t!=null) pull=t<.5?clamp(t/.43):clamp(1-(t-.5)/.13);
  const nock=[centre[0]-pull*(model.m.drawLength??6),centre[1]];
  return {upper,lower,nock,pull};
}
function bowString(out,model,bow,parts,view,pose) {
  const {item}=bow, {nock,upper,lower,pull}=parts, p=model.palette;
  const firstInk=Object.values(p)[0], string=p[item.string]??firstInk;
  line(out,point(view,upper),point(view,nock),string);
  line(out,point(view,nock),point(view,lower),string);
  if(pose.clip.attack!=null && pose.clip.attack<=.5 && pull>.08) {
    const tip=add(nock,[Math.max(8,model.m.arrowLength??12),0]);
    line(out,point(view,nock),point(view,tip),p[item.shaft]??string);
    line(out,point(view,add(nock,[1,-1])),point(view,add(nock,[2,0])),p[item.fletch]??string);
  }
}
function upperBody(model,pose) {
  const pelvisY=model.m.nearHip?.[1]??(model.torso.at[1]+model.torso.tile.h-2);
  return {pelvisY,transform:place(pose.x,pelvisY+pose.y,[0,pelvisY],radians(pose.lean))};
}
function drawActor(out,model,pose,view,items=true,limits=null) {
  const m=model.m, top=model.torso.at[1], {pelvisY,transform:upper}=upperBody(model,pose);
  const arms=[model.arm,model.offArm];
  const shoulders=[m.mainShoulder??[3,top+2],m.offShoulder??[-3,top+2]].map(p=>point(upper,p));
  const restHands=[m.mainHand??[6,top+9],m.offHand??[-5,top+9]];
  const mainGrip=add(point(upper,restHands[0]),add(pose.main,[-pose.armswing,0]));
  let offGrip=add(point(upper,restHands[1]),add(pose.off,[pose.armswing,0]));
  const main=held(model.weapon,mainGrip,radians(pose.angle)+pose.armswing*.025,limits);
  const bow=m.action==='bow'?bowRig(model,main,pose):null;
  if(!model.offhand && !pose.falling && bow && pose.clip.attack!=null) offGrip=bow.nock;
  if(!model.offhand && !pose.falling && main && m.action==='crossbow' && main.item.support) {
    offGrip=point(main.transform,main.item.support);
  }
  const off=held(model.offhand,offGrip,radians(pose.offAngle)-pose.armswing*.022,limits);
  const grips=[mainGrip,offGrip],gear=[main,off],armAngles=[m.elbowSide??1,m.offElbowSide??1];
  const hands=arms.map((a,i)=>armPose(a,shoulders[i],grips[i],armAngles[i],
    radians((i?pose.offAngle:pose.angle)*.22)));
  // Cape hinges at its neck; the hem opens slightly as the hips move underneath.
  if(model.cloak) {
    const cloth=compose(upper,place(model.cloak.at[0]+model.cloak.tile.w*.60,model.cloak.at[1],
      [model.cloak.tile.w*.60,0],radians(-pose.cloth*1.7)));
    stamp(out,model.cloak.tile,compose(view,cloth));
  }
  drawLeg(out,model.farLeg,point(upper,m.farHip??[-2,pelvisY]),sole(model,true,pose),view);
  drawLeg(out,model.leg,point(upper,m.nearHip??[2,pelvisY]),sole(model,false,pose),view);
  const rear=m.mainBehind?0:1, front=1-rear;
  armAndItem(out,hands[rear],gear[rear],view,items);
  layer(out,model.torso,view,upper);
  layer(out,model.front,view,upper);
  layer(out,model.head,view,upper,add(pose.head,[0,pose.headBob]));
  if(items && bow) bowString(out,model,main,bow,view,pose);
  armAndItem(out,hands[front],gear[front],view,items);
  return gear;
}

function sizing(id,model,ref) {
  model.sizes ??= new Map();
  if(model.sizes.has(id)) return model.sizes.get(id);
  const def=HERO_ART[id], stand=def.gen()[def.idle?.[0]??0], old=bounds(stand);
  const scratch=makeBuf(144,144), ox=72,oy=94;
  drawActor(scratch,model,movement(model,{idle:0},-1),matrix(ox,oy),true,{l:-68,r:68,t:-87,b:0});
  const native=bounds(scratch), target=old.b-old.t+1, scale=target/(native.b-native.t+1);
  // One field scale for idle, motion, drops and soul. Keep the model's soles
  // registered to the fixed world floor even when a release changes its bounds.
  const size={scale,anchor:def.anchorY??ref.h-1,fallAnchor:def.fall.anchorY??def.anchorY};
  model.sizes.set(id,size);
  return size;
}
function standingSpace(frame,size,anchor=size.anchor) {
  const ground=anchor-1,cx=Math.floor(frame.w/2),s=size.scale;
  return {ground,cx,s,view:matrix(cx,ground,0,s),limits:{l:(1-cx)/s,r:(frame.w-2-cx)/s,
    t:(1-ground)/s,b:0}};
}
export function reforgedFrame(id,design,frame,index=0) {
  const model=modelFor(design),size=sizing(id,model,frame),out=makeBuf(frame.w,frame.h);
  const space=standingSpace(frame,size), clip=clipPose(id,index), pose=movement(model,clip,index);
  const phase=clip.attack==null?null:clip.attack<.42?'windup':clip.attack<=.64?'release':'recover';
  const form=design.poses?.[index]?.form ?? design.motion?.attackForms?.[phase];
  let actor=model;
  if(form && design.forms?.[form]) {
    model.forms ??= new Map();
    if(!model.forms.has(form)) model.forms.set(form,modelFor({...design,...design.forms[form]}));
    actor=model.forms.get(form);
  }
  drawActor(out,actor,pose,space.view,true,space.limits);
  return out;
}

function fallBody(model,space,frame,t,release) {
  const pad=32, scratch=makeBuf(frame.w+pad*2,frame.h+pad*2);
  const pose={...fallPose(model,t,release),falling:true};
  const root=compose(space.view,compose(matrix(0,0,0,1,pose.depth),matrix(pose.travel,0,pose.turn))),view=root.slice();
  view[4]+=pad;view[5]+=pad;
  const limits=t<=(model.m.dropTime??.39)?space.limits:null;
  const gear=drawActor(scratch,model,pose,view,false,limits);
  const box=bounds(scratch);
  const shiftY=Math.round((space.ground-(box.b-pad))*(model.m.hover?clamp(t/.58):1));
  const left=box.l-pad,right=box.r-pad;
  const shiftX=Math.max(0,1-left)-Math.max(0,right-frame.w+2);
  root[4]+=shiftX;root[5]+=shiftY;
  return {scratch,pad,shiftX,shiftY,root,gear,pose,box,limits};
}
function decayBody(out,body,amount) {
  if(amount>=1) return;
  const {box,scratch,shiftX,shiftY,pad}=body;
  for(let y=box.t;y<=box.b;y++)for(let x=box.l;x<=box.r;x++) {
    const colour=scratch.d[y*scratch.w+x];
    if(!(colour>>>24)) continue;
    // Stable, small local clusters dissolve while the independent equipment stays whole.
    const pattern=((x*17+y*31+Math.floor(x/2)*9+Math.floor(y/2)*21)%83)/83;
    if(amount>0 && pattern<amount) continue;
    const xx=x+shiftX-pad, yy=y+shiftY-pad;
    if(xx>=0 && yy>=0 && xx<out.w && yy<out.h) out.d[yy*out.w+xx]=colour;
  }
}
function releasedParts(id,model,space,frame,release,takeoff) {
  const key=[id,frame.w,frame.h,takeoff].join('/');
  if(!model.fallReleases.has(key)) {
    const body=fallBody(model,space,frame,takeoff,release);
    model.fallReleases.set(key,body.gear.map(g=>g&&({
      item:g.item,grip:point(body.root,g.grip),angle:g.angle+body.pose.turn
    })));
  }
  return model.fallReleases.get(key);
}
function looseItem(out,entry,off,model,space,t) {
  const m=model.m, item=entry.item;
  const drop=off?(m.offDrop??[15,0]):(m.drop??[-13,0]);
  const contact=off?.61:.54, u=clamp(t/contact), ease=1-(1-u)*(1-u);
  const angle=lerp(entry.angle,item.rest,ease);
  const restSquash=item.restSquash??(off?.60:.85);
  const floorY=space.ground+(drop[1]||0)*space.s;
  const restLocal=compose(matrix(0,0,0,space.s,space.s*restSquash),itemTransform(item,origin,item.rest));
  const restBox=transformedBox(item,restLocal);
  const restX=clamp(space.cx+drop[0]*space.s,1-restBox.l,out.w-2-restBox.r);
  const restY=floorY-restBox.b;
  const bounce= t>contact && t<contact+.20 ? Math.sin((t-contact)/.20*Math.PI)*1.1*space.s : 0;
  const x=lerp(entry.grip[0],restX,ease),y=lerp(entry.grip[1],restY,u)-Math.sin(Math.PI*u)*4*space.s-bounce;
  const local=compose(matrix(x,y,0,space.s,space.s*lerp(1,restSquash,ease)),itemTransform(item,origin,angle));
  const box=transformedBox(item,local);
  local[4]+=Math.max(0,1-box.l)-Math.max(0,box.r-out.w+2);
  local[5]-=Math.max(0,box.b-floorY);
  stamp(out,item.tile,local);
}
export function reforgedFallFrame(id,design,frame,index=0) {
  const model=modelFor(design),size=sizing(id,model,frame),space=standingSpace(frame,size,size.fallAnchor);
  const release=HERO_ART[id].fall.wisp?.release??1.85, t=fallTime(id,index),out=makeBuf(frame.w,frame.h);
  const takeoff=model.m.dropTime??.39, amount=clamp((t-release)/1.1);
  if(t===0) {
    drawActor(out,model,movement(model,{idle:0},-1),space.view,true,space.limits);
    return out;
  }
  const body=amount<1?fallBody(model,space,frame,t,release):null;
  if(t<=takeoff) {
    if(body) drawActor(out,model,body.pose,body.root,true,body.limits);
  } else {
    if(body) decayBody(out,body,amount);
    const released=releasedParts(id,model,space,frame,release,takeoff);
    released.forEach((entry,i)=>{if(entry) looseItem(out,entry,i===1,model,space,t-takeoff);});
  }
  return out;
}

export function reforgedWispOrigin(id,design) {
  const source=HERO_ART[id].fall,wisp=source.wisp;
  if(!wisp) return {};
  if(wisp.walkOff) return {offsetX:wisp.offsetX,offsetY:wisp.offsetY};
  const model=modelFor(design);
  model.origins ??= new Map();
  if(model.origins.has(id)) return model.origins.get(id);
  const frame=source.gen()[source.frameAt(wisp.release)],size=sizing(id,model,frame);
  const space=standingSpace(frame,size,size.fallAnchor),body=fallBody(model,space,frame,wisp.release,wisp.release);
  const torso=model.torso,chest=model.m.soulAt || add(torso.at,[(torso.tile.w-1)*.54,(torso.tile.h-1)*.38]);
  const target=point(compose(body.root,upperBody(model,body.pose).transform),chest);
  // Some open robes have transparent slits. Locate the closest surviving pixel
  // of flesh or costume on the separate body layer, never on a dropped item.
  let closest=Infinity,attach=target;
  for(let y=body.box.t;y<=body.box.b;y++)for(let x=body.box.l;x<=body.box.r;x++) {
    if(!(body.scratch.d[y*body.scratch.w+x]>>>24)) continue;
    const xx=x+body.shiftX-body.pad,yy=y+body.shiftY-body.pad;
    const dist=(xx-target[0])**2+(yy-target[1])**2;
    if(dist<closest){closest=dist;attach=[xx,yy];}
  }
  const firstIndex=wisp.frameAt(0),first=reforgedWispFrame(id,design,wisp.gen()[firstIndex],firstIndex),start=bounds(first);
  // HUD.drawSoul mirrors both the frame and offsetX. Its world origin is the
  // native canvas centre in X and fall.anchorY in Y (before any lifting/sinking).
  const offset={offsetX:Math.round(attach[0]-frame.w/2-((start.l+start.r)/2-first.w/2)),
    offsetY:Math.round(attach[1]-size.fallAnchor-((start.t+start.b)/2-wisp.anchorY))};
  model.origins.set(id,offset);
  return offset;
}

const lightOf=c=>((c&255)*.26+(c>>>8&255)*.56+(c>>>16&255)*.18)/255;
function miniatureSpirit(model,frame,index) {
  const shell=bounds(frame), out=makeBuf(frame.w,frame.h);
  if(shell.r<shell.l) return out;
  const src=makeBuf(112,104);
  drawActor(src,model,movement(model,{idle:(index%16)/16},-1),matrix(56,76),false);
  const box=bounds(src);
  // A travelling wisp has a small moving frame and an anchor at its tip.
  // Fit the unarmed figure into its luminous envelope, away from the world-floor anchor.
  const scale=Math.min((shell.r-shell.l+1)/(box.r-box.l+1),(shell.b-shell.t+1)/(box.b-box.t+1));
  const cx=(shell.l+shell.r)/2,cy=(shell.t+shell.b)/2;
  stamp(out,src,place(cx,cy,[(box.l+box.r)/2,(box.t+box.b)/2],0,scale));
  const inks=Array.from(frame.d).filter(c=>c>>>24).sort((a,b)=>lightOf(a)-lightOf(b));
  const alpha=Math.max(...inks.map(c=>c>>>24));
  const centre=Math.round(cy)*out.w+Math.round(cx);
  if(!out.d.some(c=>c>>>24)) out.d[centre]=0xffffffff;
  for(let i=0;i<out.d.length;i++) if(out.d[i]>>>24) {
    const colour=inks[Math.round(lightOf(out.d[i])*(inks.length-1))];
    out.d[i]=(alpha<<24 | colour&0xffffff)>>>0;
  }
  return out;
}
export function reforgedWispFrame(id,design,frame,index=0) {
  const wisp=HERO_ART[id].fall.wisp;
  if(!wisp.walkOff) return design.motion?.wisp==='spirit'?miniatureSpirit(modelFor(design),frame,index):frame;
  const model=modelFor(design),size=sizing(id,model,frame),out=makeBuf(frame.w,frame.h);
  const n=wisp.gen().length,firstWalking=n>16?n-16:0;
  const space=standingSpace(frame,size,wisp.anchorY);
  if(index<firstWalking) {
    const rise=index/Math.max(1,firstWalking-1);
    const body=fallBody(model,space,frame,(1-rise)*(wisp.release-.32),wisp.release);
    decayBody(out,body,0);
  } else {
    drawActor(out,model,movement(model,{walk:(index-firstWalking)/16},-1),space.view,false);
  }
  let sourceAlpha=0;
  for(const colour of frame.d)sourceAlpha=Math.max(sourceAlpha,colour>>>24);
  const spiritTones=[0x7b6837,0xbdb676,0xd6d8a2,0xe9f3cc,0xf7ffed];
  // The same five spectral inks as the live walk-off. The HUD applies its
  // independent apparition fade and horizontal travel after the rise.
  for(let i=0;i<out.d.length;i++) if(out.d[i]>>>24) {
    const light=lightOf(out.d[i]);
    out.d[i]=(sourceAlpha<<24|spiritTones[Math.min(4,Math.floor(light*5))])>>>0;
  }
  return out;
}
