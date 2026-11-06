// Cosmetic attack state. Record the real release, never reschedule a weapon or turn its owner.
import { faceAlong } from './facing.js';

export function recordHeroAttack(w, ang = w.g.player.aim) {
  if (w.g.mainWeapon?.() !== w || w.g.caveStrike) return;
  w.g.player.heroAttack = { at: w.g.clock, ang, weapon: w };
}

export function heroAttackPose(g, spr, step) {
  const p = g.player, w = g.mainWeapon();
  if (!w || !spr.attack?.length || !spr.attackFps) return null;
  // Imported sheets without a moving attack retain their gait; the real world-space
  // weapon effect still shows the blow. A planted pose must not make a walker skate.
  if (p.moving && !spr.attackWalk && !spr.floating) return null;
  const release = spr.attackRelease ?? Math.floor(spr.attack.length / 2);
  const shot = p.heroAttack;
  const since = shot?.weapon === w ? g.clock - shot.at : Infinity;
  let k, ang;
  if (since >= 0 && since < (spr.attack.length - release) / spr.attackFps) {
    k = release + Math.floor(since * spr.attackFps + 1e-6);
    ang = shot.ang;
  } else if (p.leap && w.def.kind === 'leap') {
    // The axes are raised in flight; their release is recorded by the actual landing.
    k = Math.min(release - 1, Math.floor(p.leap.t / p.leap.dur * release));
    ang = p.aim;
  } else {
    const remaining = w.cd / w.haste;
    if (w.queue || remaining <= 0 || remaining > release / spr.attackFps) return null;
    const kind = w.def.kind;
    if (kind === 'summon' && g.minions.filter(m => m.w === w).length >= w.s.amount * 3) return null;
    const targeted = ['fireball', 'smite', 'roots', 'crossbow', 'leap', 'daggers'].includes(kind);
    const target = w.previewTarget?.() ?? (targeted ? g.nearestEnemy(p.x, p.y, w.reach) : null);
    if (['smite', 'roots', 'crossbow', 'leap'].includes(kind) && !target) return null;
    ang = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.aim;
    k = Math.min(release - 1, Math.floor(release - remaining * spr.attackFps));
  }
  if (k < 0 || k >= spr.attack.length) return null;
  const face = faceAlong(p.face, Math.cos(ang), Math.sin(ang));
  if (face !== p.face) return null;
  const index = p.moving && spr.attackWalk ? spr.attackWalk[k][step % spr.walk.length] : spr.attack[k];
  return { frame: spr.frames[index], flip: p.face < 0 };
}
