// Every hero shares one animation rule: only a manual crypt strike can replace
// idle/walk with attack poses. Automatic field weapons keep their combat effects.
import { faceAlong } from './facing.js';
import { moveFor } from '../data/difficulty.js';
import { HEROES } from '../data/heroes.js';
import { clamp } from '../engine/util.js';

// Player advances by seven steps per base-speed second and drawPlayer samples
// the walk at 1.4 poses per step. Match the sheet's fps at Normal travel speed.
export function normalWalkRate(id, fps) {
  const speed = clamp(moveFor('s15', 'easy') * (HEROES[id]?.stats.speed || 1), 0.6, 1.6);
  return fps / (7 * 1.4 * speed);
}

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
  if (p.strikeAt == null || g.clock < p.strikeAt) return null;
  const k = (preview ? 0 : clip.from) + Math.floor((g.clock - p.strikeAt) * spr.attackFps + 1e-6);
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

// Start at the release or the first pose of the strike itself.
export function strikeClip(spr) {
  if (!spr.attack?.length || !spr.attackFps) return null;
  const hit = spr.attackRelease ?? Math.floor(spr.attack.length / 2);
  const from = spr.attackStart ?? hit;
  const delay = (hit - from) / spr.attackFps;
  return { from, hit, delay };
}
