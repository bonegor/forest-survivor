// Belt position, chest angle and compression, then each knee, ankle and boot
// angle. A short recovery step takes the weight before both shins fold
// underneath. Four points of support hold the chest above the floor.
const FALL = [
  [0,   39,44,  0,1,    37,50,35,53,0,   42,50,43,53,0],
  [.12, 39,44,  0,1,    37,50,35,53,0,   42,50,43,53,0],
  [.20, 38,44, -7,1,    36,50,34,53,-3,  41,49,43,52,-8],
  [.30, 37,44,-12,.99,  35,49,33,53,-6,  42,48,45,50,-15],
  [.40, 38,44, -2,1,    36,49,33,53,-8,  43,49,47,51,-8],
  [.52, 40,44, 12,.99,  37,49,33,52,-16, 44,50,47,53,-2],
  [.65, 40,45, 20,.98,  36,50,32,51,-46, 44,50,47,53,-3],
  [.78, 39,46, 31,.97,  35,52,30,50,-104,43,51,45,52,-40],
  [.90, 38,46, 44,.97,  33,53,28,51,-150,40,53,36,52,-116],
  [1.00,37,46, 57,.98,  32,53,27,52,-167,38,53,33,54,-160],
  [1.05,37,46, 63,.98,  32,54,27,52,-171,38,54,33,54,-168],
  [1.20,37,46, 63,.98,  32,54,27,52,-171,38,54,33,54,-168],
  [1.30,38,47, 68,.97,  33,54,27,52,-155,38,54,33,54,-150],
  [1.40,40,49, 77,.96,  35,53,28,52,-131,38,54,33,54,-127],
  [1.50,43,50, 85,.96,  37,52,29,51,-96, 38,54,32,54,-99],
  [1.60,45,51, 89,.96,  38,52,30,51,-70, 38,54,32,54,-79],
];
// The back axe slips first. The lead axe carries forward during the step.
// Both lie flat before her open palms take her weight.
const BACK_AXE = [
  [0,32,45,-.22],[.12,32,45,-.22],[.20,31,44,-.28],[.26,29,44,-.43],
  [.40,27,44,-.83],[.54,25,45,-1.16],[.70,24,47,-1.45],[.78,24,48,-1.57],
];
const LEAD_AXE = [
  [0,45,45,.39],[.12,45,45,.39],[.26,44,43,.34],[.40,46,43,.43],
  [.52,49,43,.61],[.65,55,43,.89],[.78,61,45,1.18],[.90,65,47,1.44],[1.00,67,48,1.52],
];
const BACK_HAND = [
  [.26,29,44],[.42,33,44],[.59,37,44],[.75,40,46],[.90,42,50],
  [1.00,43,53],[1.05,43,54],[1.30,43,54],[1.40,45,54],[1.50,49,54],[1.60,53,54],
];
const LEAD_HAND = [
  [.52,49,43],[.70,49,44],[.83,49,47],[.94,50,51],[1.00,50,52],
  [1.05,50,54],[1.35,50,54],[1.45,51,54],[1.55,53,54],[1.60,55,54],
];
// The elbows fold outward under the load. The open palms stay in contact
// as the chest and cheek settle directly onto the floor.
const ELBOWS = [
  [.95,41,48,47,46],[1.05,42,49,47,48],[1.20,42,49,47,48],
  [1.30,41,51,45,51],[1.40,42,53,45,53],[1.50,46,53,49,54],[1.60,50,53,52,54],
];
const HEAD_LIFT = [
  [0,0],[.30,4],[.52,-4],[.78,-8],[1.05,-23],[1.20,-23],
  [1.30,-19],[1.40,-12],[1.50,-5],[1.60,0],
];

function authoredAt(keys,t) {
  let i=1;
  while(i<keys.length && keys[i][0]<t) i++;
  if(i===keys.length) return keys.at(-1).slice(1);
  const a=keys[i-1], b=keys[i];
  const u=Math.min(1,Math.max(0,(t-a[0])/(b[0]-a[0])));
  return a.slice(1).map((x,j)=>x+(b[j+1]-x)*u);
}
const radians=d=>d*Math.PI/180;
const joint=(a,b,angle,pivot,scale=1)=>{
  const cs=Math.cos(angle), sn=Math.sin(angle);
  return [pivot[0]+a*cs-b*scale*sn,pivot[1]+a*sn+b*scale*cs];
};
const roundPoint=p=>p.map(Math.round);
const texel=k=>k.split(',').map(Number);

// Retain the original hand-pixelled texels during turns. Inverse lookup keeps
// continuous outlines around the plait, sockets and boots at steep angles.
function spin(out,texture,from,to,angle,scaleY=1) {
  const c=Math.cos(angle),s=Math.sin(angle);
  const pts=[...texture.keys()].map(texel);
  const radius=Math.ceil(Math.max(...pts.map(p=>Math.hypot(p[0]-from[0],p[1]-from[1])))+2);
  for(let y=Math.max(0,Math.floor(to[1]-radius));y<=Math.min(63,to[1]+radius);y++){
    for(let x=Math.max(0,Math.floor(to[0]-radius));x<=Math.min(79,to[0]+radius);x++){
      const dx=x-to[0],dy=y-to[1];
      const u=Math.round(from[0]+c*dx+s*dy),v=Math.round(from[1]+(-s*dx+c*dy)/scaleY);
      const key=texture.get(u+','+v);
      if(key) out.set(x+','+y,key);
    }
  }
}

