// Ylva Wolf-Tooth. Built on Moonsteel Huntress's leg, articulated gait,
// material-edge renderer and 48px registration. Torso, face, plait, mantle,
// and both axes are painted at those same native proportions.
pal({
  A:master.k,a:master.K,B:master.v,b:master.v,C:'#285657',c:'#397773',
  D:'#397773',d:master.M,E:master.M,G:master.Z,e:master.Z,
  K:master.m,k:master.b,f:master.B,r:master.S,F:master.t,P:master.s,p:master.T,
  L:master.k,l:master.m,M:master.m,m:master.b,N:master.b,n:master.B,
  O:master.B,R:master.t,o:master.t,
  '0':master.k,'1':master.a,'2':master.W,'3':master.Q,'4':master.Z,
  '5':master.G,'6':master.T,q:master.k,'7':master.m,'8':master.H,'9':master.D,
  '!':master.C,'?':master.T,'+':master.z,
  Z:master.k,z:master.b,t:master.B,y:master.D,T:master.C,Y:master.C,Q:master.T,
  s:master.K,v:master.n,i:master.N,w:master.g,j:master.G,W:master.z,
});
function tile(frame,x,y,rows) {
  for (let v=0;v<rows.length;v++) for (let u=0;u<rows[v].length;u++)
    if (rows[v][u]!=='.') frame.set((x+u)+','+(y+v),rows[v][u]);
}

// As on the Ranger, the face has two dark lids, a light bridge of the nose
// and a lighter near cheek. The shaved temple and the slash of woad sit
// beneath a raised, swept-back row of plaited hair.
function wolfHead(F,lean,by) {
  // Same native face profile, eye socket and nose as the selected roster
  // Ranger. Hair uses warm ivory and bronze in place of her auburn palette.
  for (const [line,row] of vikingHead.entries())
    tile(F,row.x+lean,10+line+by,[row.marks]);
  tile(F,20+lean,16+by,['8kc','9Qb']);
}
function wolfBraid(F,x,y,phase) {
  const bend=Math.round(Math.sin(phase)*.75);
  tile(F,16+x,12+y,[
    '...q7q','..7!?7','.q9!7q','q!?7..','7!8q..','qY7...',
  ]);
  tile(F,15+x+bend,17+y,['.q7.','q9!7','q!8.','.78.','.q..']);
}
const COAT = [
  '...aBffkk..',
  '..aDddcCyB.',
  '.aDddDCCyA.',
  '.BCDDCByDA.',
  '.BCcCByDDB.',
  '..BCByDCC..',
  '.LMNnOOYyL.',
  '.BbCDDyCCB.',
  'ABCDDCMCbBA',
  'ABCbBALBCBA',
  '.BBBA..ABB.',
];
// A low ear, sloping muzzle and one light tooth make the wolf readable on a
// shoulder five pixels deep. No cape hangs over the legs or either hand.
const FUR = [
  '....10...',
  '...13211.',
  '..1344431',
  '.12443132',
  '013014321',
  '003332121',
  '..06121..',
  '....01...',
];
function wolfArm(F,shoulder,elbow,hand,far) {
  const part = new Part();
  part.limb(shoulder,elbow,1.9,1.4,far?'kfrF':'frFPp');
  part.limb(elbow,hand,1.45,1.1,far?'MmN':'mNnOR');
  lay(F,part,1);
  const bx=Math.round((elbow[0]*2+hand[0])/3),by=Math.round((elbow[1]*2+hand[1])/3);
  F.set(bx+','+by,far?'n':'y');
}
// Local y runs down the haft. The upper outer point, broad cutting edge,
// inner notch and small beard are distinct even at the size of the Knight's
// shield boss. Rotate around the fist to keep the wrist attached in a cut.
const AXE = [
  '.......qq.',
  '..ss..qwj.',
  '.swsvijWj.',
  '.sjiwwwjWq',
  '..sviwwjWq',
  '..mOqviwjq',
  '..mO..svjq',
  '..mO...sjq',
  '..mO.....',
  '..mN.....',
  '..mO.....',
  '..mO.....',
  '..mN.....',
  '..M......',
];
function wolfAxe(F,hand,handed,angle) {
  const c=Math.cos(angle),s=Math.sin(angle);
  for (let y=-13;y<=13;y++) for(let x=-13;x<=13;x++) {
    const u=Math.round((x*c+y*s)*handed)+2;
    const v=Math.round(-x*s+y*c)+10;
    const key=AXE[v]?.[u];
    if(key && key!=='.') F.set((hand[0]+x)+','+(hand[1]+y),key);
  }
}
function fist(F,hand,far){
  tile(F,hand[0]-1,hand[1]-1,far?['.Fk','rFk','kfk']:['.Pk','FPf','kfk']);
}
// Two axes kept on opposite sides of the body during anticipation and
// recovery. Front-hand contact is pose 3, synchronized with the game hit.
const CUT=[
  {lean:0, far:[17,28,-2.85], front:[29,24,-.22]},
  {lean:-1,far:[17,29,-2.92], front:[28,22,-.46]},
  {lean:0, far:[17,29,-2.80], front:[30,21,-.66]},
  {lean:1, far:[17,27,-2.52], front:[32,24,1.00]},
  {lean:1, far:[17,26,-2.18], front:[31,28,1.80]},
  {lean:0, far:[17,27,-2.62], front:[30,27,.91]},
];
function drawWolf(c,walk,idle,cut){
  const phase=(walk==null?idle/8:walk/16)*TAU;
  const breath=[0,0,0,1,1,1,0,0][idle];
  const by=walk==null?breath:approvedSteps[walk].bob;
  const lean=cut==null?(walk==null?0:1):CUT[cut].lean;
  const F=new Map(),U=([x,y])=>[x+lean,y+by];
  const legs=walk==null?{far:legAt(22,-3,0,by),near:legAt(25,2,0,by)}:
    Object.fromEntries(approvedSteps[walk].legs.map(({name,hip,knee,ankle})=>[
      name,[[hip[0]-16,hip[1]-16],[knee[0]-16,knee[1]-16],[ankle[0]-16,ankle[1]-17]]
    ]));
  const swing=walk==null ? Math.sin(phase)*.33 : Math.cos(phase);
  const far=cut==null?[17-Math.round(swing),27,-2.82+swing*.10]:CUT[cut].far;
  const front=cut==null?[29+Math.round(swing),24,.30-swing*.06]:CUT[cut].front;
  const fp=U(far),np=U(front);
  wolfAxe(F,fp,1,far[2]);
  wolfArm(F,U([20,23]),U([18,26]),fp,true);
  fist(F,fp,true);
  leg(F,...legs.far,true);
  leg(F,...legs.near,false);
  tile(F,18+lean,21+by,COAT);
  tile(F,15+lean,19+by,FUR);
  wolfBraid(F,lean,by,phase);
  wolfArm(F,U([26,22]),U(cut==null?[27,26]:[27+(cut===3?2:0),25]),np,false);
  tile(F,25+lean,21+by,['BB','.D']);
  wolfAxe(F,np,1,front[2]);
  fist(F,np,false);
  wolfHead(F,lean,by);
  flush(c,F);
}
anim('ylva',{w:48,h:48,frames:126,fps:10},c=>{
  const n=c.frame;
  if(n<8) drawWolf(c,null,n,null);
  else if(n<24) drawWolf(c,n-8,0,null);
  else if(n<30) drawWolf(c,null,0,n-24);
  else drawWolf(c,(n-30)%16,0,Math.floor((n-30)/16));
});
