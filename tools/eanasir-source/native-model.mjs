// Native-pixel adaptation of the retained standing worshiper reference.
// One modular model, opaque master palette, and coherent articulated clips.
import { packedPalette } from '../../public/js/art/palette.js';
export const W=80,H=64;
const P=packedPalette(),TAU=Math.PI*2,R=Math.round,wrap=t=>((t%1)+1)%1;
function painter(d,ox=0,oy=0){
 const put=(x,y,k)=>{x=R(x+ox);y=R(y+oy);if(x>=0&&x<W&&y>=0&&y<H)d[y*W+x]=P[k];};
 const rect=(x,y,w,h,k)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)put(x+i,y+j,k);};
 const line=(a,b,k,width=1)=>{let x=R(a[0]),y=R(a[1]),x1=R(b[0]),y1=R(b[1]);const dx=Math.abs(x1-x),sx=x<x1?1:-1,dy=-Math.abs(y1-y),sy=y<y1?1:-1;let err=dx+dy;for(;;){rect(x-Math.floor(width/2),y-Math.floor(width/2),width,width,k);if(x===x1&&y===y1)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}};
 const poly=(pts,k)=>{for(let y=Math.floor(Math.min(...pts.map(p=>p[1])));y<=Math.ceil(Math.max(...pts.map(p=>p[1])));y++)for(let x=Math.floor(Math.min(...pts.map(p=>p[0])));x<=Math.ceil(Math.max(...pts.map(p=>p[0])));x++){let hit=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>y+.5)!==(b[1]>y+.5)&&x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0])hit=!hit;}if(hit)put(x,y,k);}};
 const shape=(pts,k,edge='k')=>{poly(pts,k);for(let i=0;i<pts.length;i++)line(pts[i],pts[(i+1)%pts.length],edge);};
 return{put,rect,line,poly,shape};
}
// Forward contact, compression, passing and reach; support knee stays quiet.
function foot(phase,far){const p=wrap(phase+(far?.5:0)),support=.6;if(p<support)return{x:4.5*(1-2*p/support),y:0};const q=(p-support)/(1-support);return{x:-4.5*Math.cos(q*Math.PI),y:-2.7*Math.sin(q*Math.PI)};}
function leg(a,phase,far,moving){const f=moving?foot(phase,far):{x:0,y:0},hx=far?42:36,ax=hx+f.x,kx=hx+f.x*.48-(f.y?1:0),ay=54+f.y;
 a.line([hx,44],[kx,49+f.y*.25],'k',4);a.line([kx,49+f.y*.25],[ax,ay],'k',4);
 a.line([hx,44],[kx,49+f.y*.25],far?'D':'T',2);a.line([kx,49+f.y*.25],[ax,ay],far?'S':'t',2);
 a.shape([[ax-2,ay-1],[ax+1,ay-1],[ax+3,ay+1],[ax+3,ay+2],[ax-3,ay+2]],far?'S':'t');a.line([ax-1,ay],[ax+1,ay+1],far?'t':'T');return f;}
