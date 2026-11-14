// Visual clock only. Attacks, damage, telegraph lengths, and movement remain
// owned by bosses.js. These poses meet those existing release times exactly.
const clamp=x=>Math.max(0,Math.min(1,x));
const at=(seq,u)=>seq[Math.min(seq.length-1,Math.floor(clamp(u)*seq.length))];
const phase=(t,wind,release,recover)=>t<wind?clamp(t/wind)*.63:t<release?.63+clamp((t-wind)/(release-wind))*.13:.76+clamp((t-release)/recover)*.24;
export function bossFrame(e){
 const s=e.spr,p=s.poses,kit=e.def.kit||e.type;
 if(e.sleeping||e.dormant||e.spawnT>0)return p.rest[Math.floor(e.life*5)%p.rest.length];
 if(e.state==='aim'&&p.charge)return at(p.charge,1-e.stateT/(e.phase?.55:.8));
 if(e.state==='dash'&&p.dash)return p.dash[Math.floor((.7-e.stateT)*24)%p.dash.length];
 if(e.state==='recover'&&p.recover)return at(p.recover,1-e.stateT/(e.phase?.3:.6));
 const t=e.life-e.poseAt;
 if(e.pose==='slam'&&p.slam&&t<1.08)return at(p.slam,phase(t,.75,.85,.23));
 if(e.pose==='nova'&&p.nova&&t<1.25)return at(p.nova,phase(t,.88,1,.25));
 const duration=e.pose==='volley'?(kit==='lich'?.35:.32):e.pose==='summon'?(kit==='lich'?.8:.9):e.pose==='blink'?.5:0;
 if(duration&&p[e.pose]&&t<duration)return at(p[e.pose],t/duration);
 // Immediate cast kits get a short visual preparation in the last .18s of
 // their already-running cooldown; their release still occurs on the same tick.
 if(e.state==='move'&&kit==='lich'){
  if(e.cdT>=0&&e.cdT<.18)return at(p.volleyWind,1-e.cdT/.18);
  if(e.cdT>.18&&e.cd2>.18&&e.cd3>=0&&e.cd3<.18)return at(p.summonWind,1-e.cd3/.18);
 }
 if(e.state==='move'&&kit==='boneking'&&e.cd2>=0&&e.cd2<.18&&e.cdT>.18)return at(p.summonWind,1-e.cd2/.18);
 if(e.state==='move'&&kit==='boneking'&&e.phase&&e.cd3>=0&&e.cd3<.18&&e.cdT>.18&&e.cd2>.18)return at(p.volleyWind,1-e.cd3/.18);
 if(e.state==='cast')return p.rest[Math.floor(e.life*5)%p.rest.length];
 return p.travel[Math.floor(e.anim*s.motionRate)%p.travel.length];
}
