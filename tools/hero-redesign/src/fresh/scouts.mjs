// Fresh scout silhouettes, authored from blank coordinates for the new roster.
// Each owns its body, equipment and stride; only Ink raster primitives are shared.
function joint(c, a, b, d, dark, mid, light, width) {
  c.line(a,b,'k',width+2);c.line(b,d,'k',width+2);
  c.line(a,b,dark,width);c.line(b,d,mid,width);
  c.line([a[0]-1,a[1]],[b[0]-1,b[1]],light);
}
function archerBoot(c,x,y,far){
  c.rows(x-2,y-2,far?'kkk..\nkmmbk\nkbbbk\nkkkkk':'kkk...\nkbBDk.\nkBDDDk\nkkkkkk');
}
function recurve(c, p, by, pullHand, bowHand){
  const y=n=>n+by;
  // A forward-swept asymmetric recurve: both tips curl away from the string.
  const chain=[[32,y(12)],[35,y(12)],[36,y(16)],[40,y(20)],[42,y(25)],[42,y(30)],[45,y(33)],[47,y(36)],[45,y(38)]];
  for(let i=1;i<chain.length;i++)c.line(chain[i-1],chain[i],'k',3);
  for(let i=1;i<chain.length;i++)c.line(chain[i-1],chain[i],i<5?'D':'b');
  c.line([35,y(14)],[39,y(20)],'C');c.line([43,y(32)],[46,y(35)],'C');
  c.line(chain[0],pullHand,'Z');c.line(pullHand,chain.at(-1),'Z');
  c.line([40,y(23)],[41,y(27)],'m',3);c.line([40,y(23)],[41,y(27)],'C');
  if(p.attack===null||p.attack<3||p.attack===5){
    c.line([pullHand[0]-2,pullHand[1]],[47,y(25)],'T');
    c.rows(46,y(24),'G.\nGG\nG.');
    c.rows(pullHand[0]-3,pullHand[1]-1,'Z.\n.Z\nZ.');
  }
  c.rows(pullHand[0]-1,pullHand[1]-1,'SSt\nTtS\nbbk');
  c.rows(bowHand[0]-1,bowHand[1]-1,'SSt\nTtS\nbbk');
}
export function drawArcher(c,p){
  const walking=p.walk!==null;
  const phase=walking?p.phase:0;
  const bob=walking?Math.round(Math.abs(Math.cos(phase))):Math.floor((p.idle??0)/4);
  const y=n=>n+bob;
  const swing=Math.sin(phase),farLift=walking?Math.max(0,-Math.cos(phase))*2:0,nearLift=walking?Math.max(0,Math.cos(phase))*2:0;
  // Long swept copper ponytail: a separate curved mass left of the bare face.
  const hairSway=walking?Math.round(Math.sin(phase)*1):Math.round(Math.sin(p.phase)*.5);
  c.shape([[23,y(10)],[18,y(8)],[13,y(11)],[10,y(17)],[5+hairSway,y(23)],[10,y(22)],[9+hairSway,y(29)],[16,y(25)],[18,y(19)],[20,y(14)]],'b');
  c.poly([[19,y(10)],[14,y(12)],[12,y(18)],[8+hairSway,y(23)],[13,y(21)],[13,y(26)],[16,y(22)],[17,y(16)]],'O');
  c.line([17,y(12)],[14,y(19)],'o');c.line([14,y(20)],[12+hairSway,y(24)],'d');
  // Athletic back leg reaches under the hips; front leg folds through the knee.
  const rear=[21-swing*3,43-farLift],lead=[30+swing*3,43-nearLift];
  joint(c,[23,y(31)],[20-swing,37-farLift*.5],rear,'m','b','B',3);archerBoot(c,...rear,true);
  joint(c,[28,y(31)],[29+swing,37-nearLift*.5],lead,'v','b','D',3);archerBoot(c,...lead,false);
  // Teal fitted leather, angled chest and short split hip armor, no long cloak.
  c.shape([[20,y(20)],[25,y(18)],[30,y(20)],[31,y(24)],[29,y(30)],[32,y(34)],[27,y(35)],[25,y(32)],[21,y(35)],[18,y(33)],[21,y(28)],[18,y(24)]],'v');
  c.poly([[21,y(21)],[26,y(20)],[28,y(23)],[26,y(29)],[22,y(28)],[21,y(24)]],'E');
  c.line([22,y(22)],[25,y(24)],'M');c.line([25,y(24)],[24,y(28)],'M');
  c.line([20,y(29)],[29,y(30)],'b',3);c.rows(24,y(29),'DC\nCD');
  c.line([25,y(21)],[28,y(29)],'b',2);c.line([26,y(22)],[29,y(28)],'B');
  // One ivory shoulder plate makes the asymmetry legible against the copper hair.
  c.shape([[17,y(20)],[20,y(18)],[24,y(20)],[23,y(24)],[18,y(24)],[16,y(22)]],'Z');
  c.poly([[18,y(20)],[21,y(19)],[23,y(21)],[20,y(22)]],'T');
  // Shaded neck and open elven face. The long pointed ear breaks the hair outline.
  c.rows(24,y(16),'kSSk\nSTSk\nkTSk\nkbkk');
  c.rows(22,y(8),'..bOOOb..\n.bOodOOb.\nbOddTTSSb\n.bOTTTSSk\n..bTkTTSk\n..kTTSTSk\n...kTSSk.\n....kSk..');
  c.shape([[23,y(13)],[17,y(11)],[19,y(15)],[23,y(16)]],'S');c.line([18,y(12)],[22,y(14)],'T');
  c.line([22,y(9)],[26,y(9)],'o');c.dot(24,y(10),'d');
  const draw=p.attack===null?34:[36,32,29,37,37,35][p.attack];
  const rearHand=[draw,y(25)],frontHand=[40,y(26)];
  // Rear fingers draw the string; the forward forearm supports the bow grip.
  joint(c,[23,y(23)],[26,y(26)],rearHand,'S','S','t',2);
  joint(c,[29,y(22)],[34,y(24)],frontHand,'S','S','t',3);
  c.rows(34,y(24),'vMk\nEMk\nvvk');
  recurve(c,p,bob,rearHand,frontHand);
}

