// Native-density retouch of the retained Berserker model.  All frames share the
// same sampling grid, palette and material treatment; anatomy, pivots, equipment
// and the connected gait are inherited from the source rig rather than redrawn
// independently. No interpolation or translucent edge reaches the game.
import {packedPalette} from '../../public/js/art/palette.js';
const master=packedPalette();
const keys=['k','K','n','N','g','G','z','m','b','B','d','t','T','s','S','O','H','I','C','V','W','Q'];
const colors=keys.map(key=>master[key]);
const rgb=c=>[c&255,c>>>8&255,c>>>16&255];
const ramps=colors.map(c=>[c,...rgb(c)]);

function nearest(r,g,b){
 let best=master.k,score=Infinity;
 for(const [c,rr,gg,bb] of ramps){
  // Modest red/green weighting protects the reddish hair and warm skin planes
  // while the cooler blade remains in the neutral steel ramp.
  const distance=2*(rr-r)**2+2.7*(gg-g)**2+1.7*(bb-b)**2;
  if(distance<score){score=distance;best=c;}
 }
 return best;
}

function material(r,g,b,x,y){
 const light=.22*r+.56*g+.22*b;
 // The swept hair and short beard are a rust ramp, not the brown leather ramp.
 // Coordinates only separate head hair from similarly warm belt hardware;
 // the source colours still determine every boundary and moving contour.
 if(y<36&&x>=31&&x<=44&&r>g*1.65&&r>b*1.7){
  if(r<65)return master.m;
  return r<115?master.b:r<195?master.O:master.d;
 }
 // The original shoulder plates are warm-lit grey. Explicitly assign their
 // broad planes to steel, so they cannot collapse into chest/strap browns.
 const shoulder=y>=33&&y<=39&&x>=28&&x<=44&&g>r*.82&&b>r*.72;
 const blade=b>=r*.93&&b>=g*.95;
 if(shoulder||blade){
  if(light<43)return master.k;
  if(light<78)return master.K;
  if(light<115)return master.n;
  if(light<(blade?137:155))return master.N;
  if(light<(blade?175:198))return master.g;
  if(light<(blade?217:231))return master.G;
  return master.z;
 }
 // Warm leather leggings and boots have one readable lit edge above a deep
 // outline. Keep them out of the olive metal ramp used by the belt buckle.
 if(y>=43&&x>=30&&x<=46&&r>g*1.08&&g>b*1.07){
  if(r<45)return master.k;
  if(r<73)return master.m;
  if(r<116)return master.b;
  if(r<174)return master.B;
  return master.t;
 }
 // Keep the crossing straps in deep warm leather. Lit skin uses three large
 // peach planes; metallic gold/olive palette matches are deliberately excluded.
 if(r>g*1.16&&g>b*1.12&&b>r*.3){
  if(r<65)return master.k;
  if(r<112)return master.m;
  if(r<157)return master.b;
  if(r<205)return master.S;
  if(r<234)return master.t;
  return master.T;
 }
 return nearest(r,g,b);
}

export function nativeBerserker(frame){
 const w=80,h=64,d=new Uint32Array(w*h),density=frame.w/w;
 if(density!==2)throw Error('Berserker native export requires the retained 2x source model');
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let alpha=0,r=0,g=0,b=0;
  for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){
   const c=frame.d[(y*2+yy)*frame.w+x*2+xx],a=c>>>24;
   alpha+=a;r+=(c&255)*a;g+=(c>>>8&255)*a;b+=(c>>>16&255)*a;
  }
  if(alpha<384)continue;
  r/=alpha;g/=alpha;b/=alpha;
  d[y*w+x]=material(r,g,b,x,y);
 }
 // A reduced diagonal axe rim can leave one detached antialias sample. Keep
 // diagonally touching equipment; only remove truly isolated single pixels.
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const p=y*w+x;if(!d[p])continue;
  let connected=false;
  for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)if((xx||yy)&&d[p+yy*w+xx])connected=true;
  if(!connected)d[p]=0;
 }
 // Area reduction would average the eye with its skin and turn it into a grey
 // speck. Register one compact brow/eye/nose cluster to the moving hair crown.
 // This changes four face pixels in width, never the head's proportions.
 let crown=null;
 for(let y=24;y<=30&&!crown;y++){
  const xs=[];
  for(let x=33;x<=42;x++){
   const c=d[y*w+x];
   if(c===master.O||c===master.d)xs.push(x);
  }
  if(xs.length)crown={x:Math.round(xs.reduce((sum,x)=>sum+x,0)/xs.length),y};
 }
 if(crown){
  const x=crown.x-1,y=crown.y+3;
  for(const [yy,row] of ['Sttb','zkTm','sttS'].entries())
   for(const [xx,key] of [...row].entries())d[(y+yy)*w+x+xx]=master[key];
 }
 return {w,h,d};
}