function head(a){
 // Eighteen-pixel head and beard: space below belongs to neck and chest.
 a.shape([[35,13],[36,12],[38,13],[40,12],[43,13],[45,15],[46,18],[45,24],[43,27],[35,27],[33,24],[32,20],[33,16]],'m');
 a.line([35,14],[39,14],'B');a.put(41,14,'b');a.put(43,15,'b');
 a.line([33,17],[34,15],'b');a.line([33,20],[34,18],'b');a.line([34,23],[34,21],'b');
 a.shape([[37,15],[42,15],[45,17],[45,22],[43,24],[37,24],[35,22],[35,18]],'t','b');
 a.poly([[37,16],[42,16],[44,18],[42,23],[37,22]],'T');
 // Brows are separated from the almond rims by a light skin row. Tapered
 // whites and central pupils avoid a connected rectangular spectacle shape.
 a.line([36,17],[38,16],'m');a.line([38,16],[40,17],'m');a.line([42,17],[43,16],'m');a.put(44,17,'m');
 a.line([37,19],[39,19],'m');a.put(36,20,'b');a.put(40,20,'S');a.line([37,21],[39,21],'S');
 a.rect(37,20,3,1,'z');a.put(38,19,'z');a.put(38,20,'k');
 a.line([42,19],[44,19],'m');a.put(45,20,'b');a.line([42,21],[44,21],'S');
 a.rect(42,20,3,1,'z');a.put(43,19,'z');a.put(43,20,'k');
 a.put(41,20,'T');a.line([41,21],[41,22],'S');a.put(42,22,'T');a.put(35,21,'S');a.put(35,20,'t');
 // The wide jaw flows into three short curl tiers; the beard no longer
 // consumes the entire chest. Wavy edges preserve the reference silhouette.
 a.shape([[35,22],[37,24],[40,23],[41,24],[44,23],[45,25],[44,28],[42,29],[38,29],[35,27],[34,24]],'m');
 a.line([35,23],[36,25],'b');a.line([36,26],[38,28],'b');
 a.line([38,24],[41,24],'B');a.put(42,24,'b');a.line([38,25],[43,25],'b');
 a.line([38,27],[43,27],'b');a.put(39,26,'B');a.put(42,26,'B');a.line([39,28],[42,28],'B');
}
export const ATTACK_GRIPS=[[29,39],[27,28],[44,38],[45,38],[29,39]];
export function nativeFrame({phase=0,moving=false,attack=-1,idle=false}={}){
 const d=new Uint32Array(W*H),a=painter(d),t=phase*TAU,breath=idle&&Math.cos(t)<-.15?-1:0,shift=moving&&Math.sin(t)>.65?1:0,bob=moving&&Math.cos(t*2)<-.35?1:breath,lean=attack===1?-1:attack===2?2:attack===3?3:0;
 const far=leg(a,phase,true,moving),near=leg(a,phase,false,moving),top=painter(d,shift,bob),up=painter(d,shift+lean,bob),left=30+R(near.x*.28),right=48+R(far.x*.28),liftL=R(near.y*.45),liftR=R(far.y*.45);
 // A wrapped volume with grouped folds, stepped shadow and scalloped fringe.
 top.shape([[34,34],[44,34],[46,40],[right,51+liftR],[right-1,53+liftR],[44,54+liftR],[41,53],[38,54+liftL],[34,53+liftL],[left,52+liftL],[32,40]],'C');
 top.poly([[34,35],[42,35],[44,41],[40,45],[34,47],[32,44]],'T');
 top.poly([[34,36],[41,36],[37,40],[33,43],[32,42]],'z');
 top.poly([[43,35],[45,39],[45,44],[right-1,51+liftR],[44,53+liftR],[42,49],[42,43]],'D');
 top.poly([[45,41],[right-1,45],[right,51+liftR],[right-1,52+liftR],[45,51],[44,46]],'H');
 // The diagonal wrap fold continues into the central hanging folds.
 top.line([33,44],[43,38],'D');top.line([34,43],[41,39],'T');
 top.poly([[34,44],[38,42],[40,43],[38,49],[37,53+liftL],[34,52+liftL]],'T');
 top.poly([[38,44],[41,42],[42,46],[41,52],[39,53]],'z');
 // Fringe is arranged in unequal clusters instead of repeating bars.
 const folds=[{x:left+1,top:47,end:51+liftL,key:'D'},{x:left+3,top:46,end:52+liftL,key:'T'},
  {x:36,top:47,end:53+liftL,key:'z'},{x:38,top:45,end:52+liftL,key:'D'},
  {x:40,top:46,end:53,key:'T'},{x:43,top:47,end:52+liftR,key:'C'},
  {x:right-2,top:46,end:51+liftR,key:'D'}];
 for(const f of folds)top.line([f.x,f.top],[f.x-(f.x<39?1:0),f.end],f.key);
 top.put(34,53+liftL,'D');top.put(38,54+liftL,'C');top.put(41,53,'D');top.put(44,54+liftR,'D');
 // A calm torso rather than sculpted six-pack/bodybuilder anatomy.
 up.shape([[36,25],[42,25],[43,27],[47,29],[46,35],[44,37],[34,37],[31,33],[31,29],[35,27]],'t');
 up.poly([[36,27],[40,26],[43,29],[43,34],[41,36],[35,35],[33,32],[33,29]],'s');
 up.poly([[34,28],[37,28],[38,31],[36,34],[33,32]],'T');
 up.poly([[43,29],[46,30],[45,35],[43,36]],'S');up.line([35,36],[43,36],'C');
 // Rear arm and copper disc with a small number of hard facets.
 up.line([45,29],[49,35],'k',4);up.line([45,29],[49,35],'S',2);
 up.shape([[46,29],[50,28],[54,31],[55,35],[53,39],[49,40],[45,37],[44,33]],'B');up.poly([[46,30],[50,29],[52,31],[49,34],[45,34]],'d');up.poly([[49,34],[53,32],[54,35],[51,38]],'O');up.line([46,31],[48,30],'t');up.line([45,35],[48,38],'b');
 up.line([49,38],[51,36],'k',3);up.line([49,38],[51,36],'t',2);up.put(50,36,'T');
 // The visible hand meets the actual game lash origin on release.
 const rawHand=attack>=0?ATTACK_GRIPS[attack]:[29+(moving?R(Math.sin(t)*.6):0),39+(idle&&Math.sin(t)>.5?1:0)],hand=attack>=0?rawHand:[rawHand[0]+shift,rawHand[1]+bob];
 const shoulder=[32+shift+lean,29+bob],elbow=attack===1?[27,32]:attack===2||attack===3?[36+lean,37]:[29+shift,34+bob];
 a.line(shoulder,elbow,'k',4);a.line(elbow,hand,'k',4);a.line(shoulder,elbow,'t',2);a.line(elbow,hand,'t',2);a.put(shoulder[0]-1,shoulder[1],'T');a.line([hand[0]-1,hand[1]-1],[hand[0]+1,hand[1]-1],'B',2);
 const whip=attack===2||attack===3?[[0,0],[3,0]]:attack===1?[[0,0],[-4,-2],[-7,0],[-6,5],[-3,6]]:[[0,0],[-3,3],[-5,6],[-5,8],[-3,9],[0,8],[2,5],[1,2],[0,0]];
 for(let i=1;i<whip.length;i++)a.line([hand[0]+whip[i-1][0],hand[1]+whip[i-1][1]],[hand[0]+whip[i][0],hand[1]+whip[i][1]],'m',2);
 for(let i=1;i<whip.length;i++)a.line([hand[0]+whip[i-1][0],hand[1]+whip[i-1][1]],[hand[0]+whip[i][0],hand[1]+whip[i][1]],'b');
 a.rect(hand[0]-1,hand[1]-1,3,3,'t');a.put(hand[0],hand[1]-1,'T');a.put(hand[0]+1,hand[1]+1,'S');
 head(up);return{w:W,h:H,d};
}
