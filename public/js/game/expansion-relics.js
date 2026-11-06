import { BULWARK_SEAL, PILGRIM_CORD } from '../data/passives.js';

// Use actual post-collision travel. The caller excludes sliding, leaps and forced moves.
export function pilgrimStep(p, dx, dy) {
  p.pilgrimDistance += Math.hypot(dx, dy);
  const steps = Math.floor(p.pilgrimDistance / PILGRIM_CORD.distance);
  if (steps === 0) return;
  p.pilgrimDistance -= steps * PILGRIM_CORD.distance;
  p.trickle(steps * p.maxHp * p.marchHeal);
}

// A small hit leaves the seal ready. Its rest uses the same paused clock as combat.
export function sealDamage(p, damage) {
  if (!p.wardReduction || damage < p.maxHp * BULWARK_SEAL.heavy || p.g.clock < p.sealReadyAt) return damage;
  const reduced = Math.max(1, Math.round(damage * (1 - p.wardReduction)));
  if (reduced >= damage) return damage;
  p.sealReadyAt = p.g.clock + BULWARK_SEAL.rest;
  p.g.numbers.text(p.x, p.y - 22, 'Guarded', 'holy');
  return reduced;
}
