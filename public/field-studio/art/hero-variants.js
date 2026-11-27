import { heroKits } from './hero-kits.js';
import { headPieces, shoulders, devices, equipment, fletching, fabricEdges } from './hero-fittings.js';
import { headProbes, gearProbes } from './hero-landmarks.js';
import { fittings, garments, helmets, sorcererCrowns } from './hero-garments.js';

// Dye, polished metal and contrasting enamel. The first three colours of a
// dye are deliberately far apart so a two-pixel fold still reads in the field.
const materials = {
  sapphire: ['16162f 21326d 2657b2 448cfa 9cdafa efffff', '253149 52729a b2d3ed fffff5', 'ac651c ffc14d'],
  cinder:   ['211523 481b32 9d3038 d74837 ff9044 ffe8ad', '272b3d 62637a c6c8d5 fff6da', 'd18b36 ffd258'],
  glacier:  ['14213b 1f426b 28789e 5cb9ce b7efeb f5ffff', '2a3854 6985a5 cde7fb ffffff', '5f96ec 9bfbff'],
  orchid:   ['20162f 412758 784085 a75bb4 e7a3db ffe5f2', '302746 796284 cfc5dc fff6ed', 'ea9a4b ffdf87'],
  sun:      ['22152e 4c2641 a44a34 e38832 f5c34c fff3b6', '433048 967557 e8c88b fffff0', 'bb3a42 ff6e5d'],
  briar:    ['142021 1c3e37 38634c 55945a 9fcd73 e9edac', '233937 547b77 b0d2ad f6f3ca', 'c47038 f7b95b'],
  dusk:     ['14152a 282542 40436d 60669b 9e9bca e1dcf6', '27283d 64617e b5afc3 f1e8e0', '9973e3 bad4ff'],
  bone:     ['1e1e2e 4a424e 777076 b9aa99 e7dfc6 fff7e6', '293949 507c84 a9c6bc f0edcf', '2ea7aa 86fbdd'],
  garnet:   ['1c1423 41203b 8b264d c64967 e98c98 ffe1d1', '3a293b 815f69 d6b3a0 fff1ce', 'c7964e ffe19a'],
  tide:     ['111e30 1a4052 146b79 269a9c 80cdb9 e0fbdf', '253448 51778d abcbd5 ecfcf1', 'd88343 ffcc60'],
  harvest:  ['251827 503242 935036 ba753e edab4c ffe5a2', '363044 826b61 d0b499 fff1d6', '598e81 9fe6b6'],
  storm:    ['18182c 303254 3f5281 587eae 91b2d1 dfe8f7', '352e42 826b65 c8a275 f8ddb0', 'ce8c29 ffe161'],
  venom:    ['18212a 26394a 315347 569140 9cbc4a dbf690', '2b2945 645778 b29ac3 eddbee', '8e63ba e3a6fe'],
  royal:    ['201a28 43213b 772745 a04447 cb6961 f5bd97', '49303a 996d47 e8b568 fff0b0', 'c58a31 ffd96c'],
  aurora:   ['0e2332 154041 196258 268f80 85cdbb d6f8e8', '253949 638b95 c5e6e0 f7ffff', '64aede a1effe'],
  umbra:    ['171524 251e3f 423461 68428c 9c71bd e2c3dd', '28283b 625779 a89bc2 ebbfdc', 'd9a252 ffe394'],
};

