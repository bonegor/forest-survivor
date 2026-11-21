// Boons (G7 of the 21 November 2026 gameplay review; the owner's "one by one, work them"): relics
// that bend a rule rather than add a number, each with its price. Never on a level-up or in a
// chest: a boss's trophy offers three the hero hasn't (Game.trophyCards, ui/trophy.js) and he may
// take one or none. A boon takes no relic slot and has no ranks; it lasts the run. What each does
// is told where it is done: its stats here (boonStats, read by Player.derived), the rest by its
// flag (Player.hurt, Game.hitEnemy, the pickups, Game.evolvable, the shrines, Game.killEnemy).
export const BOONS = {
  glassheart: { name: 'Glass Heart', icon: 'i_glassheart', desc: 'Damage {+40%}, max health {-30%}.' },
  hollowcrown: { name: 'Hollow Crown', icon: 'i_hollowcrown', desc: 'Every weapon fires {+1} projectile, but none can evolve.' },
  wolfsoath: { name: "Wolf's Oath", icon: 'i_wolfsoath', desc: 'Move speed {+25%}, but armor counts {half}.' },
  bloodpact: { name: 'Blood Pact', icon: 'i_bloodpact', desc: 'Every kill heals {0.2%}, but potions and elixirs heal {nothing}.' },
  moonedge: { name: 'Moonlit Edge', icon: 'i_moonedge', desc: 'Crits strike {x3}, but come {half} as often.' },
  misersring: { name: "Miser's Ring", icon: 'i_misersring', desc: 'Gold fills the fury orb ({1%} a coin), but fury orbs give {nothing}.' },
  truthlantern: { name: 'Lantern of Truth', icon: 'i_truthlantern', desc: 'Shrines bless {twice} as long, but potions heal {half}.' },
  embercrown: { name: 'Ember Crown', icon: 'i_embercrown', desc: 'Hits {+20%} to set foes burning, but you take {10%} more damage.' },
  frostbound: { name: 'Frost-Bound Sigil', icon: 'i_frostbound', desc: 'Hits {10%} to freeze a foe, but you move {10%} slower.' },
};
export const BOON_IDS = Object.keys(BOONS);
// What the fury orb takes from Miser's Ring: a coin, and a pile of gold.
export const MISER_FURY = { coin: 1, pile: 5 };

// The boons' numbers on the hero's (Player.derived's d, changed in place and handed back): a set of
// boon ids (boons).
export function boonStats(d, boons) {
  if (!boons || !boons.size) return d;
  if (boons.has('glassheart')) {
    d.might *= 1.4;
    d.maxHp = Math.max(1, Math.round(d.maxHp * 0.7));
  }
  if (boons.has('hollowcrown')) {
    d.amount += 1;
    d.noEvolve = true;
  }
  if (boons.has('wolfsoath')) {
    d.speedMul *= 1.25;
    d.armor *= 0.5;
  }
  if (boons.has('bloodpact')) {
    d.potionMul = 0;
    d.boonLeech = 0.002;
  }
  if (boons.has('moonedge')) {
    d.crit *= 0.5;
    d.critMult *= 1.5;
  }
  if (boons.has('misersring')) d.goldFury = true;
  if (boons.has('truthlantern')) {
    d.shrineMul = 2;
    d.potionMul *= 0.5;
  }
  if (boons.has('embercrown')) {
    d.ember += 0.2;
    d.hurtMul *= 1.1;
  }
  if (boons.has('frostbound')) {
    d.frostHit = 0.1;
    d.speedMul *= 0.9;
  }
  return d;
}

// A trophy's three (or fewer): boons the hero hasn't, drawn with rnd (Math.random by default).
export function trophyChoices(held, rnd = Math.random) {
  const pool = BOON_IDS.filter((id) => !held.has(id)), out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
