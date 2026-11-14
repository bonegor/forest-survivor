// Original boss model art generated with the built-in image tool, then authored
// as connected texture rigs. Rebuild: node tools/boss-art/build.mjs
// Offline only: production loads the baked palettes and delta-coded poses.
import {writeFileSync,mkdirSync} from 'node:fs';
import {sources} from './extract.mjs';
import {writePng} from '../png.mjs';
const W=224,H=192,FOOT=166,CX=W/2,TAU=Math.PI*2;
mkdirSync('output/hero-round2-2026-11-14/bosses',{recursive:true});
const SRC=sources(),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const rot=(p,o,a)=>{const c=Math.cos(a),s=Math.sin(a),x=p[0]-o[0],y=p[1]-o[1];return[o[0]+x*c-y*s,o[1]+x*s+y*c];};
const add=(p,q)=>[p[0]+q[0],p[1]+q[1]];
const inside=(p,poly)=>{let b=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],c=poly[j];if((a[1]>p[1])!==(c[1]>p[1])&&p[0]<(c[0]-a[0])*(p[1]-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;};
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
// Every polygon is a semantic texture island; the same original material is
// retained throughout the full cycle. A shared mesh closes elbow/knee seams.
const RIG={
 butcher:{oldHeight:26,oldHr:31.6923076923,kit:'butcher',cycle:.7,hip:[65,84],head:[65,29],headMask:[[48,0],[85,0],[84,28],[78,33],[60,29],[48,20]],
  front:[[82,33],[87,47],[98,41]],frontMask:[[85,0],[115,0],[112,57],[92,57],[86,49],[80,48],[81,34],[89,31]],frontJoint:48,
  rear:[[38,29],[28,49],[28,66]],rearMask:[[32,26],[44,30],[42,42],[35,52],[36,66],[39,73],[36,82],[40,94],[36,102],[23,105],[16,96],[19,82],[27,75],[19,71],[18,56],[17,45],[23,32]],rearJoint:49,
  legs:[{hip:[50,85],knee:[47,102],foot:[45,121],mask:[[34,91],[61,94],[62,128],[29,128]]},{hip:[78,88],knee:[78,105],foot:[83,121],mask:[[66,96],[100,97],[104,128],[66,128]]}],cape:null},
 lich:{oldHeight:25,oldHr:27.22,kit:'lich',cycle:1.6,hip:[64,84],head:[67,34],headMask:[[46,0],[77,0],[77,32],[68,40],[58,36],[49,27]],
  front:[[77,47],[85,64],[94,59]],frontMask:[[90,0],[115,0],[113,26],[96,50],[103,54],[100,68],[94,75],[94,128],[85,128],[86,76],[81,67],[80,56],[84,51],[87,28]],frontJoint:65,
  rear:[[44,43],[43,61],[49,77]],rearMask:[[39,41],[52,44],[55,57],[51,64],[56,76],[57,88],[47,90],[43,82],[39,72],[31,72],[34,55]],rearJoint:62,legs:[],cape:{x:64,y:49}},
 pharaoh:{oldHeight:28,oldHr:27.4642857143,kit:'boneking',cycle:1.05,hip:[65,77],head:[65,36],headMask:[[34,0],[74,0],[77,39],[69,44],[47,34],[35,25]],
  front:[[77,49],[89,59],[101,55]],frontMask:[[80,0],[124,0],[124,128],[86,128],[89,67],[80,62],[78,52],[88,49],[91,35],[80,35]],frontJoint:60,
  rear:[[42,43],[39,65],[43,85]],rearMask:[[36,36],[49,40],[48,57],[45,65],[46,76],[54,85],[53,96],[40,96],[34,86],[33,75],[30,67],[33,53]],rearJoint:66,
  legs:[{hip:[62,76],knee:[51,98],foot:[47,121],mask:[[55,76],[68,84],[60,99],[58,127],[35,127],[42,104],[48,91]]},{hip:[80,82],knee:[84,104],foot:[93,121],mask:[[78,94],[94,95],[98,113],[109,128],[77,128]]}],cape:{x:69,y:61}},
 frostgiant:{oldHeight:28,oldHr:33.5714285714,kit:'butcher',cycle:.8,hip:[65,81],head:[65,31],headMask:[[47,0],[81,0],[84,18],[90,28],[87,44],[80,52],[70,44],[64,32],[55,28],[50,18]],
  front:[[80,39],[87,51],[97,46]],frontMask:[[89,0],[127,0],[127,41],[108,42],[106,53],[99,57],[91,128],[81,128],[88,59],[82,55],[80,48],[84,42],[84,26]],frontJoint:52,
  rear:[[39,38],[32,57],[37,74]],rearMask:[[31,32],[47,34],[48,45],[43,51],[44,62],[47,72],[49,81],[41,86],[31,82],[29,74],[24,64],[23,53],[24,42]],rearJoint:57,
  legs:[{hip:[51,81],knee:[44,102],foot:[43,124],mask:[[43,79],[62,86],[55,104],[56,128],[29,128],[30,107],[36,94]]},{hip:[77,85],knee:[80,105],foot:[86,124],mask:[[65,91],[98,94],[112,128],[66,128]]}],cape:{x:54,y:47}},
 thornqueen:{oldHeight:28,oldHr:29.5,kit:'lich',cycle:1.65,hip:[65,84],head:[65,34],headMask:[[41,0],[77,0],[77,36],[66,41],[56,32],[45,25]],
  front:[[78,48],[89,64],[96,55]],frontMask:[[83,0],[113,0],[113,28],[99,38],[104,50],[102,62],[98,67],[100,128],[91,128],[90,73],[89,68],[81,65],[79,54],[85,49],[88,34]],frontJoint:65,
  rear:[[46,47],[44,65],[51,80]],rearMask:[[39,42],[52,43],[55,56],[51,65],[55,78],[57,87],[48,89],[44,81],[39,73],[32,69],[35,55]],rearJoint:65,legs:[],cape:{x:65,y:47}},
 pitlord:{oldHeight:28,oldHr:33.5714285714,kit:'boneking',cycle:.8,hip:[65,82],head:[65,33],headMask:[[30,0],[80,0],[81,27],[77,34],[65,36],[56,28],[36,22]],
  front:[[79,39],[90,53],[101,42]],frontMask:[[97,16],[110,16],[110,31],[114,43],[113,48],[124,54],[121,63],[108,65],[109,101],[105,127],[98,127],[94,102],[95,65],[87,63],[85,56],[80,53],[80,45],[89,45],[95,41]],frontJoint:54,
  rear:[[39,43],[33,63],[39,83]],rearMask:[[30,35],[45,36],[47,49],[42,57],[47,66],[47,76],[50,82],[44,92],[34,92],[29,87],[25,78],[25,68],[23,58],[18,52],[25,49]],rearJoint:64,
  legs:[{hip:[54,81],knee:[45,102],foot:[44,124],mask:[[47,78],[65,87],[58,102],[55,128],[30,128],[31,108],[36,96]]},{hip:[78,84],knee:[81,105],foot:[90,124],mask:[[72,91],[97,95],[111,114],[115,128],[70,128]]}],cape:{x:63,y:80}},
};

// Pixel sampling can open a one-pixel gap at a curved crook or articulated
// cuff. Weld only such short sampling seams with the island's edge colour;
// detached isolated texture flecks are discarded, never large body parts.
function weld(d){
 const seen=new Uint8Array(d.length),groups=[];
 for(let i=0;i<d.length;i++){if(!d[i]||seen[i])continue;const q=[i],g=[];seen[i]=1;while(q.length){const p=q.pop(),x=p%W,y=Math.floor(p/W);g.push(p);for(let yy=Math.max(0,y-1);yy<=Math.min(H-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(W-1,x+1);xx++){const j=yy*W+xx;if(d[j]&&!seen[j]){seen[j]=1;q.push(j);}}}groups.push(g);}groups.sort((a,b)=>b.length-a.length);
 if(groups.length<2)return;const connected=new Uint8Array(d.length);for(const p of groups[0])connected[p]=1;
 for(const g of groups.slice(1)){let dist=Infinity,from=0,to=0;for(const p of g){const x=p%W,y=Math.floor(p/W);for(let yy=Math.max(0,y-3);yy<=Math.min(H-1,y+3);yy++)for(let xx=Math.max(0,x-3);xx<=Math.min(W-1,x+3);xx++){const j=yy*W+xx;if(!connected[j])continue;const gap=(x-xx)**2+(y-yy)**2;if(gap<dist){dist=gap;from=p;to=j;}}}if(dist<=9){const x0=from%W,y0=Math.floor(from/W),x1=to%W,y1=Math.floor(to/W),n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let k=0;k<=n;k++){const p=Math.round(mix(y0,y1,k/n))*W+Math.round(mix(x0,x1,k/n));if(!d[p])d[p]=d[from];connected[p]=1;}for(const p of g)connected[p]=1;}else if(g.length<=24)for(const p of g)d[p]=0;}
}

function arm(p,chain,ua,fa,joint){
 const [s,e]=chain,ne=rot(e,s,ua),upper=rot(p,s,ua),lower=add(rot(p,e,ua+fa),[ne[0]-e[0],ne[1]-e[1]]);
 const w=smooth((p[1]-joint+3)/6);return[mix(upper[0],lower[0],w),mix(upper[1],lower[1],w)];
}
function leg(p,l,stride,lift,bob){
 const [h,k,f]=[l.hip,l.knee,l.foot],goal=[f[0]+stride,f[1]-lift-bob],a=Math.hypot(k[0]-h[0],k[1]-h[1]),b=Math.hypot(f[0]-k[0],f[1]-k[1]);
 const dx=goal[0]-h[0],dy=goal[1]-h[1],d=Math.hypot(dx,dy),along=clamp((a*a-b*b+d*d)/(2*d),0,a),cross=Math.sqrt(Math.max(0,a*a-along*along));
 const sign=(f[0]-h[0])*(k[1]-h[1])-(f[1]-h[1])*(k[0]-h[0])>=0?1:-1,nk=[h[0]+dx/d*along-dy/d*cross*sign,h[1]+dy/d*along+dx/d*cross*sign];
 const ua=Math.atan2(nk[1]-h[1],nk[0]-h[0])-Math.atan2(k[1]-h[1],k[0]-h[0]),la=Math.atan2(goal[1]-nk[1],goal[0]-nk[0])-Math.atan2(f[1]-k[1],f[0]-k[0]);
 const up=rot(p,h,ua),lo=add(rot(p,k,la),[nk[0]-k[0],nk[1]-k[1]]),weight=smooth((p[1]-k[1]+3)/6);
 return[mix(up[0],lo[0],weight),mix(up[1],lo[1],weight)];
}

function pose(name,phase,u,kit){
 const travel=name==='walk'||name==='dash',s=Math.sin(phase),c=Math.cos(phase),heavy=kit!=='lich';
 const q={bob:travel?Math.abs(s)*1.5:heavy?Math.sin(phase)*.55:0,lean:0,frontUpper:travel?c*.045:Math.sin(phase)*.012,frontFore:0,rearUpper:travel?-c*.13:Math.sin(phase)*.02,rearFore:travel?c*.07:0,head:travel?-s*.018:Math.sin(phase)*.01,stride:travel?(name==='dash'?9:11):0,phase,cloth:travel?3:1.3,travel};
 if(name==='charge'||name==='dash'||name==='recover'){
  const a=name==='charge'?smooth(u):name==='recover'?1-smooth(u):1;
  q.lean=.14*a;q.bob+=2*a;q.frontUpper=-.3*a;q.frontFore=1.05*a;q.rearUpper=.28*a;q.rearFore=-.15*a;q.head=-.08*a;
 }
 if(name==='slam'||name==='nova'){
  // Frames0–15 wind,16–18 strike,19–23 recover. Runtime maps the strike
  // exactly to the kit's existing .85s / 1s damage release.
  const rise=smooth(u/.63),strike=smooth((u-.63)/.13),back=smooth((u-.79)/.21),a=rise*(1-back),impact=strike*(1-back);
  q.frontUpper=(-.65*a+.95*impact)*(kit==='butcher'?1:.42);q.frontFore=(-.35*a+1.6*impact)*(kit==='butcher'?1:.35);q.rearUpper=.7*a-.45*impact;q.rearFore=.45*a;q.lean=-.045*a+.19*impact;q.bob=-1.5*a+3*impact;q.head=-.06*a+.07*impact;q.cloth=2+impact*2;
 }
 if(['summon','volley','blink','summonWind','volleyWind'].includes(name)){
  const wind=name.endsWith('Wind'),a=wind?smooth(u):1-smooth(u);
  q.rearUpper=.5*a;q.rearFore=.75*a;q.frontUpper=-.2*a;q.frontFore=.13*a;q.lean=-.035*a;q.head=-.035*a;q.bob-=a*.7;q.cloth=2.5;
  if(name==='blink'){q.rearUpper=.2*a;q.rearFore=-.45*a;q.frontUpper=.12*a;q.frontFore=-.15*a;q.lean=.04*a;}
 }
 return q;
}

function render(id,name,phase,u){
 const src=SRC[id],r=RIG[id],q=pose(name,phase,u,r.kit),scale=114/(src.box[3]-src.box[1]),base=src.box[3]-1,d=new Uint32Array(W*H),verts=[];
 const frontContains=p=>{
  if(!inside(p,r.frontMask))return false;
  const[x,y]=p;
  // Below the grip, a shaft/point passes in front of robes and boots. Keep
  // only that authored equipment corridor in its rigid weapon island.
  if(id==='pharaoh'&&y>70)return Math.abs(x-(96-(y-70)*.075))<2.4;
  if(id==='lich'&&y>70)return Math.abs(x-(94-(y-70)*.12))<2.3;
  if(id==='thornqueen'&&y>65)return Math.abs(x-(95.5+(y-65)*.02))<3.5;
  if(id==='frostgiant'&&y>60)return Math.abs(x-(96-(y-60)*.15))<3.2;

  return true;
 };
 const partOf=p=>frontContains(p)?4:inside(p,r.rearMask)?3:inside(p,r.headMask)?2:r.legs.findIndex(l=>inside(p,l.mask))>=0?10+r.legs.findIndex(l=>inside(p,l.mask)):0;
 const partMap=new Uint8Array(128*128);for(let y=0;y<128;y++)for(let x=0;x<128;x++)partMap[y*128+x]=partOf([x+.5,y+.5]);
 // Reconstruct only the material hidden by the rest-pose arms, so lifting a
 // limb reveals a continuous apron/robe/chest, never an empty cutout hole.
 const cores={butcher:[[44,26],[79,28],[89,44],[93,61],[92,100],[65,106],[32,93],[35,71],[40,49]],lich:[[51,36],[76,36],[89,56],[91,78],[126,126],[0,126],[33,76],[42,51]],pharaoh:[[48,36],[75,40],[87,57],[89,112],[44,113],[45,75]],frostgiant:[[46,30],[76,31],[88,46],[87,67],[79,101],[42,99],[34,72],[40,49]],thornqueen:[[51,36],[77,37],[87,53],[104,99],[128,126],[0,126],[36,75],[44,54]],pitlord:[[45,31],[77,31],[88,48],[88,95],[48,107],[34,87],[37,61]]};
 const body=src.d.slice(),bodyMask=new Uint8Array(128*128);
 const nearest=(x,y,part,limit=Infinity)=>{let best=Infinity,col=0;for(let yy=Math.max(0,y-16);yy<Math.min(128,y+17);yy++)for(let xx=Math.max(0,x-16);xx<Math.min(128,x+17);xx++){const j=yy*128+xx;if(!src.d[j]||partMap[j]!==part)continue;const dis=(xx-x)**2+(yy-y)**2;if(dis<best){best=dis;col=src.d[j];}}return best<=limit?col:0;};
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=y*128+x;if(partMap[i]===0){bodyMask[i]=1;continue;}if(!src.d[i]||!inside([x+.5,y+.5],cores[id])){body[i]=0;continue;}bodyMask[i]=1;body[i]=nearest(x,y,0);}
 const legs=r.legs.map((l,n)=>{const d=new Uint32Array(128*128),mask=new Uint8Array(128*128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=y*128+x;if(src.d[i]&&inside([x+.5,y+.5],l.mask)){mask[i]=1;d[i]=partMap[i]===10+n?src.d[i]:nearest(x,y,10+n,16);}}return{d,mask};});
 const deform=(p,part=partOf(p))=>{
  let v=p.slice();
  if(part===4){
   // Equipment is one rigid island with its fist/forearm, including the
   // whole shaft on either side of the grip. It never pivots at its centre.
   const s=r.front[0],e=r.front[1],ne=rot(e,s,q.frontUpper);
   v=add(rot(p,e,q.frontUpper+q.frontFore),[ne[0]-e[0],ne[1]-e[1]]);
  }else if(part===3)v=arm(p,r.rear,q.rearUpper,q.rearFore,r.rearJoint);
  else if(part===2)v=rot(p,r.head,q.head);
  else{
   let onLeg=false;for(let i=0;i<r.legs.length;i++){const l=r.legs[i];if(part===10+i){const sign=i?1:-1;v=leg(p,l,Math.cos(phase)*q.stride*sign,q.travel?Math.max(0,Math.sin(phase)*sign)*3.5:0,q.bob);onLeg=true;break;}}
   if(!onLeg&&r.cape&&p[1]>r.cape.y){const h=smooth((p[1]-r.cape.y)/(base-r.cape.y));v[0]+=Math.sin(phase+(p[0]-r.cape.x)/20)*h*q.cloth;v[1]+=Math.sin(phase+(p[0]-r.cape.x)/25)*h*.8;}
  }
  v=rot(v,r.hip,q.lean);v[1]+=q.bob;
  return[(v[0]-64)*scale+CX,(v[1]-base)*scale+FOOT];
 };
 // 2px mesh provides separate animated limbs without rigid cutout seams.
 // Every shared joint vertex is transformed once, never torn between layers.
 const step=2,cols=65;
 for(let y=0;y<=128;y+=step)for(let x=0;x<=128;x+=step){const p=[x,y];verts.push({p});}
 function triangle(A,B,C,part){
  const [a,b,c]=[A.v,B.v,C.v],den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<.00001)return;
  const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const px=x+.5,py=y+.5,aa=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/den,bb=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/den,cc=1-aa-bb;if(aa<-.001||bb<-.001||cc<-.001)continue;const sx=Math.floor(A.p[0]*aa+B.p[0]*bb+C.p[0]*cc),sy=Math.floor(A.p[1]*aa+B.p[1]*bb+C.p[1]*cc);if(sx<0||sy<0||sx>=128||sy>=128)continue;const i=sy*128+sx;if(part===0?!bodyMask[i]:part>=10?!legs[part-10].mask[i]:partMap[i]!==part)continue;const col=part===0?body[i]:part>=10?legs[part-10].d[i]:src.d[i];if(col)d[y*W+x]=col;}
 }
 const cells=[];
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=y*cols+x,vs=[verts[i],verts[i+1],verts[i+cols],verts[i+cols+1]],parts=new Set;for(let yy=y*2;yy<y*2+2;yy++)for(let xx=x*2;xx<x*2+2;xx++){const k=yy*128+xx;if(src.d[k])parts.add(partMap[k]);if(body[k]&&bodyMask[k])parts.add(0);legs.forEach((l,n)=>{if(l.d[k])parts.add(10+n);});}for(const part of parts){const[A,B,C,D]=vs.map(V=>({p:V.p,v:deform(V.p,part)}));cells.push({A,B,C,D,part,depth:part>=10?1:part});}}
 cells.sort((a,b)=>a.depth-b.depth);for(const {A,B,C,D,part}of cells){triangle(A,B,C,part);triangle(B,D,C,part);}
 weld(d);return{w:W,h:H,d};
}