function rgb(value) {
  const hex = parseInt(value, 16);
  return (0xff000000 | (hex & 255) << 16 | hex & 0xff00 | hex >>> 16) >>> 0;
}
function mix(a, b, amount) {
  let out = 0xff000000;
  for (const shift of [0, 8, 16]) {
    const start = a >>> shift & 255, end = b >>> shift & 255;
    out |= Math.round(start + (end - start) * amount) << shift;
  }
  return out >>> 0;
}
function swatches(colours) {
  const stops=[14,47,85,127,174,226];
  return Uint32Array.from({length:256},(_,k)=>{
    const i=stops.findIndex(stop=>stop>=k);
    if (i<0)return colours[5];
    if (i===0)return colours[0];
    return mix(colours[i-1],colours[i],(k-stops[i-1])/(stops[i]-stops[i-1]));
  });
}
function palette([fabric, steel, enamel]) {
  const [f, s, e] = [fabric, steel, enamel].map(row => row.split(' ').map(rgb));
  const leather = [f[0], mix(f[1],rgb('49303b'),.5), mix(f[2],rgb('825442'),.65),
    mix(f[3],rgb('ad7851'),.72),mix(f[4],rgb('ceb183'),.70),rgb('f7d9a2')];
  const gold = [f[0], mix(s[0],e[0],.25),mix(s[1],e[0],.6),e[0],e[1],mix(e[1],rgb('fffce5'),.6)];
  const skin = ['211a29','5b3443','965749','cb8360','edb789','fff0bc'].map(rgb);
  const bands={
    fabric:f, steel:[f[0],s[0],mix(s[0],s[1],.68),s[1],s[2],s[3]],leather,gold,skin,
    lining:[f[0],s[0],mix(s[1],s[2],.40),s[2],mix(s[3],rgb('fff6da'),.65),rgb('fffce6')],
    timber:['191827','3f2a32','68423c','9b6951','ce9b65','efd794'].map(rgb),
    marble:['1d202d','433f46','766664','ad9a8c','deccb0','fbefd2'].map(rgb),
    gilt:['271e31','544039','916748','c9934b','eec064','fff2ba'].map(rgb),
  };
  return {
    ...Object.fromEntries(Object.entries(bands).map(([name,band])=>[name,swatches(band)])),
    ink:{ D:f[1], C:f[2], L:f[3], W:f[4], s:s[0],m:s[1],h:s[2],H:s[3],g:gold[2],G:gold[3],a:e[0],A:e[1] },
  };
}
const palettes = Object.fromEntries(Object.entries(materials).map(([id, value]) => [id, palette(value)]));

const listings = new Map();
export function heroVariants(id) {
  if (!heroKits[id]) return [];
  if (!listings.has(id)) {
    listings.set(id, heroKits[id][2].map(([name], i) => ({ id: 'v' + (i + 1), name })));
  }
  return listings.get(id);
}

const registration = new WeakMap();
const probeRows = Object.fromEntries(Object.entries(headProbes).map(([id, rows]) =>
  [id, Array.from(rows, (v,i) => [i % 6 * 2 - 7, Math.floor(i / 6) * 2 - 6, v === '.' ? -1 : parseInt(v,16)])]));
const gearRows = Object.fromEntries(Object.entries(gearProbes).map(([id,[type,x,y,rows]]) =>
  [id,{type,x,y,probes:Array.from(rows,(v,i)=>[i%4*2-3,Math.floor(i/4)*2-4,v==='.'?-1:parseInt(v,16)])}]));
const quivers=new Set(['archer','trailblazer','witchhunter','marksman','boltguard']);

function luma(c) { return (67 * (c & 255) + 145 * (c >>> 8 & 255) + 44 * (c >>> 16 & 255)) >>> 8; }
function seek(frame,probes,x0,y0,rangeX,rangeY,travelCost) {
  const {w,d}=frame;
  let best=Infinity,matchX=x0,matchY=y0;
  for (let dy=-rangeY;dy<=rangeY;dy++) for (let dx=-rangeX;dx<=rangeX;dx++) {
    let loss = (Math.abs(dx) + Math.abs(dy)) * travelCost;
    for (const [px,py,wanted] of probes) {
      const c=d[(y0+dy+py)*w+x0+dx+px];
      const value = c>>>24 ? luma(c) >> 4 : -1;
      loss += wanted < 0 || value < 0 ? (wanted === value ? 0 : 9) : Math.min(9, Math.abs(value-wanted));
      if (loss>=best) break;
    }
    if (loss<best) {best=loss;matchX=x0+dx;matchY=y0+dy;}
  }
  return {x:matchX,y:matchY,loss:best};
}
function register(id, frame) {
  const cached = registration.get(frame.d);
  if (cached?.id === id) return cached;
  const [x0, y0] = heroKits[id][0];
  const {w,h,d} = frame;
  let left=w, right=-1, top=h, bottom=-1;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) if (d[y*w+x]>>>24) {
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  // Follow the skull through the breath, stride bob, draw and lunge. A wide
  // weapon arc or detached spell must not drag helmet fittings sideways.
  const {x,y}=seek(frame,probeRows[id],x0,y0,6,5,1.5);
  const result={id,x,y,left,right,top,bottom};
  const gear=gearRows[id];
  if (gear) {
    const projected=seek(frame,gear.probes,gear.x+x-x0,gear.y+y-y0,8,6,.85);
    // A shield turning edge-on no longer shows its painted face. Likewise,
    // a crystal travelling with a spell is distinct from the crystal setting.
    if (projected.loss<36) result.gear={...projected,type:gear.type};
  }
  registration.set(d,result);
  return result;
}

