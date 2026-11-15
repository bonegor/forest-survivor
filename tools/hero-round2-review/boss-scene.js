// Actual Game + Enemy + boss AI. Only encounter placement/cooldowns are forced
// at segment boundaries, never the attack states, release callbacks, or clocks.
export const BOSS_IDS=['boneking','butcher','lich','demonlord','pharaoh','frostgiant','thornqueen','pitlord'];
export function makeBossScene({Game,defaultProfile,metaBonuses,input},id='butcher',options={}){
 const profile=defaultProfile(),g=new Game({hero:'knight',mode:'s15',map:options.map||'forest',diff:'easy',meta:metaBonuses(profile),settings:{numbers:false,weather:false,softFlash:true},crypts:false});
 g.spawner.update=()=>{};g.enemies=[];g.player.weapons=[];g.player.devGod=true;g.player.addXp=()=>{};g.banners=[];g.world.solid=()=>false;g.world.lineOfSight=()=>true;input.bot={x:0,y:0};
 const p=g.player,origin=[p.x,p.y],e=g.spawnEnemy(id,p.x-65,p.y,{instant:true,always:true,hpMul:10000,xpMul:0});e.dormant=e.sleeping=false;e.aware=true;e.spawnT=0;e.face=1;
 const kit=e.def.kit||e.type;let t=0,last=-1,action='tour',face=1,tourFacing=1;
 const sequence=kit==='butcher'?['idle','travel','charge','slam','enraged charge']:kit==='lich'?['idle','travel','volley','summon','blink']:kit==='demonlord'?['idle','travel','volley','meteor','nova','summon','enraged volley']:['idle','travel','nova','summon','volley'];
 function setup(name,f){
  face=f;e.face=f;p.x=origin[0];p.y=origin[1];e.x=p.x-f*65;e.y=p.y;e.kx=e.ky=0;e.state='move';e.stateT=0;e.pose=null;e.poseAt=-100;e.shake=0;e.cdT=e.cd2=e.cd3=100;e.hp=e.maxHp;e.phase=0;e.lordEnraged=false;e.data={};e.sleeping=name==='idle';e.dormant=false;e.aware=true;e.speech=null;
  g.enemies=g.enemies.filter(a=>a===e);g.effects=[];g.eshots=[];g.banners=[];
  if(name==='travel')e.x=p.x-f*135;
  if(name==='charge'||name==='enraged charge'){e.x=p.x-f*120;e.cdT=.18;if(name.startsWith('enraged'))e.hp=e.maxHp*.2;}
  if(name==='slam'){e.x=p.x-f*45;e.cd2=.18;}
  if(kit==='demonlord')e.data.cd4=100;
  if(name==='nova'){e.x=p.x-f*70;if(kit==='demonlord')e.data.cd4=.18;else e.cdT=.18;}
  if(name==='summon'){if(kit==='lich'||kit==='demonlord')e.cd3=.18;else e.cd2=.18;}
  if(name==='volley'||name==='enraged volley'){if(kit==='lich'||kit==='demonlord')e.cdT=.18;else{e.hp=e.maxHp*.4;e.cd3=.18;}if(name.startsWith('enraged'))e.hp=e.maxHp*.2;}
  if(name==='meteor')e.cd2=.18;
  if(name==='blink')e.cd2=.18;
 }
 setup('idle',1);
 return{g,e,profile,sequence,get time(){return t;},get label(){return action==='tour'?sequence[Math.floor(t/3)%sequence.length]:action;},get face(){return face;},setAction(a){action=a;t=0;last=-1;},setFace(f){face=tourFacing=f;t=0;last=-1;},
  tick(dt){const seg=action==='tour'?Math.floor(t/3):0;if(seg!==last){setup(action==='tour'?sequence[seg%sequence.length]:action,action==='tour'?(Math.floor(seg/sequence.length)%2?-tourFacing:tourFacing):face);last=seg;}g.update(dt);g.syncCam();g.snapCam();t+=dt;},
  draw(ctx){g.draw(ctx);},
  record(){return{t,segment:action==='tour'?sequence[Math.floor(t/3)%sequence.length]:action,face:e.face,state:e.state,pose:e.pose,frame:e.frameIndex(),life:e.life,stateT:e.stateT,poseAt:e.poseAt,shots:g.eshots.length,effects:g.effects.map(f=>f.constructor.name),scale:e.scale,drawScale:e.drawScale,hr:e.hr,h:e.h,body:e.body(),rect:e._rect?.slice(0,4)};}
 };
}
