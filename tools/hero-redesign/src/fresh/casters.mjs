// Blank-canvas character models: no old sprite rows, rigs or equipment reused.
// Each caster owns its silhouette, stance, cloth motion and attack gesture.
const castProgress=[0,.25,.75,1,.6,.15];
const offset=(p)=>p.walk===null?Math.round(Math.sin(p.phase)*.5):[0,0,1,1,0,0,1,1][p.walk];
function sleeve(c,a,b,h,dark,light,width=3){
  c.line(a,b,'k',width+2);c.line(b,h,'k',width+2);
  c.line(a,b,dark,width);c.line(b,h,dark,width);
  c.line([a[0]-1,a[1]],[b[0]-1,b[1]],light);
  c.line([b[0]-1,b[1]],[h[0]-1,h[1]],light);
}
function fingers(c,x,y){c.rows(x-1,y-1,'kZZk\nkzzk\n.kk.');}
function boot(c,x,y,color){c.shape([[x-2,y-5],[x+1,y-5],[x+2,y-1],[x+4,y],[x+4,y+1],[x-2,y+1]],color);c.line([x-1,y-4],[x,y-1],'N');}

export function drawMage(c,p){
  const b=offset(p),cast=p.attack===null?0:castProgress[p.attack];
  const stride=p.walk===null?0:Math.sin(p.phase)*3,flutter=Math.round(Math.sin(p.phase)*2);
  // A sweeping cobalt scarf, asymmetric mantle, and a slim long robe.
  c.shape([[21,19+b],[12,20+b],[7,31+b],[11,29+b],[7,37+flutter],[16,33],[20,25+b]],'u');
  c.poly([[15,22+b],[10,30+b],[15,28+b],[13,34],[18,29]],'K');
  boot(c,22-stride,44-Math.max(0,stride*.3),'K');boot(c,28+stride,44-Math.max(0,-stride*.3),'n');
  c.shape([[20,26+b],[31,25+b],[34,41],[28,43],[25,39],[22,44],[16,41]],'K');
  c.poly([[22,28+b],[25,28+b],[24,39],[20,42],[18,40]],'u');
  c.poly([[28,29+b],[30,29+b],[32,40],[28,41]],'n');
  c.line([24,29+b],[21,41],'U');c.line([30,30+b],[32,40],'u');
  c.shape([[19,20+b],[27,17+b],[32,21+b],[31,30+b],[23,32+b],[19,28+b]],'u');
  c.poly([[21,22+b],[26,20+b],[26,28+b],[22,29+b]],'n');
  c.line([21,27+b],[30,28+b],'Z',2);c.dot(26,28+b,'c');
  // Enormous angular left shoulder contrasts with a bare casting sleeve.
  c.shape([[10,20+b],[13,14+b],[19,13+b],[24,19+b],[20,25+b],[13,24+b]],'n');
  c.poly([[13,16+b],[18,15+b],[21,19+b],[14,21+b]],'G');
  c.line([13,16+b],[18,15+b],'z');c.line([11,21+b],[19,24+b],'u');
  c.rows(19,16+b,'..kZZZk...\n.kZzzzzZk.\nkZzzzzzzZk\n.kZZzzZZk.\n..kZzzZk..');
  // New face and swept, windblown white hair: no hat or crown.
  c.rows(22,9+b,'..kkkkk...\n.kSTTSSk..\nkSTTTSSSk.\nkSTTkSSSk.\n.kSTTSkk..\n..kTTTSk..\n...kSSk...\n....kk....');
  c.shape([[29,11+b],[29,7+b],[24,5+b],[18,7+b],[11,5+b],[14,9+b],[9,10+b],[18,13+b],[23,10+b]],'Z');
  c.poly([[13,7+b],[19,8+b],[23,6+b],[27,7+b],[23,9+b],[17,10+b]],'z');
  c.line([18,11+b],[16,15+b],'G',2);
  // Curved ritual focus, slung backward, never the old vertical golden pole.
  sleeve(c,[17,23+b],[13,28+b],[11,29+b],'K','n',3);
  c.line([9,38],[12,20+b],'k',3);c.line([9,38],[12,20+b],'N');
  c.line([12,20+b],[9,17+b],'k',3);c.line([9,17+b],[5,19+b],'k',3);
  c.line([12,20+b],[9,17+b],'G');c.line([9,17+b],[5,19+b],'G');
  c.rows(4,20+b,'.c.\ncUc\n.c.');fingers(c,11,29+b);
  const hand=[35+cast*5,24+b-cast*3];
  sleeve(c,[30,22+b],[34,26+b-cast],hand,'u','U',3);fingers(c,...hand);
  const ox=hand[0]+1,oy=hand[1]-6;
  c.shape([[ox,oy-3],[ox+3,oy],[ox,oy+3],[ox-3,oy]],'U');
  c.line([ox-1,oy-1],[ox+1,oy+1],'c',2);c.dot(ox,oy,'z');
  if(cast>.7){c.line([ox-4,oy-4],[ox-2,oy-6],'c');c.line([ox+4,oy+1],[ox+6,oy-1],'c');}
}

