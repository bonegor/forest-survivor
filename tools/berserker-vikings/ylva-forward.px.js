// Both arms project from the leading side of Ylva's three-quarter torso.
// The rear elbow folds across the front of the coat, lifting the short guard
// beside her cheek. The other wrist rides lower, a forearm's length ahead.
// Each blade turns outward to the right; mirroring reverses the entire pose.
const FORWARD_GUARD = {
  id:'forward', lean:0, farHanded:1,
  farShoulder:[22,22], frontShoulder:[25,24],
  far:[26,23,29,20,.30], front:[29,27,33,30,.44],
  strikes:[
    [[26,23,29,20,.22],[28,27,32,28,.48],0],
    [[26,22,29,19,.16],[28,26,32,27,.31],0],
    [[26,22,29,18,.18],[29,25,33,26,.16],0],
    [[26,23,29,20,.20],[30,25,34,26,1.02],0],
    [[26,23,29,21,.23],[29,27,33,29,1.44],0],
  ],
};

anim('ylva-forward',{w:48,h:48,frames:126,fps:10},c=>{
  const n=c.frame;
  if(n<8) drawGrip(c,FORWARD_GUARD,null,n,null);
  else if(n<24) drawGrip(c,FORWARD_GUARD,n-8,0,null);
  else if(n<30) drawGrip(c,FORWARD_GUARD,null,0,n-24);
  else drawGrip(c,FORWARD_GUARD,(n-30)%16,0,Math.floor((n-30)/16));
});
