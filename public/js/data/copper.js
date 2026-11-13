// Six cursed slots, with one Phoenix-forged fate apiece. They share a name and
// base behaviour, but stable ids let each slot level and evolve independently.
export const COPPER_IDS = Object.freeze(['pqc1', 'pqc2', 'pqc3', 'pqc4', 'pqc5', 'pqc6']);
export const COPPER_EVOLUTIONS = Object.freeze([
  'copper_furnace', 'copper_crown', 'copper_return',
  'copper_hail', 'copper_arc', 'copper_foundry',
]);
export const GOOD_COPPER_ID = 'goodcopper';
const IDS = new Set([GOOD_COPPER_ID, ...COPPER_IDS, ...COPPER_EVOLUTIONS]);
export const isCopper = (value) => typeof value === 'string' ? IDS.has(value)
  : !!value && (!!value.copper || !!value.def?.copper || IDS.has(value.id) || IDS.has(value.baseId));
// Keep the merchant's own stock out of curse/unlock accounting, including after
// it morphs into a form also available to a cursed disc.
export const isCursedCopper = value => isCopper(value) &&
  (typeof value === 'string' ? value !== GOOD_COPPER_ID : value.baseId !== GOOD_COPPER_ID && value.id !== GOOD_COPPER_ID);

const forms = [
  ['Furnace Halo', 'copper_area', 'A circle of Phoenix heat melts every foe nearby.', { dmg: 24, tick: 0.5, eternal: 1 }],
  ['Copper Crown', 'copper_orbit', 'Three burning copper discs circle you and cut through the horde.', { dmg: 30, tick: 0.35, eternal: 1 }],
  ['Honest Return', 'copper_return', 'Great copper discs cut outward and return for a second payment.', { dmg: 32, dur: 3 }],
  ['Copper Hail', 'copper_shoot', 'A rapid burst of piercing copper shots seeks the nearest foe.', { dmg: 23, cd: 0.48 }],
  ["Merchant's Arc", 'copper_chain', 'Conductive copper arcs from the nearest foe through four more.', { dmg: 38, chains: 4 }],
  ['Foundry Burst', 'copper_burst', 'Molten copper discs burst on impact, burning a wide circle.', { dmg: 28, blast: 1 }],
];

export const COPPER_WEAPONS = {};
for (let i = 0; i < COPPER_IDS.length; i++) {
  const [name, kind, desc, extra] = forms[i];
  COPPER_WEAPONS[COPPER_IDS[i]] = {
    name: 'Poor Quality Copper', icon: 'i_copper', kind: 'copper', copper: true, special: true, copperSlot: i + 1,
    desc: `Cursed copper disc ${i + 1}/6, thrown at the nearest foe. Only the Phoenix Heart can forge it anew.`,
    base: { dmg: 8, cd: 1.5, amount: 1, area: 1, speed: 1, pierce: 0, kb: 0.2 },
    levels: [
      { dmg: 2, text: 'Damage {+2}.' },
      { cd: -0.15, text: 'Throws {faster}.' },
      { dmg: 3, text: 'Damage {+3}.' },
      { speed: 0.2, text: 'Disc speed {+20%}.' },
      { dmg: 3, text: 'Damage {+3}.' },
      { pierce: 1, area: 0.2, text: 'Pierces {+1} foe, disc size {+20%}.' },
      { dmg: 3, cd: -0.15, text: 'Damage {+3}, throws {faster}.' },
    ],
    evo: { into: COPPER_EVOLUTIONS[i], with: 'phoenix', onlyPartner: true },
  };
  COPPER_WEAPONS[COPPER_EVOLUTIONS[i]] = {
    name, icon: 'i_' + COPPER_EVOLUTIONS[i], kind, desc, evolved: true, copper: true, special: true, copperSlot: i + 1,
    base: { dmg: 24, cd: 1.05, amount: 3, area: 1.5, speed: 1.4, pierce: 3, kb: 0.45, ...extra },
  };
}

COPPER_WEAPONS[GOOD_COPPER_ID] = {
  name: 'good quality copper (not for sale)', icon: 'i_copper', kind: 'copper',
  copper: true, goodCopper: true, special: true,
  desc: 'His private stock: strong copper discs seek the nearest foe. At rank 8, the Spellbook and a chest morph it into a random copper evolution.',
  base: { dmg: 11, cd: 1.4, amount: 1, area: 1, speed: 1, pierce: 1, kb: 0.35 },
  levels: COPPER_WEAPONS.pqc1.levels.map(level => ({ ...level })),
  // `into` remains the representative form for older data readers; gameplay
  // rolls exactly once from `random` when the evolution actually happens.
  evo: { into: COPPER_EVOLUTIONS[0], random: [...COPPER_EVOLUTIONS], with: 'cooldown' },
};
