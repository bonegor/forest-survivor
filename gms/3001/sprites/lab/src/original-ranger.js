// Lyra as the game drew her until the pick of 15 October 2026 shipped (Silverleaf, animated in
// src/animated-oct15/archer.js), kept here to compare against. Was public/js/art/ranger-verdant.js.
//   node gms/3001/tools/build.mjs gms/3001/sprites/lab/src/original-ranger.js
// Lyra: an original, compact pixel ranger to accompany the plumed knight.
// The same model is drawn in every pose; cloth, limbs and bow have their own
// motion. These are native pixels, with no smoothing or per-frame resizing.
import { makeBuf, hexPack } from '../../../../../public/js/engine/pixels.js';

export const RANGER_PALETTE = {
  o: '#211d2a', a: '#263c36', b: '#365b42', c: '#5c8b51',
  d: '#95b969', e: '#d0d992', h: '#503134', j: '#8c523d', k: '#c18455',
  s: '#a36652', t: '#d99c77', u: '#f6cda0',
  v: '#4b435b', w: '#837b94', x: '#c5bdd2', y: '#efe6e3',
  l: '#362b36', m: '#624337', n: '#996748', p: '#c89460',
  g: '#c8a260', q: '#f0d38e', f: '#e4dec8', r: '#a1ad9c',
};
const PAL = Object.fromEntries(Object.entries(RANGER_PALETTE).map(([k,v]) => [k,hexPack(v)]));
const W = 48, H = 48, FOOT = 40;

function painter() {
  const b = makeBuf(W,H);
  const dot = (x,y,c) => { x=Math.round(x);y=Math.round(y); if(x>=0&&x<W&&y>=0&&y<H)b.d[y*W+x]=PAL[c]||0; };
  const line = (x0,y0,x1,y1,c,width=1) => {
    const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);
    for(let i=0;i<=steps;i++) {
      const x=Math.round(x0+(x1-x0)*i/steps),y=Math.round(y0+(y1-y0)*i/steps);
      for(let yy=0;yy<width;yy++)for(let xx=0;xx<width;xx++)dot(x+xx-Math.floor(width/2),y+yy-Math.floor(width/2),c);
    }
  };
  const poly = (points,c) => {
    const minY=Math.floor(Math.min(...points.map(p=>p[1]))),maxY=Math.ceil(Math.max(...points.map(p=>p[1])));
    for(let y=minY;y<=maxY;y++)for(let x=0;x<W;x++) {
      let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++) {
        const [xi,yi]=points[i],[xj,yj]=points[j];
        if((yi>y+.5)!==(yj>y+.5)&&x+.5<(xj-xi)*(y+.5-yi)/(yj-yi)+xi)inside=!inside;
      }
      if(inside)dot(x,y,c);
    }
  };
  const patch = (rows,x,y) => rows.forEach((r,dy)=>[...r].forEach((c,dx)=>{if(c!=='.')dot(x+dx,y+dy,c);}));
  return {b,dot,line,poly,patch};
}

const HOOD = [
  '....ooo......',
  '...ocdco.....',
  '..ocdedbo....',
  '.ocdddcbao...',
  'ocdccbbbao...',
  'occbboooao...',
  'ocbbohtuuo...',
  'obbaojtuouo..',
  '.obaojttuo...',
  '..oaojhso....',
  '...oohhso....',
  '....oooo.....',
];
const TORSO = [
  '..oobboo...',
  '.ovxxwcbo..',
  'ovwxywcbao.',
  'ovwvwmmnbo.',
  'ovvlmnnpbo.',
  '.olcbnpmo..',
  '.olcnpmoo..',
  '.omnmmlo...',
  '.ongqgno...',
  '.omnnmmo...',
  'omnmllmno..',
  'olml..lmo..',
];

