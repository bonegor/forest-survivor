// Native-pixel adaptation of the retained standing worshiper reference.
// One modular model and coherent articulated clips. The photo's warm stone
// colours are local to this statue; pixel density and outlines match the game.
import { hexPack } from '../../public/js/engine/pixels.js';
export const W=80,H=64;
export const STONE_PALETTE=Object.freeze(Object.fromEntries(Object.entries({
 k:'#302b27',m:'#887360',b:'#a38a72',B:'#b89c82',d:'#c7ac92',
 t:'#c7ac92',T:'#dbc4aa',s:'#cfb59a',S:'#ad9178',C:'#c0a68d',
 D:'#a38a72',H:'#887360',z:'#e1cdb5',eye:'#d5c5aa',pupil:'#282c28',
 copperDark:'#78543e',copper:'#a57551',copperLight:'#c79b68',
 leather:'#5b483a',leatherLight:'#8d6c50',
}).map(([key,hex])=>[key,hexPack(hex)])));
const P=STONE_PALETTE,TAU=Math.PI*2,R=Math.round,wrap=t=>((t%1)+1)%1;
function painter(d,ox=0,oy=0,hem=1){
 const put=(x,y,k)=>{x=R(x+ox);y=R((y>34?34+(y-34)*hem:y)+oy);if(x>=0&&x<W&&y>=0&&y<H)d[y*W+x]=P[k];};
 const rect=(x,y,w,h,k)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)put(x+i,y+j,k);};
 const line=(a,b,k,width=1)=>{let x=R(a[0]),y=R(a[1]),x1=R(b[0]),y1=R(b[1]);const dx=Math.abs(x1-x),sx=x<x1?1:-1,dy=-Math.abs(y1-y),sy=y<y1?1:-1;let err=dx+dy;for(;;){rect(x-Math.floor(width/2),y-Math.floor(width/2),width,width,k);if(x===x1&&y===y1)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}};
 const poly=(pts,k)=>{for(let y=Math.floor(Math.min(...pts.map(p=>p[1])));y<=Math.ceil(Math.max(...pts.map(p=>p[1])));y++)for(let x=Math.floor(Math.min(...pts.map(p=>p[0])));x<=Math.ceil(Math.max(...pts.map(p=>p[0])));x++){let hit=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>y+.5)!==(b[1]>y+.5)&&x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0])hit=!hit;}if(hit)put(x,y,k);}};
 const shape=(pts,k,edge='k')=>{poly(pts,k);for(let i=0;i<pts.length;i++)line(pts[i],pts[(i+1)%pts.length],edge);};
 return{put,rect,line,poly,shape};
}
// Forward contact, compression, passing and reach; support knee stays quiet.
function foot(phase,far){const p=wrap(phase+(far?.5:0)),support=.6;if(p<support)return{x:4.5*(1-2*p/support),y:0};const q=(p-support)/(1-support);return{x:-4.5*Math.cos(q*Math.PI),y:-2.7*Math.sin(q*Math.PI)};}
function leg(a,phase,far,moving,stride=1){const f=moving?foot(phase,far):{x:0,y:0};f.x*=stride;f.y*=Math.sqrt(stride);
 const hx=far?42:36,ax=hx+f.x,kx=hx+f.x*.48-(f.y?1:0),ay=54+f.y;
 a.line([hx,44],[kx,49+f.y*.25],'k',4);a.line([kx,49+f.y*.25],[ax,ay],'k',4);
 a.line([hx,44],[kx,49+f.y*.25],far?'D':'T',2);a.line([kx,49+f.y*.25],[ax,ay],far?'S':'t',2);
 a.shape([[ax-2,ay-1],[ax+1,ay-1],[ax+3,ay+1],[ax+3,ay+2],[ax-3,ay+2]],far?'S':'t');a.line([ax-1,ay],[ax+1,ay+1],far?'t':'T');return f;}
