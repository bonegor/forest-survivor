// Select the ranger's bow pose around the weapon's existing cooldown and shot.
// Anticipation never delays arrows; release starts when the real shot occurs.
import { faceAlong } from './facing.js';

export function rangerPose(g, spr, step) {
  const p=g.player;
  if(p.id!=='archer'||spr.attackRelease===null||!spr.attackFps)return null;
  const bow=p.weapons.find(w=>w.def.kind==='bow');
  if(!bow)return null;
  const fps=spr.attackFps,release=spr.attackRelease;
  const since=p.bowShot?g.clock-p.bowShot.at:Infinity;
  let k,ang;
  if(since>=0&&since<(spr.attack.length-release)/fps) {
    // The arrow has flown.
    k=release+Math.floor(since*fps);ang=p.bowShot.ang;
  } else {
    const remaining=bow.cd/(p.buff('haste')?1.35:1);
    if(bow.queue||remaining<=0||remaining>release/fps)return null;
    k=Math.min(release-1,Math.floor(release-remaining*fps));
    // The foe the volley's first arrow will fly at (bow.fire), if any.
    const target=g.nearestEnemies(p.x,p.y,1,230)[0];
    ang=target?Math.atan2(target.y-p.y,target.x-p.x):p.aim;
  }
  // No shot turns him (facing.js): he keeps facing the way he last walked, and an arrow
  // loosed behind him, walking or standing, shows no forward shot.
  const face=p.face;
  if(faceAlong(face,Math.cos(ang),Math.sin(ang))!==face)return null;
  const index=p.moving&&spr.attackWalk?spr.attackWalk[k][step%spr.walk.length]:spr.attack[k];
  return {frame:spr.frames[index],flip:face<0};
}