// Contact, compression, passing and reach; then exchange the support leg.
// Each entry gives back and front [ankle x, ankle y, knee x, knee y].
const GAIT = [
  [[18,39,21,33],[29,39,27,33]],
  [[17,38,19,34],[27,39,26,34]],
  [[20,35,19,32],[24,39,24,33]],
  [[26,36,24,31],[21,39,23,33]],
  [[29,39,27,33],[18,39,21,33]],
  [[27,39,26,34],[17,38,19,34]],
  [[24,39,24,33],[20,35,19,32]],
  [[21,39,23,33],[26,36,24,31]],
];

function makePose(state,index,walkIndex=null) {
  const p=painter(), {dot,line,poly,patch}=p;
  const walking=state==='walk'||walkIndex!==null, shooting=state==='shoot', phase=walkIndex??index;
  const bob=walking?([0,1,0,-1,0,1,0,-1][phase]):shooting?0:([0,0,0,-1,-1,-1,0,0][index]);
  const sway=walking?[0,-1,-2,-3,-2,-1,0,1][phase]:[0,0,-1,-1,0,1,1,0][index];
  const lean=shooting&&index>=2&&index<=5?1:0;
  const ox=lean, oy=bob;
  const leg=(pose,front) => {
    const [ax,ay,kx,ky]=pose,hx=front?25:22,hy=29+oy;
    line(hx,hy,kx,ky,'o',5);line(kx,ky,ax,ay-2,'o',4);
    line(hx,hy,kx,ky,front?'n':'m',3);
    line(kx,ky,ax,ay-2,front?'m':'l',2);
    line(hx-1,hy,kx-1,ky-1,front?'p':'n');
    patch(front?['owxo','ovwo']:['ovwo','ovvo'],kx-2,ky-1);
    poly([[ax-2,ay-4],[ax+1,ay-4],[ax+2,ay-1],[ax+4,ay],[ax+4,ay+1],[ax-2,ay+1]],'o');
    line(ax-1,ay-3,ax,ay-1,front?'n':'m',2);
    line(ax-1,ay,ax+2,ay,front?'n':'m');dot(ax,ay-3,front?'p':'n');
  };
  const legs=walking?GAIT[phase]:shooting?[[20,39,22,34],[29,39,27,34]]:[[21,39,22,34],[27,39,26,34]];
  leg(legs[0],false);

  // Short split cloak: the hem trails the hips, with broad, readable folds.
  const tail=14+sway;
  poly([[20+ox,16+oy],[24+ox,20+oy],[22,30+oy],[20,35+oy],[17,34+oy],[tail-2,35+oy],[tail,29+oy],[16,23+oy]],'o');
  poly([[20+ox,17+oy],[22+ox,20+oy],[20,31+oy],[18,33+oy],[tail,33+oy],[tail+2,27+oy],[17,23+oy]],'b');
  poly([[19+ox,18+oy],[21+ox,20+oy],[18,29+oy],[tail+1,32+oy],[tail+3,26+oy]],'c');
  line(19+ox,19+oy,17,26+oy,'d');
  line(18,27+oy,tail+1,32+oy,'d');
  line(20,25+oy,18,32+oy,'a');
  dot(tail,33+oy,'e');dot(tail+1,33+oy,'c');

  // Quiver and pale fletching silhouette above the trailing shoulder.
  line(18+ox,22+oy,15+ox,15+oy,'o',5);
  line(18+ox,22+oy,15+ox,15+oy,'m',3);
  line(18+ox,21+oy,16+ox,16+oy,'n');
  for(const [x,y] of [[13,11],[16,10],[18,12]]) {
    line(x+ox,y+oy,x+3+ox,y+9+oy,'m');
    line(x+ox,y+oy,x+1+ox,y+3+oy,'f');dot(x-1+ox,y+oy,'r');dot(x+1+ox,y+1+oy,'r');
  }
  leg(legs[1],true);
  patch(TORSO,19+ox,19+oy);
  patch(HOOD,18+ox,8+oy);
  // Bronze clasp and a single loose curl keep the face separate from the hood.
  patch(['ogqo','ogno'],23+ox,20+oy);
  line(24+ox,17+oy,23+ox,21+oy,'j');dot(23+ox,20+oy,'k');

  // A relaxed low carry becomes a horizontal, cheek-anchored draw.
  const lift=shooting?[0,.5,1,1,1,1,.7,.25][index]:0;
  const gripX=Math.round(36+lift),gripY=Math.round(25+oy-lift*4);
  const half=Math.round(8+lift*2);
  const topX=gripX-4, topY=gripY-half, botX=gripX-4, botY=gripY+half;
  const pull=shooting?[0,2,5,9,10,0,0,0][index]:0;
  const nockX=topX-pull,nockY=gripY;
  // String is drawn behind the hands, never a second wooden bow.
  line(topX,topY,nockX,nockY,'r');line(nockX,nockY,botX,botY,'r');
  const arm=(a,b,c,front) => {
    line(...a,...b,'o',4);line(...b,...c,'o',3);
    line(...a,...b,front?'n':'m',2);line(...b,...c,front?'t':'s',2);
    dot(b[0],b[1],front?'x':'w');dot(c[0],c[1],'u');
  };
  // Rear drawing arm follows the string from the belt to the cheek.
  if(shooting&&lift>0)arm([23+ox,21+oy],[Math.round(25-pull*.5),Math.round(26-lift*4)+oy],[nockX,gripY],false);
  else arm([23,22+oy],[24,27+oy],[27,27+oy],false);
  // Bow-side arm, leather bracer and small steel shoulder plate.
  arm([27+ox,21+oy],[Math.round(29+lift*3),Math.round(25-lift*4)+oy],[gripX,gripY],true);
  patch(['.wx.','wxyw','vwwv','.vv.'],20+ox,20+oy);
  patch(['wx','vw'],27+ox,20+oy);
  const bow=[[topX-1,topY-1],[topX,topY+2],[gripX-1,topY+5],[gripX,gripY-2],[gripX,gripY+2],[gripX-1,botY-5],[botX,botY-2],[botX-1,botY+1]];
  for(let i=1;i<bow.length;i++)line(...bow[i-1],...bow[i],'o',3);
  for(let i=1;i<bow.length;i++)line(...bow[i-1],...bow[i],'p');
  line(gripX,gripY-2,gripX,gripY+2,'m');dot(gripX-1,gripY,'u');
  dot(topX-1,topY-1,'q');dot(botX-1,botY+1,'q');
  if(shooting&&index>=1&&index<=4) {
    line(nockX,gripY-1,gripX+6,gripY-1,'p');
    line(nockX-1,gripY-2,nockX+1,gripY-1,'f');
    patch(['.x.','xyx','.x.'],gripX+5,gripY-2);
  }
  // Brief string snap; the projectile is emitted by the existing bow weapon.
  if(shooting&&index===5)dot(topX+1,gripY-3,'f');
  return p.b;
}

let frames;
export const RANGER_VERDANT = {
  gen: () => frames ??= [
    ...['idle','walk','shoot'].flatMap(state=>Array.from({length:8},(_,i)=>makePose(state,i))),
    ...Array.from({length:8},(_,a)=>Array.from({length:8},(_,w)=>makePose('shoot',a,w))).flat(),
  ],
  idle: [0,1,2,3,4,5,6,7], walk: [8,9,10,11,12,13,14,15],
  attack: [16,17,18,19,20,21,22,23], attackFps: 14, attackRelease: 5,
  attackWalk: Array.from({length:8},(_,a)=>Array.from({length:8},(_,w)=>24+a*8+w)),
  motionRate: 12 / (9.8 * 1.15), idleRate: 6 / 1.6,
  anchorY: FOOT, fitW: 36, fitH: 34, selfBob: true, outline: false,
};

export default [{
  cls: 'archer', id: 'original-verdant', name: 'Original · Lyra (until 15 October)',
  description: 'The ranger the game drew until Silverleaf was picked: hooded, in green and leather, with her bow shots and shots on the move.',
  collection: 'Originals', def: RANGER_VERDANT,
}];
