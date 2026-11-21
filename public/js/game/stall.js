// The night's merchant (G6 of the 21 November 2026 gameplay review; the owner's "one by one, work
// them"): gold found in a night could only be banked for the Armory. Now a merchant's stall sets up
// ahead of the hero at STALL.first s and every STALL.every s after, in Survival and Ranked (never in
// a crypt, never on a Dungeon Run floor), and stays STALL.stay s. Walked up to, it sells one of its
// wares for the night's own gold (Game.stallCards): what is spent there is not banked, so the
// choice is to grow now or later. Its prices grow with the night (price). By the clock alone, no
// dice: a seeded night's rolls fall as ever.
export const STALL = { first: 150, every: 180, stay: 45, ahead: 150 };
export const WARES = {
  heal: { name: 'Healing Draught', icon: 'potion', base: 40, desc: 'Heal {50%} of your health.' },
  whet: { name: 'Whetstone', base: 90 },
  polish: { name: 'Relic Polish', base: 70 },
  reroll: { name: 'Fortune Cards', icon: 'i_reroll', base: 50, desc: '{+1} reroll for the rest of the night.' },
};
// What a ware costs at a phase of the night: its base at dusk, three times it by dawn.
export const price = (id, phase) => Math.round(WARES[id].base * (1 + phase / 10));