function lightPanel(cut, dx, dy, family) {
  if (dy<4 || dy>22 || dx< -12 || dx>5) return false;
  switch (cut) {
    case 0: return dx>=-6 && dx<=-3 && dy>6 || dy>=16 && dx===-2;
    case 1: return Math.abs(dx-(-7+Math.floor((dy-3)*.53)))<=1 && dy<18;
    case 2: return dx>=-8 && dx<=-5 && dy>9 || dy>=11 && dy<=12 && dx>=-4 && dx<=0;
    default: return Math.abs(dx+2+(dy>15?1:0))<=1 || family==='robe' && dy>17 && dx===-8;
  }
}
function dress(frame, pin, family, p, cut) {
  const {w,h,d}=frame, out={w,h,d:new Uint32Array(d.length)};
  const {left,top,right,bottom}=pin;
  for (let y=top;y<=bottom;y++) for (let x=left;x<=right;x++) {
    const i=y*w+x,c=d[i],alpha=c>>>24;
    if (!alpha) continue;
    const r=c&255,g=c>>>8&255,b=c>>>16&255,lum=luma(c);
    const dx=x-pin.x,dy=y-pin.y;
    const colour=Math.max(r,g,b)-Math.min(r,g,b), nearFace=dx>=-5 && dx<=4 && dy>=-5 && dy<=5;
    const warm=r>b+14 && r>=g+5, tan=warm && g*1.3>r*.72 && g>b*1.09;
    const edge=!(d[i-w]>>>24) || !(d[i-1]>>>24);
    let ramp=p.fabric,light=lum;
    if (family==='stone') {
      // The stone merchant retains his carved face, stepped beard and pleats;
      // a narrower stone value range is stretched across the robe's dye ramp.
      const head = dy<15 && dx>=-9 && dx<=4;
      const raised = x===pin.x-6 || x===pin.x+1;
      ramp=head?p.marble:dy>16&&!raised?p.fabric:p.gold;
      light=Math.max(0,Math.min(255,(lum-48)*1.45));
    } else if (nearFace && tan && family!=='shade') ramp=p.skin;
    else if (family==='shade') {
      ramp = colour>40 && (g>r+12 || r>b*.96) ? p.gold : lum>82 && colour<38 ? p.steel : p.fabric;
      if (dy>=-2 && dy<=2 && dx>=-3 && dx<=3 && g>r+16 && b>r+14) {ramp=p.gold;light=223;}
    } else if (colour<28 || (b>=r && r>g && r-g<38 && b-g<55)) {
      ramp=family==='plate' || dx>4 || dx < -9 ? p.steel : family==='robe' ? p.lining : p.steel;
    } else if (tan && dy>=14 && dy<20 && Math.abs(dx)<9) ramp=p.leather;
    else if (family==='leather' && tan && (dx<-6 || dx>3)) ramp=p.timber;
    else if (family==='robe' && tan && (dx<-6 || dx>4) && lum<147) ramp=p.timber;
    else if (r>g*1.02 && g>b*1.48 && lum>110) ramp=p.gold;
    else if (tan && lum<107 && (dx<-6 || dx>4 || dy>17)) ramp=p.leather;
    if (family!=='stone' && lum>42 && lightPanel(cut,dx,dy,family) &&
        (ramp===p.fabric || ramp===p.lining || ramp===p.leather || family==='plate'&&ramp===p.steel)) {
      ramp=p.lining;
      light=Math.min(250,light+(family==='shade'?47:26));
    }
    // Top-left-facing metal has a short hard glint immediately behind its ink.
    // Keep the deepest silhouette intact; eyes, joints and weapon grips need it.
    if (ramp===p.steel && edge && light>=70 && light<150 && y<pin.y+10) light+=20;
    if (edge && lum<35)light=Math.min(lum,16);
    const q=ramp[Math.round(light)];
    out.d[i]=(alpha<<24 | q & 0xffffff)>>>0;
  }
  return out;
}

