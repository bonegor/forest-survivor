// Every hero shares one animation rule: only a manual crypt strike can replace
// idle/walk with attack poses. Automatic field weapons keep their combat effects.
import { faceAlong } from './facing.js';

export function recordHeroAttack(w, ang = w.g.player.aim) {
  if (w.g.mainWeapon?.() !== w || w.g.caveStrike) return;
  const g = w.g, p = g.player;
  // Keep successful release receipts for combat diagnostics, never pose selection.
  if (!g.nearestEnemy(p.x, p.y, w.reach)) return;
  p.heroAttack = { at: g.clock, ang, weapon: w };
}

export function heroAttackPose(g, spr, step) {
  if (!g.inCrypt) return null;
  const p = g.player;
  const clip = strikeClip(spr);
  if (!clip) return null;
  const preview = !!g.inCrypt.preview;
  if (p.strikeAt == null || !preview && g.clock < p.strikeAt) return null;
  const k = Math.max(preview ? 0 : clip.from, clip.hit + Math.floor((g.clock - p.strikeAt - clip.delay) * spr.attackFps + 1e-6));
  const ang = p.strikeAng;
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
