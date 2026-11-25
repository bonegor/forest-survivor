// Three blank-canvas models. Shapes, equipment, poses and anatomy are authored
// here rather than inherited from earlier roster proposals.
const CONTACT=[[3,0],[1,0],[-1,0],[-3,0],[-3,1],[-1,3],[1,3],[3,1]];
const bob=p=>p.walk===null?(p.idle>3?1:0):[0,1,1,0,0,1,1,0][p.walk];
function joint(c,a,b,d,dark,light,w=3){
  c.line(a,b,'k',w+2);c.line(b,d,'k',w+2);
  c.line(a,b,dark,w);c.line(b,d,dark,w);
  c.line([a[0]-1,a[1]],[b[0]-1,b[1]],light);c.line([b[0]-1,b[1]],[d[0]-1,d[1]],light);
}
function boot(c,x,y,metal=false){c.rows(x-2,y-2,metal?'kkkkkk.\nkCCDHkk\nkDHHHHk\nkkkkkkk':'kkkkk..\nkNKnkk.\nkKKKKkk\nkkkkkkk');}
function feet(c,p,{spread=5,hip=34,armor=false}={}){
  for(const rear of [true,false]){
    const [dx,lift]=p.walk===null?[rear?-1:1,0]:CONTACT[(p.walk+(rear?4:0))%8];
    const x=25+(rear?-spread:spread),toe=x+dx,y=44-lift;
    joint(c,[x,hip+bob(p)],[x+dx*.4,39-lift*.3],[toe,y-1],rear?'K':armor?'H':'m',armor?(rear?'D':'C'):'N',armor?3:2);
    boot(c,toe,y,armor);
  }
}
function gauntlet(c,x,y,gold=false){c.rows(x-2,y-2,gold?'kkkkk\nkCCHk\nkDDHk\nkkkkk':'kkkkk\nkNNnk\nkKnnk\nkkkkk');}
function basis(grip,angle){const a=angle*Math.PI/180,u=[Math.cos(a),Math.sin(a)],v=[-u[1],u[0]];return(n,s=0)=>[grip[0]+u[0]*n+v[0]*s,grip[1]+u[1]*n+v[1]*s];}

export function drawPaladin(c,p){
  const b=bob(p),ay=17+b,attack=p.attack;
  // A compact ring and four long rays give a cathedral silhouette without wings.
  c.ellipse(25,11+b,9,9,'H');c.ellipse(25,11+b,7,7,'k');
  c.line([25,2+b],[25,5+b],'Y');c.line([14,11+b],[18,11+b],'C');c.line([32,11+b],[36,11+b],'C');
  c.line([18,4+b],[20,6+b],'C');c.line([30,6+b],[32,4+b],'C');
  feet(c,p,{spread:6,hip:32,armor:true});
  // Massive black-and-gold armor, with squared high pauldrons.
  c.shape([[16,ay],[33,ay],[38,ay+5],[34,ay+15],[30,ay+19],[19,ay+18],[13,ay+9]],'I');
  c.shape([[15,ay],[21,ay],[22,ay+7],[17,ay+10],[11,ay+8],[11,ay+3]],'D');
  c.poly([[12,ay+3],[16,ay+1],[20,ay+1],[18,ay+5],[12,ay+6]],'C');
  c.line([12,ay+7],[18,ay+7],'H');
  c.shape([[30,ay],[35,ay],[39,ay+4],[38,ay+9],[31,ay+9]],'H');
  c.poly([[31,ay+1],[35,ay+1],[37,ay+4],[31,ay+4]],'C');
  c.shape([[20,ay+3],[30,ay+3],[32,ay+11],[28,ay+15],[20,ay+13],[18,ay+8]],'D');
  c.poly([[21,ay+4],[26,ay+4],[26,ay+11],[21,ay+12],[20,ay+8]],'C');
  c.poly([[27,ay+4],[29,ay+4],[31,ay+10],[28,ay+12]],'H');
  c.line([23,ay+5],[23,ay+10],'z');c.line([21,ay+7],[25,ay+7],'z');
  c.rows(19,31+b,'kkkkkkkkkkkkk\nkCCDDDDHHHHHk\nkkkkkkkkkkkkk');
  // Ivory split tabard sits over separate armored legs.
  c.shape([[21,34+b],[25,34+b],[24,42],[19,43]],'Z');
  c.poly([[21,35+b],[23,35+b],[22,41],[20,41]],'z');
  c.shape([[26,34+b],[30,34+b],[32,42],[27,41]],'C');
  c.poly([[27,35+b],[29,35+b],[30,40],[28,39]],'z');
  // Rectangular visor and narrow vertical breathing bars.
  c.rows(20,7+b,'..kkkkkkkk..\n.kCCCCCCCHk.\nkCzzCCCDHHk.\nkCCCCCCHHHk.\nkCkkkkkHHHk.\nkCzHCHCHHHk.\nkCCHCHCHHHk.\n.kCCHHHHHk..\n..kDDHHHk...\n...kkkkk....');
  // Both hands are fixed to the long diagonal hammer shaft.
  const angle=attack===null?-47:[-52,-73,-94,3,25,-31][attack],grip=[28,29+b],at=basis(grip,angle);
  const h1=at(-4),h2=at(4);
  joint(c,[16,ay+9],[18,ay+14],h1,'H','C',3);
  joint(c,[34,ay+9],[33,ay+13],h2,'H','C',3);
  c.line(at(-10),at(17),'k',4);c.line(at(-9),at(17),'H',2);c.line(at(-9,-1),at(16,-1),'C');
  c.shape([at(12,-6),at(19,-6),at(21,-3),at(21,3),at(19,6),at(12,6),at(11,3),at(11,-3)],'D');
  c.poly([at(12,-5),at(18,-5),at(19,-2),at(12,-2)],'z');
  c.poly([at(12,-1),at(19,-1),at(19,3),at(12,3)],'C');
  c.line(at(16,-4),at(16,4),'H',2);c.line(at(13,0),at(18,0),'Y');
  gauntlet(c,...h1,true);gauntlet(c,...h2,true);
}