function head(a){
 // Small scalloped stone crown. Hair is carved from the same beige material
 // as the face and body; only the cuts between its waves receive dark taupe.
 a.shape([[35,14],[36,12],[38,13],[40,12],[42,13],[44,14],[45,17],[45,22],[44,24],[35,24],[33,22],[33,18]],'C');
 a.line([36,14],[40,14],'T');a.put(42,14,'s');a.line([34,17],[35,15],'B');
 a.line([34,19],[35,17],'m');a.line([34,22],[35,20],'m');a.put(34,16,'T');a.put(34,20,'T');
 a.poly([[37,15],[41,15],[44,17],[44,21],[42,23],[37,23],[35,21],[35,18]],'t');
 a.poly([[37,16],[40,16],[42,18],[41,22],[37,21]],'s');
 // The continuous double-arched carved brow and inset almond eyes are the
 // statue's strongest identifier. The warm inlay never becomes white goggles.
 a.line([35,17],[37,16],'b');a.line([37,16],[40,17],'b');a.line([40,17],[42,16],'b');a.line([42,16],[44,17],'b');
 a.line([36,17],[38,16],'T');a.put(41,17,'T');a.put(43,17,'T');
 a.line([36,19],[38,18],'m');a.put(39,19,'m');a.line([36,20],[38,20],'B');
 a.rect(36,19,3,1,'eye');a.put(37,18,'eye');a.put(37,19,'pupil');
 a.line([41,18],[43,18],'m');a.put(44,19,'m');a.line([41,20],[43,20],'B');
 a.rect(41,19,3,1,'eye');a.put(42,18,'eye');a.put(42,19,'pupil');
 a.line([40,19],[40,21],'T');a.put(41,21,'S');a.put(40,22,'B');a.put(35,20,'s');
 // Long carved beard with wavy sides and five horizontal relief tiers. It
 // continues over the chest instead of reading as a separate dark chin beard.
 a.shape([[35,21],[37,22],[39,22],[40,23],[43,22],[44,23],[44,27],[43,30],[43,33],[38,33],[37,30],[35,27],[34,24]],'B','b');
 a.line([35,22],[36,24],'T');a.line([35,25],[37,27],'T');a.line([37,28],[38,31],'C');
 a.line([37,22],[39,23],'S');a.line([40,22],[42,22],'m');a.put(41,23,'T');
 for(const [y,left,right] of [[24,37,43],[26,38,43],[28,38,42],[30,39,42],[32,39,42]]){
  a.line([left,y],[right,y],'m');a.line([left,y-1],[right-1,y-1],'T');a.put(right,y-1,'C');
 }
}
export const ATTACK_GRIPS=[[38,34],[27,28],[44,38],[45,38],[38,34]];
export function nativeFrame({phase=0,moving=false,attack=-1,idle=false,layer=null,unarmed=false}={}){
 const d=new Uint32Array(W*H),hidden=(layer||unarmed)&&new Uint32Array(W*H);
 const part=(name,x=0,y=0)=>painter((layer&&layer!==name)||(unarmed&&(name==='copper'||name==='whip'))?hidden:d,x,y,unarmed&&name==='skirt'?.79:1);
 const a=part('bust'),t=phase*TAU,breath=idle&&Math.cos(t)<-.15?-1:0,shift=moving&&Math.sin(t)>.65?1:0,bob=moving&&Math.cos(t*2)<-.35?1:breath,lean=attack===1?-1:attack===2?2:attack===3?3:0;
 const stride=unarmed?1.9:1;
 const far=leg(part('farFoot'),phase,true,moving,stride),near=leg(part('nearFoot'),phase,false,moving,stride),top=part('skirt',shift,bob),up=part('bust',shift+lean,bob),left=30+R(near.x*.28),right=48+R(far.x*.28),liftL=R(near.y*.45),liftR=R(far.y*.45);
 // Calm cylindrical stone body: broad top-left planes, no fabric wrap or belt.
 top.shape([[33,34],[44,34],[46,41],[right,52+liftR],[right-1,54+liftR],[43,55+liftR],[40,54],[37,55+liftL],[33,54+liftL],[left,52+liftL],[31,43]],'C');
 top.poly([[33,35],[40,35],[42,42],[41,54],[35,54+liftL],[32,51],[32,43]],'s');
 top.poly([[33,37],[35,35],[37,37],[36,45],[34,51],[32,49],[32,42]],'T');
 top.poly([[43,35],[45,39],[46,46],[right-1,52+liftR],[44,54+liftR],[42,51],[42,42]],'S');
 top.poly([[45,43],[right-1,46],[right,52+liftR],[right-1,53+liftR],[45,52],[44,46]],'B');
 // Deep vertical carved fringe occupies the bottom quarter of the figure.
 // Broad lighting spans the grooves, so they read as relief in one material.
 const grooves=[{x:left+2,start:45,end:53+liftL},{x:35,start:44,end:54+liftL},
  {x:38,start:45,end:54+liftL},{x:41,start:44,end:54},{x:44,start:45,end:54+liftR},{x:right-1,start:47,end:52+liftR}];
 for(const [i,f] of grooves.entries()){
  const dx=i<3?R(near.x*.12):R(far.x*.12);
  top.line([f.x,f.start],[f.x+dx,f.end],i>3?'m':'b');
  top.line([f.x-1,f.start+1],[f.x-1+dx,f.end-1],i<3?'T':'C');
 }
 top.line([33,44],[41,44],'C');top.put(37,55+liftL,'B');top.put(40,54,'B');top.put(43,55+liftR,'B');
 // Torso and garment meet without a colour/material break at the waist.
 const torso=[[36,25],[42,25],[43,27],[47,29],[46,35],[44,38],[33,38],[31,33],[31,29],[35,27]];
 up.poly(torso,'t');
 for(let i=0;i<torso.length;i++)if(i!==5&&i!==6)up.line(torso[i],torso[(i+1)%torso.length],'k');
 up.poly([[36,27],[40,26],[43,29],[43,35],[41,38],[34,38],[33,32],[33,29]],'s');
 up.poly([[34,28],[37,28],[38,31],[36,35],[34,37],[33,32]],'T');
 up.poly([[43,29],[46,30],[45,35],[43,38],[42,37]],'S');
 // Both resting arms bend inward like the reference's clasped hands. Copper
 // is a small muted game accessory cradled near the chest, not a large shield.
 const swing=unarmed?Math.round(-near.x*.47):0;
 const farElbow=unarmed?[45-swing*.6,34]:[47,33],farPalm=unarmed?[46-swing,38]:[44,36];
 up.line([45,29],farElbow,'k',4);up.line(farElbow,farPalm,'k',4);
 up.line([45,29],farElbow,'S',2);up.line(farElbow,farPalm,'t',2);
 const metal=part('copper',shift+lean,bob);
 metal.shape([[44,31],[47,30],[50,32],[51,35],[49,38],[46,38],[43,36],[43,33]],'copper');
 metal.poly([[44,32],[47,31],[49,32],[47,35],[44,35]],'copperLight');
 metal.poly([[48,34],[50,33],[50,36],[48,37],[46,37]],'copperDark');metal.put(45,32,'T');
 if(!unarmed){up.line([43,36],[46,36],'k',3);up.line([43,36],[46,36],'t',2);up.put(44,35,'T');}
 // The visible hand meets the actual game lash origin on release.
 const rawHand=attack>=0?ATTACK_GRIPS[attack]:[38+(moving?R(Math.sin(t)*.6):0),34+(idle&&Math.sin(t)>.5?1:0)],hand=attack>=0?rawHand:[rawHand[0]+shift,rawHand[1]+bob];
 if(unarmed){hand[0]=33+shift+swing;hand[1]=38+bob;}
 const shoulder=[32+shift+lean,29+bob],elbow=unarmed?[31+shift+swing*.6,35+bob]:attack===1?[27,32]:attack===2||attack===3?[36+lean,37]:[30+shift,36+bob];
 a.line(shoulder,elbow,'k',4);a.line(elbow,hand,'k',4);a.line(shoulder,elbow,'t',2);a.line(elbow,hand,'t',2);a.put(shoulder[0]-1,shoulder[1],'T');a.line([hand[0]-1,hand[1]-1],[hand[0]+1,hand[1]-1],'B',2);
 const whip=attack===2||attack===3?[[0,0],[3,0]]:attack===1?[[0,0],[-4,-2],[-7,0],[-6,5],[-3,6]]:[[0,0],[-5,3],[-9,7],[-10,9],[-8,10],[-5,9],[-3,6],[-3,3],[0,0]];
 const lash=part('whip');
 for(let i=1;i<whip.length;i++)lash.line([hand[0]+whip[i-1][0],hand[1]+whip[i-1][1]],[hand[0]+whip[i][0],hand[1]+whip[i][1]],'leather',2);
 for(let i=1;i<whip.length;i++)lash.line([hand[0]+whip[i-1][0],hand[1]+whip[i-1][1]],[hand[0]+whip[i][0],hand[1]+whip[i][1]],'leatherLight');
 a.rect(hand[0]-1,hand[1]-1,3,3,'t');a.put(hand[0],hand[1]-1,'T');a.put(hand[0]+1,hand[1]+1,'S');
 head(up);return{w:W,h:H,d};
}