export function drawRogue(c,p){
  const b=Math.round(Math.sin(p.phase)),drift=Math.round(Math.cos(p.phase)*2);
  const cast=p.attack===null?0:castProgress[p.attack];
  // The trailing shroud folds inward, then narrows into a loose curled end.
  // A stepped hem and broad turned plane prevent it reading as a rigid wing.
  c.shape([[20,18+b],[31,21+b],[30,28+b],[24,33+b],[21,34+b],[23,37+b],[17,40+b],[15,43],[9,45],[6,44],[12,41],[12,38+b],[16,34+b],[13,33+b]],'K');
  c.poly([[21,23+b],[26,25+b],[24,30+b],[18,33+b],[17,36+b],[14,38+b],[15,33+b]],'v');
  c.poly([[24,29+b],[25,32+b],[19,35+b],[21,37+b],[16,40+b],[13,41],[16,37+b],[16,34+b]],'N');
  c.poly([[18,35+b],[21,37+b],[16,39+b],[17,37+b]],'n');
  c.line([16,40+b],[11,43],'v');
  c.shape([[27,26+b],[32,28+b],[35,34+b],[42+drift,38+b],[35,39+b],[30,36+b],[25,33+b]],'v');
  c.line([30,32+b],[37+drift,37+b],'E');
  // The hood is tall and sharply pinched, with a long ivory death-mask inset.
  c.shape([[18,18+b],[17,10+b],[22,5+b],[27,4+b],[32,10+b],[34,20+b],[29,25+b],[22,24+b]],'v');
  c.poly([[20,10+b],[23,7+b],[27,6+b],[26,10+b],[21,17+b]],'E');
  c.poly([[29,10+b],[32,16+b],[31,22+b],[27,23+b]],'K');
  c.rows(23,10+b,'..kkk...\n.kZZZk..\nkZzzzZk.\nkZZzzZk.\nkZkkZZk.\n.kZkZk..\n.kZZZk..\n..kZk...\n..kZk...\n...k....');
  c.dot(25,15+b,'c');c.dot(28,15+b,'c');
  // Long folded sleeve on the trailing side.
  c.shape([[19,20+b],[16,21+b],[12,27+b],[8,28+b],[10,31+b],[18,29+b],[23,24+b]],'K');
  c.line([17,23+b],[13,28+b],'N');fingers(c,10,29+b);
  // Crescent ritual blade arcs around the forward hand. It stays one object.
  const hx=34+cast*2,hy=26+b-cast*3;
  sleeve(c,[30,22+b],[32,25+b],[hx,hy],'v','E',3);
  c.line([hx-1,hy+4],[hx+2,hy-6],'k',3);c.line([hx-1,hy+4],[hx+2,hy-6],'N');
  c.shape([[hx+2,hy-7],[hx+6,hy-13],[hx+10,hy-14],[hx+7,hy-10],[hx+6,hy-5],[hx+8,hy-1],[hx+4,hy-3]],'G');
  c.line([hx+6,hy-12],[hx+9,hy-13],'z');c.line([hx+5,hy-8],[hx+5,hy-5],'Z');
  fingers(c,hx,hy);c.line([hx-2,hy+1],[hx+2,hy+2],'Z');
}

