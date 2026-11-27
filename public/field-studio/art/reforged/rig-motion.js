import { HERO_ART } from '../../../js/art/heroes.js';
import { add, clamp, lerp, mixPoint, radians } from './rig-pixels.js';

const tau=2*Math.PI;
const cycles=new Map(), falls=new Map();
const noAttack={main:[0,0],off:[0,0],angle:0,offAngle:0,lean:0,dip:0,head:[0,0]};
function attackPhase(i,release,last) {
  return i<=release ? i/Math.max(1,release)*.5 : .5+(i-release)/Math.max(1,last-release)*.5;
}
export function clipPose(id,index) {
  if(!cycles.has(id)) {
    const source=HERO_ART[id], poses=new Map(), attack=source.attack||[], last=attack.length-1;
    const release=source.attackRelease ?? Math.max(0,Math.round(last/2));
    for(const [i,k] of (source.idle||[0]).entries()) poses.set(k,{idle:i/(source.idle?.length||1)});
    for(const [i,k] of (source.walk||[]).entries()) poses.set(k,{walk:i/source.walk.length});
    const actions=new Map();
    const addPose=(k,i,walk)=>{
      if(!actions.has(k)) actions.set(k,{first:i,last:i,walk});
      else actions.get(k).last=i;
    };
    attack.forEach((k,i)=>addPose(k,i,null));
    (source.attackWalk||[]).forEach((row,i)=>row.forEach((k,j)=>addPose(k,i,j/row.length)));
    for(const [k,a] of actions) {
      // Held cells on a repeated attack sheet should pass through its true
      // release pose, including a recovery that reuses its starting cell.
      const i=a.first<=release && release<=a.last && attack[release]===k ? release
        : a.last-a.first>last/2 ? a.first : (a.first+a.last)/2;
      poses.set(k,{attack:attackPhase(i,release,last),walk:a.walk});
    }
    cycles.set(id,poses);
  }
  return cycles.get(id).get(index) || {idle:0};
}
export function fallTime(id,index) {
  if(!falls.has(id)) {
    const fall=HERO_ART[id].fall, times=new Map();
    for(let n=0;n<=6*240;n++) {
      const t=n/240,k=fall.frameAt(t);
      if(!times.has(k)) times.set(k,t);
    }
    falls.set(id,times);
  }
  return falls.get(id).get(index) ?? 6;
}
const banks={
  slash:[
    [0,0,0,0,0,0,0,0,0],[.23,-2,-4,-59,1,-1,-8,-5,.7],
    [.5,4,-2,37,-1,1,8,6,1],[.70,3,1,57,-1,0,6,8,1],[1,0,0,0,0,0,0,0,0]],
  thrust:[
    [0,0,0,0,0,0,0,0,0],[.28,-3,1,-13,0,-1,-5,-5,.8],
    [.5,7,-1,8,-2,0,5,9,1.1],[.68,5,-1,10,-1,0,3,7,1],[1,0,0,0,0,0,0,0,0]],
  twin:[
    [0,0,0,0,0,0,0,0,0],[.24,-2,-3,-55,2,-1,29,-6,1],
    [.5,4,-1,38,-2,-4,-47,7,1],[.73,1,1,57,5,0,46,6,.5],[1,0,0,0,0,0,0,0,0]],
  cast:[
    [0,0,0,0,0,0,0,0,0],[.24,-1,-3,-12,0,-3,-16,-5,.3],
    [.5,3,-2,14,6,-4,-23,5,1],[.72,1,-1,7,4,-1,6,3,.6],[1,0,0,0,0,0,0,0,0]],
  bow:[
    [0,0,0,0,0,0,0,0,0],[.22,2,-3,-5,-3,-2,-8,-2,.3],
    [.5,4,-3,-5,-3,-2,-12,-3,.6],[.64,2,-2,4,-1,0,12,1,.1],[1,0,0,0,0,0,0,0,0]],
  crossbow:[
    [0,0,0,0,0,0,0,0,0],[.3,2,-2,-6,0,0,0,3,.5],
    [.5,2,-2,-3,0,0,0,4,.7],[.61,-2,-3,-10,0,0,0,-5,.4],[1,0,0,0,0,0,0,0,0]],
  whip:[
    [0,0,0,0,0,0,0,0,0],[.25,-4,-4,-77,-1,1,3,-6,1],
    [.5,6,-1,25,-1,0,-6,8,0],[.72,3,1,48,0,1,3,5,1],[1,0,0,0,0,0,0,0,0]],
};
const bankKeys=Object.fromEntries(Object.entries(banks).map(([action,rows])=>[action,rows.map(
  ([t,x,y,angle,ox,oy,offAngle,lean,dip])=>({t,main:[x,y],off:[ox,oy],angle,offAngle,lean,dip}))]));
