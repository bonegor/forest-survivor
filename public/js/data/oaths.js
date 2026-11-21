// Oaths (G4 of the 21 November 2026 gameplay review; the owner's "one by one, work them"): vows a
// Survival night is sworn under, chosen on the trial screen beside the difficulty. Each makes the
// night harder its own way and weighs `heat`; the night's heat raises the gold it pays (oathGold)
// and a night won is kept as each hero's best heat won (shared/profile.js `oh`), a ladder to climb
// once the Armory is bought out. None on Ranked, whose times are compared as they are, or on the
// Dungeon Run. What each does is told where it is done (Game, Player, the spawner, the bosses).
export const OATHS = [
  { id: 'iron', name: 'Oath of Iron', heat: 2, desc: 'No armor from anything: the Armory, gear, relics or the hero.' },
  { id: 'glass', name: 'Oath of Glass', heat: 2, desc: 'Half your health.' },
  { id: 'hands', name: 'Oath of Few Hands', heat: 1, desc: 'One weapon slot fewer (never fewer than you start with).' },
  { id: 'horde', name: 'Oath of the Horde', heat: 1, desc: 'A quarter more monsters.' },
  { id: 'hunted', name: 'Oath of the Hunted', heat: 1, desc: 'Champions come twice as often.' },
  { id: 'restless', name: 'Oath of the Restless', heat: 1, desc: 'The dead that rise from the ground rise once more, for nothing.' },
  { id: 'kings', name: 'Oath of Kings', heat: 2, desc: 'Bosses fight their fiercest from the first blow.' },
  { id: 'famine', name: 'Oath of Famine', heat: 1, desc: 'No potions or elixirs in what you break.' },
  { id: 'silence', name: 'Oath of Silence', heat: 2, desc: 'No ultimate and no fury.' },
  { id: 'dark', name: 'Oath of the Dark', heat: 1, desc: 'The light 30% dimmer, outside the crypts.' },
];
export const OATH_IDS = OATHS.map((o) => o.id);
export const OATH_OF = Object.fromEntries(OATHS.map((o) => [o.id, o]));
export const MAX_HEAT = OATHS.reduce((n, o) => n + o.heat, 0);
// The modes a night may be sworn in.
export const OATH_MODES = ['s15'];

// The oaths a list names, known ones only, once each, in OATHS' order; none outside OATH_MODES.
export function validOaths(list, mode = 's15') {
  if (!OATH_MODES.includes(mode) || !Array.isArray(list)) return [];
  return OATH_IDS.filter((id) => list.includes(id));
}
export const heatOf = (ids) => ids.reduce((n, id) => n + (OATH_OF[id]?.heat || 0), 0);
// What a night's gold is multiplied by: a tenth more a point of heat (x2.4 at the most, 14).
export const oathGold = (heat) => 1 + 0.1 * heat;
// A night's oaths as flags the game reads (Game.oath): oath.iron and so on, its heat and its list.
export function oathFlags(list, mode) {
  const ids = validOaths(list, mode);
  const out = { ids, heat: heatOf(ids) };
  for (const id of OATH_IDS) out[id] = ids.includes(id);
  return out;
}