function hunterLeg(c,hip,knee,foot,far){
  joint(c,hip,knee,foot,far?'K':'n',far?'m':'K',far?'n':'N',3);
  c.rows(foot[0]-2,foot[1]-2,far?'kkkk.\nkmmbk\nkbmbk\nkkkkk':'kkkk..\nkKNNk.\nkNNNNk\nkkkkkk');
}
function diagonalCrossbow(c,p,bob,rear,support){
  const stage=p.attack,raise=stage===null?0:[2,1,0,0,1,1][stage],recoil=stage===3?-1:0;
  // The rail climbs diagonally from the hip toward the forward shoulder.
  const o=[30+recoil,29+bob+raise],u=[.86,-.50],v=[.50,.86];
  const at=(n,s=0)=>[o[0]+u[0]*n+v[0]*s,o[1]+u[1]*n+v[1]*s];
  // Spread the bow across the rail with open string triangles at either end.
  const limb=[at(7,-11),at(11,-9),at(13,-3),at(13,3),at(11,9),at(7,11)];
  for(let i=1;i<limb.length;i++)c.line(limb[i-1],limb[i],'k',3);
  for(let i=1;i<limb.length;i++)c.line(limb[i-1],limb[i],i<3?'G':'N');
  const latch=at(stage===3||stage===4?10:stage===1?-2:0);
  c.line(limb[0],latch,'Z');c.line(latch,limb.at(-1),'Z');
  c.shape([at(-7,-2),at(16,-2),at(16,1),at(-1,2),at(-4,5),at(-7,4)],'b');
  c.line(at(-5,-1),at(15,-1),'B');c.line(at(-4,-2),at(15,-2),'H');
  c.line(at(6,-1),at(6,2),'C',2);c.line(at(-3,2),at(-2,3),'k');
  if(stage===null||stage<3||stage===5){
    c.line(at(-4,-3),at(17,-3),'T');c.line(at(16,-4),at(17,-3),'Z');c.line(at(17,-3),at(16,-2),'Z');
    c.line(at(-4,-4),at(-2,-2),'Z');
  }else if(stage===3){c.line(at(15,-3),at(19,-3),'T');}
  // The two grips stay distinct from the wood and from each other.
  c.rows(rear[0]-1,rear[1]-1,'knk\nNgN\nknk');
  c.rows(support[0]-1,support[1]-1,'knk\nNgN\nknk');
}
export function drawWitchHunter(c,p){
  const phase=p.walk===null?0:p.phase,bob=p.walk===null?Math.floor((p.idle??0)/4):Math.round(Math.abs(Math.sin(phase)));
  const y=n=>n+bob;
  const stride=Math.cos(phase)*2.5;
  const backFoot=[22-stride,43-Math.max(0,Math.sin(phase))*2];
  const frontFoot=[29+stride,43-Math.max(0,-Math.sin(phase))*2];
  hunterLeg(c,[23,y(32)],[21-stride*.4,37],backFoot,true);
  hunterLeg(c,[29,y(32)],[29+stride*.4,37],frontFoot,false);
  // Asymmetric plated leather over a split maroon skirt; no brimmed hat or cape.
  c.shape([[18,y(20)],[23,y(17)],[29,y(18)],[33,y(23)],[31,y(29)],[34,39],[28,40],[26,35],[22,40],[16,38],[19,y(29)],[16,y(25)]],'m');
  c.poly([[19,y(29)],[25,y(30)],[23,37],[18,38]],'R');
  c.poly([[27,y(30)],[31,y(29)],[33,38],[28,38]],'R');
  c.line([20,y(31)],[19,36],'r');c.line([29,y(32)],[30,37],'b');
  c.shape([[18,y(21)],[23,y(19)],[27,y(22)],[26,y(28)],[21,y(29)],[18,y(26)]],'n');
  c.poly([[19,y(21)],[23,y(20)],[25,y(23)],[21,y(24)]],'N');
  c.line([19,y(24)],[24,y(26)],'K',2);
  c.line([20,y(29)],[30,y(30)],'b',3);c.rows(24,y(29),'CC\nCH');
  // High folded crimson hood: its narrow bent peak and long rear fold define
  // a wholly different head silhouette from the previous cowboy-like slouch hat.
  c.shape([[18,y(19)],[20,y(11)],[24,y(6)],[28,y(3)],[31,y(5)],[29,y(9)],[33,y(13)],[32,y(21)],[27,y(23)],[23,y(21)]],'R');
  c.poly([[23,y(10)],[27,y(5)],[29,y(5)],[27,y(10)],[29,y(12)],[23,y(15)],[20,y(20)]],'r');
  c.poly([[28,y(10)],[31,y(13)],[30,y(20)],[27,y(22)],[26,y(17)]],'m');
  // Half mask with one stern visible eye; the collar seats it into the chest.
  c.rows(23,y(12),'..kkkk..\n.kTTSSk.\n.kTkSSk.\nkZZZZSk.\n.kZTTZk.\n..kZZk..\n..kZk...');
  c.rows(21,y(19),'kRRmmmk\nRrRmmmk\nkRRmmkk');
  const raise=p.attack===null?0:[2,1,0,0,1,1][p.attack],recoil=p.attack===3?-1:0;
  const rear=[29+recoil,y(31)+raise],support=[37+recoil,y(27)+raise];
  joint(c,[20,y(23)],[23,y(28)],rear,'m','b','B',3);
  joint(c,[30,y(23)],[34,y(27)],support,'K','n','N',3);
  diagonalCrossbow(c,p,bob,rear,support);
}