function nearBody(frame,x,y) {
  const i=y*frame.w+x,d=frame.d,w=frame.w;
  return (d[i]|d[i-1]|d[i+1]|d[i-w]|d[i+w]|d[i-2]|d[i+2]|d[i-w-1]|d[i-w+1]|d[i+w-1]|d[i+w+1])>>>24;
}
function stamp(out,source,pin,x,y,rows,colours,cloth=false,engrave=false) {
  for (let j=0;j<rows.length;j++) for(let k=0;k<rows[j].length;k++) {
    const tint=colours[rows[j][k]];
    if (tint===undefined) continue;
    const px=x+k,py=y+j;
    // The original world extent and pivot stay fixed even for a raised sword.
    if(px<pin.left || py<pin.top || px>pin.right || py>pin.bottom) continue;
    if(cloth && !nearBody(source,px,py)) continue;
    if(engrave && !(source.d[py*out.w+px]>>>24)) continue;
    out.d[py*out.w+px]=tint;
  }
}

// Each costume has a full mantle, coat, cuirass or shroud. Original shadows
// turn the designed material around elbows and folds. Markings end at the
// actual hem/boots and stop under uncovered wrists and the sword or bow.
function garment(out,frame,pin,kit) {
  const {family,p,cut}=kit, [cx,top,width,height]=fittings[pin.id];
  const x0=pin.x+cx-Math.floor(width/2), y0=pin.y+top;
  const rows=garments[family][cut], cols=rows[0].length;
  for (let dy=0;dy<height;dy++) {
    const row=rows[Math.floor(dy*rows.length/height)], y=y0+dy;
    for (let dx=0;dx<width;dx++) {
      const x=x0+dx, i=y*frame.w+x, c=frame.d[i],symbol=row[Math.floor(dx*cols/width)];
      if(!symbol || symbol==='.' || !(c>>>24)) continue;
      const lum=luma(c), r=c&255,g=c>>>8&255,b=c>>>16&255;
      if(lum<17 || (family==='plate'||family==='leather') && lum>210 && b>=r-16)continue;
      if(family!=='stone' && r>g*1.16 && g>b*1.16 && lum>105 && dy<height*.55 && dx>width*.60)continue;
      let ramp,light;
      switch(symbol) {
        case 'n':ramp=p.fabric;light=22+lum*.27;break;
        case 'c':ramp=p.fabric;light=60+lum*.46;break;
        case 'l':ramp=p.fabric;light=113+lum*.49;break;
        case 'i':ramp=p.lining;light=108+lum*.50;break;
        case 'g':ramp=p.gilt;light=88+lum*.53;break;
        case 'b':ramp=p.steel;light=25+lum*.33;break;
        case 'h':ramp=p.steel;light=146+lum*.40;break;
        case 'm':ramp=p.steel;light=77+lum*.57;break;
        case 'a':ramp=p.gold;light=139+lum*.40;break;
        default:ramp=p.timber;light=40+lum*.53;
      }
      // Printed stars and carved edges still break at the deep recesses.
      const painted=ramp[Math.min(255,Math.round(light))];
      out.d[i]=lum>=55?painted:mix(out.d[i],painted,Math.max(.30,lum/55));
    }
  }
}

