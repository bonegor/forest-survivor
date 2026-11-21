// Tunic cut in one pixel on either side of the belt and skirt. The head,
// plait, wolf mantle, hip socket positions and boots use Ylva's original art.
const SLIM_COAT = [
  '..aBffkk.',
  '.aDdcCyB.',
  'aDdDCCyA.',
  '.CDDCByDA',
  '.CcCByDDB',
  '.BCByDCB.',
  'LMNnOYyL.',
  '.BCDycCB.',
  'ABCDCMcBA',
  'ABCBAkCBA',
  '.BBA.ABB.',
];

// Axe angles are measured from vertical. The several wooden pixels between
// socket and grip face the same direction as the small tail below each fist.
// Each key is [elbow x, elbow y, grip x, grip y, axe angle] in body space.
const GUARDS = [
  {
    id:'low', lean:0,
    far:[18,26,16,29,-.22], front:[27,26,29,29,.39],
    strikes:[
      [[19,26,17,28,-.20],[27,26,29,27,.20],0],
      [[19,26,17,27,-.12],[28,25,31,24,-.24],-1],
      [[18,25,16,26,-.16],[28,24,32,21,-.30],0],
      [[18,25,16,26,-.30],[30,24,33,25,1.12],1],
      [[19,25,17,27,-.23],[29,26,32,29,1.52],1],
    ],
  },
  {
    id:'high', lean:0,
    far:[17,25,15,22,-.35], front:[28,25,30,21,.26],
    strikes:[
      [[17,25,16,22,-.27],[28,24,30,20,.15],0],
      [[17,24,16,21,-.12],[27,23,29,19,-.20],-1],
      [[18,24,16,21,-.07],[27,22,29,18,-.39],-1],
      [[18,24,16,22,-.22],[29,23,33,23,.90],1],
      [[17,25,16,23,-.32],[29,26,31,27,1.63],1],
    ],
  },
  {
    id:'split', lean:1,
    far:[17,24,14,21,-.22], front:[26,26,30,27,.42],
    strikes:[
      [[17,24,14,20,-.26],[26,26,29,26,.45],1],
      [[17,23,14,18,-.37],[26,25,29,25,.22],0],
      [[17,23,15,18,-.46],[26,24,29,22,-.12],0],
      [[18,24,15,22,-.12],[29,24,33,23,1.02],1],
      [[18,26,16,25,-.18],[28,26,32,27,1.34],1],
    ],
  },
];

function guardFist(F,hand,far,angle) {
  // The curled fingertips have their own dark line across the palm. A single
  // knuckle catches the upper light; an unbroken dark strip rings the wrist.
  // The pale oak on the lit side of the shaft and its bronze collar keep
  // the grip distinct from both the leather bracer and the grey wolf pelt.
  const shaft=(distance,side)=>[
    hand[0]+Math.round(Math.sin(angle)*distance+Math.cos(angle)*side),
    hand[1]+Math.round(-Math.cos(angle)*distance+Math.sin(angle)*side),
  ].join(',');
  for (const distance of [3,4]) {
    for (const side of [0,far?-1:1]) {
      const key=shaft(distance,side);
      if ('mONM'.includes(F.get(key)??'~')) { F.set(key,distance===3?'T':'o'); break; }
    }
  }
  const knuckles=far?['.PK','rFF','Kfk']:['.pK','PFF','Kfk'];
  tile(F,hand[0]-1,hand[1]-1,knuckles);
}

function carryAxe(F,pose,U,far,handed=far?-1:1) {
  const [, ,hx,hy,angle]=pose,hand=U([hx,hy]);
  wolfAxe(F,hand,handed,angle);
  guardFist(F,hand,far,angle);
}

function movingArm(arm,swing,far,id) {
  const [ex,ey,hx,hy,angle]=arm;
  // Hands counter the travelling hips. The high, bent guard absorbs much
  // of that movement at its elbows; the low guard swings a little farther.
  const s=far?-swing:swing;
  const elbow= Math.round(s*(id==='high'?.52:.72));
  const dx=Math.round(s*(id==='low'?1.15:.73));
  // Forward guard keeps the high and low blades in separate lanes: one
  // elbow gathers inward as the other pushes out on the loaded foot.
  const reach=id==='forward'?(far?Math.min(0,dx):Math.max(0,dx)):dx;
  return [ex+elbow,ey,hx+reach,hy,angle+s*.055];
}

function drawGrip(c,g,walk,idle,cut) {
  const phase=(walk==null?idle/8:walk/16)*TAU;
  const by=walk==null?[0,0,0,1,1,1,0,0][idle]:approvedSteps[walk].bob;
  // The recovery frame is the exact carry for that pose and stride, including
  // secondary motion. A repeated strike can therefore start from either foot.
  const strike=cut==null || cut===5?null:g.strikes[cut];
  const lean=strike?strike[2]:g.lean+(walk==null?0:1);
  const F=new Map(), U=([x,y])=>[x+lean,y+by];
  const legs=walk==null?{far:legAt(22,-3,0,by),near:legAt(25,2,0,by)}:
    Object.fromEntries(approvedSteps[walk].legs.map(({name,hip,knee,ankle})=>[
      name,[[hip[0]-16,hip[1]-16],[knee[0]-16,knee[1]-16],[ankle[0]-16,ankle[1]-17]],
    ]));
  const swing=walk==null?.32*Math.sin(phase):Math.cos(phase);
  const far=strike?strike[0]:movingArm(g.far,swing,true,g.id);
  const front=strike?strike[1]:movingArm(g.front,swing,false,g.id);

  leg(F,...legs.far,true);
  leg(F,...legs.near,false);
  tile(F,19+lean,21+by,SLIM_COAT);
  wolfArm(F,U(g.farShoulder??[21,23]),U(far),U(far.slice(2)),true);
  tile(F,15+lean,19+by,FUR);
  wolfBraid(F,lean,by,phase);
  carryAxe(F,far,U,true,g.farHanded);
  wolfArm(F,U(g.frontShoulder??[25,22]),U(front),U(front.slice(2)),false);
  tile(F,24+lean,21+by,['BB','.D']);
  carryAxe(F,front,U,false);
  wolfHead(F,lean,by);
  flush(c,F);
}

for (const guard of GUARDS) {
  anim('ylva-'+guard.id,{w:48,h:48,frames:126,fps:10},c=>{
    const n=c.frame;
    if(n<8) drawGrip(c,guard,null,n,null);
    else if(n<24) drawGrip(c,guard,n-8,0,null);
    else if(n<30) drawGrip(c,guard,null,0,n-24);
    else drawGrip(c,guard,(n-30)%16,0,Math.floor((n-30)/16));
  });
}
