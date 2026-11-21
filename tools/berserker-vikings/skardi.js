// Skardi uses the original Berserker's footwork and ground anchor. His helmet,
// beard, coat, hands and fighting poses are drawn at the roster's native scale.
import current from './prior-accepted-berserker.js';
import { moveFor } from '../../public/js/data/difficulty.js';
import { HEROES } from '../../public/js/data/heroes.js';

const W=48, H=48;
const colors={
  k:'#181425', n:'#262b44', N:'#3a4466', g:'#5a6988', G:'#c0cbdc', w:'#f4f4e4',
  m:'#3e2731', b:'#733e39', B:'#b86f50', t:'#e4a672', T:'#ead4aa',
  r:'#733e39', R:'#be4a2f', d:'#d77643', f:'#e4a672', h:'#9e8c60',
  a:'#59484a', A:'#a8a09b', F:'#ead4aa', s:'#57303b', S:'#883b3c',
};
const palette=[...current.palette];
const ink=Object.fromEntries(Object.entries(colors).map(([key,hex])=>{
  const n=Number.parseInt(hex.slice(1),16);
  const packed=(0xff000000|((n&255)<<16)|(n&0xff00)|(n>>>16))>>>0;
  let i=palette.indexOf(packed);
  if(i<0) i=palette.push(packed)-1;
  return [key,i];
}));

function paint() {
  const pixels=new Uint8Array(W*H);
  function dot(x,y,color) { pixels[Math.round(y)*W+Math.round(x)]=ink[color]; }
  function rows(x,y,pattern) {
    pattern.trim().split(/\s+/).forEach((row,j)=>{
      for(let i=0;i<row.length;i++) if(row[i]!=='.') dot(x+i,y+j,row[i]);
    });
  }
  function line(a,b,color) {
    const dx=b[0]-a[0],dy=b[1]-a[1],steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
    for(let i=0;i<=steps;i++) dot(a[0]+dx*i/steps,a[1]+dy*i/steps,color);
  }
  return {pixels,dot,rows,line};
}

// The crown is seen from the side. One iron brow descends to a nasal in front
// of the face. The eye and nose sit to its right, above the copper beard.
const HEAD=`
  ...knnnk....
  ..kNgGGgk...
  .kNgGgngNk..
  .nNggNngNk..
  kNgGGGGgNNk.
  kNnnkNNNggk.
  kNnbBnNwkTk.
  .kNBbnGtTTbk
  .kmRdBbbmBk.
  ..rRdffrbdk.
  ..mRdRrddRk.
  ...bRdRrRk..
  ...mhRkhk...
  ....rk......`;

const COAT=`
  .....kkknnk.....
  ...kAFFFANgNnk..
  ..kAFFAAnnGggNgk
  .kFFFAannnNNgNnk
  .kFAAAkNgGgNNNnk
  kAAnknNggNNnNNnk
  kaanknNgNNggNnnk
  .kanknNNgNnNgnnk
  ..kkkBbnNNggNnnk
  ....kBBbnNNNnnk.
  ....kmBBBbnNNnk.
  ....kmmBBBBbNnk.
  ....kbbbhFhbbbk.
  ...krSSRbhbSmmk.
  ...ksSSmSSSSmmk.
  ...kssmSsmSssmk.
  ....kkmkkmkkmk..`;

// Separate hips are connected to the frame's original knees, ankles and soles.
// Source upper bodies and equipment do not enter the extraction window.
const legs=[current.idle[0],...current.walk].map((index,step)=>{
  const [x0,y0,width,height,encoded]=current.frames[index];
  const src=atob(encoded),out=new Uint8Array(W*H);
  for(let sy=0;sy<height;sy++) {
    const y=sy+y0;
    if(y<47) continue;
    const minX=y===47?33:y<=49?31:26;
    const maxX=y<=49?44:47;
    for(let sx=0;sx<width;sx++) {
      const x=sx+x0;
      if(x>=minX&&x<=maxX) out[(y-16)*W+x-14]=src.charCodeAt(sy*width+sx);
    }
  }
  return out;
});

function arm(c,shoulder,elbow,hand,near) {
  const offset=(p,x,y)=>[p[0]+x,p[1]+y];
  const bands=(a,b,shades)=>{
    for(let n=0;n<shades.length;n++) c.line(offset(a,n-2,0),offset(b,n-2,0),shades[n]);
  };
  bands(shoulder,elbow,near?'mTtBb':'mbBt');
  bands(elbow,hand,near?'kbBbm':'kmbb');
  c.line(offset(elbow,-1,0),offset(elbow,1,-1),near?'h':'B');
}