const IDS=process.argv.filter(x=>Object.hasOwn(RIG,x));
const result={};
for(const id of IDS.length?IDS:Object.keys(RIG)){
 const r=RIG[id],poses={},frames=[],add=(name,n,action=name)=>{const seq=[];for(let i=0;i<n;i++){seq.push(frames.length);frames.push(render(id,action,i/n*TAU,i/(n-1)));}poses[name]=seq;return seq;};
 const idle=add('rest',12,'rest'),walk=add('travel',16,'walk');
 if(r.kit==='butcher'){add('charge',12);add('dash',12);add('recover',12);add('slam',24);}
 else{if(r.kit==='boneking')add('nova',24);add('summon',18);add('volley',12);add('summonWind',6);add('volleyWind',6);if(r.kit==='lich')add('blink',14);}
 const palette=[0],index=new Map([[0,0]]),encoded=[],prev=new Uint16Array(W*H);
 for(const fr of frames){const next=new Uint16Array(W*H);for(let i=0;i<next.length;i++){const v=fr.d[i]>>>0;let k=index.get(v);if(k===undefined){k=palette.length;index.set(v,k);palette.push(v);}next[i]=k;}
  const bytes=[];let pos=0;for(let i=0;i<next.length;){if(next[i]===prev[i]){i++;continue;}const start=i;while(i<next.length&&next[i]!==prev[i])i++;const skip=start-pos,len=i-start;bytes.push(skip&255,skip>>>8,len&255,len>>>8);for(let j=start;j<i;j++)bytes.push(next[j]&255,next[j]>>>8);pos=i;}encoded.push(Buffer.from(bytes).toString('base64'));prev.set(next);
 }
 const oldScale=57/r.oldHeight;
 result[id]={w:W,h:H,palette,frames:encoded,delta16:true,idle,walk,poses,poseFps:24,motionRate:16/((id==='butcher'||id==='frostgiant'?3.5:id==='lich'||id==='thornqueen'?2:3)*r.cycle),idleRate:5,hires:oldScale*2,anchorY:FOOT,below:H-1-FOOT,body:[(r.oldHr-1)*4,114],outline:false,selfBob:true};
 writePng(`output/hero-round2-2026-11-14/bosses/${id}-rig-rest.png`,frames[0]);
 // Contact sheets stay outside production. Their output is evidence, not input.
 const sheet={w:W*8,h:H*Math.ceil(frames.length/8),d:new Uint32Array(W*8*H*Math.ceil(frames.length/8))};frames.forEach((f,n)=>{for(let y=0;y<H;y++)sheet.d.set(f.d.subarray(y*W,(y+1)*W),((Math.floor(n/8)*H+y)*sheet.w)+(n%8)*W);});writePng(`output/hero-round2-2026-11-14/bosses/${id}-rig-contact.png`,sheet);
 console.log(id,frames.length,'poses',palette.length,'colours',encoded.reduce((n,s)=>n+s.length,0),'base64 bytes');
}
mkdirSync('public/assets/art/bosses-reforged',{recursive:true});
for(const[id,data]of Object.entries(result))writeFileSync(`public/assets/art/bosses-reforged/${id}.js`,`// Original model and authored animation. Rebuild: node tools/boss-art/build.mjs\n// hires = original boss scale × 2, keeping each source pixel at .5 world pixels.\nexport default ${JSON.stringify(data)};\n`);