export function drawDruid(c,p){
  const b=bob(p),sway=p.walk===null?0:Math.round(Math.sin(p.phase));
  feet(c,p,{spread:4,hip:34});
  // The weight is hunched forward beneath a broad ragged moss mantle.
  c.shape([[16,18+b],[25,15+b],[32,20+b],[32,31+b],[36,40],[30,39],[27,43],[22,40],[17,42],[15,38],[11+sway,42],[11,37],[7+sway,40],[10,33],[7+sway,35],[12,25]],'4');
  c.poly([[15,23+b],[22,21+b],[24,35],[19,39],[17,36],[13,39],[15,30]],'2');
  c.poly([[23,26+b],[29,25+b],[30,37],[27,40],[26,35]],'3');
  c.line([17,29+b],[15,36],'1');c.line([24,33],[24,39],'1');
  // Overlapping leaf edges form a hood with soft bear/owlish ears, not antlers.
  c.shape([[13,18+b],[12,13+b],[15,10+b],[19,12+b],[23,9+b],[29,10+b],[32,14+b],[31,21+b],[34,24+b],[29,27+b],[23,25+b],[16,26+b],[8,29+b],[10,25+b],[7,25+b],[10,21+b]],'3');
  c.poly([[15,13+b],[18,13+b],[23,11+b],[28,12+b],[29,15+b],[23,15+b],[18,20+b],[13,22+b]],'1');
  c.poly([[12,23+b],[18,19+b],[18,24+b],[15,25+b]],'2');
  c.poly([[29,15+b],[31,18+b],[29,23+b],[31,25+b],[26,24+b]],'4');
  // Recessed living face, strong nose and long off-centre white beard.
  c.rows(20,16+b,'..kkkkkk.\n.kbbSSbk.\nkSbkbSbk.\nkSSSSSbk.\n.kbSSbk..\n.kZzZZk..\nkZzzzZZk.\n.kZzzzZk.\n.kZzzZk..\n..kZzzk..\n...kZzk..\n....kZk..\n.....kk..');
  c.rows(17,20+b,'Zzk.\nZZzk\n.ZZk\n..Zk');
  // Exposed gnarled wooden gauntlet and a grasp around the crooked staff.
  const lift=p.attack===null?0:[0,1,2,2,1,0][p.attack],hand=[35,29+b-lift];
  joint(c,[29,25+b],[31,29+b],hand,'b','B',3);
  c.shape([[34,43],[35,33],[37,25-lift],[38,17-lift],[36,12-lift],[38,7-lift],[41,5-lift],[43,8-lift],[42,12-lift],[40,16-lift],[40,26-lift],[38,34],[37,43]],'b');
  c.line([35,41],[38,25-lift],'B');c.line([38,25-lift],[39,16-lift],'B');c.line([39,16-lift],[42,9-lift],'T');
  c.line([38,15-lift],[33,10-lift],'k',3);c.line([33,10-lift],[32,6-lift],'k',3);
  c.line([38,15-lift],[33,10-lift],'B');c.line([33,10-lift],[32,6-lift],'B');
  c.line([41,12-lift],[46,10-lift],'k',3);c.line([46,10-lift],[46,6-lift],'k',3);
  c.line([41,12-lift],[46,10-lift],'B');c.line([46,10-lift],[46,6-lift],'B');
  c.rows(39,10-lift,'..L.\n.LlL\n..l.');
  c.rows(hand[0]-2,hand[1]-2,'kkkkk\nkTBBk\nkBbBk\nkBBbk\n.kkk.');
  joint(c,[16,27+b],[13,31+b],[16,33+b],'3','1',3);c.rows(14,32+b,'kkkk\nkBTk\nkbbk\n.kk.');
}

