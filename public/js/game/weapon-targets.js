// Object interaction is a weapon choice, never a change to monster/minion AI.
// Creature selectors call this only when they found no eligible living target.
// A nearby box receives the normal visible attack, with its normal cooldown.
export function nearbyWeaponProp(w, reach = 40, filter = null) {
  const { g } = w, p = g.player, radius = Math.min(40, reach);
  let found = null, distance = radius * radius;
  for (const e of g.grid.foes(p.x, p.y, radius)) {
    if (!e.prop || e.dead || e.spawnT > 0.3 || filter && !filter(e)) continue;
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d > distance || g.world.solid(e.x, e.y) || !g.world.lineOfSight(p.x, p.y, e.x, e.y)) continue;
    found = e; distance = d;
  }
  return found;
}
