const id = 'gravebinder_carrion_tithe';

export default {
  id,
  weapon: {
    name: 'Carrion Tithe', icon: 'i_hex', kind: id,
    desc: 'Send a spectral crow at a foe. It siphons lesser foes nearby, adding their strength to one final strike.',
    base: { dmg: 38, cd: 1.26, area: 1, amount: 2, siphon: 0.42, tithe: 0.10 },
    levels: [
      { dmg: 4, text: 'Damage {+4}.' },
      { area: 0.15, text: 'Siphon radius {+15%}.' },
      { amount: 1, text: 'Siphon {+1} lesser foe.' },
      { cd: -0.12, text: 'Send the crow {faster}.' },
      { dmg: 6, siphon: 0.03, text: 'Damage {+6}. Siphons take {more} health.' },
      { amount: 1, area: 0.15, text: 'Siphon {+1} foe, radius {+15%}.' },
      { dmg: 7, tithe: 0.01, text: 'Damage {+7}. Siphons {feed} a stronger final strike.' },
    ],
    evo: { into: 'gravebinder_ravenous_edict', with: 'cooldown' },
  },
  evolution: {
    name: 'Ravenous Edict', icon: 'i_doom', kind: id, evolved: true,
    desc: 'The raven collects a greater toll from more foes and strikes its target harder.',
    base: { dmg: 64, cd: 1.02, area: 1.46, amount: 5, siphon: 0.48, tithe: 0.12 },
  },
};
