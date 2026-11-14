import {readPng,writePng} from '../png.mjs';
// Preserve the generated RGBA's material shades. Area filtering is only used
// once to choose native source pixels; runtime poses keep hard pixel edges.
export function sources(){
 const png=readPng(new URL('source/bosses-original-2026-11-15.png',import.meta.url)),out={};
 for(const [n,id]of ['butcher','lich','pharaoh','frostgiant','thornqueen','pitlord'].entries()){
  const w=128,h=128,d=new Uint32Array(w*h),sx=n%3*512,sy=Math.floor(n/3)*512;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let aa=0,r=0,g=0,b=0;for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){const v=png.d[(sy+y*4+dy)*png.w+sx+x*4+dx],a=v>>>24;aa+=a;r+=(v&255)*a;g+=((v>>>8)&255)*a;b+=((v>>>16)&255)*a;}if(aa/16>115)d[y*w+x]=(255<<24)|(Math.round(b/aa)<<16)|(Math.round(g/aa)<<8)|Math.round(r/aa);}
  // Adjacent cells' trailing hems sometimes enter an atlas cell. Retain the
  // complete connected body/equipment, discard only detached neighbor scraps.
  const seen=new Uint8Array(w*h),groups=[];for(let i=0;i<d.length;i++){if(!d[i]||seen[i])continue;const group=[],q=[i];seen[i]=1;while(q.length){const p=q.pop();group.push(p);const px=p%w,py=Math.floor(p/w);for(let yy=Math.max(0,py-1);yy<=Math.min(h-1,py+1);yy++)for(let xx=Math.max(0,px-1);xx<=Math.min(w-1,px+1);xx++){const j=yy*w+xx;if(d[j]&&!seen[j]){seen[j]=1;q.push(j);}}}groups.push(group);}groups.sort((a,b)=>b.length-a.length);for(const g of groups.slice(1))for(const i of g)d[i]=0;
  let x0=w,y0=h,x1=0,y1=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[y*w+x]){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}out[id]={w,h,d,box:[x0,y0,x1,y1]};
 }
 return out;
}
if(process.argv.includes('--write'))for(const[id,p]of Object.entries(sources()))writePng(`output/hero-round2-2026-11-14/bosses/${id}-native.png`,p);
