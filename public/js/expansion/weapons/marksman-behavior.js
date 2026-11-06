import { sfx } from '../../engine/audio.js';
import { recordHeroAttack } from '../../game/hero-animation.js';
import { spawnProjectile } from '../../game/projectiles.js';
import { PC } from '../../game/particles.js';

const REACH = 216;
const SPLINTER_DMG = 0.48;
const FAN_STEP = Math.PI / 9;

function splitPin(pin, foe) {
  const { g, w } = pin;
  if (g.world.solid(pin.x, pin.y)) return;

  const fragments = [];
  const spreadHit = (_, victim) => {
    // The same burst can only hurt a foe once. A recycled projectile belongs to
    // the burst only until the pool clears or replaces its callback.
    for (const fragment of fragments) {
      if (fragment.onHit === spreadHit) fragment.hits.add(victim.id);
    }
  };
  const pairs = Math.min(4, w.s.amount);
  for (let i = 0; i < pairs; i++) {
    const offset = Math.PI / 2 + (i - (pairs - 1) / 2) * FAN_STEP;
    for (const side of [-1, 1]) {
      const fragment = spawnProjectile(g, {
        kind: 'splitpinShard', sprite: 'silverbolt', scale: 0.65, trail: PC.G,
        x: pin.x, y: pin.y, z: pin.z, ang: pin.ang + side * offset,
        speed: 235 * w.s.speed, life: 0.28 * w.s.area * w.s.dur, r: 1.3,
        dmg: pin.dmg * SPLINTER_DMG, pierce: w.s.pierce, kb: pin.kb * 0.5,
        w, onHit: spreadHit,
      });
      fragment.hits.add(foe.id);
      fragments.push(fragment);
    }
  }
}

function previewTarget(w) {
  const { g } = w;
  return g.nearestEnemy(g.player.x, g.player.y, REACH);
}

export default {
  reach: REACH,
  previewTarget,
  fire(w) {
    const { g, s } = w, p = g.player;
    const target = w.hand ? w.handTarget : previewTarget(w);
    if (!target && !w.hand) return false;
    const ang = target && !target.dead ? Math.atan2(target.y - p.y, target.x - p.x) : (p.strikeAng ?? p.aim);
    recordHeroAttack(w, ang);
    spawnProjectile(g, {
      kind: 'splitpin', sprite: 'silverbolt', trail: PC.y,
      x: p.x, y: p.y, z: 11, ang, speed: 285 * s.speed, life: Math.max(0.8, 0.8 * s.dur), r: 2,
      dmg: s.dmg, pierce: 0, kb: s.kb, w, onHit: splitPin,
    });
    sfx('arrow', { pitch: 0.83, pan: Math.cos(ang) * 0.3 });
  },
};