function keysAt(keys,t) {
  const upper=keys.findIndex(key=>key.t>=t), end=upper<0?keys.length-1:upper;
  const b=keys[end],a=keys[Math.max(0,end-1)],u=clamp((t-a.t)/(b.t-a.t||1));
  const result={};
  for(const key of ['main','off','head']) result[key]=mixPoint(a[key]||noAttack[key],b[key]||noAttack[key],u);
  for(const key of ['angle','offAngle','lean','dip']) result[key]=lerp(a[key]??0,b[key]??0,u);
  return result;
}
export function movement(model,clip,index) {
  const m=model.m,walking=clip.walk!=null, phase=(walking?clip.walk:clip.idle||0)*tau;
  const pace=walking?Math.sin(phase):0, float=m.hover||0;
  const stepBob=walking?(Math.cos(2*phase)-.3)*.6*(m.bob??1):0;
  const breathing=walking?0:Math.sin(phase)*(m.breath??.65);
  const attack=clip.attack==null?{...noAttack}:keysAt(m.attackKeys || bankKeys[m.action] || bankKeys.slash,clip.attack);
  const armGain=m.attackKeys?1:(m.reach??4)/4, rotation=m.attackKeys?1:(m.swing??83)/83;
  const edit=model.design.poses?.[index] || {};
  return {
    walking,clip,angle:(attack.angle*rotation)+(edit.angle||0),offAngle:attack.offAngle*rotation+(edit.offAngle||0),
    main:add(attack.main.map(n=>n*armGain),edit.main||[0,0]),off:add(attack.off.map(n=>n*armGain),edit.off||[0,0]),
    lean:attack.lean+(edit.lean||0)+(walking?1.4:0),head:add(attack.head,edit.head||[0,0]),
    x:walking?pace*(m.sway??.55):0,
    y:float ? -float+Math.sin(phase)*(walking?1.25:.9) : stepBob+breathing+attack.dip+(edit.dip||0),
    armswing:walking&&clip.attack==null?pace*1.45:0, cloth:walking?Math.sin(phase-.7)*2-1:Math.sin(phase-.8)*.7,
    headBob:breathing*.45,phase:walking?clip.walk:null,footEdit:walking?edit:null,
  };
}

export function sole(model,far,pose) {
  const m=model.m, base=far?(m.farFoot??-3):(m.nearFoot??3);
  if(pose.feet) return pose.feet[far?0:1];
  if(m.hover) return {x:base+pose.x*.55,y:pose.y,angle:radians(5)};
  if(!pose.walking) return {x:base,y:0,angle:0};
  const u=(pose.phase+(far?.5:0))%1, stride=m.stride??4.6, lift=m.lift??3.3;
  const support=.60;
  let foot;
  if(u<support) {
    const t=u/support;
    foot={x:base+stride*(1-2*t),y:0,angle:radians(t<.21?lerp(-13,0,t/.21):t>.66?lerp(0,25,(t-.66)/.34):0)};
  } else {
    const t=(u-support)/(1-support), ease=t*t*(3-2*t);
    foot={x:base+lerp(-stride,stride,ease),y:-Math.sin(t*Math.PI)*lift,
      angle:radians(lerp(25,-13,t)-Math.sin(t*Math.PI)*13)};
  }
  const adjust=pose.footEdit?.[far?'farFoot':'nearFoot'];
  if(adjust) {foot.x+=adjust[0];foot.y+=adjust[1];foot.angle+=radians(adjust[2]||0);}
  return foot;
}

// A two-bone joint with independent source lengths. Slightly longer reaches
// stretch the authored segments together, keeping skin, cuffs and gear attached.
export function hinge(start,end,l1,l2,side) {
  const dx=end[0]-start[0],dy=end[1]-start[1],d=Math.max(.01,Math.hypot(dx,dy));
  const reach=Math.max(1,d/(l1+l2));
  l1*=reach; l2*=reach;
  const x=clamp((l1*l1-l2*l2+d*d)/(2*d),-l1,l1);
  const h=Math.sqrt(Math.max(0,l1*l1-x*x))*side;
  return [start[0]+(dx*x-dy*h)/d,start[1]+(dy*x+dx*h)/d];
}

export function fallPose(model,t,release) {
  const m=model.m,side=m.fallSide??1, buckle=clamp((t-.25)/.68);
  const land=clamp((t-.56)/Math.max(.35,release-.92)), eased=land*land*(3-2*land);
  const catchStep=Math.sin(Math.PI*clamp(t/.42)), bounce=Math.sin(Math.PI*clamp((land-.8)/.2));
  const stagger=movement(model,{idle:0},-1);
  const nf=m.nearFoot??3, ff=m.farFoot??-3;
  const edit=m.fallKeys?.length?keysAt(m.fallKeys,t):noAttack;
  return {...stagger,x:side*(catchStep*1.8+2*buckle),y:2.5*buckle-(m.hover??0)*(1-buckle)+edit.dip,
    lean:side*(catchStep*-9+12*buckle-5*eased)+edit.lean,
    feet:[{x:ff-2*side*buckle,y:-2.6*catchStep-1.8*eased,angle:radians(12*eased)},
      {x:nf+side*(2.5*catchStep+2*eased),y:-1.2*eased,angle:radians(-13*catchStep+8*eased)}],
    main:add([2*side*buckle,-2.8*catchStep+1.3*eased],edit.main),
    off:add([-side*(1.3*catchStep+2*eased),-2.3*catchStep+.6*eased],edit.off),
    angle:side*(-19*catchStep+23*buckle)+edit.angle,offAngle:side*(12*catchStep-20*buckle)+edit.offAngle,
    cloth:side*(-4*eased+1.5*bounce),head:add([side*(buckle-2*eased),-bounce],edit.head),
    turn:radians(side*(eased*83+3*bounce)),depth:lerp(1,.64,eased),
    travel:side*(catchStep-eased*8)};
}
