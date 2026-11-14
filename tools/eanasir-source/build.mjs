// One source model, one articulated rig. Production consumes only the packed
// output, so generation has no browser, image API or machine-local dependency.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readPng,writePng} from '../png.mjs';
import {reduceSource} from '../animation-round/source-detail.mjs';
import {buildTextureWalk} from '../animation-round/grounded-walk.mjs';
const W=160,H=128,D=2,TAU=Math.PI*2,scale=44/1331,pivot=[548,1340];
const source=readPng('tools/eanasir-source/model.png');
const clamp=t=>Math.max(0,Math.min(1,t)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>(t=clamp(t),t*t*(3-2*t));
const logical=p=>[40+(p[0]-pivot[0])*scale,56+(p[1]-pivot[1])*scale];
const armPoly=[[280,309],[368,320],[415,388],[347,470],[314,556],[289,666],[317,758],[330,803],[284,837],[217,837],[173,802],[163,734],[159,677],[180,577],[211,492],[237,400],[249,348]];
const whipPoly=[[160,748],[330,756],[331,808],[302,835],[273,866],[254,934],[216,975],[168,1001],[120,1005],[79,982],[64,951],[63,912],[83,866],[132,804]];
const skirt=[[375,620],[671,620],[700,740],[750,966],[785,1218],[751,1242],[650,1237],[547,1245],[419,1236],[309,1227],[287,1200],[319,960],[346,806]];
function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
const clearSource={...source,d:source.d.slice()},armSource={...source,d:source.d.slice()};
for(let y=0;y<source.h;y++)for(let x=0;x<source.w;x++){
 const p=y*source.w+x,arm=inside(x+.5,y+.5,armPoly),whip=x<345&&y>745&&y<1020&&!inside(x+.5,y+.5,skirt);
 if(arm||whip)clearSource.d[p]=0;
 if(!arm)armSource.d[p]=0;
}
const standing=reduceSource(source,[0,0,source.w,source.h],pivot,scale);
const bareStanding=reduceSource(clearSource,[0,0,source.w,source.h],pivot,scale);
const config={id:'eanasir',scale,pivot,clear:[[[270,970],[810,970],[850,1350],[260,1350]]],protect:[skirt,armPoly,whipPoly],garmentIndices:[0],legs:[
 {name:'near',hip:[433,900],knee:[399,1080],ankle:[352,1264],polygon:[[348,965],[494,975],[477,1080],[427,1160],[409,1270],[432,1326],[414,1343],[281,1343],[278,1317],[306,1260],[320,1160],[322,1060]],offset:0,trackOffset:-1.1},
 {name:'far',hip:[637,900],knee:[661,1084],ankle:[678,1262],polygon:[[571,968],[719,966],[746,1062],[731,1180],[726,1258],[795,1299],[822,1321],[818,1343],[604,1343],[603,1299],[620,1262],[613,1165],[596,1070]],offset:.5,trackOffset:1.1}],
 motion:{frames:16,reach:4.5,support:.6,cycleSeconds:8/9.8,lift:1.7,bob:.3,bodyBobPixels:0,hipCompression:.4,roll:.09}};
const gait=buildTextureWalk(config,source,[],standing,null,{density:D}),bareGait=buildTextureWalk(config,source,[],bareStanding,null,{density:D});
function warp(frame,field){const d=new Uint32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){let sx=x,sy=y;for(let i=0;i<3;i++){const [dx,dy]=field(sx/D,sy/D);sx=x-dx*D;sy=y-dy*D;}const xx=Math.round(sx),yy=Math.round(sy);if(xx>=0&&xx<W&&yy>=0&&yy<H)d[y*W+x]=frame.d[yy*W+xx];}return {w:W,h:H,d};}
function bone(p,a,b,c,d){const ax=b[0]-a[0],ay=b[1]-a[1],al=Math.hypot(ax,ay),bx=d[0]-c[0],by=d[1]-c[1],bl=Math.hypot(bx,by),px=p[0]-a[0],py=p[1]-a[1],u=(px*ax+py*ay)/(al*al),v=(-px*ay+py*ax)/al*scale;return[c[0]+bx*u-by/bl*v,c[1]+by*u+bx/bl*v];}
const shoulder=[350,369],elbow=[262,536],hand=[244,780];
const upper=Math.hypot(elbow[0]-shoulder[0],elbow[1]-shoulder[1])*scale,lower=Math.hypot(hand[0]-elbow[0],hand[1]-elbow[1])*scale;
function joint(a,b){const dx=b[0]-a[0],dy=b[1]-a[1],dist=Math.hypot(dx,dy),extend=Math.max(1,dist/(upper+lower-.1)),u=upper*extend,l=lower*extend,along=(u*u-l*l+dist*dist)/(2*dist),height=Math.sqrt(Math.max(0,u*u-along*along));return[a[0]+dx/dist*along-dy/dist*height,a[1]+dy/dist*along+dx/dist*height];}
function triangle(out,uv,pts){const[a,b,c]=pts,det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<1e-8)return;for(let y=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1])*D));y<=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])*D));y++)for(let x=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0])*D));x<=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0])*D));x++){const px=(x+.5)/D,py=(y+.5)/D,u=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/det,v=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/det,w=1-u-v;if(Math.min(u,v,w)<-1e-8)continue;const sx=Math.floor(uv[0][0]*u+uv[1][0]*v+uv[2][0]*w),sy=Math.floor(uv[0][1]*u+uv[1][1]*v+uv[2][1]*w);if(sx<0||sx>=source.w||sy<0||sy>=source.h)continue;const color=armSource.d[sy*source.w+sx];if(color>>>24>=128)out[y*W+x]=color;}}
function renderArm(d,a,e,h){const map=p=>{const u=bone(p,shoulder,elbow,a,e),v=bone(p,elbow,hand,e,h),blend=smooth((p[1]-elbow[1]+45)/90);return[mix(u[0],v[0],blend),mix(u[1],v[1],blend)];};for(let y=300;y<850;y+=14)for(let x=150;x<430;x+=14){const uv=[[x,y],[x+14,y],[x+14,y+14],[x,y+14]],q=uv.map(map);triangle(d,[uv[0],uv[1],uv[2]],[q[0],q[1],q[2]]);triangle(d,[uv[0],uv[2],uv[3]],[q[0],q[2],q[3]]);}}
const rgba=(r,g,b)=>(255<<24|b<<16|g<<8|r)>>>0;
function line(d,a,b,width,color){const dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;for(let y=Math.max(0,Math.floor((Math.min(a[1],b[1])-width)*D));y<=Math.min(H-1,Math.ceil((Math.max(a[1],b[1])+width)*D));y++)for(let x=Math.max(0,Math.floor((Math.min(a[0],b[0])-width)*D));x<=Math.min(W-1,Math.ceil((Math.max(a[0],b[0])+width)*D));x++){const px=(x+.5)/D,py=(y+.5)/D,t=clamp(((px-a[0])*dx+(py-a[1])*dy)/(len||1));if(Math.hypot(px-a[0]-t*dx,py-a[1]-t*dy)<=width)d[y*W+x]=color;}}
function whip(d,h,pose){const offsets=pose===2||pose===3?[[0,0],[2,0]]:pose===1?[[0,0],[-4,-2],[-7,0],[-6,5],[-3,7],[0,5]]:[[0,0],[-2,2],[-4,5],[-5.4,6.5],[-6.5,5.7],[-6.8,3.8],[-5,1]];const points=offsets.map(p=>[h[0]+p[0],h[1]+p[1]]);for(let i=1;i<points.length;i++)line(d,points[i-1],points[i],.55,rgba(58,32,27));for(let i=1;i<points.length;i++)line(d,points[i-1],points[i],.22,rgba(161,86,48));}
const attackTargets=[logical(hand),[25.5,27.5],[44,38],[45,38.5],logical(hand)],leans=[0,-.4,2.1,2.6,.2];
const grips=[];
function cleanFragments(frame){const seen=new Uint8Array(W*H);for(let start=0;start<W*H;start++){if(seen[start]||frame.d[start]>>>24<32)continue;const q=[start];seen[start]=1;for(let i=0;i<q.length;i++){const p=q[i],x=p%W,y=Math.floor(p/W);for(let yy=Math.max(0,y-1);yy<=Math.min(H-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(W-1,x+1);xx++){const n=yy*W+xx;if(seen[n]||frame.d[n]>>>24<32)continue;seen[n]=1;q.push(n);}}if(q.length<=6)for(const n of q)frame.d[n]=0;}return frame;}
function attackFrame(base,pose){const lean=leans[pose],field=(x,y)=>{const weight=smooth((45-y)/20);return[lean*weight,(pose===2||pose===3?.7:0)*weight];};const f=warp(base,field),a0=logical(shoulder),delta=field(...a0),a=[a0[0]+delta[0],a0[1]+delta[1]],h=attackTargets[pose],e=pose===0||pose===4?logical(elbow):joint(a,h);whip(f.d,h,pose);renderArm(f.d,a,e,h);return cleanFragments(f);}
const frames=[],idle=[],walk=[],attack=[],attackWalk=[];
for(let i=0;i<16;i++){idle.push(frames.length);const ph=i/16*TAU;frames.push(warp(standing,(x,y)=>{const upper=smooth((55-y)/25);return[Math.sin(ph)*.22*upper,-(.5-.5*Math.cos(ph))*.65*upper];}));}
function travel(frame,i){const ph=i/16*TAU;return warp(frame,(x,y)=>{const cloth=smooth((y-34)/13)*(1-smooth((y-52)/2)),upper=smooth((46-y)/22);return[Math.sin(ph)*.32*upper+Math.sin(ph-.55)*.6*cloth,-Math.sin(ph*2)*.2*upper];});}
for(const [i,frame] of gait.frames.entries()){walk.push(frames.length);frames.push(travel(frame,i));}
for(let i=0;i<5;i++){attack.push(frames.length);frames.push(attackFrame(bareStanding,i));grips.push(attackTargets[i]);}
for(let a=0;a<5;a++){const row=[];for(let g=0;g<16;g++){row.push(frames.length);frames.push(attackFrame(travel(bareGait.frames[g],g),a));}attackWalk.push(row);}
const palette=[0],colors=new Map([[0,0]]),tiles=frames.map(({w,h,d})=>{let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[y*w+x]>>>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}const p=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const c=d[y*w+x]>>>24?d[y*w+x]:0;if(!colors.has(c)){colors.set(c,palette.length);palette.push(c);}p.push(colors.get(c));}return[x0,y0,x1-x0+1,y1-y0+1,p];});
const indexBytes=palette.length>256?2:1;
const data={w:W,h:H,hires:D,anchorY:112,below:14,body:[50,88],idle,walk,attack,attackWalk,motionRate:2,idleRate:16/1.875/1.6,idleFps:16/1.875,walkFps:19.6,attackFps:18,attackRelease:2,manualDelay:2/18,selfBob:true,outline:false,sourceRevision:'sculpted-merchant-source-2026-11-15',source:'tools/eanasir-source/model.png',sourceSha256:createHash('sha256').update(readFileSync('tools/eanasir-source/model.png')).digest('hex'),rigSource:'tools/eanasir-source/build.mjs',attackGrips:grips,palette,indexBytes,frames:tiles.map(([x,y,w,h,p])=>{const b=Buffer.alloc(p.length*indexBytes);p.forEach((v,i)=>b.writeUIntLE(v,i*indexBytes,indexBytes));return[x,y,w,h,b.toString('base64')];})};
const output=process.env.EANASIR_OUT||'public/assets/heroes-authored',diagnostics=process.env.EANASIR_DIAGNOSTICS||'output/hero-round2-2026-11-14/eanasir-art/candidate';mkdirSync(output,{recursive:true});mkdirSync(diagnostics,{recursive:true});writeFileSync(output+'/eanasir.js','// Rebuild: node tools/eanasir-source/build.mjs\nexport default '+JSON.stringify(data)+';\n');
const contact={w:W*8,h:H*Math.ceil(frames.length/8),d:new Uint32Array(W*8*H*Math.ceil(frames.length/8))};frames.forEach((f,i)=>{for(let y=0;y<H;y++)contact.d.set(f.d.subarray(y*W,(y+1)*W),(Math.floor(i/8)*H+y)*contact.w+i%8*W);});writePng(diagnostics+'/all-frames.png',contact);
writeFileSync(diagnostics+'/rig.json',JSON.stringify({config,armPoly,whipPoly,shoulder,elbow,hand,grips,poses:gait.poses},null,2));
console.log('Ea-nasir:',frames.length,'frames,',palette.length,'colours;',output);
