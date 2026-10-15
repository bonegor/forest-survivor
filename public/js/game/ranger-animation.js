// Select the ranger's bow pose around the weapon's existing cooldown and shot.
// Anticipation never delays arrows; release starts when the real shot occurs.
import { faceAttack, faceAlong } from './facing.js';

export function rangerPose(g, spr, step) {
  const p=g.player;
  if(p.id!=='archer'||spr.attackRelease===null||!spr.attackFps)return null;
  const bow=p.weapons.find(w=>w.def.kind==='bow');
  if(!bow)return null;
  const fps=spr.attackFps,release=spr.attackRelease;
  const since=p.bowShot?g.clock-p.bowShot.at:Infinity;
  let k,face=p.face,ang;
  if(since>=0&&since<(spr.attack.length-release)/fps) {
    k=release+Math.floor(since*fps);ang=p.bowShot.ang;
  } else {
    const remaining=bow.cd/(p.buff('haste')?1.35:1);
    if(bow.queue||remaining<=0||remaining>release/fps)return null;
    k=Math.min(release-1,Math.floor(release-remaining*fps));
    const target=g.nearestEnemy(p.x,p.y,230);
    ang=target?Math.atan2(target.y-p.y,target.x-p.x):p.aim;
  }
  // Rear auto-targets still receive their arrows; walking keeps its facing.
  // Don't show a forward bow shot when that arrow is being fired behind us.
  if(p.moving&&faceAlong(p.face,Math.cos(ang),Math.sin(ang))!==p.face)return null;
  face=faceAttack(face,p.moving,Math.cos(ang),Math.sin(ang));
  const index=p.moving&&spr.attackWalk?spr.attackWalk[k][step%spr.walk.length]:spr.attack[k];
  return {frame:spr.frames[index],flip:face<0};
}
