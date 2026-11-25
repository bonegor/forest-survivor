// Two new V2 character models. Integer-pixel components share joints across all
// poses; equipment is drawn as a separate layer after the complete walking legs.
import { hexPack } from '../../../public/js/engine/pixels.js';

const COLORS = {
  '0':'#171c28', '1':'#2c3546', '2':'#465467', '3':'#6c7d8c', '4':'#9eafba', '5':'#d8e1dc',
  a:'#4a1d2a', b:'#793d36', c:'#aa6250', d:'#d68a6c', e:'#efb48e', f:'#f8d3a3',
  g:'#102a29', h:'#21463a', i:'#37654b', j:'#588351', k:'#8aa864', l:'#c1cc88',
  m:'#23161d', n:'#45302b', o:'#71503c', p:'#a4784d', q:'#c49b62', r:'#e0bf82',
  s:'#381d2c', t:'#652c3a', u:'#95404b', v:'#c7635a',
  W:'#ecdfbd', X:'#9ee7a7', Y:'#e6b95f', Z:'#efffe1',
};
const packed = Object.fromEntries(Object.entries(COLORS).map(([k,v]) => [k,hexPack(v)]));

class Pixels {
  constructor() { this.d = new Uint32Array(48 * 48); }
  px(x,y,k) {
    x=Math.round(x); y=Math.round(y);
    if(k && k!=='.' && x>=0 && x<48 && y>=0 && y<48) this.d[y*48+x]=packed[k];
  }
  grid(x,y,rows) { rows.trim().split('\n').forEach((r,j)=>[...r.trim()].forEach((k,i)=>this.px(x+i,y+j,k))); }
  line(a,b,ramp,width=1) {
    const [ax,ay]=a,[bx,by]=b, n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)*2));
    for(let i=0;i<=n;i++) {
      const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;
      for(let oy=-width;oy<=width;oy++) for(let ox=-width;ox<=width;ox++) {
        if(ox*ox+oy*oy>width*width+.5)continue;
        const t=(ox+oy+2*width)/(4*width||1);
        this.px(x+ox,y+oy,ramp[Math.min(ramp.length-1,Math.floor((1-t)*ramp.length))]);
      }
    }
  }
  poly(points,ramp) {
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const left=Math.floor(Math.min(...xs)),right=Math.ceil(Math.max(...xs)),top=Math.floor(Math.min(...ys)),bottom=Math.ceil(Math.max(...ys));
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++) {
      let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++) {
        const [xi,yi]=points[i],[xj,yj]=points[j];
        if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
      }
      if(inside) {
        const u=(x-left)/Math.max(1,right-left),v=(y-top)/Math.max(1,bottom-top);
        const light=Math.max(0,Math.min(.999,.85-u*.55-v*.25));
        this.px(x,y,ramp[Math.floor(light*ramp.length)]);
      }
    }
    for(let i=0;i<points.length;i++)this.line(points[i],points[(i+1)%points.length],ramp[0],0);
  }
  arc(cx,cy,r,a,b,keys) {
    for(let n=0;n<70;n++) {
      const t=n/69,angle=a+(b-a)*t;
      this.px(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r,keys[Math.min(keys.length-1,Math.floor(t*keys.length))]);
    }
  }
}

const GAIT = [[4,0],[2,0],[0,0],[-2,0],[-4,0],[-2,2],[0,3],[3,2]];
const BOB = [1,1,0,0,1,1,0,0];
function leg(c,hip,dx,lift,far,cloth) {
  const ankle=[hip[0]+dx,37-lift];
  const knee=[hip[0]+dx*.45+(lift?1:0),33-lift*.5];
  c.line(hip,knee,cloth,2);
  c.line(knee,ankle,far?'mn12':'n234',1);
  c.grid(ankle[0]-1,ankle[1],far?'nnn.\nmnon\nmmmm':'233.\n2343\n01110');
}
function legs(c,p,cloth) {
  const n=p.walk===null?[2,0]:GAIT[p.walk],f=p.walk===null?[-2,0]:GAIT[(p.walk+4)%8];
  leg(c,[21,29+p.by],f[0],f[1],true,cloth);
  leg(c,[27,29+p.by],n[0],n[1],false,cloth);
}
function arm(c,shoulder,elbow,hand,skin) {
  c.line(shoulder,elbow,skin,2);
  c.line(elbow,hand,'n234',1);
  c.grid(hand[0]-1,hand[1]-1,'.ed\nedd\nbbc');
}
function axe(c,hand,angle,far=false) {
  const a=angle*Math.PI/180,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux;
  const point=(along,side)=>[hand[0]+ux*along+nx*side,hand[1]+uy*along+ny*side];
  c.line(point(-3,0),point(8,0),far?'nop':'opq',1);
  c.poly([point(3,-1),point(3,-4),point(8,-5),point(10,-3),point(8,-2),point(8,1),point(10,3),point(8,5),point(3,4),point(3,1)],far?'01234':'12345');
  c.line(point(8,-4),point(9,-3),'5',0);
  c.line(point(8,3),point(7,4),'4',0);
  c.px(...point(6,0),'Y');
  c.grid(hand[0]-1,hand[1]-1,'ed\ndd\nbc');
}

