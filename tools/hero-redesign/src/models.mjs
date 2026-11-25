// Original hero models for the October 30 redesign. No prior hero pixels, rows,
// equipment models or generated sheets are used. Only the game's master palette.
import {packedPalette} from '../../../public/js/art/palette.js';
const PAL=packedPalette(), SIZE=52;
export const IDS=['archer','mage','rogue','necromancer','paladin','druid','berserker','witchhunter'];
class Ink {
 constructor(){this.d=new Uint32Array(SIZE*SIZE);}
 dot(x,y,k){x=Math.round(x);y=Math.round(y);if(k!=='.'&&PAL[k]&&x>=0&&y>=0&&x<SIZE&&y<SIZE)this.d[y*SIZE+x]=PAL[k];}
 rows(x,y,text){text.trim().split('\n').forEach((row,j)=>[...row.trim()].forEach((k,i)=>this.dot(x+i,y+j,k)));}
 line(a,b,k,width=1){const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2));for(let t=0;t<=n;t++)for(let dy=-(width-1)/2;dy<=(width-1)/2;dy++)for(let dx=-(width-1)/2;dx<=(width-1)/2;dx++)this.dot(a[0]+(b[0]-a[0])*t/n+dx,a[1]+(b[1]-a[1])*t/n+dy,k);}
 poly(points,k){const ys=points.map(p=>p[1]);for(let y=Math.floor(Math.min(...ys));y<=Math.ceil(Math.max(...ys));y++)for(let x=0;x<SIZE;x++){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}if(hit)this.dot(x,y,k);}}
 shape(points,shadow,light){this.poly(points,shadow);for(let i=0;i<points.length;i++)this.line(points[i],points[(i+1)%points.length],'k');if(light)this.line(points[0],points[1],light);}
 arc(x,y,rx,ry,a,b,k){for(let i=0;i<=100;i++){const t=a+(b-a)*i/100;this.dot(x+Math.cos(t)*rx,y+Math.sin(t)*ry,k);}}
 limb(a,b,c,shadow,light,width=3){this.line(a,b,'k',width+2);this.line(b,c,'k',width+2);this.line(a,b,shadow,width);this.line(b,c,shadow,width);this.line([a[0]-1,a[1]],[b[0]-1,b[1]],light);this.line([b[0]-1,b[1]],[c[0]-1,c[1]],light);}
}
const FOOT=[[4,0],[2,0],[0,0],[-2,0],[-4,0],[-3,2],[0,3],[3,2]];
function lower(c,p,{wide=5,hip=32,cloth='E',metal='N',robe=false}={}){
 const step=p.walk??0;
 for(const back of [true,false]){
  const [dx,up]=p.walk===null?(back?[-2,0]:[2,0]):FOOT[(step+(back?4:0))%8];
  const hx=26+(back?-wide/2:wide/2),ay=42-up;
  c.limb([hx,hip+p.bob],[hx+dx*.45,37-up*.5],[hx+dx,ay-1],back?'K':cloth,back?'n':metal,2);
  c.rows(hx+dx-2,ay-1,back?'kkk..\nkKnkk\nkkkkk':'kkkk.\nkNGNk\nkKNNk\nkkkkk');
 }
 if(robe){c.shape([[19,28+p.bob],[30,28+p.bob],[33+(p.walk===null?0:1),40],[26,40],[24,37],[20,41],[16,40]],cloth,metal);c.line([22,30+p.bob],[19,39],metal);c.line([27,29+p.bob],[28,38],'K');}
}
function chest(c,x,y,rows){c.rows(x,y,rows);}
function hand(c,x,y,glove=false){c.rows(x-1,y-1,glove?'kNk\nNgn\nknk':'kSk\nStS\nkBk');}
function cape(c,p,colors='vEe',wide=false){const y=19+p.bob,flow=p.walk===null?Math.sin(p.phase)*.5:Math.sin(p.phase)*1.5;c.shape([[21,y],[16,y+2],[wide?7:11,35+flow],[wide?13:16,37],[19,33],[23,30]],colors[0],colors[2]);c.poly([[17,y+4],[12,34+flow],[17,31],[20,24]],colors[1]);}
function sword(c,grip,angle,{length=17,gold=false}={}){const a=angle*Math.PI/180,u=[Math.cos(a),Math.sin(a)],v=[-u[1],u[0]],at=(n,s=0)=>[grip[0]+u[0]*n+v[0]*s,grip[1]+u[1]*n+v[1]*s];c.line(at(-3),at(1),'k',3);c.line(at(-3),at(0),gold?'D':'b');c.shape([at(2,-2),at(length,-1),at(length+3),at(length,1),at(2,2)],gold?'T':'g',gold?'Y':'w');c.line(at(2),at(length+1),gold?'z':'G');c.line(at(1,-4),at(1,4),'k',3);c.line(at(1,-3),at(1,3),gold?'Y':'C');hand(c,...grip,true);}
function staff(c,grip,top,kind){c.line([grip[0]-1,42],top,'k',3);c.line([grip[0]-1,41],top,kind==='mage'?'D':'b');c.line([grip[0]-2,40],[top[0]-1,top[1]+2],kind==='mage'?'C':'B');hand(c,...grip,true);}
function arm(c,a,b,h,{skin=false,dark='K',light='N'}={}){c.limb(a,b,h,skin?'S':dark,skin?'t':light,2);hand(c,...h,!skin);}
function bow(c,h,p){const pull=p.attack===null?0:[0,2,4,4,0,0][p.attack];const x=h[0]+2,y=h[1];c.line([x-2,y-13],[x+3,y-8],'k',3);c.line([x+3,y-8],[x+5,y],'k',3);c.line([x+5,y],[x+3,y+8],'k',3);c.line([x+3,y+8],[x-2,y+13],'k',3);for(const [a,b]of[[[x-2,y-13],[x+3,y-8]],[[x+3,y-8],[x+5,y]],[[x+5,y],[x+3,y+8]],[[x+3,y+8],[x-2,y+13]]])c.line(a,b,'C');c.line([x-2,y-13],[x-pull-2,y],'Z');c.line([x-pull-2,y],[x-2,y+13],'Z');c.line([x-2,y-11],[x,y-9],'Y');c.line([x,y+9],[x-2,y+11],'Y');if(p.attack!==null&&p.attack<4){c.line([x-pull-7,y],[x+9,y],'T');c.rows(x+8,y-1,'g.\nGg\ng.');}hand(c,...h,true);}
function raven(c,x,y,p){c.rows(x,y,`...kkk...\n..kNnkk..\n..kngkYk.\n.kkKnkk..\nkKnKkk...\nknnKk....\n.kkkk....\n..kk.....`);c.line([x+2,y+7],[x+1,y+10],'k');c.line([x+4,y+7],[x+5,y+9],'k');if(p.attack===2||p.attack===3){c.shape([[x+1,y+3],[x-5,y-2],[x-6,y+2],[x-2,y+6],[x+3,y+5]],'K','N');}}
function archer(c,p){
 cape(c,p,'vEe');lower(c,p,{wide:5,cloth:'b',metal:'B'});
 const y=18+p.bob;
 // Long exposed platinum braid and swept fringe; a pointed ear stays outside the hair.
 c.rows(17,12+p.bob,'..KGGK\n.KGzzGK\nKGzzGGK\n.KGGgGK\n..KggGK\n...KGK\n..KGK\n.KGGK\n..KGK\n...KGK');
 c.rows(20,y,'..kkkkkk..\n.kEGGEekk.\nkEeeEeeEk\nkEeTeEeeEk\n.kEeTEEEk\n.kEeeTEEk\n..kEEEEk\n..kDCCHk\n..kbBBbk\n.kbBBBbbk\nkEbBBbEEk\nkEEbEbEEk\n.kkk.kkk.');
 c.rows(21,9+p.bob,'...kkkk...\n..kGzzGk..\n.kGzzGGgk.\n.kGGTTSGk.\nkGGTSkSTSk\n.kGTSSTTk.\n..kTSSSk..\n...kSSk...\n....kk....');
 // Clear far ear and the bow arm, with a diagonal leather bracer.
 c.rows(18,13+p.bob,'TSk\n.TSk\n..Sk');
 const h=[34,26+p.bob],draw=p.attack!==null&&p.attack<4;
 arm(c,[23,y+4],[draw?27:24,y+8],[draw?31:26,draw?25+p.bob:29+p.bob],{skin:true});
 arm(c,[29,y+3],[32,y+5],h,{skin:true});bow(c,h,p);
 c.line([18,23+p.bob],[21,17+p.bob],'b',3);c.rows(16,15+p.bob,'G.G.\n.G.G\n.B.B\n.B.B');
}
function mage(c,p){
 cape(c,p,'qpj',true);lower(c,p,{robe:true,cloth:'q',metal:'p'});
 const y=19+p.bob;
 chest(c,18,y,'..kkkkkkkk..\n.kpTCCCTpqk.\nkpjjpCpjjpqk\nkppjpCpjjpqk\n.kpppCpppqk.\n..kpCCTpqk..\n..kppCppqk..\n..kpCCTpqk..\n..kppCppqk..\n.kpppCpppqk.\nkppppCppppqk\n.kkkkkkkkkk.');
 c.rows(22,11+p.bob,'..kkkkk.\n.kgGzZgk\n.kGTTTSk\n.kTSkTSk\n..kSTSk.\n..kZZZk.\n.kZzzZk.\n..kZZk..\n...kk...');
 // Angular tall archmage crown, not a recycled pointed hat.
 c.rows(19,4+p.bob,'..k.......k..\n.kCk.....kCk.\n.kCYk...kYCk.\n..kCkkkkkCk..\n..kCpjjpCCk..\n...kTCCCTk...\n..kkkkkkkkk..');
 const cast=p.attack===null?0:[0,1,3,5,3,1][p.attack],h=[34,26+p.bob-cast];
 arm(c,[29,y+3],[32,y+5-cast],h,{dark:'p',light:'j'});
 c.rows(h[0]-2,h[1]-7,`..o..\n.oFo.\noFYFo\n.oFo.\n..o..`);
 arm(c,[20,y+4],[16,y+6],[15,28+p.bob],{dark:'q',light:'p'});staff(c,[15,28+p.bob],[13,9+p.bob],'mage');
 c.rows(9,5+p.bob,'..kkk..\n.kCCCk.\nkCYTYCk\nkCTzTCk\n.kCCCk.\n..kCk..');
 if(p.attack===3)c.arc(34,21+p.bob,8,7,-2,1,'Y');
}
function rogue(c,p){
 const b=p.bob,flow=Math.sin(p.phase);
 c.shape([[21,16+b],[16,20+b],[10,32+b],[15,30+b],[12,39+b],[22,35+b],[25,30+b],[31,33+b],[30,26+b]],'q','p');
 c.poly([[19,23+b],[16+flow,34+b],[21,32+b],[24,25+b]],'p');
 c.poly([[25,27+b],[24-flow,38+b],[29,35+b],[31,29+b]],'K');
 c.rows(19,15+b,'..kkkkkkkk..\n.kNNnKnnnkk.\nknngnKngnnnk\n.kKnnKnnnKk.\n..kKNCnNKk..\n..knnKnnKk..\n..kKNNNKk...\n...kCCCk....\n..knKnnnk...\n..kKnnnKk...\n...kk.kk....');
 c.rows(21,6+b,'....kkk...\n...kNnKk..\n..kNnnKKk.\n.kNnkkkkKk\nknnkckckKk\n.kKkkkkKk.\n..kNnnKk..\n...kKKk...\n....kk....');
 const slash=p.attack===null?0:[0,-2,-4,4,3,1][p.attack];
 arm(c,[20,20+b],[16,24+b],[14,27+b],{});sword(c,[14,27+b],-55,{length:8});
 arm(c,[29,20+b],[32,22+b],[34+slash*.5,25+b],{});sword(c,[34+slash*.5,25+b],p.attack===3?20:-65,{length:10});
}
function necromancer(c,p){
 cape(c,p,'kKn',true);lower(c,p,{robe:true,cloth:'K',metal:'n'});const y=18+p.bob;
 c.rows(19,y,'..kkkkkkkk..\n.kZzzZnnZkk.\nkZZkZnnkZZkk\n.kZkZnnkZnk.\n..kZZZZZnk..\n..knZnnZnk..\n..kZZZZZnk..\n..knZnnZnk..\n..kZZZZZnk..\n..kCCCCCnk..\n.knnnKnnnnk.\nkKnnnKnnnnKk');
 c.rows(23,7+p.bob,'..kkkkk..\n.kKnnnKk.\nkKnZZZnKk\nkKZzzZZKk\n.kZkZkZk.\n.kZlZlZk.\n..kZZZk..\n..kZkZk..\n...kkk...');
 // Crow perches on the far shoulder, with an unmistakable beak and folded wing.
 raven(c,11,12+p.bob,p);
 const lift=p.attack===null?0:[0,1,3,1,0,0][p.attack];
 arm(c,[29,22+p.bob],[33,24+p.bob],[35,27+p.bob-lift],{});
 staff(c,[35,27+p.bob-lift],[38,12+p.bob-lift],'necro');
 c.rows(34,5+p.bob-lift,'..kkkkk..\n.kZZZZZk.\nkZzkZkZZk\nkZZlZlZZk\n.kZZZZZk.\n..kZkZk..\n...kkk...');
 arm(c,[20,22+p.bob],[18,27+p.bob],[20,29+p.bob],{});
 if(p.attack===3)c.arc(38,10+p.bob,7,7,0,Math.PI*2,'l');
}
function paladin(c,p){
 // Winged helmet, white tabard, deep crimson mantle and a sunburst shield.
 cape(c,p,'mRb',true);lower(c,p,{wide:7,cloth:'N',metal:'G'});const y=18+p.bob;
 c.rows(16,y,'..kkkkkkkkkkkk..\n.kCGGNggggNGGCk.\nkCGzzGNGNGzzGGCk\nkCGGGgNGNgGGGGCk\n.kkNggNGNggNkk..\n..kNggNGNggNk...\n...kNGGGGNk.....\n...kGzCGGNk.....\n...kGzCzzNk.....\n...kCCCCHNk.....\n...kzGCGzNk.....\n..kzGzCzGzNk....\n..kzGzCzGzNk....\n...kkk.kkkk.....');
 c.rows(22,8+p.bob,'..kkkkkk..\n.kCGGGNCk.\nkCGzzGGNCk\nkCGGGGGNCk\n.kCkkkNCk.\n.kCYkYNCk.\n.kCGkGNCk.\n..kGkGNk..\n...kkkk...');
 c.rows(17,8+p.bob,'Gk...\nzGk..\n.GGk.\n..GNk\n...Nk');c.rows(30,8+p.bob,'...kG\n..kGz\n.kGG.\nkNG..\nkN...');
 arm(c,[20,y+5],[17,y+8],[16,29+p.bob],{});
 sword(c,[16,29+p.bob],p.attack===null?-68:[-75,-100,-120,-20,25,-60][p.attack],{length:16,gold:true});
 arm(c,[31,y+5],[34,y+7],[35,29+p.bob],{});
 c.rows(33,23+p.bob,'..kkkkkk..\n.kCCCCCCHk\nkCGGGGGCHk\nkCGGYGGCHk\nkCGYYY GCHk\nkCYYYYYCHk\nkCGYYY GCHk\nkCGGYGGCHk\n.kCGGGCHk.\n..kCGCHk..\n...kCHk...\n....kk....'.replaceAll(' ',''));
}
function druid(c,p){
 cape(c,p,'vE2',true);lower(c,p,{wide:6,cloth:'b',metal:'B'});const y=20+p.bob;
 // Broad old-growth bark shoulders, a pale stag mask, moss and long rust beard.
 c.rows(15,y,'...kkkkkkkkkk...\n..k2B1CbbB1b2k..\n.k21bCBbBCB12kk.\nk21BbbBbbBb122kk\n.kkbCBbbBCbbkk..\n...kbbBCBbbk....\n...kBbbBbbBk....\n...kbCBbBCbk....\n...kbbBCBbbk....\n...kDDCCDDbk....\n..kE2bBbB2EEk...\n..k2EEbEE2EEk...\n...kkk.kkkkk....');
 c.rows(21,9+p.bob,'...kkkkk...\n..kbBBbkk..\n.kbBTTTbbk.\n.kBTkTTkBk.\n.kBTlTTlBk.\n..kTTTTBk..\n..kbBbbk...\n..kBbBBbk..\n..kbBBBbk..\n...kbBbk...\n....kbk....');
 // Compact asymmetrical antlers; deliberately separate from the staff.
 c.line([22,10+p.bob],[19,5+p.bob],'b',3);c.line([19,5+p.bob],[17,3+p.bob],'T');c.line([20,7+p.bob],[16,7+p.bob],'C');
 c.line([28,10+p.bob],[30,5+p.bob],'b',3);c.line([30,5+p.bob],[33,4+p.bob],'T');c.line([30,7+p.bob],[34,7+p.bob],'C');
 const lift=p.attack===null?0:[0,1,3,1,0,0][p.attack];
 arm(c,[30,y+3],[34,y+5],[36,29+p.bob-lift],{dark:'b',light:'B'});
 staff(c,[36,29+p.bob-lift],[39,14+p.bob-lift],'druid');
 c.rows(35,8+p.bob-lift,'..kkkk...\n.k2LL2k..\nk2LLlL2k.\nk2LllL2bk\n.k2LL2bk.\n..kbbbk..\n...kbk...');
 arm(c,[19,y+4],[16,y+7],[17,30+p.bob],{dark:'b',light:'B'});
 if(p.attack===3){c.line([34,43],[31,37],'B',2);c.line([39,43],[42,36],'B',2);}
}
function axe(c,h,a){const rad=a*Math.PI/180,u=[Math.cos(rad),Math.sin(rad)],v=[-u[1],u[0]],at=(n,s=0)=>[h[0]+u[0]*n+v[0]*s,h[1]+u[1]*n+v[1]*s];c.line(at(-4),at(12),'k',3);c.line(at(-4),at(12),'B');c.shape([at(5,-2),at(4,-6),at(10,-7),at(14,-4),at(12,0),at(14,4),at(10,7),at(4,6),at(5,2)],'N','G');c.line(at(9,-6),at(13,-3),'G');c.line(at(13,3),at(9,6),'G');c.line(at(6),at(11),'K',2);hand(c,...h,true);}
function berserker(c,p){
 lower(c,p,{wide:9,cloth:'b',metal:'N'});const y=18+p.bob;
 // One shoulder wears a bear pelt, the other exposes scarred muscle.
 c.rows(15,y,'...kkkkkkkkkk...\n..knNNnbSSSSSk..\n.knNGGnbStttSSk.\nknNGGGnbStTTtSSk\nkNNNGNnbSttttSSk\n.kkNNnnbStSttSSk\n...kbSSbSttStSk.\n...kStSbStttSSk.\n...kSttSbbStSk..\n...kSSSSSbSSSk..\n...kCCCCDDDDk...\n...kmRRRmmRmk...\n..kmRRRRmRRRmk..\n...kkk..kkkkk...');
 c.rows(21,7+p.bob,'...kkkkk...\n..kmmRmmk..\n.kmRRRmmmk.\n.kmRTTSSmk.\n.kTSkTSkSk.\n.kTSSSTTSk.\n..kSSTSSk..\n..kbBBbbk..\n...kBbbk...\n....kkk....');
 const k=p.attack,hh=k===null?[35,28+p.bob]:[[35,28],[33,21],[29,18],[38,29],[37,33],[35,30]][k].map((v,i)=>v+(i?p.bob:0));
 arm(c,[30,y+3],[34,y+6],hh,{skin:true});axe(c,hh,k===null?-65:[-65,-90,-125,15,50,-45][k]);
 arm(c,[19,y+4],[15,y+8],[17,31+p.bob],{skin:true});
 c.rows(13,30+p.bob,'kNNk\nNGgn\nkNnk');
}
function witchhunter(c,p){
 cape(c,p,'kKn',true);lower(c,p,{wide:5,cloth:'K',metal:'n'});const y=19+p.bob;
 c.rows(18,y,'...kkkkkkkk...\n..kNnnTTnnnk..\n.knnNnTRnnnnk.\nkNNnnnTRnnNNnk\n.kNnnnTRnnnNk.\n..knnnTRnnnk..\n..kCCCCHHHnk..\n..knnnTRnnnk..\n..knnnTRnnnk..\n.knnnnTRnnnnk.\n.knnnnTRnnnnk.\nkKnnnnTRnnnnKk\nkKnNnnTRnNnnKk\n.kkknnk.kkkkk.');
 c.rows(22,10+p.bob,'..kkkkkk..\n.kbTTSbk..\n.kTSkSSbk.\n.kTSSSkbk.\n..kbbbk...\n..kbmbk...\n...kkk....');
 // Tall buckled slouch hat, feather, and broad readable brim.
 c.rows(18,4+p.bob,'.....kkkkk....\n....kNNnnkk...\n...kNNnnnKk...\n...kNNnnnKk...\n..kNCCCCHNKk..\n..kNCHYHHNKk..\n.kkkkkkkkkkkk.\nkNggNNNNNNnnKk\n.kkkkkkkkkkkk.');
 c.line([20,8+p.bob],[17,3+p.bob],'R',2);c.dot(17,2+p.bob,'r');
 const kick=p.attack===3?2:0;
 arm(c,[29,y+4],[33,y+6],[36-kick,27+p.bob],{});
 c.rows(34-kick,24+p.bob,'kkkkkkkkk\nkNGGGGGNk\nkNNnnnnkk\n.kkBbkk..\n..kbbk...\n...kk....');hand(c,35-kick,28+p.bob,true);
 arm(c,[20,y+4],[16,y+8],[16,30+p.bob],{});sword(c,[16,30+p.bob],-68,{length:13});
 if(p.attack===3)c.rows(43-kick,23+p.bob,'.o.\noYo\n.YF\noYo\n.o.');
}
const MODEL={archer,mage,rogue,necromancer,paladin,druid,berserker,witchhunter};
export function makeHero(id,{revision=1}={}){
 if(!MODEL[id])throw Error(`Unknown hero ${id}`);
 const frames=[];
 function add(walk,attack,idle=0){const phase=(walk??idle)/8*Math.PI*2,bob=id==='rogue'?Math.round(Math.sin(phase)):walk===null?([0,0,0,1,1,1,0,0][idle]):([0,1,1,0,0,1,1,0][walk]);const c=new Ink();MODEL[id](c,{walk,attack,phase,bob,revision});frames.push({w:SIZE,h:SIZE,d:c.d});}
 for(let i=0;i<8;i++)add(null,null,i);
 for(let i=0;i<8;i++)add(i,null);
 for(let k=0;k<6;k++)add(null,k);
 for(let k=0;k<6;k++)for(let i=0;i<8;i++)add(i,k);
 const glows={archer:[],mage:['Y','f'],rogue:['c'],necromancer:['l'],paladin:['Y'],druid:['l'],berserker:[],witchhunter:['Y','F']};
 return {frames,glow:glows[id].map(k=>PAL[k]),metadata:{anchorY:45,fitW:40,fitH:42,selfBob:true,idle:[0,1,2,3,4,5,6,7],walk:[8,9,10,11,12,13,14,15],attack:[16,17,18,19,20,21],attackWalk:Array.from({length:6},(_,k)=>Array.from({length:8},(_,i)=>22+k*8+i)),attackRelease:3,attackFps:12,motionRate:1,idleRate:4}};
}