function fallLeg(out,hip,knee,ankle,roll,far) {
  const part=new Part();
  part.limb(hip,knee,1.7,1.35,far?'BbCc':'DdEG');
  part.limb(knee,ankle,1.35,1.15,far?'MmNn':'NnOR');
  lay(out,part,2);
  const foot=new Map(), [x,y]=knee.map(Math.round);
  tile(out,x-1,y,[far?'mNm':'mOm']);
  tile(foot,0,0,far?['MNm..','mNOm.','MNNNM']:['mNm..','nOOOm','mNNNm']);
  spin(out,foot,[1,0],ankle,radians(roll));
}

function fallArm(out,shoulder,hand,far,open,planted,t) {
  const dx=hand[0]-shoulder[0],dy=hand[1]-shoulder[1],dist=Math.hypot(dx,dy)||1;
  const elbowBend=Math.min(3,Math.max(1,(9.5-dist)*.65));
  const freeElbow=[(shoulder[0]+hand[0])*.5-dy*elbowBend/dist,(shoulder[1]+hand[1])*.5+dx*elbowBend/dist];
  const fixed=authoredAt(ELBOWS,t).slice(far?0:2,far?2:4);
  const takeWeight=Math.min(1,Math.max(0,(t-.90)/.15));
  const elbow=freeElbow.map((p,i)=>p+(fixed[i]-p)*takeWeight);
  wolfArm(out,shoulder,elbow,roundPoint(hand),far);
  if(open) {
    const palm=planted?(far?['.fk.','rFFf','mkkk']:['.Fk.','FPPf','Kffk']):
      (far?['.fk','rFF','kk.']:['.Fk','PFf','.k.']);
    tile(out,Math.round(hand[0])-1,Math.round(hand[1])-1,palm);
  }
}

function placeAxe(out,keys,t,far) {
  const [x,y,angle]=authoredAt(keys,t), part=new Map();
  wolfAxe(part,roundPoint([x,y]),far?-1:1,angle);
  const maxY=Math.max(...[...part.keys()].map(k=>texel(k)[1]));
  const last=keys.at(-1)[0];
  const dy=t>=last?55-maxY:Math.min(0,55-maxY);
  for(const [k,ink] of part) {
    const [px,py]=texel(k);
    out.set(px+','+(py+dy),ink);
  }
}

function fallingYlva(seconds) {
  // Hold the complete drawing, including the loose end of the braid.
  const t=seconds>=1.05&&seconds<1.25?1.05:Math.min(seconds,1.60);
  const [bx,by,tilt,scale,fkx,fky,fax,fay,froll,nkx,nky,nax,nay,nroll]=authoredAt(FALL,t);
  const angle=radians(tilt), belt=[bx,by], local=(x,y)=>joint(x-23,y-28,angle,belt,scale);
  const farOpen=t>.26, nearOpen=t>.52;
  const back=authoredAt(farOpen?BACK_HAND:BACK_AXE,t);
  const lead=authoredAt(nearOpen?LEAD_HAND:LEAD_AXE,t);
  const body=new Map(), vest=new Map(), wolf=new Map(), face=new Map();
  tile(vest,19,21,SLIM_COAT);
  tile(wolf,15,19,FUR);
  wolfBraid(face,0,0,t*5);
  wolfHead(face,0,0);
  fallLeg(body,local(22,30),[fkx,fky],[fax,fay],froll,true);
  fallLeg(body,local(25,30),[nkx,nky],[nax,nay],nroll,false);
  spin(body,vest,[23,28],belt,angle,scale);
  fallArm(body,local(21,23),back,true,farOpen,t>=1.05,t);
  spin(body,wolf,[23,28],belt,angle,scale);
  fallArm(body,local(25,22),lead,false,nearOpen,t>=1.05,t);
  const [lift]=authoredAt(HEAD_LIFT,t);
  spin(body,face,[23,20],local(23,20),angle+radians(lift),scale);

  const out=new Map();
  // Flatten the lowest palm, knee and cheek pixels at the ground plane.
  for(const [k,color] of body) {
    const [x,y]=texel(k);
    if(y<=55) out.set(x+','+y,color);
  }
  placeAxe(out,BACK_AXE,t,true);
  placeAxe(out,LEAD_AXE,t,false);
  if(!farOpen) guardFist(out,roundPoint(back.slice(0,2)),true,back[2]);
  if(!nearOpen) guardFist(out,roundPoint(lead.slice(0,2)),false,lead[2]);
  return out;
}

const GEAR_CELL=37;
anim('ylva-fall',{w:80,h:64,frames:GEAR_CELL+1},c=>{
  const t=c.frame/20;
  // The final auxiliary cell is the two discarded axes alone.
  const out=c.frame===GEAR_CELL?new Map():fallingYlva(t);
  if(c.frame===GEAR_CELL) {placeAxe(out,BACK_AXE,t,true);placeAxe(out,LEAD_AXE,t,false);}
  for(const [key,ink] of out) {
    const [x,y]=texel(key);
    if(x>=0&&x<80&&y>=0&&y<64)c.px(x,y,ink);
  }
});
