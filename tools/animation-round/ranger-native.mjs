// Ranger's retained model, reduced to the same opaque native pixels as the roster.
// Work on one fixed 80×64 canvas so every pose preserves its original pivot.
import { packedPalette } from '../../public/js/art/palette.js';

const palette = packedPalette();
export const RANGER_PALETTE_KEYS = ['k','h','m','b','B','O','d','t','T','s','S','1','2','3','4','I','J','C','D'];
const colors = RANGER_PALETTE_KEYS.map(key => palette[key]);
const rgb = c => [c & 255, c >>> 8 & 255, c >>> 16 & 255];
const choices = colors.map(c => ({c, rgb: rgb(c)}));
function nearest(r,g,b) {
  let best=0,score=Infinity;
  for(const p of choices) {
    const [rr,gg,bb]=p.rgb;
    const d=(r-rr)**2*.9+(g-gg)**2*1.3+(b-bb)**2;
    if(d<score){score=d;best=p.c;}
  }
  return best;
}

export function nativeRanger(frame,{attackStep=-1}={}) {
  const w=frame.w/2,h=frame.h/2,d=new Uint32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    let a=0,r=0,g=0,b=0;
    for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++) {
      const c=frame.d[(y*2+yy)*frame.w+x*2+xx],alpha=c>>>24;
      a+=alpha;r+=(c&255)*alpha;g+=(c>>>8&255)*alpha;b+=(c>>>16&255)*alpha;
    }
    // Bow limbs and its string are intentionally one native pixel wide.
    if(a<(x>=44&&y<52?250:420))continue;
    d[y*w+x]=nearest(r/a,g/a,b/a);
  }
  // Keep the two eyes as intentional dark pixels instead of reducing their
  // green source irises into olive noise. The forehead locates the face after
  // breathing, stride bob and the lowered draw/release pose.
  const skin=new Set(['t','T','s','S'].map(k=>palette[k]));
  for(let y=28;y<36;y++)if(skin.has(d[y*w+40])&&skin.has(d[y*w+41])) {
    d[(y+2)*w+38]=palette.S;
    d[(y+2)*w+39]=palette.m;
    d[(y+2)*w+40]=palette.s;
    d[(y+2)*w+41]=palette.k;
    break;
  }
  // Reassert the continuous string on the native grid. A subpixel diagonal
  // cannot be allowed to turn into floating pale dashes after reduction.
  for(let y=25;y<47;y++)for(let x=44;x<60;x++) {
    const p=y*w+x;if(d[p]===palette.C||d[p]===palette.D)d[p]=0;
  }
  const string=(a,b)=>{
    const n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
    for(let i=0;i<=n;i++) {
      const x=Math.round(a[0]+(b[0]-a[0])*i/n),y=Math.round(a[1]+(b[1]-a[1])*i/n),p=y*w+x;
      if(!d[p]||['C','D','I','J','2'].some(k=>d[p]===palette[k]))d[p]=palette.D;
    }
  };
  if(attackStep===1) {
    string([50,31],[40,37]);string([40,37],[47,44]);
  } else if(attackStep===0||attackStep===2) string([50,31],[47,44]);
  else {
    // Locate the upper tip after the shared shoulder/body bob.
    let top=34;
    outer:for(let y=32;y<39;y++)for(let x=45;x<49;x++)if(d[y*w+x]){top=y;break outer;}
    string([45,top+1],[43,top+12]);
  }
  return {w,h,d};
}