export function drawNecromancer(c,p){
  const b=offset(p),cast=p.attack===null?0:castProgress[p.attack];
  const stride=p.walk===null?0:Math.sin(p.phase)*2;
  // Crooked heavy cloak is lopsided and stooped, not an upright bone-armour king.
  boot(c,23-stride,44,'m');boot(c,29+stride,44,'K');
  c.shape([[17,21+b],[28,19+b],[34,26+b],[35,43],[28,41],[24,45],[19,41],[12,43],[15,35]],'m');
  c.poly([[25,24+b],[30,25+b],[32,40],[28,38],[25,42],[22,40]],'R');
  c.poly([[18,27+b],[23,27+b],[21,39],[16,41]],'q');
  c.line([27,29+b],[29,39],'b');c.line([23,32+b],[22,41],'m',2);
  // A wide broken feather mantle with readable overlapping large feather groups.
  c.shape([[12,20+b],[19,16+b],[27,16+b],[34,21+b],[38,30+b],[32,28+b],[33,33+b],[27,29+b],[24,32+b],[20,28+b],[14,31+b],[15,26+b],[8,28+b]],'K');
  c.poly([[13,21+b],[19,18+b],[23,18+b],[18,23+b],[12,26+b]],'n');
  c.poly([[24,19+b],[28,18+b],[33,23+b],[34,27+b],[29,25+b]],'n');
  c.line([17,21+b],[15,27+b],'N');c.line([21,20+b],[20,27+b],'n');
  c.line([29,21+b],[31,28+b],'N');c.line([24,24+b],[24,29+b],'n');
  // Beaked ivory plague mask leans forward out of a low hood.
  c.shape([[22,11+b],[27,8+b],[32,10+b],[34,16+b],[30,21+b],[22,19+b],[20,16+b]],'q');
  c.poly([[24,10+b],[28,9+b],[31,11+b],[25,13+b]],'p');
  c.rows(26,12+b,'..kkk.....\n.kZZZk....\nkZzzzZkk..\nkZkZZzzzkk\nkZkZZZzzZk\n.kZZZZZkk.\n..kZZZk...\n...kkk....');
  c.dot(28,16+b,'l');
  // Bone crook: a broad inward hook connected to an angled dark shaft.
  const sy=cast*2;
  c.line([38,44],[41,18+b-sy],'k',3);c.line([38,44],[41,18+b-sy],'D');
  c.shape([[41,19+b-sy],[44,16+b-sy],[44,11+b-sy],[41,8+b-sy],[36,8+b-sy],[34,11+b-sy],[35,14+b-sy],[37,14+b-sy],[36,11+b-sy],[40,10+b-sy],[42,12+b-sy],[41,16+b-sy]],'Z');
  c.line([36,9+b-sy],[40,9+b-sy],'z');c.dot(36,13+b-sy,'l');
  sleeve(c,[31,26+b],[34,30+b],[40,28+b-sy],'K','n',3);fingers(c,40,28+b-sy);
  sleeve(c,[17,27+b],[15,32+b],[19+cast*3,34+b-cast*4],'K','n',3);fingers(c,19+cast*3,34+b-cast*4);
  // A real crow silhouette: long beak LEFT, raised head, folded pointed wing,
  // forked tail and two feet visibly resting on the contrasting shoulder.
  const cy=10+b;
  c.shape([[14,cy+6],[8,cy+9],[6,cy+14],[10,cy+12],[10,cy+14],[15,cy+10],[18,cy+8],[19,cy+4],[17,cy+1],[13,cy+1],[11,cy+4],[6,cy+4],[4,cy+6],[11,cy+6]],'k');
  c.poly([[13,cy+6],[16,cy+5],[17,cy+8],[13,cy+11],[9,cy+12]],'n');
  c.line([13,cy+7],[11,cy+11],'N');c.dot(14,cy+3,'G');
  c.line([14,cy+11],[14,cy+14],'D');c.line([16,cy+10],[17,cy+14],'D');
  c.line([12,cy+14],[15,cy+14],'Z');c.line([16,cy+14],[19,cy+14],'Z');
  if(cast>.7)c.shape([[15,cy+7],[9,cy+3],[6,cy],[6,cy+5],[11,cy+9]],'K');
}