const RAIDER_HEAD = `
....mmm......
..mnonnm.....
.mnoooonm....
mnoppopnm....
mnoeddccbm...
mnbeddcfdb...
mnbe0df0db...
.mbedffedb...
..mbdddccm...
..mnoqponm...
...nppponm...
...mnponm....
....mnom.....`;
function berserker(c,p) {
  const by=p.by, ph=p.phase, atk=p.attack;
  // Short wolfskin cloak; no thin tails crossing the boot silhouettes.
  c.poly([[18,19+by],[12,23+by],[9+Math.sin(ph),29],[14,31],[18,29],[22,23+by]],'01234');
  legs(c,p,'stno');
  c.poly([[19,28+by],[29,28+by],[32,33],[28,35],[25,32],[22,35],[17,33]],'stuv');
  // Broad bare chest and diagonal harness, with a stable waist over both hips.
  c.poly([[17,20+by],[29,20+by],[32,23+by],[29,29+by],[20,29+by],[16,24+by]],'bcdef');
  c.line([18,21+by],[28,28+by],'nop',1);
  c.line([20,29+by],[29,29+by],'mnq',1); c.grid(24,28+by,'YY\nqo');
  const sway=p.walk===null?0:Math.sin(ph)*2;
  const positions=[
    [[17,22],[14,25],[13,27],-105,[29,22],[33,25],[34,27],-73],
    [[17,22],[16,18],[18,16],-115,[29,22],[31,18],[29,15],-65],
    [[17,22],[16,16],[20,13],-150,[29,22],[30,16],[28,13],-30],
    [[17,22],[23,25],[27,27],-20,[29,22],[33,26],[35,28],35],
    [[17,22],[23,27],[27,30],25,[29,22],[31,28],[33,31],65],
    [[17,22],[15,25],[14,28],-85,[29,22],[32,26],[34,28],-55],
  ];
  const a=atk===null?[[17,22],[14-sway*.5,25],[13-sway*.6,28],-112,[29,22],[32+sway*.5,25],[34+sway*.6,28],-68]:positions[atk];
  const U=([x,y])=>[x,y+by];
  arm(c,U(a[0]),U(a[1]),U(a[2]),'abcd'); axe(c,U(a[2]),a[3],true);
  // Layered wolf-fur shoulders with steel clasps.
  c.grid(12,18+by,`.233432....23332.\n23455432..2345432\n.334433223344332.\n..23231YY123232..\n...21......12...`);
  c.grid(18,6+by,RAIDER_HEAD);
  arm(c,U(a[4]),U(a[5]),U(a[6]),'bcdef'); axe(c,U(a[6]),a[7]);
  if(atk===3 || atk===4)c.arc(25,23,18,-2.5,atk===3?.65:1.2,atk===3?'34555':'2334');
}

