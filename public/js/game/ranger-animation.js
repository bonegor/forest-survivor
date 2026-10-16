// Select the ranger's bow pose around the weapon's existing cooldown and shot.
// Anticipation never delays arrows; release starts when the real shot occurs.
import { faceAlong } from './facing.js';
import { HASTE } from './weapons.js';

export function rangerPose(g, spr, step) {
  const p = g.player;
  if (p.id !== 'archer' || spr.attackRelease == null || !spr.attackFps) return null;
  const bow = p.weapons.find((w) => w.def.kind === 'bow');
  if (!bow) return null;
  const fps = spr.attackFps, release = spr.attackRelease;
  const since = p.bowShot ? g.clock - p.bowShot.at : Infinity;
  let k, ang;
  if (since >= 0 && since < (spr.attack.length - release) / fps) {
    // The arrow has flown.
    k = release + Math.floor(since * fps);
    ang = p.bowShot.ang;
  } else {
    const remaining = bow.cd / (p.buff('haste') ? HASTE : 1);
    if (bow.queue || remaining <= 0 || remaining > release / fps) return null;
    k = Math.min(release - 1, Math.floor(release - remaining * fps));
    // The volley flies straight the way she faces (bow.fire).
    ang = p.aim;
  }
  // No shot turns her (facing.js): she keeps facing the way she last walked, and an arrow
  // loosed behind her, walking or standing, shows no forward shot.
  const face = p.face;
  if (faceAlong(face, Math.cos(ang), Math.sin(ang)) !== face) return null;
  const index = p.moving && spr.attackWalk ? spr.attackWalk[k][step % spr.walk.length] : spr.attack[k];
  return { frame: spr.frames[index], flip: face < 0 };
}