// Local x is the axe's cutting side, local y is measured down from the socket.
// The narrow poll and deep heel leave a transparent notch below the socket.
const REAR_AXE=['.kkgnk','nNGgGG','nNNgGw','...NGw','...nGG','....G.'];
const LEAD_AXE=['.nNggk','nNGgGG','kNNgGw','...nGw','...nGG','....G.'];
function axe(c,hand,angle,side,near) {
  const rad=angle*Math.PI/180, dx=Math.sin(rad),dy=-Math.cos(rad), reach=near?7:6;
  const at=(length,wide)=>[hand[0]+dx*length-side*dy*wide,hand[1]+dy*length+side*dx*wide];
  c.line(at(-2,0),at(reach,0),'m');
  c.line(at(-1,-.75),at(reach,-.75),near?'t':'B');
  const cut=near?LEAD_AXE:REAR_AXE, tip=at(reach,0);
  // Inverse sampling keeps an unbroken edge, including on the diagonal chop.
  for(let y=Math.floor(tip[1]-8);y<=Math.ceil(tip[1]+8);y++) {
    for(let x=Math.floor(tip[0]-8);x<=Math.ceil(tip[0]+8);x++) {
      const rx=x-hand[0],ry=y-hand[1];
      const row=Math.round(reach+1-rx*dx-ry*dy);
      const col=Math.round(side*(-dy*rx+dx*ry)+1);
      const key=cut[row]?.[col];
      if(key&&key!=='.') c.dot(x,y,key);
    }
  }
  c.rows(hand[0]-1,hand[1]-1,near?'BtB btm .m.':'Bb. btb .m.');
}

const HIT=[
  {x: 0,y:0, far:[15,24,-16],lead:[30,26, 62]},
  {x:-1,y:0, far:[14,23,-21],lead:[31,23, 30]},
  {x:-1,y:0, far:[14,22,-26],lead:[30,21,  7]},
  {x:-1,y:0, far:[15,21,-33],lead:[28,18,-19]},
  {x: 0,y:0, far:[15,22,-19],lead:[30,20, 24]},
  {x: 1,y:1, far:[16,25,-35],lead:[33,25, 74]},
  {x: 1,y:1, far:[16,27,-45],lead:[32,28,107]},
  {x: 0,y:0, far:[15,25,-24],lead:[31,27, 88]},
];

function render(idle,step,hit) {
  const c=paint(),blow=hit===null?null:HIT[hit];
  const walk=step!==null, stride=walk?Math.sin(step*Math.PI/8):0;
  const lift=walk?current.frames[current.walk[step]][1]-26:[0,0,0,-1,-1,-1,0,0][idle];
  const breath=walk?0:[0,0,0,0,-1,-1,-1,0][idle];
  const x=blow?.x??0,y=lift+(blow?.y??0);
  const far=blow?.far??[15,24+stride,-16+stride*5];
  const near=blow?.lead??[30,27-stride,74-stride*7];
  const grip=(arm)=>[arm[0],Math.round(arm[1]+lift)];
  const rearHand=grip(far),leadHand=grip(near);
  const rearElbow=blow ? [16+x,24+y] : [15+x,26+y];
  const leadElbow=[31+x,(blow&&hit<=2?22:25)+y];
  c.pixels.set(legs[walk?step+1:0]);
  arm(c,[19+x,21+y],rearElbow,rearHand,false);
  c.rows(14+x,17+y,COAT);
  arm(c,[28+x,21+y],leadElbow,leadHand,true);
  c.rows(26+x,19+y,'kAAnn AFFFN .AAFn ..ak.');
  axe(c,rearHand,far[2],-1,false);
  c.rows(18+x,10+(walk||blow?y:breath),HEAD);
  axe(c,leadHand,near[2],1,true);
  return btoa(String.fromCharCode(...c.pixels));
}

const frames=[];
const add=(idle,step,hit)=>frames.push(render(idle,step,hit))-1;
const idle=Array.from({length:8},(_,i)=>add(i,null,null));
const walk=current.walk.map((_,i)=>add(0,i,null));
const attack=HIT.map((_,i)=>add(0,null,i));
const attackWalk=HIT.map((_,h)=>walk.map((_,s)=>add(0,s,h)));
const normalSpeed=Math.min(1.6,Math.max(.6,moveFor('s15','easy')*(HEROES.berserker.stats.speed||1)));
export default {name:'Skardi Ironbrow',pick:'berserker-vikings:skardi',w:W,h:H,anchorY:current.anchorY-16,
  hires:1,fitW:31,fitH:30,indexBytes:1,idle,walk,attack,attackWalk,palette,frames,
  attackRelease:current.attackRelease,attackFps:current.attackFps,idleRate:3.75,
  motionRate:current.walkFps/(7*1.4*normalSpeed),selfBob:true};