function hatchet(c,grip,angle){
  const at=basis(grip,angle);
  c.line(at(-4),at(10),'k',3);c.line(at(-3),at(10),'B');
  c.shape([at(4,-1),at(5,-6),at(11,-7),at(10,-3),at(12,1),at(10,5),at(6,4),at(5,1)],'N');
  c.poly([at(5,-5),at(10,-6),at(9,-3),at(11,1),at(9,3),at(7,2)],'G');
  c.line(at(10,-6),at(9,-3),'z');c.line(at(9,-3),at(11,1),'z');
  c.rows(grip[0]-1,grip[1]-1,'kSk\nStS\nkkk');
}
export function drawBerserker(c,p){
  const b=bob(p),a=p.attack;
  feet(c,p,{spread:6,hip:33});
  // Short, wide, forward-weighted torso with an asymmetrical leather harness.
  c.shape([[17,20+b],[22,18+b],[29,18+b],[35,21+b],[36,27+b],[32,32+b],[19,32+b],[14,27+b]],'S');
  c.poly([[18,21+b],[24,20+b],[24,26+b],[19,27+b],[16,25+b]],'t');
  c.poly([[26,20+b],[31,20+b],[34,24+b],[32,27+b],[27,26+b]],'t');
  c.poly([[21,28+b],[25,27+b],[25,31+b],[21,31+b]],'t');
  c.poly([[27,28+b],[30,28+b],[30,31+b],[27,31+b]],'B');
  c.line([19,20+b],[29,32+b],'m',3);c.line([19,20+b],[28,31+b],'b');
  // Cyan pigment is broad paint, deliberately separate from skin highlights.
  c.line([16,22+b],[21,23+b],'M',2);c.line([27,21+b],[31,24+b],'M',2);
  c.line([28,23+b],[29,26+b],'X');
  c.rows(17,31+b,'.kkkkkkkkkkkkkkkk.\nkRRRRRRRbbRRRRRRmk\nkRrrRRRbbRRRRRRmmk\n.kkRRRbbbbRRRRkk..\n..kRRRmmkmmRRRk...\n..kRRmmkkkmmRRk...\n...kkkk...kkkk....');
  // A broad trapezius bridge seats the lowered head into the shoulder mass.
  c.shape([[19,22+b],[21,19+b],[23,17+b],[28,17+b],[31,19+b],[33,22+b]],'S');
  c.poly([[21,20+b],[23,18+b],[25,18+b],[25,21+b]],'t');
  // Bare scalp, flame-red crest and hanging braided beard.
  c.rows(20,11+b,'...kkkkkk...\n..kSTTTTSk..\n.kSTTTTTTSk.\n.kTTSkTSkSk.\n.kTTSTTTSSk.\n..kTSSTSSk..\n..kmBbBmk...\n...kBbbk....\n...kbbBk....\n....kBk.....\n....kbk.....\n....kDk.....\n.....k......');
  c.rows(23,6+b,'..kk..\n.krRk.\nkrRmk.\nkrRmk.\nkRRmk.\n.kRmk.\n..kk..');
  c.rows(20,15+b,'..M...\n.MX...\n.M....');
  // Two axes, each attached to a different hand, spread into a low broad stance.
  const left=a===null?[14,30+b]:[[14,30],[12,25],[14,23],[16,30],[16,33],[15,31]][a].map((v,i)=>v+(i?b:0));
  const right=a===null?[38,29+b]:[[38,29],[36,25],[34,22],[36,29],[36,32],[38,30]][a].map((v,i)=>v+(i?b:0));
  joint(c,[17,22+b],[12,25+b],left,'S','t',4);
  joint(c,[33,22+b],[38,25+b],right,'S','t',4);
  c.line([12,27+b],[15,27+b],'M',2);c.line([36,26+b],[39,26+b],'M',2);
  hatchet(c,left,a===null?-117:[-117,-100,-77,-137,-145,-120][a]);
  hatchet(c,right,a===null?-61:[-61,-84,-113,0,25,-42][a]);
}
