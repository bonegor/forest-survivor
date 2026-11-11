// Attack receipts select the signature's release/recovery poses without changing
// combat timing or facing. Manual crypt strikes also show their existing wind-up.
import { faceAlong } from './facing.js';

export function recordHeroAttack(w, ang = w.g.player.aim) {
  if (w.g.mainWeapon?.() !== w || w.g.caveStrike) return;
  const g = w.g, p = g.player;
  // Some weapons fire on cooldown even in an empty clearing. Keep those gameplay
  // effects, but reserve the combat gesture for a nearby foe so rest stays idle.
  if (!g.nearestEnemy(p.x, p.y, w.reach)) return;
  p.heroAttack = { at: g.clock, ang, weapon: w };
}

export function heroAttackPose(g, spr, step) {
  const p = g.player;
  const clip = strikeClip(spr);
  if (!clip) return null;
  let k, ang;
  if (g.inCrypt) {
    const preview = !!g.inCrypt.preview;
    if (p.strikeAt === null || !preview && g.clock < p.strikeAt) return null;
    k = Math.max(preview ? 0 : clip.from, clip.hit + Math.floor((g.clock - p.strikeAt - clip.delay) * spr.attackFps + 1e-6));
    ang = p.strikeAng;
  } else {
    const receipt = p.heroAttack;
    if (!receipt || receipt.weapon !== g.mainWeapon?.()) return null;
    const elapsed = g.clock - receipt.at;
    if (elapsed < 0) return null;
    // A successful release is the source of truth: waiting for a target cannot
    // animate a false cast, and the sprite never postpones a projectile or hit.
    k = clip.hit + Math.floor(elapsed * spr.attackFps + 1e-6);
    ang = receipt.ang;
  }
  // A moving attack keeps the current leg phase underneath its arms/equipment.
  // Older optional sheets without a moving clip retain their ordinary gait.
  if (p.walking && !spr.attackWalk && !spr.floating) return null;
  if (k < 0 || k >= spr.attack.length) return null;
  const face = faceAlong(p.face, Math.cos(ang), Math.sin(ang));
  if (face !== p.face) return null;
  const index = p.walking && spr.attackWalk ? spr.attackWalk[k][step % spr.walk.length] : spr.attack[k];
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