const kitCache=new Map();
function tailor(id,variantId) {
  const key=id+'/'+variantId,cached=kitCache.get(key);
  if(cached)return cached;
  const hero=heroKits[id], index=heroVariants(id).findIndex(v=>v.id===variantId);
  if (!hero || index<0) throw new RangeError('Unknown hero field design '+id+'/'+variantId);
  const [,fabric,head,shoulder,device]=hero[2][index];
  const kit={ family:hero[1], cut:index, p:palettes[fabric],head:id==='mage'?sorcererCrowns[index]:headPieces[head],shoulder:shoulders[shoulder],device:devices[device] };
  kitCache.set(key,kit);return kit;
}
function fit(id,kit,frame) {
  const {family,p,head,shoulder,device}=kit,pin=register(id,frame);
  const out=dress(frame,pin,family,p,kit.cut);
  const shoulderY=family==='stone'?12:family==='shade'?1:0;
  const shoulderX=family==='shade'?-2:0;
  garment(out,frame,pin,kit);
  // Fit armour behind the skull before painting the brim and the forward
  // highlight. Breast devices lie below the collar and follow the same pivot.
  if (family==='robe' || family==='shade' || family==='stone') {
    const pattern=fabricEdges[kit.cut];
    stamp(out,frame,pin,pin.x-7+shoulderX,pin.y+(family==='stone'?21:12),pattern,p.ink,false,true);
  }
  if (quivers.has(id)) {
    const [x,y,pattern]=fletching[kit.cut];
    stamp(out,frame,pin,pin.x+x,pin.y+y,pattern,p.ink,true);
  }
  stamp(out,frame,pin,pin.x+shoulder[0]+shoulderX,pin.y+shoulder[1]+shoulderY,shoulder[2],p.ink,true);
  stamp(out,frame,pin,pin.x-4+shoulderX,pin.y+9+shoulderY,device,p.ink,true);
  if (id!=='mage' && family!=='stone') {
    const [x,y,shape]=helmets[family][kit.cut];
    stamp(out,frame,pin,pin.x+x,pin.y+y,shape,p.ink,true);
  }
  stamp(out,frame,pin,pin.x+head[0],Math.max(pin.top,pin.y+head[1]),head[2],p.ink);
  if (pin.gear) {
    const [x,y,pattern]=equipment[pin.gear.type][kit.cut];
    stamp(out,frame,pin,pin.gear.x+x,pin.gear.y+y,pattern,p.ink,false,true);
  }
  return out;
}

// The review can lazily dress exactly the pose it is about to show. Facing is
// handled by the normal renderer after fitting, so grips and ornaments mirror.
export function heroVariantFrame(id,variantId,rawFrame) {
  return fit(id,tailor(id,variantId),rawFrame);
}

// Authored fall frames can contain a disjoint blade or only a fading fragment.
// Map the material already painted on each surviving pixel and keep its exact
// coverage. The falling rig and the independently drawn soul remain untouched.
export function heroVariantFallFrame(id,variantId,rawFrame) {
  const kit=tailor(id,variantId),p=kit.p, {w,h,d}=rawFrame;
  const mapped=new Uint32Array(d.length);
  for(let i=0;i<d.length;i++) {
    const c=d[i],a=c>>>24;if(!a)continue;
    const r=c&255,g=c>>>8&255,b=c>>>16&255,lum=luma(c);
    const chroma=Math.max(r,g,b)-Math.min(r,g,b);
    const ramp=kit.family==='stone'?p.marble:chroma<36?p.steel:
      r>g*1.08 && g>b*1.38 && lum>125?p.gilt:r>g*1.28 && g>b*1.14 && lum<112?p.timber:p.fabric;
    mapped[i]=(a<<24|ramp[lum]&0xffffff)>>>0;
  }
  return {w,h,d:mapped};
}

export function heroVariant(id,variantId,source) {
  return {...source,gen:()=>source.gen().map(frame=>heroVariantFrame(id,variantId,frame)),
    ...(source.fall?{fall:{...source.fall,gen:()=>source.fall.gen().map(frame=>heroVariantFallFrame(id,variantId,frame))}}:{})};
}