const WARDEN_HEAD = `
.....hhi.....
...hijkih....
..hijkjih....
.hijkjijh....
hijkjiihh....
hijhefedh....
hijhd0f0dh...
.hihdeffdh...
..hhcddcbh...
...hoppnoh...
...opqqpoh...
....opponh...
.....onom....`;
function staff(c,hand,angle,cast) {
  const a=angle*Math.PI/180,ux=Math.sin(a),uy=-Math.cos(a);
  const at=n=>[hand[0]+ux*n,hand[1]+uy*n];
  const lower=Math.min(12,(38-hand[1])/Math.cos(a));
  c.line(at(-lower),at(16),'nopq',1);
  const [x,y]=at(15);
  // Forked oak head cradling one luminous seed, not a giant rack of antlers.
  c.line([x-1,y+3],[x-4,y-1],'opq',1);c.line([x+1,y+3],[x+4,y-2],'nop',1);
  c.grid(x-2,y-3,`.iXi.\niXZXi\n.XZX.\n..X..`);
  c.grid(hand[0]-1,hand[1]-1,'.ed\nedd\nbbc');
  if(cast===2 || cast===3)c.arc(x,y,5+ (cast===3?2:0),0,Math.PI*2,'ijXZ');
}
function druid(c,p) {
  const by=p.by,ph=p.phase,k=p.attack;
  // A hooded, heavily cloaked guardian, with distinct bark plates and a red beard.
  const trail=p.walk===null?0:2;
  c.poly([[18,18+by],[12,23+by],[9-trail,32],[13+Math.sin(ph),35],[18,33],[22,24+by]],'ghijkl');
  c.line([15,24+by],[11-trail,32],'jk',1);
  legs(c,p,'ghij');
  c.poly([[19,26+by],[28,26+by],[31,33],[27,35],[24,32],[21,35],[17,33]],'ghijk');
  c.poly([[18,21+by],[28,21+by],[30,26+by],[28,29+by],[19,29+by],[16,24+by]],'mnopq');
  c.grid(19,22+by,`.qpqpqp.\n.pnponp.\n.opopop.\n.npnpon.\n..opop..`);
  c.line([19,29+by],[29,29+by],'mnq',1);c.grid(23,28+by,'.Y.\nYXY\n.Y.');
  // Long leaf pauldrons connect the hood to the whole body.
  c.grid(12,18+by,`...jkij...ijkj.\n..jklkjh.hjklkj\n.jklkijhhhijklj\nhjkijh.Y.hijkih\n.hhih.....hihh.`);
  const arms=[[[29,23],[32,25],[34,27],0],[[29,23],[32,22],[33,23],-12],[[29,23],[31,21],[32,21],-20],[[29,23],[32,25],[35,27],8],[[29,23],[32,26],[35,28],8],[[29,23],[32,25],[34,27],0]];
  const a=k===null?arms[0]:arms[k],U=([x,y])=>[x,y+by];
  arm(c,[17,23+by],[15,26+by],[16,28+by],'ghij');
  c.grid(17,7+by,WARDEN_HEAD);
  // An oak-leaf clasp at the hood's brow; open face remains the focal point.
  c.grid(19,10+by,'.k.\nkYk\n.j.');
  arm(c,U(a[0]),U(a[1]),U(a[2]),'ghijk');
  staff(c,U(a[2]),a[3],k);
  if(k===3 || k===4) {
    c.arc(34,37,7,Math.PI,Math.PI*2,'ijXZ');
    for(const dx of [-5,0,5])c.line([34+dx,39],[33+dx,34+(dx===0?-2:0)],'hipX',1);
  }
}

export function guardian(id) {
  const frames=[];
  const add=(walk,attack,idle=0)=>{
    const phase=(walk??idle)/8*Math.PI*2;
    const by=walk===null?[0,0,0,1,1,1,0,0][idle]:BOB[walk];
    const c=new Pixels();
    (id==='druid'?druid:berserker)(c,{walk,attack,by,phase});
    frames.push({w:48,h:48,d:c.d});
  };
  for(let i=0;i<8;i++)add(null,null,i);
  for(let i=0;i<8;i++)add(i,null);
  for(let k=0;k<6;k++)add(null,k);
  for(let k=0;k<6;k++)for(let i=0;i<8;i++)add(i,k);
  return {frames,glow:id==='druid'?[packed.X,packed.Z]:[],metadata:{anchorY:40,fitW:36,fitH:36,selfBob:true,
    idle:Array.from({length:8},(_,i)=>i),walk:Array.from({length:8},(_,i)=>i+8),attack:Array.from({length:6},(_,i)=>i+16),
    attackWalk:Array.from({length:6},(_,k)=>Array.from({length:8},(_,j)=>22+k*8+j)),attackRelease:3,attackFps:12,motionRate:1.05,idleRate:3.75}};
}
