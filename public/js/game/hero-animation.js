// Attack receipts never change combat timing or facing. Only manual crypt strikes
// may select an attack sprite; automatic field attacks keep the idle/walk cycle.
import { faceAlong } from './facing.js';

export function recordHeroAttack(w, ang = w.g.player.aim) {
  if (w.g.mainWeapon?.() !== w || w.g.caveStrike) return;
  w.g.player.heroAttack = { at: w.g.clock, ang, weapon: w };
}

export function heroAttackPose(g, spr, step) {
  const p = g.player;
  const preview = !!g.inCrypt?.preview;
  if (!g.inCrypt || p.strikeAt === null || !preview && g.clock < p.strikeAt) return null;
  const clip = strikeClip(spr);
  if (!clip) return null;
  // Imported sheets without a moving attack retain their gait; the real world-space
  // weapon effect still shows the blow. A planted pose must not make a walker skate.
  if (p.moving && !spr.attackWalk && !spr.floating) return null;
  const k = Math.max(preview ? 0 : clip.from, clip.hit + Math.floor((g.clock - p.strikeAt - clip.delay) * spr.attackFps + 1e-6));
  if (k < 0 || k >= spr.attack.length) return null;
  const face = faceAlong(p.face, Math.cos(p.strikeAng), Math.sin(p.strikeAng));
  if (face !== p.face) return null;
  const index = p.moving && spr.attackWalk ? spr.attackWalk[k][step % spr.walk.length] : spr.attack[k];
  return { frame: spr.frames[index], flip: p.face < 0 };
}

// Start just before the hit/release frame, leaving the weapon's actual delay intact.
export function strikeClip(spr) {
  if (!spr.attack?.length || !spr.attackFps) return null;
  const hit = spr.attackRelease ?? Math.floor(spr.attack.length / 2);
  const delay = spr.manualDelay ?? Math.min(2, hit) / spr.attackFps;
  const from = Math.max(0, hit - Math.ceil(delay * spr.attackFps - 1e-6));
  return { from, hit, delay };
}
