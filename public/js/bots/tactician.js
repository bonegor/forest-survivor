// A reproducible player-like benchmark: only the public BotView is read.
// It walks around terrain, considers individual enemies/projectiles, and turns
// directional attacks toward a target just as their visible cooldown expires.
const TAU = Math.PI * 2;
const headings = Array.from({ length: 24 }, (_, i) => [Math.cos(i / 24 * TAU), Math.sin(i / 24 * TAU)]);
const melee = new Set(['knight', 'footman', 'templar', 'praetorian', 'swordbearer', 'seraph', 'berserker', 'wraith', 'eanasir']);
const directional = new Set(['archer', 'knight', 'footman', 'templar', 'wraith', 'praetorian', 'swordbearer', 'seraph', 'berserker']);

export const TACTICIAN = {
  about: 'Collects experience and chests, plans safe steps around terrain and visible hazards, and faces directional attacks at release',
  make(o) {
    let last = [1, 0], next = 0;
    return v => {
      const p = v.me;
      if (v.t < next) return { x: last[0], y: last[1], ult: !!o.ult && p.ultReady };
      next = v.t + .1;
      // Only nearby bodies can meet the next half-second of walking. Bounding
      // this query keeps a full-night benchmark practical at the horde cap.
      const enemies = v.enemies(80).slice(0, 48), shots = v.shots(80), hazards = v.hazards(130);
      const near = enemies[0] || v.nearest?.(200), isMelee = melee.has(v.hero), desired = isMelee ? 29 : 52;
      let goal = null, bestCost = Infinity;
      for (const item of v.pickups(540, false)) {
        if (item.pulled) continue;
        const weight = item.kind === 'chest' ? 9 : item.kind === 'potion' || item.kind === 'elixir' ? (p.hpFrac < .75 ? 12 : .15)
          : item.kind === 'gem' ? 1 + Math.log2(1 + item.value) : item.kind === 'coin' || item.kind === 'goldpile' ? .2 : 3;
        const cost = item.d / weight;
        if (cost < bestCost) { goal = item; bestCost = cost; }
      }
      const main = p.weapons[0], aiming = directional.has(v.hero) && main && main.cd <= .14;
      let target = near;
      if (v.boss && v.boss.d < 130 && p.hpFrac > .5) target = v.boss;
      let best = -Infinity, choice = last;
      for (const [hx, hy] of headings) {
        let score = (hx * last[0] + hy * last[1]) * .18;
        for (const seconds of [.12, .3, .6]) {
          const travel = p.speed * seconds, x = p.x + hx * travel, y = p.y + hy * travel;
          if (v.world.solid(x, y) || v.world.solid(x + p.r, y) || v.world.solid(x - p.r, y) || v.world.solid(x, y + p.r) || v.world.solid(x, y - p.r)) score -= 80 * (1 - seconds);
          for (const e of enemies) {
            if (e.rising) continue;
            const chase = Math.min(e.d, (e.speed || 0) * seconds * .7), d = e.d || 1;
            const ex = e.dx - e.dx / d * chase, ey = e.dy - e.dy / d * chase;
            const gap = Math.hypot(ex - hx * travel, ey - hy * travel) - e.r - p.r;
            const safe = e.boss ? 14 : 8;
            if (gap < safe) score -= (safe - gap) / safe * (gap < 0 ? 14 : 3) * (e.boss ? 1.5 : 1);
          }
          for (const s of shots) {
            const gap = Math.hypot(s.dx + s.vx * seconds - hx * travel, s.dy + s.vy * seconds - hy * travel) - s.r - p.r;
            if (gap < 10) score -= (10 - gap) * .7;
          }
          for (const h of hazards) {
            if (h.left > seconds + .3) continue;
            let gap;
            if (h.shape === 'circle') gap = Math.hypot(x - h.x, y - h.y) - h.r - p.r;
            else {
              const dx = x - h.x, dy = y - h.y, c = Math.cos(h.ang), s = Math.sin(h.ang);
              const along = Math.max(0, Math.min(h.len, dx * c + dy * s));
              gap = Math.hypot(dx - along * c, dy - along * s) - h.w / 2 - p.r;
            }
            if (gap < 8) score -= (8 - gap) * 1.5;
          }
        }
        if (goal) score += (hx * goal.dx + hy * goal.dy) / (goal.d || 1) * 2.2;
        if (target) {
          const d = target.d || 1, toward = (hx * target.dx + hy * target.dy) / d;
          if (!goal) score += toward * (d > desired + 18 ? 1.6 : d < desired ? -1.4 : .1);
          if (aiming && d < (isMelee ? 65 : 200)) score += (v.hero === 'archer' ? toward : Math.sign(hx) * Math.sign(target.dx)) * 1.2;
        }
        if (score > best) { best = score; choice = [hx, hy]; }
      }
      last = choice;
      return { x: last[0], y: last[1], ult: !!o.ult && p.ultReady };
    };
  },
};
